let isRecording = false;

// Check state on load
chrome.storage.local.get(['isRecording'], (result) => {
    isRecording = result.isRecording || false;
});

// Update state when message received
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SET_RECORDING_STATE") {
        isRecording = request.isRecording;
    }
});

function getXPath(element) {
    if (element.id !== '')
        return 'id("' + element.id + '")';
    if (element === document.body)
        return element.tagName;

    var ix = 0;
    var siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element)
            return getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
            ix++;
    }
}

function processEvent(e, eventType) {
    if (!isRecording) return;

    let value = null;
    if (eventType === 'input') {
        value = e.target.value;
        // PII Scrubbing
        if (e.target.type === 'password' || e.target.id.toLowerCase().includes('password')) {
            value = '***SCRUBBED***';
        }
    }

    const eventPayload = {
        event_type: eventType,
        url: window.location.href,
        xpath_selector: getXPath(e.target),
        value: value,
        client_x: e.clientX,
        client_y: e.clientY,
        timestamp: new Date().toISOString()
    };

    chrome.runtime.sendMessage({ action: "RECORD_EVENT", payload: eventPayload });
}

// Attach listeners
document.addEventListener('click', (e) => processEvent(e, 'click'), true);
document.addEventListener('blur', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        processEvent(e, 'input');
    }
}, true);
