import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Set public Google & Cloudflare DNS to bypass ISP domain filtering
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

import { extractVideoInfo, fetchClient } from './services/extractor.js';
import { VOICES, synthesizeSpeech, synthesizeTimeAlignedSegments } from './services/edgeTts.js';
import { generateDubbingScript } from './services/geminiService.js';

import { downloadMedia, generateSrtFile, mixDubbedVideo, generateVideoCover, getRefererForUrl } from './services/ffmpegService.js';
import { extractSubtitlesWithVideOCR, extractSubtitlesWithCapCutASR, extractVideoFrames, extractAndTranslateHardcodedSubtitles } from './services/ocrService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Directories
const STORAGE_DIR = path.join(__dirname, 'storage');
const OUTPUT_DIR = path.join(STORAGE_DIR, 'outputs');
const TEMP_DIR = path.join(STORAGE_DIR, 'temp');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for rendered videos & audio
app.use('/outputs', express.static(OUTPUT_DIR));

// Serve Client Frontend (Production Build)
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

// In-memory / JSON History store
function getHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveHistoryItem(item) {
  const list = getHistory();
  list.unshift({ ...item, createdAt: new Date().toISOString() });
  // Keep last 100 items
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(0, 100), null, 2), 'utf8');
}

/* ==================== API ENDPOINTS ==================== */

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'DUZKVIDEOTOOL Platform API v3.1', timestamp: new Date() });
});


// 2. Extract video details without watermark
app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ ok: false, error: 'Thiếu đường dẫn video URL' });
    }
    console.log(`[Extracting] URL: ${url}`);
    const data = await extractVideoInfo(url);
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Extract error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2b. Proxy media stream to bypass Douyin / Bilibili / XHS Referer / CORS restrictions for browser preview & download
app.get('/api/proxy-media', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing url query');
    }

    const referer = getRefererForUrl(url);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': '*/*'
    };

    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await fetchClient({
      url,
      method: 'GET',
      responseType: 'stream',
      headers,
      timeout: 30000
    });

    if (response.headers['content-range']) {
      res.status(206);
      res.set('Content-Range', response.headers['content-range']);
    }
    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    } else {
      res.set('Content-Type', 'video/mp4');
    }
    res.set('Accept-Ranges', 'bytes');

    if (req.query.download === '1' || req.query.filename) {
      const rawName = req.query.filename || 'video.mp4';
      const cleanName = path.basename(rawName).replace(/[^\w\s\u00C0-\u1EF9.-]/gi, '_');
      res.set('Content-Disposition', `attachment; filename="${cleanName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`);
    }

    response.data.pipe(res);
  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.status(500).send(`Proxy Error: ${err.message}`);
  }
});

app.get('/api/voices', (req, res) => {
  res.json({ ok: true, voices: VOICES });
});

// 4. Preview voice sample
app.post('/api/tts/preview', async (req, res) => {
  try {
    const { text = 'Xin chào, đây là giọng đọc AI của TaiVideoNhanh', voiceId = 'vi-VN-HoaiMyNeural', rate = '+0%' } = req.body;
    const tempFile = path.join(TEMP_DIR, `preview_${Date.now()}.mp3`);
    
    await synthesizeSpeech(text, tempFile, { voiceId, rate });
    
    const audioData = fs.readFileSync(tempFile);
    fs.unlinkSync(tempFile);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioData.length
    });
    res.send(audioData);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. Generate AI Dubbing Script with Gemini
app.post('/api/ai/script', async (req, res) => {
  try {
    const { title, description, audioTranscript, style, apiKey } = req.body;
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp Gemini API Key trong Cài đặt' });
    }

    const scriptData = await generateDubbingScript({
      title,
      description,
      audioTranscript,
      style,
      apiKey: key
    });

    res.json({ ok: true, data: scriptData });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Subtitle & Transcript Extraction Engine (CapCut ASR + Dense Vision OCR)
app.post('/api/ocr-subtitles', async (req, res) => {
  try {
    let { videoUrl, style = 'story', mode = 'auto', apiKey } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ ok: false, error: 'Thiếu đường dẫn video' });
    }

    // Auto-extract direct stream only if user passed a webpage/post link (not direct stream)
    const isDirectStream = videoUrl.includes('.mp4') || 
      videoUrl.includes('zjcdn.com') || 
      videoUrl.includes('snssdk.com') || 
      videoUrl.includes('douyinvod.com') || 
      videoUrl.includes('bytevideo.cn') || 
      videoUrl.includes('/aweme/v1/play/') || 
      videoUrl.includes('is_play_url=1') ||
      videoUrl.includes('playwm');

    if (!isDirectStream && (videoUrl.includes('douyin.com') || videoUrl.includes('tiktok.com') || videoUrl.includes('xiaohongshu.com') || videoUrl.includes('iesdouyin.com'))) {
      console.log(`[CapCut Subtitle Engine] Resolving page URL: ${videoUrl}`);
      const extracted = await extractVideoInfo(videoUrl);
      if (extracted.videoUrl) {
        videoUrl = extracted.videoUrl;
      }
    }

    console.log(`[CapCut Subtitle Engine] Processing subtitles for: ${videoUrl.slice(0, 60)}...`);
    const result = await extractSubtitlesWithVideOCR({ videoUrl, style, apiKey, mode });

    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('Subtitle Engine error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Complete End-to-End AI Dubbing & Video Rendering Pipeline (KrillinAI Master Engine)
app.post('/api/dub', async (req, res) => {
  const taskId = uuidv4();
  const taskDir = path.join(TEMP_DIR, taskId);
  fs.mkdirSync(taskDir, { recursive: true });

  try {
    let {
      videoUrl,
      title = 'TaiVideoNhanh_Video',
      fullScript,
      segments = [],
      voiceId = 'vi-VN-HoaiMyNeural',
      rate = '+0%',
      pitch = '+0Hz',
      originalVolume = 0.15,
      dubbingVolume = 1.3,
      aspectRatio = 'original', // 'original' | '9:16'
      majorTitle = '',
      minorTitle = '',
      subtitleMode = 'target-only', // 'target-only' | 'bilingual'
      maskOldSubtitles = true,
      maskYPercent = null,
      maskHeightPercent = null,
      burnSubtitles = true,
      subtitleColor = '&H0000FFFF',
      enableDubbingVoice = true,
      generateCover = true
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ ok: false, error: 'Thiếu đường dẫn video nguồn (videoUrl)' });
    }

    const scriptText = fullScript || (segments.length > 0 ? segments.map(s => s.text || s.vietnameseText).join('. ') : '');
    if (!scriptText.trim()) {
      return res.status(400).json({ ok: false, error: 'Chưa có kịch bản tiếng Việt để lồng tiếng' });
    }

    // Auto-extract direct stream if user passed a webpage/post link
    const isDirectStream = videoUrl.includes('.mp4') || 
      videoUrl.includes('zjcdn.com') || 
      videoUrl.includes('snssdk.com') || 
      videoUrl.includes('douyinvod.com') || 
      videoUrl.includes('bytevideo.cn') || 
      videoUrl.includes('/aweme/v1/play/') || 
      videoUrl.includes('is_play_url=1') ||
      videoUrl.includes('playwm');

    if (!isDirectStream && (videoUrl.includes('douyin.com') || videoUrl.includes('tiktok.com') || videoUrl.includes('xiaohongshu.com') || videoUrl.includes('iesdouyin.com'))) {
      console.log(`[Task ${taskId}] Resolving page URL: ${videoUrl}`);
      const extracted = await extractVideoInfo(videoUrl);
      if (extracted.videoUrl) {
        videoUrl = extracted.videoUrl;
      }
    }

    console.log(`[Task ${taskId}] Starting Dubbing Process (Aspect: ${aspectRatio}, SubMode: ${subtitleMode}, MaskY: ${maskYPercent})...`);

    // Step A: Download source video
    const sourceVideoPath = path.join(taskDir, 'source.mp4');
    console.log(`[Task ${taskId}] Downloading video from: ${videoUrl.slice(0, 60)}...`);
    await downloadMedia(videoUrl, sourceVideoPath);


    // Step B: Synthesize AI Voice (Time-Aligned Segment Sync or Continuous)
    const voiceAudioPath = path.join(taskDir, 'dubbed_voice.mp3');
    if (enableDubbingVoice) {
      if (segments && segments.length > 0) {
        console.log(`[Task ${taskId}] Synthesizing Time-Aligned Dubbing with ${segments.length} segments...`);
        try {
          await synthesizeTimeAlignedSegments(segments, voiceAudioPath, taskDir);
        } catch (err) {
          console.warn(`[Task ${taskId}] Time-aligned dubbing fallback to continuous:`, err.message);
          await synthesizeSpeech(scriptText, voiceAudioPath, { voiceId, rate, pitch });
        }
      } else {
        console.log(`[Task ${taskId}] Synthesizing Continuous TTS with voice: ${voiceId}`);
        await synthesizeSpeech(scriptText, voiceAudioPath, { voiceId, rate, pitch });
      }
    }

    // Step C: Generate SRT subtitles (Target-only or Bilingual)
    const srtPath = path.join(taskDir, 'subtitles.srt');
    if (segments.length > 0) {
      generateSrtFile(segments, srtPath, { mode: subtitleMode });
    }

    // Step D: Mix Audio & Render Final Video with FFmpeg
    const outputFilename = `dubbed_${Date.now()}_${taskId.slice(0, 8)}.mp4`;
    const finalVideoPath = path.join(OUTPUT_DIR, outputFilename);

    console.log(`[Task ${taskId}] Rendering final video with FFmpeg (Mask: ${maskOldSubtitles}, Subtitles: ${burnSubtitles}, Voice: ${enableDubbingVoice})...`);
    await mixDubbedVideo({
      videoPath: sourceVideoPath,
      voiceAudioPath: enableDubbingVoice ? voiceAudioPath : null,
      outputPath: finalVideoPath,
      srtPath: fs.existsSync(srtPath) ? srtPath : null,
      aspectRatio,
      majorTitle,
      minorTitle,
      maskOldSubtitles: !!maskOldSubtitles,
      maskYPercent: typeof maskYPercent === 'number' ? maskYPercent : null,
      maskHeightPercent: typeof maskHeightPercent === 'number' ? maskHeightPercent : null,
      burnSubtitles: !!burnSubtitles,
      subtitleColor: subtitleColor || '&H0000FFFF',
      originalVolume: parseFloat(originalVolume),
      dubbingVolume: parseFloat(dubbingVolume)
    });


    const resultUrl = `/outputs/${outputFilename}`;
    const srtOutputUrl = segments.length > 0 ? `/outputs/${outputFilename.replace('.mp4', '.srt')}` : null;
    if (srtOutputUrl && fs.existsSync(srtPath)) {
      fs.copyFileSync(srtPath, path.join(OUTPUT_DIR, path.basename(srtOutputUrl)));
    }

    // Step E: Generate AI Cover / Thumbnail
    let coverOutputUrl = null;
    if (generateCover) {
      const coverFilename = `cover_${Date.now()}_${taskId.slice(0, 8)}.jpg`;
      const finalCoverPath = path.join(OUTPUT_DIR, coverFilename);
      try {
        await generateVideoCover({
          videoPath: sourceVideoPath,
          outputPath: finalCoverPath,
          majorTitle: majorTitle || title
        });
        coverOutputUrl = `/outputs/${coverFilename}`;
      } catch (e) {
        console.warn('Cover generation skipped:', e.message);
      }
    }

    const manifest = {
      version: 'krillinai-v2',
      taskId,
      title,
      aspectRatio,
      subtitleMode,
      stages: {
        download: { status: 'done', sourceUrl: videoUrl },
        script: { status: 'done', segmentsCount: segments.length },
        tts: { status: enableDubbingVoice ? 'done' : 'skipped', voiceId },
        render: { status: 'done', aspectRatio, maskOldSubtitles, burnSubtitles }
      },
      outputs: {
        video: resultUrl,
        subtitles: srtOutputUrl,
        cover: coverOutputUrl
      },
      timestamp: new Date().toISOString()
    };

    const historyItem = {
      id: taskId,
      title,
      videoUrl: resultUrl,
      srtUrl: srtOutputUrl,
      coverUrl: coverOutputUrl,
      voiceId,
      script: scriptText,
      aspectRatio,
      platform: req.body.platform || 'douyin'
    };
    saveHistoryItem(historyItem);

    // Clean temp task dir
    fs.rmSync(taskDir, { recursive: true, force: true });

    res.json({
      ok: true,
      taskId,
      videoUrl: resultUrl,
      srtUrl: srtOutputUrl,
      coverUrl: coverOutputUrl,
      manifest,
      message: 'Lồng tiếng và xuất video thành công!'
    });
  } catch (err) {
    if (fs.existsSync(taskDir)) fs.rmSync(taskDir, { recursive: true, force: true });
    console.error('Dubbing error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. Get History of dubbed videos
app.get('/api/history', (req, res) => {
  res.json({ ok: true, history: getHistory() });
});

// 8. Delete History item
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const list = getHistory().filter(item => item.id !== id);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json({ ok: true });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 DUZKVIDEOTOOL Platform Server running at http://localhost:${PORT}`);
});

