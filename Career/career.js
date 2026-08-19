/* ==========================================================================
   CAREER.JS - Admin Panel with Backend API Integration
   (Updated: context-sensitive filters + newest-first application ordering)
   ========================================================================== */

(() => {
  // ==========================================
  // API CONFIGURATION
  // ==========================================
  const API_BASE_URL = "http://localhost:8080/api";
  let AUTH_TOKEN = localStorage.getItem("adminToken") || "";

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  async function loginAdmin() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@kunash.com",
          password: "Admin@123!",
        }),
      });

      const result = await response.json();

      if (result.success) {
        AUTH_TOKEN = result.data.token;
        localStorage.setItem("adminToken", AUTH_TOKEN);
        console.log("Admin authenticated");
        return true;
      } else {
        console.error("Login failed:", result.message);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }

  function getAuthHeaders() {
    return {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  // ==========================================
  // STATE
  // ==========================================
  let JOBS = [];
  let APPLICANTS = [];
  let nextJobId = 1;
  let nextApplicantId = 1;

  const JOB_STATUS_LABEL = { active: "Active", closed: "Closed" };
  const APP_STATUS_LABEL = {
    new: "New",
    shortlisted: "Shortlisted",
    rejected: "Rejected",
    selected: "Selected",
  };
  const APP_STATUS_BADGE = {
    new: "badge-new",
    shortlisted: "badge-shortlisted",
    rejected: "badge-rejected",
    selected: "badge-selected",
  };
  const AVATAR_PALETTE = [
    "linear-gradient(145deg,#ff8a4c,#e6541c)",
    "linear-gradient(145deg,#ffb37a,#ff6a2c)",
    "linear-gradient(145deg,#ff6a2c,#a8380f)",
    "linear-gradient(145deg,#ffcf9e,#ff8a4c)",
  ];

  /* ------------------------------------------------------------------
     STATE
     ------------------------------------------------------------------ */
  const state = {
    tab: "jobs",
    jobSearch: "",
    editingJobId: null,
    appSearch: "",
    appStatus: "all",
    appJob: "all",
    page: 1,
    pageSize: 10,
    currentApplicantId: null,
    pendingDelete: null,
  };

  /* ==================================================================
     API FUNCTIONS
     ================================================================== */

  // ---------- JOBS ----------
  async function fetchJobs() {
    try {
      if (!AUTH_TOKEN) {
        console.log("No token, logging in...");
        const loggedIn = await loginAdmin();
        if (!loggedIn) {
          showToast("Failed to authenticate", "error");
          return;
        }
      }

      console.log("Fetching jobs from:", `${API_BASE_URL}/admin/jobs`);

      const response = await fetch(`${API_BASE_URL}/admin/jobs`, {
        headers: getAuthHeaders(),
      });

      console.log("Response status:", response.status);

      if (response.status === 401 || response.status === 403) {
        console.log("Token expired, re-authenticating...");
        const loggedIn = await loginAdmin();
        if (loggedIn) {
          return fetchJobs();
        }
        return;
      }

      const result = await response.json();
      console.log("Jobs response:", result);

      if (result.success) {
        JOBS = result.data || [];
        if (JOBS.length > 0) {
          const maxId = Math.max(...JOBS.map((j) => j.id));
          nextJobId = maxId + 1;
        }
        renderJobs();
        renderTabCounts();
        populateJobFilterOptions();
      } else {
        console.error("Failed to fetch jobs:", result.message);
        showToast(result.message || "Failed to load jobs", "error");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      showToast("Error connecting to server", "error");
    }
  }

  async function createJob(data) {
    try {
      // Remove status if it exists (backend sets it automatically)
      const { status, ...jobData } = data;

      console.log("Creating job with data:", jobData);

      const response = await fetch(`${API_BASE_URL}/admin/jobs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(jobData),
      });

      console.log("Response status:", response.status);

      const result = await response.json();
      console.log("Create job response:", result);

      if (result.success) {
        showToast("Job created successfully!", "success");
        await fetchJobs();
        return true;
      } else {
        let errorMsg = result.message || "Failed to create job";

        if (result.data) {
          console.log("Error details:", result.data);
          if (result.data.description) {
            errorMsg = result.data.description;
          } else if (result.data.errors) {
            const errors = Object.values(result.data.errors).join(", ");
            errorMsg = errors || errorMsg;
          }
        }

        showToast(errorMsg, "error");
        return false;
      }
    } catch (error) {
      console.error("Error creating job:", error);
      showToast("Error creating job: " + error.message, "error");
      return false;
    }
  }

  async function updateJob(id, data) {
    try {
      console.log("Updating job", id, "with data:", data);

      const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      console.log("Response status:", response.status);

      const result = await response.json();
      console.log("Update job response:", result);

      if (result.success) {
        showToast("Job updated successfully!", "success");
        await fetchJobs();
        return true;
      } else {
        showToast(result.message || "Failed to update job", "error");
        return false;
      }
    } catch (error) {
      console.error("Error updating job:", error);
      showToast("Error updating job: " + error.message, "error");
      return false;
    }
  }

  async function deleteJob(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        showToast("Job deleted successfully!", "success");
        await fetchJobs();
        return true;
      } else {
        showToast(result.message || "Failed to delete job", "error");
        return false;
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      showToast("Error deleting job", "error");
      return false;
    }
  }

  async function toggleJobStatus(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        await fetchJobs();
        return true;
      } else {
        showToast(result.message || "Failed to toggle status", "error");
        return false;
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      showToast("Error toggling status", "error");
      return false;
    }
  }

  // ---------- APPLICANTS ----------
  async function fetchApplicants() {
    try {
      if (!AUTH_TOKEN) {
        const loggedIn = await loginAdmin();
        if (!loggedIn) return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/applications`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        const loggedIn = await loginAdmin();
        if (loggedIn) {
          return fetchApplicants();
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        APPLICANTS = result.data || [];
        if (APPLICANTS.length > 0) {
          const maxId = Math.max(...APPLICANTS.map((a) => a.id));
          nextApplicantId = maxId + 1;
        }
        renderApplicants();
        renderTabCounts();
        renderJobs();   // ← ADD THIS LINE (updates applicant counts on job cards)
      } else {
        console.error("Failed to fetch applicants:", result.message);
      }
    } catch (error) {
      console.error("Error fetching applicants:", error);
    }
  }

  async function updateApplicationStatus(id, status) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/applications/${id}/status?status=${status}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        },
      );
      const result = await response.json();

      if (result.success) {
        showToast("Application status updated!", "success");
        await fetchApplicants();
        return true;
      } else {
        showToast(result.message || "Failed to update status", "error");
        return false;
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Error updating status", "error");
      return false;
    }
  }

  async function updateApplicationNotes(id, notes) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/applications/${id}/notes?notes=${encodeURIComponent(notes)}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        },
      );
      const result = await response.json();

      if (result.success) {
        showToast("Notes updated!", "success");
        await fetchApplicants();
        return true;
      } else {
        showToast(result.message || "Failed to update notes", "error");
        return false;
      }
    } catch (error) {
      console.error("Error updating notes:", error);
      showToast("Error updating notes", "error");
      return false;
    }
  }

  async function deleteApplication(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/applications/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        showToast("Application deleted!", "success");
        await fetchApplicants();   // this will now also call renderJobs() because of the change above
        return true;
      } else {
        showToast(result.message || "Failed to delete application", "error");
        return false;
      }
    } catch (error) {
      console.error("Error deleting application:", error);
      showToast("Error deleting application", "error");
      return false;
    }
  }

  function getResumeUrl(applicationId) {
    return `${API_BASE_URL}/admin/applications/${applicationId}/resume`;
  }

  /* ==================================================================
     UI FUNCTIONS
     ================================================================== */

  // ---------- ICONS ----------
  const ICONS = {
    briefcase:
      '<rect x="2" y="7" width="20" height="14" rx="2.2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke-linecap="round" stroke-linejoin="round"/>',
    users:
      '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M19 8v6M22 11h-6" stroke-linecap="round" stroke-linejoin="round"/>',
    mapPin:
      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"/>',
    trash:
      '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke-linecap="round" stroke-linejoin="round"/>',
    power:
      '<path d="M12 2v8" stroke-linecap="round"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0" stroke-linecap="round"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/>',
    search:
      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/>',
    chevDown:
      '<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5" stroke-linecap="round" stroke-linejoin="round"/>',
    download:
      '<path d="M12 3v12M7 10l5 5 5-5M4 21h16" stroke-linecap="round" stroke-linejoin="round"/>',
    alertTriangle:
      '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9v4M12 17h.01" stroke-linecap="round"/>',
    note: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M9 13h6M9 17h4" stroke-linecap="round" stroke-linejoin="round"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2.4"/><path d="m2 6 10 7 10-7" stroke-linecap="round" stroke-linejoin="round"/>',
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.11 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const svg = (name, cls = "") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[name] || ""}</svg>`;

  const initials = (name) =>
    name
      ? name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
      : "?";
  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };
  const jobById = (id) => JOBS.find((j) => j.id === id);

  // ---------- TABS + CONTEXT-SENSITIVE FILTERS ----------
  function renderTabCounts() {
    const jobsTab = document.getElementById("jobsTabCount");
    const appsTab = document.getElementById("applicantsTabCount");
    if (jobsTab) jobsTab.textContent = JOBS.length;
    if (appsTab) appsTab.textContent = APPLICANTS.length;
  }

  // Show only the relevant toolbar for the active tab
  function updateToolbarVisibility() {
    const jobsToolbar = document.querySelector(".toolbar-jobs");
    const appsToolbar = document.querySelector(".toolbar-applicants");

    if (state.tab === "jobs") {
      if (jobsToolbar) jobsToolbar.style.display = "flex";
      if (appsToolbar) appsToolbar.style.display = "none";
    } else {
      if (jobsToolbar) jobsToolbar.style.display = "none";
      if (appsToolbar) appsToolbar.style.display = "flex";
    }
  }

  function wireTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newTab = btn.dataset.tab;
        state.tab = newTab;

        // Update tab active states
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.toggle("is-active", b === btn));
        document
          .querySelectorAll(".tab-panel")
          .forEach((p) =>
            p.classList.toggle("is-active", p.id === `panel-${state.tab}`),
          );

        // Switch filters visibility
        updateToolbarVisibility();

        if (newTab === "applicants") {
          // IMPORTANT: Reset job filter when coming from header navigation
          state.appJob = "all";
          state.page = 1;

          const jobFilter = document.getElementById("appJobFilter");
          if (jobFilter) {
            jobFilter.value = "all";
          }

          fetchApplicants();
        }
      });
    });
  }

  // ---------- JOBS ----------
  function getFilteredJobs() {
    const q = state.jobSearch.trim().toLowerCase();
    return JOBS.filter((j) => {
      const matchesSearch =
        !q ||
        (j.title && j.title.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q));
      return matchesSearch;
    });
  }

  function applicantCount(jobId) {
    return APPLICANTS.filter((a) => a.jobId === jobId).length;
  }

  function renderJobs() {
    const jobs = getFilteredJobs();
    const grid = document.getElementById("jobGrid");
    if (!grid) return;

    grid.innerHTML = jobs.length
      ? jobs
        .map(
          (j, i) => `
      <div class="job-card reveal" style="animation-delay:${(i % 6) * 50}ms">
        <div class="job-card__top">
          <div>
            <div class="job-card__title">${j.title || "Untitled"}</div>
            <div class="job-card__loc">${svg("mapPin")}<span>${j.location || "Location not set"}</span></div>
          </div>
        </div>

        <p class="job-card__desc">${j.description || "No description provided."}</p>

        <div class="job-card__foot">
          <span class="job-card__count">
            ${svg("users")}
            ${applicantCount(j.id)} applicant${applicantCount(j.id) === 1 ? "" : "s"}
          </span>

          <div class="job-card__actions flex items-center gap-2">

            <!-- View Job Details -->
            <button
              type="button"
              class="icon-btn icon-btn-view"
              data-view-job="${j.id}"
              aria-label="View Job"
              title="View Job Details">
              ${svg("eye")}
            </button>

            <!-- View Applicants -->
            <button
              type="button"
              class="icon-btn icon-btn-view"
              data-view-applicants="${j.id}"
              aria-label="View Applicants"
              title="View Applicants">
              ${svg("users")}
            </button>

            <!-- Edit Job -->
            <button
              type="button"
              class="icon-btn icon-btn-edit"
              data-edit-job="${j.id}"
              aria-label="Edit Job"
              title="Edit Job">
              ${svg("edit")}
            </button>

            <!-- Delete Job -->
            <button
              type="button"
              class="icon-btn icon-btn-delete"
              data-delete-job="${j.id}"
              aria-label="Delete Job"
              title="Delete Job">
              ${svg("trash")}
            </button>

          </div>
        </div>
      </div>
    `,
        )
        .join("")
      : `
      <div class="col-span-full text-center py-14 text-[#6d675c] text-[13px]">No job openings found. Click "Post new job" to create one!</div>
    `;

    wireJobActions();
  }

  // ---------- JOB VIEW MODAL ----------
  function openJobViewModal(id) {
    const j = jobById(id);
    if (!j) return;

    document.getElementById("jobViewTitle").textContent = j.title || "Untitled";
    document.getElementById("jobViewLocation").textContent = j.location || "Location not set";
    document.getElementById("jobViewDescription").textContent = j.description || "No description provided.";

    // Wire the Edit button inside the view modal
    const editBtn = document.getElementById("jobViewEditBtn");
    if (editBtn) {
      editBtn.onclick = () => {
        toggleModal("jobViewModal", false);
        openJobModal(id);
      };
    }

    toggleModal("jobViewModal", true);
  }

  function wireJobActions() {
    // View Job Details
    document.querySelectorAll("[data-view-job]").forEach((b) => {
      b.addEventListener("click", () =>
        openJobViewModal(parseInt(b.dataset.viewJob, 10)),
      );
    });

    // View Applicants (goes to Applicants tab filtered by this job)
    document.querySelectorAll("[data-view-applicants]").forEach((b) => {
      b.addEventListener("click", () =>
        goToApplicantsForJob(parseInt(b.dataset.viewApplicants, 10)),
      );
    });

    // Edit Job
    document.querySelectorAll("[data-edit-job]").forEach((b) => {
      b.addEventListener("click", () =>
        openJobModal(parseInt(b.dataset.editJob, 10)),
      );
    });

    // Delete Job
    document.querySelectorAll("[data-delete-job]").forEach((b) => {
      b.addEventListener("click", () =>
        requestDelete("job", parseInt(b.dataset.deleteJob, 10)),
      );
    });
  }

  function goToApplicantsForJob(jobId) {
    state.tab = "applicants";
    state.appJob = String(jobId);
    state.page = 1;
    const filter = document.getElementById("appJobFilter");
    if (filter) filter.value = String(jobId);

    document
      .querySelectorAll(".tab-btn")
      .forEach((b) =>
        b.classList.toggle("is-active", b.dataset.tab === "applicants"),
      );
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) =>
        p.classList.toggle("is-active", p.id === "panel-applicants"),
      );

    // Switch filters
    updateToolbarVisibility();
    fetchApplicants();
  }

  // ---------- JOB MODAL ----------
  function openJobModal(id = null) {
    state.editingJobId = id;
    const j = id ? jobById(id) : null;
    document.getElementById("jobModalTitle").textContent = j
      ? "Edit job opening"
      : "Post a new job opening";
    document.getElementById("jobTitleInput").value = j ? j.title : "";
    document.getElementById("jobLocationInput").value = j ? j.location : "";
    document.getElementById("jobDescInput").value = j ? j.description : "";
    // status switch removed
    clearFieldError("jobTitleField");
    clearFieldError("jobLocationField");
    clearFieldError("jobDescField");
    toggleModal("jobModal", true);
  }

  function validateJobForm() {
    let valid = true;
    const title = document.getElementById("jobTitleInput").value.trim();
    const location = document.getElementById("jobLocationInput").value.trim();
    const desc = document.getElementById("jobDescInput").value.trim();

    // Title validation
    if (!title) {
      setFieldError("jobTitleField", "Job title is required.");
      valid = false;
    } else if (title.length < 2) {
      setFieldError(
        "jobTitleField",
        "Job title must be at least 2 characters.",
      );
      valid = false;
    } else {
      clearFieldError("jobTitleField");
    }

    // Location validation
    if (!location) {
      setFieldError("jobLocationField", "Location is required.");
      valid = false;
    } else if (location.length < 2) {
      setFieldError(
        "jobLocationField",
        "Location must be at least 2 characters.",
      );
      valid = false;
    } else {
      clearFieldError("jobLocationField");
    }

    // Description validation
    if (!desc) {
      setFieldError(
        "jobDescField",
        "Description is required. Please enter at least 10 characters.",
      );
      valid = false;
    } else if (desc.length < 10) {
      setFieldError(
        "jobDescField",
        "Description must be at least 10 characters. (Current: " +
        desc.length +
        " characters)",
      );
      valid = false;
    } else {
      clearFieldError("jobDescField");
    }

    return valid ? { title, location, description: desc } : null;
  }

  async function saveJob() {
    const data = validateJobForm();
    if (!data) {
      return;
    }

    if (state.editingJobId) {
      await updateJob(state.editingJobId, data);   // no status
    } else {
      await createJob(data);
    }
    toggleModal("jobModal", false);
  }

  // ---------- APPLICANTS ----------
  // Newest applications appear first (descending by submission date)
  function getFilteredApplicants() {
    const q = state.appSearch.trim().toLowerCase();

    let filtered = APPLICANTS.filter((a) => {
      const matchesStatus =
        state.appStatus === "all" || a.status === state.appStatus;
      const matchesJob =
        state.appJob === "all" || a.jobId === parseInt(state.appJob, 10);
      const matchesSearch =
        !q ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q));
      return matchesStatus && matchesJob && matchesSearch;
    });

    // Sort by appliedAt / date descending (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.appliedAt || a.date || 0).getTime();
      const dateB = new Date(b.appliedAt || b.date || 0).getTime();
      return dateB - dateA;
    });

    return filtered;
  }

  function getPageSlice(filtered) {
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * state.pageSize;
    return {
      rows: filtered.slice(start, start + state.pageSize),
      totalPages,
      total: filtered.length,
      start,
    };
  }

  function renderApplicants() {
    const filtered = getFilteredApplicants();
    const { rows, totalPages, total, start } = getPageSlice(filtered);
    const tbody = document.getElementById("appTableBody");
    if (!tbody) return;

    tbody.innerHTML = rows.length
      ? rows
        .map((a, i) => {
          const job = jobById(a.jobId);
          return `
        <tr class="enq-row cursor-pointer">
          <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-[#150a04] flex-shrink-0" style="background:${AVATAR_PALETTE[i % AVATAR_PALETTE.length]}">${initials(a.name)}</span>
              <span class="enq-name text-[#f6f3ef] font-medium transition-colors">${a.name || "Unknown"}</span>
            </div>
          </td>
          <td class="px-2.5 py-2.5 text-[#c9c4bd] border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">${a.email || "—"}</td>
          <td class="px-2.5 py-2.5 text-[#c9c4bd] border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">${a.phone || "—"}</td>
          <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
            <span class="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-medium">${job ? job.title : "—"}</span>
          </td>
          <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
            <a href="${getResumeUrl(a.id)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-[11.5px] text-[#5ea8ff] hover:text-[#8cc2ff] transition-colors">${svg("file", "w-3.5 h-3.5")}Resume</a>
          </td>
          <td class="px-2.5 py-2.5 text-[#948d85] border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap font-mono text-[11.5px]">${formatDate(a.appliedAt || a.date)}</td>
          <td class="px-2.5 py-2.5 border-b border-orange-500/10 border-r border-orange-500/10 whitespace-nowrap">
            <span class="badge ${APP_STATUS_BADGE[a.status] || "badge-new"}">${APP_STATUS_LABEL[a.status] || "New"}</span>
          </td>
          <td class="px-2.5 py-2.5 border-b border-orange-500/10 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              <button type="button" class="icon-btn icon-btn-view" data-view-app="${a.id}" aria-label="View applicant">${svg("eye")}</button>
              <button type="button" class="icon-btn icon-btn-delete" data-delete-app="${a.id}" aria-label="Delete applicant">${svg("trash")}</button>
            </div>
          </td>
        </tr>
      `;
        })
        .join("")
      : `
      <tr><td colspan="8" class="px-2.5 py-10 text-center text-[#6d675c] text-[13px]">No applicants found.</td></tr>
    `;

    document.getElementById("appResultCount").textContent =
      total === 0
        ? "0 results"
        : `Showing ${start + 1}–${Math.min(start + state.pageSize, total)} of ${total}`;

    renderAppPagination(totalPages);
    wireApplicantRowActions();
  }

  function renderAppPagination(totalPages) {
    const el = document.getElementById("appPagination");
    if (!el) return;
    let buttons = `<button class="page-btn" data-page="prev" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>`;
    for (let p = 1; p <= totalPages; p++) {
      buttons += `<button class="page-btn ${p === state.page ? "is-active" : ""}" data-page="${p}">${p}</button>`;
    }
    buttons += `<button class="page-btn" data-page="next" ${state.page === totalPages ? "disabled" : ""} aria-label="Next page">›</button>`;
    el.innerHTML = buttons;

    el.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.page;
        if (val === "prev") state.page = Math.max(1, state.page - 1);
        else if (val === "next")
          state.page = Math.min(totalPages, state.page + 1);
        else state.page = parseInt(val, 10);
        renderApplicants();
      });
    });
  }

  function wireApplicantRowActions() {
    document.querySelectorAll("[data-view-app]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openApplicantModal(parseInt(b.dataset.viewApp, 10));
      });
    });
    document.querySelectorAll("[data-delete-app]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        requestDelete("applicant", parseInt(b.dataset.deleteApp, 10));
      });
    });
  }

  // ---------- APPLICANT DETAIL MODAL ----------
  function openApplicantModal(id) {
    const a = APPLICANTS.find((x) => x.id === id);
    if (!a) return;
    state.currentApplicantId = id;
    const job = jobById(a.jobId);

    document.getElementById("appModalBody").innerHTML = `
  <div class="pt-1">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <span class="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold text-[#150a04] flex-shrink-0"
            style="background:${AVATAR_PALETTE[id % AVATAR_PALETTE.length]}">
        ${initials(a.name)}
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-[15px] font-semibold text-[#f6f3ef] font-display truncate">${a.name || "Unknown"}</div>
        <div class="text-[12px] text-[#948d85] font-mono mt-0.5">Applied ${formatDate(a.appliedAt || a.date)}</div>
      </div>
      <span class="px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-full text-[11px] font-medium shrink-0">
        ${job ? job.title : "—"}
      </span>
    </div>

    <!-- Contact Info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
      <div class="bg-white/[0.03] border border-orange-500/10 rounded-lg p-3">
        <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1 flex items-center gap-1.5">
          ${svg("mail", "w-3 h-3")} Email
        </div>
        <div class="text-[13px] text-[#f6f3ef] font-mono break-all">${a.email || "—"}</div>
      </div>
      <div class="bg-white/[0.03] border border-orange-500/10 rounded-lg p-3">
        <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1 flex items-center gap-1.5">
          ${svg("phone", "w-3 h-3")} Phone
        </div>
        <div class="text-[13px] text-[#f6f3ef] font-mono">${a.phone || "—"}</div>
      </div>
    </div>

    <!-- Resume -->
    <div class="mb-5">
      <div class="flex items-center justify-between mb-1.5">
        <div class="text-[10px] uppercase tracking-wider text-[#948d85]">Resume</div>
        <a href="${getResumeUrl(a.id)}" download
           class="text-[11.5px] font-medium text-[#ff8a4c] hover:text-[#ffb37a] transition-colors flex items-center gap-1">
          ${svg("download", "w-3.5 h-3.5")} Download
        </a>
      </div>
      <div class="border border-orange-500/10 rounded-lg p-3.5 bg-white/[0.02]">
        <a href="${getResumeUrl(a.id)}" target="_blank"
           class="text-[13px] text-[#5ea8ff] hover:text-[#8cc2ff] transition-colors">
          ${a.resumeOriginalName || "View Resume"}
        </a>
      </div>
    </div>

    <!-- Cover Letter -->
    <div class="mb-6">
      <div class="text-[10px] uppercase tracking-wider text-[#948d85] mb-1.5">Cover Letter</div>
      <p class="text-[13px] text-[#c9c4bd] leading-relaxed bg-white/[0.03] border border-orange-500/10 rounded-lg p-3.5">
        ${a.coverMessage || a.coverLetter || '<span class="text-[#6d675c]">No cover letter submitted.</span>'}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <button type="button" id="saveApplicantBtn"
              class="px-5 py-2.5 rounded-lg bg-gradient-to-br from-[#ff8a4c] to-[#e6541c] text-[#150a04] text-[13px] font-semibold hover:opacity-90 transition-opacity">
        Save changes
      </button>
      <span class="save-flash" id="appSaveFlash">Saved</span>
    </div>
  </div>
`;

    document
      .getElementById("saveApplicantBtn")
      .addEventListener("click", async () => {
        const status = document.getElementById("appStatusSelect").value;
        const notes = document.getElementById("appNotesInput").value;

        await updateApplicationStatus(a.id, status);
        await updateApplicationNotes(a.id, notes);

        const flash = document.getElementById("appSaveFlash");
        flash.classList.add("is-shown");
        setTimeout(() => flash.classList.remove("is-shown"), 1600);
      });

    toggleModal("appModal", true);
  }

  // ---------- DELETE CONFIRMATION ----------
  function requestDelete(type, id) {
    state.pendingDelete = { type, id };
    const label =
      type === "job"
        ? jobById(id)?.title
        : APPLICANTS.find((a) => a.id === id)?.name;
    document.getElementById("deleteModalText").innerHTML =
      `This will permanently remove ${type === "job" ? "the job opening" : "the application from"} <span class="text-[#c9c4bd] font-medium">${label || "this record"}</span>. This cannot be undone.`;
    toggleModal("deleteModal", true);
  }

  async function confirmDelete() {
    if (!state.pendingDelete) return;
    const { type, id } = state.pendingDelete;
    if (type === "job") {
      await deleteJob(id);
    } else {
      await deleteApplication(id);
    }
    state.pendingDelete = null;
    toggleModal("deleteModal", false);
  }

  // ---------- FIELD VALIDATION ----------
  function setFieldError(groupId, message) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.classList.add("has-error");
    const errorEl = group.querySelector(".field-error");
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.classList.remove("has-error");
  }

  // ---------- MODAL HELPERS ----------
  function toggleModal(id, open) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.toggle("is-open", open);
  }

  // ---------- TOAST ----------
  function showToast(message, type = "success") {
    const existing = document.getElementById("adminToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = `fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-xl shadow-lg transition-all duration-500 ${type === "success"
      ? "bg-green-500/90 text-white"
      : "bg-red-500/90 text-white"
      }`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // ---------- POPULATE JOB FILTER ----------
  function populateJobFilterOptions() {
    const sel = document.getElementById("appJobFilter");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML =
      `<option value="all">All jobs</option>` +
      JOBS.map(
        (j) => `<option value="${j.id}">${j.title || "Untitled"}</option>`,
      ).join("");
    sel.value = [...sel.options].some((o) => o.value === current)
      ? current
      : "all";
  }

  // ---------- TOOLBARS ----------
  function wireToolbars() {
    const jobSearch = document.getElementById("jobSearchInput");
    if (jobSearch) {
      jobSearch.addEventListener("input", () => {
        state.jobSearch = jobSearch.value;
        renderJobs();
      });
    }

    // jobStatusFilter listener removed

    const appSearch = document.getElementById("appSearchInput");
    if (appSearch) {
      appSearch.addEventListener("input", () => {
        state.appSearch = appSearch.value;
        state.page = 1;
        renderApplicants();
      });
    }


    const appJob = document.getElementById("appJobFilter");
    if (appJob) {
      appJob.addEventListener("change", () => {
        state.appJob = appJob.value;
        state.page = 1;
        renderApplicants();
      });
    }
  }

  // ---------- MODALS WIRING ----------
  function wireModals() {
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () =>
        toggleModal(btn.dataset.closeModal, false),
      );
    });

    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) toggleModal(overlay.id, false);
      });
    });

    document
      .getElementById("confirmDeleteBtn")
      ?.addEventListener("click", confirmDelete);
    document.getElementById("saveJobBtn")?.addEventListener("click", saveJob);
    document
      .getElementById("addJobBtn")
      ?.addEventListener("click", () => openJobModal(null));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ["jobModal", "appModal", "deleteModal"].forEach((id) =>
          toggleModal(id, false),
        );
      }
    });
  }

// ---------- INIT ----------
async function init() {
    console.log('🔧 Admin Career Module initializing...');
    console.log('📡 API URL:', API_BASE_URL);
    
    // ✅ Check for tab from localStorage (set by dashboard link)
    const tabFromStorage = localStorage.getItem('careerTab');
    if (tabFromStorage === 'applicants') {
        state.tab = 'applicants';
        console.log('📋 Switching to Applicants tab from localStorage');
        // Clear it so it doesn't persist
        localStorage.removeItem('careerTab');
    }
    
    // Also check window.initialTab (set by URL parameter)
    if (window.initialTab === 'applicants') {
        state.tab = 'applicants';
        console.log('📋 Switching to Applicants tab from URL parameter');
    }

    if (!AUTH_TOKEN) {
        console.log("No token found, logging in...");
        const loggedIn = await loginAdmin();
        if (!loggedIn) {
            showToast("Failed to authenticate. Please check admin credentials.", "error");
            return;
        }
    }

    // If applicants tab is active, set it before loading data
    if (state.tab === 'applicants') {
        // Set active tab
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('is-active', b.dataset.tab === 'applicants');
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('is-active', p.id === 'panel-applicants');
        });
        // Update toolbar visibility
        updateToolbarVisibility();
    }

    await fetchJobs();
    await fetchApplicants();

    renderTabCounts();
    wireTabs();
    wireToolbars();
    wireModals();

    // Set initial toolbar visibility
    updateToolbarVisibility();

    console.log(
        `Admin Career Module ready! Jobs: ${JOBS.length}, Applicants: ${APPLICANTS.length}`,
    );
}
  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
