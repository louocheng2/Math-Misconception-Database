const fs = require('fs');

let content = fs.readFileSync('data.js', 'utf8');

// Find the bounds to replace
let lines = content.split('\n');

let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('await new Promise(resolve => setTimeout(resolve, 800));')) {
        endIdx = i;
        break;
    }
}

let startIdx = -1;
for (let i = endIdx - 80; i < endIdx; i++) {
    if (i >= 0 && lines[i].includes('if (isCorrect) {') && lines[i-1].includes('採用關鍵字匹配')) {
        startIdx = i - 1;
        break;
    }
}

if (startIdx === -1) {
    // try fallback search
    for (let i = endIdx - 80; i < endIdx; i++) {
        if (i >= 0 && lines[i].includes('if (isCorrect) {')) {
            startIdx = i - 1;
            break;
        }
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `        // 5. 採用關鍵字匹配 (若沒有匹配到精準算式規則)
        if (isCorrect) {
            const gradeNodes = DataService.getNodesByGrade(grade);
            let matchedNode = null;
            
            const keywordMap = [
                { kw: ['分數', '分之', '分母', '/'], node: 'N-5-4' },
                { kw: ['小數', '.', '乘以'], node: 'N-5-7' },
                { kw: ['面積', '平方公尺', '平方公分', '乘積', '長寬'], node: 'S-4-4' },
                { kw: ['體積', '立方', '容積', '立方公分'], node: 'S-5-5' },
                { kw: ['角度', '量角器', '度'], node: 'S-3-1' },
                { kw: ['因數', '最大公因數', '倍數', '最小公倍數'], node: 'N-5-1' },
                { kw: ['加', '總共', '多'], node: 'N-2-2' },
                { kw: ['減', '剩下', '少'], node: 'N-2-2' }
            ];
            
            for (const map of keywordMap) {
                if (map.kw.some(k => fullText.includes(k))) {
                    const node = gradeNodes.find(n => n.code === map.node) || DataService.getNodeByCode(map.node);
                    if (node) {
                        matchedNode = node;
                        break;
                    }
                }
            }
            
            if (matchedNode) {
                nodeCode = matchedNode.code;
                nodeTitle = matchedNode.title;
                
                // 這裡模擬一個錯誤，用以展示系統功能
                if (matchedNode.preset_misconceptions && matchedNode.preset_misconceptions.length > 0) {
                    isCorrect = false;
                    const misc = matchedNode.preset_misconceptions[0];
                    errorType = misc.name;
                    errorDescription = misc.description;
                    
                    steps = [
                        { step_number: 1, content: \`列出題目條件與數值\`, is_correct: true, error_explanation: null },
                        { step_number: 2, content: \`套用公式進行計算 (\${misc.example.split('」')[0] || '計算邏輯'})\`, is_correct: false, error_explanation: \`這裡計算邏輯有迷思喔！\` }
                    ];
                    remediation = \`親愛的 \${studentName} 同學，AI 老師發現在學習「\${nodeTitle}」這個單元時，產生了「\${errorType}」的現象。這是很常見的小迷思喔！別擔心！請記住：\${misc.description}。讓我們用以下提示算算看：\${misc.example.split('」')[1] || '加油！再試一次看看！'}\`;
                }
            } else {
                if (fullText.trim() === '') {
                    isCorrect = true;
                    nodeCode = 'N-0-0';
                    nodeTitle = '未提供文字';
                    errorType = '無法辨識圖片';
                    errorDescription = '本地模擬器無法辨識圖片內容。請輸入算式文字，或切換至雲端 AI (Gemini) 來解析圖片。';
                    steps = [
                        { step_number: 1, content: '上傳圖片', is_correct: true, error_explanation: null }
                    ];
                    remediation = '目前的本地模擬引擎無法處理圖片喔！請輸入文字算式，或是點擊右上方切換至雲端 AI 引擎來進行圖片診斷。';
                } else {
                    isCorrect = true;
                    nodeCode = gradeNodes[0] ? gradeNodes[0].code : 'N-X-X';
                    nodeTitle = gradeNodes[0] ? gradeNodes[0].title : '未知';
                    errorType = '未發現錯誤';
                    errorDescription = '本地診斷引擎未能在您的輸入中找到典型的數學迷思。您的計算可能完全正確，或是超出了本地規則庫的範圍。';
                    steps = [
                        { step_number: 1, content: fullText.substring(0, 30) + (fullText.length > 30 ? '...' : ''), is_correct: true, error_explanation: null }
                    ];
                    remediation = \`太棒了 \${studentName}！目前的本地規則庫沒有找出明顯的錯誤。如果需要更精確的分析，建議開啟 Gemini 雲端 AI 進行深度診斷喔！\`;
                }
            }
        }`;
    
    lines.splice(startIdx, endIdx - startIdx, replacement);
    fs.writeFileSync('data.js', lines.join('\n'), 'utf8');
    console.log('Successfully replaced data.js content using Node.js!');
} else {
    console.log('Could not find bounds to replace. startIdx: ' + startIdx + ', endIdx: ' + endIdx);
}
