import React, { useState, useEffect } from 'react';
import './Roulette.css';

export function Roulette({ prizes, onSpin, isSpinning, winnerIndex, themeColor }) {
    const [rotation, setRotation] = useState(0);
    const [lastRotation, setLastRotation] = useState(0);

    useEffect(() => {
        if (winnerIndex !== -1 && !isSpinning) {
            // Calculate final rotation
            // Each slice size
            const sliceSize = 360 / prizes.length;
            // Center of the winning slice (inverted because roulette rotates)
            const targetRotation = 360 - (winnerIndex * sliceSize) - (sliceSize / 2);

            // Add 10 full spins for effect (3600 deg)
            const totalRotation = lastRotation + (3600 - (lastRotation % 360)) + targetRotation;

            setRotation(totalRotation);
            setLastRotation(totalRotation);
        }
    }, [winnerIndex, isSpinning]);

    const handleButtonClick = () => {
        if (!isSpinning) {
            onSpin();
        }
    };

    return (
        <div className="roulette-container">
            <div className="roulette-pointer" style={{ borderBottomColor: themeColor }}></div>
            <div
                className={`roulette-wheel ${isSpinning ? 'spinning' : ''}`}
                style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'none' : 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)'
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
            </div>

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
