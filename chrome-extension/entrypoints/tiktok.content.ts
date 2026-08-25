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
        background: rgba(18, 18, 18, 0.88);
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

      // 2. Nút Tải Không Logo
      const dlBtn = document.createElement('button');
      dlBtn.innerHTML = '📥 Tải HD';
      dlBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        color: #FFFFFF;
        font-weight: 600;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
      `;
      dlBtn.onclick = async (e) => {
        e.stopPropagation();
        dlBtn.innerHTML = '⏳ Đang lấy...';
        try {
          const res = await fetch('http://localhost:5000/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
          });
          const data = await res.json();
          if (data.videoUrl) {
            const dlUrl = `http://localhost:5000/api/proxy-media?url=${encodeURIComponent(data.videoUrl)}&download=1&filename=${encodeURIComponent((title || 'tiktok_video').slice(0, 40) + '.mp4')}`;
            window.open(dlUrl, '_blank');
          }
        } catch (err) {
          alert('Vui lòng bật Server DUZKVIDEOTOOL tại http://localhost:5000');
        } finally {
          dlBtn.innerHTML = '📥 Tải HD';
        }
      };

      toolbar.appendChild(studioBtn);
      toolbar.appendChild(dlBtn);

      if (parent.style && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(toolbar);
    }

    setInterval(checkAndInjectToolbar, 1000);
  }
});
