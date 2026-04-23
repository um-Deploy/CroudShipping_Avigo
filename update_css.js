const fs = require('fs');

const cssMsg = `
/* ── ORDER MODAL ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: none;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.modal-overlay.active {
  display: flex;
  opacity: 1;
}

.modal-content {
  background: var(--bg);
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  border-radius: 24px;
  border: 1px solid var(--border-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  transform: scale(0.95);
  transition: transform 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);
}

.modal-overlay.active .modal-content {
  transform: scale(1);
}

.modal-header {
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-id {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 20px;
}

.close-modal {
  background: transparent;
  border: none;
  font-size: 28px;
  color: var(--muted);
  cursor: pointer;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  height: 100%;
}

.modal-map-col {
  position: relative;
  background: #111;
  border-right: 1px solid var(--border);
}

#map {
  width: 100%;
  height: 100%;
}

.track-card {
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  background: var(--surface);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-md);
  border-radius: 16px;
  padding: 16px;
  z-index: 10;
}

.track-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.track-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
}

.track-dot.pickup { 
  background: var(--accent); 
  box-shadow: 0 0 10px var(--accent); 
}
.track-dot.drop { 
  background: var(--accent2); 
  box-shadow: 0 0 10px var(--accent2); 
}

.track-line {
  width: 2px;
  height: 20px;
  background: var(--border);
  margin-left: 4px;
}

.track-text .label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
}

.track-text p {
  font-size: 13px;
  color: var(--text);
  margin-top: 2px;
}

.modal-info-col {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--surface2);
  overflow-y: auto;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-tag {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-details h4 {
  font-size: 15px;
  font-weight: 700;
}

.profile-details p {
  font-size: 12px;
  color: var(--muted);
}

.metrics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 12px;
  border-radius: 12px;
}

.metric .label { font-size: 10px; color: var(--muted); display: block; margin-bottom: 4px; }
.metric p { font-size: 14px; font-weight: 700; color: var(--accent); }

.btn-primary-glow {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-weight: 800;
  font-family: 'Syne', sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 230, 163, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 230, 163, 0.4);
}
`;

fs.appendFileSync('e:/Backup Avigo/12 March commit/Antigravity/backend/adminFrontend/css/admin_dashboard.css', cssMsg);
console.log('CSS updated successfully');
