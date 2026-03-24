// ========================================
// APP.JS — Ana uygulama mantığı & orchestrator
// ========================================
const App = {
    refreshInterval: null,
    currentSection: 'dashboard',
    currentMarketTab: 'us',
    currentTimeframe: '30',
    currentChartSymbol: '^GSPC',
    currentChartName: 'S&P 500',

    /**
     * Uygulama başlat
     */
    async init() {
        console.log('🚀 Finans Koçu başlatılıyor...');

        // Safety timeout — loading overlay'ı max 5 saniye sonra kaldır
        const safetyTimer = setTimeout(() => {
            console.warn('⏰ Safety timeout — loading overlay kaldırılıyor');
            this.hideLoading();
        }, 5000);

        // Tarih güncelle
        this.updateHeaderDate();

        // Navigation
        this.setupNavigation();

        // Market tabs
        this.setupMarketTabs();

        // Timeframe buttons
        this.setupTimeframeButtons();

        // Settings
        this.setupSettings();
        WatchlistUI.init();

        // Refresh button
        this.setupRefreshButton();

        // Market status
        this.updateMarketStatus();

        // Earnings calendar init
        EarningsCalendarUI.init();

        // İlk veri yüklemesi (max 10 saniye timeout ile)
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Veri yükleme zaman aşımı')), 10000)
            );
            await Promise.race([DashboardUI.refresh(), timeoutPromise]);
            Notifications.show('Veriler başarıyla yüklendi!', 'success');
        } catch (e) {
            console.error('İlk yükleme hatası:', e);
            Notifications.show('Bazı veriler yüklenemedi. Demo veriler gösteriliyor.', 'warning');
        }

        // Loading overlay kaldır
        clearTimeout(safetyTimer);
        this.hideLoading();

        // Otomatik güncelleme
        const prefs = Storage.getPreferences();
        if (prefs.autoRefresh) {
            this.startAutoRefresh();
        }

        console.log('✅ Finans Koçu hazır!');
    },

    /**
     * Navigation kurulumu
     */
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.navigateTo(section);
            });
        });
    },

    /**
     * Bölüme git
     */
    navigateTo(section) {
        // Nav butonları güncelle
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-section="${section}"]`)?.classList.add('active');

        // Bölümleri güncelle
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${section}`)?.classList.add('active');

        this.currentSection = section;

        // Bölüme özel yükleme
        if (section === 'markets') {
            this.loadMarketSection();
        } else if (section === 'earnings') {
            EarningsCalendarUI.loadWeek(0);
        }
    },

    /**
     * Market tabs
     */
    setupMarketTabs() {
        document.querySelectorAll('.tab-btn[data-market]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn[data-market]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMarketTab = btn.dataset.market;
                this.loadMarketSection();
            });
        });
    },

    /**
     * Timeframe buttons
     */
    setupTimeframeButtons() {
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTimeframe = btn.dataset.tf;
                this.loadChart();
            });
        });
    },

    /**
     * Market bölümünü yükle
     */
    async loadMarketSection() {
        const tab = this.currentMarketTab;

        // Tab'a göre sembol ve veri
        let symbols = [];
        let chartSymbol = '^GSPC';
        let chartName = 'S&P 500';

        switch (tab) {
            case 'us':
                symbols = MarketsAPI.SYMBOLS.us_stocks;
                chartSymbol = '^GSPC';
                chartName = 'S&P 500';
                break;
            case 'tr':
                symbols = MarketsAPI.SYMBOLS.tr_stocks;
                chartSymbol = 'XU100.IS';
                chartName = 'BIST 100';
                break;
            case 'crypto':
                chartSymbol = 'bitcoin';
                chartName = 'Bitcoin';
                break;
            case 'commodity':
                chartSymbol = 'GC=F';
                chartName = 'Altın';
                break;
        }

        this.currentChartSymbol = chartSymbol;
        this.currentChartName = chartName;

        // Grafik yükle
        await this.loadChart();

        // Tablo yükle
        await this.loadMarketTable(tab);
    },

    /**
     * Grafik yükle
     */
    async loadChart() {
        const symbol = this.currentChartSymbol;
        const name = this.currentChartName;
        const days = parseInt(this.currentTimeframe);

        const rangeMap = { 7: '5d', 30: '1mo', 90: '3mo', 365: '1y' };
        const range = rangeMap[days] || '1mo';

        const titleEl = document.getElementById('chartTitle');
        if (titleEl) titleEl.textContent = `${name} — Son ${days <= 7 ? '1 Hafta' : days <= 30 ? '1 Ay' : days <= 90 ? '3 Ay' : '1 Yıl'}`;

        try {
            let labels, prices;

            if (this.currentMarketTab === 'crypto') {
                // CoinGecko history
                const history = await CryptoAPI.fetchCoinHistory(symbol, days);
                if (history && history.prices.length > 0) {
                    labels = history.prices.map(p => {
                        const d = new Date(p.time);
                        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    });
                    prices = history.prices.map(p => p.price);
                }
            } else {
                // Yahoo Finance history
                const interval = days <= 7 ? '1h' : days <= 30 ? '1d' : '1wk';
                const data = await MarketsAPI.fetchHistory(symbol, range, interval);
                if (data && data.history) {
                    labels = data.history.timestamps.map(t => {
                        const d = new Date(t * 1000);
                        return days <= 7 ?
                            d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) :
                            d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    });
                    prices = data.history.closes;
                }
            }

            if (labels && prices && prices.length > 0) {
                Charts.createMainChart('mainChart', labels, prices, name);

                // Teknik göstergeleri güncelle
                this.updateIndicators(prices);
            }
        } catch (error) {
            console.error('Chart loading error:', error);
        }
    },

    /**
     * Teknik göstergeleri güncelle
     */
    updateIndicators(closes) {
        if (!closes || closes.length < 14) return;

        const rsi = TechnicalAnalysis.calculateRSI(closes);
        const macd = TechnicalAnalysis.calculateMACD(closes);
        const sma50 = TechnicalAnalysis.calculateSMA(closes, Math.min(50, closes.length));
        const sma200 = TechnicalAnalysis.calculateSMA(closes, Math.min(200, closes.length));

        // RSI
        const rsiVal = document.getElementById('rsi-value');
        const rsiSig = document.getElementById('rsi-signal');
        if (rsiVal && rsi != null) {
            rsiVal.textContent = rsi.toFixed(1);
            const rsiClass = rsi < 30 ? 'bullish' : rsi > 70 ? 'bearish' : 'neutral';
            const rsiLabel = rsi < 30 ? 'Aşırı Satım' : rsi > 70 ? 'Aşırı Alım' : 'Nötr';
            rsiSig.textContent = rsiLabel;
            rsiSig.className = `indicator-signal ${rsiClass}`;
        }

        // MACD
        const macdVal = document.getElementById('macd-value');
        const macdSig = document.getElementById('macd-signal');
        if (macdVal && macd) {
            macdVal.textContent = macd.histogram.toFixed(4);
            const macdClass = macd.bullish ? 'bullish' : 'bearish';
            const macdLabel = macd.crossover ? 'Crossover!' : macd.bullish ? 'Pozitif' : 'Negatif';
            macdSig.textContent = macdLabel;
            macdSig.className = `indicator-signal ${macdClass}`;
        }

        // SMA 50
        const sma50Val = document.getElementById('sma50-value');
        const sma50Sig = document.getElementById('sma50-signal');
        if (sma50Val && sma50) {
            sma50Val.textContent = Formatters.shortNumber(sma50);
            const price = closes[closes.length - 1];
            const above = price > sma50;
            sma50Sig.textContent = above ? 'Üzerinde' : 'Altında';
            sma50Sig.className = `indicator-signal ${above ? 'bullish' : 'bearish'}`;
        }

        // SMA 200
        const sma200Val = document.getElementById('sma200-value');
        const sma200Sig = document.getElementById('sma200-signal');
        if (sma200Val && sma200) {
            sma200Val.textContent = Formatters.shortNumber(sma200);
            const price = closes[closes.length - 1];
            const above = price > sma200;
            sma200Sig.textContent = above ? 'Üzerinde' : 'Altında';
            sma200Sig.className = `indicator-signal ${above ? 'bullish' : 'bearish'}`;
        }
    },

    /**
     * Market tablosu yükle
     */
    async loadMarketTable(tab) {
        const tbody = document.getElementById('marketTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Veriler yükleniyor...</td></tr>';

        try {
            let items = [];
            let rawData = []; // Skor hesaplama için ham veri

            if (tab === 'crypto') {
                const coins = await CryptoAPI.fetchTopCoins(20);
                rawData = coins;
                items = coins.map(c => ({
                    symbol: c.symbol,
                    name: c.name,
                    price: c.price,
                    change: c.change24h,
                    volume: c.volume,
                    currency: 'USD',
                    score: null
                }));
            } else if (tab === 'commodity') {
                const commodities = await CommoditiesAPI.fetchAll();
                rawData = Object.values(commodities);
                items = rawData.map(c => ({
                    symbol: c.symbol,
                    name: c.displayName || c.name,
                    price: c.price,
                    change: c.changePercent,
                    volume: c.volume,
                    currency: 'USD',
                    score: null
                }));
            } else {
                const stocks = await MarketsAPI.fetchStockList(tab);
                rawData = stocks;
                items = stocks.map(s => ({
                    symbol: s.symbol,
                    name: s.name,
                    price: s.price,
                    change: s.changePercent,
                    volume: s.volume,
                    currency: s.currency || 'USD',
                    score: null
                }));
            }

            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Veri bulunamadı</td></tr>';
                return;
            }

            // ── Skor hesapla ──
            items.forEach((item, i) => {
                try {
                    const raw = rawData[i];
                    if (!raw) return;

                    // Closes dizisini bul (stock: history.closes, crypto: sparkline)
                    const closes = (raw.history?.closes) || (raw.sparkline) || [];

                    if (closes.length >= 14) {
                        const rsi = TechnicalAnalysis.calculateRSI(closes, 14);
                        const sma50 = TechnicalAnalysis.calculateSMA(closes, Math.min(50, closes.length));
                        const sma200 = closes.length >= 200 ? TechnicalAnalysis.calculateSMA(closes, 200) : null;
                        const currentPrice = item.price;

                        // MACD
                        let macdData = null;
                        if (closes.length >= 26) {
                            const ema12 = TechnicalAnalysis.calculateEMA(closes, 12);
                            const ema26 = TechnicalAnalysis.calculateEMA(closes, 26);
                            if (ema12 != null && ema26 != null) {
                                const macdLine = ema12 - ema26;
                                macdData = { bullish: macdLine > 0, crossover: false };
                            }
                        }

                        // Bollinger Bands
                        let bbData = null;
                        const bbPeriod = Math.min(20, closes.length);
                        if (closes.length >= bbPeriod) {
                            const sma = TechnicalAnalysis.calculateSMA(closes, bbPeriod);
                            const slice = closes.slice(-bbPeriod);
                            const std = Math.sqrt(slice.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / bbPeriod);
                            const upper = sma + 2 * std;
                            const lower = sma - 2 * std;
                            if (upper !== lower) {
                                bbData = { percentB: (currentPrice - lower) / (upper - lower) };
                            }
                        }

                        // Volume ratio
                        const volumeRatio = (raw.volume && raw.avgVolume) ? raw.volume / raw.avgVolume : null;

                        item.score = Scoring.calculateScore({
                            technicals: {
                                rsi,
                                macd: macdData,
                                sma50,
                                sma200,
                                currentPrice,
                                bb: bbData
                            },
                            changePercent: item.change,
                            volumeRatio
                        });
                    }
                } catch (e) {
                    // Skor hesaplanamadı, null bırak
                }
            });

            tbody.innerHTML = items.map(item => {
                const changeClass = item.change >= 0 ? 'up' : 'down';
                const priceStr = item.currency === 'TRY' ? Formatters.tryFormat(item.price) : Formatters.price(item.price);
                const scoreHtml = item.score
                    ? `<span class="score-badge ${item.score.color}" title="${item.score.factors?.join('\n') || ''}">${item.score.score} ${item.score.label}</span>`
                    : '<span class="score-badge neutral">-</span>';
                return `
                    <tr>
                        <td><strong>${item.symbol}</strong></td>
                        <td>${item.name}</td>
                        <td>${priceStr}</td>
                        <td><span class="card-change ${changeClass}">${Formatters.percent(item.change)}</span></td>
                        <td>${Formatters.shortNumber(item.volume)}</td>
                        <td>${scoreHtml}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Market table error:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Hata oluştu</td></tr>';
        }
    },

    /**
     * Settings kurulumu
     */
    setupSettings() {
        // API key'leri yükle
        const keys = Storage.getApiKeys();
        const finnhubInput = document.getElementById('finnhubKey');
        const newsapiInput = document.getElementById('newsapiKey');

        if (finnhubInput && keys.finnhub) finnhubInput.value = keys.finnhub;
        if (newsapiInput && keys.newsapi) newsapiInput.value = keys.newsapi;

        // Kaydet butonu
        document.getElementById('saveApiKeys')?.addEventListener('click', () => {
            Storage.saveApiKeys({
                finnhub: finnhubInput?.value || '',
                newsapi: newsapiInput?.value || ''
            });
            Notifications.show('API anahtarları kaydedildi!', 'success');
        });

        // Tercihler
        const prefs = Storage.getPreferences();
        const showCryptoEl = document.getElementById('showCrypto');
        const showCommoditiesEl = document.getElementById('showCommodities');
        const autoRefreshEl = document.getElementById('autoRefresh');

        if (showCryptoEl) showCryptoEl.checked = prefs.showCrypto;
        if (showCommoditiesEl) showCommoditiesEl.checked = prefs.showCommodities;
        if (autoRefreshEl) autoRefreshEl.checked = prefs.autoRefresh;

        [showCryptoEl, showCommoditiesEl, autoRefreshEl].forEach(el => {
            if (el) el.addEventListener('change', () => {
                Storage.savePreferences({
                    showCrypto: showCryptoEl?.checked ?? true,
                    showCommodities: showCommoditiesEl?.checked ?? true,
                    autoRefresh: autoRefreshEl?.checked ?? true
                });
                Notifications.show('Tercihler kaydedildi', 'success');
            });
        });

        // Cache temizle
        document.getElementById('clearCache')?.addEventListener('click', () => {
            const count = Cache.clear();
            Notifications.show(`${count} önbellek girişi temizlendi`, 'success');
            this.updateCacheSize();
        });

        this.updateCacheSize();
    },

    /**
     * Cache boyutu güncelle
     */
    updateCacheSize() {
        const el = document.getElementById('cacheSize');
        if (el) el.textContent = `Önbellek: ${Cache.getSize()}`;
    },

    /**
     * Refresh butonu
     */
    setupRefreshButton() {
        const btn = document.getElementById('refreshBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.classList.add('spinning');
                Cache.clear();
                await DashboardUI.refresh();
                btn.classList.remove('spinning');
                Notifications.show('Veriler güncellendi!', 'success');
                this.updateCacheSize();
            });
        }
    },

    /**
     * Otomatik güncelleme başlat
     */
    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => {
            console.log('🔄 Otomatik güncelleme...');
            DashboardUI.refresh();
        }, 15 * 60 * 1000); // 15 dk
    },

    /**
     * Tarih güncelle
     */
    updateHeaderDate() {
        const el = document.getElementById('headerDate');
        if (el) el.textContent = Formatters.todayLong();

        const advisorDate = document.getElementById('advisorDate');
        if (advisorDate) advisorDate.textContent = Formatters.todayLong();
    },

    /**
     * Piyasa durumu (açık/kapalı)
     */
    updateMarketStatus() {
        const statusEl = document.getElementById('marketStatus');
        if (!statusEl) return;

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        const now = new Date();
        const utcHour = now.getUTCHours();
        const day = now.getDay();

        // NYSE: 14:30-21:00 UTC (Hafta içi)
        const isWeekday = day >= 1 && day <= 5;
        const isUSOpen = isWeekday && utcHour >= 14 && utcHour < 21;

        // BIST: 07:00-15:00 UTC (Hafta içi)
        const isBISTOpen = isWeekday && utcHour >= 7 && utcHour < 15;

        if (isUSOpen && isBISTOpen) {
            dot.className = 'status-dot open';
            text.textContent = 'NYSE & BIST Açık';
        } else if (isUSOpen) {
            dot.className = 'status-dot open';
            text.textContent = 'NYSE Açık';
        } else if (isBISTOpen) {
            dot.className = 'status-dot open';
            text.textContent = 'BIST Açık';
        } else {
            dot.className = 'status-dot closed';
            text.textContent = 'Piyasalar Kapalı';
        }
    },

    /**
     * Loading overlay gizle
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 500);
        }
    }
};

// ========================================
// BAŞLAT
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
