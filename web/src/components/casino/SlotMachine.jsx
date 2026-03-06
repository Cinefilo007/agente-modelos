import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SlotMachine.css';

const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🍀', '⭐', '🔥'];

export function SlotMachine({ onSpin, isSpinning, result, themeColor }) {
    const [reels, setReels] = useState([0, 1, 2]); // Indexes of SYMBOLS
    const [spinningReels, setSpinningReels] = useState([false, false, false]);

    useEffect(() => {
        if (isSpinning && result === null) {
            setSpinningReels([true, true, true]);
        } else if (result) {
            stopReels(result);
        }
    }, [isSpinning, result]);

    const stopReels = (res) => {
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
            // Ensure no win by accident
            if (finalIndexes[0] === finalIndexes[1] && finalIndexes[1] === finalIndexes[2]) {
                finalIndexes[0] = (finalIndexes[0] + 1) % SYMBOLS.length;
            }
        }

        // Staggered stop
        setTimeout(() => {
            setSpinningReels([false, true, true]);
            setReels(prev => [finalIndexes[0], prev[1], prev[2]]);
            setTimeout(() => {
                setSpinningReels([false, false, true]);
                setReels(prev => [prev[0], finalIndexes[1], prev[2]]);
                setTimeout(() => {
                    setSpinningReels([false, false, false]);
                    setReels(prev => [prev[0], prev[1], finalIndexes[2]]);
                }, 600);
            }, 600);
        }, 800);
    };

    return (
        <div className="slots-container">
            <div className="slots-window border-2" style={{ borderColor: themeColor }}>
                {[0, 1, 2].map((reelIdx) => (
                    <div key={reelIdx} className="slot-reel-container">
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={spinningReels[reelIdx] ? 'spinning' : reels[reelIdx]}
                                initial={{ y: spinningReels[reelIdx] ? -20 : 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: spinningReels[reelIdx] ? 20 : -20, opacity: 0 }}
                                transition={{
                                    duration: spinningReels[reelIdx] ? 0.1 : 0.5,
                                    repeat: spinningReels[reelIdx] ? Infinity : 0,
                                    ease: spinningReels[reelIdx] ? "linear" : "backOut"
                                }}
                                className="slot-symbol-wrapper"
                            >
                                {SYMBOLS[spinningReels[reelIdx] ? Math.floor(Math.random() * SYMBOLS.length) : reels[reelIdx]]}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                ))}
                <div className="slots-payline" style={{ backgroundColor: themeColor }}></div>
            </div>

            <button
                className="slots-lever-btn mt-6"
                onClick={() => !isSpinning && onSpin()}
                disabled={isSpinning}
                style={{ backgroundColor: themeColor }}
            >
                {isSpinning ? 'SUERTE...' : 'JUGAR'}
            </button>

            <div className="slots-decor absolute -z-10 blur-3xl opacity-20" style={{ backgroundColor: themeColor }}></div>
        </div>
    );
}
