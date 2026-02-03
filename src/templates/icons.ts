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
};
