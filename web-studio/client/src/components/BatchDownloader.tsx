import React, { useState } from 'react';
import { Layers, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const BatchDownloader: React.FC = () => {
  const [linksText, setLinksText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleStartBatch = async () => {
    const urls = linksText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 5);

    if (urls.length === 0) return;

    setIsProcessing(true);
    setResults([]);

    const tempResults: any[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const json = await res.json();
        if (json.ok) {
          tempResults.push({ url, status: 'success', data: json.data });
        } else {
          tempResults.push({ url, status: 'error', error: json.error });
        }
      } catch (err: any) {
        tempResults.push({ url, status: 'error', error: err.message });
      }
      setResults([...tempResults]);
    }

    setIsProcessing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
          Tải Video Hàng Loạt (Batch Downloader)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Dán danh sách nhiều đường link Douyin, TikTok, Xiaohongshu (mỗi dòng 1 link) để bóc tách và tải về cùng lúc.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <textarea
          className="input-field"
          rows={6}
          placeholder="https://v.douyin.com/abc/&#10;https://www.tiktok.com/@user/video/123&#10;https://www.xiaohongshu.com/explore/456"
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          style={{ resize: 'vertical' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Đã nhập: {linksText.split('\n').filter(u => u.trim()).length} đường link
          </span>
          <button
            className="btn btn-primary"
            onClick={handleStartBatch}
            disabled={isProcessing || !linksText.trim()}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Đang Xử Lý Hàng Loạt...</span>
              </>
            ) : (
              <>
                <Layers size={16} />
                <span>Bắt Đầu Bóc Tách Hàng Loạt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Danh Sách Kết Quả ({results.length})</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {r.status === 'success' ? (
                    <CheckCircle2 size={18} color="#10B981" />
                  ) : (
                    <AlertCircle size={18} color="#EF4444" />
                  )}
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {r.data?.title || r.url}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {r.status === 'success' ? `Tác giả: @${r.data?.author}` : `Lỗi: ${r.error}`}
                    </div>
                  </div>
                </div>

                {r.status === 'success' && r.data?.videoUrl && (
                  <a
                    href={r.data.videoUrl}
                    download="video.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                  >
                    <Download size={14} />
                    <span>Tải Video</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
