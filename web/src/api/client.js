import api from './axios';

export const clientService = {
    // Obtain client profile
    getProfile: async (telegramId) => {
        const response = await api.get(`/client/${telegramId}`);
        return response.data;
    },

    // Top up wallet
    topUpWallet: async (clientId, amount) => {
        const response = await api.post('/client/topup', { client_id: clientId, amount });
        return response.data;
    },

    // Create P2P Order
    createOrder: async (orderData) => {
        // orderData: { client_id, model_id, amount, description }
        const response = await api.post('/client/orders', orderData);
        return response.data;
    },

    // Get My Orders
    getMyOrders: async (clientId) => {
        const response = await api.get(`/client/${clientId}/orders`);
        return response.data;
    },

    // Confirm Delivery
    confirmOrder: async (orderId) => {
        const response = await api.post(`/client/orders/${orderId}/confirm`);
        return response.data;
    },

    // Create Dispute
    createDispute: async (disputeData) => {
        // disputeData: { order_id, evidence }
        const response = await api.post('/client/orders/dispute', disputeData);
        return response.data;
    }
};
