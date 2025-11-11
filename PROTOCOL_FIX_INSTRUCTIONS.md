# Protocol Detection Fix Instructions

## The Problem
`chrome.scripting` is undefined even though the `scripting` permission is in manifest.json.

## The Solution

### Step 1: Verify Manifest Permissions
Your `manifest.json` already has the correct permissions:
```json
"permissions": [
  "webRequest",
  "activeTab",
  "storage",
  "clipboardWrite",
  "scripting"  // ✅ This is correct
]
```

### Step 2: COMPLETELY Reload the Extension

**IMPORTANT**: Just clicking refresh is NOT enough. You must:

1. Go to `chrome://extensions/`
2. Find Flagium
3. Click **"Remove"** button (not just disable)
4. Confirm removal
5. Click **"Load unpacked"** again
6. Select the flagium folder
7. Accept all permissions when prompted

### Step 3: Test Protocol Detection

1. Visit https://www.google.com
2. Wait for page to fully load
3. Click the Flagium extension icon
4. Check the popup - Protocol should show HTTP/3

### Step 4: Debug in Popup Console

Right-click the popup → Inspect → Console

You should see debug output like:
```
[Flagium] Checking available Chrome APIs...
[Flagium] chrome.scripting exists? true  // Should be true after reload
[Flagium] Using chrome.scripting.executeScript...
[Flagium] Protocol detected successfully: HTTP/3 (raw: h3)
```

## If chrome.scripting Still Not Available

The extension now has 3 fallback methods:

1. **Method 1**: chrome.scripting.executeScript (best, requires reload)
2. **Method 2**: chrome.tabs.executeScript (older API, might work)
3. **Method 3**: Message to content script (always works)

The extension will automatically try each method until one works.

## Expected Results

- **Google, YouTube, Cloudflare** → HTTP/3
- **GitHub, Microsoft** → HTTP/2
- **Older sites** → HTTP/1.1

## Troubleshooting

If still showing HTTP/1.1:

1. Check popup console for which method is being used
2. Run `await testInjection()` in popup console
3. Check if content script is loaded (check page console for `[Flagium]` logs)

## Why This Happens

Chrome requires a COMPLETE extension removal and re-add for new permissions to take effect. A simple refresh doesn't reload the permission model.