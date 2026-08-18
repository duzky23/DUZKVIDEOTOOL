import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { fetchClient } from './extractor.js';
import fs from 'fs';
import path from 'path';

// Set robust static ffmpeg binary path from @ffmpeg-installer
if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

/**
 * Get accurate Referer header for CDNs to avoid 403 Forbidden
 */
export function getRefererForUrl(url = '') {
  if (!url) return 'https://www.douyin.com/';
  const lower = url.toLowerCase();
  if (
    lower.includes('bilivideo') ||
    lower.includes('bilibili.com') ||
    lower.includes('hdslb.com') ||
    lower.includes('akamaized.net') ||
    lower.includes('upos-') ||
    lower.includes('b23.tv')
  ) {
    return 'https://www.bilibili.com/';
  }
  if (
    lower.includes('xiaohongshu.com') ||
    lower.includes('xhscdn.com') ||
    lower.includes('xhslink.com')
  ) {
    return 'https://www.xiaohongshu.com/';
  }
  if (
    lower.includes('tiktok.com') ||
    lower.includes('byteoversea.com') ||
    lower.includes('ibytedtos.com') ||
    lower.includes('tikwm.com')
  ) {
    return 'https://www.tiktok.com/';
  }
  return 'https://www.douyin.com/';
}

/**
 * Download remote media file to local disk
 */
export async function downloadMedia(url, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  const referer = getRefererForUrl(url);

  const writer = fs.createWriteStream(outputPath);
  const response = await fetchClient({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Referer': referer
    },
    timeout: 30000
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
}


/**
 * Generate SRT subtitle file from transcript segments
 * Supports 'target-only', 'bilingual', and 'origin-only'
 */
export function generateSrtFile(segments, srtPath, options = { mode: 'target-only' }) {
  let srtContent = '';
  let currentTime = 0.5;

  segments.forEach((seg, index) => {
    let startSec = seg.startTimeSec !== undefined ? seg.startTimeSec : currentTime;
    let duration = seg.estimatedDurationSec || (seg.endTimeSec ? seg.endTimeSec - startSec : 3.5);
    if (duration <= 0) duration = 3.0;

    let endSec = seg.endTimeSec !== undefined ? seg.endTimeSec : (startSec + duration);

    const startTime = formatSrtTime(startSec);
    const endTime = formatSrtTime(endSec);
    
    const vietnamese = (seg.vietnameseText || seg.text || '').trim();
    const original = (seg.originalText || '').trim();

    let lineText = vietnamese;
    if (options.mode === 'bilingual' && original && vietnamese) {
      lineText = `${original}\n${vietnamese}`;
    } else if (options.mode === 'origin-only' && original) {
      lineText = original;
    }

    if (lineText) {
      srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${lineText}\n\n`;
    }

    currentTime = endSec + 0.3; // 0.3s pause between sentences
  });

  fs.mkdirSync(path.dirname(srtPath), { recursive: true });
  fs.writeFileSync(srtPath, srtContent, 'utf8');
  return srtPath;
}

function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (num, size = 2) => String(num).padStart(size, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Generate high-converting AI Thumbnail / Cover from video with styled banner
 */
export async function generateVideoCover({
  videoPath,
  outputPath,
  majorTitle = '',
  minorTitle = ''
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const relVideo = path.isAbsolute(videoPath) ? path.relative(process.cwd(), videoPath).replace(/\\/g, '/') : videoPath;
  const relOut = path.isAbsolute(outputPath) ? path.relative(process.cwd(), outputPath).replace(/\\/g, '/') : outputPath;

  const filters = ['scale=1080:-1'];
  if (majorTitle) {
    filters.push('drawbox=y=ih*0.25:h=ih*0.25:color=black@0.80:t=fill');
  }

  return new Promise((resolve, reject) => {
    ffmpeg(relVideo)
      .outputOptions([
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', filters.join(',')
      ])
      .output(relOut)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Cover generation failed: ${err.message}`)))
      .run();
  });
}

/**
 * Master Video Renderer (KrillinAI Full Architecture):
 * - Subtitle masking (hides Chinese hardcoded subtitles)
 * - Subtitle burning (Vietnamese or Bilingual subtitles)
 * - Vertical 9:16 reformatting with blurred background & Top Hook Banner
 * - Audio mapping
 */
export async function mixDubbedVideo({
  videoPath,
  voiceAudioPath,
  outputPath,
  srtPath,
  aspectRatio = 'original', // 'original' | '9:16'
  majorTitle = '',
  minorTitle = '',
  maskOldSubtitles = true,
  maskYPercent = null,
  maskHeightPercent = null,
  burnSubtitles = true,
  subtitleColor = '&H0000FFFF',
  originalVolume = 0.15,
  dubbingVolume = 1.3
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const relVideo = path.isAbsolute(videoPath) ? path.relative(process.cwd(), videoPath).replace(/\\/g, '/') : videoPath;
  const relVoice = voiceAudioPath && fs.existsSync(voiceAudioPath) 
    ? (path.isAbsolute(voiceAudioPath) ? path.relative(process.cwd(), voiceAudioPath).replace(/\\/g, '/') : voiceAudioPath)
    : null;
  const relOutput = path.isAbsolute(outputPath) ? path.relative(process.cwd(), outputPath).replace(/\\/g, '/') : outputPath;

  return new Promise((resolve, reject) => {
    let command = ffmpeg(relVideo);

    const hasDubbingVoice = !!relVoice;
    if (hasDubbingVoice) {
      command = command.input(relVoice);
    }

    const hasValidSrt = srtPath && fs.existsSync(srtPath) && fs.statSync(srtPath).size > 10;
    const relSrt = hasValidSrt ? path.relative(process.cwd(), srtPath).replace(/\\/g, '/') : '';
    let filterParts = [];
    let stepIndex = 0;

    // Smart default mask coordinates depending on aspect ratio
    const is916 = aspectRatio === '9:16';
    const finalMaskY = typeof maskYPercent === 'number' ? maskYPercent : (is916 ? 0.74 : 0.84);
    const finalMaskH = typeof maskHeightPercent === 'number' ? maskHeightPercent : (is916 ? 0.12 : 0.14);

    // Compute MarginV so subtitles sit centered inside the mask box
    const computedMarginV = is916
      ? Math.max(30, Math.round(1080 * (1 - (finalMaskY + finalMaskH / 2)) - 20))
      : Math.max(15, Math.round(540 * (1 - (finalMaskY + finalMaskH / 2)) - 10));

    const forceSubtitleStyle = `FontSize=22\\,FontName=Arial\\,PrimaryColour=${subtitleColor}\\,OutlineColour=&H00000000\\,BorderStyle=1\\,Outline=2\\,Shadow=1\\,Alignment=2\\,MarginV=${computedMarginV}`;

    if (is916) {
      // Vertical 9:16 Reformatting: Blurred Background + Centered Main Video
      filterParts.push('[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:3[bg]');
      filterParts.push('[0:v]scale=1080:-2:force_original_aspect_ratio=decrease[fg]');
      filterParts.push('[bg][fg]overlay=(W-w)/2:(H-h)/2[step0]');
      stepIndex = 0;

      // Top Hook Banner if title provided
      if (majorTitle) {
        filterParts.push(`[step${stepIndex}]drawbox=x=(w-960)/2:y=120:w=960:h=140:color=black@0.85:t=fill[step${stepIndex + 1}]`);
        stepIndex++;
      }

      // Bottom subtitle mask box with optimized position
      if (maskOldSubtitles) {
        filterParts.push(`[step${stepIndex}]drawbox=y=ih*${finalMaskY.toFixed(3)}:h=ih*${finalMaskH.toFixed(3)}:color=black@0.85:t=fill[step${stepIndex + 1}]`);
        stepIndex++;
      }

      // Subtitle burning
      if (burnSubtitles && relSrt) {
        filterParts.push(
          `[step${stepIndex}]subtitles=f='${relSrt}':force_style='${forceSubtitleStyle}'[outv]`
        );
      } else {
        filterParts.push(`[step${stepIndex}]copy[outv]`);
      }
    } else {
      // Standard / Landscape aspect ratio
      stepIndex = 0;
      let currentLabel = '0:v';

      if (maskOldSubtitles) {
        filterParts.push(`[${currentLabel}]drawbox=y=ih*${finalMaskY.toFixed(3)}:h=ih*${finalMaskH.toFixed(3)}:color=black@0.85:t=fill[step1]`);
        currentLabel = 'step1';
      }

      if (burnSubtitles && relSrt) {
        filterParts.push(
          `[${currentLabel}]subtitles=f='${relSrt}':force_style='${forceSubtitleStyle}'[outv]`
        );
      } else if (filterParts.length > 0) {
        filterParts.push(`[${currentLabel}]copy[outv]`);
      }
    }


    let audioFilterParts = [];
    let audioOutTag = '0:a:0?';

    if (hasDubbingVoice) {
      if (originalVolume > 0.02) {
        audioFilterParts.push(`[0:a]volume=${originalVolume}[aorig]`);
        audioFilterParts.push(`[1:a]volume=${dubbingVolume}[adub]`);
        audioFilterParts.push('[aorig][adub]amix=inputs=2:duration=first:dropout_transition=3[outa]');
        audioOutTag = '[outa]';
      } else {
        audioFilterParts.push(`[1:a]volume=${dubbingVolume}[outa]`);
        audioOutTag = '[outa]';
      }
    }

    const allFilters = [...filterParts, ...audioFilterParts];
    const hasAnyFilter = allFilters.length > 0;
    const videoOutTag = filterParts.length > 0 ? '[outv]' : '0:v:0';

    const outputOpts = [
      '-map', videoOutTag,
      '-map', audioOutTag
    ];

    if (hasAnyFilter) {
      command.complexFilter(allFilters.join(';'));
      outputOpts.push('-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p');
      outputOpts.push('-c:a', 'aac', '-b:a', '192k');
    } else {
      outputOpts.push('-c:v', 'copy', '-c:a', 'copy');
    }

    command.outputOptions(outputOpts);


    command
      .output(relOutput)
      .on('start', (cmdLine) => {
        console.log('FFmpeg Render Started:', cmdLine);
      })
      .on('end', () => {
        console.log('FFmpeg Render Complete:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg Render Error:', err);
        reject(new Error(`FFmpeg rendering failed: ${err.message}`));
      })
      .run();
  });
}
