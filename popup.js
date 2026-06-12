// Flagium Popup Script - Firefox MV3 compatible

// Current tab data
let currentTabData = null;
let currentTabId = null;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // i18n for elements
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = browser.i18n.getMessage(key);
    if (message) element.textContent = message;
  });

  document.getElementById('refreshBtn').title = browser.i18n.getMessage('refresh') || 'Refresh';

  // Get current tab
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  // Load user settings
  await loadUserSettings();

  // Load tab data
  await loadTabData();

  // Setup event listeners
  setupEventListeners();
});

// Load user settings
async function loadUserSettings() {
  return await browser.storage.sync.get(['language', 'actions']);
}

// Load tab data from background script
async function loadTabData() {
  showLoading(true);
  try {
    const response = await browser.runtime.sendMessage({
      type: 'GET_TAB_DATA',
      tabId: currentTabId
    });

    if (response) {
      currentTabData = response;
      displayTabData(response);

      // Try to detect protocol with a short delay
      setTimeout(async () => {
        await updateProtocolInfo(response);
      }, 100);
    } else {
      showError(browser.i18n.getMessage('noDataAvailable'));
    }
  } catch (error) {
    console.error('Error loading tab data:', error);
    showError(browser.i18n.getMessage('errorFetchingData'));
  } finally {
    showLoading(false);
  }
}

// Get real-time protocol information from the tab
async function updateProtocolInfo(data) {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || (!tab.url.startsWith("http://") && !tab.url.startsWith("https://"))) {
      return;
    }

    const detectCode = 'var nav = performance.getEntriesByType("navigation")[0];' +
                       '(nav && nav.nextHopProtocol) ? nav.nextHopProtocol : null;';

    try {
      browser.tabs.executeScript(tab.id, { code: detectCode, runAt: "document_idle" }, (results) => {
        if (browser.runtime.lastError || !results || !results[0]) {
          tryContentScript(tab, data);
          return;
        }
        const protocol = results[0];
        let formatted = "HTTP/1.1";
        if (protocol) {
          const p = String(protocol).toLowerCase();
          if (p === "h3" || p.startsWith("h3")) formatted = "HTTP/3";
          else if (p === "h2") formatted = "HTTP/2";
          else if (p.includes("http/1.1")) formatted = "HTTP/1.1";
        }
        updateProtocolDisplay(formatted, data);
        try {
          browser.runtime.sendMessage({
            type: "UPDATE_PROTOCOL",
            tabId: tab.id,
            protocol: formatted
          });
        } catch (e) {
          console.log("Background update error:", e);
        }
      });
    } catch (scriptError) {
      console.error("Script execution failed:", scriptError);
      tryContentScript(tab, data);
    }
  } catch (error) {
    console.error("Failed to detect protocol:", error);
  }
}

function updateProtocolDisplay(formatted, data) {
  const el = document.getElementById("protocol");
  if (el) {
    el.textContent = formatted;
    el.style.color = "#00a000";
    setTimeout(() => { el.style.color = ""; }, 2000);
  }
  if (data) data.protocol = formatted;
  if (currentTabData) currentTabData.protocol = formatted;
}

function tryContentScript(tab, data) {
  try {
    browser.tabs.sendMessage(tab.id, { type: "GET_PROTOCOL" }, (csProtocol) => {
      if (csProtocol && csProtocol.protocol) {
        let formatted = "HTTP/1.1";
        const p = String(csProtocol.protocol).toLowerCase();
        if (p === "h3" || p.startsWith("h3")) formatted = "HTTP/3";
        else if (p === "h2") formatted = "HTTP/2";
        updateProtocolDisplay(formatted, data);
      } else {
        const defaultProtocol = tab.url && tab.url.startsWith("https://") ? "HTTP/2" : "HTTP/1.1";
        updateProtocolDisplay(defaultProtocol, data);
      }
    });
  } catch (e) {
    const defaultProtocol = tab.url && tab.url.startsWith("https://") ? "HTTP/2" : "HTTP/1.1";
    updateProtocolDisplay(defaultProtocol, data);
  }
}

// Display tab data in popup
function displayTabData(data) {
  document.getElementById('errorMessage').classList.add('hidden');

  // Domain
  document.getElementById('domain').textContent = data.domain || '-';

  // Check for local or private addresses
  if (data.isLocal) {
    document.getElementById('ipAddress').textContent = browser.i18n.getMessage('localAddress');
    document.getElementById('countryName').textContent = browser.i18n.getMessage('localAddress');
    document.getElementById('cityName').textContent = '-';
    document.getElementById('ispOrg').textContent = '-';
    document.getElementById('asn').textContent = '-';
    updateFlag(null);
  } else if (data.isPrivate) {
    document.getElementById('ipAddress').textContent = data.ip || '-';
    document.getElementById('countryName').textContent = browser.i18n.getMessage('privateNetwork');
    document.getElementById('cityName').textContent = '-';
    document.getElementById('ispOrg').textContent = browser.i18n.getMessage('privateNetwork');
    document.getElementById('asn').textContent = '-';
    updateFlag(null);
  } else {
    document.getElementById('ipAddress').textContent = data.ip || '-';
    const countryText = data.country || browser.i18n.getMessage('unknown');
    document.getElementById('countryName').textContent = countryText;
    document.getElementById('cityName').textContent = data.city || '-';
    const ispOrg = data.organization || data.isp || '-';
    document.getElementById('ispOrg').textContent = ispOrg;
    const asnText = data.asn ? `AS${data.asn}` : '-';
    document.getElementById('asn').textContent = asnText;
    updateFlag(data.countryCode);
  }

  // Protocol
  document.getElementById('protocol').textContent = data.protocol || 'HTTP/1.1';

  // HSTS
  const hstsElement = document.getElementById('hsts');
  if (data.hsts) {
    hstsElement.innerHTML = `<span class="status-badge enabled">${browser.i18n.getMessage('enabled')}</span>`;
  } else {
    hstsElement.innerHTML = `<span class="status-badge disabled">${browser.i18n.getMessage('disabled')}</span>`;
  }

  // Load and display actions
  loadActions(data);
}

// Update flag icon
function updateFlag(countryCode) {
  const flagIcon = document.getElementById('flagIcon');
  if (countryCode) {
    const svgUrl = browser.runtime.getURL(`flags/${countryCode}.svg`);
    fetch(svgUrl).then(response => {
      if (response.ok) {
        flagIcon.src = svgUrl;
      } else {
        flagIcon.src = browser.runtime.getURL('flags/earth.svg');
      }
    }).catch(() => {
      flagIcon.src = browser.runtime.getURL('flags/earth.svg');
    });
  } else {
    flagIcon.src = browser.runtime.getURL('flags/earth.svg');
  }
}

// Load and display actions
async function loadActions(data) {
  const actionsSection = document.getElementById('actionsSection');
  actionsSection.innerHTML = '';

  const storage = await browser.storage.sync.get(['actions']);
  const actions = storage.actions || getDefaultActions();
  const enabledActions = actions.filter(action => action.enabled !== false);

  for (const action of enabledActions) {
    const button = createActionButton(action, data);
    if (button) actionsSection.appendChild(button);
  }
}

// Get default actions
function getDefaultActions() {
  return [
    { id: 'domain-whois', name: 'domainWhois', url: 'https://r.sb/{domain}', icon: '🔍', enabled: true },
    { id: 'ip-whois', name: 'ipWhois', url: 'https://r.sb/{ip}', icon: '📍', enabled: true },
    { id: 'asn-whois', name: 'asnWhois', url: 'https://r.sb/{asn}', icon: '🌐', enabled: true },
    { id: 'copy-ip', name: 'copyIP', url: '', icon: '📋', enabled: true, isAction: true }
  ];
}

// Create action button
function createActionButton(action, data) {
  const button = document.createElement('button');
  button.className = 'action-btn';

  const icon = document.createElement('span');
  icon.className = 'action-icon';
  icon.textContent = action.icon || '🔗';
  button.appendChild(icon);

  const text = document.createElement('span');
  const actionText = browser.i18n.getMessage(action.name) || action.name;
  text.textContent = actionText;
  button.appendChild(text);

  if (action.isAction && action.id === 'copy-ip') {
    button.addEventListener('click', async () => {
      if (data.ip) {
        await copyToClipboard(data.ip);
        const originalText = text.textContent;
        text.textContent = browser.i18n.getMessage('copied');
        button.classList.add('success');
        setTimeout(() => {
          text.textContent = originalText;
          button.classList.remove('success');
        }, 2000);
      }
    });
  } else if (action.url) {
    button.addEventListener('click', () => {
      let url = action.url;
      if (data.domain) url = url.replace('{domain}', encodeURIComponent(data.domain));
      if (data.ip) url = url.replace('{ip}', encodeURIComponent(data.ip));
      if (data.asn) url = url.replace('{asn}', encodeURIComponent(`AS${data.asn}`));
      if (data.countryCode) url = url.replace('{country_code}', encodeURIComponent(data.countryCode));
      browser.tabs.create({ url });
    });
  }
  return button;
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');

    try {
      await browser.runtime.sendMessage({
        type: 'REFRESH_TAB_DATA',
        tabId: currentTabId
      });
    } catch (e) {
      console.log('Refresh message error:', e);
    }

    await browser.tabs.reload(currentTabId);

    setTimeout(async () => {
      await loadTabData();
      btn.classList.remove('spinning');
    }, 1000);
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
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
