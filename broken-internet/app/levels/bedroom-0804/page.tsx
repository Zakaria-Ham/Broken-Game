'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

/* ═══════════════════════════════════════════════
   BEDROOM LEVEL — "What is he hiding?"

  Goal: Find the piece of paper hidden under the window.

   SHORT TRACK (fast):
    Click carpet 5 times → code input appears → enter "0104" → window opens → "Found" button → WIN

   LONG HOPELESS TRACK:
    1. Find PC password (copy from browser URL bar showing "password: 0104" or find paper under pillow)
     2. But PC triggers police UNLESS wifi is turned off first
     3. Turn off wifi (click router above night table)
     4. Then find password (pillow) and enter it on PC
     5. PC desktop shows 2 images:
        - Image 1: clicking it → police → LOSE
        - Image 2: clicking it → reveals Image 3 → shows code "1604" with message to re-enter on PC
        - Re-entering 1604 on PC → police → LOSE (it's a trap, it was always hopeless)
   ═══════════════════════════════════════════════ */

type Phase = 'bedroom' | 'pc-login' | 'pc-desktop' | 'carpet-code' | 'window-open' | 'police' | 'won';

export default function BedroomLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt, unlockTag, gameState } = useGame();

  const [phase, setPhase] = useState<Phase>('bedroom');
  const [wifiOn, setWifiOn] = useState(true);
  const [carpetClicks, setCarpetClicks] = useState(0);
  const [pillowChecked, setPillowChecked] = useState(false);
  const [pcPasswordInput, setPcPasswordInput] = useState('');
  const [carpetCodeInput, setCarpetCodeInput] = useState('');
  const [pcError, setPcError] = useState('');
  const [carpetError, setCarpetError] = useState('');
  const [desktopImage3Visible, setDesktopImage3Visible] = useState(false);
  const [showCode1604, setShowCode1604] = useState(false);
  const [reEnterMode, setReEnterMode] = useState(false);
  const [reEnterInput, setReEnterInput] = useState('');
  const [policeMsg, setPoliceMsg] = useState('');
  const [tooltip, setTooltip] = useState('');
  const [hoverItem, setHoverItem] = useState('');
  const [usedLongPath, setUsedLongPath] = useState(false);
  const [interactedWithLongPath, setInteractedWithLongPath] = useState(false);
  const isSecondEntryRef = useRef(false);
  const windowClickedInCurrentEntryRef = useRef(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((msg: string) => {
    setTooltip(msg);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(''), 3000);
  }, []);

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  useEffect(() => {
    const username = gameState.profile?.username;
    if (!username || typeof window === 'undefined') return;

    const key = `broken-internet:bedroom-entry-count:${username}`;
    const nextCount = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(nextCount));
    isSecondEntryRef.current = nextCount === 2;
    windowClickedInCurrentEntryRef.current = false;
  }, [gameState.profile?.username]);

  // --- BEDROOM INTERACTIONS ---

  const clickBed = () => {
    if (phase !== 'bedroom') return;
    showTooltip('Just a bed. Nothing interesting on the surface...');
  };

  const clickPillow = () => {
    if (phase !== 'bedroom') return;
    setInteractedWithLongPath(true);
    setPillowChecked(true);
    showTooltip('You found a small paper under the pillow! It says: "code is 0104"');
  };

  const clickDesktop = () => {
    if (phase !== 'bedroom') return;
    setInteractedWithLongPath(true);
    setPhase('pc-login');
  };

  const clickCarpet = () => {
    if (phase !== 'bedroom') return;
    const newCount = carpetClicks + 1;
    setCarpetClicks(newCount);
    if (newCount < 7) {
      showTooltip(`The carpet feels odd...`);
    }
    if (newCount >= 7) {
      if (isSecondEntryRef.current && !windowClickedInCurrentEntryRef.current) {
        void unlockTag('conan');
      }
      setPhase('carpet-code');
    }
  };

  const clickWifi = () => {
    if (phase !== 'bedroom') return;
    setInteractedWithLongPath(true);
    setWifiOn(prev => !prev);
    showTooltip(wifiOn ? 'WiFi router turned OFF. No signal.' : 'WiFi router turned ON.');
  };

  const clickNightTable = () => {
    if (phase !== 'bedroom') return;
    showTooltip('A night table. The wifi router sits on top of it.');
  };

  const clickWindow = () => {
    if (phase !== 'bedroom') return;
    windowClickedInCurrentEntryRef.current = true;
    showTooltip('The window is locked. There seems to be something behind it...');
  };

  // --- PC LOGIN ---
  const submitPcPassword = (e: React.FormEvent) => {
    e.preventDefault();
    addAttempt('bedroom');
    if (pcPasswordInput === '0104') {
      if (wifiOn) {
        // Police catches you!
        setUsedLongPath(true);
        setPoliceMsg('POLICE: "We traced the network activity. You\'re done."');
        setPhase('police');
        return;
      }
      // Wifi off — safe to enter PC desktop
      setUsedLongPath(true);
      setPhase('pc-desktop');
    } else if (reEnterMode && reEnterInput === '1604') {
      // Re-entering the trap code
      setPoliceMsg('POLICE: "Thought you could outsmart us with that second code? Think again."');
      setPhase('police');
    } else {
      setPcError('Wrong password.');
      setTimeout(() => setPcError(''), 2000);
    }
  };

  const submitReEnterCode = (e: React.FormEvent) => {
    e.preventDefault();
    addAttempt('bedroom');
    if (reEnterInput === '1604') {
      setPoliceMsg('POLICE: "We were monitoring the whole time. Nice try with the second code."');
      setPhase('police');
    } else {
      setPcError('Wrong code.');
      setTimeout(() => setPcError(''), 2000);
    }
  };

  // --- PC DESKTOP ---
  const clickImage1 = () => {
    setPoliceMsg('POLICE: "That file was flagged. We\'ve been watching."');
    setPhase('police');
  };

  const clickImage2 = () => {
    setDesktopImage3Visible(true);
  };

  const clickImage3 = () => {
    setShowCode1604(true);
  };

  const goReEnterCode = () => {
    setReEnterMode(true);
    setPhase('pc-login');
    setPcPasswordInput('');
    setReEnterInput('');
  };

  // --- CARPET CODE ---
  const submitCarpetCode = (e: React.FormEvent) => {
    e.preventDefault();
    addAttempt('bedroom');
    if (carpetCodeInput === '0804') {
      setPhase('window-open');
    } else {
      setCarpetError('Wrong code. Try again.');
      setTimeout(() => setCarpetError(''), 2000);
    }
  };

  // --- WIN ---
  const handleFound = () => {
    completeLevel('bedroom');
    setPhase('won');
  };

  // --- POLICE (LOSE) ---
  const handlePoliceClose = () => {
    // Reset to bedroom
    setPhase('bedroom');
    setWifiOn(true);
    setCarpetClicks(0);
    setPillowChecked(false);
    setPcPasswordInput('');
    setCarpetCodeInput('');
    setDesktopImage3Visible(false);
    setShowCode1604(false);
    setReEnterMode(false);
    setReEnterInput('');
    setPoliceMsg('');
    setUsedLongPath(false);
  };

  // --- Common styles ---
  const itemStyle = (isHovered: boolean): React.CSSProperties => ({
    cursor: 'pointer',
    transition: 'all 0.2s',
    filter: isHovered ? 'brightness(1.3)' : 'brightness(1)',
    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
  });

  const winMessage = interactedWithLongPath
    ? 'Congrats! You could be faster but your curiousness added 3 min to your speedrun timer.'
    : 'GGs, you\'re pretty fast. Sometimes the fastest way is the simplest. -2 min from your speedrun timer!';
  const bedroomWinMessage = gameState.profile?.unlockedTags.includes('conan')
    ? winMessage
    : `${winMessage} This level has a hidden tag and you missed it: conan.`;

  // ===================== RENDER =====================

  // --- BEDROOM VIEW ---
  if (phase === 'bedroom') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <div style={{
            fontFamily: 'var(--font-pixel)', fontSize: '14px',
            color: '#ff6699', marginBottom: '4px',
            textShadow: '0 0 10px rgba(255,102,153,0.5)',
            letterSpacing: '2px',
          }}>
            bedroom.search
          </div>
          <p style={{
            fontFamily: 'var(--font-terminal)', fontSize: '14px',
            color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center',
            maxWidth: '500px', lineHeight: '1.5',
          }}>
            {`> A guy is hiding something in this room. Find it. Click on objects to investigate.`}
          </p>


          {/* The Room */}
          <div style={{
            width: '100%', maxWidth: '700px', height: '420px',
            background: 'linear-gradient(180deg, #1a1520 0%, #12101a 100%)',
            border: '1px solid #333', borderTop: 'none', borderRadius: '0 0 8px 8px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Wall */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '200px',
              background: 'linear-gradient(180deg, #1e1a28 0%, #15121e 100%)',
              borderBottom: '2px solid #2a2535',
            }} />

            {/* Floor */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '220px',
              background: 'linear-gradient(180deg, #0f0d14 0%, #0a0810 100%)',
            }} />

            {/* WINDOW — top right area */}
            <div
              onClick={clickWindow}
              onMouseEnter={() => setHoverItem('window')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', top: '20px', right: '60px',
                width: '100px', height: '120px',
                background: 'linear-gradient(180deg, #1a2a40 0%, #0d1520 100%)',
                border: '3px solid #3a3550',
                borderRadius: '4px',
                boxShadow: 'inset 0 0 20px rgba(100,150,255,0.1)',
                ...itemStyle(hoverItem === 'window'),
              }}
            >
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: '1px', height: '100%', background: '#3a3550',
              }} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: '100%', height: '1px', background: '#3a3550',
              }} />
              <div style={{
                position: 'absolute', bottom: '-18px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#444',
                whiteSpace: 'nowrap',
              }}>
                WINDOW
              </div>
            </div>

            {/* BED — left side */}
            <div
              onClick={clickBed}
              onMouseEnter={() => setHoverItem('bed')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '100px', left: '30px',
                width: '180px', height: '80px',
                background: 'linear-gradient(180deg, #2a2040 0%, #1e1830 100%)',
                border: '2px solid #3a3060',
                borderRadius: '6px',
                ...itemStyle(hoverItem === 'bed'),
              }}
            >
              {/* Headboard */}
              <div style={{
                position: 'absolute', top: '-25px', left: 0, right: 0, height: '28px',
                background: '#2a2040', borderRadius: '4px 4px 0 0', border: '2px solid #3a3060',
                borderBottom: 'none',
              }} />
              {/* Blanket */}
              <div style={{
                position: 'absolute', top: '10px', left: '5px', right: '5px', bottom: '5px',
                background: 'linear-gradient(90deg, #3a2855 0%, #2d2045 100%)',
                borderRadius: '3px',
              }} />
              <div style={{
                position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#444',
              }}>
                BED
              </div>
            </div>

            {/* PILLOW — on the bed */}
            <div
              onClick={clickPillow}
              onMouseEnter={() => setHoverItem('pillow')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '170px', left: '35px',
                width: '50px', height: '22px',
                background: pillowChecked
                  ? 'linear-gradient(90deg, #5a4a70 0%, #4a3a60 100%)'
                  : 'linear-gradient(90deg, #e8e0f0 0%, #d8d0e0 100%)',
                border: `2px solid ${pillowChecked ? '#6a5a80' : '#ccc'}`,
                borderRadius: '10px',
                ...itemStyle(hoverItem === 'pillow'),
              }}
            >
              <div style={{
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '6px',
                color: pillowChecked ? '#8a7a9a' : '#666',
                whiteSpace: 'nowrap',
              }}>
                {pillowChecked ? 'CHECKED' : 'PILLOW'}
              </div>
            </div>

            {/* NIGHT TABLE — next to bed */}
            <div
              onClick={clickNightTable}
              onMouseEnter={() => setHoverItem('nighttable')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '100px', left: '225px',
                width: '50px', height: '60px',
                background: 'linear-gradient(180deg, #2a2535 0%, #1e1a28 100%)',
                border: '2px solid #3a3550',
                borderRadius: '3px',
                ...itemStyle(hoverItem === 'nighttable'),
              }}
            >
              <div style={{
                position: 'absolute', top: '15px', left: '10px', right: '10px', height: '2px',
                background: '#3a3550',
              }} />
              <div style={{
                position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '6px', color: '#444',
                whiteSpace: 'nowrap',
              }}>
                NIGHT TABLE
              </div>
            </div>

            {/* WIFI ROUTER — above night table */}
            <div
              onClick={clickWifi}
              onMouseEnter={() => setHoverItem('wifi')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '168px', left: '230px',
                width: '40px', height: '28px',
                background: wifiOn
                  ? 'linear-gradient(180deg, #225522 0%, #1a3a1a 100%)'
                  : 'linear-gradient(180deg, #442222 0%, #2a1a1a 100%)',
                border: `2px solid ${wifiOn ? '#33aa33' : '#aa3333'}`,
                borderRadius: '4px',
                ...itemStyle(hoverItem === 'wifi'),
              }}
            >
              {/* LED indicator */}
              <div style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '6px', height: '6px', borderRadius: '50%',
                background: wifiOn ? '#00ff44' : '#ff2222',
                boxShadow: wifiOn ? '0 0 8px #00ff44' : '0 0 8px #ff2222',
              }} />
              {/* Antenna */}
              <div style={{
                position: 'absolute', top: '-10px', left: '8px',
                width: '2px', height: '12px', background: '#555',
              }} />
              <div style={{
                position: 'absolute', top: '-10px', right: '8px',
                width: '2px', height: '12px', background: '#555',
              }} />
              <div style={{
                position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '6px',
                color: wifiOn ? '#33aa33' : '#aa3333',
                whiteSpace: 'nowrap',
              }}>
                WIFI {wifiOn ? 'ON' : 'OFF'}
              </div>
            </div>

            {/* WARDROBE — back wall left */}
            <div
              onMouseEnter={() => setHoverItem('wardrobe')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '140px', left: '290px',
                width: '80px', height: '140px',
                background: 'linear-gradient(180deg, #2a2235 0%, #1b1525 100%)',
                border: '2px solid #3b3150',
                borderRadius: '4px',
                ...itemStyle(hoverItem === 'wardrobe'),
              }}
            >
              <div style={{
                position: 'absolute', top: '0', bottom: '0', left: '50%',
                width: '2px', transform: 'translateX(-50%)', background: '#3b3150',
              }} />
              <div style={{
                position: 'absolute', top: '60px', left: '24px',
                width: '5px', height: '5px', borderRadius: '50%', background: '#665577',
              }} />
              <div style={{
                position: 'absolute', top: '60px', right: '24px',
                width: '5px', height: '5px', borderRadius: '50%', background: '#665577',
              }} />
            </div>

            {/* BOOKSHELF — back wall center */}
            <div
              onMouseEnter={() => setHoverItem('bookshelf')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '145px', left: '390px',
                width: '82px', height: '120px',
                background: 'linear-gradient(180deg, #241c2f 0%, #181321 100%)',
                border: '2px solid #352c46',
                borderRadius: '4px',
                ...itemStyle(hoverItem === 'bookshelf'),
              }}
            >
              <div style={{ position: 'absolute', top: '38px', left: 0, right: 0, height: '2px', background: '#352c46' }} />
              <div style={{ position: 'absolute', top: '78px', left: 0, right: 0, height: '2px', background: '#352c46' }} />
              <div style={{ position: 'absolute', top: '8px', left: '8px', width: '8px', height: '24px', background: '#5566aa' }} />
              <div style={{ position: 'absolute', top: '8px', left: '20px', width: '9px', height: '24px', background: '#885588' }} />
              <div style={{ position: 'absolute', top: '8px', left: '31px', width: '7px', height: '24px', background: '#668855' }} />
              <div style={{ position: 'absolute', top: '46px', left: '10px', width: '12px', height: '24px', background: '#aa7744' }} />
              <div style={{ position: 'absolute', top: '46px', left: '26px', width: '8px', height: '24px', background: '#4477aa' }} />
              <div style={{ position: 'absolute', top: '86px', left: '12px', width: '16px', height: '26px', background: '#5a446a' }} />
            </div>

            {/* DESK — right side, under the desktop */}
            <div
              onMouseEnter={() => setHoverItem('desk')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '95px', right: '120px',
                width: '230px', height: '72px',
                background: 'linear-gradient(180deg, #3a2a20 0%, #251910 100%)',
                border: '2px solid #4a372a',
                borderRadius: '4px',
                ...itemStyle(hoverItem === 'desk'),
              }}
            >
              <div style={{
                position: 'absolute', top: '-8px', left: '-2px', right: '-2px', height: '12px',
                background: 'linear-gradient(180deg, #4b3528 0%, #37251b 100%)',
                border: '2px solid #5a4333', borderBottom: 'none', borderRadius: '3px 3px 0 0',
              }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '12px', width: '10px', height: '26px', background: '#2b1e16' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '12px', width: '10px', height: '26px', background: '#2b1e16' }} />
              <div style={{
                position: 'absolute', top: '22px', right: '16px', width: '56px', height: '44px',
                background: 'linear-gradient(180deg, #2d2020 0%, #1f1414 100%)',
                border: '1px solid #4d3434', borderRadius: '3px',
              }} />
            </div>

            {/* DESK CHAIR — in front of desk */}
            <div
              onMouseEnter={() => setHoverItem('chair')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '54px', right: '210px',
                width: '88px', height: '58px',
                ...itemStyle(hoverItem === 'chair'),
              }}
            >
              <div style={{
                position: 'absolute', top: '0', left: '20px', right: '20px', height: '28px',
                background: 'linear-gradient(180deg, #2a3345 0%, #1c2432 100%)',
                border: '2px solid #3c4a64', borderRadius: '6px 6px 2px 2px',
              }} />
              <div style={{
                position: 'absolute', bottom: '20px', left: '24px', right: '24px', height: '16px',
                background: 'linear-gradient(180deg, #2f3c52 0%, #202b3b 100%)',
                border: '2px solid #3c4a64', borderRadius: '5px',
              }} />
              <div style={{ position: 'absolute', bottom: '0', left: '42px', width: '4px', height: '20px', background: '#3c4a64' }} />
            </div>

            {/* PLANT — corner decor */}
            <div
              onMouseEnter={() => setHoverItem('plant')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '100px', right: '24px',
                width: '34px', height: '70px',
                ...itemStyle(hoverItem === 'plant'),
              }}
            >
              <div style={{ position: 'absolute', bottom: 0, left: '6px', right: '6px', height: '18px', background: '#4a3030', border: '2px solid #5e3f3f', borderRadius: '0 0 5px 5px' }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '14px', width: '2px', height: '32px', background: '#4f7f4f' }} />
              <div style={{ position: 'absolute', bottom: '42px', left: '6px', width: '12px', height: '12px', background: '#5f9f5f', borderRadius: '60% 40% 60% 40%' }} />
              <div style={{ position: 'absolute', bottom: '44px', right: '6px', width: '12px', height: '12px', background: '#5f9f5f', borderRadius: '40% 60% 40% 60%' }} />
              <div style={{ position: 'absolute', bottom: '54px', left: '11px', width: '12px', height: '12px', background: '#6cad6c', borderRadius: '50%' }} />
            </div>

            {/* DESKTOP PC — center-right */}
            <div
              onClick={clickDesktop}
              onMouseEnter={() => setHoverItem('pc')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '170px', right: '185px',
                width: '120px', height: '80px',
                background: 'linear-gradient(180deg, #111520 0%, #0a0d15 100%)',
                border: '2px solid #2a3555',
                borderRadius: '4px',
                ...itemStyle(hoverItem === 'pc'),
              }}
            >
              {/* Screen glow */}
              <div style={{
                position: 'absolute', inset: '4px',
                background: 'linear-gradient(180deg, #0a1a2a 0%, #050d15 100%)',
                borderRadius: '2px',
                boxShadow: 'inset 0 0 15px rgba(68,136,255,0.15)',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#335588',
                }}>
                  {'>'}_
                </div>
              </div>
              {/* Stand */}
              <div style={{
                position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)',
                width: '30px', height: '20px',
                background: '#1a1a2a', borderRadius: '0 0 4px 4px',
              }} />
              <div style={{
                position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#444',
              }}>
                DESKTOP
              </div>
            </div>

            {/* CARPET — on the floor, slightly hidden */}
            <div
              onClick={clickCarpet}
              onMouseEnter={() => setHoverItem('carpet')}
              onMouseLeave={() => setHoverItem('')}
              style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                width: '160px', height: '50px',
                background: `linear-gradient(90deg, #2a1a2a 0%, #3a2040 50%, #2a1a2a 100%)`,
                border: '2px solid #4a3060',
                borderRadius: '20px',
                ...itemStyle(hoverItem === 'carpet'),
              }}
            >
              {/* Pattern */}
              <div style={{
                position: 'absolute', top: '8px', left: '20px', right: '20px', bottom: '8px',
                border: '1px solid #5a4070', borderRadius: '12px',
              }} />
              <div style={{
                position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#555',
              }}>
                CARPET
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              marginTop: '12px', padding: '10px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #333', borderRadius: '6px',
              fontFamily: 'var(--font-terminal)', fontSize: '13px',
              color: '#aaa', maxWidth: '500px', textAlign: 'center',
              animation: 'fadeIn 0.2s ease-out',
            }}>
              {tooltip}
            </div>
          )}
        </div>
      </LevelLayout>
    );
  }

  // --- PC LOGIN SCREEN ---
  if (phase === 'pc-login') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '420px',
            background: 'linear-gradient(180deg, #0a0d15 0%, #050810 100%)',
            border: '2px solid #2a3555',
            borderRadius: '8px', padding: '40px',
            boxShadow: '0 0 40px rgba(68,136,255,0.1)',
          }}>
            <div style={{
              textAlign: 'center', marginBottom: '24px',
              fontFamily: 'var(--font-pixel)', fontSize: '12px',
              color: '#4488ff',
            }}>
              {reEnterMode ? '> RE-ENTER CODE TO PROCEED' : '> ENTER PC PASSWORD'}
            </div>

            {pillowChecked && !reEnterMode && (
              <div style={{
                marginBottom: '16px', padding: '8px 12px',
                background: 'rgba(255,204,0,0.05)',
                border: '1px solid #554400',
                borderRadius: '4px',
                fontFamily: 'var(--font-terminal)', fontSize: '11px',
                color: '#aa8800',
              }}>
                Hint: You found a paper that said &quot;code is 0104&quot;
              </div>
            )}

            <form onSubmit={reEnterMode ? submitReEnterCode : submitPcPassword}>
              <input
                type="text"
                value={reEnterMode ? reEnterInput : pcPasswordInput}
                onChange={e => reEnterMode ? setReEnterInput(e.target.value) : setPcPasswordInput(e.target.value)}
                placeholder={reEnterMode ? 'Enter the code...' : 'Password...'}
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px',
                  background: '#0d1020', border: '1px solid #2a3555',
                  color: '#aaccff', fontFamily: 'var(--font-terminal)',
                  fontSize: '16px', borderRadius: '4px', outline: 'none',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '10px',
                    background: '#1a2a44', border: '1px solid #2a4466',
                    color: '#4488ff', fontFamily: 'var(--font-pixel)',
                    fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
                  }}
                >
                  {reEnterMode ? 'SUBMIT CODE' : 'UNLOCK'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPhase('bedroom'); setReEnterMode(false); }}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent', border: '1px solid #333',
                    color: '#666', fontFamily: 'var(--font-pixel)',
                    fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
                  }}
                >
                  BACK
                </button>
              </div>
            </form>

            {pcError && (
              <div style={{
                marginTop: '12px', padding: '8px',
                fontFamily: 'var(--font-terminal)', fontSize: '12px',
                color: '#ff3355', textAlign: 'center',
              }}>
                {pcError}
              </div>
            )}
          </div>

          {!wifiOn && (
            <div style={{
              marginTop: '12px',
              fontFamily: 'var(--font-terminal)', fontSize: '11px',
              color: '#aa3333',
            }}>
              WiFi: DISCONNECTED
            </div>
          )}
        </div>
      </LevelLayout>
    );
  }

  // --- PC DESKTOP (after successful login) ---
  if (phase === 'pc-desktop') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '540px',
            background: 'linear-gradient(180deg, #0a0d15 0%, #050810 100%)',
            border: '2px solid #2a3555', borderRadius: '8px', padding: '30px',
            boxShadow: '0 0 40px rgba(68,136,255,0.1)',
          }}>
            {/* Taskbar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', paddingBottom: '10px',
              borderBottom: '1px solid #1a2535',
            }}>
              <span style={{
                fontFamily: 'var(--font-pixel)', fontSize: '10px', color: '#4488ff',
              }}>
                Desktop
              </span>
              <span style={{
                fontFamily: 'var(--font-terminal)', fontSize: '10px', color: '#555',
              }}>
                WiFi: {wifiOn ? 'ON' : 'OFF'}
              </span>
            </div>

            <p style={{
              fontFamily: 'var(--font-terminal)', fontSize: '12px',
              color: '#667', marginBottom: '20px', textAlign: 'center',
            }}>
              You see some files on the desktop. Which one do you open?
            </p>

            {/* Desktop icons */}
            <div style={{
              display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap',
            }}>
              {/* Image 1 — TRAP */}
              <div
                onClick={clickImage1}
                onMouseEnter={() => setHoverItem('img1')}
                onMouseLeave={() => setHoverItem('')}
                style={{
                  width: '120px', height: '100px',
                  background: '#0f1525', border: '2px solid #2a3050',
                  borderRadius: '6px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer',
                  ...itemStyle(hoverItem === 'img1'),
                }}
              >
                <div style={{ fontSize: '28px' }}>{'$'}</div>
                <span style={{
                  fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#ff4444',
                }}>
                  secrets.jpg
                </span>
              </div>

              {/* Image 2 — leads to Image 3 */}
              <div
                onClick={clickImage2}
                onMouseEnter={() => setHoverItem('img2')}
                onMouseLeave={() => setHoverItem('')}
                style={{
                  width: '120px', height: '100px',
                  background: '#0f1525', border: '2px solid #2a3050',
                  borderRadius: '6px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer',
                  ...itemStyle(hoverItem === 'img2'),
                }}
              >
                <div style={{ fontSize: '28px' }}>{'?'}</div>
                <span style={{
                  fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#aaaaff',
                }}>
                  notes.png
                </span>
              </div>

              {/* Image 3 — appears after clicking Image 2 */}
              {desktopImage3Visible && (
                <div
                  onClick={clickImage3}
                  onMouseEnter={() => setHoverItem('img3')}
                  onMouseLeave={() => setHoverItem('')}
                  style={{
                    width: '120px', height: '100px',
                    background: '#0f1525', border: '2px solid #ffaa00',
                    borderRadius: '6px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    cursor: 'pointer', animation: 'fadeIn 0.5s ease-out',
                    ...itemStyle(hoverItem === 'img3'),
                  }}
                >
                  <div style={{ fontSize: '28px' }}>{'!'}</div>
                  <span style={{
                    fontFamily: 'var(--font-pixel)', fontSize: '7px', color: '#ffaa00',
                  }}>
                    hidden.dat
                  </span>
                </div>
              )}
            </div>

            {/* Code reveal from Image 3 */}
            {showCode1604 && (
              <div style={{
                marginTop: '20px', padding: '16px',
                background: 'rgba(255,170,0,0.05)',
                border: '1px solid #554400', borderRadius: '6px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: '18px',
                  color: '#ffaa00', marginBottom: '8px',
                }}>
                  CODE: 1604
                </div>
                <p style={{
                  fontFamily: 'var(--font-terminal)', fontSize: '12px',
                  color: '#888', marginBottom: '12px',
                }}>
                  &quot;Re-enter this code on the PC login interface to proceed.&quot;
                </p>
                <button
                  onClick={goReEnterCode}
                  style={{
                    padding: '8px 20px',
                    background: '#1a2a44', border: '1px solid #ffaa00',
                    color: '#ffaa00', fontFamily: 'var(--font-pixel)',
                    fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
                  }}
                >
                  GO TO PC LOGIN
                </button>
              </div>
            )}

            <button
              onClick={() => setPhase('bedroom')}
              style={{
                marginTop: '20px', padding: '8px 16px',
                background: 'transparent', border: '1px solid #333',
                color: '#555', fontFamily: 'var(--font-pixel)',
                fontSize: '8px', cursor: 'pointer', borderRadius: '4px',
                display: 'block', margin: '20px auto 0',
              }}
            >
              TURN OFF PC
            </button>
          </div>
        </div>
      </LevelLayout>
    );
  }

  // --- CARPET CODE INPUT ---
  if (phase === 'carpet-code') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '380px',
            background: 'linear-gradient(180deg, #1a1020 0%, #0f0a15 100%)',
            border: '2px solid #4a3060', borderRadius: '8px', padding: '40px',
            boxShadow: '0 0 40px rgba(170,68,255,0.1)',
          }}>
            <div style={{
              textAlign: 'center', marginBottom: '16px',
              fontFamily: 'var(--font-pixel)', fontSize: '12px',
              color: '#aa44ff',
            }}>
              HIDDEN PANEL FOUND
            </div>
            <p style={{
              fontFamily: 'var(--font-terminal)', fontSize: '12px',
              color: '#777', marginBottom: '20px', textAlign: 'center',
            }}>
              Under the carpet... a keypad. Enter the code.
            </p>

            <form onSubmit={submitCarpetCode}>
              <input
                type="text"
                value={carpetCodeInput}
                onChange={e => setCarpetCodeInput(e.target.value)}
                placeholder="Enter code..."
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px',
                  background: '#0d0a15', border: '1px solid #4a3060',
                  color: '#cc88ff', fontFamily: 'var(--font-terminal)',
                  fontSize: '20px', borderRadius: '4px', outline: 'none',
                  textAlign: 'center', letterSpacing: '8px',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '10px',
                    background: '#2a1a44', border: '1px solid #4a3060',
                    color: '#aa44ff', fontFamily: 'var(--font-pixel)',
                    fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
                  }}
                >
                  ENTER
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('bedroom')}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent', border: '1px solid #333',
                    color: '#666', fontFamily: 'var(--font-pixel)',
                    fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
                  }}
                >
                  BACK
                </button>
              </div>
            </form>

            {carpetError && (
              <div style={{
                marginTop: '12px', padding: '8px',
                fontFamily: 'var(--font-terminal)', fontSize: '12px',
                color: '#ff3355', textAlign: 'center',
              }}>
                {carpetError}
              </div>
            )}
          </div>
        </div>
      </LevelLayout>
    );
  }

  // --- WINDOW OPEN (after carpet code success) ---
  if (phase === 'window-open') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '400px',
            background: 'linear-gradient(180deg, #0a1a2a 0%, #050d15 100%)',
            border: '2px solid #2a5555', borderRadius: '8px', padding: '40px',
            boxShadow: '0 0 60px rgba(0,255,170,0.15)',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: '14px',
              color: '#00ffaa', marginBottom: '16px',
              textShadow: '0 0 15px rgba(0,255,170,0.5)',
            }}>
              THE WINDOW OPENED!
            </div>
            <p style={{
              fontFamily: 'var(--font-terminal)', fontSize: '13px',
              color: '#88ccaa', marginBottom: '8px',
            }}>
              A breeze comes in... you see a folded piece of paper
              sitting on the windowsill.
            </p>
            <p style={{
              fontFamily: 'var(--font-terminal)', fontSize: '12px',
              color: '#667', marginBottom: '24px',
            }}>
              This is what he was hiding all along.
            </p>
            <button
              onClick={handleFound}
              style={{
                padding: '14px 40px',
                background: 'linear-gradient(180deg, #00aa77 0%, #008855 100%)',
                border: '2px solid #00ffaa',
                color: '#fff', fontFamily: 'var(--font-pixel)',
                fontSize: '12px', cursor: 'pointer', borderRadius: '6px',
                boxShadow: '0 0 20px rgba(0,255,170,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              FOUND IT!
            </button>
          </div>
        </div>
      </LevelLayout>
    );
  }

  // --- POLICE (LOSE) ---
  if (phase === 'police') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '420px',
            background: 'linear-gradient(180deg, #1a0a0a 0%, #100505 100%)',
            border: '2px solid #aa2222', borderRadius: '8px', padding: '40px',
            boxShadow: '0 0 60px rgba(255,0,0,0.2)',
            textAlign: 'center', animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{
              fontSize: '40px', marginBottom: '16px',
            }}>
              {'>>'}
            </div>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: '14px',
              color: '#ff3333', marginBottom: '16px',
              textShadow: '0 0 10px rgba(255,0,0,0.5)',
            }}>
              BUSTED!
            </div>
            <p style={{
              fontFamily: 'var(--font-terminal)', fontSize: '13px',
              color: '#cc6666', marginBottom: '24px', lineHeight: '1.6',
            }}>
              {policeMsg}
            </p>
            <p style={{
              fontFamily: 'var(--font-pixel)', fontSize: '10px',
              color: '#882222', marginBottom: '20px',
            }}>
              YOU LOST. TRY AGAIN.
            </p>
            <button
              onClick={handlePoliceClose}
              style={{
                padding: '10px 30px',
                background: '#2a1111', border: '1px solid #aa2222',
                color: '#ff4444', fontFamily: 'var(--font-pixel)',
                fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
              }}
            >
              RESTART ROOM
            </button>
          </div>
        </div>
      </LevelLayout>
    );
  }

  // --- WON ---
  if (phase === 'won') {
    return (
      <LevelLayout levelName="bedroom" title="THE BEDROOM">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 50px)', padding: '20px',
        }}>
          <MessageBox
            message={bedroomWinMessage}
            type="success"
            onClose={() => router.push('/hub')}
          />
        </div>
      </LevelLayout>
    );
  }

  return null;
}
