import React, { useState, useEffect } from 'react';
import { Film, Download, Trash2, Play, FileText, RefreshCw } from 'lucide-react';

export const VideoVault: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const json = await res.json();
      if (json.ok) {
        setHistory(json.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setHistory(history.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
            Thư Viện Video Đã Lồng Tiếng
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Quản lý và tải lại các video thành phẩm cùng phụ đề SRT đã xuất từ Studio.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchHistory} style={{ padding: '8px 16px' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Làm Mới</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Đang tải thư viện...
        </div>
      ) : history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Film size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Chưa Có Video Nào Trong Thư Viện
          </h3>
          <p style={{ fontSize: '13px' }}>
            Hãy vào mục Studio Lồng Tiếng để bắt đầu tạo video đầu tiên của bạn!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {history.map(item => (
            <div key={item.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', height: '180px' }}>
                <video
                  src={item.videoUrl}
                  controls
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title || 'Video Lồng Tiếng'}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Giọng: {item.voiceId.includes('HoaiMy') ? 'Hoài My (Nữ)' : 'Nam Minh (Nam)'}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {item.script && (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  lineHeight: '1.4',
                  maxHeight: '50px',
                  overflow: 'hidden'
                }}>
                  "{item.script}"
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <a
                  href={item.videoUrl}
                  download="dubbed_video.mp4"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px', fontSize: '12px', textDecoration: 'none' }}
                >
                  <Download size={14} />
                  <span>Tải Video MP4</span>
                </a>

                {item.srtUrl && (
                  <a
                    href={item.srtUrl}
                    download="subtitles.srt"
                    className="btn btn-secondary"
                    style={{ padding: '8px', fontSize: '12px', textDecoration: 'none' }}
                    title="Tải phụ đề SRT"
                  >
                    <FileText size={14} />
                  </a>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  className="btn btn-secondary"
                  style={{ padding: '8px', color: '#EF4444' }}
                  title="Xóa khỏi lịch sử"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
