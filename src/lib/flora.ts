/**
 * Hand-drawn isometric plant sprites for the garden.
 *
 * Each species renders as inline SVG with a 200×280 viewBox, anchored
 * bottom-center. Colors are driven by CSS variables so the same markup
 * re-themes across seasonal palettes without re-rendering.
 */

export type Species =
  | "oak"
  | "pine"
  | "sakura"
  | "sunflower"
  | "wildflower"
  | "bookStump"
  | "tulip"
  | "mushroom"
  | "lavender"
  | "maple"
  | "lilypond"
  | "berrybush"
  | "lantern"
  | "fern"
  | "rose"
  | "cactus"
  | "topiary"
  | "bamboo"
  | "lavenderSpike"
  | "fernCurl"
  | "mossRock"
  | "willow"
  | "roseTrellis"
  | "mushroomRing";

export type Stage = 0 | 1 | 2;

export type SeasonName = "spring" | "summer" | "autumn" | "night";

const STROKE = "#2a1a0a";
const DARK = "#3b2615";

function trunk({ w = 14, h = 60, cx = 100, by = 260 } = {}): string {
  const x1 = cx - w / 2;
  const x2 = cx + w / 2;
  return `
    <path d="M ${x1} ${by} L ${x1 + 2} ${by - h} Q ${cx} ${by - h - 4} ${x2 - 2} ${by - h} L ${x2} ${by} Z"
          fill="#6b4626" stroke="${STROKE}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M ${x1 + 2} ${by - h + 6} Q ${cx} ${by - h + 2} ${x2 - 2} ${by - h + 6}"
          fill="none" stroke="${DARK}" stroke-width="1" opacity="0.6"/>
  `;
}

function groundShadow(cx = 100, rx = 48, ry = 10, by = 262): string {
  return `<ellipse cx="${cx}" cy="${by}" rx="${rx}" ry="${ry}" fill="#1a1a0a" opacity="0.22"/>`;
}

// 1) Blossom oak — round canopy with flower dots (wisteria-toned)
function oak(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <path d="M96 260 L96 230" stroke="${STROKE}" stroke-width="2" fill="none"/>
    <circle cx="90" cy="225" r="11" fill="var(--canopy-a, #9BB86F)" stroke="${STROKE}" stroke-width="1.5"/>
    <circle cx="102" cy="220" r="9" fill="var(--canopy-b, #B8CF8A)" stroke="${STROKE}" stroke-width="1.5"/>
    <circle cx="94" cy="214" r="2" fill="var(--blossom, #F3D5E8)"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 34, 7, 262)}
    ${trunk({ w: 10, h: 48 })}
    <circle cx="86" cy="200" r="22" fill="var(--canopy-a, #9BB86F)" stroke="${STROKE}" stroke-width="1.8"/>
    <circle cx="112" cy="192" r="24" fill="var(--canopy-b, #B8CF8A)" stroke="${STROKE}" stroke-width="1.8"/>
    <circle cx="100" cy="208" r="20" fill="var(--canopy-a, #9BB86F)" stroke="${STROKE}" stroke-width="1.8"/>
    <g fill="var(--blossom, #F3D5E8)" stroke="${DARK}" stroke-width="0.6">
      <circle cx="92"  cy="192" r="3"/>
      <circle cx="108" cy="184" r="2.5"/>
      <circle cx="118" cy="198" r="2.8"/>
      <circle cx="90"  cy="210" r="2.5"/>
      <circle cx="104" cy="205" r="2"/>
    </g>
  `;
  return `
    ${groundShadow(100, 54, 10, 264)}
    ${trunk({ w: 18, h: 68 })}
    <circle cx="72"  cy="180" r="34" fill="var(--canopy-a, #9BB86F)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="128" cy="172" r="36" fill="var(--canopy-b, #B8CF8A)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="198" r="30" fill="var(--canopy-a, #9BB86F)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="102" cy="160" r="28" fill="var(--canopy-b, #B8CF8A)" stroke="${STROKE}" stroke-width="2"/>
    <g fill="var(--blossom, #F3D5E8)" stroke="${DARK}" stroke-width="0.7">
      <circle cx="78"  cy="168" r="4"/>
      <circle cx="96"  cy="150" r="3.5"/>
      <circle cx="120" cy="158" r="4"/>
      <circle cx="140" cy="178" r="3.5"/>
      <circle cx="132" cy="196" r="4"/>
      <circle cx="88"  cy="196" r="3.5"/>
      <circle cx="108" cy="188" r="3"/>
      <circle cx="70"  cy="188" r="3"/>
    </g>
    <path d="M86 152 Q100 142 118 148" fill="none" stroke="#E8F3D6" stroke-width="2" opacity="0.55"/>
  `;
}

// 2) Pine — triangular stacked cones
function pine(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <path d="M100 232 L90 258 L110 258 Z" fill="var(--pine, #4a7a42)" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M100 222 L92 240 L108 240 Z" fill="var(--pine-lt, #6ba066)" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 26, 6, 262)}
    <rect x="96" y="248" width="8" height="14" fill="#6b4626" stroke="${STROKE}" stroke-width="1.5"/>
    <path d="M100 210 L75 252 L125 252 Z" fill="var(--pine, #4a7a42)" stroke="${STROKE}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M100 188 L82 228 L118 228 Z" fill="var(--pine-lt, #6ba066)" stroke="${STROKE}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M100 172 L88 206 L112 206 Z" fill="var(--pine, #4a7a42)" stroke="${STROKE}" stroke-width="1.8" stroke-linejoin="round"/>
  `;
  return `
    ${groundShadow(100, 40, 9, 264)}
    <rect x="92" y="242" width="16" height="22" fill="#6b4626" stroke="${STROKE}" stroke-width="1.8"/>
    <path d="M100 210 L60 256 L140 256 Z" fill="var(--pine, #4a7a42)" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 170 L68 226 L132 226 Z" fill="var(--pine-lt, #6ba066)" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 130 L74 190 L126 190 Z" fill="var(--pine, #4a7a42)" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 96 L82 152 L118 152 Z" fill="var(--pine-lt, #6ba066)" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M92 152 L100 110 L92 152 Z" fill="#c8e0b8" opacity="0.35"/>
  `;
}

// 3) Sakura bush — pink cloud canopy
function sakura(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <path d="M100 260 L100 235" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="92" cy="232" r="10" fill="var(--sakura-a, #F3C5D8)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="106" cy="228" r="9" fill="var(--sakura-b, #FADDE8)" stroke="${STROKE}" stroke-width="1.4"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 34, 7, 262)}
    ${trunk({ w: 8, h: 40 })}
    <circle cx="80" cy="210" r="18" fill="var(--sakura-a, #F3C5D8)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="120" cy="206" r="20" fill="var(--sakura-b, #FADDE8)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="100" cy="218" r="18" fill="var(--sakura-a, #F3C5D8)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="104" cy="198" r="14" fill="var(--sakura-b, #FADDE8)" stroke="${STROKE}" stroke-width="1.6"/>
    <g fill="var(--sakura-deep, #D88AA8)" opacity="0.7">
      <circle cx="96" cy="205" r="1.8"/>
      <circle cx="110" cy="210" r="1.6"/>
      <circle cx="84" cy="216" r="1.4"/>
    </g>
  `;
  return `
    ${groundShadow(100, 52, 10, 264)}
    ${trunk({ w: 14, h: 56 })}
    <circle cx="66" cy="190" r="28" fill="var(--sakura-a, #F3C5D8)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="134" cy="186" r="30" fill="var(--sakura-b, #FADDE8)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="178" r="26" fill="var(--sakura-a, #F3C5D8)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="86"  cy="208" r="24" fill="var(--sakura-b, #FADDE8)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="120" cy="212" r="26" fill="var(--sakura-a, #F3C5D8)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="160" r="22" fill="var(--sakura-b, #FADDE8)" stroke="${STROKE}" stroke-width="2"/>
    <g fill="var(--sakura-deep, #D88AA8)" opacity="0.85">
      <circle cx="82" cy="180" r="2.5"/>
      <circle cx="112" cy="170" r="2.2"/>
      <circle cx="130" cy="200" r="2.6"/>
      <circle cx="96" cy="200" r="2"/>
      <circle cx="76" cy="202" r="2.4"/>
      <circle cx="118" cy="198" r="2"/>
      <circle cx="104" cy="186" r="1.8"/>
    </g>
    <path d="M78 170 Q96 154 118 162" fill="none" stroke="#fff1f7" stroke-width="2.5" opacity="0.6"/>
  `;
}

// 4) Sunflower cluster — yellow rounds on stems
function sunflower(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 14, 3, 262)}
    <path d="M100 260 L100 236" stroke="#3f6a2a" stroke-width="2.2"/>
    <circle cx="100" cy="230" r="9" fill="var(--sun-petal, #F4C948)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="100" cy="230" r="3.5" fill="#6b3f1e"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 28, 6, 262)}
    <path d="M95 260 L85 200" stroke="#3f6a2a" stroke-width="2.5" fill="none"/>
    <path d="M105 260 L115 195" stroke="#3f6a2a" stroke-width="2.5" fill="none"/>
    <path d="M100 260 L100 182" stroke="#3f6a2a" stroke-width="2.5" fill="none"/>
    <path d="M100 230 q -14 -2 -18 8 q 10 6 18 -8" fill="#3f6a2a" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M100 215 q 14 -2 18 8 q -10 6 -18 -8" fill="#3f6a2a" stroke="${STROKE}" stroke-width="1.2"/>
    <g stroke="${STROKE}" stroke-width="1.4">
      <circle cx="85" cy="200" r="13" fill="var(--sun-petal, #F4C948)"/>
      <circle cx="85" cy="200" r="5" fill="#6b3f1e"/>
      <circle cx="115" cy="195" r="12" fill="var(--sun-petal, #F4C948)"/>
      <circle cx="115" cy="195" r="4.5" fill="#6b3f1e"/>
      <circle cx="100" cy="180" r="14" fill="var(--sun-petal, #F4C948)"/>
      <circle cx="100" cy="180" r="5" fill="#6b3f1e"/>
    </g>
  `;
  return `
    ${groundShadow(100, 46, 9, 264)}
    <path d="M88 260 L70 160" stroke="#3f6a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M112 260 L130 150" stroke="#3f6a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M100 260 L100 130" stroke="#3f6a2a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M96 230 q -22 -6 -28 10 q 14 10 28 -10" fill="#4b7a34" stroke="${STROKE}" stroke-width="1.4"/>
    <path d="M104 200 q 22 -4 28 12 q -14 10 -28 -12" fill="#4b7a34" stroke="${STROKE}" stroke-width="1.4"/>
    <path d="M100 180 q -20 0 -24 12 q 14 4 24 -12" fill="#3f6a2a" stroke="${STROKE}" stroke-width="1.4"/>
    <g stroke="${STROKE}" stroke-width="1.6">
      <g transform="translate(70 160)">
        <g fill="var(--sun-petal-lt, #F7DC7A)"><circle cx="-14" cy="0" r="5"/><circle cx="14" cy="0" r="5"/><circle cx="0" cy="-14" r="5"/><circle cx="0" cy="14" r="5"/><circle cx="-10" cy="-10" r="4.5"/><circle cx="10" cy="-10" r="4.5"/><circle cx="-10" cy="10" r="4.5"/><circle cx="10" cy="10" r="4.5"/></g>
        <circle r="11" fill="var(--sun-petal, #F4C948)"/>
        <circle r="5" fill="#6b3f1e"/>
      </g>
      <g transform="translate(130 150)">
        <g fill="var(--sun-petal-lt, #F7DC7A)"><circle cx="-15" cy="0" r="5.5"/><circle cx="15" cy="0" r="5.5"/><circle cx="0" cy="-15" r="5.5"/><circle cx="0" cy="15" r="5.5"/><circle cx="-11" cy="-11" r="5"/><circle cx="11" cy="-11" r="5"/><circle cx="-11" cy="11" r="5"/><circle cx="11" cy="11" r="5"/></g>
        <circle r="12" fill="var(--sun-petal, #F4C948)"/>
        <circle r="5" fill="#6b3f1e"/>
      </g>
      <g transform="translate(100 130)">
        <g fill="var(--sun-petal-lt, #F7DC7A)"><circle cx="-17" cy="0" r="6"/><circle cx="17" cy="0" r="6"/><circle cx="0" cy="-17" r="6"/><circle cx="0" cy="17" r="6"/><circle cx="-12" cy="-12" r="5.5"/><circle cx="12" cy="-12" r="5.5"/><circle cx="-12" cy="12" r="5.5"/><circle cx="12" cy="12" r="5.5"/></g>
        <circle r="14" fill="var(--sun-petal, #F4C948)"/>
        <circle r="6" fill="#6b3f1e"/>
      </g>
    </g>
  `;
}

// 5) Wildflower patch — tiny flowers on grass tuft
function wildflower(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <path d="M95 260 L93 244" stroke="#3f6a2a" stroke-width="1.6"/>
    <path d="M104 260 L106 242" stroke="#3f6a2a" stroke-width="1.6"/>
    <circle cx="93" cy="240" r="3" fill="var(--wild-a, #B48BD6)"/>
    <circle cx="106" cy="238" r="3" fill="var(--wild-b, #F3C5D8)"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 6, 262)}
    <path d="M80 260 q 8 -20 14 -20 M100 260 q -4 -24 4 -28 M120 260 q -8 -18 -12 -22"
          stroke="#4b7a34" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M90 260 L85 232" stroke="#3f6a2a" stroke-width="1.8"/>
    <path d="M102 260 L104 220" stroke="#3f6a2a" stroke-width="1.8"/>
    <path d="M114 260 L118 228" stroke="#3f6a2a" stroke-width="1.8"/>
    <g stroke="${STROKE}" stroke-width="1">
      <circle cx="85" cy="228" r="5" fill="var(--wild-a, #B48BD6)"/>
      <circle cx="85" cy="228" r="1.6" fill="#F7DC7A"/>
      <circle cx="104" cy="216" r="6" fill="var(--wild-b, #F3C5D8)"/>
      <circle cx="104" cy="216" r="1.8" fill="#F7DC7A"/>
      <circle cx="118" cy="224" r="5" fill="var(--wild-c, #F7DC7A)"/>
      <circle cx="118" cy="224" r="1.6" fill="#6b3f1e"/>
    </g>
  `;
  return `
    ${groundShadow(100, 44, 9, 264)}
    <path d="M62 262 q 10 -30 18 -30 M82 262 q 4 -26 10 -32 M108 262 q -4 -34 4 -38 M128 262 q -8 -28 -14 -32 M142 262 q -10 -22 -18 -22"
          stroke="#4b7a34" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <g>
      <path d="M80 262 L74 210" stroke="#3f6a2a" stroke-width="2"/>
      <path d="M96 262 L96 196" stroke="#3f6a2a" stroke-width="2"/>
      <path d="M110 262 L116 200" stroke="#3f6a2a" stroke-width="2"/>
      <path d="M124 262 L130 214" stroke="#3f6a2a" stroke-width="2"/>
      <path d="M68 262 L62 220" stroke="#3f6a2a" stroke-width="2"/>
    </g>
    <g stroke="${STROKE}" stroke-width="1.2">
      <g transform="translate(74 206)">
        <g fill="var(--wild-a, #B48BD6)"><circle cx="-5" r="3.2"/><circle cx="5" r="3.2"/><circle cy="-5" r="3.2"/><circle cy="5" r="3.2"/></g>
        <circle r="2.4" fill="#F7DC7A"/>
      </g>
      <g transform="translate(96 192)">
        <g fill="var(--wild-b, #F3C5D8)"><circle cx="-6" r="3.8"/><circle cx="6" r="3.8"/><circle cy="-6" r="3.8"/><circle cy="6" r="3.8"/></g>
        <circle r="2.8" fill="#F7DC7A"/>
      </g>
      <g transform="translate(116 196)">
        <g fill="var(--wild-c, #F7DC7A)"><circle cx="-5" r="3.5"/><circle cx="5" r="3.5"/><circle cy="-5" r="3.5"/><circle cy="5" r="3.5"/></g>
        <circle r="2.5" fill="#6b3f1e"/>
      </g>
      <g transform="translate(130 210)">
        <g fill="var(--wild-a, #B48BD6)"><circle cx="-5" r="3.2"/><circle cx="5" r="3.2"/><circle cy="-5" r="3.2"/><circle cy="5" r="3.2"/></g>
        <circle r="2.2" fill="#F7DC7A"/>
      </g>
      <g transform="translate(62 216)">
        <g fill="var(--wild-b, #F3C5D8)"><circle cx="-4" r="3"/><circle cx="4" r="3"/><circle cy="-4" r="3"/><circle cy="4" r="3"/></g>
        <circle r="2" fill="#F7DC7A"/>
      </g>
    </g>
  `;
}

// 6) Reading stump — an open book on a little stump. Unique to this literary garden.
function bookStump(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 22, 5, 262)}
    <ellipse cx="100" cy="252" rx="22" ry="8" fill="#7c5434" stroke="${STROKE}" stroke-width="1.6"/>
    <ellipse cx="100" cy="248" rx="22" ry="8" fill="#a07a4e" stroke="${STROKE}" stroke-width="1.6"/>
    <ellipse cx="100" cy="248" rx="12" ry="3" fill="none" stroke="${DARK}" stroke-width="0.8" opacity="0.6"/>
    <ellipse cx="100" cy="248" rx="6" ry="1.6" fill="none" stroke="${DARK}" stroke-width="0.8" opacity="0.6"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 7, 262)}
    <path d="M74 260 L74 238 Q74 232 100 232 Q126 232 126 238 L126 260 Z" fill="#7c5434" stroke="${STROKE}" stroke-width="1.8"/>
    <ellipse cx="100" cy="238" rx="26" ry="8" fill="#a07a4e" stroke="${STROKE}" stroke-width="1.8"/>
    <ellipse cx="100" cy="238" rx="14" ry="4" fill="none" stroke="${DARK}" stroke-width="0.9" opacity="0.6"/>
    <path d="M100 232 L100 212" stroke="#3f6a2a" stroke-width="2"/>
    <path d="M100 222 q -8 -4 -10 -12 q 8 0 10 12" fill="#6ba066" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M100 216 q 8 -4 10 -12 q -8 0 -10 12" fill="#4a7a42" stroke="${STROKE}" stroke-width="1.2"/>
  `;
  return `
    ${groundShadow(100, 44, 9, 264)}
    <path d="M66 260 L66 222 Q66 214 100 214 Q134 214 134 222 L134 260 Z" fill="#7c5434" stroke="${STROKE}" stroke-width="2"/>
    <path d="M76 258 Q74 240 78 222" stroke="${DARK}" stroke-width="1" fill="none" opacity="0.6"/>
    <path d="M120 258 Q122 240 118 224" stroke="${DARK}" stroke-width="1" fill="none" opacity="0.6"/>
    <ellipse cx="100" cy="222" rx="34" ry="10" fill="#a07a4e" stroke="${STROKE}" stroke-width="2"/>
    <ellipse cx="100" cy="222" rx="22" ry="6" fill="none" stroke="${DARK}" stroke-width="0.9" opacity="0.5"/>
    <ellipse cx="100" cy="222" rx="12" ry="3.2" fill="none" stroke="${DARK}" stroke-width="0.9" opacity="0.5"/>
    <g transform="translate(100 208)">
      <path d="M -26 8 L -2 -2 L -2 12 L -26 18 Z" fill="#e8dcb8" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M 26 8 L 2 -2 L 2 12 L 26 18 Z" fill="#f5ebc8" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M -2 -2 L 2 -2 L 2 12 L -2 12 Z" fill="#c9a878" stroke="${STROKE}" stroke-width="1.2"/>
      <g stroke="${DARK}" stroke-width="0.8" opacity="0.55">
        <line x1="-22" y1="6" x2="-6" y2="0"/>
        <line x1="-22" y1="10" x2="-6" y2="4"/>
        <line x1="-22" y1="14" x2="-10" y2="9"/>
        <line x1="22" y1="6" x2="6" y2="0"/>
        <line x1="22" y1="10" x2="6" y2="4"/>
        <line x1="22" y1="14" x2="10" y2="9"/>
      </g>
      <path d="M 14 -2 L 14 20 L 18 16 L 22 20 L 22 -1 Z" fill="var(--rose-500, #d06060)" stroke="${STROKE}" stroke-width="1"/>
    </g>
    <path d="M 66 240 q -6 -4 -10 2 q 6 2 10 -2 z" fill="#4b7a34" stroke="${STROKE}" stroke-width="1"/>
    <path d="M 134 248 q 6 -4 10 2 q -6 2 -10 -2 z" fill="#4b7a34" stroke="${STROKE}" stroke-width="1"/>
  `;
}

// 7) Tulip row — three-tone tulips on stems
function tulip(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 14, 3, 262)}
    <path d="M100 260 L100 242" stroke="#3f6a2a" stroke-width="2"/>
    <path d="M94 240 q6 -10 12 0 q -6 6 -12 0 z" fill="var(--tulip-a, #e85a6a)" stroke="${STROKE}" stroke-width="1.2"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 26, 6, 262)}
    <path d="M85 260 L82 218" stroke="#3f6a2a" stroke-width="2.2"/>
    <path d="M100 260 L100 210" stroke="#3f6a2a" stroke-width="2.2"/>
    <path d="M115 260 L118 220" stroke="#3f6a2a" stroke-width="2.2"/>
    <path d="M74 248 q 8 -16 12 -6 q -4 10 -12 6 z" fill="#4b7a34" stroke="${STROKE}" stroke-width="1"/>
    <g stroke="${STROKE}" stroke-width="1.2">
      <path d="M76 218 q 6 -14 12 0 q -6 8 -12 0 z" fill="var(--tulip-a, #e85a6a)"/>
      <path d="M94 210 q 6 -14 12 0 q -6 8 -12 0 z" fill="var(--tulip-b, #f6b04a)"/>
      <path d="M112 220 q 6 -14 12 0 q -6 8 -12 0 z" fill="var(--tulip-c, #b48bd6)"/>
    </g>
  `;
  return `
    ${groundShadow(100, 44, 9, 264)}
    <g stroke="#3f6a2a" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M62 262 L60 200"/>
      <path d="M80 262 L76 180"/>
      <path d="M100 262 L100 170"/>
      <path d="M120 262 L124 180"/>
      <path d="M140 262 L144 200"/>
    </g>
    <g fill="#4b7a34" stroke="${STROKE}" stroke-width="1">
      <path d="M54 230 q 10 -20 16 -8 q -6 14 -16 8 z"/>
      <path d="M72 210 q 10 -20 16 -8 q -6 14 -16 8 z"/>
      <path d="M118 212 q -10 -20 -16 -8 q 6 14 16 8 z"/>
      <path d="M136 232 q -10 -20 -16 -8 q 6 14 16 8 z"/>
    </g>
    <g stroke="${STROKE}" stroke-width="1.4">
      <path d="M52 200 q 8 -18 16 0 q -8 10 -16 0 z" fill="var(--tulip-a, #e85a6a)"/>
      <path d="M68 180 q 8 -18 16 0 q -8 10 -16 0 z" fill="var(--tulip-b, #f6b04a)"/>
      <path d="M92 170 q 8 -20 16 0 q -8 12 -16 0 z" fill="var(--tulip-c, #b48bd6)"/>
      <path d="M116 180 q 8 -18 16 0 q -8 10 -16 0 z" fill="var(--tulip-a, #e85a6a)"/>
      <path d="M136 200 q 8 -18 16 0 q -8 10 -16 0 z" fill="var(--tulip-b, #f6b04a)"/>
    </g>
  `;
}

// 8) Mushroom cluster — red caps with white spots
function mushroom(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <rect x="97" y="246" width="6" height="14" fill="#f2e8c8" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M88 246 q 12 -14 24 0 z" fill="var(--mush, #d84838)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="94" cy="242" r="1.6" fill="#fff"/>
    <circle cx="103" cy="240" r="1.6" fill="#fff"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 7, 262)}
    <rect x="84" y="242" width="8" height="20" fill="#f2e8c8" stroke="${STROKE}" stroke-width="1.4"/>
    <path d="M70 242 q 18 -20 36 0 z" fill="var(--mush, #d84838)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="80" cy="234" r="2.2" fill="#fff"/>
    <circle cx="92" cy="230" r="2.2" fill="#fff"/>
    <circle cx="100" cy="236" r="1.8" fill="#fff"/>
    <rect x="112" y="250" width="6" height="12" fill="#f2e8c8" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M102 250 q 14 -14 26 0 z" fill="var(--mush-lt, #f06868)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="110" cy="244" r="1.6" fill="#fff"/>
    <circle cx="120" cy="246" r="1.6" fill="#fff"/>
  `;
  return `
    ${groundShadow(100, 48, 10, 264)}
    <rect x="78" y="236" width="14" height="28" fill="#f2e8c8" stroke="${STROKE}" stroke-width="1.8"/>
    <path d="M54 236 q 30 -32 62 0 z" fill="var(--mush, #d84838)" stroke="${STROKE}" stroke-width="2"/>
    <g fill="#fff" stroke="${STROKE}" stroke-width="0.8">
      <circle cx="66" cy="226" r="3.2"/>
      <circle cx="80" cy="218" r="3"/>
      <circle cx="92" cy="222" r="2.6"/>
      <circle cx="104" cy="228" r="3"/>
    </g>
    <rect x="120" y="246" width="10" height="18" fill="#f2e8c8" stroke="${STROKE}" stroke-width="1.6"/>
    <path d="M104 246 q 20 -22 42 0 z" fill="var(--mush-lt, #f06868)" stroke="${STROKE}" stroke-width="1.8"/>
    <g fill="#fff" stroke="${STROKE}" stroke-width="0.7">
      <circle cx="114" cy="238" r="2.2"/>
      <circle cx="125" cy="234" r="2"/>
      <circle cx="138" cy="240" r="2.2"/>
    </g>
    <rect x="148" y="254" width="5" height="10" fill="#f2e8c8" stroke="${STROKE}" stroke-width="1"/>
    <path d="M140 254 q 10 -10 22 0 z" fill="var(--mush, #d84838)" stroke="${STROKE}" stroke-width="1.2"/>
  `;
}

// 9) Lavender — purple spike clusters
function lavender(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <path d="M100 260 L100 240" stroke="#6a8a5a" stroke-width="2"/>
    <g fill="var(--lav, #9a7cc8)" stroke="${STROKE}" stroke-width="0.8">
      <circle cx="100" cy="236" r="2"/><circle cx="100" cy="230" r="2"/><circle cx="100" cy="224" r="1.8"/>
    </g>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 28, 6, 262)}
    <g stroke="#6a8a5a" stroke-width="2" fill="none">
      <path d="M88 260 L86 218"/>
      <path d="M100 260 L100 210"/>
      <path d="M112 260 L114 220"/>
    </g>
    <g fill="var(--lav, #9a7cc8)" stroke="${STROKE}" stroke-width="0.8">
      <circle cx="86" cy="216" r="2"/><circle cx="86" cy="210" r="2"/><circle cx="86" cy="204" r="1.8"/>
      <circle cx="100" cy="208" r="2.2"/><circle cx="100" cy="202" r="2.2"/><circle cx="100" cy="196" r="2"/><circle cx="100" cy="190" r="1.6"/>
      <circle cx="114" cy="218" r="2"/><circle cx="114" cy="212" r="2"/><circle cx="114" cy="206" r="1.8"/>
    </g>
  `;
  return `
    ${groundShadow(100, 44, 9, 264)}
    <g stroke="#6a8a5a" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M66 262 L60 198"/>
      <path d="M84 262 L78 180"/>
      <path d="M100 262 L100 168"/>
      <path d="M116 262 L122 180"/>
      <path d="M134 262 L140 198"/>
    </g>
    <g fill="var(--lav, #9a7cc8)" stroke="${STROKE}" stroke-width="0.8">
      <g>
        <circle cx="60" cy="196" r="2.4"/><circle cx="60" cy="190" r="2.4"/><circle cx="60" cy="184" r="2.2"/><circle cx="60" cy="178" r="2"/><circle cx="60" cy="172" r="1.6"/>
      </g>
      <g>
        <circle cx="78" cy="178" r="2.6"/><circle cx="78" cy="171" r="2.6"/><circle cx="78" cy="164" r="2.4"/><circle cx="78" cy="158" r="2"/><circle cx="78" cy="152" r="1.6"/>
      </g>
      <g>
        <circle cx="100" cy="166" r="2.8"/><circle cx="100" cy="158" r="2.8"/><circle cx="100" cy="150" r="2.6"/><circle cx="100" cy="142" r="2.2"/><circle cx="100" cy="135" r="1.8"/>
      </g>
      <g>
        <circle cx="122" cy="178" r="2.6"/><circle cx="122" cy="171" r="2.6"/><circle cx="122" cy="164" r="2.4"/><circle cx="122" cy="158" r="2"/><circle cx="122" cy="152" r="1.6"/>
      </g>
      <g>
        <circle cx="140" cy="196" r="2.4"/><circle cx="140" cy="190" r="2.4"/><circle cx="140" cy="184" r="2.2"/><circle cx="140" cy="178" r="2"/><circle cx="140" cy="172" r="1.6"/>
      </g>
    </g>
    <g fill="var(--lav-deep, #6a4a9a)" opacity="0.7">
      <circle cx="100" cy="152" r="1"/><circle cx="78" cy="168" r="1"/><circle cx="122" cy="168" r="1"/>
    </g>
  `;
}

// 10) Maple — star-shaped leaves, warm-toned
function maple(stage: Stage): string {
  const leaf = (cx: number, cy: number, r: number, fill: string): string => `
    <path d="M ${cx} ${cy - r}
             L ${cx + r*0.3} ${cy - r*0.4}
             L ${cx + r} ${cy - r*0.2}
             L ${cx + r*0.5} ${cy + r*0.2}
             L ${cx + r*0.7} ${cy + r}
             L ${cx} ${cy + r*0.4}
             L ${cx - r*0.7} ${cy + r}
             L ${cx - r*0.5} ${cy + r*0.2}
             L ${cx - r} ${cy - r*0.2}
             L ${cx - r*0.3} ${cy - r*0.4} Z"
          fill="${fill}" stroke="${STROKE}" stroke-width="1.4" stroke-linejoin="round"/>
  `;
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <path d="M100 260 L100 234" stroke="${STROKE}" stroke-width="2"/>
    ${leaf(100, 228, 10, 'var(--maple-a, #e07848)')}
  `;
  if (stage === 1) return `
    ${groundShadow(100, 32, 6, 262)}
    ${trunk({ w: 10, h: 44 })}
    ${leaf(86, 210, 18, 'var(--maple-a, #e07848)')}
    ${leaf(114, 204, 20, 'var(--maple-b, #f0a048)')}
    ${leaf(100, 196, 16, 'var(--maple-c, #c84838)')}
  `;
  return `
    ${groundShadow(100, 52, 10, 264)}
    ${trunk({ w: 16, h: 62 })}
    ${leaf(70, 182, 28, 'var(--maple-a, #e07848)')}
    ${leaf(130, 176, 30, 'var(--maple-b, #f0a048)')}
    ${leaf(100, 198, 26, 'var(--maple-c, #c84838)')}
    ${leaf(102, 156, 26, 'var(--maple-a, #e07848)')}
    ${leaf(120, 208, 20, 'var(--maple-b, #f0a048)')}
    ${leaf(80, 210, 20, 'var(--maple-c, #c84838)')}
    <path d="M88 162 Q100 150 118 156" fill="none" stroke="#fff2d8" stroke-width="2" opacity="0.55"/>
  `;
}

// 11) Lily pond — little water patch with lilies
function lilypond(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 22, 5, 262)}
    <ellipse cx="100" cy="254" rx="28" ry="8" fill="var(--water, #6ca8c8)" stroke="${STROKE}" stroke-width="1.4"/>
    <ellipse cx="100" cy="252" rx="8" ry="3" fill="#4a7a42" stroke="${STROKE}" stroke-width="1"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 32, 7, 262)}
    <ellipse cx="100" cy="252" rx="40" ry="12" fill="var(--water, #6ca8c8)" stroke="${STROKE}" stroke-width="1.6"/>
    <ellipse cx="100" cy="250" rx="36" ry="9" fill="none" stroke="#a8d0e0" stroke-width="1" opacity="0.7"/>
    <ellipse cx="86" cy="252" rx="10" ry="4" fill="#4a7a42" stroke="${STROKE}" stroke-width="1"/>
    <ellipse cx="112" cy="248" rx="11" ry="4.5" fill="#5e9058" stroke="${STROKE}" stroke-width="1"/>
    <circle cx="112" cy="246" r="3" fill="var(--lily, #f8ecd8)" stroke="${STROKE}" stroke-width="0.8"/>
  `;
  return `
    ${groundShadow(100, 50, 10, 264)}
    <ellipse cx="100" cy="250" rx="58" ry="16" fill="var(--water, #6ca8c8)" stroke="${STROKE}" stroke-width="1.8"/>
    <ellipse cx="100" cy="248" rx="54" ry="12" fill="none" stroke="#b8dce8" stroke-width="1.2" opacity="0.7"/>
    <ellipse cx="92" cy="252" rx="14" ry="2" fill="none" stroke="#c8e4f0" stroke-width="0.8" opacity="0.6"/>
    <ellipse cx="116" cy="244" rx="10" ry="1.5" fill="none" stroke="#c8e4f0" stroke-width="0.8" opacity="0.6"/>
    <g stroke="${STROKE}" stroke-width="1.2">
      <path d="M70 252 a 14 5 0 1 0 28 0 L 90 252 L86 248 Z" fill="#4a7a42"/>
      <path d="M108 244 a 14 5 0 1 0 28 0 L 128 244 L 124 240 Z" fill="#5e9058"/>
      <path d="M84 244 a 10 4 0 1 0 20 0 L 98 244 L 95 240 Z" fill="#3f6a2a"/>
    </g>
    <g stroke="${STROKE}" stroke-width="1">
      <g transform="translate(122 240)">
        <ellipse cx="-4" cy="0" rx="4" ry="2" fill="var(--lily, #f8ecd8)"/>
        <ellipse cx="4" cy="0" rx="4" ry="2" fill="var(--lily, #f8ecd8)"/>
        <ellipse cx="0" cy="-3" rx="3" ry="4" fill="var(--lily-deep, #f0c8a0)"/>
        <circle cy="-1" r="1.4" fill="#f6c848"/>
      </g>
      <g transform="translate(92 240)">
        <ellipse cx="-3" cy="0" rx="3.5" ry="1.8" fill="var(--lily, #f8ecd8)"/>
        <ellipse cx="3" cy="0" rx="3.5" ry="1.8" fill="var(--lily, #f8ecd8)"/>
        <ellipse cx="0" cy="-2" rx="2.4" ry="3.4" fill="var(--lily-deep, #f0c8a0)"/>
      </g>
    </g>
  `;
}

// 12) Berry bush — dark green bush with colored berries
function berrybush(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <path d="M100 260 L100 238" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="232" r="14" fill="var(--bush, #3f6a2a)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="94" cy="228" r="2" fill="var(--berry, #d8282a)"/>
    <circle cx="104" cy="232" r="2" fill="var(--berry, #d8282a)"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 32, 7, 262)}
    <circle cx="86" cy="238" r="16" fill="var(--bush, #3f6a2a)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="114" cy="234" r="18" fill="var(--bush-lt, #5e9058)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="100" cy="246" r="16" fill="var(--bush, #3f6a2a)" stroke="${STROKE}" stroke-width="1.6"/>
    <g fill="var(--berry, #d8282a)" stroke="${DARK}" stroke-width="0.7">
      <circle cx="88" cy="232" r="2.4"/>
      <circle cx="96" cy="238" r="2.4"/>
      <circle cx="110" cy="228" r="2.4"/>
      <circle cx="118" cy="238" r="2.4"/>
      <circle cx="104" cy="248" r="2.2"/>
    </g>
  `;
  return `
    ${groundShadow(100, 50, 10, 264)}
    <circle cx="70" cy="220" r="28" fill="var(--bush, #3f6a2a)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="130" cy="216" r="30" fill="var(--bush-lt, #5e9058)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="234" r="34" fill="var(--bush, #3f6a2a)" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="196" r="24" fill="var(--bush-lt, #5e9058)" stroke="${STROKE}" stroke-width="2"/>
    <g fill="var(--berry, #d8282a)" stroke="${DARK}" stroke-width="0.8">
      <circle cx="76" cy="208" r="3.4"/>
      <circle cx="92" cy="198" r="3"/>
      <circle cx="108" cy="192" r="3.2"/>
      <circle cx="126" cy="204" r="3.4"/>
      <circle cx="80" cy="230" r="3"/>
      <circle cx="104" cy="218" r="3.2"/>
      <circle cx="120" cy="232" r="3.4"/>
      <circle cx="96" cy="240" r="3"/>
      <circle cx="140" cy="222" r="3"/>
      <circle cx="66" cy="224" r="3"/>
    </g>
    <g fill="#fff" opacity="0.55">
      <circle cx="75" cy="207" r="0.8"/>
      <circle cx="107" cy="191" r="0.8"/>
      <circle cx="119" cy="231" r="0.8"/>
    </g>
  `;
}

// 13) Lantern plant — paper-lantern orange pods on stems
function lantern(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <path d="M100 260 L100 240" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="234" r="7" fill="var(--lantern, #ee8a2a)" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M100 228 L100 240" stroke="${DARK}" stroke-width="0.8" opacity="0.7"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 6, 262)}
    ${trunk({ w: 6, h: 36, by: 262 })}
    <path d="M100 226 Q80 216 76 230" stroke="${STROKE}" stroke-width="1.4" fill="none"/>
    <path d="M100 226 Q120 214 124 230" stroke="${STROKE}" stroke-width="1.4" fill="none"/>
    <circle cx="76" cy="234" r="10" fill="var(--lantern, #ee8a2a)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="124" cy="234" r="10" fill="var(--lantern-lt, #f4ac5a)" stroke="${STROKE}" stroke-width="1.4"/>
    <g stroke="${DARK}" stroke-width="0.9" opacity="0.65" fill="none">
      <path d="M76 226 Q72 234 76 242"/>
      <path d="M76 226 Q80 234 76 242"/>
      <path d="M124 226 Q120 234 124 242"/>
      <path d="M124 226 Q128 234 124 242"/>
    </g>
  `;
  return `
    ${groundShadow(100, 48, 9, 264)}
    ${trunk({ w: 12, h: 58 })}
    <g stroke="${STROKE}" stroke-width="1.6" fill="none">
      <path d="M100 208 Q66 196 60 220"/>
      <path d="M100 208 Q140 196 146 220"/>
      <path d="M100 200 Q80 180 78 168"/>
      <path d="M100 200 Q120 180 122 168"/>
    </g>
    <g stroke="${STROKE}" stroke-width="1.8">
      <circle cx="60" cy="226" r="14" fill="var(--lantern, #ee8a2a)"/>
      <circle cx="146" cy="226" r="14" fill="var(--lantern-lt, #f4ac5a)"/>
      <circle cx="78" cy="168" r="12" fill="var(--lantern, #ee8a2a)"/>
      <circle cx="122" cy="168" r="12" fill="var(--lantern-lt, #f4ac5a)"/>
      <circle cx="100" cy="196" r="16" fill="var(--lantern, #ee8a2a)"/>
    </g>
    <g stroke="${DARK}" stroke-width="1" opacity="0.6" fill="none">
      <path d="M60 214 Q54 226 60 238"/><path d="M60 214 Q66 226 60 238"/>
      <path d="M146 214 Q140 226 146 238"/><path d="M146 214 Q152 226 146 238"/>
      <path d="M100 182 Q92 196 100 212"/><path d="M100 182 Q108 196 100 212"/>
      <path d="M78 158 Q72 168 78 178"/><path d="M122 158 Q128 168 122 178"/>
    </g>
  `;
}

// 14) Fern — arching green fronds
function fern(stage: Stage): string {
  const frond = (x1: number, y1: number, x2: number, y2: number, side: number, color: string): string => {
    const frondPath = `M ${x1} ${y1} Q ${(x1+x2)/2 + side*10} ${(y1+y2)/2 - 8} ${x2} ${y2}`;
    let leafs = '';
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const lx = x1 + (x2 - x1) * t + side * 10 * Math.sin(Math.PI * t);
      const ly = y1 + (y2 - y1) * t - 8 * Math.sin(Math.PI * t);
      const llen = 6 - Math.abs(t - 0.5) * 4;
      leafs += `<ellipse cx="${lx + side*llen*0.5}" cy="${ly - llen*0.3}" rx="${llen}" ry="2" fill="${color}" stroke="${STROKE}" stroke-width="0.8" transform="rotate(${side*-30} ${lx} ${ly})"/>`;
    }
    return `<path d="${frondPath}" stroke="${STROKE}" stroke-width="1.6" fill="none"/>${leafs}`;
  };
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <path d="M100 260 q -6 -14 -16 -18" stroke="#3f6a2a" stroke-width="2" fill="none"/>
    <path d="M100 260 q 6 -14 16 -18" stroke="#3f6a2a" stroke-width="2" fill="none"/>
    <path d="M100 260 q 0 -16 0 -22" stroke="#3f6a2a" stroke-width="2" fill="none"/>
    <g fill="var(--fern, #4b7a34)" stroke="${STROKE}" stroke-width="0.7">
      <ellipse cx="88" cy="244" rx="4" ry="2" transform="rotate(30 88 244)"/>
      <ellipse cx="112" cy="244" rx="4" ry="2" transform="rotate(-30 112 244)"/>
      <ellipse cx="100" cy="236" rx="3" ry="5"/>
    </g>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 7, 262)}
    ${frond(100, 258, 60, 200, 1, 'var(--fern, #4b7a34)')}
    ${frond(100, 258, 140, 200, -1, 'var(--fern-lt, #6ba066)')}
    ${frond(100, 258, 100, 180, 0, 'var(--fern, #4b7a34)')}
  `;
  return `
    ${groundShadow(100, 50, 10, 264)}
    ${frond(100, 260, 46, 186, 1, 'var(--fern, #4b7a34)')}
    ${frond(100, 260, 154, 186, -1, 'var(--fern-lt, #6ba066)')}
    ${frond(100, 260, 66, 150, 1, 'var(--fern, #4b7a34)')}
    ${frond(100, 260, 134, 150, -1, 'var(--fern-lt, #6ba066)')}
    ${frond(100, 260, 100, 130, 0, 'var(--fern, #4b7a34)')}
  `;
}

// 15) Rose bush — red roses with thorny stems
function rose(stage: Stage): string {
  const roseHead = (cx: number, cy: number, r: number, fill: string): string => `
    <g stroke="${STROKE}" stroke-width="1.2">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
      <path d="M ${cx - r*0.5} ${cy} Q ${cx} ${cy - r*0.6} ${cx + r*0.5} ${cy} Q ${cx} ${cy + r*0.3} ${cx - r*0.5} ${cy} Z" fill="${fill}" opacity="0.85"/>
      <circle cx="${cx}" cy="${cy - r*0.1}" r="${r*0.35}" fill="${fill}" opacity="0.95"/>
    </g>
  `;
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <path d="M100 260 L100 234" stroke="#4b7a34" stroke-width="2"/>
    ${roseHead(100, 228, 7, 'var(--rose-a, #d23a4a)')}
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 7, 262)}
    <g stroke="#4b7a34" stroke-width="2.2" fill="none" stroke-linecap="round">
      <path d="M92 260 L86 210"/>
      <path d="M108 260 L114 212"/>
      <path d="M100 260 L100 198"/>
    </g>
    <path d="M88 232 q -6 -8 0 -12 q 6 4 0 12z" fill="#4b7a34" stroke="${STROKE}" stroke-width="0.9"/>
    <path d="M114 230 q 6 -8 0 -12 q -6 4 0 12z" fill="#4b7a34" stroke="${STROKE}" stroke-width="0.9"/>
    ${roseHead(86, 204, 10, 'var(--rose-a, #d23a4a)')}
    ${roseHead(114, 206, 10, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(100, 192, 11, 'var(--rose-a, #d23a4a)')}
  `;
  return `
    ${groundShadow(100, 50, 10, 264)}
    <g stroke="#4b7a34" stroke-width="2.8" fill="none" stroke-linecap="round">
      <path d="M70 262 L62 186"/>
      <path d="M90 262 L84 160"/>
      <path d="M110 262 L116 160"/>
      <path d="M130 262 L138 186"/>
      <path d="M100 262 L100 140"/>
    </g>
    <g fill="#4b7a34" stroke="${STROKE}" stroke-width="1">
      <path d="M64 220 q -10 -10 -4 -16 q 10 6 4 16z"/>
      <path d="M138 220 q 10 -10 4 -16 q -10 6 -4 16z"/>
      <path d="M84 192 q -10 -10 -4 -16 q 10 6 4 16z"/>
      <path d="M116 192 q 10 -10 4 -16 q -10 6 -4 16z"/>
    </g>
    <g fill="#4b7a34">
      <path d="M66 230 l 4 -2 l -2 4 z"/>
      <path d="M128 230 l -4 -2 l 2 4 z"/>
    </g>
    ${roseHead(62, 180, 14, 'var(--rose-a, #d23a4a)')}
    ${roseHead(84, 154, 14, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(116, 154, 14, 'var(--rose-a, #d23a4a)')}
    ${roseHead(138, 180, 14, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(100, 134, 15, 'var(--rose-deep, #a02030)')}
  `;
}

// 16) Cactus — desert saguaro with pink bloom
function cactus(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <path d="M94 260 L94 238 Q94 232 100 232 Q106 232 106 238 L106 260 Z"
          fill="var(--cactus, #6a9a5a)" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="100" cy="232" r="3" fill="var(--bloom, #f0608a)" stroke="${STROKE}" stroke-width="1"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 28, 6, 262)}
    <path d="M88 260 L88 220 Q88 210 100 210 Q112 210 112 220 L112 260 Z"
          fill="var(--cactus, #6a9a5a)" stroke="${STROKE}" stroke-width="1.6"/>
    <path d="M78 246 L78 230 Q78 224 84 224 Q90 224 90 230 L90 246 Z"
          fill="var(--cactus-lt, #88b674)" stroke="${STROKE}" stroke-width="1.4"/>
    <g stroke="${DARK}" stroke-width="0.6" opacity="0.55" fill="none">
      <path d="M96 260 L96 214"/>
      <path d="M104 260 L104 214"/>
    </g>
    <circle cx="100" cy="210" r="5" fill="var(--bloom, #f0608a)" stroke="${STROKE}" stroke-width="1.2"/>
    <circle cx="100" cy="210" r="1.6" fill="#fff"/>
  `;
  return `
    ${groundShadow(100, 42, 9, 264)}
    <path d="M86 262 L86 176 Q86 164 100 164 Q114 164 114 176 L114 262 Z"
          fill="var(--cactus, #6a9a5a)" stroke="${STROKE}" stroke-width="2"/>
    <path d="M68 240 L68 212 Q68 204 76 204 Q84 204 84 212 L84 220 L86 220 L86 228 L68 228 Z
             M68 228 L64 228 L64 240 L68 240 Z"
          fill="var(--cactus-lt, #88b674)" stroke="${STROKE}" stroke-width="1.8"/>
    <path d="M114 222 L114 230 L118 230 L118 244 L132 244 L132 218 Q132 210 124 210 Q116 210 116 218 L116 222 Z"
          fill="var(--cactus-lt, #88b674)" stroke="${STROKE}" stroke-width="1.8"/>
    <g stroke="${DARK}" stroke-width="0.7" opacity="0.55" fill="none">
      <path d="M94 260 L94 170"/>
      <path d="M106 260 L106 170"/>
      <path d="M74 238 L74 214"/>
      <path d="M124 242 L124 218"/>
    </g>
    <g stroke="${DARK}" stroke-width="0.8">
      <line x1="94" y1="192" x2="90" y2="192"/>
      <line x1="106" y1="192" x2="110" y2="192"/>
      <line x1="94" y1="210" x2="90" y2="210"/>
      <line x1="106" y1="210" x2="110" y2="210"/>
      <line x1="94" y1="228" x2="90" y2="228"/>
    </g>
    <g stroke="${STROKE}" stroke-width="1.2">
      <circle cx="100" cy="164" r="8" fill="var(--bloom, #f0608a)"/>
      <circle cx="100" cy="164" r="3" fill="#f8dc7a"/>
      <circle cx="76" cy="204" r="5" fill="var(--bloom-lt, #f898b4)"/>
      <circle cx="124" cy="210" r="5" fill="var(--bloom-lt, #f898b4)"/>
    </g>
  `;
}

// 17) Topiary — sculpted hedge stacked on an urn
function topiary(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 16, 4, 262)}
    <rect x="96" y="250" width="8" height="10" fill="#8a6a3a" stroke="${STROKE}" stroke-width="1.2"/>
    <circle cx="100" cy="240" r="10" fill="var(--topiary, #3f7a4a)" stroke="${STROKE}" stroke-width="1.4"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 30, 6, 262)}
    <rect x="94" y="236" width="12" height="24" fill="#8a6a3a" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="100" cy="230" r="16" fill="var(--topiary, #3f7a4a)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="100" cy="212" r="12" fill="var(--topiary-lt, #5a9864)" stroke="${STROKE}" stroke-width="1.6"/>
    <circle cx="100" cy="198" r="8" fill="var(--topiary, #3f7a4a)" stroke="${STROKE}" stroke-width="1.4"/>
  `;
  return `
    ${groundShadow(100, 44, 9, 264)}
    <path d="M82 262 L80 248 L88 240 L112 240 L120 248 L118 262 Z"
          fill="#d8c498" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M86 244 L114 244" stroke="${DARK}" stroke-width="1" opacity="0.5"/>
    <rect x="96" y="222" width="8" height="18" fill="#8a6a3a" stroke="${STROKE}" stroke-width="1.4"/>
    <circle cx="100" cy="218" r="26" fill="var(--topiary, #3f7a4a)" stroke="${STROKE}" stroke-width="2"/>
    <path d="M78 214 Q100 204 122 214" fill="none" stroke="var(--topiary-lt, #5a9864)" stroke-width="3" opacity="0.7"/>
    <circle cx="100" cy="178" r="20" fill="var(--topiary-lt, #5a9864)" stroke="${STROKE}" stroke-width="2"/>
    <path d="M84 176 Q100 166 116 176" fill="none" stroke="var(--topiary, #3f7a4a)" stroke-width="2.5" opacity="0.7"/>
    <circle cx="100" cy="146" r="15" fill="var(--topiary, #3f7a4a)" stroke="${STROKE}" stroke-width="1.8"/>
    <circle cx="100" cy="128" r="5" fill="var(--bloom, #f0608a)" stroke="${STROKE}" stroke-width="1.2"/>
  `;
}

// 18) Bamboo — slender segmented stalks with narrow leaves
function bamboo(stage: Stage): string {
  const segment = (x: number, yTop: number, yBot: number, color: string): string => {
    let out = `<rect x="${x-4}" y="${yTop}" width="8" height="${yBot-yTop}" fill="${color}" stroke="${STROKE}" stroke-width="1.2"/>`;
    for (let y = yTop + 12; y < yBot; y += 14) {
      out += `<line x1="${x-5}" y1="${y}" x2="${x+5}" y2="${y}" stroke="${DARK}" stroke-width="1" opacity="0.7"/>`;
    }
    return out;
  };
  if (stage === 0) return `
    ${groundShadow(100, 14, 3, 262)}
    ${segment(100, 226, 262, 'var(--bamboo, #8ab670)')}
    <path d="M100 226 q -10 -4 -14 -14 q 8 2 14 14 z" fill="var(--bamboo-leaf, #5e9058)" stroke="${STROKE}" stroke-width="1"/>
    <path d="M100 226 q 10 -4 14 -14 q -8 2 -14 14 z" fill="var(--bamboo-leaf, #5e9058)" stroke="${STROKE}" stroke-width="1"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 26, 6, 262)}
    ${segment(90, 196, 262, 'var(--bamboo, #8ab670)')}
    ${segment(110, 188, 262, 'var(--bamboo-lt, #a8ce86)')}
    <g fill="var(--bamboo-leaf, #5e9058)" stroke="${STROKE}" stroke-width="1">
      <path d="M90 200 q -16 -4 -22 -16 q 14 0 22 16 z"/>
      <path d="M110 192 q 16 -4 22 -16 q -14 0 -22 16 z"/>
      <path d="M90 220 q 14 -4 18 -14 q -14 0 -18 14 z"/>
    </g>
  `;
  return `
    ${groundShadow(100, 42, 9, 264)}
    ${segment(74, 170, 262, 'var(--bamboo, #8ab670)')}
    ${segment(100, 140, 262, 'var(--bamboo-lt, #a8ce86)')}
    ${segment(126, 158, 262, 'var(--bamboo, #8ab670)')}
    <g fill="var(--bamboo-leaf, #5e9058)" stroke="${STROKE}" stroke-width="1.2">
      <path d="M74 174 q -22 -6 -30 -22 q 20 2 30 22 z"/>
      <path d="M100 146 q 24 -6 32 -24 q -22 2 -32 24 z"/>
      <path d="M100 170 q -22 -4 -28 -20 q 20 0 28 20 z"/>
      <path d="M126 162 q 22 -4 28 -20 q -20 0 -28 20 z"/>
      <path d="M74 210 q 18 -4 22 -18 q -18 0 -22 18 z"/>
      <path d="M126 200 q -18 -4 -22 -18 q 18 0 22 18 z"/>
    </g>
    <g fill="var(--bamboo-leaf, #5e9058)" stroke="${STROKE}" stroke-width="1" opacity="0.9">
      <path d="M100 120 q -14 -8 -12 -22 q 12 4 12 22 z"/>
      <path d="M100 118 q 14 -8 12 -22 q -12 4 -12 22 z"/>
    </g>
  `;
}

// 19) Lavender spike — a single tall, showy lavender spike
function lavenderSpike(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 14, 3, 262)}
    <path d="M100 260 L100 238" stroke="#6a8a5a" stroke-width="2"/>
    <g fill="var(--lav, #9a7cc8)" stroke="${STROKE}" stroke-width="0.8">
      <circle cx="100" cy="234" r="2.4"/><circle cx="100" cy="228" r="2.2"/><circle cx="100" cy="222" r="1.8"/>
    </g>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 22, 5, 262)}
    <path d="M100 262 L100 196" stroke="#6a8a5a" stroke-width="2.6"/>
    <path d="M90 240 q 10 -12 16 -6 q -4 10 -16 6z" fill="#6a8a5a" stroke="${STROKE}" stroke-width="1"/>
    <path d="M110 220 q -10 -12 -16 -6 q 4 10 16 6z" fill="#6a8a5a" stroke="${STROKE}" stroke-width="1"/>
    <g fill="var(--lav, #9a7cc8)" stroke="${STROKE}" stroke-width="0.8">
      <circle cx="100" cy="192" r="3"/><circle cx="100" cy="185" r="3"/><circle cx="100" cy="178" r="2.8"/>
      <circle cx="100" cy="171" r="2.4"/><circle cx="100" cy="165" r="2"/>
    </g>
  `;
  return `
    ${groundShadow(100, 36, 8, 264)}
    <path d="M100 262 L100 150" stroke="#6a8a5a" stroke-width="3" stroke-linecap="round"/>
    <path d="M82 238 q 18 -18 22 -4 q -10 14 -22 4z" fill="#6a8a5a" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M118 218 q -18 -18 -22 -4 q 10 14 22 4z" fill="#6a8a5a" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M82 198 q 18 -18 22 -4 q -10 14 -22 4z" fill="#5a7a48" stroke="${STROKE}" stroke-width="1.2"/>
    <g fill="var(--lav, #9a7cc8)" stroke="${STROKE}" stroke-width="0.9">
      <circle cx="96" cy="148" r="4"/><circle cx="104" cy="148" r="4"/>
      <circle cx="96" cy="140" r="3.8"/><circle cx="104" cy="140" r="3.8"/>
      <circle cx="100" cy="134" r="3.6"/>
      <circle cx="94" cy="156" r="3.8"/><circle cx="106" cy="156" r="3.8"/>
      <circle cx="92" cy="164" r="3.6"/><circle cx="108" cy="164" r="3.6"/>
      <circle cx="94" cy="172" r="3.4"/><circle cx="106" cy="172" r="3.4"/>
      <circle cx="96" cy="180" r="3"/><circle cx="104" cy="180" r="3"/>
      <circle cx="98" cy="188" r="2.4"/><circle cx="102" cy="188" r="2.4"/>
      <circle cx="100" cy="128" r="2.6"/>
      <circle cx="100" cy="122" r="2"/>
    </g>
    <g fill="var(--lav-deep, #6a4a9a)" opacity="0.7">
      <circle cx="100" cy="150" r="1"/><circle cx="100" cy="162" r="1"/><circle cx="100" cy="175" r="1"/>
    </g>
  `;
}

// 20) Fern curl — a tight spiral fiddlehead
function fernCurl(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 14, 3, 262)}
    <path d="M100 262 q 0 -14 -6 -18 q -4 -2 -4 4" stroke="var(--fern, #4b7a34)" stroke-width="3" fill="none" stroke-linecap="round"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 26, 5, 262)}
    <path d="M96 262 q 0 -30 -10 -38 q -12 -6 -8 8 q 4 10 14 2" stroke="var(--fern, #4b7a34)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M108 262 q 0 -24 6 -32 q 8 -6 8 2" stroke="var(--fern-lt, #6ba066)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g fill="var(--fern-lt, #6ba066)" stroke="${STROKE}" stroke-width="0.8">
      <ellipse cx="82" cy="238" rx="4" ry="2" transform="rotate(-30 82 238)"/>
      <ellipse cx="84" cy="224" rx="3.5" ry="1.8" transform="rotate(-50 84 224)"/>
    </g>
  `;
  return `
    ${groundShadow(100, 44, 9, 264)}
    <path d="M100 262 q 0 -50 -14 -64 q -22 -18 -18 10 q 6 24 22 8 q 10 -10 -2 -18"
          stroke="var(--fern, #4b7a34)" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M100 262 q 0 -40 14 -52 q 18 -12 18 6 q -2 16 -14 8"
          stroke="var(--fern-lt, #6ba066)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M100 262 q 0 -70 -4 -96 q -4 -14 -10 -4"
          stroke="var(--fern, #4b7a34)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <g fill="var(--fern-lt, #6ba066)" stroke="${STROKE}" stroke-width="0.9">
      <ellipse cx="78" cy="230" rx="6" ry="2.6" transform="rotate(-30 78 230)"/>
      <ellipse cx="72" cy="212" rx="6" ry="2.6" transform="rotate(-40 72 212)"/>
      <ellipse cx="68" cy="196" rx="5" ry="2.4" transform="rotate(-55 68 196)"/>
      <ellipse cx="124" cy="232" rx="6" ry="2.6" transform="rotate(30 124 232)"/>
      <ellipse cx="128" cy="216" rx="5.5" ry="2.4" transform="rotate(40 128 216)"/>
    </g>
    <path d="M72 188 a 6 6 0 1 1 0 0.1" fill="none" stroke="#c8e4b0" stroke-width="1.5" opacity="0.8"/>
  `;
}

// 21) Moss rock — boulder with moss cap and small wildflowers
function mossRock(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 22, 5, 262)}
    <path d="M82 262 q -4 -18 18 -22 q 22 0 22 20 Z"
          fill="#9a9a98" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M86 246 q 14 -10 28 -2 q -2 6 -12 4 q -10 -2 -16 -2 z" fill="var(--moss, #5e9058)" stroke="${STROKE}" stroke-width="1"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 34, 7, 262)}
    <path d="M72 262 q -8 -26 28 -30 q 32 -2 32 28 Z"
          fill="#a8a8a4" stroke="${STROKE}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M80 258 q 0 -16 6 -22" stroke="${DARK}" stroke-width="1" fill="none" opacity="0.5"/>
    <path d="M120 258 q 2 -18 -4 -22" stroke="${DARK}" stroke-width="1" fill="none" opacity="0.5"/>
    <path d="M76 240 q 20 -16 48 -6 q -4 10 -14 8 q -14 -2 -34 -2 z" fill="var(--moss, #5e9058)" stroke="${STROKE}" stroke-width="1.2"/>
    <path d="M82 232 q 10 -4 20 0" stroke="var(--moss-lt, #7ab068)" stroke-width="2" fill="none"/>
    <g stroke="${STROKE}" stroke-width="0.8">
      <circle cx="90" cy="232" r="3" fill="var(--wild-b, #f3c5d8)"/>
      <circle cx="90" cy="232" r="1" fill="#f7dc7a"/>
      <circle cx="110" cy="230" r="3" fill="var(--wild-a, #b48bd6)"/>
      <circle cx="110" cy="230" r="1" fill="#f7dc7a"/>
    </g>
  `;
  return `
    ${groundShadow(100, 52, 10, 264)}
    <path d="M58 262 q -10 -38 34 -46 q 46 -6 52 34 L 148 262 Z"
          fill="#b0b0ac" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M72 256 q -2 -20 10 -30" stroke="${DARK}" stroke-width="1.2" fill="none" opacity="0.55"/>
    <path d="M130 258 q 4 -22 -6 -34" stroke="${DARK}" stroke-width="1.2" fill="none" opacity="0.55"/>
    <path d="M96 256 L 100 244" stroke="${DARK}" stroke-width="1" fill="none" opacity="0.45"/>
    <path d="M76 224 q 20 -14 44 -8" stroke="#dcdcd6" stroke-width="2" fill="none" opacity="0.6"/>
    <path d="M58 228 q 30 -22 88 -10 q -6 14 -20 12 q -18 -4 -68 -2 z" fill="var(--moss, #5e9058)" stroke="${STROKE}" stroke-width="1.4"/>
    <path d="M66 216 q 14 -8 28 -2 q 8 -4 22 0" stroke="var(--moss-lt, #7ab068)" stroke-width="2.6" fill="none" opacity="0.85"/>
    <g fill="var(--moss-lt, #7ab068)">
      <circle cx="70" cy="238" r="1.6"/><circle cx="82" cy="234" r="1.4"/>
      <circle cx="120" cy="234" r="1.6"/><circle cx="134" cy="238" r="1.4"/>
    </g>
    <g stroke="${STROKE}" stroke-width="1">
      <g transform="translate(82 218)">
        <g fill="var(--wild-b, #f3c5d8)"><circle cx="-4" r="3"/><circle cx="4" r="3"/><circle cy="-4" r="3"/><circle cy="4" r="3"/></g>
        <circle r="2" fill="#f7dc7a"/>
      </g>
      <g transform="translate(104 210)">
        <g fill="var(--wild-a, #b48bd6)"><circle cx="-4.5" r="3.4"/><circle cx="4.5" r="3.4"/><circle cy="-4.5" r="3.4"/><circle cy="4.5" r="3.4"/></g>
        <circle r="2.2" fill="#f7dc7a"/>
      </g>
      <g transform="translate(124 218)">
        <g fill="var(--wild-c, #f7dc7a)"><circle cx="-4" r="3"/><circle cx="4" r="3"/><circle cy="-4" r="3"/><circle cy="4" r="3"/></g>
        <circle r="2" fill="#6b3f1e"/>
      </g>
    </g>
    <path d="M56 262 q 6 -10 10 -8 M148 262 q -6 -10 -10 -8" stroke="#4b7a34" stroke-width="2" fill="none" stroke-linecap="round"/>
  `;
}

// 22) Weeping willow — drooping curtain of fronds
function willow(stage: Stage): string {
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <path d="M100 260 L100 238" stroke="${STROKE}" stroke-width="2"/>
    <g stroke="var(--willow, #8ab06a)" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M100 236 q -8 6 -8 14"/>
      <path d="M100 236 q 8 6 8 14"/>
      <path d="M100 236 q 0 6 0 16"/>
    </g>
    <circle cx="100" cy="232" r="7" fill="var(--willow-lt, #aac888)" stroke="${STROKE}" stroke-width="1.2"/>
  `;
  if (stage === 1) return `
    ${groundShadow(100, 32, 7, 262)}
    ${trunk({ w: 10, h: 40 })}
    <ellipse cx="100" cy="212" rx="28" ry="18" fill="var(--willow-lt, #aac888)" stroke="${STROKE}" stroke-width="1.8"/>
    <g stroke="var(--willow, #8ab06a)" stroke-width="2.2" fill="none" stroke-linecap="round">
      <path d="M78 222 q -2 14 -6 22"/>
      <path d="M88 226 q -2 14 -2 24"/>
      <path d="M100 228 q 0 14 0 26"/>
      <path d="M112 226 q 2 14 2 24"/>
      <path d="M122 222 q 2 14 6 22"/>
    </g>
    <g fill="var(--willow, #8ab06a)" stroke="${STROKE}" stroke-width="0.7">
      <ellipse cx="78" cy="240" rx="2" ry="5"/>
      <ellipse cx="100" cy="252" rx="2" ry="5"/>
      <ellipse cx="122" cy="240" rx="2" ry="5"/>
    </g>
  `;
  return `
    ${groundShadow(100, 56, 11, 264)}
    ${trunk({ w: 16, h: 58 })}
    <ellipse cx="100" cy="176" rx="50" ry="28" fill="var(--willow-lt, #aac888)" stroke="${STROKE}" stroke-width="2"/>
    <ellipse cx="84" cy="170" rx="24" ry="18" fill="var(--willow, #8ab06a)" stroke="${STROKE}" stroke-width="1.8"/>
    <ellipse cx="122" cy="168" rx="22" ry="18" fill="var(--willow, #8ab06a)" stroke="${STROKE}" stroke-width="1.8"/>
    <g stroke="var(--willow, #8ab06a)" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M58 188 q -4 28 -8 46"/>
      <path d="M72 196 q -2 26 -4 48"/>
      <path d="M86 200 q -1 28 -1 54"/>
      <path d="M100 202 q 0 30 0 58"/>
      <path d="M114 200 q 1 28 1 54"/>
      <path d="M128 196 q 2 26 4 48"/>
      <path d="M142 188 q 4 28 8 46"/>
    </g>
    <g stroke="var(--willow-lt, #aac888)" stroke-width="1.5" fill="none" stroke-linecap="round">
      <path d="M66 192 q -2 24 -4 42"/>
      <path d="M80 198 q -1 26 -2 48"/>
      <path d="M120 198 q 1 26 2 48"/>
      <path d="M134 192 q 2 24 4 42"/>
    </g>
    <g fill="var(--willow, #8ab06a)" stroke="${STROKE}" stroke-width="0.7">
      <ellipse cx="52" cy="232" rx="2.2" ry="5"/>
      <ellipse cx="72" cy="242" rx="2" ry="5"/>
      <ellipse cx="86" cy="252" rx="2" ry="5"/>
      <ellipse cx="100" cy="258" rx="2.2" ry="5.5"/>
      <ellipse cx="114" cy="252" rx="2" ry="5"/>
      <ellipse cx="128" cy="242" rx="2" ry="5"/>
      <ellipse cx="148" cy="232" rx="2.2" ry="5"/>
    </g>
    <path d="M76 158 Q100 146 122 152" fill="none" stroke="#e0ecc4" stroke-width="2" opacity="0.55"/>
  `;
}

// 23) Rose trellis — lattice with climbing roses
function roseTrellis(stage: Stage): string {
  const roseHead = (cx: number, cy: number, r: number, fill: string): string => `
    <g stroke="${STROKE}" stroke-width="1">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
      <circle cx="${cx}" cy="${cy - r*0.2}" r="${r*0.4}" fill="${fill}" opacity="0.95"/>
    </g>
  `;
  if (stage === 0) return `
    ${groundShadow(100, 18, 4, 262)}
    <g stroke="#d8c498" stroke-width="2.4" fill="none">
      <path d="M92 260 L92 236"/>
      <path d="M108 260 L108 236"/>
      <path d="M92 248 L108 248"/>
    </g>
    ${roseHead(100, 232, 6, 'var(--rose-a, #d23a4a)')}
  `;
  if (stage === 1) return `
    ${groundShadow(100, 32, 7, 262)}
    <g stroke="#d8c498" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M82 262 L82 206"/>
      <path d="M118 262 L118 206"/>
      <path d="M82 212 L118 212"/>
      <path d="M82 232 L118 232"/>
      <path d="M82 252 L118 252"/>
    </g>
    <path d="M82 260 q 4 -20 18 -26 q 16 -8 18 -22"
          stroke="var(--vine, #4b7a34)" stroke-width="2.4" fill="none"/>
    <g fill="#4b7a34" stroke="${STROKE}" stroke-width="0.7">
      <ellipse cx="92" cy="244" rx="3" ry="2" transform="rotate(30 92 244)"/>
      <ellipse cx="108" cy="224" rx="3" ry="2" transform="rotate(-30 108 224)"/>
    </g>
    ${roseHead(88, 232, 6, 'var(--rose-a, #d23a4a)')}
    ${roseHead(106, 216, 7, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(118, 204, 6, 'var(--rose-a, #d23a4a)')}
  `;
  return `
    ${groundShadow(100, 54, 11, 264)}
    <path d="M64 262 L64 246 L136 246 L136 262 Z" fill="#d8c498" stroke="${STROKE}" stroke-width="1.8"/>
    <path d="M64 250 L136 250" stroke="${DARK}" stroke-width="1" opacity="0.5"/>
    <g stroke="#d8c498" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M70 246 L70 130"/>
      <path d="M130 246 L130 130"/>
      <path d="M70 136 L130 136"/>
      <path d="M70 180 L130 180"/>
      <path d="M70 224 L130 224"/>
      <path d="M70 246 L130 180"/>
      <path d="M70 180 L130 246"/>
      <path d="M70 180 L130 130"/>
      <path d="M70 130 L130 180"/>
    </g>
    <g stroke="#b8a078" stroke-width="1" fill="none" opacity="0.6">
      <path d="M70 136 L130 136 M70 180 L130 180 M70 224 L130 224"/>
    </g>
    <path d="M70 130 Q100 110 130 130" stroke="#d8c498" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M70 246 q -2 -20 6 -30 q 10 -10 24 -14 q 18 -4 24 -20 q 6 -18 -6 -32 q -12 -14 -14 -28"
          stroke="var(--vine, #4b7a34)" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="M130 246 q 2 -22 -4 -34 q -10 -16 -18 -22"
          stroke="var(--vine, #4b7a34)" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.85"/>
    <g fill="#4b7a34" stroke="${STROKE}" stroke-width="0.9">
      <ellipse cx="80" cy="226" rx="4" ry="2.4" transform="rotate(30 80 226)"/>
      <ellipse cx="96" cy="210" rx="4" ry="2.4" transform="rotate(10 96 210)"/>
      <ellipse cx="116" cy="196" rx="4" ry="2.4" transform="rotate(-20 116 196)"/>
      <ellipse cx="108" cy="170" rx="4" ry="2.4" transform="rotate(40 108 170)"/>
      <ellipse cx="94" cy="148" rx="4" ry="2.4" transform="rotate(-20 94 148)"/>
      <ellipse cx="118" cy="220" rx="4" ry="2.4" transform="rotate(-30 118 220)"/>
      <ellipse cx="124" cy="202" rx="4" ry="2.4" transform="rotate(20 124 202)"/>
    </g>
    ${roseHead(76, 232, 7, 'var(--rose-a, #d23a4a)')}
    ${roseHead(92, 216, 7, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(110, 198, 8, 'var(--rose-a, #d23a4a)')}
    ${roseHead(96, 172, 7, 'var(--rose-deep, #a02030)')}
    ${roseHead(116, 160, 7, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(100, 132, 8, 'var(--rose-a, #d23a4a)')}
    ${roseHead(124, 222, 6.5, 'var(--rose-b, #ea6a8a)')}
    ${roseHead(128, 186, 6.5, 'var(--rose-a, #d23a4a)')}
    ${roseHead(82, 198, 6.5, 'var(--rose-deep, #a02030)')}
  `;
}

// 24) Mushroom ring — fairy ring of small mushrooms on a moss circle
function mushroomRing(stage: Stage): string {
  const shroom = (cx: number, cy: number, sc: number, color: string): string => `
    <g transform="translate(${cx} ${cy}) scale(${sc})" stroke="${STROKE}" stroke-width="1.1">
      <rect x="-2" y="0" width="4" height="7" fill="#f2e8c8"/>
      <path d="M -7 0 q 7 -8 14 0 z" fill="${color}"/>
      <circle cx="-3" cy="-3" r="1" fill="#fff"/>
      <circle cx="3" cy="-2" r="0.9" fill="#fff"/>
    </g>
  `;
  if (stage === 0) return `
    ${groundShadow(100, 20, 4, 262)}
    <ellipse cx="100" cy="254" rx="22" ry="6" fill="none" stroke="var(--moss, #5e9058)" stroke-width="1.5" opacity="0.6"/>
    ${shroom(86, 254, 1.0, 'var(--mush, #d84838)')}
    ${shroom(114, 254, 1.0, 'var(--mush-lt, #f06868)')}
    ${shroom(100, 250, 0.9, 'var(--mush, #d84838)')}
  `;
  if (stage === 1) return `
    ${groundShadow(100, 32, 7, 262)}
    <ellipse cx="100" cy="252" rx="34" ry="9" fill="none" stroke="var(--moss, #5e9058)" stroke-width="2" opacity="0.6"/>
    ${shroom(72, 252, 1.3, 'var(--mush, #d84838)')}
    ${shroom(92, 258, 1.1, 'var(--mush-lt, #f06868)')}
    ${shroom(110, 258, 1.2, 'var(--mush, #d84838)')}
    ${shroom(128, 252, 1.3, 'var(--mush-lt, #f06868)')}
    ${shroom(100, 246, 1.0, 'var(--mush, #d84838)')}
  `;
  return `
    ${groundShadow(100, 52, 11, 264)}
    <ellipse cx="100" cy="246" rx="52" ry="14" fill="var(--moss, #5e9058)" opacity="0.22"/>
    <ellipse cx="100" cy="246" rx="52" ry="14" fill="none" stroke="var(--moss-lt, #7ab068)" stroke-width="2.5" opacity="0.7"/>
    <ellipse cx="100" cy="246" rx="44" ry="11" fill="none" stroke="var(--moss, #5e9058)" stroke-width="1.2" opacity="0.6"/>
    ${shroom(66, 238, 1.4, 'var(--mush, #d84838)')}
    ${shroom(86, 236, 1.2, 'var(--mush-lt, #f06868)')}
    ${shroom(114, 236, 1.3, 'var(--mush, #d84838)')}
    ${shroom(134, 238, 1.4, 'var(--mush-lt, #f06868)')}
    ${shroom(56, 252, 1.8, 'var(--mush, #d84838)')}
    ${shroom(78, 258, 1.5, 'var(--mush-lt, #f06868)')}
    ${shroom(100, 260, 2.0, 'var(--mush, #d84838)')}
    ${shroom(122, 258, 1.6, 'var(--mush-lt, #f06868)')}
    ${shroom(144, 252, 1.7, 'var(--mush, #d84838)')}
    <path d="M96 246 q 4 -6 8 0" stroke="var(--moss-lt, #7ab068)" stroke-width="2" fill="none"/>
    <path d="M92 250 q 8 -6 16 0" stroke="var(--moss, #5e9058)" stroke-width="1.5" fill="none"/>
    <g fill="#fff7c8">
      <circle cx="100" cy="224" r="1.2"/>
      <circle cx="90" cy="228" r="0.8"/>
      <circle cx="112" cy="226" r="0.8"/>
    </g>
  `;
}

const SPECIES: Record<Species, (stage: Stage) => string> = {
  oak, pine, sakura, sunflower, wildflower, bookStump,
  tulip, mushroom, lavender, maple, lilypond, berrybush,
  lantern, fern, rose, cactus, topiary, bamboo,
  lavenderSpike, fernCurl, mossRock, willow, roseTrellis, mushroomRing,
};

export function renderPlant(kind: Species, stage: Stage): string {
  const fn = SPECIES[kind] ?? SPECIES.oak;
  return `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${fn(stage)}</svg>`;
}

export type Palette = Record<string, string>;

export const PALETTES: Record<SeasonName, Palette> = {
  spring: {
    "--plot-bg": "oklch(0.27 0.05 150)",
    "--grass-top": "#A8C8A2", "--grass-bot": "#7FA67F",
    "--dirt-front-top": "#8B6A42", "--dirt-front-bot": "#5E4327",
    "--dirt-right-top": "#6E5333", "--dirt-right-bot": "#4A3620",
    "--canopy-a": "#a6c472", "--canopy-b": "#c2dc8a", "--blossom": "#f3c5e8",
    "--pine": "#4a7a42", "--pine-lt": "#6ba066",
    "--sakura-a": "#f3c5d8", "--sakura-b": "#fadde8", "--sakura-deep": "#d88aa8",
    "--sun-petal": "#F4C948", "--sun-petal-lt": "#F7DC7A",
    "--wild-a": "#b48bd6", "--wild-b": "#f3c5d8", "--wild-c": "#f7dc7a",
    "--tulip-a": "#e85a6a", "--tulip-b": "#f6b04a", "--tulip-c": "#b48bd6",
    "--mush": "#d84838", "--mush-lt": "#f06868",
    "--lav": "#9a7cc8", "--lav-deep": "#6a4a9a",
    "--maple-a": "#a6c472", "--maple-b": "#c2dc8a", "--maple-c": "#8eb060",
    "--water": "#6ca8c8", "--lily": "#f8ecd8", "--lily-deep": "#f0c8a0",
    "--bush": "#3f6a2a", "--bush-lt": "#5e9058", "--berry": "#d8282a",
    "--lantern": "#ee8a2a", "--lantern-lt": "#f4ac5a",
    "--fern": "#4b7a34", "--fern-lt": "#6ba066",
    "--rose-a": "#d23a4a", "--rose-b": "#ea6a8a", "--rose-deep": "#a02030",
    "--cactus": "#6a9a5a", "--cactus-lt": "#88b674", "--bloom": "#f0608a", "--bloom-lt": "#f898b4",
    "--topiary": "#3f7a4a", "--topiary-lt": "#5a9864",
    "--bamboo": "#8ab670", "--bamboo-lt": "#a8ce86", "--bamboo-leaf": "#5e9058",
    "--moss": "#5e9058", "--moss-lt": "#7ab068",
    "--willow": "#8ab06a", "--willow-lt": "#aac888",
    "--vine": "#4b7a34",
  },
  summer: {
    "--plot-bg": "oklch(0.32 0.10 140)",
    "--grass-top": "#9BD858", "--grass-bot": "#6BB43A",
    "--dirt-front-top": "#B88140", "--dirt-front-bot": "#7A4E24",
    "--dirt-right-top": "#9A6A30", "--dirt-right-bot": "#5E3A1A",
    "--canopy-a": "#FFD838", "--canopy-b": "#FFE878", "--blossom": "#FFFFC8",
    "--pine": "#2E7A30", "--pine-lt": "#5EB048",
    "--sakura-a": "#D07AE8", "--sakura-b": "#F0B8F4", "--sakura-deep": "#9838B0",
    "--sun-petal": "#FFD028", "--sun-petal-lt": "#FFE868",
    "--wild-a": "#7AAEDF", "--wild-b": "#FF90B8", "--wild-c": "#FFE038",
    "--tulip-a": "#FF4A6A", "--tulip-b": "#FFC838", "--tulip-c": "#FF6FA8",
    "--mush": "#E83838", "--mush-lt": "#FF7A5A",
    "--lav": "#A86CE0", "--lav-deep": "#6A3AB0",
    "--maple-a": "#5FA638", "--maple-b": "#8FD060", "--maple-c": "#3E7A28",
    "--water": "#3EB0E8", "--lily": "#FFF4A8", "--lily-deep": "#FF9080",
    "--bush": "#2E7A30", "--bush-lt": "#5EB048", "--berry": "#FF3A5A",
    "--lantern": "#FF7028", "--lantern-lt": "#FFA048",
    "--fern": "#3E8A28", "--fern-lt": "#6ACC50",
    "--rose-a": "#FF3A58", "--rose-b": "#FF78A8", "--rose-deep": "#B02038",
    "--cactus": "#7AB448", "--cactus-lt": "#A8D868", "--bloom": "#FF6098", "--bloom-lt": "#FFA8C8",
    "--topiary": "#2E7A30", "--topiary-lt": "#5EB048",
    "--bamboo": "#8ED868", "--bamboo-lt": "#B8E890", "--bamboo-leaf": "#3E8A28",
    "--moss": "#3E8A28", "--moss-lt": "#6ACC50",
    "--willow": "#8ED868", "--willow-lt": "#B8E890",
    "--vine": "#3E8A28",
  },
  autumn: {
    "--plot-bg": "oklch(0.25 0.04 40)",
    "--grass-top": "#A8B88A", "--grass-bot": "#7F9672",
    "--dirt-front-top": "#8B5E32", "--dirt-front-bot": "#5E3820",
    "--dirt-right-top": "#6E4525", "--dirt-right-bot": "#4A2a18",
    "--canopy-a": "#d6904a", "--canopy-b": "#e8b468", "--blossom": "#f8e38a",
    "--pine": "#4a7042", "--pine-lt": "#6b9058",
    "--sakura-a": "#d86a4a", "--sakura-b": "#e89068", "--sakura-deep": "#a03820",
    "--sun-petal": "#e09828", "--sun-petal-lt": "#ecb858",
    "--wild-a": "#b86a30", "--wild-b": "#d88a58", "--wild-c": "#f0c868",
    "--tulip-a": "#c84028", "--tulip-b": "#e09828", "--tulip-c": "#9a5ab0",
    "--mush": "#c03828", "--mush-lt": "#e06848",
    "--lav": "#a07ac0", "--lav-deep": "#6a3a80",
    "--maple-a": "#d6904a", "--maple-b": "#f0a048", "--maple-c": "#c84838",
    "--water": "#6a98b8", "--lily": "#f8dcb8", "--lily-deep": "#e0a878",
    "--bush": "#7a6a2a", "--bush-lt": "#a89040", "--berry": "#c02820",
    "--lantern": "#e07028", "--lantern-lt": "#f09058",
    "--fern": "#8a6a38", "--fern-lt": "#a88a58",
    "--rose-a": "#c03848", "--rose-b": "#e08080", "--rose-deep": "#8a1828",
    "--cactus": "#6a7a38", "--cactus-lt": "#8a9458", "--bloom": "#e06a48", "--bloom-lt": "#f0a080",
    "--topiary": "#7a6a2a", "--topiary-lt": "#a88a40",
    "--bamboo": "#a8944a", "--bamboo-lt": "#c8b070", "--bamboo-leaf": "#8a6a38",
    "--moss": "#7a8a3a", "--moss-lt": "#a8a858",
    "--willow": "#a89450", "--willow-lt": "#c8b470",
    "--vine": "#8a6a38",
  },
  night: {
    "--plot-bg": "oklch(0.18 0.04 250)",
    "--grass-top": "#6a8a6a", "--grass-bot": "#4a6a52",
    "--dirt-front-top": "#5a4222", "--dirt-front-bot": "#3a2812",
    "--dirt-right-top": "#462e18", "--dirt-right-bot": "#2a1808",
    "--canopy-a": "#3a6a80", "--canopy-b": "#5b8aa3", "--blossom": "#e8f0ff",
    "--pine": "#2a4a42", "--pine-lt": "#3e6a5a",
    "--sakura-a": "#e8e0f0", "--sakura-b": "#f4ecf7", "--sakura-deep": "#9a8ac4",
    "--sun-petal": "#f4d868", "--sun-petal-lt": "#f8e89a",
    "--wild-a": "#8aa4d8", "--wild-b": "#e0d8f0", "--wild-c": "#f4d868",
    "--tulip-a": "#7a5aa8", "--tulip-b": "#e0c868", "--tulip-c": "#9a8ac4",
    "--mush": "#9a4858", "--mush-lt": "#c07088",
    "--lav": "#7a68a8", "--lav-deep": "#4a3878",
    "--maple-a": "#5a7a98", "--maple-b": "#7a9ab8", "--maple-c": "#3a5a78",
    "--water": "#3a5e88", "--lily": "#d8d0e8", "--lily-deep": "#a898c8",
    "--bush": "#2a4a42", "--bush-lt": "#3e6a5a", "--berry": "#c868a8",
    "--lantern": "#f4b868", "--lantern-lt": "#fad898",
    "--fern": "#3a5a4a", "--fern-lt": "#5a7a6a",
    "--rose-a": "#8a3858", "--rose-b": "#b068a0", "--rose-deep": "#58203a",
    "--cactus": "#4a6a58", "--cactus-lt": "#6a8a78", "--bloom": "#d898c0", "--bloom-lt": "#e8b8d0",
    "--topiary": "#2a4a42", "--topiary-lt": "#3e6a5a",
    "--bamboo": "#68886a", "--bamboo-lt": "#88a888", "--bamboo-leaf": "#3e6a5a",
    "--moss": "#3a5a4a", "--moss-lt": "#5a7a6a",
    "--willow": "#5a7a6a", "--willow-lt": "#7a9a8a",
    "--vine": "#3a5a4a",
  },
};

export function paletteStyle(season: SeasonName): string {
  const pal = PALETTES[season] ?? PALETTES.spring;
  return Object.entries(pal).map(([k, v]) => `${k}: ${v}`).join("; ");
}
