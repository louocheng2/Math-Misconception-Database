const fs = require('fs');

let content = fs.readFileSync('student.js', 'utf8');

// The corrupted code starts somewhere around `const prompt = \`你是一位親?、活潑????學???師` 
// and ends after `arsed = JSON.parse(rawText);`
// Let's find the start index of the first `const prompt = ` inside startChallenge.

const startMarker = 'if (isLocalSim) {\n            parsed = HeuristicDiagnosticEngine.generateChallenge(nodeCode, errorType, AppState.grade);\n        } else {\n';
const endMarker = '        AppState.currentChallengeQuestion = parsed;';

let startIndex = content.indexOf('if (isLocalSim) {\n            parsed = HeuristicDiagnosticEngine.generateChallenge(nodeCode, errorType, AppState.grade);\n        } else {\n');

if (startIndex === -1) {
    // try CRLF
    startIndex = content.indexOf('if (isLocalSim) {\r\n            parsed = HeuristicDiagnosticEngine.generateChallenge(nodeCode, errorType, AppState.grade);\r\n        } else {\r\n');
}

let endIndex = content.indexOf('        AppState.currentChallengeQuestion = parsed;');

if (startIndex !== -1 && endIndex !== -1) {
    const cleanBlock = `if (isLocalSim) {
            parsed = HeuristicDiagnosticEngine.generateChallenge(nodeCode, errorType, AppState.grade);
        } else {
            const prompt = \`你是一位親切、活潑的國小數學專屬輔導老師。現在適合給 \${AppState.grade} 年級學生練習的數學挑戰題。            
- 對應課綱指標：[\${nodeCode}] \${nodeObj ? nodeObj.title : ''}
- 指標細節：\${nodeObj ? nodeObj.description : ''}
- 學生面臨的迷思問題是：「\${errorType}」。本題目要針對這個迷思來出題。

【出題任務】
1. 請出一道生活情境的應用題，不要太長，文字適合國小生閱讀。
2. 題目必須要能精準測驗學生是否具備上述迷思。
3. 題目需要包含一些干擾訊息，讓有迷思的學生容易選錯或算錯。
4. 提供一個如果學生卡住時的簡短提示 (hint)。
5. 提供這題的標準答案與觀念解說。
6. 你必須，也只能輸出一個符合以下 JSON 格式的物件，不要包含任何 markdown 外框（如 \\\`\\\`\\\`json ）。

需要的格式：
{
  "question": "生活情境題目的完整敘述",
  "hint": "給學生的小提示",
  "correct_answer": "這題的最終正確答案 (簡短)",
  "conceptual_explanation": "老師的解答與觀念解析"
}\`;

            if (isLocalOllama) {
                parsed = await callLocalOllamaChallenge(prompt);
            } else {
                const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${apiKey}\`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                
                const resultData = await response.json();
                const rawText = resultData.candidates[0].content.parts[0].text.trim();
                
                try {
                    parsed = JSON.parse(rawText);
                } catch (e) {
                    const match = rawText.match(/\\{[\\s\\S]*\\}/);
                    parsed = JSON.parse(match[0]);
                }
            }
        }
        
`;
    
    const newContent = content.substring(0, startIndex) + cleanBlock + content.substring(endIndex);
    fs.writeFileSync('student.js', newContent, 'utf8');
    console.log('Fixed student.js successfully!');
} else {
    console.log('Could not find markers in student.js!');
}
