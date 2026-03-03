function getSemanticContext(element: HTMLElement): string {
    // Try to find the nearest text, label, or header
    if (element.innerText) return element.innerText.substring(0, 100);
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label') || '';
    if (element.getAttribute('placeholder')) return element.getAttribute('placeholder') || '';

    // Walk up tree to find nearest header
    let current: HTMLElement | null = element;
    while (current && current.tagName !== 'BODY') {
        const h = current.querySelector('h1, h2, h3, h4, h5, h6');
        if (h && (h as HTMLElement).innerText) {
            return (h as HTMLElement).innerText.substring(0, 100);
        }
        current = current.parentElement;
    }
    return 'Unknown Context';
}

function sendEvent(actionType: string, event: Event) {
    const target = event.target as HTMLElement;
    const semanticContext = getSemanticContext(target);

    // Extract relevant text payload if it's a copy/paste or input
    let contextData = '';
    if (actionType === 'copy' || actionType === 'paste') {
        contextData = (window.getSelection()?.toString() || '').substring(0, 500);
    } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        contextData = target.value.substring(0, 500);
    }

    const payload = {
        url: window.location.href,
        action_type: actionType,
        target_element: semanticContext,
        context_data: contextData,
        timestamp: new Date().toISOString()
    };

    chrome.runtime.sendMessage({ type: 'TELEMETRY_EVENT', payload });
}

// Attach listeners
document.addEventListener('click', (e) => sendEvent('click', e), true);
document.addEventListener('copy', (e) => sendEvent('copy', e), true);
document.addEventListener('paste', (e) => sendEvent('paste', e), true);
document.addEventListener('submit', (e) => sendEvent('submit', e), true);

console.log('Tessera Process Discovery script injected.');
