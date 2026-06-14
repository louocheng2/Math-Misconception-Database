const fs = require('fs');

function updateFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Update Prompt
    const oldPrompt = "如果都不符合，請由你給出一個清晰的迷思概念中文名稱";
    const newPrompt = "如果判定學生完全理解題意且算式邏輯完全正確，僅僅是因為加減乘除的粗心計算失誤（例如 5+6=12），請一律將 error_type 設定為「單純計算失誤」，不要將其稱為迷思概念。若不屬於純計算失誤且不符合參考表，請由你給出一個清晰的迷思概念中文名稱";
    
    // Replace if old prompt exists (for student.js)
    if (content.includes(oldPrompt)) {
        content = content.replace(oldPrompt, newPrompt);
    } else {
        // Fallback for app.js if prompt wording is slightly different
        const oldAppPrompt = "如果都不符合，請由你給出一個清晰的迷思概念中文名稱";
        if (content.includes(oldAppPrompt)) {
            content = content.replace(oldAppPrompt, newPrompt);
        }
    }

    // 2. Filter out '單純計算失誤' from Challenge Arena in student.js
    if (file === 'student.js') {
        const targetLoop = "AppState.records.filter(r => !r.is_correct).forEach(r => {";
        const replacementLoop = `AppState.records.filter(r => !r.is_correct).forEach(r => {
        if (r.error_type === '單純計算失誤') return; // 過濾純計算失誤，不列入迷思挑戰擂台`;
        
        if (content.includes(targetLoop) && !content.includes("r.error_type === '單純計算失誤'")) {
            content = content.replace(targetLoop, replacementLoop);
        }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Successfully updated ${file}`);
}

updateFile('app.js');
updateFile('student.js');
