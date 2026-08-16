// Auth logic handling Login and Registration forms

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const alertContainer = document.getElementById('alertMessage');

  // Helper to show alert banner
  function showAlert(message, type = 'error') {
    if (!alertContainer) return;
    alertContainer.textContent = message;
    alertContainer.className = `alert-box ${type}`;
    alertContainer.style.display = 'block';
  }

  // Helper to clear alert banner
  function clearAlert() {
    if (!alertContainer) return;
    alertContainer.style.display = 'none';
    alertContainer.textContent = '';
  }

  // Handle Registration Form Submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!name || !email || !password) {
        showAlert('Please fill in all fields.');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.');
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) submitBtn.disabled = true;

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
          }, 1000);
        }
      } catch (error) {
        showAlert(error.message || 'Registration failed. Please try again.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Handle Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showAlert('Please enter both email and password.');
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) submitBtn.disabled = true;

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
          }, 1000);
        }
      } catch (error) {
        showAlert(error.message || 'Invalid email or password.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
