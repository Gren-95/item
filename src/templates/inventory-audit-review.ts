import { layout } from "./layout";
import { escapeHtml, renderAlert } from "./components";
import { button } from "./buttons";
import { CLIPBOARD_CHECK_ICON, PLUS_ICON, TRASH_ICON, CHECK_CIRCLE_ICON } from "./icons";

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

export function inventoryAuditReviewPage(
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
  const title = "Inventory Audit Review";
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  }

  const today = new Date().toISOString().split('T')[0];
  
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
          <div class="bg-gray-800 rounded-xl shadow-xl overflow-hidden mb-4 sm:mb-6">
            <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-700">
              <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div class="text-emerald-400">
                  ${CLIPBOARD_CHECK_ICON}
                </div>
                <h1 class="text-lg sm:text-xl font-semibold text-white">Inventory Audit</h1>
                ${defaultPeriod ? `<span class="ml-auto text-sm text-gray-400">${escapeHtml(defaultPeriod.inventory_nr)}</span>` : ''}
              </div>
              <!-- Search Bar -->
              <form id="audit-search-form" class="flex gap-2">
                <div class="flex-1 relative">
                  <input
                    type="text"
                    id="audit-search-input"
                    placeholder="Enter serial number..."
                    class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    ${!defaultPeriod ? 'disabled' : ''}
                    autofocus
                  />
                </div>
                <button
                  type="submit"
                  class="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  ${!defaultPeriod ? 'disabled' : ''}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>

          ${!defaultPeriod ? `
            <!-- No Period Warning -->
            <div class="bg-gray-800 rounded-xl shadow-xl p-8 text-center">
              <div class="text-yellow-400 mb-3">
                <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 class="text-white font-medium mb-2">No Active Inventory Period</h3>
              <p class="text-gray-400 text-sm mb-4">Create an inventory period in the Periods tab to start auditing.</p>
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
            <div id="audit-empty" class="bg-gray-800 rounded-xl shadow-xl p-8 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <h3 class="text-white font-medium mb-1">Search for equipment</h3>
              <p class="text-gray-400 text-sm">Enter a serial number to start auditing.</p>
            </div>

            <!-- Not Found State -->
            <div id="audit-not-found" class="hidden bg-gray-800 rounded-xl shadow-xl p-8 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 class="text-white font-medium mb-1">No equipment found</h3>
              <p id="audit-not-found-text" class="text-gray-400 text-sm mb-4">Serial number not found in system.</p>
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
            <div id="audit-loading" class="hidden bg-gray-800 rounded-xl shadow-xl p-8 text-center">
              <svg class="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <p class="text-gray-400">Searching...</p>
            </div>
          `}
        </div>

        <!-- Review Tab Panel -->
        <div class="tab-panel hidden">
          ${hasAuditApprover ? `
          <!-- Header -->
          <div class="bg-gray-800 rounded-xl shadow-xl overflow-hidden mb-4 sm:mb-6">
            <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-700">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="text-emerald-400">
                    ${CLIPBOARD_CHECK_ICON}
                  </div>
                  <h1 class="text-lg sm:text-xl font-semibold text-white">Inventory Audit Review</h1>
                </div>
                <div class="flex flex-wrap items-center gap-2" id="header-action-buttons">
                  <button
                    id="copy-api-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-700 text-white text-xs sm:text-sm rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Copy API endpoint URL"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <span class="hidden sm:inline">Copy API</span>
                    <span class="sm:hidden">API</span>
                  </button>
                  <button
                    id="export-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white text-xs sm:text-sm rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="hidden sm:inline">Export CSV</span>
                    <span class="sm:hidden">Export</span>
                  </button>
                  <button
                    id="refresh-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span class="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    id="apply-all-btn"
                    class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    title="Apply latest audit entry for each service tag"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="hidden sm:inline">Apply All Latest</span>
                    <span class="sm:hidden">Apply All</span>
                  </button>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3" id="review-controls">
                <label class="text-xs sm:text-sm text-gray-400 whitespace-nowrap">Inventory Period:</label>
                <select
                  id="period-selector"
                  class="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Periods</option>
                  ${allPeriods.map(p => `<option value="${p.id}" ${defaultPeriod && defaultPeriod.id === p.id ? 'selected' : ''}>${escapeHtml(p.inventory_nr)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Loading State -->
      <div id="loading-state" class="bg-gray-800 rounded-xl shadow-xl p-8 sm:p-12 text-center">
        <svg class="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <p class="text-sm sm:text-base text-gray-400">Loading audit records...</p>
      </div>

      <!-- Error State -->
      <div id="error-state" class="hidden bg-red-900/30 border border-red-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="flex items-start gap-2 sm:gap-3">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm sm:text-base text-red-400 font-medium">Error loading data</h3>
            <p id="error-message" class="text-xs sm:text-sm text-red-300 mt-1 break-words"></p>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div id="table-container" class="hidden bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        <div class="overflow-x-auto -mx-2 sm:mx-0">
          <table class="w-full min-w-[800px]">
            <thead class="bg-gray-700">
              <tr>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Service Tag</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Assigned To</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">TeamViewer</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">Comment</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Updated By / Date</th>
                <th class="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody id="audit-table-body" class="bg-gray-800 divide-y divide-gray-700">
              <!-- Data will be populated here -->
            </tbody>
          </table>
        </div>
        <div id="table-footer" class="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div class="text-xs sm:text-sm text-gray-400">
            <span id="record-count">0</span> records
          </div>
          <div class="text-[10px] sm:text-xs text-gray-500">
            Last updated: <span id="last-update">Never</span>
          </div>
        </div>
        </div>
          ` : `
            <!-- No Permission Message -->
            <div class="bg-gray-800 rounded-xl shadow-xl p-8 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <h3 class="text-white font-medium mb-1">Permission Required</h3>
              <p class="text-gray-400 text-sm">You do not have permission to review audit records.</p>
            </div>
          `}
        </div>

        <!-- Periods Tab Panel -->
        <div class="tab-panel hidden">
          ${hasAuditApprover ? `
            <!-- Add New Period Form -->
            <div class="bg-gray-800 rounded-xl shadow-xl overflow-hidden mb-4 sm:mb-6">
              <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-700">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="text-emerald-400">
                    ${CLIPBOARD_CHECK_ICON}
                  </div>
                  <h2 class="text-lg sm:text-xl font-semibold text-white">Inventory Period</h2>
                </div>
              </div>
              <div class="px-3 sm:px-6 py-4">
                <form method="POST" action="/inventory-periods" class="space-y-4" id="createPeriodForm">
                  <input type="hidden" name="action" value="add">
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label for="start_date" class="block text-sm font-medium text-gray-300 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onchange="updatePeriodPreview()"
                      />
                    </div>
                    
                    <div>
                      <label for="end_date" class="block text-sm font-medium text-gray-300 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        required
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    
                    <div>
                      <label for="comment" class="block text-sm font-medium text-gray-300 mb-1">
                        Comment
                      </label>
                      <input
                        type="text"
                        id="comment"
                        name="comment"
                        placeholder="Optional description"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  
                  <!-- Period Name Preview -->
                  <div class="bg-gray-700 rounded-lg p-3">
                    <span class="text-sm text-gray-400">Period name will be generated as: </span>
                    <span id="periodNamePreview" class="font-medium text-white">INV-YYYY-QX-1</span>
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
            <div class="bg-gray-800 rounded-xl shadow-xl overflow-hidden">
              <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-700">
                <h2 class="text-lg font-semibold text-white">Existing Periods</h2>
              </div>
              
              ${allPeriodsForTab.length === 0 ? `
                <div class="p-8 text-center text-gray-400">
                  <p>No inventory periods found. Create one above to get started.</p>
                </div>
              ` : `
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-700">
                    <thead class="bg-gray-700">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Period</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Start Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">End Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Comment</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-gray-800 divide-y divide-gray-700">
                      ${allPeriodsForTab.map(period => {
                        const startDateStr = formatDate(period.start_date);
                        const endDateStr = formatDate(period.end_date);
                        const isActive = endDateStr >= today && startDateStr <= today;
                        const isPast = endDateStr < today;
                        const isFuture = startDateStr > today;
                        
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
                          <tr class="${isActive ? 'bg-green-900/20' : ''}">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              ${escapeHtml(period.inventory_nr)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ${escapeHtml(startDateStr)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ${escapeHtml(endDateStr)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                              ${statusBadge}
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
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
            <div class="bg-gray-800 rounded-xl shadow-xl p-8 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <h3 class="text-white font-medium mb-1">Permission Required</h3>
              <p class="text-gray-400 text-sm">You do not have permission to manage inventory periods.</p>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- Quick Edit Modal -->
    <div id="quickEditModal" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-white">Edit Equipment</h3>
          <button id="closeQuickEditModal" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form id="quickEditForm" class="space-y-4">
          <input type="hidden" name="equipment_id" id="qe_equipment_id">
          <input type="hidden" name="inventory_period_id" value="${defaultPeriod?.id || ''}">

          <!-- User (Employee) -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">User (Employee)</label>
            <select
              name="assigned_to"
              id="qe_assigned_to"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Not assigned</option>
              ${employees.map(e => `<option value="${escapeHtml(e.employee_no)}">${escapeHtml(e.name)} - ${escapeHtml(e.employee_no)}</option>`).join('')}
            </select>
          </div>

          <!-- Location Section -->
          <div class="border-t border-gray-700 pt-4">
            <label class="block text-sm font-medium text-gray-300 mb-3">Location</label>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Country</label>
                <select id="qe_country_id" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select...</option>
                  ${locationData?.countries.map(c => `<option value="${c.id}" data-parent="${c.parent_id}">${escapeHtml(c.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Region</label>
                <select id="qe_plant_id" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select country first...</option>
                  ${locationData?.plants.map(p => `<option value="${p.id}" data-parent="${p.parent_id}">${escapeHtml(p.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Department</label>
                <select id="qe_department_id" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select region first...</option>
                  ${locationData?.departments.map(d => `<option value="${d.id}" data-parent="${d.parent_id}">${escapeHtml(d.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Area</label>
                <select id="qe_area_id" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select department first...</option>
                  ${locationData?.areas.map(a => `<option value="${a.id}" data-parent="${a.parent_id}">${escapeHtml(a.name)}</option>`).join('') || ''}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Sub-Area</label>
                <select id="qe_sub_area_id" name="equipment_sub_area_id" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select area first...</option>
                  ${locationData?.subAreas.map(s => `<option value="${s.id}" data-parent="${s.parent_id}">${escapeHtml(s.name)}</option>`).join('') || ''}
                </select>
              </div>
            </div>
            <!-- Hidden field for region (auto-derived from country) -->
            <input type="hidden" id="qe_region_id" />
          </div>

          <!-- TeamViewer -->
          <div class="border-t border-gray-700 pt-4">
            <label class="block text-sm font-medium text-gray-300 mb-1">Teamviewer</label>
            <input
              type="text"
              name="teamviewer"
              id="qe_teamviewer"
              placeholder="Teamviewer ID"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div id="quickEditError" class="hidden text-red-400 text-sm"></div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" id="cancelQuickEdit" class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
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
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
            <div class="bg-gray-800 rounded-xl shadow-xl overflow-hidden">
              <!-- Equipment Info -->
              <div class="bg-emerald-900/40 px-6 py-4">
                <div class="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <div>
                      <div class="text-xs text-emerald-300/70 uppercase tracking-wide">Location</div>
                      <div class="text-white font-medium">\${escapeHtml(locationStr)}</div>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <div>
                      <div class="text-xs text-emerald-300/70 uppercase tracking-wide">User</div>
                      <div class="text-white font-medium">\${equipment.assigned_to_name ? escapeHtml(equipment.assigned_to + ' - ' + equipment.assigned_to_name) : 'Not assigned'}</div>
                    </div>
                  </div>
                  <div class="flex items-start gap-3 col-span-2 sm:col-span-1">
                    <svg class="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <div class="flex-1">
                      <div class="text-xs text-emerald-300/70 uppercase tracking-wide">Latest Audit</div>
                      <div class="text-white font-medium">\${formatDate(equipment.latest_audit_date)}</div>
                    </div>
                    <button type="button" class="update-audit-btn flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" data-equipment-id="\${equipment.id}">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                      Update
                    </button>
                  </div>
                </div>
              </div>
              <!-- Details -->
              <div class="px-6 py-4 border-t border-gray-700">
                <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Equipment Details</h3>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-6">
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                    <div class="text-white text-sm">\${escapeHtml(typeStr)}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Teamviewer</div>
                    <div class="text-white text-sm font-mono">\${equipment.teamviewer || '0'}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                    <div class="text-white text-sm">\${equipment.is_written_off ? 'Written Off' : equipment.repair_status ? equipment.repair_status.replace(/_/g, ' ') : 'In Use'}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Device Age</div>
                    <div class="text-white text-sm">\${formatDeviceAge(equipment.purchase_date)}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Service Tag</div>
                    <div class="text-white text-sm font-mono">\${escapeHtml(equipment.service_tag)}</div>
                  </div>
                </div>
              </div>
              <!-- Actions -->
              <div class="px-6 py-4 border-t border-gray-700 flex gap-3">
                <button type="button" class="quick-edit-btn inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Edit
                </button>
                <a href="/edit/\${equipment.id}" class="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 hover:text-white transition-colors ml-auto">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Full Edit
                </a>
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
                    this.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Update';
                  });
                }

                // Add event listener for quick edit button
                const quickEditBtn = auditResult.querySelector('.quick-edit-btn');
                if (quickEditBtn) {
                  quickEditBtn.addEventListener('click', function() {
                    openQuickEditModal(this.dataset);
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
          const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
          return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
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
        
        async function loadAuditData() {
          try {
            if (loadingState) loadingState.classList.remove('hidden');
            if (errorState) errorState.classList.add('hidden');
            if (tableContainer) tableContainer.classList.add('hidden');
            
            const periodId = getSelectedPeriodId();
            const url = periodId 
              ? '/api/inventory-audit/review?period_id=' + periodId
              : '/api/inventory-audit/review';
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to load data');
            }
            
            const records = result.data || [];
            
            if (tableBody) {
              tableBody.innerHTML = records.map(function(record) {
                return '<tr class="hover:bg-gray-700/50 transition-colors">' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-white">' +
                    '<a href="/inventory-audit?search=' + encodeURIComponent(record.service_tag) + '" class="text-emerald-400 hover:text-emerald-300">' +
                      escapeHtml(record.service_tag || '') +
                    '</a>' +
                    '<div class="text-xs text-gray-400 mt-0.5 sm:hidden">' + escapeHtml(record.equipment_type || '-') + '</div>' +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-300 hidden sm:table-cell">' +
                    escapeHtml(record.equipment_type || '-') +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-300">' +
                    escapeHtml(record.location || 'Not assigned') +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-300">' +
                    '<div class="truncate max-w-[120px] sm:max-w-none">' +
                      (record.assigned_to_name 
                        ? escapeHtml(record.assigned_to || '') + ' - ' + escapeHtml(record.assigned_to_name)
                        : record.assigned_to 
                          ? escapeHtml(record.assigned_to)
                          : '-') +
                    '</div>' +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-300 font-mono hidden md:table-cell">' +
                    (record.teamviewer || '0') +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-300 max-w-xs truncate hidden lg:table-cell" title="' + escapeHtml(record.comment || '') + '">' +
                    escapeHtml(record.comment || '-') +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-300">' +
                    '<div class="text-gray-300">' + escapeHtml(record.updated_by || '-') + '</div>' +
                    '<div class="text-[10px] sm:text-xs text-gray-400 mt-0.5">' + formatDate(record.updated) + '</div>' +
                  '</td>' +
                  '<td class="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center">' +
                    '<button data-service-tag="' + escapeHtml(record.service_tag) + '" class="apply-btn px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white text-[10px] sm:text-xs rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">' +
                      'Apply' +
                    '</button>' +
                  '</td>' +
                '</tr>';
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

