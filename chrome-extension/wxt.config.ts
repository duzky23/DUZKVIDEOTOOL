import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'DUZKVIDEOTOOL - Trợ Lý Douyin, Bilibili, Xiaohongshu & AI Video',
    description: 'DUZKVIDEOTOOL: Quét, tải video không logo từ Douyin, Bilibili, Xiaohongshu, TikTok và đồng bộ Studio lồng tiếng AI.',
    version: '3.1.0',
    permissions: ['tabs', 'scripting', 'downloads', 'storage', 'sidePanel'],
    host_permissions: [
      '*://*.douyin.com/*',
      'https://*.douyinvod.com/*',
      'https://*.douyincdn.com/*',
      'https://*.bytevideo.cn/*',
      'https://*.byteimg.com/*',
      'https://*.douyinpic.com/*',
      'https://*.pstatp.com/*',
      'https://*.snssdk.com/*',
      '*://*.xiaohongshu.com/*',
      '*://*.xhslink.com/*',
      'https://*.xhscdn.com/*',
      '*://*.bilibili.com/*',
      '*://*.b23.tv/*',
      'https://*.bilivideo.com/*',
      'https://*.hdslb.com/*',
      'https://*.akamaized.net/*'
    ]
  }
});
