import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

// Xác định đường dẫn file yt-dlp.exe
export function getYtDlpPath() {
  const localBin = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) return localBin;

  const serverBin = path.join(process.cwd(), 'server', 'bin', 'yt-dlp.exe');
  if (fs.existsSync(serverBin)) return serverBin;

  return 'yt-dlp';
}

/**
 * Trích xuất thông tin video (Metadata & Stream URLs) bằng yt-dlp
 */
export async function getYtDlpInfo(url) {
  const ytDlpPath = getYtDlpPath();
  
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      url
    ];

    execFile(ytDlpPath, args, { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`yt-dlp metadata extraction failed: ${stderr || error.message}`));
      }

      try {
        const data = JSON.parse(stdout.trim());
        
        // Tìm format video tốt nhất
        let videoUrl = data.url;
        if (!videoUrl && data.formats && data.formats.length > 0) {
          // Lọc video có cả hình lẫn tiếng hoặc format mp4 chất lượng cao
          const mp4Formats = data.formats.filter(f => f.ext === 'mp4' && f.url);
          const bestFormat = mp4Formats.find(f => f.vcodec !== 'none' && f.acodec !== 'none') || mp4Formats[mp4Formats.length - 1] || data.formats[data.formats.length - 1];
          videoUrl = bestFormat?.url;
        }

        // Trích xuất danh sách phụ đề có sẵn
        const existingSubtitles = [];
        const allSubs = { ...(data.subtitles || {}), ...(data.automatic_captions || {}) };
        for (const [lang, subList] of Object.entries(allSubs)) {
          if (['zh', 'zh-Hans', 'zh-Hant', 'en', 'vi'].includes(lang) && subList && subList.length > 0) {
            existingSubtitles.push({
              lang,
              url: subList[0].url,
              ext: subList[0].ext
            });
          }
        }

        resolve({
          id: data.id,
          title: data.title || 'Untitled Video',
          author: data.uploader || data.channel || data.creator || 'Creator',
          duration: data.duration || 0,
          cover: data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || '',
          url: videoUrl || url,
          videoUrl: videoUrl || url,
          directPlayUrl: videoUrl,
          platform: data.extractor_key || data.extractor || 'Universal',
          existingSubtitles,
          rawJson: data
        });
      } catch (parseErr) {
        reject(new Error(`Không thể phân tích JSON từ yt-dlp: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Tải trực tiếp video HD bằng yt-dlp về máy
 */
export async function downloadWithYtDlp(url, outputDir, fileName = null) {
  const ytDlpPath = getYtDlpPath();
  fs.mkdirSync(outputDir, { recursive: true });

  const targetName = fileName || `ytdlp_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, targetName);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '-o', outputPath,
      url
    ];

    execFile(ytDlpPath, args, { maxBuffer: 20 * 1024 * 1024, timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`yt-dlp download failed: ${stderr || error.message}`));
      }
      if (fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error('Tải bằng yt-dlp không tạo được file output'));
      }
    });
  });
}
