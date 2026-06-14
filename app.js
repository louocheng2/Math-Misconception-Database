/**
 * 臺灣 108 課綱國小數學迷思概念資料庫 - 核心邏輯 (app.js)
 */

// ==========================================
// 應用程式狀態管理
// ==========================================
const AppState = {
    currentView: 'dashboard',
    currentGradeTab: 1,
    records: [],
    selectedRecord: null,
    imageUploadBase64: null,
    imageUploadMimeType: null,
    supabaseStatus: false
};

// ==========================================
// 初始化與生命週期
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 初始化主題
    initTheme();
    
    // 2. 載入金鑰與連線設定至設定表單
    loadSettingsToForm();
    
    // 3. 初始化 Supabase
    CloudDatabase.init();
    await updateCloudStatus();
    
    // 4. 載入所有資料庫紀錄並重繪 UI
    await refreshRecords();
    
    // 5. 渲染課綱指標
    renderCurriculumBrowser();
    
    // 6. 監聽點擊圖片上傳區拖曳事件
    setupDragAndDrop();
    
    // 7. 檢查 API Key 橫幅狀態
    checkApiKeySetup();
});

// ==========================================
// 導覽切換 (SPA 路由)
// ==========================================
function switchView(viewId) {
    AppState.currentView = viewId;
    
    // 更新側邊欄 Active 狀態
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeNav) activeNav.classList.add('active');
    
    // 更新視圖面板顯示
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`view-${viewId}`);
    if (activePanel) activePanel.classList.add('active');

    // 切換視圖時的特殊重新整理
    if (viewId === 'dashboard') {
        renderDashboard();
    } else if (viewId === 'records') {
        renderRecordsTable();
    } else if (viewId === 'diagnostic') {
        checkApiKeySetup();
    }
}

// 主題切換 (深色/淺色)
function initTheme() {
    const savedTheme = localStorage.getItem('MATH_MISCONCEPTION_THEME') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('MATH_MISCONCEPTION_THEME', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    const btnSpan = document.querySelector('.theme-toggle-btn span');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
        btnSpan.textContent = '切換淺色模式';
    } else {
        icon.className = 'fa-solid fa-moon';
        btnSpan.textContent = '切換深色模式';
    }
}

// 更新 Supabase 雲端連接狀態
async function updateCloudStatus() {
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    
    const isConnected = await CloudDatabase.checkConnection();
    AppState.supabaseStatus = isConnected;
    
    if (isConnected) {
        dot.className = 'status-dot online';
        text.textContent = '雲端資料庫已連線';
    } else {
        dot.className = 'status-dot';
        text.textContent = '雲端資料庫已離線';
    }
}

// 整理並重新載入所有紀錄
async function refreshRecords() {
    AppState.records = await CloudDatabase.fetchAllRecords();
    renderDashboard();
    renderRecordsTable();
}

// ==========================================
// 吐司通知系統 (Toast Notifications)
// ==========================================
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
    
    // 3秒後淡出刪除
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// ==========================================
// 課綱指標瀏覽器 (Curriculum Browser)
// ==========================================
function switchGradeTab(grade) {
    AppState.currentGradeTab = grade;
    document.querySelectorAll('.grade-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.grade-tab[data-grade="${grade}"]`).classList.add('active');
    renderCurriculumBrowser();
}

function renderCurriculumBrowser() {
    const container = document.getElementById('curriculum-cards-container');
    container.innerHTML = '';
    
    const nodes = DataService.getNodesByGrade(AppState.currentGradeTab);
    
    if (nodes.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">此年級尚無課綱指標資料。</p>`;
        return;
    }
    
    nodes.forEach(node => {
        const card = document.createElement('div');
        card.className = 'card curriculum-card';
        
        const domainText = CURRICULUM_DOMAINS[node.domain] || node.domain;
        
        let misconceptionsHTML = '';
        if (node.preset_misconceptions && node.preset_misconceptions.length > 0) {
            misconceptionsHTML = `
                <div class="misconception-list">
                    <div style="font-size: 12px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; display: flex; align-items:center; gap: 4px;">
                        <i class="fa-solid fa-lightbulb" style="color: var(--warning)"></i> 內建常見迷思概念：
                    </div>
                    ${node.preset_misconceptions.map(m => `
                        <div class="misconception-item">
                            <h5>${m.name}</h5>
                            <p>${m.description}</p>
                            <p style="color: var(--danger); font-size: 11px; margin-top: 4px; font-weight: 500;">例：${m.example}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="curriculum-card-header">
                <span class="badge badge-info">${domainText}</span>
                <span class="misconception-count-badge">${node.code}</span>
            </div>
            <h4>${node.title}</h4>
            <p>${node.description}</p>
            ${misconceptionsHTML}
        `;
        
        container.appendChild(card);
    });
}

// ==========================================
// 圖片上傳控制與預覽
// ==========================================
function triggerFileInput() {
    document.getElementById('diag-image-file').click();
}

function setupDragAndDrop() {
    const zone = document.getElementById('image-upload-zone');
    
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--primary)';
        zone.style.backgroundColor = 'rgba(99, 102, 241, 0.04)';
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
        showToast('請上傳有效的圖片檔案 (JPG, PNG)！', 'danger');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('檔案大小不能超過 5MB！', 'danger');
        return;
    }

    AppState.imageUploadMimeType = file.type;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = e.target.result;
        AppState.imageUploadBase64 = base64Data.split(',')[1]; // 去除 data:image/png;base64, 前綴
        
        // 顯示預覽
        const previewImg = document.getElementById('image-preview');
        const previewContainer = document.getElementById('image-preview-container');
        previewImg.src = base64Data;
        previewContainer.style.display = 'block';
        document.getElementById('image-upload-zone').style.display = 'none';
        showToast('圖片載入成功！');
    };
    reader.readAsDataURL(file);
}

function removeImagePreview() {
    AppState.imageUploadBase64 = null;
    AppState.imageUploadMimeType = null;
    document.getElementById('diag-image-file').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('image-upload-zone').style.display = 'flex';
}

function clearDiagnosisForm() {
    document.getElementById('diag-student-name').value = '';
    document.getElementById('diag-question').value = '';
    document.getElementById('diag-calculation-text').value = '';
    removeImagePreview();
    
    document.getElementById('diag-result-empty').style.display = 'flex';
    document.getElementById('diag-result-loading').style.display = 'none';
    document.getElementById('diag-result-content').style.display = 'none';
}

// ==========================================
// Groq AI 診斷引擎
// ==========================================
async function runDiagnosis() {
    const studentName = document.getElementById('diag-student-name').value.trim();
    const grade = parseInt(document.getElementById('diag-grade').value);
    const question = document.getElementById('diag-question').value.trim();
    const calcText = document.getElementById('diag-calculation-text').value.trim();
    
    // 驗證輸入
    if (!studentName) {
        showToast('請輸入學生姓名！', 'warning');
        return;
    }
    if (!question && !AppState.imageUploadBase64) {
        showToast('請輸入數學題目內容，或上傳包含題目與算式的照片！', 'warning');
        return;
    }
    if (!AppState.imageUploadBase64 && !calcText) {
        showToast('請上傳計算過程圖片，或在文字欄填寫計算過程！', 'warning');
        return;
    }
    
    let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';
    const isLocalSim = (model === 'local-simulation');
    const isLocalOllama = (model === 'local-ollama');
    if (isLocalSim && AppState.imageUploadBase64 && !question && !calcText) {
        showToast('離線模式無法解析圖片內容，請手寫輸入題目與算式，或切換為雲端 AI 模式。', 'danger');
        return;
    }
    
    let apiKey = '';
    if (!isLocalSim && !isLocalOllama) {
        apiKey = localStorage.getItem('MATH_MISCONCEPTION_GROQ_KEY') || (typeof DEFAULT_GROQ_KEY !== 'undefined' ? DEFAULT_GROQ_KEY : '');
        if (!apiKey) {
            showToast('請先至「系統設定」設定您的 Groq API Key！', 'danger');
            switchView('settings');
            return;
        }
    }
    
    // 進入載入狀態
    document.getElementById('diag-result-empty').style.display = 'none';
    document.getElementById('diag-result-content').style.display = 'none';
    document.getElementById('diag-result-loading').style.display = 'flex';
    
    const tips = [
        '正在識別手寫算式圖檔...',
        '正在剖析每一步的運算步驟...',
        '正在比對台灣 108 課綱數學學習內容...',
        '正在對齊內建之預設迷思概念樣態...',
        '正在生成量身打造的補救教學方案...'
    ];
    let tipIdx = 0;
    const tipInterval = setInterval(() => {
        document.getElementById('loading-tip').textContent = tips[tipIdx % tips.length];
        tipIdx++;
    }, 2000);

    try {
        let parsedResult;
        
        if (isLocalSim) {
            parsedResult = await HeuristicDiagnosticEngine.diagnose(studentName, grade, question, calcText);
        } else if (isLocalOllama) {
            parsedResult = await callLocalOllama(studentName, grade, question, calcText, false);
        } else {
            // 提供所有低年級與本年級的課綱大綱，讓 AI 能夠跨年級抓出基礎觀念錯誤
            const targetGrade = parseInt(grade);
            const allNodes = DataService.getAllNodes().filter(n => n.grade <= targetGrade);
            const curriculumContext = allNodes.map(n => {
                // 為了節省 AI 處理量 (Token)，只針對相近的兩個年級提供詳細迷思清單，其餘年級只提供指標大綱
                if (n.grade >= targetGrade - 1) {
                    const presets = n.preset_misconceptions.map(m => ` - ${m.name}: ${m.description}`).join('\n');
                    return `指標 [${n.code}] ${n.title}\n描述：${n.description}\n常見迷思樣態：\n${presets}`;
                } else {
                    return `指標 [${n.code}] ${n.title}\n描述：${n.description}`;
                }
            }).join('\n\n');

            // 建置 Prompt
            const prompt = `你是一位臺灣國小專業數學領域輔導教師，擅長診斷學生的數學學習障礙與計算過程中的迷思概念 (Misconception)。
請診斷以下學生的數學題目與計算過程。

學生資訊：
- 學生姓名：${studentName}
- 年級：國小 ${grade} 年級
- 數學題目：${question || '【未提供文字題目，請直接從手寫圖片中識別並擷取題目內容】'}
${calcText ? `- 填寫的計算過程文字：${calcText}` : '- 學生計算過程：請參閱隨附之手寫算式圖片（圖片中可能合併包含題目與計算過程）。'}

【當前年級 (國小 ${grade} 年級) 的臺灣 108 課綱數學學習內容與常見迷思樣態參考表】：
${curriculumContext}

【診斷分析指南】：
1. 仔細辨識題目與計算過程中的每一步。
2. 判定最終答案是否正確（is_correct）。如果計算邏輯與最終答案都完全正確，才可設定 is_correct 為 true。只要有任何計算或觀念錯誤，請設定為 false。
3. 判定學生的錯誤類型屬於哪一個課綱指標代碼（node_code，例如 N-5-4）與指標名稱（node_title，例如 異分母分數的加減）。
4. 比對並定位其錯誤屬於參考表中的哪一種「迷思概念樣態」（error_type）。如果判定學生完全理解題意且算式邏輯完全正確，僅僅是因為加減乘除的粗心計算失誤（例如 5+6=12），請一律將 error_type 設定為「單純計算失誤」，不要將其稱為迷思概念。若不屬於純計算失誤且不符合參考表，請由你給出一個清晰的迷思概念中文名稱（例如：小數點強行對齊、借位忘記扣一、分數分子分母直接相加等）。
5. 寫出詳細的計算步驟分析，列出每一步是正確 (true) 還是錯誤 (false)，並對錯誤的步驟給出白話的錯誤解釋。
6. 提供一個針對性的「補救教學建議」（remediation），說明該如何引導這位學生釐清該概念。

請一律以繁體中文 (zh-TW) 進行診斷與建議。
你必須且只能回覆一個符合以下 JSON 格式的字串，不要包含額外的說明，也不要使用 \`\`\`json ... \`\`\` 進行外包裝。

JSON 格式要求：
{
  "question": "辨識出或原本輸入的數學題目文字 (若學生未輸入題目，請務必在此填入從圖片中識別出的數學題目文字)",
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
  "remediation": "提供給教師的具體補救教學引導手法..."
}`;

            // Groq API 請求結構
            const url = `https://api.groq.com/openai/v1/chat/completions`;
            const headers = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            
            let messageContent;
            let targetModel = model;

            if (AppState.imageUploadBase64) {
                // 如果有圖片，必須強制使用 Groq 的 Vision 模型
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

            const payload = {
                model: targetModel,
                messages: [{ role: "user", content: messageContent }],
                
                temperature: 0.5
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errJson = await response.json().catch(()=>({}));
                throw new Error(errJson.error?.message || `HTTP ${response.status}`);
            }
            
            const resultData = await response.json();
            const rawText = resultData.choices[0].message.content.trim();
            
            // 解析 AI JSON 回傳
            try {
                parsedResult = JSON.parse(rawText);
            } catch (e) {
                // 如果 AI 沒有乖乖吐乾淨的 JSON，嘗試用正則抓取
                const match = rawText.match(/\{[\s\S]*\}/);
                if (match) {
                    parsedResult = JSON.parse(match[0]);
                } else {
                    throw new Error('AI 回傳的資料無法解析為 JSON 格式！');
                }
        }
            if (parsedResult && parsedResult.steps && parsedResult.steps.some(s => s.is_correct === false)) {
                parsedResult.is_correct = false;
            }

        // 保存紀錄至雲端/本地
        }

        const newRecord = {
            id: generateUUID(),
            student_name: studentName,
            grade: grade,
            node_code: parsedResult.node_code || 'N-A-A',
            node_title: parsedResult.node_title || '未知指標',
            question: question || parsedResult.question || '從手寫照片辨識的題目',
            calculation_text: calcText || (parsedResult.steps ? parsedResult.steps.map(s => s.content).join(' -> ') : ''),
            image_base64: AppState.imageUploadBase64 ? `data:${AppState.imageUploadMimeType};base64,${AppState.imageUploadBase64}` : null,
            is_correct: parsedResult.is_correct,
            error_type: parsedResult.is_correct ? '無錯誤' : (parsedResult.error_type || '其他錯誤'),
            analysis_result: parsedResult,
            remediation: parsedResult.remediation || '無具體建議。',
            created_at: new Date().toISOString()
        };

        const saveRes = await CloudDatabase.saveRecord(newRecord);
        showToast(saveRes.offline ? '診斷完畢！(儲存於本地快取)' : '雲端診斷報告生成成功！');
        
        // 渲染結果面板
        renderDiagnosticResult(newRecord);
        
        // 更新大數據與表格
        await refreshRecords();

    } catch (err) {
        console.error(err);
        showToast(`診斷失敗: ${err.message}`, 'danger');
        document.getElementById('diag-result-empty').style.display = 'flex';
        document.getElementById('diag-result-content').style.display = 'none';
    } finally {
        clearInterval(tipInterval);
        document.getElementById('diag-result-loading').style.display = 'none';
    }
}

// 渲染診斷結果
function renderDiagnosticResult(record) {
    document.getElementById('diag-result-empty').style.display = 'none';
    document.getElementById('diag-result-loading').style.display = 'none';
    const content = document.getElementById('diag-result-content');
    content.style.display = 'flex';

    // 儲存當前診斷紀錄至全域供列印使用
    AppState.selectedRecord = record;

    document.getElementById('result-student-title').textContent = `學生：${record.student_name}`;
    document.getElementById('result-date-title').textContent = `診斷時間：${formatDate(record.created_at)}`;
    
    // 是否正確 Badge
    const badgeRow = document.getElementById('result-correct-badge');
    if (record.is_correct) {
        badgeRow.innerHTML = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> 完全正確</span>`;
    } else {
        badgeRow.innerHTML = `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> 計算錯誤</span>`;
    }

    document.getElementById('result-grade-badge').textContent = `${getGradeChinese(record.grade)}年級`;
    document.getElementById('result-node-badge').textContent = `${record.node_code} ${record.node_title}`;
    
    // 指標描述
    const nodeObj = DataService.getNodeByCode(record.node_code);
    document.getElementById('result-node-desc').textContent = nodeObj ? nodeObj.description : '對應指標的描述資訊。';

    // 迷思樣態
    const errorNameSpan = document.getElementById('result-error-name');
    const errorDescP = document.getElementById('result-error-desc');
    if (record.is_correct) {
        errorNameSpan.textContent = '無明顯迷思概念';
        errorDescP.textContent = '該名學生在此題目中的運算步驟完全正確，未展現出迷思概念。';
    } else {
        errorNameSpan.textContent = record.error_type || '其他未分類錯誤';
        errorDescP.textContent = record.analysis_result.error_description || '學生在此單元的解題思維出現偏誤，需加強個別觀念指導。';
    }

    // 渲染步驟
    const stepsList = document.getElementById('result-steps-list');
    stepsList.innerHTML = '';
    
    if (record.analysis_result.steps && record.analysis_result.steps.length > 0) {
        record.analysis_result.steps.forEach(step => {
            const li = document.createElement('li');
            li.className = `step-item ${step.is_correct ? '' : 'has-error'}`;
            li.innerHTML = `
                <div style="font-weight:600;">步驟 ${step.step_number}： ${step.content}</div>
                ${step.is_correct ? '' : `<div style="font-size:12px; margin-top:4px;"><i class="fa-solid fa-angles-right"></i> ${step.error_explanation}</div>`}
            `;
            stepsList.appendChild(li);
        });
    } else {
        stepsList.innerHTML = `<li class="step-item">無法擷取算式步驟。</li>`;
    }

    // 補救教學
    document.getElementById('result-remediation').textContent = record.remediation;
}

// ==========================================
// 教師後台數據分析 (Dashboard)
// ==========================================
function renderDashboard() {
    const records = AppState.records;
    
    // 1. 總診斷人次
    document.getElementById('stat-total-diagnoses').textContent = records.length;
    
    // 2. 迷思錯誤率 (is_correct === false)
    const totalCount = records.length;
    const errorCount = records.filter(r => !r.is_correct).length;
    const errorRate = totalCount > 0 ? Math.round((errorCount / totalCount) * 100) : 0;
    document.getElementById('stat-error-rate').textContent = `${errorRate}%`;

    // 3. 最易錯年級
    const gradeErrorCounts = {};
    records.forEach(r => {
        if (!r.is_correct) {
            gradeErrorCounts[r.grade] = (gradeErrorCounts[r.grade] || 0) + 1;
        }
    });
    let worstGrade = '無資料';
    let maxGradeErrors = 0;
    Object.keys(gradeErrorCounts).forEach(g => {
        if (gradeErrorCounts[g] > maxGradeErrors) {
            maxGradeErrors = gradeErrorCounts[g];
            worstGrade = `${getGradeChinese(g)}年級 (${gradeErrorCounts[g]}次)`;
        }
    });
    document.getElementById('stat-worst-grade').textContent = worstGrade;

    // 4. 最高頻迷思概念樣態
    const misconceptionCounts = {};
    records.forEach(r => {
        if (!r.is_correct && r.error_type && r.error_type !== '無錯誤') {
            misconceptionCounts[r.error_type] = (misconceptionCounts[r.error_type] || 0) + 1;
        }
    });
    let worstMisconception = '無資料';
    let maxMiscErrors = 0;
    Object.keys(misconceptionCounts).forEach(m => {
        if (misconceptionCounts[m] > maxMiscErrors) {
            maxMiscErrors = misconceptionCounts[m];
            worstMisconception = `${m} (${misconceptionCounts[m]}次)`;
        }
    });
    document.getElementById('stat-worst-misconception').textContent = worstMisconception;

    // 5. 渲染高頻迷思排行榜 (SVG 條形圖)
    renderSVGBarChart(misconceptionCounts);

    // 6. 渲染年級熱點熱力圖
    renderHeatmap(records);
}

// 渲染 SVG 長條圖
function renderSVGBarChart(counts) {
    const container = document.getElementById('bar-chart-container');
    
    // 轉換成陣列並排序
    const sorted = Object.keys(counts)
        .map(key => ({ name: key, value: counts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // 取前五名
        
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="result-placeholder" style="width: 100%;">
                <i class="fa-solid fa-chart-bar"></i>
                <p>暫無診斷紀錄，無法生成排行榜</p>
            </div>
        `;
        return;
    }

    const maxValue = Math.max(...sorted.map(item => item.value));
    
    // 計算 Y 軸標籤
    const yTicks = [];
    const step = Math.ceil(maxValue / 4) || 1;
    for (let i = 4; i >= 0; i--) {
        yTicks.push(i * step);
    }

    // 生成圖表 HTML
    let yAxisHTML = yTicks.map(val => `<div>${val}</div>`).join('');
    
    let barsHTML = sorted.map(item => {
        const pct = maxValue > 0 ? (item.value / (step * 4)) * 100 : 0;
        // 高度安全範圍
        const heightPct = Math.min(pct, 100);
        return `
            <div class="bar-item">
                <div class="bar-rect" style="height: ${heightPct}%;" data-value="${item.value}"></div>
                <div class="bar-label" title="${item.name}">${item.name}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="bar-chart-y-axis">${yAxisHTML}</div>
        <div class="bar-chart-body">${barsHTML}</div>
    `;
}

// 渲染熱點熱力圖
function renderHeatmap(records) {
    const container = document.getElementById('heatmap-grid-container');
    container.innerHTML = '';
    
    // 計算 熱點矩陣：年級 (1-6) x 領域 (N, S, R, D)
    const heatmapData = {};
    const domains = ['N', 'S', 'R', 'D'];
    
    for (let g = 1; g <= 6; g++) {
        heatmapData[g] = {};
        domains.forEach(d => {
            heatmapData[g][d] = 0;
        });
    }

    records.forEach(r => {
        if (!r.is_correct) {
            // 抓取 node_code 的第一個字母 (即領域碼)
            const d = r.node_code.charAt(0);
            if (domains.includes(d) && heatmapData[r.grade]) {
                heatmapData[r.grade][d]++;
            }
        }
    });

    // 繪製格點
    for (let g = 1; g <= 6; g++) {
        domains.forEach(d => {
            const count = heatmapData[g][d];
            let heatClass = 'heat-0';
            if (count > 0 && count <= 2) heatClass = 'heat-1';
            else if (count > 2 && count <= 5) heatClass = 'heat-2';
            else if (count > 5 && count <= 8) heatClass = 'heat-3';
            else if (count > 8 && count <= 12) heatClass = 'heat-4';
            else if (count > 12) heatClass = 'heat-5';

            const cell = document.createElement('div');
            cell.className = `heatmap-cell ${heatClass}`;
            cell.innerHTML = `
                ${getGradeChinese(g)}年-${d}
                <span>${count} 次</span>
            `;
            cell.title = `${getGradeChinese(g)}年級 [${CURRICULUM_DOMAINS[d] || d}] 領域錯誤次數：${count} 次`;
            
            // 點擊可以跳轉並篩選
            cell.onclick = () => {
                switchView('records');
                document.getElementById('filter-grade').value = g;
                document.getElementById('filter-domain').value = d;
                document.getElementById('filter-status').value = 'incorrect';
                applyFilters();
            };
            
            container.appendChild(cell);
        });
    }
}

// ==========================================
// 歷程資料庫列表 (Records Table)
// ==========================================
function renderRecordsTable(filteredRecords = null) {
    const listToRender = filteredRecords || AppState.records;
    const tbody = document.getElementById('records-table-body');
    tbody.innerHTML = '';
    
    if (listToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                    <i class="fa-solid fa-folder-open" style="font-size: 24px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                    查無符合篩選條件的診斷紀錄
                </td>
            </tr>
        `;
        return;
    }

    listToRender.forEach(record => {
        const tr = document.createElement('tr');
        
        // 姓名縮寫 Avatar
        const avatarLetter = record.student_name.charAt(0);
        
        // 結果 Badge
        const statusBadge = record.is_correct 
            ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> 正確</span>`
            : `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> 迷思</span>`;

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center;">
                    <div class="student-avatar">${avatarLetter}</div>
                    <span style="font-weight: 600;">${record.student_name}</span>
                </div>
            </td>
            <td>${getGradeChinese(record.grade)}年級</td>
            <td>
                <div style="font-weight: 500;">${record.node_code}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${record.node_title}</div>
            </td>
            <td>
                <span style="font-weight: 500; color: ${record.is_correct ? 'var(--text-muted)' : 'var(--danger)'}">
                    ${record.error_type || '無'}
                </span>
            </td>
            <td>${statusBadge}</td>
            <td style="color: var(--text-muted); font-size: 13px;">${formatDate(record.created_at)}</td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px;" onclick="openDetailsDrawer('${record.id}')">
                    <i class="fa-solid fa-eye"></i> 檢視詳情
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// 套用過濾器
function applyFilters() {
    const searchName = document.getElementById('filter-search-name').value.trim().toLowerCase();
    const filterGrade = document.getElementById('filter-grade').value;
    const filterDomain = document.getElementById('filter-domain').value;
    const filterStatus = document.getElementById('filter-status').value;
    
    const filtered = AppState.records.filter(record => {
        // 1. 學生姓名搜尋
        if (searchName && !record.student_name.toLowerCase().includes(searchName)) {
            return false;
        }
        // 2. 年級篩選
        if (filterGrade && record.grade !== parseInt(filterGrade)) {
            return false;
        }
        // 3. 範疇篩選 (第一碼)
        if (filterDomain && record.node_code.charAt(0) !== filterDomain) {
            return false;
        }
        // 4. 正確狀態篩選
        if (filterStatus) {
            const isCorrectFilter = filterStatus === 'correct';
            if (record.is_correct !== isCorrectFilter) {
                return false;
            }
        }
        return true;
    });

    renderRecordsTable(filtered);
}

// 重設過濾器
function resetFilters() {
    document.getElementById('filter-search-name').value = '';
    document.getElementById('filter-grade').value = '';
    document.getElementById('filter-domain').value = '';
    document.getElementById('filter-status').value = '';
    renderRecordsTable();
}

// ==========================================
// 彈出式詳情抽屜 (Drawer)
// ==========================================
function openDetailsDrawer(id) {
    const record = AppState.records.find(r => r.id === id);
    if (!record) return;
    
    AppState.selectedRecord = record;
    
    const content = document.getElementById('drawer-body-content');
    content.innerHTML = '';

    // 計算步驟 HTML
    let stepsHTML = '';
    if (record.analysis_result.steps && record.analysis_result.steps.length > 0) {
        stepsHTML = record.analysis_result.steps.map(step => `
            <li class="step-item ${step.is_correct ? '' : 'has-error'}">
                <div style="font-weight:600;">步驟 ${step.step_number}： ${step.content}</div>
                ${step.is_correct ? '' : `<div style="font-size:12px; margin-top:4px;"><i class="fa-solid fa-angles-right"></i> ${step.error_explanation}</div>`}
            </li>
        `).join('');
    } else {
        stepsHTML = `<li class="step-item">無法擷取算式步驟。</li>`;
    }

    // 圖片呈現
    const imageHTML = record.image_base64 
        ? `<div class="form-group">
            <div class="result-section-title">學生手寫計算照片</div>
            <img src="${record.image_base64}" style="max-width:100%; max-height:280px; border-radius:8px; border: 1px solid var(--border-color); margin-top:8px;" alt="手寫計算過程">
           </div>`
        : '';

    // 狀態 Badge
    const badgeHTML = record.is_correct 
        ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> 完全正確</span>`
        : `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> 迷思概念 (${record.error_type})</span>`;

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h4 style="font-size:18px; font-weight:700;">學生：${record.student_name}</h4>
                <p class="upload-hint">年級：${getGradeChinese(record.grade)}年級 | 日期：${formatDate(record.created_at)}</p>
            </div>
            <div>${badgeHTML}</div>
        </div>

        <div class="form-group">
            <div class="result-section-title">數學題目</div>
            <p style="background-color: var(--bg-app); padding:12px; border-radius:8px; font-size:14px; font-weight:500;">${record.question}</p>
        </div>

        ${imageHTML}

        <div class="form-group">
            <div class="result-section-title">計算過程紀錄</div>
            <p style="font-family:monospace; background-color: var(--bg-app); padding:12px; border-radius:8px; font-size:13px; white-space:pre-wrap;">${record.calculation_text || '無文字紀錄'}</p>
        </div>

        <div class="form-group">
            <div class="result-section-title">對應 108 課綱指標</div>
            <div style="background-color: var(--bg-app); padding:12px; border-radius:8px; font-size:14px;">
                <strong style="color:var(--primary);">${record.node_code}</strong> - <strong>${record.node_title}</strong>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">${DataService.getNodeByCode(record.node_code)?.description || ''}</p>
            </div>
        </div>

        <div class="form-group">
            <div class="result-section-title">AI 運算診斷步驟</div>
            <ul class="step-list">${stepsHTML}</ul>
        </div>

        <div class="form-group">
            <div class="result-section-title">💡 補救教學與個別指導建議</div>
            <div class="remediation-box">
                <p style="font-size:14px; line-height:1.6;">${record.remediation}</p>
            </div>
        </div>
    `;

    toggleDrawer(true);
}

function toggleDrawer(isOpen) {
    const drawer = document.getElementById('drawer-overlay');
    if (isOpen) {
        drawer.classList.add('active');
    } else {
        drawer.classList.remove('active');
    }
}

function closeDrawer(e) {
    toggleDrawer(false);
}

// 刪除抽屜所選紀錄
async function deleteDrawerRecord() {
    if (!AppState.selectedRecord) return;
    
    if (confirm(`確定要刪除學生 ${AppState.selectedRecord.student_name} 的這筆診斷紀錄嗎？此動作無法復原。`)) {
        const res = await CloudDatabase.deleteRecord(AppState.selectedRecord.id);
        if (res.success) {
            showToast('診斷紀錄刪除成功！');
            toggleDrawer(false);
            await refreshRecords();
        } else {
            showToast(`刪除失敗: ${res.error}`, 'danger');
        }
    }
}

// ==========================================
// 系統設定管理 (Settings)
// ==========================================
function loadSettingsToForm() {
    document.getElementById('setting-groq-key').value = localStorage.getItem('MATH_MISCONCEPTION_GROQ_KEY') || '';
    
    let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';
    document.getElementById('setting-groq-model').value = model;
    
    document.getElementById('setting-ollama-model').value = localStorage.getItem('MATH_MISCONCEPTION_OLLAMA_MODEL') || 'qwen2.5:3b';
    
    const { url, key, teacherId } = CloudDatabase.getSettings();
    document.getElementById('setting-supabase-url').value = url;
    document.getElementById('setting-supabase-key').value = key;
    document.getElementById('setting-teacher-id').value = teacherId;
    
    toggleApiKeyRequired();
}

function toggleApiKeyRequired() {
    const model = document.getElementById('setting-groq-model').value;
    const keyInput = document.getElementById('setting-groq-key');
    const labelSpan = document.querySelector('label[for="setting-groq-key"] span');
    const ollamaGroup = document.getElementById('ollama-model-group');
    
    if (model === 'local-simulation' || model === 'local-ollama') {
        if (labelSpan) labelSpan.style.display = 'none';
        keyInput.removeAttribute('required');
    } else {
        if (typeof DEFAULT_GROQ_KEY !== 'undefined' && DEFAULT_GROQ_KEY !== '') {
            if (labelSpan) labelSpan.style.display = 'none';
            keyInput.removeAttribute('required');
            keyInput.placeholder = '已載入系統預設金鑰 (可在此輸入以覆蓋)';
        } else {
            if (labelSpan) labelSpan.style.display = 'inline';
            keyInput.setAttribute('required', 'required');
            keyInput.placeholder = '輸入以 Groq Console 獲取的 API_KEY';
        }
    }
    
    if (model === 'local-ollama') {
        ollamaGroup.style.display = 'block';
    } else {
        ollamaGroup.style.display = 'none';
    }
}

// Export to window for inline handlers in HTML
window.toggleApiKeyRequired = toggleApiKeyRequired;
window.saveQuickApiKey = saveQuickApiKey;
window.switchToLocalEngine = switchToLocalEngine;
window.checkApiKeySetup = checkApiKeySetup;

// 檢查並顯示 API Key 警告 Banner
function checkApiKeySetup() {
    let model = localStorage.getItem('MATH_MISCONCEPTION_GROQ_MODEL') || 'llama-3.3-70b-versatile';
    if (model === 'llama3-70b-8192' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-pro') model = 'llama-3.3-70b-versatile';
    if (model === 'llama3-8b-8192') model = 'llama-3.1-8b-instant';
    const key = localStorage.getItem('MATH_MISCONCEPTION_GROQ_KEY') || (typeof DEFAULT_GROQ_KEY !== 'undefined' ? DEFAULT_GROQ_KEY : '');
    const banner = document.getElementById('api-warning-banner');
    
    if (!banner) return;
    
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
    loadSettingsToForm(); // 同步更新設定頁面
    showToast('Groq API Key 設定成功！');
}

// 切換至免金鑰本地引擎
function switchToLocalEngine(engineType) {
    localStorage.setItem('MATH_MISCONCEPTION_GROQ_MODEL', engineType);
    checkApiKeySetup();
    loadSettingsToForm(); // 同步更新設定頁面
    showToast(`已成功切換至【${engineType === 'local-simulation' ? '本地模擬 AI 引擎' : '本地 Ollama'}】！`);
}

function saveGroqSettings() {
    const key = document.getElementById('setting-groq-key').value.trim();
    const model = document.getElementById('setting-groq-model').value;
    const ollamaModel = document.getElementById('setting-ollama-model').value.trim();
    
    localStorage.setItem('MATH_MISCONCEPTION_GROQ_KEY', key);
    localStorage.setItem('MATH_MISCONCEPTION_GROQ_MODEL', model);
    localStorage.setItem('MATH_MISCONCEPTION_OLLAMA_MODEL', ollamaModel);
    
    checkApiKeySetup();
    showToast('設定已成功儲存！');
}

function saveSupabaseSettings() {
    const url = document.getElementById('setting-supabase-url').value.trim();
    const key = document.getElementById('setting-supabase-key').value.trim();
    const teacherId = document.getElementById('setting-teacher-id').value.trim();
    
    CloudDatabase.saveSettings(url, key, teacherId);
    showToast('Supabase 連線設定已儲存！將重新整理連接狀態...');
    updateCloudStatus();
}

async function testSupabaseConnection() {
    showToast('正在測試 Supabase 連線，請稍候...', 'info');
    const isConnected = await CloudDatabase.checkConnection();
    if (isConnected) {
        showToast('🎉 連線測試成功！已成功與您的 Supabase Cloud 對接。');
    } else {
        showToast('❌ 連線失敗！請檢查您的 URL 與 Anon Key 是否正確，或是 RLS 權限未開放。', 'danger');
    }
    updateCloudStatus();
}

async function syncOfflineRecords() {
    showToast('正在與雲端同步本地離線資料...', 'info');
    const res = await CloudDatabase.syncOfflineRecords();
    if (res.success) {
        showToast(`✅ 同步完成！共上傳了 ${res.count} 筆離線診斷紀錄。`);
        await refreshRecords();
    } else {
        showToast(`❌ 同步失敗: ${res.error || res.message}`, 'danger');
    }
}

async function syncDataFromServer() {
    showToast('正在同步雲端最新數據...', 'info');
    await refreshRecords();
    showToast('✅ 數據同步整理完畢！');
}

// 危險清除所有資料
async function dangerClearAllRecords() {
    if (confirm('⚠️ 警告：這將會刪除此教師帳號在雲端資料庫以及您這台電腦的所有診斷歷史數據！此動作絕對無法復原。是否仍要清除？')) {
        if (confirm('請進行最後確認：是否確定清空？')) {
            const res = await CloudDatabase.clearAllRecords();
            if (res.success) {
                showToast('已成功清空所有診斷紀錄！');
                await refreshRecords();
            } else {
                showToast(`清除失敗: ${res.error}`, 'danger');
            }
        }
    }
}

// ==========================================
// 資料庫備份 匯出 / 匯入 (JSON)
// ==========================================
function exportDatabaseAsJSON() {
    const records = CloudDatabase.getLocalBackup();
    if (records.length === 0) {
        showToast('資料庫目前為空，無資料可匯出！', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    a.href = url;
    a.download = `math_misconceptions_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('資料庫 JSON 備份檔匯出成功！');
}

function triggerJSONImport() {
    document.getElementById('import-json-file').click();
}

function importDatabaseFromJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) {
                throw new Error('JSON 格式錯誤！備份檔案必須是陣列。');
            }
            
            // 輕量結構檢驗
            const isValid = imported.every(item => item.student_name && item.grade && item.node_code && item.id);
            if (!isValid) {
                throw new Error('資料格式不符合系統要求，缺少必要欄位！');
            }
            
            // 寫入本地備份
            let currentLocal = CloudDatabase.getLocalBackup();
            let importCount = 0;
            
            imported.forEach(imp => {
                // 避免 ID 衝突
                const idx = currentLocal.findIndex(c => c.id === imp.id);
                if (idx >= 0) {
                    currentLocal[idx] = imp; // 覆寫
                } else {
                    currentLocal.unshift(imp); // 新增
                    importCount++;
                }
            });
            
            localStorage.setItem('MATH_MISCONCEPTION_RECORDS_BACKUP', JSON.stringify(currentLocal));
            showToast(`成功匯入 ${imported.length} 筆資料 (其中 ${importCount} 筆為全新紀錄)！`);
            
            // 觸發雲端同步
            await syncOfflineRecords();
            await refreshRecords();
            
            document.getElementById('import-json-file').value = '';
        } catch (err) {
            showToast(`匯入失敗: ${err.message}`, 'danger');
            document.getElementById('import-json-file').value = '';
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 診斷報告列印控制 (Print Reports)
// ==========================================
function preparePrintContent(record) {
    if (!record) return;
    
    document.getElementById('print-meta-info').textContent = `學生：${record.student_name} | 年級：${getGradeChinese(record.grade)}年級 | 日期：${formatDate(record.created_at)}`;
    document.getElementById('print-question-text').textContent = record.question;
    
    // 圖片
    const imgSection = document.getElementById('print-image-section');
    const calcImg = document.getElementById('print-calc-img');
    if (record.image_base64) {
        calcImg.src = record.image_base64;
        imgSection.style.display = 'block';
    } else {
        imgSection.style.display = 'none';
    }

    document.getElementById('print-calc-text').textContent = record.calculation_text || '無計算過程文字紀錄';
    
    document.getElementById('print-node-code').textContent = record.node_code;
    document.getElementById('print-node-title').textContent = record.node_title;
    document.getElementById('print-node-desc').textContent = DataService.getNodeByCode(record.node_code)?.description || '';

    const errorName = document.getElementById('print-error-name');
    const errorDesc = document.getElementById('print-error-desc');
    if (record.is_correct) {
        errorName.textContent = '無明顯學習偏誤';
        errorName.style.color = 'green';
        errorDesc.textContent = '該生此題步驟完全正確。';
    } else {
        errorName.textContent = record.error_type || '其他錯誤';
        errorName.style.color = 'red';
        errorDesc.textContent = record.analysis_result.error_description || '學生對該單元的概念理解存在偏差。';
    }

    // 步驟
    const stepsList = document.getElementById('print-steps-list');
    stepsList.innerHTML = '';
    if (record.analysis_result.steps && record.analysis_result.steps.length > 0) {
        record.analysis_result.steps.forEach(step => {
            const li = document.createElement('li');
            li.className = `step-item ${step.is_correct ? '' : 'has-error'}`;
            li.style.borderLeft = '3px solid ' + (step.is_correct ? '#ccc' : 'red');
            li.style.backgroundColor = '#f9f9f9';
            li.style.margin = '5px 0';
            li.style.padding = '8px';
            li.style.listStyleType = 'none';
            
            li.innerHTML = `
                <div style="font-weight:bold;">步驟 ${step.step_number}： ${step.content}</div>
                ${step.is_correct ? '' : `<div style="font-size:12px; margin-top:2px; color: red;">↳ ${step.error_explanation}</div>`}
            `;
            stepsList.appendChild(li);
        });
    }

    document.getElementById('print-remediation-text').textContent = record.remediation;
}

function printCurrentReport() {
    if (!AppState.selectedRecord) {
        showToast('無法列印：無選取的診斷紀錄！', 'warning');
        return;
    }
    preparePrintContent(AppState.selectedRecord);
    window.print();
}

function printDrawerReport() {
    if (!AppState.selectedRecord) return;
    toggleDrawer(false);
    setTimeout(() => {
        printCurrentReport();
    }, 300);
}

// ==========================================
// 格式化輔助函式 (Helpers)
// ==========================================
function getGradeChinese(grade) {
    const mapping = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' };
    return mapping[parseInt(grade)] || grade;
}

function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}/${m}/${d} ${h}:${min}`;
    } catch (e) {
        return isoString;
    }
}

// 亂數產生 UUID 
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
