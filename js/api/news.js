// ========================================
// NEWS API — Finansal haber akışı
// RSS (ücretsiz, birincil) + NewsAPI.org (opsiyonel) + demo fallback
// ========================================
const NewsAPI = {
    BASE_URL: '/api/news',
    RSS_URL: '/api/rss-news',

    CATEGORIES: {
        market: 'stock market OR borsa OR S&P 500 OR NASDAQ',
        crypto: 'bitcoin OR ethereum OR cryptocurrency OR kripto',
        commodity: 'gold price OR oil price OR commodity OR altın',
        turkey: 'Turkey economy OR BIST OR Türkiye ekonomi',
        general: 'finance OR investing OR economy'
    },

    /**
     * Finansal haberleri çek
     * Öncelik: RSS → NewsAPI (key varsa) → Demo
     */
    async fetchNews(category = 'general', pageSize = 8) {
        const cacheKey = `news_${category}_${pageSize}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        // 1) RSS dene (ücretsiz, API key gerektirmez)
        try {
            const rssArticles = await this._fetchRSS(category, pageSize);
            if (rssArticles && rssArticles.length > 0) {
                Cache.set(cacheKey, rssArticles, 15 * 60 * 1000);
                return rssArticles;
            }
        } catch (e) {
            console.warn('RSS haberleri başarısız:', e.message);
        }

        // 2) NewsAPI dene (API key varsa)
        const apiKey = Storage.getApiKeys()?.newsapi;
        if (apiKey) {
            try {
                const newsApiArticles = await this._fetchNewsAPI(category, pageSize, apiKey);
                if (newsApiArticles && newsApiArticles.length > 0) {
                    Cache.set(cacheKey, newsApiArticles, 15 * 60 * 1000);
                    return newsApiArticles;
                }
            } catch (e) {
                console.warn('NewsAPI başarısız:', e.message);
            }
        }

        // 3) Demo haberlere düş
        console.warn('Canlı haber kaynakları başarısız, demo haberler gösteriliyor');
        return this._getDemoNews(category);
    },

    /**
     * RSS feed'den haberleri çek
     */
    async _fetchRSS(category, limit = 8) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${this.RSS_URL}/${category}?limit=${limit}`, {
            signal: controller.signal
        });
        clearTimeout(timer);

        if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);

        const data = await response.json();
        if (!data.articles || data.articles.length === 0) return [];

        return data.articles.map(article => ({
            title: article.title,
            description: article.description || '',
            url: article.link,
            source: article.source || 'News',
            image: null,
            publishedAt: article.pubDate || new Date().toISOString(),
            timeAgo: this._timeAgo(article.pubDate),
            category: category,
            sentiment: this._quickSentiment(article.title + ' ' + (article.description || ''))
        }));
    },

    /**
     * NewsAPI'den haberleri çek (API key gerektirir)
     */
    async _fetchNewsAPI(category, pageSize, apiKey) {
        const query = this.CATEGORIES[category] || this.CATEGORIES.general;
        const url = `${this.BASE_URL}/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${apiKey}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
            if (response.status === 401) {
                Notifications.show('NewsAPI anahtarı geçersiz. Ayarlardan kontrol edin.', 'error');
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        return (data.articles || [])
            .filter(a => a.title && a.title !== '[Removed]')
            .map(article => ({
                title: article.title,
                description: article.description || '',
                url: article.url,
                source: article.source?.name || 'Bilinmiyor',
                image: article.urlToImage,
                publishedAt: article.publishedAt,
                timeAgo: this._timeAgo(article.publishedAt),
                category: category,
                sentiment: this._quickSentiment(article.title + ' ' + (article.description || ''))
            }));
    },

    /**
     * Tüm kategorilerden haber çek
     */
    async fetchAllCategories() {
        const cacheKey = 'news_all';
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        const categories = ['market', 'crypto', 'turkey', 'commodity'];
        const promises = categories.map(cat => this.fetchNews(cat, 5));
        const results = await Promise.allSettled(promises);

        const allNews = {};
        results.forEach((result, i) => {
            allNews[categories[i]] = result.status === 'fulfilled' ? result.value : [];
        });

        // Mixed feed — tüm haberleri tarihe göre sırala
        const mixed = Object.values(allNews)
            .flat()
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
            .slice(0, 15);

        allNews.mixed = mixed;

        Cache.set(cacheKey, allNews, 15 * 60 * 1000);
        return allNews;
    },

    /**
     * Basit duygu analizi (keyword-based)
     */
    _quickSentiment(text) {
        if (!text) return 'neutral';
        const lower = text.toLowerCase();

        const bullish = ['surge', 'soar', 'rally', 'jump', 'gain', 'high', 'record', 'bull', 'rise', 'growth',
            'positive', 'beat', 'exceed', 'profit', 'boom', 'yüksel', 'rekor', 'artış', 'kazanç'];
        const bearish = ['crash', 'drop', 'fall', 'plunge', 'decline', 'loss', 'bear', 'fear', 'crisis', 'recession',
            'inflation', 'warn', 'risk', 'sell', 'dump', 'düş', 'kayıp', 'kriz', 'risk', 'uyarı'];

        let score = 0;
        bullish.forEach(w => { if (lower.includes(w)) score++; });
        bearish.forEach(w => { if (lower.includes(w)) score--; });

        if (score > 0) return 'bullish';
        if (score < 0) return 'bearish';
        return 'neutral';
    },

    /**
     * Zaman farkı hesapla
     */
    _timeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 1) return 'Az önce';
        if (diffMin < 60) return `${diffMin} dk önce`;
        if (diffHour < 24) return `${diffHour} saat önce`;
        if (diffDay < 7) return `${diffDay} gün önce`;
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    },

    /**
     * Demo haber verisi
     */
    _getDemoNews(category = 'general') {
        const now = new Date();

        const demoSets = {
            market: [
                { title: 'S&P 500 Yeni Rekor Seviyeye Yaklaştı', desc: 'Fed\'in faiz kararı beklentisiyle ABD borsaları yükselişe geçti. Teknoloji hisseleri rallinin öncüsü oldu.', source: 'Reuters', sentiment: 'bullish', hoursAgo: 1 },
                { title: 'NASDAQ 19.000 Psikolojik Direncini Test Ediyor', desc: 'Yapay zeka hisseleri NVIDIA ve Microsoft liderliğinde yükselirken, NASDAQ tarihi seviyelere ulaştı.', source: 'Bloomberg', sentiment: 'bullish', hoursAgo: 3 },
                { title: 'Avrupa Borsaları Karışık Kapandı', desc: 'ECB toplantısı öncesi belirsizlik devam ediyor. DAX yatay seyrederken, FTSE hafif geriledi.', source: 'CNBC', sentiment: 'neutral', hoursAgo: 5 },
                { title: 'Fed Yetkilileri Faiz İndirimi Konusunda Temkinli', desc: 'Fed üyeleri enflasyonun hedefin üzerinde seyretmesinden endişe duyduklarını belirtti.', source: 'Financial Times', sentiment: 'bearish', hoursAgo: 8 },
                { title: 'Küresel Piyasalarda İşlem Hacmi Artıyor', desc: 'Bilanço sezonu yaklaşırken yatırımcılar pozisyon alıyor. Volatilite endeksi (VIX) düşük seyrediyor.', source: 'MarketWatch', sentiment: 'neutral', hoursAgo: 12 }
            ],
            crypto: [
                { title: 'Bitcoin $95.000 Seviyesini Aştı', desc: 'Kurumsal yatırımcıların talebi ve ETF girişleri Bitcoin\'i yeni zirvelere taşıdı.', source: 'CoinDesk', sentiment: 'bullish', hoursAgo: 2 },
                { title: 'Ethereum 2.0 Güncellemesi Yaklaşıyor', desc: 'Ethereum ağında büyük güncelleme bekleniyor. Staking ödülleri artabilir.', source: 'The Block', sentiment: 'bullish', hoursAgo: 4 },
                { title: 'Kripto Düzenlemelerine Yeni Yaklaşım', desc: 'SEC\'in yeni başkanı kripto dostu bir tutum sergileyebileceğini ima etti.', source: 'Decrypt', sentiment: 'bullish', hoursAgo: 6 },
                { title: 'Altcoin Sezonu Başlıyor mu?', desc: 'Bitcoin dominansı düşerken, Solana ve Avalanche gibi altcoinlerde ciddi yükselişler gözleniyor.', source: 'CryptoSlate', sentiment: 'bullish', hoursAgo: 10 },
                { title: 'Kripto Borsalarından Büyük Çıkışlar', desc: 'Yatırımcılar kripto varlıklarını borsalardan soğuk cüzdanlara taşıyor — uzun vadeli tutma sinyali.', source: 'Glassnode', sentiment: 'neutral', hoursAgo: 15 }
            ],
            turkey: [
                { title: 'BIST 100 10.000 Puan Hedefliyor', desc: 'Yabancı yatırımcıların alımlarıyla BIST güçlü yükselişini sürdürüyor. Bankacılık hisseleri öncü.', source: 'Bloomberg HT', sentiment: 'bullish', hoursAgo: 1 },
                { title: 'Merkez Bankası Faiz Kararı Bekleniyor', desc: 'Piyasa faizlerde sabit kalma beklentisinde. Enflasyondaki düşüş trendi devam ediyor.', source: 'Ekonomist', sentiment: 'neutral', hoursAgo: 4 },
                { title: 'Türk Lirası Dolar Karşısında Stabil Seyrediyor', desc: 'Sıkı para politikası TL\'yi desteklemeye devam ediyor. USD/TRY 36 seviyesinde.', source: 'Dünya', sentiment: 'neutral', hoursAgo: 7 },
                { title: 'Türk Şirketlerinin Bilanço Beklentileri Olumlu', desc: 'Analistler 4. çeyrek bilançolarının güçlü gelmeÿini bekliyor. Sanayi ve enerji sektörü öne çıkıyor.', source: 'Para', sentiment: 'bullish', hoursAgo: 11 },
                { title: 'Yabancı Yatırımcılar BIST\'e Dönüyor', desc: 'Son haftalarda yabancı fonların Türk hisselerine olan ilgisi belirgin şekilde arttı.', source: 'AA Finans', sentiment: 'bullish', hoursAgo: 18 }
            ],
            commodity: [
                { title: 'Altın Fiyatları $2.950 ile Rekor Kırdı', desc: 'Jeopolitik riskler ve merkez bankası alımları altını yeni zirvelere taşıdı.', source: 'Kitco', sentiment: 'bullish', hoursAgo: 2 },
                { title: 'Petrol Fiyatları OPEC+ Kararıyla Yükseldi', desc: 'OPEC+ üretim kısıntısını sürdürme kararı aldı. Brent petrol $74 seviyesini gördü.', source: 'OilPrice', sentiment: 'bullish', hoursAgo: 5 },
                { title: 'Gümüş Endüstriyel Talep ile Yükselişte', desc: 'Güneş paneli üretimindeki artış gümüş talebini destekliyor.', source: 'Reuters', sentiment: 'bullish', hoursAgo: 9 },
                { title: 'Bakır Fiyatları Çin Talebiyle Artıyor', desc: 'Çin\'in altyapı yatırımları bakır ve demir cevheri fiyatlarını yükseltiyor.', source: 'Bloomberg', sentiment: 'bullish', hoursAgo: 14 },
                { title: 'Doğal Gaz Fiyatları Mevsimsel Düşüşe Girdi', desc: 'Kış mevsiminin sona yaklaşmasıyla doğal gaz fiyatlarında geri çekilme yaşanıyor.', source: 'Natural Gas Intel', sentiment: 'bearish', hoursAgo: 20 }
            ]
        };

        const articles = demoSets[category] || demoSets.market;

        return articles.map((a, i) => ({
            title: a.title,
            description: a.desc,
            url: '#',
            source: a.source,
            image: null,
            publishedAt: new Date(now.getTime() - a.hoursAgo * 3600000).toISOString(),
            timeAgo: this._timeAgo(new Date(now.getTime() - a.hoursAgo * 3600000).toISOString()),
            category: category,
            sentiment: a.sentiment,
            _isDemo: true
        }));
    }
};
