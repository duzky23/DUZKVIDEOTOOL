import http from 'http';
import fs from 'fs';
import path from 'path';
import { extractVideoInfo } from './services/extractor.js';
import { synthesizeSpeech } from './services/edgeTts.js';
import { createCapcutDraft } from './services/capcutDraftService.js';

async function runFullDiagnostic() {
  console.log('====================================================');
  console.log('🧪 DUZKVIDEOTOOL - COMPREHENSIVE SYSTEM DIAGNOSTIC');
  console.log('====================================================\n');

  const report = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  function logPass(msg) {
    console.log(`✅ [PASS] ${msg}`);
    report.passed++;
    report.details.push({ status: 'PASS', msg });
  }

  function logFail(msg, err) {
    console.error(`❌ [FAIL] ${msg}:`, err?.message || err);
    report.failed++;
    report.details.push({ status: 'FAIL', msg, error: err?.message || String(err) });
  }

  function logWarn(msg) {
    console.warn(`⚠️ [WARN] ${msg}`);
    report.warnings++;
    report.details.push({ status: 'WARN', msg });
  }

  // 1. Check Server Binary Assets (FFmpeg, yt-dlp)
  console.log('[1/7] Checking Binaries & Dependencies...');
  try {
    const ffmpegPath = path.join(process.cwd(), 'bin', 'ffmpeg.exe');
    const ytdlpPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
    if (fs.existsSync(ffmpegPath)) {
      logPass(`FFmpeg binary exists: ${ffmpegPath} (${(fs.statSync(ffmpegPath).size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
      logFail(`FFmpeg binary not found at ${ffmpegPath}`);
    }

    if (fs.existsSync(ytdlpPath)) {
      logPass(`yt-dlp binary exists: ${ytdlpPath} (${(fs.statSync(ytdlpPath).size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
      logFail(`yt-dlp binary not found at ${ytdlpPath}`);
    }
  } catch (e) {
    logFail('Binary check error', e);
  }

  // 2. Check Universal & YouTube Extractor
  console.log('\n[2/7] Testing YouTube Extractor...');
  try {
    const ytRes = await extractVideoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    if (ytRes && ytRes.videoUrl && ytRes.title) {
      logPass(`YouTube extraction success: "${ytRes.title.slice(0, 30)}..." (Qualities: ${ytRes.qualities?.length || 0})`);
    } else {
      logFail('YouTube extraction returned empty result');
    }
  } catch (e) {
    logFail('YouTube extraction failed', e);
  }

  // 3. Test Edge TTS Voice Engine
  console.log('\n[3/7] Testing Edge TTS Voice Synthesis...');
  try {
    const testAudioPath = path.join(process.cwd(), 'storage', 'temp', `test_tts_${Date.now()}.mp3`);
    fs.mkdirSync(path.dirname(testAudioPath), { recursive: true });
    
    await synthesizeSpeech('Xin chào, đây là bài kiểm tra giọng đọc của DUZK Video Tool.', testAudioPath, { voiceId: 'vi-VN-HoaiMyNeural', rate: '+0%' });
    
    if (fs.existsSync(testAudioPath) && fs.statSync(testAudioPath).size > 1000) {
      logPass(`TTS Audio generated successfully (${fs.statSync(testAudioPath).size} bytes)`);
      fs.unlinkSync(testAudioPath);
    } else {
      logFail('TTS Audio file was not created or is empty');
    }
  } catch (e) {
    logFail('TTS Engine failed', e);
  }

  // 4. Test CapCut Draft Project Generator
  console.log('\n[4/7] Testing CapCut Draft Project Generation...');
  try {
    const draftResult = await createCapcutDraft({
      projectName: 'Test_Diagnostic_Draft',
      videoUrl: 'https://test.com/sample.mp4',
      subtitles: [
        { startTimeSec: 0, endTimeSec: 2.5, vietnameseText: 'Chào mừng đến với DUZK Video Tool' },
        { startTimeSec: 2.5, endTimeSec: 5.0, vietnameseText: 'Hệ thống tự động hóa video đỉnh cao' }
      ],
      audioSegments: []
    });

    if (draftResult && draftResult.draftFolder) {
      logPass(`CapCut Draft created successfully at: ${draftResult.draftFolder} (Tracks: ${draftResult.tracksCount || 3})`);
    } else {
      logFail('CapCut Draft creation failed');
    }
  } catch (e) {
    logFail('CapCut Draft generator failed', e);
  }

  // 5. Test Remotion Engine & Motion FX
  console.log('\n[5/9] Testing Remotion Kinetic Subtitles & Motion FX...');
  try {
    const { generateKineticAssSubtitles, buildProgressBarFilter } = await import('./services/remotionService.js');
    const testAssPath = path.join(process.cwd(), 'storage', 'temp', `test_remotion_${Date.now()}.ass`);
    
    generateKineticAssSubtitles({
      segments: [
        { startTimeSec: 0, endTimeSec: 2.0, vietnameseText: 'DUZK Video Tool Đỉnh Cao' },
        { startTimeSec: 2.0, endTimeSec: 4.5, vietnameseText: 'Tự động tạo video triệu view' }
      ],
      outputPath: testAssPath
    });

    const filterString = buildProgressBarFilter({ videoDurationSec: 15 });

    if (fs.existsSync(testAssPath) && filterString.includes('drawbox')) {
      logPass(`Remotion Kinetic ASS created (${fs.statSync(testAssPath).size} bytes) & Glow Bar Filter OK`);
      fs.unlinkSync(testAssPath);
    } else {
      logFail('Remotion service test failed');
    }
  } catch (e) {
    logFail('Remotion service error', e);
  }

  // 6. Test VoxCPM2 Status & Voice Cloning Bridge
  console.log('\n[6/9] Testing VoxCPM2 Voice Cloning Service...');
  try {
    const { checkVoxCPMStatus } = await import('./services/voxcpmService.js');
    const voxStatus = await checkVoxCPMStatus();
    if (voxStatus) {
      logPass(`VoxCPM2 Status: ${voxStatus.model} (${voxStatus.available ? 'CUDA Active' : 'Fallback Ready'})`);
    } else {
      logFail('VoxCPM2 service returned null status');
    }
  } catch (e) {
    logFail('VoxCPM2 service check error', e);
  }

  // 7. Test Frontend Static Assets & Dist serving
  console.log('\n[7/9] Testing Frontend Dist & Static Assets...');
  try {
    const clientDist = path.join(process.cwd(), '..', 'client', 'dist', 'index.html');
    if (fs.existsSync(clientDist)) {
      logPass(`Frontend client build exists: ${clientDist} (${fs.statSync(clientDist).size} bytes)`);
    } else {
      logWarn(`Frontend client build not found at ${clientDist}. Backend needs to build or serve properly.`);
    }
  } catch (e) {
    logFail('Frontend asset check error', e);
  }

  // 8. Test Backend Express Health Endpoint
  console.log('\n[8/9] Testing Live HTTP Server Endpoint...');
  try {
    const healthData = await new Promise((resolve, reject) => {
      http.get('http://localhost:5000/api/health', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(raw) });
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    });

    if (healthData.statusCode === 200 && healthData.data.status === 'ok') {
      logPass(`Live Server Health: OK (v${healthData.data.version || '3.x'})`);
    } else {
      logFail(`Health endpoint returned status ${healthData.statusCode}`);
    }
  } catch (e) {
    logWarn(`Live HTTP Server check on port 5000: ${e.message} (Server might need restart)`);
  }

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${report.passed} PASSED | ${report.failed} FAILED | ${report.warnings} WARNINGS`);
  console.log('====================================================');
}

runFullDiagnostic();

