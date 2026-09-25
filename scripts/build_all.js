const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const websiteDist = path.join(rootDir, 'apps', 'website', 'dist');
const appDist = path.join(rootDir, 'apps', 'fieldledger', 'dist');
const targetAppDir = path.join(websiteDist, 'app');

function run(cmd, cwd) {
  console.log(`\n> [${cwd}] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function main() {
  console.log('🏗️  Building Website...');
  run('npm run build', path.join(rootDir, 'apps', 'website'));

  console.log('🏗️  Building FieldLedger PWA App...');
  run('npm run build', path.join(rootDir, 'apps', 'fieldledger'));

  console.log(`📦 Copying PWA from ${appDist} to ${targetAppDir}...`);
  if (fs.existsSync(targetAppDir)) {
    fs.rmSync(targetAppDir, { recursive: true, force: true });
  }
  copyRecursiveSync(appDist, targetAppDir);

  console.log('✅ Integrated Website & PWA successfully built!');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
