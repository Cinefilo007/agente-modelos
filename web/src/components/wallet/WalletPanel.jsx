import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Wallet, Plus, ArrowUpRight, Copy, RefreshCw, Layers, Upload } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import TransactionList from './TransactionList';
import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';

const WalletPanel = () => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, deposit, history
    const [balance, setBalance] = useState({ balance: 0, locked_balance: 0, currency: 'USDT' });
    const [depositInfo, setDepositInfo] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);

    const [withdrawError, setWithdrawError] = useState(null);
    const [withdrawSuccess, setWithdrawSuccess] = useState(null);

    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        // Redirigir si un cliente está en la pestaña de retiro por error
        if (activeTab === 'withdraw' && user?.role === 'client') {
            setActiveTab('overview');
        }
    }, [activeTab, user]);

    useEffect(() => {
        console.log("WalletPanel v3 loaded - Upload Icon Fix");
        fetchBalance();
        fetchTransactions();
    }, []);

    const fetchBalance = async () => {
        try {
            const res = await api.get('/wallet/balance');
            setBalance(res.data);
        } catch (e) {
            console.error("Error fetching balance:", e);
        }
    };

    const fetchTransactions = async () => {
        setLoadingTx(true);
        try {
            const res = await api.get('/wallet/history');
            setTransactions(res.data);
        } catch (e) {
            console.error("Error fetching history:", e);
        } finally {
            setLoadingTx(false);
            setLoading(false);
        }
    };

    const loadDepositInfo = async () => {
        if (depositInfo) return;
        try {
            const res = await api.get('/wallet/deposit-info');
            setDepositInfo(res.data);
        } catch (e) {
            console.error("Error fetching deposit info:", e);
        }
    };

    // Auto-select deposit tab logic could go here if triggered externally
    useEffect(() => {
        if (activeTab === 'deposit') {
            loadDepositInfo();
        }
    }, [activeTab]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setWithdrawError(null);
        setWithdrawSuccess(null);
        setWithdrawLoading(true);

        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setWithdrawError("El monto debe ser positivo.");
            setWithdrawLoading(false);
            return;
        }

        if (amount > balance.balance) {
            setWithdrawError("Saldo insuficiente.");
            setWithdrawLoading(false);
            return;
        }

        if (!withdrawAddress || withdrawAddress.length < 10) {
            setWithdrawError("Dirección inválida.");
            setWithdrawLoading(false);
            return;
        }

        try {
            const res = await api.post('/wallet/withdraw', {
                amount: amount,
                wallet_address: withdrawAddress
            });

            if (res.data.success) {
                setWithdrawSuccess("Retiro solicitado correctamente. Tu dinero está en camino.");
                setWithdrawAmount('');
                setWithdrawAddress('');
                fetchBalance(); // Refresh balance
                fetchTransactions(); // Refresh history
            }
        } catch (err) {
            console.error(err);
            setWithdrawError(err.response?.data?.detail || "Error al solicitar retiro.");
        } finally {
            setWithdrawLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/profile/me')}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-lg"
                        title="Volver al Perfil"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Mi Billetera</h2>
                        <p className="text-gray-400 text-sm">Gestiona tus créditos y transacciones</p>
                    </div>
                </div>

                {/* Tabs Container - Responsive Horizontal Scroll */}
                <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl overflow-x-auto scrollbar-hide no-scrollbar whitespace-nowrap max-w-full">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0",
                            activeTab === 'overview' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Wallet size={16} /> Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('deposit')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0",
                            activeTab === 'deposit' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Plus size={16} /> Recargar
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0",
                            activeTab === 'history' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Layers size={16} /> Historial
                    </button>

                    {/* Role-based Withraw Tab (Only models) */}
                    {user?.role === 'model' && (
                        <button
                            onClick={() => setActiveTab('withdraw')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0",
                                activeTab === 'withdraw' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Upload size={16} /> Retirar
                        </button>
                    )}
                </div>
            </div>

            {/* Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content (Left) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Balance Hero Card */}
                    {(activeTab === 'overview' || activeTab === 'deposit') && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 to-black border border-purple-500/30 p-8 shadow-2xl">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl"></div>

                            <div className="relative z-10">
                                <h3 className="text-purple-200 text-sm uppercase tracking-wider font-semibold mb-1">Saldo Disponible</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-white tracking-tight">
                                        ${balance.balance.toFixed(2)}
                                    </span>
                                    <span className="text-xl text-purple-300 font-medium">{balance.currency}</span>
                                </div>

                                {balance.locked_balance > 0 && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-yellow-200/80 bg-yellow-500/10 px-3 py-1.5 rounded-lg w-fit border border-yellow-500/20">
                                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                                        <span>${balance.locked_balance.toFixed(2)} en custodia (servicios activos)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deposit Section */}
                    {activeTab === 'deposit' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <ArrowUpRight className="text-purple-400" />
                                Depositar Fondos
                            </h3>

                            {!depositInfo ? (
                                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div></div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="bg-white p-4 rounded-xl shadow-lg">
                                        <QRCode value={depositInfo.wallet_address} size={160} />
                                    </div>

                                    <div className="flex-1 space-y-4 w-full">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400 uppercase tracking-wide">Red</label>
                                            <div className="flex items-center gap-2 text-white font-medium bg-black/30 px-3 py-2 rounded-lg border border-white/5">
                                                <div className="w-2 h-2 rounded-full bg-blue-400"></div> TON (The Open Network)
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400 uppercase tracking-wide">Dirección de Depósito</label>
                                            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5 group">
                                                <code className="text-purple-300 text-sm break-all flex-1 font-mono">{depositInfo.wallet_address}</code>
                                                <button onClick={() => copyToClipboard(depositInfo.wallet_address)} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-red-400 font-bold uppercase tracking-wide flex items-center gap-1">
                                                ⚠️ Memo / Comentario (OBLIGATORIO)
                                            </label>
                                            <div className="flex items-center gap-2 bg-red-500/10 p-2 rounded-lg border border-red-500/30">
                                                <code className="text-red-200 text-lg font-bold flex-1 tracking-wider">{depositInfo.memo}</code>
                                                <button onClick={() => copyToClipboard(depositInfo.memo)} className="p-2 hover:bg-red-500/20 rounded-md text-red-300 hover:text-white transition-colors">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-red-400/80 mt-1">
                                                Si no incluyes este MEMO, los fondos no se acreditarán automáticamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                                <p><strong>Instrucciones:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 mt-2 opacity-80">
                                    <li>Envía <strong>USDT</strong> o <strong>TON</strong>.</li>
                                    <li>Usa únicamente la red <strong>TON</strong>.</li>
                                    <li>Copia y pega el <strong>Memo</strong> exactamente como aparece.</li>
                                    <li>La acreditación es automática tras 1 confirmación de red (~30 seg).</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* Transaction History in Tab */}
                    {activeTab === 'history' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Historial de Movimientos</h3>
                                <button onClick={fetchTransactions} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                    <RefreshCw size={16} className={loadingTx ? "animate-spin" : ""} />
                                </button>
                            </div>
                            <TransactionList transactions={transactions} loading={loadingTx} />
                        </div>
                    )}

                </div>

                {/* Sidebar / Quick History (Right) - Only visible in Overview */}
                {activeTab === 'overview' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recientes</h3>
                            <button onClick={() => setActiveTab('history')} className="text-xs text-purple-400 hover:text-purple-300">Ver todo</button>
                        </div>
                        <TransactionList transactions={transactions.slice(0, 5)} loading={loadingTx} />
                    </div>
                )}

            </div>
        </div>
    );
};

export default WalletPanel;
