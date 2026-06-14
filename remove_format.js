const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');
app = app.replace('...(targetModel !== "llama-3.2-90b-vision-preview" ? { response_format: { type: "json_object" } } : {}),', '');
fs.writeFileSync('app.js', app, 'utf8');

let student = fs.readFileSync('student.js', 'utf8');
student = student.replace(/response_format: \{ type: "json_object" \},/g, '');
fs.writeFileSync('student.js', student, 'utf8');
console.log('Removed response_format from app.js and student.js');
