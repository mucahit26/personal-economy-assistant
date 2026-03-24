// ========================================
// STORAGE — Kalıcı ayarlar yönetimi
// ========================================
const Storage = {
    PREFIX: 'fk_',

    /**
     * API anahtarlarını kaydet
     */
    saveApiKeys(keys) {
        localStorage.setItem(this.PREFIX + 'api_keys', JSON.stringify(keys));
    },

    /**
     * API anahtarlarını oku
     */
    getApiKeys() {
        try {
            return JSON.parse(localStorage.getItem(this.PREFIX + 'api_keys')) || {};
        } catch (e) {
            return {};
        }
    },

    /**
     * Belirli API key
     */
    getApiKey(name) {
        const keys = this.getApiKeys();
        return keys[name] || '';
    },

    /**
     * Tercihleri kaydet
     */
    savePreferences(prefs) {
        localStorage.setItem(this.PREFIX + 'preferences', JSON.stringify(prefs));
    },

    /**
     * Tercihleri oku
     */
    getPreferences() {
        try {
            return JSON.parse(localStorage.getItem(this.PREFIX + 'preferences')) || {
                showCrypto: true,
                showCommodities: true,
                autoRefresh: true
            };
        } catch (e) {
            return { showCrypto: true, showCommodities: true, autoRefresh: true };
        }
    },

    /**
     * Watchlist kaydet
     */
    saveWatchlist(list) {
        localStorage.setItem(this.PREFIX + 'watchlist', JSON.stringify(list));
    },

    /**
     * Watchlist oku
     */
    getWatchlist() {
        try {
            return JSON.parse(localStorage.getItem(this.PREFIX + 'watchlist')) || [];
        } catch (e) {
            return [];
        }
    }
};
