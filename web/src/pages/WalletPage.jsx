import React from 'react';
import WalletPanel from '../components/wallet/WalletPanel';

const WalletPage = () => {
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6 pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Mi Billetera</h1>
                <p className="text-gray-400 mt-2">Gestiona tu saldo y recargas para contratar servicios.</p>
            </header>

            <WalletPanel />
        </div>
    );
};

export default WalletPage;
