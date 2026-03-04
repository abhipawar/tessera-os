import type { EventPayload } from './types';

let eventBatch: EventPayload[] = [];
const BATCH_INTERVAL_MS = 30000; // 30 seconds
const BACKEND_URL = 'https://api.tesseraos.ai/api/telemetry/ingest';

// Basic PII Scrubbing
function scrubPII(text: string): string {
    if (!text) return text;

    // Mask Emails
    let scrubbed = text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL_HIDDEN]');

    // Mask US Phone Numbers (Basic format: 123-456-7890 or (123) 456-7890)
    scrubbed = scrubbed.replace(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE_HIDDEN]');

    // Mask SSN (Basic format: 123-45-6789)
    scrubbed = scrubbed.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN_HIDDEN]');

    return scrubbed;
}

async function sendBatch() {
    if (eventBatch.length === 0) return;

    const dataToSend = [...eventBatch];
    eventBatch = []; // Reset batch immediately

    try {
        const { isRecording, jwtToken } = await chrome.storage.local.get(['isRecording', 'jwtToken']);

        if (!isRecording) return;
        if (!jwtToken) {
            console.warn("Tessera Discovery: No JWT Token found. Cannot send telemetry.");
            return;
        }

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ events: dataToSend })
        });

        if (!response.ok) {
            console.error("Tessera Discovery: Failed to send telemetry batch.", response.statusText);
            // Put events back in batch to retry next time? Or drop them. We drop for now to save memory.
        } else {
            console.log(`Tessera Discovery: Sent ${dataToSend.length} events successfully.`);
            chrome.storage.local.set({ lastSyncStatus: 'Connected', lastSyncTime: new Date().toISOString() });
        }
    } catch (error) {
        console.error("Tessera Discovery: Error sending telemetry batch", error);
        chrome.storage.local.set({ lastSyncStatus: 'Error' });
    }
}

// Setup periodic flush
setInterval(sendBatch, BATCH_INTERVAL_MS);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TELEMETRY_EVENT') {
        const payload = message.payload as EventPayload;

        // Scrub the PII before saving to batch
        payload.context_data = scrubPII(payload.context_data);
        payload.target_element = scrubPII(payload.target_element);

        eventBatch.push(payload);
    }
});

// Setup Default State
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isRecording: false, lastSyncStatus: 'Disconnected' });
});
