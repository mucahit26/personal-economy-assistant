// ========================================
// CRYPTO API — CoinGecko üzerinden kripto verileri
// ========================================
const CryptoAPI = {
    BASE_URL: '/api/coingecko',

    /**
     * Top kripto paraları çek
     */
    async fetchTopCoins(limit = 20) {
        const cacheKey = `crypto_top_${limit}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        try {
            const url = `${this.BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
            const response = await fetch(url);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const coins = data.map(coin => ({
                id: coin.id,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                image: coin.image,
                price: coin.current_price,
                marketCap: coin.market_cap,
                volume: coin.total_volume,
                change1h: coin.price_change_percentage_1h_in_currency,
                change24h: coin.price_change_percentage_24h_in_currency || coin.price_change_percentage_24h,
                change7d: coin.price_change_percentage_7d_in_currency,
                high24h: coin.high_24h,
                low24h: coin.low_24h,
                ath: coin.ath,
                athChangePercent: coin.ath_change_percentage,
                sparkline: coin.sparkline_in_7d?.price || [],
                rank: coin.market_cap_rank
            }));

            Cache.set(cacheKey, coins, 5 * 60 * 1000); // 5 dk cache
            return coins;
        } catch (error) {
            console.error('Crypto API error:', error);
            return this._getDemoCoins(limit);
        }
    },

    /**
     * Demo kripto verisi (API erişilemezse)
     */
    _getDemoCoins(limit = 20) {
        const demoCoins = [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 142500, mc: 2820000000000, vol: 58000000000, ch: 1.8, ath: 155000 },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 5820, mc: 700000000000, vol: 24000000000, ch: -0.9, ath: 6400 },
            { id: 'tether', symbol: 'USDT', name: 'Tether', price: 1.00, mc: 165000000000, vol: 78000000000, ch: 0.01, ath: 1.32 },
            { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 845, mc: 128000000000, vol: 3200000000, ch: 0.6, ath: 920 },
            { id: 'solana', symbol: 'SOL', name: 'Solana', price: 285, mc: 135000000000, vol: 5800000000, ch: 3.2, ath: 340 },
            { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 4.85, mc: 275000000000, vol: 8500000000, ch: -0.3, ath: 5.80 },
            { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1.00, mc: 68000000000, vol: 12000000000, ch: 0.0, ath: 1.17 },
            { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 1.65, mc: 58000000000, vol: 1200000000, ch: -1.5, ath: 3.09 },
            { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.42, mc: 62000000000, vol: 2800000000, ch: 2.1, ath: 0.73 },
            { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 68.50, mc: 28000000000, vol: 980000000, ch: 1.4, ath: 146 },
            { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 32.40, mc: 20500000000, vol: 840000000, ch: -0.5, ath: 52.88 },
            { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 12.80, mc: 18000000000, vol: 520000000, ch: 0.8, ath: 55.0 },
            { id: 'tron', symbol: 'TRX', name: 'TRON', price: 0.38, mc: 33000000000, vol: 680000000, ch: 0.3, ath: 0.45 },
            { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', price: 0.0000425, mc: 25000000000, vol: 1200000000, ch: 4.2, ath: 0.0000886 },
            { id: 'polygon', symbol: 'POL', name: 'Polygon', price: 0.95, mc: 9500000000, vol: 450000000, ch: -1.2, ath: 2.92 },
            { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 165, mc: 12400000000, vol: 680000000, ch: 0.7, ath: 410 },
            { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 22.50, mc: 17000000000, vol: 520000000, ch: -1.8, ath: 44.97 },
            { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', price: 685, mc: 13500000000, vol: 580000000, ch: 0.9, ath: 3785 },
            { id: 'stellar', symbol: 'XLM', name: 'Stellar', price: 0.72, mc: 21500000000, vol: 420000000, ch: 0.4, ath: 0.94 },
            { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', price: 9.85, mc: 11500000000, vol: 620000000, ch: 2.2, ath: 20.44 }
        ];

        return demoCoins.slice(0, limit).map((c, i) => {
            // Sparkline simülasyonu
            const sparkline = [];
            let p = c.price * 0.95;
            for (let j = 0; j < 168; j++) {
                p += (Math.random() - 0.48) * c.price * 0.005;
                sparkline.push(Math.max(p, c.price * 0.8));
            }

            return {
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                image: `https://assets.coingecko.com/coins/images/${i + 1}/small/${c.id}.png`,
                price: c.price,
                marketCap: c.mc,
                volume: c.vol,
                change1h: (Math.random() - 0.5) * 2,
                change24h: c.ch,
                change7d: c.ch * (1 + (Math.random() - 0.5)),
                high24h: c.price * 1.03,
                low24h: c.price * 0.97,
                ath: c.ath,
                athChangePercent: ((c.price - c.ath) / c.ath) * 100,
                sparkline,
                rank: i + 1,
                _isDemo: true
            };
        });
    },

    /**
     * Bitcoin ve Ethereum detay
     */
    async fetchBTCETH() {
        const coins = await this.fetchTopCoins(10);
        return {
            btc: coins.find(c => c.id === 'bitcoin') || null,
            eth: coins.find(c => c.id === 'ethereum') || null
        };
    },

    /**
     * Global kripto verileri
     */
    async fetchGlobalData() {
        const cacheKey = 'crypto_global';
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.BASE_URL}/global`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const result = {
                totalMarketCap: data.data.total_market_cap?.usd || 0,
                totalVolume: data.data.total_volume?.usd || 0,
                btcDominance: data.data.market_cap_percentage?.btc || 0,
                ethDominance: data.data.market_cap_percentage?.eth || 0,
                activeCryptos: data.data.active_cryptocurrencies || 0,
                marketCapChange: data.data.market_cap_change_percentage_24h_usd || 0
            };

            Cache.set(cacheKey, result, 10 * 60 * 1000);
            return result;
        } catch (error) {
            console.error('Crypto global error:', error);
            return null;
        }
    },

    /**
     * Kripto fiyat geçmişi çek (grafik için)
     */
    async fetchCoinHistory(coinId, days = 30) {
        const cacheKey = `crypto_history_${coinId}_${days}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        try {
            const url = `${this.BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const result = {
                prices: data.prices?.map(p => ({ time: p[0], price: p[1] })) || [],
                volumes: data.total_volumes?.map(v => ({ time: v[0], volume: v[1] })) || [],
                marketCaps: data.market_caps?.map(m => ({ time: m[0], cap: m[1] })) || []
            };

            Cache.set(cacheKey, result, 10 * 60 * 1000);
            return result;
        } catch (error) {
            console.error('Crypto history error:', error);
            return null;
        }
    }
};
