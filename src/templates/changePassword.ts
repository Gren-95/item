import { layout } from "./layout";

export function changePasswordPage(success: string | null = null, error: string | null = null, isAdmin: boolean = false, hasPcPwView: boolean = false, username: string | null = null): string {
  const successAlert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : "";

  const errorAlert = error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-md mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h1>
        </div>

        ${successAlert}
        ${errorAlert}

        <form method="POST" action="/change-password" class="space-y-6">
          <div>
            <label for="old_password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="old_password"
              name="old_password"
              required
              autofocus
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label for="new_password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="new_password"
              name="new_password"
              required
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              placeholder="Enter your new password"
            />
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Password must be at least 8 characters and contain both uppercase and lowercase letters.
            </p>
          </div>

          <div>
            <label for="confirm_password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              required
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              placeholder="Confirm your new password"
            />
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              class="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Change Password
            </button>
            <a
              href="/"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  `;

  return layout("Change Password", content, isAdmin, hasPcPwView, username);
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

