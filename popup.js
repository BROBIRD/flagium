// Flagium Popup Script
// Handles popup UI and interactions with i18n support

// Current tab data
let currentTabData = null;
let currentTabId = null;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize i18n with language loader if available
  if (window.languageLoader) {
    await window.languageLoader.applyLanguage();
  } else {
    initializeI18n();
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  // Load user settings
  await loadUserSettings();

  // Load tab data
  await loadTabData();

  // Setup event listeners
  setupEventListeners();
});

// Export functions for debugging in console
window.debugProtocol = async () => {
  console.log('[Flagium Debug] Starting protocol detection...');
  if (currentTabData) {
    await updateProtocolInfo(currentTabData);
  } else {
    console.log('[Flagium Debug] No tab data available');
  }
};

// Direct protocol check for debugging
window.checkProtocol = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[Flagium Debug] Checking protocol for tab:', tab.url);

  // Send message to content script
  chrome.tabs.sendMessage(tab.id, { type: 'GET_PROTOCOL' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Flagium Debug] Error:', chrome.runtime.lastError);
      return;
    }

    if (response && response.protocol) {
      const protocol = response.protocol;
      console.log('[Flagium Debug] Raw protocol:', protocol);
      console.log('[Flagium Debug] Protocol lowercase:', protocol.toLowerCase());
      console.log('[Flagium Debug] Is h3?', protocol.toLowerCase() === 'h3');
      console.log('[Flagium Debug] Starts with h3?', protocol.toLowerCase().startsWith('h3'));

      // Test formatting
      let formatted = 'HTTP/1.1';
      const p = protocol.toLowerCase();
      if (p === 'h3' || p.startsWith('h3')) {
        formatted = 'HTTP/3';
      } else if (p === 'h2') {
        formatted = 'HTTP/2';
      }

      console.log('[Flagium Debug] Would format to:', formatted);
    } else {
      console.log('[Flagium Debug] No protocol in response:', response);
    }
  });
};

// Test function to verify script injection works
window.testInjection = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[Flagium Debug] Testing injection on tab:', tab.id);

  if (!tab?.id) {
    console.error('[Flagium Debug] No active tab found');
    return { error: 'No active tab' };
  }

  try {
    // Test using the same approach as the main function
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          hasNav: !!nav,
          protocol: nav?.nextHopProtocol,
          allProps: nav ? Object.keys(nav) : [],
          userAgent: navigator.userAgent
        };
      }
    });

    console.log('[Flagium Debug] Test successful:', result[0]?.result);
    return result[0]?.result || { error: 'No result' };
  } catch (err) {
    console.error('[Flagium Debug] Test failed:', err.message);

    // Check if chrome.scripting exists
    if (!chrome.scripting) {
      console.error('[Flagium Debug] chrome.scripting is not available!');
      console.log('[Flagium Debug] Available Chrome APIs:', Object.keys(chrome).filter(k => typeof chrome[k] === 'object'));
      return {
        error: 'chrome.scripting not available',
        availableAPIs: Object.keys(chrome).filter(k => typeof chrome[k] === 'object')
      };
    }

    return { error: err.message };
  }
};

// Initialize i18n for all elements
function initializeI18n() {
  // Replace text for all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });

  // Set title attributes for buttons
  document.getElementById('refreshBtn').title = chrome.i18n.getMessage('refresh') || 'Refresh';
}

// Load user settings
async function loadUserSettings() {
  const settings = await chrome.storage.sync.get(['language', 'actions']);

  // Language is handled by Chrome's i18n system
  // Actions will be loaded when displaying them

  return settings;
}

// Load tab data from background script
async function loadTabData() {
  showLoading(true);

  try {
    // Request data from background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_TAB_DATA',
      tabId: currentTabId
    });

    if (response) {
      currentTabData = response;

      // Display data first
      displayTabData(response);

      // Try to get real-time protocol info after a short delay
      // This ensures the page is fully loaded and ready
      setTimeout(async () => {
        await updateProtocolInfo(response);
      }, 100);
    } else {
      showError(chrome.i18n.getMessage('noDataAvailable'));
    }
  } catch (error) {
    console.error('Error loading tab data:', error);
    showError(chrome.i18n.getMessage('errorFetchingData'));
  } finally {
    showLoading(false);
  }
}

// Function to be executed in the page's context for protocol detection
// This must be defined in the same script for chrome.scripting.executeScript
function getHttpProtocol() {
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0];

    if (navigationEntry && navigationEntry.nextHopProtocol) {
      const protocol = navigationEntry.nextHopProtocol;
      console.log('[Flagium Page] Protocol detected:', protocol);

      // Return both raw and formatted versions
      let formatted = 'HTTP/1.1'; // Default
      const protocolLower = protocol.toLowerCase();

      if (protocolLower === 'h3' || protocolLower.startsWith('h3-')) {
        formatted = 'HTTP/3';
      } else if (protocolLower === 'h2') {
        formatted = 'HTTP/2';
      } else if (protocolLower.includes('http/1.1')) {
        formatted = 'HTTP/1.1';
      } else if (protocolLower.includes('http/1.0')) {
        formatted = 'HTTP/1.0';
      }

      return {
        success: true,
        raw: protocol,
        formatted: formatted
      };
    }

    return {
      success: false,
      error: 'No navigation entry or nextHopProtocol not available'
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

// Get real-time protocol information from the tab
async function updateProtocolInfo(data) {
  console.log('[Flagium] updateProtocolInfo called');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[Flagium] Current tab:', tab.url, 'id:', tab.id);

    // Only update for http/https pages
    if (!tab?.id || !tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      console.log('[Flagium] Not a valid http/https page, skipping protocol detection');
      return;
    }

    // Method 1: Try chrome.scripting (Manifest V3 way)
    if (chrome.scripting && chrome.scripting.executeScript) {
      try {
        console.log('[Flagium] Using chrome.scripting.executeScript...');

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getHttpProtocol
        });

        console.log('[Flagium] Script execution results:', results);

      // Process the result
      if (results && results[0] && results[0].result) {
        const result = results[0].result;

        if (result.success && result.formatted) {
          console.log('[Flagium] Protocol detected successfully:', result.formatted, '(raw:', result.raw, ')');

          // Update the display immediately
          const protocolElement = document.getElementById('protocol');
          if (protocolElement) {
            protocolElement.textContent = result.formatted;
            protocolElement.style.color = '#00a000'; // Green to show it's updated

            // Reset color after 2 seconds
            setTimeout(() => {
              protocolElement.style.color = '';
            }, 2000);
          }

          // Update data
          data.protocol = result.formatted;
          if (currentTabData) {
            currentTabData.protocol = result.formatted;
          }

          // Update background service worker
          chrome.runtime.sendMessage({
            type: 'UPDATE_PROTOCOL',
            tabId: tab.id,
            protocol: result.formatted
          }).catch(err => console.log('[Flagium] Background update error:', err));

        } else {
          console.error('[Flagium] Protocol detection failed:', result.error);
        }
      } else {
        console.log('[Flagium] No result from script execution');
      }
      } catch (scriptError) {
        console.error('[Flagium] chrome.scripting failed:', scriptError);
      }
    }

    // Method 2: Try chrome.tabs.executeScript (older API, might still work)
    else if (chrome.tabs && chrome.tabs.executeScript) {
      console.log('[Flagium] chrome.scripting not available, trying chrome.tabs.executeScript...');

      return new Promise((resolve) => {
        chrome.tabs.executeScript(tab.id, {
          code: `
            (() => {
              try {
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav && nav.nextHopProtocol) {
                  return {
                    success: true,
                    raw: nav.nextHopProtocol,
                    formatted: nav.nextHopProtocol
                  };
                }
                return { success: false, error: 'No protocol found' };
              } catch (e) {
                return { success: false, error: e.message };
              }
            })()
          `
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error('[Flagium] tabs.executeScript error:', chrome.runtime.lastError);

            // Method 3: Try message passing to content script
            tryContentScriptMethod(tab.id);
            resolve();
            return;
          }

          if (results && results[0]) {
            const result = results[0];
            console.log('[Flagium] tabs.executeScript result:', result);

            if (result.success && result.raw) {
              const protocol = result.raw.toLowerCase();
              let formatted = 'HTTP/1.1';

              // More comprehensive HTTP/3 detection
              if (protocol === 'h3' ||
                  protocol === 'h3-29' ||
                  protocol === 'h3-q050' ||
                  protocol === 'h3-q046' ||
                  protocol === 'h3-q043' ||
                  protocol === 'h3-t051' ||
                  protocol === 'h3-t050' ||
                  protocol === 'h3-27' ||
                  protocol === 'h3-28' ||
                  protocol === 'h3-32' ||
                  protocol.startsWith('h3')) {
                formatted = 'HTTP/3';
              } else if (protocol === 'h2') {
                formatted = 'HTTP/2';
              } else if (protocol.includes('http/1.1')) {
                formatted = 'HTTP/1.1';
              }

              console.log('[Flagium] tabs.executeScript: Protocol formatted from', protocol, 'to', formatted);
              updateProtocolDisplay(formatted);

              // Update data
              if (data) data.protocol = formatted;
              if (currentTabData) currentTabData.protocol = formatted;
            }
          }
          resolve();
        });
      });
    }

    // Method 3: Try via background service worker
    else {
      console.log('[Flagium] No script injection API available, trying background service worker...');

      // Ask background to inject and get protocol
      chrome.runtime.sendMessage({
        type: 'DETECT_PROTOCOL',
        tabId: tab.id
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Flagium] Background error:', chrome.runtime.lastError);
          tryContentScriptMethod(tab.id);
        } else if (response && response.success && response.protocol) {
          console.log('[Flagium] Got protocol from background:', response.protocol);
          updateProtocolDisplay(response.protocol);

          // Update data
          if (data) data.protocol = response.protocol;
          if (currentTabData) currentTabData.protocol = response.protocol;
        } else {
          console.log('[Flagium] Background failed, trying content script...');
          tryContentScriptMethod(tab.id);
        }
      });
    }
  } catch (error) {
    console.error('[Flagium] Failed to detect protocol:', error);
  }
}

// Helper function to update protocol display
function updateProtocolDisplay(formatted) {
  const protocolElement = document.getElementById('protocol');
  if (protocolElement) {
    protocolElement.textContent = formatted;
    protocolElement.style.color = '#00a000'; // Green to show it's updated

    // Reset color after 2 seconds
    setTimeout(() => {
      protocolElement.style.color = '';
    }, 2000);

    console.log('[Flagium] Protocol display updated to:', formatted);
  }
}

// Method 3: Try to get protocol via content script
function tryContentScriptMethod(tabId) {
  console.log('[Flagium] Attempting to get protocol from content script...');

  chrome.tabs.sendMessage(tabId, { type: 'GET_PROTOCOL' }, async (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Flagium] Content script not responding:', chrome.runtime.lastError);
      console.log('[Flagium] Attempting to inject content script manually...');

      // Try to inject the content script manually
      try {
        await injectContentScriptManually(tabId);

        // Wait a bit for the script to initialize
        setTimeout(() => {
          // Try again after injection
          chrome.tabs.sendMessage(tabId, { type: 'GET_PROTOCOL' }, (retryResponse) => {
            if (chrome.runtime.lastError) {
              console.error('[Flagium] Still no response after injection:', chrome.runtime.lastError);
              // Use default
              useDefaultProtocol();
            } else if (retryResponse && retryResponse.protocol) {
              processProtocolResponse(retryResponse);
            }
          });
        }, 100);
      } catch (err) {
        console.error('[Flagium] Failed to inject content script:', err);
        useDefaultProtocol();
      }
      return;
    }

    if (response && response.protocol) {
      processProtocolResponse(response);
    }
  });
}

// Process protocol response from content script
function processProtocolResponse(response) {
  console.log('[Flagium] Got protocol from content script:', response.protocol);

  const protocol = response.protocol.toLowerCase();
  let formatted = 'HTTP/1.1';

  // More comprehensive HTTP/3 detection
  if (protocol === 'h3' ||
      protocol === 'h3-29' ||
      protocol === 'h3-q050' ||
      protocol === 'h3-q046' ||
      protocol === 'h3-q043' ||
      protocol === 'h3-t051' ||
      protocol === 'h3-t050' ||
      protocol === 'h3-27' ||
      protocol === 'h3-28' ||
      protocol === 'h3-32' ||
      protocol.startsWith('h3')) {
    formatted = 'HTTP/3';
  } else if (protocol === 'h2') {
    formatted = 'HTTP/2';
  } else if (protocol.includes('http/1.1')) {
    formatted = 'HTTP/1.1';
  }

  console.log('[Flagium] Protocol formatted from', protocol, 'to', formatted);
  updateProtocolDisplay(formatted);
}

// Use default protocol based on URL
function useDefaultProtocol() {
  chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]?.url?.startsWith('https://')) {
      // Default to HTTP/2 for HTTPS
      updateProtocolDisplay('HTTP/2');
    } else {
      updateProtocolDisplay('HTTP/1.1');
    }
  });
}

// Manually inject content script
async function injectContentScriptManually(tabId) {
  console.log('[Flagium] Manually injecting protocol detection script...');

  // Create a simple detection script
  const code = `
    (() => {
      if (window.__flagiumInjected) return;
      window.__flagiumInjected = true;

      console.log('[Flagium Injected] Protocol detection script loaded');

      // Listen for protocol requests
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'GET_PROTOCOL') {
          console.log('[Flagium Injected] Protocol request received');

          try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav && nav.nextHopProtocol) {
              console.log('[Flagium Injected] Protocol detected:', nav.nextHopProtocol);
              sendResponse({
                success: true,
                protocol: nav.nextHopProtocol
              });
            } else {
              sendResponse({
                success: false,
                error: 'No protocol data available'
              });
            }
          } catch (e) {
            sendResponse({
              success: false,
              error: e.message
            });
          }
          return true;
        }
      });

      // Also try to send protocol immediately
      try {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav && nav.nextHopProtocol) {
          chrome.runtime.sendMessage({
            type: 'PROTOCOL_DETECTED',
            protocol: nav.nextHopProtocol,
            url: window.location.href
          });
        }
      } catch (e) {
        console.error('[Flagium Injected] Error sending protocol:', e);
      }
    })();
  `;

  // Try using chrome.tabs.executeScript if available
  if (chrome.tabs && chrome.tabs.executeScript) {
    return new Promise((resolve, reject) => {
      chrome.tabs.executeScript(tabId, { code }, (results) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(results);
        }
      });
    });
  }

  throw new Error('No script execution API available');
}

// Display tab data in popup
function displayTabData(data) {
  // Hide error if shown
  document.getElementById('errorMessage').classList.add('hidden');

  // Domain
  document.getElementById('domain').textContent = data.domain || '-';

  // Check for local or private addresses
  if (data.isLocal) {
    document.getElementById('ipAddress').textContent = chrome.i18n.getMessage('localAddress');
    document.getElementById('countryName').textContent = chrome.i18n.getMessage('localAddress');
    document.getElementById('cityName').textContent = '-';
    document.getElementById('ispOrg').textContent = '-';
    document.getElementById('asn').textContent = '-';
    updateFlag(null);  // Will use earth icon
  } else if (data.isPrivate) {
    document.getElementById('ipAddress').textContent = data.ip || '-';
    document.getElementById('countryName').textContent = chrome.i18n.getMessage('privateNetwork');
    document.getElementById('cityName').textContent = '-';
    document.getElementById('ispOrg').textContent = chrome.i18n.getMessage('privateNetwork');
    document.getElementById('asn').textContent = '-';
    updateFlag(null);  // Will use earth icon
  } else {
    // IP Address
    document.getElementById('ipAddress').textContent = data.ip || '-';

    // Country and City
    // Handle Anycast/Global networks (like Cloudflare)
    const countryText = data.country || chrome.i18n.getMessage('unknown');
    document.getElementById('countryName').textContent = countryText;
    document.getElementById('cityName').textContent = data.city || '-';

    // ISP/Organization
    const ispOrg = data.organization || data.isp || '-';
    document.getElementById('ispOrg').textContent = ispOrg;

    // ASN
    const asnText = data.asn ? `AS${data.asn}` : '-';
    document.getElementById('asn').textContent = asnText;

    // Update flag
    updateFlag(data.countryCode);
  }

  // Protocol
  document.getElementById('protocol').textContent = data.protocol || 'HTTP/1.1';

  // HSTS
  const hstsElement = document.getElementById('hsts');
  if (data.hsts) {
    hstsElement.innerHTML = `<span class="status-badge enabled">${chrome.i18n.getMessage('enabled')}</span>`;
  } else {
    hstsElement.innerHTML = `<span class="status-badge disabled">${chrome.i18n.getMessage('disabled')}</span>`;
  }

  // Load and display actions
  loadActions(data);
}

// Update flag icon
function updateFlag(countryCode) {
  const flagIcon = document.getElementById('flagIcon');
  console.log('Updating flag for country code:', countryCode);

  if (countryCode) {
    // Use SVG for popup display (better quality)
    const svgUrl = chrome.runtime.getURL(`flags/${countryCode}.svg`);
    console.log('Using SVG flag URL:', svgUrl);

    // Test if SVG exists
    fetch(svgUrl)
      .then(response => {
        if (response.ok) {
          console.log('SVG flag found, setting src to:', svgUrl);
          flagIcon.src = svgUrl;
        } else {
          // Fallback to earth SVG
          console.log('Flag not found, using earth icon');
          flagIcon.src = chrome.runtime.getURL('flags/earth.svg');
        }
      })
      .catch((error) => {
        console.error('Error fetching flag:', error);
        flagIcon.src = chrome.runtime.getURL('flags/earth.svg');
      });
  } else {
    // Use earth SVG as default
    console.log('No country code, using earth icon');
    flagIcon.src = chrome.runtime.getURL('flags/earth.svg');
  }
}

// Load and display actions
async function loadActions(data) {
  const actionsSection = document.getElementById('actionsSection');
  actionsSection.innerHTML = '';

  // Get actions from storage
  const storage = await chrome.storage.sync.get(['actions']);
  const actions = storage.actions || getDefaultActions();

  // Filter enabled actions
  const enabledActions = actions.filter(action => action.enabled !== false);

  // Create action buttons
  for (const action of enabledActions) {
    const button = createActionButton(action, data);
    if (button) {
      actionsSection.appendChild(button);
    }
  }
}

// Get default actions
function getDefaultActions() {
  return [
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
}

// Create action button
function createActionButton(action, data) {
  const button = document.createElement('button');
  button.className = 'action-btn';

  // Icon
  const icon = document.createElement('span');
  icon.className = 'action-icon';
  icon.textContent = action.icon || '🔗';
  button.appendChild(icon);

  // Text - use i18n if available
  const text = document.createElement('span');
  const actionText = chrome.i18n.getMessage(action.name) || action.name;
  text.textContent = actionText;
  button.appendChild(text);

  // Click handler
  if (action.isAction && action.id === 'copy-ip') {
    // Special handler for Copy IP
    button.addEventListener('click', async () => {
      if (data.ip) {
        await copyToClipboard(data.ip);

        // Show copied feedback
        const originalText = text.textContent;
        text.textContent = chrome.i18n.getMessage('copied');
        button.classList.add('success');

        setTimeout(() => {
          text.textContent = originalText;
          button.classList.remove('success');
        }, 2000);
      }
    });
  } else if (action.url) {
    // URL-based action
    button.addEventListener('click', () => {
      let url = action.url;

      // Replace placeholders
      if (data.domain) {
        url = url.replace('{domain}', encodeURIComponent(data.domain));
      }
      if (data.ip) {
        url = url.replace('{ip}', encodeURIComponent(data.ip));
      }
      if (data.asn) {
        url = url.replace('{asn}', encodeURIComponent(`AS${data.asn}`));
      }
      if (data.countryCode) {
        url = url.replace('{country_code}', encodeURIComponent(data.countryCode));
      }

      // Open in new tab
      chrome.tabs.create({ url });
    });
  } else if (action.customHandler) {
    // Custom handler function
    button.addEventListener('click', () => {
      executeCustomAction(action, data);
    });
  }

  return button;
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    // Try using the Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

// Execute custom action
function executeCustomAction(action, data) {
  // This can be extended for custom actions
  console.log('Executing custom action:', action, data);
}

// Setup event listeners
function setupEventListeners() {
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');

    // Clear cache for this tab and reload
    await chrome.runtime.sendMessage({
      type: 'REFRESH_TAB_DATA',
      tabId: currentTabId
    });

    // Reload the current tab
    await chrome.tabs.reload(currentTabId);

    // Wait a bit then reload data
    setTimeout(async () => {
      await loadTabData();
      btn.classList.remove('spinning');
    }, 1000);
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// Show loading overlay
function showLoading(show) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (show) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  const errorText = errorMessage.querySelector('.error-text');
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
}