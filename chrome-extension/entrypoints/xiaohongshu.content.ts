// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.xiaohongshu.com/*"],
  world: "MAIN",
  main() {
    console.log('[DUZKVIDEOTOOL] Xiaohongshu Content Script Initialized');

    const detectedVideos = new Map();

    function scanXhsVideos() {
      // Check video and note card containers
      const noteCards = document.querySelectorAll('.note-container, .modal-container, .feed-card, .feeds-container .note-item, section.note-item');
      
      noteCards.forEach((card, idx) => {
        const vid = card.querySelector('video');
        const titleEl = card.querySelector('.title, .note-title, #detail-title, .desc, .content, .footer .title');
        const authorEl = card.querySelector('.author, .name, .author-wrapper .name, .user-name, .author-container .name');
        const avatarEl = card.querySelector('.avatar img, .user-avatar img, .author-wrapper img');

        const title = titleEl ? titleEl.textContent?.trim() : `Xiaohongshu Post #${idx + 1}`;
        const author = authorEl ? authorEl.textContent?.trim() : 'XHS Creator';
        const authorAvatar = avatarEl ? avatarEl.src : '';
        const pageUrl = window.location.href;
        const noteIdMatch = pageUrl.match(/explore\/([a-zA-Z0-9]+)/) || pageUrl.match(/discovery\/item\/([a-zA-Z0-9]+)/);
        const id = noteIdMatch ? noteIdMatch[1] : (card.getAttribute('data-id') || `xhs_${idx}_${Date.now()}`);
        const mediaUrl = vid ? (vid.src || vid.currentSrc) : '';

        if (!detectedVideos.has(id)) {
          detectedVideos.set(id, {
            id,
            platform: 'xiaohongshu',
            title,
            author,
            authorAvatar,
            mediaUrl,
            pageUrl,
            likes: 0,
            comments: 0
          });
        }

        // Attach Floating Action Toolbar
        attachDuzkXhsToolbar(card, pageUrl, id, title);
      });

      // Also check standalone video tags
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((vid, idx) => {
        const container = vid.closest('.note-container') || vid.closest('.modal-container') || vid.parentElement;
        if (container) {
          attachDuzkXhsToolbar(container, window.location.href, `xhs_vid_${idx}`, document.title);
        }
      });

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

    function attachDuzkXhsToolbar(parent, pageUrl, id, title) {
      if (!parent || parent.querySelector('.duzk-xhs-toolbar')) return;

      const toolbar = document.createElement('div');
      toolbar.className = 'duzk-xhs-toolbar';
      toolbar.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(10, 15, 26, 0.88);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 5px 8px;
        border-radius: 20px;
        border: 1px solid rgba(254, 44, 85, 0.4);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // 1. Studio Button
      const studioBtn = document.createElement('button');
      studioBtn.innerHTML = '⚡ Lồng Tiếng AI';
      studioBtn.title = 'Mở bài viết này trong DUZK Video Studio';
      studioBtn.style.cssText = `
        background: linear-gradient(135deg, #FE2C55 0%, #FF5277 100%);
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        padding: 5px 12px;
        border-radius: 14px;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease;
      `;
      studioBtn.onmouseenter = () => { studioBtn.style.transform = 'scale(1.05)'; };
      studioBtn.onmouseleave = () => { studioBtn.style.transform = 'scale(1)'; };
      studioBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const payload = encodeURIComponent(JSON.stringify({ platform: 'xiaohongshu', id, title, pageUrl }));
        window.open(`http://localhost:5000/?url=${encodeURIComponent(pageUrl)}&data=${payload}`, '_blank');
      };

      // 2. Download Video / Images Button
      const downloadBtn = document.createElement('button');
      downloadBtn.innerHTML = '📥 Tải HD';
      downloadBtn.title = 'Tải video hoặc ảnh Xiaohongshu không logo';
      downloadBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        padding: 5px 10px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      downloadBtn.onmouseenter = () => { downloadBtn.style.background = 'rgba(255, 255, 255, 0.25)'; };
      downloadBtn.onmouseleave = () => { downloadBtn.style.background = 'rgba(255, 255, 255, 0.12)'; };
      downloadBtn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        downloadBtn.innerHTML = '⏳...';
        try {
          const res = await fetch('http://localhost:5000/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
          });
          const json = await res.json();
          if (json.ok && json.data) {
            if (json.data.videoUrl) {
              const cleanTitle = (title || 'xhs_video').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50);
              const downloadUrl = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(json.data.videoUrl)}&download=1&filename=${encodeURIComponent(cleanTitle + '.mp4')}`;
              window.open(downloadUrl, '_blank');
              downloadBtn.innerHTML = '✅ Video';
            } else if (json.data.images && json.data.images.length > 0) {
              // Open each full resolution image
              json.data.images.forEach((imgUrl, i) => {
                const imgDownload = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(imgUrl)}&download=1&filename=xhs_img_${i + 1}.jpg`;
                window.open(imgDownload, '_blank');
              });
              downloadBtn.innerHTML = `✅ ${json.data.images.length} Ảnh`;
            }
            setTimeout(() => { downloadBtn.innerHTML = '📥 Tải HD'; }, 3000);
          }
        } catch (err) {
          alert('Lỗi tải Xiaohongshu: ' + err.message + '\n(Hãy đảm bảo DUZK Backend Server đang chạy tại http://localhost:5000)');
          downloadBtn.innerHTML = '⚠️ Lỗi';
          setTimeout(() => { downloadBtn.innerHTML = '📥 Tải HD'; }, 3000);
        }
      };

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(downloadBtn);

      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(toolbar);
    }

    // Interval scanner
    setInterval(scanXhsVideos, 2500);
    scanXhsVideos();

    // Listen to messages from Sidepanel
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (req.type === 'social-intelligence-cmd') {
          const videoList = Array.from(detectedVideos.values());
          if (req.cmd === 'ping' || req.cmd === 'scan') {
            scanXhsVideos();
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
                  const cleanTitle = (current.title || 'xhs_video').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50);
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
