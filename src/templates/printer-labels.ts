import { layout } from "./layout";

interface _Printer {
  name: string;
  department: string;
  area: string;
  ip: string;
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

export function printerLabelsPage(
  isAdmin: boolean,
  hasPcPwView: boolean,
  username: string | null = null,
  hasAuditApprover: boolean = false,
  success = "",
  error = ""
): string {
  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex items-center gap-2">
          <svg class="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Printer Labels</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Print identification labels for network printers</p>
      </div>

      ${alert}

      <div class="card mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
              <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Examples: <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">15</code>,
            <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">EERAK</code>,
            <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">10.72</code>
          </p>
          <div id="search-results" class="mt-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg hidden"></div>
          <div id="loading-indicator" class="hidden text-center py-4">
            <svg class="w-6 h-6 animate-spin text-purple-500 dark:text-purple-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading printers...</p>
          </div>
          <div id="error-message" class="hidden text-red-600 dark:text-red-400 text-sm mt-2"></div>
        </div>

        <div id="selected-printer" class="hidden mb-6 p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="text-sm text-purple-700 dark:text-purple-300 font-medium">Selected Printer</p>
              <p id="selected-printer-name" class="text-lg font-semibold text-purple-900 dark:text-purple-100"></p>
              <p id="selected-printer-details" class="text-sm text-purple-600 dark:text-purple-400"></p>
            </div>
            <button onclick="clearSelection()" class="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50" title="Clear selection">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            id="print-btn"
            class="hidden px-6 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-sm"
            onclick="openPrintModal()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print Label
          </button>
        </div>
      </div>
    </div>

    <!-- Print Modal -->
    <div id="printModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transition-colors border border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Target Printer</h3>
          <button onclick="closePrintModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="printModalBody">
          <div id="modal-printers-loading" class="text-center py-4">
            <svg class="w-8 h-8 animate-spin text-purple-500 dark:text-purple-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
          </div>
          <div id="modal-printers-list" class="hidden max-h-96 overflow-y-auto mb-4"></div>
          <div id="modal-printers-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
        </div>
        <div class="flex justify-end gap-3">
          <button onclick="closePrintModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
          <button id="confirm-print" onclick="confirmPrint()" class="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors hidden">Print</button>
        </div>
      </div>
    </div>

    <script>
      (function() {
        let allPrinters = [];
        let selectedPrinterForLabel = null;
        let selectedTargetPrinter = null;

        const searchInput = document.getElementById('printer-search');
        const searchResults = document.getElementById('search-results');
        const loadingIndicator = document.getElementById('loading-indicator');
        const errorMessage = document.getElementById('error-message');
        const selectedPrinterDiv = document.getElementById('selected-printer');
        const selectedPrinterName = document.getElementById('selected-printer-name');
        const selectedPrinterDetails = document.getElementById('selected-printer-details');
        const printBtn = document.getElementById('print-btn');
        const printModal = document.getElementById('printModal');
        const modalPrintersLoading = document.getElementById('modal-printers-loading');
        const modalPrintersList = document.getElementById('modal-printers-list');
        const modalPrintersError = document.getElementById('modal-printers-error');
        const confirmPrintBtn = document.getElementById('confirm-print');

        function escapeHtml(str) {
          if (str == null || str === undefined) return '';
          const div = document.createElement('div');
          div.textContent = String(str);
          return div.innerHTML;
        }

        async function loadPrinters() {
          loadingIndicator.classList.remove('hidden');
          errorMessage.classList.add('hidden');

          try {
            const response = await fetch('/api/printers/all');
            const result = await response.json();

            if (result.success && result.data) {
              allPrinters = result.data;
            } else {
              showError(result.error || 'Failed to load printers');
            }
          } catch (err) {
            showError('Failed to load printers');
          } finally {
            loadingIndicator.classList.add('hidden');
          }
        }

        function showError(msg) {
          errorMessage.textContent = msg;
          errorMessage.classList.remove('hidden');
        }

        function filterPrinters(query) {

          if (!query || query.length < 1) {
            searchResults.classList.add('hidden');
            return;
          }

          // Simple text search
          const lowerQuery = query.toLowerCase();
          const filtered = allPrinters.filter(p => {
            const name = (p.name || '').toLowerCase();
            const ip = (p.ip || '').toLowerCase();
            return name.includes(lowerQuery) || ip.includes(lowerQuery);
          });

          if (filtered.length === 0) {
            searchResults.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No printers found</p>';
            searchResults.classList.remove('hidden');
            return;
          }

          // Limit to 50 results for performance
          const displayResults = filtered.slice(0, 50);
          const hasMore = filtered.length > 50;

          searchResults.innerHTML = displayResults.map(p => {
            const printerName = escapeHtml(p.name || 'Unknown');
            const location = p.department && p.area
              ? escapeHtml(p.department) + ' - ' + escapeHtml(p.area)
              : 'No location';
            const ip = escapeHtml(p.ip || 'No IP');

            return \`
              <button type="button"
                class="w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                onclick="selectPrinter('\${printerName}', '\${location}', '\${ip}')">
                <div class="font-medium text-gray-900 dark:text-white">\${printerName}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">\${location} | \${ip}</div>
              </button>
            \`;
          }).join('') + (hasMore ? '<p class="text-gray-500 dark:text-gray-400 text-center py-2 text-xs">Showing first 50 of ' + filtered.length + ' results</p>' : '');
          searchResults.classList.remove('hidden');
        }

        window.selectPrinter = function(name, location, ip) {
          selectedPrinterForLabel = name;
          selectedPrinterName.textContent = name;
          selectedPrinterDetails.textContent = location + ' | ' + ip;
          selectedPrinterDiv.classList.remove('hidden');
          printBtn.classList.remove('hidden');
          searchResults.classList.add('hidden');
          searchInput.value = '';
        };

        window.clearSelection = function() {
          selectedPrinterForLabel = null;
          selectedPrinterDiv.classList.add('hidden');
          printBtn.classList.add('hidden');
        };

        window.openPrintModal = function() {
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

        window.closePrintModal = function() {
          printModal.classList.add('hidden');
          printModal.classList.remove('flex');
          selectedTargetPrinter = null;
        };

        function renderModalPrinters() {
          if (allPrinters.length === 0) {
            modalPrintersList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No printers available</p>';
            modalPrintersList.classList.remove('hidden');
            modalPrintersLoading.classList.add('hidden');
            return;
          }

          modalPrintersList.innerHTML = allPrinters.map((p, idx) => {
            const printerName = escapeHtml(p.name || 'Unknown');
            const location = p.department && p.area
              ? escapeHtml(p.department) + ' - ' + escapeHtml(p.area)
              : 'No location';
            const ip = escapeHtml(p.ip || 'No IP');

            return \`
              <label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">
                <input type="radio" name="target-printer" value="\${printerName}" class="mr-3 text-purple-600 dark:text-purple-500 focus:ring-purple-500 dark:focus:ring-purple-400" onchange="selectTargetPrinter('\${printerName}')">
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">\${printerName}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">\${location} | \${ip}</div>
                </div>
              </label>
            \`;
          }).join('');

          modalPrintersList.classList.remove('hidden');
          modalPrintersLoading.classList.add('hidden');
        }

        window.selectTargetPrinter = function(name) {
          selectedTargetPrinter = name;
          confirmPrintBtn.classList.remove('hidden');
        };

        window.confirmPrint = async function() {
          if (!selectedPrinterForLabel || !selectedTargetPrinter) return;

          const btn = confirmPrintBtn;
          const originalText = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = 'Printing...';

          try {
            const response = await fetch('/api/print-printer-tag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                printer_name: selectedPrinterForLabel,
                printer: selectedTargetPrinter
              })
            });

            const result = await response.json();

            if (result.success) {
              window.location.href = '/printer-labels?success=' + encodeURIComponent('Printer label sent successfully!');
            } else {
              window.location.href = '/printer-labels?error=' + encodeURIComponent(result.error || 'Failed to print label');
            }
          } catch (err) {
            window.location.href = '/printer-labels?error=' + encodeURIComponent('Failed to send print job');
          } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        };

        // Search input handler with debounce
        let searchTimeout;
        searchInput.addEventListener('input', function() {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            filterPrinters(this.value);
          }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
          if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
          }
        });

        // Load printers on page load
        loadPrinters();
      })();
    </script>
  `;

  return layout("Printer Labels", content, isAdmin, hasPcPwView, username, hasAuditApprover);
}
