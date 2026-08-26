// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.xiaohongshu.com/*"],
  world: "MAIN",
  main() {
    console.log('[DUZKVIDEOTOOL] Xiaohongshu Content Script Initialized');

    const detectedVideos = new Map();

    function scanXhsVideos() {
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

        attachDuzkXhsToolbar(card, pageUrl, id, title);
      });

      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((vid, idx) => {
        const container = vid.closest('.note-container') || vid.closest('.modal-container') || vid.parentElement;
        if (container) {
          attachDuzkXhsToolbar(container, window.location.href, `xhs_vid_${idx}`, document.title);
        }
      });
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
        background: rgba(10, 15, 26, 0.92);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        padding: 5px 10px;
        border-radius: 20px;
        border: 1px solid rgba(254, 44, 85, 0.4);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
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

      // 2. Download Quality Button & Menu
      const downloadBtn = document.createElement('button');
      downloadBtn.innerHTML = '💎 Tải HD/Ảnh ▼';
      downloadBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        padding: 5px 10px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        cursor: pointer;
      `;

      const qualityMenu = document.createElement('div');
      qualityMenu.style.cssText = `
        position: absolute;
        top: 38px;
        right: 0;
        background: rgba(10, 15, 26, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(254, 44, 85, 0.4);
        border-radius: 12px;
        padding: 8px;
        display: none;
        flex-direction: column;
        gap: 6px;
        min-width: 190px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        z-index: 1000000;
      `;

      let isMenuOpen = false;
      let cachedData = null;

      downloadBtn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (isMenuOpen) {
          qualityMenu.style.display = 'none';
          isMenuOpen = false;
          return;
        }

        qualityMenu.innerHTML = '<div style="color:#aaa;font-size:11px;padding:6px;text-align:center;">⏳ Đang quét bài viết...</div>';
        qualityMenu.style.display = 'flex';
        isMenuOpen = true;

        try {
          if (!cachedData) {
            const res = await fetch('http://localhost:5000/api/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: pageUrl })
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);
            cachedData = json.data;
          }

          qualityMenu.innerHTML = '';

          // Nút Tải Video nếu có
          if (cachedData.videoUrl) {
            const qualities = cachedData.qualities || [{ label: '1080p (Full HD)', url: cachedData.videoUrl }];
            qualities.forEach(q => {
              const item = document.createElement('a');
              item.href = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(q.url)}&download=1&filename=${encodeURIComponent((title || 'xhs_video').slice(0, 30) + `_${q.label.replace(/[^\w]/g, '_')}.mp4`)}`;
              item.target = '_blank';
              item.innerHTML = `<span>📹 Tải ${q.label}</span> <span style="opacity:0.6;font-size:10px;">${q.resolution || ''}</span>`;
              item.style.cssText = `
                color: #fff;
                font-size: 11px;
                font-weight: 600;
                text-decoration: none;
                padding: 6px 10px;
                border-radius: 6px;
                background: rgba(255,255,255,0.06);
                display: flex;
                justify-content: space-between;
                align-items: center;
              `;
              item.onclick = (e) => { e.stopPropagation(); qualityMenu.style.display = 'none'; isMenuOpen = false; };
              qualityMenu.appendChild(item);
            });
          }

          // Nút Tải Album Ảnh nếu có
          if (cachedData.images && cachedData.images.length > 0) {
            const albumItem = document.createElement('button');
            albumItem.innerHTML = `<span>🖼️ Tải Tất Cả ${cachedData.images.length} Ảnh HD</span>`;
            albumItem.style.cssText = `
              color: #00F2FE;
              font-size: 11px;
              font-weight: 700;
              padding: 6px 10px;
              border-radius: 6px;
              border: none;
              background: rgba(0, 242, 254, 0.15);
              cursor: pointer;
              display: flex;
              justify-content: space-between;
              align-items: center;
            `;
            albumItem.onclick = (e) => {
              e.stopPropagation();
              cachedData.images.forEach((imgUrl, i) => {
                const imgDownload = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(imgUrl)}&download=1&filename=xhs_img_${i + 1}.jpg`;
                window.open(imgDownload, '_blank');
              });
              qualityMenu.style.display = 'none';
              isMenuOpen = false;
            };
            qualityMenu.appendChild(albumItem);
          }
        } catch (err) {
          qualityMenu.innerHTML = `<div style="color:#F87171;font-size:11px;padding:6px;">⚠️ Lỗi: ${err.message}<br/>Hãy bật Server DUZK tại port 5000</div>`;
        }
      };

      document.addEventListener('click', (e) => {
        if (!toolbar.contains(e.target)) {
          qualityMenu.style.display = 'none';
          isMenuOpen = false;
        }
      });

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(downloadBtn);
      toolbar.appendChild(qualityMenu);

      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(toolbar);
    }

    setInterval(scanXhsVideos, 2500);
    scanXhsVideos();
  }
});
