import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

export function Roulette({ prizes, onSpin, isSpinning, winnerIndex, themeColor }) {
    const controls = useAnimation();
    const [lastRotation, setLastRotation] = useState(0);

    // Dynamic slice calculation
    const slices = useMemo(() => {
        if (!prizes.length) return [];
        const angle = 360 / prizes.length;
        return prizes.map((prize, i) => {
            const startAngle = i * angle;
            const endAngle = (i + 1) * angle;

            // Convert polar to cartesian for SVG path
            const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
            const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
            const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
            const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

            const largeArc = angle > 180 ? 1 : 0;
            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return {
                path: pathData,
                color: i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)',
                labelAngle: startAngle + angle / 2,
                name: prize.prize_name
            };
        });
    }, [prizes]);

    useEffect(() => {
        if (winnerIndex !== -1 && !isSpinning) {
            spinTo(winnerIndex);
        }
    }, [winnerIndex, isSpinning]);

    const spinTo = async (index) => {
        const sliceSize = 360 / prizes.length;
        // The pointer is at the top (0 deg). 
        // We want the winning slice to end at the pointer.
        // Rotation is clockwise. Offset by half a slice to center it.
        const targetRotation = 360 - (index * sliceSize) - (sliceSize / 2);

        const totalRotation = lastRotation + (360 * 8) + targetRotation - (lastRotation % 360);

        await controls.start({
            rotate: totalRotation,
            transition: {
                duration: 6,
                ease: [0.15, 0, 0.15, 1],
            }
        });
        setLastRotation(totalRotation);
    };

    return (
        <div className="roulette-container">
            <div className="roulette-pointer" style={{ borderBottomColor: themeColor }}></div>

            <motion.div
                className="roulette-wheel-wrapper"
                animate={controls}
                style={{ rotate: lastRotation }}
            >
                <svg viewBox="0 0 100 100" className="roulette-svg">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {slices.map((slice, i) => (
                        <g key={i}>
                            <path
                                d={slice.path}
                                fill={slice.color}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="0.5"
                            />
                            <g transform={`rotate(${slice.labelAngle} 50 50)`}>
                                <text
                                    x="50"
                                    y="15"
                                    fill="white"
                                    fontSize="3.5"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    transform={`rotate(0 50 15)`}
                                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                                >
                                    {slice.name}
                                </text>
                            </g>
                        </g>
                    ))}
                    <circle cx="50" cy="50" r="48" fill="none" stroke={themeColor} strokeWidth="1" opacity="0.3" />
                </svg>

                <div className="roulette-center" style={{ backgroundColor: themeColor }}>
                    <div className="roulette-center-inner"></div>
                </div>
            </motion.div>

            <button
                onClick={() => !isSpinning && onSpin()}
                className="roulette-btn"
                disabled={isSpinning || prizes.length === 0}
                style={{ backgroundColor: themeColor }}
            >
                {isSpinning ? '...' : 'GIRAR'}
            </button>
        </div>
    );
}
