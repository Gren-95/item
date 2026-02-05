import { SEARCH_ICON, LOCATION_ICON, COG_ICON, SHOPPING_BAG_ICON, X_CIRCLE_ICON, WRENCH_ICON, KEY_ICON, USER_GROUP_ICON, LOCK_CLOSED_ICON, CLIPBOARD_CHECK_ICON, LOGOUT_ICON, PRINTER_ICON } from "./icons";

const MENU_LINK_CLASSES = "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-all";
const MENU_LINK_DISABLED = "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed font-medium";
const MENU_ICON_SIZE = "w-5 h-5";

function menuIcon(icon: string): string {
  return icon.replace('w-5 h-5', MENU_ICON_SIZE);
}

/**
 * Navigation menu component
 * Returns the HTML for the hamburger menu navigation
 */
export function navigationMenu(isAdmin: boolean = false, hasPcPwView: boolean = false, _hasAuditApprover: boolean = false, username: string | null = null): string {
  return `
    <div id="nav-links" class="hidden flex-col absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 min-w-[260px] z-50 transition-all overflow-hidden">
      <!-- Navigation Links -->
      <div class="p-2">
        <nav class="space-y-1">
          <a href="/" class="${MENU_LINK_CLASSES}">
            ${menuIcon(SEARCH_ICON)}
            Search Equipment
          </a>
          <a href="/locations" class="${MENU_LINK_CLASSES}">
            ${menuIcon(LOCATION_ICON)}
            Locations
          </a>
          <a href="/types" class="${MENU_LINK_CLASSES}">
            ${menuIcon(COG_ICON)}
            Configurations
          </a>
          <a href="/vendors" class="${MENU_LINK_CLASSES}">
            ${menuIcon(SHOPPING_BAG_ICON)}
            Providers
          </a>
          <a href="/write-off-reasons" class="${MENU_LINK_CLASSES}">
            ${menuIcon(X_CIRCLE_ICON)}
            Write-Off Reasons
          </a>
          <a href="/repairs" class="${MENU_LINK_CLASSES}">
            ${menuIcon(WRENCH_ICON)}
            Repair Tracking
          </a>
          <a href="/inventory-audit" class="${MENU_LINK_CLASSES}">
            ${menuIcon(CLIPBOARD_CHECK_ICON)}
            Inventory Audit
          </a>
          <a href="/printer-labels" class="${MENU_LINK_CLASSES}">
            ${menuIcon(PRINTER_ICON)}
            Printer Labels
          </a>
          ${hasPcPwView
            ? `<a href="/pc-pw" class="${MENU_LINK_CLASSES}">${menuIcon(KEY_ICON)}PC Passwords</a>`
            : `<span class="${MENU_LINK_DISABLED}">${menuIcon(KEY_ICON)}PC Passwords</span>`
          }
        </nav>

        <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

        <!-- Account Section -->
        <nav class="space-y-1">
          <a href="/change-password" class="${MENU_LINK_CLASSES}">
            ${menuIcon(LOCK_CLOSED_ICON)}
            Change Password
          </a>
          ${isAdmin
            ? `<a href="/permissions" class="${MENU_LINK_CLASSES}">${menuIcon(USER_GROUP_ICON)}User Permissions</a>`
            : `<span class="${MENU_LINK_DISABLED}">${menuIcon(USER_GROUP_ICON)}User Permissions</span>`
          }
        </nav>

        <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

        <!-- Theme Selector -->
        <div class="px-3 py-2">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Theme</p>
          <div id="theme-selector" class="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            <button id="theme-light" class="theme-btn flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" data-theme="light">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
              Light
            </button>
            <button id="theme-dark" class="theme-btn flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" data-theme="dark">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
              Dark
            </button>
            <button id="theme-system" class="theme-btn flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" data-theme="system">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              System
            </button>
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

        <!-- Logout -->
        <button id="logout-btn" class="flex items-center justify-between w-full px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all text-left" ${username ? `data-username="${username}"` : ''}>
          <span class="flex items-center gap-3">
            ${menuIcon(LOGOUT_ICON)}
            Sign Out
          </span>
          ${username ? `<span class="text-xs text-gray-500 dark:text-gray-400">${username}</span>` : ''}
        </button>
      </div>
    </div>
  `;
}
