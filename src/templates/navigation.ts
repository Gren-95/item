import { SEARCH_ICON, LOCATION_ICON, COG_ICON, SHOPPING_BAG_ICON, X_CIRCLE_ICON, WRENCH_ICON, KEY_ICON, USER_GROUP_ICON, LOCK_CLOSED_ICON } from "./icons";

/**
 * Navigation menu component
 * Returns the HTML for the hamburger menu navigation
 */
export function navigationMenu(isAdmin: boolean = false, hasPcPwView: boolean = false): string {
  return `
    <div id="nav-links" class="hidden flex-col absolute left-0 top-12 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 min-w-[200px] z-50 transition-colors">
      <a href="/" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${SEARCH_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Search
      </a>
      <a href="/locations" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${LOCATION_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Edit Locations
      </a>
      <a href="/types" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${COG_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Edit Configurations
      </a>
      <a href="/vendors" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${SHOPPING_BAG_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Edit Providers
      </a>
      <a href="/write-off-reasons" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${X_CIRCLE_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Edit Write-Off Reasons
      </a>
      <a href="/repairs" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${WRENCH_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Repair Tracking
      </a>
      <a href="/pc-pw" class="flex items-center gap-2 ${hasPcPwView ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white' : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'} font-medium transition-colors">
        ${KEY_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        PC Passwords
      </a>
      <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
      <a href="/change-password" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
        ${LOCK_CLOSED_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
        Change Password
      </a>
      ${isAdmin 
        ? `<a href="/permissions" class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
            ${USER_GROUP_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
            User Permissions
          </a>`
        : `<span class="flex items-center gap-2 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 font-medium">
            ${USER_GROUP_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-current')}
            User Permissions
          </span>`
      }
    </div>
  `;
}
