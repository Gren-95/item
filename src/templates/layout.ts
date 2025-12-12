export function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Equipment Audit</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" href="/icons/icon.png" type="image/png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#2563eb">
</head>
<body class="bg-gray-50 min-h-screen">
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center space-x-3 relative">
          <div class="flex items-center">
            <button id="menu-toggle" class="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none" aria-label="Toggle navigation">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div id="nav-links" class="hidden flex-col absolute left-0 top-12 bg-white shadow-lg rounded-lg border border-gray-200 p-3 space-y-2 min-w-[160px] z-50">
              <a href="/" class="block text-gray-600 hover:text-gray-900 font-medium">Search</a>
              <a href="/locations" class="block text-gray-600 hover:text-gray-900 font-medium">Locations</a>
            </div>
          </div>
          <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <a href="/" class="text-xl font-bold text-gray-900">Equipment Audit</a>
        </div>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>
  
  <footer class="border-t border-gray-200 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <p class="text-center text-gray-500 text-sm">Equipment Audit System</p>
    </div>
  </footer>

<script>
  const toggle = document.getElementById('menu-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('hidden');
    });
  }
</script>
</body>
</html>`;
}
