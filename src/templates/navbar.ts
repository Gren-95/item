import { navigationMenu } from "./navigation";
import { BARS_3_ICON, SEARCH_ICON } from "./icons";

/**
 * Unified navbar component
 * Returns the complete navbar HTML with menu, logo, logout, and theme toggle
 * Includes all necessary JavaScript for interactivity
 */
export function navbar(
  isAdmin: boolean = false,
  hasPcPwView: boolean = false,
  username: string | null = null,
  hasAuditApprover: boolean = false
): string {
  return `
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div class="w-full px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center space-x-4 relative">
            <button id="menu-toggle" class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors" aria-label="Toggle navigation">
              ${BARS_3_ICON.replace('w-5 h-5', 'w-6 h-6')}
            </button>
            ${navigationMenu(isAdmin, hasPcPwView, hasAuditApprover, username)}
          </div>
          <!-- Global Search Bar -->
          <div class="flex-1 max-w-md mx-2 sm:mx-4 relative">
            <div class="relative">
              <input
                type="text"
                id="global-search"
                placeholder="Search..."
                autocomplete="off"
                class="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-1.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
              />
              <div class="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                ${SEARCH_ICON.replace('w-5 h-5', 'w-4 h-4').replace('text-current', 'text-gray-500 dark:text-gray-400')}
              </div>
            </div>
            <div id="search-suggestions" class="hidden absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              <!-- Suggestions injected here -->
            </div>
          </div>
          <!-- Empty div to balance flex layout on larger screens -->
          <div class="hidden sm:block w-10"></div>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Navbar JavaScript functionality
 * Returns the JavaScript code for navbar interactions (menu toggle, theme toggle, logout)
 */
export function navbarScripts(): string {
  return `
    <script>
      (function() {
        // Menu toggle functionality
        const menuToggle = document.getElementById('menu-toggle');
        const navLinks = document.getElementById('nav-links');
        if (menuToggle && navLinks) {
          menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('hidden');
          });

          // Close menu when clicking outside
          document.addEventListener('click', (e) => {
            const target = e.target;
            if (target && !menuToggle.contains(target) && !navLinks.contains(target)) {
              navLinks.classList.add('hidden');
            }
          });

          // Close menu on Escape key
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !navLinks.classList.contains('hidden')) {
              navLinks.classList.add('hidden');
            }
          });
        }

        // Three-state theme toggle functionality
        const themeButtons = document.querySelectorAll('.theme-btn');
        const ACTIVE_CLASSES = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm';
        const INACTIVE_CLASSES = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';

        function applyTheme(theme) {
          const html = document.documentElement;
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

          if (theme === 'system') {
            localStorage.removeItem('theme');
            if (prefersDark) {
              html.classList.add('dark');
            } else {
              html.classList.remove('dark');
            }
          } else if (theme === 'dark') {
            localStorage.setItem('theme', 'dark');
            html.classList.add('dark');
          } else {
            localStorage.setItem('theme', 'light');
            html.classList.remove('dark');
          }
        }

        function updateThemeButtons(activeTheme) {
          themeButtons.forEach(btn => {
            const btnTheme = btn.getAttribute('data-theme');
            // Remove all classes first
            ACTIVE_CLASSES.split(' ').forEach(c => btn.classList.remove(c));
            INACTIVE_CLASSES.split(' ').forEach(c => btn.classList.remove(c));

            if (btnTheme === activeTheme) {
              ACTIVE_CLASSES.split(' ').forEach(c => btn.classList.add(c));
            } else {
              INACTIVE_CLASSES.split(' ').forEach(c => btn.classList.add(c));
            }
          });
        }

        // Initialize theme buttons state
        function getCurrentTheme() {
          const stored = localStorage.getItem('theme');
          if (stored === 'dark') return 'dark';
          if (stored === 'light') return 'light';
          return 'system';
        }

        if (themeButtons.length > 0) {
          updateThemeButtons(getCurrentTheme());

          themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
              const theme = btn.getAttribute('data-theme');
              applyTheme(theme);
              updateThemeButtons(theme);
            });
          });
        }

        // Listen for system theme changes (only applies when theme is 'system')
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem('theme')) {
            if (e.matches) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        });

        // Text zoom control
        const ZOOM_STEP = 2;
        const ZOOM_MIN = 12;
        const ZOOM_MAX = 24;
        const ZOOM_DEFAULT = 16;

        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');

        function getTextZoom() {
          const stored = localStorage.getItem('textZoom');
          if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed) && parsed >= ZOOM_MIN && parsed <= ZOOM_MAX) {
              return parsed;
            }
          }
          return ZOOM_DEFAULT;
        }

        function applyTextZoom(size) {
          document.documentElement.style.fontSize = size + 'px';
          if (size === ZOOM_DEFAULT) {
            localStorage.removeItem('textZoom');
            document.documentElement.style.fontSize = '';
          } else {
            localStorage.setItem('textZoom', String(size));
          }
        }

        if (zoomInBtn) {
          zoomInBtn.addEventListener('click', function() {
            const current = getTextZoom();
            const next = Math.min(current + ZOOM_STEP, ZOOM_MAX);
            applyTextZoom(next);
          });
        }

        if (zoomOutBtn) {
          zoomOutBtn.addEventListener('click', function() {
            const current = getTextZoom();
            const next = Math.max(current - ZOOM_STEP, ZOOM_MIN);
            applyTextZoom(next);
          });
        }

        if (zoomResetBtn) {
          zoomResetBtn.addEventListener('click', function() {
            applyTextZoom(ZOOM_DEFAULT);
          });
        }

        // Management section toggle
        const mgmtToggle = document.getElementById('management-toggle');
        const mgmtLinks = document.getElementById('management-links');
        const mgmtChevron = document.getElementById('management-chevron');

        if (mgmtToggle && mgmtLinks && mgmtChevron) {
          // Restore saved state
          const mgmtExpanded = localStorage.getItem('managementExpanded') === 'true';
          if (mgmtExpanded) {
            mgmtLinks.classList.remove('hidden');
            mgmtChevron.style.transform = 'rotate(180deg)';
            mgmtToggle.setAttribute('aria-expanded', 'true');
          }

          mgmtToggle.addEventListener('click', function() {
            const isHidden = mgmtLinks.classList.contains('hidden');
            if (isHidden) {
              mgmtLinks.classList.remove('hidden');
              mgmtChevron.style.transform = 'rotate(180deg)';
              mgmtToggle.setAttribute('aria-expanded', 'true');
              localStorage.setItem('managementExpanded', 'true');
            } else {
              mgmtLinks.classList.add('hidden');
              mgmtChevron.style.transform = '';
              mgmtToggle.setAttribute('aria-expanded', 'false');
              localStorage.setItem('managementExpanded', 'false');
            }
          });
        }

        // Logout confirmation with username
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const usernameMeta = document.querySelector('meta[name="username"]');
            const username = usernameMeta ? usernameMeta.getAttribute('content') : (this.getAttribute('data-username') || 'user');
            if (confirm('Are you sure you want to sign out, ' + username + '?')) {
              window.location.href = '/logout';
            }
          });
        }
      })();
    </script>
  `;
}
