const fs = require('fs');
const cssExtra = `
/* ── UBER/RAPIDO MARKERS ── */
.vehicle-marker {
  position: relative;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vehicle-icon {
  font-size: 32px;
  z-index: 2;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.pulse-ring {
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(72, 149, 239, 0.3);
  border-radius: 50%;
  animation: marker-pulse 2s infinite;
}

@keyframes marker-pulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

.drop-marker-icon {
  width: 30px;
  height: 30px;
  background: #ff4d4d;
  border: 3px solid #fff;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  margin-top: -15px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.marker-pin {
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  margin: 7px;
}

.clickable-row:hover {
  background: rgba(72, 149, 239, 0.05) !important;
  cursor: pointer;
}
`;
fs.appendFileSync('e:/Backup Avigo/12 March commit/Antigravity/backend/adminFrontend/css/admin_dashboard.css', cssExtra);
console.log('Uber markers CSS added successfully');
