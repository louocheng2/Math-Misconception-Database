const fs = require('fs');

// Rename in index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace('<title>臺灣 108 課綱國小數學迷思概念雲端資料庫系統</title>', '<title>學生迷思概念資料庫</title>');
// Also look for "數學迷思概念雲端資料庫" in h2 or branding
indexHtml = indexHtml.replace(/國小數學迷思概念雲端資料庫/g, '學生迷思概念資料庫');
fs.writeFileSync('index.html', indexHtml, 'utf8');

// Rename in student.html
let studentHtml = fs.readFileSync('student.html', 'utf8');
studentHtml = studentHtml.replace(/數學迷思終結者/g, '學生迷思概念資料庫');
fs.writeFileSync('student.html', studentHtml, 'utf8');

console.log('Renamed successfully');
