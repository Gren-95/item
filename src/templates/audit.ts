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
}

export function auditPage(data: AuditData, success: boolean = false, error: string | null = null): string {
  const eq = data.equipment;
  
  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <a href="/" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </a>
        <h1 class="text-2xl font-bold text-gray-900">Edit Equipment</h1>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-mono text-sm">${escapeHtml(eq.service_tag)}</span>
      </div>

      ${success ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-green-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Equipment saved successfully!</span>
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

      <form action="/edit/${eq.id}" method="POST">
        <!-- Equipment Information -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Equipment Information
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label for="purchase_date" class="label">Warranty Start</label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value="${eq.purchase_date}"
                class="input-field"
              >
            </div>
            <div>
              <label for="warranty_expiry_date" class="label">Warranty Expiry</label>
              <input
                type="date"
                id="warranty_expiry_date"
                name="warranty_expiry_date"
                value="${eq.warranty_expiry_date}"
                class="input-field ${isExpired(eq.warranty_expiry_date) ? "text-red-600 bg-red-50 border-red-200" : ""}"
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
              <div class="readonly-field font-mono bg-white">${escapeHtml(eq.service_tag)}</div>
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
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
