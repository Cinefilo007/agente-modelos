import api from './axios';

export const sfsService = {
    // Autenticar/crear usuario SFS
    authenticateUser: async (telegramUserData) => {
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

    // Consultar límites diarios
    getUserLimits: async (sfsUserId) => {
        const response = await api.get('/promo/user/limits', { params: { sfs_user_id: sfsUserId } });
        return response.data;
    },

    // Obtener templates de post guardados por el bot
    getMyTemplates: async (sfsUserId) => {
        const response = await api.get('/promo/templates/my', { params: { sfs_user_id: sfsUserId } });
        return Array.isArray(response.data) ? response.data : [];
    },

    // Proponer un SFS a otro anunciante
    proposeSFS: async (requesterSfsUserId, payload) => {
        // payload: { target_sfs_user_id, requester_channel_id, requester_template_id, duration_hours }
        const response = await api.post('/promo/campaigns', payload, {
            params: { requester_id: requesterSfsUserId }
        });
        return response.data;
    },

    // Campañas enviadas
    getSentCampaigns: async (sfsUserId) => {
        const response = await api.get('/promo/campaigns/sent', { params: { model_id: sfsUserId } });
        return Array.isArray(response.data) ? response.data : [];
    },

    // Campañas recibidas
    getReceivedCampaigns: async (sfsUserId) => {
        const response = await api.get('/promo/campaigns/received', { params: { model_id: sfsUserId } });
        return Array.isArray(response.data) ? response.data : [];
    },

    // Enviar Calificación P2P
    submitReview: async (sfsUserId, reviewData) => {
        const response = await api.post('/promo/reviews', reviewData, {
            params: { sfs_user_id: sfsUserId }
        });
        return response.data;
    }
};
