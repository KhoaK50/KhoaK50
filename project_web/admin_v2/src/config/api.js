// Centralized API configuration for Vectoria Admin
function resolveApiBaseUrl() {
  const isBrowser = typeof window !== 'undefined' && Boolean(window.location);
  const isLocal = isBrowser && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname === '0.0.0.0');

  // If in browser and NOT local (e.g. deployed on Render, Vercel, or custom domain):
  if (isBrowser && !isLocal) {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    // If envUrl is explicitly set to a remote domain, use it; otherwise ignore localhost leak
    if (envUrl && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
      return envUrl;
    }
    return 'https://visualization-rr5v.onrender.com';
  }

  // Local development mode
  return import.meta.env.VITE_API_BASE_URL || 
         import.meta.env.VITE_API_URL || 
         'http://127.0.0.1:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Checks whether a JWT token is structurally valid and not expired.
 */
export function isTokenValid(token) {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      // Allow non-JWT tokens (e.g. Master Key fallback)
      return true;
    }
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false; // Token has expired
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Enhanced fetch wrapper for admin requests.
 * Automatically attaches Authorization header and triggers session cleanup on 401 Unauthorized.
 */
export async function authFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('adminAuth');
  
  const headers = {
    ...(options.headers || {})
  };
  
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminUsername');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
    }
  }
  
  return response;
}

export default API_BASE_URL;
