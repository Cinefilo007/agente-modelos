import React from 'react';
import {
    MessageCircle, HelpCircle, Shield, LifeBuoy,
    ArrowLeft, ExternalLink, Mail, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Support() {
    const navigate = useNavigate();
    const { themeColor } = useTheme();

    const faqs = [
        {
            q: \"¿Cómo funciona el sistema de Escrow?\",
            a: \"El sistema de Escrow congela tus fondos de forma segura hasta que el servicio sea realizado. Una vez que confirmas la entrega, los fondos se liberan a la modelo.\"
        },
        {
            q: \"¿Qué hago si hay un problema con mi orden?\",
            a: \"Si surge un inconveniente, no liberes los fondos. Contacta directamente a soporte técnico a través del canal oficial de Telegram para iniciar una disputa.\"
        },
        {
            q: \"¿Cómo recargo mi billetera?\",
            a: \"Ve a tu perfil, pulsa en 'Recargar' dentro de tu tarjeta de billetera y sigue las instrucciones para enviar USDT vía red TRC-20.\"
        }
    ];

    return (
        <div className=\"min-h-screen bg-black text-white pb-32 pt-6 px-4 max-w-lg mx-auto animate-in fade-in duration-500\">
    {/* Header */ }
    <div className=\"flex items-center mb-10\">
        < button onClick = {() => navigate(-1)
} className =\"p-2 rounded-full hover:bg-white/10 text-muted-foreground mr-2 transition-colors\">
    < ArrowLeft size = { 22} />
                </button >
                <div>
                    <h1 className=\"font-bold text-2xl leading-tight\">Centro de Ayuda</h1>
                    <p className=\"text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-70\">Soporte y Seguridad Nebula</p>
                </div >
            </div >

    {/* Quick Actions */ }
    < div className =\"grid grid-cols-2 gap-4 mb-10\">
        < button
onClick = {() => window.open('https://t.me/NebulaSupportBot', '_blank')}
className =\"bg-blue-600/10 border border-blue-500/20 p-5 rounded-[2.5rem] flex flex-col items-center text-center group active:scale-95 transition-all\"
    >
    <div className=\"p-3 bg-blue-500 rounded-2xl text-white mb-3 shadow-[0_10px_20px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform\">
        < MessageCircle size = { 24} />
                    </div >
    <span className=\"text-xs font-bold\">Telegram Chat</span>
        < span className =\"text-[9px] text-blue-400 mt-1 uppercase font-black\">Respuesta Rápida</span>
                </button >

    <button
        onClick={() => window.open('mailto:support@nebula.app', '_blank')}
        className=\"bg-purple-600/10 border border-purple-500/20 p-5 rounded-[2.5rem] flex flex-col items-center text-center group active:scale-95 transition-all\"
            >
            <div className=\"p-3 bg-purple-500 rounded-2xl text-white mb-3 shadow-[0_10px_20px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform\">
                < Mail size = { 24} />
                    </div >
    <span className=\"text-xs font-bold\">Correo Soporte</span>
        < span className =\"text-[9px] text-purple-400 mt-1 uppercase font-black\">Casos Complejos</span>
                </button >
            </div >

    {/* Security Banner */ }
    < div className =\"bg-gradient-to-br from-[#1a1c2e] to-black border border-white/5 rounded-[3rem] p-6 mb-10 flex items-center gap-5 relative overflow-hidden\">
        < div className =\"absolute -right-4 -top-4 opacity-5\">
            < Shield size = { 120} />
                </div >
    <div className=\"p-4 bg-yellow-500/10 rounded-3xl text-yellow-500 relative z-10\">
        < Shield size = { 32} />
                </div >
    <div className=\"relative z-10\">
        < h3 className =\"font-black text-white italic tracking-tighter text-lg\">SEGURIDAD PRIMERO</h3>
            < p className =\"text-xs text-muted-foreground leading-relaxed\">Nunca compartas tu clave de seguridad ni envíes dinero fuera de la plataforma si deseas protección.</p>
                </div >
            </div >

    {/* FAQs */ }
    < h3 className =\"text-xs font-black uppercase text-muted-foreground tracking-widest mb-4 px-2 flex items-center gap-2\">
        < HelpCircle size = { 14} className =\"text-primary\" style={{ color: themeColor }} /> Preguntas Frecuentes
            </h3 >
    <div className=\"space-y-3\">
{
    faqs.map((faq, i) => (
        <div key={i} className=\"bg-white/5 border border-white/5 rounded-3xl p-5 hover:bg-white/10 transition-colors group cursor-default\">
    < h4 className =\"font-bold text-sm text-white mb-2 group-hover:text-primary transition-colors\" style={{ groupHover: { color: themeColor } }}>{faq.q}</h4>
    < p className =\"text-xs text-muted-foreground leading-relaxed opacity-80\">{faq.a}</p>
                    </div >
                ))
}
            </div >

    {/* Footer Contact */ }
    < div className =\"mt-12 text-center p-8 border border-dashed border-white/10 rounded-3xl\">
        < HelpCircle size = { 32} className =\"mx-auto mb-3 text-muted-foreground opacity-30\" />
            < p className =\"text-xs text-muted-foreground\">¿Aún tienes dudas? Nuestro equipo está disponible 24/7 para ayudarte.</p>
                < div className =\"flex justify-center gap-6 mt-6\">
                    < span className =\"text-[10px] font-black uppercase tracking-tighter text-muted-foreground flex items-center gap-1\">
                        < Shield size = { 12} /> Encriptación SSL
                    </span >
    <span className=\"text-[10px] font-black uppercase tracking-tighter text-muted-foreground flex items-center gap-1\">
        < LifeBuoy size = { 12} /> 24 / 7 Support
                    </span >
                </div >
            </div >
        </div >
    );
}
