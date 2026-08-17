// Authentication Logic for ExpenseFlow (Login & Registration)

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form') || document.getElementById('loginForm');
  const registerForm = document.getElementById('register-form') || document.getElementById('registerForm');
  const alertContainer = document.getElementById('alert-box') || document.getElementById('alertMessage');

  // Check if user is already logged in on login/register pages
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('token');
  const isAuthPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html');
  
  if (token && isAuthPage) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Helper to display error or success messages
  function showAlert(message, type = 'danger') {
    if (!alertContainer) return;
    alertContainer.textContent = message;
    alertContainer.className = `alert alert-${type}`;
    alertContainer.classList.remove('hidden');
    alertContainer.style.display = 'block';
  }

  // Helper to hide alert messages
  function clearAlert() {
    if (!alertContainer) return;
    alertContainer.classList.add('hidden');
    alertContainer.style.display = 'none';
    alertContainer.textContent = '';
  }

  // Handle Registration Form Submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!name || !email || !password) {
        showAlert('Please fill in all required fields.', 'danger');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.', 'danger');
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
      }

      try {
        const response = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password })
        });

        if (response.success && response.data && response.data.token) {
          setToken(response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          showAlert('Registration successful! Redirecting to dashboard...', 'success');

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        } else {
          showAlert(response.message || 'Registration failed.', 'danger');
        }
      } catch (error) {
        showAlert(error.message || 'Registration failed. Please try again.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Get Started <i class="fa-solid fa-user-plus"></i>';
        }
      }
    });
  }

  // Handle Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

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

        if (response.success && response.data && response.data.token) {
          setToken(response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          showAlert('Login successful! Redirecting to dashboard...', 'success');

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        } else {
          showAlert(response.message || 'Invalid email or password.', 'danger');
        }
      } catch (error) {
        showAlert(error.message || 'Invalid email or password.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In <i class="fa-solid fa-right-to-bracket"></i>';
        }
      }
    });
  }

  // Setup Logout Button Handler if present
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
});
