import api from './axios';

export const sfsService = {
    // Autenticar/crear usuario SFS
    authenticateUser: async (telegramUserData) => {
        // telegramUserData: { telegram_id, username, full_name }
        const response = await api.post('/promo/auth', telegramUserData);
        return response.data;
    },

    // Obtener catálogo de canales
    getCatalog: async (category = null, page = 1, limit = 10) => {
        const params = { page, limit };
        if (category) params.category = category;
        const response = await api.get('/promo/channels/catalog', { params });
        return response.data;
    },

    // Obtener mis canales registrados
    getMyChannels: async (sfsUserId) => {
        const response = await api.get('/promo/channels/my', { params: { sfs_user_id: sfsUserId } });
        return response.data;
    },

    // Actualizar categoría de un canal pendiente
    updateChannelCategory: async (channelId, category, sfsUserId) => {
        const response = await api.put(`/promo/channels/${channelId}`, { category }, {
            params: { sfs_user_id: sfsUserId }
        });
        return response.data;
    },

    // Consultar límites diarios (SFS Free Limits)
    getUserLimits: async (sfsUserId) => {
        const response = await api.get('/promo/user/limits', { params: { sfs_user_id: sfsUserId } });
        return response.data;
    },

    // Enviar Calificación P2P
    submitReview: async (sfsUserId, reviewData) => {
        // reviewData: { promo_campaign_id, target_id, rating, comment }
        const response = await api.post('/promo/reviews', reviewData, {
            params: { sfs_user_id: sfsUserId }
        });
        return response.data;
    }
};
