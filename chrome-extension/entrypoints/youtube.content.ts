// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.youtube.com/*", "*://*.youtu.be/*"],
  world: "MAIN",
  main() {
    console.log('[DUZKVIDEOTOOL] YouTube Content Script Initialized');

    let currentUrl = '';

    function checkAndInjectToolbar() {
      const pageUrl = window.location.href;
      if (pageUrl === currentUrl) return;
      currentUrl = pageUrl;

      // Xử lý trang xem video hoặc YouTube Shorts
      const isWatch = pageUrl.includes('/watch');
      const isShorts = pageUrl.includes('/shorts/');

      if (!isWatch && !isShorts) return;

      const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1, h2.title, .shorts-video-title');
      const title = titleEl ? titleEl.textContent?.trim() : document.title.replace('- YouTube', '').trim();

      const playerContainer = document.querySelector('#movie_player, #player-container, #shorts-container ytd-reel-video-renderer[is-active]') || document.body;
      
      attachDuzkYouTubeToolbar(playerContainer, pageUrl, title);
    }

    function attachDuzkYouTubeToolbar(parent, pageUrl, title) {
      if (!parent) return;

      const existing = document.querySelector('.duzk-yt-toolbar');
      if (existing) existing.remove();

      const toolbar = document.createElement('div');
      toolbar.className = 'duzk-yt-toolbar';
      toolbar.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(10, 15, 26, 0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 6px 12px;
        border-radius: 24px;
        border: 1px solid rgba(255, 0, 0, 0.4);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // 1. Nút Studio Lồng Tiếng AI
      const studioBtn = document.createElement('button');
      studioBtn.innerHTML = '⚡ Lồng Tiếng AI';
      studioBtn.title = 'Mở video YouTube này trong DUZK Studio';
      studioBtn.style.cssText = `
        background: linear-gradient(135deg, #FF0000 0%, #FF5555 100%);
        color: #FFFFFF;
        font-weight: 800;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease;
      `;
      studioBtn.onmouseenter = () => { studioBtn.style.transform = 'scale(1.05)'; };
      studioBtn.onmouseleave = () => { studioBtn.style.transform = 'scale(1.0)'; };
      studioBtn.onclick = (e) => {
        e.stopPropagation();
        const studioUrl = `http://localhost:5000/?url=${encodeURIComponent(pageUrl)}&autoExtract=1`;
        window.open(studioUrl, '_blank');
      };

      // 2. Nút Chọn Chất Lượng Tải (4K / 2K / 1080p / MP3)
      const dlQualityBtn = document.createElement('button');
      dlQualityBtn.innerHTML = '💎 Chọn Tải 4K/HD ▼';
      dlQualityBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #00F2FE;
        font-weight: 700;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(0, 242, 254, 0.4);
        cursor: pointer;
        transition: background 0.15s ease;
      `;

      // Menu Dropdown Chọn Chất Lượng
      const qualityMenu = document.createElement('div');
      qualityMenu.style.cssText = `
        position: absolute;
        top: 42px;
        right: 0;
        background: rgba(10, 15, 26, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 242, 254, 0.35);
        border-radius: 12px;
        padding: 8px;
        display: none;
        flex-direction: column;
        gap: 6px;
        min-width: 180px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        z-index: 1000000;
      `;

      let isMenuOpen = false;
      let cachedData = null;

      dlQualityBtn.onclick = async (e) => {
        e.stopPropagation();
        if (isMenuOpen) {
          qualityMenu.style.display = 'none';
          isMenuOpen = false;
          return;
        }

        qualityMenu.innerHTML = '<div style="color:#aaa;font-size:11px;padding:6px;text-align:center;">⏳ Đang quét chất lượng video...</div>';
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
          const qualities = cachedData.qualities || [{ label: '1080p (Full HD)', url: cachedData.videoUrl }];

          qualities.forEach(q => {
            const item = document.createElement('a');
            item.href = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(q.url)}&download=1&filename=${encodeURIComponent((title || 'video').slice(0, 30) + `_${q.label.replace(/[^\w]/g, '_')}.mp4`)}`;
            item.target = '_blank';
            item.innerHTML = `<span>📥 ${q.label}</span> <span style="opacity:0.6;font-size:10px;">${q.resolution || ''}</span>`;
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
              transition: background 0.15s ease;
            `;
            item.onmouseenter = () => { item.style.background = 'rgba(0, 242, 254, 0.2)'; };
            item.onmouseleave = () => { item.style.background = 'rgba(255,255,255,0.06)'; };
            item.onclick = (e) => {
              e.stopPropagation();
              qualityMenu.style.display = 'none';
              isMenuOpen = false;
            };
            qualityMenu.appendChild(item);
          });

          // Thêm nút Audio MP3
          if (cachedData.musicUrl || cachedData.videoUrl) {
            const audioItem = document.createElement('a');
            audioItem.href = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(cachedData.musicUrl || cachedData.videoUrl)}&download=1&filename=${encodeURIComponent((title || 'audio').slice(0, 30) + '.mp3')}`;
            audioItem.target = '_blank';
            audioItem.innerHTML = '<span>🎵 Tải Audio MP3</span>';
            audioItem.style.cssText = `
              color: #FFE500;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
              padding: 6px 10px;
              border-radius: 6px;
              background: rgba(255, 229, 0, 0.1);
              display: flex;
              justify-content: space-between;
              align-items: center;
            `;
            audioItem.onclick = (e) => {
              e.stopPropagation();
              qualityMenu.style.display = 'none';
              isMenuOpen = false;
            };
            qualityMenu.appendChild(audioItem);
          }
        } catch (err) {
          qualityMenu.innerHTML = `<div style="color:#F87171;font-size:11px;padding:6px;">⚠️ Lỗi: ${err.message}<br/>Hãy bật Server DUZK tại port 5000</div>`;
        }
      };

      // Đóng menu khi click ra ngoài
      document.addEventListener('click', (e) => {
        if (!toolbar.contains(e.target)) {
          qualityMenu.style.display = 'none';
          isMenuOpen = false;
        }
      });

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(dlQualityBtn);
      toolbar.appendChild(qualityMenu);

      if (parent.style && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(toolbar);
    }

    // Lắng nghe thay đổi URL trong SPA YouTube
    setInterval(checkAndInjectToolbar, 1000);
    window.addEventListener('yt-navigate-finish', checkAndInjectToolbar);
  }
});
