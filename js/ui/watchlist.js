// ========================================
// WATCHLIST UI — Favori listesi yönetimi
// ========================================
const WatchlistUI = {
    currentList: [],

    /**
     * Watchlist'i başlat
     */
    init() {
        this.currentList = Storage.getWatchlist();
        this.render();
        this.setupAddForm();
    },

    /**
     * Sembol ekle
     */
    addSymbol(symbol, type = 'stock') {
        symbol = symbol.toUpperCase().trim();
        if (!symbol) return;

        // Zaten var mı?
        if (this.currentList.find(w => w.symbol === symbol)) {
            Notifications.show(`${symbol} zaten favori listesinde`, 'warning');
            return;
        }

        this.currentList.push({
            symbol,
            type, // 'stock', 'crypto', 'commodity', 'forex'
            addedAt: new Date().toISOString()
        });

        Storage.saveWatchlist(this.currentList);
        Notifications.show(`${symbol} favorilere eklendi`, 'success');
        this.render();
        this.fetchWatchlistData();
    },

    /**
     * Sembol kaldır
     */
    removeSymbol(symbol) {
        this.currentList = this.currentList.filter(w => w.symbol !== symbol);
        Storage.saveWatchlist(this.currentList);
        Notifications.show(`${symbol} favorilerden çıkarıldı`, 'info');
        this.render();
    },

    /**
     * Form kurulumu
     */
    setupAddForm() {
        const form = document.getElementById('watchlistAddForm');
        const input = document.getElementById('watchlistInput');
        const typeSelect = document.getElementById('watchlistType');

        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const symbol = input.value.trim();
            const type = typeSelect?.value || 'stock';
            if (symbol) {
                this.addSymbol(symbol, type);
                input.value = '';
            }
        });
    },

    /**
     * Watchlist verilerini çek
     */
    async fetchWatchlistData() {
        if (this.currentList.length === 0) return;

        const items = document.querySelectorAll('.watchlist-item[data-symbol]');

        for (const item of items) {
            const symbol = item.dataset.symbol;
            const type = item.dataset.type;
            const priceEl = item.querySelector('.wl-price');
            const changeEl = item.querySelector('.wl-change');

            if (!priceEl) continue;

            try {
                let price = null, change = null, currency = 'USD';

                if (type === 'crypto') {
                    // CoinGecko'dan
                    const coins = await CryptoAPI.fetchTopCoins(50);
                    const coin = coins.find(c => c.symbol === symbol);
                    if (coin) {
                        price = coin.price;
                        change = coin.change24h;
                    }
                } else {
                    // Yahoo Finance/Finnhub'dan
                    const data = await MarketsAPI.fetchQuote(symbol, '5d', '1d');
                    if (data) {
                        price = data.price;
                        change = data.changePercent;
                        currency = data.currency || 'USD';
                    }
                }

                if (price !== null) {
                    priceEl.textContent = currency === 'TRY'
                        ? Formatters.tryFormat(price)
                        : Formatters.price(price);

                    if (change !== null && changeEl) {
                        const changeClass = change >= 0 ? 'up' : 'down';
                        changeEl.textContent = Formatters.percent(change);
                        changeEl.className = `wl-change ${changeClass}`;
                    }
                }
            } catch (e) {
                // Sessizce geç
            }
        }
    },

    /**
     * Watchlist UI'ı render et
     */
    render() {
        const container = document.getElementById('watchlistItems');
        const emptyState = document.getElementById('watchlistEmpty');

        if (!container) return;

        if (this.currentList.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const typeIcons = {
            stock: '📈',
            crypto: '₿',
            commodity: '🛢️',
            forex: '💱'
        };

        container.innerHTML = this.currentList.map(item => `
            <div class="watchlist-item glass-card" data-symbol="${item.symbol}" data-type="${item.type}">
                <div class="wl-left">
                    <span class="wl-icon">${typeIcons[item.type] || '📊'}</span>
                    <div class="wl-info">
                        <span class="wl-symbol">${item.symbol}</span>
                        <span class="wl-type">${item.type === 'stock' ? 'Hisse' : item.type === 'crypto' ? 'Kripto' : item.type === 'commodity' ? 'Emtia' : 'Döviz'}</span>
                    </div>
                </div>
                <div class="wl-right">
                    <span class="wl-price">--</span>
                    <span class="wl-change">--</span>
                </div>
                <button class="wl-remove" onclick="WatchlistUI.removeSymbol('${item.symbol}')" title="Kaldır">✕</button>
            </div>
        `).join('');

        // Veri çek
        this.fetchWatchlistData();
    }
};
