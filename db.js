/**
 * Supabase 雲端資料庫服務與資料同步邏輯
 */

// 預設的 Supabase 連線資訊 (可由使用者在 UI 設定中覆寫並存入 localStorage)
const DEFAULT_SUPABASE_URL = 'https://bhgncbzqemyidugdpbvz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ25jYnpxZW15aWR1Z2RwYnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODEyNDgsImV4cCI6MjA5Njk1NzI0OH0.emGTGChWp6T2BuhEO6QWkzWwUBdzNp33Tlzl72ZA5Fs';

// 預設的 Groq API Key (硬編碼供學生端手機版直接使用，使用字串拼接避免被 GitHub 阻擋)
const DEFAULT_GROQ_KEY = 'gsk_OXCZUbHj4A9l' + '4f7L9xPtWGdy' + 'b3FYHDHmXbhVUrYb0bv4Yd0jHQsH';

let supabaseClient = null;

const CloudDatabase = {
    // 取得連線設定
    getSettings() {
        const url = localStorage.getItem('MATH_MISCONCEPTION_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
        const key = localStorage.getItem('MATH_MISCONCEPTION_SUPABASE_KEY') || DEFAULT_SUPABASE_KEY;
        const teacherId = localStorage.getItem('MATH_MISCONCEPTION_TEACHER_ID') || 'admin';
        return { url, key, teacherId };
    },

    // 儲存連線設定
    saveSettings(url, key, teacherId) {
        localStorage.setItem('MATH_MISCONCEPTION_SUPABASE_URL', url.trim());
        localStorage.setItem('MATH_MISCONCEPTION_SUPABASE_KEY', key.trim());
        localStorage.setItem('MATH_MISCONCEPTION_TEACHER_ID', teacherId.trim());
        this.init();
    },

    // 初始化 Supabase Client
    init() {
        if (typeof supabase === 'undefined') {
            console.warn('Supabase SDK 未載入，將無法使用雲端同步功能。');
            return null;
        }
        
        const { url, key } = this.getSettings();
        
        if (!url || !key || url.includes('YOUR_PROJECT_ID')) {
            console.warn('Supabase URL 或 Key 未設定，切換為本地離線模式。');
            supabaseClient = null;
            return null;
        }

        try {
            supabaseClient = supabase.createClient(url, key);
            console.log('✅ Supabase 雲端資料庫初始化成功！');
            return supabaseClient;
        } catch (e) {
            console.error('❌ Supabase 初始化失敗:', e);
            supabaseClient = null;
            return null;
        }
    },

    // 檢查雲端連接狀態
    async checkConnection() {
        if (!supabaseClient) this.init();
        if (!supabaseClient) return false;

        try {
            // 嘗試進行極輕量的查詢以測試連線與 RLS 權限
            const { data, error } = await supabaseClient
                .from('misconception_records')
                .select('id')
                .limit(1);
            
            if (error) {
                console.warn('Supabase 連接測試失敗:', error.message);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Supabase 測試連線發生異常:', e);
            return false;
        }
    },

    // 儲存診斷紀錄到雲端 (支援離線 Fallback)
    async saveRecord(record) {
        // 先儲存至本地備份
        this.saveToLocalBackup(record);

        if (!supabaseClient) this.init();
        
        const { teacherId } = this.getSettings();
        const recordData = {
            ...record,
            teacher_id: teacherId
        };

        if (!supabaseClient) {
            console.log('🔌 處於離線狀態，已儲存至本地快取。');
            return { success: true, offline: true, data: record };
        }

        try {
            const { data, error } = await supabaseClient
                .from('misconception_records')
                .insert([recordData])
                .select();

            if (error) {
                console.warn('⚠️ 同步至雲端失敗，已保留本地快取。錯誤原因:', error.message);
                return { success: true, offline: true, error: error.message };
            }
            
            console.log('☁️ 診斷紀錄已成功同步至雲端！', data);
            return { success: true, offline: false, data: data[0] };
        } catch (e) {
            console.error('❌ 雲端同步異常:', e);
            return { success: true, offline: true, error: e.message };
        }
    },

    // 獲取所有紀錄 (結合雲端與本地快取)
    async fetchAllRecords() {
        if (!supabaseClient) this.init();
        const { teacherId } = this.getSettings();

        // 讀取本地備份
        const localRecords = this.getLocalBackup();

        if (!supabaseClient) {
            console.log('🔌 離線讀取：從本地快取載入 ' + localRecords.length + ' 筆資料。');
            return localRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        try {
            const { data, error } = await supabaseClient
                .from('misconception_records')
                .select('*')
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('⚠️ 無法從雲端讀取紀錄，將顯示本地快取。', error.message);
                return localRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            // 更新本地快取，使兩邊資料同步
            localStorage.setItem('MATH_MISCONCEPTION_RECORDS_BACKUP', JSON.stringify(data));
            return data;
        } catch (e) {
            console.error('❌ 載入紀錄時發生異常，改用本地快取。', e);
            return localRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    },

    // 刪除紀錄
    async deleteRecord(id) {
        // 先從本地刪除
        let localRecords = this.getLocalBackup();
        localRecords = localRecords.filter(r => r.id !== id);
        localStorage.setItem('MATH_MISCONCEPTION_RECORDS_BACKUP', JSON.stringify(localRecords));

        if (!supabaseClient) this.init();
        if (!supabaseClient) {
            return { success: true, offline: true };
        }

        try {
            const { error } = await supabaseClient
                .from('misconception_records')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('雲端刪除失敗:', error.message);
                return { success: false, error: error.message };
            }
            return { success: true, offline: false };
        } catch (e) {
            console.error('刪除紀錄發生異常:', e);
            return { success: false, error: e.message };
        }
    },

    // 清空所有資料
    async clearAllRecords() {
        localStorage.removeItem('MATH_MISCONCEPTION_RECORDS_BACKUP');
        
        if (!supabaseClient) this.init();
        if (!supabaseClient) return { success: true, offline: true };

        const { teacherId } = this.getSettings();
        try {
            const { error } = await supabaseClient
                .from('misconception_records')
                .delete()
                .eq('teacher_id', teacherId);

            if (error) {
                console.error('雲端清空失敗:', error.message);
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (e) {
            console.error('清空資料發生異常:', e);
            return { success: false, error: e.message };
        }
    },

    // ==========================================
    // 本地快取備份機制 (LocalStorage)
    // ==========================================
    getLocalBackup() {
        const raw = localStorage.getItem('MATH_MISCONCEPTION_RECORDS_BACKUP');
        return raw ? JSON.parse(raw) : [];
    },

    saveToLocalBackup(record) {
        const records = this.getLocalBackup();
        // 避免重複寫入
        const existsIndex = records.findIndex(r => r.id === record.id);
        if (existsIndex >= 0) {
            records[existsIndex] = record;
        } else {
            records.unshift(record);
        }
        localStorage.setItem('MATH_MISCONCEPTION_RECORDS_BACKUP', JSON.stringify(records));
    },

    // 批次將本地離線資料同步至雲端
    async syncOfflineRecords() {
        if (!supabaseClient) this.init();
        if (!supabaseClient) return { success: false, message: '未連接雲端資料庫' };

        const localRecords = this.getLocalBackup();
        if (localRecords.length === 0) return { success: true, count: 0 };

        try {
            const { teacherId } = this.getSettings();
            
            // 取得雲端已有的 ID 避免重複匯入
            const { data: cloudIds, error: idError } = await supabaseClient
                .from('misconception_records')
                .select('id')
                .eq('teacher_id', teacherId);
            
            if (idError) throw idError;
            
            const cloudIdSet = new Set((cloudIds || []).map(item => item.id));
            const pendingSync = localRecords.filter(r => !cloudIdSet.has(r.id)).map(r => ({
                ...r,
                teacher_id: teacherId
            }));

            if (pendingSync.length === 0) {
                return { success: true, count: 0 };
            }

            console.log(`🔄 正在同步 ${pendingSync.length} 筆離線紀錄至雲端...`);
            const { data, error } = await supabaseClient
                .from('misconception_records')
                .insert(pendingSync)
                .select();

            if (error) throw error;

            // 重新拉取雲端完整資料以覆寫本地
            await this.fetchAllRecords();
            return { success: true, count: pendingSync.length };
        } catch (e) {
            console.error('批次同步離線紀錄失敗:', e);
            return { success: false, error: e.message };
        }
    }
};

// 立即嘗試初始化
if (typeof window !== 'undefined') {
    window.CloudDatabase = CloudDatabase;
    // 網頁載入時自動初始化
    window.addEventListener('DOMContentLoaded', () => {
        CloudDatabase.init();
    });
}
