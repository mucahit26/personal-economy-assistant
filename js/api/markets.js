// ========================================
// MARKETS API — ABD & BIST Borsa Verileri
// Finnhub PRIMARY + Yahoo Finance FALLBACK
// ========================================
const MarketsAPI = {
    // Yerel proxy üzerinden API erişimi (CORS sorunu yok)
    FINNHUB_BASE: '/api/finnhub',
    YAHOO_BASE: '/api/yahoo/chart/',

    // Takip edilen semboller
    SYMBOLS: {
        us: [
            { symbol: '^GSPC', name: 'S&P 500', id: 'sp500', finnhubSymbol: 'SPY', multiplier: 10 },
            { symbol: '^IXIC', name: 'NASDAQ', id: 'nasdaq', finnhubSymbol: 'QQQ', multiplier: 40.9 },
            { symbol: '^DJI', name: 'Dow Jones', id: 'dowjones', finnhubSymbol: 'DIA', multiplier: 100 }
        ],
        tr: [
            { symbol: 'XU100.IS', name: 'BIST 100', id: 'xu100' }
        ],
        tr_stocks: [
            'THYAO.IS', 'GARAN.IS', 'AKBNK.IS', 'EREGL.IS', 'SISE.IS',
            'KCHOL.IS', 'ASELS.IS', 'BIMAS.IS', 'TUPRS.IS', 'SAHOL.IS'
        ],
        us_stocks: [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
            'META', 'TSLA', 'JPM', 'V', 'JNJ'
        ],
        commodities: {
            'GC=F': { name: 'Altın', finnhubForex: 'OANDA:XAU_USD' },
            'SI=F': { name: 'Gümüş', finnhubForex: 'OANDA:XAG_USD' },
            'BZ=F': { name: 'Brent Petrol' },
            'CL=F': { name: 'WTI Petrol' },
            'HG=F': { name: 'Bakır' },
            'NG=F': { name: 'Doğal Gaz' }
        }
    },

    /**
     * Finnhub API key al
     */
    _getFinnhubKey() {
        return Storage.getApiKey('finnhub') || '';
    },

    /**
     * Fetch with timeout
     */
    async _fetchWithTimeout(url, timeoutMs = 8000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            return response;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    },

    /**
     * Finnhub'dan quote çek
     */
    async _finnhubQuote(symbol) {
        const key = this._getFinnhubKey();
        if (!key) return null;

        try {
            const url = `${this.FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
            const response = await this._fetchWithTimeout(url, 6000);
            if (!response.ok) return null;
            const data = await response.json();

            // Finnhub döner: { c: price, d: change, dp: changePercent, h, l, o, pc }
            if (!data || data.c === 0) return null;
            return data;
        } catch (e) {
            console.warn(`Finnhub quote failed for ${symbol}:`, e.message);
            return null;
        }
    },

    /**
     * Finnhub'dan candle verisi çek (grafik)
     */
    async _finnhubCandles(symbol, resolution = 'D', fromDaysAgo = 30) {
        const key = this._getFinnhubKey();
        if (!key) return null;

        try {
            const to = Math.floor(Date.now() / 1000);
            const from = to - (fromDaysAgo * 86400);
            const url = `${this.FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`;
            const response = await this._fetchWithTimeout(url, 6000);
            if (!response.ok) return null;
            const data = await response.json();

            if (data.s !== 'ok' || !data.c) return null;
            return data;
        } catch (e) {
            console.warn(`Finnhub candles failed for ${symbol}:`, e.message);
            return null;
        }
    },

    /**
     * (Eski proxy kaldırıldı — yerel server.js proxy kullanılıyor)
     */

    /**
     * Ana fiyat çekme fonksiyonu
     * Sıra: Finnhub → Yahoo Finance Proxy → Demo
     */
    async fetchQuote(symbol, range = '5d', interval = '1d') {
        const cacheKey = `market_${symbol}_${range}_${interval}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        let result = null;

        // 1) Finnhub'dan dene (US hisseleri için)
        const isUSStock = !symbol.includes('.IS') && !symbol.includes('=F');
        const isIndex = symbol.startsWith('^');

        if (isUSStock && !isIndex) {
            result = await this._tryFinnhub(symbol, range);
        }

        // Endeksler için ETF proxy kullan
        if (isIndex) {
            result = await this._tryFinnhubIndex(symbol, range);
        }

        // 2) Yahoo Finance proxy ile dene
        if (!result) {
            result = await this._tryYahoo(symbol, range, interval);
        }

        // 3) Emtialar için Finnhub forex dene
        if (!result && symbol.includes('=F')) {
            result = await this._tryFinnhubCommodity(symbol);
        }

        // 4) Son çare: demo veri
        if (!result) {
            console.warn(`Tüm kaynaklar başarısız: ${symbol}, demo veriye düşülüyor`);
            result = this._getDemoQuote(symbol);
        }

        if (result) {
            Cache.set(cacheKey, result, 10 * 60 * 1000);
        }

        return result;
    },

    /**
     * Finnhub'dan hisse verisi
     */
    async _tryFinnhub(symbol, range) {
        const quote = await this._finnhubQuote(symbol);
        if (!quote || quote.c === 0) return null;

        // Tarihsel veri de çek
        const daysMap = { '5d': 5, '1mo': 30, '3mo': 90, '1y': 365 };
        const days = daysMap[range] || 30;
        const candles = await this._finnhubCandles(symbol, 'D', days);

        console.log(`✅ Finnhub: ${symbol} = $${quote.c}`);

        return {
            symbol,
            name: symbol,
            price: quote.c,
            previousClose: quote.pc,
            change: quote.d,
            changePercent: quote.dp,
            volume: 0,
            avgVolume: 0,
            high: quote.h,
            low: quote.l,
            open: quote.o,
            currency: 'USD',
            exchange: 'US',
            _source: 'finnhub',
            history: candles ? {
                timestamps: candles.t,
                closes: candles.c,
                opens: candles.o,
                highs: candles.h,
                lows: candles.l,
                volumes: candles.v
            } : this._generateHistory(quote.c, quote.pc, days)
        };
    },

    /**
     * Finnhub'dan endeks verisi (ETF proxy)
     */
    async _tryFinnhubIndex(symbol, range) {
        const indexInfo = this.SYMBOLS.us.find(s => s.symbol === symbol);
        if (!indexInfo || !indexInfo.finnhubSymbol) return null;

        const etfQuote = await this._finnhubQuote(indexInfo.finnhubSymbol);
        if (!etfQuote || etfQuote.c === 0) return null;

        // ETF fiyatını endeks değerine çevir
        const multiplier = indexInfo.multiplier || 1;
        const price = etfQuote.c * multiplier;
        const prevClose = etfQuote.pc * multiplier;
        const change = price - prevClose;
        const changePercent = etfQuote.dp;

        // Tarihsel veri
        const daysMap = { '5d': 5, '1mo': 30, '3mo': 90, '1y': 365 };
        const days = daysMap[range] || 30;
        const candles = await this._finnhubCandles(indexInfo.finnhubSymbol, 'D', days);

        console.log(`✅ Finnhub (ETF→Index): ${symbol} via ${indexInfo.finnhubSymbol} = $${price.toFixed(2)}`);

        return {
            symbol,
            name: indexInfo.name,
            price,
            previousClose: prevClose,
            change,
            changePercent,
            volume: 0,
            avgVolume: 0,
            high: etfQuote.h * multiplier,
            low: etfQuote.l * multiplier,
            open: etfQuote.o * multiplier,
            currency: 'USD',
            exchange: 'US',
            _source: 'finnhub_etf',
            history: candles ? {
                timestamps: candles.t,
                closes: candles.c.map(c => c * multiplier),
                opens: candles.o.map(o => o * multiplier),
                highs: candles.h.map(h => h * multiplier),
                lows: candles.l.map(l => l * multiplier),
                volumes: candles.v
            } : this._generateHistory(price, prevClose, days)
        };
    },

    /**
     * Finnhub'dan emtia verisi 
     */
    async _tryFinnhubCommodity(symbol) {
        const commodityInfo = this.SYMBOLS.commodities[symbol];
        if (!commodityInfo || !commodityInfo.finnhubForex) return null;

        const key = this._getFinnhubKey();
        if (!key) return null;

        try {
            const url = `${this.FINNHUB_BASE}/quote?symbol=${encodeURIComponent(commodityInfo.finnhubForex)}&token=${key}`;
            const response = await this._fetchWithTimeout(url, 6000);
            if (!response.ok) return null;
            const data = await response.json();
            if (!data || data.c === 0) return null;

            console.log(`✅ Finnhub (Forex): ${symbol} = $${data.c}`);

            return {
                symbol,
                name: commodityInfo.name,
                price: data.c,
                previousClose: data.pc,
                change: data.d,
                changePercent: data.dp,
                volume: 0,
                avgVolume: 0,
                high: data.h,
                low: data.l,
                open: data.o,
                currency: 'USD',
                exchange: 'COMMODITY',
                _source: 'finnhub_forex'
            };
        } catch (e) {
            return null;
        }
    },

    /**
     * Yahoo Finance (yerel proxy üzerinden)
     */
    async _tryYahoo(symbol, range, interval) {
        try {
            const url = `${this.YAHOO_BASE}${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
            const response = await this._fetchWithTimeout(url, 10000);
            if (!response || !response.ok) return null;

            const data = await response.json();
            return this._parseYahooQuote(data, symbol);
        } catch (e) {
            console.warn(`Yahoo Finance failed for ${symbol}:`, e.message);
            return null;
        }
    },

    /**
     * Tüm endeks verilerini çek
     */
    async fetchAllIndices() {
        const cacheKey = 'all_indices';
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        const allSymbols = [...this.SYMBOLS.us, ...this.SYMBOLS.tr];
        const promises = allSymbols.map(s => this.fetchQuote(s.symbol, '1mo', '1d'));
        const results = await Promise.allSettled(promises);

        const data = {};
        results.forEach((result, i) => {
            const sym = allSymbols[i];
            data[sym.id] = result.status === 'fulfilled' ? result.value : null;
        });

        Cache.set(cacheKey, data, 10 * 60 * 1000);
        return data;
    },

    /**
     * Hisse listesi çek
     */
    async fetchStockList(market = 'us') {
        const symbols = market === 'us' ? this.SYMBOLS.us_stocks : this.SYMBOLS.tr_stocks;
        const cacheKey = `stocklist_${market}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        const promises = symbols.map(s => this.fetchQuote(s, '5d', '1d'));
        const results = await Promise.allSettled(promises);

        const stocks = results
            .map((r, i) => r.status === 'fulfilled' ? r.value : null)
            .filter(Boolean);

        Cache.set(cacheKey, stocks, 10 * 60 * 1000);
        return stocks;
    },

    /**
     * Geçmiş veri çek (grafik için)
     */
    async fetchHistory(symbol, range = '1mo', interval = '1d') {
        return this.fetchQuote(symbol, range, interval);
    },

    /**
     * Yahoo Finance yanıtını parse et
     */
    _parseYahooQuote(data, symbol) {
        try {
            const chart = data.chart.result[0];
            const meta = chart.meta;
            const quotes = chart.indicators.quote[0];
            const timestamps = chart.timestamp || [];
            const closes = quotes.close || [];
            const opens = quotes.open || [];
            const highs = quotes.high || [];
            const lows = quotes.low || [];
            const volumes = quotes.volume || [];

            const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
            const previousClose = meta.chartPreviousClose || meta.previousClose || closes[closes.length - 2];
            const change = currentPrice - previousClose;
            const changePercent = previousClose ? (change / previousClose) * 100 : 0;

            return {
                symbol: meta.symbol || symbol,
                name: meta.shortName || meta.longName || symbol,
                price: currentPrice,
                previousClose,
                change,
                changePercent,
                volume: volumes[volumes.length - 1] || 0,
                avgVolume: volumes.reduce((a, b) => a + (b || 0), 0) / volumes.length,
                high: highs[highs.length - 1],
                low: lows[lows.length - 1],
                open: opens[opens.length - 1],
                currency: meta.currency || 'USD',
                exchange: meta.exchangeName || '',
                _source: 'yahoo',
                history: {
                    timestamps,
                    closes: closes.filter(c => c != null),
                    opens: opens.filter(o => o != null),
                    highs: highs.filter(h => h != null),
                    lows: lows.filter(l => l != null),
                    volumes: volumes.filter(v => v != null)
                }
            };
        } catch (e) {
            console.error('Yahoo parse error:', e);
            return null;
        }
    },

    /**
     * Simülasyon geçmiş veri oluştur
     */
    _generateHistory(price, prevClose, days = 30) {
        const closes = [];
        let p = prevClose * 0.95;
        for (let i = 0; i < days; i++) {
            p += (Math.random() - 0.48) * (price * 0.008);
            closes.push(Math.max(p, price * 0.85));
        }
        closes.push(price);

        return {
            timestamps: closes.map((_, i) => Math.floor(Date.now() / 1000) - (days - i) * 86400),
            closes,
            opens: closes.map(c => c * (1 + (Math.random() - 0.5) * 0.005)),
            highs: closes.map(c => c * (1 + Math.random() * 0.01)),
            lows: closes.map(c => c * (1 - Math.random() * 0.01)),
            volumes: closes.map(() => Math.floor(Math.random() * 50000000 + 5000000))
        };
    },

    /**
     * Demo/fallback veri (tüm kaynaklar başarısız olursa)
     */
    _getDemoQuote(symbol) {
        const demos = {
            '^GSPC': { name: 'S&P 500', price: 6185.70, prev: 6152.30, currency: 'USD' },
            '^IXIC': { name: 'NASDAQ', price: 20485.35, prev: 20380.10, currency: 'USD' },
            '^DJI': { name: 'Dow Jones', price: 45320.80, prev: 45180.50, currency: 'USD' },
            'XU100.IS': { name: 'BIST 100', price: 12485.60, prev: 12390.45, currency: 'TRY' },
            'GC=F': { name: 'Altın', price: 4985.50, prev: 4952.30, currency: 'USD' },
            'BZ=F': { name: 'Brent Petrol', price: 78.65, prev: 79.20, currency: 'USD' },
            'SI=F': { name: 'Gümüş', price: 58.40, prev: 57.85, currency: 'USD' },
            'CL=F': { name: 'WTI Petrol', price: 74.90, prev: 75.30, currency: 'USD' },
            'HG=F': { name: 'Bakır', price: 5.28, prev: 5.22, currency: 'USD' },
            'NG=F': { name: 'Doğal Gaz', price: 4.15, prev: 4.22, currency: 'USD' }
        };

        const stockDemos = {
            'AAPL': { name: 'Apple Inc.', price: 258.45, prev: 256.80 },
            'MSFT': { name: 'Microsoft', price: 465.30, prev: 462.10 },
            'GOOGL': { name: 'Alphabet', price: 198.75, prev: 196.40 },
            'AMZN': { name: 'Amazon', price: 235.60, prev: 233.20 },
            'NVDA': { name: 'NVIDIA', price: 1245.80, prev: 1228.50 },
            'META': { name: 'Meta', price: 685.40, prev: 678.90 },
            'TSLA': { name: 'Tesla', price: 345.20, prev: 352.10 },
            'JPM': { name: 'JPMorgan', price: 268.90, prev: 266.50 },
            'V': { name: 'Visa', price: 348.75, prev: 346.20 },
            'JNJ': { name: 'Johnson & Johnson', price: 172.30, prev: 171.80 },
            'THYAO.IS': { name: 'Türk Hava Yolları', price: 385.50, prev: 381.20, currency: 'TRY' },
            'GARAN.IS': { name: 'Garanti BBVA', price: 168.40, prev: 165.80, currency: 'TRY' },
            'AKBNK.IS': { name: 'Akbank', price: 92.35, prev: 91.10, currency: 'TRY' },
            'EREGL.IS': { name: 'Ereğli Demir Çelik', price: 68.50, prev: 67.85, currency: 'TRY' },
            'SISE.IS': { name: 'Şişecam', price: 58.90, prev: 59.30, currency: 'TRY' },
            'KCHOL.IS': { name: 'Koç Holding', price: 248.60, prev: 245.80, currency: 'TRY' },
            'ASELS.IS': { name: 'Aselsan', price: 112.75, prev: 111.40, currency: 'TRY' },
            'BIMAS.IS': { name: 'BİM Mağazalar', price: 745.50, prev: 738.20, currency: 'TRY' },
            'TUPRS.IS': { name: 'Tüpraş', price: 215.40, prev: 213.10, currency: 'TRY' },
            'SAHOL.IS': { name: 'Sabancı Holding', price: 108.75, prev: 107.20, currency: 'TRY' }
        };

        const lookup = { ...demos, ...stockDemos };
        const demo = lookup[symbol];

        if (!demo) {
            const basePrice = 100 + Math.random() * 200;
            const prev = basePrice * (1 + (Math.random() - 0.5) * 0.02);
            return this._buildDemoResult(symbol, symbol, basePrice, prev, 'USD');
        }

        return this._buildDemoResult(symbol, demo.name, demo.price, demo.prev, demo.currency || 'USD');
    },

    _buildDemoResult(symbol, name, price, prev, currency) {
        const change = price - prev;
        const changePercent = (change / prev) * 100;
        const history = this._generateHistory(price, prev, 30);

        return {
            symbol,
            name,
            price,
            previousClose: prev,
            change,
            changePercent,
            volume: Math.floor(Math.random() * 50000000 + 5000000),
            avgVolume: Math.floor(Math.random() * 30000000 + 10000000),
            high: price * 1.005,
            low: price * 0.995,
            open: prev,
            currency,
            exchange: currency === 'TRY' ? 'IST' : 'NYQ',
            _isDemo: true,
            _source: 'demo',
            history
        };
    }
};
