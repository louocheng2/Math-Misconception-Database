const fs = require('fs');

function addWarning(file, insertAfterLine, newCode) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('離線模式無法解析圖片內容')) {
        content = content.replace(insertAfterLine, insertAfterLine + '\n' + newCode);
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Added warning to ${file}`);
    }
}

addWarning('app.js', 
    "const isLocalOllama = (model === 'local-ollama');", 
    `    if (isLocalSim && AppState.imageUploadBase64 && !question && !calcText) {
        showToast('離線模式無法解析圖片內容，請手寫輸入題目與算式，或切換為雲端 AI 模式。', 'danger');
        return;
    }`
);

addWarning('student.js', 
    "const isLocalOllama = model === 'local-ollama';", 
    `    if (isLocalSim && AppState.imageUploadBase64 && !question && !calcText) {
        showToast('離線模式無法解析圖片內容，請手寫輸入題目與算式，或切換為雲端 AI 模式。', 'danger');
        return;
    }`
);
