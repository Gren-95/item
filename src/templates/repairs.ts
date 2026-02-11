import { layout } from "./layout";
import { button } from "./buttons";
import { WRENCH_ICON, X_ICON, EDIT_ICON, CHECK_CIRCLE_ICON, CHECK_ICON } from "./icons";
import { formatEstonianDate } from "../utils/date";

interface RepairItem {
  id: number;
  service_tag: string;
  model_name: string | null;
  vendor_name: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  repair_status: "needs_repair" | "at_supplier" | "returned" | "in_backup" | null;
  repair_note: string | null;
  repair_physical_location: string | null;
  repair_sent_date: string | null;
  repair_returned_date: string | null;
  repair_marked_backup_date: string | null;
  days_in_repair: number | null;
}

interface RepairsData {
  needsRepair: RepairItem[];
  atSupplier: RepairItem[];
  returned: RepairItem[];
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr: string | null | undefined): string {
  return formatEstonianDate(dateStr, "—");
}

export function repairsPage(data: RepairsData, success = "", error = "", isAdmin: boolean = false, hasPcPwView: boolean = false, username: string | null = null, hasAuditApprover: boolean = false): string {
  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const sections = [
    { title: "Needs Repair", type: "needs_repair", items: data.needsRepair, color: "yellow" },
    { title: "At Supplier", type: "at_supplier", items: data.atSupplier, color: "blue" },
    { title: "Returned", type: "returned", items: data.returned, color: "green" },
  ];

  const content = `
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex items-center gap-2">
          ${WRENCH_ICON.replace('w-5 h-5', 'w-6 h-6').replace('text-current', 'text-gray-900 dark:text-white')}
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Supplier Repair Tracking</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Track equipment sent for repair and monitor repair status.</p>
      </div>

      ${alert}

      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-wrap gap-2" id="tabs">
          ${sections
            .map(
              (section, idx) =>
                `<button data-tab="${idx}" class="tab-btn ${idx === 0 ? "tab-active" : ""}">
                  <span>${section.title}</span>
                  <span class="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${section.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : section.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : section.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'}">${section.items.length}</span>
                </button>`
            )
            .join("")}
        </div>
      </div>

      <div id="tab-panels" class="space-y-0">
        ${sections
          .map((section, idx) => renderRepairSection(section.title, section.type, section.items, idx === 0))
          .join("")}
      </div>

      <!-- Equipment Details Modal -->
      <div id="equipmentModal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 hidden items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Equipment Details</h3>
            <button onclick="closeEquipmentModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ${X_ICON.replace('w-5 h-5', 'w-6 h-6')}
            </button>
          </div>
          <div id="equipmentModalContent" class="space-y-4">
            <!-- Content will be populated by JavaScript -->
          </div>
        </div>
      </div>

      <script>
        (function() {
          const tabs = Array.from(document.querySelectorAll('.tab-btn'));
          const panels = Array.from(document.querySelectorAll('.tab-panel'));
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

        function escapeHtml(str) {
          if (!str) return '';
          const div = document.createElement('div');
          div.textContent = str;
          return div.innerHTML;
        }

        function openEquipmentModal(btn) {
          const modal = document.getElementById('equipmentModal');
          const content = document.getElementById('equipmentModalContent');
          
          const id = btn.dataset.id;
          const serviceTag = btn.dataset.serviceTag || '';
          const modelName = btn.dataset.model || '';
          const vendorName = btn.dataset.vendor || '';
          const supplierName = btn.dataset.supplier || '';
          const supplierEmail = btn.dataset.supplierEmail || '';
          const repairNote = btn.dataset.repairNote || '';
          const physicalLocation = btn.dataset.physicalLocation || '';
          const sentDate = btn.dataset.sentDate || '';
          const returnedDate = btn.dataset.returnedDate || '';
          const markedBackupDate = btn.dataset.markedBackupDate || '';
          const daysInRepair = btn.dataset.days || '';
          
          content.innerHTML = \`
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Service Tag</label>
                <p class="text-gray-900 dark:text-white font-mono text-lg">\${escapeHtml(serviceTag)}</p>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Model</label>
                <p class="text-gray-900 dark:text-white">\${escapeHtml(modelName || '—')}</p>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</label>
                <p class="text-gray-900 dark:text-white">\${escapeHtml(vendorName || '—')}</p>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Supplier</label>
                <p class="text-gray-900 dark:text-white">\${escapeHtml(supplierName || '—')}</p>
                \${supplierEmail ? \`<p class="text-sm text-blue-600 dark:text-blue-400 mt-1"><a href="mailto:\${escapeHtml(supplierEmail)}">\${escapeHtml(supplierEmail)}</a></p>\` : ''}
              </div>
              <div class="col-span-2">
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Repair Issue Note</label>
                <p class="text-gray-900 dark:text-white whitespace-pre-wrap">\${escapeHtml(repairNote || '—')}</p>
              </div>
              \${physicalLocation ? \`
              <div class="col-span-2">
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Physical Location</label>
                <p class="text-gray-600 dark:text-gray-400 text-sm">\${escapeHtml(physicalLocation)}</p>
              </div>
              \` : ''}
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sent Date</label>
                <p class="text-gray-900 dark:text-white">\${sentDate ? formatEstonianDate(sentDate) : '—'}</p>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Returned Date</label>
                <p class="text-gray-900 dark:text-white">\${returnedDate ? formatEstonianDate(returnedDate) : '—'}</p>
              </div>
              \${markedBackupDate ? \`
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Marked Backup Date</label>
                <p class="text-gray-900 dark:text-white">\${formatEstonianDate(markedBackupDate) || '—'}</p>
              </div>
              \` : ''}
              <div>
                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Days in Repair</label>
                <p class="text-gray-900 dark:text-white font-semibold">\${daysInRepair ? daysInRepair : '—'}</p>
              </div>
            </div>
            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <a href="/edit/\${id}" class="btn btn-primary w-full" onclick="closeEquipmentModal()">
                <span class="flex items-center justify-center gap-2">
                  ${EDIT_ICON}
                  Edit Equipment
                </span>
              </a>
            </div>
          \`;
          
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        }

        function closeEquipmentModal() {
          const modal = document.getElementById('equipmentModal');
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }

        window.closeEquipmentModal = closeEquipmentModal;

        // Set up event listeners for equipment detail buttons
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.equipment-detail-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              openEquipmentModal(this);
            });
          });
        });

        // Close modal on escape key
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            closeEquipmentModal();
          }
        });

        // Close modal on background click
        document.getElementById('equipmentModal')?.addEventListener('click', function(e) {
          if (e.target === this) {
            closeEquipmentModal();
          }
        });
      </script>
    </div>
  `;

  return layout("Repair Tracking", content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

function renderRepairSection(
  title: string,
  type: string,
  items: RepairItem[],
  active = false
): string {
  return `
    <div class="tab-panel ${active ? "" : "hidden"}">
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${title}</h2>
        ${
          items.length === 0
            ? `<p class="text-gray-500 dark:text-gray-400 py-8 text-center">No equipment in this status.</p>`
            : `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-700 dark:text-gray-300">
                <th class="py-3 px-2">Service Tag</th>
                <th class="py-3 px-2">Model</th>
                <th class="py-3 px-2">Vendor</th>
                <th class="py-3 px-2">Supplier</th>
                <th class="py-3 px-2">Issue Note</th>
                <th class="py-3 px-2">Sent Date</th>
                <th class="py-3 px-2">Returned Date</th>
                <th class="py-3 px-2">Days</th>
                <th class="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-2 px-2">
                    <button 
                      type="button" 
                      class="equipment-detail-btn font-mono text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                      data-id="${item.id}"
                      data-service-tag="${escapeHtml(item.service_tag)}"
                      data-model="${escapeHtml(item.model_name || "")}"
                      data-vendor="${escapeHtml(item.vendor_name || "")}"
                      data-supplier="${escapeHtml(item.supplier_name || "")}"
                      data-supplier-email="${escapeHtml(item.supplier_email || "")}"
                      data-repair-note="${escapeHtml(item.repair_note || "")}"
                      data-physical-location="${escapeHtml(item.repair_physical_location || "")}"
                      data-sent-date="${item.repair_sent_date || ""}"
                      data-returned-date="${item.repair_returned_date || ""}"
                      data-marked-backup-date="${item.repair_marked_backup_date || ""}"
                      data-days="${item.days_in_repair !== null ? item.days_in_repair : ""}"
                    >
                      ${escapeHtml(item.service_tag)}
                    </button>
                  </td>
                  <td class="py-2 px-2 text-gray-900 dark:text-gray-100">${escapeHtml(item.model_name || "—")}</td>
                  <td class="py-2 px-2 text-gray-900 dark:text-gray-100">${escapeHtml(item.vendor_name || "—")}</td>
                  <td class="py-2 px-2 text-gray-900 dark:text-gray-100">${escapeHtml(item.supplier_name || "—")}</td>
                  <td class="py-2 px-2 max-w-xs truncate text-gray-900 dark:text-gray-100" title="${escapeHtml(item.repair_note || "")}">${escapeHtml(item.repair_note || "—")}</td>
                  <td class="py-2 px-2 text-gray-700 dark:text-gray-300">${formatDate(item.repair_sent_date)}</td>
                  <td class="py-2 px-2 text-gray-700 dark:text-gray-300">${formatDate(item.repair_returned_date)}</td>
                  <td class="py-2 px-2 text-gray-900 dark:text-gray-100 font-semibold">${item.days_in_repair !== null ? item.days_in_repair : "—"}</td>
                  <td class="py-2 px-2">
                    <div class="flex gap-2">
                      ${getActionButtons(item, type)}
                    </div>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
        }
      </div>
    </div>
  `;
}

function getActionButtons(item: RepairItem, currentType: string): string {
  const buttons: string[] = [];

  if (currentType === "needs_repair") {
    // Can mark as sent to supplier
    buttons.push(`
      <form method="POST" action="/repairs" class="inline" onsubmit="return confirm('Mark this equipment as sent to supplier?');">
        <input type="hidden" name="action" value="mark_sent">
        <input type="hidden" name="equipment_id" value="${item.id}">
        ${button("", {
          type: "submit",
          variant: "primary",
          size: "sm",
          icon: CHECK_CIRCLE_ICON.replace('w-5 h-5', 'w-4 h-4'),
          title: "Mark as sent to supplier",
        })}
      </form>
    `);
  } else if (currentType === "at_supplier") {
    // Can mark as returned
    buttons.push(`
      <form method="POST" action="/repairs" class="inline" onsubmit="return confirm('Mark this equipment as returned from supplier?');">
        <input type="hidden" name="action" value="mark_returned">
        <input type="hidden" name="equipment_id" value="${item.id}">
        ${button("", {
          type: "submit",
          variant: "success",
          size: "sm",
          icon: CHECK_ICON.replace('w-5 h-5', 'w-4 h-4'),
          title: "Mark as returned",
        })}
      </form>
    `);
  } else if (currentType === "returned") {
    // Can mark as in backup
    buttons.push(`
      <form method="POST" action="/repairs" class="inline" onsubmit="return confirm('Mark this equipment as in use?');">
        <input type="hidden" name="action" value="mark_backup">
        <input type="hidden" name="equipment_id" value="${item.id}">
        ${button("", {
          type: "submit",
          variant: "secondary",
          size: "sm",
          icon: CHECK_ICON.replace('w-5 h-5', 'w-4 h-4'),
          title: "Mark as in use",
        })}
      </form>
    `);
  }

  return buttons.join("");
}

