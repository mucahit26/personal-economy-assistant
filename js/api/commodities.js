// ========================================
// COMMODITIES API — Emtia verileri 
// Yahoo Finance proxy ile çalışır
// ========================================
const CommoditiesAPI = {
    SYMBOLS: [
        { symbol: 'GC=F', name: 'Altın (oz)', id: 'gold', icon: '🥇' },
        { symbol: 'BZ=F', name: 'Brent Petrol', id: 'oil', icon: '🛢️' },
        { symbol: 'SI=F', name: 'Gümüş', id: 'silver', icon: '🥈' },
        { symbol: 'CL=F', name: 'WTI Petrol', id: 'wti', icon: '🛢️' },
        { symbol: 'HG=F', name: 'Bakır', id: 'copper', icon: '🟤' },
        { symbol: 'NG=F', name: 'Doğal Gaz', id: 'natgas', icon: '🔥' }
    ],

    /**
     * Tüm emtia verilerini çek
     */
    async fetchAll() {
        const cacheKey = 'commodities_all';
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        const promises = this.SYMBOLS.map(s =>
            MarketsAPI.fetchQuote(s.symbol, '1mo', '1d')
        );
        const results = await Promise.allSettled(promises);

        const commodities = {};
        results.forEach((r, i) => {
            const sym = this.SYMBOLS[i];
            if (r.status === 'fulfilled' && r.value) {
                commodities[sym.id] = {
                    ...r.value,
                    displayName: sym.name,
                    icon: sym.icon
                };
            }
        });

        Cache.set(cacheKey, commodities, 10 * 60 * 1000);
        return commodities;
    },

    /**
     * Altın ve Petrol (dashboard için)
     */
    async fetchMainCommodities() {
        const all = await this.fetchAll();
        return {
            gold: all.gold || null,
            oil: all.oil || null
        };
    }
};
