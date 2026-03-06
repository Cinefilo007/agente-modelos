import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

export function Roulette({ prizes, onSpin, isSpinning, winnerIndex, themeColor, onFinished }) {
    const controls = useAnimation();
    const [lastRotation, setLastRotation] = useState(0);
    const [lastTickAngle, setLastTickAngle] = useState(0);

    const [audioReady, setAudioReady] = useState(false);

    // Audio effects Setup
    const playSound = (type) => {
        if (!audioReady) return;
        try {
            const sounds = {
                tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Casino wheel tick
                win: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Win fanfare
                lose: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' // Sad trombone/lose
            };
            const audio = new Audio(sounds[type]);
            audio.volume = type === 'tick' ? 0.2 : 0.5;
            audio.play().catch(e => console.log("Audio play blocked"));
        } catch (e) {
            // Silently fail to avoid console clutter
        }
    };

    // Logical slices (Interpolated)
    const allSlices = useMemo(() => {
        let items = [];
        if (!prizes.length) return items;

        const totalSlices = 24;
        const prizeCount = prizes.length;

        for (let i = 0; i < totalSlices; i++) {
            if (i % 3 === 0 && items.filter(it => it.isPrize).length < prizeCount) {
                const pIndex = items.filter(it => it.isPrize).length;
                items.push({
                    ...prizes[pIndex],
                    isPrize: true,
                    originalIndex: pIndex,
                    wheelNumber: Math.floor(Math.random() * 36) + 1
                });
            } else {
                items.push({
                    prize_name: '',
                    isPrize: false,
                    wheelNumber: Math.floor(Math.random() * 36) + 1
                });
            }
        }

        const angle = 360 / items.length;
        return items.map((item, i) => {
            const startAngle = i * angle;
            const endAngle = (i + 1) * angle;
            const rad1 = ((startAngle - 90) * Math.PI) / 180;
            const rad2 = ((endAngle - 90) * Math.PI) / 180;
            const x1 = 50 + 50 * Math.cos(rad1);
            const y1 = 50 + 50 * Math.sin(rad1);
            const x2 = 50 + 50 * Math.cos(rad2);
            const y2 = 50 + 50 * Math.sin(rad2);

            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

            // High Fidelity Colors: Purples, Violets, Cyans
            let color = '#1a0b2e'; // Deep night purple
            if (item.isPrize) {
                color = i % 2 === 0 ? '#4b0082' : '#2d0050'; // Indigo vs Deep Purple
            } else {
                color = i % 2 === 0 ? '#111' : '#0a0a0a'; // Very dark contrast
            }

            return {
                ...item,
                path: pathData,
                color: color,
                labelAngle: startAngle + angle / 2,
                angleSize: angle
            };
        });
    }, [prizes]);

    useEffect(() => {
        // ONLY trigger if winnerIndex is a valid result (not null on mount)
        if (winnerIndex !== null && winnerIndex !== undefined) {
            // Unlock audio on first real action
            if (!audioReady) setAudioReady(true);

            const mappedIndex = allSlices.findIndex(s => s.originalIndex === winnerIndex && s.isPrize);
            const targetIndex = mappedIndex !== -1 ? mappedIndex : allSlices.findIndex(s => !s.isPrize);
            spinTo(targetIndex);
        }
    }, [winnerIndex, audioReady, allSlices]); // Only depend on winnerIndex to avoid re-triggers

    const spinTo = async (index) => {
        if (allSlices.length === 0) return;

        const sliceSize = 360 / allSlices.length;
        const targetRotation = 360 - (index * sliceSize) - (sliceSize / 2);
        // Ensure it always spins several full turns
        const totalRotation = (lastRotation - (lastRotation % 360)) + (360 * 12) + targetRotation;

        await controls.start({
            rotate: totalRotation,
            transition: {
                duration: 8,
                ease: [0.1, 0, 0.1, 1], // Very slow end
            }
        });

        const won = allSlices[index].isPrize;
        playSound(won ? 'win' : 'lose');
        setLastRotation(totalRotation);
        if (onFinished) onFinished(won);
    };

    return (
        <div className="roulette-container">
            {/* V-Pointer (Golden) */}
            <div className="roulette-pointer-wrapper">
                <div className="roulette-v-pointer" style={{ boxShadow: `0 0 20px ${themeColor}` }}></div>
            </div>

            <motion.div
                className="roulette-wheel-wrapper"
                animate={controls}
                style={{ rotate: lastRotation }}
                onUpdate={(latest) => {
                    const rot = typeof latest.rotate === 'number' ? latest.rotate : lastRotation;
                    const step = 360 / allSlices.length;
                    if (Math.floor(rot / step) !== Math.floor(lastTickAngle / step)) {
                        // Only play if actively spinning to avoid mount error
                        if (isSpinning) playSound('tick');
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
                    <circle cx="50" cy="50" r="49" fill="none" stroke={themeColor} strokeWidth="1" filter="url(#glow)" opacity="0.8">
                        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>

                    {allSlices.map((slice, i) => (
                        <g key={i}>
                            <path
                                d={slice.path}
                                fill={slice.color}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="0.1"
                            />
                            <g transform={`rotate(${slice.labelAngle} 50 50)`}>
                                {slice.isPrize ? (
                                    <text
                                        x="50"
                                        y="30" // Closer to center for prizes
                                        fill="white"
                                        fontSize="2.1"
                                        fontWeight="900"
                                        textAnchor="middle"
                                        transform="rotate(-90 50 30)" // Rotated to read from center -> out
                                        style={{ textShadow: '0 0 5px rgba(0,0,0,1)', letterSpacing: '0.1px' }}
                                    >
                                        {slice.prize_name}
                                    </text>
                                ) : (
                                    <text
                                        x="50"
                                        y="45" // Pegado al borde exterior
                                        fill="rgba(255,255,255,0.5)"
                                        fontSize="2.8"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        transform="rotate(-90 50 45)"
                                    >
                                        {slice.wheelNumber}
                                    </text>
                                )}
                            </g>
                        </g>
                    ))}

                    {/* Inner Decorative Rings */}
                    <circle cx="50" cy="50" r="12" fill="#0c0715" stroke={themeColor} strokeWidth="0.5" filter="url(#glow)" />
                    <circle cx="50" cy="50" r="10" fill="url(#goldGrad)" />
                    <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
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
