// Protocol detection helper for Flagium popup - Firefox MV3 compatible

async function detectProtocol() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url || !tab.url.startsWith('http')) {
      return 'N/A';
    }

    // Try via background service worker
    try {
      const response = await browser.runtime.sendMessage({
        type: 'DETECT_PROTOCOL',
        tabId: tab.id
      });

      if (response && response.success && response.protocol) {
        return response.protocol;
      }
    } catch (bgError) {
      console.error('[Flagium Protocol] Background detection failed:', bgError);
    }

    // Fallback based on URL
    return tab.url.startsWith('https://') ? 'HTTP/2' : 'HTTP/1.1';
  } catch (error) {
    console.error('[Flagium Protocol] Error:', error);
    return 'HTTP/1.1';
  }
}

// Auto-update protocol on load
document.addEventListener('DOMContentLoaded', async () => {
  setTimeout(async () => {
    const protocol = await detectProtocol();
    const protocolElement = document.getElementById('protocol');
    if (protocolElement && protocol) {
      protocolElement.textContent = protocol;
      protocolElement.style.color = '#00a000';
      setTimeout(() => {
        protocolElement.style.color = '';
      }, 2000);
    }
  }, 500);
});
