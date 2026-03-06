import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

export function Roulette({ prizes, onSpin, isSpinning, winnerIndex, themeColor }) {
    const controls = useAnimation();
    const [lastRotation, setLastRotation] = useState(0);

    useEffect(() => {
        if (winnerIndex !== -1 && !isSpinning) {
            spinTo(winnerIndex);
        }
    }, [winnerIndex, isSpinning]);

    const spinTo = async (index) => {
        const sliceSize = 360 / prizes.length;
        const targetRotation = 360 - (index * sliceSize) - (sliceSize / 2);

        // Add full spins + offset
        const totalRotation = lastRotation + (360 * 8) + targetRotation - (lastRotation % 360);

        await controls.start({
            rotate: totalRotation,
            transition: {
                duration: 6,
                ease: [0.15, 0, 0.15, 1], // Custom slow-down ease
            }
        });
        setLastRotation(totalRotation);
    };

    const handleButtonClick = () => {
        if (!isSpinning) {
            onSpin();
        }
    };

    return (
        <div className="roulette-container">
            <div className="roulette-pointer" style={{ borderBottomColor: themeColor }}></div>
            <motion.div
                className="roulette-wheel"
                animate={controls}
                style={{
                    rotate: lastRotation,
                }}
            >
                {prizes.map((prize, idx) => {
                    const angle = 360 / prizes.length;
                    return (
                        <div
                            key={prize.id}
                            className="roulette-slice"
                            style={{
                                transform: `rotate(${idx * angle}deg) skewY(${90 - angle}deg)`,
                                backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'
                            }}
                        >
                            <div
                                className="roulette-label"
                                style={{ transform: `skewY(-${90 - angle}deg) rotate(${angle / 2}deg)` }}
                            >
                                <span>{prize.prize_name}</span>
                            </div>
                        </div>
                    );
                })}
                {prizes.length === 0 && (
                    <div className="roulette-empty">Configura premios</div>
                )}
            </motion.div>

            <button
                onClick={handleButtonClick}
                className="roulette-btn"
                disabled={isSpinning || prizes.length === 0}
                style={{ backgroundColor: themeColor }}
            >
                {isSpinning ? 'Girando...' : 'GIRAR'}
            </button>
        </div>
    );
}
