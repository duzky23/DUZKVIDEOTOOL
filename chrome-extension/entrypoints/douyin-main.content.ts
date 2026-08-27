// @ts-nocheck
export default defineContentScript({
  matches: ["*://*.douyin.com/*"],
  world: "MAIN",
  main() {
    var douyinMain = (function () {
      "use strict";
      function B(a) {
        return a;
      }
      const I = {
        matches: ["*://*.douyin.com/*"],
        runAt: "document_idle",
        world: "MAIN",
        main() {
          const originalFetch = window.fetch;
          window.fetch = async function (...args) {
            const response = await originalFetch.apply(this, args);
            try {
              const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
              if (url && url.includes('/aweme/v1/web/comment/list/')) {
                const clone = response.clone();
                clone.json().then(data => {
                  document.dispatchEvent(new CustomEvent('social-intelligence:comments-intercepted', {
                    detail: JSON.stringify({ url, data })
                  }));
                }).catch(() => {});
              }
            } catch (err) {}
            return response;
          };
          const a = "data-social-intelligence-aweme",
            w = "data-social-intelligence-channel",
            C = new WeakMap(),
            f = (...n) => {
              for (const t of n)
                if (typeof t == "string" && t.trim()) return t.trim();
              return "";
            },
            _ = (...n) => {
              for (const t of n) {
                if (typeof t == "string" && t.startsWith("https://")) return t;
                if (Array.isArray(t)) {
                  const e = t.find(
                    (u) => typeof u == "string" && u.startsWith("https://"),
                  );
                  if (e) return e;
                }
              }
              return "";
            },
            g = (...n) => {
              for (const t of n) {
                const e = Number(t);
                if (Number.isFinite(e) && e >= 0) return e;
              }
              return 0;
            },
            q = (n, t, e = 8e3) => {
              const u = new WeakSet();
              let s = 0;
              const o = (c, l) => {
                if (!c || typeof c != "object" || l > 9 || s > e) return;
                const i = c;
                if (u.has(i)) return;
                (u.add(i), (s += 1));
                const d = i.awemeInfo || i.aweme_detail;
                if (d && typeof d == "object" && t(d)) return d;
                if (t(i)) return i;
                for (const h of Object.keys(i)) {
                  if (
                    ["return", "stateNode", "_owner", "alternate"].includes(h)
                  )
                    continue;
                  const m = i[h];
                  if (m && typeof m == "object") {
                    const p = o(m, l + 1);
                    if (p) return p;
                  }
                }
              };
              let r = n;
              for (let c = 0; r && c < 18; c += 1) {
                for (const l of Object.keys(r).filter(
                  (i) =>
                    i.startsWith("__reactProps") ||
                    i.startsWith("__reactFiber"),
                )) {
                  const i = o(r[l], 0);
                  if (i) return i;
                }
                r = r.parentElement;
              }
            },
            x = (n) =>
              q(
                n,
                (t) =>
                  !!(t.awemeId || t.aweme_id) &&
                  !!(t.video || t.stats || t.statistics),
              ),
            N = (n, t) => {
              var l, i, d, h, m, p, v, U, E;
              const e = t.closest('a[href*="/video/"]'),
                u =
                  ((l =
                    e == null ? void 0 : e.pathname.match(/\/video\/(\d+)/)) ==
                  null
                    ? void 0
                    : l[1]) || "",
                s = String(n.awemeId || n.aweme_id || n.id || u);
              if (!s) return;
                const o = n.video || {},
                  r = n.authorInfo || n.author || {},
                  c = n.stats || n.statistics || {},
                  music = n.music || {},
                  imagesList = n.images || [];

                let musicUrl = _(music.playUrl?.urlList, music.play_url?.url_list);
                let imageUrls = [];
                if (Array.isArray(imagesList) && imagesList.length > 0) {
                  imageUrls = imagesList.map(img => _(img.urlList, img.url_list)).filter(Boolean);
                }
              return {
                id: s,
                description: f(
                  n.itemTitle,
                  n.item_title,
                  n.desc,
                  (i = e == null ? void 0 : e.querySelector("p")) == null
                    ? void 0
                    : i.textContent,
                ),
                author: f(r.nickname, r.uniqueId, r.unique_id),
                mediaUrl: _(
                  o.playAddr,
                  (d = o.playAddr) == null ? void 0 : d.urlList,
                  (h = o.play_addr) == null ? void 0 : h.url_list,
                  o.downloadAddr,
                  (m = o.downloadAddr) == null ? void 0 : m.urlList,
                  (p = o.download_addr) == null ? void 0 : p.url_list,
                  o.playApi,
                ),
                coverUrl: _(
                  o.cover,
                  o.coverUrlList,
                  (v = o.cover) == null ? void 0 : v.urlList,
                  (U = o.cover) == null ? void 0 : U.url_list,
                  o.originCover,
                  o.originCoverUrlList,
                  (E = e == null ? void 0 : e.querySelector("img")) == null
                    ? void 0
                    : E.src,
                ),
                pageUrl:
                  (e == null ? void 0 : e.href) ||
                  `https://www.douyin.com/video/${s}`,
                likes: g(c.diggCount, c.digg_count),
                comments: g(c.commentCount, c.comment_count),
                shares: g(c.shareCount, c.share_count),
                musicUrl: musicUrl,
                images: imageUrls,
              };
            },
            M = (n) => {
              var s, o, r, c, l, i;
              const t =
                (s = n.pathname.match(/\/video\/(\d+)/)) == null
                  ? void 0
                  : s[1];
              if (!t) return;
              const e = n.querySelector("img"),
                u =
                  ((r =
                    (o = n.querySelector("p")) == null
                      ? void 0
                      : o.textContent) == null
                    ? void 0
                    : r.trim()) ||
                  ((c = e == null ? void 0 : e.alt) == null
                    ? void 0
                    : c.replace(/^[^：:]+[：:]\s*/, "").trim()) ||
                  "";
              return {
                id: t,
                description: u,
                author:
                  ((i =
                    (l = document.querySelector("h1")) == null
                      ? void 0
                      : l.textContent) == null
                    ? void 0
                    : i.trim()) || "",
                mediaUrl: "",
                coverUrl: (e == null ? void 0 : e.src) || "",
                pageUrl: n.href,
                likes: 0,
                comments: 0,
                shares: 0,
              };
            },
            b = (n) => {
              var o;
              const e = [...document.querySelectorAll("body *")].find((r) => {
                  var c;
                  return (
                    r.children.length === 0 &&
                    ((c = r.textContent) == null ? void 0 : c.trim()) === n
                  );
                }),
                s = (
                  ((o = e == null ? void 0 : e.parentElement) == null
                    ? void 0
                    : o.textContent) || ""
                ).match(new RegExp(`${n}\\s*([\\d.]+万?)`));
              return s
                ? s[1].endsWith("万")
                  ? Number.parseFloat(s[1]) * 1e4
                  : Number(s[1])
                : 0;
            },
            O = () => {
              var r, c, l, i, d, h, m, p;
              if (!location.pathname.includes("/user/")) return;
              const n = document.querySelector("h1");
              if (!n) return;
              const t =
                  q(
                    n,
                    (v) =>
                      typeof v.nickname == "string" &&
                      !!(v.secUid || v.sec_uid || v.uniqueId || v.unique_id),
                    12e3,
                  ) || {},
                e = document.body.innerText.slice(0, 12e3),
                u = f(
                  t.uniqueId,
                  t.unique_id,
                  (r = e.match(/抖音号[：:]\s*([^\s]+)/)) == null
                    ? void 0
                    : r[1],
                ),
                s = g(
                  t.awemeCount,
                  t.aweme_count,
                  (i =
                    (l =
                      (c = document.querySelector(
                        '[role="tab"][aria-selected="true"]',
                      )) == null
                        ? void 0
                        : c.textContent) == null
                      ? void 0
                      : l.match(/\d+/)) == null
                    ? void 0
                    : i[0],
                ),
                o = document.querySelector('img[alt*="头像"]');
              return {
                platform: "douyin",
                pageUrl: location.href,
                secUid: f(
                  t.secUid,
                  t.sec_uid,
                  (d = location.pathname.split("/user/")[1]) == null
                    ? void 0
                    : d.split(/[?/]/)[0],
                ),
                uid: f(t.uid),
                uniqueId: u,
                nickname: f(t.nickname, n.textContent),
                signature: f(t.signature, t.desc),
                avatarUrl: _(
                  (h = t.avatarLarger) == null ? void 0 : h.urlList,
                  (m = t.avatarMedium) == null ? void 0 : m.urlList,
                  o == null ? void 0 : o.src,
                ),
                followerCount: g(t.followerCount, t.follower_count, b("粉丝")),
                followingCount: g(
                  t.followingCount,
                  t.following_count,
                  b("关注"),
                ),
                totalFavorited: g(
                  t.totalFavorited,
                  t.total_favorited,
                  b("获赞"),
                ),
                postCount: s,
                ipLocation: f(
                  t.ipLocation,
                  t.ip_location,
                  (p = e.match(/IP属地[：:]\s*([^\s]+)/)) == null
                    ? void 0
                    : p[1],
                ),
                collectedAt: new Date().toISOString(),
              };
            },
            W = () => {
              const n = O();
              if (!n) {
                document.documentElement.removeAttribute(w);
                return;
              }
              (document.documentElement.setAttribute(w, JSON.stringify(n)),
                document.dispatchEvent(
                  new Event("social-intelligence:channel-ready"),
                ));
            },
            A = () => {
              if (location.pathname.includes("/user/")) {
                // Channel / User Profile Grid Mode: Tag individual video cards
                const links = Array.from(document.querySelectorAll('a[href^="/video/"], a[href*="/video/"]'));
                for (const e of links) {
                  const u = x(e),
                    s = u
                      ? N(u, e)
                      : e instanceof HTMLAnchorElement
                        ? M(e)
                        : void 0;
                  if (!s || !s.id) continue;
                  const targetHost = e.closest('li[class*="item"], div[class*="card"]') || e;
                  const o = targetHost.getAttribute(a);
                  let r;
                  try { r = o ? JSON.parse(o) : void 0; } catch { r = void 0; }
                  if (C.get(targetHost) !== s.id || (s.mediaUrl && (!r || !r.mediaUrl))) {
                    C.set(targetHost, s.id);
                    targetHost.setAttribute(a, JSON.stringify(s));
                    targetHost.dispatchEvent(new Event("social-intelligence:aweme-ready", { bubbles: !0 }));
                  }
                }
              } else {
                // Single Video or Feed Mode: Only tag the ONE active player container
                const activeContainer = document.querySelector('[data-e2e="feed-active-video"]') || 
                                        document.querySelector('.slider-video') || 
                                        document.querySelector('.xgplayer-container') || 
                                        document.body;
                if (!activeContainer) return;

                const activeVideo = activeContainer.querySelector('video') || document.querySelector('video');
                if (!activeVideo) return;

                const u = x(activeVideo) || x(activeContainer);
                const s = u ? N(u, activeVideo) : void 0;
                if (!s || !s.id) return;

                // Clean any rogue tags on sub-elements
                document.querySelectorAll(`[${a}]`).forEach(el => {
                  if (el !== activeContainer) el.removeAttribute(a);
                });

                const o = activeContainer.getAttribute(a);
                let r;
                try { r = o ? JSON.parse(o) : void 0; } catch { r = void 0; }
                if (C.get(activeContainer) !== s.id || (s.mediaUrl && (!r || !r.mediaUrl))) {
                  C.set(activeContainer, s.id);
                  activeContainer.setAttribute(a, JSON.stringify(s));
                  activeContainer.dispatchEvent(new Event("social-intelligence:aweme-ready", { bubbles: !0 }));
                }
              }
              W();
            };
          let S;
          const T = () => {
            (S && window.clearTimeout(S), (S = window.setTimeout(A, 250)));
          };
          (new MutationObserver(T).observe(document.documentElement, {
            childList: !0,
            subtree: !0,
          }),
            window.addEventListener("scroll", T, { passive: !0 }),
            window.setInterval(A, 2e3),
            A());
        },
      };
      function P() {}
      function y(a, ...w) {}
      const L = {
        debug: (...a) => y(console.debug, ...a),
        log: (...a) => y(console.log, ...a),
        warn: (...a) => y(console.warn, ...a),
        error: (...a) => y(console.error, ...a),
      };
      return (async () => {
        try {
          return await I.main();
        } catch (a) {
          throw (
            L.error('The content script "douyin-main" crashed on startup!', a),
            a
          );
        }
      })();
    })();
    douyinMain;
  },
});
