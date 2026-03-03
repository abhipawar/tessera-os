import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

const Popup = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [jwtToken, setJwtToken] = useState('');
  const [lastSyncStatus, setLastSyncStatus] = useState('Disconnected');

  useEffect(() => {
    // Load state from Chrome Storage
    chrome.storage.local.get(['isRecording', 'jwtToken', 'lastSyncStatus'], (result) => {
      if (result.isRecording !== undefined) setIsRecording(result.isRecording as boolean);
      if (result.jwtToken) setJwtToken(result.jwtToken as string);
      if (result.lastSyncStatus) setLastSyncStatus(result.lastSyncStatus as string);
    });

    // Listen for storage changes (e.g., sync status updates from background runner)
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (typeof changes.lastSyncStatus.newValue === 'string') {
        setLastSyncStatus(changes.lastSyncStatus.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleToggle = () => {
    const newState = !isRecording;
    setIsRecording(newState);
    chrome.storage.local.set({ isRecording: newState });
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setJwtToken(val);
    chrome.storage.local.set({ jwtToken: val });
  };

  return (
    <div className="popup-container">
      <header className="header">
        <h1>Tessera Discovery</h1>
      </header>

      <main className="main-content">
        <div className="toggle-section">
          <label className="switch">
            <input type="checkbox" checked={isRecording} onChange={handleToggle} />
            <span className="slider round"></span>
          </label>
          <span className={`status-text ${isRecording ? 'recording' : 'idle'}`}>
            {isRecording ? 'Recording Active' : 'Observation Paused'}
          </span>
        </div>

        <div className="input-group">
          <label>Authentication Token (JWT)</label>
          <input
            type="password"
            placeholder="Paste your Tessera API Token"
            value={jwtToken}
            onChange={handleTokenChange}
          />
        </div>

        <div className="status-footer">
          <div className="indicator">
            <span className={`dot ${lastSyncStatus.toLowerCase()}`}></span>
            Backend: {lastSyncStatus}
          </div>
        </div>
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<Popup />);
}
