const fs = require('fs');

let fileContent = fs.readFileSync('data.js', 'utf8');

const targetStr = `"id": "M-5-4-1",
                "name": "分子加分子、分母加分母",
                "description": "異分母分數相加時，未先通分尋找共同分母，而是直接將分子與分母分別相加。",
                "example": "計算 1/2 + 1/3，學生算出 (1+1)/(2+3) = 2/5。"
            }`;

const newMisc = `            },
            {
                "id": "M-5-4-2",
                "name": "分數加法與乘法規則混淆",
                "description": "異分母分數相加時，誤用分數乘法的規則，將分子與分子相乘、分母與分母相乘。",
                "example": "計算 1/3 + 1/4，學生算出 (1×1)/(3×4) = 1/12。"
            }`;

if (fileContent.indexOf(targetStr) !== -1) {
    fileContent = fileContent.replace(targetStr, targetStr + newMisc);
    fs.writeFileSync('data.js', fileContent, 'utf8');
    console.log('Successfully added M-5-4-2 via string replace');
} else {
    // Try to find the block via regex if exact match fails
    const match = fileContent.match(/"id":\s*"M-5-4-1"[\s\S]*?\}/);
    if (match) {
        const insertPos = match.index + match[0].length;
        const newMiscRegex = `,
            {
                "id": "M-5-4-2",
                "name": "分數加法與乘法規則混淆",
                "description": "異分母分數相加時，誤用分數乘法的規則，將分子與分子相乘、分母與分母相乘。",
                "example": "計算 1/3 + 1/4，學生算出 (1×1)/(3×4) = 1/12。"
            }`;
        fileContent = fileContent.slice(0, insertPos) + newMiscRegex + fileContent.slice(insertPos);
        fs.writeFileSync('data.js', fileContent, 'utf8');
        console.log('Successfully added M-5-4-2 via regex');
    } else {
        console.log('Target string not found.');
    }
}
