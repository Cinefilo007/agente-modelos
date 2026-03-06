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
            audio.play().catch(e => { }); // Silently fail to avoid console clutter
        } catch (e) {
            // Silently fail to avoid console clutter
        }
    };

    // Logical slices (Equitable Distribution V4)
    const allSlices = useMemo(() => {
        let items = [];
        if (!prizes.length) return items;

        const totalSlices = 24;
        const prizeCount = prizes.length;

        // Calculate even steps for rewards
        const step = totalSlices / prizeCount;
        const prizePositions = prizes.map((_, idx) => Math.floor(idx * step));

        for (let i = 0; i < totalSlices; i++) {
            const prizeIndexForPos = prizePositions.indexOf(i);
            if (prizeIndexForPos !== -1) {
                items.push({
                    ...prizes[prizeIndexForPos],
                    isPrize: true,
                    originalIndex: prizeIndexForPos,
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

            return {
                ...item,
                path: pathData,
                color: item.isPrize ? (i % 2 === 0 ? 'url(#purpleSlice)' : 'url(#blueSlice)') : (i % 2 === 0 ? '#1a1425' : '#120d1a'),
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
    }, [winnerIndex, allSlices]);

    const spinTo = async (index) => {
        if (allSlices.length === 0) return;

        const sliceSize = 360 / allSlices.length;
        // Visual Randomness: Stop at a random point inside the winning slice (+/- 25% from center)
        const randomOffset = (Math.random() - 0.5) * (sliceSize * 0.5);

        const targetRotation = 360 - (index * sliceSize) - (sliceSize / 2) + randomOffset;
        // Ensure it always spins several full turns
        const totalRotation = (lastRotation - (lastRotation % 360)) + (360 * 15) + targetRotation;

        await controls.start({
            rotate: totalRotation,
            transition: {
                duration: 9,
                ease: [0.12, 0, 0.1, 1], // Even more dramatic slowdown
            }
        });

        const won = allSlices[index].isPrize;
        playSound(won ? 'win' : 'lose');
        setLastRotation(totalRotation);
        if (onFinished) onFinished(won);
    };

    return (
        <div className="roulette-container">
            {/* Base Estática con Sombras y Brillos */}
            <div className="roulette-static-base" style={{ borderColor: `${themeColor}44` }}>
                {/* Outer Neon Ring (Static) */}
                <svg viewBox="0 0 100 100" className="roulette-static-overlay">
                    <defs>
                        <filter id="glow-static">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <circle cx="50" cy="50" r="48.5" fill="none" stroke={themeColor} strokeWidth="1" filter="url(#glow-static)" opacity="0.6">
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />
                    </circle>
                </svg>

                {/* Glass Gloss Effect (Static) */}
                <div className="roulette-glass-shine"></div>

                <motion.div
                    className="roulette-wheel-plate"
                    animate={controls}
                    style={{ rotate: lastRotation }}
                    onUpdate={(latest) => {
                        const rot = typeof latest.rotate === 'number' ? latest.rotate : lastRotation;
                        const step = 360 / allSlices.length;
                        if (Math.floor(rot / step) !== Math.floor(lastTickAngle / step)) {
                            if (isSpinning) playSound('tick');
                            setLastTickAngle(rot);
                        }
                    }}
                >
                    <svg viewBox="0 0 100 100" className="roulette-svg">
                        <defs>
                            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#ffd700', stopOpacity: 1 }} />
                                <stop offset="50%" style={{ stopColor: '#bf953f', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#fcf6ba', stopOpacity: 1 }} />
                            </linearGradient>

                            {/* Vibrancy Gradients */}
                            <linearGradient id="purpleSlice" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#3a007d', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#5e00c9', stopOpacity: 1 }} />
                            </linearGradient>
                            <linearGradient id="blueSlice" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#002b5c', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#004daa', stopOpacity: 1 }} />
                            </linearGradient>
                        </defs>

                        {allSlices.map((slice, i) => (
                            <g key={i}>
                                <path
                                    d={slice.path}
                                    fill={slice.isPrize ? (i % 2 === 0 ? 'url(#purpleSlice)' : 'url(#blueSlice)') : (i % 2 === 0 ? '#1a1425' : '#120d1a')}
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth="0.15"
                                />
                                <g transform={`rotate(${slice.labelAngle} 50 50)`}>
                                    {slice.isPrize ? (
                                        <text
                                            x="50"
                                            y="18" // Alejar del centro (antes 26)
                                            fill="#fff"
                                            fontSize="2.6"
                                            fontWeight="900"
                                            textAnchor="middle"
                                            transform="rotate(-90 50 18)"
                                            style={{ textShadow: '0 0 12px rgba(255,255,255,0.7)', letterSpacing: '0.4px' }}
                                        >
                                            {slice.prize_name}
                                        </text>
                                    ) : (
                                        <text
                                            x="50"
                                            y="46" // Más al borde (antes 42)
                                            fill="#ffffff"
                                            fontSize="4.2"
                                            fontWeight="950"
                                            textAnchor="middle"
                                            transform="rotate(-90 50 46)"
                                            stroke="#000"
                                            strokeWidth="0.2"
                                            paintOrder="stroke"
                                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,1))' }}
                                        >
                                            {slice.wheelNumber}
                                        </text>
                                    )}
                                </g>
                            </g>
                        ))}
                    </svg>
                </motion.div>

                {/* Static Center Hub */}
                <div className="roulette-center-hub">
                    <div className="hub-outer" style={{ borderColor: themeColor }}></div>
                    <div className="hub-inner"></div>
                </div>
            </div>

            {/* Pointer (Static) */}
            <div className="roulette-pointer-wrapper">
                <div className="roulette-v-pointer" style={{ filter: `drop-shadow(0 0 10px ${themeColor})` }}></div>
            </div>

            <div className="roulette-controls">
                <button
                    onClick={() => !isSpinning && onSpin()}
                    className="roulette-spin-btn"
                    disabled={isSpinning || prizes.length === 0}
                    style={{
                        background: `linear-gradient(135deg, ${themeColor}, #000)`,
                        boxShadow: `0 0 25px ${themeColor}66`
                    }}
                >
                    {isSpinning ? '...' : 'PLAY'}
                </button>
            </div>
        </div>
    );
}
