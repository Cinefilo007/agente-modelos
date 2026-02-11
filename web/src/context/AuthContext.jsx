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
            console.log("[Auth] Iniciando verificación de sesión...");

            // 1. Check if we are inside Telegram WebApp
            if (window.Telegram?.WebApp?.initData) {
                try {
                    console.log("[Auth] Telegram WebApp detectado, intentando auto-login...");
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
                    console.error("[Auth] WebApp Auto-Login falló:", error.response?.data?.detail || error.message);
                }
            }

            // 2. Normal Local Storage Check + Server Validation
            const token = localStorage.getItem('token');
            const storedUserStr = localStorage.getItem('user');

            if (token && storedUserStr && storedUserStr !== "undefined" && storedUserStr !== "null") {
                try {
                    console.log("[Auth] Token detectado, validando con el servidor...");
                    // No confiamos solo en localStorage, pedimos al servidor el perfil actual
                    const res = await api.get('/profile/me');
                    const updatedUser = res.data;

                    // Critical validation: Check if backend confirms identity and basic status
                    if (!updatedUser || !updatedUser.id) {
                        console.error("[Auth] El servidor devolvió datos inválidos.");
                        logout();
                    } else {
                        console.log("[Auth] Sesión validada por servidor para:", updatedUser.username || updatedUser.id);
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                } catch (err) {
                    console.error("[Auth] Error validando sesión contra el servidor:", err.response?.status, err.response?.data?.detail);
                    // Si el servidor dice que no estamos autorizados o el usuario no existe, limpiamos todo
                    if (err.response?.status === 401 || err.response?.status === 404) {
                        console.warn("[Auth] Sesión no válida, forzando cierre de sesión.");
                        logout();
                    } else {
                        // Otros errores (red, 500) - quizá no cerrar sesión pero dejar de cargar
                        console.error("[Auth] Error de comunicación, no se pudo validar la sesión.");
                    }
                }
            } else {
                console.log("[Auth] No hay sesión activa en localStorage.");
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
