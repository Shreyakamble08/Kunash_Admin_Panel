/* ==========================================================================
   DASHBOARD.JS - Integrated with Login System
   ========================================================================== */

(function () {

  'use strict';

  // ==========================================
  // API CONFIGURATION
  // ==========================================

  const API = {
    base: 'http://localhost:8080/api',
    endpoints: {
      contacts: '/contact/admin/all',
      recentApplications: '/admin/applications/recent',
      positionStats: '/admin/applications/stats/by-position',
      resume: '/admin/applications'
    }
  };

  // ==========================================
  // TOKEN MANAGEMENT - MATCHES LOGIN.HTML
  // ==========================================

  function getAuthToken() {
    // Try to get token from localStorage (same as login.html uses)
    let token = localStorage.getItem('adminToken');

    // If not found, try other common keys
    if (!token) {
      token = sessionStorage.getItem('adminToken') ||
        localStorage.getItem('jwtToken') ||
        sessionStorage.getItem('jwtToken') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');
    }

    // If still no token, try to get it from a cookie
    if (!token) {
      const cookieMatch = document.cookie.match(/adminToken=([^;]+)/);
      if (cookieMatch) {
        token = cookieMatch[1];
      }
    }

    return token;
  }

  // ==========================================
  // API CALL WITH AUTHENTICATION
  // ==========================================

  async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();

    if (!token) {
      console.warn('No token found! Redirecting to login...');
      window.location.href = '../login/login.html';
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...options.headers
    };

    console.log('API Call: ' + API.base + endpoint);
    console.log('Token: ' + token.substring(0, 20) + '...');

    try {
      const response = await fetch(API.base + endpoint, {
        ...options,
        headers: headers
      });

      // If 403/401, redirect to login
      if (response.status === 403 || response.status === 401) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '../login/login.html';
        throw new Error('Authentication failed. Please login again.');
      }

      if (!response.ok) {
        throw new Error('API Error: ' + response.status + ' ' + response.statusText);
      }

      return response.json();

    } catch (error) {
      console.error('API Call Error:', error);
      throw error;
    }
  }

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  // 1. RENDER RECENT ENQUIRIES TABLE
  async function renderEnquiriesTable() {
    const tableBody = document.getElementById('enquiriesTableBody');
    if (!tableBody) {
      console.warn('enquiriesTableBody not found');
      return;
    }

    try {
      // Show loading
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-white/60">
            <div class="flex justify-center items-center gap-2">
              <svg class="animate-spin h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading enquiries...
            </div>
          </td>
        </tr>
      `;

      const response = await apiCall(API.endpoints.contacts);

      if (response && response.success && response.data) {
        const contacts = response.data;

        if (contacts.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center py-8 text-white/60">
                No enquiries found
              </td>
            </tr>
          `;
          return;
        }

        let rows = '';
        const displayCount = Math.min(contacts.length, 5);
        for (let i = 0; i < displayCount; i++) {
          const contact = contacts[i];
          rows += `
            <tr class="hover:bg-white/5 transition-colors">
              <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-medium">
                    ${getInitials(contact.name)}
                  </div>
                  <span class="text-white/90 font-medium">${escapeHtml(contact.name)}</span>
                </div>
              </td>
              <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap text-white/70">
                ${escapeHtml(contact.phone)}
              </td>
              <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap text-white/70">
                ${escapeHtml(contact.email)}
              </td>
              <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap text-white/70">
                ${escapeHtml(contact.subject)}
              </td>
              <td class="px-2.5 py-2.5 border-b border-orange-500/10 whitespace-nowrap text-white/70 max-w-[200px] truncate">
                ${escapeHtml(contact.message)}
              </td>
            </tr>
          `;
        }
        tableBody.innerHTML = rows;

      } else {
        throw new Error('Failed to load enquiries');
      }

    } catch (error) {
      console.error('Error loading enquiries:', error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-red-400">
            Failed to load enquiries. Please try again.
          </td>
        </tr>
      `;
    }
  }

  // 2. RENDER RECENT APPLICATIONS
  async function renderRecentApplications() {
    const container = document.querySelector('#recentApplications .space-y-1');
    if (!container) {
      console.warn('Recent applications container not found');
      return;
    }

    try {
      container.innerHTML = `
        <div class="flex justify-center items-center py-4 text-white/60">
          <svg class="animate-spin h-5 w-5 text-orange-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading applications...
        </div>
      `;

      const response = await apiCall(API.endpoints.recentApplications);

      if (response && response.success && response.data) {
        const applications = response.data;

        if (applications.length === 0) {
          container.innerHTML = `
            <div class="text-center py-4 text-white/40 text-sm">
              No recent applications
            </div>
          `;
          return;
        }

        let html = '';
        for (let i = 0; i < applications.length; i++) {
          const app = applications[i];
          html += `
            <div class="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  ${getInitials(app.name)}
                </div>
                <div class="min-w-0">
                  <div class="text-white/90 font-medium text-sm truncate">${escapeHtml(app.name)}</div>
                  <div class="text-white/40 text-[11px] truncate">${escapeHtml(app.email)}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-[10px] px-2 py-0.5 rounded-full ${getStatusBadgeClass(app.status)}">
                  ${escapeHtml(app.status || 'new')}
                </span>
                <span class="text-white/30 text-[10px]">${formatDate(app.appliedAt)}</span>
                <button onclick="openResume('${app.id}')" 
                        class="text-orange-400 hover:text-orange-300 text-xs px-2 py-0.5 rounded border border-orange-500/30 hover:border-orange-500/60 transition-colors">
                  Resume
                </button>
              </div>
            </div>
          `;
        }
        container.innerHTML = html;

      } else {
        throw new Error('Failed to load applications');
      }

    } catch (error) {
      console.error('Error loading recent applications:', error);
      container.innerHTML = `
        <div class="text-center py-4 text-red-400 text-sm">
          Failed to load applications
        </div>
      `;
    }
  }

  // 3. RENDER APPLICATIONS BY POSITION
  async function renderPositionStats() {
    const container = document.getElementById('positionStatsContainer');
    if (!container) {
      console.warn('positionStatsContainer not found');
      return;
    }

    try {
      container.innerHTML = `
        <div class="flex justify-center items-center py-4 text-white/60">
          <svg class="animate-spin h-5 w-5 text-orange-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading stats...
        </div>
      `;

      const response = await apiCall(API.endpoints.positionStats);

      if (response && response.success && response.data) {
        const stats = response.data;
        const entries = Object.entries(stats);

        if (entries.length === 0) {
          container.innerHTML = `
            <div class="text-center py-4 text-white/40 text-sm">
              No applications yet
            </div>
          `;
          return;
        }

        let total = 0;
        for (let i = 0; i < entries.length; i++) {
          total += entries[i][1];
        }

        const colors = ['#ff6a2c', '#ff8a4c', '#ffb37a', '#ffd4b0', '#f6f3ef'];

        let html = '';
        for (let i = 0; i < entries.length; i++) {
          const position = entries[i][0];
          const count = entries[i][1];
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = colors[i % colors.length];
          html += `
            <div class="space-y-0.5">
              <div class="flex justify-between text-xs">
                <span class="text-white/70 truncate">${escapeHtml(position)}</span>
                <span class="text-white/50">${count} (${percentage}%)</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" 
                     style="width: ${percentage}%; background: ${color};">
                </div>
              </div>
            </div>
          `;
        }
        container.innerHTML = html;

      } else {
        throw new Error('Failed to load statistics');
      }

    } catch (error) {
      console.error('Error loading position stats:', error);
      container.innerHTML = `
        <div class="text-center py-4 text-red-400 text-sm">
          Failed to load statistics
        </div>
      `;
    }
  }

  // ==========================================
  // RESUME MODAL - FIXED (uses auth header + blob)
  // ==========================================

  let currentResumeObjectUrl = null;

  window.openResume = async function (applicationId) {
    const modal = document.getElementById('resumeModal');
    const frame = document.getElementById('resumeFrame');

    if (!modal || !frame) {
      console.warn('Resume modal elements not found');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.warn('No token found');
      window.location.href = '../login/login.html';
      return;
    }

    // Show modal immediately with loading state
    frame.src = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
      const resumeUrl = API.base + API.endpoints.resume + '/' + applicationId + '/resume';

      const response = await fetch(resumeUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '../login/login.html';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load resume: ' + response.status);
      }

      const blob = await response.blob();

      // Revoke previous object URL to avoid memory leaks
      if (currentResumeObjectUrl) {
        URL.revokeObjectURL(currentResumeObjectUrl);
        currentResumeObjectUrl = null;
      }

      currentResumeObjectUrl = URL.createObjectURL(blob);
      frame.src = currentResumeObjectUrl;

    } catch (error) {
      console.error('Error loading resume:', error);
      frame.src = '';
      alert('Unable to load resume. Please try again.');
      closeResume();
    }
  };

  window.closeResume = function () {
    const modal = document.getElementById('resumeModal');
    const frame = document.getElementById('resumeFrame');

    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (frame) {
      frame.src = '';
    }

    // Clean up object URL
    if (currentResumeObjectUrl) {
      URL.revokeObjectURL(currentResumeObjectUrl);
      currentResumeObjectUrl = null;
    }
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.split(' ');
    var initials = '';
    for (var i = 0; i < Math.min(parts.length, 2); i++) {
      if (parts[i] && parts[i].length > 0) {
        initials += parts[i][0];
      }
    }
    return initials.toUpperCase();
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      var date = new Date(dateString);
      var now = new Date();
      var diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return diff + ' days ago';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function getStatusBadgeClass(status) {
    var statusMap = {
      'new': 'bg-blue-500/20 text-blue-300',
      'shortlisted': 'bg-yellow-500/20 text-yellow-300',
      'selected': 'bg-green-500/20 text-green-300',
      'rejected': 'bg-red-500/20 text-red-300'
    };
    return statusMap[status] || 'bg-gray-500/20 text-gray-300';
  }

  // ==========================================
  // REFRESH DASHBOARD
  // ==========================================

  async function refreshDashboard() {
    // Check if token exists, if not redirect to login
    var token = getAuthToken();
    if (!token) {
      console.warn('No token found! Redirecting to login...');
      window.location.href = '../login/login.html';
      return;
    }

    try {
      await Promise.all([
        renderEnquiriesTable(),
        renderRecentApplications(),
        renderPositionStats()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  }

  // ==========================================
  // SET GREETING
  // ==========================================

  function setGreeting() {
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    var el = document.getElementById('greetingText');
    if (el) {
      // Try to get admin name from localStorage
      var adminUser = localStorage.getItem('adminUser');
      var name = 'Admin';
      if (adminUser) {
        try {
          var userData = JSON.parse(adminUser);
          if (userData.name) name = userData.name;
        } catch (e) { }
      }
      el.textContent = greeting + ', ' + name;
    }
    var dateEl = document.getElementById('todayDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
  }

  // ==========================================
  // INIT
  // ==========================================

  async function init() {
    // Mount navigation
    if (typeof Navigation !== 'undefined') {
      Navigation.mount('#app-nav-root', { active: 'dashboard' });
    }

    setGreeting();

    // Check token and load data
    var token = getAuthToken();
    if (!token) {
      console.warn('No token found! Redirecting to login...');
      window.location.href = '../login/login.html';
      return;
    }

    console.log('Token found, loading dashboard...');

    // Load dashboard data
    await refreshDashboard();

    // Auto-refresh every 60 seconds
    setInterval(refreshDashboard, 60000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();