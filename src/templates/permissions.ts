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
  username: string | null = null,
  hasAuditApprover: boolean = false
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
    return layout("User Permissions", content, isAdmin, hasPcPwView, username, hasAuditApprover);
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
              <label class="label">Plant <span class="text-red-500">*</span></label>
              <select name="plant_id" id="plant-select" class="select-field" required>
                <option value="">Select Plant (required)</option>
                <option value="0" selected>All (Global)</option>
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
                <option value="audit-approver">audit-approver - Review and approve inventory audits</option>
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
                    // Use readonly attribute instead of disabled to ensure value is submitted
                    plantSelect.setAttribute('readonly', 'true');
                    // Add Tailwind classes for readonly styling (works in light and dark mode)
                    plantSelect.classList.add('bg-gray-100', 'dark:bg-gray-800', 'cursor-not-allowed', 'opacity-75');
                  } else {
                    plantSelect.removeAttribute('readonly');
                    // Remove readonly styling classes
                    plantSelect.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'cursor-not-allowed', 'opacity-75');
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

      <!-- Expiring Permissions Section -->
      <div class="card mt-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Expiring & Expired Permissions
          </h2>
          <select id="expiry-days-filter" class="select-field w-auto text-sm" onchange="loadExpiringPermissions()">
            <option value="7">Next 7 days</option>
            <option value="14">Next 14 days</option>
            <option value="30" selected>Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
          </select>
        </div>
        <div id="expiring-permissions-container">
          <div class="text-center py-4 text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>

      <!-- Permission Audit Log Section -->
      <div class="card mt-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Permission Audit Log
          </h2>
          <div class="flex items-center gap-2">
            <select id="audit-user-filter" class="select-field w-auto text-sm">
              <option value="">All Users</option>
              ${data.users.filter(u => u.active).map(u => '<option value="' + escapeHtml(u.user_id) + '">' + escapeHtml(u.name) + '</option>').join('')}
            </select>
            <button type="button" onclick="loadAuditLog()" class="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Filter
            </button>
          </div>
        </div>
        <div id="audit-log-container">
          <div class="text-center py-4 text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
        <div id="audit-log-pagination" class="flex justify-center mt-4 gap-2"></div>
      </div>
    </div>

    <script>
      let auditLogOffset = 0;
      const auditLogLimit = 20;

      async function loadExpiringPermissions() {
        const days = document.getElementById('expiry-days-filter').value;
        const container = document.getElementById('expiring-permissions-container');

        try {
          const response = await fetch('/api/permissions/expiring?days=' + days);
          if (!response.ok) throw new Error('Failed to fetch');

          const data = await response.json();

          if (data.expiring.length === 0 && data.expired.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400">No expiring or expired permissions found.</div>';
            return;
          }

          let html = '';

          if (data.expired.length > 0) {
            html += '<div class="mb-4">' +
              '<h3 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Expired (' + data.expired.length + ')</h3>' +
              '<div class="overflow-x-auto"><table class="w-full text-sm"><thead>' +
              '<tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">' +
              '<th class="py-2 px-2">User</th><th class="py-2 px-2">Plant</th><th class="py-2 px-2">Permission</th><th class="py-2 px-2">Role</th><th class="py-2 px-2">Expired</th></tr></thead><tbody>' +
              data.expired.map(function(p) {
                return '<tr class="border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">' +
                  '<td class="py-2 px-2 text-red-600 dark:text-red-400">' + (p.user_name || p.user_id) + '</td>' +
                  '<td class="py-2 px-2 text-red-600 dark:text-red-400">' + (p.plant_id === 0 ? 'All (global)' : (p.plant_name || 'Unknown')) + '</td>' +
                  '<td class="py-2 px-2 font-mono text-xs text-red-600 dark:text-red-400">' + p.permission + '</td>' +
                  '<td class="py-2 px-2"><span class="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">' + p.role + '</span></td>' +
                  '<td class="py-2 px-2 text-red-600 dark:text-red-400">' + p.expiry_date + ' (' + p.days_since_expiry + ' days ago)</td></tr>';
              }).join('') + '</tbody></table></div></div>';
          }

          if (data.expiring.length > 0) {
            const soonExpiring = data.expiring.filter(function(p) { return p.days_until_expiry >= 0; });
            if (soonExpiring.length > 0) {
              html += '<div>' +
                '<h3 class="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Expiring Soon (' + soonExpiring.length + ')</h3>' +
                '<div class="overflow-x-auto"><table class="w-full text-sm"><thead>' +
                '<tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">' +
                '<th class="py-2 px-2">User</th><th class="py-2 px-2">Plant</th><th class="py-2 px-2">Permission</th><th class="py-2 px-2">Role</th><th class="py-2 px-2">Expires</th></tr></thead><tbody>' +
                soonExpiring.map(function(p) {
                  var rowClass = p.days_until_expiry <= 7 ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
                  var roleClass = p.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
                  var expiryClass = p.days_until_expiry <= 7 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : '';
                  return '<tr class="border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ' + rowClass + '">' +
                    '<td class="py-2 px-2">' + (p.user_name || p.user_id) + '</td>' +
                    '<td class="py-2 px-2">' + (p.plant_id === 0 ? 'All (global)' : (p.plant_name || 'Unknown')) + '</td>' +
                    '<td class="py-2 px-2 font-mono text-xs">' + p.permission + '</td>' +
                    '<td class="py-2 px-2"><span class="px-2 py-1 rounded text-xs font-medium ' + roleClass + '">' + p.role + '</span></td>' +
                    '<td class="py-2 px-2 ' + expiryClass + '">' + p.expiry_date + ' (' + p.days_until_expiry + ' days)</td></tr>';
                }).join('') + '</tbody></table></div></div>';
            }
          }

          container.innerHTML = html || '<div class="text-center py-4 text-gray-500 dark:text-gray-400">No expiring or expired permissions found.</div>';
        } catch (err) {
          container.innerHTML = '<div class="text-center py-4 text-red-500">Failed to load expiring permissions.</div>';
        }
      }

      async function loadAuditLog(resetOffset) {
        if (resetOffset !== false) auditLogOffset = 0;

        const userId = document.getElementById('audit-user-filter').value;
        const container = document.getElementById('audit-log-container');
        const pagination = document.getElementById('audit-log-pagination');

        try {
          let url = '/api/permissions/audit-log?limit=' + auditLogLimit + '&offset=' + auditLogOffset;
          if (userId) url += '&user_id=' + encodeURIComponent(userId);

          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch');

          const data = await response.json();

          if (data.data.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400">No audit log entries found.</div>';
            pagination.innerHTML = '';
            return;
          }

          function actionBadge(action) {
            switch (action) {
              case 'add': return '<span class="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">ADD</span>';
              case 'delete': return '<span class="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">DELETE</span>';
              case 'modify': return '<span class="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">MODIFY</span>';
              default: return action;
            }
          }

          container.innerHTML = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead>' +
            '<tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">' +
            '<th class="py-2 px-2">Date</th><th class="py-2 px-2">Action</th><th class="py-2 px-2">User</th>' +
            '<th class="py-2 px-2">Plant</th><th class="py-2 px-2">Permission</th><th class="py-2 px-2">Role</th>' +
            '<th class="py-2 px-2">Changed By</th><th class="py-2 px-2">Comment</th></tr></thead><tbody>' +
            data.data.map(function(l) {
              var roleDisplay = l.action === 'delete' ? '<s>' + (l.old_role || '-') + '</s>' : (l.role || '-');
              return '<tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100">' +
                '<td class="py-2 px-2 text-xs text-gray-500 dark:text-gray-400">' + new Date(l.created).toLocaleString() + '</td>' +
                '<td class="py-2 px-2">' + actionBadge(l.action) + '</td>' +
                '<td class="py-2 px-2">' + (l.user_name || l.user_id) + '</td>' +
                '<td class="py-2 px-2">' + (l.plant_id === 0 ? 'All (global)' : (l.plant_name || 'Unknown')) + '</td>' +
                '<td class="py-2 px-2 font-mono text-xs">' + l.permission + '</td>' +
                '<td class="py-2 px-2">' + roleDisplay + '</td>' +
                '<td class="py-2 px-2">' + (l.changed_by_name || l.changed_by) + '</td>' +
                '<td class="py-2 px-2 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title="' + (l.comment || '') + '">' + (l.comment || '-') + '</td></tr>';
            }).join('') + '</tbody></table></div>';

          // Pagination
          const totalPages = Math.ceil(data.total / auditLogLimit);
          const currentPage = Math.floor(auditLogOffset / auditLogLimit) + 1;

          if (totalPages > 1) {
            let paginationHtml = '';
            if (currentPage > 1) {
              paginationHtml += '<button onclick="auditLogOffset = ' + ((currentPage - 2) * auditLogLimit) + '; loadAuditLog(false);" class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Prev</button>';
            }
            paginationHtml += '<span class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">Page ' + currentPage + ' of ' + totalPages + '</span>';
            if (currentPage < totalPages) {
              paginationHtml += '<button onclick="auditLogOffset = ' + (currentPage * auditLogLimit) + '; loadAuditLog(false);" class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Next</button>';
            }
            pagination.innerHTML = paginationHtml;
          } else {
            pagination.innerHTML = '';
          }
        } catch (err) {
          container.innerHTML = '<div class="text-center py-4 text-red-500">Failed to load audit log. The table may not exist yet - please run migrations.</div>';
          pagination.innerHTML = '';
        }
      }

      // Load on page load
      document.addEventListener('DOMContentLoaded', function() {
        loadExpiringPermissions();
        loadAuditLog();
      });
    </script>
  `;

  return layout("User Permissions", content, isAdmin, hasPcPwView, null, hasAuditApprover);
}

