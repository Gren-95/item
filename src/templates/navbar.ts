import { navigationMenu } from "./navigation";

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
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            ${navigationMenu(isAdmin, hasPcPwView, hasAuditApprover)}
            <div class="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
            <a href="/" class="text-xl font-semibold text-gray-900 dark:text-white transition-colors hover:text-blue-600 dark:hover:text-blue-400">
              ITEM
            </a>
          </div>
          <div class="flex items-center gap-2">
            <button 
              id="logout-btn" 
              class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors" 
              aria-label="Logout" 
              title="Logout"
              ${username ? `data-username="${username}"` : ''}
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
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
          menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('hidden');
          });
          
          // Close menu when clicking outside
          document.addEventListener('click', (e) => {
            const target = e.target;
            if (target && !menuToggle.contains(target) && !navLinks.contains(target)) {
              navLinks.classList.add('hidden');
            }
          });
        }

        // Theme toggle functionality
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

        // Logout confirmation with username
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Get username from meta tag or data attribute
            const usernameMeta = document.querySelector('meta[name="username"]');
            const username = usernameMeta ? usernameMeta.getAttribute('content') : (this.getAttribute('data-username') || 'user');
            if (confirm('Are you sure you want to log out, ' + username + '?')) {
              window.location.href = '/logout';
            }
          });
        }
      })();
    </script>
  `;
}
