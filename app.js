// ===== CONFIG =====
const API_URL = "https://school-policy-worker-v2.shokbhl.workers.dev/api";

// ===== DOM =====
const loginScreen = document.getElementById("login-screen");
const chatScreen  = document.getElementById("chat-screen");

const loginForm = document.getElementById("login-form");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const campusEl   = document.getElementById("campus");
const loginError = document.getElementById("login-error");

const chatWindow = document.getElementById("chat-window");
const chatForm   = document.getElementById("chat-form");
const userInput  = document.getElementById("user-input");

const topActions = document.getElementById("top-actions");
const campusPill = document.getElementById("campus-pill");
const logoutBtn  = document.getElementById("logout-btn");

const menuPills      = document.querySelectorAll(".menu-pill");
const menuPanel      = document.getElementById("menu-panel");
const menuPanelTitle = document.getElementById("menu-panel-title");
const menuPanelBody  = document.getElementById("menu-panel-body");
const menuPanelClose = document.getElementById("menu-panel-close");
const menuOverlay    = document.getElementById("menu-overlay");

// ===== STATE =====
let SESSION = {
  token: null,
  campus: null,
  role: null,
  username: null
};

// simple menu items
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

// ===== UI HELPERS =====
function clearChat(){ chatWindow.innerHTML = ""; }

function addMessage(role, html) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = html;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setLoggedInUI(on){
  if (on) {
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    topActions.classList.remove("hidden");
    campusPill.textContent = `Campus: ${SESSION.campus || "—"}`;
  } else {
    chatScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    topActions.classList.add("hidden");
  }
}

// ===== LOGIN =====
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  const campus   = (campusEl.value || "").trim().toUpperCase();

  if (!username || !password || !campus) {
    loginError.textContent = "Please enter username, password, and campus.";
    return;
  }

  try {
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

    if (!res.ok || !data.ok) {
      loginError.textContent = data.error || "Login failed.";
      return;
    }

    SESSION.token = data.token;
    SESSION.campus = data.user?.campus || campus;
    SESSION.role = data.user?.role || "staff";
    SESSION.username = data.user?.username || username;

    // persist
    localStorage.setItem("cms_session", JSON.stringify(SESSION));

    setLoggedInUI(true);
    clearChat();
    addMessage("assistant", `Hi 👋 You can ask about any CMS policy/protocol, or open your campus Parent Handbook from the menu above.`);
  } catch (err) {
    loginError.textContent = "Network error. Please try again.";
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("cms_session");
  SESSION = { token:null, campus:null, role:null, username:null };
  closeMenuPanel();
  clearChat();
  setLoggedInUI(false);
});

// restore session
(function restore(){
  const raw = localStorage.getItem("cms_session");
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s && s.token) {
      SESSION = s;
      setLoggedInUI(true);
      addMessage("assistant", `Hi 👋 You can ask about any CMS policy/protocol, or open your campus Parent Handbook from the menu above.`);
    }
  } catch {}
})();

// ===== MENU PANEL =====
function openMenuPanel(type){
  menuPills.forEach(btn => btn.classList.toggle("active", btn.dataset.menu === type));
  menuPanelTitle.textContent =
    type === "policies" ? "Policies" :
    type === "protocols" ? "Protocols" :
    "Parent Handbook";

  menuPanelBody.innerHTML = "";

  const items = MENU_ITEMS[type] || [];
  items.forEach(label => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = () => {
      closeMenuPanel();
      if (type === "handbook") {
        ask(`Open Parent Handbook for campus ${SESSION.campus}`);
      } else {
        ask(`Please show me the ${type === "protocols" ? "protocol" : "policy"}: ${label}`);
      }
    };
    menuPanelBody.appendChild(btn);
  });

  menuOverlay.classList.remove("hidden");
  menuPanel.classList.remove("hidden");
}
function closeMenuPanel(){
  menuOverlay.classList.add("hidden");
  menuPanel.classList.add("hidden");
  menuPills.forEach(btn => btn.classList.remove("active"));
}
menuPills.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const type = btn.dataset.menu;
    if (btn.classList.contains("active")) closeMenuPanel();
    else openMenuPanel(type);
  });
});
menuPanelClose.addEventListener("click", closeMenuPanel);
menuOverlay.addEventListener("click", closeMenuPanel);

// ===== ASK =====
async function ask(question){
  const q = (question || "").trim();
  if (!q) return;

  addMessage("user", escapeHtml(q));

  if (!SESSION.token) {
    addMessage("assistant", "Please login first.");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SESSION.token}`
      },
      body: JSON.stringify({ query: q })
    });

    const data = await res.json();

    if (!res.ok) {
      addMessage("assistant", escapeHtml(data.error || "Something went wrong."));
      return;
    }

    const title = data.policy?.title || "Result";
    const sourceType = (data.policy?.source_type || "").toLowerCase();

    const sourceLabel =
      sourceType === "policy"   ? "Policy" :
      sourceType === "protocol" ? "Protocol" :
      sourceType === "handbook" ? `Parent Handbook - ${SESSION.campus}` :
      "Source";

    const link = data.policy?.link
      ? `<div style="margin-top:10px;"><a href="${data.policy.link}" target="_blank" rel="noopener">Open full document</a></div>`
      : "";

    addMessage(
      "assistant",
      `<b>${escapeHtml(title)}</b>
       <div class="source-badge">${escapeHtml(sourceLabel)}</div>
       <div style="margin-top:10px;">${escapeHtml(data.answer || "")}</div>
       ${link}`
    );
  } catch (err) {
    addMessage("assistant", "Network error — please try again.");
  }
}

chatForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const q = userInput.value.trim();
  if (!q) return;
  userInput.value = "";
  ask(q);
});

// ===== tiny helper =====
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
