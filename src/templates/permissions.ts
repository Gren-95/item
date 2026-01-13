import { layout } from "./layout";
import { button, deleteButton } from "./buttons";
import { USER_GROUP_ICON } from "./icons";

interface User {
  user_id: string;
  user: string;
  name: string;
  mail: string;
  active: boolean;
  employee_no: string | null;
}

interface Permission {
  id: number;
  user_id: string;
  permission: string;
  role: string;
  comment: string;
  start_date: string;
  end_date: string;
  plant_id?: number;
  expiry_date?: string | null;
  added_by_user_id?: string | null;
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

function escapeHtml(str: string | null | undefined | number | Date): string {
  if (str === null || str === undefined) return "";
  // Convert to string if not already
  const strValue = String(str);
  return strValue
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function permissionsPage(
  data: PermissionsData,
  isAdmin: boolean,
  hasPcPwView: boolean = false,
  success = "",
  error = "",
  username: string | null = null
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
    return layout("User Permissions", content, isAdmin, hasPcPwView, username);
  }

  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex items-center gap-2">
          ${USER_GROUP_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Permissions</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage user permissions for the IT Equipment Management system</p>
      </div>

      ${alert}

      <div class="card">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Permission</h2>
          <form id="add-permission-form" method="POST" action="/permissions" class="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input type="hidden" name="action" value="add">
            <div>
              <label class="label">User</label>
              <select name="user_id" id="form-user-id" class="select-field" required>
                <option value="">Select User</option>
                ${data.users
                  .filter((u) => u.active)
                  .map(
                    (u) =>
                      `<option value="${escapeHtml(u.user_id)}">${escapeHtml(u.name)} (${escapeHtml(u.user)})</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div>
              <label class="label">Plant</label>
              <select name="plant_id" id="plant-select" class="select-field" required>
                <option value="">Select Plant</option>
                <option value="0">All</option>
                ${data.plants && data.plants.length > 0
                  ? data.plants
                      .map((plant) => `<option value="${plant.id}">${escapeHtml(plant.name)}</option>`)
                      .join("")
                  : ""}
              </select>
            </div>
            <div>
              <label class="label">Permission</label>
              <select name="access_key" id="permission-select" class="select-field" required>
                <option value="">Select Permission</option>
                <option value="login">login - Access to login to the system</option>
                <option value="global_admin">global_admin - Full access across all plants</option>
                <option value="edit">edit - Manage equipment (search, add, and edit)</option>
                <option value="locations_edit">locations_edit - Manage locations (view/add/edit/delete)</option>
                <option value="types_edit">types_edit - Manage types/configurations (view/add/edit/delete)</option>
                <option value="vendors_edit">vendors_edit - Manage vendors/suppliers (view/add/edit/delete)</option>
                <option value="write_off_reasons_edit">write_off_reasons_edit - Manage write-off reasons (view/add/edit/delete)</option>
                <option value="repairs">repairs - Manage repairs (view, manage, and send equipment to repair)</option>
                <option value="pc_pw_view">pc_pw_view - View PC passwords</option>
                <option value="pc_pw_edit">pc_pw_edit - Edit PC passwords</option>
              </select>
            </div>
            <div>
              <label class="label">Role</label>
              <select name="value" id="form-value" class="select-field" required>
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
                id="form-comment"
                class="input-field"
                placeholder="Permission description"
                required
                autocomplete="off"
              />
            </div>
            <div>
              <label class="label">Expiry Date (optional)</label>
              <input
                type="date"
                name="expiry_date"
                id="form-expiry-date"
                class="input-field"
                placeholder="Leave empty for no expiry"
              />
            </div>
            <div class="flex items-end">
              ${button("Add Permission", { type: "submit", variant: "primary", fullWidth: true }).replace('<button', '<button id="submit-permission-btn"')}
            </div>
          </form>
          <script>
            (function() {
              // Set default expiry date to 4 months from today
              const expiryDateInput = document.getElementById('form-expiry-date');
              if (expiryDateInput) {
                const today = new Date();
                const fourMonthsLater = new Date(today);
                fourMonthsLater.setMonth(today.getMonth() + 4);
                const year = fourMonthsLater.getFullYear();
                const month = String(fourMonthsLater.getMonth() + 1).padStart(2, '0');
                const day = String(fourMonthsLater.getDate()).padStart(2, '0');
                expiryDateInput.value = \`\${year}-\${month}-\${day}\`;
              }

              const permissionSelect = document.getElementById('permission-select');
              const plantSelect = document.getElementById('plant-select');
              
              if (permissionSelect && plantSelect) {
                permissionSelect.addEventListener('change', function() {
                  const permission = this.value.trim().toLowerCase();
                  if (permission === 'login' || permission === 'global_admin') {
                    // Force plant_id to 0 for global permissions
                    plantSelect.value = '0';
                    plantSelect.disabled = true;
                  } else {
                    plantSelect.disabled = false;
                  }
                });
              }

              // Handle form submission via AJAX to preserve form values
              const form = document.getElementById('add-permission-form');
              if (form) {
                form.addEventListener('submit', async function(e) {
                  e.preventDefault();
                  
                  const submitBtn = document.getElementById('submit-permission-btn');
                  const originalText = submitBtn?.textContent || 'Add Permission';
                  
                  // Disable submit button
                  if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Adding...';
                  }
                  
                  try {
                    const formData = new FormData(form);
                    const response = await fetch('/permissions', {
                      method: 'POST',
                      body: formData
                    });
                    
                    // Check if response is a redirect
                    if (response.redirected || response.status === 303 || response.status === 302) {
                      // Parse the redirect URL to get success/error message
                      const redirectUrl = response.url || response.headers.get('Location') || window.location.href;
                      const url = new URL(redirectUrl, window.location.origin);
                      const success = url.searchParams.get('success');
                      const error = url.searchParams.get('error');
                      
                      if (success) {
                        // Show success message and reload page to show new permission in table
                        // But preserve form values by storing them
                        const formValues = {
                          user_id: document.getElementById('form-user-id')?.value || '',
                          plant_id: plantSelect?.value || '',
                          access_key: permissionSelect?.value || '',
                          value: document.getElementById('form-value')?.value || '',
                          comment: document.getElementById('form-comment')?.value || '',
                          expiry_date: document.getElementById('form-expiry-date')?.value || ''
                        };
                        
                        // Store in sessionStorage
                        sessionStorage.setItem('permissionFormValues', JSON.stringify(formValues));
                        
                        // Reload page to show updated table
                        window.location.href = '/permissions?success=' + encodeURIComponent(success);
                      } else if (error) {
                        // Show error message without reloading
                        window.location.href = '/permissions?error=' + encodeURIComponent(error);
                      } else {
                        // Just reload
                        window.location.reload();
                      }
                    } else {
                      // Handle non-redirect response
                      const text = await response.text();
                      if (response.ok) {
                        window.location.reload();
                      } else {
                        alert('Error: ' + text);
                        if (submitBtn) {
                          submitBtn.disabled = false;
                          submitBtn.textContent = originalText;
                        }
                      }
                    }
                  } catch (err) {
                    alert('Error submitting form: ' + err.message);
                    if (submitBtn) {
                      submitBtn.disabled = false;
                      submitBtn.textContent = originalText;
                    }
                  }
                });
              }

              // Restore form values from sessionStorage if available
              const savedValues = sessionStorage.getItem('permissionFormValues');
              if (savedValues) {
                try {
                  const values = JSON.parse(savedValues);
                  if (document.getElementById('form-user-id')) document.getElementById('form-user-id').value = values.user_id || '';
                  if (plantSelect) plantSelect.value = values.plant_id || '';
                  if (permissionSelect) permissionSelect.value = values.access_key || '';
                  if (document.getElementById('form-value')) document.getElementById('form-value').value = values.value || '';
                  if (document.getElementById('form-comment')) document.getElementById('form-comment').value = values.comment || '';
                  // Only restore expiry date if it was saved, otherwise use default
                  if (values.expiry_date && document.getElementById('form-expiry-date')) {
                    document.getElementById('form-expiry-date').value = values.expiry_date;
                  }
                  
                  // Clear saved values after restoring
                  sessionStorage.removeItem('permissionFormValues');
                  
                  // Trigger permission select handler to update plant select if needed
                  if (permissionSelect && permissionSelect.value) {
                    permissionSelect.dispatchEvent(new Event('change'));
                  }
                } catch (e) {
                  console.error('Error restoring form values:', e);
                }
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
                <th class="py-3 px-2">Expiry Date</th>
                <th class="py-3 px-2">Added By</th>
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
                      const user = data.users.find((u) => u.user_id === perm.user_id);
                      const plantName = perm.plant_id === 0 
                        ? "All (global)" 
                        : (perm.plant_id && data.plantMap?.[perm.plant_id] ? data.plantMap[perm.plant_id] : "Unknown");
                      
                      // Check if permission is expired
                      // Compare dates at midnight to avoid timezone issues
                      const isExpired = perm.expiry_date 
                        ? (() => {
                            const expiryDate = new Date(perm.expiry_date + 'T00:00:00');
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return expiryDate < today;
                          })()
                        : false;
                      
                      // Style row based on expiry status
                      const rowClass = isExpired
                        ? "border-b border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-red-50 dark:bg-red-900/10"
                        : "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors";
                      
                      const textClass = isExpired
                        ? "text-red-600 dark:text-red-400"
                        : "text-white dark:text-white";
                      
                      const expiryDateDisplay = perm.expiry_date 
                        ? escapeHtml(perm.expiry_date)
                        : '<span class="text-gray-400 dark:text-gray-500 italic">Never</span>';
                      
                      const addedByDisplay = perm.added_by_user_id
                        ? escapeHtml(perm.added_by_user_id)
                        : '<span class="text-gray-400 dark:text-gray-500 italic">Unknown</span>';
                      
                      return `
                        <tr class="${rowClass}">
                          <td class="py-3 px-2">
                            <div class="font-medium ${textClass}">
                              ${escapeHtml(user?.name || "Unknown")}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              ${escapeHtml(user?.user || "")}
                            </div>
                          </td>
                          <td class="py-3 px-2 ${textClass}">${escapeHtml(plantName)}</td>
                          <td class="py-3 px-2 font-mono text-xs ${textClass}">${escapeHtml(perm.permission)}</td>
                          <td class="py-3 px-2">
                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              perm.role === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            }">
                              ${escapeHtml(perm.role)}
                            </span>
                          </td>
                          <td class="py-3 px-2 ${textClass}">${escapeHtml(perm.comment)}</td>
                          <td class="py-3 px-2 ${isExpired ? 'text-red-600 dark:text-red-400 font-semibold' : textClass}">
                            ${expiryDateDisplay}
                            ${isExpired ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">EXPIRED</span>' : ''}
                          </td>
                          <td class="py-3 px-2 ${textClass}">${addedByDisplay}</td>
                          <td class="py-3 px-2">
                            <form method="POST" action="/permissions" class="inline" onsubmit="return confirm('Are you sure you want to delete this permission?');">
                              <input type="hidden" name="action" value="delete">
                              <input type="hidden" name="permission_id" value="${perm.id}">
                              ${deleteButton({ type: "submit" })}
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

  return layout("User Permissions", content, isAdmin, hasPcPwView);
}

