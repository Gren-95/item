import { layout } from "./layout";

interface User {
  id: number;
  user: string;
  name: string;
  mail: string;
  active: boolean;
  employee_no: string | null;
}

interface Permission {
  id: number;
  user_id: number;
  access_key: string;
  value: string;
  comment: string;
  start_date: string;
  end_date: string;
}

interface PermissionsData {
  users: User[];
  permissions: Permission[];
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

export function permissionsPage(
  data: PermissionsData,
  isAdmin: boolean,
  success = "",
  error = ""
): string {
  // If not admin, show only insufficient permissions message
  if (!isAdmin) {
    const content = `
      <div class="max-w-6xl mx-auto">
        <div class="card">
          <div class="text-center py-12">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insufficient Permissions</h2>
            <p class="text-gray-600 dark:text-gray-400">You do not have admin permission to access this page.</p>
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Please contact your administrator if you need access.</p>
          </div>
        </div>
      </div>
    `;
    return layout("User Permissions", content, isAdmin);
  }

  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Permissions</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage user permissions for the IT Equipment Management system</p>
      </div>

      ${alert}

      <div class="card">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Permission</h2>
          <form method="POST" action="/permissions" class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input type="hidden" name="action" value="add">
            <div>
              <label class="label">User</label>
              <select name="user_id" class="select-field" required>
                <option value="">Select User</option>
                ${data.users
                  .filter((u) => u.active)
                  .map(
                    (u) =>
                      `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.user)})</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div>
              <label class="label">Access Key</label>
              <input
                type="text"
                name="access_key"
                class="input-field"
                value="item"
                required
              />
            </div>
            <div>
              <label class="label">Value</label>
              <input
                type="text"
                name="value"
                class="input-field"
                list="permission-values"
                autocomplete="off"
                placeholder="Enter permission value"
                required
              />
              <datalist id="permission-values">
                <option value="login">Login</option>
                <option value="admin">Admin</option>
              </datalist>
            </div>
            <div>
              <label class="label">Comment</label>
              <input
                type="text"
                name="comment"
                class="input-field"
                placeholder="Permission description"
                required
              />
            </div>
            <div class="flex items-end">
              <button type="submit" class="btn btn-primary w-full">
                Add Permission
              </button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th class="py-3 px-2">User</th>
                <th class="py-3 px-2">Access Key</th>
                <th class="py-3 px-2">Value</th>
                <th class="py-3 px-2">Comment</th>
                <th class="py-3 px-2">Start Date</th>
                <th class="py-3 px-2">End Date</th>
                <th class="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.permissions.length === 0
                ? `<tr>
                    <td colspan="7" class="py-8 text-center text-gray-500 dark:text-gray-400">
                      No permissions found
                    </td>
                  </tr>`
                : data.permissions
                    .map(
                      (perm) => {
                        const user = data.users.find((u) => u.id === perm.user_id);
                        return `
                        <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td class="py-3 px-2">
                            <div class="font-medium text-gray-900 dark:text-white">
                              ${escapeHtml(user?.name || "Unknown")}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              ${escapeHtml(user?.user || "")}
                            </div>
                          </td>
                          <td class="py-3 px-2 text-gray-700 dark:text-gray-300">${escapeHtml(perm.access_key)}</td>
                          <td class="py-3 px-2">
                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              perm.value === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            }">
                              ${escapeHtml(perm.value)}
                            </span>
                          </td>
                          <td class="py-3 px-2 text-gray-700 dark:text-gray-300">${escapeHtml(perm.comment)}</td>
                          <td class="py-3 px-2 text-gray-700 dark:text-gray-300">${escapeHtml(perm.start_date)}</td>
                          <td class="py-3 px-2 text-gray-700 dark:text-gray-300">${escapeHtml(perm.end_date)}</td>
                          <td class="py-3 px-2">
                            <form method="POST" action="/permissions" class="inline" onsubmit="return confirm('Are you sure you want to delete this permission?');">
                              <input type="hidden" name="action" value="delete">
                              <input type="hidden" name="permission_id" value="${perm.id}">
                              <button type="submit" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      `;
                      }
                    )
                    .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  return layout("User Permissions", content, isAdmin);
}

