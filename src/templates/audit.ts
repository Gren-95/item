import { layout } from "./layout";
import { escapeHtml, renderAlert } from "./components";
import { button } from "./buttons";
import { formatEstonianDate as formatEstDate } from "../utils/date";
import {
  CLIPBOARD_CHECK_ICON,
  PLUS_ICON,
  TRASH_ICON,
  CHECK_CIRCLE_ICON,
  SEARCH_ICON,
  EXCLAMATION_TRIANGLE_ICON,
  EMOJI_SAD_ICON,
  REFRESH_ICON,
  CLIPBOARD_ICON,
  DOWNLOAD_ICON,
  EXCLAMATION_CIRCLE_ICON,
  LOCK_ICON,
  X_ICON,
  USER_ICON,
  LOCATION_ICON,
  CALENDAR_ICON,
  EDIT_ICON,
  EXTERNAL_LINK_ICON,
  CLOCK_ICON
} from "./icons";

interface InventoryPeriod {
  id: number;
  inventory_nr: string;
  start_date: string | Date;
  end_date: string | Date;
  comment: string | null;
  confirmed_by?: string | null;
  created?: string | Date;
}

interface AuditRecord {
  id: number;
  equipment_id: number;
  inventory_period_id: number;
  service_tag: string;
  teamviewer: string | number | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  location: string | null;
  equipment_type: string | null;
  comment: string | null;
  updated_by: string | null;
  created: string | Date;
  updated: string | Date;
  inventory_nr: string;
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

interface Employee {
  employee_no: string;
  name: string;
}

export function auditPage(
  allPeriods: InventoryPeriod[] = [],
  defaultPeriod: InventoryPeriod | null = null,
  isAdmin: boolean = false,
  hasPcPwView: boolean = false,
  username: string | null = null,
  hasAuditApprover: boolean = false,
  allPeriodsForTab: InventoryPeriod[] = [],
  message: string | null = null,
  messageType: "success" | "error" | "info" = "info",
  locationData: LocationData | null = null,
  employees: Employee[] = []
): string {
  const title = "Audit Review";
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  function formatDate(date: string | Date | null | undefined): string {
    return formatEstDate(date);
  }

  // Today in dd.mm.yyyy for display, but keep ISO for date comparisons
  const todayISO = new Date().toISOString().split('T')[0];
  
  const alert = message ? renderAlert(messageType === "error" ? "" : message, messageType === "error" ? message : "") : "";

  const content = `
    <div class="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      ${alert}

      <!-- Tabs -->
      <div class="flex items-center justify-between mb-4" id="tabs-container">
        <div class="flex flex-wrap gap-2" id="tabs">
          <button data-tab="0" class="tab-btn tab-active">
            <span>Audit</span>
          </button>
          <button data-tab="1" class="tab-btn ${!hasAuditApprover ? 'tab-disabled' : ''}" ${!hasAuditApprover ? 'disabled title="You do not have permission to access Review"' : ''}>
            <span>Review</span>
          </button>
          <button data-tab="2" class="tab-btn ${!hasAuditApprover ? 'tab-disabled' : ''}" ${!hasAuditApprover ? 'disabled title="You do not have permission to access Periods"' : ''}>
            <span>Periods</span>
          </button>
        </div>
      </div>

      <!-- Tab Panels -->
      <div id="tab-panels" class="space-y-0">
        <!-- Audit Tab Panel -->
        <div class="tab-panel">
          <!-- Audit Header -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div class="text-emerald-500 dark:text-emerald-400">
                  ${CLIPBOARD_CHECK_ICON}
                </div>
                <h1 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Audit</h1>
                ${defaultPeriod ? `<span class="ml-auto text-sm text-gray-500 dark:text-gray-400">${escapeHtml(defaultPeriod.inventory_nr)}</span>` : ''}
              </div>
              <!-- Search Bar -->
              <form id="audit-search-form" class="flex gap-2">
                <div class="flex-1 relative">
                  <input
                    type="text"
                    id="audit-search-input"
                    placeholder="Enter serial number..."
                    class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    ${!defaultPeriod ? 'disabled' : ''}
                    autofocus
                  />
                </div>
                <button
                  type="submit"
                  class="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  ${!defaultPeriod ? 'disabled' : ''}
                >
                  ${SEARCH_ICON}
                </button>
              </form>
            </div>
          </div>

          ${!defaultPeriod ? `
            <!-- No Period Warning -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <div class="text-yellow-500 dark:text-yellow-400 mb-3 flex justify-center">
                ${EXCLAMATION_TRIANGLE_ICON.replace('w-5 h-5', 'w-12 h-12')}
              </div>
              <h3 class="text-gray-900 dark:text-white font-medium mb-2">No Active Inventory Period</h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">Create an inventory period in the Periods tab to start auditing.</p>
              ${isAdmin ? `
                <button onclick="document.querySelector('[data-tab=\\'2\\']').click()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  ${PLUS_ICON}
                  Create Period
                </button>
              ` : ''}
            </div>
          ` : `
            <!-- Equipment Result Container -->
            <div id="audit-result" class="hidden">
              <!-- Will be populated by JavaScript -->
            </div>

            <!-- Empty State -->
            <div id="audit-empty" class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
                ${SEARCH_ICON.replace('w-5 h-5', 'w-12 h-12')}
              </div>
              <h3 class="text-gray-900 dark:text-white font-medium mb-1">Search for equipment</h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm">Enter a serial number to start auditing.</p>
            </div>

            <!-- Not Found State -->
            <div id="audit-not-found" class="hidden bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
                ${EMOJI_SAD_ICON.replace('w-5 h-5', 'w-12 h-12')}
              </div>
              <h3 class="text-gray-900 dark:text-white font-medium mb-1">No equipment found</h3>
              <p id="audit-not-found-text" class="text-gray-500 dark:text-gray-400 text-sm mb-4">Serial number not found in system.</p>
              <a
                id="audit-add-equipment-btn"
                href="/add"
                class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                ${PLUS_ICON}
                Add Equipment
              </a>
            </div>

            <!-- Loading State -->
            <div id="audit-loading" class="hidden bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <div class="w-10 h-10 mx-auto mb-4 text-emerald-500">
                ${REFRESH_ICON.replace('w-5 h-5', 'w-10 h-10 animate-spin')}
              </div>
              <p class="text-gray-500 dark:text-gray-400">Searching...</p>
            </div>
          `}
        </div>

        <!-- Review Tab Panel -->
        <div class="tab-panel hidden">
          ${hasAuditApprover ? `
          <!-- Header -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="text-emerald-500 dark:text-emerald-400">
                    ${CLIPBOARD_CHECK_ICON}
                  </div>
                  <h1 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Audit Review</h1>
                </div>
                <div class="flex flex-wrap items-center gap-2" id="header-action-buttons">
                  <button
                    id="copy-api-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-700 text-white text-xs sm:text-sm rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Copy API endpoint URL"
                  >
                    ${CLIPBOARD_ICON.replace('w-5 h-5', 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                    <span class="hidden sm:inline">Copy API</span>
                    <span class="sm:hidden">API</span>
                  </button>
                  <button
                    id="export-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white text-xs sm:text-sm rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  >
                    ${DOWNLOAD_ICON.replace('w-5 h-5', 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                    <span class="hidden sm:inline">Export CSV</span>
                    <span class="sm:hidden">Export</span>
                  </button>
                  <button
                    id="refresh-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    ${REFRESH_ICON.replace('w-5 h-5', 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                    <span class="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    id="apply-all-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    title="Apply latest audit entry for each service tag"
                  >
                    ${CHECK_CIRCLE_ICON.replace('w-5 h-5', 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                    <span class="hidden sm:inline">Apply All Latest</span>
                    <span class="sm:hidden">Apply All</span>
                  </button>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3" id="review-controls">
                <label class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Inventory Period:</label>
                <select
                  id="period-selector"
                  class="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Periods</option>
                  ${allPeriods.map(p => `<option value="${p.id}" ${defaultPeriod && defaultPeriod.id === p.id ? 'selected' : ''}>${escapeHtml(p.inventory_nr)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Loading State -->
      <div id="loading-state" class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 sm:p-12 text-center border border-gray-200 dark:border-gray-700">
        <div class="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-emerald-500">
          ${REFRESH_ICON.replace('w-5 h-5', 'w-10 h-10 sm:w-12 sm:h-12 animate-spin')}
        </div>
        <p class="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading audit records...</p>
      </div>

      <!-- Error State -->
      <div id="error-state" class="hidden bg-red-900/30 border border-red-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="flex items-start gap-2 sm:gap-3">
          ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5').replace('text-current', 'text-red-400')}
          <div class="flex-1 min-w-0">
            <h3 class="text-sm sm:text-base text-red-400 font-medium">Error loading data</h3>
            <p id="error-message" class="text-xs sm:text-sm text-red-300 mt-1 break-words"></p>
          </div>
        </div>
      </div>

      <!-- Cards Container -->
      <div id="table-container" class="hidden">
        <div id="audit-table-body" class="grid gap-4">
          <!-- Cards will be populated here -->
        </div>
        <div id="table-footer" class="mt-4 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span id="record-count">0</span> unique service tags
          </div>
          <div class="text-[10px] sm:text-xs text-gray-500">
            Last updated: <span id="last-update">Never</span>
          </div>
        </div>
      </div>
          ` : `
            <!-- No Permission Message -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
                ${LOCK_ICON.replace('w-5 h-5', 'w-12 h-12')}
              </div>
              <h3 class="text-gray-900 dark:text-white font-medium mb-1">Permission Required</h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm">You do not have permission to review audit records.</p>
            </div>
          `}
        </div>

        <!-- Periods Tab Panel -->
        <div class="tab-panel hidden">
          ${hasAuditApprover ? `
            <!-- Add New Period Form -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
              <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="text-emerald-500 dark:text-emerald-400">
                    ${CLIPBOARD_CHECK_ICON}
                  </div>
                  <h2 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Inventory Period</h2>
                </div>
              </div>
              <div class="px-3 sm:px-6 py-4">
                <form method="POST" action="/inventory-periods" class="space-y-4" id="createPeriodForm">
                  <input type="hidden" name="action" value="add">
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label for="start_date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="text"
                        id="start_date"
                        name="start_date"
                        required
                        placeholder="dd.mm.yyyy"
                        pattern="(\\d{2}[.,-]\\d{2}[.,-]\\d{4}|\\d{6}|\\d{8})"
                        class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onchange="updatePeriodPreview()"
                      />
                    </div>

                    <div>
                      <label for="end_date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Date *
                      </label>
                      <input
                        type="text"
                        id="end_date"
                        name="end_date"
                        required
                        placeholder="dd.mm.yyyy"
                        pattern="(\\d{2}[.,-]\\d{2}[.,-]\\d{4}|\\d{6}|\\d{8})"
                        class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label for="comment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Comment
                      </label>
                      <input
                        type="text"
                        id="comment"
                        name="comment"
                        placeholder="Optional description"
                        class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <!-- Period Name Preview -->
                  <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Period name will be generated as: </span>
                    <span id="periodNamePreview" class="font-medium text-gray-900 dark:text-white">INV-YYYY-QX-1</span>
                    <span class="text-xs text-gray-500 ml-2">(auto-generated based on start date)</span>
                  </div>
                  
                  <div class="flex justify-end">
                    <button
                      type="submit"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    >
                      ${PLUS_ICON}
                      Create Period
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            <!-- Periods List -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Existing Periods</h2>
              </div>

              ${allPeriodsForTab.length === 0 ? `
                <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No inventory periods found. Create one above to get started.</p>
                </div>
              ` : `
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Period</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Start Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">End Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Comment</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      ${allPeriodsForTab.map(period => {
                        const startDateStr = formatDate(period.start_date);
                        const endDateStr = formatDate(period.end_date);
                        // Use ISO format for date comparisons (lexicographic)
                        const startISO = period.start_date instanceof Date ? period.start_date.toISOString().split('T')[0] : String(period.start_date || '').substring(0, 10);
                        const endISO = period.end_date instanceof Date ? period.end_date.toISOString().split('T')[0] : String(period.end_date || '').substring(0, 10);
                        const isActive = endISO >= todayISO && startISO <= todayISO;
                        const isPast = endISO < todayISO;
                        const isFuture = startISO > todayISO;
                        
                        let statusBadge = '';
                        if (isActive) {
                          statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>';
                        } else if (isPast) {
                          statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Completed</span>';
                        } else if (isFuture) {
                          statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Upcoming</span>';
                        }
                        
                        if (period.confirmed_by) {
                          statusBadge += ' <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Confirmed</span>';
                        }
                        
                        return `
                          <tr class="${isActive ? 'bg-green-50 dark:bg-green-900/20' : ''}">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              ${escapeHtml(period.inventory_nr)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              ${escapeHtml(startDateStr)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              ${escapeHtml(endDateStr)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                              ${statusBadge}
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                              ${period.comment ? escapeHtml(period.comment) : '-'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                              ${!period.confirmed_by ? `
                                <form method="POST" action="/inventory-periods" class="inline">
                                  <input type="hidden" name="action" value="delete">
                                  <input type="hidden" name="id" value="${period.id}">
                                  <button
                                    type="submit"
                                    class="text-red-400 hover:text-red-300"
                                    onclick="return confirm('Are you sure you want to delete this period?')"
                                  >
                                    ${TRASH_ICON}
                                  </button>
                                </form>
                              ` : `
                                <span class="text-gray-500" title="Cannot delete confirmed periods">
                                  ${CHECK_CIRCLE_ICON}
                                </span>
                              `}
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          ` : `
            <!-- No Permission Message -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
                ${LOCK_ICON.replace('w-5 h-5', 'w-12 h-12')}
              </div>
              <h3 class="text-gray-900 dark:text-white font-medium mb-1">Permission Required</h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm">You do not have permission to manage inventory periods.</p>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- Quick Edit Modal -->
    <div id="quickEditModal" class="fixed inset-0 bg-black/50 dark:bg-black/70 hidden items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Edit Equipment</h3>
          <button id="closeQuickEditModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
          </button>
        </div>

        <form id="quickEditForm" class="space-y-4">
          <input type="hidden" name="equipment_id" id="qe_equipment_id">
          <input type="hidden" name="inventory_period_id" value="${defaultPeriod?.id || ''}">

          <!-- User (Employee) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User (Employee)</label>
            <select
              name="assigned_to"
              id="qe_assigned_to"
              class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Not assigned</option>
              ${employees.map(e => `<option value="${escapeHtml(e.employee_no)}">${escapeHtml(e.name)} - ${escapeHtml(e.employee_no)}</option>`).join('')}
            </select>
          </div>

          <!-- Location Section -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Location</label>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <select id="qe_country_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select...</option>
                  ${locationData?.countries.map(c => `<option value="${c.id}" data-parent="${c.parent_id}">${escapeHtml(c.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Region</label>
                <select id="qe_plant_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select country first...</option>
                  ${locationData?.plants.map(p => `<option value="${p.id}" data-parent="${p.parent_id}">${escapeHtml(p.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Department</label>
                <select id="qe_department_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select region first...</option>
                  ${locationData?.departments.map(d => `<option value="${d.id}" data-parent="${d.parent_id}">${escapeHtml(d.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Area</label>
                <select id="qe_area_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select department first...</option>
                  ${locationData?.areas.map(a => `<option value="${a.id}" data-parent="${a.parent_id}">${escapeHtml(a.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sub-Area</label>
                <select id="qe_sub_area_id" name="equipment_sub_area_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select area first...</option>
                  ${locationData?.subAreas.map(s => `<option value="${s.id}" data-parent="${s.parent_id}">${escapeHtml(s.name)}</option>`).join('') || ''}
                </select>
              </div>
            </div>
            <!-- Hidden field for region (auto-derived from country) -->
            <input type="hidden" id="qe_region_id" />
          </div>

          <!-- TeamViewer -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teamviewer</label>
            <input
              type="text"
              name="teamviewer"
              id="qe_teamviewer"
              placeholder="Teamviewer ID"
              class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div id="quickEditError" class="hidden text-red-400 text-sm"></div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" id="cancelQuickEdit" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" id="saveQuickEdit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      (function() {
        // Tab switching functionality
        const tabs = Array.from(document.querySelectorAll('.tab-btn'));
        const panels = Array.from(document.querySelectorAll('.tab-panel'));
        let activeTab = 0;

        function setActiveTab(idx) {
          if (idx < 0 || idx >= tabs.length) return;
          if (idx >= panels.length) {
            console.error('Tab index', idx, 'exceeds panel count', panels.length);
            return;
          }
          // Don't switch to disabled tabs
          if (tabs[idx] && tabs[idx].disabled) return;

          activeTab = idx;
          tabs.forEach((t, i) => t.classList.toggle('tab-active', i === activeTab && !t.disabled));
          panels.forEach((p, i) => {
            if (i === activeTab) {
              p.classList.remove('hidden');
            } else {
              p.classList.add('hidden');
            }
          });

        }

        tabs.forEach((tab, i) => {
          tab.addEventListener('click', () => {
            if (!tab.disabled) setActiveTab(i);
          });
        });

        // Switch to tab based on URL hash
        if (window.location.hash === '#periods' && tabs.length > 2) {
          setActiveTab(2);
        } else if (window.location.hash === '#review') {
          setActiveTab(1);
        }

        // Period preview function
        function updatePeriodPreview() {
          const startDate = document.getElementById('start_date');
          const preview = document.getElementById('periodNamePreview');
          
          if (startDate && preview && startDate.value) {
            const date = new Date(startDate.value);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const quarter = Math.ceil(month / 3);
            preview.textContent = 'INV-' + year + '-Q' + quarter + '-1';
          } else if (preview) {
            preview.textContent = 'INV-YYYY-QX-1';
          }
        }
        
        window.updatePeriodPreview = updatePeriodPreview;
        
        // Handle period form submission
        const createPeriodForm = document.getElementById('createPeriodForm');
        if (createPeriodForm) {
          createPeriodForm.addEventListener('submit', function(e) {
            // Form will submit normally, but we ensure we're on the periods tab
            // The redirect will handle showing the success message
          });
        }
      })();

      // Audit Tab functionality
      (function() {
        const searchForm = document.getElementById('audit-search-form');
        const searchInput = document.getElementById('audit-search-input');
        const auditResult = document.getElementById('audit-result');
        const auditEmpty = document.getElementById('audit-empty');
        const auditNotFound = document.getElementById('audit-not-found');
        const auditNotFoundText = document.getElementById('audit-not-found-text');
        const auditAddEquipmentBtn = document.getElementById('audit-add-equipment-btn');
        const auditLoading = document.getElementById('audit-loading');
        const defaultPeriodId = ${defaultPeriod && defaultPeriod.id ? defaultPeriod.id : 'null'};

        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        function formatDate(dateStr) {
          if (!dateStr) return 'Never';
          return formatEstonianDate(dateStr) || 'Never';
        }

        function formatDeviceAge(purchaseDate) {
          if (!purchaseDate) return '-';
          const purchase = new Date(purchaseDate);
          const now = new Date();
          const diffTime = now.getTime() - purchase.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffYears = diffDays / 365.25;
          if (diffYears >= 1) {
            return diffYears.toFixed(1) + ' years';
          } else if (diffDays >= 30) {
            const months = diffDays / 30.44;
            return months.toFixed(1) + ' months';
          }
          return diffDays + ' day' + (diffDays !== 1 ? 's' : '');
        }

        function showState(state) {
          if (auditResult) auditResult.classList.add('hidden');
          if (auditEmpty) auditEmpty.classList.add('hidden');
          if (auditNotFound) auditNotFound.classList.add('hidden');
          if (auditLoading) auditLoading.classList.add('hidden');

          if (state === 'result' && auditResult) auditResult.classList.remove('hidden');
          else if (state === 'empty' && auditEmpty) auditEmpty.classList.remove('hidden');
          else if (state === 'not-found' && auditNotFound) auditNotFound.classList.remove('hidden');
          else if (state === 'loading' && auditLoading) auditLoading.classList.remove('hidden');
        }

        function formatDateTime(dateStr) {
          if (!dateStr) return '-';
          return formatEstonianDateTime(dateStr) || '-';
        }

        async function toggleHistory(equipmentId) {
          const historySection = document.getElementById('equipment-history-' + equipmentId);
          if (!historySection) return;

          // Toggle visibility
          if (!historySection.classList.contains('hidden')) {
            historySection.classList.add('hidden');
            return;
          }

          historySection.classList.remove('hidden');

          const loadingEl = historySection.querySelector('.history-loading');
          const entriesEl = historySection.querySelector('.history-entries');
          const emptyEl = historySection.querySelector('.history-empty');
          const countEl = historySection.querySelector('.history-count');

          // Show loading
          if (loadingEl) loadingEl.classList.remove('hidden');
          if (entriesEl) entriesEl.classList.add('hidden');
          if (emptyEl) emptyEl.classList.add('hidden');

          try {
            const response = await fetch('/api/equipment/history?equipment_id=' + equipmentId);
            const result = await response.json();

            if (loadingEl) loadingEl.classList.add('hidden');

            if (result.success && result.data && result.data.length > 0) {
              if (countEl) countEl.textContent = result.data.length + ' entries';
              if (entriesEl) {
                entriesEl.innerHTML = result.data.map(function(log) {
                  return '<div class="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">' +
                    '<div class="flex items-start justify-between gap-4">' +
                      '<div class="flex-1 min-w-0">' +
                        '<div class="flex items-center gap-2 text-sm">' +
                          '<span class="text-gray-900 dark:text-white font-medium">' + formatDateTime(log.created) + '</span>' +
                          (log.inventory_nr ? '<span class="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">' + escapeHtml(log.inventory_nr) + '</span>' : '') +
                          (log.write_off_reason ? '<span class="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">Written Off: ' + escapeHtml(log.write_off_reason) + '</span>' : '') +
                        '</div>' +
                        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm">' +
                          '<div class="flex items-center gap-1.5">' +
                            '${USER_ICON.replace('w-5 h-5', 'w-3.5 h-3.5').replace('text-current', 'text-gray-400')}' +
                            '<span class="text-gray-600 dark:text-gray-400">' + (log.assigned_to_name ? escapeHtml(log.assigned_to + ' - ' + log.assigned_to_name) : (log.assigned_to ? escapeHtml(log.assigned_to) : 'Not assigned')) + '</span>' +
                          '</div>' +
                          '<div class="flex items-center gap-1.5">' +
                            '${LOCATION_ICON.replace('w-5 h-5', 'w-3.5 h-3.5').replace('text-current', 'text-gray-400')}' +
                            '<span class="text-gray-600 dark:text-gray-400 truncate">' + escapeHtml(log.location || 'No location') + '</span>' +
                          '</div>' +
                        '</div>' +
                        (log.comment ? '<div class="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">' + escapeHtml(log.comment) + '</div>' : '') +
                      '</div>' +
                      (log.updated_by_name ? '<div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">by ' + escapeHtml(log.updated_by_name) + '</div>' : '') +
                    '</div>' +
                  '</div>';
                }).join('');
                entriesEl.classList.remove('hidden');
              }
            } else {
              if (emptyEl) emptyEl.classList.remove('hidden');
              if (countEl) countEl.textContent = '0 entries';
            }
          } catch (err) {
            console.error('Failed to load history:', err);
            if (loadingEl) loadingEl.classList.add('hidden');
            if (emptyEl) {
              emptyEl.textContent = 'Failed to load history';
              emptyEl.classList.remove('hidden');
            }
          }
        }

        function renderEquipment(equipment) {
          const locationStr = [
            equipment.plant_name,
            equipment.department_name,
            equipment.area_name,
            equipment.sub_area_name
          ].filter(Boolean).join(' - ') || 'Not assigned';

          const typeStr = [
            equipment.vendor_name,
            equipment.type_name,
            equipment.product_line_name,
            equipment.model_name
          ].filter(Boolean).join(' - ') || '-';

          return \`
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <!-- Equipment Info -->
              <div class="bg-emerald-50 dark:bg-emerald-900/40 px-6 py-4">
                <div class="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div class="flex items-start gap-3">
                    ${LOCATION_ICON.replace('w-5 h-5', 'w-5 h-5 mt-0.5 flex-shrink-0').replace('text-current', 'text-emerald-600 dark:text-emerald-400')}
                    <div>
                      <div class="text-xs text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wide">Location</div>
                      <div class="text-gray-900 dark:text-white font-medium">\${escapeHtml(locationStr)}</div>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    ${USER_ICON.replace('w-5 h-5', 'w-5 h-5 mt-0.5 flex-shrink-0').replace('text-current', 'text-emerald-600 dark:text-emerald-400')}
                    <div>
                      <div class="text-xs text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wide">User</div>
                      <div class="text-gray-900 dark:text-white font-medium">\${equipment.assigned_to_name ? escapeHtml(equipment.assigned_to + ' - ' + equipment.assigned_to_name) : 'Not assigned'}</div>
                    </div>
                  </div>
                  <div class="flex items-start gap-3 col-span-2 sm:col-span-1">
                    ${CALENDAR_ICON.replace('w-5 h-5', 'w-5 h-5 mt-0.5 flex-shrink-0').replace('text-current', 'text-emerald-600 dark:text-emerald-400')}
                    <div class="flex-1">
                      <div class="text-xs text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wide">Latest Audit</div>
                      <div class="text-gray-900 dark:text-white font-medium">\${formatDate(equipment.latest_audit_date)}</div>
                    </div>
                    <button type="button" class="update-audit-btn flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" data-equipment-id="\${equipment.id}">
                      ${REFRESH_ICON.replace('w-5 h-5', 'w-4 h-4')}
                      Update
                    </button>
                  </div>
                </div>
              </div>
              <!-- Details -->
              <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4">Equipment Details</h3>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-6">
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                    <div class="text-gray-900 dark:text-white text-sm">\${escapeHtml(typeStr)}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Teamviewer</div>
                    <div class="text-gray-900 dark:text-white text-sm font-mono">\${equipment.teamviewer || '0'}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                    <div class="text-gray-900 dark:text-white text-sm">\${equipment.is_written_off ? 'Written Off' : equipment.repair_status ? equipment.repair_status.replace(/_/g, ' ') : 'In Use'}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Device Age</div>
                    <div class="text-gray-900 dark:text-white text-sm">\${formatDeviceAge(equipment.purchase_date)}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Service Tag</div>
                    <div class="text-gray-900 dark:text-white text-sm font-mono">\${escapeHtml(equipment.service_tag)}</div>
                  </div>
                </div>
              </div>
              <!-- Actions - Icon buttons in single row -->
              <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <button type="button" class="quick-edit-btn p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" title="Quick Edit"
                  data-equipment-id="\${equipment.id}"
                  data-service-tag="\${escapeHtml(equipment.service_tag)}"
                  data-assigned-to="\${escapeHtml(equipment.assigned_to || '')}"
                  data-teamviewer="\${equipment.teamviewer || ''}"
                  data-region-id="\${equipment.region_id || ''}"
                  data-country-id="\${equipment.country_id || ''}"
                  data-plant-id="\${equipment.plant_id || ''}"
                  data-department-id="\${equipment.department_id || ''}"
                  data-area-id="\${equipment.area_id || ''}"
                  data-equipment-sub-area-id="\${equipment.equipment_sub_area_id || ''}"
                >
                  ${EDIT_ICON}
                </button>
                <a href="/edit/\${equipment.id}" class="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Full Edit">
                  ${EXTERNAL_LINK_ICON}
                </a>
                <button type="button" class="history-toggle-btn p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors" title="View History" data-equipment-id="\${equipment.id}">
                  ${CLOCK_ICON}
                </button>
              </div>
              <!-- History Log Section (hidden by default) -->
              <div id="equipment-history-\${equipment.id}" class="hidden border-t border-gray-200 dark:border-gray-700">
                <div class="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                    ${CLOCK_ICON.replace('w-5 h-5', 'w-4 h-4')}
                    Device History
                  </h3>
                  <span class="history-count text-xs text-gray-500 dark:text-gray-400"></span>
                </div>
                <div class="history-content max-h-64 overflow-y-auto">
                  <div class="history-loading px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    ${REFRESH_ICON.replace('w-5 h-5', 'w-6 h-6 animate-spin mx-auto mb-2')}
                    Loading history...
                  </div>
                  <div class="history-entries hidden divide-y divide-gray-100 dark:divide-gray-700"></div>
                  <div class="history-empty hidden px-6 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">No history records found</div>
                </div>
              </div>
            </div>
          \`;
        }

        async function searchEquipment(query) {
          if (!query || !defaultPeriodId) return;

          showState('loading');

          try {
            const response = await fetch('/api/inventory-audit/search?q=' + encodeURIComponent(query) + '&period_id=' + defaultPeriodId);
            const result = await response.json();

            if (result.success && result.data) {
              if (auditResult) {
                auditResult.innerHTML = renderEquipment(result.data);
                // Add event listener for update button
                const updateBtn = auditResult.querySelector('.update-audit-btn');
                if (updateBtn) {
                  updateBtn.addEventListener('click', async function() {
                    const equipmentId = this.dataset.equipmentId;
                    this.disabled = true;
                    this.textContent = 'Updating...';
                    try {
                      const updateResponse = await fetch('/inventory-audit/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'equipment_id=' + equipmentId + '&inventory_period_id=' + defaultPeriodId
                      });
                      if (updateResponse.ok) {
                        // Re-search to show updated date
                        searchEquipment(query);
                      }
                    } catch (err) {
                      console.error('Update failed:', err);
                    }
                    this.disabled = false;
                    this.innerHTML = '${REFRESH_ICON.replace('w-5 h-5', 'w-4 h-4')} Update';
                  });
                }

                // Add event listener for quick edit button
                const quickEditBtn = auditResult.querySelector('.quick-edit-btn');
                if (quickEditBtn) {
                  quickEditBtn.addEventListener('click', function() {
                    openQuickEditModal(this.dataset);
                  });
                }

                // Add event listener for history toggle button
                const historyToggleBtn = auditResult.querySelector('.history-toggle-btn');
                if (historyToggleBtn) {
                  historyToggleBtn.addEventListener('click', function() {
                    const equipmentId = this.dataset.equipmentId;
                    toggleHistory(equipmentId);
                  });
                }
              }
              showState('result');
            } else {
              if (auditNotFoundText) {
                auditNotFoundText.textContent = 'Serial number "' + query + '" not found in system.';
              }
              if (auditAddEquipmentBtn) {
                auditAddEquipmentBtn.href = '/add?serial=' + encodeURIComponent(query);
              }
              showState('not-found');
            }
          } catch (err) {
            console.error('Search failed:', err);
            if (auditNotFoundText) {
              auditNotFoundText.textContent = 'Search failed. Please try again.';
            }
            showState('not-found');
          }
        }

        if (searchForm) {
          searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput?.value?.trim();
            if (query) {
              searchEquipment(query);
            }
          });
        }

        // Focus search input when Audit tab is shown
        document.querySelector('[data-tab="0"]')?.addEventListener('click', function() {
          setTimeout(() => searchInput?.focus(), 100);
        });

        // Quick Edit Modal functionality
        const quickEditModal = document.getElementById('quickEditModal');
        const quickEditForm = document.getElementById('quickEditForm');
        const quickEditError = document.getElementById('quickEditError');
        const saveQuickEditBtn = document.getElementById('saveQuickEdit');
        let currentSearchQuery = '';

        // Cascading location select elements
        const qeCountry = document.getElementById('qe_country_id');
        const qePlant = document.getElementById('qe_plant_id');
        const qeDepartment = document.getElementById('qe_department_id');
        const qeArea = document.getElementById('qe_area_id');
        const qeSubArea = document.getElementById('qe_sub_area_id');

        // Filter options based on parent selection
        function filterOptions(selectEl, parentId) {
          if (!selectEl) return;
          const options = selectEl.querySelectorAll('option');
          options.forEach(opt => {
            if (opt.value === '') return; // Keep the placeholder
            const optParent = opt.getAttribute('data-parent');
            if (parentId && optParent === String(parentId)) {
              opt.style.display = '';
            } else if (!parentId) {
              opt.style.display = 'none'; // Hide all until parent selected
            } else {
              opt.style.display = 'none';
            }
          });
        }

        // Show all options (for initial select like Country)
        function showAllOptions(selectEl) {
          if (!selectEl) return;
          const options = selectEl.querySelectorAll('option');
          options.forEach(opt => {
            opt.style.display = '';
          });
        }

        // Cascading handlers
        qeCountry?.addEventListener('change', function() {
          const countryId = this.value;
          filterOptions(qePlant, countryId);
          if (qePlant) qePlant.value = '';
          if (qeDepartment) qeDepartment.value = '';
          if (qeArea) qeArea.value = '';
          if (qeSubArea) qeSubArea.value = '';
          filterOptions(qeDepartment, null);
          filterOptions(qeArea, null);
          filterOptions(qeSubArea, null);
        });

        qePlant?.addEventListener('change', function() {
          const plantId = this.value;
          filterOptions(qeDepartment, plantId);
          if (qeDepartment) qeDepartment.value = '';
          if (qeArea) qeArea.value = '';
          if (qeSubArea) qeSubArea.value = '';
          filterOptions(qeArea, null);
          filterOptions(qeSubArea, null);
        });

        qeDepartment?.addEventListener('change', function() {
          const deptId = this.value;
          filterOptions(qeArea, deptId);
          if (qeArea) qeArea.value = '';
          if (qeSubArea) qeSubArea.value = '';
          filterOptions(qeSubArea, null);
        });

        qeArea?.addEventListener('change', function() {
          const areaId = this.value;
          filterOptions(qeSubArea, areaId);
          if (qeSubArea) qeSubArea.value = '';
        });

        function openQuickEditModal(data) {
          if (!quickEditModal) return;

          // Store current search query for re-searching after save
          currentSearchQuery = searchInput?.value?.trim() || '';

          // Populate form fields
          document.getElementById('qe_equipment_id').value = data.equipmentId || '';
          document.getElementById('qe_assigned_to').value = data.assignedTo || '';
          document.getElementById('qe_teamviewer').value = data.teamviewer || '';

          // Set location selects with cascading filtering
          // Country (show all)
          showAllOptions(qeCountry);
          if (qeCountry) qeCountry.value = data.countryId || '';

          // Plant (filter by country)
          filterOptions(qePlant, data.countryId);
          if (qePlant) qePlant.value = data.plantId || '';

          // Department (filter by plant)
          filterOptions(qeDepartment, data.plantId);
          if (qeDepartment) qeDepartment.value = data.departmentId || '';

          // Area (filter by department)
          filterOptions(qeArea, data.departmentId);
          if (qeArea) qeArea.value = data.areaId || '';

          // Sub-Area (filter by area)
          filterOptions(qeSubArea, data.areaId);
          if (qeSubArea) qeSubArea.value = data.equipmentSubAreaId || '';

          // Clear any previous errors
          if (quickEditError) quickEditError.classList.add('hidden');

          // Show modal
          quickEditModal.classList.remove('hidden');
          quickEditModal.classList.add('flex');
        }

        function closeQuickEditModal() {
          if (!quickEditModal) return;
          quickEditModal.classList.add('hidden');
          quickEditModal.classList.remove('flex');
        }

        // Close modal handlers
        document.getElementById('closeQuickEditModal')?.addEventListener('click', closeQuickEditModal);
        document.getElementById('cancelQuickEdit')?.addEventListener('click', closeQuickEditModal);
        quickEditModal?.addEventListener('click', function(e) {
          if (e.target === this) closeQuickEditModal();
        });

        // Form submission
        quickEditForm?.addEventListener('submit', async function(e) {
          e.preventDefault();

          if (saveQuickEditBtn) {
            saveQuickEditBtn.disabled = true;
            saveQuickEditBtn.textContent = 'Saving...';
          }
          if (quickEditError) quickEditError.classList.add('hidden');

          const formData = new FormData(quickEditForm);

          try {
            const response = await fetch('/inventory-audit/quick-edit', {
              method: 'POST',
              body: formData
            });

            if (response.redirected || response.ok) {
              closeQuickEditModal();
              // Re-search to show updated data
              if (currentSearchQuery) {
                searchEquipment(currentSearchQuery);
              }
            } else {
              const text = await response.text();
              if (quickEditError) {
                quickEditError.textContent = 'Failed to save changes';
                quickEditError.classList.remove('hidden');
              }
            }
          } catch (err) {
            console.error('Quick edit failed:', err);
            if (quickEditError) {
              quickEditError.textContent = 'Failed to save changes';
              quickEditError.classList.remove('hidden');
            }
          } finally {
            if (saveQuickEditBtn) {
              saveQuickEditBtn.disabled = false;
              saveQuickEditBtn.textContent = 'Save';
            }
          }
        });
      })();

      (function() {
        let autoRefreshInterval = null;
        const defaultPeriodId = ${defaultPeriod && defaultPeriod.id ? defaultPeriod.id : 'null'};
        
        const loadingState = document.getElementById('loading-state');
        const errorState = document.getElementById('error-state');
        const errorMessage = document.getElementById('error-message');
        const tableContainer = document.getElementById('table-container');
        const tableBody = document.getElementById('audit-table-body');
        const recordCount = document.getElementById('record-count');
        const lastUpdate = document.getElementById('last-update');
        const exportBtn = document.getElementById('export-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const copyApiBtn = document.getElementById('copy-api-btn');
        const applyAllBtn = document.getElementById('apply-all-btn');
        const periodSelector = document.getElementById('period-selector');
        
        function getSelectedPeriodId() {
          if (!periodSelector) return null;
          const value = periodSelector.value;
          return value === '' ? null : parseInt(value);
        }
        
        function getApiUrl() {
          const periodId = getSelectedPeriodId();
          const baseUrl = window.location.origin + '/api/inventory-audit/review';
          return periodId ? baseUrl + '?period_id=' + periodId : baseUrl;
        }
        
        function formatDate(dateStr) {
          if (!dateStr) return '';
          return formatEstonianDateTime(dateStr);
        }
        
        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
        
        async function applyAuditEntry(serviceTag, button) {
          if (!confirm('Apply this audit entry to the main equipment table? This will update the equipment record and create a new log entry.')) {
            return;
          }
          
          const originalText = button.textContent;
          button.disabled = true;
          button.textContent = 'Applying...';
          
          try {
            const response = await fetch('/api/inventory-audit/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ service_tag: serviceTag })
            });
            
            const result = await response.json();
            
            if (result.success) {
              alert('Audit entry applied successfully!');
              loadAuditData();
            } else {
              alert('Failed to apply: ' + (result.error || 'Unknown error'));
            }
          } catch (err) {
            alert('Failed to apply: ' + (err instanceof Error ? err.message : 'Unknown error'));
          } finally {
            button.disabled = false;
            button.textContent = originalText;
          }
        }
        
        async function applyAllLatest() {
          const periodId = getSelectedPeriodId();
          const periodText = periodSelector && periodSelector.options[periodSelector.selectedIndex] 
            ? periodSelector.options[periodSelector.selectedIndex].text 
            : 'all periods';
          
          if (!confirm('Apply the latest audit entry for each unique service tag to the main equipment table?\\n\\nThis will update equipment records and create new log entries for all service tags in ' + periodText + '.\\n\\nThis action cannot be undone.')) {
            return;
          }
          
          if (!applyAllBtn) return;
          
          const originalText = applyAllBtn.textContent;
          applyAllBtn.disabled = true;
          applyAllBtn.textContent = 'Applying...';
          
          try {
            const response = await fetch('/api/inventory-audit/apply-all', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ period_id: periodId })
            });
            
            const result = await response.json();
            
            if (result.success) {
              let message = 'Applied ' + result.applied + ' audit entries';
              if (result.errors > 0) {
                message += '\\n\\n' + result.errors + ' errors occurred:';
                if (result.errorDetails && result.errorDetails.length > 0) {
                  message += '\\n' + result.errorDetails.slice(0, 10).join('\\n');
                  if (result.errorDetails.length > 10) {
                    message += '\\n... and ' + (result.errorDetails.length - 10) + ' more';
                  }
                }
              }
              alert(message);
              loadAuditData();
            } else {
              alert('Failed to apply: ' + (result.error || 'Unknown error'));
            }
          } catch (err) {
            alert('Failed to apply: ' + (err instanceof Error ? err.message : 'Unknown error'));
          } finally {
            applyAllBtn.disabled = false;
            applyAllBtn.textContent = originalText;
          }
        }
        
        function diffRow(label, auditVal, equipVal, changed) {
          var empty = '<span class="text-gray-400 dark:text-gray-500 italic">—</span>';
          var highlightBg = changed ? ' bg-amber-50/80 dark:bg-amber-900/20' : '';
          var indicatorDot = changed
            ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5"></span>'
            : '<span class="w-1.5 h-1.5 rounded-full bg-transparent flex-shrink-0 mt-1.5"></span>';
          return '<tr class="' + highlightBg + '">' +
            '<td class="py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 w-[110px] whitespace-nowrap align-top">' +
              '<div class="flex items-start gap-1.5">' + indicatorDot + label + '</div>' +
            '</td>' +
            '<td class="py-2 px-3 text-sm text-gray-900 dark:text-white break-words align-top">' +
              (auditVal ? escapeHtml(auditVal) : empty) +
            '</td>' +
            '<td class="py-2 px-3 text-sm text-gray-900 dark:text-white break-words align-top">' +
              (equipVal ? escapeHtml(equipVal) : empty) +
            '</td>' +
          '</tr>';
        }

        async function loadAuditData() {
          try {
            if (loadingState) loadingState.classList.remove('hidden');
            if (errorState) errorState.classList.add('hidden');
            if (tableContainer) tableContainer.classList.add('hidden');
            
            const periodId = getSelectedPeriodId();
            const url = periodId 
              ? '/api/inventory-audit/review-compare?period_id=' + periodId
              : '/api/inventory-audit/review-compare';
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to load data');
            }
            
            const records = result.data || [];
            
            if (tableBody) {
              tableBody.innerHTML = records.map(function(record) {
                var d = record.diffs || {};
                var a = record.audit || {};
                var eq = record.equipment || {};

                var changedCount = Object.values(d).filter(Boolean).length;

                var statusBadge = record.hasChanges
                  ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">' +
                      '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>' +
                      changedCount + ' change' + (changedCount > 1 ? 's' : '') +
                    '</span>'
                  : '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">' +
                      '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
                      'Match' +
                    '</span>';

                var borderColor = record.hasChanges
                  ? 'border-amber-300 dark:border-amber-700'
                  : 'border-gray-200 dark:border-gray-700';

                return '<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border ' + borderColor + ' overflow-hidden transition-shadow hover:shadow-md">' +
                  /* ---- Card Header ---- */
                  '<div class="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/80">' +
                    '<div class="flex items-center gap-3">' +
                      '<a href="/inventory-audit?search=' + encodeURIComponent(record.service_tag) + '" class="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-mono tracking-wide">' +
                        escapeHtml(record.service_tag || '') +
                      '</a>' +
                      statusBadge +
                    '</div>' +
                    '<div class="flex items-center gap-3">' +
                      '<div class="text-right">' +
                        '<div class="text-xs text-gray-600 dark:text-gray-300">' + escapeHtml(record.equipment_type || '') + '</div>' +
                        '<div class="text-[10px] text-gray-400 dark:text-gray-500">' + escapeHtml(record.updated_by || '') + ' &bull; ' + formatDate(record.updated) + '</div>' +
                      '</div>' +
                      '<button data-service-tag="' + escapeHtml(record.service_tag) + '" class="apply-btn px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors shadow-sm">' +
                        'Apply' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                  /* ---- Comparison Grid ---- */
                  '<div class="overflow-x-auto">' +
                    '<table class="w-full text-left">' +
                      '<thead>' +
                        '<tr class="border-b border-gray-100 dark:border-gray-700/60">' +
                          '<th class="py-1.5 px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[110px]"></th>' +
                          '<th class="py-1.5 px-3 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Audit Entry</th>' +
                          '<th class="py-1.5 px-3 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Current Equipment</th>' +
                        '</tr>' +
                      '</thead>' +
                      '<tbody class="divide-y divide-gray-50 dark:divide-gray-700/40">' +
                        diffRow('Assigned To', a.assigned_to, eq.assigned_to, d.assigned_to) +
                        diffRow('Location', a.location, eq.location, d.location) +
                        diffRow('TeamViewer', a.teamviewer, eq.teamviewer, d.teamviewer) +
                        diffRow('Comment', a.comment, eq.comment, d.comment) +
                        diffRow('Written Off', a.is_written_off, eq.is_written_off, d.is_written_off) +
                      '</tbody>' +
                    '</table>' +
                  '</div>' +
                '</div>';
              }).join('');
              
              // Add event listeners to apply buttons
              tableBody.querySelectorAll('.apply-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  const serviceTag = this.getAttribute('data-service-tag');
                  if (serviceTag) {
                    applyAuditEntry(serviceTag, this);
                  }
                });
              });
            }
            
            if (recordCount) {
              recordCount.textContent = records.length.toString();
            }
            
            if (lastUpdate) {
              lastUpdate.textContent = new Date().toLocaleTimeString();
            }
            
            if (loadingState) loadingState.classList.add('hidden');
            if (tableContainer) tableContainer.classList.remove('hidden');
            
          } catch (err) {
            console.error('Failed to load audit data:', err);
            if (loadingState) loadingState.classList.add('hidden');
            if (errorState) errorState.classList.remove('hidden');
            if (errorMessage) {
              errorMessage.textContent = err instanceof Error ? err.message : 'Unknown error occurred';
            }
          }
        }
        
        function startAutoRefresh() {
          if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
          }
          autoRefreshInterval = window.setInterval(loadAuditData, 30000);
        }
        
        function stopAutoRefresh() {
          if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
          }
        }
        
        if (copyApiBtn) {
          copyApiBtn.addEventListener('click', function() {
            const apiUrl = getApiUrl();
            navigator.clipboard.writeText(apiUrl).then(function() {
              const originalText = copyApiBtn.textContent;
              copyApiBtn.textContent = 'Copied!';
              copyApiBtn.classList.remove('bg-gray-700');
              copyApiBtn.classList.add('bg-green-600');
              setTimeout(function() {
                copyApiBtn.textContent = originalText;
                copyApiBtn.classList.remove('bg-green-600');
                copyApiBtn.classList.add('bg-gray-700');
              }, 2000);
            }).catch(function(err) {
              alert('Failed to copy: ' + (err instanceof Error ? err.message : 'Unknown error'));
            });
          });
        }
        
        if (exportBtn) {
          exportBtn.addEventListener('click', function() {
            const periodId = getSelectedPeriodId();
            const url = periodId 
              ? '/inventory-audit/review/export?period_id=' + periodId
              : '/inventory-audit/review/export';
            window.location.href = url;
          });
        }
        
        if (refreshBtn) {
          refreshBtn.addEventListener('click', loadAuditData);
        }
        
        if (applyAllBtn) {
          applyAllBtn.addEventListener('click', applyAllLatest);
        }
        
        if (periodSelector) {
          periodSelector.addEventListener('change', function() {
            loadAuditData();
          });
        }

        // Only load review data if user has audit-approver permission
        const hasAuditApproverPermission = ${hasAuditApprover};
        if (hasAuditApproverPermission) {
          loadAuditData();
          startAutoRefresh();

          document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
              stopAutoRefresh();
            } else {
              startAutoRefresh();
              loadAuditData();
            }
          });

          window.addEventListener('beforeunload', stopAutoRefresh);
        }
      })();
    </script>
  `;

  return layout(title, content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

