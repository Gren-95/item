import { layout } from "./layout";
import { button, editButton, activateButton, deactivateButton } from "./buttons";
import { renderAlert, escapeHtml } from "./components";
import { COG_ICON } from "./icons";

interface TypeItem {
  id: number;
  name: string;
  status: number;
  equipment_count: number;
}

interface ModelItem {
  id: number;
  name: string;
  parent_id: number;
  status: number;
  equipment_count: number;
}

interface ProductLineItem {
  id: number;
  name: string;
  parent_id: number;
  status: number;
  equipment_count: number;
}

interface TypesData {
  types: TypeItem[];
  models: ModelItem[];
  productLines: ProductLineItem[];
}

export function typesPage(data: TypesData, success = "", error = "", isAdmin: boolean = false, hasPcPwView: boolean = false, username: string | null = null, hasAuditApprover: boolean = false): string {
  const alert = renderAlert(success, error);

  const sections = [
    { title: "Types", type: "type", items: data.types },
    { title: "Product Lines", type: "product-line", items: data.productLines, parentLabel: "Type", parentOptions: data.types.map(t => ({ id: t.id, name: t.name })) },
    { title: "Models", type: "model", items: data.models, parentLabel: "Product Line", parentOptions: data.productLines.map(pl => ({ id: pl.id, name: pl.name })) },
  ];

  const content = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex items-center gap-2">
          ${COG_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Equipment Types, Product Lines & Models</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Manage equipment types, product lines, and models, see assigned equipment counts.</p>
      </div>

      ${alert}

      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-wrap gap-2" id="tabs">
          ${sections
            .map(
              (section, idx) =>
                `<button data-tab="${idx}" class="tab-btn ${idx === 0 ? "tab-active" : ""}">
                  <span>${section.title}</span>
                </button>`
            )
            .join("")}
        </div>
        <div class="flex items-center gap-2">
          ${button("←", { variant: "secondary", size: "sm", className: "px-3", ariaLabel: "Previous section", onClick: "document.getElementById('tab-prev')?.click()" })}
          ${button("→", { variant: "secondary", size: "sm", className: "px-3", ariaLabel: "Next section", onClick: "document.getElementById('tab-next')?.click()" })}
        </div>
      </div>

      <div id="tab-panels" class="space-y-0">
        ${sections
          .map((section, idx) =>
            renderSection(section.title, section.type, section.items, section.parentLabel, section.parentOptions, idx === 0)
          )
          .join("")}
      </div>

      <script>
        (function() {
          const tabs = Array.from(document.querySelectorAll('.tab-btn'));
          const panels = Array.from(document.querySelectorAll('.tab-panel'));
          const prev = document.getElementById('tab-prev');
          const next = document.getElementById('tab-next');
          let active = 0;

          function setActive(idx) {
            if (idx < 0 || idx >= tabs.length) return;
            active = idx;
            tabs.forEach((t, i) => t.classList.toggle('tab-active', i === active));
            panels.forEach((p, i) => p.classList.toggle('hidden', i !== active));
          }

          tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => setActive(i));
          });
          prev?.addEventListener('click', () => setActive(active - 1));
          next?.addEventListener('click', () => setActive(active + 1));

          // simple touch swipe
          let startX = 0;
          const container = document.getElementById('tab-panels');
          container?.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
          });
          container?.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) {
              if (dx < 0) setActive(active + 1);
              else setActive(active - 1);
            }
          });
        })();
      </script>
    </div>
  `;

  return layout("Equipment Types", content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

function renderSection(
  title: string,
  type: string,
  items: TypeItem[] | ModelItem[] | ProductLineItem[],
  parentLabel?: string,
  parentOptions?: { id: number; name: string }[],
  active = false
): string {
  const isModel = type === "model";
  const isProductLine = type === "product-line";
  const modelItems = isModel ? (items as ModelItem[]) : [];
  const productLineItems = isProductLine ? (items as ProductLineItem[]) : [];
  
  return `
    <div class="card tab-panel ${active ? "" : "hidden"}">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Add, rename, activate/deactivate, and see usage.</p>
        </div>
      </div>

      <div class="mb-4">
        <form method="POST" action="/types" class="grid grid-cols-1 md:grid-cols-${parentLabel ? "3" : "2"} gap-3 items-end">
          <input type="hidden" name="action" value="add">
          <input type="hidden" name="type" value="${type}">
          <div>
            <label class="label">${title.slice(0, -1)} Name</label>
            <input name="name" class="input-field" placeholder="New ${title.slice(0, -1).toLowerCase()} name" required ${isModel || isProductLine ? "" : 'maxlength="25"'}>
          </div>
          ${
            parentLabel && parentOptions
              ? `<div>
                  <label class="label">${parentLabel}</label>
                  <select name="parent_id" class="select-field" required>
                    <option value="">Select ${parentLabel}</option>
                    ${parentOptions
                      .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
                      .join("")}
                  </select>
                </div>`
              : ""
          }
          <div>
            ${button(`Add ${title.slice(0, -1)}`, { type: "submit", variant: "primary", fullWidth: true, className: "md:w-auto" })}
          </div>
        </form>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
              <th class="py-3 px-2">Name</th>
              ${isModel || isProductLine ? `<th class="py-3 px-2">${isModel ? "Product Line" : "Type"}</th>` : ""}
              <th class="py-3 px-2">Status</th>
              <th class="py-3 px-2">Equipment</th>
              <th class="py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.length === 0
                ? `<tr><td colspan="${isModel || isProductLine ? "5" : "4"}" class="py-4 px-2 text-gray-500 dark:text-gray-400">No ${title.toLowerCase()} yet.</td></tr>`
                : isModel
                ? modelItems
                    .map(
                      (item) => {
                        const productLine = parentOptions?.find((pl) => pl.id === item.parent_id);
                        return `
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-2 px-2">
                    <form method="POST" action="/types" class="flex items-center gap-2">
                      <input type="hidden" name="action" value="edit">
                      <input type="hidden" name="type" value="model">
                      <input type="hidden" name="id" value="${item.id}">
                      <input name="name" value="${escapeHtml(item.name)}" class="input-field w-full" required>
                      ${editButton({ type: "submit", className: "whitespace-nowrap" })}
                    </form>
                  </td>
                  <td class="py-2 px-2">
                    <span class="text-gray-600 dark:text-gray-400">${productLine ? escapeHtml(productLine.name) : "Unknown"}</span>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-full text-xs ${item.status ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}">
                      ${item.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">${item.equipment_count}</span>
                  </td>
                  <td class="py-2 px-2 space-x-2">
                    <form method="POST" action="/types" class="inline">
                      <input type="hidden" name="action" value="${item.status ? "deactivate" : "activate"}">
                      <input type="hidden" name="type" value="model">
                      <input type="hidden" name="id" value="${item.id}">
                      ${item.status ? deactivateButton({ type: "submit" }) : activateButton({ type: "submit" })}
                    </form>
                  </td>
                </tr>`;
                      }
                    )
                    .join("")
                : isProductLine
                ? productLineItems
                    .map(
                      (item) => {
                        const type = parentOptions?.find((t) => t.id === item.parent_id);
                        return `
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-2 px-2">
                    <form method="POST" action="/types" class="flex items-center gap-2">
                      <input type="hidden" name="action" value="edit">
                      <input type="hidden" name="type" value="product-line">
                      <input type="hidden" name="id" value="${item.id}">
                      <input name="name" value="${escapeHtml(item.name)}" class="input-field w-full" required>
                      ${editButton({ type: "submit", className: "whitespace-nowrap" })}
                    </form>
                  </td>
                  <td class="py-2 px-2">
                    <span class="text-gray-600 dark:text-gray-400">${type ? escapeHtml(type.name) : "Unknown"}</span>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-full text-xs ${item.status ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}">
                      ${item.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">${item.equipment_count}</span>
                  </td>
                  <td class="py-2 px-2 space-x-2">
                    <form method="POST" action="/types" class="inline">
                      <input type="hidden" name="action" value="${item.status ? "deactivate" : "activate"}">
                      <input type="hidden" name="type" value="product-line">
                      <input type="hidden" name="id" value="${item.id}">
                      ${item.status ? deactivateButton({ type: "submit" }) : activateButton({ type: "submit" })}
                    </form>
                  </td>
                </tr>`;
                      }
                    )
                    .join("")
                : (items as TypeItem[])
                    .map(
                      (item) => `
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-2 px-2">
                    <form method="POST" action="/types" class="flex items-center gap-2">
                      <input type="hidden" name="action" value="edit">
                      <input type="hidden" name="type" value="type">
                      <input type="hidden" name="id" value="${item.id}">
                      <input name="name" value="${escapeHtml(item.name)}" class="input-field w-full" maxlength="25" required>
                      ${editButton({ type: "submit", className: "whitespace-nowrap" })}
                    </form>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-full text-xs ${item.status ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}">
                      ${item.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td class="py-2 px-2">
                    <span class="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">${item.equipment_count}</span>
                  </td>
                  <td class="py-2 px-2 space-x-2">
                    <form method="POST" action="/types" class="inline">
                      <input type="hidden" name="action" value="${item.status ? "deactivate" : "activate"}">
                      <input type="hidden" name="type" value="type">
                      <input type="hidden" name="id" value="${item.id}">
                      ${item.status ? deactivateButton({ type: "submit" }) : activateButton({ type: "submit" })}
                    </form>
                  </td>
                </tr>`
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}


