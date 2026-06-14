const fs = require('fs');

let appContent = fs.readFileSync('app.js', 'utf8');

// Replace settings
appContent = appContent.replace(/MATH_MISCONCEPTION_GEMINI_KEY/g, 'MATH_MISCONCEPTION_GROQ_KEY');
appContent = appContent.replace(/MATH_MISCONCEPTION_GEMINI_MODEL/g, 'MATH_MISCONCEPTION_GROQ_MODEL');
appContent = appContent.replace(/setting-gemini-key/g, 'setting-groq-key');
appContent = appContent.replace(/setting-gemini-model/g, 'setting-groq-model');
appContent = appContent.replace(/gemini-1\.5-flash/g, 'llama3-70b-8192');
appContent = appContent.replace(/saveGeminiSettings/g, 'saveGroqSettings');

// Define regex to replace the fetch block in runTeacherDiagnosis
const appFetchRegex = /\/\/\s*Gemini API 請?結?[\s\S]*?const rawText = resultData\.candidates\[0\]\.content\.parts\[0\]\.text;/;
// Some systems might have different encoding characters so let's use a more flexible regex
const appFetchRegexFlex = /const url = `https:\/\/generativelanguage\.googleapis\.com[\s\S]*?const rawText = resultData\.candidates\[0\]\.content\.parts\[0\]\.text;/;

const groqAppFetch = `// Groq API 請求結構
            const url = \`https://api.groq.com/openai/v1/chat/completions\`;
            const headers = { 
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${apiKey}\`
            };
            
            let messageContent;
            let targetModel = model;

            if (AppState.imageUploadBase64) {
                // 如果有圖片，必須強制使用 Groq 的 Vision 模型
                targetModel = "llama-3.2-90b-vision-preview";
                const mimeType = AppState.imageUploadMimeType || "image/png";
                let b64Data = AppState.imageUploadBase64;
                if (!b64Data.startsWith('data:')) {
                     b64Data = \`data:\${mimeType};base64,\${b64Data}\`;
                }
                messageContent = [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: b64Data } }
                ];
            } else {
                messageContent = prompt;
            }

            const payload = {
                model: targetModel,
                messages: [{ role: "user", content: messageContent }],
                response_format: { type: "json_object" },
                temperature: 0.5
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
            
            const resultData = await response.json();
            const rawText = resultData.choices[0].message.content;`;

if (appContent.match(appFetchRegexFlex)) {
    appContent = appContent.replace(appFetchRegexFlex, groqAppFetch);
    fs.writeFileSync('app.js', appContent, 'utf8');
    console.log('Successfully updated app.js fetch logic!');
} else {
    console.log('Could not find fetch block in app.js!');
}

let studentContent = fs.readFileSync('student.js', 'utf8');
studentContent = studentContent.replace(/MATH_MISCONCEPTION_GEMINI_KEY/g, 'MATH_MISCONCEPTION_GROQ_KEY');
studentContent = studentContent.replace(/MATH_MISCONCEPTION_GEMINI_MODEL/g, 'MATH_MISCONCEPTION_GROQ_MODEL');
studentContent = studentContent.replace(/gemini-1\.5-flash/g, 'llama3-70b-8192');

// student.js runStudentDiagnosis fetch block
const studentDiagFetchRegex = /const url = `https:\/\/generativelanguage\.googleapis\.com[\s\S]*?const rawText = resultData\.candidates\[0\]\.content\.parts\[0\]\.text;/;

if (studentContent.match(studentDiagFetchRegex)) {
    studentContent = studentContent.replace(studentDiagFetchRegex, groqAppFetch);
    console.log('Successfully updated student.js diagnosis fetch logic!');
}

// student.js startChallenge fetch block
const studentStartFetchRegex = /const url = `https:\/\/generativelanguage\.googleapis\.com[\s\S]*?const rawText = resultData\.candidates\[0\]\.content\.parts\[0\]\.text\.trim\(\);/;

const groqSimpleFetch = `const url = \`https://api.groq.com/openai/v1/chat/completions\`;
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

studentContent = studentContent.replace(studentStartFetchRegex, groqSimpleFetch);
studentContent = studentContent.replace(studentStartFetchRegex, groqSimpleFetch); // run again for submitChallengeAnswer

fs.writeFileSync('student.js', studentContent, 'utf8');
console.log('Successfully updated student.js');
