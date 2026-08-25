(function(){function e(e){return e}var t=e({matches:[`*://*.tiktok.com/*`],world:`MAIN`,main(){console.log(`[DUZKVIDEOTOOL] TikTok Content Script Initialized`);let e=``;function t(){let t=window.location.href;if(!t.includes(`/video/`)&&!t.includes(`/photo/`)||t===e&&document.querySelector(`.duzk-tiktok-toolbar`))return;e=t;let r=document.querySelector(`[data-e2e="feed-video-container"], .tiktok-player, [data-e2e="browse-video-container"], [class*="DivVideoContainer"]`)||document.body,i=document.querySelector(`[data-e2e="browse-video-desc"], [data-e2e="user-post-item-desc"]`);n(r,t,i?i.textContent?.trim():document.title)}function n(e,t,n){if(!e)return;let r=document.querySelector(`.duzk-tiktok-toolbar`);r&&r.remove();let i=document.createElement(`div`);i.className=`duzk-tiktok-toolbar`,i.style.cssText=`
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
      `;let a=document.createElement(`button`);a.innerHTML=`⚡ Lồng Tiếng AI`,a.style.cssText=`
        background: linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%);
        color: #000000;
        font-weight: 800;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease;
      `,a.onmouseenter=()=>{a.style.transform=`scale(1.05)`},a.onmouseleave=()=>{a.style.transform=`scale(1.0)`},a.onclick=e=>{e.stopPropagation();let n=`http://localhost:5000/?url=${encodeURIComponent(t)}&autoExtract=1`;window.open(n,`_blank`)};let o=document.createElement(`button`);o.innerHTML=`📥 Tải HD`,o.style.cssText=`
        background: rgba(255, 255, 255, 0.12);
        color: #FFFFFF;
        font-weight: 600;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
      `,o.onclick=async e=>{e.stopPropagation(),o.innerHTML=`⏳ Đang lấy...`;try{let e=await(await fetch(`http://localhost:5000/api/extract`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:t})})).json();if(e.videoUrl){let t=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(e.videoUrl)}&download=1&filename=${encodeURIComponent((n||`tiktok_video`).slice(0,40)+`.mp4`)}`;window.open(t,`_blank`)}}catch{alert(`Vui lòng bật Server DUZKVIDEOTOOL tại http://localhost:5000`)}finally{o.innerHTML=`📥 Tải HD`}},i.appendChild(a),i.appendChild(o),e.style&&getComputedStyle(e).position===`static`&&(e.style.position=`relative`),e.appendChild(i)}setInterval(t,1e3)}}),n={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{return await t.main()}catch(e){throw n.error(`The content script "tiktok" crashed on startup!`,e),e}})()})();