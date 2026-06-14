const fs = require('fs');

let dataJs = fs.readFileSync('data.js', 'utf8');

const miscToAdd = `            {
                "id": "M-1-2-2",
                "name": "加乘法符號混淆",
                "description": "學生對於加號（+）與乘號（×）的幾何形狀相似產生視覺混淆，或是過早接觸乘法導致概念干擾，使得在應該進行加法計算時，誤用了乘法運算。",
                "example": "計算 5 + 6 時，學生寫出 5 × 6 = 30（或是心中默念五六三十而直接寫出答案 30）。"
            },
`;

if (dataJs.includes('"id": "M-1-2-1",') && !dataJs.includes('加乘法符號混淆')) {
    dataJs = dataJs.replace(
        '"preset_misconceptions": [\n            {',
        '"preset_misconceptions": [\n' + miscToAdd + '            {'
    );
    fs.writeFileSync('data.js', dataJs, 'utf8');
    console.log('Successfully added 加乘法符號混淆 to data.js');
} else {
    console.log('Already added or target string not found.');
}
