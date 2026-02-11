import { layout } from "./layout";
import { button, printButton, deleteButton } from "./buttons";
import { KEY_ICON, EXCLAMATION_CIRCLE_ICON, X_ICON, REFRESH_ICON } from "./icons";

interface PcPassword {
  id: number;
  user: string;
  evocon: string | null;
  pw: string;
  status: number;
}

interface PcPwData {
  passwords: PcPassword[];
}

function escapeHtml(str: string | null | undefined | number): string {
  if (str === null || str === undefined) return "";
  const strValue = String(str);
  return strValue
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function pcPwPage(
  data: PcPwData,
  hasView: boolean,
  hasEdit: boolean,
  isAdmin: boolean,
  hasPcPwView: boolean,
  success = "",
  error = "",
  username: string | null = null,
  hasAuditApprover: boolean = false
): string {
  // If no view permission, show insufficient permissions message
  if (!hasView) {
    const content = `
      <div class="max-w-6xl mx-auto">
        <div class="card">
          <div class="text-center py-12">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-8 h-8').replace('text-current', 'text-red-600 dark:text-red-400')}
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insufficient Permissions</h2>
            <p class="text-gray-600 dark:text-gray-400">You do not have permission to view PC passwords.</p>
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Please contact your administrator if you need access.</p>
          </div>
        </div>
      </div>
    `;
    return layout("PC Passwords", content, isAdmin, hasPcPwView, username);
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
          ${KEY_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">PC Passwords</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage computer credentials for general use accounts</p>
      </div>

      ${alert}

      ${hasEdit ? `
      <div class="card mb-6">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add User</h2>
          <form method="POST" action="/pc-pw" class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input type="hidden" name="action" value="add">
            <div>
              <label class="label">User</label>
              <input
                type="text"
                name="user"
                class="input-field"
                placeholder="Username"
                required
              />
            </div>
            <div>
              <label class="label">Evocon</label>
              <input
                type="text"
                name="evocon"
                class="input-field"
                placeholder="Evocon email (optional)"
              />
            </div>
            <div>
              <label class="label">Password</label>
              <input
                type="text"
                name="pw"
                class="input-field"
                placeholder="Password"
                required
              />
            </div>
            <div>
              <label class="label">Status</label>
              <select name="status" class="select-field" required>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div class="flex items-end">
              <button type="submit" class="btn btn-primary w-full">
                Add Password
              </button>
            </div>
          </form>
        </div>
      </div>
      ` : ''}

      <div class="card">
        <div class="overflow-x-auto">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Factory Users</h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th class="py-3 px-2">User</th>
                <th class="py-3 px-2">Evocon</th>
                <th class="py-3 px-2">Password</th>
                <th class="py-3 px-2">Status</th>
                <th class="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.passwords.length === 0
                ? `<tr>
                    <td colspan="5" class="py-8 text-center text-gray-500 dark:text-gray-400">
                      No passwords found
                    </td>
                  </tr>`
                : data.passwords
                    .map((pw) => {
                      const statusText = pw.status === 1 ? "Active" : "Inactive";
                      const statusClass = pw.status === 1
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
                      
                      return `
                        <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td class="py-3 px-2 text-white dark:text-white font-medium">${escapeHtml(pw.user)}</td>
                          <td class="py-3 px-2 text-white dark:text-white">${escapeHtml(pw.evocon || "")}</td>
                          <td class="py-3 px-2 text-white dark:text-white font-mono text-xs">${escapeHtml(pw.pw)}</td>
                          <td class="py-3 px-2">
                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClass}">
                              ${escapeHtml(statusText)}
                            </span>
                          </td>
                          <td class="py-3 px-2">
                            <div class="flex items-center gap-2">
                              ${printButton({
                                onClick: `printBarcode('${escapeHtml(pw.user)}', '${escapeHtml(pw.evocon || "")}', '${escapeHtml(pw.pw)}')`,
                                title: "Print barcode label",
                              })}
                              ${hasEdit ? `
                              <form method="POST" action="/pc-pw" class="inline" onsubmit="return confirm('Are you sure you want to delete this password?');">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="${pw.id}">
                                ${deleteButton({ type: "submit" })}
                              </form>
                              ` : ''}
                            </div>
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

    <!-- PC Password Print Modal -->
    <div id="pwPrintModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Printer</h3>
          <button onclick="closePwPrintModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
          </button>
        </div>
        <div id="pw-modal-loading" class="text-center py-4">
          <div class="w-8 h-8 mx-auto text-purple-500 dark:text-purple-400">
            ${REFRESH_ICON.replace('w-5 h-5', 'w-8 h-8 animate-spin')}
          </div>
          <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
        </div>
        <div id="pw-modal-printers" class="hidden max-h-96 overflow-y-auto mb-4"></div>
        <div id="pw-modal-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
        <div class="flex justify-end gap-3">
          <button onclick="closePwPrintModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
          <button id="pw-confirm-print" onclick="confirmPwPrint()" class="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors hidden">Print</button>
        </div>
      </div>
    </div>

    <script>
      (function() {
        let pwPrinters = [];
        let pwSelectedPrinter = null;
        let pwPendingUser = '';
        let pwPendingEvocon = '';
        let pwPendingPassword = '';

        function escapeHtml(str) {
          if (str == null) return '';
          const div = document.createElement('div');
          div.textContent = String(str);
          return div.innerHTML;
        }

        window.printBarcode = function(user, evocon, password) {
          pwPendingUser = user;
          pwPendingEvocon = evocon;
          pwPendingPassword = password;
          pwSelectedPrinter = null;

          const modal = document.getElementById('pwPrintModal');
          const loading = document.getElementById('pw-modal-loading');
          const list = document.getElementById('pw-modal-printers');
          const errEl = document.getElementById('pw-modal-error');
          const confirmBtn = document.getElementById('pw-confirm-print');

          modal.classList.remove('hidden');
          modal.classList.add('flex');
          loading.classList.remove('hidden');
          list.classList.add('hidden');
          errEl.classList.add('hidden');
          confirmBtn.classList.add('hidden');

          if (pwPrinters.length > 0) {
            renderPwPrinters();
            return;
          }

          fetch('/api/printers')
            .then(r => r.json())
            .then(result => {
              if (result.success && result.data) {
                pwPrinters = result.data.filter(p => (p.driver || '').toLowerCase().includes('brother'));
                renderPwPrinters();
              } else {
                errEl.textContent = result.message || 'Failed to load printers';
                errEl.classList.remove('hidden');
                loading.classList.add('hidden');
              }
            })
            .catch(() => {
              errEl.textContent = 'Failed to load printers';
              errEl.classList.remove('hidden');
              loading.classList.add('hidden');
            });
        };

        function renderPwPrinters() {
          const loading = document.getElementById('pw-modal-loading');
          const list = document.getElementById('pw-modal-printers');

          if (pwPrinters.length === 0) {
            list.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No Brother printers available</p>';
            list.classList.remove('hidden');
            loading.classList.add('hidden');
            return;
          }

          list.innerHTML = pwPrinters.map(p => {
            const pName = escapeHtml(p.name || 'Unknown');
            const loc = p.department && p.area ? escapeHtml(p.department) + ' - ' + escapeHtml(p.area) : 'No location';
            const ip = escapeHtml(p.ip || 'No IP');
            return '<label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">' +
              '<input type="radio" name="pw-printer" value="' + pName + '" class="mr-3 text-purple-600" onchange="selectPwPrinter(\\'' + pName.replace(/'/g, "\\\\'") + '\\')">' +
              '<div class="flex-1"><div class="font-medium text-gray-900 dark:text-white">' + pName + '</div>' +
              '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">' + loc + ' | ' + ip + '</div></div></label>';
          }).join('');
          list.classList.remove('hidden');
          loading.classList.add('hidden');
        }

        window.selectPwPrinter = function(name) {
          pwSelectedPrinter = name;
          document.getElementById('pw-confirm-print').classList.remove('hidden');
        };

        window.closePwPrintModal = function() {
          document.getElementById('pwPrintModal').classList.add('hidden');
          document.getElementById('pwPrintModal').classList.remove('flex');
          pwSelectedPrinter = null;
        };

        window.confirmPwPrint = async function() {
          if (!pwSelectedPrinter) return;
          const btn = document.getElementById('pw-confirm-print');
          const orig = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = 'Printing...';

          try {
            const response = await fetch('/api/pc-pw/print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: pwPendingUser, evocon: pwPendingEvocon || '', password: pwPendingPassword, printer: pwSelectedPrinter })
            });
            const result = await response.json();
            if (response.ok) {
              alert('Print job sent successfully!');
              closePwPrintModal();
            } else {
              alert('Error: ' + (result.error || 'Failed to send print job'));
            }
          } catch (error) {
            alert('Error: ' + error.message);
          } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
          }
        };
      })();
    </script>
  `;

  return layout("PC Passwords", content, isAdmin, hasPcPwView, null, hasAuditApprover);
}
