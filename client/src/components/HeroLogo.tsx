import styles from './HeroLogo.module.css';

export function HeroLogo() {
  return (
    <div className={styles.wrapper}>
      {/* Full banner for desktop/tablet */}
      <svg className={styles.full} viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VoteFlow — Real-time collaborative decision making for modern teams">
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-bg)" stopOpacity="0" />
          </radialGradient>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--color-border)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Background grid + glow */}
        <rect width="800" height="200" fill="var(--color-bg)" rx="12" />
        <rect width="800" height="200" fill="url(#hero-grid)" rx="12" />
        <circle cx="400" cy="100" r="280" fill="url(#hero-glow)" />

        {/* Floating cards */}
        <g opacity="0.9">
          <rect x="30" y="55" width="100" height="70" rx="8" fill="var(--color-bg-elevated)" stroke="var(--color-border)" strokeWidth="1.5" />
          <circle cx="80" cy="82" r="10" fill="var(--color-success)" />
          <rect x="55" y="105" width="50" height="5" rx="2.5" fill="var(--color-bg-hover)" />
        </g>
        <g opacity="0.9">
          <rect x="630" y="35" width="100" height="70" rx="8" fill="var(--color-bg-elevated)" stroke="var(--color-primary)" strokeWidth="1.5" />
          <circle cx="680" cy="62" r="10" fill="var(--color-primary)" />
          <rect x="655" y="85" width="50" height="5" rx="2.5" fill="var(--color-bg-hover)" />
        </g>
        <g opacity="0.9">
          <rect x="660" y="115" width="100" height="70" rx="8" fill="var(--color-bg-elevated)" stroke="var(--color-approval)" strokeWidth="1.5" />
          <circle cx="710" cy="142" r="10" fill="var(--color-approval)" />
          <rect x="685" y="165" width="50" height="5" rx="2.5" fill="var(--color-bg-hover)" />
        </g>

        {/* Title */}
        <text x="400" y="90" fontFamily="'JetBrains Mono', monospace" fontSize="42" fontWeight="800" textAnchor="middle" letterSpacing="3">
          <tspan fill="var(--color-text)">VOTE</tspan>
          <tspan fill="var(--color-primary)">FLOW</tspan>
        </text>

        {/* Subtitle */}
        <text x="400" y="125" fontFamily="'Inter', system-ui, sans-serif" fontSize="13" fontWeight="400" fill="var(--color-text-muted)" textAnchor="middle">
          Real-time collaborative decision making for modern teams.
        </text>

        {/* Pulse line */}
        <path className={styles.pulseLine} d="M 150 170 L 300 170 L 330 140 L 370 195 L 400 170 L 650 170" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>

      {/* Miniature for mobile */}
      <svg className={styles.mini} viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VoteFlow">
        <defs>
          <radialGradient id="mini-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-bg)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="200" height="120" rx="10" fill="var(--color-bg)" />
        <circle cx="100" cy="60" r="70" fill="url(#mini-glow)" />

        <g transform="translate(60, 35)">
          <rect x="0" y="0" width="80" height="50" rx="6" fill="var(--color-bg-elevated)" stroke="var(--color-border)" strokeWidth="1.5" />
          <text x="40" y="34" fontFamily="system-ui, sans-serif" fontSize="24" fontWeight="900" textAnchor="middle" letterSpacing="1">
            <tspan fill="var(--color-success)">V</tspan>
            <tspan fill="var(--color-primary)">F</tspan>
          </text>
        </g>

        <path className={styles.pulseLine} d="M 10 100 L 60 100 L 70 85 L 85 110 L 95 100 L 190 100" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    </div>
  );
}
