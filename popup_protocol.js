// Simple protocol detection for Flagium popup
// This runs in popup context and asks background to detect protocol

async function detectProtocol() {
  console.log('[Flagium Protocol] Starting detection...');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url || !tab.url.startsWith('http')) {
      console.log('[Flagium Protocol] Not a valid HTTP page');
      return 'N/A';
    }

    console.log('[Flagium Protocol] Detecting for:', tab.url);

    // Ask background service worker to detect protocol
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'DETECT_PROTOCOL',
        tabId: tab.id
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Flagium Protocol] Error:', chrome.runtime.lastError);
          // Default based on URL
          resolve(tab.url.startsWith('https') ? 'HTTP/2' : 'HTTP/1.1');
        } else if (response?.success && response.protocol) {
          console.log('[Flagium Protocol] Detected:', response.protocol);
          resolve(response.protocol);
        } else {
          console.log('[Flagium Protocol] Detection failed, using default');
          // Default based on URL
          resolve(tab.url.startsWith('https') ? 'HTTP/2' : 'HTTP/1.1');
        }
      });
    });
  } catch (error) {
    console.error('[Flagium Protocol] Error:', error);
    return 'HTTP/1.1';
  }
}

// Update protocol display when popup loads
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for main popup to initialize
  setTimeout(async () => {
    const protocol = await detectProtocol();
    const protocolElement = document.getElementById('protocol');

    if (protocolElement && protocol) {
      console.log('[Flagium Protocol] Updating display to:', protocol);
      protocolElement.textContent = protocol;

      // Flash green to show it updated
      protocolElement.style.color = '#00a000';
      setTimeout(() => {
        protocolElement.style.color = '';
      }, 2000);
    }
  }, 500);
});

// Export for manual testing
window.manualProtocolCheck = detectProtocol;