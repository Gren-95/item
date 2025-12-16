# Icon Files

This directory contains the application icons and favicons.

## Required Files

### Favicon Files
- `favicon.ico` - Multi-resolution ICO file (16x16, 32x32, 48x48)
- `favicon-16x16.png` - 16x16 PNG favicon
- `favicon-32x32.png` - 32x32 PNG favicon

### PWA Icons
- `icon-192x192.png` - 192x192 PNG icon (for PWA and Apple touch icon)
- `icon-512x512.png` - 512x512 PNG icon (for PWA)

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

⚠️ **Note**: Icon files need to be created. The application is configured to use these icons, but the actual image files must be generated separately.

Once icons are created, they should be placed in this directory and the application will automatically use them.

