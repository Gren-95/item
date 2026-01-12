# Icon Files

This directory contains the application icons and favicons.

## Required Files

### Favicon Files
- `favicon.ico` - Multi-resolution ICO file
- `favicon.svg` - SVG favicon (modern browsers)
- `favicon-96x96.png` - 96x96 PNG favicon

### Apple Touch Icon
- `apple-touch-icon.png` - Apple touch icon for iOS devices

### PWA Icons
- `web-app-manifest-192x192.png` - 192x192 PNG icon (for PWA)
- `web-app-manifest-512x512.png` - 512x512 PNG icon (for PWA)

## Icon Design Guidelines

### Colors
- Primary color: `#2563eb` (blue-600)
- Background: White or transparent
- Should work well on both light and dark backgrounds

### Design Requirements
- Simple and recognizable at small sizes
- High contrast for visibility
- Works as both "any" and "maskable" purpose icons
- For maskable icons: Keep important content within 80% safe zone (centered)

### Generation Tools
Icons can be generated using:
- Online tools: [RealFaviconGenerator](https://realfavicongenerator.net/), [Favicon.io](https://favicon.io/)
- Command line: ImageMagick, Inkscape
- Design tools: Figma, Adobe Illustrator, GIMP

## Current Status

✅ **Icons are configured**: All required icon files are present and the application is configured to use them.

