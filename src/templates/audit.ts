import { layout } from "./layout";

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
}

interface SelectOption {
  id: number;
  name: string;
  parent_id?: number;
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
}

export function auditPage(data: AuditData, success: boolean = false, error: string | null = null): string {
  const eq = data.equipment;
  
  // Calculate device age
  const purchaseDate = new Date(eq.purchase_date);
  const now = new Date();
  const ageInMonths = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const ageYears = Math.floor(ageInMonths / 12);
  const ageMonthsRemaining = ageInMonths % 12;
  const deviceAge = ageYears > 0 
    ? `${ageYears} year${ageYears > 1 ? "s" : ""}${ageMonthsRemaining > 0 ? `, ${ageMonthsRemaining} month${ageMonthsRemaining > 1 ? "s" : ""}` : ""}`
    : `${ageMonthsRemaining} month${ageMonthsRemaining !== 1 ? "s" : ""}`;

  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <a href="/" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </a>
        <h1 class="text-2xl font-bold text-gray-900">Audit Equipment</h1>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-mono text-sm">${escapeHtml(eq.service_tag)}</span>
      </div>

      ${success ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-green-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Equipment audit saved successfully!</span>
          </div>
        </div>
      ` : ""}

      ${error ? `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-red-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${escapeHtml(error)}</span>
          </div>
        </div>
      ` : ""}

      <form action="/audit/${eq.id}" method="POST">
        <!-- Read-only Information -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Equipment Information (Read-only)
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="label">Latest Audit Date</label>
              <div class="readonly-field">${eq.latest_audit_date || "Never audited"}</div>
            </div>
            <div>
              <label class="label">Warranty Start</label>
              <div class="readonly-field">${formatDate(eq.purchase_date)}</div>
            </div>
            <div>
              <label class="label">Warranty Expiry</label>
              <div class="readonly-field ${isExpired(eq.warranty_expiry_date) ? "text-red-600 bg-red-50 border-red-200" : ""}">${formatDate(eq.warranty_expiry_date)}</div>
            </div>
            <div>
              <label class="label">Device Age</label>
              <div class="readonly-field">${deviceAge}</div>
            </div>
            <div>
              <label class="label">Vendor</label>
              <div class="readonly-field">${escapeHtml(eq.vendor_name || "-")}</div>
            </div>
            <div>
              <label class="label">Service Tag</label>
              <div class="readonly-field font-mono">${escapeHtml(eq.service_tag)}</div>
            </div>
          </div>
        </div>

        <!-- Type & Model Selection -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
            </svg>
            Equipment Type
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="type_id" class="label">Type</label>
              <select id="type_id" name="type_id" class="select-field" onchange="loadProductLines(this.value)">
                <option value="">Select Type...</option>
                ${data.types.map(t => `
                  <option value="${t.id}" ${eq.type_id === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="product_line_id" class="label">Product Line</label>
              <select id="product_line_id" name="product_line_id" class="select-field" onchange="loadModels(this.value)">
                <option value="">Select Product Line...</option>
                ${data.productLines.map(pl => `
                  <option value="${pl.id}" data-parent="${pl.parent_id}" ${eq.product_line_id === pl.id ? "selected" : ""} ${eq.type_id !== pl.parent_id ? "hidden" : ""}>${escapeHtml(pl.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="model_id" class="label">Model</label>
              <select id="model_id" name="model_id" class="select-field">
                <option value="">Select Model...</option>
                ${data.models.map(m => `
                  <option value="${m.id}" data-parent="${m.parent_id}" ${eq.model_id === m.id ? "selected" : ""} ${eq.product_line_id !== m.parent_id ? "hidden" : ""}>${escapeHtml(m.name)}</option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Location Selection -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Location
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label for="region_id" class="label">Region</label>
              <select id="region_id" name="region_id" class="select-field" onchange="loadCountries(this.value)">
                <option value="">Select Region...</option>
                ${data.regions.map(r => `
                  <option value="${r.id}" ${eq.region_id === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="country_id" class="label">Country</label>
              <select id="country_id" name="country_id" class="select-field" onchange="loadPlants(this.value)">
                <option value="">Select Country...</option>
                ${data.countries.map(c => `
                  <option value="${c.id}" data-parent="${c.parent_id}" ${eq.country_id === c.id ? "selected" : ""} ${eq.region_id !== c.parent_id ? "hidden" : ""}>${escapeHtml(c.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="plant_id" class="label">Plant</label>
              <select id="plant_id" name="plant_id" class="select-field" onchange="loadDepartments(this.value)">
                <option value="">Select Plant...</option>
                ${data.plants.map(p => `
                  <option value="${p.id}" data-parent="${p.parent_id}" ${eq.plant_id === p.id ? "selected" : ""} ${eq.country_id !== p.parent_id ? "hidden" : ""}>${escapeHtml(p.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="department_id" class="label">Department</label>
              <select id="department_id" name="department_id" class="select-field" onchange="loadAreas(this.value)">
                <option value="">Select Department...</option>
                ${data.departments.map(d => `
                  <option value="${d.id}" data-parent="${d.parent_id}" ${eq.department_id === d.id ? "selected" : ""} ${eq.plant_id !== d.parent_id ? "hidden" : ""}>${escapeHtml(d.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="area_id" class="label">Area</label>
              <select id="area_id" name="area_id" class="select-field" onchange="loadSubAreas(this.value)">
                <option value="">Select Area...</option>
                ${data.areas.map(a => `
                  <option value="${a.id}" data-parent="${a.parent_id}" ${eq.area_id === a.id ? "selected" : ""} ${eq.department_id !== a.parent_id ? "hidden" : ""}>${escapeHtml(a.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="equipment_sub_area_id" class="label">Sub Area</label>
              <select id="equipment_sub_area_id" name="equipment_sub_area_id" class="select-field">
                <option value="">Select Sub Area...</option>
                ${data.subAreas.map(sa => `
                  <option value="${sa.id}" data-parent="${sa.parent_id}" ${eq.equipment_sub_area_id === sa.id ? "selected" : ""} ${eq.area_id !== sa.parent_id ? "hidden" : ""}>${escapeHtml(sa.name)}</option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Assignment & TeamViewer -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-4">
          <a href="/" class="btn btn-secondary">Cancel</a>
          <button type="submit" class="btn btn-success">
            <span class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Save Audit
            </span>
          </button>
        </div>
      </form>
    </div>

    <script>
      function filterOptions(selectId, parentId) {
        const select = document.getElementById(selectId);
        const options = select.querySelectorAll('option[data-parent]');
        let firstVisible = null;
        
        options.forEach(opt => {
          if (opt.dataset.parent === parentId) {
            opt.hidden = false;
            if (!firstVisible) firstVisible = opt;
          } else {
            opt.hidden = true;
            opt.selected = false;
          }
        });
        
        // Reset selection
        select.value = '';
      }

      function loadCountries(regionId) {
        filterOptions('country_id', regionId);
        loadPlants('');
      }

      function loadPlants(countryId) {
        filterOptions('plant_id', countryId);
        loadDepartments('');
      }

      function loadDepartments(plantId) {
        filterOptions('department_id', plantId);
        loadAreas('');
      }

      function loadAreas(departmentId) {
        filterOptions('area_id', departmentId);
        loadSubAreas('');
      }

      function loadSubAreas(areaId) {
        filterOptions('equipment_sub_area_id', areaId);
      }

      function loadProductLines(typeId) {
        filterOptions('product_line_id', typeId);
        loadModels('');
      }

      function loadModels(productLineId) {
        filterOptions('model_id', productLineId);
      }
    </script>
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
