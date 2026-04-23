const fs = require('fs');
let content = fs.readFileSync('e:/Backup Avigo/12 March commit/Antigravity/backend/admin_dashboard.html', 'utf8');

// replace nav items
content = content.replace(
  /<a class="nav-item active" href="#">[\s\S]*?<span class="nav-icon">⊞<\/span>[\s\S]*?<span class="nav-label">Dashboard<\/span>[\s\S]*?<\/a>/,
  `<a class="nav-item active" href="#" onclick="showTab('dashboard', this)">
    <span class="nav-icon">⊞</span>
    <span class="nav-label">Dashboard</span>
  </a>`
);

content = content.replace(
  /<a class="nav-item" href="#">[\s\S]*?<span class="nav-icon">📦<\/span>[\s\S]*?<span class="nav-label">Orders<\/span>[\s\S]*?<\/a>/,
  `<a class="nav-item" href="#" onclick="showTab('dashboard', this)">
    <span class="nav-icon">📦</span>
    <span class="nav-label">Orders</span>
  </a>`
);

content = content.replace(
  /<a class="nav-item" href="#">[\s\S]*?<span class="nav-icon">👤<\/span>[\s\S]*?<span class="nav-label">Users<\/span>[\s\S]*?<\/a>/,
  `<a class="nav-item" href="#" onclick="showTab('users', this)">
    <span class="nav-icon">👤</span>
    <span class="nav-label">Users</span>
  </a>`
);

content = content.replace(
  /<a class="nav-item" href="#">[\s\S]*?<span class="nav-icon">🛵<\/span>[\s\S]*?<span class="nav-label">Partners<\/span>[\s\S]*?<\/a>/,
  `<a class="nav-item" href="#" onclick="showTab('partners', this)">
    <span class="nav-icon">🛵</span>
    <span class="nav-label">Partners</span>
  </a>`
);

// Add div wrappers in content
content = content.replace(
  /<div class="section-label">Overview<\/div>/,
  `<div id="dashboard-section" class="page-section">
    <div class="section-label">Overview</div>`
);

content = content.replace(
  /<\/div><!-- \/content -->/,
  `  </div>

    <!-- USERS SECTION -->
    <div id="users-section" class="page-section" style="display:none;">
      <div class="section-label">Users List</div>
      <div class="orders-section">
        <div class="orders-header">
          <div style="display:flex;align-items:center;gap:4px;">
            <span class="orders-title">All Users</span>
            <span class="orders-count" id="users-count">0</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                 <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody id="usersTable">
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <div class="empty-text">Loading users…</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PARTNERS SECTION -->
    <div id="partners-section" class="page-section" style="display:none;">
      <div class="section-label">Partners List</div>
      <div class="orders-section">
        <div class="orders-header">
          <div style="display:flex;align-items:center;gap:4px;">
            <span class="orders-title">All Partners</span>
            <span class="orders-count" id="partners-count">0</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="partnersTable">
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <div class="empty-icon">🛵</div>
                    <div class="empty-text">Loading partners…</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div><!-- /content -->`
);

content = content.replace(
  /loadDashboard\(\);\r?\nloadOrders\(\);\r?\n/,
  `loadDashboard();
loadOrders();

async function loadUsers() {
  try {
    const res = await fetch(API + "/users/all", { headers: { "Authorization": "Bearer " + token } });
    if(res.ok) {
      const users = await res.json();
      renderUsers(users);
    }
  } catch(e) { console.warn("Users error", e); }
}

function renderUsers(users) {
  const table = document.getElementById("usersTable");
  document.getElementById("users-count").textContent = users.length;
  if(!users.length) { table.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="empty-state"><div class="empty-text">No users</div></div></td></tr>'; return; }
  table.innerHTML = users.map(u => \`<tr>
    <td><span class="order-id">#\${u._id.slice(-6).toUpperCase()}</span></td>
    <td><div class="user-cell"><div class="avatar user-av">\${u.name?u.name[0].toUpperCase():'?'}</div><div class="cell-name">\${u.name||"—"}</div></div></td>
    <td><div class="cell-phone">\${u.phone||"—"}</div></td>
    <td><span class="status pending">\${u.role}</span></td>
    <td><div class="cell-phone">\${new Date(u.createdAt).toLocaleDateString()}</div></td>
  </tr>\`).join('');
}

async function loadPartners() {
  try {
    const res = await fetch(API + "/partners/all", { headers: { "Authorization": "Bearer " + token } });
    if(res.ok) {
      const partners = await res.json();
      renderPartners(partners);
    }
  } catch(e) { console.warn("Partners error", e); }
}

function renderPartners(partners) {
  const table = document.getElementById("partnersTable");
  document.getElementById("partners-count").textContent = partners.length;
  if(!partners.length) { table.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="empty-state"><div class="empty-text">No partners</div></div></td></tr>'; return; }
  table.innerHTML = partners.map(p => \`<tr>
    <td><span class="order-id">#\${p._id.slice(-6).toUpperCase()}</span></td>
    <td><div class="user-cell"><div class="avatar partner-av">\${p.name?p.name[0].toUpperCase():'?'}</div><div class="cell-name">\${p.name||"—"}</div></div></td>
    <td><div class="cell-phone">\${p.phone||"—"}</div></td>
    <td><span class="order-id">\${p.vehicleType||"N/A"}</span></td>
    <td><span class="status \${p.isOnline?'delivered':'pending'}">\${p.isOnline?'Online':'Offline'}</span></td>
  </tr>\`).join('');
}

function showTab(tabId, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
  document.getElementById(tabId + '-section').style.display = 'block';

  if(tabId === 'users') loadUsers();
  if(tabId === 'partners') loadPartners();
}
`
);

fs.writeFileSync('e:/Backup Avigo/12 March commit/Antigravity/backend/admin_dashboard.html', content);
console.log('Done mapping.');
