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
 * Tạo dự án CapCut PC Native (Video Track, TTS Audio Track, Subtitle Track)
 */
export async function createCapcutDraft({
  projectName = 'DUZK_DRAFT',
  videoPath = '',
  videoDuration = 10,
  subtitles = [],
  audioPath = '',
  audioDuration = 0
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

  // Tracks arrays
  const videoTrackSegments = [];
  const audioTrackSegments = [];
  const textTrackSegments = [];

  // 1. Setup Video Material & Segment
  const videoMaterialId = uuidv4();
  if (videoPath) {
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

  // 2. Setup Audio Material & Segment (TTS Voice)
  if (audioPath && fs.existsSync(audioPath)) {
    const audioMaterialId = uuidv4();
    const audioDurUs = toMicroseconds(audioDuration || videoDuration);
    materialAudios.push({
      id: audioMaterialId,
      path: audioPath,
      type: 'audio',
      duration: audioDurUs,
      name: 'AI_Dubbing_Vietnamese'
    });

    audioTrackSegments.push({
      id: uuidv4(),
      material_id: audioMaterialId,
      source_timerange: { start: 0, duration: audioDurUs },
      target_timerange: { start: 0, duration: audioDurUs },
      volume: 1.0
    });
  }

  // 3. Setup Text Subtitles Materials & Segments
  if (subtitles && Array.isArray(subtitles)) {
    subtitles.forEach((sub, index) => {
      const textMaterialId = uuidv4();
      const subStartUs = toMicroseconds(sub.startTimeSec || 0);
      const subEndUs = toMicroseconds(sub.endTimeSec || (sub.startTimeSec + 2.0));
      const subDurUs = Math.max(500000, subEndUs - subStartUs);
      const textContent = sub.vietnameseText || sub.text || '';

      const contentJson = JSON.stringify({
        styles: [
          {
            fill: { content: { solid: { color: [1.0, 1.0, 0.0] } } }, // Màu vàng nổi bật
            border: { width: 0.15, fill: { content: { solid: { color: [0.0, 0.0, 0.0] } } } }, // Viền đen
            size: 8.0,
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
        transform_y: -0.74 // Đáy màn hình
      });

      textTrackSegments.push({
        id: uuidv4(),
        material_id: textMaterialId,
        source_timerange: { start: 0, duration: subDurUs },
        target_timerange: { start: subStartUs, duration: subDurUs }
      });
    });
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
      speeds: [],
      transitions: []
    },
    tracks: [
      { id: uuidv4(), type: 'video', segments: videoTrackSegments, flag: 0 },
      { id: uuidv4(), type: 'audio', segments: audioTrackSegments, flag: 0 },
      { id: uuidv4(), type: 'text', segments: textTrackSegments, flag: 0 }
    ],
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
    isLocalCapCut: !!rootDrafts
  };
}
