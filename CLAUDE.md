# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flagium is a Chrome Extension (Manifest V3) that displays server location and network information for websites. It shows country flags, IP addresses, ISP details, and provides quick access to WHOIS lookups.

## Key Architecture

### Extension Components
- **background.js**: Service worker that intercepts HTTP responses, extracts IP addresses, fetches geolocation data from api.ip.sb, and manages caching
- **popup.js/popup.html**: Main UI that displays server information when users click the extension icon
- **options.js/options.html**: Settings page for language selection, cache management, and custom action configuration
- **styles.css**: Shared styling with automatic dark mode support

### Data Flow
1. background.js monitors webRequest events for main frame responses
2. Extracts domain, IP, protocol version, and HSTS headers from responses
3. Fetches geolocation data from `https://api.ip.sb/geoip/{IP}` (no API key required)
4. Caches data with configurable TTL (default 60 minutes) using key format `{domain}_{ip}`
5. Updates extension icon to show country flag using OffscreenCanvas API
6. popup.js retrieves cached data via Chrome runtime messaging when opened

### Important Implementation Details

**IP Detection Logic** (background.js:57-89):
- Skips local addresses: localhost, 127.0.0.1, ::1, .local domains
- Skips private IPs: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, fc00::/7, fe80::/10
- Only processes public IP addresses for geolocation lookup

**Caching System** (background.js:91-130):
- In-memory cache using Map objects: `ipCache` and `tabData`
- Cache expiry configurable from 1-1440 minutes via settings
- Cache key format: `{domain}_{ip}` to handle CDNs with multiple IPs

**Icon Rendering** (background.js:275-338):
- Uses OffscreenCanvas to render SVG flags at multiple sizes (16, 32, 48, 128px)
- Applies rounded corners (borderRadius: 2) to flag icons
- Falls back to default icon on errors or unknown countries

## Common Development Tasks

### Loading the Extension for Development
```bash
# No build step required - load directly in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the flagium directory
```

### Generating PNG Icons from SVG
```bash
# Option 1: Using ImageMagick
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png

# Option 2: Using Node.js script (requires canvas package)
node generate_png_icons.js

# Option 3: Open generate_icons.html in browser for manual generation
```

### Testing Different Languages
```javascript
// Change language in options.js or test via Chrome DevTools console:
chrome.storage.sync.set({ language: 'zh_CN' }); // Simplified Chinese
chrome.storage.sync.set({ language: 'ja' });    // Japanese
chrome.storage.sync.set({ language: 'auto' });  // Auto-detect
```

### Adding New Localizations
1. Create new directory under `_locales/` with language code (e.g., `_locales/fr/`)
2. Copy `_locales/en/messages.json` as template
3. Translate all message values (140+ strings)
4. Add language option to options.html:45-50 and options.js:18-22

### Debugging Background Service Worker
```bash
# View service worker logs:
# 1. Open chrome://extensions/
# 2. Find Flagium and click "Inspect views: service worker"
# 3. Console will show all background.js logs

# Force reload service worker:
# Click "Update" button on chrome://extensions/ page
```

### Testing Cache Functionality
```javascript
// Clear all cache (in popup or background console):
chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });

// Force refresh for current tab:
chrome.runtime.sendMessage({ type: 'REFRESH_TAB_DATA', tabId: currentTabId });
```

## Custom Action URL Templates

When adding custom actions, these placeholders are available:
- `{domain}` - Current website domain
- `{ip}` - Server IP address
- `{asn}` - Autonomous System Number (without "AS" prefix)
- `{country_code}` - Two-letter ISO country code

Example custom actions:
```javascript
// Shodan search
{ name: "Shodan", url: "https://www.shodan.io/host/{ip}", emoji: "🔍" }

// VirusTotal domain check
{ name: "VirusTotal", url: "https://www.virustotal.com/gui/domain/{domain}", emoji: "🛡️" }

// BGP routing info
{ name: "BGP Info", url: "https://bgp.he.net/AS{asn}", emoji: "🌐" }
```

## Message Passing Protocol

Background ↔ Popup communication:
```javascript
// Request types handled by background.js:
{ type: 'GET_TAB_DATA', tabId: number }      // Returns cached tab data
{ type: 'CLEAR_CACHE' }                      // Clears all cached data
{ type: 'REFRESH_TAB_DATA', tabId: number }  // Forces cache refresh

// Response format:
{
  domain: string,
  ip: string,
  country: string,
  country_code: string,
  city: string,
  organization: string,
  asn: number,
  isp: string,
  protocol: string,      // "HTTP/1.1", "h2", "h3"
  hsts: boolean,
  isLocal: boolean,      // true for localhost/private IPs
  isPrivate: boolean
}
```

## Chrome Storage Schema

```javascript
// chrome.storage.sync structure:
{
  language: 'auto' | 'en' | 'zh_CN' | 'zh_TW' | 'ja',
  cacheExpiry: number,  // 1-1440 minutes, default 60
  actions: [
    {
      name: string,      // Action display name
      url: string,       // URL template with placeholders
      emoji: string,     // Emoji icon for button
      enabled: boolean   // Show/hide in popup
    }
  ]
}
```

## Key Files and Their Roles

- **manifest.json**: Chrome Extension configuration, permissions, and entry points
- **_locales/**/messages.json**: i18n strings (140+ keys per language)
- **flags/**: 271 country flag SVGs named by ISO codes (us.svg, gb.svg, etc.)
- **icons/**: Extension icons - SVG source and PNG placeholders (need generation)

## API Dependencies

- **GeoIP API**: `https://api.ip.sb/geoip/{IP}` - No authentication required, returns JSON with location data
- **WHOIS lookups**: Default actions use `https://r.sb/{query}` for domain/IP/ASN lookups

## Performance Considerations

- Cache TTL balances freshness vs API calls (default 60 minutes)
- OffscreenCanvas API used for efficient flag rendering without DOM
- Debounced tab updates to avoid excessive processing
- Only active tab's data is fetched, not all tabs

## Security Notes

- Extension requires `<all_urls>` permission to intercept any website's IP
- No external analytics or tracking
- All data stored locally in browser
- API calls only made on-demand when popup opened or cache expired