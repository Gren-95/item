import { layout } from "./layout";

interface ApprovalRequest {
  id: number;
  created_by: string;
  created_by_name: string;
  permission_required: string;
  action_type: string;
  action_data: string;
  status: "pending" | "approved" | "rejected";
  ip: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created: string;
}

interface ApprovalsData {
  pendingRequests: ApprovalRequest[];
  processedRequests: ApprovalRequest[];
  totalProcessed: number;
  currentPage: number;
  totalPages: number;
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

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
}

function formatActionData(actionData: string): string {
  try {
    const data = JSON.parse(actionData);
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  } catch {
    return actionData;
  }
}

export function approvalsPage(
  data: ApprovalsData,
  isAdmin: boolean,
  success = "",
  error = "",
  hasPcPwView: boolean = false,
  username: string | null = null
): string {
  if (!isAdmin) {
    const content = `
      <div class="max-w-6xl mx-auto">
        <div class="card">
          <div class="text-center py-12">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insufficient Permissions</h2>
            <p class="text-gray-600 dark:text-gray-400">You do not have admin permission to access this page.</p>
          </div>
        </div>
      </div>
    `;
    return layout("Approval Requests", content, isAdmin, hasPcPwView, username);
}

  const alert = success
    ? `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-green-700 dark:text-green-400">✅ ${escapeHtml(success)}</div>`
    : error
    ? `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">⚠️ ${escapeHtml(error)}</div>`
    : "";

  const pendingRows = data.pendingRequests
    .map(
      (req) => `
      <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <td class="py-3 px-2">
          <div class="font-medium text-gray-900 dark:text-white">#${req.id}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${formatDate(req.created)}</div>
        </td>
        <td class="py-3 px-2">
          <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(req.created_by_name || req.created_by)}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(req.created_by)}</div>
        </td>
        <td class="py-3 px-2">
          <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(req.permission_required)}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(req.action_type)}</div>
        </td>
        <td class="py-3 px-2 text-gray-700 dark:text-gray-300 text-sm">
          <pre class="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">${escapeHtml(formatActionData(req.action_data))}</pre>
        </td>
        <td class="py-3 px-2">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Pending
          </span>
        </td>
        <td class="py-3 px-2">
          <div class="flex gap-2">
            <form method="POST" action="/approvals" class="inline" onsubmit="return confirm('Are you sure you want to approve this request?');">
              <input type="hidden" name="action" value="approve">
              <input type="hidden" name="request_id" value="${req.id}">
              <button type="submit" class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium">
                Approve
              </button>
            </form>
            <form method="POST" action="/approvals" class="inline">
              <input type="hidden" name="action" value="reject">
              <input type="hidden" name="request_id" value="${req.id}">
              <button type="button" onclick="showRejectModal(${req.id})" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium">
                Reject
              </button>
            </form>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  const processedRows = data.processedRequests
    .map(
      (req) => `
      <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <td class="py-3 px-2">
          <div class="font-medium text-gray-900 dark:text-white">#${req.id}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${formatDate(req.created)}</div>
        </td>
        <td class="py-3 px-2">
          <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(req.created_by_name || req.created_by)}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(req.created_by)}</div>
        </td>
        <td class="py-3 px-2">
          <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(req.permission_required)}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(req.action_type)}</div>
        </td>
        <td class="py-3 px-2 text-gray-700 dark:text-gray-300 text-sm">
          <pre class="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">${escapeHtml(formatActionData(req.action_data))}</pre>
        </td>
        <td class="py-3 px-2">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            req.status === "approved"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          }">
            ${req.status === "approved" ? "Approved" : "Rejected"}
          </span>
        </td>
        <td class="py-3 px-2">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            ${req.reviewed_by_name ? escapeHtml(req.reviewed_by_name) : escapeHtml(req.reviewed_by || "Unknown")}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${formatDate(req.reviewed_at)}</div>
          ${req.rejection_reason ? `<div class="text-xs text-red-600 dark:text-red-400 mt-1">Reason: ${escapeHtml(req.rejection_reason)}</div>` : ""}
        </td>
      </tr>
    `
    )
    .join("");

  const pagination = data.totalPages > 1 ? `
    <div class="flex items-center justify-between mt-6">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        Page ${data.currentPage} of ${data.totalPages} (${data.totalProcessed} total)
      </div>
      <div class="flex gap-2">
        ${data.currentPage > 1
          ? `<a href="/approvals?page=${data.currentPage - 1}" class="btn btn-secondary">Previous</a>`
          : `<button class="btn btn-secondary" disabled>Previous</button>`
        }
        ${data.currentPage < data.totalPages
          ? `<a href="/approvals?page=${data.currentPage + 1}" class="btn btn-secondary">Next</a>`
          : `<button class="btn btn-secondary" disabled>Next</button>`
        }
      </div>
    </div>
  ` : "";

  const content = `
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Approval Requests</h1>
      </div>

      ${alert}

      <!-- Pending Requests -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Requests (${data.pendingRequests.length})</h2>
        ${data.pendingRequests.length === 0
          ? `<p class="text-gray-500 dark:text-gray-400 py-4">No pending requests</p>`
          : `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                  <th class="py-3 px-2">ID</th>
                  <th class="py-3 px-2">Created By</th>
                  <th class="py-3 px-2">Permission/Action</th>
                  <th class="py-3 px-2">Action Data</th>
                  <th class="py-3 px-2">Status</th>
                  <th class="py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pendingRows}
              </tbody>
            </table>
          </div>
          `
        }
      </div>

      <!-- Processed Requests -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Processed Requests</h2>
        ${data.processedRequests.length === 0
          ? `<p class="text-gray-500 dark:text-gray-400 py-4">No processed requests</p>`
          : `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                  <th class="py-3 px-2">ID</th>
                  <th class="py-3 px-2">Created By</th>
                  <th class="py-3 px-2">Permission/Action</th>
                  <th class="py-3 px-2">Action Data</th>
                  <th class="py-3 px-2">Status</th>
                  <th class="py-3 px-2">Reviewed By</th>
                </tr>
              </thead>
              <tbody>
                ${processedRows}
              </tbody>
            </table>
          </div>
          ${pagination}
          `
        }
      </div>
    </div>

    <!-- Reject Modal -->
    <div id="reject-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reject Request</h3>
        <form method="POST" action="/approvals" id="reject-form">
          <input type="hidden" name="action" value="reject">
          <input type="hidden" name="request_id" id="reject-request-id">
          <div class="mb-4">
            <label class="label">Rejection Reason</label>
            <textarea name="rejection_reason" class="input-field" rows="3" required placeholder="Please provide a reason for rejection"></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button type="button" onclick="hideRejectModal()" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Reject</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      function showRejectModal(requestId) {
        document.getElementById('reject-request-id').value = requestId;
        document.getElementById('reject-modal').classList.remove('hidden');
        document.getElementById('reject-modal').classList.add('flex');
      }

      function hideRejectModal() {
        document.getElementById('reject-modal').classList.add('hidden');
        document.getElementById('reject-modal').classList.remove('flex');
        document.getElementById('reject-form').reset();
      }
    </script>
  `;

  return layout("Approval Requests", content, isAdmin);
}


