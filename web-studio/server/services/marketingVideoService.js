import { fetchClient } from './extractor.js';
import { ACTIVE_GEMINI_MODELS } from './ocrService.js';
import { createCapcutDraft } from './capcutDraftService.js';
import path from 'path';
import fs from 'fs';

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
 * Tự động tạo kịch bản bán hàng chuẩn AIDA bằng Gemini AI (REST API)
 */
export async function generateProductMarketingScript({
  productName = '',
  productCategory = 'Công nghệ',
  keyFeatures = '',
  targetAudience = 'Người dùng trẻ, yêu thích tiện ích',
  tone = 'Hấp dẫn, sôi nổi, tạo sự tin tưởng',
  apiKey = ''
}) {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('Vui lòng nhập Gemini API Key trong Cài đặt để tạo kịch bản Marketing');
  }

  const prompt = `
Bạn là Giám đốc Sáng tạo & Copywriter chuyên tạo video ngắn quảng cáo/review sản phẩm triệu view trên TikTok, Facebook Reels và YouTube Shorts.

Hãy viết một kịch bản Video Marketing/Review chuyên nghiệp, tỷ lệ chuyển đổi cao (High Conversion Rate) cho sản phẩm sau:
- Tên sản phẩm: ${productName}
- Ngành hàng: ${productCategory}
- Điểm nổi bật / Tính năng: ${keyFeatures}
- Đối tượng khách hàng: ${targetAudience}
- Phong cách: ${tone}

Kịch bản cần chia thành 5 phân đoạn chuẩn AIDA với thời lượng ước tính:
1. Hook (0s - 3s): Câu mở đầu gây sốc, giật tít, giữ chân người xem 3 giây đầu.
2. Pain Point (3s - 8s): Nêu nỗi đau / khó khăn mà khách hàng thường gặp phải.
3. Solution & Features (8s - 18s): Giới thiệu sản phẩm và các tính năng giải quyết triệt để nỗi đau.
4. Social Proof / Experience (18s - 26s): Trải nghiệm thực tế, cảm xúc hài lòng, đánh giá 5 sao.
5. Call To Action (26s - 30s): Kêu gọi mua ngay, nhấn mạnh ưu đãi giảm giá / freeship.

BẮT BUỘC trả về định dạng JSON DUY NHẤT theo cấu trúc sau:
{
  "title": "Tiêu đề video giật tít",
  "totalEstimatedSec": 30,
  "segments": [
    {
      "step": "Hook",
      "startTimeSec": 0,
      "endTimeSec": 3.0,
      "vietnameseText": "...",
      "shotType": "2.5D Fast Zoom In + Flash Cut",
      "sfx": "whoosh"
    },
    {
      "step": "Pain Point",
      "startTimeSec": 3.0,
      "endTimeSec": 8.0,
      "vietnameseText": "...",
      "shotType": "Pan Left + Dull Tone",
      "sfx": "bass_drop"
    },
    {
      "step": "Solution",
      "startTimeSec": 8.0,
      "endTimeSec": 18.0,
      "vietnameseText": "...",
      "shotType": "3D Hero Product Rotation + Highlight Glow",
      "sfx": "pop"
    },
    {
      "step": "Social Proof",
      "startTimeSec": 18.0,
      "endTimeSec": 26.0,
      "vietnameseText": "...",
      "shotType": "Split Screen Review + 5 Star Rating",
      "sfx": "ding"
    },
    {
      "step": "CTA",
      "startTimeSec": 26.0,
      "endTimeSec": 30.0,
      "vietnameseText": "...",
      "shotType": "Button Pulse + Promo Badge",
      "sfx": "riser"
    }
  ]
}
`;

  let lastError = null;
  for (const model of ACTIVE_GEMINI_MODELS) {
    try {
      const res = await fetchClient({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        method: 'POST',
        data: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      });

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini không trả về nội dung');

      const parsed = extractJson(rawText);
      if (parsed) return parsed;
      throw new Error('Không thể phân tích định dạng JSON từ Gemini');
    } catch (err) {
      lastError = err;
      console.warn(`[Marketing Script] Model ${model} failed, trying next:`, err.response?.data?.error?.message || err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const errMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Lỗi gọi Gemini API';
  throw new Error(`Lỗi Gemini AI: ${errMsg}`);
}
