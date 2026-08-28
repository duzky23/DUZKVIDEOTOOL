import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tự động phát hiện thư mục lưu dự án của CapCut Desktop hoặc Jianying Pro trên Windows
 */
export function getCapCutDraftFolder() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\DUZK', 'AppData', 'Local');
  
  // 1. CapCut Global PC path
  const capcutPath = path.join(localAppData, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft');
  if (fs.existsSync(capcutPath)) return capcutPath;

  // 2. Jianying Pro (Cắt Ánh) path
  const jianyingPath = path.join(localAppData, 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft');
  if (fs.existsSync(jianyingPath)) return jianyingPath;

  // 3. Fallback: Tự động tạo thư mục CapCut
  try {
    fs.mkdirSync(capcutPath, { recursive: true });
    return capcutPath;
  } catch (e) {
    return null;
  }
}

/**
 * Chuyển đổi giây sang microsecond (1s = 1,000,000us) của CapCut
 */
function toMicroseconds(sec) {
  return Math.round(Number(sec || 0) * 1000000);
}

/**
 * Danh mục hiệu ứng chuyển cảnh CapCut PC chuẩn (Transitions Presets)
 */
export const CAPCUT_TRANSITIONS = {
  fade_black: { name: 'Mờ Đen', durationUs: 500000, effectId: 'transition_fade_black' },
  flash_white: { name: 'Chớp Trắng', durationUs: 400000, effectId: 'transition_flash_white' },
  zoom_in: { name: 'Phóng To Nhanh', durationUs: 600000, effectId: 'transition_zoom_in' },
  slide_left: { name: 'Trượt Trái', durationUs: 500000, effectId: 'transition_slide_left' },
  glitch: { name: 'Nhiễu Sóng Glitch', durationUs: 450000, effectId: 'transition_glitch' }
};

/**
 * Tạo dự án CapCut PC Native Nâng Cao (Video Tracks, Transitions, TTS Voice, Subtitles + Animations, SFX, BGM)
 */
export async function createCapcutDraft({
  projectName = 'DUZK_DRAFT',
  videoPath = '',
  videoDuration = 10,
  videoClips = [], // Danh sách video clips hoặc các đoạn cắt
  subtitles = [],
  textAnimation = 'kinetic_pop', // 'kinetic_pop' | 'typewriter' | 'neon_glow' | 'bounce'
  transitionType = 'zoom_in',
  audioPath = '',
  audioDuration = 0,
  bgmPath = '',
  bgmVolume = 0.25,
  sfxList = [] // [{ name: 'whoosh', timeSec: 0, path: '...' }]
}) {
  const rootDrafts = getCapCutDraftFolder();
  const safeProjectName = (projectName || 'DUZK_PROJ').replace(/[^\w\s\u00C0-\u1EF9-]/gi, '_').slice(0, 32);
  const draftId = uuidv4();
  const projectFolderName = `${safeProjectName}_${Date.now().toString().slice(-6)}`;
  
  const targetDir = rootDrafts 
    ? path.join(rootDrafts, projectFolderName)
    : path.join(process.cwd(), 'storage', 'outputs', 'capcut_drafts', projectFolderName);

  fs.mkdirSync(targetDir, { recursive: true });

  const totalDurationUs = toMicroseconds(videoDuration || 10);

  // Materials arrays
  const materialVideos = [];
  const materialAudios = [];
  const materialTexts = [];
  const materialTransitions = [];
  const materialEffects = [];

  // Tracks arrays
  const videoTrackSegments = [];
  const audioVoiceSegments = [];
  const audioBgmSegments = [];
  const audioSfxSegments = [];
  const textTrackSegments = [];

  // 1. Setup Video Clips & Segments
  if (videoClips && videoClips.length > 0) {
    let currentClipTimeUs = 0;
    videoClips.forEach((clip, idx) => {
      const clipMatId = uuidv4();
      const clipDurUs = toMicroseconds(clip.durationSec || 3);
      materialVideos.push({
        id: clipMatId,
        path: clip.path || videoPath,
        type: 'video',
        duration: clipDurUs,
        width: 1080,
        height: 1920
      });

      // Add Transition between clips if requested
      let transitionObj = null;
      if (idx > 0 && transitionType && CAPCUT_TRANSITIONS[transitionType]) {
        const transMatId = uuidv4();
        const transInfo = CAPCUT_TRANSITIONS[transitionType];
        materialTransitions.push({
          id: transMatId,
          type: 'transition',
          name: transInfo.name,
          duration: transInfo.durationUs,
          resource_id: transInfo.effectId
        });
        transitionObj = {
          material_id: transMatId,
          duration: transInfo.durationUs
        };
      }

      videoTrackSegments.push({
        id: uuidv4(),
        material_id: clipMatId,
        source_timerange: { start: 0, duration: clipDurUs },
        target_timerange: { start: currentClipTimeUs, duration: clipDurUs },
        render_index: idx,
        transition: transitionObj
      });

      currentClipTimeUs += clipDurUs;
    });
  } else if (videoPath) {
    const videoMaterialId = uuidv4();
    materialVideos.push({
      id: videoMaterialId,
      path: videoPath,
      type: 'video',
      duration: totalDurationUs,
      width: 1080,
      height: 1920
    });

    videoTrackSegments.push({
      id: uuidv4(),
      material_id: videoMaterialId,
      source_timerange: { start: 0, duration: totalDurationUs },
      target_timerange: { start: 0, duration: totalDurationUs },
      render_index: 0
    });
  }

  // 2. Setup AI Dubbing Voice Track
  if (audioPath && fs.existsSync(audioPath)) {
    const audioMaterialId = uuidv4();
    const audioDurUs = toMicroseconds(audioDuration || videoDuration);
    materialAudios.push({
      id: audioMaterialId,
      path: audioPath,
      type: 'audio',
      duration: audioDurUs,
      name: 'AI_Dubbing_Voice'
    });

    audioVoiceSegments.push({
      id: uuidv4(),
      material_id: audioMaterialId,
      source_timerange: { start: 0, duration: audioDurUs },
      target_timerange: { start: 0, duration: audioDurUs },
      volume: 1.25
    });
  }

  // 3. Setup Background Music (BGM) Track
  if (bgmPath && fs.existsSync(bgmPath)) {
    const bgmMaterialId = uuidv4();
    materialAudios.push({
      id: bgmMaterialId,
      path: bgmPath,
      type: 'audio',
      duration: totalDurationUs,
      name: 'Background_Music'
    });

    audioBgmSegments.push({
      id: uuidv4(),
      material_id: bgmMaterialId,
      source_timerange: { start: 0, duration: totalDurationUs },
      target_timerange: { start: 0, duration: totalDurationUs },
      volume: bgmVolume
    });
  }

  // 4. Setup SFX Track
  if (sfxList && sfxList.length > 0) {
    sfxList.forEach(sfx => {
      if (sfx.path && fs.existsSync(sfx.path)) {
        const sfxMatId = uuidv4();
        const sfxStartUs = toMicroseconds(sfx.timeSec || 0);
        const sfxDurUs = toMicroseconds(sfx.durationSec || 1.5);
        materialAudios.push({
          id: sfxMatId,
          path: sfx.path,
          type: 'audio',
          duration: sfxDurUs,
          name: sfx.name || 'SFX'
        });

        audioSfxSegments.push({
          id: uuidv4(),
          material_id: sfxMatId,
          source_timerange: { start: 0, duration: sfxDurUs },
          target_timerange: { start: sfxStartUs, duration: sfxDurUs },
          volume: 0.85
        });
      }
    });
  }

  // 5. Setup Animated Text Subtitles (Karaoke Kinetic Pop / Neon Glow)
  if (subtitles && Array.isArray(subtitles)) {
    subtitles.forEach((sub, index) => {
      const textMaterialId = uuidv4();
      const subStartUs = toMicroseconds(sub.startTimeSec || 0);
      const subEndUs = toMicroseconds(sub.endTimeSec || (sub.startTimeSec + 2.0));
      const subDurUs = Math.max(500000, subEndUs - subStartUs);
      const textContent = sub.vietnameseText || sub.text || '';

      // Style tùy biến theo textAnimation
      let fontColor = [1.0, 1.0, 0.0]; // Vàng nổi bật
      let borderColor = [0.0, 0.0, 0.0]; // Viền đen
      let borderWidth = 0.16;
      let animConfig = null;

      if (textAnimation === 'neon_glow') {
        fontColor = [0.0, 0.95, 1.0]; // Xanh Neon Cyan
        borderColor = [0.0, 0.1, 0.3];
        borderWidth = 0.22;
      } else if (textAnimation === 'kinetic_pop') {
        fontColor = [1.0, 0.9, 0.1];
        animConfig = {
          in: { id: 'pop_in', duration: 250000 },
          out: { id: 'fade_out', duration: 150000 }
        };
      }

      const contentJson = JSON.stringify({
        styles: [
          {
            fill: { content: { solid: { color: fontColor } } },
            border: { width: borderWidth, fill: { content: { solid: { color: borderColor } } } },
            size: 9.0,
            font: { id: '', path: '' }
          }
        ],
        text: textContent
      });

      materialTexts.push({
        id: textMaterialId,
        content: contentJson,
        type: 'subtitle',
        alignment: 1, // Center
        transform_y: -0.74, // Đáy màn hình
        animation: animConfig
      });

      textTrackSegments.push({
        id: uuidv4(),
        material_id: textMaterialId,
        source_timerange: { start: 0, duration: subDurUs },
        target_timerange: { start: subStartUs, duration: subDurUs }
      });
    });
  }

  // Khởi tạo danh sách tracks
  const allTracks = [
    { id: uuidv4(), type: 'video', segments: videoTrackSegments, flag: 0 }
  ];

  if (audioVoiceSegments.length > 0) {
    allTracks.push({ id: uuidv4(), type: 'audio', segments: audioVoiceSegments, flag: 0 });
  }
  if (audioBgmSegments.length > 0) {
    allTracks.push({ id: uuidv4(), type: 'audio', segments: audioBgmSegments, flag: 0 });
  }
  if (audioSfxSegments.length > 0) {
    allTracks.push({ id: uuidv4(), type: 'audio', segments: audioSfxSegments, flag: 0 });
  }
  if (textTrackSegments.length > 0) {
    allTracks.push({ id: uuidv4(), type: 'text', segments: textTrackSegments, flag: 0 });
  }

  // Cấu trúc draft_content.json chuẩn CapCut PC
  const draftContent = {
    canvas_config: { width: 1080, height: 1920, ratio: '9:16' },
    duration: totalDurationUs,
    fps: 30.0,
    materials: {
      videos: materialVideos,
      audios: materialAudios,
      texts: materialTexts,
      transitions: materialTransitions,
      effects: materialEffects,
      speeds: []
    },
    tracks: allTracks,
    version: 3000000
  };

  // Cấu trúc draft_meta_info.json
  const draftMeta = {
    draft_id: draftId,
    draft_name: safeProjectName,
    draft_fold_path: targetDir,
    draft_timeline_materials_size: totalDurationUs,
    tm_draft_create: Date.now() * 1000,
    tm_draft_modified: Date.now() * 1000,
    draft_root_path: rootDrafts || ''
  };

  // Ghi file JSON
  fs.writeFileSync(path.join(targetDir, 'draft_content.json'), JSON.stringify(draftContent, null, 2), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'draft_meta_info.json'), JSON.stringify(draftMeta, null, 2), 'utf8');

  return {
    success: true,
    projectName: safeProjectName,
    draftFolder: targetDir,
    isLocalCapCut: !!rootDrafts,
    tracksCount: allTracks.length,
    transitionsCount: materialTransitions.length,
    sfxCount: audioSfxSegments.length
  };
}
