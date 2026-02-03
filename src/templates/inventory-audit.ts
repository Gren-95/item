import { layout } from "./layout";
import { renderAlert, escapeHtml, getModalHtml } from "./components";
import { CLIPBOARD_CHECK_ICON, EXCLAMATION_TRIANGLE_ICON } from "./icons";

interface InventoryPeriod {
  id: number;
  inventory_nr: string;
  start_date: string | Date;
  end_date: string | Date;
  comment: string | null;
}

function formatDate(date: string | Date | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(date: string | Date | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Equipment {
  id: number;
  service_tag: string;
  type_name: string | null;
  product_line_name: string | null;
  model_name: string | null;
  vendor_name: string | null;
  teamviewer: string | number | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  latest_audit_date: string | Date | null;
  purchase_date: string | Date;
  warranty_expiry_date: string | Date;
  is_written_off: number | null;
  write_off_reason: string | null;
  repair_status: 'needs_repair' | 'at_supplier' | 'returned' | 'in_backup' | null;
  region_name: string | null;
  country_name: string | null;
  plant_name: string | null;
  department_name: string | null;
  area_name: string | null;
  sub_area_name: string | null;
  equipment_sub_area_id: number | null;
  comment: string | null;
  // Location IDs for edit modal
  region_id: number | null;
  country_id: number | null;
  plant_id: number | null;
  department_id: number | null;
  area_id: number | null;
}

interface SelectOption {
  id: number;
  name: string;
  parent_id?: number;
}

interface LocationData {
  regions: SelectOption[];
  countries: SelectOption[];
  plants: SelectOption[];
  departments: SelectOption[];
  areas: SelectOption[];
  subAreas: SelectOption[];
}

export function inventoryAuditPage(
  searchQuery: string = "",
  equipment: Equipment | null = null,
  inventoryPeriod: InventoryPeriod | null = null,
  message: string | null = null,
  messageType: "success" | "error" | "info" = "info",
  isOutOfRange: boolean = false,
  isAdmin: boolean = false,
  hasPcPwView: boolean = false,
  username: string | null = null,
  hasAuditApprover: boolean = false,
  locationData: LocationData | null = null,
  hasManageLocations: boolean = false
): string {
  const title = "Inventory Audit";

  const locationStr = equipment ? [
    equipment.plant_name,
    equipment.department_name,
    equipment.area_name,
    equipment.sub_area_name
  ].filter(Boolean).join(' - ') || 'Not assigned' : '';

  const typeStr = equipment ? [
    equipment.vendor_name,
    equipment.type_name,
    equipment.product_line_name,
    equipment.model_name
  ].filter(Boolean).join(' - ') : '';

  const statusLabel = equipment ? (
    equipment.is_written_off 
      ? escapeHtml(equipment.write_off_reason || 'Written Off')
      : equipment.repair_status
        ? equipment.repair_status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Kasutusel'
  ) : '';

  const content = `
    <div class="max-w-4xl mx-auto px-4 py-6">
      ${message ? renderAlert(messageType === "error" ? "" : message, messageType === "error" ? message : "") : ""}

      <!-- Main Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div class="text-emerald-500 dark:text-emerald-400">
            ${CLIPBOARD_CHECK_ICON}
          </div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Inventory Audit</h1>
          <div class="ml-auto flex items-center gap-3">
            ${inventoryPeriod ? `
              <span class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(inventoryPeriod.inventory_nr)}</span>
            ` : ''}
            ${hasAuditApprover ? `
              <a href="/inventory-audit/review" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                Review
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Search Bar -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <form method="GET" action="/inventory-audit" class="flex gap-2">
            <div class="flex-1 relative">
              <input
                type="text"
                name="search"
                value="${escapeHtml(searchQuery)}"
                placeholder="Enter serial number..."
                class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10"
                ${!inventoryPeriod ? 'disabled' : ''}
                autofocus
              />
              ${searchQuery ? `
                <a href="/inventory-audit" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </a>
              ` : ''}
            </div>
            <button
              type="submit"
              class="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              ${!inventoryPeriod ? 'disabled' : ''}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          </form>
        </div>

        ${!inventoryPeriod ? `
          <!-- No Period Warning -->
          <div class="px-6 py-8 text-center">
            <div class="text-yellow-500 dark:text-yellow-400 mb-3">
              ${EXCLAMATION_TRIANGLE_ICON}
            </div>
            <h3 class="text-gray-900 dark:text-white font-medium mb-2">No Inventory Period</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">Create an inventory period to start auditing.</p>
            ${hasAuditApprover ? `
              <div class="flex items-center justify-center">
                <a href="/inventory-audit/review" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                  Go to Review & Periods
                </a>
              </div>
            ` : ''}
          </div>
        ` : equipment ? `
          <!-- Equipment Info Section -->
          <div class="bg-emerald-50 dark:bg-emerald-900/40 px-6 py-4">
            <div class="grid grid-cols-2 gap-x-8 gap-y-4">
              <!-- Location -->
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <div>
                  <div class="text-xs text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wide">Location</div>
                  <div class="text-gray-900 dark:text-white font-medium">${escapeHtml(locationStr)}</div>
                </div>
              </div>

              <!-- User -->
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <div>
                  <div class="text-xs text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wide">User</div>
                  <div class="text-gray-900 dark:text-white font-medium">
                    ${equipment.assigned_to_name
                      ? `${equipment.assigned_to} - ${escapeHtml(equipment.assigned_to_name)}`
                      : 'Not assigned'}
                  </div>
                </div>
              </div>

              <!-- Latest Audit -->
              <div class="flex items-start gap-3 col-span-2 sm:col-span-1">
                <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <div class="flex-1">
                  <div class="text-xs text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wide">Latest Audit</div>
                  <div class="text-gray-900 dark:text-white font-medium">
                    ${equipment.latest_audit_date
                      ? formatDateDisplay(equipment.latest_audit_date)
                      : 'Never audited'}
                  </div>
                </div>
                <form method="POST" action="/inventory-audit/save" class="flex-shrink-0">
                  <input type="hidden" name="equipment_id" value="${equipment.id}">
                  <input type="hidden" name="inventory_period_id" value="${inventoryPeriod?.id || ''}">
                  <button type="submit" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Update
                  </button>
                </form>
              </div>
            </div>
          </div>

          ${isOutOfRange ? `
            <!-- Out of Range Warning -->
            <div class="px-6 py-3 bg-amber-100 dark:bg-amber-900/30 border-t border-amber-300 dark:border-amber-700/50 flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              Last audit (${equipment.latest_audit_date ? formatDate(equipment.latest_audit_date) : 'Never'}) is outside current period
            </div>
          ` : ''}

          <!-- Equipment Details -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4">Equipment Details</h3>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-6">
              <!-- Type -->
              <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                <div class="text-gray-900 dark:text-white text-sm">${escapeHtml(typeStr) || '-'}</div>
              </div>

              <!-- Teamviewer -->
              <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Teamviewer</div>
                <div class="text-gray-900 dark:text-white text-sm font-mono">${equipment.teamviewer || '0'}</div>
              </div>

              <!-- Status -->
              <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                <div class="text-gray-900 dark:text-white text-sm">${statusLabel}</div>
              </div>

              <!-- Device Age -->
              <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Device Age</div>
                <div class="text-gray-900 dark:text-white text-sm">${formatDeviceAge(equipment.purchase_date)}</div>
              </div>

              <!-- Warranty -->
              <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Warranty</div>
                <div class="text-sm ${isWarrantyExpired(equipment.warranty_expiry_date) ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}">
                  ${formatWarrantyInfo(equipment.purchase_date, equipment.warranty_expiry_date)}
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button type="button" id="edit-btn" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit
            </button>
            <button type="button" id="print-tag-btn" data-service-tag="${escapeHtml(equipment.service_tag)}" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              Print Tag
            </button>
            <a href="/edit/${equipment.id}" class="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors ml-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Full Edit
            </a>
          </div>
        ` : searchQuery ? `
          <!-- Not Found -->
          <div class="px-6 py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-gray-900 dark:text-white font-medium mb-1">No equipment found</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm">Serial number "${escapeHtml(searchQuery)}" not found in system.</p>
          </div>
        ` : `
          <!-- Empty State -->
          <div class="px-6 py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <h3 class="text-gray-900 dark:text-white font-medium mb-1">Search for equipment</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm">Enter a serial number to start auditing.</p>
          </div>
        `}
      </div>

      <!-- Edit Modal -->
      ${equipment ? `
        <div id="editModal" class="fixed inset-0 bg-black/50 dark:bg-black/70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Quick Edit - ${escapeHtml(equipment.service_tag)}
              </h3>
              <button onclick="closeEditModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <form id="editForm" class="space-y-4">
              <input type="hidden" name="equipment_id" value="${equipment.id}">
              <input type="hidden" name="inventory_period_id" value="${inventoryPeriod?.id || ''}">
              
              <!-- Location Section -->
              <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Location
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Region</label>
                    <select id="edit_region_id" name="region_id" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select...</option>
                      ${locationData?.regions.map(r => `<option value="${r.id}" ${equipment.region_id === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('') || ''}
                      ${isAdmin ? '<option value="__add_new__" class="text-blue-400 font-medium">+ Add new region...</option>' : ''}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Country</label>
                    <select id="edit_country_id" name="country_id" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select region first...</option>
                      ${locationData?.countries.map(c => `<option value="${c.id}" data-parent="${c.parent_id}" ${equipment.country_id === c.id ? 'selected' : ''} ${equipment.region_id !== c.parent_id ? 'hidden' : ''}>${escapeHtml(c.name)}</option>`).join('') || ''}
                      ${isAdmin ? `<option value="__add_new__" data-parent="__always__" ${equipment.region_id ? '' : 'hidden'} class="text-blue-400 font-medium">+ Add new country...</option>` : ''}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Plant</label>
                    <select id="edit_plant_id" name="plant_id" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select country first...</option>
                      ${locationData?.plants.map(p => `<option value="${p.id}" data-parent="${p.parent_id}" ${equipment.plant_id === p.id ? 'selected' : ''} ${equipment.country_id !== p.parent_id ? 'hidden' : ''}>${escapeHtml(p.name)}</option>`).join('') || ''}
                      ${isAdmin ? `<option value="__add_new__" data-parent="__always__" ${equipment.country_id ? '' : 'hidden'} class="text-blue-400 font-medium">+ Add new plant...</option>` : ''}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Department</label>
                    <select id="edit_department_id" name="department_id" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select plant first...</option>
                      ${locationData?.departments.map(d => `<option value="${d.id}" data-parent="${d.parent_id}" ${equipment.department_id === d.id ? 'selected' : ''} ${equipment.plant_id !== d.parent_id ? 'hidden' : ''}>${escapeHtml(d.name)}</option>`).join('') || ''}
                      ${hasManageLocations ? `<option value="__add_new__" data-parent="__always__" ${equipment.plant_id ? '' : 'hidden'} class="text-blue-400 font-medium">+ Add new department...</option>` : ''}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Area</label>
                    <select id="edit_area_id" name="area_id" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select department first...</option>
                      ${locationData?.areas.map(a => `<option value="${a.id}" data-parent="${a.parent_id}" ${equipment.area_id === a.id ? 'selected' : ''} ${equipment.department_id !== a.parent_id ? 'hidden' : ''}>${escapeHtml(a.name)}</option>`).join('') || ''}
                      ${hasManageLocations ? `<option value="__add_new__" data-parent="__always__" ${equipment.department_id ? '' : 'hidden'} class="text-blue-400 font-medium">+ Add new area...</option>` : ''}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sub-Area</label>
                    <select id="edit_sub_area_id" name="equipment_sub_area_id" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select area first...</option>
                      ${locationData?.subAreas.map(s => `<option value="${s.id}" data-parent="${s.parent_id}" ${equipment.equipment_sub_area_id === s.id ? 'selected' : ''} ${equipment.area_id !== s.parent_id ? 'hidden' : ''}>${escapeHtml(s.name)}</option>`).join('') || ''}
                      ${hasManageLocations ? `<option value="__add_new__" data-parent="__always__" ${equipment.area_id ? '' : 'hidden'} class="text-blue-400 font-medium">+ Add new sub area...</option>` : ''}
                    </select>
                  </div>
                </div>
              </div>
              
              <!-- Assigned To -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To (Employee No)</label>
                <input
                  type="text"
                  name="assigned_to"
                  value="${escapeHtml(equipment.assigned_to || '')}"
                  placeholder="e.g., 438928"
                  class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 mt-1">Current: ${equipment.assigned_to_name ? escapeHtml(equipment.assigned_to_name) : 'Not assigned'}</p>
              </div>
              
              <!-- TeamViewer -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TeamViewer ID</label>
                <input
                  type="text"
                  name="teamviewer"
                  value="${equipment.teamviewer || ''}"
                  placeholder="TeamViewer ID"
                  class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <!-- Comment -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
                <textarea
                  name="comment"
                  rows="2"
                  placeholder="Optional notes..."
                  class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                >${escapeHtml(equipment.comment || '')}</textarea>
              </div>
              
              <div id="edit-error" class="hidden text-red-400 text-sm"></div>
              
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" onclick="closeEditModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                <button type="submit" id="save-edit-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Save & Update Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- Add Location Modal -->
      ${hasManageLocations ? getModalHtml() : ''}

      <!-- Print Modal -->
      ${equipment ? `
        <div id="printModal" class="fixed inset-0 bg-black/50 dark:bg-black/70 hidden items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Print Label
              </h3>
              <button onclick="closePrintModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="mb-4">
              <p class="text-gray-500 dark:text-gray-400 text-sm mb-2">Service Tag:</p>
              <p class="text-gray-900 dark:text-white font-mono text-lg">${escapeHtml(equipment.service_tag)}</p>
            </div>
            
            <div id="printers-loading" class="text-center py-4">
              <svg class="w-8 h-8 animate-spin text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <p class="text-gray-500 dark:text-gray-400 mt-2">Loading printers...</p>
            </div>
            
            <div id="printers-list" class="space-y-2 hidden max-h-60 overflow-y-auto"></div>
            <div id="printers-error" class="hidden text-red-400 text-sm mb-4"></div>
            
            <div class="flex justify-end gap-3 mt-4">
              <button onclick="closePrintModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              <button id="confirm-print" onclick="confirmPrint()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors hidden">Print</button>
            </div>
          </div>
        </div>
        
        <script>
          (function() {
            let printers = [];
            let selectedPrinter = null;
            const serviceTag = '${escapeHtml(equipment.service_tag)}';
            
            // Client-side HTML escaping function
            function escapeHtml(text) {
              if (text == null || text === undefined) return '';
              const div = document.createElement('div');
              div.textContent = String(text);
              return div.innerHTML;
            }
            
            const printBtn = document.getElementById('print-tag-btn');
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
                  console.log('Loaded printers:', printers);
                  if (printers.length > 0) {
                    console.log('First printer:', printers[0]);
                  }
                  renderPrinters();
                } else {
                  showError(result.error || 'Failed to load printers');
                }
              } catch (err) {
                showError('Failed to connect to printer service');
              }
            }
            
            function renderPrinters() {
              printersLoading.classList.add('hidden');
              printersList.classList.remove('hidden');
              
              if (printers.length === 0) {
                showError('No printers available');
                return;
              }
              
              printersList.innerHTML = printers.map((printer, idx) => {
                if (!printer || !printer.name) {
                  console.warn('Invalid printer object:', printer);
                  return '';
                }
                const location = (printer.department || '') + (printer.area && printer.area !== printer.department ? ' - ' + printer.area : '');
                const printerName = escapeHtml(printer.name || 'Unknown');
                const printerIp = escapeHtml(printer.ip || '');
                const locationText = escapeHtml(location || 'No location');
                const isFirst = idx === 0;
                return '<button type="button" class="w-full text-left px-4 py-3 rounded-lg border transition-colors printer-option ' +
                       (isFirst ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500') +
                       '" data-printer-name="' + printerName + '" data-printer-ip="' + printerIp + '">' +
                       '<div class="font-medium text-gray-900 dark:text-white">' + printerName + '</div>' +
                       '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">' + locationText + '</div>' +
                       '</button>';
              }).join('');
              
              // Select first printer by default
              if (printers.length > 0) {
                selectedPrinter = printers[0];
                confirmPrintBtn.classList.remove('hidden');
              }
              
              // Add click handlers
              document.querySelectorAll('.printer-option').forEach(btn => {
                btn.addEventListener('click', function() {
                  document.querySelectorAll('.printer-option').forEach(b => {
                    b.classList.remove('border-emerald-500', 'bg-emerald-100', 'dark:bg-emerald-900/30');
                    b.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-gray-100', 'dark:bg-gray-700');
                  });
                  this.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-gray-100', 'dark:bg-gray-700');
                  this.classList.add('border-emerald-500', 'bg-emerald-100', 'dark:bg-emerald-900/30');
                  selectedPrinter = printers.find(p => p.name === this.dataset.printerName);
                  confirmPrintBtn.classList.remove('hidden');
                });
              });
            }
            
            function showError(message) {
              printersLoading.classList.add('hidden');
              printersList.classList.add('hidden');
              printersError.classList.remove('hidden');
              printersError.textContent = message;
            }
            
            window.openPrintModal = function() {
              printModal.classList.remove('hidden');
              printModal.classList.add('flex');
              printersLoading.classList.remove('hidden');
              printersList.classList.add('hidden');
              printersError.classList.add('hidden');
              confirmPrintBtn.classList.add('hidden');
              selectedPrinter = null;
              loadPrinters();
            };
            
            window.closePrintModal = function() {
              printModal.classList.add('hidden');
              printModal.classList.remove('flex');
            };
            
            window.confirmPrint = async function() {
              if (!selectedPrinter) return;
              
              confirmPrintBtn.disabled = true;
              confirmPrintBtn.textContent = 'Printing...';
              
              try {
                const response = await fetch('/api/print', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    service_tag: serviceTag,
                    printer: selectedPrinter.name
                  })
                });
                
                const result = await response.json();
                
                if (result.success) {
                  closePrintModal();
                  // Show success toast or alert
                  alert('Print job sent successfully!');
                } else {
                  showError(result.error || 'Failed to print');
                }
              } catch (err) {
                showError('Failed to send print job');
              } finally {
                confirmPrintBtn.disabled = false;
                confirmPrintBtn.textContent = 'Print';
              }
            };
            
            printBtn?.addEventListener('click', openPrintModal);
            
            // Close modal on backdrop click
            printModal?.addEventListener('click', function(e) {
              if (e.target === this) {
                closePrintModal();
              }
            });
            
            // Edit Modal functionality
            const editBtn = document.getElementById('edit-btn');
            const editModal = document.getElementById('editModal');
            const editForm = document.getElementById('editForm');
            const editError = document.getElementById('edit-error');
            const saveEditBtn = document.getElementById('save-edit-btn');
            
            // Cascading location selects
            function filterOptions(selectId, parentValue) {
              const select = document.getElementById(selectId);
              if (!select) return;
              
              const options = select.querySelectorAll('option[data-parent]');
              let hasVisibleMatch = false;
              
              options.forEach(opt => {
                const parent = opt.dataset.parent;
                // Compare as strings to handle number/string mismatches
                if (parent === String(parentValue) || !parentValue || parentValue === '') {
                  opt.hidden = false;
                  if (opt.selected) {
                    hasVisibleMatch = true;
                  }
                } else {
                  opt.hidden = true;
                  if (opt.selected) {
                    opt.selected = false;
                  }
                }
              });
              
              // Clear value if current selection doesn't match parent
              if (parentValue && !hasVisibleMatch && select.value) {
                select.value = '';
              }
              
              // Show/hide "Add new" option based on parent
              const addNewOption = select.querySelector('option[value="__add_new__"]');
              if (addNewOption) {
                if (addNewOption.dataset.parent === '__always__') {
                  addNewOption.hidden = !parentValue;
                }
              }
            }
            
            function resetEditChildren(selectId) {
              // Reset all child selects when a parent changes in edit modal
              const childMap = {
                'edit_region_id': ['edit_country_id', 'edit_plant_id', 'edit_department_id', 'edit_area_id', 'edit_sub_area_id'],
                'edit_country_id': ['edit_plant_id', 'edit_department_id', 'edit_area_id', 'edit_sub_area_id'],
                'edit_plant_id': ['edit_department_id', 'edit_area_id', 'edit_sub_area_id'],
                'edit_department_id': ['edit_area_id', 'edit_sub_area_id'],
                'edit_area_id': ['edit_sub_area_id']
              };
              
              const children = childMap[selectId] || [];
              children.forEach(childId => {
                const childSelect = document.getElementById(childId);
                if (childSelect) {
                  childSelect.value = '';
                  const childOptions = childSelect.querySelectorAll('option[data-parent]');
                  childOptions.forEach(opt => {
                    opt.hidden = true;
                    opt.selected = false;
                  });
                  const addNewOption = childSelect.querySelector('option[value="__add_new__"]');
                  if (addNewOption) {
                    addNewOption.hidden = true;
                  }
                }
              });
            }
            
            function handleEditLocationChange(selectId, value) {
              if (!value || value === '__add_new__') return;
              
              resetEditChildren(selectId);
              
              // Cascade to children
              if (selectId === 'edit_region_id') {
                filterOptions('edit_country_id', value);
              } else if (selectId === 'edit_country_id') {
                filterOptions('edit_plant_id', value);
              } else if (selectId === 'edit_plant_id') {
                filterOptions('edit_department_id', value);
              } else if (selectId === 'edit_department_id') {
                filterOptions('edit_area_id', value);
              } else if (selectId === 'edit_area_id') {
                filterOptions('edit_sub_area_id', value);
              }
            }
            
            function handleEditLocationAdd(select, type, label, parentSelectId = null) {
              if (select.value !== '__add_new__') return;
              
              // Use the global openAddModal function
              if (typeof window.openAddModal === 'function') {
                const parentId = parentSelectId ? document.getElementById(parentSelectId)?.value : null;
                window.openAddModal(type, label, select.id, parentId, parentSelectId);
              } else {
                alert('Add location functionality not available');
                select.value = '';
              }
            }
            
            async function softRefreshLocations() {
              // Soft refresh: reload location data by reloading the page
              // This ensures we get the latest location data from the server
              // The user will need to reopen the modal, but data will be fresh
              window.location.reload();
            }
            
            function getParentIdForSelect(selectId) {
              const parentMap = {
                'edit_country_id': 'edit_region_id',
                'edit_plant_id': 'edit_country_id',
                'edit_department_id': 'edit_plant_id',
                'edit_area_id': 'edit_department_id',
                'edit_sub_area_id': 'edit_area_id'
              };
              const parentSelectId = parentMap[selectId];
              if (parentSelectId) {
                const parentSelect = document.getElementById(parentSelectId);
                return parentSelect?.value || null;
              }
              return null;
            }
            
            function initializeLocationSelects() {
              // Initialize cascading selects based on current equipment values
              const regionId = document.getElementById('edit_region_id')?.value || '';
              const countryId = document.getElementById('edit_country_id')?.value || '';
              const plantId = document.getElementById('edit_plant_id')?.value || '';
              const departmentId = document.getElementById('edit_department_id')?.value || '';
              const areaId = document.getElementById('edit_area_id')?.value || '';
              
              if (regionId) {
                filterOptions('edit_country_id', regionId);
                if (countryId) {
                  filterOptions('edit_plant_id', countryId);
                  if (plantId) {
                    filterOptions('edit_department_id', plantId);
                    if (departmentId) {
                      filterOptions('edit_area_id', departmentId);
                      if (areaId) {
                        filterOptions('edit_sub_area_id', areaId);
                      }
                    }
                  }
                }
              }
            }
            
            // Override submitModal to handle approval and soft refresh for edit modal
            const originalSubmitModal = window.submitModal;
            window.submitModal = async function() {
              const name = document.getElementById('modalInput').value.trim();
              if (!name) {
                document.getElementById('modalError').textContent = 'Name is required';
                document.getElementById('modalError').classList.remove('hidden');
                return;
              }

              try {
                const body = { name };
                const currentParentId = window.currentParentId || null;
                if (currentParentId) {
                  body.parent_id = parseInt(currentParentId);
                }

                const response = await fetch('/api/' + window.currentModalType, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body)
                });

                const result = await response.json();
                
                if (!response.ok) {
                  throw new Error(result.error || 'Failed to create item');
                }

                // Handle approval request response
                if (result.status === 'pending_approval') {
                  alert('Location addition requires approval. Request ID: ' + result.requestId);
                  // Close modal for approval requests since they need to wait
                  document.getElementById('addModal').classList.add('hidden');
                  document.getElementById('addModal').classList.remove('flex');
                  window.currentModalType = '';
                  window.currentParentId = null;
                  window.currentSelectId = '';
                  // Soft refresh to show any recently approved items
                  await softRefreshLocations();
                  return;
                }

                // Add new option to select and select it
                const select = document.getElementById(window.currentSelectId);
                if (select) {
                  const newOption = document.createElement('option');
                  newOption.value = result.id;
                  newOption.textContent = name;
                  if (currentParentId) {
                    newOption.dataset.parent = currentParentId;
                  }
                  
                  // Insert before the "Add new..." option
                  const addNewOption = select.querySelector('option[value="__add_new__"]');
                  if (addNewOption) {
                    select.insertBefore(newOption, addNewOption);
                  } else {
                    select.appendChild(newOption);
                  }
                  select.value = result.id;
                  
                  // Trigger change event to cascade if needed
                  select.dispatchEvent(new Event('change'));
                }
                
                // Clear input and error, keep modal open for adding more
                document.getElementById('modalInput').value = '';
                document.getElementById('modalError').classList.add('hidden');
                document.getElementById('modalInput').focus();
              } catch (err) {
                document.getElementById('modalError').textContent = err.message;
                document.getElementById('modalError').classList.remove('hidden');
              }
            };
            
            // Make openAddModal and closeModal available globally for edit modal
            window.openAddModal = function(type, label, selectId, parentId = null, parentSelectId = null) {
              // Check if parent is required but not selected
              if (parentSelectId) {
                const parentSelect = document.getElementById(parentSelectId);
                if (!parentSelect || !parentSelect.value) {
                  alert('Please select ' + parentSelectId.replace('edit_', '').replace('_id', '').replace(/_/g, ' ') + ' first');
                  document.getElementById(selectId).value = '';
                  return;
                }
                parentId = parentSelect.value;
              }
              
              window.currentModalType = type;
              window.currentParentId = parentId;
              window.currentSelectId = selectId;
              
              document.getElementById('modalTitle').textContent = 'Add New ' + label;
              document.getElementById('modalLabel').textContent = label + ' Name';
              document.getElementById('modalInput').value = '';
              document.getElementById('modalInput').placeholder = 'Enter ' + label.toLowerCase() + ' name...';
              document.getElementById('modalError').classList.add('hidden');
              document.getElementById('addModal').classList.remove('hidden');
              document.getElementById('addModal').classList.add('flex');
              document.getElementById('modalInput').focus();
            };
            
            window.closeModal = function() {
              document.getElementById('addModal').classList.add('hidden');
              document.getElementById('addModal').classList.remove('flex');
              // Reset select to empty value
              if (window.currentSelectId) {
                document.getElementById(window.currentSelectId).value = '';
              }
              window.currentModalType = '';
              window.currentParentId = null;
              window.currentSelectId = '';
            };
            
            window.openEditModal = function() {
              editModal.classList.remove('hidden');
              editModal.classList.add('flex');
              editError.classList.add('hidden');
              // Initialize location selects when modal opens
              setTimeout(initializeLocationSelects, 10);
            };
            
            window.closeEditModal = function() {
              editModal.classList.add('hidden');
              editModal.classList.remove('flex');
            };
            
            editBtn?.addEventListener('click', openEditModal);
            
            editModal?.addEventListener('click', function(e) {
              if (e.target === this) {
                closeEditModal();
              }
            });
            
            // Remove inline handlers and use proper event listeners
            document.getElementById('edit_region_id')?.addEventListener('change', function() {
              if (this.value === '__add_new__') {
                handleEditLocationAdd(this, 'regions', 'Region');
              } else {
                handleEditLocationChange('edit_region_id', this.value);
              }
            });
            
            document.getElementById('edit_country_id')?.addEventListener('change', function() {
              if (this.value === '__add_new__') {
                handleEditLocationAdd(this, 'countries', 'Country', 'edit_region_id');
              } else {
                handleEditLocationChange('edit_country_id', this.value);
              }
            });
            
            document.getElementById('edit_plant_id')?.addEventListener('change', function() {
              if (this.value === '__add_new__') {
                handleEditLocationAdd(this, 'plants', 'Plant', 'edit_country_id');
              } else {
                handleEditLocationChange('edit_plant_id', this.value);
              }
            });
            
            document.getElementById('edit_department_id')?.addEventListener('change', function() {
              if (this.value === '__add_new__') {
                handleEditLocationAdd(this, 'departments', 'Department', 'edit_plant_id');
              } else {
                handleEditLocationChange('edit_department_id', this.value);
              }
            });
            
            document.getElementById('edit_area_id')?.addEventListener('change', function() {
              if (this.value === '__add_new__') {
                handleEditLocationAdd(this, 'areas', 'Area', 'edit_department_id');
              } else {
                handleEditLocationChange('edit_area_id', this.value);
              }
            });
            
            document.getElementById('edit_sub_area_id')?.addEventListener('change', function() {
              if (this.value === '__add_new__') {
                handleEditLocationAdd(this, 'sub-areas', 'Sub Area', 'edit_area_id');
              } else {
                handleEditLocationChange('edit_sub_area_id', this.value);
              }
            });
            
            editForm?.addEventListener('submit', async function(e) {
              e.preventDefault();
              
              saveEditBtn.disabled = true;
              saveEditBtn.textContent = 'Saving...';
              editError.classList.add('hidden');
              
              const formData = new FormData(editForm);
              
              try {
                const response = await fetch('/inventory-audit/quick-edit', {
                  method: 'POST',
                  body: formData
                });
                
                if (response.redirected) {
                  window.location.href = response.url;
                } else {
                  const text = await response.text();
                  if (response.ok) {
                    window.location.reload();
                  } else {
                    editError.textContent = 'Failed to save changes';
                    editError.classList.remove('hidden');
                  }
                }
              } catch (err) {
                editError.textContent = 'Failed to save changes';
                editError.classList.remove('hidden');
              } finally {
                saveEditBtn.disabled = false;
                saveEditBtn.textContent = 'Save & Update Audit';
              }
            });
          })();
        </script>
      ` : ''}
    </div>
  `;

  return layout(title, content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

function isWarrantyExpired(warrantyExpiry: string | Date): boolean {
  const expiry = warrantyExpiry instanceof Date ? warrantyExpiry : new Date(warrantyExpiry);
  return new Date() > expiry;
}

function formatWarrantyInfo(purchaseDate: string | Date, warrantyExpiry: string | Date): string {
  const purchase = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);
  const expiry = warrantyExpiry instanceof Date ? warrantyExpiry : new Date(warrantyExpiry);

  const diffTime = expiry.getTime() - purchase.getTime();
  const diffYears = Math.abs(diffTime / (1000 * 60 * 60 * 24 * 365.25));

  const purchaseStr = purchase.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const expiryStr = expiry.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return `${purchaseStr} - ${expiryStr} (${diffYears.toFixed(1)} years)`;
}

function formatDeviceAge(purchaseDate: string | Date | null): string {
  if (!purchaseDate) return '-';

  const purchase = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);
  const now = new Date();

  const diffTime = now.getTime() - purchase.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffYears = diffDays / 365.25;

  if (diffYears >= 1) {
    return `${diffYears.toFixed(1)} years`;
  } else if (diffDays >= 30) {
    const months = diffDays / 30.44;
    return `${months.toFixed(1)} months`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
}
