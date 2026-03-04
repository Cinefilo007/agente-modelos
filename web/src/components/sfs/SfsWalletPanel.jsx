import React, { useState, useEffect, useCallback } from 'react';
import {
    Wallet, Plus, ArrowUpRight, Copy, RefreshCw, Upload,
    CheckCircle, AlertCircle, Loader, ExternalLink
} from 'lucide-react';
import QRCode from 'react-qr-code';
import api from '../../api/axios';

// Dirección de depósito fija del sistema SFS
const SFS_DEPOSIT_ADDRESS = import.meta.env.VITE_SFS_DEPOSIT_ADDRESS || 'UQD_SFS_WALLET_ADDRESS_PLACEHOLDER';

const SfsWalletPanel = ({ sfsUser, onBalanceUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [balance, setBalance] = useState(parseFloat(sfsUser?.wallet_balance || 0));
    const [payoutAddress, setPayoutAddress] = useState(sfsUser?.payout_address || '');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);

    const userMemo = sfsUser?.id?.slice(0, 8)?.toUpperCase() || 'SFS-MEMO';

    const copyText = useCallback((text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    const savePayoutAddress = async () => {
        if (!payoutAddress || payoutAddress.length < 10) {
            setError('Dirección inválida.');
            return;
        }
        setSavingAddress(true);
        setError(null);
        try {
            await api.put('/promo/profile/me', { payout_address: payoutAddress }, {
                params: { sfs_user_id: sfsUser.id }
            });
            setSuccess('Dirección guardada correctamente.');
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError('Error al guardar la dirección.');
        } finally {
            setSavingAddress(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('El monto debe ser mayor que 0.');
            return;
        }
        if (amount > balance) {
            setError('Saldo insuficiente.');
            return;
        }
        if (!payoutAddress || payoutAddress.length < 10) {
            setError('Añade tu dirección TON antes de retirar.');
            return;
        }
        setWithdrawLoading(true);
        try {
            const res = await api.post('/promo/profile/withdraw',
                { amount, wallet_address: payoutAddress },
                { params: { sfs_user_id: sfsUser.id } }
            );
            setBalance(res.data.new_balance);
            setWithdrawAmount('');
            setSuccess('Retiro solicitado. El admin procesará tu pago en 24-48h.');
            if (onBalanceUpdate) onBalanceUpdate(res.data.new_balance);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al solicitar el retiro.');
        } finally {
            setWithdrawLoading(false);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: Wallet },
        { id: 'deposit', label: 'Recargar', icon: Plus },
        { id: 'withdraw', label: 'Retirar', icon: Upload },
    ];

    return (
        <div className="space-y-4">
            {/* Hero balance */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/80 to-black border border-purple-500/30 p-6">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <p className="text-purple-300 text-xs uppercase tracking-wider font-semibold mb-1">Saldo SFS</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white">${balance.toFixed(2)}</span>
                        <span className="text-lg text-purple-300">USD</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                        <tab.icon className="w-3.5 h-3.5" />{tab.label}
                    </button>
                ))}
            </div>

            {/* Resumen */}
            {activeTab === 'overview' && (
                <div className="space-y-3">
                    <div className="bg-card/30 border border-white/5 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase">Cómo funciona</h3>
                        <div className="space-y-2 text-xs text-muted-foreground">
                            <p>💰 Tu saldo SFS se acumula con campañas de <strong className="text-foreground">Publicidad PXP</strong>.</p>
                            <p>📥 Para recargar, envía USDT (red TON) con tu MEMO a la dirección de depósito.</p>
                            <p>📤 Los retiros se procesan manualmente en 24-48 horas.</p>
                        </div>
                    </div>
                    <div className="bg-card/30 border border-white/5 rounded-xl p-4 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Tu Dirección de Retiro (TON)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={payoutAddress}
                                onChange={e => setPayoutAddress(e.target.value)}
                                placeholder="UQ..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:border-purple-500 outline-none"
                            />
                            <button onClick={savePayoutAddress} disabled={savingAddress}
                                className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-300 transition-all disabled:opacity-50">
                                {savingAddress ? <Loader className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                            </button>
                        </div>
                        {success && <p className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />{success}</p>}
                        {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
                    </div>
                </div>
            )}

            {/* Depositar */}
            {activeTab === 'deposit' && (
                <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">Los depósitos se acreditan manualmente en 24-48h tras confirmación por el admin.</p>
                    </div>
                    <div className="flex flex-col items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-6">
                        <div className="bg-white p-3 rounded-xl">
                            <QRCode value={`${SFS_DEPOSIT_ADDRESS}?memo=${userMemo}`} size={120} />
                        </div>
                        <div className="w-full space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground uppercase font-bold">Dirección (red TON)</label>
                                <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
                                    <code className="text-purple-300 text-xs break-all flex-1">{SFS_DEPOSIT_ADDRESS}</code>
                                    <button onClick={() => copyText(SFS_DEPOSIT_ADDRESS)} className="p-1.5 hover:bg-white/10 rounded-md shrink-0">
                                        {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-red-400 uppercase font-bold">⚠️ MEMO (obligatorio)</label>
                                <div className="flex items-center gap-2 bg-red-500/10 p-2 rounded-lg border border-red-500/30">
                                    <code className="text-red-200 text-sm font-bold flex-1">{userMemo}</code>
                                    <button onClick={() => copyText(userMemo)} className="p-1.5 hover:bg-red-500/20 rounded-md shrink-0">
                                        <Copy className="w-3.5 h-3.5 text-red-300" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground/60">Sin el MEMO tu depósito no será identificado</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Retirar */}
            {activeTab === 'withdraw' && (
                <form onSubmit={handleWithdraw} className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Dirección de Retiro (TON)</label>
                        <div className="flex gap-2">
                            <input type="text" value={payoutAddress} onChange={e => setPayoutAddress(e.target.value)}
                                placeholder="UQ..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:border-purple-500 outline-none" />
                            <button type="button" onClick={savePayoutAddress} disabled={savingAddress}
                                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                                {savingAddress ? <Loader className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Monto (USD)</label>
                        <input type="number" step="0.01" min="1" max={balance} value={withdrawAmount}
                            onChange={e => setWithdrawAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:border-purple-500 outline-none" />
                        <p className="text-[10px] text-muted-foreground/60">Disponible: ${balance.toFixed(2)} USD</p>
                    </div>
                    {error && <p className="text-red-400 text-xs flex items-center gap-1 bg-red-500/10 border border-red-500/20 p-3 rounded-xl"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
                    {success && <p className="text-green-400 text-xs flex items-center gap-1 bg-green-500/10 border border-green-500/20 p-3 rounded-xl"><CheckCircle className="w-3 h-3 shrink-0" />{success}</p>}
                    <button type="submit" disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                        {withdrawLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {withdrawLoading ? 'Procesando...' : 'Solicitar Retiro'}
                    </button>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 space-y-1">
                        <p className="font-bold">ℹ️ Proceso de retiro:</p>
                        <p>1. Se reserva el monto inmediatamente</p>
                        <p>2. El admin verifica y procesa en 24-48h</p>
                        <p>3. El USDT llega a tu billetera TON</p>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SfsWalletPanel;
