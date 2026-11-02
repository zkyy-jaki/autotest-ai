/**
 * AutoTest AI — script.js
 * ─────────────────────────────────────────────────────────────────
 * Responsibilities:
 *   1. Mobile sidebar toggle
 *   2. Simulate AI generation (2-second delay via setTimeout)
 *   3. Render dummy test-case rows into the results table
 *   4. Export visible table data as a properly-escaped CSV file
 * ─────────────────────────────────────────────────────────────────
 */

"use strict";

// ─────────────────────────────────────────────
// § 1 — DOM references
// ─────────────────────────────────────────────
const sidebar          = document.getElementById("sidebar");
const sidebarOverlay   = document.getElementById("sidebar-overlay");
const menuToggle       = document.getElementById("menu-toggle");
const requirementsInput = document.getElementById("requirements-input");
const generateBtn      = document.getElementById("generate-btn");
const exportBtn        = document.getElementById("export-btn");
const loadingIndicator = document.getElementById("loading-indicator");
const resultsSection   = document.getElementById("results-section");
const resultsTbody     = document.getElementById("results-tbody");
const resultCount      = document.getElementById("result-count");

// ─────────────────────────────────────────────
// § 2 — Dummy test-case data
//   Represents what an AI model might return.
//   Each object maps to one table row.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} TestCase
 * @property {string} id             - Unique test identifier
 * @property {string} scenario       - Human-readable scenario title
 * @property {string} expectedResult - What the system should do
 * @property {"Pass"|"Fail"|"Pending"} status
 */

/** @type {TestCase[]} */
const DUMMY_TEST_CASES = [
  {
    id: "TC-001",
    scenario: "Valid login with correct credentials",
    expectedResult: "User is redirected to the dashboard and a session token is created.",
    status: "Pass",
  },
  {
    id: "TC-002",
    scenario: "Login attempt with incorrect password",
    expectedResult: "System displays 'Invalid email or password' error; no session is created.",
    status: "Pass",
  },
  {
    id: "TC-003",
    scenario: "Login with empty email field",
    expectedResult: "Form validation prevents submission; 'Email is required' message is shown.",
    status: "Pass",
  },
  {
    id: "TC-004",
    scenario: "Login with malformed email format",
    expectedResult: "Inline validation rejects the email field before the form is submitted.",
    status: "Fail",
  },
  {
    id: "TC-005",
    scenario: "Login with empty password field",
    expectedResult: "Form validation prevents submission; 'Password is required' message is shown.",
    status: "Pass",
  },
  {
    id: "TC-006",
    scenario: "Account locked after 5 failed attempts",
    expectedResult: "Account is locked; user receives an email with unlock instructions.",
    status: "Pending",
  },
  {
    id: "TC-007",
    scenario: "Successful logout clears session",
    expectedResult: "Session token is invalidated; user is redirected to the login page.",
    status: "Pass",
  },
  {
    id: "TC-008",
    scenario: "Password reset flow via email link",
    expectedResult: "A unique, time-limited reset link is sent; password is updated on confirmation.",
    status: "Pending",
  },
];

// ─────────────────────────────────────────────
// § 3 — Status badge helper
//   Returns a Tailwind-styled <span> string
//   based on the test status value.
// ─────────────────────────────────────────────

/**
 * Builds a coloured badge HTML string for a given status.
 * @param {"Pass"|"Fail"|"Pending"} status
 * @returns {string} HTML string
 */
function buildStatusBadge(status) {
  const styles = {
    Pass:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Fail:    "bg-red-500/10 text-red-400 border-red-500/20",
    Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  const cls = styles[status] ?? "bg-slate-700 text-slate-400 border-slate-600";
  return `<span class="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}">${status}</span>`;
}

// ─────────────────────────────────────────────
// § 4 — Render rows into the results table
//   Clears existing rows, then appends one
//   <tr> per test case using a DocumentFragment
//   for a single DOM reflow.
// ─────────────────────────────────────────────

/**
 * Renders an array of TestCase objects into the results table body.
 * @param {TestCase[]} testCases
 */
function renderTestCases(testCases) {
  // Clear any previous results
  resultsTbody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  testCases.forEach((tc) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-slate-800/50 transition-colors";

    row.innerHTML = `
      <td class="px-6 py-4 font-mono text-xs text-emerald-400 whitespace-nowrap">${escapeHtml(tc.id)}</td>
      <td class="px-6 py-4 text-slate-200">${escapeHtml(tc.scenario)}</td>
      <td class="px-6 py-4 text-slate-400 leading-relaxed">${escapeHtml(tc.expectedResult)}</td>
      <td class="px-6 py-4 text-center">${buildStatusBadge(tc.status)}</td>
    `;

    fragment.appendChild(row);
  });

  resultsTbody.appendChild(fragment);

  // Update the subtitle count
  resultCount.textContent = `${testCases.length} test case${testCases.length !== 1 ? "s" : ""} generated`;
}

// ─────────────────────────────────────────────
// § 5 — UI state helpers
//   Centralise show/hide logic so the main
//   handler stays readable.
// ─────────────────────────────────────────────

/** Show the loading spinner and hide the results card. */
function showLoading() {
  loadingIndicator.classList.remove("hidden");
  loadingIndicator.classList.add("flex");
  resultsSection.classList.add("hidden");
  generateBtn.disabled = true;
  exportBtn.disabled = true;
}

/** Hide the spinner and reveal the results card. */
function showResults() {
  loadingIndicator.classList.add("hidden");
  loadingIndicator.classList.remove("flex");
  resultsSection.classList.remove("hidden");
  generateBtn.disabled = false;
  exportBtn.disabled = false;
}

// ─────────────────────────────────────────────
// § 6 — Generate button handler
//   1. Validates that the textarea is not empty.
//   2. Shows the loading indicator.
//   3. After a 2-second simulated AI delay,
//      renders the dummy test cases and reveals
//      the results card.
// ─────────────────────────────────────────────
generateBtn.addEventListener("click", () => {
  const requirements = requirementsInput.value.trim();

  // Basic validation — ensure the user provided input
  if (!requirements) {
    requirementsInput.focus();
    requirementsInput.classList.add("ring-2", "ring-red-500", "border-red-500");
    // Remove error styles once the user starts typing again
    requirementsInput.addEventListener(
      "input",
      () => requirementsInput.classList.remove("ring-2", "ring-red-500", "border-red-500"),
      { once: true }
    );
    return;
  }

  showLoading();

  // ─── Simulate a 2-second AI processing delay ───
  setTimeout(() => {
    renderTestCases(DUMMY_TEST_CASES);
    showResults();

    // Smooth-scroll to the results card
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 2000);
});

// ─────────────────────────────────────────────
// § 7 — CSV Export
//   Reads the current table data and produces a
//   downloadable .csv file.
//
//   RFC 4180 escaping rules applied:
//     • Wrap any field in double-quotes if it
//       contains a comma, double-quote, or newline.
//     • Escape a literal double-quote by doubling
//       it ("").
// ─────────────────────────────────────────────

/**
 * Escapes a single CSV field according to RFC 4180.
 * @param {string} field
 * @returns {string}
 */
function escapeCsvField(field) {
  const str = String(field);
  // If the field contains a comma, double-quote, or newline — wrap in quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

exportBtn.addEventListener("click", () => {
  // CSV header row
  const headers = ["Test ID", "Scenario", "Expected Result", "Status"];

  // Build data rows from the current DUMMY_TEST_CASES array
  const dataRows = DUMMY_TEST_CASES.map((tc) =>
    [tc.id, tc.scenario, tc.expectedResult, tc.status].map(escapeCsvField).join(",")
  );

  // Combine header + rows with CRLF line endings (standard CSV)
  const csvContent = [headers.map(escapeCsvField).join(","), ...dataRows].join("\r\n");

  // Create a Blob and trigger a browser download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);

  const anchor    = document.createElement("a");
  anchor.href     = url;
  anchor.download = "autotest-ai-results.csv";

  // Append to DOM momentarily to trigger download in all browsers
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up: remove element and revoke the object URL
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
});

// ─────────────────────────────────────────────
// § 8 — Mobile sidebar toggle
//   Opens/closes the sidebar on small screens
//   and toggles the backdrop overlay.
// ─────────────────────────────────────────────

/** Opens the mobile sidebar and shows the overlay. */
function openSidebar() {
  sidebar.classList.remove("-translate-x-full");
  sidebarOverlay.classList.remove("hidden");
  menuToggle.setAttribute("aria-expanded", "true");
}

/** Closes the mobile sidebar and hides the overlay. */
function closeSidebar() {
  sidebar.classList.add("-translate-x-full");
  sidebarOverlay.classList.add("hidden");
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  isOpen ? closeSidebar() : openSidebar();
});

// Close sidebar when the overlay backdrop is clicked
sidebarOverlay.addEventListener("click", closeSidebar);

// Close sidebar when the viewport is resized to ≥ md (768 px)
window.addEventListener("resize", () => {
  if (window.innerWidth >= 768) closeSidebar();
});

// ─────────────────────────────────────────────
// § 9 — Security helper
//   Prevents XSS if user-supplied text were
//   ever injected into innerHTML.
// ─────────────────────────────────────────────

/**
 * Escapes HTML special characters in a string.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
