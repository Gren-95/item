/**
 * Shared UI components for templates
 */

import { CHECK_CIRCLE_ICON, CHECK_ICON, EXCLAMATION_CIRCLE_ICON, X_ICON } from "./icons";

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Enhanced alert component that detects approval requests and styles them prominently
 */
export function renderAlert(success: string | boolean = "", error: string | null = ""): string {
  // Handle boolean success (for add/audit pages)
  const successMessage = typeof success === "boolean" ? (success ? "Operation completed successfully!" : "") : success;
  
  const isApprovalRequest = successMessage.toLowerCase().includes("approval") || 
                           successMessage.toLowerCase().includes("request id");
  
  if (successMessage) {
    return `<div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-6 ${isApprovalRequest ? 'shadow-lg' : ''}">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          ${isApprovalRequest
            ? CHECK_CIRCLE_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-blue-600 dark:text-blue-400')
            : CHECK_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-green-600 dark:text-green-400')
          }
        </div>
        <div class="flex-1">
          <h3 class="font-semibold ${isApprovalRequest ? 'text-blue-900 dark:text-blue-200' : 'text-green-900 dark:text-green-200'} mb-1">
            ${isApprovalRequest ? '📋 Approval Request Created' : '✅ Success'}
          </h3>
          <p class="${isApprovalRequest ? 'text-blue-800 dark:text-blue-300' : 'text-green-800 dark:text-green-300'}">
            ${escapeHtml(successMessage)}
          </p>
          ${isApprovalRequest 
            ? `<p class="text-sm text-blue-600 dark:text-blue-400 mt-2">
                 ⏳ Pending admin approval
               </p>`
            : ''
          }
        </div>
      </div>
    </div>`;
  }
  
  if (error) {
    return `<div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-red-600 dark:text-red-400')}
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-red-900 dark:text-red-200 mb-1">⚠️ Error</h3>
          <p class="text-red-800 dark:text-red-300">${escapeHtml(error)}</p>
        </div>
      </div>
    </div>`;
  }
  
  return "";
}

// Shared modal and script components

export function getModalHtml(): string {
  return `
    <!-- Add New Modal -->
    <div id="addModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transition-colors">
        <div class="flex justify-between items-center mb-4">
          <h3 id="modalTitle" class="text-lg font-semibold text-gray-900 dark:text-white">Add New Item</h3>
          <button onclick="closeModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
          </button>
        </div>
        <div id="modalBody">
          <div class="mb-4">
            <label id="modalLabel" for="modalInput" class="label">Name</label>
            <input type="text" id="modalInput" class="input-field" placeholder="Enter name...">
          </div>
          <div id="modalError" class="text-red-600 dark:text-red-400 text-sm mb-4 hidden"></div>
        </div>
        <div class="flex justify-end gap-3">
          <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
          <button onclick="submitModal()" class="btn btn-primary">Add</button>
        </div>
      </div>
    </div>
  `;
}

export function getScriptsHtml(): string {
  return `
    <script>
      let currentModalType = '';
      let currentParentId = null;
      let currentSelectId = '';

      function openAddModal(type, label, selectId, parentId = null, parentSelectId = null) {
        // Check if parent is required but not selected
        if (parentSelectId) {
          const parentSelect = document.getElementById(parentSelectId);
          if (!parentSelect || !parentSelect.value) {
            alert('Please select ' + parentSelectId.replace('_id', '').replace(/_/g, ' ') + ' first');
            // Reset the select to empty
            document.getElementById(selectId).value = '';
            return;
          }
          parentId = parentSelect.value;
        }
        
        currentModalType = type;
        currentParentId = parentId;
        currentSelectId = selectId;
        
        document.getElementById('modalTitle').textContent = 'Add New ' + label;
        document.getElementById('modalLabel').textContent = label + ' Name';
        document.getElementById('modalInput').value = '';
        document.getElementById('modalInput').placeholder = 'Enter ' + label.toLowerCase() + ' name...';
        document.getElementById('modalError').classList.add('hidden');
        document.getElementById('addModal').classList.remove('hidden');
        document.getElementById('addModal').classList.add('flex');
        document.getElementById('modalInput').focus();
      }

      function closeModal() {
        document.getElementById('addModal').classList.add('hidden');
        document.getElementById('addModal').classList.remove('flex');
        // Reset select to empty value
        if (currentSelectId) {
          document.getElementById(currentSelectId).value = '';
        }
        currentModalType = '';
        currentParentId = null;
        currentSelectId = '';
      }

      async function submitModal() {
        const name = document.getElementById('modalInput').value.trim();
        if (!name) {
          document.getElementById('modalError').textContent = 'Name is required';
          document.getElementById('modalError').classList.remove('hidden');
          return;
        }

        try {
          const body = { name };
          if (currentParentId) {
            body.parent_id = currentParentId;
          }

          const response = await fetch('/api/' + currentModalType, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to create item');
          }

          // Add new option to select and select it
          const select = document.getElementById(currentSelectId);
          const newOption = document.createElement('option');
          newOption.value = result.id;
          newOption.textContent = name;
          if (currentParentId) {
            newOption.dataset.parent = currentParentId;
          }
          
          // Insert before the "Add new..." option
          const addNewOption = select.querySelector('option[value="__add_new__"]');
          select.insertBefore(newOption, addNewOption);
          select.value = result.id;
          
          // Trigger change event to cascade if needed
          select.dispatchEvent(new Event('change'));
          
          // Clear input and error, keep modal open for adding more
          document.getElementById('modalInput').value = '';
          document.getElementById('modalError').classList.add('hidden');
          document.getElementById('modalInput').focus();
        } catch (err) {
          document.getElementById('modalError').textContent = err.message;
          document.getElementById('modalError').classList.remove('hidden');
        }
      }

      // Handle Enter key in modal
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !document.getElementById('addModal').classList.contains('hidden')) {
          e.preventDefault();
          submitModal();
        }
        if (e.key === 'Escape' && !document.getElementById('addModal').classList.contains('hidden')) {
          closeModal();
        }
      });

      function handleSelectChange(select, type, label, parentSelectId = null) {
        if (select.value === '__add_new__') {
          openAddModal(type, label, select.id, null, parentSelectId);
        }
      }

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
        
        // Show/hide the "Add new" option based on parent selection
        const addNewOption = select.querySelector('option[value="__add_new__"]');
        if (addNewOption) {
          addNewOption.hidden = !parentId;
        }
        
        select.value = '';
      }

      function resetAllChildren(selectId) {
        // Reset all child selects when a parent changes
        const childMap = {
          'region_id': ['country_id', 'plant_id', 'department_id', 'area_id', 'equipment_sub_area_id'],
          'country_id': ['plant_id', 'department_id', 'area_id', 'equipment_sub_area_id'],
          'plant_id': ['department_id', 'area_id', 'equipment_sub_area_id'],
          'department_id': ['area_id', 'equipment_sub_area_id'],
          'area_id': ['equipment_sub_area_id']
        };
        
        const children = childMap[selectId] || [];
        children.forEach(childId => {
          const childSelect = document.getElementById(childId);
          if (childSelect) {
            childSelect.value = '';
            // Hide all options in child selects
            const childOptions = childSelect.querySelectorAll('option[data-parent]');
            childOptions.forEach(opt => {
              opt.hidden = true;
              opt.selected = false;
            });
            // Hide "Add new" option
            const addNewOption = childSelect.querySelector('option[value="__add_new__"]');
            if (addNewOption) {
              addNewOption.hidden = true;
            }
          }
        });
      }

      function loadCountries(regionId) {
        resetAllChildren('region_id');
        filterOptions('country_id', regionId);
        loadPlants('');
      }

      function loadPlants(countryId) {
        resetAllChildren('country_id');
        filterOptions('plant_id', countryId);
        loadDepartments('');
      }

      function loadDepartments(plantId) {
        resetAllChildren('plant_id');
        filterOptions('department_id', plantId);
        loadAreas('');
      }

      function loadAreas(departmentId) {
        resetAllChildren('department_id');
        filterOptions('area_id', departmentId);
        loadSubAreas('');
      }

      function loadSubAreas(areaId) {
        resetAllChildren('area_id');
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
}
