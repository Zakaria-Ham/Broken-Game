'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

type LightState = 'off' | 'low' | 'blink-slow' | 'blink-fast' | 'burned';
type Phase = 'controls' | 'playing' | 'lost' | 'blocked' | 'won';

const TOTAL_SWITCHES = 6;
const TOTAL_RESISTORS = 6;
const SWITCH_PICKS = 2;
const RESISTOR_PICKS = 2;
const BLINK_SLOW_BURN_MS = 45000;
const BLINK_FAST_BURN_MS = 22000;
const HOUSE_BURN_PENALTY_MS = 5 * 60 * 1000;
const ELECTRICIAN_CALL_PENALTY_MS = 3 * 60 * 1000;

function pickDistinctIndexes(total: number, picks: number): number[] {
  const indexes = Array.from({ length: total }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = indexes[i];
    indexes[i] = indexes[j];
    indexes[j] = t;
  }
  return indexes.slice(0, picks);
}

function countCorrect(selected: boolean[], correctIndexes: number[]): number {
  const set = new Set(correctIndexes);
  let n = 0;
  for (let i = 0; i < selected.length; i += 1) {
    if (selected[i] && set.has(i)) n += 1;
  }
  return n;
}

export default function LightsLevel() {
  const router = useRouter();
  const { gameState, completeLevel, addAttempt, adjustSpeedrunTime, setElectricianTag } = useGame();

  const username = gameState.profile?.username ?? 'guest';
  const BLOCK_KEY = `broken-internet:lights:blocked:${username}`;
  const BURN_COUNT_KEY = `broken-internet:lights:burn-count:${username}`;

  const [phase, setPhase] = useState<Phase>('controls');
  const [switches, setSwitches] = useState<boolean[]>(Array.from({ length: TOTAL_SWITCHES }, () => false));
  const [resistors, setResistors] = useState<boolean[]>(Array.from({ length: TOTAL_RESISTORS }, () => false));
  const [correctSwitches, setCorrectSwitches] = useState<number[]>(() => pickDistinctIndexes(TOTAL_SWITCHES, SWITCH_PICKS));
  const [correctResistors, setCorrectResistors] = useState<number[]>(() => pickDistinctIndexes(TOTAL_RESISTORS, RESISTOR_PICKS));
  const [lightState, setLightState] = useState<LightState>('off');
  const [burnDeadline, setBurnDeadline] = useState<number | null>(null);
  const [burnRemaining, setBurnRemaining] = useState(0);
  const [status, setStatus] = useState('Panel online. Nothing about this is fair.');
  const [showBedroom, setShowBedroom] = useState(false);
  const [burnCount, setBurnCount] = useState(0);
  const [wonByAllResistors, setWonByAllResistors] = useState(false);

  const selectedSwitches = useMemo(() => switches.filter(Boolean).length, [switches]);
  const selectedResistors = useMemo(() => resistors.filter(Boolean).length, [resistors]);

  useEffect(() => {
    addAttempt('lights');
  }, [addAttempt]);

  useEffect(() => {
    try {
      const blocked = localStorage.getItem(BLOCK_KEY) === '1';
      const burns = Number(localStorage.getItem(BURN_COUNT_KEY) || '0');
      setBurnCount(Number.isFinite(burns) ? burns : 0);
      if (blocked) {
        setPhase('blocked');
        setStatus('The lamp burned the house. This level is blocked forever unless you call the electrician.');
      }
    } catch {}
  }, [BLOCK_KEY, BURN_COUNT_KEY]);

  useEffect(() => {
    if (!burnDeadline || phase !== 'playing') return;
    const iv = setInterval(() => {
      const left = Math.max(0, burnDeadline - Date.now());
      setBurnRemaining(left);
      if (left <= 0) {
        setBurnDeadline(null);
        setBurnRemaining(0);
        setLightState('burned');
        setPhase('lost');
        setBurnCount(prev => {
          const next = prev + 1;
          try { localStorage.setItem(BURN_COUNT_KEY, String(next)); } catch {}
          return next;
        });
        setStatus('The lamp burned. You lost this run.');
      }
    }, 200);
    return () => clearInterval(iv);
  }, [BURN_COUNT_KEY, burnDeadline, phase]);

  const triggerBurn = (message: string, foreverBlocked: boolean, penaltyMs: number) => {
    setLightState('burned');
    setBurnDeadline(null);
    setBurnRemaining(0);
    setPhase(foreverBlocked ? 'blocked' : 'lost');
    setStatus(message);
    if (penaltyMs > 0) {
      adjustSpeedrunTime(penaltyMs);
    }

    setBurnCount(prev => {
      const next = prev + 1;
      try { localStorage.setItem(BURN_COUNT_KEY, String(next)); } catch {}
      return next;
    });

    if (foreverBlocked) {
      try { localStorage.setItem(BLOCK_KEY, '1'); } catch {}
    }
  };

  const toggleSwitch = (index: number) => {
    if (phase !== 'playing') return;
    setSwitches(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const toggleResistor = (index: number) => {
    if (phase !== 'playing') return;
    setResistors(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const beginLevel = () => {
    if (phase === 'blocked') return;
    setPhase('playing');
    setStatus('Use exactly 2 switches and at least 1 resistor, then check bedroom.');
  };

  const checkBedroom = async () => {
    if (phase !== 'playing') return;

    if (selectedSwitches !== 2) {
      setStatus('The panel rejects your switch pattern.');
      return;
    }
    if (selectedResistors < 1) {
      setStatus('No resistance, no check.');
      return;
    }

    addAttempt('lights');
    setShowBedroom(true);

    const sRight = countCorrect(switches, correctSwitches);
    const rRight = countCorrect(resistors, correctResistors);

    if (sRight === 0) {
      setLightState('off');
      setBurnDeadline(null);
      setBurnRemaining(0);
      setStatus('0 correct switches: light stays OFF.');
      return;
    }

    if (sRight === 1 && rRight === 0) {
      setLightState('low');
      setBurnDeadline(null);
      setBurnRemaining(0);
      setStatus('A weak glow, then static.');
      return;
    }

    if (sRight === 1 && rRight === 1) {
      const deadline = Date.now() + BLINK_SLOW_BURN_MS;
      setLightState('blink-slow');
      setBurnDeadline(deadline);
      setBurnRemaining(BLINK_SLOW_BURN_MS);
      setStatus('Slow blink. Looks safe. Probably isn\'t.');
      return;
    }

    if (sRight === 1 && rRight >= 2) {
      const deadline = Date.now() + BLINK_FAST_BURN_MS;
      setLightState('blink-fast');
      setBurnDeadline(deadline);
      setBurnRemaining(BLINK_FAST_BURN_MS);
      setStatus('Fast blink. Circuit is angry.');
      return;
    }

    if (sRight === 2 && rRight === 0) {
      triggerBurn(
        '2 switches right + 0 resistor right => lamp burned the house. Level blocked forever (+5min).',
        true,
        HOUSE_BURN_PENALTY_MS,
      );
      return;
    }

    if (sRight === 2 && rRight === 1) {
      setLightState('low');
      setBurnDeadline(null);
      setBurnRemaining(0);
      setStatus('Steady dim output. Not enough.');
      return;
    }

    if (sRight === 2 && rRight === 2) {
      if (selectedResistors === TOTAL_RESISTORS) {
        await setElectricianTag();
        setWonByAllResistors(true);
      } else {
        setWonByAllResistors(false);
      }
      completeLevel('lights');
      setPhase('won');
      setStatus('The room is finally stable.');
      return;
    }
  };

  const retryFromLose = () => {
    if (phase !== 'lost') return;
    setSwitches(Array.from({ length: TOTAL_SWITCHES }, () => false));
    setResistors(Array.from({ length: TOTAL_RESISTORS }, () => false));
    setCorrectSwitches(pickDistinctIndexes(TOTAL_SWITCHES, SWITCH_PICKS));
    setCorrectResistors(pickDistinctIndexes(TOTAL_RESISTORS, RESISTOR_PICKS));
    setLightState('off');
    setBurnDeadline(null);
    setBurnRemaining(0);
    setShowBedroom(false);
    setPhase('playing');
    setStatus('Reset complete. Try a different pattern.');
    addAttempt('lights');
  };

  const callElectrician = async () => {
    if (burnCount < 3) return;
    adjustSpeedrunTime(ELECTRICIAN_CALL_PENALTY_MS);
    await setElectricianTag();
    try {
      localStorage.removeItem(BLOCK_KEY);
      localStorage.removeItem(BURN_COUNT_KEY);
    } catch {}
    setBurnCount(0);
    completeLevel('lights');
    setWonByAllResistors(false);
    setPhase('won');
    setStatus('Outsourced. Expensive. Effective.');
  };

  if (phase === 'won') {
    return (
      <LevelLayout levelName="lights" title="TURN THE LIGHT ON">
        <div style={{
          minHeight: 'calc(100vh - 50px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <MessageBox
            type="success"
            message={wonByAllResistors
              ? 'Wiring solved with all resistors active. Tag unlocked: electricien. Check your profile for key hints that update every minute.'
              : 'Electric circuit stabilized. Bedroom light recovered. This level has a hidden tag and you missed it: electricien. Check your profile for key hints that update every minute.'}
            onClose={() => router.push('/hub')}
          />
        </div>
      </LevelLayout>
    );
  }

  return (
    <LevelLayout levelName="lights" title="TURN THE LIGHT ON">
      <div style={{
        minHeight: 'calc(100vh - 50px)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at 50% 20%, #241a35 0%, #111220 58%, #090a11 100%)',
        position: 'relative',
      }}>
        {phase === 'controls' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 100, background: 'rgba(10, 0, 30, 0.95)', border: '1px solid #5533aa',
            borderRadius: '8px', padding: '30px 40px', textAlign: 'left', maxWidth: '560px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', color: '#aa66ff', marginBottom: '20px', textAlign: 'center' }}>LIGHTS CONTROL RULES</h2>
            <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '15px', color: '#bdb7df', lineHeight: '1.9' }}>
              <div>S = switch, R = resistor.</div>
              <div>Check bedroom requires exactly 2 switches and at least 1 resistor.</div>
              <div>0 S right = light OFF.</div>
              <div>1 S right + 0 R right = LOW intensity.</div>
              <div>1 S right + 1 R right = blinks slowly.</div>
              <div>1 S right + 2 R right = blinks faster.</div>
              <div>2 S right + 0 R right = lamp burns house, level blocked forever, +5min.</div>
              <div>2 S right + 1 R right = LOW intensity.</div>
              <div>2 S right + 2 R right = WIN.</div>
              <div>All 6 resistors selected on win gives special profile tag: electricien.</div>
            </div>
            <button onClick={beginLevel} style={{
              marginTop: '20px', width: '100%', fontFamily: 'var(--font-pixel)', fontSize: '10px',
              padding: '10px 30px', background: 'transparent', border: '1px solid #aa44ff',
              color: '#aa44ff', cursor: 'pointer',
            }}>BEGIN</button>
          </div>
        )}

        <div style={{
          width: 'min(980px, 96vw)',
          border: '1px solid #3d3b59',
          borderRadius: '10px',
          background: 'linear-gradient(180deg, rgba(18, 17, 30, 0.95), rgba(10, 10, 16, 0.98))',
          padding: '16px',
          boxShadow: '0 0 44px rgba(120, 90, 210, 0.2)',
          opacity: phase === 'controls' ? 0.25 : 1,
          pointerEvents: phase === 'controls' ? 'none' : 'auto',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px',
            fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#bbb7ff',
          }}>
            <span>switches armed: {selectedSwitches}</span>
            <span>resistors primed: {selectedResistors}</span>
            {(lightState === 'blink-slow' || lightState === 'blink-fast') && burnDeadline !== null && (
              <span style={{ color: '#ffd27d' }}>
                critical in: {Math.ceil(burnRemaining / 1000)}s
              </span>
            )}
          </div>

          <div style={{
            marginBottom: '12px', border: '1px solid rgba(168, 164, 255, 0.25)', borderRadius: '6px',
            padding: '10px 12px', minHeight: '42px', fontFamily: 'var(--font-terminal)', fontSize: '14px', color: '#c7c4f5',
          }}>
            {`> ${status}`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ border: '1px solid #4f4c79', borderRadius: '8px', padding: '12px', background: 'rgba(43, 38, 72, 0.3)' }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#bfbaff', marginBottom: '10px' }}>SWITCH PANEL (S1-S6)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {switches.map((isOn, i) => (
                  <button
                    key={`switch-${i}`}
                    onClick={() => toggleSwitch(i)}
                    style={{
                      fontFamily: 'var(--font-terminal)', fontSize: '14px', padding: '14px 8px',
                      border: isOn ? '1px solid #6af0a3' : '1px solid #6b678f', borderRadius: '6px',
                      background: isOn ? 'rgba(40, 130, 86, 0.3)' : 'rgba(32, 30, 50, 0.4)',
                      color: isOn ? '#b8ffd7' : '#cbc9eb',
                      cursor: phase !== 'playing' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    S{i + 1} {isOn ? 'ON' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid #4f4c79', borderRadius: '8px', padding: '12px', background: 'rgba(43, 38, 72, 0.3)' }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#bfbaff', marginBottom: '10px' }}>RESISTOR BANK (R1-R6)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {resistors.map((isOn, i) => (
                  <button
                    key={`res-${i}`}
                    onClick={() => toggleResistor(i)}
                    style={{
                      fontFamily: 'var(--font-terminal)', fontSize: '14px', padding: '14px 8px',
                      border: isOn ? '1px solid #ffe08a' : '1px solid #6b678f', borderRadius: '6px',
                      background: isOn ? 'rgba(138, 112, 33, 0.35)' : 'rgba(32, 30, 50, 0.4)',
                      color: isOn ? '#fff2c8' : '#cbc9eb',
                      cursor: phase !== 'playing' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    R{i + 1} {isOn ? 'ON' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={checkBedroom}
              style={{
                fontFamily: 'var(--font-pixel)', fontSize: '9px', padding: '8px 12px',
                border: '1px solid #8fd9ff', background: 'rgba(57, 121, 160, 0.24)',
                color: '#bce8ff', borderRadius: '4px', cursor: phase !== 'playing' ? 'not-allowed' : 'pointer',
              }}
            >
              CHECK BEDROOM
            </button>
          </div>
        </div>

        {(phase === 'lost' || phase === 'blocked') && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1400,
            background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}>
            <div style={{
              width: 'min(460px, 96vw)', border: '1px solid #5d587f', borderRadius: '10px',
              background: '#11111b', padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', color: '#ff8a9c', marginBottom: '10px' }}>
                {phase === 'blocked' ? 'HOUSE BURNED' : 'LAMP BURNED'}
              </div>
              <p style={{ fontFamily: 'var(--font-terminal)', fontSize: '18px', color: '#d4d1ef' }}>{status}</p>
              <p style={{ fontFamily: 'var(--font-terminal)', fontSize: '16px', color: '#b8b2d7' }}>
                burn count: {burnCount}
              </p>

              {phase === 'lost' && (
                <button
                  onClick={retryFromLose}
                  style={{
                    marginTop: '8px', fontFamily: 'var(--font-pixel)', fontSize: '9px', padding: '8px 12px',
                    border: '1px solid #ff7e8c', background: 'rgba(158, 54, 79, 0.25)',
                    color: '#ffc0ca', borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  RETRY
                </button>
              )}

              {burnCount >= 3 && (
                <button
                  onClick={callElectrician}
                  style={{
                    marginTop: '10px', marginLeft: phase === 'lost' ? '10px' : 0,
                    fontFamily: 'var(--font-pixel)', fontSize: '9px', padding: '8px 12px',
                    border: '1px solid #ffd166', background: 'rgba(180, 130, 40, 0.25)',
                    color: '#ffe7ab', borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  CALL ELECTRICIAN (+3MIN)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showBedroom && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.62)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px',
          }}
          onClick={() => setShowBedroom(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(460px, 95vw)', border: '1px solid #5d587f', borderRadius: '10px', background: '#11111b', padding: '16px' }}
          >
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10px', color: '#c4c0ff', marginBottom: '10px' }}>
              BEDROOM VIEW
            </div>
            <div style={{
              height: '180px', borderRadius: '8px', border: '1px solid #2f2c44',
              background:
                lightState === 'low'
                  ? 'radial-gradient(circle at 50% 36%, rgba(255, 242, 165, 0.48), rgba(130, 120, 76, 0.22) 42%, rgba(24, 24, 34, 0.95) 78%)'
                  : lightState === 'blink-slow'
                    ? 'repeating-linear-gradient(90deg, rgba(255,240,170,0.22), rgba(255,240,170,0.22) 24px, rgba(20,20,30,0.95) 24px, rgba(20,20,30,0.95) 48px)'
                    : lightState === 'blink-fast'
                      ? 'repeating-linear-gradient(90deg, rgba(255,240,170,0.25), rgba(255,240,170,0.25) 12px, rgba(20,20,30,0.95) 12px, rgba(20,20,30,0.95) 24px)'
                      : lightState === 'burned'
                        ? 'radial-gradient(circle at 50% 40%, rgba(255, 70, 40, 0.28), rgba(20, 20, 30, 0.96) 68%)'
                        : 'radial-gradient(circle at 50% 45%, rgba(70, 70, 95, 0.2), rgba(16, 16, 24, 0.95) 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-terminal)', fontSize: '19px', color: '#dddaf9',
            }}>
              {lightState === 'off' && 'LIGHT OFF'}
              {lightState === 'low' && 'LOW INTENSITY'}
              {lightState === 'blink-slow' && 'BLINKING SLOWLY'}
              {lightState === 'blink-fast' && 'BLINKING FAST'}
              {lightState === 'burned' && 'LAMP BURNED'}
            </div>
            <button
              onClick={() => setShowBedroom(false)}
              style={{
                marginTop: '12px', fontFamily: 'var(--font-pixel)', fontSize: '9px', padding: '8px 12px',
                border: '1px solid #8f8ab7', borderRadius: '4px', background: 'rgba(70, 64, 106, 0.35)', color: '#d2cef8', cursor: 'pointer',
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </LevelLayout>
  );
}
