// Shared modal and script components

export function getModalHtml(): string {
  return `
    <!-- Add New Modal -->
    <div id="addModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 id="modalTitle" class="text-lg font-semibold text-gray-900">Add New Item</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="modalBody">
          <div class="mb-4">
            <label id="modalLabel" for="modalInput" class="label">Name</label>
            <input type="text" id="modalInput" class="input-field" placeholder="Enter name...">
          </div>
          <div id="modalError" class="text-red-600 text-sm mb-4 hidden"></div>
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
          
          closeModal();
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
}
