import React, { useMemo, useRef, useEffect } from 'react';

const ACCENTS = {
  Indigo:  '#6366f1',
  Amber:   '#f59e0b',
  Emerald: '#10b981',
  Rose:    '#f43f5e',
  Violet:  '#8b5cf6',
};

const FONT_PAIRS = {
  'Inter / Inter Tight': { display: 'Inter Tight, ui-sans-serif, system-ui, sans-serif', body: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  'System UI': { display: 'ui-sans-serif, system-ui, sans-serif', body: 'ui-sans-serif, system-ui, sans-serif' },
};

export default function LoadingScreen() {
  const theme = useMemo(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('stoq.theme') || 'light';
  }, []);

  const accentName = useMemo(() => {
    if (typeof window === 'undefined') return 'Indigo';
    return localStorage.getItem('stoq.accent') || 'Indigo';
  }, []);

  const fontPairName = useMemo(() => {
    if (typeof window === 'undefined') return 'Inter / Inter Tight';
    return localStorage.getItem('stoq.fontPair') || 'Inter / Inter Tight';
  }, []);

  const accentColor = ACCENTS[accentName] || ACCENTS.Indigo;
  const fontPair = FONT_PAIRS[fontPairName] || FONT_PAIRS['Inter / Inter Tight'];
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#0a0a0d' : '#fefdf8';
  const textColor = isDark ? '#f5f5f7' : '#1a1a1a';
  const subtleColor = isDark ? '#88888a' : '#888888';

  const svgRef = useRef(null);
  const [glowPos, setGlowPos] = React.useState({ x: 0, y: 0, radius: 60 });
  const [globalBrightness, setGlobalBrightness] = React.useState(0);

  // Simple progress simulation
  const [progress, setProgress] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const increment = Math.random() * 12 + 3;
        return Math.min(prev + increment, 88);
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Interactive mesh glow following cursor with smooth size change
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let animationFrameId;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let targetRadius = 60;
    let currentRadius = 60;
    let targetBrightness = 0;

    const handleMouseMove = (e) => {
      const rect = svg.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      // Calculate distance from center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distFromCenter = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );

      // Size based on distance (small when far, big when near center)
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const normalizedDist = Math.min(distFromCenter / maxDist, 1);
      targetRadius = 320 - normalizedDist * 200; // 320 at center, 120 at edges

      // Global brightness: brighten more when cursor is active
      targetBrightness = (1 - normalizedDist) * 0.15; // 0-15% brightness based on distance
    };

    const animate = () => {
      // Smooth position update
      setGlowPos(prev => ({
        x: prev.x + (targetX - prev.x) * 0.12,
        y: prev.y + (targetY - prev.y) * 0.12,
        radius: currentRadius + (targetRadius - currentRadius) * 0.08,
      }));

      currentRadius += (targetRadius - currentRadius) * 0.08;
      setGlobalBrightness(prev => prev + (targetBrightness - prev) * 0.1);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const patternOpacity = isDark ? 0.06 : 0.1;
  const progressWidth = Math.max(progress, 4);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fontPair.body,
        color: textColor,
        zIndex: 99999,
        transition: 'background-color 0.3s ease, color 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* SVG Background with Mesh Pattern & Interactive Glow */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          {/* Subtle mesh pattern */}
          <pattern id="mesh" x="80" y="80" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 0,0 L 80,0 L 80,80 L 0,80 Z"
              fill="none"
              stroke={textColor}
              strokeWidth="0.4"
              opacity={patternOpacity}
            />
          </pattern>

          {/* Bright mesh pattern for interactive layer */}
          <pattern id="meshBright" x="80" y="80" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 0,0 L 80,0 L 80,80 L 0,80 Z"
              fill="none"
              stroke={textColor}
              strokeWidth="0.4"
              opacity={patternOpacity * 4}
            />
          </pattern>

          {/* Interactive glow that follows cursor */}
          <radialGradient id="meshGlowGradient">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
            <stop offset="45%" stopColor={accentColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>

          {/* Radial mask for brightening mesh */}
          <radialGradient id="meshMask">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="60%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background mesh */}
        <rect width="100%" height="100%" fill="url(#mesh)" />

        {/* Global brightness overlay */}
        <rect
          width="100%"
          height="100%"
          fill={isDark ? '#ffffff' : '#ffffff'}
          opacity={globalBrightness}
          pointerEvents="none"
          style={{ transition: 'none' }}
        />

        {/* Interactive brightened mesh layer */}
        <defs>
          <mask id="glowMask">
            <circle
              cx={glowPos.x}
              cy={glowPos.y}
              r={glowPos.radius}
              fill="url(#meshMask)"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#meshBright)"
          mask="url(#glowMask)"
          pointerEvents="none"
          style={{ opacity: 0.9 }}
        />

        {/* Interactive glow overlay - smooth size & position */}
        <circle
          cx={glowPos.x}
          cy={glowPos.y}
          r={glowPos.radius}
          fill="url(#meshGlowGradient)"
          pointerEvents="none"
          style={{
            filter: 'blur(0.5px)',
            transition: 'none',
          }}
        />
      </svg>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        {/* Brand */}
        <div
          style={{
            marginBottom: 48,
            opacity: Math.min(progress / 30 + 0.7, 1),
            transition: 'opacity 0.6s ease-out',
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -0.8,
              fontFamily: fontPair.display,
              color: accentColor,
              lineHeight: 1,
              marginBottom: 4,
              textTransform: 'uppercase',
              fontVariationSettings: '"wght" 800',
            }}
          >
            SEEGH LTD
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              color: subtleColor,
              fontFamily: fontPair.body,
              textTransform: 'uppercase',
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            Loading
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: 240,
            height: 2,
            background: isDark ? '#1a1a1a' : '#f0f0f0',
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow: isDark
              ? `inset 0 0 12px rgba(0,0,0,0.4)`
              : `inset 0 0 8px rgba(0,0,0,0.08)`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: `${progressWidth}%`,
              height: '100%',
              background: accentColor,
              borderRadius: 1,
              transition: 'width 0.5s cubic-bezier(0.23, 1, 0.320, 1)',
            }}
          />
        </div>

        {/* Percentage */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: subtleColor,
            letterSpacing: 0.5,
            fontVariantNumeric: 'tabular-nums',
            opacity: 0.8,
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>

      <style>{`
        @keyframes fadeInSoft {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
