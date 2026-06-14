const fs = require('fs');

let content = fs.readFileSync('student.js', 'utf8');

const startMarker = '    try {\n        let parsed;\n        if (isLocalSim) {';
const endMarker = '        // 渲染批改結果\n        document.getElementById(\'grading-loading\').style.display = \'none\';';

// Since the file has windows carriage returns (or mixed), let's use regex replace.
// We replace everything between "try { let parsed; if (isLocalSim) {" and "// 渲染批改結果"

const regex = /try\s*\{\s*let parsed;\s*if \(isLocalSim\) \{[\s\S]*?\/\/\s*渲染批改結果/;

if (regex.test(content)) {
    const replacement = `try {
        let parsed;
        if (isLocalSim) {
            parsed = HeuristicDiagnosticEngine.gradeChallenge(
                AppState.currentChallengeNode,
                AppState.currentChallengeErrorType,
                studentAnswer,
                AppState.currentChallengeQuestion
            );
        } else {
            const prompt = \`你是一位親切、充滿熱忱的國小數學專屬輔導老師。現在批改 \${AppState.grade} 年級學生的迷思挑戰中填答：

- 挑戰題目：\${AppState.currentChallengeQuestion.question}
- 標準答案：\${AppState.currentChallengeQuestion.correct_answer}
- 觀念解說：\${AppState.currentChallengeQuestion.conceptual_explanation}
- 學生寫的算式與答案：\${studentAnswer}
- 對應的課綱指標為：[\${AppState.currentChallengeNode}]
- 學生有本題的迷思概念：\${AppState.currentChallengeErrorType}

【批改任務】
1. 仔細審閱學生的算式過程與答案，判斷是否正確。
2. 判斷學生是否已經展現了正確的概念，**沒有**再犯迷思錯誤（如果是，overcame_misconception 設為 true）。
3. 給出一個評分分數 (score 0~100)。
4. 給出溫馨且親切的「AI 老師評語」，直接稱呼對方為「同學」。如果答對了，大大讚賞並恭喜他打敗了這個迷思怪物；如果答錯了，請鼓勵他勇敢嘗試，並用極度淺顯易懂、畫圖或口語化的方式，明確解算一次。
5. 請只能回傳一個符合以下 JSON 格式的字串，不要包含額外的說明，也不要使用 \\\`\\\`\\\`json ... \\\`\\\`\\\` 的外框包裝。

需要的格式：
{
  "is_correct": true/false (答案或步驟是否部分正確),
  "score": 0~100 的數字 (整數),
  "overcame_misconception": true/false (學生是否確實克服了這個迷思錯誤),
  "feedback": "給學生的鼓勵與溫馨指導，語氣肯定且非常溫柔體貼，要讓學生能聽得懂並感覺到被肯定。"
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
        
        // 渲染批改結果`;

    content = content.replace(regex, replacement);
    fs.writeFileSync('student.js', content, 'utf8');
    console.log('Fixed submitChallengeAnswer successfully!');
} else {
    console.log('Regex did not match.');
}
