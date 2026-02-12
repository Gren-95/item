import { layout } from "./layout";
import { SEARCH_ICON, EXCLAMATION_CIRCLE_ICON, EMOJI_SAD_ICON, PLUS_ICON, CLIPBOARD_LIST_ICON, X_ICON, QR_SCAN_ICON } from "./icons";
import { formatEstonianDate } from "../utils/date";

interface SearchResult {
  id: number;
  service_tag: string;
  type_name: string | null;
  product_line_name: string | null;
  model_name: string | null;
  vendor_name: string | null;
  assigned_to_name: string | null;
  location: string | null;
  latest_audit_date: string | null;
  plant_id: number | null;
  isReadonly?: boolean;
}

export interface ColumnFilters {
  serial: string;
  type: string;
  pline: string;
  model: string;
  vendor: string;
  assigned: string;
  location: string;
  date: string;
}

function buildFilterParams(filters: ColumnFilters): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(filters)) {
    if (val) parts.push(`f_${key}=${encodeURIComponent(val)}`);
  }
  return parts.length > 0 ? '&' + parts.join('&') : '';
}

function renderPagination(query: string, currentPage: number, totalPages: number, showAll: boolean, totalCount: number, filters: ColumnFilters): string {
  const encodedQuery = encodeURIComponent(query);
  const fp = buildFilterParams(filters);

  // "Show all" mode — just show a link back to paginated view
  if (showAll) {
    return `
    <div class="mt-6 flex items-center justify-between flex-wrap gap-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Showing all ${totalCount} results
      </div>
      <a href="/?q=${encodedQuery}&page=1${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        ← Back to paginated view
      </a>
    </div>`;
  }

  if (totalPages <= 1) return '';

  const prevBtn = currentPage > 1
    ? `<a href="/?q=${encodedQuery}&page=${currentPage - 1}${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">← Previous</a>`
    : `<span class="px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed">← Previous</span>`;

  const nextBtn = currentPage < totalPages
    ? `<a href="/?q=${encodedQuery}&page=${currentPage + 1}${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Next →</a>`
    : `<span class="px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed">Next →</span>`;

  const showAllBtn = `<a href="/?q=${encodedQuery}&all=1${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Show All</a>`;

  // Generate page numbers with ellipsis
  const maxVisible = 7;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pageLinks: string[] = [];

  if (start > 1) {
    pageLinks.push(`<a href="/?q=${encodedQuery}&page=1${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">1</a>`);
    if (start > 2) pageLinks.push('<span class="px-2 py-2 text-gray-400 dark:text-gray-600">…</span>');
  }

  for (let i = start; i <= end; i++) {
    if (i === currentPage) {
      pageLinks.push(`<span class="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg">${i}</span>`);
    } else {
      pageLinks.push(`<a href="/?q=${encodedQuery}&page=${i}${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">${i}</a>`);
    }
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pageLinks.push('<span class="px-2 py-2 text-gray-400 dark:text-gray-600">…</span>');
    pageLinks.push(`<a href="/?q=${encodedQuery}&page=${totalPages}${fp}" class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">${totalPages}</a>`);
  }

  return `
    <div class="mt-6 flex items-center justify-between flex-wrap gap-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Page ${currentPage} of ${totalPages}
      </div>
      <nav class="flex items-center gap-1" aria-label="Pagination">
        ${prevBtn}
        ${pageLinks.join('\n        ')}
        ${nextBtn}
        <span class="mx-1 text-gray-300 dark:text-gray-600">|</span>
        ${showAllBtn}
      </nav>
    </div>`;
}

const emptyFilters: ColumnFilters = { serial: '', type: '', pline: '', model: '', vendor: '', assigned: '', location: '', date: '' };

export function searchPage(
  query: string = "",
  results: SearchResult[] | null = null,
  error: string | null = null,
  isAdmin: boolean = false,
  hasPcPwView: boolean = false,
  userPlantId: number | null = null,
  username: string | null = null,
  hasAuditApprover: boolean = false,
  currentPage: number = 1,
  totalPages: number = 1,
  totalCount: number = 0,
  pageSize: number = 25,
  showAll: boolean = false,
  filters: ColumnFilters = emptyFilters
): string {
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const content = `
      <div class="max-w-6xl mx-auto">
      <div class="card mb-8">
        <div class="flex items-center gap-2 mb-6">
          ${SEARCH_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Equipment Search</h1>
        </div>
        
        <form id="search-form" action="/" method="GET" class="flex gap-4 items-end flex-wrap">
          <div class="w-full flex flex-col gap-2">
            <label for="q" class="label block mb-1 text-gray-700 dark:text-gray-200 font-medium">
              Search by Serial Number, User Name, Type, Model, Product Line, or Location
            </label>
            <div class="flex items-stretch w-full">
              <button 
                type="button" 
                id="scan-qr" 
                class="btn text-sm px-3 py-1 flex items-center gap-2 rounded-r-none border-r-0
                  bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700
                  focus:ring-2 focus:ring-green-400 focus:outline-none"
                aria-label="Scan QR code with camera"
              >
                ${QR_SCAN_ICON}
                <span></span>
              </button>
              <input 
                type="text" 
                id="q" 
                name="q" 
                value="${escapeHtml(query)}"
                placeholder="Search by serial, user, type, model, product line, or location..."
                class="input-field rounded-none border-x-0 flex-1 min-w-0"
                autofocus
              >
              <button id="search-btn" type="submit" class="btn btn-primary rounded-l-none border-l-0 flex items-center">
                <span class="flex items-center gap-2">
                  ${SEARCH_ICON}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      ${error ? `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-red-700 dark:text-red-400">
            ${EXCLAMATION_CIRCLE_ICON}
            <span>${escapeHtml(error)}</span>
          </div>
        </div>
      ` : ""}

      ${results !== null && results.length > 0 ? `
        <div class="card">
          <div class="mb-4 flex items-center justify-between flex-wrap gap-2">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Search Results
            </h2>
            <span id="showing-info" class="text-sm text-gray-500 dark:text-gray-400">
              ${showAll
                ? `Showing all ${totalCount} results`
                : `Showing ${((currentPage - 1) * pageSize) + 1}–${Math.min(currentPage * pageSize, totalCount)} of ${totalCount}`
              }
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                  <th class="py-3 px-2 md:px-4 sticky left-0 bg-white dark:bg-gray-800 z-10">Action</th>
                  <th class="py-3 px-2 md:px-4">Serial/Service Tag</th>
                  <th class="py-3 px-2 md:px-4 hidden md:table-cell">Type</th>
                  <th class="py-3 px-2 md:px-4 hidden lg:table-cell">Product Line</th>
                  <th class="py-3 px-2 md:px-4 hidden lg:table-cell">Model</th>
                  <th class="py-3 px-2 md:px-4 hidden xl:table-cell">Vendor</th>
                  <th class="py-3 px-2 md:px-4 hidden md:table-cell">Assigned To</th>
                  <th class="py-3 px-2 md:px-4 hidden lg:table-cell">Location</th>
                  <th class="py-3 px-2 md:px-4 hidden xl:table-cell">Last Update</th>
                  ${results && results.some(r => r.isReadonly) ? '<th class="py-3 px-2 md:px-4">Status</th>' : ''}
                </tr>
                <tr id="filter-row" class="border-b border-gray-200 dark:border-gray-700">
                  <th class="py-2 px-2 md:px-4 sticky left-0 z-10">
                    ${hasActiveFilters ? `<a href="/?q=${encodeURIComponent(query)}${showAll ? '&all=1' : ''}" class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap" title="Clear all filters">✕ Clear</a>` : ''}
                  </th>
                  <th class="py-2 px-2 md:px-4">
                    <input type="text" name="f_serial" data-filter value="${escapeHtml(filters.serial)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden md:table-cell">
                    <input type="text" name="f_type" data-filter value="${escapeHtml(filters.type)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden lg:table-cell">
                    <input type="text" name="f_pline" data-filter value="${escapeHtml(filters.pline)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden lg:table-cell">
                    <input type="text" name="f_model" data-filter value="${escapeHtml(filters.model)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden xl:table-cell">
                    <input type="text" name="f_vendor" data-filter value="${escapeHtml(filters.vendor)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden md:table-cell">
                    <input type="text" name="f_assigned" data-filter value="${escapeHtml(filters.assigned)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden lg:table-cell">
                    <input type="text" name="f_location" data-filter value="${escapeHtml(filters.location)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  <th class="py-2 px-2 md:px-4 hidden xl:table-cell">
                    <input type="text" name="f_date" data-filter value="${escapeHtml(filters.date)}" placeholder="Filter..." class="input-field !py-1 !px-2 !text-xs" />
                  </th>
                  ${results && results.some(r => r.isReadonly) ? '<th class="py-2 px-2 md:px-4"></th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${results.map(result => {
                  const isReadonly = result.isReadonly || false;
                  return `
                  <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isReadonly ? 'opacity-75' : ''}">
                    <td class="py-3 px-2 md:px-4 sticky left-0 bg-white dark:bg-gray-800 z-10">
                      ${isReadonly 
                        ? `<span class="btn btn-secondary btn-sm whitespace-nowrap cursor-not-allowed" title="Read-only: Equipment from another plant">View Only</span>`
                        : `<a href="/edit/${result.id}" class="btn btn-primary btn-sm whitespace-nowrap">View</a>`
                      }
                    </td>
                    <td class="py-3 px-2 md:px-4 font-mono text-gray-900 dark:text-white text-xs md:text-sm">${escapeHtml(result.service_tag || '')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden md:table-cell">${escapeHtml(result.type_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden lg:table-cell">${escapeHtml(result.product_line_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden lg:table-cell">${escapeHtml(result.model_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden xl:table-cell">${escapeHtml(result.vendor_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden md:table-cell">${escapeHtml(result.assigned_to_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 text-xs hidden lg:table-cell">${escapeHtml(result.location || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-500 dark:text-gray-400 text-xs hidden xl:table-cell">${result.latest_audit_date ? formatEstonianDate(result.latest_audit_date, '—') : '—'}</td>
                    ${results && results.some(r => r.isReadonly) ? `<td class="py-3 px-2 md:px-4">${isReadonly ? '<span class="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">Read-only</span>' : '—'}</td>` : ''}
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ${renderPagination(query, currentPage, totalPages, showAll, totalCount, filters)}
        </div>
      ` : results !== null && results.length === 0 ? `
        <div class="card">
          <div class="text-center py-8">
            <div class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600 flex items-center justify-center">
              ${EMOJI_SAD_ICON.replace('w-5 h-5', 'w-16 h-16')}
            </div>
            <p class="text-gray-500 dark:text-gray-400 mb-4">No equipment found matching "${escapeHtml(query)}"</p>
            <a href="/add?serial=${encodeURIComponent(query)}" class="btn btn-primary inline-flex items-center gap-2">
              ${PLUS_ICON}
              Add New Equipment
            </a>
          </div>
        </div>
      ` : `
        <div class="text-center py-12">
          <div class="w-24 h-24 mx-auto mb-6 text-gray-200 dark:text-gray-700 flex items-center justify-center">
            ${CLIPBOARD_LIST_ICON.replace('w-5 h-5', 'w-24 h-24')}
          </div>
          <h2 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Start an Equipment Search</h2>
          <p class="text-gray-500 dark:text-gray-400">Search by serial number, user name, device type, model, product line, or location</p>
        </div>
      `}
    </div>

    <!-- QR Scanner Modal -->
    <div id="qrModal" class="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 hidden items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl p-6 relative">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Scan QR Code</h2>
          <button id="closeQr" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
          </button>
        </div>
        <div class="space-y-4">
          <div id="qrStatus" class="text-sm text-gray-600 dark:text-gray-300">Initializing camera...</div>
          <div class="w-full h-80 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
            <video id="qrVideo" class="w-full h-full object-cover" playsinline autoplay muted style="display: none;"></video>
            <div id="qrLoading" class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
              <span>Loading scanner...</span>
            </div>
          </div>
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div id="qrCapability" class="text-xs text-gray-500 dark:text-gray-400"></div>
            <div class="flex gap-2">
              <button id="torchQr" class="btn btn-secondary btn-sm hidden">Flashlight</button>
              <button id="cancelQr" class="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      (function() {
        const scanBtn = document.getElementById('scan-qr');
        const qrModal = document.getElementById('qrModal');
        const closeQr = document.getElementById('closeQr');
        const cancelQr = document.getElementById('cancelQr');
        const torchQr = document.getElementById('torchQr');
        const qrCapability = document.getElementById('qrCapability');
        const qrVideo = document.getElementById('qrVideo');
        const qrLoading = document.getElementById('qrLoading');
        const qrStatus = document.getElementById('qrStatus');
        const searchInput = document.getElementById('q');
        let qrScanner = null;
        let isLoadingScript = false;

        function showModal() {
          qrModal.classList.remove('hidden');
          qrModal.classList.add('flex');
        }

        function hideModal() {
          qrModal.classList.add('hidden');
          qrModal.classList.remove('flex');
        }

        async function loadQrLib() {
          if (window.QrScanner) {
            // Set worker path
            QrScanner.WORKER_PATH = '/js/qr-scanner-worker.min.js';
            return;
          }
          if (isLoadingScript) {
            return new Promise((resolve) => {
              const check = setInterval(() => {
                if (window.QrScanner) {
                  clearInterval(check);
                  QrScanner.WORKER_PATH = '/js/qr-scanner-worker.min.js';
                  resolve(null);
                }
              }, 100);
            });
          }
          isLoadingScript = true;
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/qr-scanner.umd.min.js';
            script.onload = () => {
              // Set worker path after library loads
              if (window.QrScanner) {
                QrScanner.WORKER_PATH = '/js/qr-scanner-worker.min.js';
              }
              resolve(null);
            };
            script.onerror = () => reject(new Error('Failed to load QR library'));
            document.body.appendChild(script);
          });
          isLoadingScript = false;
        }

        async function toggleTorch() {
          if (!qrScanner) return;
          try {
            const hasFlash = await qrScanner.hasFlash();
            if (!hasFlash) {
              qrStatus.textContent = 'Flash not available on this camera';
              return;
            }
            await qrScanner.toggleFlash();
            const isOn = qrScanner.isFlashOn();
            torchQr.textContent = isOn ? 'Flashlight On' : 'Flashlight Off';
          } catch (err) {
            console.error('[QR] Flash toggle error', err);
            qrStatus.textContent = 'Flash control error';
          }
        }

        async function startScanner(preferredCamera = 'environment') {
          qrStatus.textContent = 'Initializing camera...';
          qrLoading.style.display = 'flex';
          qrVideo.style.display = 'none';
          
          await loadQrLib();

          if (qrScanner) {
            try {
              qrScanner.stop();
              qrScanner.destroy();
            } catch (e) {}
            qrScanner = null;
          }

          try {
            // Ensure video element is ready
            qrVideo.style.display = 'block';
            qrVideo.style.visibility = 'visible';
            
            // Create scanner with continuous focus enabled via video constraints
            qrScanner = new QrScanner(
              qrVideo,
              (result) => {
                if (result && result.data) {
                  searchInput.value = result.data;
                  try {
                    qrScanner.stop();
                    qrScanner.destroy();
                  } catch (e) {}
                  hideModal();
                  const form = searchInput.form || document.getElementById('search-form');
                  if (form && typeof form.submit === 'function') {
                    setTimeout(() => form.submit(), 0);
                  }
                }
              },
              {
                preferredCamera: preferredCamera,
                returnDetailedScanResult: true,
                // Enable continuous focus via video constraints
                onDecodeError: () => {}, // Ignore decode errors
                highlightScanRegion: false,
                highlightCodeOutline: false,
              }
            );

            // Start scanning
            await qrScanner.start();
            
            // Hide loading overlay
            qrLoading.style.display = 'none';
            
            // Wait a moment for stream to attach, then verify
            setTimeout(() => {
              if (qrVideo.srcObject) {
                console.log('[QR] Video stream attached successfully');
                qrStatus.textContent = 'Point the camera at a QR code';
                // Ensure video plays
                if (qrVideo.paused) {
                  qrVideo.play().catch(err => console.warn('[QR] Video play error', err));
                }
              } else {
                console.error('[QR] No video stream attached after start');
                qrStatus.textContent = 'Camera stream not available - check permissions';
                qrLoading.style.display = 'flex';
              }
            }, 500);

            // Check for flash support and update UI
            try {
              const hasFlash = await qrScanner.hasFlash();
              if (hasFlash) {
                torchQr.classList.remove('hidden');
                torchQr.textContent = qrScanner.isFlashOn() ? 'Flashlight On' : 'Flashlight Off';
                qrCapability.textContent = 'Flash available';
              } else {
                torchQr.classList.add('hidden');
                qrCapability.textContent = 'No flash control';
              }
            } catch (err) {
              torchQr.classList.add('hidden');
              qrCapability.textContent = '';
            }

            // Apply continuous focus if possible
            try {
              const stream = qrVideo.srcObject;
              if (stream && stream.getVideoTracks().length > 0) {
                const track = stream.getVideoTracks()[0];
                const capabilities = track.getCapabilities();
                if (capabilities && capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                  await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                  qrCapability.textContent = (qrCapability.textContent || '') + ' • Continuous focus';
                }
              }
            } catch (err) {
              // Focus not supported, ignore
            }

          } catch (err) {
            console.error('[QR] Failed to start scanner', err);
            qrStatus.textContent = 'Camera error: ' + (err.message || err || 'Unknown');
            qrLoading.style.display = 'flex';
            qrVideo.style.display = 'none';
          }
        }

        function stopScanner() {
          if (qrScanner) {
            try {
              qrScanner.stop();
              qrScanner.destroy();
            } catch (e) {}
            qrScanner = null;
          }
        }

        async function openScanner() {
          showModal();
          try {
            // Load library first before using any QrScanner methods
            await loadQrLib();
            
            console.log('[QR] Checking camera availability');
            const hasCamera = await QrScanner.hasCamera();
            if (!hasCamera) {
              qrStatus.textContent = 'No camera available';
              return;
            }

            console.log('[QR] Listing cameras');
            const cameras = await QrScanner.listCameras(true);
            console.log('[QR] Available cameras', cameras);
            
            // Prefer back/rear camera
            const backCam = cameras.find(c => /back|rear|environment/i.test(c.label));
            const preferredCamera = backCam ? backCam.id : (cameras[0]?.id || 'environment');
            
            console.log('[QR] Using camera', preferredCamera);
            await startScanner(preferredCamera);
          } catch (e) {
            console.error('[QR] Error opening scanner', e);
            qrStatus.textContent = 'Camera error: ' + (e.message || e || 'Unknown');
          }
        }

        if (scanBtn) {
          scanBtn.addEventListener('click', openScanner);
        }
        if (closeQr) {
          closeQr.addEventListener('click', () => { stopScanner(); hideModal(); });
        }
        if (cancelQr) {
          cancelQr.addEventListener('click', () => { stopScanner(); hideModal(); });
        }
        if (torchQr) {
          torchQr.addEventListener('click', toggleTorch);
        }
      })();
    </script>

    <script>
      (function() {
        // Server-side column filters — debounce and navigate with filter params
        const filterInputs = document.querySelectorAll('input[data-filter]');
        if (filterInputs.length === 0) return;

        let debounceTimer = null;

        function applyFilters() {
          const params = new URLSearchParams(window.location.search);
          // Reset to page 1 when filters change
          params.set('page', '1');
          // Collect all filter values
          filterInputs.forEach(function(input) {
            const name = input.getAttribute('name');
            const val = input.value.trim();
            if (val) {
              params.set(name, val);
            } else {
              params.delete(name);
            }
          });
          window.location.href = '/?' + params.toString();
        }

        filterInputs.forEach(function(input) {
          input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 600);
          });
          // Also apply on Enter immediately
          input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              clearTimeout(debounceTimer);
              applyFilters();
            }
          });
        });
      })();
    </script>

    <style>
      #filter-row {
        background-color: rgb(249 250 251); /* bg-gray-50 */
      }
      #filter-row th:first-child {
        background-color: rgb(249 250 251); /* bg-gray-50 for sticky column */
      }
      .dark #filter-row {
        background-color: rgb(31 41 55 / 0.5); /* dark:bg-gray-800/50 */
      }
      .dark #filter-row th:first-child {
        background-color: rgb(31 41 55); /* dark:bg-gray-800 for sticky column */
      }
    </style>
  `;

  return layout("Search", content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
