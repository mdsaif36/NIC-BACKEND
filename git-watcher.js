import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const watchDir = __dirname;
console.log(`Starting git auto-push watcher on: ${watchDir}`);

let timeoutId = null;

const ignoredPatterns = [
  'node_modules',
  'dist',
  '.git',
  'database.sqlite',
  'git-watcher.js',
  'inspect_db.ts',
  'package-lock.json',
  '.log',
  '.env'
];

function shouldIgnore(filename) {
  if (!filename) return true;
  const normalized = filename.replace(/\\/g, '/');
  return ignoredPatterns.some(pattern => normalized.includes(pattern));
}

function runGitCommands() {
  console.log(`[${new Date().toISOString()}] Change detected. Preparing auto-push...`);
  
  exec('git add .', (err, stdout, stderr) => {
    if (err) {
      console.error('git add error:', err);
      return;
    }
    
    exec('git status --porcelain', (err, statusOut) => {
      if (err) {
        console.error('git status error:', err);
        return;
      }
      
      if (!statusOut.trim()) {
        console.log('No changes to commit.');
        return;
      }
      
      const commitMsg = `Auto commit: updates made on ${new Date().toLocaleString()}`;
      exec(`git commit -m "${commitMsg}"`, (err, commitOut) => {
        if (err) {
          console.error('git commit error:', err);
          return;
        }
        console.log('Committed:\n', commitOut.trim());
        
        console.log('Pushing to GitHub...');
        exec('git push origin main', (err, pushOut) => {
          if (err) {
            console.error('git push error:', err);
            return;
          }
          console.log('Pushed successfully to GitHub!');
        });
      });
    });
  });
}

// Watch root directory recursively
fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
  if (filename && !shouldIgnore(filename)) {
    console.log(`File change detected: ${filename}`);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      runGitCommands();
    }, 3000); // 3 seconds debounce
  }
});
