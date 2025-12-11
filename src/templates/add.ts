import { layout } from "./layout";

interface SelectOption {
  id: number;
  name: string;
  parent_id?: number;
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
}

export function addPage(data: AddData, success: boolean = false, error: string | null = null): string {
  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <a href="/" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </a>
        <h1 class="text-2xl font-bold text-gray-900">Add New Equipment</h1>
      </div>

      ${success ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-green-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Equipment added successfully!</span>
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

      <form action="/add" method="POST">
        <!-- Basic Information -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
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
              <select id="vendor_id" name="vendor_id" class="select-field">
                <option value="">Select Vendor...</option>
                ${data.vendors.map(v => `
                  <option value="${v.id}">${escapeHtml(v.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="purchase_date" class="label">Purchase Date <span class="text-red-500">*</span></label>
              <input 
                type="date" 
                id="purchase_date" 
                name="purchase_date"
                class="input-field"
                required
              >
            </div>
            <div>
              <label for="warranty_expiry_date" class="label">Warranty Expiry Date <span class="text-red-500">*</span></label>
              <input 
                type="date" 
                id="warranty_expiry_date" 
                name="warranty_expiry_date"
                class="input-field"
                required
              >
            </div>
            <div>
              <label for="supplier_id" class="label">Supplier</label>
              <select id="supplier_id" name="supplier_id" class="select-field">
                <option value="">Select Supplier...</option>
                ${data.suppliers.map(s => `
                  <option value="${s.id}">${escapeHtml(s.name)}</option>
                `).join("")}
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
                  <option value="${t.id}">${escapeHtml(t.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="product_line_id" class="label">Product Line</label>
              <select id="product_line_id" name="product_line_id" class="select-field" onchange="loadModels(this.value)">
                <option value="">Select Product Line...</option>
                ${data.productLines.map(pl => `
                  <option value="${pl.id}" data-parent="${pl.parent_id}" hidden>${escapeHtml(pl.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="model_id" class="label">Model</label>
              <select id="model_id" name="model_id" class="select-field">
                <option value="">Select Model...</option>
                ${data.models.map(m => `
                  <option value="${m.id}" data-parent="${m.parent_id}" hidden>${escapeHtml(m.name)}</option>
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
                  <option value="${r.id}">${escapeHtml(r.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="country_id" class="label">Country</label>
              <select id="country_id" name="country_id" class="select-field" onchange="loadPlants(this.value)">
                <option value="">Select Country...</option>
                ${data.countries.map(c => `
                  <option value="${c.id}" data-parent="${c.parent_id}" hidden>${escapeHtml(c.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="plant_id" class="label">Plant</label>
              <select id="plant_id" name="plant_id" class="select-field" onchange="loadDepartments(this.value)">
                <option value="">Select Plant...</option>
                ${data.plants.map(p => `
                  <option value="${p.id}" data-parent="${p.parent_id}" hidden>${escapeHtml(p.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="department_id" class="label">Department</label>
              <select id="department_id" name="department_id" class="select-field" onchange="loadAreas(this.value)">
                <option value="">Select Department...</option>
                ${data.departments.map(d => `
                  <option value="${d.id}" data-parent="${d.parent_id}" hidden>${escapeHtml(d.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="area_id" class="label">Area</label>
              <select id="area_id" name="area_id" class="select-field" onchange="loadSubAreas(this.value)">
                <option value="">Select Area...</option>
                ${data.areas.map(a => `
                  <option value="${a.id}" data-parent="${a.parent_id}" hidden>${escapeHtml(a.name)}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label for="equipment_sub_area_id" class="label">Sub Area</label>
              <select id="equipment_sub_area_id" name="equipment_sub_area_id" class="select-field">
                <option value="">Select Sub Area...</option>
                ${data.subAreas.map(sa => `
                  <option value="${sa.id}" data-parent="${sa.parent_id}" hidden>${escapeHtml(sa.name)}</option>
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
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
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
          <button type="submit" class="btn btn-success">
            <span class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add Equipment
            </span>
          </button>
        </div>
      </form>
    </div>

    <script>
      function filterOptions(selectId, parentId) {
        const select = document.getElementById(selectId);
        const options = select.querySelectorAll('option[data-parent]');
        
        options.forEach(opt => {
          if (opt.dataset.parent === parentId) {
            opt.hidden = false;
          } else {
            opt.hidden = true;
            opt.selected = false;
          }
        });
        
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

  return layout("Add Equipment", content);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
