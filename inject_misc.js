const fs = require('fs');
let dataJs = fs.readFileSync('data.js', 'utf8');

const targetStr = `"id": "M-1-2-1",
                  "name": "關鍵字機械反應",
                  "description": "題目中看到「共」就一律用加法，看到「剩下」或「比...少」就一律用減法，而不理解題目情境的實際語意。",
                  "example": "題目：「小明比小華多3顆糖，小明有8顆，小華有幾顆？」學生看到「多」就用加法算出 8 + 3 = 11（正確應為 8 - 3 = 5）。"
              }`;

const newMisc = `              },
              {
                  "id": "M-1-2-2",
                  "name": "加乘法符號混淆",
                  "description": "學生對於加號（+）與乘號（×）的幾何形狀相似產生視覺混淆，或是過早接觸乘法導致概念干擾，使得在應該進行加法計算時，誤用了乘法運算。",
                  "example": "計算 5 + 6 時，學生寫出 5 × 6 = 30（或是心中默念五六三十而直接寫出答案 30）。"
              }`;

if (dataJs.indexOf(targetStr) !== -1) {
    dataJs = dataJs.replace(targetStr, targetStr + newMisc);
    fs.writeFileSync('data.js', dataJs, 'utf8');
    console.log('Successfully added new misc to data.js');
} else {
    console.log('Target string not found, check the literal string format.');
}
