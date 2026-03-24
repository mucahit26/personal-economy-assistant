// ========================================
// FOREX API — Döviz kurları
// ========================================
const ForexAPI = {
    BASE_URL: '/api/forex/latest',

    PAIRS: ['USD', 'EUR', 'GBP'],

    /**
     * Döviz kurlarını çek (TRY baz)
     */
    async fetchRates() {
        const cacheKey = 'forex_rates';
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.BASE_URL}/TRY`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const rates = {
                usdtry: data.rates.USD ? (1 / data.rates.USD) : null,
                eurtry: data.rates.EUR ? (1 / data.rates.EUR) : null,
                gbptry: data.rates.GBP ? (1 / data.rates.GBP) : null,
                eurusd: null,
                timestamp: data.time_last_updated * 1000
            };

            // EUR/USD hesapla
            if (rates.eurtry && rates.usdtry) {
                rates.eurusd = rates.eurtry / rates.usdtry;
            }

            // Önceki değerleri karşılaştır  
            const prev = Cache.get('forex_rates_prev');
            if (prev) {
                rates.usdtry_change = rates.usdtry && prev.usdtry ?
                    ((rates.usdtry - prev.usdtry) / prev.usdtry * 100) : 0;
                rates.eurtry_change = rates.eurtry && prev.eurtry ?
                    ((rates.eurtry - prev.eurtry) / prev.eurtry * 100) : 0;
                rates.gbptry_change = rates.gbptry && prev.gbptry ?
                    ((rates.gbptry - prev.gbptry) / prev.gbptry * 100) : 0;
                rates.eurusd_change = rates.eurusd && prev.eurusd ?
                    ((rates.eurusd - prev.eurusd) / prev.eurusd * 100) : 0;
            } else {
                rates.usdtry_change = 0;
                rates.eurtry_change = 0;
                rates.gbptry_change = 0;
                rates.eurusd_change = 0;
            }

            // Mevcut değerleri "önceki" olarak sakla
            Cache.set('forex_rates_prev', {
                usdtry: rates.usdtry,
                eurtry: rates.eurtry,
                gbptry: rates.gbptry,
                eurusd: rates.eurusd
            }, 24 * 60 * 60 * 1000); // 24 saat

            Cache.set(cacheKey, rates, 30 * 60 * 1000); // 30 dk cache
            return rates;
        } catch (error) {
            console.error('Forex API error:', error);
            return {
                usdtry: 36.42, eurtry: 38.15, gbptry: 45.80, eurusd: 1.048,
                usdtry_change: 0.12, eurtry_change: -0.08, gbptry_change: 0.25, eurusd_change: -0.15,
                timestamp: Date.now(), _isDemo: true
            };
        }
    }
};
