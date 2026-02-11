import { layout } from "./layout";
import { renderAlert } from "./components";
import { getModalHtml, getScriptsHtml } from "./components";
import { button } from "./buttons";
import {
  PLUS_ICON,
  ARROW_LEFT_ICON,
  EXCLAMATION_TRIANGLE_ICON,
  INFORMATION_CIRCLE_ICON,
  REFRESH_ICON,
  CPU_ICON,
  LOCATION_ICON,
  CLIPBOARD_LIST_ICON,
  USER_ICON,
  PRINTER_ICON,
  X_ICON,
  MENU_ALT_ICON
} from "./icons";

interface SelectOption {
  id: number;
  name: string;
  parent_id?: number;
}

interface InventoryPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

interface AddData {
  serviceTag: string;
  regions: SelectOption[];
  countries: SelectOption[];
  plants: SelectOption[];
  departments: SelectOption[];
  areas: SelectOption[];
  subAreas: SelectOption[];
  types: SelectOption[];
  productLines: SelectOption[];
  models: SelectOption[];
  vendors: SelectOption[];
  suppliers: SelectOption[];
  employees: { employee_no: string; name: string }[];
  inventoryPeriods: InventoryPeriod[];
}

export function addPage(data: AddData, success: boolean = false, error: string | null = null, isAdmin: boolean = false, hasPcPwView: boolean = false, username: string | null = null, hasAuditApprover: boolean = false): string {
  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <a href="/" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          ${ARROW_LEFT_ICON.replace('w-5 h-5', 'w-6 h-6')}
        </a>
        <div class="flex items-center gap-2">
          ${PLUS_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Add New Equipment</h1>
        </div>
      </div>

      ${renderAlert(success, error)}

      <!-- Pre-action approval warning banner -->
      <div id="approval-warning" class="hidden mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div class="flex items-start gap-3">
          ${EXCLAMATION_TRIANGLE_ICON.replace('w-5 h-5', 'w-6 h-6 flex-shrink-0 mt-0.5').replace('text-current', 'text-yellow-600 dark:text-yellow-400')}
          <div>
            <h3 class="font-semibold text-yellow-800 dark:text-yellow-200">Approval Required</h3>
            <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              You don't have direct permission to add equipment. When you submit this form, it will be sent to an administrator for approval.
            </p>
          </div>
        </div>
      </div>

      <form action="/add" method="POST">
        <!-- Basic Information -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ${INFORMATION_CIRCLE_ICON.replace('text-current', 'text-gray-400')}
            Basic Information
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="service_tag" class="label">Service Tag / Serial Number <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                id="service_tag" 
                name="service_tag" 
                value="${escapeHtml(data.serviceTag)}"
                placeholder="Enter service tag..."
                class="input-field font-mono"
                required
              >
            </div>
            <div>
              <label for="vendor_id" class="label">Vendor</label>
              <select id="vendor_id" name="vendor_id" class="select-field" onchange="handleVendorChange(this)">
                <option value="">Select Vendor...</option>
                ${data.vendors.map(v => `
                  <option value="${v.id}" data-name="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new vendor...</option>
              </select>
              <div id="dell-warranty-hint" class="hidden mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    ${INFORMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-4 h-4 flex-shrink-0')}
                    <span>Enter the service tag and click <strong>Get Warranty</strong> to auto-fill dates.</span>
                  </p>
                  <button type="button" id="get-warranty-btn" onclick="fetchDellWarranty()" class="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5">
                    ${REFRESH_ICON.replace('w-5 h-5', 'w-4 h-4')}
                    Get Warranty
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label for="purchase_date" class="label">Purchase Date <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                id="purchase_date" 
                name="purchase_date"
                class="input-field"
                placeholder="dd.mm.yyyy"
                pattern="(\\d{2}[.,-]\\d{2}[.,-]\\d{4}|\\d{6}|\\d{8})"
                required
              >
            </div>
            <div>
              <label for="warranty_expiry_date" class="label">Warranty Expiry Date <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                id="warranty_expiry_date" 
                name="warranty_expiry_date"
                class="input-field"
                placeholder="dd.mm.yyyy"
                pattern="(\\d{2}[.,-]\\d{2}[.,-]\\d{4}|\\d{6}|\\d{8})"
                required
              >
            </div>
            <div>
              <label for="supplier_id" class="label">Supplier</label>
              <select id="supplier_id" name="supplier_id" class="select-field" onchange="handleSelectChange(this, 'suppliers', 'Supplier')">
                <option value="">Select Supplier...</option>
                ${data.suppliers.map(s => `
                  <option value="${s.id}">${escapeHtml(s.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new supplier...</option>
              </select>
            </div>
            <div>
              <label for="cerf" class="label">CERF</label>
              <input 
                type="number" 
                id="cerf" 
                name="cerf"
                placeholder="Enter CERF number..."
                class="input-field"
              >
            </div>
          </div>
        </div>

        <!-- Type & Model Selection -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ${CPU_ICON.replace('text-current', 'text-gray-400')}
            Equipment Type
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="type_id" class="label">Type</label>
              <select id="type_id" name="type_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'types', 'Type'); } else { loadProductLines(this.value); }">
                <option value="">Select Type...</option>
                ${data.types.map(t => `
                  <option value="${t.id}">${escapeHtml(t.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new type...</option>
              </select>
            </div>
            <div>
              <label for="product_line_id" class="label">Product Line</label>
              <select id="product_line_id" name="product_line_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'product-lines', 'Product Line', 'type_id'); } else { loadModels(this.value); }">
                <option value="">Select Type first...</option>
                ${data.productLines.map(pl => `
                  <option value="${pl.id}" data-parent="${pl.parent_id}" hidden>${escapeHtml(pl.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new product line...</option>
              </select>
            </div>
            <div>
              <label for="model_id" class="label">Model</label>
              <select id="model_id" name="model_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'models', 'Model', 'product_line_id'); }">
                <option value="">Select Product Line first...</option>
                ${data.models.map(m => `
                  <option value="${m.id}" data-parent="${m.parent_id}" hidden>${escapeHtml(m.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new model...</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Location Selection -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ${LOCATION_ICON.replace('text-current', 'text-gray-400')}
            Location
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label for="region_id" class="label">Region</label>
              <select id="region_id" name="region_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'regions', 'Region'); } else { loadCountries(this.value); }">
                <option value="">Select Region...</option>
                ${data.regions.map(r => `
                  <option value="${r.id}">${escapeHtml(r.name)}</option>
                `).join("")}
                ${isAdmin ? '<option value="__add_new__" class="text-blue-600 font-medium">+ Add new region...</option>' : ''}
              </select>
            </div>
            <div>
              <label for="country_id" class="label">Country</label>
              <select id="country_id" name="country_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'countries', 'Country', 'region_id'); } else { loadPlants(this.value); }">
                <option value="">Select Region first...</option>
                ${data.countries.map(c => `
                  <option value="${c.id}" data-parent="${c.parent_id}" hidden>${escapeHtml(c.name)}</option>
                `).join("")}
                ${isAdmin ? '<option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new country...</option>' : ''}
              </select>
            </div>
            <div>
              <label for="plant_id" class="label">Plant</label>
              <select id="plant_id" name="plant_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'plants', 'Plant', 'country_id'); } else { loadDepartments(this.value); }">
                <option value="">Select Country first...</option>
                ${data.plants.map(p => `
                  <option value="${p.id}" data-parent="${p.parent_id}" hidden>${escapeHtml(p.name)}</option>
                `).join("")}
                ${isAdmin ? '<option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new plant...</option>' : ''}
              </select>
            </div>
            <div>
              <label for="department_id" class="label">Department</label>
              <select id="department_id" name="department_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'departments', 'Department', 'plant_id'); } else { loadAreas(this.value); }">
                <option value="">Select Plant first...</option>
                ${data.departments.map(d => `
                  <option value="${d.id}" data-parent="${d.parent_id}" hidden>${escapeHtml(d.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new department...</option>
              </select>
            </div>
            <div>
              <label for="area_id" class="label">Area</label>
              <select id="area_id" name="area_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'areas', 'Area', 'department_id'); } else { loadSubAreas(this.value); }">
                <option value="">Select Department first...</option>
                ${data.areas.map(a => `
                  <option value="${a.id}" data-parent="${a.parent_id}" hidden>${escapeHtml(a.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new area...</option>
              </select>
            </div>
            <div>
              <label for="equipment_sub_area_id" class="label">Sub Area</label>
              <select id="equipment_sub_area_id" name="equipment_sub_area_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'sub-areas', 'Sub Area', 'area_id'); }">
                <option value="">Select Area first...</option>
                ${data.subAreas.map(sa => `
                  <option value="${sa.id}" data-parent="${sa.parent_id}" hidden>${escapeHtml(sa.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" hidden class="text-blue-600 font-medium">+ Add new sub area...</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inventory Period -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ${CLIPBOARD_LIST_ICON.replace('text-current', 'text-gray-400')}
            Inventory
          </h2>
          
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="inventory_period_id" class="label">Inventory Period</label>
              <select id="inventory_period_id" name="inventory_period_id" class="select-field">
                <option value="">No inventory period</option>
                ${data.inventoryPeriods.map(ip => `
                  <option value="${ip.id}">${escapeHtml(ip.name)} (${ip.start_date} - ${ip.end_date})</option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Assignment & TeamViewer -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ${USER_ICON.replace('text-current', 'text-gray-400')}
            Assignment & Remote Access
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="assigned_to" class="label">Assigned To</label>
              <select id="assigned_to" name="assigned_to" class="select-field">
                <option value="">Unassigned</option>
                ${data.employees.map(e => `
                  <option value="${escapeHtml(e.employee_no)}">${escapeHtml(e.name)} (${escapeHtml(e.employee_no)})</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="teamviewer" class="label">TeamViewer ID</label>
              <input 
                type="text" 
                id="teamviewer" 
                name="teamviewer"
                placeholder="Enter TeamViewer ID..."
                class="input-field"
              >
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ${MENU_ALT_ICON.replace('text-current', 'text-gray-400')}
            Additional Information
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ip" class="label">IP Address</label>
              <input 
                type="text" 
                id="ip" 
                name="ip"
                placeholder="e.g., 192.168.1.100"
                class="input-field font-mono"
              >
            </div>
            <div>
              <label for="mac_addresses" class="label">MAC Addresses</label>
              <input 
                type="text" 
                id="mac_addresses" 
                name="mac_addresses"
                placeholder="Comma-separated MAC addresses"
                class="input-field font-mono"
              >
            </div>
            <div class="md:col-span-2">
              <label for="comment" class="label">Comments</label>
              <textarea 
                id="comment" 
                name="comment"
                rows="3"
                placeholder="Any additional notes..."
                class="input-field"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-4">
          <a href="/" class="btn btn-secondary">Cancel</a>
          <button type="button" id="print-label" class="btn btn-secondary hidden" data-service-tag="${escapeHtml(data.serviceTag)}">
            <span class="flex items-center gap-2">
              ${PRINTER_ICON}
              Print Label
            </span>
          </button>
          <button type="submit" class="btn btn-success">
            <span class="flex items-center gap-2">
              ${PLUS_ICON}
              Add Equipment
            </span>
          </button>
        </div>
      </form>
      
      <!-- Print Modal -->
      <div id="printModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transition-colors">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Printer</h3>
            <button onclick="closePrintModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
            </button>
          </div>
          <div id="printModalBody">
            <div id="printers-loading" class="text-center py-4">
              ${REFRESH_ICON.replace('w-5 h-5', 'w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto')}
              <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
            </div>
            <div id="printers-list" class="hidden max-h-64 overflow-y-auto mb-4"></div>
            <div id="printers-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
          </div>
          <div class="flex justify-end gap-3">
            ${button("Cancel", { variant: "secondary", onClick: "closePrintModal()" })}
            ${button("Print", { variant: "primary", className: "hidden", onClick: "confirmPrint()" })}
          </div>
        </div>
      </div>
      
      <script>
        (function() {
          let printers = [];
          let selectedPrinter = null;
          let currentServiceTag = '';
          
          const serviceTagInput = document.getElementById('service_tag');
          const printBtn = document.getElementById('print-label');
          const printModal = document.getElementById('printModal');
          const printersLoading = document.getElementById('printers-loading');
          const printersList = document.getElementById('printers-list');
          const printersError = document.getElementById('printers-error');
          const confirmPrintBtn = document.getElementById('confirm-print');
          
          // Show print button when service tag is entered
          if (serviceTagInput && printBtn) {
            serviceTagInput.addEventListener('input', function() {
              const tag = this.value.trim();
              if (tag) {
                printBtn.classList.remove('hidden');
                printBtn.dataset.serviceTag = tag;
              } else {
                printBtn.classList.add('hidden');
              }
            });
          }
          
          async function loadPrinters() {
            try {
              const response = await fetch('/api/printers');
              const result = await response.json();
              
              if (result.success && result.data) {
                printers = result.data.filter(p => (p.driver || '').toLowerCase().includes('brother'));
                renderPrinters();
              } else {
                showError(result.message || 'Failed to load printers');
              }
            } catch (err) {
              showError('Error loading printers: ' + err.message);
            } finally {
              printersLoading.classList.add('hidden');
            }
          }
          
          function renderPrinters() {
            if (printers.length === 0) {
              printersList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No Brother printers available</p>';
              printersList.classList.remove('hidden');
              return;
            }
            
            printersList.innerHTML = printers.map((p) => \`
              <label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input type="radio" name="printer" value="\${p.name}" class="mr-3" onchange="selectPrinter('\${p.name}')">
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">\${escapeHtml(p.name)}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    \${escapeHtml(p.department)} - \${escapeHtml(p.area)} | \${escapeHtml(p.ip)}
                  </div>
                </div>
              </label>
            \`).join('');
            printersList.classList.remove('hidden');
          }
          
          function showError(msg) {
            printersError.textContent = msg;
            printersError.classList.remove('hidden');
          }
          
          window.selectPrinter = function(name) {
            selectedPrinter = name;
            confirmPrintBtn.classList.remove('hidden');
          };
          
          window.closePrintModal = function() {
            printModal.classList.add('hidden');
            printModal.classList.remove('flex');
            selectedPrinter = null;
            confirmPrintBtn.classList.add('hidden');
          };
          
          window.confirmPrint = async function() {
            if (!selectedPrinter || !currentServiceTag) return;
            
            const btn = confirmPrintBtn;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = 'Printing...';
            
            try {
              const response = await fetch('/api/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  service_tag: currentServiceTag,
                  printer: selectedPrinter
                })
              });
              
              const result = await response.json();
              
              if (response.ok) {
                alert('Label sent to printer successfully!');
                closePrintModal();
              } else {
                alert('Error printing label: ' + (result.error || 'Unknown error'));
              }
            } catch (err) {
              alert('Error printing label: ' + err.message);
            } finally {
              btn.disabled = false;
              btn.innerHTML = originalText;
            }
          };
          
          if (printBtn) {
            printBtn.addEventListener('click', function() {
              currentServiceTag = this.dataset.serviceTag;
              if (!currentServiceTag) return;
              
              printModal.classList.remove('hidden');
              printModal.classList.add('flex');
              printersLoading.classList.remove('hidden');
              printersList.classList.add('hidden');
              printersError.classList.add('hidden');
              confirmPrintBtn.classList.add('hidden');
              loadPrinters();
            });
          }
          
          function escapeHtml(str) {
            return String(str)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          }
        })();

        // Dell warranty fetch handler
        window.fetchDellWarranty = async function() {
          const serviceTagInput = document.getElementById('service_tag');
          const serviceTag = serviceTagInput ? serviceTagInput.value.trim() : '';

          if (!serviceTag) {
            alert('Please enter a service tag first.');
            serviceTagInput?.focus();
            return;
          }

          const btn = document.getElementById('get-warranty-btn');
          const originalHtml = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '${REFRESH_ICON.replace('w-5 h-5', 'w-4 h-4 animate-spin')} Loading...';

          try {
            const response = await fetch('/api/dell-warranty/' + encodeURIComponent(serviceTag));
            const result = await response.json();

            if (result.success && result.data) {
              const purchaseDateInput = document.getElementById('purchase_date');
              const warrantyExpiryInput = document.getElementById('warranty_expiry_date');

              if (result.data.shipDate && purchaseDateInput) {
                purchaseDateInput.value = formatEstonianDate(result.data.shipDate);
              }
              if (result.data.warrantyEnd && warrantyExpiryInput) {
                warrantyExpiryInput.value = formatEstonianDate(result.data.warrantyEnd);
              }

              // Flash success on the fields
              [purchaseDateInput, warrantyExpiryInput].forEach(input => {
                if (input) {
                  input.classList.add('ring-2', 'ring-green-500');
                  setTimeout(() => input.classList.remove('ring-2', 'ring-green-500'), 2000);
                }
              });
            } else {
              alert(result.message || 'Could not retrieve warranty information for this service tag.');
            }
          } catch (err) {
            alert('Error fetching warranty: ' + err.message);
          } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
          }
        };

        // Dell warranty hint handler
        function handleVendorChange(select) {
          const selectedOption = select.options[select.selectedIndex];
          const vendorName = selectedOption ? selectedOption.dataset.name || '' : '';
          const dellHint = document.getElementById('dell-warranty-hint');

          // Check if it's the "add new" option
          if (select.value === '__add_new__') {
            handleSelectChange(select, 'vendors', 'Vendor');
            if (dellHint) dellHint.classList.add('hidden');
            return;
          }

          // Show hint if Dell is selected (case-insensitive check)
          if (dellHint) {
            if (vendorName.toLowerCase().includes('dell')) {
              dellHint.classList.remove('hidden');
            } else {
              dellHint.classList.add('hidden');
            }
          }
        }

        // Check if user needs approval for adding equipment
        (async function checkAddPermission() {
          try {
            const response = await fetch('/api/check-permission?permission=edit');
            const result = await response.json();
            const warningBanner = document.getElementById('approval-warning');
            if (warningBanner && result.requiresApproval) {
              warningBanner.classList.remove('hidden');
            }
          } catch (err) {
            console.error('Failed to check permission:', err);
          }
        })();
      </script>
    </div>

    ${getModalHtml()}
    ${getScriptsHtml()}
  `;

  return layout("Add Equipment", content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
