// ExpenseFlow Theme Switcher & Page Transition Controller

(function () {
  // Apply saved theme immediately before DOM renders to prevent white/dark flash
  const savedTheme = localStorage.getItem('expenseflow_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark');
  
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
  // Animate main content and page entrance softly
  const mainContent = document.querySelector('.main-content');
  const authCard = document.querySelector('.auth-card');
  
  if (mainContent) {
    mainContent.classList.add('content-fade-in');
  } else if (authCard) {
    authCard.classList.add('content-fade-in');
  } else {
    document.body.classList.add('page-fade-in');
  }

  // Initialize theme toggle buttons across all pages
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  
  const updateThemeUI = (theme) => {
    themeToggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      const text = btn.querySelector('.theme-text');
      if (theme === 'dark') {
        if (icon) icon.className = 'fa-solid fa-sun';
        if (text) text.textContent = 'Light Mode';
        btn.setAttribute('title', 'Switch to Light Mode');
      } else {
        if (icon) icon.className = 'fa-solid fa-moon';
        if (text) text.textContent = 'Dark Mode';
        btn.setAttribute('title', 'Switch to Dark Mode');
      }
    });
  };

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  updateThemeUI(currentTheme);

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const activeTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('expenseflow_theme', newTheme);
      updateThemeUI(newTheme);

      // Trigger custom event so Chart.js and components update color palette
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    });
  });

  // Smooth Tab/Link Navigation Transition
  const internalLinks = document.querySelectorAll('a[href$=".html"]');
  internalLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('href');
      // Ignore external or anchor links
      if (!targetUrl || targetUrl.startsWith('#') || targetUrl.startsWith('http')) return;
      
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      if (targetUrl === currentPath) return;

      e.preventDefault();

      // Immediate tactile feedback on sidebar links
      if (link.classList.contains('nav-item')) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        link.classList.add('active');
      }

      // Smooth content exit transition
      const targetContainer = document.querySelector('.main-content') || document.querySelector('.auth-card') || document.body;
      targetContainer.classList.add('content-fade-out');

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 160);
    });
  });
});
