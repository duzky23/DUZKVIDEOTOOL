import { fetchClient } from './extractor.js';
import { ACTIVE_GEMINI_MODELS } from './ocrService.js';
import dotenv from 'dotenv';


dotenv.config();

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

/**
 * Service to interact with Gemini API for translation, script generation, and dubbing optimization
 */
export async function generateDubbingScript({ title, description, audioTranscript, style = 'affiliate', apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Chưa cung cấp Gemini API Key. Hãy cấu hình API Key trong cài đặt!');
  }

  const stylePrompts = {
    affiliate: 'Phong cách bán hàng / review sản phẩm / Affiliate Marketing (năng động, cuốn hút, nhấn mạnh ưu điểm, có kêu gọi hành động mua hàng hoặc xem giỏ hàng).',
    story: 'Phong cách kể chuyện / Drama / Review phim (lôi cuốn, kịch tính, ngữ điệu tự nhiên, gây tò mò).',
    tutorial: 'Phong cách chia sẻ mẹo / hướng dẫn (ngắn gọn, xúc tích, dễ hiểu, logic).',
    standard: 'Phong cách tự nhiên, chuẩn văn phong đời thường của giới trẻ Việt Nam trên TikTok/Reels.'
  };

  const selectedStyle = stylePrompts[style] || stylePrompts.affiliate;

  const prompt = `Bạn là một chuyên gia sáng tạo nội dung và lồng tiếng video ngắn hàng đầu cho TikTok/Reels/Shorts tại Việt Nam.
Nhiệm vụ của bạn là chuyển thể và viết kịch bản lồng tiếng tiếng Việt hoàn chỉnh cho video sau.

Thông tin video gốc:
- Tiêu đề: ${title || 'Không có'}
- Mô tả/Nội dung: ${description || 'Không có'}
- Lời thoại/Phụ đề gốc: ${audioTranscript || 'Không có'}

Yêu cầu:
1. Viết kịch bản tiếng Việt theo phong cách: ${selectedStyle}
2. Ngắt thành các câu ngắn vừa phải (từ 10 đến 25 từ mỗi câu) để giọng đọc AI lồng tiếng khớp mượt mà với nhịp điệu video.
3. Dịch thoát nghĩa tự nhiên, không dịch máy móc "word-by-word". Tự động bỏ các từ rác tiếng Trung, thay thế bằng từ ngữ trending của giới trẻ Việt Nam.
4. Trả về định dạng JSON DUY NHẤT theo cấu trúc sau (không kèm markdown ngoài json):

{
  "summary": "Tóm tắt ngắn gọn 1-2 câu về video",
  "fullScript": "Toàn bộ kịch bản tiếng Việt liền mạch để đọc lồng tiếng",
  "segments": [
    {
      "id": 1,
      "text": "Câu nói tiếng Việt thứ nhất...",
      "estimatedDurationSec": 3.5
    },
    {
      "id": 2,
      "text": "Câu nói tiếng Việt tiếp theo...",
      "estimatedDurationSec": 4.0
    }
  ],
  "suggestedTags": ["#review", "#trending", "#learnontiktok"]
}`;

  let lastError = null;

  for (const model of ACTIVE_GEMINI_MODELS) {
    try {
      const res = await fetchClient({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        method: 'POST',
        data: {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      });

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini không trả về nội dung');
      }

      const parsed = extractJson(rawText);
      if (parsed) {
        return parsed;
      }
      throw new Error('Không thể phân tích định dạng JSON từ Gemini');
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next model:`, err.response?.data?.error?.message || err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const errMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Lỗi gọi Gemini API';
  throw new Error(`Lỗi Gemini AI: ${errMsg}`);
}
