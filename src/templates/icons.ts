/**
 * Heroicons library
 * Centralized collection of commonly used Heroicons for consistent UI
 * All icons use the standard Heroicons pattern: fill="none" stroke="currentColor" viewBox="0 0 24 24"
 */

/**
 * Generate an icon SVG with customizable size and classes
 */
function iconSvg(paths: string | string[], size: string = "w-5 h-5", className: string = ""): string {
  const pathArray = Array.isArray(paths) ? paths : [paths];
  const pathsHtml = pathArray.map(path => `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${path}"/>`).join("");
  const classAttr = className ? ` ${className}` : "";
  // Ensure icons inherit text color and are not black - use text-current to inherit parent color
  const colorClass = "text-current";
  return `<svg class="${size} ${colorClass}${classAttr}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${pathsHtml}</svg>`;
}

// Navigation & Menu Icons
export const SEARCH_ICON = iconSvg("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z");
export const LOCATION_ICON = iconSvg("M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z");
export const COG_ICON = iconSvg("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z");
export const SHOPPING_BAG_ICON = iconSvg("M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z");
export const X_CIRCLE_ICON = iconSvg("M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z");
export const WRENCH_ICON = iconSvg("M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z");
export const KEY_ICON = iconSvg("M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z");
export const USER_GROUP_ICON = iconSvg("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z");
export const LOCK_CLOSED_ICON = iconSvg("M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z");

// Action Icons
export const PLUS_ICON = iconSvg("M12 4v16m8-8H4");
export const MINUS_ICON = iconSvg("M20 12H4");
export const ARROW_LEFT_ICON = iconSvg("M10 19l-7-7m0 0l7-7m-7 7h18");
export const ARROW_RIGHT_ICON = iconSvg("M14 5l7 7m0 0l-7 7m7-7H3");
export const ARROW_UP_ICON = iconSvg("M5 15l7-7 7 7");
export const ARROW_DOWN_ICON = iconSvg("M19 9l-7 7-7-7");
export const CHEVRON_LEFT_ICON = iconSvg("M15 19l-7-7 7-7");
export const CHEVRON_RIGHT_ICON = iconSvg("M9 5l7 7-7 7");
export const CHEVRON_UP_ICON = iconSvg("M5 15l7-7 7 7");
export const CHEVRON_DOWN_ICON = iconSvg("M19 9l-7 7-7-7");

// Status Icons
export const CHECK_CIRCLE_ICON = iconSvg("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z");
export const EXCLAMATION_CIRCLE_ICON = iconSvg("M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
export const EXCLAMATION_TRIANGLE_ICON = iconSvg("M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z");
export const INFORMATION_CIRCLE_ICON = iconSvg("M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
export const X_ICON = iconSvg("M6 18L18 6M6 6l12 12");

// File & Document Icons
export const DOCUMENT_TEXT_ICON = iconSvg("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z");
export const FOLDER_ICON = iconSvg("M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z");

// Equipment & Hardware Icons
export const COMPUTER_DESKTOP_ICON = iconSvg("M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z");
export const DEVICE_PHONE_MOBILE_ICON = iconSvg("M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z");

// Export existing icons from buttons.ts for backward compatibility
export const TRASH_ICON = iconSvg("M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16");
export const EDIT_ICON = iconSvg("M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z");
export const PRINTER_ICON = iconSvg("M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z");
export const CHECK_ICON = iconSvg("M5 13l4 4L19 7");
export const ARCHIVE_ICON = iconSvg("M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4");
export const CLIPBOARD_CHECK_ICON = iconSvg("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4");
export const LOGOUT_ICON = iconSvg("M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1");

// Additional Icons
export const REFRESH_ICON = iconSvg("M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15");
export const USER_ICON = iconSvg("M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z");
export const CLOCK_ICON = iconSvg("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z");
export const CPU_ICON = iconSvg("M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z");
export const SHIELD_CHECK_ICON = iconSvg("M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z");
export const CALENDAR_ICON = iconSvg("M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z");
export const TAG_ICON = iconSvg("M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z");
export const QR_CODE_ICON = iconSvg("M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z");
export const CLIPBOARD_LIST_ICON = iconSvg("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01");
export const OFFICE_BUILDING_ICON = iconSvg("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4");
export const MENU_ALT_ICON = iconSvg("M4 6h16M4 12h16M4 18h7");
export const BARS_3_ICON = iconSvg("M4 6h16M4 12h16M4 18h16");
export const EXTERNAL_LINK_ICON = iconSvg("M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14");
export const EMOJI_SAD_ICON = iconSvg("M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
export const CLIPBOARD_ICON = iconSvg("M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z");
export const DOWNLOAD_ICON = iconSvg("M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z");
export const LOCK_ICON = iconSvg("M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z");
export const HOME_ICON = iconSvg("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6");

// Theme Icons
export const SUN_ICON = iconSvg("M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z");
export const MOON_ICON = iconSvg("M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z");

// Filled Icons (use fill instead of stroke)
function filledIconSvg(path: string, size: string = "w-5 h-5", viewBox: string = "0 0 24 24"): string {
  return `<svg class="${size} text-current" fill="none" viewBox="${viewBox}"><path d="${path}" fill="currentColor"/></svg>`;
}

export const QR_SCAN_ICON = filledIconSvg("M4,4h6v6H4V4M20,4v6H14V4h6M14,15h2V13H14V11h2v2h2V11h2v2H18v2h2v3H18v2H16V18H13v2H11V16h3V15m2,0v3h2V15H16M4,20V14h6v6H4M6,6V8H8V6H6M16,6V8h2V6H16M6,16v2H8V16H6M4,11H6v2H4V11m5,0h4v4H11V13H9V11m2-5h2v4H11V6M2,2V6H0V2A2,2,0,0,1,2,0H6V2H2M22,0a2,2,0,0,1,2,2V6H22V2H18V0h4M2,18v4H6v2H2a2,2,0,0,1-2-2V18H2m20,4V18h2v4a2,2,0,0,1-2,2H18V22Z", "w-5 h-5", "0 0 25 25");

// Helper function to create icon with custom size
export function icon(iconName: keyof typeof iconMap, size: string = "w-5 h-5", className: string = ""): string {
  const iconSvg = iconMap[iconName];
  if (!iconSvg) return "";
  // Replace size classes
  return iconSvg.replace(/w-\d+ h-\d+/, size).replace(/class="/, `class="${className} `);
}

// Icon map for easy access
const iconMap = {
  search: SEARCH_ICON,
  location: LOCATION_ICON,
  cog: COG_ICON,
  shoppingBag: SHOPPING_BAG_ICON,
  xCircle: X_CIRCLE_ICON,
  wrench: WRENCH_ICON,
  key: KEY_ICON,
  userGroup: USER_GROUP_ICON,
  lockClosed: LOCK_CLOSED_ICON,
  plus: PLUS_ICON,
  minus: MINUS_ICON,
  arrowLeft: ARROW_LEFT_ICON,
  arrowRight: ARROW_RIGHT_ICON,
  arrowUp: ARROW_UP_ICON,
  arrowDown: ARROW_DOWN_ICON,
  chevronLeft: CHEVRON_LEFT_ICON,
  chevronRight: CHEVRON_RIGHT_ICON,
  chevronUp: CHEVRON_UP_ICON,
  chevronDown: CHEVRON_DOWN_ICON,
  checkCircle: CHECK_CIRCLE_ICON,
  exclamationCircle: EXCLAMATION_CIRCLE_ICON,
  exclamationTriangle: EXCLAMATION_TRIANGLE_ICON,
  informationCircle: INFORMATION_CIRCLE_ICON,
  x: X_ICON,
  documentText: DOCUMENT_TEXT_ICON,
  folder: FOLDER_ICON,
  computerDesktop: COMPUTER_DESKTOP_ICON,
  devicePhoneMobile: DEVICE_PHONE_MOBILE_ICON,
  trash: TRASH_ICON,
  edit: EDIT_ICON,
  printer: PRINTER_ICON,
  check: CHECK_ICON,
  archive: ARCHIVE_ICON,
  clipboardCheck: CLIPBOARD_CHECK_ICON,
  refresh: REFRESH_ICON,
  user: USER_ICON,
  clock: CLOCK_ICON,
  cpu: CPU_ICON,
  shieldCheck: SHIELD_CHECK_ICON,
  calendar: CALENDAR_ICON,
  tag: TAG_ICON,
  qrCode: QR_CODE_ICON,
  clipboardList: CLIPBOARD_LIST_ICON,
  officeBuilding: OFFICE_BUILDING_ICON,
  menuAlt: MENU_ALT_ICON,
  bars3: BARS_3_ICON,
  externalLink: EXTERNAL_LINK_ICON,
  emojiSad: EMOJI_SAD_ICON,
  clipboard: CLIPBOARD_ICON,
  download: DOWNLOAD_ICON,
  lock: LOCK_ICON,
  home: HOME_ICON,
  sun: SUN_ICON,
  moon: MOON_ICON,
};
