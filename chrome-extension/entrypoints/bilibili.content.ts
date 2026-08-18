// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.bilibili.com/*"],
  world: "MAIN",
  main() {
    console.log('[DUZKVIDEOTOOL] Bilibili Content Script Initialized');

    const detectedVideos = new Map();

    async function scanBilibiliVideos() {
      const pageUrl = window.location.href;
      const bvMatch = pageUrl.match(/(BV[a-zA-Z0-9]+)/i);

      if (bvMatch) {
        const bvid = bvMatch[1];
        const titleEl = document.querySelector('.video-title, #viewbox_report .video-title, h1[title]');
        const authorEl = document.querySelector('.up-name, .up-info--right .name, .username');
        const avatarEl = document.querySelector('.up-avatar img, .bili-avatar img');
        const videoEl = document.querySelector('video');

        const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent?.trim()) : document.title.replace('_哔哩哔哩_bilibili', '').trim();
        const author = authorEl ? authorEl.textContent?.trim() : 'Bilibili UP主';
        const authorAvatar = avatarEl ? avatarEl.src : '';
        const mediaUrl = videoEl ? (videoEl.src || videoEl.currentSrc) : '';

        if (!detectedVideos.has(bvid)) {
          detectedVideos.set(bvid, {
            id: bvid,
            platform: 'bilibili',
            title,
            author,
            authorAvatar,
            mediaUrl,
            pageUrl,
            likes: 0,
            comments: 0
          });
        }

        // Attach Floating Action Toolbar on Bilibili Player
        const playerArea = document.querySelector('#bilibili-player, .bpx-player-container, .player-wrap') || document.body;
        attachDuzkBilibiliToolbar(playerArea, pageUrl, bvid, title);
      }

      // Broadcast stats to Extension Sidepanel
      const videoList = Array.from(detectedVideos.values());
      try {
        if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'social-intelligence-stats',
            stats: {
              detected: videoList.length,
              downloadable: videoList.length,
              selected: videoList.length
            },
            videos: videoList
          });
        }
      } catch (e) {}
    }

    function attachDuzkBilibiliToolbar(parent, pageUrl, bvid, title) {
      if (!parent || parent.querySelector('.duzk-bili-toolbar')) return;

      const toolbar = document.createElement('div');
      toolbar.className = 'duzk-bili-toolbar';
      toolbar.style.cssText = `
        position: absolute;
        top: 18px;
        right: 18px;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(10, 15, 26, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 6px 10px;
        border-radius: 24px;
        border: 1px solid rgba(0, 242, 254, 0.35);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // 1. Studio Button
      const studioBtn = document.createElement('button');
      studioBtn.innerHTML = '⚡ Lồng Tiếng AI';
      studioBtn.title = 'Mở video này trong DUZK Video Studio';
      studioBtn.style.cssText = `
        background: linear-gradient(135deg, #00A1D6 0%, #00F2FE 100%);
        color: #080C14;
        font-weight: 800;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      `;
      studioBtn.onmouseenter = () => { studioBtn.style.transform = 'scale(1.05)'; };
      studioBtn.onmouseleave = () => { studioBtn.style.transform = 'scale(1)'; };
      studioBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const payload = encodeURIComponent(JSON.stringify({ platform: 'bilibili', id: bvid, title, pageUrl }));
        window.open(`http://localhost:5000/?url=${encodeURIComponent(pageUrl)}&data=${payload}`, '_blank');
      };

      // 2. Download Video MP4 Button
      const downloadBtn = document.createElement('button');
      downloadBtn.innerHTML = '📥 Tải Video MP4';
      downloadBtn.title = 'Tải video Bilibili HD không logo';
      downloadBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      downloadBtn.onmouseenter = () => { downloadBtn.style.background = 'rgba(255, 255, 255, 0.25)'; };
      downloadBtn.onmouseleave = () => { downloadBtn.style.background = 'rgba(255, 255, 255, 0.12)'; };
      downloadBtn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        downloadBtn.innerHTML = '⏳ Đang Lấy Link...';
        try {
          const res = await fetch('http://localhost:5000/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
          });
          const json = await res.json();
          if (json.ok && json.data?.videoUrl) {
            const cleanTitle = (title || 'bilibili_video').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50);
            const downloadUrl = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(json.data.videoUrl)}&download=1&filename=${encodeURIComponent(cleanTitle + '.mp4')}`;
            window.open(downloadUrl, '_blank');
            downloadBtn.innerHTML = '✅ Đã Bắt Đầu Tải';
            setTimeout(() => { downloadBtn.innerHTML = '📥 Tải Video MP4'; }, 3000);
          } else {
            throw new Error(json.error || 'Lỗi bóc tách');
          }
        } catch (err) {
          alert('Lỗi tải video Bilibili: ' + err.message + '\n(Hãy đảm bảo DUZK Backend Server đang chạy tại http://localhost:5000)');
          downloadBtn.innerHTML = '⚠️ Lỗi Tải';
          setTimeout(() => { downloadBtn.innerHTML = '📥 Tải Video MP4'; }, 3000);
        }
      };

      // 3. Download Audio MP3 Button
      const audioBtn = document.createElement('button');
      audioBtn.innerHTML = '🎵 MP3';
      audioBtn.title = 'Tải âm thanh gốc MP3';
      audioBtn.style.cssText = `
        background: rgba(245, 158, 11, 0.2);
        color: #FBBF24;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 16px;
        border: 1px solid rgba(245, 158, 11, 0.4);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      audioBtn.onmouseenter = () => { audioBtn.style.background = 'rgba(245, 158, 11, 0.35)'; };
      audioBtn.onmouseleave = () => { audioBtn.style.background = 'rgba(245, 158, 11, 0.2)'; };
      audioBtn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        audioBtn.innerHTML = '⏳...';
        try {
          const res = await fetch('http://localhost:5000/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
          });
          const json = await res.json();
          if (json.ok && json.data?.videoUrl) {
            const cleanTitle = (title || 'bilibili_audio').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50);
            const downloadUrl = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(json.data.videoUrl)}&download=1&filename=${encodeURIComponent(cleanTitle + '.mp3')}`;
            window.open(downloadUrl, '_blank');
            audioBtn.innerHTML = '✅ MP3';
            setTimeout(() => { audioBtn.innerHTML = '🎵 MP3'; }, 3000);
          }
        } catch (err) {
          alert('Lỗi tải MP3 Bilibili: ' + err.message);
          audioBtn.innerHTML = '🎵 MP3';
        }
      };

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(downloadBtn);
      toolbar.appendChild(audioBtn);

      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(toolbar);
    }

    // Interval scanner
    setInterval(scanBilibiliVideos, 2000);
    scanBilibiliVideos();

    // Listen to messages from Sidepanel
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (req.type === 'social-intelligence-cmd') {
          const videoList = Array.from(detectedVideos.values());
          if (req.cmd === 'ping' || req.cmd === 'scan') {
            scanBilibiliVideos();
            sendResponse({
              detected: videoList.length,
              downloadable: videoList.length,
              selected: videoList.length,
              videos: videoList
            });
          } else if (req.cmd === 'downloadSelected' || req.cmd === 'downloadVisible') {
            const current = videoList[0];
            if (current) {
              fetch('http://localhost:5000/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: current.pageUrl })
              }).then(r => r.json()).then(j => {
                if (j.ok && j.data?.videoUrl) {
                  const cleanTitle = (current.title || 'bilibili_video').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50);
                  const downloadUrl = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(j.data.videoUrl)}&download=1&filename=${encodeURIComponent(cleanTitle + '.mp4')}`;
                  window.open(downloadUrl, '_blank');
                }
              });
            }
          }
        }
      });
    }
  }
});
