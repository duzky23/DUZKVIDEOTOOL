import { fetchClient } from './extractor.js';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

export const VOICES = {
  'vi-female': { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My (Nữ - Tự nhiên, truyền cảm)', gender: 'Female', lang: 'vi-VN' },
  'vi-male': { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Nam - Trầm ấm, dứt khoát)', gender: 'Male', lang: 'vi-VN' },
  'vi-standard': { id: 'vi-standard', name: 'Giọng Đọc Chuẩn Tiếng Việt', gender: 'Female', lang: 'vi-VN' },
  'en-female': { id: 'en-female', name: 'English Natural Voice', gender: 'Female', lang: 'en-US' }
};

/**
 * Split text into chunks of at most maxChars (default 180 chars) respecting punctuation
 */
function splitTextIntoSentences(text, maxChars = 180) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + trimmed : trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Fetch raw TTS MP3 audio for a single sentence
 */
async function fetchSentenceTts(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.trim())}&tl=vi&client=tw-ob`;
  const res = await fetchClient.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    },
    timeout: 15000
  });
  return Buffer.from(res.data);
}

/**
 * Get accurate audio duration in seconds using FFmpeg
 */
async function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
        resolve(Math.max(0.5, size / 16000));
      } else {
        resolve(parseFloat(metadata.format.duration));
      }
    });
  });
}

/**
 * Generate silent MP3 of specified duration in seconds
 */
async function generateSilence(durationSec, outputPath) {
  if (durationSec <= 0.05) durationSec = 0.05;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`anullsrc=r=24000:cl=mono`)
      .inputFormat('lavfi')
      .outputOptions(['-t', durationSec.toFixed(3), '-c:a', 'libmp3lame', '-b:a', '64k'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Adjust audio speed (tempo) using FFmpeg atempo filter without changing pitch
 */
async function adjustAudioTempo(inputPath, outputPath, tempoMultiplier) {
  const speed = Math.min(1.5, Math.max(0.8, tempoMultiplier));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters(`atempo=${speed.toFixed(3)}`)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Master Time-Aligned Speech Synthesizer:
 * 1. Synthesizes each sentence individually.
 * 2. Compares Vietnamese audio duration with target video sentence duration.
 * 3. Auto-adjusts tempo (speed-up 1.1x - 1.45x) so Vietnamese speech fits the character's line.
 * 4. Inserts exact silence gaps so each sentence begins precisely at startTimeSec.
 */
export async function synthesizeTimeAlignedSegments(segments, outputFile, tempDir) {
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  console.log(`[Time-Aligned Dubbing] Processing ${segments.length} segments with auto-speed sync...`);

  const concatFiles = [];
  let currentTimeline = 0.0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const text = (seg.vietnameseText || seg.text || '').trim();
    if (!text) continue;

    const startSec = typeof seg.startTimeSec === 'number' ? seg.startTimeSec : currentTimeline;
    const endSec = typeof seg.endTimeSec === 'number' ? seg.endTimeSec : (startSec + 3.0);
    const targetDuration = Math.max(1.2, endSec - startSec);

    // 1. If there is a silence gap before this sentence, add silence
    const silenceGap = startSec - currentTimeline;
    if (silenceGap > 0.08) {
      const silencePath = path.join(tempDir, `silence_${i}.mp3`);
      await generateSilence(silenceGap, silencePath);
      concatFiles.push(silencePath);
      currentTimeline += silenceGap;
    }

    // 2. Synthesize raw sentence audio
    const rawAudioBuffer = await fetchSentenceTts(text);
    const rawSentencePath = path.join(tempDir, `raw_seg_${i}.mp3`);
    fs.writeFileSync(rawSentencePath, rawAudioBuffer);

    // 3. Measure actual sentence duration
    const actualDuration = await getAudioDuration(rawSentencePath);

    // 4. Auto-fit tempo: If Vietnamese is longer than the Chinese line, speed it up
    let finalSentencePath = rawSentencePath;
    let finalDuration = actualDuration;

    if (actualDuration > targetDuration + 0.3) {
      const speedMultiplier = actualDuration / targetDuration;
      const tunedSpeed = Math.min(1.4, Math.max(1.1, speedMultiplier));
      const fittedPath = path.join(tempDir, `fitted_seg_${i}.mp3`);
      
      try {
        await adjustAudioTempo(rawSentencePath, fittedPath, tunedSpeed);
        finalSentencePath = fittedPath;
        finalDuration = await getAudioDuration(fittedPath);
        console.log(`[Time-Aligned Dubbing] Segment #${i + 1} speed adjusted: ${tunedSpeed.toFixed(2)}x (${actualDuration.toFixed(1)}s -> ${finalDuration.toFixed(1)}s, target: ${targetDuration.toFixed(1)}s)`);
      } catch (err) {
        console.warn(`[Time-Aligned Dubbing] Segment #${i + 1} tempo adjustment failed, using raw:`, err.message);
      }
    }

    concatFiles.push(finalSentencePath);
    currentTimeline += finalDuration;
  }

  if (concatFiles.length === 0) {
    throw new Error('Không có câu thoại nào để tổng hợp âm thanh.');
  }

  // 5. Concat all audio chunks into final master dubbed track using FFmpeg concat protocol
  const concatListFile = path.join(tempDir, 'concat_list.txt');
  const fileLines = concatFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatListFile, fileLines, 'utf8');

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c:a', 'libmp3lame', '-b:a', '128k'])
      .output(outputFile)
      .on('end', () => {
        console.log(`[Time-Aligned Dubbing] ✅ Master dubbed audio track created: ${outputFile} (Duration: ~${currentTimeline.toFixed(1)}s)`);
        resolve({
          audioPath: outputFile,
          durationSec: currentTimeline,
          segmentsCount: segments.length
        });
      })
      .on('error', (err) => {
        console.error('[Time-Aligned Dubbing] Concat error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Standard continuous speech synthesizer (fallback if no segments provided)
 */
export async function synthesizeSpeech(text, outputFile, options = {}) {
  const chunks = splitTextIntoSentences(text, 180);
  const audioBuffers = [];

  for (const chunk of chunks) {
    const buf = await fetchSentenceTts(chunk);
    audioBuffers.push(buf);
  }

  const fullAudio = Buffer.concat(audioBuffers);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, fullAudio);

  return {
    audioPath: outputFile,
    sizeBytes: fullAudio.length,
    chunksCount: chunks.length
  };
}
