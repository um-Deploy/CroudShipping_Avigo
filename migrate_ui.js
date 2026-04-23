const fs = require('fs');
const path = require('path');

const bPath = 'e:/Backup Avigo/12 March commit/Antigravity/backend/adminFrontend';
const htmlPath = path.join(bPath, 'admin_dashboard.html');
const cssDir = path.join(bPath, 'css');
const jsDir = path.join(bPath, 'js');

if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Extract CSS manually (faster than Regex on huge strings)
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');

if (styleStart !== -1 && styleEnd !== -1) {
    const cssContent = html.substring(styleStart + 7, styleEnd).trim();
    fs.writeFileSync(path.join(cssDir, 'admin_dashboard.css'), cssContent);
    // Replace in HTML
    html = html.substring(0, styleStart) + 
           '<link rel="stylesheet" href="./css/admin_dashboard.css">' +
           html.substring(styleEnd + 8);
}

// 2. Extract JS logic manually
// Get the last <script> tag which holds the actual logic (the first is socket.io)
const finalScriptIndex = html.lastIndexOf('<script>');
const finalScriptEnd = html.lastIndexOf('</script>');

if (finalScriptIndex !== -1 && finalScriptEnd !== -1) {
    const jsContent = html.substring(finalScriptIndex + 8, finalScriptEnd).trim();
    
    // We are extracting specific chunks and saving them as files
    
    // --- globals.js ---
    let globals = `
const API = "http://localhost:5000/api";
const token = localStorage.getItem("token");
let allOrders = [];
if (!token) window.location.href = "admin_login.html";
`;

    // --- theme.js ---
    let theme = `
// ── THEME ──────────────────────────────────────
const savedTheme = localStorage.getItem("avigo-theme") || "dark";
setTheme(savedTheme);

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("avigo-theme", theme);
  const checkbox = document.getElementById("themeToggle");
  const emoji = document.getElementById("toggleEmoji");
  if (theme === "light") {
    if(checkbox) checkbox.checked = true;
    if(emoji) emoji.textContent = "☀️";
  } else {
    if(checkbox) checkbox.checked = false;
    if(emoji) emoji.textContent = "🌙";
  }
}

function toggleTheme(cb) {
  setTheme(cb.checked ? "light" : "dark");
}
`;

    // --- uiUtils.js ---
    let uiUtils = `
// ── DATE ───────────────────────────────────────
const now = new Date();
const dateEl = document.getElementById("topbar-date");
if(dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── TOAST ──────────────────────────────────────
function showToast(title, msg, color) {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderLeftColor = color || 'var(--accent)';
  t.innerHTML = \`<div class="toast-title">\${title}</div><div class="toast-msg">\${msg}</div>\`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ── COUNTER ────────────────────────────────────
function animateCount(el, target) {
  if(!el) return;
  const start = parseInt(el.textContent) || 0;
  const dur = 600, t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "admin_login.html";
}

function showTab(tabId, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
  const section = document.getElementById(tabId + '-section');
  if(section) section.style.display = 'block';

  if (tabId === 'users' && typeof loadUsers === 'function') loadUsers();
  if (tabId === 'partners' && typeof loadPartners === 'function') loadPartners();
}
`;

    // --- socketEvents.js ---
    let socketJs = `
// ── SOCKET ─────────────────────────────────────
const socket = io("http://localhost:5000");

socket.on("connect", () => {
  showToast("🟢 CONNECTED", "Real-time sync active");
});

socket.on("userCreated", data => {
  if(typeof loadDashboard === 'function') loadDashboard();
  showToast("👤 NEW USER", data.name || "A new user registered");
});

socket.on("newOrderCreated", data => {
  if(typeof loadDashboard === 'function') loadDashboard(); 
  if(typeof loadOrders === 'function') loadOrders();
  showToast("📦 NEW ORDER", "A new delivery order was placed");
});

socket.on("orderAccepted", data => {
  if(typeof loadDashboard === 'function') loadDashboard(); 
  if(typeof loadOrders === 'function') loadOrders();
  showToast("✅ ORDER ACCEPTED", "A partner accepted an order", "#4895ef");
});

socket.on("orderStatusUpdated", data => {
  if(typeof loadDashboard === 'function') loadDashboard(); 
  if(typeof loadOrders === 'function') loadOrders();
  showToast("🔄 STATUS UPDATE", \`Order status: \${data.status || 'updated'}\`, "#7b61ff");
});
`;

    // --- dashboard.js ---
    let dashboardJs = `
// ── DASHBOARD ──────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch(API + "/dashboard/stats", { headers: { "Authorization": "Bearer " + token } });
    const data = await res.json();
    animateCount(document.getElementById("users"), data.totalUsers || 0);
    animateCount(document.getElementById("partners"), data.totalPartners || 0);
    animateCount(document.getElementById("orders"), data.totalOrders || 0);
    animateCount(document.getElementById("active"), data.activeOrders || 0);
  } catch (e) { console.warn("Dashboard error", e); }
}

loadDashboard();
`;

    // --- orders.js ---
    let ordersJs = `
// ── ORDERS ─────────────────────────────────────
async function loadOrders() {
  try {
    const res = await fetch(API + "/orders/all", { headers: { "Authorization": "Bearer " + token } });
    allOrders = await res.json();
    renderOrders(allOrders);
  } catch (e) { console.warn("Orders error", e); }
}

function renderOrders(orders) {
  const table = document.getElementById("orderTable");
  if(!table) return;
  document.getElementById("order-count").textContent = orders.length;

  if (!orders.length) {
    table.innerHTML = \`<tr><td colspan="6"><div class="empty-state">
  <div class="empty-icon">📭</div>
  <div class="empty-text">No orders found</div>
</div></td></tr>\`;
    return;
  }

  table.innerHTML = orders.map(o => {
    const uName = o.userId?.name || "—";
    const uInit = uName !== "—" ? uName[0].toUpperCase() : "?";
    const pName = o.partnerId?.name || "Unassigned";
    const pInit = o.partnerId?.name ? o.partnerId.name[0].toUpperCase() : "?";

    return \`<tr>
  <td><span class="order-id">#\${o._id.slice(-6).toUpperCase()}</span></td>
  <td>
    <div class="user-cell">
      <div class="avatar user-av">\${uInit}</div>
      <div>
        <div class="cell-name">\${uName}</div>
        <div class="cell-phone">\${o.userId?.phone || ""}</div>
      </div>
    </div>
  </td>
  <td>
    <div class="user-cell">
      <div class="avatar partner-av">\${pInit}</div>
      <div>
        <div class="cell-name">\${pName}</div>
        <div class="cell-phone">\${o.partnerId?.phone || ""}</div>
      </div>
    </div>
  </td>
  <td><span class="status \${o.status}">\${o.status.replace('_', ' ')}</span></td>
  <td><span class="address-text" title="\${o.pickup?.address || ''}">\${o.pickup?.address || "—"}</span></td>
  <td><span class="address-text" title="\${o.drop?.address || ''}">\${o.drop?.address || "—"}</span></td>
</tr>\`;
  }).join('');
}

function filterOrders(filter, btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderOrders(filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter));
}

loadOrders();
`;

    // --- users.js ---
    let usersJs = `
// ── USERS ──────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch(API + "/users/all", { headers: { "Authorization": "Bearer " + token } });
    if (res.ok) {
      const users = await res.json();
      renderUsers(users);
    }
  } catch (e) { console.warn("Users error", e); }
}

function renderUsers(users) {
  const table = document.getElementById("usersTable");
  if(!table) return;
  document.getElementById("users-count").textContent = users.length;
  if (!users.length) { table.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="empty-state"><div class="empty-text">No users</div></div></td></tr>'; return; }
  table.innerHTML = users.map(u => \`<tr>
<td><span class="order-id">#\${u._id.slice(-6).toUpperCase()}</span></td>
<td><div class="user-cell"><div class="avatar user-av">\${u.name ? u.name[0].toUpperCase() : '?'}</div><div class="cell-name">\${u.name || "—"}</div></div></td>
<td><div class="cell-phone">\${u.phone || "—"}</div></td>
<td><span class="status" style="background: rgba(109,79,232,0.1); color: var(--accent3); border: 1px solid rgba(109,79,232,0.25);">\${u.role}</span></td>
<td><div class="cell-phone">\${new Date(u.createdAt).toLocaleDateString()}</div></td>
</tr>\`).join('');
}
`;

    // --- partners.js ---
    let partnersJs = `
// ── PARTNERS ───────────────────────────────────
async function loadPartners() {
  try {
    const res = await fetch(API + "/partners/all", { headers: { "Authorization": "Bearer " + token } });
    if (res.ok) {
      const partners = await res.json();
      renderPartners(partners);
    }
  } catch (e) { console.warn("Partners error", e); }
}

function renderPartners(partners) {
  const table = document.getElementById("partnersTable");
  if(!table) return;
  document.getElementById("partners-count").textContent = partners.length;
  if (!partners.length) { table.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="empty-state"><div class="empty-text">No partners</div></div></td></tr>'; return; }
  table.innerHTML = partners.map(p => \`<tr>
<td><span class="order-id">#\${p._id.slice(-6).toUpperCase()}</span></td>
<td><div class="user-cell"><div class="avatar partner-av">\${p.name ? p.name[0].toUpperCase() : '?'}</div><div class="cell-name">\${p.name || "—"}</div></div></td>
<td><div class="cell-phone">\${p.phone || "—"}</div></td>
<td><span class="order-id">\${p.vehicleType || "N/A"}</span></td>
<td><span class="status \${p.isOnline ? 'delivered' : 'pending'}">\${p.isOnline ? 'Online' : 'Offline'}</span></td>
</tr>\`).join('');
}
`;

    fs.writeFileSync(path.join(jsDir, 'globals.js'), globals);
    fs.writeFileSync(path.join(jsDir, 'theme.js'), theme);
    fs.writeFileSync(path.join(jsDir, 'uiUtils.js'), uiUtils);
    fs.writeFileSync(path.join(jsDir, 'socketEvents.js'), socketJs);
    fs.writeFileSync(path.join(jsDir, 'dashboard.js'), dashboardJs);
    fs.writeFileSync(path.join(jsDir, 'orders.js'), ordersJs);
    fs.writeFileSync(path.join(jsDir, 'users.js'), usersJs);
    fs.writeFileSync(path.join(jsDir, 'partners.js'), partnersJs);

    let scriptIncludes = `
<script src="./js/globals.js"></script>
<script src="./js/theme.js"></script>
<script src="./js/uiUtils.js"></script>
<script src="./js/dashboard.js"></script>
<script src="./js/orders.js"></script>
<script src="./js/users.js"></script>
<script src="./js/partners.js"></script>
<script src="./js/socketEvents.js"></script>
`;

    // Replace the entire block in HTML
    html = html.substring(0, finalScriptIndex) + scriptIncludes + html.substring(finalScriptEnd + 9);
}

fs.writeFileSync(htmlPath, html);
console.log('Safe migration completed successfully!');
