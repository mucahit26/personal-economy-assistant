// ========================================
// PORTFOLIO ANALYSIS — Al/Sat Analizi
// Kullanıcının portföyündeki varlıklar için
// teknik analiz + yönlü yorum
// ========================================
const PortfolioAnalysis = {

    // Kullanıcının takip listesi
    ASSETS: [
        // Emtialar
        { symbol: 'GC=F',    name: 'XAUUSD (Altın)',    type: 'commodity', yahooSymbol: 'GC=F',      currency: 'USD', icon: '🥇' },
        { symbol: 'SI=F',    name: 'SILVER (Gümüş)',    type: 'commodity', yahooSymbol: 'SI=F',      currency: 'USD', icon: '🥈' },

        // Kripto
        { symbol: 'ETHUSD',  name: 'Ethereum',          type: 'crypto',    coinId: 'ethereum',       currency: 'USD', icon: '⟠' },
        { symbol: 'BTCUSD',  name: 'Bitcoin',           type: 'crypto',    coinId: 'bitcoin',        currency: 'USD', icon: '₿' },
        { symbol: 'CCDUSD',  name: 'CCD Token',         type: 'crypto',    coinId: 'concordium',     currency: 'USD', icon: '🔵' },

        // BIST Hisseleri
        { symbol: 'ASELS',   name: 'Aselsan',           type: 'stock',     yahooSymbol: 'ASELS.IS',  currency: 'TRY', icon: '🛡️' },
        { symbol: 'PAPIL',   name: 'Papilon Savunma',   type: 'stock',     yahooSymbol: 'PAPIL.IS',  currency: 'TRY', icon: '📡' },
        { symbol: 'ALTNY',   name: 'Altınyağ',          type: 'stock',     yahooSymbol: 'ALTNY.IS',  currency: 'TRY', icon: '🏭' },
        { symbol: 'KATMR',   name: 'Katmerciler',       type: 'stock',     yahooSymbol: 'KATMR.IS',  currency: 'TRY', icon: '🚒' },
        { symbol: 'PINSU',   name: 'Pınar Su',          type: 'stock',     yahooSymbol: 'PINSU.IS',  currency: 'TRY', icon: '💧' },
        { symbol: 'ULUUN',   name: 'Ulusoy Un',         type: 'stock',     yahooSymbol: 'ULUUN.IS',  currency: 'TRY', icon: '🌾' },
        { symbol: 'BIMAS',   name: 'BİM Mağazalar',     type: 'stock',     yahooSymbol: 'BIMAS.IS',  currency: 'TRY', icon: '🛒' },
        { symbol: 'BRSAN',   name: 'Borusan Mannesmann', type: 'stock',    yahooSymbol: 'BRSAN.IS',  currency: 'TRY', icon: '🔩' },
    ],

    /**
     * Tüm varlıkları analiz et
     */
    async analyzeAll() {
        const container = document.getElementById('portfolioCards');
        const statusEl = document.getElementById('portfolioStatus');
        if (!container) return;

        container.innerHTML = '<div class="loading-placeholder">📊 Veriler çekiliyor ve analiz ediliyor...</div>';
        if (statusEl) statusEl.textContent = 'Analiz ediliyor...';

        const results = [];

        for (const asset of this.ASSETS) {
            try {
                const data = await this._fetchAssetData(asset);
                if (data) {
                    const analysis = this._analyzeAsset(asset, data);
                    results.push({ asset, data, analysis });
                }
            } catch (e) {
                console.warn(`${asset.symbol} analiz hatası:`, e.message);
            }
        }

        this._renderResults(results, container);
        if (statusEl) statusEl.textContent = `${results.length}/${this.ASSETS.length} varlık analiz edildi`;
    },

    /**
     * Varlık verisini çek (1 aylık geçmiş)
     */
    async _fetchAssetData(asset) {
        const cacheKey = `portfolio_${asset.symbol}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        let result = null;

        if (asset.type === 'crypto' && asset.coinId) {
            // CoinGecko'dan 30 günlük veri
            try {
                const url = `/api/coingecko/coins/${asset.coinId}/market_chart?vs_currency=usd&days=30&interval=daily`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    const prices = data.prices || [];
                    const volumes = data.total_volumes || [];
                    result = {
                        closes: prices.map(p => p[1]),
                        volumes: volumes.map(v => v[1]),
                        currentPrice: prices.length > 0 ? prices[prices.length - 1][1] : null,
                        previousClose: prices.length > 1 ? prices[prices.length - 2][1] : null,
                    };
                    if (result.currentPrice && result.previousClose) {
                        result.change = result.currentPrice - result.previousClose;
                        result.changePercent = (result.change / result.previousClose) * 100;
                    }
                }
            } catch (e) {
                console.warn(`CoinGecko ${asset.coinId}:`, e.message);
            }
        } else {
            // Yahoo Finance'den (market + commodity)
            const sym = asset.yahooSymbol || asset.symbol;
            try {
                const data = await MarketsAPI.fetchQuote(sym, '1mo', '1d');
                if (data) {
                    result = {
                        closes: data.history?.closes || [],
                        volumes: data.history?.volumes || [],
                        highs: data.history?.highs || [],
                        lows: data.history?.lows || [],
                        currentPrice: data.price,
                        previousClose: data.previousClose,
                        change: data.change,
                        changePercent: data.changePercent,
                        volume: data.volume,
                        avgVolume: data.avgVolume,
                    };
                }
            } catch (e) {
                console.warn(`Yahoo ${sym}:`, e.message);
            }
        }

        if (result) {
            Cache.set(cacheKey, result, 15 * 60 * 1000);
        }
        return result;
    },

    /**
     * Teknik analiz + al/sat sinyali
     */
    _analyzeAsset(asset, data) {
        const closes = data.closes || [];
        const result = {
            signal: 'NÖTR',      // AL, SAT, NÖTR
            signalClass: 'neutral',
            direction: '➡️',
            strength: 0,         // -100 ile +100 arası
            factors: [],
            summary: '',
            indicators: {}
        };

        if (closes.length < 10) {
            result.summary = 'Yeterli veri yok — analiz yapılamıyor.';
            return result;
        }

        let score = 0;
        const currentPrice = data.currentPrice || closes[closes.length - 1];

        // ── RSI ──
        const rsi = TechnicalAnalysis.calculateRSI(closes, Math.min(14, closes.length - 1));
        result.indicators.rsi = rsi;
        if (rsi !== null) {
            if (rsi < 30) {
                score += 25;
                result.factors.push({ text: `RSI ${rsi.toFixed(1)} — Aşırı satım bölgesi (AL sinyali)`, type: 'bullish' });
            } else if (rsi < 40) {
                score += 12;
                result.factors.push({ text: `RSI ${rsi.toFixed(1)} — Satım bölgesine yakın`, type: 'bullish' });
            } else if (rsi > 70) {
                score -= 25;
                result.factors.push({ text: `RSI ${rsi.toFixed(1)} — Aşırı alım bölgesi (SAT sinyali)`, type: 'bearish' });
            } else if (rsi > 60) {
                score -= 10;
                result.factors.push({ text: `RSI ${rsi.toFixed(1)} — Alım bölgesine yakın`, type: 'bearish' });
            } else {
                result.factors.push({ text: `RSI ${rsi.toFixed(1)} — Nötr bölge`, type: 'neutral' });
            }
        }

        // ── MACD ──
        if (closes.length >= 26) {
            const ema12 = TechnicalAnalysis.calculateEMA(closes, 12);
            const ema26 = TechnicalAnalysis.calculateEMA(closes, 26);
            if (ema12 != null && ema26 != null) {
                const macdLine = ema12 - ema26;
                const prevEma12 = TechnicalAnalysis.calculateEMA(closes.slice(0, -1), 12);
                const prevEma26 = TechnicalAnalysis.calculateEMA(closes.slice(0, -1), 26);
                const prevMacd = (prevEma12 && prevEma26) ? prevEma12 - prevEma26 : null;

                result.indicators.macd = macdLine;

                if (macdLine > 0 && prevMacd !== null && prevMacd <= 0) {
                    score += 20;
                    result.factors.push({ text: 'MACD yukarı kesişim — Güçlü AL sinyali', type: 'bullish' });
                } else if (macdLine < 0 && prevMacd !== null && prevMacd >= 0) {
                    score -= 20;
                    result.factors.push({ text: 'MACD aşağı kesişim — Güçlü SAT sinyali', type: 'bearish' });
                } else if (macdLine > 0) {
                    score += 8;
                    result.factors.push({ text: 'MACD pozitif bölgede — Yükseliş trendi', type: 'bullish' });
                } else {
                    score -= 8;
                    result.factors.push({ text: 'MACD negatif bölgede — Düşüş trendi', type: 'bearish' });
                }
            }
        }

        // ── SMA 50 / SMA 20 ──
        const smaPeriod = Math.min(20, closes.length);
        const sma = TechnicalAnalysis.calculateSMA(closes, smaPeriod);
        result.indicators.sma = sma;
        if (sma && currentPrice) {
            const smaPercent = ((currentPrice - sma) / sma) * 100;
            if (currentPrice > sma) {
                score += 10;
                result.factors.push({ text: `Fiyat SMA${smaPeriod} üzerinde (%${smaPercent.toFixed(1)}) — Yükseliş`, type: 'bullish' });
            } else {
                score -= 10;
                result.factors.push({ text: `Fiyat SMA${smaPeriod} altında (%${smaPercent.toFixed(1)}) — Düşüş`, type: 'bearish' });
            }
        }

        // ── Bollinger Bands ──
        const bbPeriod = Math.min(20, closes.length);
        if (closes.length >= bbPeriod) {
            const bbSma = TechnicalAnalysis.calculateSMA(closes, bbPeriod);
            const slice = closes.slice(-bbPeriod);
            const std = Math.sqrt(slice.reduce((sum, c) => sum + Math.pow(c - bbSma, 2), 0) / bbPeriod);
            const upper = bbSma + 2 * std;
            const lower = bbSma - 2 * std;
            result.indicators.bbUpper = upper;
            result.indicators.bbLower = lower;

            if (currentPrice <= lower) {
                score += 15;
                result.factors.push({ text: 'Fiyat Bollinger alt bandında — Potansiyel dip', type: 'bullish' });
            } else if (currentPrice >= upper) {
                score -= 15;
                result.factors.push({ text: 'Fiyat Bollinger üst bandında — Aşırı genişleme', type: 'bearish' });
            }
        }

        // ── Momentum (1 günlük değişim) ──
        if (data.changePercent != null) {
            if (data.changePercent > 3) {
                score += 5;
                result.factors.push({ text: `Günlük %${data.changePercent.toFixed(2)} yükseliş — Güçlü momentum`, type: 'bullish' });
            } else if (data.changePercent < -3) {
                score -= 5;
                result.factors.push({ text: `Günlük %${data.changePercent.toFixed(2)} düşüş — Zayıf momentum`, type: 'bearish' });
            }
        }

        // ── Son 5 gün trendi ──
        if (closes.length >= 5) {
            const last5 = closes.slice(-5);
            let upDays = 0;
            for (let i = 1; i < last5.length; i++) {
                if (last5[i] > last5[i - 1]) upDays++;
            }
            if (upDays >= 4) {
                score += 8;
                result.factors.push({ text: `Son 5 günün ${upDays}'ü yukarı — Sürekli alıcı`, type: 'bullish' });
            } else if (upDays <= 1) {
                score -= 8;
                result.factors.push({ text: `Son 5 günün ${4 - upDays}'ü aşağı — Sürekli satıcı`, type: 'bearish' });
            }
        }

        // ── Hacim analizi ──
        if (data.volume && data.avgVolume && data.avgVolume > 0) {
            const volRatio = data.volume / data.avgVolume;
            result.indicators.volumeRatio = volRatio;
            if (volRatio > 1.5) {
                result.factors.push({ text: `Hacim ortalamanın ${volRatio.toFixed(1)}x üzerinde — Yoğun ilgi`, type: (score > 0) ? 'bullish' : 'bearish' });
            }
        }

        // ── Skor → Sinyal ──
        score = Math.max(-100, Math.min(100, score));
        result.strength = score;

        if (score >= 15) {
            result.signal = 'AL';
            result.signalClass = 'buy';
            result.direction = '🟢 ↑';
        } else if (score <= -15) {
            result.signal = 'SAT';
            result.signalClass = 'sell';
            result.direction = '🔴 ↓';
        } else {
            result.signal = 'NÖTR';
            result.signalClass = 'neutral';
            result.direction = '🟡 ➡️';
        }

        // ── Özet cümle ──
        result.summary = this._generateSummary(asset, data, result);

        return result;
    },

    /**
     * Doğal dil özeti oluştur
     */
    _generateSummary(asset, data, analysis) {
        const name = asset.name;
        const price = data.currentPrice;
        const change = data.changePercent;
        const rsi = analysis.indicators.rsi;

        if (analysis.signal === 'AL') {
            if (rsi && rsi < 35) {
                return `${name} aşırı satım bölgesinde, teknik göstergeler toparlanma potansiyeli işaret ediyor. Kademeli alım fırsatı olabilir.`;
            }
            return `${name} yukarı yönlü sinyaller veriyor. Teknik göstergeler olumlu, trend devam ederse yükseliş beklentisi güçlü.`;
        } else if (analysis.signal === 'SAT') {
            if (rsi && rsi > 65) {
                return `${name} aşırı alım bölgesine yaklaşıyor, kâr realizasyonu baskısı artabilir. Temkinli olunması tavsiye edilir.`;
            }
            return `${name} aşağı yönlü baskı altında. Teknik göstergeler zayıf, kısa vadede düşüş devam edebilir.`;
        } else {
            return `${name} nötr bölgede seyrediyor. Net bir yön sinyali yok, bekle-gör stratejisi uygulanabilir.`;
        }
    },

    /**
     * Sonuçları render et
     */
    _renderResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">Veri çekilemedi — lütfen tekrar deneyin.</div>';
            return;
        }

        container.innerHTML = results.map(({ asset, data, analysis }) => {
            const priceStr = asset.currency === 'TRY'
                ? Formatters.tryFormat(data.currentPrice)
                : Formatters.price(data.currentPrice);
            const changeStr = data.changePercent != null ? Formatters.percent(data.changePercent) : '--';
            const changeClass = (data.changePercent || 0) >= 0 ? 'up' : 'down';

            const factorsHtml = analysis.factors.map(f =>
                `<div class="pa-factor ${f.type}">
                    <span class="pa-factor-dot"></span>
                    ${f.text}
                </div>`
            ).join('');

            return `
                <div class="pa-card glass-card">
                    <div class="pa-card-header">
                        <div class="pa-asset-info">
                            <span class="pa-icon">${asset.icon}</span>
                            <div>
                                <div class="pa-symbol">${asset.symbol}</div>
                                <div class="pa-name">${asset.name}</div>
                            </div>
                        </div>
                        <div class="pa-signal-badge ${analysis.signalClass}">
                            ${analysis.direction} ${analysis.signal}
                        </div>
                    </div>
                    <div class="pa-price-row">
                        <span class="pa-price">${priceStr}</span>
                        <span class="pa-change ${changeClass}">${changeStr}</span>
                    </div>
                    <div class="pa-strength-bar">
                        <div class="pa-bar-track">
                            <div class="pa-bar-fill ${analysis.signalClass}" style="width: ${Math.abs(analysis.strength)}%; ${analysis.strength < 0 ? 'right: 50%' : 'left: 50%'}"></div>
                            <div class="pa-bar-center"></div>
                        </div>
                        <div class="pa-bar-labels">
                            <span>SAT</span>
                            <span>NÖTR</span>
                            <span>AL</span>
                        </div>
                    </div>
                    <div class="pa-summary">${analysis.summary}</div>
                    <div class="pa-factors">${factorsHtml}</div>
                    <div class="pa-indicators">
                        ${analysis.indicators.rsi != null ? `<span class="pa-ind">RSI: ${analysis.indicators.rsi.toFixed(1)}</span>` : ''}
                        ${analysis.indicators.macd != null ? `<span class="pa-ind">MACD: ${analysis.indicators.macd.toFixed(4)}</span>` : ''}
                        ${analysis.indicators.sma != null ? `<span class="pa-ind">SMA: ${asset.currency === 'TRY' ? '₺' : '$'}${analysis.indicators.sma.toFixed(2)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
};
