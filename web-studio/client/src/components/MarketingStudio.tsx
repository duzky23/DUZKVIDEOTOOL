import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  Wand2, 
  Layers, 
  Play, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  FileVideo, 
  Sliders, 
  Volume2, 
  Flame,
  Zap
} from 'lucide-react';

interface MarketingStudioProps {
  apiKey: string;
  openSettings: () => void;
}

export const MarketingStudio: React.FC<MarketingStudioProps> = ({ apiKey, openSettings }) => {
  const [productName, setProductName] = useState('Bàn Chải Điện Siêu Âm Sonic Pro');
  const [productCategory, setProductCategory] = useState('Gia dụng & Chăm sóc cá nhân');
  const [keyFeatures, setKeyFeatures] = useState('Tần số rung 42.000 lần/phút, chống nước IPX7, pin dùng 60 ngày, đầu chải lông Dupont siêu mềm');
  const [targetAudience, setTargetAudience] = useState('Dân văn phòng, người niềng răng, giới trẻ quan tâm nụ cười');
  const [tone, setTone] = useState('Năng động, cuốn hút, kích thích mua ngay');
  
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptData, setScriptData] = useState<any>(null);
  const [exportingDraft, setExportingDraft] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  const handleGenerateScript = async () => {
    if (!apiKey) {
      alert('Vui lòng cài đặt Gemini API Key trong phần Cài đặt trước');
      openSettings();
      return;
    }

    setLoadingScript(true);
    setExportSuccessMsg('');
    try {
      const res = await fetch('/api/ai/marketing-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productCategory,
          keyFeatures,
          targetAudience,
          tone,
          apiKey
        })
      });

      const json = await res.json();
      if (json.ok) {
        setScriptData(json.data);
      } else {
        alert(`Lỗi: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleExportCapCut = async () => {
    if (!scriptData || !scriptData.segments) return;

    setExportingDraft(true);
    setExportSuccessMsg('');
    try {
      const res = await fetch('/api/export-capcut-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: 'https://raw.githubusercontent.com/Vincentwei1021/video-shotcraft/main/assets/demo.mp4', // demo placeholder or generated video
          title: `PROMO_${productName.replace(/\s+/g, '_')}`,
          subtitles: scriptData.segments,
          voiceId: 'vi-VN-HoaiMyNeural',
          enableDubbingVoice: true,
          transitionType: 'zoom_in',
          textAnimation: 'kinetic_pop',
          sfxList: [
            { name: 'whoosh', timeSec: 0, durationSec: 1.0 },
            { name: 'pop', timeSec: 8.0, durationSec: 0.8 },
            { name: 'ding', timeSec: 18.0, durationSec: 1.2 },
            { name: 'riser', timeSec: 26.0, durationSec: 2.0 }
          ]
        })
      });

      const json = await res.json();
      if (json.ok) {
        setExportSuccessMsg(`🎉 Đã xuất thành công dự án vào CapCut PC (${json.data.projectName})! Bạn chỉ cần mở CapCut là thấy ngay.`);
      } else {
        alert(`Lỗi xuất CapCut: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setExportingDraft(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.12) 0%, rgba(0, 242, 254, 0.08) 100%)',
        border: '1px solid rgba(254, 44, 85, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #FE2C55 0%, #FF6B6B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(254, 44, 85, 0.35)'
          }}>
            <ShoppingBag size={26} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI Product Marketing Studio <span className="badge badge-red">SHOTCRAFT 2.5D</span>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Tự động hóa video Review & Quảng cáo sản phẩm chuẩn AIDA triệu view cho TikTok & Reels
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateScript}
          disabled={loadingScript}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {loadingScript ? <RefreshCw className="spin" size={18} /> : <Wand2 size={18} />}
          {loadingScript ? 'AI Đang Sáng Tạo Kịch Bản...' : 'Tạo Kịch Bản AIDA 1-Click'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px' }}>
        {/* Left Column: Product Information Form */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--accent-cyan)" /> Thông Tin Sản Phẩm
          </h2>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tên sản phẩm:</label>
            <input
              type="text"
              className="input-field"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              style={{ width: '100%', marginTop: '4px', padding: '10px 12px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Ngành hàng / Danh mục:</label>
            <input
              type="text"
              className="input-field"
              value={productCategory}
              onChange={e => setProductCategory(e.target.value)}
              style={{ width: '100%', marginTop: '4px', padding: '10px 12px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tính năng & Điểm bán hàng độc nhất (USP):</label>
            <textarea
              className="input-field"
              rows={4}
              value={keyFeatures}
              onChange={e => setKeyFeatures(e.target.value)}
              style={{ width: '100%', marginTop: '4px', padding: '10px 12px', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Khách hàng mục tiêu:</label>
            <input
              type="text"
              className="input-field"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              style={{ width: '100%', marginTop: '4px', padding: '10px 12px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Phong cách truyền thông:</label>
            <input
              type="text"
              className="input-field"
              value={tone}
              onChange={e => setTone(e.target.value)}
              style={{ width: '100%', marginTop: '4px', padding: '10px 12px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Right Column: Storyboard & 5-Step Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exportSuccessMsg && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(0, 242, 254, 0.12)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              color: '#00F2FE',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={20} />
              {exportSuccessMsg}
            </div>
          )}

          {scriptData ? (
            <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#FFF' }}>
                    🎬 Kịch Bản: {scriptData.title}
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Thời lượng: {scriptData.totalEstimatedSec}s • 5 Phân đoạn AIDA • Chuẩn ShotCraft 2.5D
                  </span>
                </div>

                <button
                  onClick={handleExportCapCut}
                  disabled={exportingDraft}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
                    color: '#000',
                    fontWeight: 800,
                    padding: '10px 18px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {exportingDraft ? <RefreshCw className="spin" size={16} /> : <FileVideo size={16} />}
                  {exportingDraft ? 'Đang Xuất...' : 'Xuất Dự Án CapCut PC'}
                </button>
              </div>

              {/* Segments Timeline List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {scriptData.segments?.map((seg: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge" style={{
                          background: idx === 0 ? '#FE2C55' : idx === 4 ? '#00F2FE' : '#9B51E0',
                          color: idx === 4 ? '#000' : '#FFF',
                          fontWeight: 800,
                          fontSize: '11px'
                        }}>
                          {seg.step}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          ⏱️ {seg.startTimeSec}s - {seg.endTimeSec}s
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: '#00F2FE', background: 'rgba(0, 242, 254, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          🎥 {seg.shotType}
                        </span>
                        <span style={{ fontSize: '11px', color: '#FE2C55', background: 'rgba(254, 44, 85, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          🔊 SFX: {seg.sfx}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '13px', color: '#FFF', lineHeight: '1.5', margin: 0 }}>
                      "{seg.vietnameseText}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{
              padding: '60px 40px',
              borderRadius: '16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Sparkles size={40} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>
                Chưa Có Kịch Bản Bán Hàng
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px' }}>
                Hãy điền thông tin sản phẩm ở cột bên trái và bấm <strong>"Tạo Kịch Bản AIDA 1-Click"</strong> để AI tự động lên kịch bản chuyển đổi cao cho bạn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
