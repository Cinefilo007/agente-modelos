import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api', // Relative path for production (served by same origin)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        // You can add auth tokens here if needed
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Avoid infinite redirect if already on landing
            if (window.location.pathname !== '/landing') {
                window.location.href = '/landing';
            }
        }
        console.error("API Error:", error.response || error.message);
        return Promise.reject(error);
    }
);

export default api;
