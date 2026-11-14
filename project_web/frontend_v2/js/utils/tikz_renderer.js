/**
 * Vectoria TikZ Vector Graphics Renderer
 * Converts academic TikZ code blocks into pixel-perfect, responsive inline SVG elements.
 * Supports Radix color tokens and dark/light themes.
 */
(function() {
  window.VectoriaTikz = window.VectoriaTikz || {};

  const svgDiagrams = [
    // Diagram 1
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 520px; width: 100%;">
<svg viewBox="0 0 540 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Square outline (dashed or thin gray for AD, DC) -->
  <line x1="240" y1="30" x2="240" y2="200" stroke="var(--s6, #8b939a)" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="240" y1="200" x2="410" y2="200" stroke="var(--s6, #8b939a)" stroke-width="1.5" stroke-dasharray="4,4" />
  
  <!-- Right angle at A -->
  <polyline points="240,47.0 223.0,47.0 223.0,30" fill="none" stroke="var(--s7, #697177)" stroke-width="1.2" />

  <!-- Vectors -->
  <!-- AB (red) -->
  <line x1="240" y1="30" x2="405.75" y2="30" stroke="#e5484d" stroke-width="2.2" marker-end="url(#arrow-red)" />
  <!-- AC (blue) -->
  <line x1="240" y1="30" x2="405.75" y2="195.75" stroke="#0090ff" stroke-width="2.2" marker-end="url(#arrow-blue)" />
  <!-- DC (green) -->
  <line x1="240" y1="200" x2="405.75" y2="200" stroke="#30a46c" stroke-width="2.2" marker-end="url(#arrow-green)" />
  <!-- AE (green) -->
  <line x1="240" y1="30" x2="116.75" y2="30" stroke="#30a46c" stroke-width="2.2" marker-end="url(#arrow-green)" />
  <!-- CB (orange) -->
  <line x1="410" y1="200" x2="410" y2="34.25" stroke="#f76b15" stroke-width="2.2" marker-end="url(#arrow-orange)" />

  <!-- Angle arc 45 deg at A -->
  <path d="M 268 30 A 28 28 0 0 1 260 50" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="274" y="46" font-size="13" fill="var(--s11, #687076)">45°</text>

  <!-- Labels -->
  <text x="234" y="20" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="418" y="20" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="418" y="206" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="224" y="206" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="96.5" y="20" font-size="16" font-style="italic" font-weight="600" fill="currentColor">E</text>
  
  <text x="325" y="20" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">a</text>
  <text x="325" y="218" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">a</text>

  <!-- Points -->
  <circle cx="240" cy="30" r="3" fill="currentColor" />
  <circle cx="410" cy="30" r="3" fill="currentColor" />
  <circle cx="410" cy="200" r="3" fill="currentColor" />
  <circle cx="240" cy="200" r="3" fill="currentColor" />
  <circle cx="112.5" cy="30" r="3" fill="currentColor" />

  <text x="270" y="285" text-anchor="middle" font-size="14" font-style="italic" fill="var(--s11, #687076)">Hình 5.46</text>
</svg>
</div>`,
    // Diagram 2
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 540px; width: 100%;">
<svg viewBox="0 0 540 280" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Outer outline ABCD -->
  <polygon points="180,85.0 450,85.0 360,220 90,220" fill="none" stroke="var(--s6, #8b939a)" stroke-width="1.8" />

  <!-- Vectors -->
  <!-- AD (red) -->
  <line x1="180" y1="85.0" x2="94.5" y2="212.8" stroke="#e5484d" stroke-width="2.2" marker-end="url(#arrow-red)" />
  <!-- AC (green) -->
  <line x1="180" y1="85.0" x2="355.5" y2="215.5" stroke="#30a46c" stroke-width="2.2" marker-end="url(#arrow-green)" />
  <!-- DB (blue) -->
  <line x1="90" y1="220" x2="445.5" y2="86.80000000000001" stroke="#0090ff" stroke-width="2.2" marker-end="url(#arrow-blue)" />

  <!-- Angle arc 60 deg at B -->
  <path d="M 415 85.0 A 35 35 0 0 0 430 111.0" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="405" y="105.0" font-size="13" fill="var(--s11, #687076)">60°</text>

  <!-- Labels -->
  <text x="174" y="75.0" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="458" y="77.0" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="368" y="228" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="76" y="228" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="266" y="142.5" font-size="15" font-style="italic" font-weight="600" fill="currentColor">O</text>

  <text x="121.0" y="156.5" font-size="15" font-style="italic" fill="var(--s11, #687076)">a</text>
  <text x="225.0" y="240" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">2a</text>

  <!-- Point dots -->
  <circle cx="180" cy="85.0" r="3" fill="currentColor" />
  <circle cx="450" cy="85.0" r="3" fill="currentColor" />
  <circle cx="360" cy="220" r="3" fill="currentColor" />
  <circle cx="90" cy="220" r="3" fill="currentColor" />
  <circle cx="270" cy="152.5" r="3" fill="currentColor" />

  <text x="270" y="268" text-anchor="middle" font-size="14" font-style="italic" fill="var(--s11, #687076)">Hình 5.47</text>
</svg>
</div>`,
    // Diagram 3
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 500 280" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Angle Sector 120 deg -->
  <path d="M 260.0 150.0 L 302.0 150.0 A 42 42 0 0 0 239.0 113.62693304105358 Z" fill="var(--s3, #e6e8eb)" stroke="var(--s6, #8b939a)" stroke-width="1" opacity="0.6" />
  <text x="291.5" y="95.44039956158036" text-anchor="middle" font-size="13" font-weight="600" fill="var(--s12, #11181c)">120°</text>

  <!-- Force Vectors -->
  <!-- F1 (orange) at 0 deg -->
  <line x1="260.0" y1="150.0" x2="417.5" y2="150.0" stroke="#f76b15" stroke-width="2.5" marker-end="url(#arrow-orange)" />
  <g transform="translate(424.5, 168.0)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#f76b15">F<tspan baseline-shift="sub" font-size="11">1</tspan></text>
    <path d="M 0 -13 L 9 -13 M 6 -16 L 9 -13 L 6 -10" fill="none" stroke="#f76b15" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- F2 (blue) at 120 deg -->
  <line x1="260.0" y1="150.0" x2="216.25000000000003" y2="74.22277716886161" stroke="#0090ff" stroke-width="2.5" marker-end="url(#arrow-blue)" />
  <g transform="translate(189.00000000000003, 65.129510429125)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#0090ff">F<tspan baseline-shift="sub" font-size="11">2</tspan></text>
    <path d="M 0 -13 L 9 -13 M 6 -16 L 9 -13 L 6 -10" fill="none" stroke="#0090ff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- F3 (red) at 210 deg -->
  <line x1="260.0" y1="150.0" x2="141.78753238342415" y2="218.25" stroke="#e5484d" stroke-width="2.5" marker-end="url(#arrow-red)" />
  <g transform="translate(122.69426564368752, 241.5)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#e5484d">F<tspan baseline-shift="sub" font-size="11">3</tspan></text>
    <path d="M 0 -13 L 9 -13 M 6 -16 L 9 -13 L 6 -10" fill="none" stroke="#e5484d" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Center O -->
  <circle cx="260.0" cy="150.0" r="4" fill="currentColor" />
  <text x="246.0" y="164.0" font-size="15" font-style="italic" font-weight="600" fill="currentColor">O</text>
</svg>
</div>`,
    // Diagram 4
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 480 290" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Vectors -->
  <!-- AB (blue) -->
  <line x1="185" y1="40.0" x2="389.25" y2="244.75" stroke="#0090ff" stroke-width="2.2" marker-end="url(#arrow-blue)" />
  <!-- AC (orange) -->
  <line x1="185" y1="40.0" x2="94.75" y2="244.75" stroke="#f76b15" stroke-width="2.2" marker-end="url(#arrow-orange)" />
  <!-- AM (green) -->
  <line x1="185" y1="40.0" x2="240.1" y2="244.0" stroke="#30a46c" stroke-width="2.2" marker-end="url(#arrow-green)" />
  <!-- BC (red) -->
  <line x1="394.0" y1="250" x2="97.6" y2="250" stroke="#e5484d" stroke-width="2.2" marker-end="url(#arrow-red)" />

  <!-- Equal length tick marks on CM and MB -->
  <line x1="166.0" y1="256.0" x2="166.0" y2="244.0" stroke="currentColor" stroke-width="1.5" />
  <line x1="318.0" y1="256.0" x2="318.0" y2="244.0" stroke="currentColor" stroke-width="1.5" />

  <!-- Point labels -->
  <text x="185" y="30.0" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="76" y="258" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="402.0" y="258" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="242.0" y="270" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">M</text>

  <!-- Point dots -->
  <circle cx="185" cy="40.0" r="3" fill="currentColor" />
  <circle cx="90" cy="250" r="3" fill="currentColor" />
  <circle cx="394.0" cy="250" r="3" fill="currentColor" />
  <circle cx="242.0" cy="250" r="3" fill="currentColor" />
</svg>
</div>`,
    // Diagram 5
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 480 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Square outline (red) -->
  <polygon points="140,250 140,34.0 356.0,34.0 356.0,250" fill="none" stroke="#e5484d" stroke-width="2" />

  <!-- Diagonals AC, BD -->
  <line x1="140" y1="250" x2="356.0" y2="34.0" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
  <line x1="140" y1="34.0" x2="356.0" y2="250" stroke="var(--s6, #8b939a)" stroke-width="1.2" />

  <!-- Segments CN, MN -->
  <line x1="356.0" y1="34.0" x2="194.0" y2="88.0" stroke="currentColor" stroke-width="1.8" />
  <line x1="248.0" y1="250" x2="194.0" y2="88.0" stroke="currentColor" stroke-width="1.8" />

  <!-- Double tick marks on AM and MD -->
  <line x1="189.5" y1="257.2" x2="189.5" y2="242.8" stroke="currentColor" stroke-width="1.2" />
  <line x1="198.5" y1="257.2" x2="198.5" y2="242.8" stroke="currentColor" stroke-width="1.2" />
  <line x1="297.5" y1="257.2" x2="297.5" y2="242.8" stroke="currentColor" stroke-width="1.2" />
  <line x1="306.5" y1="257.2" x2="306.5" y2="242.8" stroke="currentColor" stroke-width="1.2" />

  <!-- Point labels -->
  <text x="126" y="264" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="126" y="26.0" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="366.0" y="26.0" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="366.0" y="264" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="256.0" y="146.0" font-size="15" font-style="italic" font-weight="600" fill="currentColor">O</text>
  <text x="248.0" y="270" text-anchor="middle" font-size="15" font-style="italic" font-weight="600" fill="currentColor">M</text>
  <text x="180.0" y="82.0" font-size="15" font-style="italic" font-weight="600" fill="currentColor">N</text>

  <!-- Point dots -->
  <circle cx="140" cy="250" r="3" fill="currentColor" />
  <circle cx="140" cy="34.0" r="3" fill="currentColor" />
  <circle cx="356.0" cy="34.0" r="3" fill="currentColor" />
  <circle cx="356.0" cy="250" r="3" fill="currentColor" />
  <circle cx="248.0" cy="142.0" r="3" fill="currentColor" />
  <circle cx="248.0" cy="250" r="3" fill="currentColor" />
  <circle cx="194.0" cy="88.0" r="3" fill="currentColor" />
</svg>
</div>`,
    // Diagram 6
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 460 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Outer polygon ABCD -->
  <polygon points="76.0,160 220,16.0 396.0,160 220,272.0" fill="none" stroke="currentColor" stroke-width="1.8" />

  <!-- Diagonals -->
  <!-- AC (blue) -->
  <line x1="76.0" y1="160" x2="396.0" y2="160" stroke="#0090ff" stroke-width="2.2" />
  <!-- BD (red) -->
  <line x1="220" y1="16.0" x2="220" y2="272.0" stroke="#e5484d" stroke-width="2.2" />

  <!-- Right angle mark at I -->
  <polyline points="220,144.0 236.0,144.0 236.0,160" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />

  <!-- Labels -->
  <text x="62.0" y="165" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="220" y="6.0" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="404.0" y="165" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="220" y="290.0" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="206" y="176" font-size="15" font-style="italic" font-weight="600" fill="currentColor">I</text>

  <!-- Point dots -->
  <circle cx="76.0" cy="160" r="3" fill="currentColor" />
  <circle cx="220" cy="16.0" r="3" fill="currentColor" />
  <circle cx="396.0" cy="160" r="3" fill="currentColor" />
  <circle cx="220" cy="272.0" r="3" fill="currentColor" />
  <circle cx="220" cy="160" r="3" fill="currentColor" />
</svg>
</div>`,
    // Diagram 7
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 460 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Triangle ABC -->
  <polygon points="90,260 90,32 394,260" fill="none" stroke="currentColor" stroke-width="1.8" />

  <!-- Altitude AH (blue) -->
  <line x1="90" y1="260" x2="199.44" y2="114.08000000000001" stroke="#0090ff" stroke-width="2.2" />

  <!-- Right angle at A -->
  <polyline points="90,237.2 112.8,237.2 112.8,260" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />

  <!-- Right angle at H -->
  <polyline points="185.76,132.32 204.0,146.0 217.68,127.75999999999999" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />

  <!-- Side lengths -->
  <text x="76" y="146" font-size="15" font-weight="600" fill="var(--s11, #687076)">6</text>
  <text x="242" y="278" text-anchor="middle" font-size="15" font-weight="600" fill="var(--s11, #687076)">8</text>

  <!-- Labels -->
  <text x="76" y="276" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="76" y="26" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="402" y="266" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="209.44" y="108.08000000000001" font-size="16" font-style="italic" font-weight="600" fill="currentColor">H</text>

  <!-- Point dots -->
  <circle cx="90" cy="260" r="3" fill="currentColor" />
  <circle cx="90" cy="32" r="3" fill="currentColor" />
  <circle cx="394" cy="260" r="3" fill="currentColor" />
  <circle cx="199.44" cy="114.08000000000001" r="3" fill="currentColor" />
</svg>
</div>`,
    // Diagram 8
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 520px; width: 100%;">
<svg viewBox="0 0 500 260" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Triangle ABC -->
  <polygon points="80,68 153.888,220 431.68,220" fill="none" stroke="currentColor" stroke-width="1.8" />

  <!-- Altitude AH (blue) -->
  <line x1="80" y1="68" x2="80" y2="220" stroke="#0090ff" stroke-width="2.2" />
  <!-- Extension HB (dashed) -->
  <line x1="80" y1="220" x2="153.888" y2="220" stroke="var(--s6, #8b939a)" stroke-width="1.5" stroke-dasharray="4,4" />

  <!-- Right angle at H -->
  <polyline points="80,201.0 96.0,201.0 96.0,220" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />

  <!-- Angle annotations -->
  <text x="172.8" y="193.4" font-size="13" fill="var(--s11, #687076)">120°</text>
  <text x="352.0" y="197.2" font-size="13" fill="var(--s11, #687076)">20°</text>
  <text x="66" y="144" font-size="15" font-weight="600" fill="var(--s11, #687076)">4</text>

  <!-- Labels -->
  <text x="80" y="58" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="153.888" y="240" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="439.68" y="226" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="66" y="236" font-size="16" font-style="italic" font-weight="600" fill="currentColor">H</text>

  <!-- Point dots -->
  <circle cx="80" cy="68" r="3" fill="currentColor" />
  <circle cx="153.888" cy="220" r="3" fill="currentColor" />
  <circle cx="431.68" cy="220" r="3" fill="currentColor" />
  <circle cx="80" cy="220" r="3" fill="currentColor" />
</svg>
</div>`,
    // Diagram 9
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 480 270" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Triangle ABC -->
  <polygon points="225,47.5 62.5,240 420,240" fill="none" stroke="currentColor" stroke-width="1.8" />

  <!-- Altitudes -->
  <!-- AD (blue) -->
  <line x1="225" y1="47.5" x2="225" y2="240" stroke="#0090ff" stroke-width="1.8" />
  <!-- BE (red) -->
  <line x1="62.5" y1="240" x2="286.1" y2="77.75" stroke="#e5484d" stroke-width="1.8" />
  <!-- CF (green) -->
  <line x1="420" y1="240" x2="188.6" y2="90.94999999999999" stroke="#30a46c" stroke-width="1.8" />

  <!-- Right angle at D -->
  <polyline points="225,229.0 238.0,229.0 238.0,240" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />

  <!-- Labels -->
  <text x="225" y="37.5" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="48.5" y="254" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="430" y="254" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="225" y="258" text-anchor="middle" font-size="15" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="294.1" y="77.75" font-size="15" font-style="italic" font-weight="600" fill="currentColor">E</text>
  <text x="174.6" y="90.94999999999999" font-size="15" font-style="italic" font-weight="600" fill="currentColor">F</text>
  <text x="233" y="126.135" font-size="16" font-style="italic" font-weight="700" fill="#e5484d">H</text>

  <!-- Point dots -->
  <circle cx="225" cy="47.5" r="3" fill="currentColor" />
  <circle cx="62.5" cy="240" r="3" fill="currentColor" />
  <circle cx="420" cy="240" r="3" fill="currentColor" />
  <circle cx="225" cy="240" r="2.5" fill="currentColor" />
  <circle cx="286.1" cy="77.75" r="2.5" fill="currentColor" />
  <circle cx="188.6" cy="90.94999999999999" r="2.5" fill="currentColor" />
  <circle cx="225" cy="122.135" r="4" fill="#e5484d" />
</svg>
</div>`,
    // Diagram 10
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 500px; width: 100%;">
<svg viewBox="0 0 500 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Inclined plane triangle -->
  <polygon points="90,280 410,280 90,40" fill="var(--s2, #f9f9fb)" stroke="currentColor" stroke-width="2" />

  <!-- Right angle at O/H -->
  <polyline points="90,256.0 114.0,256.0 114.0,280" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />

  <!-- Dimensions -->
  <text x="250" y="300" text-anchor="middle" font-size="15" fill="var(--s11, #687076)">4 m</text>
  <text x="76" y="160.0" text-anchor="end" font-size="15" fill="var(--s11, #687076)">h = 3 m</text>
  <text x="264" y="150.0" font-size="15" fill="var(--s11, #687076)">d = 5 m</text>

  <!-- Object at M -->
  <circle cx="218.0" cy="136.0" r="5" fill="#0090ff" />

  <!-- Force Vector P (red, vertical down) -->
  <line x1="218.0" y1="136.0" x2="218.0" y2="212.0" stroke="#e5484d" stroke-width="2.5" marker-end="url(#arrow-red)" />
  <g transform="translate(226.0, 212.0)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#e5484d">P</text>
    <path d="M 0 -13 L 9 -13 M 6 -16 L 9 -13 L 6 -10" fill="none" stroke="#e5484d" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Displacement Vector d (blue, along incline down-right) -->
  <line x1="218.0" y1="136.0" x2="310.0" y2="204.0" stroke="#0090ff" stroke-width="2.5" marker-end="url(#arrow-blue)" />
  <g transform="translate(320.0, 198.0)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#0090ff">d</text>
    <path d="M 0 -13 L 9 -13 M 6 -16 L 9 -13 L 6 -10" fill="none" stroke="#0090ff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Angle alpha arc -->
  <path d="M 218.0 184.0 A 48 48 0 0 0 248.0 196.0" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="234.0" y="176.0" font-size="14" font-style="italic" fill="var(--s11, #687076)">α</text>

  <!-- Labels -->
  <text x="76" y="34" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="420" y="288" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="76" y="296" font-size="16" font-style="italic" font-weight="600" fill="currentColor">H</text>

  <!-- Point dots -->
  <circle cx="90" cy="40" r="3" fill="currentColor" />
  <circle cx="410" cy="280" r="3" fill="currentColor" />
  <circle cx="90" cy="280" r="3" fill="currentColor" />
</svg>
</div>`,
    // Diagram 11
    `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 520px; width: 100%;">
<svg viewBox="0 0 540 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" />
    </marker>
    <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" />
    </marker>
    <pattern id="hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
    </pattern>
  </defs>
  <!-- Ceiling support beam -->
  <rect x="60.0" y="17.0" width="420.0" height="27.999999999999993" fill="var(--s3, #e6e8eb)" stroke="var(--s6, #8b939a)" stroke-width="1.5" />
  <rect x="60.0" y="17.0" width="420.0" height="27.999999999999993" fill="url(#hatch-pattern)" opacity="0.6" />
  <line x1="60.0" y1="45.0" x2="480.0" y2="45.0" stroke="var(--s12, #11181c)" stroke-width="2" />

  <!-- Hanging Box (Material / Chandelier) -->
  <rect x="210.0" y="220" width="120.0" height="112.0" fill="rgba(219, 39, 119, 0.14)" stroke="#ec4899" stroke-width="2" rx="2" />
  <text x="270" y="282.0" text-anchor="middle" font-size="15" font-weight="600" fill="var(--s12, #9d174d)">Vật nặng</text>

  <!-- Cables from ceiling to junction O -->
  <line x1="82.5" y1="45.0" x2="270" y2="220" stroke="var(--s12, #11181c)" stroke-width="2.2" stroke-linecap="round" />
  <line x1="457.5" y1="45.0" x2="270" y2="220" stroke="var(--s12, #11181c)" stroke-width="2.2" stroke-linecap="round" />

  <!-- Tension Vectors T1, T2 (blue arrows) -->
  <line x1="270" y1="220" x2="180.0" y2="136.0" stroke="#0090ff" stroke-width="2.5" marker-end="url(#arrow-blue)" />
  <line x1="270" y1="220" x2="360.0" y2="136.0" stroke="#0090ff" stroke-width="2.5" marker-end="url(#arrow-blue)" />

  <!-- Vector labels with crisp SVG arrows -->
  <g transform="translate(158.0, 152.0)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#0090ff">T<tspan baseline-shift="sub" font-size="11" font-style="normal">1</tspan></text>
    <path d="M 0 -13 L 10 -13 M 7 -16 L 10 -13 L 7 -10" fill="none" stroke="#0090ff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <g transform="translate(370.0, 152.0)">
    <text x="0" y="0" font-size="16" font-style="italic" font-weight="700" fill="#0090ff">T<tspan baseline-shift="sub" font-size="11" font-style="normal">2</tspan></text>
    <path d="M 0 -13 L 10 -13 M 7 -16 L 10 -13 L 7 -10" fill="none" stroke="#0090ff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Ceiling Anchors / Bolts -->
  <circle cx="82.5" cy="45.0" r="4.5" fill="currentColor" />
  <circle cx="457.5" cy="45.0" r="4.5" fill="currentColor" />
  <circle cx="270" cy="220" r="4.5" fill="currentColor" />

  <!-- Angle Arcs (45 deg) -->
  <!-- Left Cable at A: from 0 deg downward to -45 deg -->
  <path d="M 120.5 45.0 A 38 38 0 0 1 109.5 72.0 L 82.5 45.0 Z" fill="rgba(22, 163, 74, 0.22)" stroke="#22c55e" stroke-width="1.3" />
  <text x="128.5" y="67.0" font-size="13" font-weight="600" fill="var(--s12, #15803d)">45°</text>

  <!-- Right Cable at B: from 180 deg downward to 225 deg -->
  <path d="M 430.5 72.0 A 38 38 0 0 1 419.5 45.0 L 457.5 45.0 Z" fill="rgba(22, 163, 74, 0.22)" stroke="#22c55e" stroke-width="1.3" />
  <text x="389.5" y="67.0" font-size="13" font-weight="600" fill="var(--s12, #15803d)">45°</text>

  <!-- Caption -->
  <text x="270" y="367.0" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">Hình 5.55</text>
</svg>
</div>`,
  ];

  window.VectoriaTikz.diagrams = svgDiagrams;

  window.VectoriaTikz.renderTikzToSVG = function(tikzCode) {
    if (!tikzCode || typeof tikzCode !== 'string') return '';
    const code = tikzCode.trim();

    // 1. Check matching signatures for the 11 known diagrams
    if (code.includes('5.46') || code.includes('(-1.5, 2)') || (code.includes('(A) at (0, 2)') && code.includes('(D) at (0, 0)'))) {
      return svgDiagrams[0];
    }
    if (code.includes('5.47') || code.includes('angle = A--B--C') || (code.includes('(B) at (4,1.5)') && code.includes('(C) at (3,0)'))) {
      return svgDiagrams[1];
    }
    if ((code.includes('F1') && code.includes('F2')) || (code.includes('(0:2.3)') && code.includes('(120:1.3)'))) {
      return svgDiagrams[2];
    }
    if (code.includes('(M) at (1.6, 0)') || (code.includes('(A) at (1, 2.8)') && code.includes('(B) at (3.2, 0)'))) {
      return svgDiagrams[3];
    }
    if (code.includes('(N) at (0.6,1.8)') || (code.includes('(D) at (2.4,0)') && code.includes('(C) at (2.4,2.4)'))) {
      return svgDiagrams[4];
    }
    if ((code.includes('(-1.8,0)') && code.includes('(2.2,0)') && code.includes('(0,1.8)'))) {
      return svgDiagrams[5];
    }
    if (code.includes('(2.88, 3.84)') || (code.includes('(B) at (0,6)') && code.includes('(C) at (8,0)'))) {
      return svgDiagrams[6];
    }
    if (code.includes('10.99') || (code.includes('2.309') && code.includes('120^\\circ'))) {
      return svgDiagrams[7];
    }
    if (code.includes('!(A)!(C)') || code.includes('orthocenter') || (code.includes('(A) at (1, 3.5)') && code.includes('myred'))) {
      return svgDiagrams[8];
    }
    if (code.includes('d = 5') || code.includes('h = 3') || (code.includes('4\\text{ m}') && code.includes('\\overrightarrow{P}'))) {
      return svgDiagrams[9];
    }
    if (code.includes('5.55') || code.includes('(-2.8, 2.5)') || code.includes('100\\text{ N}') || (code.includes('(-1.25, 1.25)') && code.includes('pink'))) {
      return svgDiagrams[10];
    }

    // 2. Lightweight 2D Geometric TikZ-to-SVG Interpreter (100% synced with admin_v2 vectoriaLatexRenderer)
    if (!/\\(?:begin\{axis\}|addplot|tkzTab|tdplot|foreach|pgfmath)/.test(code)) {
      const bodyMatch = /\\begin\{tikzpicture\}(?:\s*\[([^\]]*)\])?([\s\S]*?)\\end\{tikzpicture\}/.exec(code);
      if (bodyMatch) {
        const tikzOpts = bodyMatch[1] || '';
        let scale = 1;
        const scaleM = tikzOpts.match(/scale\s*=\s*([0-9.]+)/);
        if (scaleM) scale = Math.max(0.25, Math.min(4, parseFloat(scaleM[1]) || 1));
        const rawStmts = bodyMatch[2].split(';').map(function(s) { return s.trim(); }).filter(Boolean);
        const namedCoords = new Map();
        const shapes = [];
        const labels = [];
        const parsePt = function(ptTok) {
          const cl = ptTok.trim().replace(/^\(|\)$/g, '').trim();
          if (namedCoords.has(cl)) return namedCoords.get(cl);
          if (cl.indexOf(':') !== -1) {
            const sp = cl.split(':');
            const ang = (parseFloat(sp[0]) * Math.PI) / 180;
            const rad = parseFloat(sp[1]);
            if (!isNaN(ang) && !isNaN(rad)) return { x: rad * Math.cos(ang), y: rad * Math.sin(ang) };
          }
          const parts = cl.split(',');
          if (parts.length === 2) {
            const px = parseFloat(parts[0]);
            const py = parseFloat(parts[1]);
            if (!isNaN(px) && !isNaN(py)) return { x: px, y: py };
          }
          return null;
        };
        const resolveCol = function(o) {
          if (!o) return 'currentColor';
          if (/\bred\b/i.test(o)) return '#e5484d';
          if (/\bblue\b/i.test(o)) return '#0090ff';
          if (/\b(?:green|teal|emerald)\b/i.test(o)) return '#30a46c';
          if (/\b(?:orange|amber)\b/i.test(o)) return '#f76b15';
          if (/\b(?:gray|grey)\b/i.test(o)) return 'var(--s7, #8b939a)';
          return 'currentColor';
        };
        const cleanLbl = function(r) {
          return r.replace(/\$/g, '')
            .replace(/\\overrightarrow\s*\{([^}]*)\}/g, '$1\u20d7')
            .replace(/\\vec\s*\{([^}]*)\}/g, '$1\u20d7')
            .replace(/\\(?:mathbf|mathrm|text)\s*\{([^}]*)\}/g, '$1')
            .replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').trim();
        };
        for (let si = 0; si < rawStmts.length; si++) {
          const stmt = rawStmts[si];
          const cM = /^\\coordinate(?:\s*\[[^\]]*\])?\s*\(([^)]+)\)\s*at\s*\(([^)]+)\)/.exec(stmt);
          if (cM) {
            const pt = parsePt(cM[2]);
            if (pt) namedCoords.set(cM[1].trim(), pt);
            continue;
          }
          const nM = /^\\node(?:\s*\[([^\]]*)\])?(?:\s*\(([^)]+)\))?\s*at\s*\(([^)]+)\)\s*\{([\s\S]*)\}$/.exec(stmt);
          if (nM) {
            const pt = parsePt(nM[3]);
            if (pt) {
              if (nM[2]) namedCoords.set(nM[2].trim(), pt);
              const tx = cleanLbl(nM[4]);
              if (tx) labels.push({ pt: pt, text: tx, opts: nM[1] || '', color: resolveCol(nM[1] || '') });
            }
            continue;
          }
          const dM = /^\\(draw|fill|filldraw)(?:\s*\[([^\]]*)\])?\s+([\s\S]+)$/.exec(stmt);
          if (dM) {
            const dOpts = dM[2] || '';
            let rest = dM[3].trim();
            const inlineRe = /node(?:\s*\[([^\]]*)\])?\s*\{([^{}]*)\}/g;
            let inm;
            const pNodes = [];
            while ((inm = inlineRe.exec(rest)) !== null) pNodes.push({ opts: inm[1] || '', rawText: inm[2] });
            rest = rest.replace(/node(?:\s*\[[^\]]*\])?\s*\{[^{}]*\}/g, '').trim();
            const ciM = /^\(([^)]+)\)\s*circle\s*(?:\(\s*([0-9.]+)(?:cm|pt)?\s*\)|\[\s*radius\s*=\s*([0-9.]+)\s*\])/.exec(rest);
            if (ciM) {
              const ctr = parsePt(ciM[1]);
              const rad = parseFloat(ciM[2] || ciM[3]);
              if (ctr && !isNaN(rad)) shapes.push({ type: 'circle', center: ctr, r: rad, isFill: dM[1] === 'fill' || (dM[1] === 'filldraw' && rad <= 0.12), isFillDraw: dM[1] === 'filldraw', color: resolveCol(dOpts) });
              continue;
            }
            const closed = /--\s*cycle\s*$/.test(rest);
            const pts = rest.replace(/--\s*cycle\s*$/, '').split('--').map(parsePt).filter(Boolean);
            if (pts.length >= 2) {
              shapes.push({ type: 'poly', pts: pts, closed: closed, isFill: dM[1] === 'fill' || dM[1] === 'filldraw', hasArrowEnd: /->/.test(dOpts), hasArrowStart: /<-/.test(dOpts), dashed: /dashed/.test(dOpts), thick: /thick/.test(dOpts) ? 2.1 : 1.6, color: resolveCol(dOpts) });
              for (let pi = 0; pi < pNodes.length; pi++) {
                const tx = cleanLbl(pNodes[pi].rawText);
                if (!tx) continue;
                const apt = /midway|pos\s*=\s*0\.5/.test(pNodes[pi].opts) ? { x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 } : pts[pts.length - 1];
                labels.push({ pt: apt, text: tx, opts: pNodes[pi].opts, color: resolveCol(dOpts) });
              }
            }
          }
        }
        if (shapes.length > 0 || labels.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          const exp = function(x, y, p) { const pad = p || 0; if (x - pad < minX) minX = x - pad; if (x + pad > maxX) maxX = x + pad; if (y - pad < minY) minY = y - pad; if (y + pad > maxY) maxY = y + pad; };
          shapes.forEach(function(sh) { if (sh.type === 'circle') exp(sh.center.x, sh.center.y, sh.r); else sh.pts.forEach(function(p) { exp(p.x, p.y, 0); }); });
          labels.forEach(function(lb) { exp(lb.pt.x, lb.pt.y, 0.35); });
          if (isFinite(minX) && isFinite(minY)) {
            const unitPx = 54 * scale, padPx = 42;
            const svgW = Math.round(Math.max(1, maxX - minX) * unitPx + padPx * 2);
            const svgH = Math.round(Math.max(1, maxY - minY) * unitPx + padPx * 2);
            const sx = function(x) { return (padPx + (x - minX) * unitPx).toFixed(2); };
            const sy = function(y) { return (padPx + (maxY - y) * unitPx).toFixed(2); };
            const uid = Math.random().toString(36).slice(2, 7);
            const parts = [];
            shapes.forEach(function(sh) {
              if (sh.type === 'circle') {
                parts.push('<circle cx="' + sx(sh.center.x) + '" cy="' + sy(sh.center.y) + '" r="' + Math.max(3, sh.r * unitPx).toFixed(2) + '" fill="' + (sh.isFill ? sh.color : 'none') + '" fill-opacity="' + (sh.isFill && sh.r > 0.2 ? '0.14' : '1') + '" stroke="' + (sh.isFill && !sh.isFillDraw ? 'none' : sh.color) + '" stroke-width="1.6" />');
              } else {
                const ptStr = sh.pts.map(function(p) { return sx(p.x) + ',' + sy(p.y); }).join(' ');
                const mk = sh.color === '#e5484d' ? 'red' : sh.color === '#0090ff' ? 'blue' : sh.color === '#30a46c' ? 'green' : sh.color === '#f76b15' ? 'orange' : 'cur';
                const dash = sh.dashed ? ' stroke-dasharray="5,4"' : '';
                const mE = sh.hasArrowEnd ? ' marker-end="url(#vt-arr-' + mk + '-' + uid + ')"' : '';
                const mS = sh.hasArrowStart ? ' marker-start="url(#vt-arr-' + mk + '-' + uid + ')"' : '';
                if (sh.closed) parts.push('<polygon points="' + ptStr + '" fill="' + (sh.isFill ? sh.color : 'none') + '" fill-opacity="' + (sh.isFill ? '0.12' : '0') + '" stroke="' + sh.color + '" stroke-width="' + sh.thick + '"' + dash + ' />');
                else parts.push('<polyline points="' + ptStr + '" fill="none" stroke="' + sh.color + '" stroke-width="' + sh.thick + '"' + dash + mS + mE + ' />');
              }
            });
            labels.forEach(function(lb) {
              let dx = 0, dy = 5, anc = 'middle';
              const o = lb.opts || '';
              if (/above/.test(o)) dy = -10; else if (/below/.test(o)) dy = 18;
              if (/right/.test(o)) { dx = 9; anc = 'start'; } else if (/left/.test(o)) { dx = -9; anc = 'end'; }
              const safeTxt = lb.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              parts.push('<text x="' + (parseFloat(sx(lb.pt.x)) + dx).toFixed(2) + '" y="' + (parseFloat(sy(lb.pt.y)) + dy).toFixed(2) + '" text-anchor="' + anc + '" font-size="15" font-style="italic" font-weight="600" fill="' + lb.color + '">' + safeTxt + '</text>');
            });
            return '<div class="vectoria-diagram-container" style="text-align: center; margin: 22px auto; max-width: ' + Math.min(560, Math.max(280, svgW)) + 'px; width: 100%;">' +
              '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">' +
              '<defs>' +
              '<marker id="vt-arr-cur-' + uid + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" /></marker>' +
              '<marker id="vt-arr-red-' + uid + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>' +
              '<marker id="vt-arr-blue-' + uid + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>' +
              '<marker id="vt-arr-green-' + uid + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" /></marker>' +
              '<marker id="vt-arr-orange-' + uid + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" /></marker>' +
              '</defs>' + parts.join('') + '</svg></div>';
          }
        }
      }
    }

    // Generic fallback for any future TikZ block (never spill raw LaTeX code)
    return `<div class="vectoria-diagram-container" style="margin: 20px auto; padding: 20px; border: 1px dashed var(--s4, #d7dfe3); border-radius: 4px; text-align: center; color: var(--s11, #687076); background: var(--s2, #f9f9fb);">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 8px; display: block;">
        <polygon points="12 2 2 22 22 22 12 2" stroke="currentColor" stroke-width="1.8" fill="none" />
        <circle cx="12" cy="14" r="2" fill="currentColor" />
      </svg>
      <div style="font-size: 0.95rem; font-weight: 600; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">Sơ đồ hình học vector</div>
      <div style="font-size: 0.8rem; margin-top: 4px; color: var(--s9, #8b939a); font-style: italic;">Hình vẽ minh họa toán học</div>
    </div>`;
  };
})();
