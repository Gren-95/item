import { layout } from "./layout";
import { LOCK_ICON, EMOJI_SAD_ICON, EXCLAMATION_CIRCLE_ICON, HOME_ICON, ARROW_LEFT_ICON } from "./icons";

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
            ${statusCode === 403
              ? LOCK_ICON.replace('w-5 h-5', 'w-10 h-10').replace('text-current', iconColor)
              : statusCode === 404
              ? EMOJI_SAD_ICON.replace('w-5 h-5', 'w-10 h-10').replace('text-current', iconColor)
              : EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-10 h-10').replace('text-current', iconColor)
            }
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
              <span class="mr-2">${HOME_ICON}</span>
              Go to Home
            </a>
            <button
              onclick="window.history.back()"
              class="inline-flex items-center justify-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <span class="mr-2">${ARROW_LEFT_ICON}</span>
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
