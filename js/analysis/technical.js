// ========================================
// TECHNICAL ANALYSIS — RSI, MACD, SMA, Bollinger
// ========================================
const TechnicalAnalysis = {

    /**
     * RSI (Relative Strength Index) hesapla
     */
    calculateRSI(closes, period = 14) {
        if (!closes || closes.length < period + 1) return null;

        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
            avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    },

    /**
     * SMA (Simple Moving Average) hesapla
     */
    calculateSMA(closes, period) {
        if (!closes || closes.length < period) return null;
        const slice = closes.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / period;
    },

    /**
     * EMA (Exponential Moving Average) hesapla
     */
    calculateEMA(closes, period) {
        if (!closes || closes.length < period) return null;
        const k = 2 / (period + 1);
        let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < closes.length; i++) {
            ema = closes[i] * k + ema * (1 - k);
        }
        return ema;
    },

    /**
     * MACD hesapla
     */
    calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
        if (!closes || closes.length < slow + signal) return null;

        // MACD Line = EMA(12) - EMA(26)
        const emaFast = this._emaArray(closes, fast);
        const emaSlow = this._emaArray(closes, slow);

        if (!emaFast || !emaSlow) return null;

        const macdLine = [];
        const startIdx = slow - fast;
        for (let i = startIdx; i < emaFast.length; i++) {
            macdLine.push(emaFast[i] - emaSlow[i - startIdx]);
        }

        // Signal Line = EMA(9) of MACD Line
        const signalLine = this._emaArrayFromValues(macdLine, signal);

        if (!signalLine || signalLine.length === 0) return null;

        const lastMACD = macdLine[macdLine.length - 1];
        const lastSignal = signalLine[signalLine.length - 1];
        const histogram = lastMACD - lastSignal;

        return {
            macd: lastMACD,
            signal: lastSignal,
            histogram: histogram,
            bullish: histogram > 0,
            crossover: macdLine.length >= 2 && signalLine.length >= 2 &&
                macdLine[macdLine.length - 2] < signalLine[signalLine.length - 2] &&
                lastMACD > lastSignal
        };
    },

    /**
     * Bollinger Bands hesapla
     */
    calculateBollingerBands(closes, period = 20, stdDev = 2) {
        if (!closes || closes.length < period) return null;

        const sma = this.calculateSMA(closes, period);
        const slice = closes.slice(-period);
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
        const std = Math.sqrt(variance);

        const currentPrice = closes[closes.length - 1];
        const upper = sma + (stdDev * std);
        const lower = sma - (stdDev * std);
        const bandwidth = ((upper - lower) / sma) * 100;
        const percentB = (currentPrice - lower) / (upper - lower);

        return {
            upper,
            middle: sma,
            lower,
            bandwidth,
            percentB,
            squeeze: bandwidth < 5,
            currentPrice
        };
    },

    /**
     * Tüm teknik göstergeleri hesapla
     */
    analyzeAll(data) {
        if (!data || !data.history || !data.history.closes) return null;

        const closes = data.history.closes;
        const rsi = this.calculateRSI(closes);
        const macd = this.calculateMACD(closes);
        const sma50 = this.calculateSMA(closes, 50);
        const sma200 = this.calculateSMA(closes, 200);
        const sma20 = this.calculateSMA(closes, 20);
        const ema12 = this.calculateEMA(closes, 12);
        const bb = this.calculateBollingerBands(closes);
        const currentPrice = closes[closes.length - 1];

        // Sinyaller
        const signals = [];

        // RSI sinyalleri
        if (rsi != null) {
            if (rsi < 30) signals.push({ type: 'bullish', name: 'RSI Aşırı Satım', detail: `RSI: ${rsi.toFixed(1)}` });
            else if (rsi > 70) signals.push({ type: 'bearish', name: 'RSI Aşırı Alım', detail: `RSI: ${rsi.toFixed(1)}` });
        }

        // MACD sinyalleri
        if (macd) {
            if (macd.crossover) signals.push({ type: 'bullish', name: 'MACD Crossover', detail: 'MACD sinyal çizgisini yukarı kesti' });
            if (macd.bullish) signals.push({ type: 'bullish', name: 'MACD Pozitif', detail: `Histogram: ${macd.histogram.toFixed(2)}` });
            else signals.push({ type: 'bearish', name: 'MACD Negatif', detail: `Histogram: ${macd.histogram.toFixed(2)}` });
        }

        // SMA sinyalleri
        if (sma50 && sma200) {
            if (sma50 > sma200) signals.push({ type: 'bullish', name: 'Golden Cross', detail: 'SMA50 > SMA200' });
            else signals.push({ type: 'bearish', name: 'Death Cross', detail: 'SMA50 < SMA200' });
        }

        if (currentPrice && sma50) {
            if (currentPrice > sma50) signals.push({ type: 'bullish', name: 'Fiyat > SMA50', detail: `Fiyat SMA50 üzerinde` });
            else signals.push({ type: 'bearish', name: 'Fiyat < SMA50', detail: `Fiyat SMA50 altında` });
        }

        // Bollinger sinyalleri
        if (bb) {
            if (bb.percentB < 0) signals.push({ type: 'bullish', name: 'BB Alt Band Altı', detail: 'Fiyat alt Bollinger bandı altında' });
            if (bb.percentB > 1) signals.push({ type: 'bearish', name: 'BB Üst Band Üstü', detail: 'Fiyat üst Bollinger bandı üstünde' });
            if (bb.squeeze) signals.push({ type: 'neutral', name: 'BB Squeeze', detail: 'Volatilite düşük, kırılım bekleniyor' });
        }

        return {
            rsi, macd, sma50, sma200, sma20, ema12, bb,
            currentPrice,
            signals,
            overallSignal: this._computeOverallSignal(signals)
        };
    },

    /**
     * Genel sinyal hesapla
     */
    _computeOverallSignal(signals) {
        let bull = 0, bear = 0;
        signals.forEach(s => {
            if (s.type === 'bullish') bull++;
            else if (s.type === 'bearish') bear++;
        });

        if (bull > bear + 1) return { signal: 'bullish', label: 'Yükseliş', strength: bull / (bull + bear) };
        if (bear > bull + 1) return { signal: 'bearish', label: 'Düşüş', strength: bear / (bull + bear) };
        return { signal: 'neutral', label: 'Nötr', strength: 0.5 };
    },

    // Helper: EMA dizisi oluştur
    _emaArray(data, period) {
        if (data.length < period) return null;
        const result = [];
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push(ema);
        const k = 2 / (period + 1);
        for (let i = period; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            result.push(ema);
        }
        return result;
    },

    _emaArrayFromValues(data, period) {
        if (data.length < period) return null;
        const result = [];
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push(ema);
        const k = 2 / (period + 1);
        for (let i = period; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            result.push(ema);
        }
        return result;
    }
};
