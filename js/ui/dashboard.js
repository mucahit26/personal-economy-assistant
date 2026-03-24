// ========================================
// DASHBOARD UI — Dashboard bileşenleri
// ========================================
const DashboardUI = {

    /**
     * Tüm dashboard'ı güncelle
     */
    async refresh() {
        console.log('🔄 Dashboard güncelleniyor...');

        try {
            // Paralel veri çek
            const [indices, cryptoCoins, forex, commodities] = await Promise.allSettled([
                MarketsAPI.fetchAllIndices(),
                CryptoAPI.fetchTopCoins(20),
                ForexAPI.fetchRates(),
                CommoditiesAPI.fetchMainCommodities()
            ]);

            const marketData = indices.status === 'fulfilled' ? indices.value : {};
            const cryptoData = cryptoCoins.status === 'fulfilled' ? cryptoCoins.value : [];
            const forexData = forex.status === 'fulfilled' ? forex.value : null;
            const commodityData = commodities.status === 'fulfilled' ? commodities.value : {};

            // UI güncelle
            this.updateMarketCards(marketData, cryptoData, commodityData);
            this.updateForexRow(forexData);
            this.updateCryptoList(cryptoData);
            this.updateTicker(marketData, cryptoData, forexData);
            this.updateLastUpdate();

            // Haberleri paralel yükle (dashboard'ı bloklama)
            NewsUI.loadNews();

            // Advisor analiza başlasın
            const analysis = await Advisor.generateDailyAnalysis(marketData, cryptoData, forexData, commodityData);
            this.updateAdvisorTips(analysis);

            // Advisor section da güncelle
            AdvisorUI.update(analysis);

            return { marketData, cryptoData, forexData, commodityData, analysis };
        } catch (error) {
            console.error('Dashboard refresh error:', error);
            Notifications.show('Veriler güncellenirken hata oluştu', 'error');
        }
    },

    /**
     * Market kartlarını güncelle
     */
    updateMarketCards(marketData, cryptoData, commodityData) {
        // US endeksler
        const indices = [
            { id: 'sp500', data: marketData?.sp500 },
            { id: 'nasdaq', data: marketData?.nasdaq },
            { id: 'dowjones', data: marketData?.dowjones },
            { id: 'xu100', data: marketData?.xu100 }
        ];

        indices.forEach(({ id, data }) => {
            if (data) {
                this._updateCard(id, data.price, data.changePercent, data.currency, data.history?.closes);
            }
        });

        // Kripto
        if (cryptoData && cryptoData.length > 0) {
            const btc = cryptoData.find(c => c.id === 'bitcoin');
            const eth = cryptoData.find(c => c.id === 'ethereum');

            if (btc) this._updateCard('btc', btc.price, btc.change24h, 'USD', btc.sparkline);
            if (eth) this._updateCard('eth', eth.price, eth.change24h, 'USD', eth.sparkline);
        }

        // Emtia
        if (commodityData) {
            if (commodityData.gold) this._updateCard('gold', commodityData.gold.price, commodityData.gold.changePercent, 'USD', commodityData.gold.history?.closes);
            if (commodityData.oil) this._updateCard('oil', commodityData.oil.price, commodityData.oil.changePercent, 'USD', commodityData.oil.history?.closes);
        }
    },

    /**
     * Tek kart güncelle
     */
    _updateCard(id, price, changePercent, currency = 'USD', sparklineData) {
        const priceEl = document.getElementById(`${id}-price`);
        const changeEl = document.getElementById(`${id}-change`);
        const sparkCanvas = document.getElementById(`${id}-spark`);

        if (priceEl) {
            priceEl.textContent = currency === 'TRY' ?
                Formatters.tryFormat(price, 0) :
                Formatters.price(price);
            priceEl.classList.add('animate-value');
            setTimeout(() => priceEl.classList.remove('animate-value'), 500);
        }

        if (changeEl) {
            changeEl.textContent = Formatters.percent(changePercent);
            changeEl.className = `card-change ${changePercent >= 0 ? 'up' : 'down'}`;
        }

        if (sparkCanvas && sparklineData && sparklineData.length > 2) {
            Charts.drawSparkline(`${id}-spark`, sparklineData, changePercent >= 0);
        }
    },

    /**
     * Döviz satırını güncelle
     */
    updateForexRow(forex) {
        if (!forex) return;

        const pairs = [
            { id: 'usdtry', rate: forex.usdtry, change: forex.usdtry_change },
            { id: 'eurtry', rate: forex.eurtry, change: forex.eurtry_change },
            { id: 'gbptry', rate: forex.gbptry, change: forex.gbptry_change },
            { id: 'eurusd', rate: forex.eurusd, change: forex.eurusd_change }
        ];

        pairs.forEach(({ id, rate, change }) => {
            const rateEl = document.getElementById(`${id}-rate`);
            const changeEl = document.getElementById(`${id}-change`);

            if (rateEl && rate) {
                rateEl.textContent = Formatters.number(rate, 4);
            }
            if (changeEl && change != null) {
                changeEl.textContent = Formatters.percent(change);
                changeEl.className = `forex-change ${change >= 0 ? 'up' : 'down'}`;
            }
        });
    },

    /**
     * Kripto listesini güncelle
     */
    updateCryptoList(coins) {
        const list = document.getElementById('cryptoTopList');
        if (!list || !coins || coins.length === 0) return;

        list.innerHTML = coins.slice(0, 10).map(coin => `
            <div class="crypto-item">
                <div class="crypto-item-left">
                    <span class="crypto-rank">#${coin.rank}</span>
                    <img class="crypto-icon" src="${coin.image}" alt="${coin.name}" loading="lazy">
                    <span class="crypto-name">${coin.name}<span class="crypto-symbol">${coin.symbol}</span></span>
                </div>
                <div class="crypto-item-right">
                    <div class="crypto-price-val">${Formatters.price(coin.price)}</div>
                    <div class="crypto-change-val ${coin.change24h >= 0 ? 'up' : 'down'}">
                        ${Formatters.percent(coin.change24h)}
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Ticker bar güncelle
     */
    updateTicker(marketData, cryptoData, forex) {
        const content = document.getElementById('tickerContent');
        if (!content) return;

        const items = [];

        // Endeksler
        if (marketData?.sp500) {
            items.push(this._tickerItem('S&P 500', marketData.sp500.price, marketData.sp500.changePercent, 'USD'));
        }
        if (marketData?.nasdaq) {
            items.push(this._tickerItem('NASDAQ', marketData.nasdaq.price, marketData.nasdaq.changePercent, 'USD'));
        }
        if (marketData?.xu100) {
            items.push(this._tickerItem('BIST 100', marketData.xu100.price, marketData.xu100.changePercent, 'TRY'));
        }

        // Kripto
        if (cryptoData && cryptoData.length > 0) {
            const topCoins = cryptoData.slice(0, 5);
            topCoins.forEach(coin => {
                items.push(this._tickerItem(coin.symbol, coin.price, coin.change24h, 'USD'));
            });
        }

        // Döviz
        if (forex) {
            items.push(this._tickerItem('USD/TRY', forex.usdtry, forex.usdtry_change));
            items.push(this._tickerItem('EUR/TRY', forex.eurtry, forex.eurtry_change));
        }

        // Ticker'ı iki kere koy (sonsuz döngü)
        const html = items.join('');
        content.innerHTML = html + html;
    },

    _tickerItem(name, price, change, currency) {
        const pctClass = change >= 0 ? 'up' : 'down';
        const priceStr = currency === 'TRY' ? Formatters.tryFormat(price, 0) : Formatters.price(price);
        return `
            <span class="ticker-item">
                <span class="ticker-name">${name}</span>
                <span class="ticker-price">${priceStr}</span>
                <span class="ticker-pct ${pctClass}">${Formatters.percent(change)}</span>
            </span>
        `;
    },

    /**
     * Advisor ipuçlarını güncelle (dashboard panel)
     */
    updateAdvisorTips(analysis) {
        const panel = document.getElementById('advisorTips');
        if (!panel || !analysis) return;

        const tips = analysis.insights.slice(0, 4);
        if (tips.length === 0) {
            panel.innerHTML = '<div class="tip-card tip-info"><div class="tip-header"><span class="tip-icon">ℹ️</span><span class="tip-title">Henüz yeterli veri yok</span></div><div class="tip-body">Veriler yüklendiğinde öneriler burada görünecek.</div></div>';
            return;
        }

        panel.innerHTML = tips.map(tip => {
            const typeClass = tip.type === 'bullish' ? 'tip-bullish' :
                tip.type === 'bearish' ? 'tip-bearish' : 'tip-neutral';
            return `
                <div class="tip-card ${typeClass}">
                    <div class="tip-header">
                        <span class="tip-icon">${tip.icon}</span>
                        <span class="tip-title">${tip.title}</span>
                    </div>
                    <div class="tip-body">${tip.body}</div>
                    <div class="tip-source">${tip.source}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Son güncelleme saatini göster
     */
    updateLastUpdate() {
        const el = document.getElementById('lastUpdate');
        if (el) {
            el.textContent = `Son güncelleme: ${Formatters.time()}`;
        }
    }
};

// ========================================
// ADVISOR UI — Advisor bölüm bileşenleri
// ========================================
const AdvisorUI = {
    update(analysis) {
        if (!analysis) return;

        // Özet
        const summaryEl = document.getElementById('advisorSummary');
        if (summaryEl) {
            summaryEl.innerHTML = analysis.summary;
        }

        // Tarih
        const dateEl = document.getElementById('advisorDate');
        if (dateEl) {
            dateEl.textContent = Formatters.todayLong();
        }

        // Fırsatlar
        this.updateOpportunities(analysis.opportunities);

        // Bilgi tabanı  
        this.updateKnowledge(analysis.knowledgeTips);

        // Korelasyonlar
        this.updateCorrelations(analysis.correlations);
    },

    updateOpportunities(items) {
        const grid = document.getElementById('opportunityGrid');
        if (!grid) return;

        if (!items || items.length === 0) {
            grid.innerHTML = '<div class="glass-card" style="padding: 24px; text-align: center; color: var(--text-muted);">Şu an belirgin bir fırsat veya uyarı tespit edilmedi.</div>';
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="opportunity-card glass-card ${item.type}">
                <div class="opp-header">
                    <span class="opp-icon">${item.icon}</span>
                    <span class="opp-title">${item.title}</span>
                    <span class="opp-score" style="background: ${item.type === 'opportunity' ? 'var(--green-bg)' : item.type === 'warning' ? 'var(--red-bg)' : 'var(--yellow-bg)'}; color: ${item.type === 'opportunity' ? 'var(--green)' : item.type === 'warning' ? 'var(--red)' : 'var(--yellow)'};">${item.score}</span>
                </div>
                <div class="opp-body">${item.body}</div>
                ${item.tags ? `<div class="opp-tags">${item.tags.map(t => `<span class="opp-tag">${t}</span>`).join('')}</div>` : ''}
            </div>
        `).join('');
    },

    updateKnowledge(tips) {
        const panel = document.getElementById('knowledgeInsights');
        if (!panel || !tips) return;

        panel.innerHTML = tips.map(rule => `
            <div class="knowledge-item">
                <div class="ki-icon">📚</div>
                <div class="ki-content">
                    <div class="ki-title">${rule.name}</div>
                    <div class="ki-text">${rule.description}</div>
                    <div class="ki-source">Kaynak: ${rule.source}</div>
                </div>
            </div>
        `).join('');
    },

    updateCorrelations(correlations) {
        const panel = document.getElementById('correlationPanel');
        if (!panel || !correlations) return;

        if (correlations.length === 0) {
            panel.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">Korelasyon verisi yükleniyor...</div>';
            return;
        }

        panel.innerHTML = correlations.map(c => {
            const absCorr = Math.abs(c.correlation);
            const widthPct = Math.round(absCorr * 100);
            return `
                <div class="corr-item">
                    <span class="corr-pair">${c.pair}</span>
                    <div class="corr-bar">
                        <div class="corr-bar-fill ${c.type}" style="width: ${widthPct}%"></div>
                    </div>
                    <span class="corr-value" style="color: ${c.type === 'positive' ? 'var(--green)' : 'var(--red)'}">
                        ${c.correlation > 0 ? '+' : ''}${c.correlation.toFixed(2)}
                    </span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 8px; padding-left: 4px;">${c.note}</div>
            `;
        }).join('');
    }
};

// ========================================
// NEWS UI — Haber paneli bileşenleri
// ========================================
const NewsUI = {
    allNews: null,
    currentCategory: 'mixed',

    /**
     * Haberleri yükle ve tab'ları kur
     */
    async loadNews() {
        try {
            this.allNews = await NewsAPI.fetchAllCategories();
            this.renderNews(this.currentCategory);
            this.setupTabs();
        } catch (e) {
            console.error('News loading error:', e);
        }
    },

    /**
     * Tab event listener'ları kur
     */
    setupTabs() {
        document.querySelectorAll('.news-tab[data-news-cat]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.newsCat;
                this.renderNews(this.currentCategory);
            });
        });
    },

    /**
     * Haberleri render et
     */
    renderNews(category) {
        const list = document.getElementById('newsList');
        if (!list || !this.allNews) return;

        const articles = this.allNews[category] || [];

        if (articles.length === 0) {
            list.innerHTML = '<div class="loading-placeholder">Bu kategoride haber bulunamadı.</div>';
            return;
        }

        list.innerHTML = articles.map(article => {
            const sentimentLabel = article.sentiment === 'bullish' ? 'Pozitif' :
                article.sentiment === 'bearish' ? 'Negatif' : 'Nötr';
            return `
                <a class="news-item sentiment-${article.sentiment}" href="${article.url}" target="_blank" rel="noopener">
                    <div class="news-item-content">
                        <div class="news-title">${article.title}</div>
                        <div class="news-desc">${article.description}</div>
                        <div class="news-meta">
                            <span class="news-source">${article.source}</span>
                            <span>•</span>
                            <span>${article.timeAgo}</span>
                            <span class="news-sentiment-badge ${article.sentiment}">${sentimentLabel}</span>
                        </div>
                    </div>
                    ${article.image ? `<img class="news-image" src="${article.image}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
                </a>
            `;
        }).join('');
    }
};
