// ========================================
// NOTIFICATIONS — Toast bildirim sistemi
// ========================================
const Notifications = {
    /**
     * Toast göster
     */
    show(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    }
};
