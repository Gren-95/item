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
  permission: string;
  role: string;
  comment: string;
  start_date: string;
  end_date: string;
  plant_id?: number;
}

interface Plant {
  id: number;
  name: string;
}

interface PermissionsData {
  users: User[];
  permissions: Permission[];
  plantMap?: Record<number, string>;
  plants?: Plant[];
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
              <label class="label">Plant</label>
              <select name="plant_id" id="plant-select" class="select-field" required>
                <option value="">Select Plant (use 0 for global)</option>
                <option value="0">All (global)</option>
                ${data.plants && data.plants.length > 0
                  ? data.plants
                      .map((plant) => `<option value="${plant.id}">${escapeHtml(plant.name)}</option>`)
                      .join("")
                  : ""}
              </select>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1" id="plant-help-text">
                Use 0 for global permissions (login, global_admin). Other permissions can be plant-specific.
              </p>
            </div>
            <div>
              <label class="label">Permission</label>
              <input
                type="text"
                name="access_key"
                id="permission-input"
                class="input-field"
                list="permission-access-keys"
                autocomplete="off"
                placeholder="Enter permission (e.g., login, search, add, edit)"
                required
              />
              <datalist id="permission-access-keys">
                <option value="login">login - Access to login to the system (global only, plant_id=0)</option>
                <option value="global_admin">global_admin - Full access across all plants (plant_id=0)</option>
                <option value="search">search - Search/view equipment</option>
                <option value="add">add - Add new equipment</option>
                <option value="edit">edit - Edit existing equipment</option>
                <option value="locations_view">locations_view - View locations</option>
                <option value="locations_add">locations_add - Add locations</option>
                <option value="locations_edit">locations_edit - Edit locations</option>
                <option value="locations_delete">locations_delete - Delete locations</option>
                <option value="types_view">types_view - View types/configurations</option>
                <option value="types_add">types_add - Add types/configurations</option>
                <option value="types_edit">types_edit - Edit types/configurations</option>
                <option value="types_delete">types_delete - Delete types/configurations</option>
                <option value="vendors_view">vendors_view - View vendors/suppliers</option>
                <option value="vendors_add">vendors_add - Add vendors/suppliers</option>
                <option value="vendors_edit">vendors_edit - Edit vendors/suppliers</option>
                <option value="vendors_delete">vendors_delete - Delete vendors/suppliers</option>
                <option value="write_off_reasons_view">write_off_reasons_view - View write-off reasons</option>
                <option value="write_off_reasons_add">write_off_reasons_add - Add write-off reasons</option>
                <option value="write_off_reasons_edit">write_off_reasons_edit - Edit write-off reasons</option>
                <option value="write_off_reasons_delete">write_off_reasons_delete - Delete write-off reasons</option>
                <option value="repairs">repairs - View and manage repairs</option>
                <option value="repairs_send">repairs_send - Send equipment to repair</option>
              </datalist>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Note: "login" permission is always global (plant_id=0). Other permissions can be plant-specific.
              </p>
            </div>
            <div>
              <label class="label">Role</label>
              <select name="value" class="select-field" required>
                <option value="">Select Role</option>
                <option value="user">user - Can perform actions immediately</option>
                <option value="admin">admin - Receives emails about approval requests and can approve/deny</option>
              </select>
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
          <script>
            (function() {
              const permissionInput = document.getElementById('permission-input');
              const plantSelect = document.getElementById('plant-select');
              const helpText = document.getElementById('plant-help-text');
              
              if (permissionInput && plantSelect && helpText) {
                permissionInput.addEventListener('input', function() {
                  const permission = this.value.trim().toLowerCase();
                  if (permission === 'login' || permission === 'global_admin') {
                    // Force plant_id to 0 for global permissions
                    plantSelect.value = '0';
                    plantSelect.disabled = true;
                    helpText.textContent = 'This permission is global only (plant_id=0 is required).';
                    helpText.classList.add('text-blue-600', 'dark:text-blue-400');
                  } else {
                    plantSelect.disabled = false;
                    helpText.textContent = 'Use 0 for global permissions (login, global_admin). Other permissions can be plant-specific.';
                    helpText.classList.remove('text-blue-600', 'dark:text-blue-400');
                  }
                });
              }
            })();
          </script>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th class="py-3 px-2">User</th>
                <th class="py-3 px-2">Plant</th>
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
                    <td colspan="8" class="py-8 text-center text-gray-500 dark:text-gray-400">
                      No permissions found
                    </td>
                  </tr>`
                : data.permissions
                    .map((perm) => {
                      const user = data.users.find((u) => u.id === perm.user_id);
                      const plantName = perm.plant_id === 0 
                        ? "All (global)" 
                        : (perm.plant_id && data.plantMap?.[perm.plant_id] ? data.plantMap[perm.plant_id] : "Unknown");
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
                          <td class="py-3 px-2 text-white dark:text-white">${escapeHtml(plantName)}</td>
                          <td class="py-3 px-2 font-mono text-xs text-white dark:text-white">${escapeHtml(perm.permission)}</td>
                          <td class="py-3 px-2">
                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              perm.role === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            }">
                              ${escapeHtml(perm.role)}
                            </span>
                          </td>
                          <td class="py-3 px-2 text-white dark:text-white">${escapeHtml(perm.comment)}</td>
                          <td class="py-3 px-2 text-white dark:text-white">${escapeHtml(perm.start_date)}</td>
                          <td class="py-3 px-2 text-white dark:text-white">${escapeHtml(perm.end_date)}</td>
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
                    })
                    .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  return layout("User Permissions", content, isAdmin);
}

