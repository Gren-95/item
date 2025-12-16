import { layout } from "./layout";

interface VendorItem {
  id: number;
  name: string;
  equipment_count: number;
}

interface SupplierItem {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  address: string;
  representative_name: string;
  sap_vendor_no: number | null;
  website: string;
  equipment_count: number;
}

interface VendorsData {
  vendors: VendorItem[];
  suppliers: SupplierItem[];
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
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Vendors & Suppliers</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage vendors and suppliers with full details, and see assigned equipment counts.</p>
      </div>

      ${alert}

      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="tab-btn tab-active" data-tab="vendors-tab">
            <span>Vendors</span>
          </button>
          <button type="button" class="tab-btn" data-tab="suppliers-tab">
            <span>Suppliers</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button id="tab-prev" class="btn btn-secondary text-sm px-3" aria-label="Previous section">←</button>
          <button id="tab-next" class="btn btn-secondary text-sm px-3" aria-label="Next section">→</button>
        </div>
      </div>

      <div id="vendors-tab" class="tab-panel">
        ${renderVendorsSection(data.vendors)}
      </div>
      <div id="suppliers-tab" class="tab-panel hidden">
        ${renderSuppliersSection(data.suppliers)}
      </div>
    </div>

    <script>
      (function() {
        const tabs = Array.from(document.querySelectorAll('.tab-btn'));
        const panels = Array.from(document.querySelectorAll('.tab-panel'));
        const prev = document.getElementById('tab-prev');
        const next = document.getElementById('tab-next');
        let active = 0;

        function setActive(idx) {
          if (idx < 0 || idx >= tabs.length) return;
          active = idx;
          tabs.forEach((t, i) => t.classList.toggle('tab-active', i === active));
          panels.forEach((p, i) => p.classList.toggle('hidden', i !== active));
        }

        tabs.forEach((tab, i) => {
          tab.addEventListener('click', () => setActive(i));
        });
        prev?.addEventListener('click', () => setActive(active - 1));
        next?.addEventListener('click', () => setActive(active + 1));
      })();
    </script>
  `;

  return layout("Vendor Management", content);
}

function renderVendorsSection(vendors: VendorItem[]): string {
  return `
    <div class="card">
      <div class="mb-4">
        <form method="POST" action="/vendors" class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <input type="hidden" name="entity" value="vendor">
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
              vendors.length === 0
                ? `<tr><td colspan="3" class="py-4 px-2 text-gray-500 dark:text-gray-400">No vendors yet.</td></tr>`
                : vendors
                    .map(
                      (item) => `
            <tr class="border-b border-gray-100 dark:border-gray-700">
              <td class="py-2 px-2">
                <form method="POST" action="/vendors" class="flex items-center gap-2">
                  <input type="hidden" name="entity" value="vendor">
                  <input type="hidden" name="action" value="edit">
                  <input type="hidden" name="id" value="${item.id}">
                  <input name="name" value="${escapeHtml(item.name)}" class="input-field w-full" maxlength="255" required>
                  <button type="submit" class="btn btn-secondary text-xs whitespace-nowrap inline-flex items-center justify-center" title="Rename">
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
                <div class="flex flex-col gap-2 items-center">
                  <form method="POST" action="/vendors" class="inline w-full">
                    <input type="hidden" name="entity" value="vendor">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="id" value="${item.id}">
                    <button type="submit" class="inline-flex items-center justify-center w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors" title="Rename">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </button>
                  </form>
                  ${
                    item.equipment_count === 0
                      ? `<form method="POST" action="/vendors" class="inline w-full" onsubmit="return confirm('Are you sure you want to delete this vendor?');">
                          <input type="hidden" name="entity" value="vendor">
                          <input type="hidden" name="action" value="delete">
                          <input type="hidden" name="id" value="${item.id}">
                          <button type="submit" class="inline-flex items-center justify-center w-full p-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </form>`
                      : `<span class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-center block w-full">In use</span>`
                  }
                </div>
              </td>
            </tr>`
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSuppliersSection(suppliers: SupplierItem[]): string {
  return `
    <div class="card">
      <div class="mb-4">
        <form method="POST" action="/vendors" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input type="hidden" name="entity" value="supplier">
          <input type="hidden" name="action" value="add">
          ${renderSupplierInputs()}
          <div class="sm:col-span-2 lg:col-span-3 flex gap-3">
            <button type="submit" class="btn btn-primary">Add Supplier</button>
          </div>
        </form>
      </div>

      <!-- Mobile/Tablet Card View -->
      <div class="block lg:hidden space-y-4">
        ${
          suppliers.length === 0
            ? `<div class="text-center py-8 text-gray-500 dark:text-gray-400">No suppliers yet.</div>`
            : suppliers
                .map(
                  (item) => `
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <form id="sup-${item.id}" method="POST" action="/vendors" class="space-y-3">
            <input type="hidden" name="entity" value="supplier">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" value="${item.id}">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="label text-xs">Name</label>
                <input form="sup-${item.id}" name="name" value="${escapeHtml(item.name)}" class="input-field w-full" maxlength="255" required>
              </div>
              
              <div>
                <label class="label text-xs">Email</label>
                <input form="sup-${item.id}" name="email" value="${escapeHtml(item.email)}" class="input-field w-full" maxlength="255" type="email">
              </div>
              
              <div>
                <label class="label text-xs">Phone</label>
                <input form="sup-${item.id}" name="phone_number" value="${escapeHtml(item.phone_number)}" class="input-field w-full" maxlength="255">
              </div>
              
              <div>
                <label class="label text-xs">SAP Vendor #</label>
                <input form="sup-${item.id}" name="sap_vendor_no" value="${item.sap_vendor_no ?? ""}" class="input-field w-full" maxlength="255" pattern="^[0-9]*$" title="Digits only">
              </div>
              
              <div>
                <label class="label text-xs">Representative</label>
                <input form="sup-${item.id}" name="representative_name" value="${escapeHtml(item.representative_name)}" class="input-field w-full" maxlength="255" placeholder="Representative">
              </div>
              
              <div class="sm:col-span-2">
                <label class="label text-xs">Address</label>
                <input form="sup-${item.id}" name="address" value="${escapeHtml(item.address)}" class="input-field w-full" maxlength="255" placeholder="Address">
              </div>
              
              <div class="sm:col-span-2">
                <label class="label text-xs">Website</label>
                <input form="sup-${item.id}" name="website" value="${escapeHtml(item.website)}" class="input-field w-full" maxlength="255" placeholder="https://supplier.com">
                ${
                  item.website
                    ? `<a href="${escapeHtml(item.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 text-xs mt-1 inline-block">Visit website →</a>`
                    : ""
                }
              </div>
            </div>
            
            <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400">Equipment:</span>
                <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">${item.equipment_count}</span>
              </div>
              
              <div class="flex items-center gap-2">
                <button type="submit" class="inline-flex items-center justify-center p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors" title="Save">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>
                ${
                  item.equipment_count === 0
                    ? `<form method="POST" action="/vendors" class="inline" onsubmit="return confirm('Are you sure you want to delete this supplier?');">
                        <input type="hidden" name="entity" value="supplier">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="${item.id}">
                        <button type="submit" class="inline-flex items-center justify-center p-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" title="Delete">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </form>`
                    : `<span class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">In use</span>`
                }
              </div>
            </div>
          </form>
        </div>`
                )
                .join("")
        }
      </div>

      <!-- Desktop Table View -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
              <th class="py-3 px-3">Name</th>
              <th class="py-3 px-3">Contact</th>
              <th class="py-3 px-3">Business Info</th>
              <th class="py-3 px-3">Location</th>
              <th class="py-3 px-3">Website</th>
              <th class="py-3 px-3 text-center">Equipment</th>
              <th class="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              suppliers.length === 0
                ? `<tr><td colspan="7" class="py-4 px-3 text-center text-gray-500 dark:text-gray-400">No suppliers yet.</td></tr>`
                : suppliers
                    .map(
                      (item) => `
            <tr class="border-b border-gray-100 dark:border-gray-700 align-top hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="py-3 px-3">
                <input form="sup-${item.id}" name="name" value="${escapeHtml(item.name)}" class="input-field w-full min-w-[120px]" maxlength="255" required>
              </td>
              <td class="py-3 px-3">
                <div class="space-y-2 min-w-[200px]">
                  <input form="sup-${item.id}" name="email" value="${escapeHtml(item.email)}" class="input-field w-full text-xs" maxlength="255" type="email" placeholder="Email">
                  <input form="sup-${item.id}" name="phone_number" value="${escapeHtml(item.phone_number)}" class="input-field w-full text-xs" maxlength="255" placeholder="Phone">
                </div>
              </td>
              <td class="py-3 px-3">
                <div class="space-y-2 min-w-[180px]">
                  <input form="sup-${item.id}" name="sap_vendor_no" value="${item.sap_vendor_no ?? ""}" class="input-field w-full text-xs" maxlength="255" pattern="^[0-9]*$" title="Digits only" placeholder="SAP #">
                  <input form="sup-${item.id}" name="representative_name" value="${escapeHtml(item.representative_name)}" class="input-field w-full text-xs" maxlength="255" placeholder="Representative">
                </div>
              </td>
              <td class="py-3 px-3">
                <input form="sup-${item.id}" name="address" value="${escapeHtml(item.address)}" class="input-field w-full min-w-[200px]" maxlength="255" placeholder="Address">
              </td>
              <td class="py-3 px-3">
                <div class="min-w-[180px]">
                  <input form="sup-${item.id}" name="website" value="${escapeHtml(item.website)}" class="input-field w-full text-xs" maxlength="255" placeholder="https://supplier.com">
                  ${
                    item.website
                      ? `<a href="${escapeHtml(item.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 text-xs mt-1 inline-block truncate max-w-full">Visit →</a>`
                      : ""
                  }
                </div>
              </td>
              <td class="py-3 px-3 text-center">
                <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">${item.equipment_count}</span>
              </td>
              <td class="py-3 px-3">
                <div class="flex flex-col gap-2 items-center min-w-[60px]">
                  <form id="sup-${item.id}" method="POST" action="/vendors" class="inline w-full">
                    <input type="hidden" name="entity" value="supplier">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="id" value="${item.id}">
                    <button type="submit" class="inline-flex items-center justify-center w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors" title="Save">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </button>
                  </form>
                  ${
                    item.equipment_count === 0
                      ? `<form method="POST" action="/vendors" class="inline w-full" onsubmit="return confirm('Are you sure you want to delete this supplier?');">
                          <input type="hidden" name="entity" value="supplier">
                          <input type="hidden" name="action" value="delete">
                          <input type="hidden" name="id" value="${item.id}">
                          <button type="submit" class="inline-flex items-center justify-center w-full p-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </form>`
                      : `<span class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-center block w-full">In use</span>`
                  }
                </div>
              </td>
            </tr>`
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSupplierInputs(): string {
  return `
    <div>
      <label class="label">Supplier Name</label>
      <input name="name" class="input-field" placeholder="Supplier name" required maxlength="255">
    </div>
    <div>
      <label class="label">Email</label>
      <input name="email" type="email" class="input-field" placeholder="contact@example.com" maxlength="255">
    </div>
    <div>
      <label class="label">Phone</label>
      <input name="phone_number" class="input-field" placeholder="+1 555 123 4567" maxlength="255">
    </div>
    <div>
      <label class="label">Address</label>
      <input name="address" class="input-field" placeholder="Street, City" maxlength="255">
    </div>
    <div>
      <label class="label">Representative</label>
      <input name="representative_name" class="input-field" placeholder="Account rep" maxlength="255">
    </div>
    <div>
      <label class="label">SAP Vendor #</label>
      <input name="sap_vendor_no" class="input-field" placeholder="Digits only" pattern="^[0-9]*$" title="Digits only" maxlength="255">
    </div>
    <div class="md:col-span-2">
      <label class="label">Website</label>
      <input name="website" class="input-field" placeholder="https://supplier.com" maxlength="255">
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

