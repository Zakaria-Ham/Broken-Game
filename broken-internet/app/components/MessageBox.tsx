'use client';

import React from 'react';

interface MessageBoxProps {
  message: string;
  onClose?: () => void;
  type?: 'success' | 'error' | 'info';
}

export default function MessageBox({ message, onClose, type = 'info' }: MessageBoxProps) {
  const colors = {
    success: 'var(--accent-green)',
    error: 'var(--accent-red)',
    info: 'var(--accent-blue)',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        background: 'var(--bg-darker)',
        border: `2px solid ${colors[type]}`,
        padding: '40px 60px',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '500px',
        animation: 'slideUp 0.4s ease-out',
      }}>
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '14px',
          color: colors[type],
          marginBottom: '20px',
          lineHeight: '1.8',
        }}>
          {message}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '10px',
              padding: '10px 24px',
              background: 'transparent',
              border: `1px solid ${colors[type]}`,
              color: colors[type],
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = colors[type];
              e.currentTarget.style.color = 'var(--bg-dark)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = colors[type];
            }}
          >
            CONTINUE
          </button>
        )}
      </div>
    </div>
  );
}
