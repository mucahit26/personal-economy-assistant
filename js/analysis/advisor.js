// ========================================
// ADVISOR — Kural tabanlı AI öneri motoru
// ========================================
const Advisor = {
    /**
     * Günlük analiz oluştur
     */
    async generateDailyAnalysis(marketData, cryptoData, forexData, commodityData) {
        const insights = [];
        const opportunities = [];
        const warnings = [];

        // --- PIYASA ANALİZİ ---
        if (marketData) {
            // S&P 500 analizi
            if (marketData.sp500) {
                const sp = marketData.sp500;
                if (sp.changePercent > 1) {
                    insights.push({
                        type: 'bullish',
                        icon: '📈',
                        title: 'ABD Piyasası Güçlü',
                        body: `S&P 500 ${Formatters.percent(sp.changePercent)} yükseldi. Risk iştahı yüksek.`,
                        source: 'Piyasa Analizi'
                    });
                } else if (sp.changePercent < -1) {
                    insights.push({
                        type: 'bearish',
                        icon: '📉',
                        title: 'ABD Piyasası Baskı Altında',
                        body: `S&P 500 ${Formatters.percent(sp.changePercent)} düştü. Savunmacı pozisyon düşünün.`,
                        source: 'Piyasa Analizi'
                    });
                }

                // Teknik analiz yap
                if (sp.history && sp.history.closes) {
                    const technicals = TechnicalAnalysis.analyzeAll(sp);
                    if (technicals) {
                        technicals.signals.forEach(signal => {
                            if (signal.type === 'bullish') {
                                opportunities.push({
                                    type: 'opportunity',
                                    icon: '🎯',
                                    title: `S&P 500: ${signal.name}`,
                                    body: signal.detail,
                                    score: 'Fırsat',
                                    tags: ['ABD', 'Teknik Analiz', signal.name]
                                });
                            } else if (signal.type === 'bearish') {
                                warnings.push({
                                    type: 'warning',
                                    icon: '⚠️',
                                    title: `S&P 500: ${signal.name}`,
                                    body: signal.detail,
                                    score: 'Uyarı',
                                    tags: ['ABD', 'Teknik Analiz', signal.name]
                                });
                            }
                        });
                    }
                }
            }

            // BIST analizi
            if (marketData.xu100) {
                const xu = marketData.xu100;
                if (xu.changePercent > 1.5) {
                    insights.push({
                        type: 'bullish',
                        icon: '🇹🇷',
                        title: 'BIST 100 Rallisi',
                        body: `BIST 100 ${Formatters.percent(xu.changePercent)} yükseldi. Yabancı girişi olabilir.`,
                        source: 'BIST Analiz'
                    });
                } else if (xu.changePercent < -1.5) {
                    insights.push({
                        type: 'bearish',
                        icon: '🇹🇷',
                        title: 'BIST 100 Satış Baskısı',
                        body: `BIST 100 ${Formatters.percent(xu.changePercent)} düştü. Döviz hareketlerini kontrol edin.`,
                        source: 'BIST Analiz'
                    });
                }
            }
        }

        // --- KRİPTO ANALİZİ ---
        if (cryptoData && cryptoData.length > 0) {
            const btc = cryptoData.find(c => c.id === 'bitcoin');
            const eth = cryptoData.find(c => c.id === 'ethereum');

            if (btc) {
                if (btc.change24h > 5) {
                    insights.push({
                        type: 'bullish',
                        icon: '₿',
                        title: 'Bitcoin Güçlü Yükseliş',
                        body: `Bitcoin 24 saatte ${Formatters.percent(btc.change24h)} yükseldi. Momentum güçlü.`,
                        source: 'Kripto Analiz'
                    });
                } else if (btc.change24h < -5) {
                    insights.push({
                        type: 'bearish',
                        icon: '₿',
                        title: 'Bitcoin Sert Düşüş',
                        body: `Bitcoin 24 saatte ${Formatters.percent(btc.change24h)} düştü. Destek seviyelerini izleyin.`,
                        source: 'Kripto Analiz'
                    });
                }

                // ATH uzaklığı
                if (btc.athChangePercent && btc.athChangePercent < -30) {
                    opportunities.push({
                        type: 'watch',
                        icon: '👀',
                        title: 'Bitcoin ATH\'den Uzakta',
                        body: `Bitcoin ATH\'den ${Formatters.percent(btc.athChangePercent)} uzakta. Uzun vadeli birikme fırsatı olabilir.`,
                        score: 'İzle',
                        tags: ['Kripto', 'BTC', 'Uzun Vade']
                    });
                }
            }

            // En çok yükselen altcoinler
            const topGainers = cryptoData
                .filter(c => c.change24h > 10)
                .sort((a, b) => b.change24h - a.change24h)
                .slice(0, 3);

            topGainers.forEach(coin => {
                insights.push({
                    type: 'neutral',
                    icon: '🚀',
                    title: `${coin.name} Sıçrayışı`,
                    body: `${coin.symbol} 24 saatte ${Formatters.percent(coin.change24h)} yükseldi. FOMO yapma, araştır!`,
                    source: 'Kripto Gündem'
                });
            });
        }

        // --- DÖVİZ ANALİZİ ---
        if (forexData) {
            if (forexData.usdtry_change > 1) {
                warnings.push({
                    type: 'warning',
                    icon: '💱',
                    title: 'TL Değer Kaybı',
                    body: `USD/TRY ${Formatters.percent(forexData.usdtry_change)} yükseldi. TL bazlı varlıklarınıza dikkat.`,
                    score: 'Uyarı',
                    tags: ['Döviz', 'TRY', 'Risk']
                });
            }
        }

        // --- KORELASYON ANALİZİ ---
        const correlations = this._analyzeCorrelations(marketData, cryptoData, forexData, commodityData);

        // --- BİLGİ TABANI İPUÇLARI ---
        const knowledgeTips = FinanceKnowledge.getRandomInsights(3);

        // --- GÜNLÜK ÖZEt ---
        const summary = this._generateSummary(insights, opportunities, warnings);

        return {
            summary,
            insights,
            opportunities: [...opportunities, ...warnings],
            knowledgeTips,
            correlations,
            dailyTip: FinanceKnowledge.getDailyTip(),
            timestamp: Date.now()
        };
    },

    /**
     * Günlük özet metin oluştur
     */
    _generateSummary(insights, opportunities, warnings) {
        const bullish = insights.filter(i => i.type === 'bullish').length;
        const bearish = insights.filter(i => i.type === 'bearish').length;

        let mood = 'nötr';
        let emoji = '😐';
        if (bullish > bearish + 1) { mood = 'iyimser'; emoji = '😊'; }
        else if (bearish > bullish + 1) { mood = 'temkinli'; emoji = '😟'; }

        let text = `<p>${emoji} <strong>Genel Piyasa Havası: ${mood.charAt(0).toUpperCase() + mood.slice(1)}</strong></p>`;
        text += `<p>Bugün <strong>${insights.length}</strong> önemli gelişme, <strong>${opportunities.length}</strong> fırsat ve <strong>${warnings.length}</strong> uyarı tespit edildi.</p>`;

        if (bullish > 0) {
            text += `<p>📈 <strong>${bullish} pozitif sinyal</strong> — Yükseliş yönünde momentum var.</p>`;
        }
        if (bearish > 0) {
            text += `<p>📉 <strong>${bearish} negatif sinyal</strong> — Dikkatli olunması gereken alanlar mevcut.</p>`;
        }

        const dailyTip = FinanceKnowledge.getDailyTip();
        text += `<p style="margin-top: 12px; font-style: italic; color: var(--text-accent);">${dailyTip.icon} ${dailyTip.tip}</p>`;

        return text;
    },

    /**
     * Korelasyon analizi
     */
    _analyzeCorrelations(marketData, cryptoData, forexData, commodityData) {
        const correlations = [];

        // BTC vs S&P 500
        if (marketData?.sp500 && cryptoData?.length > 0) {
            const btc = cryptoData.find(c => c.id === 'bitcoin');
            if (btc) {
                const sp500Change = marketData.sp500.changePercent || 0;
                const btcChange = btc.change24h || 0;
                const sameDirection = (sp500Change > 0 && btcChange > 0) || (sp500Change < 0 && btcChange < 0);
                correlations.push({
                    pair: 'BTC ↔ S&P 500',
                    correlation: sameDirection ? 0.7 : -0.3,
                    type: sameDirection ? 'positive' : 'negative',
                    note: sameDirection ? 'Aynı yönde hareket ediyor' : 'Ters yönde hareket ediyor'
                });
            }
        }

        // Altın vs Dolar
        if (commodityData?.gold && forexData) {
            const goldChange = commodityData.gold?.changePercent || 0;
            const dollarStrong = (forexData.usdtry_change || 0) > 0;
            correlations.push({
                pair: 'Altın ↔ USD',
                correlation: dollarStrong && goldChange < 0 ? -0.6 : goldChange > 0 && !dollarStrong ? -0.5 : 0.2,
                type: dollarStrong && goldChange < 0 ? 'negative' : 'positive',
                note: 'Klasik ters korelasyon'
            });
        }

        // BIST vs USD/TRY
        if (marketData?.xu100 && forexData) {
            const bistUp = (marketData.xu100?.changePercent || 0) > 0;
            const tlDown = (forexData.usdtry_change || 0) > 0;
            correlations.push({
                pair: 'BIST 100 ↔ USD/TRY',
                correlation: bistUp && tlDown ? -0.5 : bistUp && !tlDown ? 0.3 : -0.4,
                type: bistUp && tlDown ? 'negative' : 'positive',
                note: 'TL zayıflığı BIST\'i olumsuz etkiler'
            });
        }

        // Petrol vs piyasalar
        if (commodityData?.oil) {
            const oilChange = commodityData.oil?.changePercent || 0;
            correlations.push({
                pair: 'Petrol ↔ Enflasyon',
                correlation: oilChange > 2 ? 0.8 : oilChange < -2 ? 0.3 : 0.5,
                type: 'positive',
                note: oilChange > 2 ? 'Yükselen petrol enflasyonu artırır' : 'Stabil petrol fiyatı'
            });
        }

        return correlations;
    }
};
