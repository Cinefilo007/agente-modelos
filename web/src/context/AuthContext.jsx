import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        // Using window.location to ensure fresh state on all tabs/redirects
        if (window.location.pathname !== '/landing') {
            window.location.href = '/landing';
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check if we are inside Telegram WebApp
            if (window.Telegram?.WebApp?.initData) {
                try {
                    const response = await api.post('/auth/webapp', {
                        init_data: window.Telegram.WebApp.initData
                    });
                    const { access_token, user: userData, role } = response.data;
                    const fullUser = { ...userData, role };

                    localStorage.setItem('token', access_token);
                    localStorage.setItem('user', JSON.stringify(fullUser));
                    setUser(fullUser);
                    console.log("[Auth] Auto-login exitoso para:", fullUser.username || fullUser.id);
                    window.Telegram.WebApp.expand();
                    setLoading(false);
                    return;
                } catch (error) {
                    // Fail silently
                }
            }

            // 2. Normal Local Storage Check + Server Validation
            const token = localStorage.getItem('token');
            const storedUserStr = localStorage.getItem('user');

            if (token && storedUserStr && storedUserStr !== "undefined" && storedUserStr !== "null") {
                try {
                    if (!updatedUser || !updatedUser.id) {
                        logout();
                    } else {
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                } catch (err) {
                    // Fail silently and use local data if available
                    if (err.response?.status === 401) {
                        logout();
                    } else {
                        if (storedUserStr) {
                            try {
                                setUser(JSON.parse(storedUserStr));
                            } catch (e) { }
                        }
                    }
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const loginWithTelegram = async (telegramData) => {
        try {
            let response;

            // Si Telegram devuelve un id_token (flujo OIDC moderno), usarlo
            if (telegramData.id_token) {
                response = await api.post('/auth/telegram-oidc', {
                    id_token: telegramData.id_token
                });
            } else {
                // Fallback: hash HMAC legacy (compatible con el widget antiguo)
                response = await api.post('/auth/telegram', telegramData);
            }

            const { access_token, user: userData, role } = response.data;
            const fullUser = { ...userData, role };

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(fullUser));
            setUser(fullUser);
            return fullUser;
        } catch (error) {
            throw error;
        }
    };

    const updateUser = (data) => {
        const updatedUser = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, loginWithTelegram, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
