const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '..', 'Lembar Kerja Fenomena Sektoral Nasional Februari 2026.xlsx');
console.log('Reading Excel file from:', excelPath);

try {
  const workbook = xlsx.readFile(excelPath);
  console.log('Sheet names:', workbook.SheetNames);
  
  // Inspect the first sheet or details
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
    console.log(`Sheet "${sheetName}" range: ${sheet['!ref']}`);
    
    // Print first 5 rows
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 5);
    console.log(`First 5 rows of "${sheetName}":`);
    console.log(data);
    console.log('--------------------------------------------------');
  });
} catch (err) {
  console.error('Error reading excel:', err);
}
