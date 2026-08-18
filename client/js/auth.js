// Reusable Authentication & Global Navigation Utility for ExpenseFlow

// 1. Session & Token Helpers
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function getUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// 2. Global Page & Route Guard
(function checkRouteAccess() {
  const token = getToken();
  const path = window.location.pathname.toLowerCase();
  
  const isAuthPage = path.endsWith('login.html') || path.endsWith('register.html');
  const isProtectedPage = path.endsWith('dashboard.html') || path.endsWith('expenses.html') || path.endsWith('budget.html');

  // Redirect unauthenticated users from protected pages
  if (!token && isProtectedPage) {
    window.location.href = 'login.html';
    return;
  }

  // Prevent logged-in users from needlessly seeing login/register
  if (token && isAuthPage) {
    window.location.href = 'dashboard.html';
    return;
  }
})();

// 3. Document Lifecycle Controller
document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const path = window.location.pathname.toLowerCase();

  // A. Sync and Fetch User Profile
  if (token) {
    // 1. Initial immediate render from localStorage
    const cachedUser = getUser();
    if (cachedUser) {
      applyUserProfileToDOM(cachedUser);
    }

    // 2. Fresh fetch from backend to ensure data is always accurate
    try {
      if (typeof apiRequest === 'function') {
        const meRes = await apiRequest('/auth/me');
        if (meRes && meRes.success && meRes.data && meRes.data.user) {
          setUser(meRes.data.user);
          applyUserProfileToDOM(meRes.data.user);
        }
      }
    } catch (e) {
      console.warn('Could not refresh profile from /api/auth/me:', e);
    }
  }

  // B. Landing Page (index.html) Navbar Adjustment
  const isLandingPage = path.endsWith('index.html') || path.endsWith('/') || path === '';
  if (isLandingPage) {
    const navRight = document.querySelector('.nav-right');
    const user = getUser();
    if (navRight && token && user) {
      navRight.innerHTML = `
        <button class="theme-toggle-btn" aria-label="Toggle Theme">
          <i class="fa-solid fa-sun"></i>
          <span class="theme-text">Theme</span>
        </button>
        <span style="font-size: 0.88rem; font-weight: 600; color: var(--text-main); margin-right: 0.4rem;">
          Hi, ${escapeHtml(user.name.split(' ')[0])}
        </span>
        <a href="dashboard.html" class="btn btn-primary">Go to Dashboard <i class="fa-solid fa-arrow-right"></i></a>
      `;
    }
  }

  // C. Interactive User Profile Menu & Dropdown Toggle
  initProfileDropdown();

  // D. Responsive Mobile Menu Drawer Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn') || document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop') || document.querySelector('.sidebar-backdrop');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn') || document.querySelector('.sidebar-close-btn');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileSidebar);
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  // E. Global Logout Button Handlers
  const logoutButtons = document.querySelectorAll('#logout-btn, #logoutBtn, .btn-logout');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  });

  // F. Authentication Forms (Login & Register)
  initAuthForms();
});

// Helper to update all user profile elements across the page
function applyUserProfileToDOM(user) {
  if (!user) return;

  const displayName = user.name || 'User Profile';
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const email = user.email || '';

  // Update Topbar Badge
  const nameEls = document.querySelectorAll('#user-display-name, .user-display-name');
  const avatarEls = document.querySelectorAll('#user-avatar, .user-avatar');

  nameEls.forEach(el => {
    el.textContent = displayName;
  });

  avatarEls.forEach(el => {
    el.textContent = initial;
  });

  // Update Dropdown Details
  const dropdownName = document.getElementById('dropdownName');
  const dropdownEmail = document.getElementById('dropdownEmail');
  const dropdownAvatar = document.getElementById('dropdownAvatar');

  if (dropdownName) dropdownName.textContent = displayName;
  if (dropdownEmail) dropdownEmail.textContent = email;
  if (dropdownAvatar) dropdownAvatar.textContent = initial;
}

// User Profile Dropdown Controller
function initProfileDropdown() {
  const userBadge = document.getElementById('userBadge') || document.querySelector('.user-badge');
  const profileDropdown = document.getElementById('profileDropdown') || document.querySelector('.profile-dropdown');

  if (!userBadge || !profileDropdown) return;

  function toggleDropdown(e) {
    e.stopPropagation();
    const isShowing = profileDropdown.classList.contains('show');
    if (isShowing) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    profileDropdown.classList.add('show');
    userBadge.classList.add('open');
    userBadge.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    profileDropdown.classList.remove('show');
    userBadge.classList.remove('open');
    userBadge.setAttribute('aria-expanded', 'false');
  }

  userBadge.addEventListener('click', toggleDropdown);

  userBadge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown(e);
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  // Click outside closes dropdown
  document.addEventListener('click', (e) => {
    if (!userBadge.contains(e.target) && !profileDropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // Escape key closes dropdown
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  });
}

// Auth Form Logic (Login & Registration)
function initAuthForms() {
  const loginForm = document.getElementById('login-form') || document.getElementById('loginForm');
  const registerForm = document.getElementById('register-form') || document.getElementById('registerForm');
  const alertBox = document.getElementById('alert-box') || document.getElementById('alertMessage');

  function showAlert(msg, type = 'danger') {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
  }

  function clearAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  }

  // Registration Form
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const name = document.getElementById('name')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value;

      if (!name || !email || !password) {
        showAlert('Please fill in all fields.', 'danger');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters.', 'danger');
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
      }

      try {
        const response = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password })
        });

        if (response.success && response.data?.token) {
          setToken(response.data.token);
          setUser(response.data.user);
          showAlert('Account created successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 600);
        } else {
          showAlert(response.message || 'Registration failed.', 'danger');
        }
      } catch (err) {
        showAlert(err.message || 'Registration failed. Please try again.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Get Started <i class="fa-solid fa-user-plus"></i>';
        }
      }
    });
  }

  // Login Form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value;

      if (!email || !password) {
        showAlert('Please enter both email and password.', 'danger');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';
      }

      try {
        const response = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (response.success && response.data?.token) {
          setToken(response.data.token);
          setUser(response.data.user);
          showAlert('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 600);
        } else {
          showAlert(response.message || 'Invalid credentials.', 'danger');
        }
      } catch (err) {
        showAlert(err.message || 'Invalid email or password.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In <i class="fa-solid fa-right-to-bracket"></i>';
        }
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
