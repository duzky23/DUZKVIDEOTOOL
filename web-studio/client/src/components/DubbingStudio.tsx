import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Download,
  Volume2,
  Video,
  FileText,
  Sliders,
  CheckCircle2,
  Globe,
  RefreshCw,
  Play,
  Pause,
  Layers,
  Image as ImageIcon,
  Copy,
  Check,
  Eye,
  EyeOff,
  Move,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus
} from 'lucide-react';

interface DubbingStudioProps {
  apiKey: string;
  openSettings: () => void;
}

export const DubbingStudio: React.FC<DubbingStudioProps> = ({ apiKey, openSettings }) => {
  // Input State
  const [urlInput, setUrlInput] = useState('');
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [loadingRender, setLoadingRender] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [showManifest, setShowManifest] = useState(false);

  // Subtitle & Masking Options
  const [maskOldSubtitles, setMaskOldSubtitles] = useState(true);
  const [maskPreset, setMaskPreset] = useState<'16:9' | '9:16' | 'custom'>('16:9');
  const [maskYPercent, setMaskYPercent] = useState(85);
  const [maskHeightPercent, setMaskHeightPercent] = useState(14);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [subtitleMode, setSubtitleMode] = useState('target-only'); // 'target-only' | 'bilingual'
  const [subtitleColor, setSubtitleColor] = useState('&H0000FFFF'); // &H0000FFFF (Yellow), &H00FFFFFF (White), &H00FFFF00 (Cyan)
  const [enableDubbingVoice, setEnableDubbingVoice] = useState(true);

  // Interactive Live Video Overlay & Drag State
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showLiveMaskPreview, setShowLiveMaskPreview] = useState(true);
  const [showLiveSubtitlePreview, setShowLiveSubtitlePreview] = useState(true);
  const [isDraggingMask, setIsDraggingMask] = useState<'move' | 'resize-top' | 'resize-bottom' | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartMaskY, setDragStartMaskY] = useState(85);
  const [dragStartMaskHeight, setDragStartMaskHeight] = useState(14);

  // Layout & Reformatting (KrillinAI Vertical 9:16 Mode)
  const [aspectRatio, setAspectRatio] = useState('original'); // 'original' | '9:16'
  const [majorTitle, setMajorTitle] = useState('');
  const [minorTitle, setMinorTitle] = useState('');
  const [generateCover, setGenerateCover] = useState(true);

  // Video State
  const [videoData, setVideoData] = useState<any>(null);
  const [selectedStyle, setSelectedStyle] = useState('affiliate');
  const [scriptData, setScriptData] = useState<any>(null);
  const [editedScript, setEditedScript] = useState('');


  // Audio / Render Config
  const [selectedVoice, setSelectedVoice] = useState('vi-VN-HoaiMyNeural');
  const [originalVolume, setOriginalVolume] = useState('0.15');
  const [dubbingVolume, setDubbingVolume] = useState('1.3');

  const [useProxyStream, setUseProxyStream] = useState(false);

  // Remotion & CapCut Pro FX Options
  const [enableProgressBar, setEnableProgressBar] = useState(true);
  const [enableKineticSubtitles, setEnableKineticSubtitles] = useState(true);
  const [capcutTransition, setCapcutTransition] = useState('zoom_in');
  const [capcutTextAnim, setCapcutTextAnim] = useState('kinetic_pop');
  const [exportingCapcut, setExportingCapcut] = useState(false);
  const [capcutExportSuccess, setCapcutExportSuccess] = useState('');

  // Render Result
  const [renderResult, setRenderResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Master extraction logic that can be triggered manually or automatically from URL params
  const handleExtractUrl = async (urlToExtract: string) => {
    const clean = urlToExtract.trim();
    if (!clean) return;
    setErrorMsg('');
    setLoadingExtract(true);
    setUseProxyStream(false);
    setScriptData(null);
    setEditedScript('');
    setRenderResult(null);
    setOcrRawText('');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setVideoData(json.data);
      if (json.data.title) {
        setMajorTitle(json.data.title.slice(0, 30));
      }
      if (
        json.data.platform === 'bilibili' ||
        json.data.platform === 'xiaohongshu' ||
        json.data.videoUrl?.includes('bilivideo.com') ||
        json.data.videoUrl?.includes('akamaized.net') ||
        json.data.videoUrl?.includes('xhscdn.com')
      ) {
        setUseProxyStream(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể bóc tách link video');
    } finally {
      setLoadingExtract(false);
    }

  };

  const handleExtract = () => {
    handleExtractUrl(urlInput);
  };

  // Auto-extract from URL query parameter or pre-extracted data from Extension
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramData = params.get('data');
    const paramUrl = params.get('url');

    let initialData: any = null;
    let initialUrl = '';

    if (paramData) {
      try {
        initialData = JSON.parse(decodeURIComponent(paramData));
      } catch (e) {
        console.error('Failed to parse query payload data:', e);
      }
    }

    if (paramUrl) {
      initialUrl = decodeURIComponent(paramUrl);
    } else if (initialData?.pageUrl) {
      initialUrl = initialData.pageUrl;
    } else if (initialData?.id) {
      initialUrl = `https://www.douyin.com/video/${initialData.id}`;
    }

    if (initialUrl) {
      setUrlInput(initialUrl);
    }

    if (initialData) {
      setVideoData(initialData);
      if (initialData.title) {
        setMajorTitle(initialData.title.slice(0, 30));
      }
      // If direct stream URL is not present, is empty, or is a browser-restricted blob, auto-extract HD stream!
      const vUrl = initialData.videoUrl || '';
      if (!vUrl || vUrl.startsWith('blob:') || !vUrl.startsWith('http')) {
        if (initialUrl) {
          handleExtractUrl(initialUrl);
        }
      }
    } else if (initialUrl) {
      handleExtractUrl(initialUrl);
    }
  }, []);

  // Interactive On-Video Mask Drag & Resize Handlers
  const handleMouseDownMask = (e: React.MouseEvent, type: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingMask(type);
    setDragStartY(e.clientY);
    setDragStartMaskY(maskYPercent);
    setDragStartMaskHeight(maskHeightPercent);
  };

  const handleMouseMoveContainer = (e: React.MouseEvent) => {
    if (!isDraggingMask || !videoContainerRef.current) return;
    const rect = videoContainerRef.current.getBoundingClientRect();
    const deltaY = e.clientY - dragStartY;
    const deltaPercent = (deltaY / rect.height) * 100;

    if (isDraggingMask === 'move') {
      const newY = Math.max(0, Math.min(100 - maskHeightPercent, Math.round(dragStartMaskY + deltaPercent)));
      setMaskYPercent(newY);
      setMaskPreset('custom');
    } else if (isDraggingMask === 'resize-top') {
      const newY = Math.max(0, Math.min(dragStartMaskY + dragStartMaskHeight - 4, Math.round(dragStartMaskY + deltaPercent)));
      const newHeight = Math.round(dragStartMaskHeight - (newY - dragStartMaskY));
      setMaskYPercent(newY);
      setMaskHeightPercent(Math.max(4, Math.min(50, newHeight)));
      setMaskPreset('custom');
    } else if (isDraggingMask === 'resize-bottom') {
      const newHeight = Math.max(4, Math.min(100 - maskYPercent, Math.round(dragStartMaskHeight + deltaPercent)));
      setMaskHeightPercent(newHeight);
      setMaskPreset('custom');
    }
  };

  const handleMouseUp = () => {
    if (isDraggingMask) {
      setIsDraggingMask(null);
    }
  };

  // Step 2a: Generate AI Script with Gemini
  const handleGenerateScript = async () => {
    if (!apiKey) {
      openSettings();
      return;
    }
    if (!videoData) return;
    setErrorMsg('');
    setLoadingAi(true);

    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoData.title,
          description: videoData.description || videoData.title,
          audioTranscript: videoData.title,
          style: selectedStyle,
          apiKey
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setScriptData(json.data);
      setEditedScript(json.data.fullScript || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tạo kịch bản AI');
    } finally {
      setLoadingAi(false);
    }
  };

  // Step 2b: Extract Subtitles & Dialogue with CapCut AI Engine
  const handleOcrSubtitles = async (mode: 'auto' | 'asr' | 'ocr' = 'auto') => {
    if (!videoData?.videoUrl) {
      setErrorMsg('Vui lòng bóc tách video trước');
      return;
    }
    setErrorMsg('');
    setLoadingOcr(true);

    try {
      const res = await fetch('/api/ocr-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: videoData.videoUrl,
          style: selectedStyle,
          mode,
          apiKey
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      
      setOcrRawText(json.data.fullOriginalTranscript || json.data.rawOcrText || '');
      setScriptData({
        source: json.data.source,
        summary: json.data.vietnameseSummary || json.data.summary,
        fullScript: json.data.fullVietnameseScript,
        segments: json.data.segments?.map((s: any) => ({
          id: s.id,
          startTimeSec: s.startTimeSec,
          endTimeSec: s.endTimeSec,
          originalText: s.originalText,
          vietnameseText: s.vietnameseText,
          text: s.vietnameseText,
          estimatedDurationSec: s.estimatedDurationSec
        })),
        suggestedTags: json.data.suggestedTags
      });
      setEditedScript(json.data.fullVietnameseScript || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi bóc tách phụ đề và lời thoại');
    } finally {
      setLoadingOcr(false);
    }
  };


  // Preview Voice Sample
  const handlePreviewVoice = async () => {
    setPreviewingVoice(true);
    try {
      const sampleText = editedScript ? editedScript.slice(0, 80) : 'Xin chào, đây là giọng đọc AI của TaiVideoNhanh';
      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voiceId: selectedVoice
        })
      });
      if (!res.ok) throw new Error('Lỗi tạo giọng đọc');
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPreviewingVoice(false);
    }
  };

  // Step 3: Render Final Video with FFmpeg (KrillinAI Full Pipeline)
  const handleStartDubbing = async (configOverride?: { onlySubtitles?: boolean; onlyDubbing?: boolean }) => {
    if (!videoData?.videoUrl) {
      setErrorMsg('Không tìm thấy link video để render');
      return;
    }
    if (!editedScript.trim()) {
      setErrorMsg('Vui lòng tạo hoặc nhập kịch bản tiếng Việt trước khi render video');
      return;
    }

    setErrorMsg('');
    setLoadingRender(true);
    setRenderResult(null);

    const isOnlySubtitles = configOverride?.onlySubtitles === true;
    const isOnlyDubbing = configOverride?.onlyDubbing === true;

    try {
      const res = await fetch('/api/dub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: videoData.videoUrl,
          title: videoData.title,
          fullScript: editedScript,
          segments: scriptData?.segments || [],
          voiceId: selectedVoice,
          originalVolume: isOnlySubtitles ? 1.0 : parseFloat(originalVolume),
          dubbingVolume: isOnlySubtitles ? 0 : parseFloat(dubbingVolume),
          aspectRatio,
          majorTitle,
          minorTitle,
          subtitleMode,
          maskOldSubtitles: isOnlyDubbing ? false : maskOldSubtitles,
          maskYPercent: maskYPercent / 100,
          maskHeightPercent: maskHeightPercent / 100,
          burnSubtitles: isOnlyDubbing ? false : burnSubtitles,
          subtitleColor,
          enableDubbingVoice: isOnlySubtitles ? false : enableDubbingVoice,
          generateCover,
          enableProgressBar,
          enableKineticSubtitles,
          platform: videoData.platform
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setRenderResult(json);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi trong quá trình lồng tiếng và render video');
    } finally {
      setLoadingRender(false);
    }
  };


  const copyManifest = () => {
    if (!renderResult?.manifest) return;
    navigator.clipboard.writeText(JSON.stringify(renderResult.manifest, null, 2));
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #FFFFFF 0%, #00F2FE 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                DUZKVIDEOTOOL Studio
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '11px', padding: '3px 8px' }}>
                ⚡ AI ASR v3.0
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Bóc tách phụ đề CapCut ASR, Dịch hội thoại ngữ cảnh, Lồng tiếng AI Neural khớp từng giây & Dựng video 9:16 tự động.
            </p>
          </div>

          {/* Workflow Steps Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            <span style={{ color: urlInput ? 'var(--accent-cyan)' : 'var(--text-primary)', fontWeight: 700 }}>
              1. Bóc Tách Link
            </span>
            <span>➔</span>
            <span style={{ color: scriptData ? 'var(--accent-cyan)' : 'inherit', fontWeight: scriptData ? 700 : 500 }}>
              2. Phụ Đề ASR
            </span>
            <span>➔</span>
            <span style={{ color: renderResult ? 'var(--accent-green)' : 'inherit', fontWeight: renderResult ? 700 : 500 }}>
              3. Lồng Tiếng & Render
            </span>
          </div>
        </div>
      </div>


      {/* Input Link Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Dán link video Douyin, Bilibili, Xiaohongshu (XHS), TikTok, Kuaishou, YouTube..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              style={{ paddingLeft: '42px', height: '48px', fontSize: '15px' }}
            />
            <Globe size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleExtract}
            disabled={loadingExtract || !urlInput.trim()}
            style={{ height: '48px', padding: '0 24px', whiteSpace: 'nowrap' }}
          >
            {loadingExtract ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Đang Bóc Tách...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Bóc Tách Video</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Platform Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hỗ trợ:</span>
          <span className="badge badge-red">Douyin HD (抖音)</span>
          <span className="badge badge-cyan">Bilibili (哔哩哔哩 B站)</span>
          <span className="badge badge-red">Xiaohongshu (小红书 XHS)</span>
          <span className="badge badge-green">TikTok No-WM</span>
          <span className="badge badge-amber">Kuaishou (快手)</span>
        </div>
      </div>


      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: '#F87171',
          fontSize: '14px'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Studio Workflow Area */}
      {videoData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Video Preview & Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Video Player Card with Interactive On-Video Subtitle & Mask Editor */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Video size={18} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Xem Trước & Căn Chỉnh Trực Tiếp Trên Video</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-green">Không Logo HD</span>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                    {maskOldSubtitles && showLiveMaskPreview ? '🛡️ Live Mask ON' : 'Live Preview'}
                  </span>
                </div>
              </div>

              {/* Video Player Canvas Container */}
              <div
                ref={videoContainerRef}
                onMouseMove={handleMouseMoveContainer}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#000',
                  minHeight: '260px',
                  maxHeight: '440px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: isDraggingMask ? 'none' : 'auto',
                  border: isDraggingMask ? '2px solid #00F2FE' : '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {videoData.videoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      key={(videoData.videoUrl || '') + (useProxyStream ? '_proxy' : '')}
                      src={
                        useProxyStream
                          ? `/api/proxy-media?url=${encodeURIComponent(videoData.videoUrl)}`
                          : videoData.videoUrl
                      }
                      controls
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onTimeUpdate={(e) => setCurrentVideoTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                      onError={() => {
                        if (!useProxyStream && videoData?.videoUrl?.startsWith('http')) {
                          console.warn('Direct CDN playback blocked, switching to backend stream proxy...');
                          setUseProxyStream(true);
                        }
                      }}
                      style={{ width: '100%', maxHeight: '440px', objectFit: 'contain' }}
                      poster={videoData.coverUrl}
                    />

                    {/* 1. Interactive Chinese Subtitle Mask Box (Live Drag & Resize Overlay) */}
                    {maskOldSubtitles && showLiveMaskPreview && (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${maskYPercent}%`,
                          height: `${maskHeightPercent}%`,
                          left: 0,
                          right: 0,
                          background: 'rgba(5, 7, 13, 0.88)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          borderTop: '2px dashed #00F2FE',
                          borderBottom: '2px dashed #00F2FE',
                          boxShadow: '0 0 20px rgba(0, 242, 254, 0.35)',
                          zIndex: 5,
                          cursor: isDraggingMask === 'move' ? 'grabbing' : 'grab',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px 10px',
                          transition: isDraggingMask ? 'none' : 'top 0.1s ease, height 0.1s ease'
                        }}
                        onMouseDown={(e) => handleMouseDownMask(e, 'move')}
                        title="Kéo chuột lên / xuống để căn chỉnh vị trí che phụ đề Trung"
                      >
                        {/* Top Resize Handle */}
                        <div
                          style={{
                            position: 'absolute',
                            top: -7,
                            left: 0,
                            right: 0,
                            height: 14,
                            cursor: 'ns-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                          }}
                          onMouseDown={(e) => handleMouseDownMask(e, 'resize-top')}
                          title="Kéo để chỉnh mép trên của thanh che"
                        >
                          <div style={{ width: 44, height: 4, background: '#00F2FE', borderRadius: 2, boxShadow: '0 0 8px #00F2FE' }} />
                        </div>

                        {/* Bottom Resize Handle */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: -7,
                            left: 0,
                            right: 0,
                            height: 14,
                            cursor: 'ns-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                          }}
                          onMouseDown={(e) => handleMouseDownMask(e, 'resize-bottom')}
                          title="Kéo để chỉnh mép dưới của thanh che"
                        >
                          <div style={{ width: 44, height: 4, background: '#00F2FE', borderRadius: 2, boxShadow: '0 0 8px #00F2FE' }} />
                        </div>

                        {/* Live Vietnamese Subtitle Text rendered inside mask */}
                        {burnSubtitles && showLiveSubtitlePreview && (
                          <div style={{
                            color: subtitleColor === '&H00FFFFFF' ? '#FFFFFF' : (subtitleColor === '&H00FFFF00' ? '#00F2FE' : '#FFE500'),
                            fontWeight: 800,
                            fontSize: '15px',
                            lineHeight: 1.25,
                            textAlign: 'center',
                            textShadow: '0 2px 4px #000, 0 0 8px rgba(0,0,0,0.85)',
                            WebkitTextStroke: '1px #000000',
                            padding: '0 10px',
                            pointerEvents: 'none',
                            maxWidth: '92%'
                          }}>
                            {(() => {
                              const active = scriptData?.segments?.find((s: any) => s.startTimeSec <= currentVideoTime && currentVideoTime <= s.endTimeSec);
                              if (active) return active.vietnameseText || active.text;
                              if (scriptData?.segments && scriptData.segments.length > 0) {
                                return scriptData.segments[0].vietnameseText || scriptData.segments[0].text;
                              }
                              return '✨ Xem trước dòng phụ đề tiếng Việt';
                            })()}
                          </div>
                        )}

                        {/* Badge indicator on mask */}
                        <div style={{
                          position: 'absolute',
                          right: 8,
                          bottom: 3,
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#00F2FE',
                          background: 'rgba(0,0,0,0.75)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          pointerEvents: 'none'
                        }}>
                          ↕️ Y: {maskYPercent}% · Cao: {maskHeightPercent}% (Kéo chuột trực tiếp)
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '30px',
                    color: '#CBD5E1',
                    textAlign: 'center'
                  }}>
                    <RefreshCw size={32} className="spin" color="var(--accent-cyan)" />
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Đang lấy luồng video HD từ máy chủ...</div>
                  </div>
                )}

                {loadingExtract && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.75)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: '#fff',
                    zIndex: 20
                  }}>
                    <RefreshCw size={28} className="spin" color="var(--accent-cyan)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Đang bóc tách luồng video HD...</span>
                  </div>
                )}
              </div>

              {/* Direct Interactive Control Toolbar under Video */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                marginTop: '10px',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    📐 Căn Chỉnh Vị Trí Che:
                  </span>
                  <button
                    type="button"
                    onClick={() => { setMaskYPercent(prev => Math.max(0, prev - 1)); setMaskPreset('custom'); }}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    title="Nâng thanh che lên 1%"
                  >
                    <ChevronUp size={13} /> Lên 1%
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMaskYPercent(prev => Math.min(100 - maskHeightPercent, prev + 1)); setMaskPreset('custom'); }}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    title="Hạ thanh che xuống 1%"
                  >
                    <ChevronDown size={13} /> Xuống 1%
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMaskHeightPercent(prev => Math.min(50, prev + 1)); setMaskPreset('custom'); }}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    title="Tăng chiều cao thanh che"
                  >
                    <Plus size={13} /> Cao +1%
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMaskHeightPercent(prev => Math.max(4, prev - 1)); setMaskPreset('custom'); }}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    title="Giảm chiều cao thanh che"
                  >
                    <Minus size={13} /> Thấp -1%
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowLiveMaskPreview(!showLiveMaskPreview)}
                    className={`btn ${showLiveMaskPreview ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700 }}
                    title="Bật/Tắt xem trước thanh che sub trên video"
                  >
                    {showLiveMaskPreview ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{showLiveMaskPreview ? 'Ẩn Lớp Che' : 'Xem Lớp Che'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLiveSubtitlePreview(!showLiveSubtitlePreview)}
                    className={`btn ${showLiveSubtitlePreview ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700 }}
                    title="Bật/Tắt xem trước dòng phụ đề tiếng Việt"
                  >
                    <span>{showLiveSubtitlePreview ? '📝 Sub BẬT' : '📝 Sub TẮT'}</span>
                  </button>
                </div>
              </div>



              <div style={{ marginTop: '14px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', lineHeight: '1.4' }}>
                  {videoData.title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Tác giả: @{videoData.author}</span>
                  {videoData.likes > 0 && <span>❤️ {videoData.likes.toLocaleString()}</span>}
                  {videoData.shares > 0 && <span>🔁 {videoData.shares.toLocaleString()}</span>}
                  {videoData.duration > 0 && <span>⏱️ {videoData.duration}s</span>}
                </div>

                {/* Multi-Resolution & 4K Quality Selector Card */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(26, 32, 44, 0.9) 100%)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  marginTop: '14px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                        💎 Chọn Độ Phân Giải Xem & Dựng:
                      </span>
                      {videoData.qualities && videoData.qualities.length > 0 ? (
                        <select
                          value={videoData.videoUrl}
                          onChange={(e) => {
                            const selectedUrl = e.target.value;
                            setVideoData({ ...videoData, videoUrl: selectedUrl });
                          }}
                          className="select-field"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            background: '#090D16',
                            color: '#00F2FE',
                            border: '1px solid #00F2FE',
                            cursor: 'pointer'
                          }}
                        >
                          {videoData.qualities.map((q: any, idx: number) => (
                            <option key={idx} value={q.url}>
                              {q.label} {q.resolution ? `(${q.resolution})` : ''} {q.fps > 30 ? `· ${q.fps}fps` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="badge badge-cyan" style={{ fontSize: '11px' }}>🌟 1080p (Full HD Gốc)</span>
                      )}
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Tự động chọn chất lượng cao nhất
                    </span>
                  </div>

                  {/* Direct Download Multi-Quality Quick Buttons Grid */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      📥 Tùy chọn tải trực tiếp theo từng mức chất lượng:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {videoData.qualities && videoData.qualities.length > 0 ? (
                        videoData.qualities.map((q: any, idx: number) => (
                          <a
                            key={idx}
                            href={`/api/proxy-media?url=${encodeURIComponent(q.url)}&download=1&filename=${encodeURIComponent((videoData.title || 'video').slice(0, 30) + `_${q.label.replace(/[^\w]/g, '_')}.mp4`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`btn ${idx === 0 ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title={`Tải độ phân giải ${q.label}`}
                          >
                            <span>📥 Tải {q.label}</span>
                            {q.resolution && <span style={{ opacity: 0.75, fontSize: '10px' }}>({q.resolution})</span>}
                          </a>
                        ))
                      ) : (
                        <a
                          href={`/api/proxy-media?url=${encodeURIComponent(videoData.videoUrl)}&download=1&filename=${encodeURIComponent((videoData.title || 'video').slice(0, 40) + '.mp4')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}
                        >
                          📥 Tải Video Không Logo HD
                        </a>
                      )}

                      {/* Download MP3 Audio */}
                      {videoData.musicUrl && (
                        <a
                          href={`/api/proxy-media?url=${encodeURIComponent(videoData.musicUrl)}&download=1&filename=${encodeURIComponent((videoData.title || 'audio').slice(0, 30) + '_audio.mp3')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                          title="Tải riêng file âm thanh gốc MP3"
                        >
                          🎵 Tải Audio MP3
                        </a>
                      )}

                      {/* Download Cover Photo */}
                      {videoData.coverUrl && (
                        <a
                          href={`/api/proxy-media?url=${encodeURIComponent(videoData.coverUrl)}&download=1&filename=${encodeURIComponent((videoData.title || 'cover').slice(0, 30) + '_cover.jpg')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                          title="Tải ảnh bìa cover HD"
                        >
                          🖼️ Tải Ảnh Bìa HD
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout & Vertical Reformat Card (KrillinAI) */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Bố Cục & Dựng Video Dọc (9:16)</span>
                </div>
                <span className="badge badge-red">KRILLIN-AI</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setAspectRatio('original')}
                  className={`btn ${aspectRatio === 'original' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 700 }}
                >
                  🖥️ Giữ Khung Hình Gốc
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`btn ${aspectRatio === '9:16' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 700 }}
                >
                  📱 Dựng Dọc 9:16 (TikTok / Reels)
                </button>
              </div>

              {aspectRatio === '9:16' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 242, 254, 0.05)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--accent-cyan)' }}>
                      Tiêu Đề Hook Đỉnh Video (Major Title):
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="VD: BÍ MẬT KINH HOÀNG KHÔNG THỂ BỎ LỠ"
                      value={majorTitle}
                      onChange={(e) => setMajorTitle(e.target.value)}
                      style={{ fontSize: '13px', padding: '8px 10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-muted)' }}>
                      Tiêu Đề Phụ (Minor Title - Tùy chọn):
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="VD: Tập 1 · AI Reup Master"
                      value={minorTitle}
                      onChange={(e) => setMinorTitle(e.target.value)}
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                    />
                  </div>
                </div>
              )}

              {/* Cover Generator Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={generateCover}
                  onChange={(e) => setGenerateCover(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                />
                <span><strong>🎨 Tự động tạo ảnh bìa Thumbnail (AI Cover Generator)</strong></span>
              </label>

              {/* Remotion Engine & Motion FX */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  🎬 Hiệu Ứng Remotion & Motion FX (TikTok / Reels):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enableProgressBar}
                      onChange={(e) => setEnableProgressBar(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: 'var(--accent-cyan)' }}
                    />
                    <span>Thanh Tiến Trình (Glow Bar)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enableKineticSubtitles}
                      onChange={(e) => setEnableKineticSubtitles(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: 'var(--accent-red)' }}
                    />
                    <span>Chữ Kinetic Phát Sáng</span>
                  </label>
                </div>
              </div>
            </div>

            {/* CapCut PC Pro Export Settings Card */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(155, 81, 224, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>✂️</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#FFF' }}>Cấu Hình Xuất CapCut PC Pro</span>
                </div>
                <span className="badge" style={{ background: 'linear-gradient(135deg, #9B51E0, #FE2C55)', color: '#FFF', fontSize: '9px', fontWeight: 800 }}>
                  NATIVE DRAFT
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Chuyển Cảnh (Transitions):
                  </label>
                  <select
                    className="input-field"
                    value={capcutTransition}
                    onChange={(e) => setCapcutTransition(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                  >
                    <option value="zoom_in">🔍 Phóng To Nhanh (Zoom In)</option>
                    <option value="slide_left">➡️ Trượt Trái (Slide Left)</option>
                    <option value="flash_white">⚡ Chớp Trắng (Flash White)</option>
                    <option value="fade_black">🌑 Mờ Đen (Fade Black)</option>
                    <option value="glitch">📺 Nhiễu Sóng (Glitch)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Hiệu Ứng Chữ (Text FX):
                  </label>
                  <select
                    className="input-field"
                    value={capcutTextAnim}
                    onChange={(e) => setCapcutTextAnim(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                  >
                    <option value="kinetic_pop">💥 Chữ Nảy Pop-In</option>
                    <option value="neon_glow">🌟 Viền Sáng Neon Cyan</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!videoData?.videoUrl) {
                    alert('Chưa có video để xuất');
                    return;
                  }
                  setExportingCapcut(true);
                  setCapcutExportSuccess('');
                  try {
                    const res = await fetch('/api/export-capcut-draft', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        videoUrl: videoData.videoUrl,
                        title: majorTitle || videoData.title || 'DUZK_CapCut_Project',
                        subtitles: scriptData?.segments || [],
                        voiceId: selectedVoice,
                        enableDubbingVoice: true,
                        transitionType: capcutTransition,
                        textAnimation: capcutTextAnim,
                        sfxList: [
                          { name: 'whoosh', timeSec: 0, durationSec: 1.0 },
                          { name: 'pop', timeSec: 5.0, durationSec: 0.8 },
                          { name: 'ding', timeSec: 12.0, durationSec: 1.0 }
                        ]
                      })
                    });
                    const json = await res.json();
                    if (json.ok) {
                      setCapcutExportSuccess(`🎉 Đã xuất thành công dự án vào CapCut PC (${json.data.projectName})!`);
                    } else {
                      alert(`Lỗi xuất CapCut: ${json.error}`);
                    }
                  } catch (err: any) {
                    alert(`Lỗi: ${err.message}`);
                  } finally {
                    setExportingCapcut(false);
                  }
                }}
                disabled={exportingCapcut || !videoData}
                className="btn btn-secondary"
                style={{
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: 'rgba(155, 81, 224, 0.15)',
                  border: '1px solid rgba(155, 81, 224, 0.4)',
                  color: '#D8B4FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {exportingCapcut ? <RefreshCw className="spin" size={14} /> : <span>✂️ Xuất Thẳng Sang CapCut PC Draft</span>}
              </button>

              {capcutExportSuccess && (
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, textAlign: 'center' }}>
                  {capcutExportSuccess}
                </div>
              )}
            </div>

            {/* Voice & Sound Mixer Controls */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={18} color="var(--accent-red)" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Tùy Chọn Giọng Đọc & Âm Thanh</span>
              </div>

              {/* Voice Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Chọn Giọng Đọc AI Tiếng Việt:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedVoice('vi-VN-HoaiMyNeural')}
                    className={`btn ${selectedVoice === 'vi-VN-HoaiMyNeural' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '12px', justifyContent: 'flex-start' }}
                  >
                    <Volume2 size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Hoài My</div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>Nữ Bắc · Truyền cảm</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedVoice('vi-VN-NamMinhNeural')}
                    className={`btn ${selectedVoice === 'vi-VN-NamMinhNeural' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '12px', justifyContent: 'flex-start' }}
                  >
                    <Volume2 size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Nam Minh</div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>Nam Bắc · Dứt khoát</div>
                    </div>
                  </button>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={handlePreviewVoice}
                    disabled={previewingVoice}
                    className="btn btn-outline"
                    style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                  >
                    <Play size={14} />
                    <span>{previewingVoice ? 'Đang phát...' : 'Nghe Thử Giọng Đã Chọn'}</span>
                  </button>
                </div>
              </div>

              {/* Volume Sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    <span>Âm Lượng Gốc:</span>
                    <span style={{ color: 'var(--accent-red)' }}>{Math.round(parseFloat(originalVolume) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={originalVolume}
                    onChange={(e) => setOriginalVolume(e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent-red)' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Khuyên dùng: 10% - 20% giữ nhạc nền</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    <span>Âm Lượng Giọng AI:</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{Math.round(parseFloat(dubbingVolume) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={dubbingVolume}
                    onChange={(e) => setDubbingVolume(e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Khuyên dùng: 130% để nổi bật lời thoại</span>
                </div>
              </div>
            </div>

            {/* Subtitle & Chinese Masking Card */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🛡️</span>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Che Phụ Đề Gốc & Phụ Đề Song Ngữ</span>
                </div>
                <span className="badge badge-cyan">AI AUTO</span>
              </div>

              {/* Subtitle Language Mode (KrillinAI) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Ngôn Ngữ Phụ Đề Hiển Thị:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => setSubtitleMode('target-only')}
                    className={`btn ${subtitleMode === 'target-only' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700 }}
                  >
                    📝 Chỉ Tiếng Việt (Target Only)
                  </button>
                  <button
                    onClick={() => setSubtitleMode('bilingual')}
                    className={`btn ${subtitleMode === 'bilingual' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700 }}
                  >
                    🌐 Song Ngữ Trung - Việt (Bilingual)
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={maskOldSubtitles}
                    onChange={(e) => setMaskOldSubtitles(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-red)' }}
                  />
                  <span><strong>🛡️ Che phụ đề tiếng Trung cũ:</strong> Thanh mờ 80% che kín đáy</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={burnSubtitles}
                    onChange={(e) => setBurnSubtitles(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                  />
                  <span><strong>📝 Chèn phụ đề mới:</strong> Tự động đồng bộ</span>
                </label>
              </div>

              {/* Custom Mask Positioning Controls */}
              {maskOldSubtitles && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      📐 Vị Trí & Chiều Cao Thanh Che Sub Trung:
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
                      Y: {maskYPercent}% · Cao: {maskHeightPercent}%
                    </span>
                  </div>

                  {/* Presets */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { setMaskPreset('16:9'); setMaskYPercent(85); setMaskHeightPercent(14); }}
                      className={`btn ${maskPreset === '16:9' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 6px', fontSize: '10px', fontWeight: 700 }}
                    >
                      🎬 Phim/16:9 (Đáy 85%)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMaskPreset('9:16'); setMaskYPercent(74); setMaskHeightPercent(12); }}
                      className={`btn ${maskPreset === '9:16' ? 'btn-cyan' : 'btn-secondary'}`}
                      style={{ padding: '6px 6px', fontSize: '10px', fontWeight: 700 }}
                    >
                      📱 Dọc/9:16 (74%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaskPreset('custom')}
                      className={`btn ${maskPreset === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 6px', fontSize: '10px', fontWeight: 700 }}
                    >
                      ⚙️ Tùy Chỉnh
                    </button>
                  </div>

                  {/* Sliders */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        <span>Tọa độ Y (Vị trí từ trên xuống):</span>
                        <strong style={{ color: 'var(--accent-cyan)' }}>{maskYPercent}%</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="1"
                        value={maskYPercent}
                        onChange={(e) => { setMaskYPercent(parseInt(e.target.value)); setMaskPreset('custom'); }}
                        style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        <span>Chiều cao thanh che (Độ dày):</span>
                        <strong style={{ color: 'var(--accent-red)' }}>{maskHeightPercent}%</strong>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        step="1"
                        value={maskHeightPercent}
                        onChange={(e) => { setMaskHeightPercent(parseInt(e.target.value)); setMaskPreset('custom'); }}
                        style={{ width: '100%', accentColor: 'var(--accent-red)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Subtitle Color Selector */}
              {burnSubtitles && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Màu chữ phụ đề tiếng Việt:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {[
                      { id: '&H0000FFFF', label: '🟡 Vàng Nghệ', border: '#FBBF24' },
                      { id: '&H00FFFFFF', label: '⚪ Trắng Viền Đen', border: '#FFFFFF' },
                      { id: '&H00FFFF00', label: '🔵 Xanh Neon', border: '#00F2FE' }
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSubtitleColor(c.id)}
                        className="btn"
                        style={{
                          padding: '6px 8px',
                          fontSize: '11px',
                          background: subtitleColor === c.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                          border: subtitleColor === c.id ? `2px solid ${c.border}` : '1px solid var(--border-color)',
                          color: '#fff'
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: AI Script Generator & Execution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Step 2: Bóc Tách Lời Thoại & Phụ Đề Chuẩn */}
            <div className="card card-cyan" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Volume2 size={20} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>Bước 2: Bóc Tách Phụ Đề & Dịch Lời Thoại Tiếng Việt</span>
                </div>
                <span className="badge badge-cyan">CAPCUT ASR AI</span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                Hệ thống AI tự động nghe toàn bộ âm thanh gốc của video, bóc tách chính xác từng câu thoại (1.5s - 3.5s) và dịch chuẩn xác 100% ngữ cảnh tiếng Việt để hiển thị & lồng tiếng vừa khít video.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Main Action Button */}
                <button
                  className="btn btn-primary"
                  onClick={() => handleOcrSubtitles('auto')}
                  disabled={loadingAi || loadingOcr}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
                    color: '#090C10',
                    fontWeight: 900,
                    fontSize: '15px',
                    boxShadow: '0 4px 20px rgba(0, 242, 254, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {loadingOcr ? (
                    <>
                      <RefreshCw size={20} className="spin" />
                      <span>Đang Lắng Nghe & Dịch Lời Thoại Từng Phân Đoạn...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={20} />
                      <span>🎙️ Lấy Phụ Đề & Dịch Tiếng Việt (Chuẩn CapCut ASR AI)</span>
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOcrSubtitles('ocr')}
                    disabled={loadingAi || loadingOcr}
                    style={{ fontSize: '11px', padding: '6px 12px', color: 'var(--text-muted)' }}
                    title="Dùng cho video không có tiếng nói, chỉ có chữ phụ đề chạy trên màn hình"
                  >
                    <span>🖼️ Quét Thị Giác (Vision OCR) nếu không có tiếng</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={handleGenerateScript}
                    disabled={loadingAi || loadingOcr}
                    style={{ fontSize: '11px', padding: '6px 12px', color: 'var(--text-muted)' }}
                    title="Viết lại kịch bản sáng tạo từ tiêu đề (Tùy chọn)"
                  >
                    <span>✨ Soạn Kịch Bản Từ Tiêu Đề (Tùy chọn)</span>
                  </button>
                </div>
              </div>


              {ocrRawText && (
                <div style={{
                  background: 'rgba(0, 242, 254, 0.08)',
                  border: '1px solid rgba(0, 242, 254, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowRawOcr(!showRawOcr)}>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      ✓ Đã bóc tách lời thoại gốc ({ocrRawText.length} ký tự · {scriptData?.source === 'capcut-asr' ? 'CapCut ASR Engine' : 'Vision OCR'})
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{showRawOcr ? 'Ẩn ▲' : 'Xem ▼'}</span>
                  </div>
                  {showRawOcr && (
                    <div style={{ marginTop: '8px', color: 'var(--text-secondary)', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {ocrRawText}
                    </div>
                  )}
                </div>
              )}

              {/* CapCut Subtitle Segments Timeline Editor */}
              {scriptData?.segments && scriptData.segments.length > 0 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      🎬 Timeline Phụ Đề Từng Câu ({scriptData.segments.length} phân đoạn)
                    </span>
                    <span className="badge badge-green" style={{ fontSize: '10px' }}>
                      {scriptData.source === 'capcut-asr' ? '🎙️ CapCut ASR' : '🔍 Vision OCR'}
                    </span>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {scriptData.segments.map((seg: any, idx: number) => {
                      const isActive = seg.startTimeSec <= currentVideoTime && currentVideoTime <= seg.endTimeSec;
                      return (
                        <div
                          key={seg.id || idx}
                          style={{
                            background: isActive ? 'rgba(0, 242, 254, 0.16)' : 'rgba(0,0,0,0.35)',
                            border: isActive ? '1.5px solid #00F2FE' : '1px solid rgba(255,255,255,0.06)',
                            boxShadow: isActive ? '0 0 14px rgba(0, 242, 254, 0.35)' : 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = seg.startTimeSec;
                                    videoRef.current.play();
                                  }
                                }}
                                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2px 8px', fontSize: '10px', height: '22px', gap: '4px' }}
                                title="Nhảy video đến đúng câu này để kiểm tra phụ đề"
                              >
                                <Play size={10} />
                                <span>{isActive ? 'Đang phát...' : 'Phát câu này'}</span>
                              </button>
                              <span style={{ color: isActive ? '#00F2FE' : 'var(--accent-cyan)', fontWeight: 700 }}>
                                ⏱️ {seg.startTimeSec?.toFixed(1)}s ➔ {seg.endTimeSec?.toFixed(1)}s ({seg.estimatedDurationSec || 3}s)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: isActive ? '#00F2FE' : 'inherit' }}>#{seg.id || idx + 1}</span>
                          </div>

                          {seg.originalText && (
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                              {seg.originalText}
                            </div>
                          )}

                          <input
                            type="text"
                            className="input-field"
                            value={seg.vietnameseText || seg.text || ''}
                            onChange={(e) => {
                              const newSegments = [...scriptData.segments];
                              newSegments[idx] = { ...newSegments[idx], vietnameseText: e.target.value, text: e.target.value };
                              const newFull = newSegments.map((s: any) => s.vietnameseText || s.text).join('. ');
                              setScriptData({ ...scriptData, segments: newSegments, fullScript: newFull });
                              setEditedScript(newFull);
                            }}
                            placeholder="Nhập lời dịch tiếng Việt..."
                            style={{
                              padding: '6px 8px',
                              fontSize: '12px',
                              background: 'rgba(255,255,255,0.06)',
                              borderColor: isActive ? '#00F2FE' : undefined
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Action Bar under Timeline */}
                  <div style={{
                    marginTop: '4px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ⚡ <strong>Thao tác nhanh với {scriptData.segments.length} câu phụ đề đã dịch:</strong>
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStartDubbing()}
                        disabled={loadingRender || !editedScript.trim()}
                        style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, background: 'linear-gradient(135deg, #FE2C55, #00F2FE)', color: '#fff' }}
                      >
                        {loadingRender ? 'Đang Xử Lý...' : '🚀 Lồng Tiếng + Chèn Sub'}
                      </button>
                      <button
                        className="btn btn-cyan"
                        onClick={() => handleStartDubbing({ onlySubtitles: true })}
                        disabled={loadingRender || !editedScript.trim()}
                        style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#090C10' }}
                      >
                        {loadingRender ? 'Đang Xử Lý...' : '📝 Chỉ Chèn Sub & Che Sub Cũ'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Full Script Textarea */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Kịch Bản Lời Thoại Tiếng Việt Hoàn Chỉnh:
                  </label>
                  {editedScript && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
                      ✓ Sẵn sàng ({scriptData?.segments?.length || 1} câu)
                    </span>
                  )}
                </div>
                <textarea
                  className="input-field"
                  rows={5}
                  placeholder="Kịch bản tiếng Việt sẽ xuất hiện ở đây sau khi bạn nhấn nút Lấy Phụ Đề CapCut..."
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  style={{ resize: 'vertical', fontSize: '13px', lineHeight: '1.6' }}
                />
              </div>

              {/* Suggested Hashtags */}
              {scriptData?.suggestedTags && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {scriptData.suggestedTags.map((tag: string, i: number) => (
                    <span key={i} className="badge badge-cyan" style={{ fontSize: '11px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Master Action Buttons Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="var(--accent-red)" />
                  <span>Bước 3: Chọn Chế Độ Xuất Video Hoàn Chỉnh</span>
                </div>

                {/* Primary Master Combo Button */}
                <button
                  className="btn btn-primary"
                  onClick={() => handleStartDubbing()}
                  disabled={loadingRender || !editedScript.trim()}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #FE2C55 0%, #00F2FE 100%)',
                    boxShadow: '0 4px 20px rgba(254, 44, 85, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {loadingRender ? (
                    <>
                      <RefreshCw size={20} className="spin" />
                      <span>Đang Xử Lý & Render Video (KrillinAI Master)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>🚀 Lồng Tiếng AI + Chèn Sub Việt + Che Sub Trung (Full Combo)</span>
                    </>
                  )}
                </button>

                {/* Secondary Distinct Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleStartDubbing({ onlySubtitles: true })}
                    disabled={loadingRender || !editedScript.trim()}
                    style={{
                      padding: '11px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid rgba(0, 242, 254, 0.4)',
                      background: 'rgba(0, 242, 254, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>📝 Chỉ Chèn Sub Việt & Che Sub Trung (Giữ Giọng Gốc)</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => handleStartDubbing({ onlyDubbing: true })}
                    disabled={loadingRender || !editedScript.trim()}
                    style={{
                      padding: '11px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid rgba(254, 44, 85, 0.4)',
                      background: 'rgba(254, 44, 85, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🎙️ Chỉ Lồng Tiếng AI (Giữ Khung Hình Gốc)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Render Success Result Card */}
            {renderResult && (
              <div className="card" style={{
                padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(24, 31, 46, 1) 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <CheckCircle2 size={22} color="#10B981" />
                  <span style={{ fontWeight: 800, fontSize: '16px', color: '#34D399' }}>
                    Video Thành Phẩm Đã Sẵn Sàng!
                  </span>
                </div>

                <div style={{ marginBottom: '16px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <video
                    src={renderResult.videoUrl}
                    controls
                    autoPlay
                    style={{ width: '100%', maxHeight: '320px', background: '#000', objectFit: 'contain' }}
                  />
                </div>

                {/* Action Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <a
                    href={renderResult.videoUrl}
                    download="taivideonhanh_krillin.mp4"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', justifyContent: 'center' }}
                  >
                    <Download size={16} />
                    <span>Tải Video MP4</span>
                  </a>

                  {renderResult.srtUrl && (
                    <a
                      href={renderResult.srtUrl}
                      download="subtitles.srt"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', justifyContent: 'center' }}
                    >
                      <FileText size={16} />
                      <span>Tải Phụ Đề (.SRT)</span>
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {renderResult.coverUrl && (
                    <a
                      href={renderResult.coverUrl}
                      download="thumbnail_cover.jpg"
                      className="btn btn-outline"
                      style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '12px' }}
                    >
                      <ImageIcon size={14} />
                      <span>Tải Ảnh Bìa (Cover)</span>
                    </a>
                  )}

                  {renderResult.manifest && (
                    <button
                      onClick={() => setShowManifest(!showManifest)}
                      className="btn btn-outline"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                    >
                      <span>{showManifest ? 'Ẩn Manifest' : 'Xem Agent Manifest'}</span>
                    </button>
                  )}
                </div>

                {/* Manifest JSON Viewer */}
                {showManifest && renderResult.manifest && (
                  <div style={{ marginTop: '12px', background: '#090C10', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>krillinai_manifest.json</span>
                      <button onClick={copyManifest} className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '11px' }}>
                        {copiedManifest ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedManifest ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <pre style={{ margin: 0, fontSize: '11px', color: '#A7F3D0', overflowX: 'auto', maxHeight: '140px' }}>
                      {JSON.stringify(renderResult.manifest, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};
