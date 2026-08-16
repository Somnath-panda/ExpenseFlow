// Centralized API wrapper for ExpenseFlow Fetch API requests
const API_BASE_URL = 'http://localhost:5000/api';

// Retrieve authorization token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Set authorization token in localStorage
function setToken(token) {
  localStorage.setItem('token', token);
}

// Clear token & user data and redirect to login page
function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Universal fetch wrapper
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    // Handle token expiration or unauthorized access
    if (response.status === 401) {
      const isAuthPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html');
      if (!isAuthPage) {
        logoutUser();
        return;
      }
    }

    if (!response.ok) {
      const error = new Error(data.message || 'An error occurred during API request.');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

// Fetch all category items
async function fetchCategories() {
  const res = await apiRequest('/categories');
  return res.data ? res.data.categories : [];
}
