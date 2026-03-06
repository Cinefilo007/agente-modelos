import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './SlotMachine.css';

const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🍀', '⭐', '🔥'];

export function SlotMachine({ onSpin, isSpinning, result, themeColor }) {
    // Each reel stores the index of the symbol it lands on.
    const [reels, setReels] = useState([0, 1, 2]);
    const controls = [useAnimation(), useAnimation(), useAnimation()];

    useEffect(() => {
        if (isSpinning && result === null) {
            startSpinning();
        } else if (result) {
            stopSpinning(result);
        }
    }, [isSpinning, result]);

    const startSpinning = () => {
        controls.forEach(control => {
            control.start({
                y: [0, -1000],
                transition: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                }
            });
        });
    };

    const stopSpinning = async (res) => {
        // Determine final indexes
        let finalIndexes = [];
        if (res.won) {
            const winIdx = Math.floor(Math.random() * SYMBOLS.length);
            finalIndexes = [winIdx, winIdx, winIdx];
        } else {
            finalIndexes = [
                Math.floor(Math.random() * SYMBOLS.length),
                Math.floor(Math.random() * SYMBOLS.length),
                Math.floor(Math.random() * SYMBOLS.length)
            ];
            if (finalIndexes[0] === finalIndexes[1] && finalIndexes[1] === finalIndexes[2]) {
                finalIndexes[0] = (finalIndexes[0] + 1) % SYMBOLS.length;
            }
        }

        // Staggered stop
        for (let i = 0; i < 3; i++) {
            const symbolHeight = 80; // Match CSS
            const finalPos = -(finalIndexes[i] * symbolHeight);

            await new Promise(resolve => setTimeout(resolve, i * 400));

            controls[i].start({
                y: [null, -2000, finalPos],
                transition: {
                    duration: 1.2,
                    ease: "backOut"
                }
            });
            setReels(prev => {
                const next = [...prev];
                next[i] = finalIndexes[i];
                return next;
            });
        }
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
