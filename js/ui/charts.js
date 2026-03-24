// ========================================
// CHARTS — Chart.js grafik yardımcıları
// ========================================
const Charts = {
    instances: {},

    /**
     * Sparkline çiz (küçük mini grafik)
     */
    drawSparkline(canvasId, data, isPositive = true) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 2;

        ctx.clearRect(0, 0, width, height);

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const color = isPositive ? '#10b981' : '#ef4444';
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        data.forEach((val, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Area fill
        ctx.lineTo(width - padding, height);
        ctx.lineTo(padding, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    },

    /**
     * Ana grafik oluştur
     */
    createMainChart(canvasId, labels, data, label = 'Fiyat') {
        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const isPositive = data.length >= 2 && data[data.length - 1] >= data[0];
        const color = isPositive ? '#10b981' : '#ef4444';

        this.instances[canvasId] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: isPositive ?
                        'rgba(16, 185, 129, 0.1)' :
                        'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f0f4ff',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', weight: '600' },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            label: function (ctx) {
                                return `${label}: ${Formatters.price(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Inter', size: 11 },
                            maxTicksLimit: 8
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.03)',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Inter', size: 11 },
                            callback: function (value) {
                                return Formatters.shortNumber(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.03)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }
};
