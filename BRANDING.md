# Branding Guidelines

This document defines the consistent color palette and branding standards for the IT Equipment Management application.

## Color Palette

### Primary Colors

**Blue (Primary Action)**
- Light Mode: `#2563eb` (blue-600)
- Dark Mode: `#3b82f6` (blue-500)
- Usage: Primary buttons, links, active states, brand elements
- Tailwind: `bg-blue-600`, `text-blue-600`, `border-blue-600`

**Gray (Neutral)**
- Light Background: `#f9fafb` (gray-50)
- Dark Background: `#111827` (gray-900)
- Light Surface: `#ffffff` (white)
- Dark Surface: `#1f2937` (gray-800)
- Usage: Backgrounds, cards, borders, text
- Tailwind: `bg-gray-50`, `bg-gray-900`, `bg-white`, `bg-gray-800`

### Semantic Colors

**Success (Green)**
- Light Mode: `#16a34a` (green-600)
- Dark Mode: `#22c55e` (green-500)
- Usage: Success messages, positive actions
- Tailwind: `bg-green-600`, `text-green-600`

**Error/Warning (Red)**
- Light Mode: `#dc2626` (red-600)
- Dark Mode: `#b91c1c` (red-700)
- Usage: Error messages, destructive actions, warnings
- Tailwind: `bg-red-600`, `text-red-600`

### Theme Colors

**Light Theme**
- Primary: `#2563eb` (blue-600)
- Background: `#f9fafb` (gray-50)
- Surface: `#ffffff` (white)
- Text Primary: `#111827` (gray-900)
- Text Secondary: `#6b7280` (gray-500)

**Dark Theme**
- Primary: `#3b82f6` (blue-500)
- Background: `#111827` (gray-900)
- Surface: `#1f2937` (gray-800)
- Text Primary: `#ffffff` (white)
- Text Secondary: `#9ca3af` (gray-400)

## Icon Specifications

### Favicon
- Format: ICO (multi-resolution) and PNG
- Sizes: 16x16, 32x32, 48x48
- Location: `/public/icons/favicon.ico`, `/public/icons/favicon-16x16.png`, `/public/icons/favicon-32x32.png`

### PWA Icons
- Format: PNG
- Sizes: 192x192, 512x512 (required)
- Additional sizes: 96x96, 144x144, 384x384 (recommended)
- Purpose: `any` and `maskable` (for adaptive icons)
- Location: `/public/icons/icon-{size}.png`

### Design Guidelines
- Icons should use the primary blue color (`#2563eb`) as the main brand color
- Icons should be simple, recognizable, and work well at small sizes
- Icons should have sufficient contrast for both light and dark themes
- Maskable icons should have a safe zone (80% of the icon area) for content

## Implementation

### HTML Meta Tags
```html
<link rel="icon" href="/icons/favicon.ico" type="image/x-icon">
<link rel="icon" href="/icons/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/icons/favicon-16x16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

### Manifest Configuration
The `manifest.webmanifest` file should include all icon sizes with proper purposes:
- `any`: Standard icon for all contexts
- `maskable`: Icon that can be masked by the OS (Android adaptive icons)

### Theme Color Meta Tags
```html
<meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)">
```

## Consistency Checklist

- [x] Color palette defined and documented
- [x] Theme colors set in HTML meta tags
- [x] Primary colors used consistently across UI components
- [x] Dark mode colors defined
- [x] Icon specifications documented
- [x] Favicon configured correctly in HTML
- [x] Manifest includes all icon sizes with proper purposes
- [x] Tests verify branding configuration
- [ ] Icons created in all required sizes (see `/public/icons/README.md`)
- [ ] Icons tested across browsers and devices

## Icon Creation Instructions

To complete the branding implementation, create the following icon files:

1. **Favicon.ico**: Multi-resolution ICO file containing 16x16, 32x32, and 48x48 sizes
2. **Favicon PNGs**: 16x16 and 32x32 PNG files
3. **PWA Icons**: 192x192 and 512x512 PNG files

All icons should:
- Use the primary blue color (`#2563eb`) as the main brand color
- Be simple and recognizable at small sizes
- Have sufficient contrast
- For maskable icons: Keep content within 80% safe zone

See `/public/icons/README.md` for detailed specifications and generation tools.

