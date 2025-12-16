import { layout } from "./layout";
import { getModalHtml, getScriptsHtml } from "./components";

interface Equipment {
  id: number;
  service_tag: string;
  model_id: number | null;
  vendor_id: number | null;
  type_id: number | null;
  product_line_id: number | null;
  type_name: string | null;
  product_line_name: string | null;
  model_name: string | null;
  vendor_name: string | null;
  purchase_date: string;
  warranty_expiry_date: string;
  teamviewer: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  equipment_sub_area_id: number | null;
  region_id: number | null;
  country_id: number | null;
  plant_id: number | null;
  department_id: number | null;
  area_id: number | null;
  latest_audit_date: string | null;
  comment: string | null;
  inventory_period_id: number | null;
  inventory_nr: string | null;
  is_written_off: number | null;
  write_off_reason: string | null;
}

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

interface AuditData {
  equipment: Equipment;
  regions: SelectOption[];
  countries: SelectOption[];
  plants: SelectOption[];
  departments: SelectOption[];
  areas: SelectOption[];
  subAreas: SelectOption[];
  types: SelectOption[];
  productLines: SelectOption[];
  models: SelectOption[];
  employees: { employee_no: string; name: string }[];
  inventoryPeriods: InventoryPeriod[];
  vendors: SelectOption[];
  suppliers: SelectOption[];
  writeOffReasons: SelectOption[];
}

export function auditPage(data: AuditData, success: boolean = false, error: string | null = null): string {
  const eq = data.equipment;
  
  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <a href="/" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </a>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Edit Equipment</h1>
        <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-mono text-sm">${escapeHtml(eq.service_tag)}</span>
      </div>

      ${success ? `
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-green-700 dark:text-green-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Equipment saved successfully!</span>
          </div>
        </div>
      ` : ""}

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

      <form action="/edit/${eq.id}" method="POST">
        <!-- Equipment Information -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Equipment Information
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label for="purchase_date" class="label">Warranty Start</label>
              <div class="flex items-center gap-2">
                <input
                  type="date"
                  id="purchase_date"
                  name="purchase_date"
                  value="${formatDateForInput(eq.purchase_date)}"
                  class="input-field flex-1"
                >
                <button
                  type="button"
                  onclick="restoreWarrantyDates()"
                  class="btn btn-secondary text-xs whitespace-nowrap"
                  title="Restore warranty dates from database"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label for="warranty_expiry_date" class="label">Warranty Expiry</label>
              <input
                type="date"
                id="warranty_expiry_date"
                name="warranty_expiry_date"
                value="${formatDateForInput(eq.warranty_expiry_date)}"
                class="input-field ${isExpired(eq.warranty_expiry_date) ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : ""}"
              >
            </div>
            <div>
              <label for="vendor_id" class="label">Vendor</label>
              <select id="vendor_id" name="vendor_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'vendors', 'Vendor'); }">
                <option value="">Select Vendor...</option>
                ${data.vendors.map(v => `
                  <option value="${v.id}" ${eq.vendor_id === v.id ? "selected" : ""}>${escapeHtml(v.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new vendor...</option>
              </select>
            </div>
            <div>
              <label for="supplier_id" class="label">Supplier</label>
              <select id="supplier_id" name="supplier_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'suppliers', 'Supplier'); }">
                <option value="">Select Supplier...</option>
                ${data.suppliers.map(s => `
                  <option value="${s.id}" ${eq.supplier_id === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new supplier...</option>
              </select>
            </div>
            <div>
              <label class="label">Service Tag</label>
              <div class="readonly-field font-mono bg-white dark:bg-gray-800">${escapeHtml(eq.service_tag)}</div>
            </div>
            <div>
              <label for="cerf" class="label">CERF</label>
              <input
                type="number"
                id="cerf"
                name="cerf"
                value="${eq.cerf || ""}"
                class="input-field"
              >
            </div>
            <div>
              <label for="ip" class="label">IP Address</label>
              <input
                type="text"
                id="ip"
                name="ip"
                value="${eq.ip || ""}"
                class="input-field font-mono"
                placeholder="e.g., 192.168.1.100"
              >
            </div>
            <div>
              <label for="mac_addresses" class="label">MAC Addresses</label>
              <input
                type="text"
                id="mac_addresses"
                name="mac_addresses"
                value="${eq.mac_addresses || ""}"
                class="input-field font-mono"
                placeholder="Comma-separated MAC addresses"
              >
            </div>
          </div>
        </div>

        <!-- Type & Model Selection -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
            </svg>
            Equipment Type
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="type_id" class="label">Type</label>
              <select id="type_id" name="type_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'types', 'Type'); } else { loadProductLines(this.value); }">
                <option value="">Select Type...</option>
                ${data.types.map(t => `
                  <option value="${t.id}" ${eq.type_id === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new type...</option>
              </select>
            </div>
            <div>
              <label for="product_line_id" class="label">Product Line</label>
              <select id="product_line_id" name="product_line_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'product-lines', 'Product Line', 'type_id'); } else { loadModels(this.value); }">
                <option value="">${eq.type_id ? "Select Product Line..." : "Select Type first..."}</option>
                ${data.productLines.map(pl => `
                  <option value="${pl.id}" data-parent="${pl.parent_id}" ${eq.product_line_id === pl.id ? "selected" : ""} ${eq.type_id !== pl.parent_id ? "hidden" : ""}>${escapeHtml(pl.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.type_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new product line...</option>
              </select>
            </div>
            <div>
              <label for="model_id" class="label">Model</label>
              <select id="model_id" name="model_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'models', 'Model', 'product_line_id'); }">
                <option value="">${eq.product_line_id ? "Select Model..." : "Select Product Line first..."}</option>
                ${data.models.map(m => `
                  <option value="${m.id}" data-parent="${m.parent_id}" ${eq.model_id === m.id ? "selected" : ""} ${eq.product_line_id !== m.parent_id ? "hidden" : ""}>${escapeHtml(m.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.product_line_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new model...</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Location Selection -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Location
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label for="region_id" class="label">Region</label>
              <select id="region_id" name="region_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'regions', 'Region'); } else { loadCountries(this.value); }">
                <option value="">Select Region...</option>
                ${data.regions.map(r => `
                  <option value="${r.id}" ${eq.region_id === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new region...</option>
              </select>
            </div>
            <div>
              <label for="country_id" class="label">Country</label>
              <select id="country_id" name="country_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'countries', 'Country', 'region_id'); } else { loadPlants(this.value); }">
                <option value="">${eq.region_id ? "Select Country..." : "Select Region first..."}</option>
                ${data.countries.map(c => `
                  <option value="${c.id}" data-parent="${c.parent_id}" ${eq.country_id === c.id ? "selected" : ""} ${eq.region_id !== c.parent_id ? "hidden" : ""}>${escapeHtml(c.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.region_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new country...</option>
              </select>
            </div>
            <div>
              <label for="plant_id" class="label">Plant</label>
              <select id="plant_id" name="plant_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'plants', 'Plant', 'country_id'); } else { loadDepartments(this.value); }">
                <option value="">${eq.country_id ? "Select Plant..." : "Select Country first..."}</option>
                ${data.plants.map(p => `
                  <option value="${p.id}" data-parent="${p.parent_id}" ${eq.plant_id === p.id ? "selected" : ""} ${eq.country_id !== p.parent_id ? "hidden" : ""}>${escapeHtml(p.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.country_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new plant...</option>
              </select>
            </div>
            <div>
              <label for="department_id" class="label">Department</label>
              <select id="department_id" name="department_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'departments', 'Department', 'plant_id'); } else { loadAreas(this.value); }">
                <option value="">${eq.plant_id ? "Select Department..." : "Select Plant first..."}</option>
                ${data.departments.map(d => `
                  <option value="${d.id}" data-parent="${d.parent_id}" ${eq.department_id === d.id ? "selected" : ""} ${eq.plant_id !== d.parent_id ? "hidden" : ""}>${escapeHtml(d.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.plant_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new department...</option>
              </select>
            </div>
            <div>
              <label for="area_id" class="label">Area</label>
              <select id="area_id" name="area_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'areas', 'Area', 'department_id'); } else { loadSubAreas(this.value); }">
                <option value="">${eq.department_id ? "Select Area..." : "Select Department first..."}</option>
                ${data.areas.map(a => `
                  <option value="${a.id}" data-parent="${a.parent_id}" ${eq.area_id === a.id ? "selected" : ""} ${eq.department_id !== a.parent_id ? "hidden" : ""}>${escapeHtml(a.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.department_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new area...</option>
              </select>
            </div>
            <div>
              <label for="equipment_sub_area_id" class="label">Sub Area</label>
              <select id="equipment_sub_area_id" name="equipment_sub_area_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'sub-areas', 'Sub Area', 'area_id'); }">
                <option value="">${eq.area_id ? "Select Sub Area..." : "Select Area first..."}</option>
                ${data.subAreas.map(sa => `
                  <option value="${sa.id}" data-parent="${sa.parent_id}" ${eq.equipment_sub_area_id === sa.id ? "selected" : ""} ${eq.area_id !== sa.parent_id ? "hidden" : ""}>${escapeHtml(sa.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.area_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new sub area...</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inventory Period -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            Inventory
          </h2>
          
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="inventory_period_id" class="label">Inventory Period</label>
              <select id="inventory_period_id" name="inventory_period_id" class="select-field">
                <option value="">No inventory period</option>
                ${data.inventoryPeriods.map(ip => `
                  <option value="${ip.id}" ${eq.inventory_period_id === ip.id ? "selected" : ""}>${escapeHtml(ip.name)} (${ip.start_date} - ${ip.end_date})</option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Assignment & TeamViewer -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Assignment & Remote Access
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="assigned_to" class="label">Assigned To</label>
              <select id="assigned_to" name="assigned_to" class="select-field">
                <option value="">Unassigned</option>
                ${data.employees.map(e => `
                  <option value="${escapeHtml(e.employee_no)}" ${eq.assigned_to === e.employee_no ? "selected" : ""}>${escapeHtml(e.name)} (${escapeHtml(e.employee_no)})</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="teamviewer" class="label">TeamViewer ID</label>
              <input 
                type="text" 
                id="teamviewer" 
                name="teamviewer" 
                value="${eq.teamviewer || ""}"
                placeholder="Enter TeamViewer ID..."
                class="input-field"
              >
            </div>
            <div class="md:col-span-2">
              <label for="comment" class="label">Audit Comment</label>
              <textarea 
                id="comment" 
                name="comment"
                rows="3"
                placeholder="Add notes about this audit..."
                class="input-field"
              >${eq.comment || ""}</textarea>
            </div>
          </div>
        </div>

        <!-- Write-Off Status -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Write-Off Status
          </h2>
          
          ${eq.is_written_off ? `
            <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div class="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span class="font-semibold">Equipment is currently written off</span>
              </div>
              <p class="text-sm text-red-600 dark:text-red-300">Reason: ${escapeHtml(eq.write_off_reason || "Unknown")}</p>
            </div>
          ` : ""}
          
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="is_written_off" class="label">Write-Off Reason</label>
              <select id="is_written_off" name="is_written_off" class="select-field" onchange="toggleWriteOffComment(this.value)">
                <option value="">Not written off (Active)</option>
                ${data.writeOffReasons.map(r => `
                  <option value="${r.id}" ${eq.is_written_off === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>
                `).join("")}
              </select>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${eq.is_written_off ? "Select 'Not written off' to restore this equipment to active status." : "Select a reason to write off this equipment."}
              </p>
            </div>
            <div id="write-off-comment-container" class="${eq.is_written_off ? "" : "hidden"}">
              <label for="write_off_comment" class="label">Write-Off Comment <span class="text-red-500">*</span></label>
              <textarea 
                id="write_off_comment" 
                name="write_off_comment"
                rows="3"
                placeholder="Please provide a comment explaining why this equipment is being written off..."
                class="input-field"
                ${eq.is_written_off ? "required" : ""}
              ></textarea>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">A comment is required when writing off equipment.</p>
            </div>
          </div>
        </div>

        <script>
          function toggleWriteOffComment(value) {
            const container = document.getElementById('write-off-comment-container');
            const commentField = document.getElementById('write_off_comment');
            if (value && value !== '') {
              container.classList.remove('hidden');
              commentField.setAttribute('required', 'required');
            } else {
              container.classList.add('hidden');
              commentField.removeAttribute('required');
              commentField.value = '';
            }
          }
          
          function restoreWarrantyDates() {
            const purchaseDateInput = document.getElementById('purchase_date');
            const warrantyExpiryInput = document.getElementById('warranty_expiry_date');
            const originalPurchaseDate = '${formatDateForInput(eq.purchase_date)}';
            const originalWarrantyExpiry = '${formatDateForInput(eq.warranty_expiry_date)}';
            
            if (purchaseDateInput) {
              purchaseDateInput.value = originalPurchaseDate;
            }
            if (warrantyExpiryInput) {
              warrantyExpiryInput.value = originalWarrantyExpiry;
            }
          }
          
          // Initialize on page load
          document.addEventListener('DOMContentLoaded', function() {
            const select = document.getElementById('is_written_off');
            if (select) {
              toggleWriteOffComment(select.value);
            }
          });
        </script>

        <!-- Submit -->
        <div class="flex justify-end gap-4">
          <a href="/" class="btn btn-secondary">Cancel</a>
          <button type="button" id="print-label" class="btn btn-secondary" data-service-tag="${escapeHtml(eq.service_tag)}">
            <span class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              Print Label
            </span>
          </button>
          <button type="submit" class="btn btn-success">
            <span class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Save Audit
            </span>
          </button>
        </div>
        
        <!-- Print Modal -->
        <div id="printModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transition-colors">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Printer</h3>
              <button onclick="closePrintModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div id="printModalBody">
              <div id="printers-loading" class="text-center py-4">
                <svg class="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <p class="text-gray-600 dark:text-gray-400 mt-2">Loading printers...</p>
              </div>
              <div id="printers-list" class="hidden max-h-64 overflow-y-auto mb-4"></div>
              <div id="printers-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-4"></div>
            </div>
            <div class="flex justify-end gap-3">
              <button onclick="closePrintModal()" class="btn btn-secondary">Cancel</button>
              <button id="confirm-print" onclick="confirmPrint()" class="btn btn-primary hidden">Print</button>
            </div>
          </div>
        </div>
        
        <script>
          (function() {
            let printers = [];
            let selectedPrinter = null;
            const serviceTag = '${escapeHtml(eq.service_tag)}';
            
            const printBtn = document.getElementById('print-label');
            const printModal = document.getElementById('printModal');
            const printersLoading = document.getElementById('printers-loading');
            const printersList = document.getElementById('printers-list');
            const printersError = document.getElementById('printers-error');
            const confirmPrintBtn = document.getElementById('confirm-print');
            
            async function loadPrinters() {
              try {
                const response = await fetch('/api/printers');
                const result = await response.json();
                
                if (result.success && result.data) {
                  printers = result.data;
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
                printersList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No printers available</p>';
                printersList.classList.remove('hidden');
                return;
              }
              
              printersList.innerHTML = printers.map((p, idx) => \`
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
              if (!selectedPrinter) return;
              
              const btn = confirmPrintBtn;
              const originalText = btn.innerHTML;
              btn.disabled = true;
              btn.innerHTML = 'Printing...';
              
              try {
                const response = await fetch('/api/print', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    service_tag: serviceTag,
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
        </script>
      </form>
    </div>

    ${getModalHtml()}
    ${getScriptsHtml()}
  `;

  return layout(`Audit - ${eq.service_tag}`, content);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // MySQL DATE format is already YYYY-MM-DD, but handle Date objects or other formats
  if (dateStr instanceof Date) {
    return dateStr.toISOString().split('T')[0];
  }
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // Try to parse and format
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + "-" + month + "-" + day;
  } catch {
    return "";
  }
}
