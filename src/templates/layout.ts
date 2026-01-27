import { navbar, navbarScripts } from "./navbar";

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
  ${username ? `<meta name="username" content="${username}">` : ''}
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
  ${navbar(isAdmin, hasPcPwView, username, hasAuditApprover)}
  
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
      <p class="text-center text-gray-500 dark:text-gray-400 text-sm transition-colors">ITEM - IT Equipment Management</p>
    </div>
  </footer>

${navbarScripts()}
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
</body>
</html>`;
}
