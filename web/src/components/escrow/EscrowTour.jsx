import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTheme } from '../../context/ThemeContext';

export default function EscrowTour({ run, onFinish }) {
    const { themeColor } = useTheme();

    const [steps] = useState([
        {
            target: '.service-card-tour',
            content: 'Aquí puedes ver los servicios que ofrece la modelo. Haz clic en uno para ver más detalles.',
            disableBeacon: true,
        },
        {
            target: '.service-rules-tour',
            content: 'Cada servicio tiene sus propias reglas y beneficios. Lee con atención antes de proceder.',
        },
        {
            target: '.escrow-badge-tour',
            content: '¡Tu seguridad es lo primero! Todas las compras dentro de la app están protegidas por nuestro sistema Escrow. El dinero solo se libera cuando tú confirmas.',
        },
        {
            target: '.contact-model-tour',
            content: 'Paso Crucial: Siempre habla con la modelo por Telegram antes de pagar para confirmar disponibilidad inmediata.',
        },
        {
            target: '.checkout-options-tour',
            content: 'Puedes elegir pagar con tu Billetera Nebula para máxima protección, o coordinar directamente si ya confías en la modelo.',
        }
    ]);

    const handleJoyrideCallback = (data) => {
        const { status, action } = data;
        
        // Si el tour se termina, se salta o se cierra manualmente
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === 'close') {
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
            if (onFinish) onFinish();
        }
    };

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideBackButton
            run={run}
            scrollToFirstStep={false}
            disableScrolling={true}
            disableScrollParentFix={true}
            showProgress
            showSkipButton
            steps={steps}
            styles={{
                options: {
                    primaryColor: themeColor,
                    backgroundColor: '#1a1a1e',
                    textColor: '#ffffff',
                    arrowColor: '#1a1a1e',
                    zIndex: 1000,
                },
                tooltipContainer: {
                    textAlign: 'left',
                    borderRadius: '20px',
                    padding: '10px'
                },
                buttonNext: {
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    padding: '10px 20px'
                },
                buttonSkip: {
                    color: '#888'
                }
            }}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Entendido',
                next: 'Siguiente',
                skip: 'Saltar tour'
            }}
        />
    );
}
