import React from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTheme } from '../../context/ThemeContext';

export function CreatorTour({ run, onFinish }) {
    const { themeColor } = useTheme();
    const primaryColor = themeColor || '#9333ea';

    const steps = [
        {
            target: '#tour-profile-header',
            content: '🌟 Bienvenida a tu Perfil de Creadora. Aquí puedes ver tu reputación, tus créditos y configurar tu cuenta. Un perfil completo y verificado atrae clientes de más alto valor.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '#tour-stories-section',
            content: '📸 ¡Atrae a tus fans en tiempo real! Puedes publicar Historias Rápidas o ver las que ya tienes. Las historias duran 24 horas y mantienen a tu audiencia enganchada.',
            placement: 'bottom',
        },
        {
            target: '#tour-profile-content',
            content: '🛍️ Transforma likes en ventas. Aquí puedes subir fotos a tu Galería, crear nuevos Servicios VIP en tu Tienda Interactiva y ver las Reseñas que te dejan tus mejores clientes.',
            placement: 'top',
        },
        {
            target: '#tour-wand',
            content: '✨ ¡Hazlo tuyo! Toca esta Varita Mágica en cualquier momento para personalizar los colores de fondo y luces de tu perfil. Dale el toque estético de tu propia marca personal.',
            placement: 'top-start',
        }
    ];

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
        
        if (finishedStatuses.includes(status)) {
            onFinish();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            showSkipButton={true}
            showProgress={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: primaryColor,
                    backgroundColor: '#1E1E2E',
                    textColor: '#fff',
                    arrowColor: '#1E1E2E',
                    overlayColor: 'rgba(0, 0, 0, 0.75)' // oscurecer más para enfocar
                },
                tooltip: {
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                tooltipTitle: {
                    fontSize: '18px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                },
                tooltipContent: {
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#d4d4d8'
                },
                buttonNext: {
                    backgroundColor: primaryColor,
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontWeight: '900',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transition: 'all 0.2s ease'
                },
                buttonBack: {
                    color: '#a1a1aa',
                    marginRight: '12px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                },
                buttonSkip: {
                    color: '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                }
            }}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: '¡A Facturar! 🚀',
                next: 'Siguiente',
                skip: 'Saltar Tour',
            }}
        />
    );
}
