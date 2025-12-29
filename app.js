// ===== CONFIG =====
const API_BASE = "https://school-policy-worker-v2.shokbhl.workers.dev";
const ENDPOINT_AUTH = `${API_BASE}/auth`;
const ENDPOINT_API = `${API_BASE}/api`;

let authToken = null;
let currentCampus = null;
let currentRole = null;

// ===== DOM =====
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const campusSelect = document.getElementById("campus");
const loginError = document.getElementById("login-error");

const topActions = document.getElementById("top-actions");
const campusPill = document.getElementById("campus-pill");
const logoutBtn = document.getElementById("logout-btn");

const menuPills = document.querySelectorAll(".menu-pill");
const menuPanel = document.getElementById("menu-panel");
const menuPanelTitle = document.getElementById("menu-panel-title");
const menuPanelBody = document.getElementById("menu-panel-body");
const menuPanelClose = document.getElementById("menu-panel-close");
const menuOverlay = document.getElementById("menu-overlay");

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

// ===== MENU =====
const MENU_ITEMS = {
  policies: [
    "Safe Arrival & Dismissal",
    "Playground Safety",
    "Anaphylaxis Policy",
    "Medication Administration",
    "Emergency Management",
    "Sleep – Toddler & Preschool",
    "Sleep – Infants",
    "Supervision of Students & Volunteers",
    "Waiting List",
    "Program Statement Implementation",
    "Staff Development & Training",
    "Parent Issues & Concerns",
    "Behaviour Management Monitoring",
    "Fire Safety Evacuation",
    "Criminal Reference / VSC"
  ],
  protocols: [
    "CMS Program Statement and Implementation",
    "Non-Discrimination / Anti-Racism Policy",
    "Safety & Security",
    "Start of the New School Year",
    "Employee Protocol / Conduct",
    "Classroom Management & Routines",
    "Caring for Our Students",
    "Afterschool Routines & Extracurricular Activities",
    "Special Events",
    "Reports & Forms",
    "Other",
    "In closing"
  ],
  handbook: [
    "Open my campus Parent Handbook"
  ]
};

// ===== UI helpers =====
function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.toggle("hidden", !msg);
}
function addMessage(role, html) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  msg.innerHTML = html;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
function clearChat() { chatWindow.innerHTML = ""; }

// ===== LOGIN =====
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showLoginError("");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const campus = campusSelect.value;

  if (!username || !password || !campus) {
    showLoginError("Please enter username, password, and campus.");
    return;
  }

  try {
    const res = await fetch(ENDPOINT_AUTH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, campus })
    });

    const data = await res.json();

    if (!res.ok) {
      showLoginError(data.error || "Login failed.");
      return;
    }

    authToken = data.token;
    currentCampus = data.campus;
    currentRole = data.role;

    // Switch screens
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    topActions.classList.remove("hidden");

    campusPill.textContent = `Campus: ${currentCampus}`;
    clearChat();
    addMessage("assistant",
      `Hi 👋 Ask about any CMS policy or protocol.<br>
       <span class="muted">Tip: Parent Handbook answers will be campus-specific (${currentCampus}).</span>`
    );
  } catch {
    showLoginError("Network error. Please try again.");
  }
});

// ===== LOGOUT =====
logoutBtn.addEventListener("click", () => {
  authToken = null;
  currentCampus = null;
  currentRole = null;

  closeMenuPanel();
  chatScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  topActions.classList.add("hidden");

  usernameInput.value = "";
  passwordInput.value = "";
  campusSelect.value = "";

  clearChat();
});

// ===== MENU PANEL =====
function openMenuPanel(type) {
  menuPills.forEach(btn => btn.classList.toggle("active", btn.dataset.menu === type));
  menuPanelTitle.textContent = type === "policies" ? "Policies" : type === "protocols" ? "Protocols" : "Parent Handbook";
  menuPanelBody.innerHTML = "";

  const items = MENU_ITEMS[type] || [];
  items.forEach(label => {
    const btn = document.createElement("button");
    btn.className = "menu-item-btn";
    btn.textContent = label;
    btn.onclick = () => {
      closeMenuPanel();
      if (type === "handbook") {
        askAPI(`Please show my campus Parent Handbook (${currentCampus}).`);
      } else {
        const prefix = type === "protocols" ? "Please show me the protocol: " : "Please show me the policy: ";
        askAPI(prefix + label);
      }
    };
    menuPanelBody.appendChild(btn);
  });

  menuPanel.classList.remove("hidden");
  menuOverlay.classList.add("active");
}
function closeMenuPanel() {
  menuPanel.classList.add("hidden");
  menuOverlay.classList.remove("active");
  menuPills.forEach(btn => btn.classList.remove("active"));
}
menuPills.forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.menu;
    if (btn.classList.contains("active")) closeMenuPanel();
    else openMenuPanel(type);
  });
});
menuPanelClose.addEventListener("click", closeMenuPanel);
menuOverlay.addEventListener("click", closeMenuPanel);

// ===== CHAT =====
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = userInput.value.trim();
  if (!q) return;
  userInput.value = "";
  askAPI(q);
});

async function askAPI(question) {
  addMessage("user", escapeHtml(question));

  try {
    const res = await fetch(ENDPOINT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ query: question })
    });

    const data = await res.json();

    if (!res.ok) {
      addMessage("assistant", `<b>Error:</b> ${escapeHtml(data.error || "Request failed")}`);
      return;
    }

    const src = data.source || {};
    const sourceLine = src.type && src.title
      ? `<div class="source-pill">${escapeHtml(src.type)} • ${escapeHtml(src.title)}</div>`
      : "";

    const linkLine = src.link
      ? `<a class="doc-link" href="${src.link}" target="_blank">Open full document</a>`
      : "";

    addMessage("assistant",
      `${sourceLine}
       <div class="answer">${escapeHtml(data.answer || "")}</div>
       ${linkLine ? `<div class="link-wrap">${linkLine}</div>` : ""}`
    );

  } catch {
    addMessage("assistant", "Network error — please try again.");
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}
