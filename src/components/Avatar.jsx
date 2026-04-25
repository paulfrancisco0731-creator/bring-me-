import React from 'react';

const Avatar = ({ face, hair, color, size = 120 }) => {
  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: '50%', 
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '4px solid white',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Simple SVG Avatar Base */}
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {/* Face */}
        <circle 
          cx="50" 
          cy={face === 'oval' ? "55" : "50"} 
          r={face === 'square' ? "0" : (face === 'oval' ? "25" : "30")} 
          fill="#FFD1BA" 
        />
        {face === 'square' && (
          <rect x="25" y="25" width="50" height="50" rx="10" fill="#FFD1BA" />
        )}
        
        {/* Eyes */}
        <circle cx="38" cy="45" r="4" fill="#333" />
        <circle cx="62" cy="45" r="4" fill="#333" />
        
        {/* Smile */}
        <path d="M 35 55 Q 50 70 65 55" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
        
        {/* Hair */}
        {hair === 'short' && (
          <path d="M 20 50 Q 50 10 80 50 L 80 30 Q 50 0 20 30 Z" fill="#333" />
        )}
        {hair === 'long' && (
          <path d="M 20 60 Q 15 30 50 10 Q 85 30 80 60 L 90 80 L 10 80 Z" fill="#4A3B32" />
        )}
        {hair === 'spiky' && (
          <path d="M 20 40 L 30 20 L 40 30 L 50 10 L 60 30 L 70 20 L 80 40 Z" fill="#D4AF37" />
        )}
      </svg>
    </div>
  );
};

export default Avatar;
