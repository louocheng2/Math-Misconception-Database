const fs = require('fs');
let studentJs = fs.readFileSync('student.js', 'utf8');

const targetApiCall = `            const url = \`https://api.groq.com/openai/v1/chat/completions\`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${apiKey}\`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt }],
                        
                        temperature: 0.5
                    })
                });`;

const replacementApiCall = `            const url = \`https://api.groq.com/openai/v1/chat/completions\`;
            
            let messageContent;
            let targetModel = model;

            if (AppState.imageUploadBase64) {
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

            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${apiKey}\`
                },
                body: JSON.stringify({
                    model: targetModel,
                    messages: [{ role: "user", content: messageContent }],
                    temperature: 0.5
                })
            });`;

if (studentJs.includes('[{ role: "user", content: prompt }]')) {
    studentJs = studentJs.replace(targetApiCall, replacementApiCall);
    fs.writeFileSync('student.js', studentJs, 'utf8');
    console.log('Successfully updated API call payload in student.js');
} else {
    console.log('Could not find target API call in student.js or it is already updated.');
}
