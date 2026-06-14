const fs = require('fs');

const files = ['app.js', 'student.js'];
files.forEach(f => {
    let code = fs.readFileSync(f, 'utf8');
    const oldCode = `const model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';`;
    const newCode = `let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';`;
    
    // Also handle student.js model retrieving
    code = code.replace(oldCode, newCode);
    code = code.replace(/const model = localStorage.getItem\('MATH_MISCONCEPTION_GROQ_MODEL'\) \|\| 'llama-3.3-70b-versatile';/g, newCode);
    
    fs.writeFileSync(f, code, 'utf8');
});
console.log('Replaced local storage fetching logic.');
