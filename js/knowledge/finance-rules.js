// ========================================
// KNOWLEDGE BASE — Finans kuralları ve prensipler
// ========================================
const FinanceKnowledge = {
    rules: [
        // === DEĞER YATIRIMI ===
        {
            id: 'buffett_value',
            category: 'value',
            name: 'Değer Yatırımı Fırsatı',
            description: 'Düşük P/E ve P/B oranı olan, borç yükü az şirketler potansiyel değer yatırımı fırsatıdır.',
            condition: (data) => data.pe && data.pe < 15 && data.pb && data.pb < 1.5,
            weight: 25,
            source: 'Benjamin Graham — Akıllı Yatırımcı'
        },
        {
            id: 'margin_of_safety',
            category: 'value',
            name: 'Güvenlik Marjı',
            description: 'Fiyat, hesaplanan gerçek değerinin %30+ altındaysa güvenlik marjı yeterlidir.',
            condition: (data) => data.discount && data.discount > 30,
            weight: 20,
            source: 'Benjamin Graham — Güvenlik Marjı Prensibi'
        },

        // === TEKNİK ANALİZ ===
        {
            id: 'rsi_oversold_volume',
            category: 'technical',
            name: 'Aşırı Satım + Hacim Artışı',
            description: 'RSI 30 altında ve hacim ortalamanın 1.5 katı üzerindeyse alım fırsatı olabilir.',
            condition: (data) => data.rsi && data.rsi < 30 && data.volumeRatio > 1.5,
            weight: 20,
            source: 'Teknik Analiz — RSI Stratejisi'
        },
        {
            id: 'rsi_overbought',
            category: 'technical',
            name: 'Aşırı Alım Uyarısı',
            description: 'RSI 70 üzerindeyse aşırı alım bölgesinde. Düzeltme gelebilir.',
            condition: (data) => data.rsi && data.rsi > 70,
            weight: 15,
            source: 'Teknik Analiz — RSI'
        },
        {
            id: 'golden_cross',
            category: 'technical',
            name: 'Golden Cross Sinyali',
            description: 'SMA50 SMA200\'ü yukarı kestiğinde uzun vadeli yükseliş trendi başlayabilir.',
            condition: (data) => data.sma50 && data.sma200 && data.sma50 > data.sma200,
            weight: 15,
            source: 'John Murphy — Technical Analysis of Financial Markets'
        },
        {
            id: 'death_cross',
            category: 'technical',
            name: 'Death Cross Uyarısı',
            description: 'SMA50 SMA200\'ün altına düştüğünde uzun vadeli düşüş sinyali.',
            condition: (data) => data.sma50 && data.sma200 && data.sma50 < data.sma200,
            weight: 15,
            source: 'John Murphy — Technical Analysis of Financial Markets'
        },
        {
            id: 'macd_crossover',
            category: 'technical',
            name: 'MACD Alım Sinyali',
            description: 'MACD sinyal çizgisini yukarı kesmesi momentum değişimi gösterir.',
            condition: (data) => data.macd && data.macd.crossover,
            weight: 18,
            source: 'Gerald Appel — MACD Stratejisi'
        },
        {
            id: 'bollinger_squeeze',
            category: 'technical',
            name: 'Bollinger Squeeze — Kırılım Beklentisi',
            description: 'Bollinger bantları daraldığında büyük bir fiyat hareketi beklenir.',
            condition: (data) => data.bb && data.bb.squeeze,
            weight: 12,
            source: 'John Bollinger — Bollinger on Bollinger Bands'
        },

        // === BİLANÇO / TEMEL ANALİZ ===
        {
            id: 'earnings_surprise',
            category: 'fundamental',
            name: 'Bilanço Sürprizi',
            description: 'EPS beklentinin %10 üzerinde gelirse pozitif momentum oluşur.',
            condition: (data) => data.epsSurprise && data.epsSurprise > 10,
            weight: 20,
            source: 'Earnings Momentum Stratejisi'
        },
        {
            id: 'earnings_miss',
            category: 'fundamental',
            name: 'Bilanço Hayal Kırıklığı',
            description: 'EPS beklentinin altında kalırsa satış baskısı gelebilir.',
            condition: (data) => data.epsSurprise && data.epsSurprise < -5,
            weight: 15,
            source: 'Earnings Momentum Stratejisi'
        },

        // === MAKRO / KORELASYON ===
        {
            id: 'gold_dollar_inverse',
            category: 'macro',
            name: 'Altın-Dolar Ters Korelasyon',
            description: 'Dolar zayıfladığında altın genellikle yükselir. Bu korelasyon bozulursa dikkat edin.',
            condition: (data) => data.dollarDown && data.goldUp,
            weight: 10,
            source: 'Makroekonomik Korelasyonlar'
        },
        {
            id: 'fear_greed',
            category: 'macro',
            name: 'Korku & Açgözlülük',
            description: '"Herkes korkarken al, herkes açgözlü olduğunda sat." - Warren Buffett',
            condition: (data) => data.marketFear,
            weight: 15,
            source: 'Warren Buffett'
        },
        {
            id: 'diversification',
            category: 'risk',
            name: 'Çeşitlendirme Hatırlatması',
            description: 'Tek bir varlık sınıfına %30\'dan fazla yatırım yapmayın.',
            condition: () => true, // Her zaman geçerli
            weight: 5,
            source: 'Modern Portföy Teorisi — Harry Markowitz'
        },

        // === KRİPTO ===
        {
            id: 'btc_dominance_shift',
            category: 'crypto',
            name: 'BTC Dominans Değişimi',
            description: 'BTC dominansı düşerken altcoinler yükselir (Altcoin Season).',
            condition: (data) => data.btcDominance && data.btcDominance < 40,
            weight: 12,
            source: 'Kripto Piyasa Dinamikleri'
        },
        {
            id: 'crypto_fear',
            category: 'crypto',
            name: 'Kripto Korku Endeksi',
            description: 'Extreme Fear bölgesinde tarihsel olarak en iyi alım fırsatları oluşur.',
            condition: (data) => data.cryptoFearIndex && data.cryptoFearIndex < 25,
            weight: 15,
            source: 'Kripto Piyasa Psikolojisi'
        }
    ],

    /**
     * Bilgi tabanından rastgele ipucu seç
     */
    getRandomInsights(count = 3) {
        const shuffled = [...this.rules].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    },

    /**
     * Kategori bazlı kurallar
     */
    getByCategory(category) {
        return this.rules.filter(r => r.category === category);
    },

    /**
     * Bilgi tabanı günlük ipuçları
     */
    dailyTips: [
        { icon: '📖', tip: 'Bir yatırımı anlamadıysanız, yapmayın. — Warren Buffett', category: 'wisdom' },
        { icon: '📊', tip: 'Bilanço dönemleri öncesi pozisyon almak risklidir. Sonuçları bekleyin.', category: 'timing' },
        { icon: '🔄', tip: 'Piyasa %10 düşünce panik satış yapmayın. Bu sağlıklı bir düzeltmedir.', category: 'psychology' },
        { icon: '📉', tip: 'Düşen bir trende karşı pozisyon almak, düşen bıçağı tutmaya benzer.', category: 'technical' },
        { icon: '💰', tip: 'Yatırım yapmadan önce en az 6 aylık acil durum fonu oluşturun.', category: 'planning' },
        { icon: '🌍', tip: 'Gelişmiş ve gelişmekte olan piyasalar arasında denge kurun.', category: 'diversification' },
        { icon: '📈', tip: '"Trend senin arkadaşın" — Trende karşı işlem yapmaktan kaçının.', category: 'technical' },
        { icon: '⏰', tip: 'Time in the market > Timing the market. Uzun vadeli düşünün.', category: 'strategy' },
        { icon: '🧮', tip: 'Bileşik getiri mucizesi: Yıllık %10 getiri, 20 yılda paranızı 6.7x yapar.', category: 'math' },
        { icon: '🛡️', tip: 'Stop-loss emirleri kullanarak riskinizi yönetin. Kaybınızı sınırlayın.', category: 'risk' }
    ],

    /**
     * Günlük ipucu getir
     */
    getDailyTip() {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return this.dailyTips[dayOfYear % this.dailyTips.length];
    }
};
