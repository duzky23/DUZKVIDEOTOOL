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
        background: rgba(10, 15, 26, 0.88);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
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

      // 2. Nút Tải Video MP4
      const dlVideoBtn = document.createElement('button');
      dlVideoBtn.innerHTML = '📥 Tải MP4';
      dlVideoBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #FFFFFF;
        font-weight: 600;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
      `;
      dlVideoBtn.onclick = async (e) => {
        e.stopPropagation();
        dlVideoBtn.innerHTML = '⏳ Đang lấy...';
        try {
          const res = await fetch('http://localhost:5000/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
          });
          const data = await res.json();
          if (data.videoUrl) {
            const dlUrl = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(data.videoUrl)}&download=1&filename=${encodeURIComponent((title || 'youtube_video').slice(0, 40) + '.mp4')}`;
            window.open(dlUrl, '_blank');
          }
        } catch (err) {
          alert('Vui lòng bật Server DUZKVIDEOTOOL tại http://localhost:5000');
        } finally {
          dlVideoBtn.innerHTML = '📥 Tải MP4';
        }
      };

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(dlVideoBtn);

      if (parent.style) {
        if (getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }
      }
      parent.appendChild(toolbar);
    }

    // Lắng nghe thay đổi URL trong SPA YouTube
    setInterval(checkAndInjectToolbar, 1000);
    window.addEventListener('yt-navigate-finish', checkAndInjectToolbar);
  }
});
