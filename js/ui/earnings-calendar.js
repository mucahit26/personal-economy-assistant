// ========================================
// EARNINGS CALENDAR UI 
// ========================================
const EarningsCalendarUI = {
    currentWeekOffset: 0,

    /**
     * Takvimi başlat
     */
    init() {
        document.getElementById('prevWeek')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextWeek')?.addEventListener('click', () => this.navigate(1));
        this.loadWeek(0);
    },

    /**
     * Hafta navigator
     */
    navigate(direction) {
        this.currentWeekOffset += direction;
        this.loadWeek(this.currentWeekOffset);
    },

    /**
     * Hafta verisini yükle
     */
    async loadWeek(offset) {
        const weekLabel = document.getElementById('weekLabel');
        if (weekLabel) {
            weekLabel.textContent = offset === 0 ? 'Bu Hafta' :
                offset === 1 ? 'Gelecek Hafta' :
                    offset === -1 ? 'Geçen Hafta' :
                        `${offset > 0 ? '+' : ''}${offset} Hafta`;
        }

        try {
            const data = await EarningsAPI.fetchCurrentWeek(offset);

            if (weekLabel && data.weekLabel) {
                weekLabel.textContent = data.weekLabel;
            }

            this.renderDays(data.earnings);
        } catch (error) {
            console.error('Earnings calendar error:', error);
        }
    },

    /**
     * Günleri render et
     */
    renderDays(earningsByDay) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];

        days.forEach(day => {
            const container = document.getElementById(`earnings-${day}`);
            if (!container) return;

            const items = earningsByDay[day] || [];

            if (items.length === 0) {
                container.innerHTML = '<div class="loading-placeholder" style="font-size: 0.75rem;">Bilanço yok</div>';
                return;
            }

            container.innerHTML = items.map(e => {
                const timeLabel = e.hour === 'bmo' ? '☀️ PÖ' : e.hour === 'amc' ? '🌙 PS' : '📊';
                const surpriseHtml = e.surprise != null ?
                    `<span class="earnings-surprise ${e.beat ? 'beat' : 'miss'}">${e.beat ? '✅' : '❌'} ${Formatters.percent(e.surprise)}</span>` :
                    `<span class="earnings-time">${timeLabel}</span>`;

                return `
                    <div class="earnings-item" title="${e.symbol} - EPS Est: ${e.epsEstimate || 'N/A'}">
                        <span class="earnings-symbol">${e.symbol}</span>
                        ${surpriseHtml}
                    </div>
                `;
            }).join('');
        });
    }
};
