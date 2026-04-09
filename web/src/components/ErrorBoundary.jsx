import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">¡Algo salió mal! 😵</h1>
                    <p className="text-gray-400 mb-6">Ha ocurrido un error inesperado en la aplicación.</p>
                    <div className="bg-gray-900 p-6 rounded-[2rem] border border-white/5 max-w-2xl w-full overflow-auto text-left shadow-2xl backdrop-blur-3xl">
                        <p className="font-mono text-red-400 text-sm mb-4 break-all">
                            {this.state.error && (typeof this.state.error === 'object' 
                                ? JSON.stringify(this.state.error, null, 2) 
                                : String(this.state.error))}
                        </p>
                        <pre className="font-mono text-xs text-gray-500 whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 font-bold transition-colors"
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
