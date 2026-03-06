import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './SlotMachine.css';

const SYMBOLS = ['7️⃣', '💎', '⭐', '🍒', '🔔', '🍋', '🍀', '🔥'];

export function SlotMachine({ onSpin, isSpinning, result, themeColor, onFinished }) {
    // Each reel stores the index of the symbol it lands on.
    const [reels, setReels] = useState([0, 1, 2]);
    const controls = [useAnimation(), useAnimation(), useAnimation()];

    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        if (isSpinning && !isStopping) {
            if (result) {
                stopSpinning(result);
            } else {
                startSpinning();
            }
        }
    }, [isSpinning, result, isStopping]);

    const startSpinning = () => {
        setIsStopping(false);
        controls.forEach(control => {
            control.start({
                y: [0, -640],
                transition: {
                    duration: 0.6, // Faster spin for excitement
                    repeat: Infinity,
                    ease: "linear"
                }
            });
        });
    };

    const stopSpinning = async (res) => {
        if (isStopping) return;
        setIsStopping(true);

        let winnerIdx = Math.floor(Math.random() * SYMBOLS.length);
        let finalIndexes = res.won ? [winnerIdx, winnerIdx, winnerIdx] : [
            Math.floor(Math.random() * SYMBOLS.length),
            Math.floor(Math.random() * SYMBOLS.length),
            Math.floor(Math.random() * SYMBOLS.length)
        ];

        if (!res.won && finalIndexes[0] === finalIndexes[1] && finalIndexes[1] === finalIndexes[2]) {
            finalIndexes[0] = (finalIndexes[0] + 1) % SYMBOLS.length;
        }

        const symbolHeight = 80;

        // Staggered stop
        for (let i = 0; i < 3; i++) {
            const finalPos = -(finalIndexes[i] * symbolHeight);
            await new Promise(r => setTimeout(r, i * 600));

            await controls[i].start({
                y: [null, finalPos - (640 * 2)],
                transition: {
                    duration: 2,
                    ease: [0.45, 0.05, 0.55, 0.95]
                }
            });

            setReels(prev => {
                const next = [...prev];
                next[i] = finalIndexes[i];
                return next;
            });
        }

        if (onFinished) onFinished(res.won);
        setIsStopping(false);
    };

    const ReelColumn = ({ control, finalIdx }) => {
        // Create a long strip of symbols for the infinite effect
        const strip = useMemo(() => {
            let s = [];
            // Duplicate symbols several times for the strip
            for (let i = 0; i < 4; i++) s = [...s, ...SYMBOLS];
            return s;
        }, []);

        return (
            <div className="slot-reel-viewport">
                <motion.div
                    className="slot-reel-strip"
                    animate={control}
                >
                    {strip.map((sym, i) => (
                        <div key={i} className="slot-symbol-item">
                            {sym}
                        </div>
                    ))}
                </motion.div>
            </div>
        );
    };

    return (
        <div className="slots-container">
            <div className="slots-machine-body border-4" style={{ borderColor: themeColor }}>
                <div className="slots-window">
                    {[0, 1, 2].map((i) => (
                        <ReelColumn key={i} control={controls[i]} finalIdx={reels[i]} />
                    ))}
                    <div className="slots-scanner-line" style={{ backgroundColor: themeColor }}></div>
                </div>
            </div>

            <button
                className="slots-play-btn mt-8"
                onClick={() => !isSpinning && onSpin()}
                disabled={isSpinning}
                style={{ backgroundColor: themeColor }}
            >
                {isSpinning ? 'GIRO...' : 'JUGAR'}
                <div className="btn-glow" style={{ boxShadow: `0 0 20px ${themeColor}` }}></div>
            </button>
        </div>
    );
}
