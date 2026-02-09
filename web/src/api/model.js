import api from './axios';

export const modelService = {
    // Get Model Profile (by ID or Username)
    // For now we assume fetch by Telegram ID or UUID.
    // Let's assume the backend has an endpoint for this in 'profile' router.

    getProfile: async (identifier) => {
        // identifier could be username or id
        // We'll use the profile router.
        const response = await api.get(`/profile/${identifier}`);
        return response.data;
    },

    // Get Feed/Posts for a model
    getPosts: async (modelId) => {
        const response = await api.get(`/feed/model/${modelId}`);
        return response.data;
    }
};
