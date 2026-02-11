import { layout } from "./layout";
import { renderAlert } from "./components";
import { getModalHtml, getScriptsHtml } from "./components";
import { formatDateForInput } from "../utils/date";
import {
  INFORMATION_CIRCLE_ICON,
  EDIT_ICON,
  ARROW_LEFT_ICON,
  REFRESH_ICON,
  CPU_ICON,
  LOCATION_ICON,
  USER_ICON,
  CLOCK_ICON,
  X_ICON,
  PRINTER_ICON,
  DOCUMENT_TEXT_ICON,
  CHECK_ICON,
  SHIELD_CHECK_ICON,
  CHECK_CIRCLE_ICON,
  EXCLAMATION_CIRCLE_ICON,
  WRENCH_ICON
} from "./icons";

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

interface EditData {
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

export function editPage(data: EditData, success: string | boolean = false, error: string | null = null, isAdmin: boolean = false, hasPcPwView: boolean = false, isReadonly: boolean = false, userPlantId: number | null = null, _allowedRegionId: number | null = null, _allowedCountryId: number | null = null, username: string | null = null, hasAuditApprover: boolean = false, hasManageLocations: boolean = false): string {
  const eq = data.equipment;
  
  const content = `
    <div class="w-full px-4 sm:px-6 lg:px-12 xl:px-16">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <a href="/" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors self-start sm:self-center">
          ${ARROW_LEFT_ICON.replace('w-5 h-5', 'w-6 h-6')}
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
              ${INFORMATION_CIRCLE_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
              Equipment Information
            </h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="purchase_date" class="label">Warranty Start</label>
              <input
                type="text"
                id="purchase_date"
                name="purchase_date"
                value="${formatDateForInput(eq.purchase_date)}"
                class="input-field"
                placeholder="dd.mm.yyyy"
                pattern="(\\d{2}[.,-]\\d{2}[.,-]\\d{4}|\\d{6}|\\d{8})"
                ${isReadonly ? 'readonly disabled' : ''}
              >
            </div>
            <div>
              <label for="warranty_expiry_date" class="label">Warranty Expiry</label>
              <div class="flex">
                <input
                  type="text"
                  id="warranty_expiry_date"
                  name="warranty_expiry_date"
                  value="${formatDateForInput(eq.warranty_expiry_date)}"
                  class="input-field flex-1 ${isExpired(eq.warranty_expiry_date) ? "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700" : ""}"
                  placeholder="dd.mm.yyyy"
                  pattern="(\\d{2}[.,-]\\d{2}[.,-]\\d{4}|\\d{6}|\\d{8})"
                  ${isReadonly ? 'readonly disabled' : ''}
                >
                <button
                  type="button"
                  id="check-dell-warranty-btn"
                  onclick="checkDellWarranty()"
                  class="hidden px-3 bg-green-600 hover:bg-green-700 text-white rounded-md border border-green-600 hover:border-green-700 transition-colors -ml-px"
                  title="Fetch warranty info from Dell"
                  ${isReadonly ? 'disabled' : ''}
                >
                  ${REFRESH_ICON.replace('w-5 h-5', 'w-4 h-4')}
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
              ${CPU_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
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
              ${LOCATION_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
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
              ${USER_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
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
                  ${CLOCK_ICON.replace('text-current', 'text-gray-400 dark:text-gray-500')}
                  Device History
                </h2>
                <span id="history-count" class="text-xs text-gray-500 dark:text-gray-400"></span>
              </div>

              <div id="history-container" class="max-h-[600px] overflow-y-auto">
                <div id="history-loading" class="text-center py-8 text-gray-500 dark:text-gray-400">
                  ${REFRESH_ICON.replace('w-5 h-5', 'w-8 h-8 animate-spin mx-auto mb-2')}
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
                ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
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
                ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
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
            const input = document.getElementById('warranty_expiry_date');
            if (!btn) return;
            if (isDellVendor()) {
              btn.classList.remove('hidden');
              if (input) {
                input.classList.add('rounded-r-none', 'border-r-0');
              }
            } else {
              btn.classList.add('hidden');
              if (input) {
                input.classList.remove('rounded-r-none', 'border-r-0');
              }
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
              document.getElementById('dell-ship-date').textContent = formatEstonianDate(dellWarrantyData.shipDate) || '-';
              
              // Populate warranty dates
              document.getElementById('dell-warranty-start').textContent = formatEstonianDate(dellWarrantyData.warrantyStart) || '-';
              document.getElementById('dell-warranty-end').textContent = formatEstonianDate(dellWarrantyData.warrantyEnd) || '-';
              
              // Populate new date inputs
              document.getElementById('dell-new-start').value = formatEstonianDate(dellWarrantyData.warrantyStart) || '';
              document.getElementById('dell-new-end').value = formatEstonianDate(dellWarrantyData.warrantyEnd) || '';
              
              // Populate entitlements
              const entContainer = document.getElementById('dell-entitlements-container');
              const entList = document.getElementById('dell-entitlements');
              
              if (dellWarrantyData.entitlements && dellWarrantyData.entitlements.length > 0) {
                entContainer.classList.remove('hidden');
                entList.innerHTML = dellWarrantyData.entitlements.map(ent => \`
                  <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm">
                    <div class="font-medium text-gray-900 dark:text-white">\${(ent.serviceLevel || 'Unknown Service').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs">\${formatEstonianDate(ent.startDate) || ''} - \${formatEstonianDate(ent.endDate) || ''}</div>
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
              purchaseDateInput.value = formatEstonianDate(dellWarrantyData.warrantyStart) || '';
            }
            
            if (dellWarrantyData.warrantyEnd && warrantyExpiryInput) {
              warrantyExpiryInput.value = formatEstonianDate(dellWarrantyData.warrantyEnd) || '';
              // Update styling for expired/valid warranty
              const today = new Date();
              const expiryDate = new Date(dellWarrantyData.warrantyEnd);
              if (expiryDate < today) {
                warrantyExpiryInput.classList.add('text-yellow-700', 'dark:text-yellow-400', 'bg-yellow-50', 'dark:bg-yellow-900/20', 'border-yellow-300', 'dark:border-yellow-700');
              } else {
                warrantyExpiryInput.classList.remove('text-yellow-700', 'dark:text-yellow-400', 'bg-yellow-50', 'dark:bg-yellow-900/20', 'border-yellow-300', 'dark:border-yellow-700');
              }
            }
            
            closeDellWarrantyModal();
          };
          
          // Cascade functions for dropdowns - filter child options based on selected parent
          function filterSelect(selectId, parentValue) {
            const select = document.getElementById(selectId);
            if (!select) return;

            const options = select.querySelectorAll('option[data-parent]');
            const currentValue = select.value;
            const parentStr = parentValue ? String(parentValue) : '';
            let currentValueStillVisible = false;

            options.forEach(opt => {
              const optParent = opt.getAttribute('data-parent');
              if (optParent === '__always__') {
                opt.hidden = !parentStr;
              } else if (!parentStr) {
                opt.hidden = true;
              } else {
                opt.hidden = optParent !== parentStr;
              }

              if (!opt.hidden && opt.value === currentValue) {
                currentValueStillVisible = true;
              }
            });

            // Reset to empty if current selection is no longer visible
            if (currentValue && currentValue !== '__add_new__' && !currentValueStillVisible) {
              select.value = '';
              select.dispatchEvent(new Event('change'));
            }
          }

          function loadProductLines(typeId) {
            filterSelect('product_line_id', typeId);
          }

          function loadModels(productLineId) {
            filterSelect('model_id', productLineId);
          }

          function loadCountries(regionId) {
            filterSelect('country_id', regionId);
          }

          function loadPlants(countryId) {
            filterSelect('plant_id', countryId);
          }

          function loadDepartments(plantId) {
            filterSelect('department_id', plantId);
          }

          function loadAreas(departmentId) {
            filterSelect('area_id', departmentId);
          }

          function loadSubAreas(areaId) {
            filterSelect('equipment_sub_area_id', areaId);
          }

          // Initialize on page load
          document.addEventListener('DOMContentLoaded', function() {
            // Update Dell warranty button visibility on page load
            updateDellWarrantyButtonVisibility();

            // Update Dell warranty button visibility when vendor changes
            const vendorSelect = document.getElementById('vendor_id');
            if (vendorSelect) {
              vendorSelect.addEventListener('change', updateDellWarrantyButtonVisibility);
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
            return formatEstonianDateTime(dateStr) || '-';
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
                              '${USER_ICON.replace('w-5 h-5', 'w-3.5 h-3.5 flex-shrink-0')}' +
                              '<span class="truncate">' + (log.assigned_to_name ? escapeHistoryHtml(log.assigned_to + ' - ' + log.assigned_to_name) : (log.assigned_to ? escapeHistoryHtml(log.assigned_to) : 'Not assigned')) + '</span>' +
                            '</div>' +
                            '<div class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">' +
                              '${LOCATION_ICON.replace('w-5 h-5', 'w-3.5 h-3.5 flex-shrink-0')}' +
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
              ${X_ICON.replace('w-5 h-5', 'w-5 h-5 lg:w-6 lg:h-6')}
            </a>
            <!-- Print Label -->
            <button type="button" id="print-label" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" data-service-tag="${escapeHtml(eq.service_tag)}" title="Print Label" ${isReadonly ? 'disabled' : ''}>
              ${PRINTER_ICON.replace('w-5 h-5', 'w-5 h-5 lg:w-6 lg:h-6')}
            </button>
            <!-- Write-Off Status -->
            <button type="button" onclick="openWriteOffModal()" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 ${eq.is_written_off ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" title="${eq.is_written_off ? 'Written Off: ' + escapeHtml(eq.write_off_reason || 'Written Off') : 'Set Write-Off Status'}" ${isReadonly ? 'disabled' : ''}>
              ${DOCUMENT_TEXT_ICON.replace('w-5 h-5', 'w-5 h-5 lg:w-6 lg:h-6')}
            </button>
            <!-- Repair Status -->
            <button type="button" onclick="openRepairModal()" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 ${eq.repair_status && eq.repair_status !== 'in_backup' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" title="${eq.repair_status ? (eq.repair_status === 'needs_repair' ? 'Needs Repair' : eq.repair_status === 'at_supplier' ? 'At Supplier' : eq.repair_status === 'returned' ? 'Returned' : eq.repair_status === 'in_backup' ? 'In Use' : 'Set Repair Status') : 'Set Repair Status'}" ${isReadonly ? 'disabled' : ''}>
              ${WRENCH_ICON.replace('w-5 h-5', 'w-5 h-5 lg:w-6 lg:h-6')}
            </button>
            <!-- Save Changes -->
            <button type="submit" form="equipment-edit-form" class="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 lg:p-3.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}" title="${isReadonly ? 'Read-only Mode' : 'Save Changes'}" ${isReadonly ? 'disabled' : ''} ${isReadonly ? '' : 'id="save-changes-btn"'}>
              ${CHECK_ICON.replace('w-5 h-5', 'w-5 h-5 lg:w-6 lg:h-6')}
            </button>
          </div>
        </div>
        
        <!-- Dell Warranty Modal -->
        <div id="dellWarrantyModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 transition-colors max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                ${SHIELD_CHECK_ICON.replace('text-current', 'text-blue-500')}
                Dell Warranty Information
              </h3>
              <button onclick="closeDellWarrantyModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
              </button>
            </div>
            
            <div id="dellWarrantyLoading" class="text-center py-8">
              ${REFRESH_ICON.replace('w-5 h-5', 'w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto')}
              <p class="text-gray-600 dark:text-gray-400 mt-3">Fetching warranty info from Dell...</p>
            </div>
            
            <div id="dellWarrantyError" class="hidden text-center py-8">
              ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-10 h-10 text-red-500 mx-auto mb-3')}
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
                    ${CHECK_CIRCLE_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-green-500')}
                    Apply Changes
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">The following warranty dates will be updated:</p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="label text-xs">New Warranty Start</label>
                      <input type="text" id="dell-new-start" class="input-field text-sm" readonly placeholder="dd.mm.yyyy">
                    </div>
                    <div>
                      <label class="label text-xs">New Warranty End</label>
                      <input type="text" id="dell-new-end" class="input-field text-sm" readonly placeholder="dd.mm.yyyy">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button onclick="closeDellWarrantyModal()" class="btn btn-secondary">Cancel</button>
              <button id="apply-dell-warranty-btn" onclick="applyDellWarranty()" class="btn btn-primary hidden">
                <span class="flex items-center gap-2">
                  ${CHECK_ICON.replace('w-5 h-5', 'w-4 h-4')}
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

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

