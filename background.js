// Flagium Background Service Worker
// Firefox MV3 compatible version

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
browser.runtime.onInstalled.addListener(async () => {
  const storage = await browser.storage.sync.get(['actions', 'language', 'cacheExpiry']);
  if (!storage.actions) {
    await browser.storage.sync.set({ actions: DEFAULT_ACTIONS });
  }
  if (!storage.language) {
    await browser.storage.sync.set({ language: 'auto' });
  }
  if (!storage.cacheExpiry) {
    await browser.storage.sync.set({ cacheExpiry: 60 });
  }
});

// Listen for tab updates
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const existingData = tabData.get(tabId);
    if (!existingData || !existingData.ip) {
      console.log('Tab updated, checking for data:', tab.url);
    }
  }
});

// Listen for tab activation to update icon
browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  const data = tabData.get(tabId);

  if (data && data.countryCode && !data.isLocal && !data.isPrivate) {
    try {
      await setFlagIcon(tabId, data.countryCode);
    } catch (error) {
      console.error('Failed to restore flag icon on tab activation:', error);
      browser.browserAction.setIcon({
        tabId,
        path: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      });
    }
  } else {
    browser.browserAction.setIcon({
      tabId,
      path: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      }
    });
  }
});

// Listen for web requests to get IP addresses
browser.webRequest.onResponseStarted.addListener(
  async (details) => {
    if (details.type !== 'main_frame') return;
    if (details.tabId === -1) return;

    try {
      const url = new URL(details.url);
      const domain = url.hostname;

      if (isLocalAddress(domain)) {
        await updateTabData(details.tabId, { domain, isLocal: true });
        return;
      }

      let ip = details.ip;

      if (!ip) {
        try {
          const dnsResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
          if (dnsResponse.ok) {
            const dnsData = await dnsResponse.json();
            if (dnsData.Answer && dnsData.Answer.length > 0) {
              ip = dnsData.Answer[0].data;
            }
          }
        } catch (dnsError) {
          console.error('DNS resolution failed:', dnsError);
        }
      }

      if (!ip) return;

      if (isPrivateIP(ip)) {
        await updateTabData(details.tabId, { domain, ip, isPrivate: true });
        return;
      }

      const protocol = extractProtocolVersion(details.statusLine, details.responseHeaders, details.url);

      const hstsHeader = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'strict-transport-security'
      );
      const hsts = hstsHeader ? hstsHeader.value : null;

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

      const geoData = await fetchGeoData(ip);
      const data = {
        domain,
        ip,
        ...geoData,
        protocol,
        hsts,
        timestamp: now
      };

      cache.set(cacheKey, { data, timestamp: now });
      await updateTabData(details.tabId, data);

    } catch (error) {
      console.error('Error processing request:', error);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

async function fetchGeoData(ip) {
  try {
    const response = await fetch(`https://api.ip.sb/geoip/${ip}`);
    if (!response.ok) throw new Error(`API response: ${response.status}`);
    const data = await response.json();
    return {
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
  } catch (error) {
    console.error('Error fetching geo data:', error);
    return { error: true, errorMessage: error.message };
  }
}

async function updateTabData(tabId, data) {
  tabData.set(tabId, data);

  if (data.countryCode && !data.isLocal && !data.isPrivate) {
    try {
      await setFlagIcon(tabId, data.countryCode);
    } catch (error) {
      console.error('Error setting flag icon:', error);
      browser.browserAction.setIcon({
        tabId,
        path: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      });
    }
  } else {
    browser.browserAction.setIcon({
      tabId,
      path: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      }
    });
  }
}

async function setFlagIcon(tabId, countryCode) {
  try {
    const flagUrl = browser.runtime.getURL(`flags_png/1x/${countryCode}.png`);
    const testResponse = await fetch(flagUrl);
    if (!testResponse.ok) throw new Error('Flag not found');

    const flagPaths = {
      16: `flags_png/1x/${countryCode}.png`,
      32: `flags_png/2x/${countryCode}.png`,
      48: `flags_png/3x/${countryCode}.png`,
      128: `flags_png/3x/${countryCode}.png`
    };

    browser.browserAction.setIcon({ tabId, path: flagPaths });
  } catch (error) {
    console.error('Error setting flag icon:', error);
    browser.browserAction.setIcon({
      tabId,
      path: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      }
    });
  }
}

function isLocalAddress(domain) {
  return domain === 'localhost' ||
         domain === '127.0.0.1' ||
         domain === '::1' ||
         domain.endsWith('.local') ||
         domain.endsWith('.localhost');
}

function isPrivateIP(ip) {
  const ipv4Patterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./
  ];
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

function extractProtocolVersion(statusLine, responseHeaders, url) {
  if (statusLine) {
    if (statusLine.includes('h3')) return 'HTTP/3';
    if (statusLine.includes('h2') || statusLine.includes('HTTP/2')) return 'HTTP/2';
    if (statusLine.includes('HTTP/1.1')) return 'HTTP/1.1';
    if (statusLine.includes('HTTP/1.0')) return 'HTTP/1.0';
  }
  if (responseHeaders) {
    const altSvcHeader = responseHeaders.find(h => h.name.toLowerCase() === 'alt-svc');
    if (altSvcHeader && (altSvcHeader.value.includes('h3=') ||
        altSvcHeader.value.includes('h3-29=') ||
        altSvcHeader.value.includes('h3-Q050='))) {
      return 'HTTP/3';
    }
  }
  if (url && url.startsWith('https://')) return 'HTTP/2';
  return 'HTTP/1.1';
}

// Message handler - Firefox MV3 Promise-based
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_DATA') {
    sendResponse(tabData.get(request.tabId) || null);
  } else if (request.type === 'CLEAR_CACHE') {
    cache.clear();
    tabData.clear();
    sendResponse({ success: true });
  } else if (request.type === 'REFRESH_TAB_DATA') {
    const data = tabData.get(request.tabId);
    if (data && data.domain && data.ip) {
      const cacheKey = `${data.domain}_${data.ip}`;
      cache.delete(cacheKey);
    }
    sendResponse({ success: true });
  } else if (request.type === 'PROTOCOL_DETECTED' && sender.tab) {
    const tabId = sender.tab.id;
    const existingData = tabData.get(tabId);
    if (existingData) {
      existingData.protocol = request.protocol;
      existingData.protocolMethod = request.method;
      tabData.set(tabId, existingData);
    } else {
      tabData.set(tabId, {
        protocol: request.protocol,
        protocolMethod: request.method
      });
    }
    sendResponse({ success: true });
  } else if (request.type === 'UPDATE_PROTOCOL') {
    const existingData = tabData.get(request.tabId);
    if (existingData) {
      existingData.protocol = request.protocol;
      existingData.protocolMethod = 'popup-injected';
      tabData.set(request.tabId, existingData);
    }
    sendResponse({ success: true });
  } else if (request.type === 'DETECT_PROTOCOL') {
    const tabId = request.tabId;
    const existingData = tabData.get(tabId);

    if (existingData && existingData.protocol && existingData.protocol !== 'Unknown') {
      sendResponse({ success: true, protocol: existingData.protocol });
      return true;
    }

    // Firefox MV2: use browser.tabs.executeScript with callback
    const detectCode = 'var nav = performance.getEntriesByType("navigation")[0];' +
                       'nav && nav.nextHopProtocol ? nav.nextHopProtocol : null;';

    try {
      browser.tabs.executeScript(tabId, { code: detectCode, runAt: 'document_idle' }, (results) => {
        if (browser.runtime.lastError || !results || !results[0]) {
          const guessedProtocol = existingData && existingData.url &&
            existingData.url.startsWith('https://') ? 'HTTP/2' : 'HTTP/1.1';
          sendResponse({ success: true, protocol: guessedProtocol });
          return;
        }
        const protocol = results[0];
        let formatted = 'HTTP/1.1';
        if (protocol) {
          const p = String(protocol).toLowerCase();
          if (p === 'h3' || p.startsWith('h3')) formatted = 'HTTP/3';
          else if (p === 'h2') formatted = 'HTTP/2';
          else if (p.includes('http/1.1')) formatted = 'HTTP/1.1';
        }
        if (existingData) {
          existingData.protocol = formatted;
          tabData.set(tabId, existingData);
        }
        sendResponse({ success: true, protocol: formatted, raw: protocol });
      });
    } catch (error) {
      console.error('[Flagium BG] Script execution failed:', error);
      const guessedProtocol = existingData && existingData.url &&
        existingData.url.startsWith('https://') ? 'HTTP/2' : 'HTTP/1.1';
      sendResponse({ success: true, protocol: guessedProtocol });
    }
    return true;
  }
  return true; // Keep message channel open
});

// Clean up data when tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
});
