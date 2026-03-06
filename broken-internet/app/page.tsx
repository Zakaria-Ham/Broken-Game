'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setShowSubtext(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-dark)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      <h1
        className="glitch-text"
        style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 'clamp(24px, 5vw, 48px)',
          color: 'var(--text-primary)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1s ease',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        BROKEN INTERNET
      </h1>

      {showSubtext && (
        <p style={{
          fontFamily: 'var(--font-terminal)',
          fontSize: '24px',
          color: 'var(--text-secondary)',
          marginTop: '20px',
          animation: 'fadeIn 1s ease-out',
          position: 'relative',
          zIndex: 1,
        }}>
          something is wrong with the web...
        </p>
      )}

      {showSubtext && (
        <button
          onClick={() => router.push('/intro')}
          style={{
            marginTop: '50px',
            fontFamily: 'var(--font-pixel)',
            fontSize: '12px',
            padding: '16px 40px',
            background: 'transparent',
            border: '2px solid var(--accent-green)',
            color: 'var(--accent-green)',
            cursor: 'pointer',
            animation: 'fadeIn 1s ease-out',
            transition: 'all 0.2s',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent-green)';
            e.currentTarget.style.color = 'var(--bg-dark)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--accent-green)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ENTER
        </button>
      )}
    </div>
  );
}
