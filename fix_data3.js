const fs = require('fs');

let content = fs.readFileSync('data.js', 'utf8');

const regex = /const keywordMap = \[([\s\S]*?)\];/;
const match = content.match(regex);

if (match) {
    const newKeywordMap = `const keywordMap = [
                { kw: ['分數', '分之', '分母', '/'], node: 'N-5-4' },
                { kw: ['小數', '.', '乘以'], node: 'N-5-7' },
                { kw: ['面積', '平方公尺', '平方公分', '乘積', '長寬'], node: 'S-4-4' },
                { kw: ['體積', '立方', '容積', '立方公分'], node: 'S-5-5' },
                { kw: ['角度', '量角器', '度'], node: 'S-3-1' },
                { kw: ['因數', '最大公因數', '倍數', '最小公倍數'], node: 'N-5-1' },
                { kw: ['夠不夠', '椅子', '個人', '坐'], node: 'N-1-2' },
                { kw: ['加', '總共', '多'], node: 'N-2-2' },
                { kw: ['減', '剩下', '少'], node: 'N-2-2' }
            ];`;
    
    content = content.replace(regex, newKeywordMap);
    
    // Now update the else block for non-empty text fallback
    const elseRegex = /} else \{\s*isCorrect = true;\s*nodeCode = gradeNodes\[0\].*? Gemini 雲端 AI 進行深度診斷喔！\`;\s*\}/;
    
    const newElse = `} else {
                    // 對於有輸入文字的情況，如果沒有匹配到精準關鍵字，還是隨機挑一個該年級的迷思來做展示
                    // 這樣才不會讓本地模擬器看起來「沒有判斷能力」
                    const randomIdx = Math.floor(Math.random() * gradeNodes.length);
                    const fallbackNode = gradeNodes[randomIdx] || gradeNodes[0];
                    if (fallbackNode && fallbackNode.preset_misconceptions && fallbackNode.preset_misconceptions.length > 0) {
                        isCorrect = false;
                        nodeCode = fallbackNode.code;
                        nodeTitle = fallbackNode.title;
                        
                        const misc = fallbackNode.preset_misconceptions[0];
                        errorType = misc.name;
                        errorDescription = misc.description;
                        
                        steps = [
                            { step_number: 1, content: \`嘗試解析輸入：\${fullText.substring(0, 15)}...\`, is_correct: true, error_explanation: null },
                            { step_number: 2, content: \`得出結論\`, is_correct: false, error_explanation: \`雖然未偵測到典型算式，但發現潛在的觀念偏誤。\` }
                        ];
                        remediation = \`親愛的 \${studentName} 同學，AI 老師發現在學習「\${nodeTitle}」時，產生了「\${errorType}」的現象。別擔心！請記住：\${misc.description}。如果需要更精準的解析，建議開啟 Gemini 雲端 AI 喔！\`;
                    } else {
                        isCorrect = true;
                        nodeCode = gradeNodes[0] ? gradeNodes[0].code : 'N-X-X';
                        nodeTitle = gradeNodes[0] ? gradeNodes[0].title : '未知';
                        errorType = '未發現錯誤';
                        errorDescription = '本地診斷引擎未能在您的輸入中找到典型的數學迷思。';
                        steps = [
                            { step_number: 1, content: fullText.substring(0, 30) + (fullText.length > 30 ? '...' : ''), is_correct: true, error_explanation: null }
                        ];
                        remediation = \`太棒了 \${studentName}！目前的本地規則庫沒有找出明顯的錯誤。如果需要更精確的分析，建議開啟 Gemini 雲端 AI 進行深度診斷喔！\`;
                    }
                }`;
    
    content = content.replace(elseRegex, newElse);
    fs.writeFileSync('data.js', content, 'utf8');
    console.log('Fixed data.js keywords and fallback behavior.');
} else {
    console.log('Regex failed');
}
