// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.tiktok.com/*"],
  world: "MAIN",
  main() {
    console.log('[DUZKVIDEOTOOL] TikTok Content Script Initialized');

    let currentUrl = '';

    function checkAndInjectToolbar() {
      const pageUrl = window.location.href;
      if (!pageUrl.includes('/video/') && !pageUrl.includes('/photo/')) return;
      if (pageUrl === currentUrl && document.querySelector('.duzk-tiktok-toolbar')) return;
      currentUrl = pageUrl;

      const playerContainer = document.querySelector('[data-e2e="feed-video-container"], .tiktok-player, [data-e2e="browse-video-container"], [class*="DivVideoContainer"]') || document.body;
      
      const titleEl = document.querySelector('[data-e2e="browse-video-desc"], [data-e2e="user-post-item-desc"]');
      const title = titleEl ? titleEl.textContent?.trim() : document.title;

      attachDuzkTikTokToolbar(playerContainer, pageUrl, title);
    }

    function attachDuzkTikTokToolbar(parent, pageUrl, title) {
      if (!parent) return;

      const existing = document.querySelector('.duzk-tiktok-toolbar');
      if (existing) existing.remove();

      const toolbar = document.createElement('div');
      toolbar.className = 'duzk-tiktok-toolbar';
      toolbar.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(18, 18, 18, 0.92);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        padding: 6px 12px;
        border-radius: 24px;
        border: 1px solid rgba(254, 44, 85, 0.4);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // 1. Studio Button
      const studioBtn = document.createElement('button');
      studioBtn.innerHTML = '⚡ Lồng Tiếng AI';
      studioBtn.style.cssText = `
        background: linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%);
        color: #000000;
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

      // 2. Download Quality Button & Menu
      const dlBtn = document.createElement('button');
      dlBtn.innerHTML = '💎 Tải HD/MP3 ▼';
      dlBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #FFFFFF;
        font-weight: 700;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
      `;

      const qualityMenu = document.createElement('div');
      qualityMenu.style.cssText = `
        position: absolute;
        top: 42px;
        right: 0;
        background: rgba(18, 18, 18, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(254, 44, 85, 0.4);
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

      dlBtn.onclick = async (e) => {
        e.stopPropagation();
        if (isMenuOpen) {
          qualityMenu.style.display = 'none';
          isMenuOpen = false;
          return;
        }

        qualityMenu.innerHTML = '<div style="color:#aaa;font-size:11px;padding:6px;text-align:center;">⏳ Đang bóc tách...</div>';
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
          const cleanTitle = (title || 'tiktok_video').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 40);

          if (cachedData.videoUrl) {
            const vidItem = document.createElement('a');
            vidItem.href = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(cachedData.videoUrl)}&download=1&filename=${encodeURIComponent(cleanTitle + '.mp4')}`;
            vidItem.target = '_blank';
            vidItem.innerHTML = '<span>📥 Tải Video Không Logo HD</span>';
            vidItem.style.cssText = `
              color: #00F2FE;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
              padding: 6px 10px;
              border-radius: 6px;
              background: rgba(0, 242, 254, 0.1);
              display: flex;
              justify-content: space-between;
              align-items: center;
            `;
            vidItem.onclick = (e) => { e.stopPropagation(); qualityMenu.style.display = 'none'; isMenuOpen = false; };
            qualityMenu.appendChild(vidItem);
          }

          if (cachedData.musicUrl) {
            const audioItem = document.createElement('a');
            audioItem.href = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(cachedData.musicUrl)}&download=1&filename=${encodeURIComponent(cleanTitle + '_audio.mp3')}`;
            audioItem.target = '_blank';
            audioItem.innerHTML = '<span>🎵 Tải Audio MP3 Gốc</span>';
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
            audioItem.onclick = (e) => { e.stopPropagation(); qualityMenu.style.display = 'none'; isMenuOpen = false; };
            qualityMenu.appendChild(audioItem);
          }
        } catch (err) {
          qualityMenu.innerHTML = `<div style="color:#F87171;font-size:11px;padding:6px;">⚠️ Lỗi: ${err.message}</div>`;
        }
      };

      document.addEventListener('click', (e) => {
        if (!toolbar.contains(e.target)) {
          qualityMenu.style.display = 'none';
          isMenuOpen = false;
        }
      });

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(dlBtn);
      toolbar.appendChild(qualityMenu);

      if (parent.style && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(toolbar);
    }

    setInterval(checkAndInjectToolbar, 1000);
  }
});
