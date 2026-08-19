/* ==========================================================================
   CONTACT.JS - Connected to Spring Boot Backend API
   ========================================================================== */

(() => {

    // ==========================================================================
    // API CONFIGURATION
    // ==========================================================================
    const API_BASE = 'http://localhost:8080/api';

    function getToken() {
        return localStorage.getItem('adminToken');
    }

    async function fetchAPI(endpoint, options = {}) {
        const token = getToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        return data;
    }

    // ==========================================================================
    // API METHODS
    // ==========================================================================
    async function loadContacts() {
        try {
            const result = await fetchAPI('/contact/admin/all', { method: 'GET' });
            if (result.success) {
                return result.data.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    subject: c.subject,
                    message: c.message,
                    date: c.createdAt
                }));
            }
            return [];
        } catch (error) {
            console.error('Error loading contacts:', error);
            return [];
        }
    }

    async function deleteContact(id) {
        try {
            const result = await fetchAPI(`/contact/admin/${id}`, { method: 'DELETE' });
            return result.success;
        } catch (error) {
            console.error('Error deleting contact:', error);
            return false;
        }
    }

    // ==========================================================================
    // STATE
    // ==========================================================================
    let enquiries = [];
    const state = { 
        search: '', 
        page: 1, 
        pageSize: 5, 
        pendingDeleteId: null 
    };

    const AVATAR_PALETTE = [
        'linear-gradient(145deg,#ff8a4c,#e6541c)',
        'linear-gradient(145deg,#ffb37a,#ff6a2c)',
        'linear-gradient(145deg,#ff6a2c,#a8380f)',
        'linear-gradient(145deg,#ffcf9e,#ff8a4c)',
    ];

    const ICONS = {
        eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>',
        trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke-linecap="round" stroke-linejoin="round"/>',
        mail: '<rect x="2" y="4" width="20" height="16" rx="2.4"/><path d="m2 6 10 7 10-7" stroke-linecap="round" stroke-linejoin="round"/>',
        messageCircle: '<path d="M21 11.5a8.38 8.38 0 0 1-8.8 8.38 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 1 1 21 11.5Z" stroke-linecap="round" stroke-linejoin="round"/>',
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2.4"/><path d="M16 2v4M8 2v4M3 10h18" stroke-linecap="round"/>',
        refresh: '<path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" stroke-linecap="round" stroke-linejoin="round"/>'
    };

    const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[name] || ''}</svg>`;
    const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const formatDate = iso => {
        if (!iso) return 'N/A';
        const date = new Date(iso);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ==========================================================================
    // RENDER FUNCTIONS
    // ==========================================================================
    function getFiltered() {
        const q = state.search.trim().toLowerCase();
        return enquiries.filter(e => {
            const matchesSearch = !q ||
                e.name.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.phone.toLowerCase().includes(q) ||
                e.subject.toLowerCase().includes(q);
            return matchesSearch;
        });
    }

    function getPageSlice(filtered) {
        const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
        state.page = Math.min(state.page, totalPages);
        const start = (state.page - 1) * state.pageSize;
        return { rows: filtered.slice(start, start + state.pageSize), totalPages, total: filtered.length, start };
    }

    function renderStats() {
        const today = new Date().toISOString().slice(0, 10);
        const stats = [
            { label: 'Total Enquiries', value: enquiries.length, icon: 'mail' },
            { label: "Today's Enquiries", value: enquiries.filter(e => e.date && e.date.slice(0, 10) === today).length, icon: 'calendar' },
        ];

        document.getElementById('statsGrid').innerHTML = stats.map((s, i) => `
            <div class="group/card relative bg-gradient-to-b from-white/5 to-white/3 backdrop-blur-[22px] border border-orange-500/20 rounded-xl p-4 flex items-center gap-3.5 hover:border-orange-400/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden reveal" style="animation-delay:${i * 60}ms">
                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                <div class="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover/card:scale-150 transition-transform duration-700"></div>
                <div class="relative z-10 w-[42px] h-[42px] rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 group-hover/card:bg-orange-500/30 transition-all duration-300">
                    ${svg(s.icon, 'w-5 h-5 text-orange-400 group-hover/card:text-orange-300 transition-colors')}
                </div>
                <div class="relative z-10 flex-1 min-w-0">
                    <span class="text-[11px] font-medium text-[#948d85] uppercase tracking-wider block">${s.label}</span>
                    <span class="font-display text-[22px] font-semibold text-[#f6f3ef] block leading-tight">${s.value}</span>
                </div>
            </div>
        `).join('');
    }

    function renderTable() {
        const filtered = getFiltered();
        const { rows, totalPages, total, start } = getPageSlice(filtered);

        document.getElementById('enqTableBody').innerHTML = rows.length ? rows.map((e, i) => `
            <tr>
                <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
                    <div class="flex items-center gap-2.5">
                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-[#150a04] flex-shrink-0" style="background:${AVATAR_PALETTE[i % AVATAR_PALETTE.length]}">${initials(e.name)}</span>
                        <span class="text-[#f6f3ef] font-medium">${e.name}</span>
                    </div>
                </td>
                <td class="px-2.5 py-2.5 text-[#c9c4bd] border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">${e.phone}</td>
                <td class="px-2.5 py-2.5 text-[#c9c4bd] border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">${e.email}</td>
                <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
                    <span class="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-medium">${e.subject}</span>
                </td>
                <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 max-w-[180px]">
                    <div class="text-[#948d85] truncate">${e.message}</div>
                </td>
                <td class="px-2.5 py-2.5 text-[#948d85] border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap font-mono text-[11.5px]">${formatDate(e.date)}</td>
                <td class="px-2.5 py-2.5 border-b border-orange-500/10 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                        <button type="button" class="icon-btn icon-btn-view" data-view="${e.id}">${svg('eye')}</button>
                        <button type="button" class="icon-btn icon-btn-delete" data-delete="${e.id}">${svg('trash')}</button>
                    </div>
                </td>
            </tr>
        `).join('') : `
            <tr><td colspan="8" class="px-2.5 py-10 text-center text-[#6d675c] text-[13px]">
                <div class="flex flex-col items-center gap-2">
                    <span class="text-3xl">📭</span>
                    <span>No enquiries found. Submit a contact form to see data here.</span>
                </div>
            </td></tr>
        `;

        document.getElementById('resultCount').textContent =
            total === 0 ? '0 results' : `Showing ${start + 1}–${Math.min(start + state.pageSize, total)} of ${total}`;

        renderPagination(totalPages);
        wireRowActions();
    }

    function renderPagination(totalPages) {
        const el = document.getElementById('pagination');
        let buttons = `<button class="page-btn" data-page="prev" ${state.page === 1 ? 'disabled' : ''}>‹</button>`;
        for (let p = 1; p <= totalPages; p++) {
            buttons += `<button class="page-btn ${p === state.page ? 'is-active' : ''}" data-page="${p}">${p}</button>`;
        }
        buttons += `<button class="page-btn" data-page="next" ${state.page === totalPages ? 'disabled' : ''}>›</button>`;
        el.innerHTML = buttons;

        el.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => {
            const val = btn.dataset.page;
            if (val === 'prev') state.page = Math.max(1, state.page - 1);
            else if (val === 'next') state.page = Math.min(totalPages, state.page + 1);
            else state.page = parseInt(val, 10);
            renderTable();
        }));
    }

    function wireRowActions() {
        document.querySelectorAll('[data-view]').forEach(btn =>
            btn.addEventListener('click', e => { e.stopPropagation(); openViewModal(parseInt(btn.dataset.view, 10)); }));

        document.querySelectorAll('[data-delete]').forEach(btn =>
            btn.addEventListener('click', e => { e.stopPropagation(); openDeleteModal(parseInt(btn.dataset.delete, 10)); }));
    }

    function openViewModal(id) {
        const e = enquiries.find(x => x.id === id);
        if (!e) return;
        document.getElementById('viewModalBody').innerHTML = `
            <div class="flex items-center gap-3 mb-5">
                <span class="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold text-[#150a04] flex-shrink-0" style="background:${AVATAR_PALETTE[id % AVATAR_PALETTE.length]}">${initials(e.name)}</span>
                <div>
                    <div class="text-[15px] font-semibold text-[#f6f3ef]">${e.name}</div>
                    <div class="text-[12px] text-[#948d85] font-mono">${formatDate(e.date)}</div>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div class="bg-white/[0.03] border border-orange-500/10 rounded-lg p-3">
                    <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1">Phone</div>
                    <div class="text-[13px] text-[#f6f3ef] font-mono">${e.phone}</div>
                </div>
                <div class="bg-white/[0.03] border border-orange-500/10 rounded-lg p-3">
                    <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1">Email</div>
                    <div class="text-[13px] text-[#f6f3ef] font-mono">${e.email}</div>
                </div>
            </div>
            <div class="mb-2">
                <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1.5">Subject</div>
                <span class="px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-full text-[11px] font-medium">${e.subject}</span>
            </div>
            <div class="mt-4">
                <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1.5">Message</div>
                <p class="text-[13.5px] text-[#c9c4bd] leading-relaxed bg-white/[0.03] border border-orange-500/10 rounded-lg p-4">${e.message}</p>
            </div>
        `;
        toggleModal('viewModal', true);
    }

    function openDeleteModal(id) {
        const e = enquiries.find(x => x.id === id);
        if (!e) return;
        state.pendingDeleteId = id;
        document.getElementById('deleteModalName').textContent = e.name;
        toggleModal('deleteModal', true);
    }

    async function confirmDelete() {
        if (state.pendingDeleteId) {
            const success = await deleteContact(state.pendingDeleteId);
            if (success) {
                enquiries = enquiries.filter(e => e.id !== state.pendingDeleteId);
                state.pendingDeleteId = null;
                toggleModal('deleteModal', false);
                renderStats();
                renderTable();
            } else {
                alert('Failed to delete contact. Please try again.');
            }
        }
    }

    function toggleModal(id, open) {
        document.getElementById(id).classList.toggle('is-open', open);
    }

    function wireToolbar() {
        document.getElementById('searchInput').addEventListener('input', () => {
            state.search = document.getElementById('searchInput').value;
            state.page = 1;
            renderTable();
        });

        // Add refresh button
        const toolbar = document.querySelector('.flex.flex-col.sm\\:flex-row.sm\\:items-center.gap-3.mb-4');
        if (toolbar && !document.getElementById('refreshBtn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refreshBtn';
            refreshBtn.innerHTML = svg('refresh', 'w-4 h-4');
            refreshBtn.className = 'p-2.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors';
            refreshBtn.title = 'Refresh contacts';
            refreshBtn.addEventListener('click', refreshData);
            toolbar.appendChild(refreshBtn);
        }
    }

    async function refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round"/></svg>';
        }

        try {
            const data = await loadContacts();
            enquiries = data;
            state.page = 1;
            renderStats();
            renderTable();
        } catch (error) {
            console.error('Error refreshing data:', error);
        }

        if (refreshBtn) {
            refreshBtn.innerHTML = svg('refresh', 'w-4 h-4');
        }
    }

    function wireModals() {
        document.querySelectorAll('[data-close-modal]').forEach(btn =>
            btn.addEventListener('click', () => toggleModal(btn.dataset.closeModal, false)));

        document.querySelectorAll('.modal-overlay').forEach(overlay =>
            overlay.addEventListener('click', e => { if (e.target === overlay) toggleModal(overlay.id, false); }));

        document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                toggleModal('viewModal', false);
                toggleModal('deleteModal', false);
            }
        });
    }

    // ==========================================================================
    // AUTH CHECK
    // ==========================================================================
    function checkAuth() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            localStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = '../login/login.html';
            return false;
        }
        return true;
    }

    // ==========================================================================
    // INIT
    // ==========================================================================
    async function init() {
        // Check authentication first
        if (!checkAuth()) return;

        console.log('📋 Loading contacts from API...');
        
        try {
            const data = await loadContacts();
            enquiries = data;
            console.log(`✅ Loaded ${enquiries.length} contacts`);
        } catch (error) {
            console.error('❌ Failed to load contacts:', error);
            enquiries = [];
        }
        
        renderStats();
        renderTable();
        wireToolbar();
        wireModals();
    }

    // Run init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();