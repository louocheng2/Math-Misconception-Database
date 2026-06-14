const fs = require('fs');

function fixIsCorrectLogic(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix the prompt
    const oldPrompt = '2. 判定最終答案是否正確（is_correct）。如果算式完全正確，請設定 is_correct 為 true。';
    const newPrompt = '2. 判定最終答案是否正確（is_correct）。如果計算邏輯與最終答案都完全正確，才可設定 is_correct 為 true。只要有任何計算或觀念錯誤，請設定為 false。';
    content = content.replace(oldPrompt, newPrompt);

    // Add post-processing hook
    const targetHook = `                if (match) {
                    parsedResult = JSON.parse(match[0]);
                } else {`;
    
    // Check if we already have the post-processing hook to avoid duplicates
    if (!content.includes('parsedResult.steps.some(s => s.is_correct === false)')) {
        const replacementHook = `                if (match) {
                    parsedResult = JSON.parse(match[0]);
                } else {
                    throw new Error('AI 老師的解析結果無法解析，請再送出一次試試看喔！');
                }
            }

            // 強制校正 AI 的幻覺：只要有任何一個步驟是錯的，整體就是錯的
            if (parsedResult && parsedResult.steps && parsedResult.steps.some(s => s.is_correct === false)) {
                parsedResult.is_correct = false;
            }
            if (parsedResult && parsedResult.is_correct === true && parsedResult.student_answer !== parsedResult.correct_answer) {
                // 如果答案明顯不對，也不能給對
                if (parsedResult.student_answer && parsedResult.correct_answer) {
                    parsedResult.is_correct = false;
                }
            }`;
        
        // This is a bit tricky with string replacement across multiple lines. 
        // Let's use a more robust regex replacement for the try-catch block end.
        content = content.replace(/\}\s*catch\s*\(e\)\s*\{[\s\S]*?\}\s*\}/, match => {
            return match + `\n            if (parsedResult && parsedResult.steps && parsedResult.steps.some(s => s.is_correct === false)) {\n                parsedResult.is_correct = false;\n            }`;
        });
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed logic in ${file}`);
}

fixIsCorrectLogic('app.js');
fixIsCorrectLogic('student.js');
