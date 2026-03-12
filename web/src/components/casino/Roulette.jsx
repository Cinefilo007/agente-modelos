import React, { useState, useEffect, useMemo } from 'react';
import { Wheel } from 'react-custom-roulette';
import './Roulette.css';

export function Roulette({ prizes, onSpin, isSpinning, result, themeColor, onFinished }) {
    const [audioReady, setAudioReady] = useState(false);
    const [mustSpin, setMustSpin] = useState(false);
    const [spinningResult, setSpinningResult] = useState(null);

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
            audio.play().catch(e => { });
        } catch (e) {
            // Silently fail to avoid console clutter
        }
    };

    const winnerIndex = useMemo(() => {
        if (!result) return null;
        return result.won ? prizes.findIndex(p => p.prize_name === result.prize) : -1;
    }, [result, prizes]);

    // Logical slices mapping for the library
    const data = useMemo(() => {
        if (!prizes.length) return [{ option: 'Cargando...', style: { backgroundColor: '#1a1425', textColor: '#ffffff' } }];

        let items = [];
        const totalSlices = 24;
        const prizeCount = prizes.length;
        const step = totalSlices / prizeCount;
        const prizePositions = prizes.map((_, idx) => Math.floor(idx * step));

        for (let i = 0; i < totalSlices; i++) {
            const prizeIndexForPos = prizePositions.indexOf(i);
            if (prizeIndexForPos !== -1) {
                let text = prizes[prizeIndexForPos].prize_name;
                if (text.length > 12) text = text.substring(0, 10) + '...'; // Truncate long text

                items.push({
                    option: text,
                    style: { backgroundColor: i % 2 === 0 ? '#3a007d' : '#002b5c', textColor: 'white' }
                });
            } else {
                items.push({
                    option: '', // Empty slize for blanks
                    style: { backgroundColor: i % 2 === 0 ? '#1a1425' : '#120d1a', textColor: 'white' }
                });
            }
        }
        return items;
    }, [prizes]);

    // Map `winnerIndex` (out of N prizes) to the 24-slice index
    const mappedWinningIndex = useMemo(() => {
        if (winnerIndex === null || winnerIndex === undefined) return 0;

        const totalSlices = 24;
        const prizeCount = prizes.length;
        const step = totalSlices / prizeCount;
        const prizePositions = prizes.map((_, idx) => Math.floor(idx * step));

        if (winnerIndex === -1) {
            // Pick a random empty slice index (not in prizePositions)
            const emptySlices = [];
            for (let i = 0; i < totalSlices; i++) {
                if (!prizePositions.includes(i)) emptySlices.push(i);
            }
            return emptySlices[Math.floor(Math.random() * emptySlices.length)] || 0;
        }

        return prizePositions[winnerIndex] || 0;
    }, [winnerIndex, prizes]);

    useEffect(() => {
        // Trigger spin when a NEW result arrives
        if (isSpinning && result && result !== spinningResult) {
            setSpinningResult(result);
            if (!audioReady) setAudioReady(true);
            setMustSpin(true);
            playSound('tick'); // Starting sound
        }
    }, [isSpinning, result, spinningResult]);

    return (
        <div className="roulette-container">
            {/* Base Estática con Sombras */}
            <div className="roulette-static-base" style={{ borderColor: `${themeColor}44` }}>

                {/* Wheel Integration */}
                <div className="roulette-wheel-wrapper">
                    <Wheel
                        mustStartSpinning={mustSpin}
                        prizeNumber={mappedWinningIndex}
                        data={data}
                        onStopSpinning={() => {
                            setMustSpin(false);
                            const won = winnerIndex !== -1 && winnerIndex !== null;
                            playSound(won ? 'win' : 'lose');
                            if (onFinished) onFinished(won);
                        }}
                        backgroundColors={['#1a1425', '#120d1a']}
                        textColors={['#ffffff']}
                        outerBorderColor={themeColor}
                        outerBorderWidth={6}
                        innerRadius={15}
                        innerBorderColor="#0a0714"
                        innerBorderWidth={15}
                        radiusLineColor="rgba(255,255,255,0.05)"
                        radiusLineWidth={1}
                        fontSize={14}
                        textDistance={65}
                        spinDuration={0.8}
                    />
                </div>

                {/* Glass Gloss Effect (Static) */}
                <div className="roulette-glass-shine"></div>
            </div>

            {/* EXTERNAL PLAY BUTTON (outside the 3D base area) */}
            <div className="roulette-external-controls">
                <button
                    onClick={() => {
                        if (!isSpinning) {
                            if (!audioReady) setAudioReady(true);
                            onSpin();
                        }
                    }}
                    className="roulette-spin-btn-external"
                    disabled={isSpinning || prizes.length === 0}
                    style={{ backgroundColor: themeColor, '--btn-theme': themeColor }}
                >
                    {isSpinning ? '...' : 'GIRAR'}
                    <div className="btn-glow" style={{ boxShadow: `0 0 25px ${themeColor}` }}></div>
                </button>
            </div>
        </div>
    );
}
