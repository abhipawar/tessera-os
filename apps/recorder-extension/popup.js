document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusDiv = document.getElementById('status');
    const jwtInput = document.getElementById('jwtToken');
    const apiUrlInput = document.getElementById('apiUrl');

    // Check current state
    chrome.storage.local.get(['isRecording', 'jwtToken', 'apiUrl'], (result) => {
      if (result.jwtToken) {
          jwtInput.value = result.jwtToken;
      }
      if (result.apiUrl) {
          apiUrlInput.value = result.apiUrl;
      }
      if (result.isRecording) {
        setRecordingUI();
      }
    });
  
    function setRecordingUI() {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      statusDiv.innerHTML = '<span class="recording-pulse"></span> Recording active...';
    }
  
    function setIdleUI() {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      statusDiv.textContent = 'Status: Processing payload...';
    }
  
    startBtn.addEventListener('click', () => {
      const token = jwtInput.value.trim();
      const apiUrl = apiUrlInput.value.trim() || 'http://localhost:8000';
      
      if (!token) {
          statusDiv.textContent = 'Error: Please provide a JWT token';
          return;
      }
      
      chrome.storage.local.set({ isRecording: true, recordingEvents: [], startTime: new Date().toISOString(), jwtToken: token, apiUrl: apiUrl });
      chrome.runtime.sendMessage({ action: "START_RECORDING" });
      setRecordingUI();
    });
  
    stopBtn.addEventListener('click', () => {
      setIdleUI();
        chrome.runtime.sendMessage({ action: "STOP_RECORDING" }, (response) => {
            if (response && response.success) {
                statusDiv.textContent = 'Status: Sent successfully!';
                setTimeout(() => { statusDiv.textContent = 'Status: Idle'; }, 3000);
            } else {
                statusDiv.textContent = 'Error sending payload.';
            }
        });
      });
      
      jwtInput.addEventListener('input', (e) => {
          chrome.storage.local.set({ jwtToken: e.target.value.trim() });
      });

      apiUrlInput.addEventListener('input', (e) => {
          chrome.storage.local.set({ apiUrl: e.target.value.trim() });
      });
  });
