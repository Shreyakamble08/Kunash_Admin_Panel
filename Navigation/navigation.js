/* ==========================================================================
   NAVIGATION.JS
   Self-contained, reusable floating navigation component with routing.
   ========================================================================== */

const Navigation = (() => {

  /* ---- Config: single source of truth for the app's primary routes ---- */
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: '../Dashboard/dashboard.html', icon: 'grid' },
    { id: 'contact', label: 'Contact', href: '../contact/contact.html', icon: 'mail' },
    { id: 'career', label: 'Career', href: '../Career/career.html', icon: 'briefcase' },
    // { id: 'orders', label: 'Orders', href: '#orders', icon: 'box' },
    // { id: 'reports', label: 'Reports', href: '#reports', icon: 'doc' },
  ];

  /* ---- Inline icon set (stroke-based, consistent weight) ---- */
  const ICONS = {
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke-linecap="round" stroke-linejoin="round"/>',
    mail: '<path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 7l8 6 8-6" stroke-linecap="round" stroke-linejoin="round"/>',
    users: '<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0-7ZM2.5 20a6.5 6.5 0 0 1 13 0M17 8a3 3 0 1 1 0 6M20 20a5.5 5.5 0 0 0-4-5.3" stroke-linecap="round" stroke-linejoin="round"/>',
    box: '<path d="M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" stroke-linecap="round" stroke-linejoin="round"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5M9 13h6M9 17h6" stroke-linecap="round" stroke-linejoin="round"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" stroke-linecap="round" stroke-linejoin="round"/>',
    chevDown: '<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0" stroke-linecap="round"/>',
    logo: '<path d="M7 21 17 3M13 3l4 4-4 4M11 21l-4-4 4-4" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  const svgIcon = (name, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${extra}>${ICONS[name] || ''}</svg>`;

  /* ---- Helper: Get current page from URL ---- */
  function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'dashboard.html';

    for (const item of NAV_ITEMS) {
      const href = item.href.split('/').pop();
      if (filename === href) {
        return item.id;
      }
    }

    return 'dashboard';
  }

  /* ---- Helper: Get current page ID from link ---- */
  function getPageIdFromHref(href) {
    const filename = href.split('/').pop();
    for (const item of NAV_ITEMS) {
      const itemFile = item.href.split('/').pop();
      if (filename === itemFile) {
        return item.id;
      }
    }
    return null;
  }

  /* ============================================
     GET USER INFO FROM LOCALSTORAGE
     ============================================ */
  function getUserInfo() {
    try {
      const userData = localStorage.getItem('adminUser');
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
    return null;
  }

  function getUserInitials() {
    const user = getUserInfo();
    if (user && user.name) {
      const nameParts = user.name.split(' ');
      if (nameParts.length >= 2) {
        return nameParts[0][0] + nameParts[1][0];
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    return 'AD';
  }

  function getUserDisplayName() {
    const user = getUserInfo();
    return user ? user.name : 'Admin User';
  }

  function getUserEmail() {
    const user = getUserInfo();
    return user ? user.email : 'admin@kunash.com';
  }

  /* ---- Markup builders ---- */
  function buildBar(active) {
    const initials = getUserInitials();
    const displayName = getUserDisplayName();
    const email = getUserEmail();

    const links = NAV_ITEMS.map(item => `
      <a class="app-nav__link${item.id === active ? ' is-active' : ''}" href="${item.href}" data-nav-id="${item.id}">
        ${svgIcon(item.icon)}<span>${item.label}</span>
      </a>`).join('');

    return `
      <div class="app-nav__bar glass">
        <a class="app-nav__brand" href="../Dashboard/dashboard.html">
          <img
            src="/logo.png"
            alt="Kunash Logo"
            class="app-nav__logo"
          />
        </a>

        <button class="app-nav__burger" id="navBurger" aria-label="Open menu" aria-expanded="false">
          ${svgIcon('menu')}
        </button>

        <div class="app-nav__links" id="navLinks" role="tablist">
          <span class="app-nav__pill" id="navPill"></span>
          ${links}
        </div>

        <div class="app-nav__actions">
          <div style="position:relative;">
            <button class="app-nav__profile" id="navProfileBtn" aria-label="Account menu">
              <span class="app-nav__avatar">${initials}</span>
              <span class="app-nav__profile-meta">
                <div class="app-nav__profile-name">${displayName}</div>
                <div class="app-nav__profile-role">Admin</div>
              </span>
              ${svgIcon('chevDown', 'class="chev"')}
            </button>
            <div class="app-nav__dropdown glass" id="navProfilePanel">
              <div class="app-nav__dropdown-header">
                <div style="font-size:13px;font-weight:600;color:var(--ink-100);">${displayName}</div>
                <div style="font-size:11px;color:var(--ink-500);margin-top:2px;">${email}</div>
              </div>
              <a class="app-nav__dropdown-item" href="#profile">${svgIcon('user')} My profile</a>
              <div class="app-nav__dropdown-divider"></div>
              <a class="app-nav__dropdown-item is-danger" id="logoutDropdownBtn" href="#logout">${svgIcon('logout')} Sign out</a>
            </div>
          </div>
        </div>
      </div>

      <div class="app-nav__mobile-panel glass" id="navMobilePanel">
        ${NAV_ITEMS.map(item => `
          <a class="app-nav__mobile-link${item.id === active ? ' is-active' : ''}" href="${item.href}" data-nav-id="${item.id}">
            ${svgIcon(item.icon)}${item.label}
          </a>`).join('')}
        <div class="app-nav__mobile-divider"></div>
        <a class="app-nav__mobile-link is-danger" id="mobileLogoutBtn" href="#logout">
          ${svgIcon('logout')}Sign Out
        </a>
      </div>
    `;
  }

  /* ---- Behaviour ---- */

  function positionPill() {
    const links = document.getElementById('navLinks');
    const pill = document.getElementById('navPill');
    if (!links || !pill) return;

    const active = links.querySelector('.app-nav__link.is-active');
    if (!active) {
      pill.style.width = '0px';
      return;
    }
    const linksRect = links.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    pill.style.width = rect.width + 'px';
    pill.style.transform = `translateX(${rect.left - linksRect.left}px)`;
  }

  function closeAllDropdowns(except) {
    document.querySelectorAll('.app-nav__dropdown.is-open').forEach(el => {
      if (el.id !== except) el.classList.remove('is-open');
    });
  }

  function toggleDropdown(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const willOpen = !panel.classList.contains('is-open');
    closeAllDropdowns();
    panel.classList.toggle('is-open', willOpen);
  }

  /* ---- Update active state on navigation ---- */
  function updateActiveState() {
    const currentPage = getCurrentPage();
    const links = document.querySelectorAll('.app-nav__link');
    const mobileLinks = document.querySelectorAll('.app-nav__mobile-link');

    links.forEach(link => {
      const id = link.dataset.navId;
      if (id === currentPage) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    mobileLinks.forEach(link => {
      const id = link.dataset.navId;
      if (id === currentPage) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    setTimeout(positionPill, 50);
  }

  /* ---- LOGOUT FUNCTION ---- */
  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('redirectAfterLogin');
    window.location.href = '../login/login.html';
  }

  function wireInteractions(root) {
    setTimeout(positionPill, 100);
    window.addEventListener('resize', positionPill);

    const navRoot = root.querySelector('.app-nav');
    if (navRoot) {
      window.addEventListener('scroll', () => {
        navRoot.classList.toggle('is-scrolled', window.scrollY > 12);
      }, { passive: true });
    }

    /* Dropdowns */
    const profileBtn = document.getElementById('navProfileBtn');

    if (profileBtn) {
      profileBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleDropdown('navProfilePanel');
      });
    }

    document.addEventListener('click', () => closeAllDropdowns());

    /* Mobile menu */
    const burger = document.getElementById('navBurger');
    const mobilePanel = document.getElementById('navMobilePanel');
    if (burger && mobilePanel) {
      burger.addEventListener('click', e => {
        e.stopPropagation();
        const open = mobilePanel.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
        burger.innerHTML = svgIcon(open ? 'close' : 'menu');
      });

      mobilePanel.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobilePanel.classList.remove('is-open');
          if (burger) {
            burger.setAttribute('aria-expanded', 'false');
            burger.innerHTML = svgIcon('menu');
          }
        });
      });
    }

    /* ---- LOGOUT HANDLERS ---- */
    // Desktop logout dropdown
    const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
    if (logoutDropdownBtn) {
      logoutDropdownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logout();
      });
    }

    // Mobile logout button
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logout();
      });
    }

    /* ---- Navigation link click handling ---- */
    document.querySelectorAll('.app-nav__link, .app-nav__mobile-link').forEach(link => {
      // Skip logout buttons (they have their own handlers)
      if (link.id === 'logoutDropdownBtn' || link.id === 'mobileLogoutBtn') return;

      link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && !href.startsWith('#')) {
          const pageId = getPageIdFromHref(href);
          if (pageId) {
            document.querySelectorAll('.app-nav__link').forEach(l => {
              l.classList.toggle('is-active', l.dataset.navId === pageId);
            });
            document.querySelectorAll('.app-nav__mobile-link').forEach(l => {
              // Skip logout button
              if (l.id !== 'mobileLogoutBtn') {
                l.classList.toggle('is-active', l.dataset.navId === pageId);
              }
            });
            setTimeout(positionPill, 50);
          }
        }
      });
    });

    /* Listen for navigation changes */
    window.addEventListener('popstate', () => {
      updateActiveState();
    });

    /* Update active state */
    updateActiveState();

    /* ============================================
       AUTH CHECK - If no token, redirect to login
       ============================================ */
    const token = localStorage.getItem('adminToken');
    if (!token) {
      // Don't redirect if we're already on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('login.html')) {
        localStorage.setItem('redirectAfterLogin', currentPath);
        window.location.href = '../login/login.html';
      }
    }

    /* ============================================
       UPDATE USER INFO IN NAV
       ============================================ */
    function updateUserInfo() {
      const user = getUserInfo();
      if (user) {
        const avatar = document.querySelector('.app-nav__avatar');
        const nameEl = document.querySelector('.app-nav__profile-name');
        const emailEl = document.querySelector('.app-nav__profile-role');
        const dropdownName = document.querySelector('.app-nav__dropdown-header div:first-child');
        const dropdownEmail = document.querySelector('.app-nav__dropdown-header div:last-child');

        if (avatar) {
          const initials = getUserInitials();
          avatar.textContent = initials;
        }
        if (nameEl) {
          nameEl.textContent = user.name || 'Admin User';
        }
        if (emailEl) {
          emailEl.textContent = 'Admin';
        }
        if (dropdownName) {
          dropdownName.textContent = user.name || 'Admin User';
        }
        if (dropdownEmail) {
          dropdownEmail.textContent = user.email || 'admin@kunash.com';
        }
      }
    }

    updateUserInfo();
  }

  /* ---- Public API ---- */

  function mount(selector, opts = {}) {
    const target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!target) { console.warn('Navigation.mount: target not found for', selector); return; }

    const active = opts.active || getCurrentPage();

    target.innerHTML = `
      <nav class="app-nav" id="appNav">
        ${buildBar(active)}
      </nav>
    `;

    const navEl = document.getElementById('appNav');
    if (navEl) navEl.classList.add('app-nav');

    wireInteractions(target);
  }

  function updateActive(activeId) {
    const links = document.querySelectorAll('.app-nav__link');
    const mobileLinks = document.querySelectorAll('.app-nav__mobile-link');

    links.forEach(link => {
      const id = link.dataset.navId;
      if (id === activeId) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    mobileLinks.forEach(link => {
      const id = link.dataset.navId;
      if (id === activeId) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    setTimeout(positionPill, 50);
  }

  return {
    mount,
    updateActive,
    getCurrentPage,
    logout // Expose logout function
  };

})();

// ============================================
// AUTO-INIT - Mount navigation when DOM is ready
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  const navContainer = document.getElementById('app-nav-root');
  if (navContainer) {
    Navigation.mount('#app-nav-root');
  }
});

// Also expose logout globally for easy access
window.logout = Navigation.logout;