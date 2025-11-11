# Flagium - Chrome Extension for Network Information

Flagium is a Chrome extension that displays server location and network information for websites, similar to Flagfox but designed for Chromium-based browsers.

## Features

- 🌍 **Server Location Display**: Shows the country flag and location of the website's server
- 🔍 **Network Information**: Displays IP address, ISP/Organization, ASN, and more
- 🌐 **Multi-language Support**: Supports English, Simplified Chinese, Traditional Chinese, and Japanese
- 🎯 **Custom Actions**: Configurable quick actions for WHOIS lookups and more
- 🔒 **Security Information**: Shows HSTS status and HTTP protocol version
- ⚡ **Smart Caching**: Caches IP and location data to reduce API calls
- 🎨 **Dark Mode Support**: Automatically adapts to your browser theme

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `flagium` directory
5. The extension icon will appear in your toolbar

### Converting Icons (Optional)

The extension includes placeholder PNG icons. For production use, you should convert the SVG icon to PNG:

```bash
# Using ImageMagick (if installed)
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png

# Or use an online converter like https://svgtopng.com/
```

## Usage

1. **View Network Info**: Click the extension icon in the toolbar to see information about the current website
2. **Quick Actions**: Use the action buttons to:
   - Look up domain WHOIS information
   - Check IP WHOIS details
   - View ASN information
   - Copy the IP address to clipboard
3. **Settings**: Click the Settings button to:
   - Change the interface language
   - Manage custom actions
   - Configure cache settings

## Features in Detail

### Information Displayed

- **Domain**: The website's domain name
- **IP Address**: Server's IPv4 or IPv6 address
- **Country**: Server location with flag icon
- **City**: City where the server is located
- **ISP/Organization**: Internet Service Provider or hosting organization
- **ASN**: Autonomous System Number
- **Protocol**: HTTP version (HTTP/1.1, HTTP/2, HTTP/3)
- **HSTS**: HTTP Strict Transport Security status

### Multi-language Support

The extension automatically detects your browser language and supports:
- English (en)
- 简体中文 (zh_CN)
- 繁體中文 (zh_TW)
- 日本語 (ja)

You can also manually select a language in the settings.

### Custom Actions

Default actions include:
- **Domain WHOIS**: Opens r.sb with domain information
- **IP WHOIS**: Opens r.sb with IP information
- **ASN WHOIS**: Opens r.sb with ASN details
- **Copy IP**: Copies the IP address to your clipboard

You can add custom actions with URL templates using variables:
- `{domain}` - Current domain
- `{ip}` - Server IP address
- `{asn}` - AS number
- `{country_code}` - Two-letter country code

## API Used

This extension uses the [ip.sb](https://ip.sb) GeoIP API to retrieve location information:
- Endpoint: `https://api.ip.sb/geoip/{IP}`
- No API key required
- Supports both IPv4 and IPv6

## Privacy

- The extension only queries IP information when you click the icon
- Data is cached locally to minimize API requests
- No user data is collected or transmitted
- All network requests are made directly to ip.sb

## Development

### Project Structure

```
flagium/
├── manifest.json           # Extension manifest (V3)
├── background.js          # Service worker for IP detection
├── popup.html            # Popup window HTML
├── popup.js              # Popup window logic
├── options.html          # Settings page HTML
├── options.js            # Settings page logic
├── styles.css            # Shared styles
├── _locales/             # Internationalization files
│   ├── en/messages.json
│   ├── zh_CN/messages.json
│   ├── zh_TW/messages.json
│   └── ja/messages.json
├── flags/                # Country flag SVGs (271 flags)
└── icons/                # Extension icons
```

### Building from Source

1. Install dependencies:
```bash
npm install flag-icons
```

2. The flag SVGs are already extracted to the `flags/` directory

3. Load the extension in Chrome as described in the Installation section

### Permissions Required

- `webRequest`: To intercept network requests and get IP addresses
- `activeTab`: To get information about the current tab
- `storage`: To save user preferences and cache data
- `clipboardWrite`: To copy IP addresses to clipboard
- `<all_urls>`: To monitor requests from all websites

## Troubleshooting

### No data displayed
- Ensure the website has finished loading
- Check if the site is a local address (localhost, 127.0.0.1)
- Try refreshing the page

### Flags not showing
- The extension includes 271 country flags
- Unknown countries will show the default icon

### Language not changing
- Language changes apply to new popups
- Close and reopen the popup after changing language

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source. The flag icons are from the [flag-icons](https://github.com/lipis/flag-icons) project.

## Credits

- Flag icons: [flag-icons](https://github.com/lipis/flag-icons) by lipis
- GeoIP API: [ip.sb](https://ip.sb)
- Inspired by Flagfox for Firefox

## Version History

- **1.0.0** - Initial release with full multi-language support