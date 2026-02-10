import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check if we are inside Telegram WebApp
            if (window.Telegram?.WebApp?.initData) {
                try {
                    console.log("Telegram WebApp detected, attempting auto-login...");
                    const response = await api.post('/auth/webapp', {
                        init_data: window.Telegram.WebApp.initData
                    });
                    const { access_token, user: userData, role } = response.data;
                    const fullUser = { ...userData, role };

                    localStorage.setItem('token', access_token);
                    localStorage.setItem('user', JSON.stringify(fullUser));
                    setUser(fullUser);
                    window.Telegram.WebApp.expand(); // Expand view
                    setLoading(false);
                    return; // Skip local storage check if WebApp login successful
                } catch (error) {
                    console.error("WebApp Auto-Login failed:", error);
                    // Fallback to normal flow
                }
            }

            // 2. Normal Local Storage Check
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                    // Optional: Verify token validity with backend here
                } catch (e) {
                    console.error("Error parsing stored user", e);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const loginWithTelegram = async (telegramData) => {
        try {
            const response = await api.post('/auth/telegram', telegramData);
            const { access_token, user: userData, role } = response.data;
            const fullUser = { ...userData, role };

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(fullUser));
            setUser(fullUser);
            return fullUser;
        } catch (error) {
            console.error("Login failed:", error);
            throw error; // Re-throw to handle in UI
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/landing';
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
