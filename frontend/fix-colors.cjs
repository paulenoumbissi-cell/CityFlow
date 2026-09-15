const fs = require('fs');
let content = fs.readFileSync('src/pages/PredictionPage.jsx', 'utf8');

// Replace inline colors causing invisible text in day mode
content = content.replace(/color:\s*"#f8fafc"/g, 'color: "var(--cityflow-text)"');
content = content.replace(/color:\s*"#cbd5e1"/g, 'color: "var(--cityflow-muted)"');
content = content.replace(/color:\s*"#fff"/g, 'color: "var(--cityflow-text)"');
content = content.replace(/color=\{(?:isSelected \? "#ffffff" : opt\.color)\}/g, 'color={isSelected ? "var(--cityflow-surface)" : opt.color}');
content = content.replace(/background:\s*"rgba\(255,255,255,0\.05\)"/g, 'background: "var(--cityflow-border-subtle)"');

fs.writeFileSync('src/pages/PredictionPage.jsx', content);
console.log("Replaced colors successfully");
