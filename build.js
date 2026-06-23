const fs = require('fs');
const path = require('path');

// Load .env for local builds (values already in process.env on Vercel)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq < 1) return;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  });
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

const outDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')
  .replace('__SUPABASE_URL__', url)
  .replace('__SUPABASE_ANON_KEY__', key);

fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('Built dist/index.html');
