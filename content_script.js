// Content script to detect HTTP protocol version
(function() {
  // Try to detect protocol using various methods
  function detectProtocol() {
    let protocolVersion = 'Unknown';
    let detectionMethod = 'unknown';

    // Method 1: Check Navigation Timing API (most accurate)
    if (window.performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        const nav = navEntries[0];
        if (nav.nextHopProtocol) {
          console.log('[Flagium] Navigation nextHopProtocol:', nav.nextHopProtocol);

          // Convert protocol format (h3, h2, http/1.1) to display format
          const protocol = nav.nextHopProtocol.toLowerCase();
          if (protocol === 'h3' || protocol === 'h3-29' || protocol === 'h3-q050') {
            protocolVersion = 'HTTP/3';
            detectionMethod = 'navigation';
          } else if (protocol === 'h2') {
            protocolVersion = 'HTTP/2';
            detectionMethod = 'navigation';
          } else if (protocol.includes('http/1.1')) {
            protocolVersion = 'HTTP/1.1';
            detectionMethod = 'navigation';
          } else if (protocol.includes('http/1.0')) {
            protocolVersion = 'HTTP/1.0';
            detectionMethod = 'navigation';
          } else {
            // Use the raw protocol string if we don't recognize it
            protocolVersion = protocol.toUpperCase();
            detectionMethod = 'navigation-raw';
          }
        }
      }
    }

    return {
      version: protocolVersion,
      method: detectionMethod
    };
  }

  // Send protocol info to background script immediately and after a delay
  function sendProtocolInfo() {
    const protocolInfo = detectProtocol();
    console.log('[Flagium] Detected protocol:', protocolInfo);

    if (protocolInfo.version !== 'Unknown') {
      chrome.runtime.sendMessage({
        type: 'PROTOCOL_DETECTED',
        protocol: protocolInfo.version,
        url: window.location.href,
        method: protocolInfo.method
      });
    }
  }

  // Send immediately
  sendProtocolInfo();

  // Send again after page loads (in case navigation timing wasn't ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendProtocolInfo);
  }

  // Also try after a delay to catch late-loading resources
  setTimeout(sendProtocolInfo, 2000);

  // Listen for requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PROTOCOL') {
      console.log('[Flagium Content] Popup requested protocol info');

      try {
        const navEntries = performance.getEntriesByType('navigation');
        console.log('[Flagium Content] Navigation entries found:', navEntries.length);

        if (navEntries && navEntries.length > 0) {
          const nav = navEntries[0];
          console.log('[Flagium Content] Navigation entry:', nav);
          console.log('[Flagium Content] nextHopProtocol:', nav.nextHopProtocol);

          if (nav.nextHopProtocol) {
            const protocol = nav.nextHopProtocol;
            console.log('[Flagium Content] Raw protocol value:', protocol);
            console.log('[Flagium Content] Protocol type:', typeof protocol);
            console.log('[Flagium Content] Protocol includes h3?', protocol.includes('h3'));
            console.log('[Flagium Content] Protocol starts with h3?', protocol.startsWith('h3'));
            console.log('[Flagium Content] Sending protocol to popup:', protocol);

            sendResponse({
              success: true,
              protocol: protocol
            });
          } else {
            console.log('[Flagium Content] No nextHopProtocol in navigation entry');
            sendResponse({
              success: false,
              protocol: null,
              error: 'No nextHopProtocol property'
            });
          }
        } else {
          console.log('[Flagium Content] No navigation entries available');
          sendResponse({
            success: false,
            protocol: null,
            error: 'No navigation entries'
          });
        }
      } catch (e) {
        console.error('[Flagium Content] Error getting protocol:', e);
        sendResponse({
          success: false,
          protocol: null,
          error: e.message
        });
      }
      return true; // Keep message channel open for async response
    }
  });
})();