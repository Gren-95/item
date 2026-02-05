import { layout } from "./layout";
import { renderAlert } from "./components";
import { getModalHtml, getScriptsHtml } from "./components";
import { INFORMATION_CIRCLE_ICON, EDIT_ICON } from "./icons";

interface Equipment {
  id: number;
  service_tag: string;
  model_id: number | null;
  vendor_id: number | null;
  supplier_id: number | null;
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
  repair_status: 'needs_repair' | 'at_supplier' | 'returned' | 'in_backup' | null;
  cerf: number | null;
  ip: string | null;
  mac_addresses: string | null;
  repair_note: string | null;
  repair_physical_location: string | null;
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

export function auditPage(data: AuditData, success: string | boolean = false, error: string | null = null, isAdmin: boolean = false, hasPcPwView: boolean = false, isReadonly: boolean = false, userPlantId: number | null = null, allowedRegionId: number | null = null, allowedCountryId: number | null = null, username: string | null = null, hasAuditApprover: boolean = false, hasManageLocations: boolean = false): string {
  const eq = data.equipment;
  
  const content = `
    <div class="w-full px-4 sm:px-6 lg:px-12 xl:px-16">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <a href="/" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors self-start sm:self-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </a>
        <div class="flex items-center gap-2">
          ${isReadonly
            ? INFORMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-6 h-6 sm:w-7 sm:h-7').replace('text-current', 'text-gray-900 dark:text-white')
            : EDIT_ICON.replace('w-4 h-4', 'w-6 h-6 sm:w-7 sm:h-7').replace('text-current', 'text-gray-900 dark:text-white')
          }
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">${isReadonly ? 'View Equipment' : 'Edit Equipment'}</h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-mono text-xs sm:text-sm">${escapeHtml(eq.service_tag)}</span>
          ${isReadonly ? '<span class="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs sm:text-sm">Read-only</span>' : ''}
        </div>
      </div>

      ${renderAlert(success, error)}

      <form id="equipment-edit-form" action="/edit/${eq.id}" method="POST" ${isReadonly ? 'onsubmit="event.preventDefault(); return false;"' : ''}>
        <!-- Main layout: Form grid + History panel -->
        <div class="flex flex-col lg:flex-row gap-6 max-w-[1800px] mx-auto">
          <!-- Left side: Equipment form 2x2 grid -->
          <div class="flex-1 min-w-0 lg:max-w-[1200px]">
        <!-- Equipment Information and Type -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <!-- Equipment Information -->
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Equipment Information
            </h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="purchase_date" class="label">Warranty Start</label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value="${formatDateForInput(eq.purchase_date)}"
                class="input-field"
                ${isReadonly ? 'readonly disabled' : ''}
              >
            </div>
            <div>
              <label for="warranty_expiry_date" class="label">Warranty Expiry</label>
              <div class="flex items-center gap-2">
                <input
                  type="date"
                  id="warranty_expiry_date"
                  name="warranty_expiry_date"
                  value="${formatDateForInput(eq.warranty_expiry_date)}"
                  class="input-field flex-1 ${isExpired(eq.warranty_expiry_date) ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : ""}"
                  ${isReadonly ? 'readonly disabled' : ''}
                >
                <button
                  type="button"
                  id="check-dell-warranty-btn"
                  onclick="checkDellWarranty()"
                  class="btn btn-success text-xs whitespace-nowrap hidden"
                  title="Fetch warranty info from Dell"
                  ${isReadonly ? 'disabled' : ''}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label for="vendor_id" class="label">Vendor</label>
              <select id="vendor_id" name="vendor_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'vendors', 'Vendor'); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">Select Vendor...</option>
                ${data.vendors.map(v => `
                  <option value="${v.id}" ${eq.vendor_id === v.id ? "selected" : ""}>${escapeHtml(v.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new vendor...</option>
              </select>
            </div>
            <div>
              <label for="supplier_id" class="label">Supplier</label>
              <select id="supplier_id" name="supplier_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'suppliers', 'Supplier'); }" ${isReadonly ? 'disabled' : ''}>
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
                ${isReadonly ? 'readonly disabled' : ''}
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
                ${isReadonly ? 'readonly disabled' : ''}
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
                ${isReadonly ? 'readonly disabled' : ''}
              >
            </div>
            </div>
          </div>

          <!-- Type & Model Selection -->
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
              </svg>
              Equipment Type
            </h2>
            
            <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="type_id" class="label">Type</label>
              <select id="type_id" name="type_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'types', 'Type'); } else { loadProductLines(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">Select Type...</option>
                ${data.types.map(t => `
                  <option value="${t.id}" ${eq.type_id === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>
                `).join("")}
                <option value="__add_new__" class="text-blue-600 font-medium">+ Add new type...</option>
              </select>
            </div>
            <div>
              <label for="product_line_id" class="label">Product Line</label>
              <select id="product_line_id" name="product_line_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'product-lines', 'Product Line', 'type_id'); } else { loadModels(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.type_id ? "Select Product Line..." : "Select Type first..."}</option>
                ${data.productLines.map(pl => `
                  <option value="${pl.id}" data-parent="${pl.parent_id}" ${eq.product_line_id === pl.id ? "selected" : ""} ${eq.type_id !== pl.parent_id ? "hidden" : ""}>${escapeHtml(pl.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.type_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new product line...</option>
              </select>
            </div>
            <div>
              <label for="model_id" class="label">Model</label>
              <select id="model_id" name="model_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'models', 'Model', 'product_line_id'); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.product_line_id ? "Select Model..." : "Select Product Line first..."}</option>
                ${data.models.map(m => `
                  <option value="${m.id}" data-parent="${m.parent_id}" ${eq.model_id === m.id ? "selected" : ""} ${eq.product_line_id !== m.parent_id ? "hidden" : ""}>${escapeHtml(m.name)}</option>
                `).join("")}
                <option value="__add_new__" data-parent="__always__" ${eq.product_line_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new model...</option>
              </select>
            </div>
            </div>
          </div>
        </div>

        <!-- Location and Assignment -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <!-- Location Selection -->
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Location
            </h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="region_id" class="label">Region</label>
              <select id="region_id" name="region_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'regions', 'Region'); } else { loadCountries(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">Select Region...</option>
                ${data.regions.map(r => `
                  <option value="${r.id}" ${eq.region_id === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>
                `).join("")}
                ${isAdmin ? '<option value="__add_new__" class="text-blue-600 font-medium">+ Add new region...</option>' : ''}
              </select>
            </div>
            <div>
              <label for="country_id" class="label">Country</label>
              <select id="country_id" name="country_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'countries', 'Country', 'region_id'); } else { loadPlants(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.region_id ? "Select Country..." : "Select Region first..."}</option>
                ${data.countries.map(c => `
                  <option value="${c.id}" data-parent="${c.parent_id}" ${eq.country_id === c.id ? "selected" : ""} ${eq.region_id !== c.parent_id ? "hidden" : ""}>${escapeHtml(c.name)}</option>
                `).join("")}
                ${isAdmin ? `<option value="__add_new__" data-parent="__always__" ${eq.region_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new country...</option>` : ''}
              </select>
            </div>
            <div>
              <label for="plant_id" class="label">Plant</label>
              <select id="plant_id" name="plant_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'plants', 'Plant', 'country_id'); } else { loadDepartments(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.country_id ? "Select Plant..." : "Select Country first..."}</option>
                ${data.plants.map(p => `
                  <option value="${p.id}" data-parent="${p.parent_id}" ${eq.plant_id === p.id ? "selected" : ""} ${eq.country_id !== p.parent_id ? "hidden" : ""}>${escapeHtml(p.name)}</option>
                `).join("")}
                ${isAdmin ? `<option value="__add_new__" data-parent="__always__" ${eq.country_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new plant...</option>` : ''}
              </select>
            </div>
            <div>
              <label for="department_id" class="label">Department</label>
              <select id="department_id" name="department_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'departments', 'Department', 'plant_id'); } else { loadAreas(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.plant_id ? "Select Department..." : "Select Plant first..."}</option>
                ${data.departments.map(d => `
                  <option value="${d.id}" data-parent="${d.parent_id}" ${eq.department_id === d.id ? "selected" : ""} ${eq.plant_id !== d.parent_id ? "hidden" : ""}>${escapeHtml(d.name)}</option>
                `).join("")}
                ${hasManageLocations ? `<option value="__add_new__" data-parent="__always__" ${eq.plant_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new department...</option>` : ''}
              </select>
            </div>
            <div>
              <label for="area_id" class="label">Area</label>
              <select id="area_id" name="area_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'areas', 'Area', 'department_id'); } else { loadSubAreas(this.value); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.department_id ? "Select Area..." : "Select Department first..."}</option>
                ${data.areas.map(a => `
                  <option value="${a.id}" data-parent="${a.parent_id}" ${eq.area_id === a.id ? "selected" : ""} ${eq.department_id !== a.parent_id ? "hidden" : ""}>${escapeHtml(a.name)}</option>
                `).join("")}
                ${hasManageLocations ? `<option value="__add_new__" data-parent="__always__" ${eq.department_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new area...</option>` : ''}
              </select>
            </div>
            <div>
              <label for="equipment_sub_area_id" class="label">Sub Area</label>
              <select id="equipment_sub_area_id" name="equipment_sub_area_id" class="select-field" onchange="if(this.value === '__add_new__') { handleSelectChange(this, 'sub-areas', 'Sub Area', 'area_id'); }" ${isReadonly ? 'disabled' : ''}>
                <option value="">${eq.area_id ? "Select Sub Area..." : "Select Area first..."}</option>
                ${data.subAreas.map(sa => `
                  <option value="${sa.id}" data-parent="${sa.parent_id}" ${eq.equipment_sub_area_id === sa.id ? "selected" : ""} ${eq.area_id !== sa.parent_id ? "hidden" : ""}>${escapeHtml(sa.name)}</option>
                `).join("")}
                ${hasManageLocations ? `<option value="__add_new__" data-parent="__always__" ${eq.area_id ? "" : "hidden"} class="text-blue-600 font-medium">+ Add new sub area...</option>` : ''}
              </select>
            </div>
            </div>
          </div>

          <!-- Assignment & TeamViewer -->
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Assignment & Remote Access
            </h2>
            
            <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="assigned_to" class="label">Assigned To</label>
              <select id="assigned_to" name="assigned_to" class="select-field" ${isReadonly ? 'disabled' : ''}>
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
                ${isReadonly ? 'readonly disabled' : ''}
              >
            </div>
              <div>
                <label for="comment" class="label">Comment</label>
                <textarea 
                  id="comment" 
                  name="comment"
                  rows="3"
                  placeholder="Add notes about this equipment..."
                  class="input-field"
                  ${isReadonly ? 'readonly disabled' : ''}
                >${eq.comment || ""}</textarea>
              </div>
            </div>
          </div>
        </div>
          </div>
          <!-- End of left side form grid -->

          <!-- Right side: Device History Panel -->
          <div class="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0">
            <div class="card sticky top-4">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Device History
                </h2>
                <span id="history-count" class="text-xs text-gray-500 dark:text-gray-400"></span>
              </div>

              <div id="history-container" class="max-h-[600px] overflow-y-auto">
                <div id="history-loading" class="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg class="w-8 h-8 animate-spin mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Loading history...
                </div>
                <div id="history-entries" class="hidden divide-y divide-gray-100 dark:divide-gray-700"></div>
                <div id="history-empty" class="hidden text-center py-8 text-gray-500 dark:text-gray-400 text-sm">No history records found</div>
                <div id="history-error" class="hidden text-center py-8 text-red-500 dark:text-red-400 text-sm">Failed to load history</div>
              </div>
            </div>
          </div>
        </div>
        <!-- End of main layout flex container -->

        <!-- Write-Off Status Modal -->
        <div id="writeOffModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transition-colors">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Write-Off Status</h3>
              <button onclick="closeWriteOffModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form id="write-off-modal-form" onsubmit="return submitWriteOffModal(event)">
              <div class="space-y-4">
                <div>
                  <label for="modal_is_written_off" class="label">Write-Off Reason</label>
                  <select id="modal_is_written_off" name="is_written_off" class="select-field" onchange="toggleModalWriteOffComment(this.value)" ${isReadonly ? 'disabled' : ''}>
                    <option value="">Not written off (Active)</option>
                    ${data.writeOffReasons.map(r => `
                      <option value="${r.id}" ${eq.is_written_off === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>
                    `).join("")}
                  </select>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ${eq.is_written_off ? "Select 'Not written off' to restore this equipment to active status." : "Select a reason to write off this equipment."}
                  </p>
                </div>
                <div id="modal-write-off-comment-container" class="${eq.is_written_off ? "" : "hidden"}">
                  <label for="modal_write_off_comment" class="label">Write-Off Comment <span class="text-red-500">*</span></label>
                  <textarea 
                    id="modal_write_off_comment" 
                    name="write_off_comment"
                    rows="3"
                    placeholder="Please provide a comment explaining why this equipment is being written off..."
                    class="input-field"
                    ${eq.is_written_off ? "required" : ""}
                    ${isReadonly ? 'readonly disabled' : ''}
                  ></textarea>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">A comment is required when writing off equipment.</p>
                </div>
              </div>
              <div class="flex justify-end gap-3 mt-6">
                <button type="button" onclick="closeWriteOffModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-success" ${isReadonly ? 'disabled' : ''}>Save</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Repair Status Modal -->
        <div id="repairModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transition-colors">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Repair Status</h3>
              <button onclick="closeRepairModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form id="repair-modal-form" onsubmit="return submitRepairModal(event)">
              <div class="space-y-4">
                <div>
                  <label for="modal_repair_status" class="label">Repair Status</label>
                  <select id="modal_repair_status" name="repair_status" class="select-field" onchange="toggleModalRepairFields(this.value)" ${isReadonly ? 'disabled' : ''}>
                    <option value="">Not in repair (Active)</option>
                    <option value="needs_repair" ${eq.repair_status === 'needs_repair' ? 'selected' : ''}>Needs Repair</option>
                    <option value="at_supplier" ${eq.repair_status === 'at_supplier' ? 'selected' : ''}>At Supplier</option>
                    <option value="returned" ${eq.repair_status === 'returned' ? 'selected' : ''}>Returned</option>
                    <option value="in_backup" ${eq.repair_status === 'in_backup' ? 'selected' : ''}>In Use</option>
                  </select>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select repair status to track equipment sent for repair.
                  </p>
                </div>
                <div id="modal-repair-fields-container" class="${eq.repair_status ? '' : 'hidden'}">
                  <div>
                    <label for="modal_repair_note" class="label">Repair Issue Note <span class="text-red-500">*</span></label>
                    <textarea 
                      id="modal_repair_note" 
                      name="repair_note"
                      rows="3"
                      placeholder="Describe the repair issue..."
                      class="input-field"
                      ${eq.repair_status === 'needs_repair' ? 'required' : ''}
                      ${isReadonly ? 'readonly disabled' : ''}
                    >${escapeHtml(eq.repair_note || '')}</textarea>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">A note is required when registering equipment for repair.</p>
                  </div>
                  <div class="mt-4">
                    <label for="modal_repair_physical_location" class="label">Physical Location</label>
                    <input
                      type="text"
                      id="modal_repair_physical_location"
                      name="repair_physical_location"
                      placeholder="e.g., Cupboard, Storage Room A"
                      value="${escapeHtml(eq.repair_physical_location || '')}"
                      class="input-field"
                      maxlength="255"
                      ${isReadonly ? 'readonly disabled' : ''}
                    >
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Record where the equipment is physically located.</p>
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-3 mt-6">
                <button type="button" onclick="closeRepairModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-success" ${isReadonly ? 'disabled' : ''}>Save</button>
              </div>
            </form>
          </div>
        </div>

        <script>
          function toggleModalWriteOffComment(value) {
            const container = document.getElementById('modal-write-off-comment-container');
            const commentField = document.getElementById('modal_write_off_comment');
            if (value && value !== '') {
              container.classList.remove('hidden');
              commentField.setAttribute('required', 'required');
            } else {
              container.classList.add('hidden');
              commentField.removeAttribute('required');
              commentField.value = '';
            }
          }

          function openWriteOffModal() {
            const modal = document.getElementById('writeOffModal');
            const writeOffSelect = document.getElementById('modal_is_written_off');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (writeOffSelect) {
              toggleModalWriteOffComment(writeOffSelect.value);
            }
          }

          function closeWriteOffModal() {
            const modal = document.getElementById('writeOffModal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
          }

          function submitWriteOffModal(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            // Get the main form
            const mainForm = document.querySelector('form[action*="/edit/"]');
            if (!mainForm) return false;
            
            // Update hidden fields in main form or add them
            const isWrittenOff = formData.get('is_written_off');
            const writeOffComment = formData.get('write_off_comment');
            
            // Remove existing write-off fields
            const existingWrittenOff = mainForm.querySelector('select[name="is_written_off"], input[name="is_written_off"]');
            const existingComment = mainForm.querySelector('textarea[name="write_off_comment"], input[name="write_off_comment"]');
            
            if (existingWrittenOff) existingWrittenOff.remove();
            if (existingComment) existingComment.remove();
            
            // Add new hidden fields
            if (isWrittenOff) {
              const writtenOffInput = document.createElement('input');
              writtenOffInput.type = 'hidden';
              writtenOffInput.name = 'is_written_off';
              writtenOffInput.value = isWrittenOff.toString();
              mainForm.appendChild(writtenOffInput);
            }
            
            if (writeOffComment) {
              const commentInput = document.createElement('input');
              commentInput.type = 'hidden';
              commentInput.name = 'write_off_comment';
              commentInput.value = writeOffComment.toString();
              mainForm.appendChild(commentInput);
            }
            
            // Validate if writing off and no comment
            if (isWrittenOff && isWrittenOff !== '' && !writeOffComment) {
              alert('Write-off comment is required when writing off equipment.');
              return false;
            }
            
            // Close modal and submit main form
            closeWriteOffModal();
            mainForm.submit();
            return false;
          }

          window.openWriteOffModal = openWriteOffModal;
          window.closeWriteOffModal = closeWriteOffModal;
          window.toggleModalWriteOffComment = toggleModalWriteOffComment;
          window.submitWriteOffModal = submitWriteOffModal;
          
          function toggleModalRepairFields(value) {
            const container = document.getElementById('modal-repair-fields-container');
            const noteField = document.getElementById('modal_repair_note');
            
            if (value && value !== '') {
              container.classList.remove('hidden');
              if (value === 'needs_repair') {
                noteField.setAttribute('required', 'required');
              } else {
                noteField.removeAttribute('required');
              }
            } else {
              container.classList.add('hidden');
              noteField.removeAttribute('required');
            }
          }

          function openRepairModal() {
            const modal = document.getElementById('repairModal');
            const repairStatus = document.getElementById('modal_repair_status');
            
            // Store original value to detect if sending to repair
            if (repairStatus) {
              repairStatus.dataset.originalValue = repairStatus.value || '';
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (repairStatus) {
              toggleModalRepairFields(repairStatus.value);
            }
          }


          function closeRepairModal() {
            const modal = document.getElementById('repairModal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
          }

          function submitRepairModal(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            // Get the main form
            const mainForm = document.querySelector('form[action*="/edit/"]');
            if (!mainForm) return false;
            
            // Update hidden fields in main form or add them
            const repairStatus = formData.get('repair_status');
            const repairNote = formData.get('repair_note');
            const repairLocation = formData.get('repair_physical_location');
            
            // Remove existing repair fields
            const existingStatus = mainForm.querySelector('input[name="repair_status"]');
            const existingNote = mainForm.querySelector('textarea[name="repair_note"], input[name="repair_note"]');
            const existingLocation = mainForm.querySelector('input[name="repair_physical_location"]');
            
            if (existingStatus) existingStatus.remove();
            if (existingNote) existingNote.remove();
            if (existingLocation) existingLocation.remove();
            
            // Add new hidden fields
            if (repairStatus) {
              const statusInput = document.createElement('input');
              statusInput.type = 'hidden';
              statusInput.name = 'repair_status';
              statusInput.value = repairStatus.toString();
              mainForm.appendChild(statusInput);
            }
            
            if (repairNote) {
              const noteInput = document.createElement('input');
              noteInput.type = 'hidden';
              noteInput.name = 'repair_note';
              noteInput.value = repairNote.toString();
              mainForm.appendChild(noteInput);
            }
            
            if (repairLocation) {
              const locationInput = document.createElement('input');
              locationInput.type = 'hidden';
              locationInput.name = 'repair_physical_location';
              locationInput.value = repairLocation.toString();
              mainForm.appendChild(locationInput);
            }
            
            // Validate if needs_repair and no note
            if (repairStatus === 'needs_repair' && !repairNote) {
              alert('Repair note is required when registering equipment for repair.');
              return false;
            }
            
            // Close modal and submit main form
            closeRepairModal();
            mainForm.submit();
            return false;
          }

          window.openRepairModal = openRepairModal;
          window.closeRepairModal = closeRepairModal;
          window.toggleModalRepairFields = toggleModalRepairFields;
          window.submitRepairModal = submitRepairModal;
          
          // Dell Warranty Integration
          let dellWarrantyData = null;
          
          function isDellVendor() {
            const vendorSelect = document.getElementById('vendor_id');
            if (!vendorSelect) return false;
            const selectedOption = vendorSelect.options[vendorSelect.selectedIndex];
            if (!selectedOption || !selectedOption.text) return false;
            return selectedOption.text.toLowerCase().includes('dell');
          }
          
          function updateDellWarrantyButtonVisibility() {
            const btn = document.getElementById('check-dell-warranty-btn');
            if (!btn) return;
            if (isDellVendor()) {
              btn.classList.remove('hidden');
            } else {
              btn.classList.add('hidden');
            }
          }
          
          window.checkDellWarranty = async function() {
            const modal = document.getElementById('dellWarrantyModal');
            const loading = document.getElementById('dellWarrantyLoading');
            const error = document.getElementById('dellWarrantyError');
            const errorMsg = document.getElementById('dellWarrantyErrorMessage');
            const content = document.getElementById('dellWarrantyContent');
            const applyBtn = document.getElementById('apply-dell-warranty-btn');
            
            // Show modal with loading state
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            loading.classList.remove('hidden');
            error.classList.add('hidden');
            content.classList.add('hidden');
            applyBtn.classList.add('hidden');
            
            const serviceTag = '${escapeHtml(eq.service_tag)}';
            
            try {
              const response = await fetch('/api/dell-warranty/' + encodeURIComponent(serviceTag));
              const result = await response.json();
              
              loading.classList.add('hidden');
              
              if (!result.success) {
                error.classList.remove('hidden');
                errorMsg.textContent = result.message || 'Failed to fetch warranty information';
                return;
              }
              
              dellWarrantyData = result.data;
              
              // Populate device info
              document.getElementById('dell-service-tag').textContent = dellWarrantyData.serviceTag || '-';
              document.getElementById('dell-model').textContent = dellWarrantyData.model || '-';
              document.getElementById('dell-product-line').textContent = dellWarrantyData.productLine || '-';
              document.getElementById('dell-ship-date').textContent = dellWarrantyData.shipDate || '-';
              
              // Populate warranty dates
              document.getElementById('dell-warranty-start').textContent = dellWarrantyData.warrantyStart || '-';
              document.getElementById('dell-warranty-end').textContent = dellWarrantyData.warrantyEnd || '-';
              
              // Populate new date inputs
              document.getElementById('dell-new-start').value = dellWarrantyData.warrantyStart || '';
              document.getElementById('dell-new-end').value = dellWarrantyData.warrantyEnd || '';
              
              // Populate entitlements
              const entContainer = document.getElementById('dell-entitlements-container');
              const entList = document.getElementById('dell-entitlements');
              
              if (dellWarrantyData.entitlements && dellWarrantyData.entitlements.length > 0) {
                entContainer.classList.remove('hidden');
                entList.innerHTML = dellWarrantyData.entitlements.map(ent => \`
                  <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm">
                    <div class="font-medium text-gray-900 dark:text-white">\${(ent.serviceLevel || 'Unknown Service').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs">\${ent.startDate || ''} - \${ent.endDate || ''}</div>
                  </div>
                \`).join('');
              } else {
                entContainer.classList.add('hidden');
              }
              
              content.classList.remove('hidden');
              applyBtn.classList.remove('hidden');
              
            } catch (err) {
              loading.classList.add('hidden');
              error.classList.remove('hidden');
              errorMsg.textContent = 'Error: ' + (err.message || 'Unknown error');
            }
          };
          
          window.closeDellWarrantyModal = function() {
            const modal = document.getElementById('dellWarrantyModal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            dellWarrantyData = null;
          };
          
          window.applyDellWarranty = function() {
            if (!dellWarrantyData) return;
            
            const purchaseDateInput = document.getElementById('purchase_date');
            const warrantyExpiryInput = document.getElementById('warranty_expiry_date');
            
            if (dellWarrantyData.warrantyStart && purchaseDateInput) {
              purchaseDateInput.value = dellWarrantyData.warrantyStart;
            }
            
            if (dellWarrantyData.warrantyEnd && warrantyExpiryInput) {
              warrantyExpiryInput.value = dellWarrantyData.warrantyEnd;
              // Update styling for expired/valid warranty
              const today = new Date();
              const expiryDate = new Date(dellWarrantyData.warrantyEnd);
              if (expiryDate < today) {
                warrantyExpiryInput.classList.add('text-red-600', 'dark:text-red-400', 'bg-red-50', 'dark:bg-red-900/20', 'border-red-200', 'dark:border-red-800');
              } else {
                warrantyExpiryInput.classList.remove('text-red-600', 'dark:text-red-400', 'bg-red-50', 'dark:bg-red-900/20', 'border-red-200', 'dark:border-red-800');
              }
            }
            
            closeDellWarrantyModal();
          };
          
          // Initialize on page load
          document.addEventListener('DOMContentLoaded', function() {
            // Update Dell warranty button visibility on page load
            updateDellWarrantyButtonVisibility();
            
            // Update Dell warranty button visibility when vendor changes
            const vendorSelect = document.getElementById('vendor_id');
            if (vendorSelect) {
              vendorSelect.addEventListener('change', updateDellWarrantyButtonVisibility);
            }
            // Modals are opened on button click, no initialization needed
            
            // Initialize sub-area filtering based on selected area
            const areaSelect = document.getElementById('area_id');
            const subAreaSelect = document.getElementById('equipment_sub_area_id');
            if (areaSelect && subAreaSelect) {
              const selectedAreaId = areaSelect.value;
              if (selectedAreaId) {
                loadSubAreas(selectedAreaId);
              } else {
                // If no area selected, hide all sub-areas
                loadSubAreas('');
              }
            }
            
            ${!isAdmin && userPlantId !== null ? `
            // Restrict location selection to user's plant only (server already filters, this is a safety check)
            const userPlantIdValue = ${userPlantId};
            const plantSelect = document.getElementById('plant_id');

            // Hide and disable plants that don't match user's plant
            if (plantSelect) {
              const plantOptions = plantSelect.querySelectorAll('option[value]:not([value=""]):not([value="__add_new__"])');
              plantOptions.forEach(opt => {
                const plantId = parseInt(opt.value);
                if (plantId !== userPlantIdValue) {
                  opt.disabled = true;
                  opt.style.display = 'none';
                }
              });

              // Prevent selecting other plants
              plantSelect.addEventListener('change', function() {
                if (this.value && parseInt(this.value) !== userPlantIdValue) {
                  alert('You can only select locations from your assigned plant. Resetting to your plant.');
                  this.value = userPlantIdValue.toString();
                  this.dispatchEvent(new Event('change'));
                }
              });
            }
            ` : ''}

            // Load device history
            loadDeviceHistory(${eq.id});
          });

          // Device History functions
          function formatHistoryDate(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }

          function escapeHistoryHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          }

          async function loadDeviceHistory(equipmentId) {
            const historyLoading = document.getElementById('history-loading');
            const historyEntries = document.getElementById('history-entries');
            const historyEmpty = document.getElementById('history-empty');
            const historyError = document.getElementById('history-error');
            const historyCount = document.getElementById('history-count');

            try {
              const response = await fetch('/api/equipment/history?equipment_id=' + equipmentId);
              const result = await response.json();

              if (historyLoading) historyLoading.classList.add('hidden');

              if (result.success && result.data && result.data.length > 0) {
                if (historyCount) historyCount.textContent = result.data.length + ' entries';
                if (historyEntries) {
                  historyEntries.innerHTML = result.data.map(function(log) {
                    return '<div class="py-3 first:pt-0">' +
                      '<div class="flex items-start justify-between gap-2">' +
                        '<div class="flex-1 min-w-0">' +
                          '<div class="flex items-center gap-2 flex-wrap">' +
                            '<span class="text-sm font-medium text-gray-900 dark:text-white">' + formatHistoryDate(log.created) + '</span>' +
                            (log.inventory_nr ? '<span class="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">' + escapeHistoryHtml(log.inventory_nr) + '</span>' : '') +
                            (log.write_off_reason ? '<span class="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">Written Off</span>' : '') +
                          '</div>' +
                          '<div class="mt-1 space-y-0.5">' +
                            '<div class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">' +
                              '<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>' +
                              '<span class="truncate">' + (log.assigned_to_name ? escapeHistoryHtml(log.assigned_to + ' - ' + log.assigned_to_name) : (log.assigned_to ? escapeHistoryHtml(log.assigned_to) : 'Not assigned')) + '</span>' +
                            '</div>' +
                            '<div class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">' +
                              '<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
                              '<span class="truncate">' + escapeHistoryHtml(log.location || 'No location') + '</span>' +
                            '</div>' +
                          '</div>' +
                          (log.comment ? '<div class="mt-1 text-xs text-gray-500 dark:text-gray-400 italic truncate">' + escapeHistoryHtml(log.comment) + '</div>' : '') +
                        '</div>' +
                        (log.updated_by_name ? '<div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">by ' + escapeHistoryHtml(log.updated_by_name) + '</div>' : '') +
                      '</div>' +
                    '</div>';
                  }).join('');
                  historyEntries.classList.remove('hidden');
                }
              } else {
                if (historyEmpty) historyEmpty.classList.remove('hidden');
                if (historyCount) historyCount.textContent = '0 entries';
              }
            } catch (err) {
              console.error('Failed to load history:', err);
              if (historyLoading) historyLoading.classList.add('hidden');
              if (historyError) historyError.classList.remove('hidden');
            }
          }

          // Close modals on escape key
          document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              const repairModal = document.getElementById('repairModal');
              const writeOffModal = document.getElementById('writeOffModal');
              const dellWarrantyModal = document.getElementById('dellWarrantyModal');
              if (repairModal && !repairModal.classList.contains('hidden')) {
                closeRepairModal();
              }
              if (writeOffModal && !writeOffModal.classList.contains('hidden')) {
                closeWriteOffModal();
              }
              if (dellWarrantyModal && !dellWarrantyModal.classList.contains('hidden')) {
                closeDellWarrantyModal();
              }
            }
          });

          // Close modals on background click
          document.getElementById('repairModal')?.addEventListener('click', function(e) {
            if (e.target === this) {
              closeRepairModal();
            }
          });

          document.getElementById('writeOffModal')?.addEventListener('click', function(e) {
            if (e.target === this) {
              closeWriteOffModal();
            }
          });

          document.getElementById('dellWarrantyModal')?.addEventListener('click', function(e) {
            if (e.target === this) {
              closeDellWarrantyModal();
            }
          });
        </script>

        <!-- Submit - Icon buttons in single row -->
        <div class="mt-6">
          <div class="flex items-center justify-stretch gap-2 sm:justify-end">
            <!-- Cancel -->
            <a href="/" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Cancel">
              <svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </a>
            <!-- Print Label -->
            <button type="button" id="print-label" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" data-service-tag="${escapeHtml(eq.service_tag)}" title="Print Label" ${isReadonly ? 'disabled' : ''}>
              <svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
            </button>
            <!-- Write-Off Status -->
            <button type="button" onclick="openWriteOffModal()" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 ${eq.is_written_off ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" title="${eq.is_written_off ? 'Written Off: ' + escapeHtml(eq.write_off_reason || 'Written Off') : 'Set Write-Off Status'}" ${isReadonly ? 'disabled' : ''}>
              <svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </button>
            <!-- Repair Status -->
            <button type="button" onclick="openRepairModal()" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 ${eq.repair_status && eq.repair_status !== 'in_backup' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" title="${eq.repair_status ? (eq.repair_status === 'needs_repair' ? 'Needs Repair' : eq.repair_status === 'at_supplier' ? 'At Supplier' : eq.repair_status === 'returned' ? 'Returned' : eq.repair_status === 'in_backup' ? 'In Use' : 'Set Repair Status') : 'Set Repair Status'}" ${isReadonly ? 'disabled' : ''}>
              <svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z"/>
              </svg>
            </button>
            <!-- Save Changes -->
            <button type="submit" form="equipment-edit-form" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" title="${isReadonly ? 'Read-only Mode' : 'Save Changes'}" ${isReadonly ? 'disabled' : ''} ${isReadonly ? '' : 'id="save-changes-btn"'}>
              <svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Dell Warranty Modal -->
        <div id="dellWarrantyModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 transition-colors max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Dell Warranty Information
              </h3>
              <button onclick="closeDellWarrantyModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div id="dellWarrantyLoading" class="text-center py-8">
              <svg class="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <p class="text-gray-600 dark:text-gray-400 mt-3">Fetching warranty info from Dell...</p>
            </div>
            
            <div id="dellWarrantyError" class="hidden text-center py-8">
              <svg class="w-10 h-10 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p id="dellWarrantyErrorMessage" class="text-red-600 dark:text-red-400"></p>
            </div>
            
            <div id="dellWarrantyContent" class="hidden">
              <div class="space-y-4">
                <!-- Device Info -->
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 class="font-medium text-gray-900 dark:text-white mb-2">Device Information</h4>
                  <dl class="grid grid-cols-2 gap-2 text-sm">
                    <dt class="text-gray-500 dark:text-gray-400">Service Tag:</dt>
                    <dd id="dell-service-tag" class="font-mono text-gray-900 dark:text-white"></dd>
                    <dt class="text-gray-500 dark:text-gray-400">Model:</dt>
                    <dd id="dell-model" class="text-gray-900 dark:text-white"></dd>
                    <dt class="text-gray-500 dark:text-gray-400">Product Line:</dt>
                    <dd id="dell-product-line" class="text-gray-900 dark:text-white"></dd>
                    <dt class="text-gray-500 dark:text-gray-400">Ship Date:</dt>
                    <dd id="dell-ship-date" class="text-gray-900 dark:text-white"></dd>
                  </dl>
                </div>
                
                <!-- Warranty Dates -->
                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 class="font-medium text-blue-900 dark:text-blue-200 mb-2">Warranty Period</h4>
                  <dl class="grid grid-cols-2 gap-2 text-sm">
                    <dt class="text-blue-600 dark:text-blue-400">Warranty Start:</dt>
                    <dd id="dell-warranty-start" class="font-semibold text-blue-900 dark:text-blue-200"></dd>
                    <dt class="text-blue-600 dark:text-blue-400">Warranty End:</dt>
                    <dd id="dell-warranty-end" class="font-semibold text-blue-900 dark:text-blue-200"></dd>
                  </dl>
                </div>
                
                <!-- Entitlements List -->
                <div id="dell-entitlements-container" class="hidden">
                  <h4 class="font-medium text-gray-900 dark:text-white mb-2">Service Entitlements</h4>
                  <div id="dell-entitlements" class="space-y-2 max-h-40 overflow-y-auto"></div>
                </div>
                
                <!-- Update Preview -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Apply Changes
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">The following warranty dates will be updated:</p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="label text-xs">New Warranty Start</label>
                      <input type="date" id="dell-new-start" class="input-field text-sm" readonly>
                    </div>
                    <div>
                      <label class="label text-xs">New Warranty End</label>
                      <input type="date" id="dell-new-end" class="input-field text-sm" readonly>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button onclick="closeDellWarrantyModal()" class="btn btn-secondary">Cancel</button>
              <button id="apply-dell-warranty-btn" onclick="applyDellWarranty()" class="btn btn-primary hidden">
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Apply Warranty Dates
                </span>
              </button>
            </div>
          </div>
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

            ${isReadonly ? `
            // Disable all form fields in readonly mode
            (function() {
              const form = document.querySelector('form[action*="/edit/"]');
              if (form) {
                const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"], button[type="button"]');
                inputs.forEach(el => {
                  if (el.tagName === 'INPUT' && el.type !== 'hidden') {
                    el.setAttribute('readonly', 'readonly');
                    el.setAttribute('disabled', 'disabled');
                  } else if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') {
                    el.setAttribute('disabled', 'disabled');
                  }
                });
              }
            })();
            ` : ''}
          })();
        </script>
      </form>
    </div>

    ${getModalHtml()}
    ${getScriptsHtml()}
  `;

  return layout(`ITEM - ${eq.service_tag}`, content, isAdmin, hasPcPwView, username, hasAuditApprover);
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

function formatDateForInput(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  // MySQL DATE format is already YYYY-MM-DD, but handle Date objects or other formats
  if (typeof dateStr === 'object' && dateStr instanceof Date) {
    return dateStr.toISOString().split('T')[0];
  }
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
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
