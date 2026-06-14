const fs = require('fs');

const files = ['app.js', 'student.js', 'index.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/llama3-70b-8192/g, 'llama-3.3-70b-versatile');
    content = content.replace(/llama3-8b-8192/g, 'llama-3.1-8b-instant');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});
