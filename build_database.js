const fs = require('fs');

let fileContent = fs.readFileSync('data.js', 'utf8');

const startIndex = fileContent.indexOf('const MATH_CURRICULUM_DATA = [');
const endIndex = fileContent.indexOf('];\r\n\r\n// Helper functions', startIndex) !== -1 
    ? fileContent.indexOf('];\r\n\r\n// Helper functions', startIndex) 
    : fileContent.indexOf('];\n\n// Helper functions', startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find the bounds of MATH_CURRICULUM_DATA block");
    process.exit(1);
}

const curriculumStr = fileContent.substring(startIndex + 'const MATH_CURRICULUM_DATA = '.length, endIndex + 1);

let curriculum;
try {
    eval(`curriculum = ${curriculumStr};`);
} catch (e) {
    console.error("Eval failed", e);
    process.exit(1);
}

const misconceptionsToAdd = {
    // 乘除法
    "N-2-3": [{
        id: "M-2-3-1", name: "乘法算式語意顛倒",
        description: "在乘法應用題中，將「被乘數」與「乘數」的位置顛倒，顯示對「單位量」與「單位數」的概念混淆。",
        example: "5盒蘋果每盒3顆，共有幾顆？學生列式為 5 × 3 = 15（正確應為 3 × 5 = 15）。"
    }],
    "N-3-3": [{
        id: "M-3-3-1", name: "直式乘法位值錯位",
        description: "在多位數乘法直式計算中，當使用十位數、百位數去乘被乘數時，乘積沒有正確向左移位對齊（或未補零），直接與個位數乘積對齊相加。",
        example: "計算 12 × 23，學生將十位數 2 乘以 12 的結果 24 直接對齊個位數，最後算出 36 + 24 = 60（正確應為 36 + 240 = 276）。"
    }],
    "N-3-4": [
        {
            id: "M-3-4-1", name: "被除數與除數顛倒",
            description: "在除法應用題中，未根據題意分配，而是直覺習慣「大數除以小數」。",
            example: "題目：5公升果汁平分給10人，每人得多少公升？學生列出 10 ÷ 5 = 2。"
        },
        {
            id: "M-3-4-2", name: "餘數大於除數",
            description: "除法直式計算時，商數給得不夠大，導致減完後的餘數比除數還要大卻未繼續試商。",
            example: "17 ÷ 5，學生寫商為 2，餘數為 7。"
        }
    ],
    // 小數
    "N-3-7": [{
        id: "M-3-7-1", name: "小數長度即大小",
        description: "將小數視為整數比較，誤以為小數點後位數越多的數字越大。",
        example: "比較 0.2 和 0.15，學生認為 0.15 > 0.2，因為 15 大於 2。"
    }],
    "N-4-7": [{
        id: "M-4-7-1", name: "小數加減未對齊小數點",
        description: "小數直式加減法時，沿用整數「向右靠齊」的習慣，而未將小數點對齊。",
        example: "計算 2.5 + 1.25，將 5 與 5 對齊，算成 3.75（實為 2.50 + 1.25 = 3.75）。"
    }],
    "N-5-7": [{
        id: "M-5-7-1", name: "小數乘法積的小數點位置錯誤",
        description: "小數乘法計算完數字部分後，未正確累加被乘數與乘數的小數位數來標示積的小數點。",
        example: "計算 1.2 × 0.3，學生得到 36 後，寫成 3.6 或 0.036（正確應為 0.36）。"
    }],
    // 分數
    "N-3-6": [{
        id: "M-3-6-1", name: "分母越大分數越大",
        description: "將分母視為獨立的整數，誤以為分母數字越大，該分數的值就越大。",
        example: "比較 1/3 與 1/5，學生認為 1/5 > 1/3。"
    }],
    "N-5-4": [{
        id: "M-5-4-1", name: "分子加分子、分母加分母",
        description: "異分母分數相加時，未先通分尋找共同分母，而是直接將分子與分母分別相加。",
        example: "計算 1/2 + 1/3，學生算出 (1+1)/(2+3) = 2/5。"
    }],
    "N-6-1": [{
        id: "M-6-1-1", name: "分數除法未顛倒相乘",
        description: "分數除以分數時，未將除數的分子分母顛倒再相乘，而是直接拿分子除分子，或發生顛倒位置錯誤。",
        example: "計算 1/2 ÷ 1/3，學生直接寫成 1/2 × 1/3 = 1/6（正確應為 1/2 × 3/1 = 3/2）。"
    }],
    // 四則混合
    "N-4-4": [
        {
            id: "M-4-4-1", name: "未遵守先乘除後加減",
            description: "在沒有括號的四則混合算式中，盲目由左至右依序計算，忽略了乘除法必須優先計算的規則。",
            example: "計算 5 + 3 × 2，學生先算 5+3=8，再算 8×2=16（正確應為 3×2=6，5+6=11）。"
        },
        {
            id: "M-4-4-2", name: "括號內未優先計算",
            description: "算式中有括號時，未優先計算括號內的數值，仍然依循原有的運算順序。",
            example: "計算 (5 + 3) × 2，學生算成 5 + 6 = 11（正確應為 8 × 2 = 16）。"
        }
    ]
};

curriculum.forEach(node => {
    if (misconceptionsToAdd[node.code]) {
        if (!node.preset_misconceptions) {
            node.preset_misconceptions = [];
        }
        
        misconceptionsToAdd[node.code].forEach(newMisc => {
            if (!node.preset_misconceptions.some(m => m.name === newMisc.name)) {
                node.preset_misconceptions.push(newMisc);
            }
        });
    }
});

const newCurriculumStr = JSON.stringify(curriculum, null, 4);

fileContent = fileContent.substring(0, startIndex + 'const MATH_CURRICULUM_DATA = '.length) + newCurriculumStr + fileContent.substring(endIndex + 1);
fs.writeFileSync('data.js', fileContent, 'utf8');

console.log("Successfully rebuilt data.js with new comprehensive misconceptions.");
