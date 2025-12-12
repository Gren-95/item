import { layout } from "./layout";

interface SearchResult {
  id: number;
  service_tag: string;
  type_name: string | null;
  model_name: string | null;
  vendor_name: string | null;
  assigned_to_name: string | null;
  location: string | null;
}

export function searchPage(
  query: string = "",
  results: SearchResult[] | null = null,
  error: string | null = null
): string {
  const content = `
    <div class="max-w-4xl mx-auto">
      <div class="card mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Equipment Search</h1>
        
        <form action="/" method="GET" class="flex gap-4">
          <div class="flex-1">
            <label for="serial" class="label">Serial Number / Service Tag</label>
            <input 
              type="text" 
              id="serial" 
              name="serial" 
              value="${escapeHtml(query)}"
              placeholder="Enter serial number..."
              class="input-field"
              autofocus
            >
          </div>
          <div class="flex items-end">
            <button type="submit" class="btn btn-primary">
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Search
              </span>
            </button>
          </div>
        </form>
      </div>

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

      ${results !== null ? `
        <div class="card">
          <div class="text-center py-8">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-gray-500 mb-4">No equipment found matching "${escapeHtml(query)}"</p>
            <a href="/add?serial=${encodeURIComponent(query)}" class="btn btn-primary inline-flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add New Equipment
            </a>
          </div>
        </div>
      ` : `
        <div class="text-center py-12">
          <svg class="w-24 h-24 text-gray-200 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h2 class="text-xl font-semibold text-gray-700 mb-2">Start an Equipment Audit</h2>
          <p class="text-gray-500">Enter a serial number above to search for equipment</p>
        </div>
      `}
    </div>
  `;

  return layout("Search", content);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
