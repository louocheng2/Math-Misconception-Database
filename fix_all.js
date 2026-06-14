const fs = require('fs');

let appContent = fs.readFileSync('app.js', 'utf8');

// Fix syntax error if it exists by adding a closing brace for the `else {` block before `// 保存紀錄至雲端/本地`
if (appContent.includes('// 保存紀錄至雲端/本地') && !appContent.includes('}\n\n        // 保存紀錄至雲端/本地')) {
    appContent = appContent.replace(/\s*\/\/\s*保存紀錄至雲端\/本地/, '\n        }\n\n        // 保存紀錄至雲端/本地');
    console.log('Fixed missing brace in app.js');
}

// Replace settings
appContent = appContent.replace(/MATH_MISCONCEPTION_GEMINI_KEY/g, 'MATH_MISCONCEPTION_GROQ_KEY');
appContent = appContent.replace(/MATH_MISCONCEPTION_GEMINI_MODEL/g, 'MATH_MISCONCEPTION_GROQ_MODEL');
appContent = appContent.replace(/setting-gemini-key/g, 'setting-groq-key');
appContent = appContent.replace(/setting-gemini-model/g, 'setting-groq-model');
appContent = appContent.replace(/gemini-1\.5-flash/g, 'llama3-70b-8192');
appContent = appContent.replace(/saveGeminiSettings/g, 'saveGroqSettings');

// Replace fetch block in app.js using string slicing
const startMarker = '// Gemini API 請求結構';
const startMarkerFallback = 'const url = `https://generativelanguage.googleapis.com';
let startIndex = appContent.indexOf(startMarker);
if (startIndex === -1) {
    startIndex = appContent.indexOf(startMarkerFallback);
    // backtrack to find previous line
    startIndex = appContent.lastIndexOf('\n', startIndex) + 1;
}

const endMarker = 'const rawText = resultData.candidates[0].content.parts[0].text.trim();';
let endIndex = appContent.indexOf(endMarker);
if (endIndex !== -1) {
    endIndex += endMarker.length;
}

if (startIndex !== -1 && endIndex !== -1) {
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

            if (!response.ok) {
                const errJson = await response.json().catch(()=>({}));
                throw new Error(errJson.error?.message || \`HTTP \${response.status}\`);
            }
            
            const resultData = await response.json();
            const rawText = resultData.choices[0].message.content.trim();`;

    appContent = appContent.substring(0, startIndex) + groqAppFetch + appContent.substring(endIndex);
    console.log('Successfully replaced fetch logic in app.js!');
}

fs.writeFileSync('app.js', appContent, 'utf8');

