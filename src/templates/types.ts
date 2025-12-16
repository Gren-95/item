import { layout } from "./layout";

interface TypeItem {
  id: number;
  name: string;
  status: number;
  equipment_count: number;
}

interface TypesData {
  types: TypeItem[];
}

export function typesPage(data: TypesData, success = "", error = ""): string {
  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Equipment Types</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage equipment types and see assigned equipment counts.</p>
      </div>

      ${alert}

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Types</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Add, rename, activate/deactivate, and see usage.</p>
          </div>
        </div>

        <div class="mb-4">
          <form method="POST" action="/types" class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <input type="hidden" name="action" value="add">
            <input type="hidden" name="type" value="type">
            <div>
              <label class="label">Type Name</label>
              <input name="name" class="input-field" placeholder="New type name" required maxlength="25">
            </div>
            <div>
              <button type="submit" class="btn btn-primary w-full md:w-auto">Add Type</button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th class="py-3 px-2">Name</th>
                <th class="py-3 px-2">Status</th>
                <th class="py-3 px-2">Equipment</th>
                <th class="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.types.length === 0
                  ? `<tr><td colspan="4" class="py-4 px-2 text-gray-500 dark:text-gray-400">No types yet.</td></tr>`
                  : data.types
                      .map(
                        (item) => `
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-2 px-2">
                    <form method="POST" action="/types" class="flex items-center gap-2">
                      <input type="hidden" name="action" value="edit">
                      <input type="hidden" name="type" value="type">
                      <input type="hidden" name="id" value="${item.id}">
                      <input name="name" value="${escapeHtml(item.name)}" class="input-field w-full" maxlength="25" required>
                      <button type="submit" class="btn btn-secondary text-xs whitespace-nowrap">Rename</button>
                    </form>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-full text-xs ${item.status ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}">
                      ${item.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">${item.equipment_count}</span>
                  </td>
                  <td class="py-2 px-2 space-x-2">
                    <form method="POST" action="/types" class="inline">
                      <input type="hidden" name="action" value="${item.status ? "deactivate" : "activate"}">
                      <input type="hidden" name="type" value="type">
                      <input type="hidden" name="id" value="${item.id}">
                      <button type="submit" class="btn ${item.status ? "btn-secondary" : "btn-success"} text-xs">
                        ${item.status ? "Deactivate" : "Activate"}
                      </button>
                    </form>
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

  return layout("Equipment Types", content);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

