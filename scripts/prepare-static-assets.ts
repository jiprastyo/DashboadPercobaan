import fs from 'fs';
import path from 'path';

const root = process.cwd();
const source = path.join(root, 'data', 'news', 'historical-seed.json');
const target = path.join(root, 'public', 'data', 'news', 'historical-seed.json');

if (!fs.existsSync(source)) {
  throw new Error(`Missing news archive source: ${source}`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);

const sizeMb = fs.statSync(target).size / 1024 / 1024;
console.log(`Prepared static news archive (${sizeMb.toFixed(1)} MB)`);
