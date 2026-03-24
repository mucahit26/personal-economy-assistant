// ========================================
// EARNINGS API — Bilanço takvimi (Finnhub)
// ========================================
const EarningsAPI = {
    BASE_URL: '/api/finnhub',

    /**
     * Haftalık bilanço takvimi çek
     */
    async fetchEarningsCalendar(fromDate, toDate) {
        const apiKey = Storage.getApiKey('finnhub');
        const cacheKey = `earnings_${fromDate}_${toDate}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        // API key yoksa demo veri dön
        if (!apiKey) {
            return this._getDemoData(fromDate, toDate);
        }

        try {
            const url = `${this.BASE_URL}/calendar/earnings?from=${fromDate}&to=${toDate}&token=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const earnings = (data.earningsCalendar || []).map(e => ({
                symbol: e.symbol,
                date: e.date,
                hour: e.hour, // bmo (before market open), amc (after market close)
                epsEstimate: e.epsEstimate,
                epsActual: e.epsActual,
                revenueEstimate: e.revenueEstimate,
                revenueActual: e.revenueActual,
                quarter: e.quarter,
                year: e.year,
                surprise: e.epsActual && e.epsEstimate ?
                    ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate) * 100) : null,
                beat: e.epsActual && e.epsEstimate ? e.epsActual > e.epsEstimate : null
            }));

            Cache.set(cacheKey, earnings, 60 * 60 * 1000); // 1 saat cache
            return earnings;
        } catch (error) {
            console.error('Earnings API error:', error);
            return this._getDemoData(fromDate, toDate);
        }
    },

    /**
     * Bu hafta ve gelecek hafta
     */
    async fetchCurrentWeek(weekOffset = 0) {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - now.getDay() + 1 + (weekOffset * 7));

        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        const fromDate = this._formatDate(monday);
        const toDate = this._formatDate(friday);

        const earnings = await this.fetchEarningsCalendar(fromDate, toDate);

        // Günlere göre grupla
        const byDay = { mon: [], tue: [], wed: [], thu: [], fri: [] };
        const dayMap = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };

        earnings.forEach(e => {
            const d = new Date(e.date);
            const dayKey = dayMap[d.getDay()];
            if (dayKey) {
                byDay[dayKey].push(e);
            }
        });

        return {
            earnings: byDay,
            weekLabel: `${this._formatDateTR(monday)} - ${this._formatDateTR(friday)}`,
            from: fromDate,
            to: toDate
        };
    },

    _formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    _formatDateTR(date) {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    },

    /**
     * API key yokken demo veri
     */
    _getDemoData(from, to) {
        const demoCompanies = [
            { symbol: 'AAPL', name: 'Apple Inc.' },
            { symbol: 'MSFT', name: 'Microsoft' },
            { symbol: 'GOOGL', name: 'Alphabet' },
            { symbol: 'AMZN', name: 'Amazon' },
            { symbol: 'NVDA', name: 'NVIDIA' },
            { symbol: 'META', name: 'Meta' },
            { symbol: 'TSLA', name: 'Tesla' },
            { symbol: 'JPM', name: 'JPMorgan' },
            { symbol: 'V', name: 'Visa' },
            { symbol: 'JNJ', name: 'Johnson & Johnson' },
            { symbol: 'WMT', name: 'Walmart' },
            { symbol: 'MA', name: 'Mastercard' },
            { symbol: 'PG', name: 'Procter & Gamble' },
            { symbol: 'HD', name: 'Home Depot' },
            { symbol: 'BAC', name: 'Bank of America' }
        ];

        const startDate = new Date(from);
        const result = [];

        for (let i = 0; i < 5; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const count = 2 + Math.floor(Math.random() * 3);
            for (let j = 0; j < count; j++) {
                const company = demoCompanies[Math.floor(Math.random() * demoCompanies.length)];
                const eps = (Math.random() * 5 + 0.5).toFixed(2);
                const surprise = (Math.random() * 20 - 5).toFixed(1);
                result.push({
                    symbol: company.symbol,
                    date: this._formatDate(date),
                    hour: Math.random() > 0.5 ? 'bmo' : 'amc',
                    epsEstimate: parseFloat(eps),
                    epsActual: parseFloat(eps) * (1 + parseFloat(surprise) / 100),
                    revenueEstimate: null,
                    revenueActual: null,
                    quarter: Math.ceil((date.getMonth() + 1) / 3),
                    year: date.getFullYear(),
                    surprise: parseFloat(surprise),
                    beat: parseFloat(surprise) > 0
                });
            }
        }
        return result;
    }
};
