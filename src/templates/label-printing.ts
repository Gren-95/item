import { layout } from "./layout";
import { printButton, deleteButton } from "./buttons";
import { renderAlert } from "./components";
import { PRINTER_ICON, TAG_ICON, KEY_ICON, SEARCH_ICON, REFRESH_ICON, X_ICON, EXCLAMATION_CIRCLE_ICON } from "./icons";

interface PcPassword {
  id: number;
  user: string;
  evocon: string | null;
  pw: string;
  status: number;
}

interface LabelPrintingData {
  passwords: PcPassword[];
  hasPcPwView: boolean;
  hasPcPwEdit: boolean;
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

export function labelPrintingPage(
  data: LabelPrintingData,
  isAdmin: boolean,
  hasPcPwView: boolean,
  username: string | null = null,
  hasAuditApprover: boolean = false,
  activeTab: string = "service-tag",
  success = "",
  error = ""
): string {
  const alert = renderAlert(success, error);

  const tabs = [
    { id: "service-tag", label: "Service Tag Labels", icon: TAG_ICON },
    { id: "printer", label: "Printer Labels", icon: PRINTER_ICON },
    { id: "passwords", label: "PC Passwords", icon: KEY_ICON },
  ];

  const tabButtons = tabs
    .map((tab) => {
      const isActive = tab.id === activeTab;
      return `<button data-tab="${tab.id}" class="tab-btn ${isActive ? "tab-active" : ""}" onclick="switchTab('${tab.id}')">
          <span class="flex items-center gap-2">${tab.icon.replace('w-5 h-5', 'w-4 h-4')} ${tab.label}</span>
        </button>`;
    })
    .join("");

  // -- Service Tag Tab --
  const serviceTagContent = `
    <div id="tab-service-tag" class="card tab-panel ${activeTab !== "service-tag" ? "hidden" : ""}">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Print Service Tag Label</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">Search for equipment by service tag. If it exists in the database, you can print a label for it.</p>
        </div>

        <div class="mb-6">
          <label class="label">Search by Service Tag</label>
          <div class="relative">
            <input
              type="text"
              id="st-search"
              placeholder="e.g., ABC1234, 7HXR3S3"
              class="input-field pr-10"
              autocomplete="off"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              ${SEARCH_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a full or partial service tag to look it up in the inventory database.</p>
        </div>

        <div id="st-loading" class="hidden text-center py-4">
          <div class="w-6 h-6 mx-auto text-blue-500 dark:text-blue-400">
            ${REFRESH_ICON.replace('w-5 h-5', 'w-6 h-6 animate-spin')}
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Looking up equipment...</p>
        </div>

        <div id="st-not-found" class="hidden">
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <div class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600">
              ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-12 h-12')}
            </div>
            <p class="font-medium text-gray-700 dark:text-gray-300">No equipment found</p>
            <p class="text-sm mt-1">The service tag was not found in the database.</p>
          </div>
        </div>

        <div id="st-result" class="hidden">
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-mono font-semibold text-gray-900 dark:text-white text-lg" id="st-result-tag"></span>
                  <span class="ml-2 text-sm text-gray-500 dark:text-gray-400" id="st-result-type"></span>
                </div>
                <button onclick="clearStResult()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Clear">
                  ${X_ICON.replace('w-5 h-5', 'w-4 h-4')}
                </button>
              </div>
            </div>
            <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Model:</span>
                <span class="ml-1 font-medium text-gray-900 dark:text-white" id="st-result-model"></span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Assigned To:</span>
                <span class="ml-1 font-medium text-gray-900 dark:text-white" id="st-result-assigned"></span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Location:</span>
                <span class="ml-1 font-medium text-gray-900 dark:text-white" id="st-result-location"></span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Status:</span>
                <span class="ml-1" id="st-result-status"></span>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              id="st-print-btn"
              onclick="openStPrintModal()"
              class="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              ${PRINTER_ICON}
              Print Service Tag Label
            </button>
          </div>
        </div>

      <!-- Service Tag Print Modal -->
      <div id="stPrintModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Printer</h3>
            <button onclick="closeStPrintModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
            </button>
          </div>
          <div id="st-modal-loading" class="text-center py-4">
            <div class="w-8 h-8 mx-auto text-blue-500 dark:text-blue-400">
              ${REFRESH_ICON.replace('w-5 h-5', 'w-8 h-8 animate-spin')}
            </div>
            <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
          </div>
          <div id="st-modal-printers" class="hidden max-h-96 overflow-y-auto mb-4"></div>
          <div id="st-modal-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
          <div class="flex justify-end gap-3">
            <button onclick="closeStPrintModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button id="st-confirm-print" onclick="confirmStPrint()" class="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors hidden">Print</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // -- Printer Labels Tab --
  const printerLabelsContent = `
    <div id="tab-printer" class="card tab-panel ${activeTab !== "printer" ? "hidden" : ""}">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Print Printer Name Tag</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">Search for a printer by name (EERAK/EETAL) or IP address. The data is from printer server.</p>
        </div>

        <div class="mb-6">
          <label class="label">Search Printer by Name or IP</label>
          <div class="relative">
            <input
              type="text"
              id="printer-search"
              placeholder="e.g., 15, EERAK, 10.72"
              class="input-field pr-10"
              autocomplete="off"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              ${SEARCH_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Examples: <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">15</code>,
            <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">EERAK</code>,
            <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">10.72</code>
          </p>
          <div id="pl-search-results" class="mt-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg hidden"></div>
          <div id="pl-loading" class="hidden text-center py-4">
            <div class="w-6 h-6 mx-auto text-blue-500 dark:text-blue-400">
              ${REFRESH_ICON.replace('w-5 h-5', 'w-6 h-6 animate-spin')}
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading printers...</p>
          </div>
          <div id="pl-error" class="hidden text-red-600 dark:text-red-400 text-sm mt-2"></div>
        </div>

        <div id="pl-selected" class="hidden mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="text-sm text-blue-700 dark:text-blue-300 font-medium">Selected Printer</p>
              <p id="pl-selected-name" class="text-lg font-semibold text-blue-900 dark:text-blue-100"></p>
              <p id="pl-selected-details" class="text-sm text-blue-600 dark:text-blue-400"></p>
            </div>
            <button onclick="plClearSelection()" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50" title="Clear selection">
              ${X_ICON}
            </button>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            id="pl-print-btn"
            class="hidden px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors inline-flex items-center gap-2 shadow-sm"
            onclick="plOpenPrintModal()"
          >
            ${PRINTER_ICON}
            Print Label
          </button>
        </div>

      <!-- Printer Label Print Modal -->
      <div id="plPrintModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Target Printer</h3>
            <button onclick="plClosePrintModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
            </button>
          </div>
          <div id="pl-modal-loading" class="text-center py-4">
            <div class="w-8 h-8 mx-auto text-blue-500 dark:text-blue-400">
              ${REFRESH_ICON.replace('w-5 h-5', 'w-8 h-8 animate-spin')}
            </div>
            <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
          </div>
          <div id="pl-modal-printers" class="hidden max-h-96 overflow-y-auto mb-4"></div>
          <div id="pl-modal-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
          <div class="flex justify-end gap-3">
            <button onclick="plClosePrintModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button id="pl-confirm-print" onclick="plConfirmPrint()" class="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors hidden">Print</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // -- PC Passwords Tab --
  const passwordsContent = !data.hasPcPwView
    ? `
    <div id="tab-passwords" class="card tab-panel ${activeTab !== "passwords" ? "hidden" : ""}">
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-8 h-8').replace('text-current', 'text-red-600 dark:text-red-400')}
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insufficient Permissions</h2>
          <p class="text-gray-600 dark:text-gray-400">You do not have permission to view PC passwords.</p>
          <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Please contact your administrator if you need access.</p>
        </div>
    </div>
    `
    : `
    <div id="tab-passwords" class="card tab-panel ${activeTab !== "passwords" ? "hidden" : ""}">
      ${data.hasPcPwEdit ? `
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add User</h2>
          <form method="POST" action="/labels?tab=passwords" class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <input type="hidden" name="action" value="add">
            <div>
              <label class="label">User</label>
              <input type="text" name="user" class="input-field" placeholder="Username" required />
            </div>
            <div>
              <label class="label">Evocon</label>
              <input type="text" name="evocon" class="input-field" placeholder="Evocon email (optional)" />
            </div>
            <div>
              <label class="label">Password</label>
              <input type="text" name="pw" class="input-field" placeholder="Password" required />
            </div>
            <div>
              <label class="label">Status</label>
              <select name="status" class="select-field" required>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div>
              <button type="submit" class="btn btn-primary w-full">Add Password</button>
            </div>
          </form>
        </div>
      ` : ''}

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
                ? `<tr><td colspan="5" class="py-8 text-center text-gray-500 dark:text-gray-400">No passwords found</td></tr>`
                : data.passwords
                    .map((pw) => {
                      const statusText = pw.status === 1 ? "Active" : "Inactive";
                      const statusClass = pw.status === 1
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
                      return `
                        <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td class="py-3 px-2 text-gray-900 dark:text-white font-medium">${escapeHtml(pw.user)}</td>
                          <td class="py-3 px-2 text-gray-900 dark:text-white">${escapeHtml(pw.evocon || "")}</td>
                          <td class="py-3 px-2 text-gray-900 dark:text-white font-mono text-xs">${escapeHtml(pw.pw)}</td>
                          <td class="py-3 px-2">
                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClass}">
                              ${escapeHtml(statusText)}
                            </span>
                          </td>
                          <td class="py-3 px-2">
                            <div class="flex items-center gap-2">
                              ${printButton({
                                onClick: `printBarcode(${pw.id}, '${escapeHtml(pw.user)}')`,
                                title: "Print barcode label",
                              })}
                              ${data.hasPcPwEdit ? `
                              <form method="POST" action="/labels?tab=passwords" class="inline" onsubmit="return confirm('Are you sure you want to delete this password?');">
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
            <div class="w-8 h-8 mx-auto text-blue-500 dark:text-blue-400">
              ${REFRESH_ICON.replace('w-5 h-5', 'w-8 h-8 animate-spin')}
            </div>
            <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
          </div>
          <div id="pw-modal-printers" class="hidden max-h-96 overflow-y-auto mb-4"></div>
          <div id="pw-modal-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
          <div class="flex justify-end gap-3">
            <button onclick="closePwPrintModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button id="pw-confirm-print" onclick="confirmPwPrint()" class="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors hidden">Print</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex items-center gap-2">
          ${PRINTER_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Label Printing</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Print service tags, printer labels, and PC password barcodes</p>
      </div>

      ${alert}

      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-wrap gap-2" id="tabs">
          ${tabButtons}
        </div>
      </div>

      <div id="tab-panels" class="space-y-0">
        ${serviceTagContent}
        ${printerLabelsContent}
        ${passwordsContent}
      </div>
    </div>

    <script>
      // ===================== Tab Switching =====================
      (function() {
        const tabs = Array.from(document.querySelectorAll('.tab-btn'));
        const panels = Array.from(document.querySelectorAll('.tab-panel'));

        window.switchTab = function(tabId) {
          // Update tab button styles
          tabs.forEach(t => t.classList.toggle('tab-active', t.dataset.tab === tabId));
          // Show/hide panels
          panels.forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + tabId));
          // Update URL without reload
          const url = new URL(window.location);
          url.searchParams.set('tab', tabId);
          window.history.replaceState({}, '', url);
        };

        // Touch swipe support
        let startX = 0;
        const tabIds = tabs.map(t => t.dataset.tab);
        const container = document.getElementById('tab-panels');
        container?.addEventListener('touchstart', (e) => {
          startX = e.touches[0].clientX;
        });
        container?.addEventListener('touchend', (e) => {
          const dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 50) {
            const currentIdx = tabIds.findIndex(id => !document.getElementById('tab-' + id)?.classList.contains('hidden'));
            const nextIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1;
            if (nextIdx >= 0 && nextIdx < tabIds.length) {
              switchTab(tabIds[nextIdx]);
            }
          }
        });
      })();

      // ===================== Service Tag Tab =====================
      (function() {
        let stPrinters = [];
        let stSelectedPrinter = null;
        let currentServiceTag = '';

        const stSearch = document.getElementById('st-search');
        const stLoading = document.getElementById('st-loading');
        const stNotFound = document.getElementById('st-not-found');
        const stResult = document.getElementById('st-result');

        function escapeHtml(str) {
          if (str == null) return '';
          const div = document.createElement('div');
          div.textContent = String(str);
          return div.innerHTML;
        }

        let stDebounce;
        if (stSearch) {
          stSearch.addEventListener('input', function() {
            clearTimeout(stDebounce);
            stDebounce = setTimeout(() => lookupServiceTag(this.value.trim()), 400);
          });
          stSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              clearTimeout(stDebounce);
              lookupServiceTag(this.value.trim());
            }
          });
        }

        async function lookupServiceTag(tag) {
          stNotFound.classList.add('hidden');
          stResult.classList.add('hidden');

          if (!tag) { return; }

          stLoading.classList.remove('hidden');

          try {
            const response = await fetch('/api/equipment/search-by-tag?tag=' + encodeURIComponent(tag));
            const result = await response.json();

            stLoading.classList.add('hidden');

            if (result.success && result.data) {
              currentServiceTag = result.data.service_tag;
              document.getElementById('st-result-tag').textContent = result.data.service_tag;
              document.getElementById('st-result-type').textContent = result.data.type_name || '';
              document.getElementById('st-result-model').textContent = result.data.model_name || '—';
              document.getElementById('st-result-assigned').textContent = result.data.assigned_to_name || 'Unassigned';
              document.getElementById('st-result-location').textContent = result.data.location || '—';

              const statusEl = document.getElementById('st-result-status');
              const status = result.data.status;
              if (status === 'Active' || status === 1) {
                statusEl.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>';
              } else {
                statusEl.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">' + escapeHtml(String(status || 'Unknown')) + '</span>';
              }

              stResult.classList.remove('hidden');
            } else {
              stNotFound.classList.remove('hidden');
            }
          } catch (err) {
            console.error('Service tag lookup error:', err);
            stLoading.classList.add('hidden');
            stNotFound.classList.remove('hidden');
          }
        }

        window.clearStResult = function() {
          stResult.classList.add('hidden');
          stNotFound.classList.add('hidden');
          currentServiceTag = '';
          if (stSearch) stSearch.value = '';
        };

        // Print modal logic
        window.openStPrintModal = async function() {
          if (!currentServiceTag) return;
          const modal = document.getElementById('stPrintModal');
          const loading = document.getElementById('st-modal-loading');
          const list = document.getElementById('st-modal-printers');
          const errEl = document.getElementById('st-modal-error');
          const confirmBtn = document.getElementById('st-confirm-print');

          modal.classList.remove('hidden');
          modal.classList.add('flex');
          loading.classList.remove('hidden');
          list.classList.add('hidden');
          errEl.classList.add('hidden');
          confirmBtn.classList.add('hidden');
          stSelectedPrinter = null;

          try {
            const response = await fetch('/api/printers');
            const result = await response.json();
            if (result.success && result.data) {
              stPrinters = result.data.filter(function(p) {
                return (p.driver || '').toLowerCase().includes('brother');
              });
              list.innerHTML = stPrinters.map(function(p) {
                var pName = escapeHtml(p.name || 'Unknown');
                var loc = p.department && p.area ? escapeHtml(p.department) + ' - ' + escapeHtml(p.area) : 'No location';
                var ip = escapeHtml(p.ip || 'No IP');
                return '<label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">' +
                  '<input type="radio" name="st-target-printer" value="' + pName + '" class="mr-3 text-blue-600" onchange="selectStPrinter(\\'' + pName.replace(/'/g, "\\\\'") + '\\')">' +
                  '<div class="flex-1"><div class="font-medium text-gray-900 dark:text-white">' + pName + '</div>' +
                  '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">' + loc + ' | ' + ip + '</div></div></label>';
              }).join('');
              list.classList.remove('hidden');
            } else {
              errEl.textContent = result.message || 'Failed to load printers';
              errEl.classList.remove('hidden');
            }
          } catch (err) {
            errEl.textContent = 'Failed to load printers';
            errEl.classList.remove('hidden');
          } finally {
            loading.classList.add('hidden');
          }
        };

        window.selectStPrinter = function(name) {
          stSelectedPrinter = name;
          document.getElementById('st-confirm-print').classList.remove('hidden');
        };

        window.closeStPrintModal = function() {
          document.getElementById('stPrintModal').classList.add('hidden');
          document.getElementById('stPrintModal').classList.remove('flex');
          stSelectedPrinter = null;
        };

        window.confirmStPrint = async function() {
          if (!currentServiceTag || !stSelectedPrinter) return;
          var btn = document.getElementById('st-confirm-print');
          var orig = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = 'Printing...';

          try {
            var response = await fetch('/api/print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ service_tag: currentServiceTag, printer: stSelectedPrinter })
            });
            var result = await response.json();
            if (response.ok) {
              window.location.href = '/labels?tab=service-tag&success=' + encodeURIComponent('Service tag label sent to printer!');
            } else {
              window.location.href = '/labels?tab=service-tag&error=' + encodeURIComponent(result.error || 'Failed to print label');
            }
          } catch (err) {
            window.location.href = '/labels?tab=service-tag&error=' + encodeURIComponent('Failed to send print job');
          } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
          }
        };
      })();

      // ===================== Printer Labels Tab =====================
      (function() {
        let allPrinters = [];
        let selectedPrinterForLabel = null;
        let selectedTargetPrinter = null;

        const searchInput = document.getElementById('printer-search');
        const searchResults = document.getElementById('pl-search-results');
        const loadingIndicator = document.getElementById('pl-loading');
        const errorMessage = document.getElementById('pl-error');
        const selectedPrinterDiv = document.getElementById('pl-selected');
        const selectedPrinterName = document.getElementById('pl-selected-name');
        const selectedPrinterDetails = document.getElementById('pl-selected-details');
        const printBtn = document.getElementById('pl-print-btn');
        const printModal = document.getElementById('plPrintModal');
        const modalPrintersLoading = document.getElementById('pl-modal-loading');
        const modalPrintersList = document.getElementById('pl-modal-printers');
        const modalPrintersError = document.getElementById('pl-modal-error');
        const confirmPrintBtn = document.getElementById('pl-confirm-print');

        function escapeHtml(str) {
          if (str == null) return '';
          var div = document.createElement('div');
          div.textContent = String(str);
          return div.innerHTML;
        }

        async function loadPrinters() {
          if (loadingIndicator) loadingIndicator.classList.remove('hidden');
          if (errorMessage) errorMessage.classList.add('hidden');

          try {
            var response = await fetch('/api/printers/all');
            var result = await response.json();
            if (result.success && result.data) {
              allPrinters = result.data;
            } else {
              showError(result.error || 'Failed to load printers');
            }
          } catch (err) {
            showError('Failed to load printers');
          } finally {
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
          }
        }

        function showError(msg) {
          if (errorMessage) {
            errorMessage.textContent = msg;
            errorMessage.classList.remove('hidden');
          }
        }

        function filterPrinters(query) {
          if (!query || query.length < 1) {
            searchResults.classList.add('hidden');
            return;
          }

          var lowerQuery = query.toLowerCase();
          var filtered = allPrinters.filter(function(p) {
            var name = (p.name || '').toLowerCase();
            var ip = (p.ip || '').toLowerCase();
            return name.includes(lowerQuery) || ip.includes(lowerQuery);
          });

          if (filtered.length === 0) {
            searchResults.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No printers found</p>';
            searchResults.classList.remove('hidden');
            return;
          }

          var displayResults = filtered.slice(0, 50);
          var hasMore = filtered.length > 50;

          searchResults.innerHTML = displayResults.map(function(p) {
            var printerName = escapeHtml(p.name || 'Unknown');
            var location = p.department && p.area ? escapeHtml(p.department) + ' - ' + escapeHtml(p.area) : 'No location';
            var ip = escapeHtml(p.ip || 'No IP');
            return '<button type="button" class="w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" onclick="plSelectPrinter(\\'' + printerName.replace(/'/g, "\\\\'") + '\\', \\'' + location.replace(/'/g, "\\\\'") + '\\', \\'' + ip.replace(/'/g, "\\\\'") + '\\')">' +
              '<div class="font-medium text-gray-900 dark:text-white">' + printerName + '</div>' +
              '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">' + location + ' | ' + ip + '</div></button>';
          }).join('') + (hasMore ? '<p class="text-gray-500 dark:text-gray-400 text-center py-2 text-xs">Showing first 50 of ' + filtered.length + ' results</p>' : '');
          searchResults.classList.remove('hidden');
        }

        window.plSelectPrinter = function(name, location, ip) {
          selectedPrinterForLabel = name;
          selectedPrinterName.textContent = name;
          selectedPrinterDetails.textContent = location + ' | ' + ip;
          selectedPrinterDiv.classList.remove('hidden');
          printBtn.classList.remove('hidden');
          searchResults.classList.add('hidden');
          searchInput.value = '';
        };

        window.plClearSelection = function() {
          selectedPrinterForLabel = null;
          selectedPrinterDiv.classList.add('hidden');
          printBtn.classList.add('hidden');
        };

        window.plOpenPrintModal = function() {
          if (!selectedPrinterForLabel) return;
          printModal.classList.remove('hidden');
          printModal.classList.add('flex');
          modalPrintersLoading.classList.remove('hidden');
          modalPrintersList.classList.add('hidden');
          modalPrintersError.classList.add('hidden');
          confirmPrintBtn.classList.add('hidden');
          selectedTargetPrinter = null;
          renderModalPrinters();
        };

        window.plClosePrintModal = function() {
          printModal.classList.add('hidden');
          printModal.classList.remove('flex');
          selectedTargetPrinter = null;
        };

        function renderModalPrinters() {
          var brotherPrinters = allPrinters.filter(function(p) {
            return (p.driver || '').toLowerCase().includes('brother');
          });

          if (brotherPrinters.length === 0) {
            modalPrintersList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No Brother printers available</p>';
            modalPrintersList.classList.remove('hidden');
            modalPrintersLoading.classList.add('hidden');
            return;
          }

          modalPrintersList.innerHTML = brotherPrinters.map(function(p) {
            var printerName = escapeHtml(p.name || 'Unknown');
            var location = p.department && p.area ? escapeHtml(p.department) + ' - ' + escapeHtml(p.area) : 'No location';
            var ip = escapeHtml(p.ip || 'No IP');
            return '<label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">' +
              '<input type="radio" name="pl-target-printer" value="' + printerName + '" class="mr-3 text-blue-600" onchange="plSelectTargetPrinter(\\'' + printerName.replace(/'/g, "\\\\'") + '\\')">' +
              '<div class="flex-1"><div class="font-medium text-gray-900 dark:text-white">' + printerName + '</div>' +
              '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">' + location + ' | ' + ip + '</div></div></label>';
          }).join('');

          modalPrintersList.classList.remove('hidden');
          modalPrintersLoading.classList.add('hidden');
        }

        window.plSelectTargetPrinter = function(name) {
          selectedTargetPrinter = name;
          confirmPrintBtn.classList.remove('hidden');
        };

        window.plConfirmPrint = async function() {
          if (!selectedPrinterForLabel || !selectedTargetPrinter) return;
          var btn = confirmPrintBtn;
          var originalText = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = 'Printing...';

          try {
            var response = await fetch('/api/print-printer-tag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ printer_name: selectedPrinterForLabel, printer: selectedTargetPrinter })
            });
            var result = await response.json();
            if (result.success) {
              window.location.href = '/labels?tab=printer&success=' + encodeURIComponent('Printer label sent successfully!');
            } else {
              window.location.href = '/labels?tab=printer&error=' + encodeURIComponent(result.error || 'Failed to print label');
            }
          } catch (err) {
            window.location.href = '/labels?tab=printer&error=' + encodeURIComponent('Failed to send print job');
          } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        };

        var plSearchTimeout;
        if (searchInput) {
          searchInput.addEventListener('input', function() {
            clearTimeout(plSearchTimeout);
            plSearchTimeout = setTimeout(function() { filterPrinters(searchInput.value); }, 300);
          });
        }

        document.addEventListener('click', function(e) {
          if (searchInput && searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
          }
        });

        // Load printers on page load
        loadPrinters();
      })();

      // ===================== PC Passwords Tab =====================
      (function() {
        var pwPrinters = [];
        var pwSelectedPrinter = null;
        var pwPendingId = null;
        var pwPendingUser = '';

        function pwEscapeHtml(str) {
          if (str == null) return '';
          var div = document.createElement('div');
          div.textContent = String(str);
          return div.innerHTML;
        }

        // The password is no longer carried in the browser; the print
        // endpoint resolves it server-side from the row id.
        window.printBarcode = function(id, user) {
          pwPendingId = id;
          pwPendingUser = user;
          pwSelectedPrinter = null;

          var modal = document.getElementById('pwPrintModal');
          var loading = document.getElementById('pw-modal-loading');
          var list = document.getElementById('pw-modal-printers');
          var errEl = document.getElementById('pw-modal-error');
          var confirmBtn = document.getElementById('pw-confirm-print');

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
            .then(function(r) { return r.json(); })
            .then(function(result) {
              if (result.success && result.data) {
                pwPrinters = result.data.filter(function(p) {
                  return (p.driver || '').toLowerCase().includes('brother');
                });
                renderPwPrinters();
              } else {
                errEl.textContent = result.message || 'Failed to load printers';
                errEl.classList.remove('hidden');
                loading.classList.add('hidden');
              }
            })
            .catch(function() {
              errEl.textContent = 'Failed to load printers';
              errEl.classList.remove('hidden');
              loading.classList.add('hidden');
            });
        };

        function renderPwPrinters() {
          var loading = document.getElementById('pw-modal-loading');
          var list = document.getElementById('pw-modal-printers');

          if (pwPrinters.length === 0) {
            list.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No Brother printers available</p>';
            list.classList.remove('hidden');
            loading.classList.add('hidden');
            return;
          }

          list.innerHTML = pwPrinters.map(function(p) {
            var pName = pwEscapeHtml(p.name || 'Unknown');
            var loc = p.department && p.area ? pwEscapeHtml(p.department) + ' - ' + pwEscapeHtml(p.area) : 'No location';
            var ip = pwEscapeHtml(p.ip || 'No IP');
            return '<label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">' +
              '<input type="radio" name="pw-printer" value="' + pName + '" class="mr-3 text-blue-600" onchange="selectPwPrinter(\\'' + pName.replace(/'/g, "\\\\'") + '\\')">' +
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
          var btn = document.getElementById('pw-confirm-print');
          var orig = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = 'Printing...';

          try {
            var response = await fetch('/api/pc-pw/print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: pwPendingId, printer: pwSelectedPrinter })
            });
            var result = await response.json();
            if (response.ok) {
              window.location.href = '/labels?tab=passwords&success=' + encodeURIComponent('Print job sent successfully!');
            } else {
              window.location.href = '/labels?tab=passwords&error=' + encodeURIComponent(result.error || 'Failed to send print job');
            }
          } catch (error) {
            window.location.href = '/labels?tab=passwords&error=' + encodeURIComponent('Error: ' + error.message);
          } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
          }
        };
      })();
    </script>
  `;

  return layout("Label Printing", content, isAdmin, hasPcPwView, username, hasAuditApprover);
}
