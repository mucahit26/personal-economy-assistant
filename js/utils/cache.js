// ========================================
// CACHE — localStorage tabanlı önbellekleme
// ========================================
const Cache = {
    DEFAULT_TTL: 15 * 60 * 1000, // 15 dakika

    /**
     * Önbelleğe kaydet
     */
    set(key, data, ttlMs = this.DEFAULT_TTL) {
        const item = {
            data: data,
            expiry: Date.now() + ttlMs,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(`fk_cache_${key}`, JSON.stringify(item));
        } catch (e) {
            console.warn('Cache write failed, clearing old entries:', e);
            this.clearOldest();
            try {
                localStorage.setItem(`fk_cache_${key}`, JSON.stringify(item));
            } catch (e2) {
                console.error('Cache write failed after cleanup:', e2);
            }
        }
    },

    /**
     * Önbellekten oku
     */
    get(key) {
        try {
            const raw = localStorage.getItem(`fk_cache_${key}`);
            if (!raw) return null;
            const item = JSON.parse(raw);
            if (Date.now() > item.expiry) {
                localStorage.removeItem(`fk_cache_${key}`);
                return null;
            }
            return item.data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Belirli key sil
     */
    remove(key) {
        localStorage.removeItem(`fk_cache_${key}`);
    },

    /**
     * Tüm önbelleği temizle
     */
    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('fk_cache_'));
        keys.forEach(k => localStorage.removeItem(k));
        return keys.length;
    },

    /**
     * En eski girişleri temizle
     */
    clearOldest() {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('fk_cache_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    entries.push({ key, timestamp: item.timestamp || 0 });
                } catch (e) {
                    entries.push({ key, timestamp: 0 });
                }
            }
        }
        entries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = Math.max(Math.floor(entries.length / 2), 1);
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            localStorage.removeItem(entries[i].key);
        }
    },

    /**
     * Önbellek boyutu
     */
    getSize() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('fk_cache_')) {
                total += localStorage.getItem(key).length;
            }
        }
        if (total >= 1024 * 1024) return (total / (1024 * 1024)).toFixed(1) + ' MB';
        if (total >= 1024) return (total / 1024).toFixed(1) + ' KB';
        return total + ' B';
    }
};
