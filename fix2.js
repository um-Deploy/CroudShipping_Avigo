const fs = require('fs');
let file = 'e:/Backup Avigo/12 March commit/Antigravity/backend/admin_dashboard.html';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/font-size: 10px;/g, 'font-size: 11px;');
c = c.replace(/<span class="status pending">\$\{u.role\}<\/span>/g, '<span class="status" style="background: rgba(109,79,232,0.1); color: var(--accent3); border: 1px solid rgba(109,79,232,0.25);">${u.role}</span>');
c = c.replace(/color: #000;/g, 'color: #111;');

fs.writeFileSync(file, c);
console.log('UI styles updated.');
