/**
 * Navigation menu component
 * Returns the HTML for the hamburger menu navigation
 */
export function navigationMenu(isAdmin: boolean = false, hasPcPwView: boolean = false): string {
  return `
    <div id="nav-links" class="hidden flex-col absolute left-0 top-12 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 min-w-[200px] z-50 transition-colors">
      <a href="/" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Search</a>
      <a href="/locations" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Locations</a>
      <a href="/types" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Configurations</a>
      <a href="/vendors" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Providers</a>
      <a href="/write-off-reasons" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Write-Off Reasons</a>
      <a href="/repairs" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Repair Tracking</a>
      <a href="/pc-pw" class="block ${hasPcPwView ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white' : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'} font-medium transition-colors">PC Passwords</a>
      <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
      <a href="/change-password" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Change Password</a>
      ${isAdmin 
        ? '<a href="/permissions" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">User Permissions</a>'
        : '<span class="block text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 font-medium">User Permissions</span>'
      }
    </div>
  `;
}
