# Script para añadir persistencia de sesión al auth de Promotions.jsx
import re

filepath = r'C:\Users\Admin\Desktop\Agente-modelos\web\src\pages\Promotions.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ---- REEMPLAZAR el bloque de Auth Init ----
old_auth = '''    // ---- Auth Init (3 niveles) ----
    const telegramLoginRef = useRef(null);
    const [needsLogin, setNeedsLogin] = useState(false);

    useEffect(() => {
        const initSfsUser = async () => {
            try {
                // NIVEL 1: Telegram WebApp (MiniApp abierta desde el bot)
                const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                if (tgUser) {
                    const userPayload = {
                        telegram_id: tgUser.id,
                        username: tgUser.username || "",
                        full_name: `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim()
                    };
                    const userDoc = await sfsService.authenticateUser(userPayload);
                    setSfsUser(userDoc);
                    const lims = await sfsService.getUserLimits(userDoc.id);
                    setLimits(lims);
                    setGlobalAuthLoading(false);
                    return;
                }

                // NIVEL 2: Sesión existente en localStorage (usuario logueado en el portal principal)
                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('token');
                if (token && storedUser && storedUser !== "undefined" && storedUser !== "null") {
                    const parsed = JSON.parse(storedUser);
                    if (parsed?.telegram_id) {
                        const userPayload = {
                            telegram_id: parsed.telegram_id,
                            username: parsed.username || "",
                            full_name: parsed.full_name || parsed.artistic_name || ""
                        };
                        const userDoc = await sfsService.authenticateUser(userPayload);
                        setSfsUser(userDoc);
                        const lims = await sfsService.getUserLimits(userDoc.id);
                        setLimits(lims);
                        setGlobalAuthLoading(false);
                        return;
                    }
                }

                // NIVEL 3: Sin sesión → Mostrar pantalla de login
                setNeedsLogin(true);
                setGlobalAuthLoading(false);

            } catch (err) {
                console.error("[Promo] Auth error", err);
                setNeedsLogin(true);
                setGlobalAuthLoading(false);
            }
        };
        initSfsUser();
    }, []);

    // Telegram Login Widget (solo se monta si needsLogin es true)
    useEffect(() => {
        if (!needsLogin || !telegramLoginRef.current) return;
        if (telegramLoginRef.current.innerHTML !== "") return;

        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', 'ClubNebula_Bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '12');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuthPromo(user)');
        script.async = true;
        telegramLoginRef.current.appendChild(script);

        window.onTelegramAuthPromo = async (user) => {
            try {
                setGlobalAuthLoading(true);
                setNeedsLogin(false);
                const userPayload = {
                    telegram_id: user.id,
                    username: user.username || "",
                    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim()
                };
                const userDoc = await sfsService.authenticateUser(userPayload);
                setSfsUser(userDoc);
                const lims = await sfsService.getUserLimits(userDoc.id);
                setLimits(lims);
            } catch (err) {
                console.error("[Promo] Login error", err);
                showToast("Error al iniciar sesión", "error");
                setNeedsLogin(true);
            } finally {
                setGlobalAuthLoading(false);
            }
        };

        return () => { window.onTelegramAuthPromo = undefined; };
    }, [needsLogin]);'''

new_auth = '''    // ---- Auth Init (3 niveles + persistencia de sesión) ----
    const telegramLoginRef = useRef(null);
    const [needsLogin, setNeedsLogin] = useState(false);

    // Helper para persistir sesión
    const SFS_SESSION_KEY = 'sfs_session';
    const saveSession = (userDoc) => {
        sessionStorage.setItem(SFS_SESSION_KEY, JSON.stringify(userDoc));
    };
    const clearSession = () => sessionStorage.removeItem(SFS_SESSION_KEY);

    useEffect(() => {
        const initSfsUser = async () => {
            try {
                // NIVEL 0: Sesión SFS persistida (recarga de página)
                const cached = sessionStorage.getItem(SFS_SESSION_KEY);
                if (cached) {
                    const cachedUser = JSON.parse(cached);
                    if (cachedUser?.id) {
                        setSfsUser(cachedUser);
                        const lims = await sfsService.getUserLimits(cachedUser.id);
                        setLimits(lims);
                        setGlobalAuthLoading(false);
                        return;
                    }
                }

                // NIVEL 1: Telegram WebApp (MiniApp abierta desde el bot)
                const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                if (tgUser) {
                    const userPayload = {
                        telegram_id: tgUser.id,
                        username: tgUser.username || "",
                        full_name: `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim()
                    };
                    const userDoc = await sfsService.authenticateUser(userPayload);
                    setSfsUser(userDoc);
                    saveSession(userDoc);
                    const lims = await sfsService.getUserLimits(userDoc.id);
                    setLimits(lims);
                    setGlobalAuthLoading(false);
                    return;
                }

                // NIVEL 2: Sesión existente en localStorage (usuario logueado en el portal principal)
                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('token');
                if (token && storedUser && storedUser !== "undefined" && storedUser !== "null") {
                    const parsed = JSON.parse(storedUser);
                    if (parsed?.telegram_id) {
                        const userPayload = {
                            telegram_id: parsed.telegram_id,
                            username: parsed.username || "",
                            full_name: parsed.full_name || parsed.artistic_name || ""
                        };
                        const userDoc = await sfsService.authenticateUser(userPayload);
                        setSfsUser(userDoc);
                        saveSession(userDoc);
                        const lims = await sfsService.getUserLimits(userDoc.id);
                        setLimits(lims);
                        setGlobalAuthLoading(false);
                        return;
                    }
                }

                // NIVEL 3: Sin sesión → Mostrar pantalla de login
                setNeedsLogin(true);
                setGlobalAuthLoading(false);

            } catch (err) {
                console.error("[Promo] Auth error", err);
                setNeedsLogin(true);
                setGlobalAuthLoading(false);
            }
        };
        initSfsUser();
    }, []);

    // Telegram Login Widget (solo se monta si needsLogin es true)
    useEffect(() => {
        if (!needsLogin || !telegramLoginRef.current) return;
        if (telegramLoginRef.current.innerHTML !== "") return;

        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', 'ClubNebula_Bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '12');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuthPromo(user)');
        script.async = true;
        telegramLoginRef.current.appendChild(script);

        window.onTelegramAuthPromo = async (user) => {
            try {
                setGlobalAuthLoading(true);
                setNeedsLogin(false);
                const userPayload = {
                    telegram_id: user.id,
                    username: user.username || "",
                    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim()
                };
                const userDoc = await sfsService.authenticateUser(userPayload);
                setSfsUser(userDoc);
                saveSession(userDoc);
                const lims = await sfsService.getUserLimits(userDoc.id);
                setLimits(lims);
            } catch (err) {
                console.error("[Promo] Login error", err);
                showToast("Error al iniciar sesión", "error");
                setNeedsLogin(true);
            } finally {
                setGlobalAuthLoading(false);
            }
        };

        return () => { window.onTelegramAuthPromo = undefined; };
    }, [needsLogin]);'''

if old_auth in content:
    content = content.replace(old_auth, new_auth)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS - Session persistence added')
else:
    print('FAILED - old_auth block not found')
