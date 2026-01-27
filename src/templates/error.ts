import { layout } from "./layout";

/**
 * Error page template for displaying access denied and other errors
 */
export function errorPage(
  title: string = "Access Denied",
  message: string,
  details: string | null = null,
  statusCode: number = 403,
  isAdmin: boolean = false,
  hasPcPwView: boolean = false,
  username: string | null = null,
  hasAuditApprover: boolean = false
): string {
  const statusMessages: Record<number, string> = {
    403: "Access Denied",
    404: "Not Found",
    500: "Server Error",
  };

  const pageTitle = statusMessages[statusCode] || title;
  const iconColor = statusCode === 403 
    ? "text-red-600 dark:text-red-400" 
    : statusCode === 404
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400";
  
  const bgColor = statusCode === 403
    ? "bg-red-100 dark:bg-red-900/30"
    : statusCode === 404
    ? "bg-yellow-100 dark:bg-yellow-900/30"
    : "bg-red-100 dark:bg-red-900/30";

  const content = `
    <div class="max-w-2xl mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        <div class="px-6 py-12 text-center">
          <div class="w-20 h-20 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${statusCode === 403 
                ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>`
                : statusCode === 404
                ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`
                : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`
              }
            </svg>
          </div>
          
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">${escapeHtml(pageTitle)}</h1>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">${escapeHtml(message)}</p>
          
          ${details 
            ? `<div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(details)}</p>
              </div>`
            : ''
          }
          
          <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a 
              href="/" 
              class="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Go to Home
            </a>
            <button 
              onclick="window.history.back()" 
              class="inline-flex items-center justify-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Go Back
            </button>
          </div>
          
          ${statusCode === 403 
            ? `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  If you believe you should have access to this page, please contact your administrator.
                </p>
              </div>`
            : ''
          }
        </div>
      </div>
    </div>
  `;

  return layout(pageTitle, content, isAdmin, hasPcPwView, username, hasAuditApprover);
}

function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}
