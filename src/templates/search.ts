import { layout } from "./layout";

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
}

export function searchPage(
  query: string = "",
  results: SearchResult[] | null = null,
  error: string | null = null,
  isAdmin: boolean = false
): string {
  const content = `
      <div class="max-w-6xl mx-auto">
      <div class="card mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Equipment Search</h1>
        
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
                <svg class="w-5 h-5" fill="none" viewBox="0 0 25 25">
                  <path d="M4,4h6v6H4V4M20,4v6H14V4h6M14,15h2V13H14V11h2v2h2V11h2v2H18v2h2v3H18v2H16V18H13v2H11V16h3V15m2,0v3h2V15H16M4,20V14h6v6H4M6,6V8H8V6H6M16,6V8h2V6H16M6,16v2H8V16H6M4,11H6v2H4V11m5,0h4v4H11V13H9V11m2-5h2v4H11V6M2,2V6H0V2A2,2,0,0,1,2,0H6V2H2M22,0a2,2,0,0,1,2,2V6H22V2H18V0h4M2,18v4H6v2H2a2,2,0,0,1-2-2V18H2m20,4V18h2v4a2,2,0,0,1-2,2H18V22Z" fill="currentColor"/>
                </svg>
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
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      ${error ? `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-red-700 dark:text-red-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${escapeHtml(error)}</span>
          </div>
        </div>
      ` : ""}

      ${results !== null && results.length > 0 ? `
        <div class="card">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Search Results (${results.length})
            </h2>
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
                </tr>
              </thead>
              <tbody>
                ${results.map(result => `
                  <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td class="py-3 px-2 md:px-4 sticky left-0 bg-white dark:bg-gray-800 z-10">
                      <a href="/edit/${result.id}" class="btn btn-primary btn-sm whitespace-nowrap">View</a>
                    </td>
                    <td class="py-3 px-2 md:px-4 font-mono text-gray-900 dark:text-white text-xs md:text-sm">${escapeHtml(result.service_tag || '')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden md:table-cell">${escapeHtml(result.type_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden lg:table-cell">${escapeHtml(result.product_line_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden lg:table-cell">${escapeHtml(result.model_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden xl:table-cell">${escapeHtml(result.vendor_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 hidden md:table-cell">${escapeHtml(result.assigned_to_name || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-700 dark:text-gray-300 text-xs hidden lg:table-cell">${escapeHtml(result.location || '—')}</td>
                    <td class="py-3 px-2 md:px-4 text-gray-500 dark:text-gray-400 text-xs hidden xl:table-cell">${result.latest_audit_date ? new Date(result.latest_audit_date).toLocaleDateString() : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : results !== null && results.length === 0 ? `
        <div class="card">
          <div class="text-center py-8">
            <svg class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-gray-500 dark:text-gray-400 mb-4">No equipment found matching "${escapeHtml(query)}"</p>
            <a href="/add?serial=${encodeURIComponent(query)}" class="btn btn-primary inline-flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add New Equipment
            </a>
          </div>
        </div>
      ` : `
        <div class="text-center py-12">
          <svg class="w-24 h-24 text-gray-200 dark:text-gray-700 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
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
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
  `;

  return layout("Search", content, isAdmin);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
