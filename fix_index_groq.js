const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

content = content.replace('讓 Gemini AI 慧眼辨識錯誤類型與迷思', '讓 Groq AI 慧眼辨識錯誤類型與迷思');
content = content.replace('您尚未設定 Google Gemini API Key', '您尚未設定 Groq API Key');
content = content.replace('設定您的 Google Gemini API 與 Supabase', '設定您的 Groq API 與 Supabase');
content = content.replace('id="setting-gemini-model"', 'id="setting-groq-model"');
content = content.replace('for="setting-gemini-model"', 'for="setting-groq-model"');

const oldSelectOptions = `<option value="gemini-1.5-flash" selected>Google Gemini 1.5 Flash (推薦：雲端大模型)</option>
                                    <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (雲端多模態)</option>
                                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (雲端精準版)</option>`;

const newSelectOptions = `<option value="llama3-70b-8192" selected>Groq LLaMA3 70B (推薦：雲端大模型)</option>
                                    <option value="llama3-8b-8192">Groq LLaMA3 8B (雲端極速模型)</option>
                                    <option value="mixtral-8x7b-32768">Groq Mixtral 8x7B (雲端多模專家)</option>`;

if (content.includes('gemini-1.5-flash')) {
    // Basic replace for the options block
    content = content.replace(/<option value="gemini-1.5-flash" selected>.*?<\/option>\s*<option value="gemini-2.0-flash">.*?<\/option>\s*<option value="gemini-1.5-pro">.*?<\/option>/s, newSelectOptions);
}

fs.writeFileSync('index.html', content, 'utf8');
console.log('Fixed index.html successfully!');
