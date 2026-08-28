import React, { useState, useEffect } from 'react';
import { Mic, Sparkles, Volume2, Cpu, CheckCircle2, AlertCircle, RefreshCw, X, Radio, Wand2 } from 'lucide-react';

interface VoiceCloningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice?: (voiceId: string) => void;
}

export const VoiceCloningModal: React.FC<VoiceCloningModalProps> = ({
  isOpen,
  onClose,
  onSelectVoice
}) => {
  const [activeMode, setActiveMode] = useState<'clone' | 'design'>('clone');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState('Chào bạn! Đây là giọng đọc được nhân bản với độ trung thực cao từ mô hình VoxCPM2.');
  const [refAudioUrl, setRefAudioUrl] = useState('');
  const [voicePrompt, setVoicePrompt] = useState('Giọng nữ MC tin tức 28 tuổi, phong cách truyền cảm, nhẹ nhàng, tự tin');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/voxcpm/status');
      const json = await res.json();
      setStatus(json.data);
    } catch (e) {
      setStatus({ available: false, model: 'Edge TTS Neural (Fallback)' });
    }
  };

  const handleClone = async () => {
    setLoading(true);
    setStatusMsg('Đang phân tích âm sắc mẫu và nhân bản giọng nói với VoxCPM2...');
    try {
      const res = await fetch('/api/voxcpm/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          referenceAudioUrl: refAudioUrl || undefined,
          language: 'vi',
          fallbackVoiceId: 'vi-VN-HoaiMyNeural'
        })
      });
      const json = await res.json();
      if (json.ok) {
        setGeneratedAudioUrl(json.data.audioUrl);
        setStatusMsg(`✅ Tạo giọng thành công (${json.data.engine})!`);
      } else {
        setStatusMsg(`❌ Lỗi: ${json.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDesign = async () => {
    setLoading(true);
    setStatusMsg('Đang tổng hợp giọng nói từ Prompt mô tả...');
    try {
      const res = await fetch('/api/voxcpm/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voicePrompt,
          fallbackVoiceId: 'vi-VN-NamMinhNeural'
        })
      });
      const json = await res.json();
      if (json.ok) {
        setGeneratedAudioUrl(json.data.audioUrl);
        setStatusMsg(`✅ Thiết kế giọng thành công (${json.data.engine})!`);
      } else {
        setStatusMsg(`❌ Lỗi: ${json.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div className="modal-content glass-card" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '20px',
        border: '1px solid rgba(0, 242, 254, 0.3)',
        padding: '28px',
        background: 'rgba(15, 18, 28, 0.95)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 242, 254, 0.15)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 242, 254, 0.3)'
            }}>
              <Mic size={22} color="#000" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF' }}>
                Trung Tâm Nhân Bản Giọng Nói VoxCPM2
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Tokenizer-Free 48kHz Studio TTS & Voice Cloning Engine
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Engine Status Banner */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: status?.available ? 'rgba(0, 242, 254, 0.1)' : 'rgba(254, 44, 85, 0.1)',
          border: status?.available ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid rgba(254, 44, 85, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color={status?.available ? '#00F2FE' : '#FE2C55'} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
              Mô hình: <span style={{ color: status?.available ? '#00F2FE' : '#FE2C55' }}>{status?.model || 'Đang kiểm tra...'}</span>
            </span>
          </div>
          <span className="badge" style={{
            background: status?.available ? '#00F2FE' : '#FE2C55',
            color: '#000',
            fontWeight: 800,
            fontSize: '10px'
          }}>
            {status?.available ? 'GPU NATIVE' : 'NEURAL FALLBACK'}
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveMode('clone')}
            className={`btn ${activeMode === 'clone' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <Radio size={16} /> Nhân Bản Giọng Mẫu (Zero-Shot)
          </button>
          <button
            onClick={() => setActiveMode('design')}
            className={`btn ${activeMode === 'design' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <Wand2 size={16} /> Thiết Kế Giọng Bằng Prompt
          </button>
        </div>

        {/* Input Fields */}
        {activeMode === 'clone' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Đường Dẫn File Audio Mẫu (WAV/MP3 3 - 5 giây):
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Nhập link video Douyin/TikTok hoặc file audio mẫu (để trống sẽ dùng giọng chuẩn)..."
              value={refAudioUrl}
              onChange={e => setRefAudioUrl(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Prompt Mô Tả Giọng Đọc Muốn Tạo:
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Giọng nam trầm ấm, phát thanh viên thời sự 35 tuổi..."
              value={voicePrompt}
              onChange={e => setVoicePrompt(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Văn Bản Thử Giọng (Test Script):
          </label>
          <textarea
            className="input-field"
            rows={3}
            value={textToSpeak}
            onChange={e => setTextToSpeak(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', fontSize: '13px', resize: 'vertical' }}
          />
        </div>

        {/* Actions & Result */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={activeMode === 'clone' ? handleClone : handleDesign}
            disabled={loading}
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <RefreshCw className="spin" size={18} /> : <Volume2 size={18} />}
            {loading ? 'Đang Xử Lý Audio...' : activeMode === 'clone' ? 'Tạo Bản Thử Giọng Clone' : 'Tạo Bản Thử Giọng Thiết Kế'}
          </button>
        </div>

        {statusMsg && (
          <div style={{
            fontSize: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            marginBottom: '16px',
            color: statusMsg.startsWith('✅') ? '#00F2FE' : '#FE2C55'
          }}>
            {statusMsg}
          </div>
        )}

        {generatedAudioUrl && (
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                🎧 Bản Nghe Thử Âm Thanh 48kHz:
              </span>
            </div>
            <audio controls src={generatedAudioUrl} autoPlay style={{ width: '100%', height: '36px' }} />
          </div>
        )}
      </div>
    </div>
  );
};
