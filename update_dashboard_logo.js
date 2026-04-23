const fs = require('fs');

let file = 'e:/Backup Avigo/12 March commit/Antigravity/backend/admin_dashboard.html';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\.logo-icon-fallback \{([\s\S]*?)\}/, `.logo-icon-fallback {
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: #0b1021;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 14px;
  border: 1px solid rgba(255,255,255,0.05);
}`);

c = c.replace(/<div class=\"logo-icon-fallback\"><span style=\"color: #ffffff;\">Avi<\/span><span style=\"color: #00d4ff;\">go<\/span><\/div>/, '<div class="logo-icon-fallback">AV</div>'); // reset if already set
c = c.replace(/<div class=\"logo-icon-fallback\">AV<\/div>/, '<div class="logo-icon-fallback"><span style="color: #ffffff;">Avi</span><span style="color: #00d4ff;">go</span></div>');

fs.writeFileSync(file, c);
console.log('Dashboard logo updated!');
