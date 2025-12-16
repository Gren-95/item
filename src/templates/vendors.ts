import { layout } from "./layout";

interface VendorItem {
  id: number;
  name: string;
  equipment_count: number;
}

interface VendorsData {
  vendors: VendorItem[];
}

export function vendorsPage(data: VendorsData, success = "", error = ""): string {
  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Vendor Management</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Add, rename, and delete vendors. See equipment usage counts.</p>
      </div>

      ${alert}

      <div class="card">
        <div class="mb-4">
          <form method="POST" action="/vendors" class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <input type="hidden" name="action" value="add">
            <div>
              <label class="label">Vendor Name</label>
              <input name="name" class="input-field" placeholder="New vendor name" required maxlength="255">
            </div>
            <div>
              <button type="submit" class="btn btn-primary w-full md:w-auto">Add Vendor</button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th class="py-3 px-2">Name</th>
                <th class="py-3 px-2">Equipment</th>
                <th class="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.vendors.length === 0
                  ? `<tr><td colspan="3" class="py-4 px-2 text-gray-500 dark:text-gray-400">No vendors yet.</td></tr>`
                  : data.vendors
                      .map(
                        (item) => `
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-2 px-2">
                    <form method="POST" action="/vendors" class="flex items-center gap-2">
                      <input type="hidden" name="action" value="edit">
                      <input type="hidden" name="id" value="${item.id}">
                      <input name="name" value="${escapeHtml(item.name)}" class="input-field w-full" maxlength="255" required>
                      <button type="submit" class="btn btn-secondary text-xs whitespace-nowrap">Rename</button>
                    </form>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">${item.equipment_count}</span>
                  </td>
                  <td class="py-2 px-2 space-x-2">
                    ${
                      item.equipment_count === 0
                        ? `<form method="POST" action="/vendors" class="inline" onsubmit="return confirm('Are you sure you want to delete this vendor?');">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="${item.id}">
                            <button type="submit" class="btn btn-danger text-xs">Delete</button>
                          </form>`
                        : `<span class="text-xs text-gray-500 dark:text-gray-400">Cannot delete (in use)</span>`
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

  return layout("Vendor Management", content);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

