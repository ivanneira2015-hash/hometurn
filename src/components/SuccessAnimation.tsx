'use client'

import { useEffect, useState, useRef } from 'react'

interface Props {
  type: 'created' | 'joined'
  householdName: string
  onDone: () => void
}

// Generates random confetti particles
function Confetti() {
  const items = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 0.8,
    size: 5 + Math.random() * 7,
    color: ['#4f46e5','#a78bfa','#047857','#f59e0b','#be185d','#60a5fa','#047857'][i % 7],
    rotate: Math.random() * 360,
    shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'rect' : 'triangle',
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes confetti-sway {
          0%, 100% { margin-left: 0px; }
          25% { margin-left: 20px; }
          75% { margin-left: -20px; }
        }
      `}</style>
      {items.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            background: p.shape === 'triangle' ? 'transparent' : p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? 3 : 0,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards, confetti-sway ${p.duration * 0.6}s ${p.delay}s ease-in-out infinite`,
            borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// House SVG with animated construction + fill
function HouseAnimation({ phase }: { phase: number }) {
  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      <style>{`
        @keyframes draw-path {
          from { stroke-dashoffset: 600; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes fill-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes house-bounce {
          0%   { transform: scale(0) rotate(-10deg); }
          60%  { transform: scale(1.15) rotate(3deg); }
          80%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes smoke-rise {
          0%   { transform: translateY(0) scaleX(1); opacity: 0.6; }
          100% { transform: translateY(-30px) scaleX(1.5); opacity: 0; }
        }
        @keyframes star-pop {
          0%   { transform: scale(0) rotate(0deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(20deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes float-star {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <svg
        viewBox="0 0 160 160"
        style={{
          width: '100%', height: '100%',
          animation: phase >= 1 ? 'house-bounce 0.7s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
        }}
      >
        {/* Stars around house */}
        {[[20,20],[140,25],[15,100],[145,95],[85,10]].map(([x,y], i) => (
          <text
            key={i} x={x} y={y} fontSize="14" textAnchor="middle"
            style={{
              animation: phase >= 2 ? `star-pop 0.4s ${i * 0.08}s cubic-bezier(0.16,1,0.3,1) forwards, float-star 2s ${i * 0.3}s ease-in-out infinite` : 'none',
              opacity: phase >= 2 ? 1 : 0,
            }}
          >
            ✦
          </text>
        ))}

        {/* House body fill */}
        <g style={{ animation: phase >= 1 ? 'fill-in 0.3s 0.3s forwards' : 'none', opacity: 0 }}>
          {/* Wall */}
          <rect x="35" y="82" width="90" height="58" rx="4" fill="#ede9fe" />
          {/* Door */}
          <rect x="68" y="108" width="24" height="32" rx="3" fill="#4f46e5" opacity="0.7" />
          {/* Window left */}
          <rect x="42" y="95" width="20" height="18" rx="3" fill="#a78bfa" opacity="0.6" />
          <line x1="52" y1="95" x2="52" y2="113" stroke="white" strokeWidth="1.5" />
          <line x1="42" y1="104" x2="62" y2="104" stroke="white" strokeWidth="1.5" />
          {/* Window right */}
          <rect x="98" y="95" width="20" height="18" rx="3" fill="#a78bfa" opacity="0.6" />
          <line x1="108" y1="95" x2="108" y2="113" stroke="white" strokeWidth="1.5" />
          <line x1="98" y1="104" x2="118" y2="104" stroke="white" strokeWidth="1.5" />
          {/* Doorknob */}
          <circle cx="88" cy="126" r="2" fill="white" opacity="0.8" />
        </g>

        {/* Roof fill */}
        <g style={{ animation: phase >= 1 ? 'fill-in 0.3s 0.2s forwards' : 'none', opacity: 0 }}>
          <polygon points="80,28 128,84 32,84" fill="#4f46e5" />
          <polygon points="80,28 108,64 52,64" fill="#6366f1" opacity="0.5" />
        </g>

        {/* Chimney fill */}
        <g style={{ animation: phase >= 1 ? 'fill-in 0.3s 0.15s forwards' : 'none', opacity: 0 }}>
          <rect x="96" y="42" width="14" height="28" rx="2" fill="#4338ca" />
        </g>

        {/* Outline path (drawn first) */}
        {phase >= 0 && (
          <g fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {/* Walls */}
            <path
              d="M35 84 L35 140 L125 140 L125 84"
              strokeDasharray="600"
              style={{ animation: 'draw-path 0.5s 0.1s ease-out forwards', strokeDashoffset: 600 }}
            />
            {/* Roof */}
            <path
              d="M28 84 L80 28 L132 84"
              strokeDasharray="600"
              style={{ animation: 'draw-path 0.4s 0s ease-out forwards', strokeDashoffset: 600 }}
            />
            {/* Chimney */}
            <path
              d="M96 70 L96 42 L110 42 L110 62"
              strokeDasharray="600"
              style={{ animation: 'draw-path 0.3s 0.05s ease-out forwards', strokeDashoffset: 600 }}
            />
          </g>
        )}

        {/* Smoke */}
        {phase >= 2 && (
          <>
            <ellipse cx="100" cy="36" rx="4" ry="5" fill="#c4b5fd" style={{ animation: 'smoke-rise 1.2s 0s ease-out infinite' }} />
            <ellipse cx="106" cy="30" rx="5" ry="6" fill="#ddd6fe" style={{ animation: 'smoke-rise 1.2s 0.3s ease-out infinite' }} />
            <ellipse cx="99" cy="23" rx="6" ry="7" fill="#ede9fe" style={{ animation: 'smoke-rise 1.2s 0.6s ease-out infinite' }} />
          </>
        )}
      </svg>
    </div>
  )
}

// Envelope SVG with opening flap animation
function EnvelopeAnimation({ phase }: { phase: number }) {
  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      <style>{`
        @keyframes envelope-in {
          0%   { transform: translateX(-120px) rotate(-15deg); opacity: 0; }
          70%  { transform: translateX(10px) rotate(2deg); opacity: 1; }
          100% { transform: translateX(0) rotate(0deg); opacity: 1; }
        }
        @keyframes flap-open {
          0%   { transform: rotateX(0deg); }
          100% { transform: rotateX(-160deg); }
        }
        @keyframes house-emerge {
          0%   { transform: translateY(30px) scale(0.3); opacity: 0; }
          60%  { transform: translateY(-55px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-45px) scale(1); opacity: 1; }
        }
        @keyframes envelope-shimmer {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes key-turn {
          0%   { transform: rotate(0deg) scale(0); opacity: 0; }
          50%  { transform: rotate(180deg) scale(1.2); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
      `}</style>

      <svg
        viewBox="0 0 160 160"
        style={{
          width: '100%', height: '100%',
          animation: phase >= 1 ? 'envelope-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          opacity: 0,
        }}
      >
        {/* Envelope body */}
        <rect x="20" y="65" width="120" height="75" rx="8" fill="#ede9fe" stroke="#4f46e5" strokeWidth="2.5" style={{ animation: phase >= 1 ? 'envelope-shimmer 2s ease-in-out infinite' : 'none' }} />

        {/* Inner V shape */}
        <path d="M20 65 L80 108 L140 65" fill="none" stroke="#4f46e5" strokeWidth="2" opacity="0.4" />

        {/* Bottom V */}
        <path d="M20 140 L65 105" stroke="#4f46e5" strokeWidth="1.5" opacity="0.3" />
        <path d="M140 140 L95 105" stroke="#4f46e5" strokeWidth="1.5" opacity="0.3" />

        {/* Seal/stamp */}
        {phase < 2 && (
          <circle cx="80" cy="102" r="10" fill="#4f46e5" opacity="0.8" />
        )}
        {phase < 2 && (
          <text x="80" y="107" fontSize="11" textAnchor="middle" fill="white">H</text>
        )}

        {/* Flap (animated open) */}
        <g style={{ transformOrigin: '80px 65px', transformBox: 'fill-box', perspective: '400px' }}>
          <path
            d="M20 65 L80 108 L140 65 Z"
            fill="#c4b5fd"
            stroke="#4f46e5"
            strokeWidth="2.5"
            style={{ animation: phase >= 2 ? 'flap-open 0.4s 0s ease-out forwards' : 'none', transformOrigin: '80px 65px' }}
          />
        </g>

        {/* House emerging from envelope */}
        {phase >= 2 && (
          <g style={{ animation: 'house-emerge 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) forwards', opacity: 0 }}>
            <rect x="62" y="92" width="36" height="24" rx="3" fill="#4f46e5" />
            <polygon points="80,72 98,94 62,94" fill="#6366f1" />
            <rect x="72" y="104" width="10" height="12" rx="2" fill="white" opacity="0.7" />
          </g>
        )}
      </svg>

      {/* Sparkles around envelope */}
      {phase >= 2 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {[{x:'15%',y:'20%',delay:'0s'},{x:'80%',y:'15%',delay:'0.1s'},{x:'10%',y:'70%',delay:'0.2s'},{x:'85%',y:'65%',delay:'0.15s'}].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: p.x, top: p.y,
              fontSize: 18,
              animation: `star-pop 0.4s ${p.delay} cubic-bezier(0.16,1,0.3,1) forwards, float-star 2s ${p.delay} ease-in-out infinite`,
              opacity: 0,
            }}>✦</div>
          ))}
          <style>{`
            @keyframes star-pop {
              0%   { transform: scale(0); opacity: 0; }
              60%  { transform: scale(1.3); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes float-star {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default function SuccessAnimation({ type, householdName, onDone }: Props) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 50)
    const t2 = setTimeout(() => setPhase(2), 700)
    const t3 = setTimeout(onDone, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const isCreated = type === 'created'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#ede9fe',
      backgroundImage: `
        radial-gradient(at 20% 10%, #c4b5fd 0px, transparent 55%),
        radial-gradient(at 80% 5%, #818cf8 0px, transparent 50%),
        radial-gradient(at 5% 55%, #fce7f3 0px, transparent 50%),
        radial-gradient(at 90% 40%, #ddd6fe 0px, transparent 55%),
        radial-gradient(at 50% 90%, #e0e7ff 0px, transparent 50%)
      `,
    }}>
      <style>{`
        @keyframes text-appear {
          0%   { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      {phase >= 1 && <Confetti />}

      {/* Pulse ring */}
      {phase >= 1 && (
        <div style={{
          position: 'absolute',
          width: 200, height: 200, borderRadius: '50%',
          border: '2px solid rgba(79,70,229,0.3)',
          animation: 'pulse-ring 1.5s ease-out infinite',
        }} />
      )}

      {/* Main illustration */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        {isCreated
          ? <HouseAnimation phase={phase} />
          : <EnvelopeAnimation phase={phase} />
        }
      </div>

      {/* Text */}
      {phase >= 1 && (
        <div style={{ textAlign: 'center', padding: '0 32px', animation: 'text-appear 0.5s 0.2s ease-out forwards', opacity: 0 }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', letterSpacing: '-0.02em', marginBottom: 8 }}>
            {isCreated ? '¡Hogar creado!' : '¡Te uniste!'}
          </p>
          <p style={{
            fontSize: 16, fontWeight: 600,
            color: '#4f46e5',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '6px 20px', borderRadius: 9999,
            border: '1px solid rgba(255,255,255,0.5)',
          }}>
            {householdName}
          </p>
        </div>
      )}

      {/* Progress dots */}
      {phase >= 2 && (
        <div style={{ position: 'absolute', bottom: 48, display: 'flex', gap: 6, animation: 'text-appear 0.3s ease-out forwards', opacity: 0 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#4f46e5',
              animation: `pulse-ring 0.8s ${i * 0.2}s ease-out infinite`,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
