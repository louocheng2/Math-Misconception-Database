/**
 * 數學迷思終結者 - 學生端網頁邏輯 (student.js)
 */

// ==========================================
// 應用程式狀態管理
// ==========================================
const AppState = {
    currentView: 'diag',
    studentName: '',
    grade: 5,
    records: [],
    selectedRecord: null,
    imageUploadBase64: null,
    imageUploadMimeType: null,
    
    // 挑戰擂台狀態
    currentChallengeNode: null,
    currentChallengeErrorType: '',
    currentChallengeQuestion: null,
    
    supabaseStatus: false
};

// ==========================================
// 初始化與生命週期
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 檢查 Session
    checkSession();
    
    // 2. 初始化 Supabase
    CloudDatabase.init();
    await updateCloudStatus();
    
    // 3. 載入學生清單供下拉選單使用
    populateStudentList();
    
    // 4. 設定 Drag & Drop
    setupDragAndDrop();
    
    // 5. 共享檢測 API Key
    checkApiKeySetup();
});

// 載入所有不重複的學生名單供登入時自動完成
async function populateStudentList() {
    const allRecords = await CloudDatabase.fetchAllRecords();
    const uniqueNames = [...new Set(allRecords.map(r => r.student_name.trim()))];
    
    const selectBox = document.getElementById('student-name-select');
    if (selectBox) {
        selectBox.innerHTML = '<option value="">-- 點擊選擇已建立的學生 --</option>';
        uniqueNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectBox.appendChild(option);
        });
    }
}

// 供 HTML onchange 使用，選擇後自動填入下方輸入框
window.handleStudentSelectChange = function() {
    const selectBox = document.getElementById('student-name-select');
    const input = document.getElementById('student-name');
    if (selectBox && selectBox.value) {
        input.value = selectBox.value;
    }
}

// 檢查是否已登入
function checkSession() {
    const savedName = sessionStorage.getItem('STUDENT_NAME');
    const savedGrade = sessionStorage.getItem('STUDENT_GRADE');
    
    if (savedName && savedGrade) {
        AppState.studentName = savedName;
        AppState.grade = parseInt(savedGrade);
        
        // 進入 App 主畫面
        showAppScreen();
    } else {
        // 顯示登入畫面
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
}

// 學生登入
function loginStudent() {
    const nameInput = document.getElementById('student-name').value.trim();
    const gradeSelect = document.getElementById('student-grade').value;
    
    if (!nameInput) {
        showToast('請輸入你的名字喔！', 'warning');
        return;
    }
    
    AppState.studentName = nameInput;
    AppState.grade = parseInt(gradeSelect);
    
    sessionStorage.setItem('STUDENT_NAME', AppState.studentName);
    sessionStorage.setItem('STUDENT_GRADE', AppState.grade);
    
    showToast(`歡迎回來，${AppState.studentName}！準備開始數學冒險囉！`);
    showAppScreen();
}

// 登出學生
function logoutStudent() {
    sessionStorage.removeItem('STUDENT_NAME');
    sessionStorage.removeItem('STUDENT_GRADE');
    
    AppState.studentName = '';
    AppState.grade = 5;
    AppState.records = [];
    
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    showToast('已登出學習帳號。');
}

// 驗證教師身分 (前往後台前)
window.verifyTeacherAccess = function(event) {
    event.preventDefault();
    const pwd = prompt("請輸入教師專屬密碼以前往後台：");
    if (pwd === "admin") {
        window.location.href = "index.html";
    } else if (pwd !== null) {
        alert("密碼錯誤，請重新輸入！\n(提示：預設密碼為 admin)");
    }
}

// 顯示 App 主畫面並加載資料
async function showAppScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    // 更新歡迎文字與頭像
    document.getElementById('user-welcome-text').textContent = `${AppState.studentName} (${AppState.grade}年級)`;
    document.getElementById('user-avatar-char').textContent = AppState.studentName.charAt(0);
    
    // 載入該學生的歷史紀錄與重繪
    await refreshStudentRecords();
    
    // 渲染下拉選單
    renderCurriculumDropdown();
    
    // 預設切換至自我診斷
    switchView('diag');
}

// 更新 Supabase 雲端連線狀態
async function updateCloudStatus() {
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    
    const isConnected = await CloudDatabase.checkConnection();
    AppState.supabaseStatus = isConnected;
    
    if (isConnected) {
        dot.className = 'status-dot online';
        text.textContent = '雲端連線成功';
    } else {
        dot.className = 'status-dot';
        text.textContent = '本地離線模式';
    }
}

// 刷新並拉取學生的歷史資料
async function refreshStudentRecords() {
    // 獲取所有紀錄，並在前端依據學生姓名進行過濾 (跨年級長久紀錄)
    const allRecords = await CloudDatabase.fetchAllRecords();
    AppState.records = allRecords.filter(r => 
        r.student_name.trim() === AppState.studentName.trim()
    );
    
    // 更新錯題本的 badge 數量 (is_correct === false)
    const mistakeCount = AppState.records.filter(r => !r.is_correct).length;
    document.getElementById('mistake-count-badge').textContent = mistakeCount;
    
    // 重新渲染錯題清單與挑戰清單
    renderMistakeGrid();
    renderChallengeSelectMode();
}

// 檢查並顯示 API Key 警告 Banner
function checkApiKeySetup() {
    let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';
    const key = localStorage.getItem('MATH_MISCONCEPTION_GROQ_KEY');
    const banner = document.getElementById('api-warning-banner');
    
    if (model === 'local-simulation' || model === 'local-ollama') {
        banner.style.display = 'none';
    } else if (!key) {
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

// 快速儲存 API Key
function saveQuickApiKey() {
    const keyInput = document.getElementById('banner-api-key').value.trim();
    if (!keyInput) {
        showToast('請輸入 API Key！', 'warning');
        return;
    }
    localStorage.setItem('MATH_MISCONCEPTION_GROQ_KEY', keyInput);
    // 儲存金鑰後，將模型改回預設的 llama-3.3-70b-versatile 以發揮完整能力
    localStorage.setItem('MATH_MISCONCEPTION_GROQ_MODEL', 'llama-3.3-70b-versatile');
    checkApiKeySetup();
    showToast('Groq API Key 設定成功！');
}

// 切換至免金鑰本地引擎
function switchToLocalEngine(engineType) {
    localStorage.setItem('MATH_MISCONCEPTION_GROQ_MODEL', engineType);
    checkApiKeySetup();
    showToast(`已成功切換至【${engineType === 'local-simulation' ? '本地模擬 AI 引擎' : '本地 Ollama'}】！`);
}

// ==========================================
// SPA 視圖切換
// ==========================================
function switchView(viewId) {
    AppState.currentView = viewId;
    
    // 側邊選單 active 狀態
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeNav) activeNav.classList.add('active');
    
    // 面板切換
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(`view-${viewId}`);
    if (activeSection) activeSection.classList.add('active');
    
    if (viewId === 'mistakes') {
        renderMistakeGrid();
    } else if (viewId === 'challenge') {
        exitChallenge(); // 確保回到挑戰選擇區
    }
}

// ==========================================
// 拖曳上傳與圖片載入
// ==========================================
function triggerFileInput() {
    document.getElementById('diag-image-file').click();
}

function setupDragAndDrop() {
    const zone = document.getElementById('image-upload-zone');
    
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--primary)';
        zone.style.backgroundColor = 'var(--primary-bg)';
    });
    
    zone.addEventListener('dragleave', () => {
        zone.style.borderColor = 'var(--border-color)';
        zone.style.backgroundColor = 'var(--bg-app)';
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--border-color)';
        zone.style.backgroundColor = 'var(--bg-app)';
        
        if (e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        processFile(e.target.files[0]);
    }
}

function processFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('請上傳照片檔案喔！', 'danger');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('照片太大了，請上傳小於 5MB 的照片喔！', 'danger');
        return;
    }

    AppState.imageUploadMimeType = file.type;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = e.target.result;
        AppState.imageUploadBase64 = base64Data.split(',')[1];
        
        const previewImg = document.getElementById('image-preview');
        const previewContainer = document.getElementById('image-preview-container');
        previewImg.src = base64Data;
        previewContainer.style.display = 'block';
        document.getElementById('image-upload-zone').style.display = 'none';
        showToast('照片讀取成功！');
    };
    reader.readAsDataURL(file);
}

function removeImagePreview() {
    AppState.imageUploadBase64 = null;
    AppState.imageUploadMimeType = null;
    document.getElementById('diag-image-file').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('image-upload-zone').style.display = 'block';
}

function clearDiagnosisForm() {
    document.getElementById('diag-question').value = '';
    document.getElementById('diag-calculation-text').value = '';
    removeImagePreview();
    
    document.getElementById('diag-empty').style.display = 'flex';
    document.getElementById('diag-loading').style.display = 'none';
    document.getElementById('diag-result-content').style.display = 'none';
}

// ==========================================
// 🔬 AI 智慧診斷引擎 (學生口吻)
// ==========================================
async function runStudentDiagnosis() {
    const question = document.getElementById('diag-question').value.trim();
    const calcText = document.getElementById('diag-calculation-text').value.trim();
    
    if (!question && !AppState.imageUploadBase64) {
        showToast('請填寫題目內容，或是上傳包含題目與算式的照片喔！', 'warning');
        return;
    }
    if (!AppState.imageUploadBase64 && !calcText) {
        showToast('請拍下你的計算過程照片，或在下方填寫你的算式喔！', 'warning');
        return;
    }
    
    let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';
    const isLocalSim = (model === 'local-simulation');
    const isLocalOllama = (model === 'local-ollama');
    
    let apiKey = '';
    if (!isLocalSim && !isLocalOllama) {
        apiKey = localStorage.getItem('MATH_MISCONCEPTION_GROQ_KEY');
        if (!apiKey) {
            showToast('請先設定你的 Groq API Key 喔！', 'danger');
            return;
        }
    }
    
    // 顯示載入中
    document.getElementById('diag-empty').style.display = 'none';
    document.getElementById('diag-result-content').style.display = 'none';
    document.getElementById('diag-loading').style.display = 'flex';
    
    const loadingTips = [
        'AI 老師正在仔細看你的題目...',
        'AI 老師正在讀取你的算式...',
        'AI 老師正在分析計算的每一步...',
        'AI 老師正在幫你抓出小迷思...',
        '即將為你生成溫馨的解析卡片...'
    ];
    let tipIdx = 0;
    const tipInterval = setInterval(() => {
        document.getElementById('diag-loading-desc').textContent = loadingTips[tipIdx % loadingTips.length];
        tipIdx++;
    }, 2000);

    try {
        let parsedResult;
        
        if (isLocalSim) {
            parsedResult = await HeuristicDiagnosticEngine.diagnose(AppState.studentName, AppState.grade, question, calcText);
        } else if (isLocalOllama) {
            parsedResult = await callLocalOllama(AppState.studentName, AppState.grade, question, calcText, true);
        } else {
            // 載入該年級的指標上下文
            const gradeNodes = DataService.getNodesByGrade(AppState.grade);
            const curriculumContext = gradeNodes.map(n => {
                const presets = n.preset_misconceptions.map(m => ` - ${m.name}: ${m.description} (例：${m.example})`).join('\n');
                return `指標 [${n.code}] ${n.title}\n指標說明：${n.description}\n預設迷思樣態：\n${presets}`;
            }).join('\n\n');

            const prompt = `你是一位臺灣國小數學輔導教師。說話語氣溫和、親切、富有同理心與童趣，常用「喔」、「囉」、「呀」、「哇」、「哈」等童趣語氣，多用正面鼓勵，帶領學生找出自己計算的盲點。
請診斷以下學生的數學題目與計算過程。

學生資訊：
- 學生姓名：${AppState.studentName}
- 年級：國小 ${AppState.grade} 年級
- 數學題目：${question || '【未提供文字題目，請直接從手寫圖片中識別並擷取題目內容】'}
${calcText ? `- 算式過程：${calcText}` : '- 算式過程：請參閱隨附之手寫算式圖片（圖片中可能合併包含題目與計算過程）。'}

【當前年級 (${AppState.grade} 年級) 的臺灣 108 課綱數學學習內容與常見迷思樣態參考表】：
${curriculumContext}

【診斷分析指南】：
1. 仔細辨識題目與計算過程。
2. 判定最終答案是否正確（is_correct）。如果計算邏輯與最終答案都完全正確，才可設定 is_correct 為 true。只要有任何計算或觀念錯誤，請設定為 false。
3. 判定學生的錯誤類型屬於哪一個課綱指標代碼（node_code，例如 N-5-4）與指標名稱（node_title，例如 異分母分數的加減）。
4. 比對並定位其錯誤屬於參考表中的哪一種「迷思概念樣態」（error_type）。如果判定學生完全理解題意且算式邏輯完全正確，僅僅是因為加減乘除的粗心計算失誤（例如 5+6=12），請一律將 error_type 設定為「單純計算失誤」，不要將其稱為迷思概念。若不屬於純計算失誤且不符合參考表，請由你給出一個清晰的迷思概念中文名稱（例如：小數點強行對齊、借位忘記扣一、分數分子分母直接相加等）。
5. 寫出詳細的計算步驟分析，列出每一步是正確 (true) 還是錯誤 (false)，並對錯誤的步驟給出白話且極度溫柔的錯誤解釋。
6. 提供一個針對這名學生的「溫馨解題提示」（remediation），直接稱呼「親愛的同學」或「小朋友」，引導他如何改正，請用溫柔、親切的語氣給予指導與讚賞，並給予正面鼓勵。

請一律以繁體中文 (zh-TW) 進行診斷與建議。
你必須且只能回覆一個符合以下 JSON 格式的字串，不要包含 any 額外的說明，也不要使用 \`\`\`json ... \`\`\` 進行外包裝。

JSON 格式要求：
{
  "question": "辨識出或原本輸入的數學題目文字 (若學生未輸入題目，請務必在此填入從圖片中識別出的數學題目文字)",
  "is_correct": false,
  "correct_answer": "正解的最後答案",
  "student_answer": "學生的最後答案",
  "node_code": "課綱指標代碼",
  "node_title": "課綱指標名稱",
  "error_type": "定位的迷思概念樣態名稱",
  "error_description": "該迷思概念樣態的簡單學理解釋",
  "steps": [
    {
      "step_number": 1,
      "content": "算式步驟內容 (例如 1/2 + 1/3)",
      "is_correct": true,
      "error_explanation": null
    },
    {
      "step_number": 2,
      "content": "算式步驟內容 (例如 = 2/5)",
      "is_correct": false,
      "error_explanation": "這裡分子與分子直接相加、分母與分母直接相加，忽略了異分母分數需要先通分尋找等值分數的概念。"
    }
  ],
  "remediation": "給學生的溫馨提示，請使用極度溫柔親切的國小導師語氣..."
}`;

            const url = `https://api.groq.com/openai/v1/chat/completions`;
            
            let messageContent;
            let targetModel = model;

            if (AppState.imageUploadBase64) {
                targetModel = "meta-llama/llama-4-scout-17b-16e-instruct";
                const mimeType = AppState.imageUploadMimeType || "image/png";
                let b64Data = AppState.imageUploadBase64;
                if (!b64Data.startsWith('data:')) {
                     b64Data = `data:${mimeType};base64,${b64Data}`;
                }
                messageContent = [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: b64Data } }
                ];
            } else {
                messageContent = prompt;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: targetModel,
                    messages: [{ role: "user", content: messageContent }],
                    temperature: 0.5
                })
            });

                if (!response.ok) { 
        const errText = await response.text(); 
        console.error('Groq API Error:', errText); 
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 100)}`); 
    }
                
                const resultData = await response.json();
                const rawText = resultData.choices[0].message.content.trim();
            
            try {
                parsedResult = JSON.parse(rawText);
            } catch (e) {
                const match = rawText.match(/\{[\s\S]*\}/);
                if (match) {
                    parsedResult = JSON.parse(match[0]);
                } else {
                    throw new Error('AI 老師的解析結果無法解析，請再送出一次試試看喔！');
                }
            }
            if (parsedResult && parsedResult.steps && parsedResult.steps.some(s => s.is_correct === false)) {
                parsedResult.is_correct = false;
            }
        }

        // 保存紀錄至雲端
        const newRecord = {
            id: generateUUID(),
            student_name: AppState.studentName,
            grade: AppState.grade,
            node_code: parsedResult.node_code || 'N-A-A',
            node_title: parsedResult.node_title || '未知指標',
            question: question || parsedResult.question || '從手寫照片辨識的題目',
            calculation_text: calcText || (parsedResult.steps ? parsedResult.steps.map(s => s.content).join(' -> ') : ''),
            image_base64: AppState.imageUploadBase64 ? `data:${AppState.imageUploadMimeType};base64,${AppState.imageUploadBase64}` : null,
            is_correct: parsedResult.is_correct,
            error_type: parsedResult.is_correct ? '無錯誤' : (parsedResult.error_type || '其他錯誤'),
            analysis_result: parsedResult,
            remediation: parsedResult.remediation || '加油！你可以做到的！',
            created_at: new Date().toISOString()
        };

        const saveRes = await CloudDatabase.saveRecord(newRecord);
        showToast(saveRes.offline ? '診斷卡片生成成功！(已儲存於本機)' : '診斷小卡同步成功！');
        
        // 渲染結果
        renderDiagnosticResult(newRecord);
        
        // 重新讀取
        await refreshStudentRecords();

    } catch (err) {
        console.error(err);
        showToast(`診斷失敗: ${err.message}`, 'danger');
        document.getElementById('diag-empty').style.display = 'flex';
        document.getElementById('diag-result-content').style.display = 'none';
    } finally {
        clearInterval(tipInterval);
        document.getElementById('diag-loading').style.display = 'none';
    }
}

// 顯示診斷結果
function renderDiagnosticResult(record) {
    document.getElementById('diag-empty').style.display = 'none';
    document.getElementById('diag-loading').style.display = 'none';
    
    const content = document.getElementById('diag-result-content');
    content.style.display = 'block';

    // 狀態 Badge
    const badgeContainer = document.getElementById('result-status-badge');
    if (record.is_correct) {
        badgeContainer.innerHTML = `<span class="badge badge-success"><i class="fa-solid fa-face-grin-stars"></i> 太棒了！答案完全正確</span>`;
    } else {
        badgeContainer.innerHTML = `<span class="badge badge-error"><i class="fa-solid fa-face-frown"></i> 加油！發現小迷思</span>`;
    }

    document.getElementById('result-title').textContent = `${record.student_name} 的數學診斷卡`;
    document.getElementById('result-date').textContent = `診斷日期：${formatDate(record.created_at)}`;
    document.getElementById('result-curriculum-title').textContent = `指標：${record.node_code} ${record.node_title}`;

    // 迷思區
    const nameH4 = document.getElementById('result-error-name');
    const descP = document.getElementById('result-error-desc');
    if (record.is_correct) {
        nameH4.textContent = '沒有小錯誤喔！';
        descP.textContent = '這次你的解答非常完美，代表你已經完全掌握這個概念囉！繼續保持！';
        nameH4.style.color = 'var(--success)';
        document.querySelector('.mistake-block').style.borderColor = 'var(--success-light)';
    } else {
        nameH4.textContent = record.error_type || '未分類錯誤';
        descP.textContent = record.analysis_result.error_description || '在算式推演中，概念有一點點混淆了。別擔心，看看下方的解析吧！';
        nameH4.style.color = 'var(--danger)';
        document.querySelector('.mistake-block').style.borderColor = 'rgba(239, 68, 68, 0.15)';
    }

    // 渲染步驟
    const stepsTimeline = document.getElementById('result-steps-timeline');
    stepsTimeline.innerHTML = '';
    
    if (record.analysis_result.steps && record.analysis_result.steps.length > 0) {
        record.analysis_result.steps.forEach(step => {
            const div = document.createElement('div');
            div.className = `timeline-item ${step.is_correct ? 'correct' : 'incorrect'}`;
            div.innerHTML = `
                <div class="step-num">步驟 ${step.step_number}</div>
                <div class="step-content">${step.content}</div>
                ${step.is_correct ? '' : `<div class="step-error"><i class="fa-solid fa-lightbulb"></i> 老師悄悄話：${step.error_explanation}</div>`}
            `;
            stepsTimeline.appendChild(div);
        });
    } else {
        stepsTimeline.innerHTML = `<div class="timeline-item">尚未擷取步驟。</div>`;
    }

    // AI 溫馨回饋
    document.getElementById('result-remediation').textContent = record.remediation;
}

// ==========================================
// 📚 我的學習錯題本 (Personal Mistake Book)
// ==========================================
let currentDomainFilter = '';

function filterMistakesByDomain(domain) {
    currentDomainFilter = domain;
    
    // 更新 Active 按鈕
    document.querySelectorAll('.filter-badge').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-badge[data-domain="${domain}"]`).classList.add('active');
    
    renderMistakeGrid();
}

function renderMistakeGrid() {
    const container = document.getElementById('mistakes-grid-container');
    container.innerHTML = '';
    
    // 錯題本僅顯示 error 紀錄 (is_correct === false)
    let mistakes = AppState.records.filter(r => !r.is_correct);
    
    if (currentDomainFilter) {
        mistakes = mistakes.filter(r => {
            const node = DataService.getNodeByCode(r.node_code);
            return node && node.domain === currentDomainFilter;
        });
    }
    
    if (mistakes.length === 0) {
        container.innerHTML = `
            <div class="placeholder-state" style="grid-column: 1/-1; min-height: 250px;">
                <i class="fa-solid fa-face-grin-squint-tears" style="font-size: 48px;"></i>
                <h3>這裡空空如也！</h3>
                <p>你目前沒有這個範疇的錯誤紀錄喔，你太優秀了！</p>
            </div>
        `;
        return;
    }
    
    mistakes.forEach(record => {
        const card = document.createElement('div');
        card.className = 'mistake-card';
        card.onclick = () => viewRecordDetails(record);
        
        card.innerHTML = `
            <div class="mistake-card-header">
                <span class="mistake-date"><i class="fa-regular fa-clock"></i> ${formatDate(record.created_at)}</span>
                <span class="badge-count" style="position:static; transform:none; background-color:var(--primary-light)">${record.node_code}</span>
            </div>
            <div class="mistake-question-summary">${record.question}</div>
            <div class="mistake-tag"><i class="fa-solid fa-triangle-exclamation"></i> ${record.error_type}</div>
            <div class="mistake-card-footer">
                <button class="btn-card-action"><i class="fa-solid fa-eye"></i> 查看分析</button>
                <button class="btn-card-action" style="color: var(--warning);" onclick="event.stopPropagation(); startChallenge('${record.node_code}', '${record.error_type}')">
                    <i class="fa-solid fa-rocket"></i> 馬上挑戰
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 檢視歷史詳情 (Drawer)
function viewRecordDetails(record) {
    AppState.selectedRecord = record;
    toggleDrawer(true);
    
    document.getElementById('drawer-title').textContent = `${record.student_name} 的錯題卡`;
    
    const body = document.getElementById('drawer-body-content');
    
    // 是否有圖片
    const imageHTML = record.image_base64 
        ? `<div style="text-align:center; margin-bottom: 20px;"><img src="${record.image_base64}" style="max-height:220px; max-width:100%; border-radius:8px; border:1px solid var(--border-color);" alt="手寫過程"></div>`
        : '';
        
    // 渲染步驟
    const stepsHTML = record.analysis_result.steps && record.analysis_result.steps.length > 0
        ? record.analysis_result.steps.map(step => `
            <div class="timeline-item ${step.is_correct ? 'correct' : 'incorrect'}" style="margin-bottom:12px; padding-left:10px;">
                <div class="step-num">步驟 ${step.step_number}</div>
                <div class="step-content">${step.content}</div>
                ${step.is_correct ? '' : `<div class="step-error" style="font-size:12px; padding:6px; color:var(--danger); background-color:var(--danger-bg); border-radius:4px; margin-top:4px;">${step.error_explanation}</div>`}
            </div>
          `).join('')
        : '<p>無步驟記錄。</p>';

    body.innerHTML = `
        <div style="background-color: var(--primary-bg); padding:15px; border-radius:var(--radius-sm); margin-bottom: 20px; border:1px solid rgba(99,102,241,0.15)">
            <h4 style="font-size:15px; font-weight:800; color:var(--primary);"><i class="fa-solid fa-circle-question"></i> 原本的題目：</h4>
            <p style="margin-top:5px; font-weight:700;">${record.question}</p>
        </div>
        
        ${imageHTML}
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size:14px; font-weight:800; color:var(--danger); margin-bottom:6px;"><i class="fa-solid fa-bomb"></i> 答錯的迷思概念：</h4>
            <p><strong>${record.error_type}</strong></p>
            <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">${record.analysis_result.error_description || ''}</p>
        </div>
        
        <div style="margin-bottom: 20px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4 style="font-size:14px; font-weight:800; color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-route"></i> 解題步驟分析：</h4>
            <div class="steps-timeline" style="margin-top:10px;">
                ${stepsHTML}
            </div>
        </div>

        <div style="border-top:1px solid var(--border-color); padding-top:15px;">
            <h4 style="font-size:14px; font-weight:800; color:var(--warning); margin-bottom:6px;"><i class="fa-solid fa-chalkboard-user"></i> AI 老師對你的提示：</h4>
            <div class="teacher-feedback-box">${record.remediation}</div>
        </div>
    `;
}

function startChallengeFromDrawer() {
    if (AppState.selectedRecord) {
        toggleDrawer(false);
        startChallenge(AppState.selectedRecord.node_code, AppState.selectedRecord.error_type);
    }
}

function toggleDrawer(show) {
    const drawer = document.getElementById('drawer-overlay');
    if (show) {
        drawer.classList.add('active');
    } else {
        drawer.classList.remove('active');
    }
}

function closeDrawer(e) {
    if (e.target.id === 'drawer-overlay') {
        toggleDrawer(false);
    }
}

// ==========================================
// 🎯 迷思挑戰擂台 (AI Practice Arena)
// ==========================================

// 填寫課綱下拉選單 (自主練習用)
function renderCurriculumDropdown() {
    const select = document.getElementById('challenge-node-select');
    select.innerHTML = '';
    
    const nodes = DataService.getNodesByGrade(AppState.grade);
    nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.code;
        option.textContent = `[${node.code}] ${node.title}`;
        select.appendChild(option);
    });
}

// 渲染挑戰大廳
function renderChallengeSelectMode() {
    const listContainer = document.getElementById('personal-challenge-list');
    listContainer.innerHTML = '';
    
    // 找出所有唯一的錯誤迷思
    const uniqueMistakes = [];
    const seen = new Set();
    
    AppState.records.filter(r => !r.is_correct).forEach(r => {
        if (r.error_type === '單純計算失誤') return; // 過濾純計算失誤，不列入迷思挑戰擂台
        const key = `${r.node_code}-${r.error_type}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMistakes.push({
                node_code: r.node_code,
                node_title: r.node_title,
                error_type: r.error_type,
                description: r.analysis_result.error_description || '這個概念還需要再練習一下喔！'
            });
        }
    });
    
    if (uniqueMistakes.length === 0) {
        listContainer.innerHTML = `
            <div class="placeholder-state" style="grid-column: 1/-1; min-height: 150px; padding: 20px;">
                <i class="fa-solid fa-face-smile-wink" style="font-size: 36px; color: var(--success);"></i>
                <h4 style="color:var(--text-main);">哇！目前沒有偵測到迷思怪喔</h4>
                <p style="font-size:13px;">你可以從下方的「自主技能演練」隨機選一個單元進行挑戰練習喔！</p>
            </div>
        `;
        return;
    }
    
    uniqueMistakes.forEach(item => {
        const card = document.createElement('div');
        card.className = 'challenge-item-card';
        card.innerHTML = `
            <div>
                <span class="badge badge-error" style="padding:2px 8px; font-size:11px; margin-bottom:10px;"><i class="fa-solid fa-ghost"></i> 迷思怪等級: ${item.node_code}</span>
                <div class="challenge-item-title">${item.error_type}</div>
                <div class="challenge-item-desc">${item.description}</div>
            </div>
            <button class="btn btn-start-challenge" onclick="startChallenge('${item.node_code}', '${item.error_type}')">
                <i class="fa-solid fa-gamepad"></i> 挑戰迷思魔王
            </button>
        `;
        listContainer.appendChild(card);
    });
}

// 自主挑戰點擊
function startCurriculumChallenge() {
    const code = document.getElementById('challenge-node-select').value;
    const nodeObj = DataService.getNodeByCode(code);
    const errorType = nodeObj && nodeObj.preset_misconceptions.length > 0 
        ? nodeObj.preset_misconceptions[0].name 
        : '該單元核心概念';
        
    startChallenge(code, errorType);
}

// 發起挑戰 (切換到挑戰擂台答題畫面)
async function startChallenge(nodeCode, errorType) {
    AppState.currentChallengeNode = nodeCode;
    AppState.currentChallengeErrorType = errorType;
    
    // 切換 UI 面板
    switchView('challenge');
    document.getElementById('challenge-select-mode').style.display = 'none';
    document.getElementById('challenge-play-mode').style.display = 'grid';
    
    // 隱藏評分結果，顯示等待
    document.getElementById('grading-empty').style.display = 'flex';
    document.getElementById('grading-loading').style.display = 'none';
    document.getElementById('grading-result-content').style.display = 'none';
    
    // 渲染標頭與怪物
    document.getElementById('challenge-node-badge').textContent = `指標：${nodeCode}`;
    document.getElementById('challenge-error-title').textContent = `迷思怪：${errorType}`;
    
    // 呼叫 AI 動態生成挑戰題目
    const questionTextElement = document.getElementById('challenge-question-text');
    questionTextElement.textContent = '正在呼叫 AI 老師，為你出題中...請稍候喔！';
    document.getElementById('challenge-hint-text').style.display = 'none';
    document.getElementById('challenge-answer-input').value = '';
    
    let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';
    const isLocalSim = (model === 'local-simulation');
    const isLocalOllama = (model === 'local-ollama');
    
    let apiKey = '';
    if (!isLocalSim && !isLocalOllama) {
        apiKey = localStorage.getItem('MATH_MISCONCEPTION_GROQ_KEY');
        if (!apiKey) {
            questionTextElement.textContent = '❌ 請先設定你的 Groq API Key 才能進行挑戰喔！';
            return;
        }
    }
    
    const nodeObj = DataService.getNodeByCode(nodeCode);
    
    try {
        let parsed;
        if (isLocalSim) {
            parsed = HeuristicDiagnosticEngine.gradeChallenge(
                AppState.currentChallengeNode,
                AppState.currentChallengeErrorType,
                studentAnswer,
                AppState.currentChallengeQuestion
            );
        } else {
            const prompt = `你是一位親切、充滿熱忱的國小數學專屬輔導老師。現在批改 ${AppState.grade} 年級學生的迷思挑戰中填答：

- 挑戰題目：${AppState.currentChallengeQuestion.question}
- 標準答案：${AppState.currentChallengeQuestion.correct_answer}
- 觀念解說：${AppState.currentChallengeQuestion.conceptual_explanation}
- 學生寫的算式與答案：${studentAnswer}
- 對應的課綱指標為：[${AppState.currentChallengeNode}]
- 學生有本題的迷思概念：${AppState.currentChallengeErrorType}

【批改任務】
1. 仔細審閱學生的算式過程與答案，判斷是否正確。
2. 判斷學生是否已經展現了正確的概念，**沒有**再犯迷思錯誤（如果是，overcame_misconception 設為 true）。
3. 給出一個評分分數 (score 0~100)。
4. 給出溫馨且親切的「AI 老師評語」，直接稱呼對方為「同學」。如果答對了，大大讚賞並恭喜他打敗了這個迷思怪物；如果答錯了，請鼓勵他勇敢嘗試，並用極度淺顯易懂、畫圖或口語化的方式，明確解算一次。
5. 請只能回傳一個符合以下 JSON 格式的字串，不要包含額外的說明，也不要使用 \`\`\`json ... \`\`\` 的外框包裝。

需要的格式：
{
  "is_correct": true/false (答案或步驟是否部分正確),
  "score": 0~100 的數字 (整數),
  "overcame_misconception": true/false (學生是否確實克服了這個迷思錯誤),
  "feedback": "給學生的鼓勵與溫馨指導，語氣肯定且非常溫柔體貼，要讓學生能聽得懂並感覺到被肯定。"
}`;

            if (isLocalOllama) {
                parsed = await callLocalOllamaChallenge(prompt);
            } else {
                const url = `https://api.groq.com/openai/v1/chat/completions`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt }],
                        
                        temperature: 0.5
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const resultData = await response.json();
                const rawText = resultData.choices[0].message.content.trim();
                
                try {
                    parsed = JSON.parse(rawText);
                } catch (e) {
                    const match = rawText.match(/\{[\s\S]*\}/);
                    parsed = JSON.parse(match[0]);
                }
            }
        }
        
        // 渲染批改結果
        document.getElementById('grading-loading').style.display = 'none';
        const content = document.getElementById('grading-result-content');
        content.style.display = 'block';
        
        // 渲染星星與回饋
        const starContainer = document.getElementById('grading-stars');
        starContainer.innerHTML = '';
        
        let starsCount = 1;
        if (parsed.is_correct && parsed.overcame_misconception) {
            starsCount = 3;
            document.getElementById('grading-verdict').textContent = '🎉 完美挑戰成功！迷思怪被消滅了！';
            document.getElementById('grading-verdict').style.color = 'var(--success)';
        } else if (parsed.is_correct || parsed.overcame_misconception || parsed.score >= 70) {
            starsCount = 2;
            document.getElementById('grading-verdict').textContent = '👍 太棒了！快要完全掌握囉！';
            document.getElementById('grading-verdict').style.color = 'var(--warning)';
        } else {
            starsCount = 1;
            document.getElementById('grading-verdict').textContent = '💪 再接再厲！AI 老師陪你練習！';
            document.getElementById('grading-verdict').style.color = 'var(--danger)';
        }
        
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('i');
            if (i < starsCount) {
                star.className = 'fa-solid fa-star';
            } else {
                star.className = 'fa-regular fa-star';
            }
            starContainer.appendChild(star);
        }
        
        document.getElementById('grading-score').textContent = `${parsed.score} 分`;
        document.getElementById('grading-feedback').textContent = parsed.feedback;
        
        // 如果挑戰成功，且原本是個錯題紀錄，我們可以把本地資料中該學生對應此迷思的某些舊紀錄標註或同步
        // 這裡為了保持簡單，僅寫出提示。
        showToast('批改完成！你得到 ' + parsed.score + ' 分！');
        
    } catch (e) {
        console.error(e);
        document.getElementById('grading-loading').style.display = 'none';
        document.getElementById('grading-empty').style.display = 'flex';
        showToast('批改時發生錯誤，請再提交一次試試看喔！', 'danger');
    }
}

// ==========================================
// 輔助函式 (Helper Functions)
// ==========================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDate(isoString) {
    if (!isoString) return '未知';
    const date = new Date(isoString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getGradeChinese(g) {
    const map = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' };
    return map[g] || g;
}

// Toast 通知
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'danger') icon = 'fa-circle-xmark';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// 呼叫本地 Ollama 服務的通用函式
async function callLocalOllama(studentName, grade, question, calcText, isStudentPortal) {
    const ollamaModelName = localStorage.getItem('MATH_MISCONCEPTION_OLLAMA_MODEL') || 'qwen2.5:3b';
    
    // 取得該年級所有指標的縮影，提供給 Ollama 作為參考
    const gradeNodes = DataService.getNodesByGrade(grade);
    const curriculumContext = gradeNodes.map(n => {
        const presets = n.preset_misconceptions.map(m => ` - ${m.name}: ${m.description} (例如：${m.example})`).join('\n');
        return `指標 [${n.code}] ${n.title}\n描述：${n.description}\n常見迷思樣態：\n${presets}`;
    }).join('\n\n');

    let personaPrompt = '';
    if (isStudentPortal) {
        personaPrompt = `你是一位臺灣國小數學輔導教師。說話語氣溫和、親切、與童趣，常用「喔」、「囉」、「呀」、「哇」等，多用正面鼓勵，帶領學生找出自己計算的盲點。`;
    } else {
        personaPrompt = `你是一位臺灣國小專業數學領域輔導教師，擅長診斷學生的數學學習障礙與計算過程中的迷思概念 (Misconception)。`;
    }

    const prompt = `${personaPrompt}
請診斷以下學生的數學題目與計算過程。

學生資訊：
- 學生姓名：${studentName}
- 年級：國小 ${grade} 年級
- 數學題目：${question || '【請直接從隨附照片中識別題目】'}
- 算式過程：${calcText || '請參閱隨附之手寫算式圖片。'}

【當前年級 (國小 ${grade} 年級) 的臺灣 108 課綱數學學習內容與常見迷思樣態參考表】：
${curriculumContext}

【診斷分析指南】：
1. 判定最終答案是否正確（is_correct）。如果算式完全正確，請設定 is_correct 為 true。
2. 判定學生的錯誤類型屬於哪一個課綱指標代碼（node_code，例如 N-5-4）與指標名稱（node_title，例如 異分母分數的加減）。
3. 比對並定位其錯誤屬於參考表中的哪一種「迷思概念樣態」（error_type）。如果都不符合，請由你給出一個清晰的迷思概念中文名稱。
4. 寫出詳細的計算步驟分析，列入每一步是正確 (true) 還是錯誤 (false)，並對錯誤的步驟給出白話解釋。
5. 提供一個針對性的「補救教學建議」（remediation）。

請一律以繁體中文 (zh-TW) 進行診斷與建議。
你必須且只能回覆一個符合以下 JSON 格式的物件，不要包含任何 markdown 外框（如 \`\`\`json ）。

JSON 格式要求：
{
  "question": "辨識出或原本輸入的數學題目文字",
  "is_correct": false,
  "correct_answer": "正解的最後答案",
  "student_answer": "學生的最後答案",
  "node_code": "課綱指標代碼",
  "node_title": "課綱指標名稱",
  "error_type": "定位的迷思概念樣態名稱",
  "error_description": "該迷思概念樣態的詳細學理定義或成因說明",
  "steps": [
    {
      "step_number": 1,
      "content": "算式步驟內容",
      "is_correct": true,
      "error_explanation": null
    }
  ],
  "remediation": "提供給學生的溫馨提示或教學建議"
}`;

    const url = `http://localhost:11434/api/chat`;
    const payload = {
        model: ollamaModelName,
        messages: [
            { role: "system", content: "You are a professional math diagnosis helper that outputs JSON only." },
            { role: "user", content: prompt }
        ],
        format: "json",
        options: {
            temperature: 0.1
        },
        stream: false
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama 伺服器回傳狀態碼 ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.message.content.trim();
        return JSON.parse(jsonText);
    } catch (err) {
        console.error(err);
        throw new Error(`連線本地 Ollama 失敗。請確認 Ollama 已啟動 (http://localhost:11434)，且已下載模型 "${ollamaModelName}"。此外，需於 Ollama 啟動時設定環境變數 OLLAMA_ORIGINS="*" 以防 CORS 跨網域阻擋。`);
    }
}
