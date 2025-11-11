# Privacy Policy for Flagium

*Last Updated: November 2024*

## Overview

Flagium is a browser extension that displays server location and network information for websites you visit. We are committed to protecting your privacy and being transparent about our data practices.

**Key Point: Flagium does NOT collect, store, or transmit any personal information about you.**

## Our Single Purpose

Flagium has one simple purpose: to show you where websites are physically hosted by displaying their server location, IP address, and network information.

## What Information We Access

### 1. Website Server Information
When you visit a website and click the Flagium icon, we access:
- **Server IP addresses** (the website's server, NOT your IP)
- **Domain names** of websites you're viewing
- **HTTP protocol information** (HTTP/1.1, HTTP/2, HTTP/3)
- **Response headers** from the website server

### 2. Geographic Data
We determine the geographic location of website servers:
- **Country and city** where the server is located
- **ISP/Organization** operating the server
- **ASN (Autonomous System Number)** of the network

**Important:** This is the website server's location, not your location.

## How We Use Information

### Local Caching
- Server location data is cached locally in your browser for performance
- Cache duration is configurable (default: 60 minutes)
- Cache can be cleared anytime through extension settings
- All cached data remains in your browser only

### User Preferences
We store your settings locally:
- Your preferred interface language
- Cache duration preference
- Custom action configurations
- These settings never leave your browser

## External Services

### IP Geolocation API
- We use `api.ip.sb` to determine server geographic locations
- Only the website's server IP is sent to this service
- Your personal IP address is never sent
- No cookies or tracking are involved

### WHOIS Lookups
- Optional WHOIS lookups open `r.sb` in a new tab
- This is a user-initiated action (clicking a button)
- No automatic data transmission occurs

## What We DON'T Do

❌ **No Personal Data Collection**
- We don't collect your name, email, or any personal information
- We don't track your browsing history
- We don't create user profiles

❌ **No User Tracking**
- No analytics or tracking scripts
- No unique user identifiers
- No cookies

❌ **No Data Selling**
- We don't sell any data
- We don't share data with third parties
- We don't use data for advertising

❌ **No Remote Code**
- All extension code runs locally
- No external JavaScript is loaded
- No remote code execution

## Data Storage

### Local Storage Only
All data is stored locally using Chrome's storage API:
- Server location cache
- User preferences
- Custom actions

### User Control
You have complete control over your data:
- Clear cache anytime via settings
- Reset all settings to defaults
- Uninstalling the extension removes all data

## Permissions Explained

Each permission is used only for the stated purpose:

| Permission | Purpose |
|------------|---------|
| `webRequest` | Read server IP addresses from HTTP responses |
| `activeTab` | Access info about the current tab you're viewing |
| `storage` | Save your preferences and cache data locally |
| `clipboardWrite` | Copy IP addresses when you click "Copy IP" |
| `scripting` | Detect HTTP protocol version (HTTP/2, HTTP/3) |
| `<all_urls>` | Work on any website you choose to check |

## Updates to This Policy

We may update this privacy policy to reflect changes to our practices or for legal reasons. Updates will be posted on this page with a revised "Last Updated" date.

## Open Source

Flagium is open source. You can review our code at:
https://github.com/showfom/flagium

## Contact

If you have questions about this privacy policy or Flagium's data practices:
- Create an issue on GitHub: https://github.com/showfom/flagium/issues
- Email: [Your contact email]

## Summary

✅ **Your privacy is protected:**
- All data stays in your browser
- We only look at server information, not user information
- You have full control over all stored data
- No tracking, profiling, or data collection

---

*Flagium - See where websites are hosted, not where you are.*