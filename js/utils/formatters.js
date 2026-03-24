// ========================================
// FORMATTERS — Tarih, Para, Yüzde formatlama
// ========================================
const Formatters = {
    /**
     * Para formatla (USD)
     */
    currency(value, currency = 'USD', decimals = 2) {
        if (value == null || isNaN(value)) return '--';
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        return formatter.format(value);
    },

    /**
     * TRY formatla
     */
    tryFormat(value, decimals = 2) {
        if (value == null || isNaN(value)) return '--';
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    },

    /**
     * Kısa sayı formatı (1.2K, 3.5M, 1.2B)
     */
    shortNumber(value) {
        if (value == null || isNaN(value)) return '--';
        const abs = Math.abs(value);
        if (abs >= 1e12) return (value / 1e12).toFixed(1) + 'T';
        if (abs >= 1e9) return (value / 1e9).toFixed(1) + 'B';
        if (abs >= 1e6) return (value / 1e6).toFixed(1) + 'M';
        if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K';
        return value.toFixed(2);
    },

    /**
     * Yüzde formatla
     */
    percent(value, decimals = 2) {
        if (value == null || isNaN(value)) return '--';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(decimals)}%`;
    },

    /**
     * Tarih formatla
     */
    date(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    /**
     * Saat formatla
     */
    time(dateStr) {
        const d = dateStr ? new Date(dateStr) : new Date();
        return d.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Tarih-saat
     */
    dateTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Bugünün uzun tarih formatı
     */
    todayLong() {
        return new Date().toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    /**
     * Sayı formatla (binlik ayırıcı)
     */
    number(value, decimals = 2) {
        if (value == null || isNaN(value)) return '--';
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    },

    /**
     * Küçük fiyat formatı (kripto için)
     */
    price(value) {
        if (value == null || isNaN(value)) return '--';
        if (value >= 1000) return '$' + this.number(value, 0);
        if (value >= 1) return '$' + this.number(value, 2);
        if (value >= 0.01) return '$' + this.number(value, 4);
        return '$' + this.number(value, 6);
    }
};
