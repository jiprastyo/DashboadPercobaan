import fs from 'fs';
import path from 'path';
import { academicResearch } from '../src/data/research';

const destDir = path.join(process.cwd(), 'data', 'research');
fs.mkdirSync(destDir, { recursive: true });
fs.writeFileSync(path.join(destDir, 'seed.json'), JSON.stringify(academicResearch, null, 2));
console.log('Migrated seed.json successfully!');
