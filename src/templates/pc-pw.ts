import { layout } from "./layout";
import { button, printButton, deleteButton } from "./buttons";

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
  error = ""
): string {
  // If no view permission, show insufficient permissions message
  if (!hasView) {
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
            <p class="text-gray-600 dark:text-gray-400">You do not have permission to view PC passwords.</p>
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Please contact your administrator if you need access.</p>
          </div>
        </div>
      </div>
    `;
    return layout("PC Passwords", content, isAdmin, hasPcPwView);
  }

  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">PC Passwords</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage computer credentials for general use accounts</p>
      </div>

      ${alert}

      ${hasEdit ? `
      <div class="card mb-6">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${data.passwords.length > 0 ? 'Edit' : 'Add'} Password</h2>
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

    <script>
      async function printBarcode(user, evocon, password) {
        const printer = prompt('Enter printer name:', 'EERAK-PRT103');
        if (!printer) {
          return;
        }

        try {
          const response = await fetch('/api/pc-pw/print', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user: user,
              evocon: evocon || '',
              password: password,
              printer: printer
            })
          });

          const result = await response.json();
          
          if (response.ok) {
            alert('Print job sent successfully!');
          } else {
            alert('Error: ' + (result.error || 'Failed to send print job'));
          }
        } catch (error) {
          alert('Error: ' + error.message);
        }
      }
    </script>
  `;

  return layout("PC Passwords", content, isAdmin, hasPcPwView);
}
