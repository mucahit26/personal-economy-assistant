// ========================================
// FINANS KOÇU — Proxy + Static Server
// CORS sorununu çözer, tüm API isteklerini yönlendirir
// ========================================
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Static files ──
app.use(express.static(path.join(__dirname)));

// ── CORS Headers (tüm yanıtlara ekle) ──
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// ========================================
// PROXY HELPER — Uzak API'ye istek yap
// ========================================
function proxyRequest(targetUrl, res, options = {}) {
    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.path,
        method: 'GET',
        headers: {
            'User-Agent': 'FinansKocu/1.0',
            'Accept': 'application/json',
            ...(options.headers || {})
        },
        timeout: 12000
    };

    const proxyReq = client.request(reqOptions, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => { data += chunk; });
        proxyRes.on('end', () => {
            try {
                res.status(proxyRes.statusCode || 200);
                res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
                res.send(data);
            } catch (e) {
                res.status(500).json({ error: 'Parse error', message: e.message });
            }
        });
    });

    proxyReq.on('error', (e) => {
        console.error(`❌ Proxy error [${parsed.hostname}]:`, e.message);
        res.status(502).json({ error: 'Proxy error', message: e.message, target: parsed.hostname });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ error: 'Timeout', message: 'API yanıt vermedi (12s)' });
    });

    proxyReq.end();
}

// ========================================
// YAHOO FINANCE PROXY
// ========================================
app.get('/api/yahoo/chart/:symbol', (req, res) => {
    const { symbol } = req.params;
    const { range, interval, includePrePost } = req.query;

    const qs = new URLSearchParams();
    if (range) qs.set('range', range);
    if (interval) qs.set('interval', interval);
    if (includePrePost) qs.set('includePrePost', includePrePost);

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${qs.toString()}`;
    console.log(`📊 Yahoo: ${symbol} [${range || '5d'}]`);
    proxyRequest(targetUrl, res);
});

// ========================================
// FINNHUB PROXY
// ========================================
app.get('/api/finnhub/*', (req, res) => {
    // /api/finnhub/quote?symbol=AAPL&token=xxx → https://finnhub.io/api/v1/quote?symbol=AAPL&token=xxx
    const subPath = req.params[0]; // wildcard match
    const qs = new URLSearchParams(req.query).toString();
    const targetUrl = `https://finnhub.io/api/v1/${subPath}${qs ? '?' + qs : ''}`;
    console.log(`📈 Finnhub: ${subPath}`);
    proxyRequest(targetUrl, res);
});

// ========================================
// COINGECKO PROXY
// ========================================
app.get('/api/coingecko/*', (req, res) => {
    const subPath = req.params[0];
    const qs = new URLSearchParams(req.query).toString();
    const targetUrl = `https://api.coingecko.com/api/v3/${subPath}${qs ? '?' + qs : ''}`;
    console.log(`₿ CoinGecko: ${subPath}`);
    proxyRequest(targetUrl, res);
});

// ========================================
// EXCHANGERATE PROXY (Forex)
// ========================================
app.get('/api/forex/latest/:base', (req, res) => {
    const { base } = req.params;
    const targetUrl = `https://api.exchangerate-api.com/v4/latest/${base}`;
    console.log(`💱 Forex: ${base}`);
    proxyRequest(targetUrl, res);
});

// ========================================
// NEWSAPI PROXY (isteğe bağlı, API key ile)
// ========================================
app.get('/api/news/*', (req, res) => {
    const subPath = req.params[0]; // e.g., "everything"
    const qs = new URLSearchParams(req.query).toString();
    const targetUrl = `https://newsapi.org/v2/${subPath}${qs ? '?' + qs : ''}`;
    console.log(`📰 NewsAPI: ${subPath}`);
    proxyRequest(targetUrl, res);
});

// ========================================
// RSS NEWS — Ücretsiz haber akışı (API key gerektirmez)
// Google News RSS + Investing.com RSS
// ========================================

/**
 * RSS XML'ini parse et ve JSON döndür
 */
function parseRSSItems(xml) {
    const items = [];
    // <item> bloklarını çıkar
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const get = (tag) => {
            const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
            return m ? m[1].trim() : '';
        };

        const title = get('title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const description = get('description').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").substring(0, 300);
        const link = get('link');
        const pubDate = get('pubDate');
        const source = get('source') || extractDomain(link);

        if (title && title.length > 5) {
            items.push({ title, description, link, pubDate, source });
        }
    }
    return items;
}

function extractDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '').split('.')[0];
    } catch { return ''; }
}

/**
 * Uzak URL'den veri çek (Promise)
 */
function fetchURL(targetUrl) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const client = parsed.protocol === 'https:' ? https : http;

        const reqOptions = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/xml, text/xml, application/rss+xml, */*'
            },
            timeout: 10000
        };

        const req = client.request(reqOptions, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchURL(res.headers.location).then(resolve).catch(reject);
                return;
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// RSS feed URL'leri (kategori bazlı)
const RSS_FEEDS = {
    market: [
        'https://news.google.com/rss/search?q=stock+market+OR+S%26P+500+OR+NASDAQ+OR+Wall+Street&hl=en&gl=US&ceid=US:en',
        'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US'
    ],
    crypto: [
        'https://news.google.com/rss/search?q=bitcoin+OR+ethereum+OR+cryptocurrency&hl=en&gl=US&ceid=US:en'
    ],
    turkey: [
        'https://news.google.com/rss/search?q=BIST+OR+borsa+istanbul+OR+T%C3%BCrkiye+ekonomi&hl=tr&gl=TR&ceid=TR:tr'
    ],
    commodity: [
        'https://news.google.com/rss/search?q=gold+price+OR+oil+price+OR+commodities&hl=en&gl=US&ceid=US:en'
    ],
    general: [
        'https://news.google.com/rss/search?q=finance+OR+economy+OR+investing&hl=en&gl=US&ceid=US:en'
    ]
};

app.get('/api/rss-news/:category', async (req, res) => {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 8;
    const feeds = RSS_FEEDS[category] || RSS_FEEDS.general;

    console.log(`📰 RSS News: ${category} (${feeds.length} feed)`);

    try {
        const allItems = [];

        for (const feedUrl of feeds) {
            try {
                const xml = await fetchURL(feedUrl);
                const items = parseRSSItems(xml);
                allItems.push(...items);
            } catch (e) {
                console.warn(`  ⚠️ RSS feed hatası: ${e.message}`);
            }
        }

        // Tarihe göre sırala ve limitle
        const sorted = allItems
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, limit);

        res.json({
            status: 'ok',
            category,
            count: sorted.length,
            articles: sorted
        });
    } catch (error) {
        console.error(`❌ RSS error [${category}]:`, error.message);
        res.status(500).json({ error: 'RSS fetch failed', message: error.message });
    }
});

// ── Health check ──
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Finans Koçu Proxy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ── Fallback to index.html ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Sunucuyu başlat ──
app.listen(PORT, () => {
    console.log('');
    console.log('🏦 ════════════════════════════════════════');
    console.log(`🚀 Finans Koçu çalışıyor!`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log('🔌 Proxy aktif — CORS sorunu yok');
    console.log('════════════════════════════════════════');
    console.log('');
});
