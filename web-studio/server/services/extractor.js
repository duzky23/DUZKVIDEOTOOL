import axios from 'axios';
import https from 'https';
import http from 'http';
import dns from 'dns';

// Public DNS bypass for ISP domain blocking
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (!err && addresses && addresses.length > 0) {
      if (options && options.all) {
        return callback(null, addresses.map(ip => ({ address: ip, family: 4 })));
      }
      return callback(null, addresses[0], 4);
    }
    dns.lookup(hostname, options, callback);
  });
}

export const fetchClient = axios.create({
  httpAgent: new http.Agent({ lookup: customLookup }),
  httpsAgent: new https.Agent({ lookup: customLookup })
});

let cachedTtwid = '';
let ttwidExpires = 0;

/**
 * Automatically fetch/refresh Douyin ttwid authentication cookie
 */
async function getTtwidCookie() {
  if (cachedTtwid && Date.now() < ttwidExpires) {
    return cachedTtwid;
  }

  try {
    const res = await fetchClient.post('https://ttwid.bytedance.com/ttwid/union/register/', {
      region: 'cn',
      aid: 1768,
      needFid: 'false',
      service: 'www.ixigua.com',
      migrate_info: { ticket: '', src: 'uc' },
      cbUrlProtocol: 'https',
      union: 'true'
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Content-Type': 'application/json'
      },
      timeout: 12000
    });

    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const match = setCookie.join(';').match(/ttwid=([^;]+)/);
      if (match) {
        cachedTtwid = match[1];
        ttwidExpires = Date.now() + 24 * 3600 * 1000;
        return cachedTtwid;
      }
    }
  } catch (e) {
    console.warn('Ttwid registration warning:', e.message);
  }

  // Fallback: fetch homepage cookie
  try {
    const homeRes = await fetchClient.get('https://www.douyin.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    const homeCookies = homeRes.headers['set-cookie'];
    if (homeCookies) {
      const m = homeCookies.join(';').match(/ttwid=([^;]+)/);
      if (m) {
        cachedTtwid = m[1];
        ttwidExpires = Date.now() + 24 * 3600 * 1000;
        return cachedTtwid;
      }
    }
  } catch (e) {
    console.warn('Douyin homepage cookie warning:', e.message);
  }

  // Fallback seed
  if (!cachedTtwid) {
    cachedTtwid = '1%7Cq6z6R4M6Q7q1s8P0k2A4z6X8C0v2B4n6M8Q0w2E4r6T8Y0u2I4o6P8A0s2D4f6G8H0j2K4l6';
  }

  return cachedTtwid;
}

/**
 * Universal video extractor for Douyin, TikTok, Xiaohongshu, Kuaishou
 */
export async function extractVideoInfo(rawUrl) {
  const url = cleanUrl(rawUrl);
  
  // Direct CDN stream URL check
  if (
    url.includes('.mp4') ||
    url.includes('douyinvod.com') ||
    url.includes('bytevideo.cn') ||
    url.includes('zjcdn.com') ||
    url.includes('snssdk.com') ||
    url.includes('/aweme/v1/play/') ||
    url.includes('is_play_url=1') ||
    url.includes('playwm')
  ) {
    return {
      platform: 'douyin',
      id: 'media_' + Date.now(),
      title: 'Video Douyin (Direct Stream)',
      author: 'Douyin Creator',
      authorAvatar: '',
      videoUrl: url,
      coverUrl: '',
      musicUrl: '',
      duration: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      images: []
    };
  }


  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
    return await extractDouyin(url);
  } else if (url.includes('tiktok.com')) {
    return await extractTikTok(url);
  } else if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
    return await extractXiaohongshu(url);
  } else if (url.includes('bilibili.com') || url.includes('b23.tv')) {
    return await extractBilibili(url);
  } else if (url.includes('kuaishou.com')) {
    return await extractKuaishou(url);
  } else {
    return {
      platform: 'generic',
      title: 'Video tải từ đường dẫn trực tiếp',
      author: 'Unknown',
      videoUrl: url,
      coverUrl: '',
      musicUrl: '',
      images: []
    };
  }

}

function cleanUrl(text) {
  if (!text) return '';
  // Check if pure numeric ID passed
  const trimmed = text.trim();
  if (/^\d{15,22}$/.test(trimmed)) {
    return `https://www.douyin.com/video/${trimmed}`;
  }
  const match = trimmed.match(/https?:\/\/[a-zA-Z0-9.\-_/=?&%#~+@]+/);
  return match ? match[0].trim() : trimmed;
}

/**
 * Extract Douyin Video without Watermark using official ByteDance API with ttwid auth
 */
async function extractDouyin(url) {
  try {
    let awemeId = '';

    // Extract ID directly if numeric ID in URL
    const idDirectMatch = url.match(/video\/(\d+)/) || url.match(/modal_id=(\d+)/) || url.match(/note\/(\d+)/);
    if (idDirectMatch) {
      awemeId = idDirectMatch[1];
    } else {
      // Follow redirect for short links (e.g. v.douyin.com)
      try {
        const res = await fetchClient.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
          },
          maxRedirects: 5,
          timeout: 8000
        });

        const finalUrl = res.request?.res?.responseUrl || url;
        const idMatch = finalUrl.match(/video\/(\d+)/) || finalUrl.match(/note\/(\d+)/) || (typeof res.data === 'string' && res.data.match(/video\/(\d+)/));
        if (idMatch) awemeId = idMatch[1];

        if (!awemeId) {
          const modalIdMatch = finalUrl.match(/modal_id=(\d+)/);
          if (modalIdMatch) awemeId = modalIdMatch[1];
        }
      } catch (e) {
        console.warn('Redirect error on Douyin:', e.message);
      }
    }

    if (!awemeId) {
      // Fallback regex to search any 18-20 digit number
      const genericDigitMatch = url.match(/(\d{18,20})/);
      if (genericDigitMatch) {
        awemeId = genericDigitMatch[1];
      }
    }

    if (!awemeId) {
      throw new Error('Không tìm thấy ID video trong đường link Douyin');
    }

    console.log(`[Douyin Extractor] Processing Aweme ID: ${awemeId}`);

    // Query Douyin Web API with ttwid authentication
    const ttwid = await getTtwidCookie();
    const apiUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${awemeId}&aid=6383&version_name=1.0.0&device_platform=webapp&os=windows`;

    const detailRes = await fetchClient.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': `https://www.douyin.com/video/${awemeId}`,
        'Cookie': `ttwid=${ttwid}; passport_csrf_token=1;`
      },
      timeout: 10000
    });

    const aweme = detailRes.data?.aweme_detail;
    if (aweme) {
      let playUrl = aweme.video?.play_addr?.url_list?.[0] || '';
      if (playUrl) {
        playUrl = playUrl.replace('playwm', 'play');
      }

      // If playUrl is on snssdk redirector, resolve direct CDN link for fast browser playback
      if (playUrl && (playUrl.includes('aweme.snssdk.com') || playUrl.includes('/aweme/v1/play/'))) {
        try {
          const streamRes = await fetchClient.get(playUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
              'Referer': 'https://www.douyin.com/'
            },
            maxRedirects: 5,
            timeout: 6000
          });
          if (streamRes.request?.res?.responseUrl && streamRes.request.res.responseUrl.startsWith('http')) {
            playUrl = streamRes.request.res.responseUrl;
          }
        } catch (e) {
          // Keep playUrl as fallback
        }
      }

      const coverUrl = aweme.video?.cover?.url_list?.[0] || aweme.video?.origin_cover?.url_list?.[0] || '';
      const musicUrl = aweme.music?.play_url?.url_list?.[0] || '';
      const images = (aweme.images || []).map(img => img.url_list?.[0]).filter(Boolean);

      return {
        platform: 'douyin',
        id: awemeId,
        title: aweme.desc || `Video Douyin #${awemeId}`,
        author: aweme.author?.nickname || 'Douyin Creator',
        authorAvatar: aweme.author?.avatar_thumb?.url_list?.[0] || '',
        videoUrl: playUrl,
        coverUrl: coverUrl || images[0] || '',
        musicUrl: musicUrl,
        duration: aweme.duration ? Math.round(aweme.duration / 1000) : 0,
        likes: aweme.statistics?.digg_count || 0,
        comments: aweme.statistics?.comment_count || 0,
        shares: aweme.statistics?.share_count || 0,
        images
      };
    }

    throw new Error('Douyin API không trả về chi tiết video (aweme_detail)');
  } catch (err) {
    console.error('Douyin Extraction Error:', err.message);
    throw new Error(`Không thể bóc tách video Douyin: ${err.message}`);
  }
}

/**
 * Extract TikTok Video without Watermark
 */
async function extractTikTok(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const res = await fetchClient.get(apiUrl, { timeout: 8000 });
    const data = res.data?.data;

    if (!data) {
      throw new Error(res.data?.msg || 'Không lấy được dữ liệu TikTok');
    }

    return {
      platform: 'tiktok',
      id: data.id,
      title: data.title || 'Video TikTok',
      author: data.author?.nickname || 'TikTok Creator',
      authorAvatar: data.author?.avatar || '',
      videoUrl: data.hdplay || data.play || '',
      coverUrl: data.cover || data.origin_cover || '',
      musicUrl: data.music || '',
      duration: data.duration || 0,
      likes: data.digg_count || 0,
      comments: data.comment_count || 0,
      shares: data.share_count || 0,
      images: data.images || []
    };
  } catch (err) {
    console.error('TikTok Extraction Error:', err.message);
    throw new Error(`Không thể bóc tách video TikTok: ${err.message}`);
  }
}

/**
 * Extract Xiaohongshu (RED) Video / Images without Watermark
 */
async function extractXiaohongshu(url) {
  try {
    let targetUrl = url;

    // Follow short link redirects (e.g. xhslink.com)
    if (url.includes('xhslink.com')) {
      const redirectRes = await fetchClient.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        },
        maxRedirects: 5,
        timeout: 10000
      });
      targetUrl = redirectRes.request?.res?.responseUrl || url;
    }

    const noteIdMatch = targetUrl.match(/(?:explore|discovery\/item)\/([a-zA-Z0-9]+)/);
    const noteId = noteIdMatch ? noteIdMatch[1] : '';

    const res = await fetchClient.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://www.xiaohongshu.com/'
      },
      timeout: 12000
    });

    const html = res.data;
    const initialMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});<\/script>/) || 
                         html.match(/window\.__INITIAL_SSR_STATE__\s*=\s*({[\s\S]+?});<\/script>/);
    
    if (initialMatch) {
      const state = JSON.parse(initialMatch[1].replace(/undefined/g, 'null'));
      const noteMap = state.note?.noteDetailMap || state.noteData?.noteDetailMap || {};
      const currentId = noteId || state.note?.currentNoteId || Object.keys(noteMap)[0];
      const note = noteMap[currentId]?.note || state.note?.note || state.noteData?.note;
      
      if (note) {
        let videoUrl = note.video?.media?.stream?.h264?.[0]?.masterUrl || 
                       note.video?.consumer?.originVideoKey || 
                       note.video?.url || '';
        
        if (videoUrl && !videoUrl.startsWith('http')) {
          videoUrl = `https://sns-video-bd.xhscdn.com/${videoUrl}`;
        }

        const images = (note.imageList || []).map(img => img.urlDefault || img.url || img.url_default).filter(Boolean);
        const coverUrl = note.cover?.urlDefault || note.cover?.url || images[0] || '';

        return {
          platform: 'xiaohongshu',
          id: note.noteId || currentId || `xhs_${Date.now()}`,
          title: note.title || note.desc || 'Xiaohongshu Post',
          author: note.user?.nickname || note.user?.name || 'XHS Creator',
          authorAvatar: note.user?.avatar || '',
          videoUrl: videoUrl,
          coverUrl: coverUrl,
          likes: note.interactInfo?.likedCount || note.interactInfo?.liked_count || 0,
          comments: note.interactInfo?.commentCount || note.interactInfo?.comment_count || 0,
          shares: note.interactInfo?.shareCount || note.interactInfo?.share_count || 0,
          images
        };
      }
    }

    // Fallback: check video tags in html
    const videoTagMatch = html.match(/<video[^>]+src="([^">]+)"/) || html.match(/"masterUrl":"([^"]+)"/);
    if (videoTagMatch) {
      return {
        platform: 'xiaohongshu',
        id: noteId || `xhs_${Date.now()}`,
        title: 'Video Xiaohongshu (RED)',
        author: 'XHS Creator',
        videoUrl: videoTagMatch[1].replace(/\\u002F/g, '/'),
        coverUrl: '',
        images: []
      };
    }

    throw new Error('Không thể phân tích dữ liệu Xiaohongshu');
  } catch (err) {
    console.error('Xiaohongshu Extraction Error:', err.message);
    throw new Error(`Không thể bóc tách Xiaohongshu: ${err.message}`);
  }
}

/**
 * Extract Bilibili Video (BV / b23.tv / av)
 */
async function extractBilibili(url) {
  try {
    let targetUrl = url;

    // Follow short link redirects (e.g. b23.tv)
    if (url.includes('b23.tv')) {
      const redirectRes = await fetchClient.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        },
        maxRedirects: 5,
        timeout: 10000
      });
      targetUrl = redirectRes.request?.res?.responseUrl || url;
    }

    // Extract BVID
    const bvMatch = targetUrl.match(/(BV[a-zA-Z0-9]+)/i);
    if (!bvMatch) {
      throw new Error('Không tìm thấy mã video BV của Bilibili');
    }
    const bvid = bvMatch[1];

    console.log(`[Bilibili Extractor] Fetching info for BVID: ${bvid}...`);

    // 1. Fetch Video View info (Title, CID, Author, Cover)
    const viewRes = await fetchClient.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      },
      timeout: 10000
    });

    const viewData = viewRes.data?.data;
    if (!viewData) {
      throw new Error(viewRes.data?.message || 'Bilibili API không trả về thông tin video');
    }

    const cid = viewData.cid || viewData.pages?.[0]?.cid;
    const title = viewData.title || `Video Bilibili #${bvid}`;
    const author = viewData.owner?.name || 'Bilibili UP主';
    const authorAvatar = viewData.owner?.face || '';
    const coverUrl = viewData.pic || '';
    const duration = viewData.duration || 0;
    const likes = viewData.stat?.like || 0;
    const comments = viewData.stat?.reply || 0;
    const shares = viewData.stat?.share || 0;

    // 2. Fetch Direct MP4 Play Stream URL
    const playUrlRes = await fetchClient.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=64&fnval=0&fnver=0&fourk=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      },
      timeout: 10000
    });

    const playData = playUrlRes.data?.data;
    const streamUrl = playData?.durl?.[0]?.url || '';

    if (!streamUrl) {
      throw new Error('Không lấy được luồng phát MP4 trực tiếp từ Bilibili');
    }

    return {
      platform: 'bilibili',
      id: bvid,
      title: title,
      author: author,
      authorAvatar: authorAvatar,
      videoUrl: streamUrl,
      coverUrl: coverUrl,
      duration: duration,
      likes: likes,
      comments: comments,
      shares: shares,
      images: [coverUrl]
    };
  } catch (err) {
    console.error('Bilibili Extraction Error:', err.message);
    throw new Error(`Không thể bóc tách video Bilibili: ${err.message}`);
  }
}

/**
 * Extract Kuaishou Video
 */
async function extractKuaishou(url) {
  try {
    const res = await fetchClient.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      },
      timeout: 10000
    });

    const html = res.data;
    const videoMatch = html.match(/src="([^"]+\.mp4[^"]*)"/) || html.match(/"url":"([^"]+\.mp4[^"]*)"/);

    if (videoMatch) {
      return {
        platform: 'kuaishou',
        id: 'ks_' + Date.now(),
        title: 'Video Kuaishou',
        author: 'Kuaishou Creator',
        videoUrl: videoMatch[1].replace(/\\u002F/g, '/'),
        coverUrl: '',
        images: []
      };
    }

    throw new Error('Không tìm thấy link video Kuaishou');
  } catch (err) {
    console.error('Kuaishou Extraction Error:', err.message);
    throw new Error(`Không thể bóc tách Kuaishou: ${err.message}`);
  }
}

