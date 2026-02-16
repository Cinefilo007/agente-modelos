import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Lock, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TransactionList = ({ transactions, loading }) => {
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-white/10 rounded"></div>
                                <div className="h-3 w-16 bg-white/10 rounded"></div>
                            </div>
                        </div>
                        <div className="h-4 w-16 bg-white/10 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 text-white/40">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay transacciones recientes.</p>
            </div>
        );
    }

    const getIcon = (type) => {
        switch (type) {
            case 'DEPOSIT':
            case 'ESCROW_RELEASE':
            case 'ESCROW_REFUND':
                return <ArrowDownLeft className="text-green-400" />;
            case 'WITHDRAWAL':
            case 'ESCROW_LOCK':
            case 'FEE':
                return <ArrowUpRight className="text-red-400" />;
            default:
                return <Clock className="text-gray-400" />;
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'DEPOSIT': return 'Depósito Recibido';
            case 'WITHDRAWAL': return 'Retiro de Fondos';
            case 'ESCROW_LOCK': return 'Pago en Custodia (Servicio)';
            case 'ESCROW_RELEASE': return 'Pago Liberado (Ganancia)';
            case 'ESCROW_REFUND': return 'Reembolso';
            case 'FEE': return 'Comisión de Plataforma';
            default: return type;
        }
    };

    const isPositive = (type) => {
        return ['DEPOSIT', 'ESCROW_RELEASE', 'ESCROW_REFUND'].includes(type);
    };

    return (
        <div className="space-y-3">
            {transactions.map((tx) => (
                <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10"
                >
                    <div className="flex items-center gap-4">
                        <div className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center bg-white/5",
                            isPositive(tx.type) ? "text-green-400" : "text-red-400"
                        )}>
                            {getIcon(tx.type)}
                        </div>

                        <div>
                            <p className="font-medium text-white">{getLabel(tx.type)}</p>
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <span>{format(new Date(tx.created_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
                                {tx.status === 'PENDING' && <span className="text-yellow-400 flex items-center gap-1"><Clock size={10} /> Pendiente</span>}
                                {tx.status === 'FAILED' && <span className="text-red-400 flex items-center gap-1"><XCircle size={10} /> Fallido</span>}
                                {tx.tx_hash && (
                                    <a
                                        href={`https://tonviewer.com/transaction/${tx.tx_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-purple-400 underline decoration-dotted"
                                    >
                                        Ver en Explorer
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className={clsx(
                            "font-bold text-lg",
                            isPositive(tx.type) ? "text-green-400" : "text-white"
                        )}>
                            {isPositive(tx.type) ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-white/40">{tx.currency}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransactionList;
