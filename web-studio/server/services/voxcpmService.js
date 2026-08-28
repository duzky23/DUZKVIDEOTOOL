import { fetchClient } from './extractor.js';
import { synthesizeSpeech } from './edgeTts.js';
import fs from 'fs';
import path from 'path';

const VOXCPM_LOCAL_API = process.env.VOXCPM_API_URL || 'http://127.0.0.1:8000';

/**
 * Kiểm tra trạng thái máy chủ VoxCPM2 cục bộ
 */
export async function checkVoxCPMStatus() {
  try {
    const res = await fetchClient({
      url: `${VOXCPM_LOCAL_API}/health`,
      method: 'GET',
      timeout: 3000
    });
    return {
      available: res.status === 200,
      model: 'VoxCPM2-2B (Tokenizer-Free)',
      device: res.data?.device || 'CUDA',
      sampleRate: '48kHz Native'
    };
  } catch (e) {
    return {
      available: false,
      model: 'Edge TTS Neural (Fallback)',
      device: 'Cloud CPU',
      sampleRate: '24kHz-48kHz',
      hint: 'Chưa khởi chạy VoxCPM2 Python service tại port 8000 (Hệ thống tự động dùng Fallback Neural TTS)'
    };
  }
}

/**
 * Nhân bản giọng nói từ file âm thanh mẫu (Zero-shot Voice Cloning)
 */
export async function cloneVoiceWithVoxCPM({
  text,
  referenceAudioPath,
  outputPath,
  language = 'vi',
  speed = 1.0,
  fallbackVoiceId = 'vi-VN-HoaiMyNeural'
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const status = await checkVoxCPMStatus();

  if (status.available && referenceAudioPath && fs.existsSync(referenceAudioPath)) {
    try {
      console.log(`[VoxCPM2] Cloning voice from: ${referenceAudioPath}...`);
      
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language', language);
      formData.append('speed', String(speed));
      
      const audioBuffer = fs.readFileSync(referenceAudioPath);
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('ref_audio', blob, 'ref.wav');

      const response = await fetch(`${VOXCPM_LOCAL_API}/clone`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`VoxCPM server responded with ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
      return { success: true, engine: 'VoxCPM2-2B', outputPath };
    } catch (err) {
      console.warn('[VoxCPM2] Error during voice cloning, falling back to Edge TTS:', err.message);
    }
  }

  // Fallback sang Edge TTS
  console.log(`[VoxCPM2 Fallback] Synthesizing speech with Edge TTS (${fallbackVoiceId})...`);
  await synthesizeSpeech(text, outputPath, { voiceId: fallbackVoiceId });
  return { success: true, engine: 'Edge-TTS-Neural', outputPath };
}

/**
 * Thiết kế giọng đọc mới bằng Prompt (Creative Voice Design)
 */
export async function designVoiceByPrompt({
  text,
  voicePrompt = 'Giọng nam phát thanh viên trầm ấm, tự tin, 35 tuổi',
  outputPath,
  fallbackVoiceId = 'vi-VN-NamMinhNeural'
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const status = await checkVoxCPMStatus();

  if (status.available) {
    try {
      console.log(`[VoxCPM2] Designing voice with prompt: "${voicePrompt}"...`);
      const response = await fetch(`${VOXCPM_LOCAL_API}/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_prompt: voicePrompt })
      });

      if (!response.ok) throw new Error(`VoxCPM server responded with ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
      return { success: true, engine: 'VoxCPM2-PromptDesign', outputPath };
    } catch (err) {
      console.warn('[VoxCPM2] Prompt voice design failed, falling back:', err.message);
    }
  }

  await synthesizeSpeech(text, outputPath, { voiceId: fallbackVoiceId });
  return { success: true, engine: 'Edge-TTS-Fallback', outputPath };
}
