// ========================================
// SCORING — İlgi skoru hesaplama
// ========================================
const Scoring = {
    /**
     * Varlık için skor hesapla (0-100)
     */
    calculateScore(data) {
        let score = 50; // Başlangıç nötr
        let factors = [];

        // Teknik analiz sinyalleri
        if (data.technicals) {
            const t = data.technicals;

            // RSI
            if (t.rsi != null) {
                if (t.rsi < 30) { score += 15; factors.push('RSI aşırı satım (+15)'); }
                else if (t.rsi < 40) { score += 8; factors.push('RSI düşük (+8)'); }
                else if (t.rsi > 70) { score -= 15; factors.push('RSI aşırı alım (-15)'); }
                else if (t.rsi > 60) { score -= 5; factors.push('RSI yüksek (-5)'); }
            }

            // MACD
            if (t.macd) {
                if (t.macd.crossover) { score += 12; factors.push('MACD crossover (+12)'); }
                if (t.macd.bullish) { score += 5; factors.push('MACD pozitif (+5)'); }
                else { score -= 5; factors.push('MACD negatif (-5)'); }
            }

            // SMA trend
            if (t.sma50 && t.currentPrice) {
                if (t.currentPrice > t.sma50) { score += 8; factors.push('Fiyat > SMA50 (+8)'); }
                else { score -= 8; factors.push('Fiyat < SMA50 (-8)'); }
            }

            // Golden/Death Cross
            if (t.sma50 && t.sma200) {
                if (t.sma50 > t.sma200) { score += 10; factors.push('Golden Cross (+10)'); }
                else { score -= 10; factors.push('Death Cross (-10)'); }
            }

            // Bollinger
            if (t.bb) {
                if (t.bb.percentB < 0.1) { score += 10; factors.push('BB alt band yakını (+10)'); }
                if (t.bb.percentB > 0.9) { score -= 10; factors.push('BB üst band yakını (-10)'); }
            }
        }

        // Momentum (fiyat değişimi)
        if (data.changePercent != null) {
            if (data.changePercent > 3) { score += 5; factors.push('Güçlü momentum (+5)'); }
            else if (data.changePercent < -3) { score -= 5; factors.push('Zayıf momentum (-5)'); }
        }

        // Hacim
        if (data.volumeRatio) {
            if (data.volumeRatio > 2) { score += 5; factors.push('Yüksek hacim (+5)'); }
            else if (data.volumeRatio < 0.5) { score -= 3; factors.push('Düşük hacim (-3)'); }
        }

        // Sınırla 0-100
        score = Math.max(0, Math.min(100, Math.round(score)));

        return {
            score,
            factors,
            label: score >= 70 ? 'Güçlü' : score >= 50 ? 'Nötr' : 'Zayıf',
            color: score >= 70 ? 'high' : score >= 50 ? 'mid' : 'low'
        };
    }
};
