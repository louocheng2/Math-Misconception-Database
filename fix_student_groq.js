const fs = require('fs');

let content = fs.readFileSync('student.js', 'utf8');

// Replace localStorage keys
content = content.replace(/MATH_MISCONCEPTION_GEMINI_KEY/g, 'MATH_MISCONCEPTION_GROQ_KEY');
content = content.replace(/MATH_MISCONCEPTION_GEMINI_MODEL/g, 'MATH_MISCONCEPTION_GROQ_MODEL');
content = content.replace(/gemini-1\.5-flash/g, 'llama3-70b-8192');

const fetchRegex = /const url = `https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{model\}:generateContent\?key=\$\{apiKey\}`;[\s\S]*?const rawText = resultData\.candidates\[0\]\.content\.parts\[0\]\.text\.trim\(\);/g;

const newFetch = `const url = \`https://api.groq.com/openai/v1/chat/completions\`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${apiKey}\`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" },
                        temperature: 0.5
                    })
                });

                if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                
                const resultData = await response.json();
                const rawText = resultData.choices[0].message.content.trim();`;

let count = 0;
content = content.replace(fetchRegex, () => {
    count++;
    return newFetch;
});

console.log('Replaced ' + count + ' fetch instances in student.js');

fs.writeFileSync('student.js', content, 'utf8');
