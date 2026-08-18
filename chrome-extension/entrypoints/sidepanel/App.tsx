import { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner'); // scanner, gallery, ai, settings
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ detected: 0, downloadable: 0, selected: 0 });
  const [videos, setVideos] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);

  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    // Load existing settings
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) setApiKey(result.geminiApiKey as string);
      });
    }

    // Listen for stats and video updates from content script
    const listener = (msg: any) => {
      if (msg.type === "social-intelligence-stats" && msg.stats) {
        setStats(msg.stats);
        if (msg.videos) {
          setVideos(msg.videos);
        }
      }
    };
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
    }
    
    // Check server status
    checkServer();
    const serverInterval = setInterval(checkServer, 6000);

    // Poll for initial stats
    pingContentScript();
    const interval = setInterval(pingContentScript, 2000);

    return () => {
      if (chrome?.runtime?.onMessage) chrome.runtime.onMessage.removeListener(listener);
      clearInterval(interval);
      clearInterval(serverInterval);
    };
  }, []);

  const checkServer = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/health');
      const json = await res.json();
      setServerOnline(json.status === 'ok');
    } catch (e) {
      setServerOnline(false);
    }
  };

  const pingContentScript = () => {
    if (!chrome?.tabs) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'social-intelligence-cmd', cmd: 'ping' }, (res) => {
          if (res && res.detected !== undefined) {
            setStats({ detected: res.detected, downloadable: res.downloadable, selected: res.selected });
            if (res.videos) setVideos(res.videos);
          }
        });
      }
    });
  };

  const sendCommand = (cmd: string) => {
    if (!chrome?.tabs) return;
    if (cmd.startsWith('ai')) setAiLoading(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'social-intelligence-cmd', cmd }, (response) => {
          if (cmd.startsWith('ai')) {
             setAiLoading(false);
             if (response && response.result) {
               setAiResult(response.result);
             } else if (response && response.error) {
               setAiResult(`Lỗi: ${response.error}`);
             }
          }
        });
      }
    });
  };

  const openWebStudio = (video?: any) => {
    if (video) {
      const pageUrl = video.pageUrl || (video.id ? `https://www.douyin.com/video/${video.id}` : '');
      const payload = {
        platform: 'douyin',
        id: video.id,
        title: video.description || 'Video Douyin',
        author: video.author || 'Douyin Creator',
        videoUrl: video.mediaUrl || '',
        coverUrl: video.coverUrl || '',
        musicUrl: video.musicUrl || '',
        pageUrl: pageUrl,
        likes: video.likes || 0,
        comments: video.comments || 0,
        shares: video.shares || 0
      };
      const encodedData = encodeURIComponent(JSON.stringify(payload));
      window.open(`http://localhost:5000/?url=${encodeURIComponent(pageUrl)}&data=${encodedData}`, '_blank');
    } else {
      if (chrome?.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabUrl = tabs[0]?.url || '';
          if (
            tabUrl.includes('douyin.com') ||
            tabUrl.includes('tiktok.com') ||
            tabUrl.includes('xiaohongshu.com') ||
            tabUrl.includes('xhslink.com') ||
            tabUrl.includes('bilibili.com') ||
            tabUrl.includes('b23.tv') ||
            tabUrl.includes('kuaishou.com')
          ) {
            window.open(`http://localhost:5000/?url=${encodeURIComponent(tabUrl)}`, '_blank');
          } else {
            window.open('http://localhost:5000', '_blank');
          }
        });
      } else {
        window.open('http://localhost:5000', '_blank');
      }
    }
  };



  const handleSave = () => {
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    }
  };

  const copyAiResult = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="dashboard-container">
      {/* Brand Header */}
      <header className="header-card">
        <div className="brand-row">
          <div className="logo-badge">⚡</div>
          <div>
            <h1>DUZK<span className="accent-red">VIDEOTOOL</span></h1>
            <p className="subtitle">AI Douyin Scanner & Subtitle Copilot v3.0</p>
          </div>
        </div>

        {/* Quick Studio Launcher Banner */}
        <button className="studio-banner-btn" onClick={() => openWebStudio()}>
          <div className="studio-btn-content">
            <span className="spark-icon">🚀</span>
            <span>Mở DUZK Studio Lồng Tiếng</span>
          </div>
          <span className="live-pill">{serverOnline ? 'Online :5000' : 'Port 5000'}</span>
        </button>
      </header>
      
      {/* Navigation Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'scanner' ? 'active' : ''}`} onClick={() => setActiveTab('scanner')}>
          <span>Quét & Tải</span>
        </button>
        <button className={`tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>
          <span>Thư Viện ({videos.length})</span>
        </button>
        <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          <span>Trí Tuệ AI</span>
        </button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span>Cài Đặt</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* TAB 1: SCANNER */}
        {activeTab === 'scanner' && (
          <div className="scanner-tab">
            {/* Stats Metric Cards */}
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">Phát hiện</span>
                <span className="stat-num stat-cyan">{stats.detected}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Có thể tải</span>
                <span className="stat-num stat-green">{stats.downloadable}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Đã chọn</span>
                <span className="stat-num stat-red">{stats.selected}</span>
              </div>
            </div>

            {/* AI Dubbing Featured Action */}
            <div className="featured-action-card">
              <div className="featured-title">
                <span>🎙️ Lồng Tiếng AI (1-Click)</span>
                <span className="badge-pro">HOT</span>
              </div>
              <p className="featured-desc">Tự động dịch kịch bản & lồng tiếng AI tiếng Việt cho video đang chọn.</p>
              <button className="btn btn-dub-action" onClick={() => {
                const target = videos.find(v => v.mediaUrl || v.pageUrl) || videos[0];
                if (target) {
                  openWebStudio(target);
                } else if (chrome?.tabs) {
                  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tabUrl = tabs[0]?.url || '';
                    window.open(`http://localhost:5000/?url=${encodeURIComponent(tabUrl)}`, '_blank');
                  });
                } else {
                  openWebStudio();
                }
              }}>
                <span>⚡ Mở Studio Lồng Tiếng Video Này</span>
              </button>

            </div>

            {/* Main Action Buttons */}
            <div className="action-group">
              <div className="section-title">Thao Tác Tải Xuống</div>
              
              <button className="btn btn-success" onClick={() => sendCommand('downloadSelected')}>
                <span>↓ Tải Video Đã Chọn (MP4 HD)</span>
              </button>

              <button className="btn btn-warning" onClick={() => sendCommand('downloadAudio')}>
                <span>🎵 Tải Âm Thanh Gốc (MP3)</span>
              </button>

              <button className="btn btn-primary" onClick={() => sendCommand('downloadVisible')}>
                <span>⚡ Tải Tất Cả Video Đã Phát Hiện</span>
              </button>
              
              <div className="section-title">Quét & Thu Thập</div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => sendCommand('scan')}>Quét Bảng Tin</button>
                <button className="btn btn-secondary" onClick={() => sendCommand('scanChannel')}>Quét Kênh</button>
              </div>

              <div className="section-title">Công Cụ Dữ Liệu</div>
              <div className="btn-row">
                <button className="btn btn-outline" onClick={() => sendCommand('exportChannel')}>Xuất JSON</button>
                <button className="btn btn-outline" onClick={() => sendCommand('clear')}>Bỏ Chọn Tất Cả</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GALLERY */}
        {activeTab === 'gallery' && (
          <div className="gallery-tab">
            {videos.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🎬</span>
                <p>Chưa phát hiện video nào.</p>
                <p className="empty-sub">Hãy lướt Douyin để công cụ tự động thu thập video HD.</p>
              </div>
            ) : (
              <div className="video-grid">
                {videos.map(v => (
                  <div key={v.id} className="video-card">
                    <div className="thumbnail-wrapper">
                      <img src={v.coverUrl || 'https://via.placeholder.com/150x260?text=Douyin'} alt="cover" className="video-thumbnail" />
                      <div className="card-overlay-actions">
                        <button className="btn-card-icon" title="Lồng tiếng AI" onClick={() => openWebStudio(v)}>
                          🎙️
                        </button>
                      </div>
                    </div>
                    <div className="video-info">
                      <div className="video-author">@{v.author || 'Tác giả'}</div>
                      <div className="video-stats">❤️ {v.likes || 0} · 💬 {v.comments || 0}</div>
                      <button className="btn-card-dub" onClick={() => openWebStudio(v)}>
                        🎙️ Lồng Tiếng AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI INSIGHTS */}
        {activeTab === 'ai' && (
          <div className="ai-tab">
            <div className="ai-actions-grid">
              <button className="btn btn-ai" onClick={() => sendCommand('aiSummarizeComments')} disabled={aiLoading}>
                <span className="ai-icon">💬</span>
                <div>
                  <div className="ai-btn-title">Phân Tích Bình Luận</div>
                  <div className="ai-btn-sub">Tóm tắt & đo lường cảm xúc</div>
                </div>
              </button>

              <button className="btn btn-ai" onClick={() => sendCommand('aiExtractScript')} disabled={aiLoading}>
                <span className="ai-icon">📝</span>
                <div>
                  <div className="ai-btn-title">Trích Xuất Kịch Bản</div>
                  <div className="ai-btn-sub">Soạn kịch bản tiếng Việt</div>
                </div>
              </button>

              <button className="btn btn-ai" onClick={() => sendCommand('aiGenerateTags')} disabled={aiLoading}>
                <span className="ai-icon">🏷️</span>
                <div>
                  <div className="ai-btn-title">Tạo Hashtags SEO</div>
                  <div className="ai-btn-sub">10 thẻ xu hướng Douyin & VN</div>
                </div>
              </button>
            </div>

            {/* AI Results Display */}
            <div className="ai-results-box">
              <div className="ai-results-header">
                <span className="results-title">Kết Quả Phân Tích AI</span>
                {aiResult && (
                  <button className="btn-copy" onClick={copyAiResult}>
                    {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
                  </button>
                )}
              </div>

              {aiLoading ? (
                <div className="loading-box">
                  <div className="spinner"></div>
                  <span>Gemini AI đang phân tích dữ liệu...</span>
                </div>
              ) : aiResult ? (
                <div className="result-text">{aiResult}</div>
              ) : (
                <p className="empty-text">Bấm vào một tính năng AI ở trên để xem kết quả phân tích tại đây.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="settings-card">
              <h3>Cài Đặt Gemini API Key</h3>
              <p className="settings-desc">Dùng để phân tích bình luận, dịch thuật và sáng tạo kịch bản.</p>
              <div className="input-group">
                <label htmlFor="apiKey">Google AI API Key</label>
                <input 
                  type="password" 
                  id="apiKey"
                  placeholder="AIzaSy..." 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
                {saved ? '✓ Đã lưu cài đặt!' : 'Lưu API Key'}
              </button>
            </div>

            <div className="settings-card">
              <h3>Trạng Thái Máy Chủ Web Studio</h3>
              <div className="status-row">
                <span>Local Server:</span>
                <span className={`status-pill ${serverOnline ? 'pill-green' : 'pill-red'}`}>
                  {serverOnline ? 'Online (Port 5000)' : 'Chưa kết nối'}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => openWebStudio()} style={{ width: '100%', marginTop: '12px' }}>
                Mở Giao Diện Web Studio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
