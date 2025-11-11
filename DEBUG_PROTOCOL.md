# Protocol Debugging Guide

## Important: Must Do First

1. **Completely Reload Extension**
   - chrome://extensions/
   - Find Flagium
   - Click "Remove"
   - Reload page
   - Click "Load unpacked"
   - Select flagium folder
   - Accept all permissions

2. **Restart Chrome** (if above doesn't work)

## Debugging Steps

### 1. Open Popup Console

1. Visit https://www.google.com
2. Click extension icon to open popup
3. **Right-click on popup** → **Inspect**
4. Open Console tab

### 2. View Debug Information

You should see logs like:

```
updateProtocolInfo called with data: {domain: "www.google.com", ...}
Current tab: https://www.google.com/ id: 123
Attempting to inject script into tab: 123
Script execution results: [{result: {raw: "h3", formatted: "HTTP/3"}}]
Protocol detected successfully: {raw: "h3", formatted: "HTTP/3"}
```

### 3. If No Logs

Run manually in popup console:

```javascript
// Test 1: View current data
console.log('Current data:', currentTabData);

// Test 2: Manually call update function
updateProtocolInfo(currentTabData);

// Test 3: Direct injection test
chrome.scripting.executeScript({
  target: { tabId: currentTabId },
  func: () => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? nav.nextHopProtocol : 'Not found';
  }
}).then(r => console.log('Direct test result:', r));
```

### 4. Check Permission Issues

Run in popup console:

```javascript
// Check if has scripting permission
chrome.permissions.contains({
  permissions: ['scripting']
}, (result) => {
  console.log('Has scripting permission:', result);
});

// Check current tab info
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  console.log('Current tab:', tabs[0]);
});
```

## Possible Issues and Solutions

### Issue 1: No Log Output
**Solution**:
- Ensure you opened popup console, not Service Worker console
- Reload extension and restart Chrome

### Issue 2: `Cannot access contents of this page`
**Solution**:
- Extension cannot run on certain pages (like chrome:// pages)
- Try on regular websites like google.com

### Issue 3: `chrome.scripting is undefined`
**Solution**:
- Must completely remove and reload extension
- manifest.json must include "scripting" permission

### Issue 4: Logs Show But Protocol Still HTTP/1.1
**Solution**:
- Check results in logs
- Page may not be fully loaded, wait a few seconds

## Manual Test Performance API

Run in **webpage console** (F12):

```javascript
const nav = performance.getEntriesByType('navigation')[0];
console.log('Protocol:', nav.nextHopProtocol);
```

Should display `"h3"` or `"h2"`

## Final Solution (If Nothing Works)

Manually set in popup console:

```javascript
// Force update display
document.getElementById('protocol').textContent = 'HTTP/3';
```

If this works, it's a detection logic issue.

## Information to Provide When Reporting Issues

1. All logs from popup console
2. Results from test commands above
3. Chrome version (chrome://version/)
4. Website URL visited