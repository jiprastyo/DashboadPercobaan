import fs from 'fs';
import path from 'path';

function walk(dir: string, results: string[] = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        walk(filePath, results);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const files = walk(path.join(process.cwd(), 'src'));
console.log(`Scanning ${files.length} files...`);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('tpt.json') || content.includes('tpt_feb_25') || content.includes('tpt_feb_26') || content.includes('provinsi') || content.includes('national-indicators')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('tpt.json') || line.includes('tpt_feb_25') || line.includes('tpt_feb_26') || line.includes('national-indicators')) {
        console.log(`${path.basename(file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
}
