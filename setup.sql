-- ===================================================
-- 臺灣 108 課綱國小數學迷思概念資料庫 - Supabase 初始化 SQL
-- ===================================================
-- 請在您的 Supabase 專案中的 SQL Editor 中貼上本段 SQL 並執行。

-- 1. 建立迷思概念紀錄資料表
CREATE TABLE IF NOT EXISTS misconception_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 6),
    node_code TEXT NOT NULL,
    node_title TEXT NOT NULL,
    question TEXT NOT NULL,
    calculation_text TEXT,
    image_base64 TEXT, -- 儲存學生計算過程圖片 (Base64)
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    error_type TEXT, -- 迷思概念樣態分類
    analysis_result JSONB NOT NULL, -- 包含 AI 診斷的完整 JSON 資料 (步驟、正確答案等)
    remediation TEXT NOT NULL, -- 補救教學建議
    teacher_id TEXT DEFAULT 'admin', -- 教師識別代碼
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立索引以提升教師後台分析與查詢效能
CREATE INDEX IF NOT EXISTS idx_misconception_records_student ON misconception_records(student_name);
CREATE INDEX IF NOT EXISTS idx_misconception_records_grade ON misconception_records(grade);
CREATE INDEX IF NOT EXISTS idx_misconception_records_node ON misconception_records(node_code);
CREATE INDEX IF NOT EXISTS idx_misconception_records_error ON misconception_records(error_type);
CREATE INDEX IF NOT EXISTS idx_misconception_records_teacher ON misconception_records(teacher_id);

-- 3. 啟用安全機制 (Row Level Security, RLS)
ALTER TABLE misconception_records ENABLE ROW LEVEL SECURITY;

-- 4. 建立公開的 RLS 存取原則 (便於 Demo 與測試)
CREATE POLICY "Public Read Access" 
ON misconception_records FOR SELECT 
USING (true);

CREATE POLICY "Public Insert Access" 
ON misconception_records FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public Update Access" 
ON misconception_records FOR UPDATE 
USING (true);

CREATE POLICY "Public Delete Access" 
ON misconception_records FOR DELETE 
USING (true);

-- 5. 輸出確認訊息
SELECT '✅ misconception_records 資料表與權限已成功初始化！' as status;
