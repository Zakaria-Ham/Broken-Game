'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

type LightState = 'off' | 'low' | 'on' | 'blink' | 'burned';

const TOTAL_SWITCHES = 6;
const TOTAL_RESISTORS = 6;
const BLINK_TIMEOUT_MS = 60 * 1000;
const REQUIRED_POSITION = '07';

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

export default function LightsLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();

  const [switches, setSwitches] = useState<boolean[]>(Array.from({ length: TOTAL_SWITCHES }, () => false));
  const [resistors, setResistors] = useState<boolean[]>(Array.from({ length: TOTAL_RESISTORS }, () => false));
  const [showBedroom, setShowBedroom] = useState(false);
  const [lightState, setLightState] = useState<LightState>('off');
  const [blinkDeadline, setBlinkDeadline] = useState<number | null>(null);
  const [blinkRemaining, setBlinkRemaining] = useState<number>(0);
  const [correctSwitches, setCorrectSwitches] = useState<number[]>([1, 4]);
  const [correctResistors, setCorrectResistors] = useState<number[]>([2, 5]);
  const [questionMode, setQuestionMode] = useState(false);
  const [positionAnswer, setPositionAnswer] = useState('');
  const [status, setStatus] = useState('Turn on exactly 2 switches and activate exactly 2 resistors.');
  const [won, setWon] = useState(false);

  const onSwitchCount = useMemo(() => switches.filter(Boolean).length, [switches]);
  const onResistorCount = useMemo(() => resistors.filter(Boolean).length, [resistors]);

  useEffect(() => {
    addAttempt('lights');
  }, [addAttempt]);

  useEffect(() => {
    if (lightState !== 'blink' || blinkDeadline === null || won) return;

    const timer = setInterval(() => {
      const left = Math.max(0, blinkDeadline - Date.now());
      setBlinkRemaining(left);
      if (left <= 0) {
        setBlinkDeadline(null);
        setBlinkRemaining(0);
        setLightState('burned');
        setQuestionMode(false);
        setCorrectSwitches(pickDistinctIndexes(TOTAL_SWITCHES, 2));
        setCorrectResistors(pickDistinctIndexes(TOTAL_RESISTORS, 2));
        setStatus('The light burned after blinking. Control positions changed. Press Retry.');
      }
    }, 200);

    return () => clearInterval(timer);
  }, [blinkDeadline, lightState, won]);

  const toggleSwitch = (index: number) => {
    if (questionMode || lightState === 'burned') return;
    setSwitches(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const toggleResistor = (index: number) => {
    if (questionMode || lightState === 'burned') return;
    setResistors(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const countCorrect = (values: boolean[], correct: Set<number>) => {
    let n = 0;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] && correct.has(i)) n += 1;
    }
    return n;
  };

  const triggerBurn = useCallback((message: string) => {
    setBlinkDeadline(null);
    setBlinkRemaining(0);
    setLightState('burned');
    setQuestionMode(false);
    setCorrectSwitches(pickDistinctIndexes(TOTAL_SWITCHES, 2));
    setCorrectResistors(pickDistinctIndexes(TOTAL_RESISTORS, 2));
    setStatus(message);
  }, []);

  const openBedroomCheck = () => {
    if (onSwitchCount !== 2) {
      setStatus('You must turn exactly 2 switches before checking bedroom.');
      return;
    }

    addAttempt('lights');
    setShowBedroom(true);

    const switchSet = new Set(correctSwitches);
    const resistorSet = new Set(correctResistors);
    const correctSwitchCount = countCorrect(switches, switchSet);
    const correctResistorCount = countCorrect(resistors, resistorSet);

    if (correctSwitchCount === 2 && correctResistorCount === 0) {
      triggerBurn('Power spike. Both good switches + wrong resistors burned the light. Control positions changed.');
      return;
    }

    if (correctResistorCount === 1) {
      const now = Date.now();
      const deadline = blinkDeadline && blinkDeadline > now ? blinkDeadline : now + BLINK_TIMEOUT_MS;
      setLightState('blink');
      setBlinkDeadline(deadline);
      setBlinkRemaining(Math.max(0, deadline - now));
      setQuestionMode(false);
      setStatus('Exactly 1 correct resistor detected. 1-minute burn timer is running.');
      return;
    }

    if (correctSwitchCount === 2 && correctResistorCount === 2) {
      setLightState('on');
      setBlinkDeadline(null);
      setBlinkRemaining(0);
      setQuestionMode(true);
      setStatus('Stable light. Answer the control question to finish.');
      return;
    }

    if (correctSwitchCount === 1) {
      setLightState('low');
      setBlinkDeadline(null);
      setBlinkRemaining(0);
      setQuestionMode(false);
      setStatus('Only 1 correct switch is active. Light intensity is low.');
      return;
    }

    setLightState('off');
    setBlinkDeadline(null);
    setBlinkRemaining(0);
    setQuestionMode(false);
    setStatus('Light is still off. Close bedroom, adjust wiring, and retry.');
  };

  const resetRun = () => {
    setSwitches(Array.from({ length: TOTAL_SWITCHES }, () => false));
    setResistors(Array.from({ length: TOTAL_RESISTORS }, () => false));
    setShowBedroom(false);
    setLightState('off');
    setBlinkDeadline(null);
    setBlinkRemaining(0);
    setQuestionMode(false);
    setPositionAnswer('');
    setStatus('Run reset. Turn on 2 switches and activate 2 resistors.');
    addAttempt('lights');
  };

  const submitAnswer = () => {
    const trimmed = positionAnswer.trim();
    if (!/^\d{2}$/.test(trimmed)) {
      setStatus('Answer must be exactly 2 digits.');
      return;
    }

    if (trimmed !== REQUIRED_POSITION) {
      addAttempt('lights');
      setStatus('Wrong position code. Keep the light stable and try again.');
      return;
    }

    setWon(true);
    completeLevel('lights');
  };

  if (won) {
    return (
      <LevelLayout levelName="lights" title="TURN THE LIGHT ON">
        <div
          style={{
            minHeight: 'calc(100vh - 50px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <MessageBox
            type="success"
            message="Power stabilized. Correct code 07 accepted. Bedroom lights are fixed."
            onClose={() => router.push('/hub')}
          />
        </div>
      </LevelLayout>
    );
  }

  return (
    <LevelLayout levelName="lights" title="TURN THE LIGHT ON">
      <div
        style={{
          minHeight: 'calc(100vh - 50px)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'radial-gradient(circle at 50% 20%, #241a35 0%, #111220 58%, #090a11 100%)',
        }}
      >
        <div
          style={{
            width: 'min(980px, 96vw)',
            border: '1px solid #3d3b59',
            borderRadius: '10px',
            background: 'linear-gradient(180deg, rgba(18, 17, 30, 0.95), rgba(10, 10, 16, 0.98))',
            padding: '16px',
            boxShadow: '0 0 44px rgba(120, 90, 210, 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '12px',
              fontFamily: 'var(--font-pixel)',
              fontSize: '9px',
              color: '#bbb7ff',
            }}
          >
            <span>switches on: {onSwitchCount}/2 required</span>
            <span>resistors active: {onResistorCount}/2 recommended</span>
            {blinkDeadline !== null && lightState !== 'burned' && (
              <span style={{ color: '#ffd27d' }}>
                burn in: {Math.ceil(blinkRemaining / 1000)}s
              </span>
            )}
          </div>

          <div
            style={{
              marginBottom: '12px',
              border: '1px solid rgba(168, 164, 255, 0.25)',
              borderRadius: '6px',
              padding: '10px 12px',
              minHeight: '42px',
              fontFamily: 'var(--font-terminal)',
              fontSize: '14px',
              color: '#c7c4f5',
            }}
          >
            {`> ${status}`}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
            }}
          >
            <div
              style={{
                border: '1px solid #4f4c79',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(43, 38, 72, 0.3)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#bfbaff', marginBottom: '10px' }}>
                SWITCH PANEL (6)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {switches.map((isOn, i) => (
                  <button
                    key={`switch-${i}`}
                    onClick={() => toggleSwitch(i)}
                    style={{
                      fontFamily: 'var(--font-terminal)',
                      fontSize: '14px',
                      padding: '14px 8px',
                      border: isOn ? '1px solid #6af0a3' : '1px solid #6b678f',
                      borderRadius: '6px',
                      background: isOn ? 'rgba(40, 130, 86, 0.3)' : 'rgba(32, 30, 50, 0.4)',
                      color: isOn ? '#b8ffd7' : '#cbc9eb',
                      cursor: questionMode || lightState === 'burned' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    S{i + 1} {isOn ? 'ON' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                border: '1px solid #4f4c79',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(43, 38, 72, 0.3)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#bfbaff', marginBottom: '10px' }}>
                RESISTOR BANK (6)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {resistors.map((isOn, i) => (
                  <button
                    key={`res-${i}`}
                    onClick={() => toggleResistor(i)}
                    style={{
                      fontFamily: 'var(--font-terminal)',
                      fontSize: '14px',
                      padding: '14px 8px',
                      border: isOn ? '1px solid #ffe08a' : '1px solid #6b678f',
                      borderRadius: '6px',
                      background: isOn ? 'rgba(138, 112, 33, 0.35)' : 'rgba(32, 30, 50, 0.4)',
                      color: isOn ? '#fff2c8' : '#cbc9eb',
                      cursor: questionMode || lightState === 'burned' ? 'not-allowed' : 'pointer',
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
              onClick={openBedroomCheck}
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: '9px',
                padding: '8px 12px',
                border: '1px solid #8fd9ff',
                background: 'rgba(57, 121, 160, 0.24)',
                color: '#bce8ff',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              BEDROOM
            </button>

            <button
              onClick={resetRun}
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: '9px',
                padding: '8px 12px',
                border: '1px solid #ff7e8c',
                background: 'rgba(158, 54, 79, 0.25)',
                color: '#ffc0ca',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              RETRY
            </button>
          </div>

          {questionMode && (
            <div
              style={{
                marginTop: '14px',
                border: '1px solid #74d89c',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(18, 48, 31, 0.35)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '15px', color: '#c4ffd8', marginBottom: '8px' }}>
                What is the level position in the list?
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  value={positionAnswer}
                  onChange={e => setPositionAnswer(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="2 digits"
                  style={{
                    width: '120px',
                    fontFamily: 'var(--font-terminal)',
                    fontSize: '16px',
                    background: '#101823',
                    color: '#e6ffef',
                    border: '1px solid #6cc18a',
                    borderRadius: '4px',
                    padding: '8px 10px',
                  }}
                />
                <button
                  onClick={submitAnswer}
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '9px',
                    padding: '8px 12px',
                    border: '1px solid #6fdd9d',
                    background: 'rgba(31, 95, 58, 0.35)',
                    color: '#baffd4',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  SUBMIT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBedroom && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.62)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
          onClick={() => setShowBedroom(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(460px, 95vw)',
              border: '1px solid #5d587f',
              borderRadius: '10px',
              background: '#11111b',
              padding: '16px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10px', color: '#c4c0ff', marginBottom: '10px' }}>
              BEDROOM VIEW
            </div>
            <div
              style={{
                height: '180px',
                borderRadius: '8px',
                border: '1px solid #2f2c44',
                background:
                  lightState === 'on'
                    ? 'radial-gradient(circle at 50% 36%, rgba(255, 242, 165, 0.9), rgba(186, 170, 95, 0.35) 40%, rgba(24, 24, 34, 0.95) 78%)'
                    : lightState === 'low'
                      ? 'radial-gradient(circle at 50% 36%, rgba(255, 242, 165, 0.48), rgba(130, 120, 76, 0.22) 42%, rgba(24, 24, 34, 0.95) 78%)'
                    : lightState === 'blink'
                      ? 'repeating-linear-gradient(90deg, rgba(255,240,170,0.22), rgba(255,240,170,0.22) 20px, rgba(20,20,30,0.95) 20px, rgba(20,20,30,0.95) 40px)'
                      : lightState === 'burned'
                        ? 'radial-gradient(circle at 50% 40%, rgba(255, 70, 40, 0.28), rgba(20, 20, 30, 0.96) 68%)'
                        : 'radial-gradient(circle at 50% 45%, rgba(70, 70, 95, 0.2), rgba(16, 16, 24, 0.95) 70%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-terminal)',
                fontSize: '19px',
                color: '#dddaf9',
              }}
            >
              {lightState === 'on' && 'LIGHT ON'}
              {lightState === 'low' && 'LIGHT LOW INTENSITY'}
              {lightState === 'off' && 'LIGHT OFF'}
              {lightState === 'blink' && 'LIGHT BLINKING'}
              {lightState === 'burned' && 'LIGHT BURNED'}
            </div>
            <button
              onClick={() => setShowBedroom(false)}
              style={{
                marginTop: '12px',
                fontFamily: 'var(--font-pixel)',
                fontSize: '9px',
                padding: '8px 12px',
                border: '1px solid #8f8ab7',
                borderRadius: '4px',
                background: 'rgba(70, 64, 106, 0.35)',
                color: '#d2cef8',
                cursor: 'pointer',
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
