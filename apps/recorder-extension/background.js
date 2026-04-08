let currentSessionEvents = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        currentSessionEvents = [];
        chrome.storage.local.set({ isRecording: true });
        
        // Broadcast to all tabs to activate content script
        chrome.tabs.query({}, function(tabs) {
            for (let tab of tabs) {
                chrome.tabs.sendMessage(tab.id, { action: "SET_RECORDING_STATE", isRecording: true }).catch(() => {});
            }
        });
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "STOP_RECORDING") {
        chrome.storage.local.set({ isRecording: false });
        // Broadcast to stop
        chrome.tabs.query({}, function(tabs) {
            for (let tab of tabs) {
                chrome.tabs.sendMessage(tab.id, { action: "SET_RECORDING_STATE", isRecording: false }).catch(() => {});
            }
        });

        // Send payload to backend
        sendPayloadToBackend().then(() => {
            currentSessionEvents = [];
            sendResponse({ success: true });
        }).catch(e => {
            console.error(e);
            sendResponse({ success: false });
        });
        return true; // async
    }

    if (request.action === "RECORD_EVENT") {
        const payload = request.payload;
        
        // Take a screenshot synchronously
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.log("Error capturing tab:", chrome.runtime.lastError);
                payload.screenshot_b64 = null;
            } else {
                payload.screenshot_b64 = dataUrl;
            }
            
            currentSessionEvents.push(payload);
        });
        
        return true;
    }
});

async function sendPayloadToBackend() {
    if (currentSessionEvents.length === 0) return;
    
    const url = "http://localhost:8000/api/recordings/upload";
    
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['jwtToken'], async (result) => {
            const token = result.jwtToken;
            if (!token) {
                console.error("No authentication token found! Please provide it in the popup.");
                return reject(new Error("No authentication token found"));
            }

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify({ events: currentSessionEvents })
                });

                if (!response.ok) {
                    return reject(new Error("Failed to upload recording events"));
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}
