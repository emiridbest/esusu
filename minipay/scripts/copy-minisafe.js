const fs = require('fs');
const path = require('path');

// Source and destination paths
const sources = [
  { src: '../../frontend/components/miniSafe', dest: './components/miniSafe' },
  { src: '../../frontend/components/TransactionList.tsx', dest: './components/TransactionList.tsx' },
  { src: '../../frontend/context/miniSafe', dest: './context/miniSafe' },
  { src: '../../frontend/components/ui', dest: './components/ui' },
  { src: '../../frontend/lib', dest: './lib' }
];

// Recursively copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy each source
console.log('Copying MiniSafe components...');
sources.forEach(({ src, dest }) => {
  const srcPath = path.resolve(__dirname, src);
  const destPath = path.resolve(__dirname, dest);
  
  if (fs.existsSync(srcPath)) {
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      copyDir(srcPath, destPath);
      console.log(`✓ Copied directory: ${src} -> ${dest}`);
    } else {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied file: ${src} -> ${dest}`);
    }
  } else {
    console.warn(`⚠ Source not found: ${src}`);
  }
});

console.log('MiniSafe components copied successfully!');
