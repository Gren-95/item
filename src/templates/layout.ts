export function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - IT Equipment Management</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" href="/icons/favicon.ico" type="image/x-icon">
  <link rel="icon" href="/icons/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/icons/favicon-16x16.png" type="image/png" sizes="16x16">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
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
    })();
  </script>
</head>
<body class="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
  <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center space-x-3 relative">
          <div class="flex items-center">
            <button id="menu-toggle" class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors" aria-label="Toggle navigation">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div id="nav-links" class="hidden flex-col absolute left-0 top-12 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 min-w-[160px] z-50 transition-colors">
              <a href="/" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Search</a>
              <a href="/locations" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Locations</a>
              <a href="/types" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Configurations</a>
              <a href="/vendors" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Providers</a>
              <a href="/write-off-reasons" class="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Edit Write-Off Reasons</a>
            </div>
          </div>
          <div class="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <a href="/" class="text-xl font-bold text-gray-900 dark:text-white transition-colors">IT Equipment Management</a>
        </div>
        <button id="theme-toggle" class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors" aria-label="Toggle dark mode">
          <svg id="theme-icon-light" class="w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <svg id="theme-icon-dark" class="w-6 h-6 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
          </svg>
        </button>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>
  
  <!-- Connectivity Status Modal -->
  <div id="connection-modal" class="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 hidden items-center justify-center z-50 px-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 5a7 7 0 00-7 7v1a7 7 0 007 7 7 7 0 007-7v-1a7 7 0 00-7-7z"/>
          </svg>
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
      <p class="text-center text-gray-500 dark:text-gray-400 text-sm transition-colors">Equipment Audit System</p>
    </div>
  </footer>

<script>
  (function() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('hidden');
      });
    }

    const themeToggle = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
          html.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          html.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
      });
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });

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
</body>
</html>`;
}
