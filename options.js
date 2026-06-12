// Flagium Options Script
// Handles settings page functionality with i18n support

// Current actions list
let currentActions = [];
let editingActionIndex = -1;

// Default actions (same as in background.js)
const DEFAULT_ACTIONS = [
  {
    id: 'domain-whois',
    name: 'domainWhois',
    url: 'https://r.sb/{domain}',
    icon: '🔍',
    enabled: true,
    isDefault: true
  },
  {
    id: 'ip-whois',
    name: 'ipWhois',
    url: 'https://r.sb/{ip}',
    icon: '📍',
    enabled: true,
    isDefault: true
  },
  {
    id: 'asn-whois',
    name: 'asnWhois',
    url: 'https://r.sb/{asn}',
    icon: '🌐',
    enabled: true,
    isDefault: true
  },
  {
    id: 'copy-ip',
    name: 'copyIP',
    url: '',
    icon: '📋',
    enabled: true,
    isDefault: true,
    isAction: true
  }
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize i18n
  initializeI18n();

  // Load settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();
});

// Initialize i18n for all elements
function initializeI18n() {
  // Replace text for all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = browser.i18n.getMessage(key);
    if (message) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = message;
      } else if (element.tagName === 'OPTION') {
        element.textContent = message;
      } else {
        element.textContent = message;
      }
    }
  });

  // Set page title
  document.title = `Flagium - ${browser.i18n.getMessage('settings')}`;
}

// Load all settings
async function loadSettings() {
  const storage = await browser.storage.sync.get(['language', 'cacheExpiry', 'actions']);

  // Language
  const languageSelect = document.getElementById('languageSelect');
  languageSelect.value = storage.language || 'auto';

  // Cache expiry
  const cacheExpiryInput = document.getElementById('cacheExpiry');
  cacheExpiryInput.value = storage.cacheExpiry || 60;

  // Actions
  currentActions = storage.actions || DEFAULT_ACTIONS;
  renderActionsList();
}

// Render actions list
function renderActionsList() {
  const actionList = document.getElementById('actionList');
  actionList.innerHTML = '';

  currentActions.forEach((action, index) => {
    const actionItem = createActionItem(action, index);
    actionList.appendChild(actionItem);
  });
}

// Create action item element
function createActionItem(action, index) {
  const item = document.createElement('div');
  item.className = 'action-item';

  // First row container for icon and info
  const firstRow = document.createElement('div');
  firstRow.className = 'action-item-row';

  // Icon
  const icon = document.createElement('span');
  icon.className = 'action-item-icon';
  icon.textContent = action.icon || '🔗';
  firstRow.appendChild(icon);

  // Info
  const info = document.createElement('div');
  info.className = 'action-item-info';

  const name = document.createElement('div');
  name.className = 'action-item-name';
  // Use i18n for default actions, otherwise use the custom name
  if (action.isDefault && action.name) {
    name.textContent = browser.i18n.getMessage(action.name) || action.name;
  } else {
    name.textContent = action.name || 'Unnamed Action';
  }
  info.appendChild(name);

  if (action.url) {
    const url = document.createElement('div');
    url.className = 'action-item-url';
    url.textContent = action.url;
    info.appendChild(url);
  }

  firstRow.appendChild(info);
  item.appendChild(firstRow);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'action-item-controls';

  // Toggle switch
  const toggleSwitch = document.createElement('label');
  toggleSwitch.className = 'toggle-switch';

  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = action.enabled !== false;
  toggleInput.addEventListener('change', () => {
    action.enabled = toggleInput.checked;
    saveActions();
  });
  toggleSwitch.appendChild(toggleInput);

  const toggleSlider = document.createElement('span');
  toggleSlider.className = 'toggle-slider';
  toggleSwitch.appendChild(toggleSlider);

  controls.appendChild(toggleSwitch);

  // Edit button (not for Copy IP action)
  if (!action.isAction || action.id !== 'copy-ip') {
    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = browser.i18n.getMessage('edit');
    editBtn.addEventListener('click', () => {
      openActionModal(action, index);
    });
    controls.appendChild(editBtn);
  }

  // Delete button (not for default actions)
  if (!action.isDefault) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = browser.i18n.getMessage('delete');
    deleteBtn.addEventListener('click', () => {
      deleteAction(index);
    });
    controls.appendChild(deleteBtn);
  }

  item.appendChild(controls);

  return item;
}

// Open action modal for add/edit
function openActionModal(action = null, index = -1) {
  const modal = document.getElementById('actionModal');
  const modalTitle = document.getElementById('modalTitle');
  const nameInput = document.getElementById('actionName');
  const urlInput = document.getElementById('actionUrl');
  const iconInput = document.getElementById('actionIcon');

  editingActionIndex = index;

  if (action) {
    // Edit mode
    modalTitle.textContent = browser.i18n.getMessage('edit') || 'Edit Action';
    nameInput.value = action.isDefault ? '' : action.name || '';
    urlInput.value = action.url || '';
    iconInput.value = action.icon || '🔗';

    // Disable name editing for default actions
    nameInput.disabled = action.isDefault;
  } else {
    // Add mode
    modalTitle.textContent = browser.i18n.getMessage('addAction');
    nameInput.value = '';
    urlInput.value = '';
    iconInput.value = '🔗';
    nameInput.disabled = false;
  }

  modal.classList.add('show');
}

// Close action modal
function closeActionModal() {
  const modal = document.getElementById('actionModal');
  modal.classList.remove('show');
  editingActionIndex = -1;
}

// Save action from modal
function saveActionFromModal() {
  const nameInput = document.getElementById('actionName');
  const urlInput = document.getElementById('actionUrl');
  const iconInput = document.getElementById('actionIcon');

  if (editingActionIndex >= 0) {
    // Update existing action
    const action = currentActions[editingActionIndex];
    if (!action.isDefault) {
      action.name = nameInput.value.trim() || 'Unnamed Action';
    }
    action.url = urlInput.value.trim();
    action.icon = iconInput.value.trim() || '🔗';
  } else {
    // Add new action
    const newAction = {
      id: `custom-${Date.now()}`,
      name: nameInput.value.trim() || 'Unnamed Action',
      url: urlInput.value.trim(),
      icon: iconInput.value.trim() || '🔗',
      enabled: true,
      isDefault: false
    };
    currentActions.push(newAction);
  }

  saveActions();
  closeActionModal();
}

// Delete action
function deleteAction(index) {
  if (confirm(browser.i18n.getMessage('confirmDelete') || 'Are you sure you want to delete this action?')) {
    currentActions.splice(index, 1);
    saveActions();
  }
}

// Save actions to storage
async function saveActions() {
  try {
    await browser.storage.sync.set({ actions: currentActions });
    renderActionsList();
    showSaveStatus();
  } catch (error) {
    console.error('Error saving actions:', error);
  }
}

// Save general settings
async function saveSettings() {
  const languageSelect = document.getElementById('languageSelect');
  const cacheExpiryInput = document.getElementById('cacheExpiry');

  const settings = {
    language: languageSelect.value,
    cacheExpiry: parseInt(cacheExpiryInput.value) || 60
  };

  try {
    await browser.storage.sync.set(settings);
    showSaveStatus();

    // If language changed, reload the page to apply new language
    if (settings.language !== 'auto') {
      // Note: Chrome's i18n doesn't support runtime language change
      // The extension will use the new language on next startup
      // For now, we'll just show the save status
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Show save status
function showSaveStatus() {
  const status = document.getElementById('saveStatus');
  if (status) {
    // Update the text content with i18n message
    const statusText = status.querySelector('span');
    if (statusText) {
      statusText.textContent = browser.i18n.getMessage('saved') || 'Settings saved successfully!';
    } else {
      status.textContent = browser.i18n.getMessage('saved') || 'Settings saved successfully!';
    }

    status.classList.remove('hidden');
    setTimeout(() => {
      status.classList.add('hidden');
    }, 2000);
  } else {
    // Create save status element if it doesn't exist
    const statusDiv = document.createElement('div');
    statusDiv.id = 'saveStatus';
    statusDiv.className = 'save-status';
    statusDiv.textContent = browser.i18n.getMessage('saved') || 'Settings saved successfully!';
    document.body.appendChild(statusDiv);

    setTimeout(() => {
      statusDiv.remove();
    }, 2000);
  }
}

// Save all settings
async function saveAllSettings() {
  const languageSelect = document.getElementById('languageSelect');
  const cacheExpiryInput = document.getElementById('cacheExpiry');

  const currentLanguage = await browser.storage.sync.get(['language']);
  const oldLanguage = currentLanguage.language || 'auto';
  const newLanguage = languageSelect.value;

  const settings = {
    language: newLanguage,
    cacheExpiry: parseInt(cacheExpiryInput.value) || 60,
    actions: currentActions
  };

  try {
    await browser.storage.sync.set(settings);
    showSaveStatus();

    // If language changed, apply new language dynamically or reload
    if (oldLanguage !== newLanguage) {
      setTimeout(async () => {
        // Try to apply language dynamically if language loader is available
        if (window.languageLoader) {
          await window.languageLoader.applyLanguage();
        } else {
          // Otherwise, reload the page to apply changes
          window.location.reload();
        }
      }, 500);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Reset all settings and actions to defaults
async function resetToDefaults() {
  try {
    // Reset language to auto
    document.getElementById('languageSelect').value = 'auto';

    // Reset cache expiry to 60 minutes
    document.getElementById('cacheExpiry').value = 60;

    // Reset actions to defaults
    currentActions = [...DEFAULT_ACTIONS];

    // Save all settings
    await browser.storage.sync.set({
      language: 'auto',
      cacheExpiry: 60,
      actions: DEFAULT_ACTIONS
    });

    // Re-render actions list
    renderActionsList();

    // Show success message
    const btn = document.getElementById('resetActionsBtn');
    const originalText = btn.textContent;
    btn.textContent = browser.i18n.getMessage('resetComplete') || 'Reset complete!';
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);

    // Show save status
    showSaveStatus();
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    alert(browser.i18n.getMessage('resetError') || 'Error resetting settings. Please try again.');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveSettingsBtn').addEventListener('click', saveAllSettings);

  // Language change (no auto-save)
  document.getElementById('languageSelect').addEventListener('change', () => {
    // Mark as unsaved (optional: add visual indicator)
  });

  // Cache expiry change (no auto-save)
  document.getElementById('cacheExpiry').addEventListener('change', () => {
    // Mark as unsaved (optional: add visual indicator)
  });

  // Clear cache button
  document.getElementById('clearCacheBtn').addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'CLEAR_CACHE' });
    const btn = document.getElementById('clearCacheBtn');
    const originalText = btn.textContent;
    btn.textContent = browser.i18n.getMessage('cacheCleared') || 'Cache cleared!';
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  });

  // Add action button
  document.getElementById('addActionBtn').addEventListener('click', () => {
    openActionModal();
  });

  // Reset settings button
  document.getElementById('resetActionsBtn').addEventListener('click', async () => {
    if (confirm(browser.i18n.getMessage('confirmResetSettings') || 'Are you sure you want to reset all settings and actions to defaults? This cannot be undone.')) {
      await resetToDefaults();
    }
  });

  // Modal save button
  document.getElementById('modalSave').addEventListener('click', () => {
    saveActionFromModal();
  });

  // Modal cancel button
  document.getElementById('modalCancel').addEventListener('click', () => {
    closeActionModal();
  });

  // Close modal on outside click
  document.getElementById('actionModal').addEventListener('click', (e) => {
    if (e.target.id === 'actionModal') {
      closeActionModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeActionModal();
    }
  });
}

// Add animation style
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);