// @ts-nocheck
export default defineBackground(() => {
  var background = (function () {
    "use strict";
    var v, g;
    function S(o) {
      return o == null || typeof o == "function" ? { main: o } : o;
    }
    function jsonToCsv(data) {
      let posts = data.posts || (Array.isArray(data) ? data : Object.values(data).filter(v => v && typeof v === 'object' && v.id));
      if (!Array.isArray(posts)) posts = [posts];
      if (posts.length === 0) return "";
      const keys = ["id", "description", "author", "likes", "comments", "shares", "mediaUrl", "coverUrl", "musicUrl"];
      const header = keys.join(",") + "\n";
      const rows = posts.map(p => keys.map(k => `"${String(p[k] || '').replace(/"/g, '""')}"`).join(",")).join("\n");
      return header + rows;
    }
    
    async function translateTextWithGemini(text) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['geminiApiKey'], async (res) => {
          if (!res.geminiApiKey) return resolve(text);
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${res.geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Translate the following text to Vietnamese. Only return the translated text:\n\n${text}` }] }]
              })
            });
            const data = await response.json();
            resolve(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text);
          } catch (e) {
            resolve(text);
          }
        });
      });
    }

    const P = S(() => {
      var U;
      (U = chrome.sidePanel) != null &&
        U.setPanelBehavior &&
        chrome.sidePanel
          .setPanelBehavior({ openPanelOnActionClick: !0 })
          .catch((e) => console.error(e));
      const o = [
          "douyin.com",
          "douyinvod.com",
          "douyincdn.com",
          "bytevideo.cn",
          "byteimg.com",
          "douyinpic.com",
          "pstatp.com",
          "snssdk.com",
        ],
        y = (e) => {
          try {
            const c = new URL(e);
            return (
              c.protocol === "https:" &&
              o.some((t) => c.hostname === t || c.hostname.endsWith(`.${t}`))
            );
          } catch {
            return !1;
          }
        },
        k = (e) =>
          e
            .normalize("NFKC")
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 150) || "douyin_video",
        T = async (e, c) => {
          var d;
          let t;
          try {
            const u = new URL(c || `https://www.douyin.com/video/${e}`);
            if (
              u.protocol !== "https:" ||
              !["douyin.com", "www.douyin.com"].includes(u.hostname) ||
              !u.pathname.startsWith(`/video/${e}`)
            )
              throw new Error(
                "Post URL is outside the approved Douyin page pattern.",
              );
            if (
              ((t = (await chrome.tabs.create({ url: u.href, active: !1 })).id),
              !t)
            )
              throw new Error("Chrome did not create the resolver tab.");
            const w = Date.now() + 25e3;
            for (
              ;
              Date.now() < w &&
              (await chrome.tabs.get(t)).status !== "complete";
            )
              await new Promise((f) => setTimeout(f, 400));
            await new Promise((n) => setTimeout(n, 1800));
            for (let n = 0; n < 12; n += 1) {
              const i =
                (d = (
                  await chrome.scripting.executeScript({
                    target: { tabId: t },
                    func: (s, r) => {
                      for (const h of document.querySelectorAll(`[${r}]`)) {
                        const a = h.getAttribute(r);
                        if (a)
                          try {
                            const l = JSON.parse(a);
                            if (String(l.id) === s && l.mediaUrl) return l;
                          } catch {}
                      }
                    },
                    args: [e, "data-social-intelligence-aweme"],
                  })
                )[0]) == null
                  ? void 0
                  : d.result;
              if (i != null && i.mediaUrl && y(i.mediaUrl)) return i;
              await new Promise((s) => setTimeout(s, 600));
            }
            throw new Error(
              "Douyin did not expose a downloadable media URL for this post.",
            );
          } finally {
            t && (await chrome.tabs.remove(t).catch(() => {}));
          }
        };
      chrome.runtime.onMessage.addListener((e, c, t) => {
        var b, w, n, f, i, s;
        if (
          (e == null ? void 0 : e.type) ===
          "social-intelligence:resolve-douyin-post"
        ) {
          const r = String(((b = e.payload) == null ? void 0 : b.id) || ""),
            h = String(((w = e.payload) == null ? void 0 : w.pageUrl) || "");
          return /^\d{8,24}$/.test(r)
            ? (T(r, h).then(
                (a) => t({ ok: !0, item: a }),
                (a) => t({ ok: !1, error: a.message }),
              ),
              !0)
            : (t({ ok: !1, error: "Invalid Douyin post ID." }), !1);
        }
        if ((e == null ? void 0 : e.type) === "social-intelligence:ai-analyze") {
           const promptText = String(e.payload?.prompt || "");
           const contentText = String(e.payload?.text || "");
           
           chrome.storage.local.get(['geminiApiKey'], async (res) => {
             if (!res.geminiApiKey) {
               t({ ok: !1, error: "Missing API Key" });
               return;
             }
             try {
               const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${res.geminiApiKey}`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   contents: [{ parts: [{ text: `${promptText}\n\n${contentText}` }] }]
                 })
               });
               const data = await response.json();
               t({ ok: !0, result: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No result" });
             } catch (err) {
               t({ ok: !1, error: err.message });
             }
           });
           return !0;
        }
        if (
          (e == null ? void 0 : e.type) === "social-intelligence:export-channel"
        ) {
          let r = "";
          let ext = "json";
          let mime = "application/json";
          try {
            const data = ((n = e.payload) == null ? void 0 : n.data) ?? {};
            if (e.payload?.format === 'csv') {
               r = jsonToCsv(data);
               ext = "csv";
               mime = "text/csv";
            } else {
               r = JSON.stringify(data, null, 2);
            }
          } catch {
            return (
              t({ ok: !1, error: "Channel data is not valid JSON." }),
              !1
            );
          }
          if (r.length > 5e6)
            return (
              t({
                ok: !1,
                error: "Channel export exceeds the 5 MB safety limit.",
              }),
              !1
            );
          const h = `Social Intelligence/${k(String(((f = e.payload) == null ? void 0 : f.filename) || "douyin_channel"))}.${ext}`,
            a = `data:${mime};charset=utf-8,${encodeURIComponent(r)}`;
          return (
            chrome.downloads
              .download({
                url: a,
                filename: h,
                conflictAction: "uniquify",
                saveAs: !1,
              })
              .then(
                (l) => t({ ok: !0, downloadId: l }),
                (l) => t({ ok: !1, error: l.message }),
              ),
            !0
          );
        }
        if ((e == null ? void 0 : e.type) !== "social-intelligence:download")
          return;
        const d = String(((i = e.payload) == null ? void 0 : i.mediaUrl) || "");
        if (!y(d))
          return (
            t({
              ok: !1,
              error: "Media URL is not on the approved CDN allowlist.",
            }),
            !1
          );
        const s_file = e.payload?.filename || "douyin_video";
        const isAudio = d.includes('.mp3') || s_file.endsWith('_audio');
        const u = `Social Intelligence/${k(String(s_file))}${isAudio ? '.mp3' : '.mp4'}`;
        return (
          chrome.downloads
            .download({
              url: d,
              filename: u,
              conflictAction: "uniquify",
              saveAs: !1,
            })
            .then(
              (r) => t({ ok: !0, downloadId: r }),
              (r) => t({ ok: !1, error: r.message }),
            ),
          !0
        );
      });
    });
    function A() {}
    ((g = (v = globalThis.browser) == null ? void 0 : v.runtime) == null
      ? void 0
      : g.id) == null
      ? globalThis.chrome
      : globalThis.browser;
    function m(o, ...y) {}
    const $ = {
      debug: (...o) => m(console.debug, ...o),
      log: (...o) => m(console.log, ...o),
      warn: (...o) => m(console.warn, ...o),
      error: (...o) => m(console.error, ...o),
    };
    let p;
    try {
      ((p = P.main()),
        p instanceof Promise &&
          console.warn(
            "The background's main() function return a promise, but it must be synchronous",
          ));
    } catch (o) {
      throw ($.error("The background crashed on startup!"), o);
    }
    return p;
  })();
  background;
});
