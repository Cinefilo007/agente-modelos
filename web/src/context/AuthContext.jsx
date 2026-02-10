import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
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
            const { access_token, user } = response.data;

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            return user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error; // Re-throw to handle in UI
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        // Optional: Redirect
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, loginWithTelegram, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
