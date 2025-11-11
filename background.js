// Flagium Background Service Worker
// Handles IP detection, GeoIP lookups, and caching

// Cache for storing IP and geo data
const cache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour default

// Store current tab data
const tabData = new Map();

// Default actions configuration
const DEFAULT_ACTIONS = [
  {
    id: 'domain-whois',
    name: 'domainWhois',
    url: 'https://r.sb/{domain}',
    icon: '🔍',
    enabled: true
  },
  {
    id: 'ip-whois',
    name: 'ipWhois',
    url: 'https://r.sb/{ip}',
    icon: '📍',
    enabled: true
  },
  {
    id: 'asn-whois',
    name: 'asnWhois',
    url: 'https://r.sb/{asn}',
    icon: '🌐',
    enabled: true
  },
  {
    id: 'copy-ip',
    name: 'copyIP',
    url: '',
    icon: '📋',
    enabled: true,
    isAction: true
  }
];

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  // Set default actions if not exists
  const storage = await chrome.storage.sync.get(['actions', 'language', 'cacheExpiry']);
  if (!storage.actions) {
    await chrome.storage.sync.set({ actions: DEFAULT_ACTIONS });
  }
  if (!storage.language) {
    await chrome.storage.sync.set({ language: 'auto' });
  }
  if (!storage.cacheExpiry) {
    await chrome.storage.sync.set({ cacheExpiry: 60 }); // Default 60 minutes
  }
});

// Also listen for tab updates to handle cases where webRequest doesn't catch it
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we already have data for this tab
    const existingData = tabData.get(tabId);
    if (!existingData || !existingData.ip) {
      // Try to fetch data for this tab
      console.log('Tab updated, checking for data:', tab.url);
    }

    // Inject content script to detect protocol if it's a http/https page
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      try {
        console.log('Injecting protocol detection script into tab:', tabId);
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: detectProtocolInPage
        });
      } catch (error) {
        console.log('Could not inject script:', error.message);
      }
    }
  }
});

// Function to inject into the page to detect protocol
function detectProtocolInPage() {
  if (window.performance) {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      const nav = navEntries[0];
      if (nav.nextHopProtocol) {
        const protocol = nav.nextHopProtocol.toLowerCase();
        let protocolVersion = 'Unknown';

        if (protocol === 'h3' || protocol === 'h3-29' || protocol === 'h3-q050') {
          protocolVersion = 'HTTP/3';
        } else if (protocol === 'h2') {
          protocolVersion = 'HTTP/2';
        } else if (protocol.includes('http/1.1')) {
          protocolVersion = 'HTTP/1.1';
        } else if (protocol.includes('http/1.0')) {
          protocolVersion = 'HTTP/1.0';
        }

        console.log('[Flagium Injected] Detected protocol:', protocolVersion, 'from', protocol);

        // Send to background script
        chrome.runtime.sendMessage({
          type: 'PROTOCOL_DETECTED',
          protocol: protocolVersion,
          url: window.location.href,
          method: 'injected'
        });
      }
    }
  }
}

// Listen for tab activation to update icon
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  const data = tabData.get(tabId);

  if (data && data.countryCode && !data.isLocal && !data.isPrivate) {
    console.log('Tab activated, restoring flag icon for tab:', tabId, 'Country:', data.countryCode);
    try {
      await setFlagIcon(tabId, data.countryCode);
    } catch (error) {
      console.error('Failed to restore flag icon on tab activation:', error);
      // Fallback to earth icon
      chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon16.png',  // earth icon
          48: 'icons/icon48.png',  // earth icon
          128: 'icons/icon128.png' // earth icon
        }
      });
    }
  } else {
    console.log('Tab activated, using earth icon for tab:', tabId);
    // Use earth icon as default
    chrome.action.setIcon({
      tabId,
      path: {
        16: 'icons/icon16.png',  // earth icon
        48: 'icons/icon48.png',  // earth icon
        128: 'icons/icon128.png' // earth icon
      }
    });
  }
});

// Listen for web requests to get IP addresses
chrome.webRequest.onResponseStarted.addListener(
  async (details) => {
    console.log('webRequest.onResponseStarted triggered:', details.url, 'Type:', details.type, 'TabId:', details.tabId);

    // Only process main frame requests
    if (details.type !== 'main_frame') return;
    if (details.tabId === -1) return;

    console.log('Processing main frame request for:', details.url);
    console.log('Full details object:', JSON.stringify({
      url: details.url,
      statusLine: details.statusLine,
      statusCode: details.statusCode,
      method: details.method,
      type: details.type,
      ip: details.ip,
      fromCache: details.fromCache,
      responseHeaders: details.responseHeaders?.map(h => `${h.name}: ${h.value.substring(0, 100)}`)
    }, null, 2));

    try {
      const url = new URL(details.url);
      const domain = url.hostname;

      // Skip local addresses
      if (isLocalAddress(domain)) {
        await updateTabData(details.tabId, {
          domain,
          isLocal: true
        });
        return;
      }

      // Get IP address - in Manifest V3, details.ip might not be available
      // We'll need to resolve DNS separately if not present
      let ip = details.ip;

      if (!ip) {
        console.log('IP not available from webRequest, resolving via DNS for:', domain);
        // Try to resolve IP using a DNS API
        try {
          const dnsResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
          if (dnsResponse.ok) {
            const dnsData = await dnsResponse.json();
            if (dnsData.Answer && dnsData.Answer.length > 0) {
              ip = dnsData.Answer[0].data;
              console.log('Resolved IP via DNS:', ip);
            }
          }
        } catch (dnsError) {
          console.error('DNS resolution failed:', dnsError);
        }
      }

      if (!ip) {
        console.log('Could not determine IP for:', domain);
        return;
      }

      // Check if it's a private IP
      if (isPrivateIP(ip)) {
        await updateTabData(details.tabId, {
          domain,
          ip,
          isPrivate: true
        });
        return;
      }

      // Get protocol version (statusLine may not be available in Manifest V3)
      console.log('WebRequest details:', {
        statusLine: details.statusLine,
        statusCode: details.statusCode,
        url: details.url,
        responseHeaders: details.responseHeaders ? 'Available' : 'Not available'
      });
      const protocol = extractProtocolVersion(details.statusLine, details.responseHeaders, details.url);

      // Check HSTS from headers
      const hstsHeader = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'strict-transport-security'
      );
      const hsts = hstsHeader ? hstsHeader.value : null;

      // Check cache first
      const cacheKey = `${domain}_${ip}`;
      const cached = cache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        await updateTabData(details.tabId, {
          ...cached.data,
          protocol,
          hsts,
          fromCache: true
        });
        return;
      }

      // Fetch geo data from ip.sb API
      const geoData = await fetchGeoData(ip);

      // Store in cache
      const data = {
        domain,
        ip,
        ...geoData,
        protocol,
        hsts,
        timestamp: now
      };

      cache.set(cacheKey, {
        data,
        timestamp: now
      });

      await updateTabData(details.tabId, data);

    } catch (error) {
      console.error('Error processing request:', error);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Function to fetch geo data from ip.sb API
async function fetchGeoData(ip) {
  try {
    console.log('Fetching geo data for IP:', ip);
    const response = await fetch(`https://api.ip.sb/geoip/${ip}`);
    if (!response.ok) {
      throw new Error(`API response: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', data);

    const geoData = {
      country: data.country || 'Anycast/Global',
      countryCode: data.country_code?.toLowerCase() || null,
      city: data.city || 'Global',
      organization: data.organization,
      asn: data.asn,
      asnOrganization: data.asn_organization,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      isp: data.isp
    };

    console.log('Processed geo data:', geoData);
    return geoData;
  } catch (error) {
    console.error('Error fetching geo data:', error);
    return {
      error: true,
      errorMessage: error.message
    };
  }
}

// Update tab data and icon
async function updateTabData(tabId, data) {
  console.log('Updating tab data:', data);
  tabData.set(tabId, data);

  // Update extension icon based on country
  if (data.countryCode && !data.isLocal && !data.isPrivate) {
    console.log('Country code found:', data.countryCode, 'Setting flag icon...');
    try {
      // Set flag as icon
      await setFlagIcon(tabId, data.countryCode);
    } catch (error) {
      console.error('Error setting flag icon:', error);
      // Fallback to earth icon on error
      chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon16.png',  // earth icon
          48: 'icons/icon48.png',  // earth icon
          128: 'icons/icon128.png' // earth icon
        }
      });
    }
  } else {
    console.log('No country code or local/private address, using earth icon');
    // Use earth icon as default
    chrome.action.setIcon({
      tabId,
      path: {
        16: 'icons/icon16.png',  // earth icon
        48: 'icons/icon48.png',  // earth icon
        128: 'icons/icon128.png' // earth icon
      }
    });
  }
}

// Set flag icon for the tab
async function setFlagIcon(tabId, countryCode) {
  try {
    console.log('Setting flag icon for country:', countryCode);

    // Check if PNG flags exist (using new professional PNGs)
    const flag1xUrl = chrome.runtime.getURL(`flags_png/1x/${countryCode}.png`);
    const testResponse = await fetch(flag1xUrl);

    if (!testResponse.ok) {
      console.log('PNG Flag not found for:', countryCode);
      throw new Error('Flag not found');
    }

    // Use PNG paths - different sizes for different pixel densities
    // 1x = 21x15, 2x = 42x30, 3x = 63x45
    const flagPaths = {
      16: `flags_png/1x/${countryCode}.png`,  // Use 1x for 16px icon
      32: `flags_png/2x/${countryCode}.png`,  // Use 2x for 32px icon
      48: `flags_png/3x/${countryCode}.png`,  // Use 3x for 48px icon
      128: `flags_png/3x/${countryCode}.png`  // Use 3x for 128px icon
    };

    // Set icon using PNG paths
    console.log('Setting icon with PNG paths for tabId:', tabId);

    await chrome.action.setIcon({
      tabId: tabId,
      path: flagPaths
    });

    console.log('Successfully set flag icon using PNG for tab:', tabId);

  } catch (error) {
    console.error('Error in setFlagIcon:', error);
    // Fallback to earth icon
    try {
      await chrome.action.setIcon({
        tabId: tabId,
        path: {
          16: 'icons/icon16.png',  // earth icon
          48: 'icons/icon48.png',  // earth icon
          128: 'icons/icon128.png' // earth icon
        }
      });
      console.log('Fallback to earth icon for tab:', tabId);
    } catch (fallbackError) {
      console.error('Failed to set fallback icon:', fallbackError);
    }
  }
}

// Helper function to check if IP is local
function isLocalAddress(domain) {
  return domain === 'localhost' ||
         domain === '127.0.0.1' ||
         domain === '::1' ||
         domain.endsWith('.local') ||
         domain.endsWith('.localhost');
}

// Helper function to check if IP is private
function isPrivateIP(ip) {
  // Check for IPv4 private ranges
  const ipv4Patterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./
  ];

  // Check for IPv6 private ranges
  const ipv6Patterns = [
    /^fe80:/i,
    /^fc00:/i,
    /^fd00:/i,
    /^::1$/i
  ];

  for (const pattern of ipv4Patterns) {
    if (pattern.test(ip)) return true;
  }

  for (const pattern of ipv6Patterns) {
    if (pattern.test(ip)) return true;
  }

  return false;
}

// Extract protocol version from status line or headers
function extractProtocolVersion(statusLine, responseHeaders, url) {
  console.log('Extracting protocol from statusLine:', statusLine);

  // Try to get from statusLine first
  // In some cases, statusLine is available in Manifest V3
  if (statusLine) {
    // Note: statusLine format is like "HTTP/1.1 200" or "h2 200"
    if (statusLine.includes('h3')) return 'HTTP/3';
    if (statusLine.includes('h2')) return 'HTTP/2';
    if (statusLine.includes('HTTP/2')) return 'HTTP/2';
    if (statusLine.includes('HTTP/1.1')) return 'HTTP/1.1';
    if (statusLine.includes('HTTP/1.0')) return 'HTTP/1.0';
  }

  // In Manifest V3, statusLine might not be available, so we check headers and URL
  if (responseHeaders) {
    // Check for HTTP/3 via Alt-Svc header
    const altSvcHeader = responseHeaders.find(h =>
      h.name.toLowerCase() === 'alt-svc'
    );
    if (altSvcHeader) {
      console.log('Alt-Svc header found:', altSvcHeader.value);
      if (altSvcHeader.value.includes('h3=') ||
          altSvcHeader.value.includes('h3-29=') ||
          altSvcHeader.value.includes('h3-Q050=')) {
        return 'HTTP/3';
      }
    }

    // Check for HTTP/2 indicators
    // Some servers send specific headers that indicate HTTP/2
    const serverHeader = responseHeaders.find(h =>
      h.name.toLowerCase() === 'server'
    );

    // Check if it's HTTPS (most HTTPS sites now use HTTP/2)
    if (url && url.startsWith('https://')) {
      // If we can't determine specifically, assume HTTP/2 for HTTPS
      return 'HTTP/2';
    }
  }

  // Default to HTTP/1.1 for HTTP or unknown
  return url && url.startsWith('http://') ? 'HTTP/1.1' : 'Unknown';
}

// Message handler for popup and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_DATA') {
    const data = tabData.get(request.tabId) || null;
    sendResponse(data);
  } else if (request.type === 'CLEAR_CACHE') {
    cache.clear();
    tabData.clear();
    sendResponse({ success: true });
  } else if (request.type === 'REFRESH_TAB_DATA') {
    // Force refresh by clearing cache for this tab
    const data = tabData.get(request.tabId);
    if (data && data.domain && data.ip) {
      const cacheKey = `${data.domain}_${data.ip}`;
      cache.delete(cacheKey);
    }
    sendResponse({ success: true });
  } else if (request.type === 'PROTOCOL_DETECTED' && sender.tab) {
    // Protocol information from content script
    console.log('Protocol detected from content script:', request.protocol, 'for tab:', sender.tab.id, 'method:', request.method);
    const tabId = sender.tab.id;
    const existingData = tabData.get(tabId);
    if (existingData) {
      // Update protocol with accurate information from content script
      // Content script has the most accurate information from Performance API
      existingData.protocol = request.protocol;
      existingData.protocolMethod = request.method; // Track how we detected it
      tabData.set(tabId, existingData);
      console.log('Updated tab data with accurate protocol:', request.protocol, '(detected via', request.method + ')');
    } else {
      console.log('No existing data for tab', tabId, '- storing protocol info');
      tabData.set(tabId, {
        protocol: request.protocol,
        protocolMethod: request.method
      });
    }
    sendResponse({ success: true });
  } else if (request.type === 'UPDATE_PROTOCOL') {
    // Protocol update from popup
    console.log('Protocol update from popup:', request.protocol, 'for tab:', request.tabId);
    const existingData = tabData.get(request.tabId);
    if (existingData) {
      existingData.protocol = request.protocol;
      existingData.protocolMethod = 'popup-injected';
      tabData.set(request.tabId, existingData);
    }
    sendResponse({ success: true });
  } else if (request.type === 'DETECT_PROTOCOL') {
    // Detect protocol - first check if we already have it from content script
    console.log('[Flagium BG] Protocol detection requested for tab:', request.tabId);

    const existingData = tabData.get(request.tabId);
    if (existingData && existingData.protocol && existingData.protocol !== 'Unknown') {
      console.log('[Flagium BG] Using cached protocol:', existingData.protocol);
      sendResponse({ success: true, protocol: existingData.protocol });
      return true;
    }

    // Try to inject a content script programmatically
    if (chrome.tabs && chrome.tabs.executeScript) {
      console.log('[Flagium BG] Trying tabs.executeScript...');
      chrome.tabs.executeScript(request.tabId, {
        code: `
          (() => {
            try {
              const nav = performance.getEntriesByType('navigation')[0];
              if (nav && nav.nextHopProtocol) {
                return nav.nextHopProtocol;
              }
              return null;
            } catch (e) {
              return null;
            }
          })()
        `
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('[Flagium BG] tabs.executeScript failed:', chrome.runtime.lastError);

          // Try to get from webRequest data
          if (existingData && existingData.url) {
            const guessedProtocol = existingData.url.startsWith('https://') ? 'HTTP/2' : 'HTTP/1.1';
            sendResponse({ success: true, protocol: guessedProtocol });
          } else {
            sendResponse({ success: false, error: 'No execution method available' });
          }
        } else if (results && results[0]) {
          const protocol = results[0];
          console.log('[Flagium BG] Got protocol:', protocol);

          if (protocol) {
            // Format the protocol
            const p = protocol.toLowerCase();
            let formatted = 'HTTP/1.1';

            if (p === 'h3' || p.startsWith('h3')) {
              formatted = 'HTTP/3';
            } else if (p === 'h2') {
              formatted = 'HTTP/2';
            } else if (p.includes('http/1.1')) {
              formatted = 'HTTP/1.1';
            }

            // Update cache
            if (existingData) {
              existingData.protocol = formatted;
              tabData.set(request.tabId, existingData);
            }

            sendResponse({ success: true, protocol: formatted, raw: protocol });
          } else {
            // Default based on HTTPS
            const guessedProtocol = existingData?.url?.startsWith('https://') ? 'HTTP/2' : 'HTTP/1.1';
            sendResponse({ success: true, protocol: guessedProtocol });
          }
        } else {
          sendResponse({ success: false, error: 'No result' });
        }
      });
    } else if (chrome.scripting && chrome.scripting.executeScript) {
      console.log('[Flagium BG] Trying chrome.scripting...');
      chrome.scripting.executeScript(
        {
          target: { tabId: request.tabId },
          func: () => {
            try {
              const nav = performance.getEntriesByType('navigation')[0];
              if (nav && nav.nextHopProtocol) {
                return nav.nextHopProtocol;
              }
              return null;
            } catch (e) {
              return null;
            }
          }
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error('[Flagium BG] chrome.scripting failed:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else if (results && results[0] && results[0].result) {
            const protocol = results[0].result;
            console.log('[Flagium BG] Got protocol via scripting:', protocol);

            if (protocol) {
              // Format the protocol
              const p = protocol.toLowerCase();
              let formatted = 'HTTP/1.1';

              if (p === 'h3' || p.startsWith('h3')) {
                formatted = 'HTTP/3';
              } else if (p === 'h2') {
                formatted = 'HTTP/2';
              }

              // Update cache
              if (existingData) {
                existingData.protocol = formatted;
                tabData.set(request.tabId, existingData);
              }

              sendResponse({ success: true, protocol: formatted, raw: protocol });
            } else {
              sendResponse({ success: false, error: 'No protocol detected' });
            }
          } else {
            sendResponse({ success: false, error: 'No result from injection' });
          }
        }
      );
    } else {
      console.error('[Flagium BG] No script execution API available');
      // Default fallback based on URL scheme
      if (existingData && existingData.url) {
        // For HTTPS sites, default to HTTP/2 as it's widely adopted
        // For HTTP sites, use HTTP/1.1
        const guessedProtocol = existingData.url.startsWith('https://') ? 'HTTP/2' : 'HTTP/1.1';

        console.log('[Flagium BG] Using default protocol based on URL scheme:', guessedProtocol);
        sendResponse({ success: true, protocol: guessedProtocol });
      } else {
        sendResponse({ success: false, error: 'No data available' });
      }
    }
    return true; // Keep channel open for async response
  }
  return true; // Keep message channel open for async response
});

// Clean up data when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
});