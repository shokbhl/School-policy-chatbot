// =========================
// CMS Policy Chatbot - app.js
// =========================

// ===== CONFIG =====
const API_URL = "https://school-policy-worker-v2.shokbhl.workers.dev/api";

// Menu items (for quick jump)
const MENU_ITEMS = {
  policies: [
    { id: "safe_arrival", label: "Safe Arrival & Dismissal" },
    { id: "playground_safety", label: "Playground Safety" },
    { id: "anaphylaxis_policy", label: "Anaphylaxis Policy" },
    { id: "medication_administration", label: "Medication Administration" },
    { id: "emergency_management", label: "Emergency Management" },
    { id: "sleep_toddlers", label: "Sleep – Toddler & Preschool" },
    { id: "sleep_infants", label: "Sleep – Infants" },
    { id: "students_volunteers", label: "Supervision of Students & Volunteers" },
    { id: "waiting_list", label: "Waiting List" },
    { id: "program_statement", label: "Program Statement Implementation" },
    { id: "staff_development", label: "Staff Development & Training" },
    { id: "parent_issues_concerns", label: "Parent Issues & Concerns" },
    { id: "behaviour_management_monitoring", label: "Behaviour Management Monitoring" },
    { id: "fire_safety", label: "Fire Safety Evacuation" },
    { id: "criminal_reference_vsc_policy", label: "Criminal Reference / VSC" }
  ],
  protocols: [
    { id: "program_statement1", label: "CMS Program Statement and Implementation" },
    { id: "non_discrimination", label: "Non-Discrimination / Anti-Racism Policy" },
    { id: "safety_security", label: "Safety & Security" },
    { id: "start_school_year", label: "Start of the New School Year" },
    { id: "employee_conduct", label: "Employee Protocol / Conduct" },
    { id: "classroom_management", label: "Classroom Management & Routines" },
    { id: "caring_students", label: "Caring for Our Students" },
    { id: "afterschool_routines", label: "Afterschool Routines & Extracurricular Activities" },
    { id: "special_events", label: "Special Events" },
    { id: "reports_forms", label: "Reports & Forms" },
    { id: "other", label: "Other" },
    { id: "closing", label: "In closing" }
  ],
  handbook: [
    // Campus-specific - just open campus handbook (worker decides, but we also have a direct button behavior)
  ]
};

const CAMPUS_OPTIONS = ["YC", "MC", "TC", "SC", "WC"];

// ===== DOM =====
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const campusSelect = document.getElementById("campus");
const loginError = document.getElementById("login-error");

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

const headerActions = document.getElementById("header-actions");
const logoutBtn = document.getElementById("logout-btn");
const topMenuBar = document.getElementById("top-menu-bar");
const campusBadge = document.getElementById("campus-badge");

const menuPills = document.querySelectorAll(".menu-pill");

const menuPanel = document.getElementById("menu-panel");
const menuPanelTitle = document.getElementById("menu-panel-title");
const menuPanelBody = document.getElementById("menu-panel-body");
const menuPanelClose = document.getElementById("menu-panel-close");
const menuOverlay = document.getElementById("menu-overlay");

// ===== STATE =====
let typingBubble = null;
let currentUser = null; // { username, role, campuses }
let currentCampus = null;

// ===== HELPERS =====
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(role, htmlText) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  msg.innerHTML = htmlText;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function clearChat() {
  chatWindow.innerHTML = "";
}

function showTyping() {
  hideTyping();
  const wrapper = document.createElement("div");
  wrapper.className = "typing-bubble";

  const dots = document.createElement("div");
  dots.className = "typing-dots";

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    dots.appendChild(dot);
  }

  wrapper.appendChild(dots);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  typingBubble = wrapper;
}

function hideTyping() {
  if (typingBubble && typingBubble.parentNode) {
    typingBubble.parentNode.removeChild(typingBubble);
  }
  typingBubble = null;
}

function setCampusBadge(campus) {
  if (!campusBadge) return;
  campusBadge.textContent = campus ? `Campus: ${campus}` : "Campus: —";
}

function setLoggedInUI(isLoggedIn) {
  if (isLoggedIn) {
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    headerActions.classList.remove("hidden");
    topMenuBar.classList.remove("hidden");
  } else {
    chatScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    headerActions.classList.add("hidden");
    topMenuBar.classList.add("hidden");
  }
}

// ===== MENU PANEL =====
function openMenuPanel(type) {
  menuPills.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.menu === type)
  );

  menuPanelTitle.textContent =
    type === "policies" ? "Policies" : type === "protocols" ? "Protocols" : "Parent Handbook";

  menuPanelBody.innerHTML = "";

  if (type === "handbook") {
    // handbook is campus specific
    const p = document.createElement("p");
    p.className = "menu-hint";
    p.textContent = `Open Parent Handbook for campus: ${currentCampus || "—"}`;
    menuPanelBody.appendChild(p);

    const btn = document.createElement("button");
    btn.className = "menu-item-btn";
    btn.textContent = `Open Parent Handbook (${currentCampus || "Select campus"})`;
    btn.disabled = !currentCampus;
    btn.addEventListener("click", () => {
      closeMenuPanel();
      // Ask a direct question so worker picks handbook
      askPolicy("Open the Parent Handbook", true);
    });
    menuPanelBody.appendChild(btn);
  } else {
    const items = MENU_ITEMS[type] || [];

    const label = document.createElement("div");
    label.className = "menu-group-label";
    label.textContent = "Tap an item to view details";
    menuPanelBody.appendChild(label);

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "menu-item-btn";
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        closeMenuPanel();
        const qPrefix = type === "protocols"
          ? "Please show me the protocol: "
          : "Please show me the policy: ";
        askPolicy(qPrefix + item.label, true);
      });
      menuPanelBody.appendChild(btn);
    });
  }

  menuPanel.classList.remove("hidden");
  menuOverlay.classList.add("active");
}

function closeMenuPanel() {
  menuPanel.classList.add("hidden");
  menuOverlay.classList.remove("active");
  menuPills.forEach((btn) => btn.classList.remove("active"));
}

menuPills.forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.menu;
    if (btn.classList.contains("active")) closeMenuPanel();
    else openMenuPanel(type);
  });
});

menuPanelClose?.addEventListener("click", closeMenuPanel);
menuOverlay?.addEventListener("click", closeMenuPanel);

// ===== LOGIN =====
// We authenticate via worker by calling /api with a special login query.
// (Worker must support auth OR you can keep this client-side for now if already implemented.)
// For now: We'll call the worker with query "__LOGIN__" and expect user info back.
// If your worker login endpoint differs, tell me and I’ll adjust.

async function doLogin(username, password, campus) {
  // Here we call API with a login payload style your worker can recognize.
  // If you already implemented /api login logic: use body.mode = "login".
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "login",
      username,
      password,
      campus
    })
  });

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.error || "Login failed." };
  }
  if (!data?.ok) {
    return { ok: false, error: data?.error || "Invalid credentials." };
  }
  return { ok: true, user: data.user, campus: data.campus };
}

function initCampusOptions() {
  if (!campusSelect) return;
  campusSelect.innerHTML = `<option value="">Select campus…</option>`;
  CAMPUS_OPTIONS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    campusSelect.appendChild(opt);
  });
}
initCampusOptions();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const username = (usernameInput.value || "").trim();
  const password = (passwordInput.value || "").trim();
  const campus = (campusSelect.value || "").trim();

  if (!username || !password || !campus) {
    loginError.textContent = "Please enter username, password, and campus.";
    return;
  }

  // Attempt login
  loginError.textContent = "Signing in…";
  try {
    const result = await doLogin(username, password, campus);

    if (!result.ok) {
      loginError.textContent = result.error;
      return;
    }

    currentUser = result.user;
    currentCampus = result.campus || campus;
    setCampusBadge(currentCampus);

    // Save session (simple)
    localStorage.setItem("cms_session", JSON.stringify({
      username,
      campus: currentCampus
    }));

    // Show app
    setLoggedInUI(true);
    clearChat();

    addMessage(
      "assistant",
      `Hi 👋 You can ask about any CMS policy/protocol, or open your campus Parent Handbook from the menu above.`
    );

    // clear fields
    usernameInput.value = "";
    passwordInput.value = "";
    campusSelect.value = currentCampus;

  } catch (err) {
    loginError.textContent = "Could not reach server. Please try again.";
  }
});

// ===== LOGOUT =====
logoutBtn.addEventListener("click", () => {
  closeMenuPanel();
  currentUser = null;
  currentCampus = null;
  setCampusBadge(null);

  localStorage.removeItem("cms_session");

  setLoggedInUI(false);
  clearChat();
  loginError.textContent = "";
});

// ===== AUTO RESTORE SESSION (optional) =====
(async function restoreSession() {
  const raw = localStorage.getItem("cms_session");
  if (!raw) return;

  try {
    const sess = JSON.parse(raw);
    if (!sess?.username || !sess?.campus) return;

    // We cannot restore password securely; keep logged out.
    // You can remove this whole block if you don't want it.
    campusSelect.value = sess.campus;
    setCampusBadge(null);
  } catch {}
})();

// ===== CHAT / API =====
function buildTitleFromSource(policyObj) {
  if (!policyObj) return "Result:";
  const source = policyObj.source;
  const campus = policyObj.campus;

  let prefix = "";
  if (source === "policy") prefix = "Policy: ";
  else if (source === "protocol") prefix = "Protocol: ";
  else if (source === "handbook") prefix = `Parent Handbook (${campus || currentCampus || ""}): `;
  else prefix = "";

  return `${prefix}${policyObj.title || "Result"}`;
}

function buildLinkHtml(policyObj) {
  if (!policyObj?.link) return "";
  const label =
    policyObj.source === "handbook" ? "Open full document" :
    policyObj.source === "protocol" ? "Open full protocol" :
    "Open full policy";
  return `<br><br><a href="${escapeHtml(policyObj.link)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

async function askPolicy(question, fromMenu = false) {
  const trimmed = (question || "").trim();
  if (!trimmed) return;

  if (!currentCampus) {
    addMessage("assistant", "Please login and select a campus first.");
    return;
  }

  addMessage("user", escapeHtml(trimmed));
  showTyping();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: trimmed,
        campus: currentCampus
      })
    });

    hideTyping();

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error || "Network error — please try again.";
      addMessage("assistant", escapeHtml(msg));
      return;
    }

    // If worker returns { error: ... } with 200
    if (data?.error) {
      addMessage("assistant", escapeHtml(data.error));
      return;
    }

    const title = buildTitleFromSource(data.policy);
    const answer = data.answer || "";
    const linkPart = buildLinkHtml(data.policy);

    addMessage(
      "assistant",
      `<b>${escapeHtml(title)}</b><br><br>${escapeHtml(answer)}${linkPart}`
    );
  } catch (err) {
    hideTyping();
    addMessage("assistant", "Error connecting to server.");
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = (userInput.value || "").trim();
  if (!q) return;
  userInput.value = "";
  askPolicy(q, false);
});
