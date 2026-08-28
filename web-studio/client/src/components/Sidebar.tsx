import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Film, 
  Settings, 
  Zap, 
  Radio,
  ExternalLink,
  ShieldCheck,
  Cpu,
  ShoppingBag,
  Mic
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSettings: () => void;
  openVoiceCloning: () => void;
  serverOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openSettings,
  openVoiceCloning,
  serverOnline
}) => {
  const menuItems = [
    { id: 'studio', label: 'DUZK Studio Lồng Tiếng', icon: Sparkles, badge: 'AI ASR' },
    { id: 'marketing', label: 'AI Video Marketing', icon: ShoppingBag, badge: 'AIDA 2.5D' },
    { id: 'batch', label: 'Tải Kênh Hàng Loạt', icon: Layers, badge: 'HD' },
    { id: 'vault', label: 'Thư Viện Video Đã Xuất', icon: Film },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', padding: '0 4px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #FE2C55 0%, #9B51E0 50%, #00F2FE 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0, 242, 254, 0.35)',
          flexShrink: 0
        }}>
          <Zap size={22} color="#FFFFFF" fill="#FFFFFF" />
        </div>
        <div className="brand-text">
          <h2 style={{ 
            fontSize: '17px', 
            fontWeight: 900, 
            letterSpacing: '-0.3px',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #00F2FE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: '1.2'
          }}>
            DUZK<span style={{ color: 'var(--accent-red)', WebkitTextFillColor: 'var(--accent-red)' }}>VIDEOTOOL</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
              AI STUDIO v3.0
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px' }}>
              PRO
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div className="nav-label" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 4px' }}>
          Menu Công Cụ
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(0, 242, 254, 0.15) 0%, rgba(254, 44, 85, 0.08) 100%)' 
                  : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                boxShadow: isActive ? '0 4px 16px rgba(0, 242, 254, 0.15)' : 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'currentColor'} />
                <span className="nav-label">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`badge ${isActive ? 'badge-cyan' : 'badge-red'} nav-badge`} style={{ fontSize: '9px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Extension Link Card */}
      <div className="ext-card" style={{
        background: 'linear-gradient(180deg, rgba(0, 242, 254, 0.06) 0%, rgba(14, 20, 34, 0.6) 100%)',
        border: '1px solid rgba(0, 242, 254, 0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              DUZK Extension
            </span>
          </div>
          <span className="badge badge-green" style={{ fontSize: '8px', padding: '1px 4px' }}>
            ĐỒNG BỘ
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.45', marginBottom: '8px' }}>
          Bóc tách trực tiếp trên Douyin, TikTok & Xiaohongshu.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-red)', fontWeight: 700 }}>
          <ShieldCheck size={12} />
          <span>Chrome MV3 Sẵn Sàng</span>
        </div>
      </div>

      {/* Footer / Settings */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={openVoiceCloning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.12) 0%, rgba(155, 81, 224, 0.12) 100%)',
            color: '#00F2FE',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          <Mic size={16} color="#00F2FE" />
          <span className="nav-label">VoxCPM2 Voice Cloning</span>
        </button>

        <button
          onClick={openSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          <Settings size={16} />
          <span className="nav-label">Cài Đặt Gemini API & Model</span>
        </button>

        {/* Server Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: serverOnline ? 'var(--accent-green)' : '#EF4444',
              boxShadow: serverOnline ? '0 0 8px #10B981' : 'none'
            }} />
            <span style={{ fontWeight: 600, color: serverOnline ? 'var(--text-secondary)' : '#EF4444' }}>
              {serverOnline ? 'Backend 5000 Online' : 'Mất kết nối Server'}
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>:5000</span>
        </div>
      </div>
    </aside>
  );
};
