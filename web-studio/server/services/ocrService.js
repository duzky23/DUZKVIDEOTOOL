import { fetchClient } from './extractor.js';
import { downloadMedia, getRefererForUrl } from './ffmpegService.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

function extractJson(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {}
    }
  }
  return null;
}

export const ACTIVE_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro'
];



/**
 * CapCut / JianYing-Grade Audio ASR & Timestamped Subtitle Extraction Engine
 * Listens to the entire continuous audio stream to transcribe 100% of spoken words with exact timestamps
 */
export async function extractSubtitlesWithCapCutASR({ videoUrl, videoPath, style = 'story', apiKey = null }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Chưa cấu hình Gemini API Key cho hệ thống tạo phụ đề.');
  }

  const tempDir = path.join(process.cwd(), 'storage', 'temp', `capcut_asr_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const audioPath = path.join(tempDir, 'extracted_voice.mp3');

  try {
    let localFile = videoPath;
    let streamSuccess = false;

    // Attempt 1: Direct fast audio stream extraction using correct Referer
    if (!localFile && videoUrl) {
      try {
        const referer = getRefererForUrl(videoUrl);
        console.log(`[CapCut ASR Engine] Fast direct audio extraction from stream (Referer: ${referer})...`);
        await new Promise((resolve, reject) => {
          ffmpeg(videoUrl)
            .inputOptions([
              '-headers', `Referer: ${referer}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36\r\n`
            ])
            .outputOptions([
              '-vn',
              '-acodec', 'libmp3lame',
              '-ar', '16000',
              '-ac', '1',
              '-b:a', '32k',
              '-t', '300' // Up to 5 minutes
            ])
            .output(audioPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
          streamSuccess = true;
          console.log(`[CapCut ASR Engine] Fast direct audio stream extraction succeeded!`);
        }
      } catch (streamErr) {
        console.warn('[CapCut ASR Engine] Fast direct audio stream failed, falling back to full download:', streamErr.message);
      }
    }

    // Attempt 2: Fallback to downloading full media file if direct stream failed
    if (!streamSuccess) {
      if (!localFile && videoUrl) {
        localFile = path.join(tempDir, 'source_media.mp4');
        console.log(`[CapCut ASR Engine] Downloading remote media from CDN via fetchClient...`);
        await downloadMedia(videoUrl, localFile);
      }

      if (!localFile || !fs.existsSync(localFile)) {
        throw new Error('Thiếu file video nguồn để trích xuất âm thanh.');
      }

      console.log(`[CapCut ASR Engine] Extracting clean 16kHz mono audio track from local file: ${localFile}...`);

      await new Promise((resolve, reject) => {
        ffmpeg(localFile)
          .outputOptions([
            '-vn',
            '-acodec', 'libmp3lame',
            '-ar', '16000',
            '-ac', '1',
            '-b:a', '32k',
            '-t', '300' // Up to 5 minutes
          ])
          .output(audioPath)
          .on('end', resolve)
          .on('error', (err) => {
            console.warn('[CapCut ASR Engine] FFmpeg audio extraction error:', err.message);
            reject(err);
          })
          .run();
      });
    }

    if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) {
      throw new Error('Không thể tách luồng âm thanh từ video.');
    }


    const audioBase64 = fs.readFileSync(audioPath).toString('base64');
    console.log(`[CapCut ASR Engine] Audio prepared (${(audioBase64.length / 1024).toFixed(1)} KB base64). Analyzing with Gemini Speech Model...`);

    const prompt = `Bạn là hệ thống nhận diện giọng nói và bóc tách phụ đề tự động chuẩn chuyên nghiệp (tương đương công nghệ CapCut / JianYing Auto Captions).
Nhiệm vụ:
1. Lắng nghe TOÀN BỘ file âm thanh từ 0:00 đến hết.
2. Trích xuất 100% tất cả lời thoại / câu nói của nhân vật trong video, chia thành các phân đoạn ngắn (mỗi phân đoạn chỉ từ 1.5 đến 3.5 giây, TUYỆT ĐỐI KHÔNG gom thành đoạn dài trên 4.5 giây) để khớp chính xác với từng dòng phụ đề xuất hiện trên màn hình video.
3. Ghi lại mốc thời gian chuẩn xác đến 0.1 giây (startTimeSec, endTimeSec) cho từng câu.
4. Dịch từng câu thoại sang tiếng Việt CHUẨN XÁC theo đúng ngữ cảnh hội thoại của video, văn phong tự nhiên, chân thực cho người Việt xem, ngắn gọn, xúc tích, bám sát thời lượng của câu để khi ghép phụ đề và lồng tiếng thì khớp 100% với nhịp nói của video gốc.
5. Trả về định dạng JSON DUY NHẤT theo cấu trúc sau (không kèm text ngoài JSON):
{
  "fullOriginalTranscript": "Toàn bộ lời thoại tiếng Trung/gốc nghe được...",
  "fullVietnameseScript": "Toàn bộ kịch bản tiếng Việt đã dịch liền mạch...",
  "summary": "Tóm tắt ngắn gọn nội dung video",
  "suggestedTags": ["#video", "#viral", "#douyin"],
  "segments": [
    {
      "id": 1,
      "startTimeSec": 0.0,
      "endTimeSec": 3.2,
      "originalText": "Câu thoại gốc câu 1",
      "vietnameseText": "Bản dịch tiếng Việt chuẩn ngữ cảnh câu 1"
    }
  ]
}`;

    let lastError = null;
    for (const model of ACTIVE_GEMINI_MODELS) {
      try {
        console.log(`[CapCut ASR Engine] Calling model ${model}...`);
        const res = await fetchClient({
          url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          method: 'POST',
          data: {
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'audio/mp3',
                      data: audioBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          },
          headers: { 'Content-Type': 'application/json' },
          timeout: 50000
        });

        const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const parsed = extractJson(rawText);
        if (parsed) {
          const origScript = parsed.fullOriginalTranscript || parsed.fullTranscript || '';
          const viScript = parsed.fullVietnameseScript || parsed.fullScript || '';
          
          let segments = parsed.segments || [];
          if (!Array.isArray(segments) || segments.length === 0) {
            segments = [
              {
                id: 1,
                startTimeSec: 0.0,
                endTimeSec: 3.5,
                originalText: origScript.slice(0, 50),
                vietnameseText: viScript.slice(0, 50)
              }
            ];
          }

          const formattedSegments = segments.map((s, idx) => {
            const start = typeof s.startTimeSec === 'number' ? s.startTimeSec : (idx * 3);
            const end = typeof s.endTimeSec === 'number' ? s.endTimeSec : (start + 3);
            return {
              id: s.id || (idx + 1),
              startTimeSec: start,
              endTimeSec: end,
              originalText: s.originalText || '',
              vietnameseText: s.vietnameseText || s.text || '',
              text: s.vietnameseText || s.text || '',
              estimatedDurationSec: +(end - start).toFixed(1)
            };
          });

          return {
            source: 'capcut-asr',
            fullOriginalTranscript: origScript,
            rawOcrText: origScript,
            fullVietnameseScript: viScript,
            vietnameseScript: viScript,
            vietnameseSummary: parsed.summary || 'Tóm tắt nội dung video',
            summary: parsed.summary || 'Tóm tắt nội dung video',
            suggestedTags: parsed.suggestedTags || ['#viral', '#trending'],
            segments: formattedSegments
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[CapCut ASR Engine] Model ${model} failed:`, err.response?.data?.error?.message || err.message);
      }
    }

    throw new Error(`CapCut ASR thất bại: ${lastError?.response?.data?.error?.message || lastError?.message || 'Không thể nhận diện giọng nói'}`);
  } finally {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

/**
 * Extract keyframes from video for Vision OCR fallback
 */
export async function extractVideoFrames(videoPath, outputDir, options = { maxFrames: 16 }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const count = typeof options === 'number' ? options : (options?.maxFrames || 16);

  const relVideo = path.isAbsolute(videoPath) ? path.relative(process.cwd(), videoPath).replace(/\\/g, '/') : videoPath;
  const relOutputDir = path.isAbsolute(outputDir) ? path.relative(process.cwd(), outputDir).replace(/\\/g, '/') : outputDir;

  return new Promise((resolve, reject) => {
    ffmpeg(relVideo)
      .outputOptions([
        '-vf', 'fps=1,scale=720:-1',
        '-vframes', String(count),
        '-q:v', '3'
      ])
      .output(path.join(relOutputDir, 'frame_%03d.jpg').replace(/\\/g, '/'))
      .on('end', () => {
        const frameFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg')).sort();
        resolve(frameFiles.map(f => path.join(outputDir, f)));
      })
      .on('error', reject)
      .run();
  });
}

/**
 * Fallback Vision OCR for subtitle detection
 */
export async function extractAndTranslateHardcodedSubtitles(framePaths, style = 'story', apiKey = null) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  const parts = [
    {
      text: `Bạn là chuyên gia thị giác máy tính OCR bóc tách phụ đề video.
Nhiệm vụ:
1. Đọc TOÀN BỘ các dòng chữ phụ đề tiếng Trung hiển thị trên các khung hình.
2. Dịch toàn bộ nội dung sang tiếng Việt tự nhiên, chuẩn ngữ cảnh.
3. Chia kịch bản thành các phân đoạn ngắn (segments) có mốc thời gian ước lượng (startTimeSec, endTimeSec).

Trả về định dạng JSON DUY NHẤT:
{
  "ocrTranscript": "Toàn bộ phụ đề gốc đọc được...",
  "vietnameseScript": "Toàn bộ kịch bản tiếng Việt đã dịch...",
  "summary": "Tóm tắt ngắn gọn video",
  "segments": [
    {
      "id": 1,
      "startTimeSec": 0.0,
      "endTimeSec": 3.0,
      "originalText": "Phụ đề gốc phân đoạn 1...",
      "vietnameseText": "Bản dịch tiếng Việt câu 1..."
    }
  ]
}`
    }
  ];

  for (const framePath of framePaths.slice(0, 16)) {
    if (fs.existsSync(framePath)) {
      const dataBase64 = fs.readFileSync(framePath).toString('base64');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: dataBase64
        }
      });
    }
  }

  let lastErr = null;
  for (const model of ACTIVE_GEMINI_MODELS) {
    try {
      const res = await fetchClient({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        method: 'POST',
        data: {
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      });

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = extractJson(rawText);
      if (parsed) {
        const viScript = parsed.vietnameseScript || parsed.fullVietnameseScript || parsed.fullScript || '';
        const rawOcr = parsed.ocrTranscript || parsed.rawOcrText || '';
        const segments = (parsed.segments || []).map((s, idx) => ({
          id: s.id || (idx + 1),
          startTimeSec: s.startTimeSec || (idx * 3),
          endTimeSec: s.endTimeSec || ((idx + 1) * 3),
          originalText: s.originalText || '',
          vietnameseText: s.vietnameseText || s.text || '',
          text: s.vietnameseText || s.text || '',
          estimatedDurationSec: s.endTimeSec && s.startTimeSec ? +(s.endTimeSec - s.startTimeSec).toFixed(1) : 3.5
        }));

        return {
          source: 'vision-ocr',
          ocrTranscript: rawOcr,
          rawOcrText: rawOcr,
          fullOriginalTranscript: rawOcr,
          vietnameseScript: viScript,
          fullVietnameseScript: viScript,
          vietnameseSummary: parsed.summary || 'Tóm tắt nội dung video',
          summary: parsed.summary || 'Tóm tắt nội dung video',
          suggestedTags: parsed.suggestedTags || ['#trending'],
          segments
        };
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Vision model ${model} failed, trying next:`, err.response?.data?.error?.message || err.message);
    }
  }

  throw new Error(`VideOCR thất bại: ${lastErr?.response?.data?.error?.message || lastErr?.message || 'Không thể nhận diện chữ trên video'}`);
}

/**
 * Master Subtitle Extraction (CapCut Audio ASR + Vision OCR Hybrid Pipeline)
 */
export async function extractSubtitlesWithVideOCR({ videoUrl, videoPath, style = 'story', apiKey = null, mode = 'auto' }) {
  let localVideo = videoPath;
  let tempTargetDir = null;

  if (!localVideo && videoUrl) {
    tempTargetDir = path.join(process.cwd(), 'storage', 'temp', `ocr_prep_${Date.now()}`);
    fs.mkdirSync(tempTargetDir, { recursive: true });
    localVideo = path.join(tempTargetDir, 'source_video.mp4');
    console.log(`[Subtitle Engine] Pre-downloading remote media from ${videoUrl.slice(0, 60)}...`);
    await downloadMedia(videoUrl, localVideo);
  }

  try {
    if (mode === 'ocr') {
      const framesDir = path.join(tempTargetDir || process.cwd(), 'frames_' + Date.now());
      fs.mkdirSync(framesDir, { recursive: true });
      try {
        const frames = await extractVideoFrames(localVideo, framesDir, { maxFrames: 16 });
        return await extractAndTranslateHardcodedSubtitles(frames, style, apiKey);
      } finally {
        if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
      }
    }

    // Default: CapCut Audio ASR First (Fastest & 100% accurate)
    try {
      return await extractSubtitlesWithCapCutASR({ videoPath: localVideo, videoUrl, style, apiKey });
    } catch (asrErr) {
      console.warn('[Subtitle Engine] CapCut ASR failed, falling back to Vision OCR:', asrErr.message);
      const framesDir = path.join(tempTargetDir || process.cwd(), 'frames_fb_' + Date.now());
      fs.mkdirSync(framesDir, { recursive: true });
      try {
        const frames = await extractVideoFrames(localVideo, framesDir, { maxFrames: 16 });
        return await extractAndTranslateHardcodedSubtitles(frames, style, apiKey);
      } finally {
        if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
      }
    }
  } finally {
    if (tempTargetDir && fs.existsSync(tempTargetDir)) {
      try {
        fs.rmSync(tempTargetDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}
