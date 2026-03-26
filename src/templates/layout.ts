import { navbar, navbarScripts } from "./navbar";
import { EXCLAMATION_CIRCLE_ICON } from "./icons";
import { escapeHtml } from "./components";
import { APP_VERSION } from "../utils/version";
import { clientDateScript } from "../utils/date";

/**
 * Minimal layout without navbar - for login page
 */
export function minimalLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - IT Equipment Management</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" href="/icons/favicon.ico" type="image/x-icon">
  <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/icons/favicon-96x96.png" type="image/png" sizes="96x96">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)">
  <script>
    (function() {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = stored || (prefersDark ? 'dark' : 'light');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      var tz = localStorage.getItem('textZoom');
      if (tz) {
        var size = parseInt(tz, 10);
        if (!isNaN(size) && size >= 12 && size <= 24) {
          document.documentElement.style.fontSize = size + 'px';
        }
      }
    })();
  </script>
</head>
<body class="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
  <main class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>

  <footer class="border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <p class="text-center text-gray-500 dark:text-gray-400 text-sm transition-colors">ITEM - IT Equipment Management <span class="text-gray-400 dark:text-gray-500">v${APP_VERSION}</span></p>
    </div>
  </footer>
</body>
</html>`;
}

export function layout(title: string, content: string, isAdmin: boolean = false, hasPcPwView: boolean = false, username: string | null = null, hasAuditApprover: boolean = false): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - IT Equipment Management</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" href="/icons/favicon.ico" type="image/x-icon">
  <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/icons/favicon-96x96.png" type="image/png" sizes="96x96">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)">
  ${username ? `<meta name="username" content="${escapeHtml(username)}">` : ''}
  <script>
    (function() {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = stored || (prefersDark ? 'dark' : 'light');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      var tz = localStorage.getItem('textZoom');
      if (tz) {
        var size = parseInt(tz, 10);
        if (!isNaN(size) && size >= 12 && size <= 24) {
          document.documentElement.style.fontSize = size + 'px';
        }
      }
    })();
  </script>
</head>
<body class="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
  ${navbar(isAdmin, hasPcPwView, username, hasAuditApprover)}
  
  <main class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>
  
  <!-- Connectivity Status Modal -->
  <div id="connection-modal" class="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 hidden items-center justify-center z-50 px-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-300">
          ${EXCLAMATION_CIRCLE_ICON.replace('w-5 h-5', 'w-6 h-6')}
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Connection lost</h2>
          <p id="connection-modal-text" class="text-sm text-gray-600 dark:text-gray-300">Unable to reach the server right now.</p>
        </div>
      </div>
      <p id="connection-modal-detail" class="text-xs text-gray-500 dark:text-gray-400 mb-4">We will keep trying in the background.</p>
      <div class="flex justify-end gap-2">
        <button id="connection-retry" class="btn btn-primary">Retry now</button>
      </div>
    </div>
  </div>

  <footer class="border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <p class="text-center text-gray-500 dark:text-gray-400 text-sm transition-colors">ITEM - IT Equipment Management <span class="text-gray-400 dark:text-gray-500">v${APP_VERSION}</span></p>
    </div>
  </footer>

${navbarScripts()}
<script>${clientDateScript()}</script>
<script>
  (function() {

    // Connectivity watchdog
    const connectionModal = document.getElementById('connection-modal');
    const connectionText = document.getElementById('connection-modal-text');
    const connectionDetail = document.getElementById('connection-modal-detail');
    const connectionRetry = document.getElementById('connection-retry');
    const CHECK_URLS = ['/health', '/'];
    const CHECK_INTERVAL = 15000; // 15s cadence
    const CHECK_TIMEOUT = 5000; // abort slow checks
    let checking = false;

    function showConnectionModal(title, detail) {
      if (connectionText) connectionText.textContent = title;
      if (connectionDetail) connectionDetail.textContent = detail;
      if (connectionModal) {
        connectionModal.classList.remove('hidden');
        connectionModal.classList.add('flex');
      }
    }

    function hideConnectionModal() {
      if (connectionModal) {
        connectionModal.classList.add('hidden');
        connectionModal.classList.remove('flex');
      }
    }

    async function pingServer(manual = false) {
      if (checking) return;
      checking = true;
      let lastError = 'Unknown error';

      try {
        for (const url of CHECK_URLS) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
          try {
            const response = await fetch(url, {
              method: 'GET',
              cache: 'no-store',
              signal: controller.signal
            });

            if (!response.ok) {
              throw new Error('Status ' + response.status);
            }

            hideConnectionModal();
            return;
          } catch (err) {
            lastError = err?.name === 'AbortError' ? 'The check timed out.' : (err?.message || 'Unknown error');
          } finally {
            clearTimeout(timeoutId);
          }
        }
      } catch (err) {
      } finally {
        checking = false;
      }

      showConnectionModal(
        'Unable to reach the server',
        manual ? lastError : lastError + ' Retrying automatically...'
      );
    }

    // Run immediately and then on an interval
    pingServer();
    const intervalId = setInterval(pingServer, CHECK_INTERVAL);

    // Retry button
    if (connectionRetry) {
      connectionRetry.addEventListener('click', () => pingServer(true));
    }

    // React to browser online/offline events
    window.addEventListener('online', () => pingServer(true));
    window.addEventListener('offline', () => {
      showConnectionModal('No internet connection', 'You are offline. We will retry once you are back online.');
    });

    // Clean up when the page is unloaded
    window.addEventListener('beforeunload', () => clearInterval(intervalId));
  })();
</script>
<script>
  // Global search autocomplete
  (function() {
    const searchInput = document.getElementById('global-search');
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (!searchInput || !suggestionsContainer) return;

    // User permissions (injected from server)
    const USER_PERMISSIONS = {
      isAdmin: ${isAdmin},
      hasPcPwView: ${hasPcPwView}
    };

    let debounceTimer;
    let currentQuery = '';

    // Navigation tabs that can be searched (with permission requirements)
    const ALL_NAV_TABS = [
      { name: 'Search Equipment', url: '/', keywords: ['search', 'equipment', 'home', 'find'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Locations', url: '/locations', keywords: ['locations', 'location', 'sites', 'plants'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Configurations', url: '/types', keywords: ['configurations', 'config', 'types', 'settings'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Providers', url: '/vendors', keywords: ['providers', 'vendors', 'suppliers'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Write-Off Reasons', url: '/write-off-reasons', keywords: ['write-off', 'writeoff', 'disposal', 'reasons'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Repair Tracking', url: '/repairs', keywords: ['repair', 'repairs', 'fix', 'maintenance'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Audit', url: '/inventory-audit', keywords: ['inventory', 'audit', 'stock'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Printing', url: '/labels', keywords: ['printer', 'labels', 'print', 'tags', 'service tag', 'barcode', 'pc', 'passwords'], requiresAdmin: false, requiresPcPw: false },
      { name: 'Change Password', url: '/change-password', keywords: ['change', 'password', 'account'], requiresAdmin: false, requiresPcPw: false },
      { name: 'User Permissions', url: '/permissions', keywords: ['permissions', 'users', 'access', 'admin'], requiresAdmin: true, requiresPcPw: false },
      { name: 'Add Equipment', url: '/add', keywords: ['add', 'new', 'create', 'equipment'], requiresAdmin: false, requiresPcPw: false }
    ];

    // Filter tabs based on user permissions
    const NAV_TABS = ALL_NAV_TABS.filter(tab => {
      if (tab.requiresAdmin && !USER_PERMISSIONS.isAdmin) return false;
      if (tab.requiresPcPw && !USER_PERMISSIONS.hasPcPwView) return false;
      return true;
    });

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function hideSuggestions() {
      suggestionsContainer.classList.add('hidden');
      suggestionsContainer.innerHTML = '';
    }

    function findMatchingTabs(query) {
      const lowerQuery = query.toLowerCase();

      // Show all available tabs when typing "tabs", "pages", "menu", or "nav"
      if (['tabs', 'pages', 'menu', 'nav', 'navigation', 'all'].some(kw => kw.startsWith(lowerQuery) || lowerQuery.startsWith(kw))) {
        return NAV_TABS;
      }

      return NAV_TABS.filter(tab =>
        tab.name.toLowerCase().includes(lowerQuery) ||
        tab.keywords.some(kw => kw.includes(lowerQuery))
      ).slice(0, 5);
    }

    function renderTabSuggestion(tab) {
      return '<a href="' + tab.url + '" class="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors">' +
        '<div class="flex items-center justify-between">' +
          '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(tab.name) + '</span>' +
          '<span class="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">Page</span>' +
        '</div>' +
        '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Go to ' + tab.url + '</div>' +
      '</a>';
    }

    function renderEquipmentSuggestion(item) {
      return '<a href="/edit/' + item.id + '" class="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors">' +
        '<div class="flex items-center justify-between">' +
          '<span class="font-mono text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(item.service_tag) + '</span>' +
          '<span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">' + escapeHtml(item.type_name || 'Unknown') + '</span>' +
        '</div>' +
        '<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">' +
          (item.assigned_to_name ? escapeHtml(item.assigned_to_name) : '<span class="italic">Unassigned</span>') +
          (item.model_name ? ' &bull; ' + escapeHtml(item.model_name) : '') +
        '</div>' +
      '</a>';
    }

    function showSuggestions(equipmentResults, tabResults) {
      if (equipmentResults.length === 0 && tabResults.length === 0) {
        suggestionsContainer.innerHTML = '<div class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No results found</div>';
      } else {
        let html = '';

        // Show tab suggestions first
        if (tabResults.length > 0) {
          html += tabResults.map(renderTabSuggestion).join('');
        }

        // Then equipment results
        if (equipmentResults.length > 0) {
          html += equipmentResults.map(renderEquipmentSuggestion).join('');
        }

        suggestionsContainer.innerHTML = html;
      }
      suggestionsContainer.classList.remove('hidden');
    }

    async function fetchSuggestions(query) {
      if (query.length < 2) {
        hideSuggestions();
        return;
      }

      // Find matching tabs immediately
      const tabResults = findMatchingTabs(query);

      try {
        const response = await fetch('/api/search-suggestions?q=' + encodeURIComponent(query));
        if (!response.ok) throw new Error('Search failed');
        const equipmentResults = await response.json();
        if (query === currentQuery) {
          showSuggestions(equipmentResults, tabResults);
        }
      } catch (err) {
        console.error('Search error:', err);
        // Still show tab results even if equipment search fails
        if (tabResults.length > 0) {
          showSuggestions([], tabResults);
        } else {
          hideSuggestions();
        }
      }
    }

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      currentQuery = query;

      clearTimeout(debounceTimer);
      if (query.length < 2) {
        hideSuggestions();
        return;
      }

      debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
    });

    // Handle Enter key - go to main search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = '/?q=' + encodeURIComponent(query);
        }
      } else if (e.key === 'Escape') {
        hideSuggestions();
        searchInput.blur();
      }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        hideSuggestions();
      }
    });

    // Show suggestions again when focusing
    searchInput.addEventListener('focus', () => {
      if (currentQuery.length >= 2) {
        fetchSuggestions(currentQuery);
      }
    });
  })();
</script>
</body>
</html>`;
}
