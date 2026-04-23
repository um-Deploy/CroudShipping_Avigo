const fs = require('fs');

let file = 'e:/Backup Avigo/12 March commit/Antigravity/backend/admin_dashboard.html';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\.logo-icon-fallback \{([\s\S]*?)\}/, `.logo-icon-fallback {
  width: 38px;
  height: 38px;
  min-width: 38px;
  background: linear-gradient(135deg, #00d4ff, #4facfe);
  box-shadow: 0 4px 15px rgba(0,212,255,0.4);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: #0b132b;
}`);


c = c.replace(/<img src="\.\/icon\.png" class="logo-icon" alt="Avigo"[\s\S]*?\/>/, '<!-- Logo explicitly swapped to CSS rendering layout -->');
c = c.replace(/<div class="logo-icon-fallback" style="display:none;">AV<\/div>/, '<div class="logo-icon-fallback">AV</div>');

// Let's also enforce Syne font loading on the headers themselves if not already
c = c.replace(/<h1(.*?)>Avigo CRM<\/h1>/, `<h1$1 style="font-family: 'Syne', sans-serif;">Avigo CRM</h1>`);

fs.writeFileSync(file, c);
console.log('Logo matched to new design.');
