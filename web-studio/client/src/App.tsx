import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DubbingStudio } from './components/DubbingStudio';
import { BatchDownloader } from './components/BatchDownloader';
import { VideoVault } from './components/VideoVault';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [serverOnline, setServerOnline] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/health');
        const json = await res.json();
        setServerOnline(json.status === 'ok');
      } catch (e) {
        setServerOnline(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openSettings={() => setIsSettingsOpen(true)}
        serverOnline={serverOnline}
      />

      <main className="main-content">
        {activeTab === 'studio' && (
          <DubbingStudio
            apiKey={apiKey}
            openSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {activeTab === 'batch' && <BatchDownloader />}

        {activeTab === 'vault' && <VideoVault />}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        serverOnline={serverOnline}
      />
    </div>
  );
}
