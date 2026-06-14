const fs = require('fs');
let dataJs = fs.readFileSync('data.js', 'utf8');

const match = dataJs.match(/"id":\s*"M-1-2-1"[\s\S]*?\}/);

if (match) {
    const insertPos = match.index + match[0].length;
    
    const newMisc = `,
            {
                "id": "M-1-2-2",
                "name": "加乘法符號混淆",
                "description": "學生對於加號（+）與乘號（×）的幾何形狀相似產生視覺混淆，或是過早接觸乘法導致概念干擾，使得在應該進行加法計算時，誤用了乘法運算。",
                "example": "計算 5 + 6 時，學生寫出 5 × 6 = 30（或是心中默念五六三十而直接寫出答案 30）。"
            }`;
            
    dataJs = dataJs.slice(0, insertPos) + newMisc + dataJs.slice(insertPos);
    fs.writeFileSync('data.js', dataJs, 'utf8');
    console.log('Successfully added via regex insertion');
} else {
    console.log('Regex match failed.');
}
