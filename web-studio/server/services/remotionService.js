import fs from 'fs';
import path from 'path';

/**
 * Tạo file phụ đề ASS (Advanced SubStation Alpha) hỗ trợ Kinetic Karaoke Typography
 * Từng từ được highlight phát sáng và nảy lên theo nhịp nói
 */
export function generateKineticAssSubtitles({
  segments = [],
  outputPath,
  highlightColor = '&H0000FFFF', // Vàng rực rỡ
  baseColor = '&H00FFFFFF',      // Trắng
  fontSize = 24,
  fontName = 'Arial'
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const header = `[Script Info]
Title: DUZK Remotion Kinetic Typography
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${baseColor},${highlightColor},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1.5,2,40,40,240,1
Style: HookTitle,${fontName},34,&H0000FFFF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,4,2,8,40,40,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';

  segments.forEach((seg) => {
    const text = (seg.vietnameseText || seg.text || '').trim();
    if (!text) return;

    const startSec = Number(seg.startTimeSec || 0);
    const endSec = Number(seg.endTimeSec || (startSec + 3.0));
    const totalDuration = Math.max(1.0, endSec - startSec);

    const startTimeFormatted = formatAssTime(startSec);
    const endTimeFormatted = formatAssTime(endSec);

    // Tách từng từ và chia thời gian phát sáng
    const words = text.split(/\s+/);
    const durationPerWordCs = Math.round((totalDuration * 100) / Math.max(1, words.length)); // centiseconds

    // Sinh hiệu ứng Karaoke {\k<duration>}
    let kineticText = '';
    words.forEach(word => {
      kineticText += `{\\k${durationPerWordCs}}${word} `;
    });

    events += `Dialogue: 0,${startTimeFormatted},${endTimeFormatted},Default,,0,0,0,,{\\fad(120,120)}${kineticText.trim()}\n`;
  });

  const assContent = header + events;
  fs.writeFileSync(outputPath, assContent, 'utf8');
  return outputPath;
}

/**
 * Format số giây sang chuẩn ASS: H:MM:SS.cs
 */
function formatAssTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.floor((seconds % 1) * 100);
  const pad = (n, s = 2) => String(n).padStart(s, '0');
  return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(centis, 2)}`;
}

/**
 * Tạo bộ lọc FFmpeg cho Glowing Progress Bar ở đáy video
 */
export function buildProgressBarFilter({
  videoDurationSec = 10,
  barHeight = 10,
  barColor = '0x00F2FE', // Cyan glow
  glowColor = '0xFE2C55'  // TikTok Pink
}) {
  const duration = Math.max(1, videoDurationSec);
  // Di chuyển chiều rộng w từ 0 -> W theo thời gian t (t/duration * W)
  return `drawbox=x=0:y=ih-${barHeight}:w='min(iw, (t/${duration})*iw)':h=${barHeight}:color=${barColor}@0.95:t=fill`;
}

/**
 * Tạo bộ lọc FFmpeg cho 3D Hook Card / Header Banner
 */
export function buildHookCardFilter({
  title = '',
  badge = '⚡ HOT TREND'
}) {
  if (!title) return '';
  const cleanTitle = title.replace(/'/g, "\\'").replace(/:/g, '\\:').slice(0, 45);
  return `drawbox=x=(w-960)/2:y=140:w=960:h=150:color=black@0.85:t=fill,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${badge}':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=155,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${cleanTitle}':fontcolor=white:fontsize=32:bold=1:x=(w-text_w)/2:y=200`;
}
