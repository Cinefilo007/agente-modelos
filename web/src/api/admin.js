import api from './axios';

export const adminService = {
    // Get Dashboard KPIs
    getKPIs: async () => {
        const response = await api.get('/admin/kpi');
        return response.data;
    },

    // Get Blacklist
    getBlacklist: async () => {
        const response = await api.get('/admin/blacklist');
        return response.data;
    },

    // Add to Blacklist
    addToBlacklist: async (data) => {
        const response = await api.post('/admin/blacklist', data);
        return response.data;
    },

    // Remove from Blacklist
    removeFromBlacklist: async (id) => {
        const response = await api.delete(`/admin/blacklist/${id}`);
        return response.data;
    },

    // Get Active Disputes
    getDisputes: async () => {
        const response = await api.get('/admin/disputes');
        return response.data;
    },

    // Resolve Dispute
    resolveDispute: async (id, resolution, adminNotes) => {
        const response = await api.post(`/admin/disputes/${id}/resolve`, { resolution, admin_notes: adminNotes });
        return response.data;
    }
};
