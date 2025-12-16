import { layout } from "./layout";

interface WriteOffReasonItem {
  id: number;
  reason: string;
  equipment_count: number;
}

interface WriteOffReasonsData {
  writeOffReasons: WriteOffReasonItem[];
}

export function writeOffReasonsPage(data: WriteOffReasonsData, success = "", error = ""): string {
  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Write-Off Reasons</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage write-off reasons and see how many equipment items use each reason.</p>
      </div>

      ${alert}

      <div class="card">
        <div class="mb-4">
          <form method="POST" action="/write-off-reasons" class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <input type="hidden" name="action" value="add">
            <div>
              <label class="label">Write-Off Reason</label>
              <input name="reason" class="input-field" placeholder="e.g., Damaged beyond repair" required maxlength="255">
            </div>
            <div>
              <button type="submit" class="btn btn-primary w-full md:w-auto">Add Reason</button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th class="py-3 px-2">Reason</th>
                <th class="py-3 px-2">Equipment Count</th>
                <th class="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.writeOffReasons.length === 0
                  ? `<tr><td colspan="3" class="py-4 px-2 text-gray-500 dark:text-gray-400">No write-off reasons yet.</td></tr>`
                  : data.writeOffReasons
                      .map(
                        (item) => `
              <tr class="border-b border-gray-100 dark:border-gray-700">
                <td class="py-2 px-2">
                  <form method="POST" action="/write-off-reasons" class="flex items-center gap-2">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="id" value="${item.id}">
                    <input name="reason" value="${escapeHtml(item.reason)}" class="input-field w-full" maxlength="255" required>
                    <button type="submit" class="btn btn-secondary text-xs whitespace-nowrap inline-flex items-center justify-center" title="Save">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </button>
                  </form>
                </td>
                <td class="py-2 px-2">
                  <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">${item.equipment_count}</span>
                </td>
                <td class="py-2 px-2">
                  ${
                    item.equipment_count === 0
                      ? `<form method="POST" action="/write-off-reasons" class="inline" onsubmit="return confirm('Are you sure you want to delete this write-off reason?');">
                          <input type="hidden" name="action" value="delete">
                          <input type="hidden" name="id" value="${item.id}">
                          <button type="submit" class="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </form>`
                      : `<span class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Cannot delete (in use)</span>`
                  }
                </td>
              </tr>`
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  return layout("Write-Off Reasons", content);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

