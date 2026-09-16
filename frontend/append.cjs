const fs = require('fs');
const css = `
/* FREEMIUM LIMIT MODAL */
.limit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}
.limit-modal-content {
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  text-align: center;
}
.limit-modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.limit-modal-header h3 {
  margin: 0;
  font-size: 24px;
  color: #1e293b;
}
.limit-modal-body p {
  color: #64748b;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 12px;
}
.limit-modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: center;
}
.btn-limit-close {
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn-limit-upgrade {
  background: #10b981;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
}
.btn-limit-upgrade:hover {
  background: #059669;
}
`;
fs.appendFileSync('src/pages/PredictionPage.css', css);
