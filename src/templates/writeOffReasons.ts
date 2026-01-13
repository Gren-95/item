import { layout } from "./layout";
import { renderAlert, escapeHtml } from "./components";
import { button, editButton, deleteButton } from "./buttons";

interface WriteOffReasonItem {
  id: number;
  reason: string;
  equipment_count: number;
}

interface WriteOffReasonsData {
  writeOffReasons: WriteOffReasonItem[];
}

export function writeOffReasonsPage(data: WriteOffReasonsData, success = "", error = "", isAdmin: boolean = false, hasPcPwView: boolean = false, username: string | null = null): string {
  const alert = renderAlert(success, error);

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
              ${button("Add Reason", { type: "submit", variant: "primary", fullWidth: true, className: "md:w-auto" })}
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
                    ${editButton({ type: "submit", className: "whitespace-nowrap" })}
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
                          ${deleteButton({ type: "submit" })}
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

  return layout("Write-Off Reasons", content, isAdmin, hasPcPwView, username);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

