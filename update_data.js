const fs = require('fs');
let data = fs.readFileSync('data.js', 'utf8');

// 1. Insert M-1-2-2 misconception definition
const targetDef = `            {
                "id": "M-1-2-1",
                "name": "關鍵字機械反應",`;
const newDef = `            {
                "id": "M-1-2-2",
                "name": "比較型應用題語意理解錯誤",
                "description": "在比較兩數值的應用題中，雖然算式（減法）計算正確，但無法正確對應生活情境中的主客體關係，導致答案的「多/少」或「夠/不夠」判斷相反。",
                "example": "題目「9個人只有6張椅子，夠不夠？多或少幾張？」學生計算 9-6=3，卻回答「夠，多3張椅子」（誤將大數減小數的結果解釋為多出，忽略了人比椅子多，代表椅子不夠）。"
            },
            {
                "id": "M-1-2-1",
                "name": "關鍵字機械反應",`;
data = data.replace(targetDef, newDef);

// 2. Insert Heuristic rule for M-1-2-2
const ruleTarget = `        // 5. 採用關鍵字匹配`;
const newRule = `        // 4.5 偵測比較型應用題語意錯誤 (如 9-6=3 答多3張)
        else if (fullText.includes('9') && fullText.includes('6') && fullText.includes('3') && fullText.includes('多') && fullText.includes('椅')) {
            isCorrect = false;
            nodeCode = 'N-1-2';
            nodeTitle = '加法和減法';
            errorType = '比較型應用題語意理解錯誤';
            errorDescription = '學生雖然減法計算正確（9-6=3），但無法正確對應生活情境中的主客體關係。誤將大數減小數的結果解釋為「多出」，忽略了「人比椅子多，代表椅子不夠」。';
            steps = [
                { step_number: 1, content: '9-6=3', is_correct: true, error_explanation: null },
                { step_number: 2, content: '答：夠，多3張椅子', is_correct: false, error_explanation: '9個人要坐6張椅子，9比6大，代表「人比椅子多」，所以椅子是「不夠」的，少了3張喔！' }
            ];
            remediation = '親愛的同學，你的計算步驟 9-6=3 非常棒！但是我們來想一想生活中的畫面喔：如果有 9 個小朋友要坐下，可是現場只有 6 張椅子，是不是有 3 個小朋友會沒位子坐呢？所以是椅子「不夠」，「少」了 3 張喔！下次看到題目時，可以畫小圈圈來對應看看！';
        }
        
        // 5. 採用關鍵字匹配`;
data = data.replace(ruleTarget, newRule);

fs.writeFileSync('data.js', data, 'utf8');
console.log('Updated data.js successfully!');
