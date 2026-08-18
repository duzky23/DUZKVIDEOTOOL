(function(){function e(e){return e}var t=e({matches:[`*://*.bilibili.com/*`],world:`MAIN`,main(){console.log(`[DUZKVIDEOTOOL] Bilibili Content Script Initialized`);let e=new Map;async function t(){let t=window.location.href,r=t.match(/(BV[a-zA-Z0-9]+)/i);if(r){let i=r[1],a=document.querySelector(`.video-title, #viewbox_report .video-title, h1[title]`),o=document.querySelector(`.up-name, .up-info--right .name, .username`),s=document.querySelector(`.up-avatar img, .bili-avatar img`),c=document.querySelector(`video`),l=a?a.getAttribute(`title`)||a.textContent?.trim():document.title.replace(`_哔哩哔哩_bilibili`,``).trim(),u=o?o.textContent?.trim():`Bilibili UP主`,d=s?s.src:``,f=c?c.src||c.currentSrc:``;e.has(i)||e.set(i,{id:i,platform:`bilibili`,title:l,author:u,authorAvatar:d,mediaUrl:f,pageUrl:t,likes:0,comments:0}),n(document.querySelector(`#bilibili-player, .bpx-player-container, .player-wrap`)||document.body,t,i,l)}let i=Array.from(e.values());try{chrome?.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`social-intelligence-stats`,stats:{detected:i.length,downloadable:i.length,selected:i.length},videos:i})}catch{}}function n(e,t,n,r){if(!e||e.querySelector(`.duzk-bili-toolbar`))return;let i=document.createElement(`div`);i.className=`duzk-bili-toolbar`,i.style.cssText=`
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
      `;let a=document.createElement(`button`);a.innerHTML=`⚡ Lồng Tiếng AI`,a.title=`Mở video này trong DUZK Video Studio`,a.style.cssText=`
        background: linear-gradient(135deg, #00A1D6 0%, #00F2FE 100%);
        color: #080C14;
        font-weight: 800;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      `,a.onmouseenter=()=>{a.style.transform=`scale(1.05)`},a.onmouseleave=()=>{a.style.transform=`scale(1)`},a.onclick=e=>{e.stopPropagation(),e.preventDefault();let i=encodeURIComponent(JSON.stringify({platform:`bilibili`,id:n,title:r,pageUrl:t}));window.open(`http://localhost:5000/?url=${encodeURIComponent(t)}&data=${i}`,`_blank`)};let o=document.createElement(`button`);o.innerHTML=`📥 Tải Video MP4`,o.title=`Tải video Bilibili HD không logo`,o.style.cssText=`
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        transition: all 0.15s ease;
      `,o.onmouseenter=()=>{o.style.background=`rgba(255, 255, 255, 0.25)`},o.onmouseleave=()=>{o.style.background=`rgba(255, 255, 255, 0.12)`},o.onclick=async e=>{e.stopPropagation(),e.preventDefault(),o.innerHTML=`⏳ Đang Lấy Link...`;try{let e=await(await fetch(`http://localhost:5000/api/extract`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:t})})).json();if(e.ok&&e.data?.videoUrl){let t=(r||`bilibili_video`).replace(/[/\\?%*:|"<>]/g,`_`).slice(0,50),n=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(e.data.videoUrl)}&download=1&filename=${encodeURIComponent(t+`.mp4`)}`;window.open(n,`_blank`),o.innerHTML=`✅ Đã Bắt Đầu Tải`,setTimeout(()=>{o.innerHTML=`📥 Tải Video MP4`},3e3)}else throw Error(e.error||`Lỗi bóc tách`)}catch(e){alert(`Lỗi tải video Bilibili: `+e.message+`
(Hãy đảm bảo DUZK Backend Server đang chạy tại http://localhost:5000)`),o.innerHTML=`⚠️ Lỗi Tải`,setTimeout(()=>{o.innerHTML=`📥 Tải Video MP4`},3e3)}};let s=document.createElement(`button`);s.innerHTML=`🎵 MP3`,s.title=`Tải âm thanh gốc MP3`,s.style.cssText=`
        background: rgba(245, 158, 11, 0.2);
        color: #FBBF24;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 16px;
        border: 1px solid rgba(245, 158, 11, 0.4);
        cursor: pointer;
        transition: all 0.15s ease;
      `,s.onmouseenter=()=>{s.style.background=`rgba(245, 158, 11, 0.35)`},s.onmouseleave=()=>{s.style.background=`rgba(245, 158, 11, 0.2)`},s.onclick=async e=>{e.stopPropagation(),e.preventDefault(),s.innerHTML=`⏳...`;try{let e=await(await fetch(`http://localhost:5000/api/extract`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:t})})).json();if(e.ok&&e.data?.videoUrl){let t=(r||`bilibili_audio`).replace(/[/\\?%*:|"<>]/g,`_`).slice(0,50),n=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(e.data.videoUrl)}&download=1&filename=${encodeURIComponent(t+`.mp3`)}`;window.open(n,`_blank`),s.innerHTML=`✅ MP3`,setTimeout(()=>{s.innerHTML=`🎵 MP3`},3e3)}}catch(e){alert(`Lỗi tải MP3 Bilibili: `+e.message),s.innerHTML=`🎵 MP3`}},i.appendChild(a),i.appendChild(o),i.appendChild(s),window.getComputedStyle(e).position===`static`&&(e.style.position=`relative`),e.appendChild(i)}setInterval(t,2e3),t(),chrome?.runtime?.onMessage&&chrome.runtime.onMessage.addListener((n,r,i)=>{if(n.type===`social-intelligence-cmd`){let r=Array.from(e.values());if(n.cmd===`ping`||n.cmd===`scan`)t(),i({detected:r.length,downloadable:r.length,selected:r.length,videos:r});else if(n.cmd===`downloadSelected`||n.cmd===`downloadVisible`){let e=r[0];e&&fetch(`http://localhost:5000/api/extract`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({url:e.pageUrl})}).then(e=>e.json()).then(t=>{if(t.ok&&t.data?.videoUrl){let n=(e.title||`bilibili_video`).replace(/[/\\?%*:|"<>]/g,`_`).slice(0,50),r=`http://localhost:5000/api/proxy-media?url=${encodeURIComponent(t.data.videoUrl)}&download=1&filename=${encodeURIComponent(n+`.mp4`)}`;window.open(r,`_blank`)}})}}})}}),n={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{return await t.main()}catch(e){throw n.error(`The content script "bilibili" crashed on startup!`,e),e}})()})();