import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Home, User, Bell, Plus, Compass } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { TermsModal } from './auth/TermsModal';

import ThemeSettings from './ui/ThemeSettings';

export default function Layout() {
    const location = useLocation();
    const { themeColor } = useTheme(); // We still use themeColor for specific inline styles if needed
    const { user } = useAuth();
    // Check if user is model to show Add Post button
    // For now assuming everyone can see it or logical check:
    const isModel = user?.role === 'model';

    const NavItem = ({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to;
        return (
            <Link
                to={to}
                className={clsx(
                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
            >
                <div className={clsx("p-1 rounded-full", isActive && "bg-[var(--text-primary)]/10")}>
                    <Icon className="w-6 h-6" style={{ color: isActive ? themeColor : undefined }} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && (
                    <span
                        className="absolute bottom-1 w-1 h-1 rounded-full shadow-[0_0_8px_ currentColor]"
                        style={{ backgroundColor: themeColor, color: themeColor }}
                    />
                )}
            </Link>
        );
    };

    const mainTabs = ['/', '/explore', '/notifications', '/profile'];
    const showNav = mainTabs.includes(location.pathname);

    // Prevent right click globally
    React.useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // Use useEffect to handle terms modal visibility
    const [showTerms, setShowTerms] = React.useState(false);

    React.useEffect(() => {
        if (user?.role === 'client' && !user?.terms_accepted) {
            setShowTerms(true);
        } else {
            setShowTerms(false);
        }
    }, [user]);

    return (
        // Background is now handled by body with var(--bg-gradient) and var(--background)
        <div className="min-h-screen w-full flex justify-center transition-colors duration-700 font-sans">
            {/* transform-gpu creates stacking context */}
            <div className="flex flex-col w-full max-w-[768px] h-screen bg-transparent overflow-hidden relative shadow-2xl border-x border-border transform-gpu">

                {showTerms && <TermsModal onAccept={() => setShowTerms(false)} />}

                <ThemeSettings />

                {/* Main Content Area */}
                <main className={clsx("flex-1 overflow-y-auto no-scrollbar scroll-smooth", showNav && "pb-[60px]")}>
                    <Outlet />
                </main>

                {/* Bottom Navigation Bar */}
                {showNav && (
                    <nav className="absolute bottom-0 left-0 right-0 h-[60px] bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-between px-2 z-50 pb-safe">
                        <NavItem to="/" icon={Home} label="Inicio" />
                        <NavItem to="/explore" icon={Compass} label="Explorar" />

                        {/* Central Action Button (Models only) */}
                        {isModel && (
                            <div className="relative -top-5 flex flex-col items-center justify-center w-[20%]">
                                <Link to="/create-post">
                                    <button
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transform transition-transform active:scale-95 border-4 border-background"
                                        style={{
                                            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`,
                                            boxShadow: `0 8px 20px -5px ${themeColor}88`
                                        }}
                                    >
                                        <Plus size={28} strokeWidth={2.5} />
                                    </button>
                                </Link>
                            </div>
                        )}

                        <NavItem to="/notifications" icon={Bell} label="Alertas" />
                        <NavItem to="/profile" icon={User} label="Perfil" />
                    </nav>
                )}
            </div>
        </div>
    );
}
