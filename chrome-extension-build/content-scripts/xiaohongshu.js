(function(){function e(e){return e}var t=e({matches:[`*://*.xiaohongshu.com/*`],world:`MAIN`,main(){console.log(`[DUZKVIDEOTOOL] Xiaohongshu Content Script Initialized`);let e=new Map;function t(){document.querySelectorAll(`.note-container, .modal-container, .feed-card, .feeds-container .note-item, section.note-item`).forEach((t,r)=>{let i=t.querySelector(`video`),a=t.querySelector(`.title, .note-title, #detail-title, .desc, .content, .footer .title`),o=t.querySelector(`.author, .name, .author-wrapper .name, .user-name, .author-container .name`),s=t.querySelector(`.avatar img, .user-avatar img, .author-wrapper img`),c=a?a.textContent?.trim():`Xiaohongshu Post #${r+1}`,l=o?o.textContent?.trim():`XHS Creator`,u=s?s.src:``,d=window.location.href,f=d.match(/explore\/([a-zA-Z0-9]+)/)||d.match(/discovery\/item\/([a-zA-Z0-9]+)/),p=f?f[1]:t.getAttribute(`data-id`)||`xhs_${r}_${Date.now()}`,m=i?i.src||i.currentSrc:``;e.has(p)||e.set(p,{id:p,platform:`xiaohongshu`,title:c,author:l,authorAvatar:u,mediaUrl:m,pageUrl:d,likes:0,comments:0}),n(t,d,p,c)}),document.querySelectorAll(`video`).forEach((e,t)=>{let r=e.closest(`.note-container`)||e.closest(`.modal-container`)||e.parentElement;r&&n(r,window.location.href,`xhs_vid_${t}`,document.title)});let t=Array.from(e.values());try{chrome?.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`social-intelligence-stats`,stats:{detected:t.length,downloadable:t.length,selected:t.length},videos:t})}catch{}}function n(e,t,n,r){if(!e||e.querySelector(`.duzk-xhs-toolbar`))return;let i=document.createElement(`div`);i.className=`duzk-xhs-toolbar`,i.style.cssText=`
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
      `;let a=document.createElement(`button`);a.innerHTML=`⚡ Lồng Tiếng AI`,a.title=`Mở bài viết này trong DUZK Video Studio`,a.style.cssText=`
        background: linear-gradient(135deg, #FE2C55 0%, #FF5277 100%);
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        padding: 5px 12px;
        border-radius: 14px;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease;
      `,a.onmouseenter=()=>{a.style.transform=`scale(1.05)`},a.onmouseleave=()=>{a.style.transform=`scale(1)`},a.onclick=e=>{e.stopPropagation(),e.preventDefault();let i=encodeURIComponent(JSON.stringify({platform:`xiaohongshu`,id:n,title:r,pageUrl:t}));window.open(`http://localhost:5000/?url=${encodeURIComponent(t)}&data=${i}`,`_blank`)};let o=document.createElement(`button`);o.innerHTML=`📥 Tải HD`,o.title=`Tải video hoặc ảnh Xiaohongshu không logo`,o.style.cssText=`
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        padding: 5px 10px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        transition: all 0.15s ease;
      `,o.onmouseenter=()=>{o.style.background=`rgba(255, 255, 255, 0.25)`},o.onmouseleave=()=>{o.style.background=`rgba(255, 255, 255, 0.12)`},o.onclick=async e=>{e.stopPropagation(),e.preventDefault(),o.innerHTML=`⏳...`;try{let e=await(await fetch(`http://localhost:5000/api/extract`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:t})})).json();if(e.ok&&e.data){if(e.data.videoUrl){let t=(r||`xhs_video`).replace(/[/\\?%*:|"<>]/g,`_`).slice(0,50),n=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(e.data.videoUrl)}&download=1&filename=${encodeURIComponent(t+`.mp4`)}`;window.open(n,`_blank`),o.innerHTML=`✅ Video`}else e.data.images&&e.data.images.length>0&&(e.data.images.forEach((e,t)=>{let n=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(e)}&download=1&filename=xhs_img_${t+1}.jpg`;window.open(n,`_blank`)}),o.innerHTML=`✅ ${e.data.images.length} Ảnh`);setTimeout(()=>{o.innerHTML=`📥 Tải HD`},3e3)}}catch(e){alert(`Lỗi tải Xiaohongshu: `+e.message+`
(Hãy đảm bảo DUZK Backend Server đang chạy tại http://localhost:5000)`),o.innerHTML=`⚠️ Lỗi`,setTimeout(()=>{o.innerHTML=`📥 Tải HD`},3e3)}},i.appendChild(a),i.appendChild(o),window.getComputedStyle(e).position===`static`&&(e.style.position=`relative`),e.appendChild(i)}setInterval(t,2500),t(),chrome?.runtime?.onMessage&&chrome.runtime.onMessage.addListener((n,r,i)=>{if(n.type===`social-intelligence-cmd`){let r=Array.from(e.values());if(n.cmd===`ping`||n.cmd===`scan`)t(),i({detected:r.length,downloadable:r.length,selected:r.length,videos:r});else if(n.cmd===`downloadSelected`||n.cmd===`downloadVisible`){let e=r[0];e&&fetch(`http://localhost:5000/api/extract`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:e.pageUrl})}).then(e=>e.json()).then(t=>{if(t.ok&&t.data?.videoUrl){let n=(e.title||`xhs_video`).replace(/[/\\?%*:|"<>]/g,`_`).slice(0,50),r=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(t.data.videoUrl)}&download=1&filename=${encodeURIComponent(n+`.mp4`)}`;window.open(r,`_blank`)}})}}})}}),n={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{return await t.main()}catch(e){throw n.error(`The content script "xiaohongshu" crashed on startup!`,e),e}})()})();