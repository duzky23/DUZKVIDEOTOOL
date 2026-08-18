import React, { useState } from 'react';
import { X, Key, Check, Server, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  serverOnline: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  serverOnline
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '28px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
          Cài Đặt Hệ Thống TaiVideoNhanh
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Cấu hình API Key và trạng thái máy chủ xử lý video.
        </p>

        {/* Gemini API Key Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            <Key size={16} color="var(--accent-red)" />
            <span>Google Gemini API Key (Dịch & Viết Kịch Bản)</span>
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="AIzaSy..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            API Key được lưu an toàn trực tiếp trên trình duyệt của bạn (Local Storage).
          </span>
        </div>

        {/* Server Status */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={18} color={serverOnline ? '#10B981' : '#EF4444'} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Local Render Engine</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>http://localhost:5000</div>
            </div>
          </div>
          <span className={`badge ${serverOnline ? 'badge-green' : 'badge-red'}`}>
            {serverOnline ? 'Sẵn sàng' : 'Chưa kết nối'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? (
              <>
                <Check size={16} />
                <span>Đã Lưu Cài Đặt!</span>
              </>
            ) : (
              <span>Lưu Thay Đổi</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
