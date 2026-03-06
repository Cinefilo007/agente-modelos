import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

export function Roulette({ prizes, onSpin, isSpinning, winnerIndex, themeColor, onFinished }) {
    const controls = useAnimation();
    const [lastRotation, setLastRotation] = useState(0);
    const [lastTickAngle, setLastTickAngle] = useState(0);

    // Audio effects Setup
    const playSound = (type) => {
        try {
            const sounds = {
                tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Casino wheel tick
                win: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Win fanfare
                lose: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' // Sad trombone/lose
            };
            const audio = new Audio(sounds[type]);
            audio.volume = type === 'tick' ? 0.3 : 0.6;
            audio.play();
        } catch (e) {
            console.error("Audio error:", e);
        }
    };

    // Logical slices (Interpolated)
    const allSlices = useMemo(() => {
        let items = [];
        if (!prizes.length) return items;

        // Ensure at least 12 slices for a professional visual
        const minSlices = 12;
        const prizeCount = prizes.length;

        // Strategy: Prize, Empty, Prize, Empty...
        for (let i = 0; i < Math.max(minSlices, prizeCount * 2); i++) {
            if (i % 2 === 0 && items.filter(it => it.isPrize).length < prizeCount) {
                const pIndex = items.filter(it => it.isPrize).length;
                items.push({
                    ...prizes[pIndex],
                    isPrize: true,
                    originalIndex: pIndex
                });
            } else {
                items.push({
                    prize_name: 'Suerte Próxima',
                    isPrize: false,
                    color: 'rgba(0,0,0,0.4)'
                });
            }
        }

        const angle = 360 / items.length;
        return items.map((item, i) => {
            const startAngle = i * angle;
            const endAngle = (i + 1) * angle;
            const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
            const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
            const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
            const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);
            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;

            return {
                ...item,
                path: pathData,
                color: item.isPrize
                    ? (i % 4 === 0 ? 'rgba(147, 51, 234, 0.4)' : 'rgba(59, 130, 246, 0.4)')
                    : 'rgba(255, 255, 255, 0.03)',
                labelAngle: startAngle + angle / 2,
                angleSize: angle
            };
        });
    }, [prizes]);

    useEffect(() => {
        if (winnerIndex !== -1 && !isSpinning) {
            const mappedIndex = allSlices.findIndex(s => s.originalIndex === winnerIndex && s.isPrize);

            // If winnerIndex is -1 (from backend but mapped differently) or lost result
            // we should pick an empty slice. 
            // In Casino.jsx we'll pass winnerIndex -1 if lose.
            const targetIndex = mappedIndex !== -1 ? mappedIndex : allSlices.findIndex(s => !s.isPrize);
            spinTo(targetIndex);
        }
    }, [winnerIndex, isSpinning]);

    const spinTo = async (index) => {
        const sliceSize = 360 / allSlices.length;
        const targetRotation = 360 - (index * sliceSize) - (sliceSize / 2);
        const totalRotation = lastRotation + (360 * 10) + targetRotation - (lastRotation % 360);

        // Sound listener for ticks
        const checkTicks = (latest) => {
            const currentAngle = latest % 360;
            const step = 360 / allSlices.length;
            if (Math.abs(currentAngle - lastTickAngle) >= step) {
                playSound('tick');
                setLastTickAngle(currentAngle);
            }
        };

        await controls.start({
            rotate: totalRotation,
            transition: {
                duration: 7,
                ease: [0.15, 0, 0.15, 1],
            }
        });

        // End sound and feedback
        const won = allSlices[index].isPrize;
        playSound(won ? 'win' : 'lose');
        setLastRotation(totalRotation);
        if (onFinished) onFinished(won);
    };

    return (
        <div className="roulette-container">
            {/* V-Pointer (Golden) */}
            <div className="roulette-pointer-wrapper">
                <div className="roulette-v-pointer" style={{ filter: `drop-shadow(0 0 10px ${themeColor})` }}></div>
            </div>

            <motion.div
                className="roulette-wheel-wrapper"
                animate={controls}
                style={{ rotate: lastRotation }}
                onUpdate={(latest) => {
                    const rot = typeof latest.rotate === 'number' ? latest.rotate : lastRotation;
                    const step = 360 / allSlices.length;
                    if (Math.floor(rot / step) !== Math.floor(lastTickAngle / step)) {
                        playSound('tick');
                        setLastTickAngle(rot);
                    }
                }}
            >
                <svg viewBox="0 0 100 100" className="roulette-svg">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#ffd700', stopOpacity: 1 }} />
                            <stop offset="50%" style={{ stopColor: '#bf953f', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#fcf6ba', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>

                    {/* Outer Neon Ring */}
                    <circle cx="50" cy="50" r="49" fill="none" stroke={themeColor} strokeWidth="1.5" filter="url(#glow)" opacity="0.6">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>

                    {allSlices.map((slice, i) => (
                        <g key={i}>
                            <path
                                d={slice.path}
                                fill={slice.color}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="0.3"
                            />
                            <g transform={`rotate(${slice.labelAngle} 50 50)`}>
                                <text
                                    x="50"
                                    y="12"
                                    fill={slice.isPrize ? "white" : "rgba(255,255,255,0.3)"}
                                    fontSize={slice.isPrize ? "2.8" : "2.2"}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    transform={`rotate(0 50 12)`}
                                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                                >
                                    {slice.prize_name}
                                </text>
                            </g>
                        </g>
                    ))}

                    {/* Inner Decorative Rings */}
                    <circle cx="50" cy="50" r="10" fill="url(#goldGrad)" filter="url(#glow)" />
                    <circle cx="50" cy="50" r="12" fill="none" stroke="url(#goldGrad)" strokeWidth="0.5" opacity="0.5" />
                </svg>
            </motion.div>

            <div className="roulette-controls">
                <button
                    onClick={() => !isSpinning && onSpin()}
                    className="roulette-spin-btn"
                    disabled={isSpinning || prizes.length === 0}
                    style={{
                        boxShadow: `0 0 20px ${themeColor}44`,
                        background: `linear-gradient(45deg, ${themeColor}, #000)`
                    }}
                >
                    {isSpinning ? '...' : 'PLAY'}
                </button>
            </div>
        </div>
    );
}
