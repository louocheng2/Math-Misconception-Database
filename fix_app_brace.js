const fs = require('fs');

let appContent = fs.readFileSync('app.js', 'utf8');

// Insert the missing closing brace for the `else` block
// We know it needs to close before `const newRecord = {` in runTeacherDiagnosis
const searchStr = '        const newRecord = {';
const replaceStr = '        }\n\n        const newRecord = {';

if (appContent.includes(searchStr) && !appContent.includes('}\n\n        const newRecord = {')) {
    // Only replace the first occurrence which is in runTeacherDiagnosis
    appContent = appContent.replace(searchStr, replaceStr);
    console.log('Fixed missing brace in app.js before newRecord');
}

fs.writeFileSync('app.js', appContent, 'utf8');
