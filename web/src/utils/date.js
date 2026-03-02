export function timeAgo(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    // Future date handling
    if (seconds < 0) return 'hace instantes';

    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + 'a'; // años
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + 'mes'; // meses
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + 'd'; // días
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + 'h'; // horas
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + 'm'; // minutos
    }
    return Math.floor(seconds) + 's'; // segundos
}

export function formatFullDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function isOnline(lastSeen) {
    if (!lastSeen) return false;
    // Robust parsing for ISO strings that might have space instead of T
    const cleanDate = typeof lastSeen === 'string' ? lastSeen.replace(' ', 'T') : lastSeen;
    const date = new Date(cleanDate);
    const now = new Date();
    // 1 minutes threshold (60,000 ms)
    return (now - date) < 60000;
}
