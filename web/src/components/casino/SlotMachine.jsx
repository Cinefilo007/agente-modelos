import React, { useState, useEffect, useRef } from 'react';
import './SlotMachine.css';

const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🍀', '⭐', '🔥'];

export function SlotMachine({ onSpin, isSpinning, result, themeColor }) {
    const [reels, setReels] = useState([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRefs = useRef([]);

    useEffect(() => {
        if (isSpinning) {
            startSpinning();
        } else if (result) {
            stopSpinning(result);
        }
    }, [isSpinning, result]);

    const startSpinning = () => {
        setIsAnimating(true);
        // Clean previous intervals if any
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];

        // Continuous random shuffle for animation
        const interval = setInterval(() => {
            setReels([
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            ]);
        }, 100);

        timeoutRefs.current.push(interval);
    };

    const stopSpinning = (res) => {
        // Clear the rotation interval
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];

        // Determine final symbols based on result
        let finalReels = [];
        if (res.won) {
            // Pick a winning symbol (same for all 3)
            const winSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            finalReels = [winSym, winSym, winSym];
        } else {
            // Non-matching symbols
            finalReels = [
                SYMBOLS[0],
                SYMBOLS[1],
                SYMBOLS[2]
            ];
            // Shuffle them a bit to not always show the same loss
            finalReels.sort(() => Math.random() - 0.5);
            // Ensure they are not all the same by chance
            if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
                finalReels[0] = SYMBOLS[(SYMBOLS.indexOf(finalReels[0]) + 1) % SYMBOLS.length];
            }
        }

        // Staggered stop effect
        setTimeout(() => {
            setReels(prev => [finalReels[0], prev[1], prev[2]]);
            setTimeout(() => {
                setReels(prev => [prev[0], finalReels[1], prev[2]]);
                setTimeout(() => {
                    setReels(prev => [prev[0], prev[1], finalReels[2]]);
                    setIsAnimating(false);
                }, 500);
            }, 500);
        }, 500);
    };

    return (
        <div className="slots-container">
            <div className="slots-window border-2" style={{ borderColor: themeColor }}>
                {reels.map((symbol, idx) => (
                    <div key={idx} className={`slot-reel ${isAnimating ? 'blur-sm' : ''}`}>
                        <div className="slot-symbol">{symbol}</div>
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
