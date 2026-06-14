const fs = require('fs');

function patchErrorLogging(file) {
    let content = fs.readFileSync(file, 'utf8');
    const target = 'if (!response.ok) throw new Error(`HTTP ${response.status}`);';
    const replacement = `if (!response.ok) { 
        const errText = await response.text(); 
        console.error('Groq API Error:', errText); 
        throw new Error(\`HTTP \${response.status}: \${errText.substring(0, 100)}\`); 
    }`;
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated error logging in ${file}`);
    } else {
        console.log(`Target string not found in ${file}`);
    }
}

patchErrorLogging('student.js');
patchErrorLogging('app.js');
