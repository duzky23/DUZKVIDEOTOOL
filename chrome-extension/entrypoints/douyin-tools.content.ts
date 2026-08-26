// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.douyin.com/*"],
  main() {
    var douyinTools = (function () {
      "use strict";
      var le = Object.defineProperty;
      var re = (k, b, S) =>
        b in k
          ? le(k, b, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: S,
            })
          : (k[b] = S);
      var x = (k, b, S) => re(k, typeof b != "symbol" ? b + "" : b, S);
      var O, F;
      function k(c) {
        return c;
      }
      const b = {
          vi: {
            title: "Social Intelligence",
            detected: "Đã phát hiện",
            downloadable: "Có thể tải",
            selected: "Đã chọn",
            download: "Tải video",
            unavailable: "Chưa lấy URL",
            select: "Chọn",
            selectedShort: "Đã chọn",
            keyword: "Nhập từ khóa Douyin",
            search: "Tìm kiếm",
            scan: "Quét nội dung",
            stop: "Dừng quét",
            downloadSelected: "Tải đã chọn",
            downloadVisible: "Tải đã phát hiện",
            downloadPage: "Quét & tải trang",
            channelMode: "Trang kênh",
            searchMode: "Kết quả từ khóa",
            videoMode: "Trang video",
            feedMode: "Bảng tin",
            limit: "Giới hạn",
            ready: "Sẵn sàng",
            scanning: "Đang cuộn và phát hiện bài viết…",
            resolving: "Đang mở từng bài để lấy URL video…",
            downloading: "Đang tải",
            completed: "Hoàn tất",
            noVideo: "Chưa có video với URL tải hợp lệ. Hãy quét kênh trước.",
            accessibleOnly:
              "Chỉ tải nội dung bạn được phép xem; không hỗ trợ DRM.",
            collapse: "Thu gọn",
            expand: "Mở công cụ tải",
            clear: "Bỏ chọn",
            channelInfo: "Thông tin kênh",
            scanChannel: "Quét toàn bộ kênh",
            downloadChannel: "Tải toàn bộ kênh",
            exportChannel: "Xuất JSON kênh",
            channelUnknown: "Đang đọc thông tin kênh…",
            exported: "Đã xuất hồ sơ và danh sách bài viết",
            followers: "người theo dõi",
          },
          en: {
            title: "Social Intelligence",
            detected: "Detected",
            downloadable: "Downloadable",
            selected: "Selected",
            download: "Download",
            unavailable: "URL pending",
            select: "Select",
            selectedShort: "Selected",
            keyword: "Enter a Douyin keyword",
            search: "Search",
            scan: "Scan page",
            stop: "Stop scan",
            downloadSelected: "Download selected",
            downloadVisible: "Download detected",
            downloadPage: "Scan & download page",
            channelMode: "Channel page",
            searchMode: "Keyword results",
            videoMode: "Video page",
            feedMode: "Feed",
            limit: "Limit",
            ready: "Ready",
            scanning: "Scrolling and detecting posts…",
            resolving: "Opening posts to resolve video URLs…",
            downloading: "Downloading",
            completed: "Completed",
            noVideo:
              "No video has a valid download URL yet. Scan the channel first.",
            accessibleOnly:
              "Only download content you may view; DRM is not supported.",
            collapse: "Collapse",
            expand: "Open download tools",
            clear: "Clear",
            channelInfo: "Channel information",
            scanChannel: "Scan entire channel",
            downloadChannel: "Download entire channel",
            exportChannel: "Export channel JSON",
            channelUnknown: "Reading channel information…",
            exported: "Profile and post list exported",
            followers: "followers",
          },
        },
        S = {
          matches: ["*://*.douyin.com/*"],
          runAt: "document_idle",
          main() {
            const c = "data-social-intelligence-aweme",
              t = "data-social-intelligence-channel",
              e = new Map(),
              a = new Set(),
              u = new WeakMap();
            let p = "vi",
              h = !1,
              m = !1,
              f,
              r;
            const s = () => b[p],
              q = (n) => new Promise((i) => setTimeout(i, n)),
              H = () => location.pathname.includes("/user/"),
              C = () => [...e.values()].filter((n) => !!n.mediaUrl),
              ee = (n) => {
                const i = n.getAttribute(c);
                if (i)
                  try {
                    const o = JSON.parse(i);
                    return o.id ? o : void 0;
                  } catch {
                    return;
                  }
              },
              A = () => {
                const n = document.documentElement.getAttribute(t);
                if (n)
                  try {
                    ((f = JSON.parse(n)),
                      r &&
                        f.postCount > 0 &&
                        (r.limit.value = String(Math.min(1e3, f.postCount))));
                  } catch {
                    f = void 0;
                  }
              },
              R = (n) =>
                n
                  .normalize("NFKC")
                  .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 70),
              te = (n) =>
                [R(n.author), R(n.description), n.id]
                  .filter(Boolean)
                  .join("_") || `douyin_${n.id}`,
              D = (n) =>
                new Promise((i) => {
                  chrome.runtime.sendMessage(n, (o) => {
                    chrome.runtime.lastError
                      ? i({ ok: !1, error: chrome.runtime.lastError.message })
                      : i(o);
                  });
                }),
              B = (n) =>
                D({
                  type: "social-intelligence:download",
                  payload: { mediaUrl: n.mediaUrl, filename: te(n) },
                }),
              ne = (n) =>
                D({
                  type: "social-intelligence:resolve-douyin-post",
                  payload: { id: n.id, pageUrl: n.pageUrl },
                }),
              v = (n, i = "ok") => {
                r && ((r.status.textContent = n), (r.status.dataset.kind = i));
              },
              U = async (n) => {
                const i = n.filter((g) => g.mediaUrl);
                if (i.length === 0) {
                  v(s().noVideo, "error");
                  return;
                }
                const o = (r == null ? void 0 : r.limit.valueAsNumber) || 30,
                  l = i.slice(0, Math.min(1e3, Math.max(1, o)));
                let d = 0;
                for (let g = 0; g < l.length; g += 1)
                  (v(`${s().downloading} ${g + 1}/${l.length}…`),
                    (await B(l[g])).ok && (d += 1),
                    await q(450));
                v(`${s().completed}: ${d}/${l.length}`, d ? "ok" : "error");
              },
              oe = async () => {
                A();
                const n = {
                    schemaVersion: 1,
                    exportedAt: new Date().toISOString(),
                    profile: f || null,
                    posts: [...e.values()],
                    summary: { detected: e.size, downloadable: C().length },
                  },
                  i = await D({
                    type: "social-intelligence:export-channel",
                    payload: {
                      filename: `${R((f == null ? void 0 : f.nickname) || "douyin_channel")}_${Date.now()}`,
                      data: n,
                    },
                  });
                v(
                  i.ok ? s().exported : i.error || "Export failed",
                  i.ok ? "ok" : "error",
                );
              },
              ae = () =>
                H()
                  ? s().channelMode
                  : location.pathname.includes("/search/")
                    ? s().searchMode
                    : location.pathname.includes("/video/")
                      ? s().videoMode
                      : s().feedMode,
              w = () => {
                chrome.runtime.sendMessage({
                  type: "social-intelligence-stats",
                  stats: { detected: e.size, downloadable: C().length, selected: a.size },
                  videos: C()
                }).catch(() => {});
              },
              J = (n, i) => {
                var z, Y;
                if (!n || !i || !i.id) return;

                // Enforce strictly 1 toolbar per aweme ID in feed / single video
                const existing = document.querySelector(`.social-intelligence-video-actions[data-aweme-id="${i.id}"]`);
                if (existing && existing.parentElement === n) return;
                if (existing && !location.pathname.includes("/user/")) {
                  return;
                }

                const o = u.get(n);
                if ((o == null ? void 0 : o.dataset.awemeId) === i.id) return;
                o == null || o.remove();

                const l = n instanceof HTMLVideoElement ? n.parentElement : n;
                if (!(l instanceof HTMLElement)) return;
                if (l.parentElement?.closest('.social-intelligence-media-host')) {
                  return;
                }

                if (
                  (getComputedStyle(l).position === "static" &&
                    (l.style.position = "relative"),
                  !document.getElementById(
                    "social-intelligence-overlay-visibility",
                  ))
                ) {
                  const y = document.createElement("style");
                  ((y.id = "social-intelligence-overlay-visibility"),
                    (y.textContent = `
          .social-intelligence-video-actions{opacity:.18;transform:translateY(-2px);transition:opacity .18s ease,transform .18s ease}
          .social-intelligence-media-host:hover>.social-intelligence-video-actions,
          .social-intelligence-video-actions:hover{opacity:1;transform:translateY(0)}
        `),
                    document.documentElement.appendChild(y));
                }
                l.classList.add("social-intelligence-media-host");
                const d = document.createElement("div");
                ((d.className = "social-intelligence-video-actions"),
                  (d.dataset.awemeId = i.id),
                  (d.style.cssText =
                    "position:absolute;top:16px;right:16px;z-index:2147483646;pointer-events:auto;display:flex;flex-direction:row;align-items:center;gap:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);padding:6px 10px;border-radius:30px;border:1px solid rgba(255,255,255,0.25);box-shadow:0 4px 20px rgba(0,0,0,0.6);"));
                const g = d.attachShadow({ mode: "open" });
                ((g.innerHTML = `
        <style>
          .toolbar { display: flex; align-items: center; gap: 6px; }
          .dy-btn { display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; cursor: pointer; color: #fff; padding: 6px 12px; font-size: 12px; font-weight: 700; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); outline: none; white-space: nowrap; }
          .dy-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.2); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
          .dy-btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .download { background: linear-gradient(135deg, #fe2c55, #ff5277); border-color: rgba(254,44,85,0.5); }
          .dub { background: linear-gradient(135deg, #8b5cf6, #00f2fe); border-color: rgba(0,242,254,0.5); }
          .pick { background: rgba(255,255,255,0.1); }
          .pick.on { background: linear-gradient(135deg, #10b981, #059669); border-color: rgba(16,185,129,0.5); }
          .icon { font-size: 14px; line-height: 1; }
        </style>
        <div class="toolbar">
          <button class="dy-btn download" type="button" ${i.mediaUrl ? "" : "disabled"} title="Tải Video HD Không Logo">
            <span class="icon">↓</span>
            <span>Tải HD</span>
          </button>
          <button class="dy-btn dub" type="button" title="Mở trong Studio Lồng Tiếng AI">
            <span class="icon">🎙️</span>
            <span>Lồng Tiếng AI</span>
          </button>
          <button class="dy-btn pick ${a.has(i.id) ? "on" : ""}" type="button" title="Chọn video này vào danh sách">
            <span class="icon">${a.has(i.id) ? "✓" : "＋"}</span>
            <span>${a.has(i.id) ? "Đã chọn" : "Chọn"}</span>
          </button>
        </div>`),
                  (z = g.querySelector(".download")) == null ||
                    z.addEventListener("click", async (y) => {
                      (y.preventDefault(), y.stopPropagation());
                      const V = await B(i);
                      v(
                        V.ok
                          ? `${s().completed}: 1/1`
                          : V.error || "Download failed",
                        V.ok ? "ok" : "error",
                      );
                    }),
                  (g.querySelector(".dub")) == null ||
                    g.querySelector(".dub").addEventListener("click", (y) => {
                      y.preventDefault();
                      y.stopPropagation();
                      const payload = {
                        platform: 'douyin',
                        id: i.id,
                        title: i.description || 'Video Douyin',
                        author: i.author || 'Douyin Creator',
                        videoUrl: i.mediaUrl,
                        coverUrl: i.coverUrl,
                        musicUrl: i.musicUrl,
                        pageUrl: i.pageUrl || window.location.href,
                        likes: i.likes || 0,
                        comments: i.comments || 0,
                        shares: i.shares || 0
                      };
                      const encodedData = encodeURIComponent(JSON.stringify(payload));
                      window.open(`http://localhost:5000/?data=${encodedData}&url=${encodeURIComponent(i.pageUrl || window.location.href)}`, '_blank');
                    }),
                  (Y = g.querySelector(".pick")) == null ||
                    Y.addEventListener("click", (y) => {
                      (y.preventDefault(),
                        y.stopPropagation(),
                        a.has(i.id) ? a.delete(i.id) : a.add(i.id),
                        d.remove(),
                        u.delete(n),
                        J(n, i),
                        w());
                    }),
                  l.appendChild(d),
                  u.set(n, d));
              },
              E = () => {
                for (const n of document.querySelectorAll(`[${c}]`)) {
                  const i = ee(n);
                  if (!i) continue;
                  const o = e.get(i.id);
                  ((!o || (!o.mediaUrl && i.mediaUrl)) && e.set(i.id, i),
                    J(n, e.get(i.id)));
                }
                w();
              },
              ie = async () => {
                var i;
                const n = [...e.values()].filter((o) => !o.mediaUrl);
                for (let o = 0; o < n.length && !m; o += 1) {
                  v(`${s().resolving} ${o + 1}/${n.length}`);
                  const l = await ne(n[o]);
                  l.ok &&
                    (i = l.item) != null &&
                    i.mediaUrl &&
                    e.set(l.item.id, { ...n[o], ...l.item });
                }
                w();
              },
              _ = async (n = !1) => {
                if (h) {
                  m = !0;
                  return;
                }
                ((h = !0), (m = !1), w(), v(s().scanning));
                const i =
                    (f == null ? void 0 : f.postCount) ||
                    (r == null ? void 0 : r.limit.valueAsNumber) ||
                    30,
                  o = Math.min(1e3, Math.max(1, i));
                let l = 0,
                  d = e.size;
                for (
                  let g = 0;
                  g < 250 &&
                  e.size < o &&
                  !m &&
                  (E(),
                  window.scrollBy({
                    top: Math.max(650, window.innerHeight * 0.9),
                    behavior: "smooth",
                  }),
                  await q(850),
                  E(),
                  e.size === d ? (l += 1) : (l = 0),
                  (d = e.size),
                  !(l >= 8));
                  g += 1
                );
                (n && !m && (await ie()),
                  (h = !1),
                  (m = !1),
                  w(),
                  v(
                    `${s().detected}: ${e.size} · ${s().downloadable}: ${C().length}`,
                  ));
              };
              
              let interceptedComments = [];
              document.addEventListener('social-intelligence:comments-intercepted', (e) => {
                try {
                   const detail = JSON.parse(e.detail);
                   if (detail && detail.data && detail.data.comments) {
                      interceptedComments = interceptedComments.concat(detail.data.comments.map(c => c.text));
                   }
                } catch(err) {}
              });
              
              chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
                if (msg.type === "social-intelligence-cmd") {
                  switch (msg.cmd) {
                    case "scan": _(!1); break;
                    case "scanChannel": _(!0); break;
                    case "exportChannel": oe(); break;
                    case "downloadChannel": (async () => { await _(!0); await U(C()); })(); break;
                    case "downloadSelected": U([...a].map((d) => e.get(d)).filter(Boolean)); break;
                    case "downloadVisible": U(C()); break;
                    case "downloadPage": (async () => { await _(!1); await U(C()); })(); break;
                    case "clear": a.clear(); w(); break;
                    case "ping": sendResponse({ detected: e.size, downloadable: C().length, selected: a.size, videos: C() }); return true;
                    case "downloadAudio": 
                      // Custom action for audio download
                      C().forEach(async (item) => {
                        if (item.musicUrl) {
                           D({
                            type: "social-intelligence:download",
                            payload: { mediaUrl: item.musicUrl, filename: te(item) + "_audio" }
                          });
                        }
                      });
                      break;
                    case "aiSummarizeComments":
                      if (interceptedComments.length === 0) {
                        sendResponse({ error: "Chưa thu thập được bình luận nào. Hãy lướt xuống phần bình luận của video để công cụ ghi nhận."});
                        return true;
                      }
                      D({
                         type: "social-intelligence:ai-analyze",
                         payload: {
                           prompt: "Tóm tắt ngắn gọn các ý chính và phân tích cảm xúc (tích cực/tiêu cực) từ danh sách bình luận sau của video Douyin:",
                           text: interceptedComments.slice(0, 100).join("\n")
                         }
                      }).then(sendResponse);
                      return true;
                    case "aiExtractScript":
                      const selectedVideo = [...a].map(d => e.get(d))[0] || C()[0];
                      if (!selectedVideo) {
                         sendResponse({ error: "Chưa chọn video nào để phân tích." });
                         return true;
                      }
                      D({
                         type: "social-intelligence:ai-analyze",
                         payload: {
                           prompt: "Dựa vào tiêu đề và mô tả của video Douyin sau, hãy dự đoán/viết lại kịch bản ngắn gọn cho video này để tham khảo làm nội dung tương tự:",
                           text: `Tiêu đề: ${selectedVideo.description}\nTác giả: ${selectedVideo.author}`
                         }
                      }).then(sendResponse);
                      return true;
                    case "aiGenerateTags":
                      const vid = [...a].map(d => e.get(d))[0] || C()[0];
                      if (!vid) {
                         sendResponse({ error: "Chưa chọn video nào." });
                         return true;
                      }
                      D({
                         type: "social-intelligence:ai-analyze",
                         payload: {
                           prompt: "Dựa vào nội dung video Douyin sau, hãy tạo ra 10 hashtag tối ưu SEO (bao gồm cả tiếng Trung và tiếng Việt) để giúp video lên xu hướng:",
                           text: `Nội dung: ${vid.description}`
                         }
                      }).then(sendResponse);
                      return true;
                  }
                  sendResponse({ok: true});
                }
              });

            ((r = null),
              A(),
              w(),
              E(),
              document.addEventListener("social-intelligence:aweme-ready", E),
              document.addEventListener("social-intelligence:channel-ready", w),
              new MutationObserver(E).observe(document.documentElement, {
                childList: !0,
                subtree: !0,
              }),
              window.setInterval(E, 2e3));
          },
        },
        T =
          ((F = (O = globalThis.browser) == null ? void 0 : O.runtime) == null
            ? void 0
            : F.id) == null
            ? globalThis.chrome
            : globalThis.browser;
      function M(c, ...t) {}
      const j = {
          debug: (...c) => M(console.debug, ...c),
          log: (...c) => M(console.log, ...c),
          warn: (...c) => M(console.warn, ...c),
          error: (...c) => M(console.error, ...c),
        },
        $ = class $ extends Event {
          constructor(t, e) {
            (super($.EVENT_NAME, {}), (this.newUrl = t), (this.oldUrl = e));
          }
        };
      x($, "EVENT_NAME", K("wxt:locationchange"));
      let N = $;
      function K(c) {
        var t;
        return `${(t = T == null ? void 0 : T.runtime) == null ? void 0 : t.id}:douyin-tools:${c}`;
      }
      function G(c) {
        let t, e;
        return {
          run() {
            t == null &&
              ((e = new URL(location.href)),
              (t = c.setInterval(() => {
                let a = new URL(location.href);
                a.href !== e.href &&
                  (window.dispatchEvent(new N(a, e)), (e = a));
              }, 1e3)));
          },
        };
      }
      const I = class I {
        constructor(t, e) {
          x(this, "isTopFrame", window.self === window.top);
          x(this, "abortController");
          x(this, "locationWatcher", G(this));
          x(this, "receivedMessageIds", new Set());
          ((this.contentScriptName = t),
            (this.options = e),
            (this.abortController = new AbortController()),
            this.isTopFrame
              ? (this.listenForNewerScripts({ ignoreFirstEvent: !0 }),
                this.stopOldScripts())
              : this.listenForNewerScripts());
        }
        get signal() {
          return this.abortController.signal;
        }
        abort(t) {
          return this.abortController.abort(t);
        }
        get isInvalid() {
          return (
            T.runtime.id == null && this.notifyInvalidated(),
            this.signal.aborted
          );
        }
        get isValid() {
          return !this.isInvalid;
        }
        onInvalidated(t) {
          return (
            this.signal.addEventListener("abort", t),
            () => this.signal.removeEventListener("abort", t)
          );
        }
        block() {
          return new Promise(() => {});
        }
        setInterval(t, e) {
          const a = setInterval(() => {
            this.isValid && t();
          }, e);
          return (this.onInvalidated(() => clearInterval(a)), a);
        }
        setTimeout(t, e) {
          const a = setTimeout(() => {
            this.isValid && t();
          }, e);
          return (this.onInvalidated(() => clearTimeout(a)), a);
        }
        requestAnimationFrame(t) {
          const e = requestAnimationFrame((...a) => {
            this.isValid && t(...a);
          });
          return (this.onInvalidated(() => cancelAnimationFrame(e)), e);
        }
        requestIdleCallback(t, e) {
          const a = requestIdleCallback((...u) => {
            this.signal.aborted || t(...u);
          }, e);
          return (this.onInvalidated(() => cancelIdleCallback(a)), a);
        }
        addEventListener(t, e, a, u) {
          var p;
          (e === "wxt:locationchange" &&
            this.isValid &&
            this.locationWatcher.run(),
            (p = t.addEventListener) == null ||
              p.call(t, e.startsWith("wxt:") ? K(e) : e, a, {
                ...u,
                signal: this.signal,
              }));
        }
        notifyInvalidated() {
          (this.abort("Content script context invalidated"),
            j.debug(
              `Content script "${this.contentScriptName}" context invalidated`,
            ));
        }
        stopOldScripts() {
          window.postMessage(
            {
              type: I.SCRIPT_STARTED_MESSAGE_TYPE,
              contentScriptName: this.contentScriptName,
              messageId: Math.random().toString(36).slice(2),
            },
            "*",
          );
        }
        verifyScriptStartedEvent(t) {
          var p, h, m;
          const e =
              ((p = t.data) == null ? void 0 : p.type) ===
              I.SCRIPT_STARTED_MESSAGE_TYPE,
            a =
              ((h = t.data) == null ? void 0 : h.contentScriptName) ===
              this.contentScriptName,
            u = !this.receivedMessageIds.has(
              (m = t.data) == null ? void 0 : m.messageId,
            );
          return e && a && u;
        }
        listenForNewerScripts(t) {
          let e = !0;
          const a = (u) => {
            if (this.verifyScriptStartedEvent(u)) {
              this.receivedMessageIds.add(u.data.messageId);
              const p = e;
              if (((e = !1), p && t != null && t.ignoreFirstEvent)) return;
              this.notifyInvalidated();
            }
          };
          (addEventListener("message", a),
            this.onInvalidated(() => removeEventListener("message", a)));
        }
      };
      x(I, "SCRIPT_STARTED_MESSAGE_TYPE", K("wxt:content-script-started"));
      let P = I;
      const W = Symbol("null");
      let Q = 0;
      class X extends Map {
        constructor(...t) {
          (super(),
            (this._objectHashes = new WeakMap()),
            (this._symbolHashes = new Map()),
            (this._publicKeys = new Map()));
          const [e] = t;
          if (e != null) {
            if (typeof e[Symbol.iterator] != "function")
              throw new TypeError(
                typeof e +
                  " is not iterable (cannot read property Symbol(Symbol.iterator))",
              );
            for (const [a, u] of e) this.set(a, u);
          }
        }
        _getPublicKeys(t, e = !1) {
          if (!Array.isArray(t))
            throw new TypeError("The keys parameter must be an array");
          const a = this._getPrivateKey(t, e);
          let u;
          return (
            a && this._publicKeys.has(a)
              ? (u = this._publicKeys.get(a))
              : e && ((u = [...t]), this._publicKeys.set(a, u)),
            { privateKey: a, publicKey: u }
          );
        }
        _getPrivateKey(t, e = !1) {
          const a = [];
          for (const u of t) {
            const p = u === null ? W : u;
            let h;
            if (
              (typeof p == "object" || typeof p == "function"
                ? (h = "_objectHashes")
                : typeof p == "symbol"
                  ? (h = "_symbolHashes")
                  : (h = !1),
              !h)
            )
              a.push(p);
            else if (this[h].has(p)) a.push(this[h].get(p));
            else if (e) {
              const m = `@@mkm-ref-${Q++}@@`;
              (this[h].set(p, m), a.push(m));
            } else return !1;
          }
          return JSON.stringify(a);
        }
        set(t, e) {
          const { publicKey: a } = this._getPublicKeys(t, !0);
          return super.set(a, e);
        }
        get(t) {
          const { publicKey: e } = this._getPublicKeys(t);
          return super.get(e);
        }
        has(t) {
          const { publicKey: e } = this._getPublicKeys(t);
          return super.has(e);
        }
        delete(t) {
          const { publicKey: e, privateKey: a } = this._getPublicKeys(t);
          return !!(e && super.delete(e) && this._publicKeys.delete(a));
        }
        clear() {
          (super.clear(), this._symbolHashes.clear(), this._publicKeys.clear());
        }
        get [Symbol.toStringTag]() {
          return "ManyKeysMap";
        }
        get size() {
          return super.size;
        }
      }
      new X();
      function ce() {}
      function L(c, ...t) {}
      const Z = {
        debug: (...c) => L(console.debug, ...c),
        log: (...c) => L(console.log, ...c),
        warn: (...c) => L(console.warn, ...c),
        error: (...c) => L(console.error, ...c),
      };
      return (async () => {
        try {
          const { main: c, ...t } = S,
            e = new P("douyin-tools", t);
          return await c(e);
        } catch (c) {
          throw (
            Z.error('The content script "douyin-tools" crashed on startup!', c),
            c
          );
        }
      })();
    })();
    douyinTools;
  },
});
