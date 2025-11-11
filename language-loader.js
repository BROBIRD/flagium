// Language loader for dynamic language switching
// This allows changing language without restarting the extension

const SUPPORTED_LANGUAGES = ['en', 'zh_CN', 'zh_TW', 'ja', 'es', 'fr', 'de', 'ru', 'id', 'pt_BR', 'pt_PT'];

// Load language messages from a specific locale
async function loadLanguageMessages(lang) {
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`Failed to load language ${lang}:`, error);
  }

  // Fallback to English
  try {
    const response = await fetch(chrome.runtime.getURL('_locales/en/messages.json'));
    return await response.json();
  } catch (error) {
    console.error('Failed to load fallback language:', error);
    return {};
  }
}

// Get the current language from storage or browser
async function getCurrentLanguage() {
  const storage = await chrome.storage.sync.get(['language']);
  let lang = storage.language || 'auto';

  if (lang === 'auto') {
    // Use browser language
    lang = chrome.i18n.getUILanguage();
    // Convert to our format (e.g., zh-CN to zh_CN)
    lang = lang.replace('-', '_');

    // Check if we support this language
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      // Try just the language code without region
      const baseLang = lang.split('_')[0];
      if (baseLang === 'zh') {
        // Default Chinese to Simplified
        lang = 'zh_CN';
      } else if (baseLang === 'pt') {
        // Check if it's Brazilian Portuguese
        if (lang === 'pt_BR') {
          lang = 'pt_BR';
        } else {
          // Default Portuguese to Portugal variant
          lang = 'pt_PT';
        }
      } else if (SUPPORTED_LANGUAGES.includes(baseLang)) {
        lang = baseLang;
      } else {
        // Default to English
        lang = 'en';
      }
    }
  }

  return lang;
}

// Apply language to the current page
async function applyLanguage() {
  const lang = await getCurrentLanguage();
  const messages = await loadLanguageMessages(lang);

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const messageObj = messages[key];

    if (messageObj && messageObj.message) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = messageObj.message;
      } else {
        element.textContent = messageObj.message;
      }
    }
  });

  // Update page title if on options page
  if (window.location.pathname.includes('options.html')) {
    const settingsMsg = messages['settings'];
    if (settingsMsg) {
      document.title = `Flagium - ${settingsMsg.message}`;
    }
  }

  return messages;
}

// Export for use in other scripts
window.languageLoader = {
  loadLanguageMessages,
  getCurrentLanguage,
  applyLanguage
};