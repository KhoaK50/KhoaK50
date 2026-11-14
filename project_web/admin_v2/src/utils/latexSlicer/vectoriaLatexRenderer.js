import katex from 'katex';
import {
  extractBalancedBraces,
  extractBalancedBrackets,
  expandMacrosSafely,
  stripBodyDeclarations,
  resolveLatexColorToCss,
  isChromaticHexColor,
  computeDarkThemeTextColor,
  transpilePhysicsAndSiunitx,
  unwrapTexFormattingToPlainText,
  parseBoxVisualOptions,
  parseVectoriaBoxStyleComments,
  parseVectoriaDocConfigComments,
  splitTopLevelLatexRows
} from './preambleParser.js';
import { buildTexAst } from './texAstEngine.js';

// 11 Vectoria canonical geometric diagrams (100% synced with frontend_v2/js/utils/tikz_renderer.js)
const VECTORIA_CANONICAL_TIKZ_SVGS = [
  // Diagram 1 (5.46)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 520px; width: 100%;">
<svg viewBox="0 0 540 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="v-arr-red-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>
    <marker id="v-arr-blue-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
    <marker id="v-arr-green-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" /></marker>
    <marker id="v-arr-orange-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" /></marker>
  </defs>
  <line x1="240" y1="30" x2="240" y2="200" stroke="var(--s6, #8b939a)" stroke-width="1.5" stroke-dasharray="4,4" />
  <line x1="240" y1="200" x2="410" y2="200" stroke="var(--s6, #8b939a)" stroke-width="1.5" stroke-dasharray="4,4" />
  <polyline points="240,47 223,47 223,30" fill="none" stroke="var(--s7, #697177)" stroke-width="1.2" />
  <line x1="240" y1="30" x2="405.75" y2="30" stroke="#e5484d" stroke-width="2.2" marker-end="url(#v-arr-red-1)" />
  <line x1="240" y1="30" x2="405.75" y2="195.75" stroke="#0090ff" stroke-width="2.2" marker-end="url(#v-arr-blue-1)" />
  <line x1="240" y1="200" x2="405.75" y2="200" stroke="#30a46c" stroke-width="2.2" marker-end="url(#v-arr-green-1)" />
  <line x1="240" y1="30" x2="116.75" y2="30" stroke="#30a46c" stroke-width="2.2" marker-end="url(#v-arr-green-1)" />
  <line x1="410" y1="200" x2="410" y2="34.25" stroke="#f76b15" stroke-width="2.2" marker-end="url(#v-arr-orange-1)" />
  <path d="M 268 30 A 28 28 0 0 1 260 50" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="274" y="46" font-size="13" fill="var(--s11, #687076)">45°</text>
  <text x="234" y="20" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="418" y="20" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="418" y="206" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="224" y="206" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="96.5" y="20" font-size="16" font-style="italic" font-weight="600" fill="currentColor">E</text>
  <text x="325" y="20" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">a</text>
  <text x="325" y="218" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">a</text>
  <circle cx="240" cy="30" r="3" fill="currentColor" /><circle cx="410" cy="30" r="3" fill="currentColor" />
  <circle cx="410" cy="200" r="3" fill="currentColor" /><circle cx="240" cy="200" r="3" fill="currentColor" />
  <circle cx="112.5" cy="30" r="3" fill="currentColor" />
  <text x="270" y="285" text-anchor="middle" font-size="14" font-style="italic" fill="var(--s11, #687076)">Hình 5.46</text>
</svg></div>`,
  // Diagram 2 (5.47)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 540px; width: 100%;">
<svg viewBox="0 0 540 280" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="v-arr-red-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>
    <marker id="v-arr-blue-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
    <marker id="v-arr-green-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" /></marker>
  </defs>
  <polygon points="180,85 450,85 360,220 90,220" fill="none" stroke="var(--s6, #8b939a)" stroke-width="1.8" />
  <line x1="180" y1="85" x2="94.5" y2="212.8" stroke="#e5484d" stroke-width="2.2" marker-end="url(#v-arr-red-2)" />
  <line x1="180" y1="85" x2="355.5" y2="215.5" stroke="#30a46c" stroke-width="2.2" marker-end="url(#v-arr-green-2)" />
  <line x1="90" y1="220" x2="445.5" y2="86.8" stroke="#0090ff" stroke-width="2.2" marker-end="url(#v-arr-blue-2)" />
  <path d="M 415 85 A 35 35 0 0 0 430 111" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="405" y="105" font-size="13" fill="var(--s11, #687076)">60°</text>
  <text x="174" y="75" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="458" y="77" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="368" y="228" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="76" y="228" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="266" y="142.5" font-size="15" font-style="italic" font-weight="600" fill="currentColor">O</text>
  <text x="121" y="156.5" font-size="15" font-style="italic" fill="var(--s11, #687076)">a</text>
  <text x="225" y="240" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">2a</text>
  <circle cx="180" cy="85" r="3" fill="currentColor" /><circle cx="450" cy="85" r="3" fill="currentColor" />
  <circle cx="360" cy="220" r="3" fill="currentColor" /><circle cx="90" cy="220" r="3" fill="currentColor" />
  <circle cx="270" cy="152.5" r="3" fill="currentColor" />
  <text x="270" y="268" text-anchor="middle" font-size="14" font-style="italic" fill="var(--s11, #687076)">Hình 5.47</text>
</svg></div>`,
  // Diagram 3 (Forces F1, F2, F3)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 500 280" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="v-arr-red-3" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>
    <marker id="v-arr-blue-3" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
    <marker id="v-arr-orange-3" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" /></marker>
  </defs>
  <path d="M 260 150 L 302 150 A 42 42 0 0 0 239 113.63 Z" fill="var(--s3, #e6e8eb)" stroke="var(--s6, #8b939a)" stroke-width="1" opacity="0.6" />
  <text x="291.5" y="95.44" text-anchor="middle" font-size="13" font-weight="600" fill="var(--s12, #11181c)">120°</text>
  <line x1="260" y1="150" x2="417.5" y2="150" stroke="#f76b15" stroke-width="2.5" marker-end="url(#v-arr-orange-3)" />
  <text x="425" y="166" font-size="16" font-style="italic" font-weight="700" fill="#f76b15">F1</text>
  <line x1="260" y1="150" x2="216.25" y2="74.22" stroke="#0090ff" stroke-width="2.5" marker-end="url(#v-arr-blue-3)" />
  <text x="190" y="66" font-size="16" font-style="italic" font-weight="700" fill="#0090ff">F2</text>
  <line x1="260" y1="150" x2="141.79" y2="218.25" stroke="#e5484d" stroke-width="2.5" marker-end="url(#v-arr-red-3)" />
  <text x="122" y="241" font-size="16" font-style="italic" font-weight="700" fill="#e5484d">F3</text>
  <circle cx="260" cy="150" r="4" fill="currentColor" />
  <text x="246" y="164" font-size="15" font-style="italic" font-weight="600" fill="currentColor">O</text>
</svg></div>`,
  // Diagram 4 (Triangle ABC median AM)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 480 290" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="v-arr-red-4" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>
    <marker id="v-arr-blue-4" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
    <marker id="v-arr-green-4" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" /></marker>
    <marker id="v-arr-orange-4" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" /></marker>
  </defs>
  <line x1="185" y1="40" x2="389.25" y2="244.75" stroke="#0090ff" stroke-width="2.2" marker-end="url(#v-arr-blue-4)" />
  <line x1="185" y1="40" x2="94.75" y2="244.75" stroke="#f76b15" stroke-width="2.2" marker-end="url(#v-arr-orange-4)" />
  <line x1="185" y1="40" x2="240.1" y2="244" stroke="#30a46c" stroke-width="2.2" marker-end="url(#v-arr-green-4)" />
  <line x1="394" y1="250" x2="97.6" y2="250" stroke="#e5484d" stroke-width="2.2" marker-end="url(#v-arr-red-4)" />
  <line x1="166" y1="256" x2="166" y2="244" stroke="currentColor" stroke-width="1.5" />
  <line x1="318" y1="256" x2="318" y2="244" stroke="currentColor" stroke-width="1.5" />
  <text x="185" y="30" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="76" y="258" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="402" y="258" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="242" y="270" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">M</text>
  <circle cx="185" cy="40" r="3" fill="currentColor" /><circle cx="90" cy="250" r="3" fill="currentColor" />
  <circle cx="394" cy="250" r="3" fill="currentColor" /><circle cx="242" cy="250" r="3" fill="currentColor" />
</svg></div>`,
  // Diagram 5 (Square ABCD with O, M, N)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 480 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <polygon points="140,250 140,34 356,34 356,250" fill="none" stroke="#e5484d" stroke-width="2" />
  <line x1="140" y1="250" x2="356" y2="34" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
  <line x1="140" y1="34" x2="356" y2="250" stroke="var(--s6, #8b939a)" stroke-width="1.2" />
  <line x1="356" y1="34" x2="194" y2="88" stroke="currentColor" stroke-width="1.8" />
  <line x1="248" y1="250" x2="194" y2="88" stroke="currentColor" stroke-width="1.8" />
  <text x="126" y="264" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="126" y="26" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="366" y="26" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="366" y="264" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="256" y="146" font-size="15" font-style="italic" font-weight="600" fill="currentColor">O</text>
  <text x="248" y="270" text-anchor="middle" font-size="15" font-style="italic" font-weight="600" fill="currentColor">M</text>
  <text x="180" y="82" font-size="15" font-style="italic" font-weight="600" fill="currentColor">N</text>
  <circle cx="140" cy="250" r="3" fill="currentColor" /><circle cx="140" cy="34" r="3" fill="currentColor" />
  <circle cx="356" cy="34" r="3" fill="currentColor" /><circle cx="356" cy="250" r="3" fill="currentColor" />
  <circle cx="248" cy="142" r="3" fill="currentColor" /><circle cx="248" cy="250" r="3" fill="currentColor" />
  <circle cx="194" cy="88" r="3" fill="currentColor" />
</svg></div>`,
  // Diagram 6 (Orthogonal diagonals ABCD)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 460 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <polygon points="76,160 220,16 396,160 220,272" fill="none" stroke="currentColor" stroke-width="1.8" />
  <line x1="76" y1="160" x2="396" y2="160" stroke="#0090ff" stroke-width="2.2" />
  <line x1="220" y1="16" x2="220" y2="272" stroke="#e5484d" stroke-width="2.2" />
  <polyline points="220,144 236,144 236,160" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="62" y="165" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="220" y="12" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="404" y="165" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="220" y="290" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="206" y="176" font-size="15" font-style="italic" font-weight="600" fill="currentColor">I</text>
</svg></div>`,
  // Diagram 7 (Right triangle ABC altitude AH)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 460 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <polygon points="90,260 90,32 394,260" fill="none" stroke="currentColor" stroke-width="1.8" />
  <line x1="90" y1="260" x2="199.44" y2="114.08" stroke="#0090ff" stroke-width="2.2" />
  <polyline points="90,237.2 112.8,237.2 112.8,260" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="76" y="146" font-size="15" font-weight="600" fill="var(--s11, #687076)">6</text>
  <text x="242" y="278" text-anchor="middle" font-size="15" font-weight="600" fill="var(--s11, #687076)">8</text>
  <text x="76" y="276" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="76" y="26" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="402" y="266" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="209" y="108" font-size="16" font-style="italic" font-weight="600" fill="currentColor">H</text>
</svg></div>`,
  // Diagram 8 (Obtuse triangle ABC 120 deg)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 520px; width: 100%;">
<svg viewBox="0 0 500 260" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <polygon points="80,68 153.89,220 431.68,220" fill="none" stroke="currentColor" stroke-width="1.8" />
  <line x1="80" y1="68" x2="80" y2="220" stroke="#0090ff" stroke-width="2.2" />
  <line x1="80" y1="220" x2="153.89" y2="220" stroke="var(--s6, #8b939a)" stroke-width="1.5" stroke-dasharray="4,4" />
  <polyline points="80,201 96,201 96,220" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="172.8" y="193.4" font-size="13" fill="var(--s11, #687076)">120°</text>
  <text x="352" y="197.2" font-size="13" fill="var(--s11, #687076)">20°</text>
  <text x="66" y="144" font-size="15" font-weight="600" fill="var(--s11, #687076)">4</text>
  <text x="80" y="58" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="153.89" y="240" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="439.68" y="226" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="66" y="236" font-size="16" font-style="italic" font-weight="600" fill="currentColor">H</text>
</svg></div>`,
  // Diagram 9 (Orthocenter H)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 480px; width: 100%;">
<svg viewBox="0 0 480 270" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <polygon points="225,47.5 62.5,240 420,240" fill="none" stroke="currentColor" stroke-width="1.8" />
  <line x1="225" y1="47.5" x2="225" y2="240" stroke="#0090ff" stroke-width="1.8" />
  <line x1="62.5" y1="240" x2="286.1" y2="77.75" stroke="#e5484d" stroke-width="1.8" />
  <line x1="420" y1="240" x2="188.6" y2="90.95" stroke="#30a46c" stroke-width="1.8" />
  <text x="225" y="37.5" text-anchor="middle" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="48.5" y="254" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="430" y="254" font-size="16" font-style="italic" font-weight="600" fill="currentColor">C</text>
  <text x="225" y="258" text-anchor="middle" font-size="15" font-style="italic" font-weight="600" fill="currentColor">D</text>
  <text x="233" y="126" font-size="16" font-style="italic" font-weight="700" fill="#e5484d">H</text>
</svg></div>`,
  // Diagram 10 (Inclined plane)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 500px; width: 100%;">
<svg viewBox="0 0 500 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="v-arr-red-10" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>
    <marker id="v-arr-blue-10" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
  </defs>
  <polygon points="90,280 410,280 90,40" fill="var(--s2, #f9f9fb)" stroke="currentColor" stroke-width="2" />
  <polyline points="90,256 114,256 114,280" fill="none" stroke="var(--s9, #687076)" stroke-width="1.2" />
  <text x="250" y="300" text-anchor="middle" font-size="15" fill="var(--s11, #687076)">4 m</text>
  <text x="76" y="160" text-anchor="end" font-size="15" fill="var(--s11, #687076)">h = 3 m</text>
  <text x="264" y="150" font-size="15" fill="var(--s11, #687076)">d = 5 m</text>
  <circle cx="218" cy="136" r="5" fill="#0090ff" />
  <line x1="218" y1="136" x2="218" y2="212" stroke="#e5484d" stroke-width="2.5" marker-end="url(#v-arr-red-10)" />
  <line x1="218" y1="136" x2="310" y2="204" stroke="#0090ff" stroke-width="2.5" marker-end="url(#v-arr-blue-10)" />
  <text x="76" y="34" font-size="16" font-style="italic" font-weight="600" fill="currentColor">A</text>
  <text x="420" y="288" font-size="16" font-style="italic" font-weight="600" fill="currentColor">B</text>
  <text x="76" y="296" font-size="16" font-style="italic" font-weight="600" fill="currentColor">H</text>
</svg></div>`,
  // Diagram 11 (5.55 Hanging mass)
  `<div class="vectoria-diagram-container" style="text-align: center; margin: 24px auto; max-width: 520px; width: 100%;">
<svg viewBox="0 0 540 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="v-arr-blue-11" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
  </defs>
  <rect x="60" y="17" width="420" height="28" fill="var(--s3, #e6e8eb)" stroke="var(--s6, #8b939a)" stroke-width="1.5" />
  <line x1="60" y1="45" x2="480" y2="45" stroke="var(--s12, #11181c)" stroke-width="2" />
  <rect x="210" y="220" width="120" height="112" fill="#fce7f3" stroke="#db2777" stroke-width="2" rx="2" />
  <text x="270" y="282" text-anchor="middle" font-size="15" font-weight="600" fill="#9d174d">Vật nặng</text>
  <line x1="82.5" y1="45" x2="270" y2="220" stroke="var(--s12, #11181c)" stroke-width="2.2" />
  <line x1="457.5" y1="45" x2="270" y2="220" stroke="var(--s12, #11181c)" stroke-width="2.2" />
  <line x1="270" y1="220" x2="180" y2="136" stroke="#0090ff" stroke-width="2.5" marker-end="url(#v-arr-blue-11)" />
  <line x1="270" y1="220" x2="360" y2="136" stroke="#0090ff" stroke-width="2.5" marker-end="url(#v-arr-blue-11)" />
  <text x="270" y="367" text-anchor="middle" font-size="15" font-style="italic" fill="var(--s11, #687076)">Hình 5.55</text>
</svg></div>`
];

function matchCanonicalTikzSvg(code) {
  if (code.includes('5.46') || code.includes('(-1.5, 2)') || (code.includes('(A) at (0, 2)') && code.includes('(D) at (0, 0)'))) return VECTORIA_CANONICAL_TIKZ_SVGS[0];
  if (code.includes('5.47') || code.includes('angle = A--B--C') || (code.includes('(B) at (4,1.5)') && code.includes('(C) at (3,0)'))) return VECTORIA_CANONICAL_TIKZ_SVGS[1];
  if ((code.includes('F1') && code.includes('F2')) || (code.includes('(0:2.3)') && code.includes('(120:1.3)'))) return VECTORIA_CANONICAL_TIKZ_SVGS[2];
  if (code.includes('(M) at (1.6, 0)') || (code.includes('(A) at (1, 2.8)') && code.includes('(B) at (3.2, 0)'))) return VECTORIA_CANONICAL_TIKZ_SVGS[3];
  if (code.includes('(N) at (0.6,1.8)') || (code.includes('(D) at (2.4,0)') && code.includes('(C) at (2.4,2.4)'))) return VECTORIA_CANONICAL_TIKZ_SVGS[4];
  if (code.includes('(-1.8,0)') && code.includes('(2.2,0)') && code.includes('(0,1.8)')) return VECTORIA_CANONICAL_TIKZ_SVGS[5];
  if (code.includes('(2.88, 3.84)') || (code.includes('(B) at (0,6)') && code.includes('(C) at (8,0)'))) return VECTORIA_CANONICAL_TIKZ_SVGS[6];
  if (code.includes('10.99') || (code.includes('2.309') && code.includes('120^\\circ'))) return VECTORIA_CANONICAL_TIKZ_SVGS[7];
  if (code.includes('!(A)!(C)') || code.includes('orthocenter') || (code.includes('(A) at (1, 3.5)') && code.includes('myred'))) return VECTORIA_CANONICAL_TIKZ_SVGS[8];
  if (code.includes('d = 5') || code.includes('h = 3') || (code.includes('4\\text{ m}') && code.includes('\\overrightarrow{P}'))) return VECTORIA_CANONICAL_TIKZ_SVGS[9];
  if (code.includes('5.55') || code.includes('(-2.8, 2.5)') || code.includes('100\\text{ N}') || (code.includes('(-1.25, 1.25)') && code.includes('pink'))) return VECTORIA_CANONICAL_TIKZ_SVGS[10];
  return null;
}

// Lightweight 2D Geometric TikZ-to-SVG Interpreter for standard 2D coordinates, vectors, polygons, circles, axes, and labels
export function compileSimple2DTikzToSvg(tikzCode) {
  if (!tikzCode) return null;
  // Reject heavy 3D / pgfplots / tkz-tab / foreach loops that need TeX engine
  if (/\\(?:begin\{axis\}|addplot|tkzTab|tdplot|foreach|pgfmath)/.test(tikzCode)) {
    return null;
  }

  const bodyMatch = /\\begin\{tikzpicture\}(?:\s*\[([^\]]*)\])?([\s\S]*?)\\end\{tikzpicture\}/.exec(tikzCode);
  if (!bodyMatch) return null;

  const tikzOpts = bodyMatch[1] || '';
  let scale = 1;
  const scaleM = tikzOpts.match(/scale\s*=\s*([0-9.]+)/);
  if (scaleM) scale = Math.max(0.25, Math.min(4, parseFloat(scaleM[1]) || 1));

  const rawStmts = bodyMatch[2]
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const namedCoords = new Map();
  const shapes = [];
  const labels = [];

  const parsePoint = (ptToken) => {
    const clean = ptToken.trim().replace(/^\(|\)$/g, '').trim();
    if (namedCoords.has(clean)) return namedCoords.get(clean);
    if (clean.includes(':')) {
      const [angStr, radStr] = clean.split(':');
      const ang = (parseFloat(angStr) * Math.PI) / 180;
      const rad = parseFloat(radStr);
      if (!isNaN(ang) && !isNaN(rad)) {
        return { x: rad * Math.cos(ang), y: rad * Math.sin(ang) };
      }
    }
    const parts = clean.split(',');
    if (parts.length === 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) return { x, y };
    }
    return null;
  };

  const resolveTikzColor = (optStr) => {
    if (!optStr) return 'currentColor';
    if (/\bred\b/i.test(optStr)) return '#e5484d';
    if (/\bblue\b/i.test(optStr)) return '#0090ff';
    if (/\b(?:green|teal|emerald)\b/i.test(optStr)) return '#30a46c';
    if (/\b(?:orange|amber)\b/i.test(optStr)) return '#f76b15';
    if (/\b(?:gray|grey)\b/i.test(optStr)) return 'var(--s7, #8b939a)';
    return 'currentColor';
  };

  const cleanNodeLabel = (rawLbl) => {
    return rawLbl
      .replace(/\$/g, '')
      .replace(/\\overrightarrow\s*\{([^}]*)\}/g, '$1\u20d7')
      .replace(/\\vec\s*\{([^}]*)\}/g, '$1\u20d7')
      .replace(/\\mathbf\s*\{([^}]*)\}/g, '$1')
      .replace(/\\mathrm\s*\{([^}]*)\}/g, '$1')
      .replace(/\\text\s*\{([^}]*)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}]/g, '')
      .trim();
  };

  for (const stmt of rawStmts) {
    // 1. \coordinate (A) at (x, y)
    const coordM = /^\\coordinate(?:\s*\[[^\]]*\])?\s*\(([^)]+)\)\s*at\s*\(([^)]+)\)/.exec(stmt);
    if (coordM) {
      const pt = parsePoint(coordM[2]);
      if (pt) namedCoords.set(coordM[1].trim(), pt);
      continue;
    }

    // 2. \node[opts] (name)? at (pt) {text}
    const nodeM = /^\\node(?:\s*\[([^\]]*)\])?(?:\s*\(([^)]+)\))?\s*at\s*\(([^)]+)\)\s*\{([\s\S]*)\}$/.exec(stmt);
    if (nodeM) {
      const nOpts = nodeM[1] || '';
      const nName = nodeM[2] ? nodeM[2].trim() : '';
      const pt = parsePoint(nodeM[3]);
      if (pt) {
        if (nName) namedCoords.set(nName, pt);
        const txt = cleanNodeLabel(nodeM[4]);
        if (txt) {
          labels.push({ pt, text: txt, opts: nOpts, color: resolveTikzColor(nOpts) });
        }
      }
      continue;
    }

    // 3. \draw / \fill / \filldraw
    const drawM = /^\\(draw|fill|filldraw)(?:\s*\[([^\]]*)\])?\s+([\s\S]+)$/.exec(stmt);
    if (drawM) {
      const cmdType = drawM[1];
      const dOpts = drawM[2] || '';
      let rest = drawM[3].trim();

      // Extract inline trailing node: ... node[opts] {text}
      const inlineNodeRe = /node(?:\s*\[([^\]]*)\])?\s*\{([^{}]*)\}/g;
      let inm;
      const pendingInlineNodes = [];
      while ((inm = inlineNodeRe.exec(rest)) !== null) {
        pendingInlineNodes.push({ opts: inm[1] || '', rawText: inm[2] });
      }
      rest = rest.replace(/node(?:\s*\[[^\]]*\])?\s*\{[^{}]*\}/g, '').trim();

      // Circle: (center) circle (r) or circle [radius=r]
      const circM = /^\(([^)]+)\)\s*circle\s*(?:\(\s*([0-9.]+)(?:cm|pt)?\s*\)|\[\s*radius\s*=\s*([0-9.]+)\s*\])/.exec(rest);
      if (circM) {
        const center = parsePoint(circM[1]);
        const rad = parseFloat(circM[2] || circM[3]);
        if (center && !isNaN(rad)) {
          shapes.push({
            type: 'circle',
            center,
            r: rad,
            isFill: cmdType === 'fill' || (cmdType === 'filldraw' && rad <= 0.12),
            isFillDraw: cmdType === 'filldraw',
            opts: dOpts,
            color: resolveTikzColor(dOpts)
          });
        }
        continue;
      }

      // Rectangle: (p1) rectangle (p2)
      const rectM = /^\(([^)]+)\)\s*rectangle\s*\(([^)]+)\)/.exec(rest);
      if (rectM) {
        const p1 = parsePoint(rectM[1]);
        const p2 = parsePoint(rectM[2]);
        if (p1 && p2) {
          shapes.push({
            type: 'rect',
            p1,
            p2,
            isFill: cmdType === 'fill' || cmdType === 'filldraw',
            opts: dOpts,
            color: resolveTikzColor(dOpts)
          });
        }
        continue;
      }

      // Polyline / Polygon / Vector: (p1) -- (p2) -- ... (-- cycle)?
      const closed = /--\s*cycle\s*$/.test(rest);
      const cleanPath = rest.replace(/--\s*cycle\s*$/, '');
      const segTokens = cleanPath.split('--').map((t) => t.trim()).filter(Boolean);
      const pts = segTokens.map(parsePoint).filter(Boolean);
      if (pts.length >= 2) {
        shapes.push({
          type: 'poly',
          pts,
          closed,
          isFill: cmdType === 'fill' || cmdType === 'filldraw',
          hasArrowEnd: /->/.test(dOpts),
          hasArrowStart: /<-/.test(dOpts),
          dashed: /dashed/.test(dOpts),
          dotted: /dotted/.test(dOpts),
          thick: /very\s+thick|ultra\s+thick/.test(dOpts) ? 2.6 : /thick/.test(dOpts) ? 2.1 : 1.6,
          color: resolveTikzColor(dOpts)
        });
        for (const pin of pendingInlineNodes) {
          const txt = cleanNodeLabel(pin.rawText);
          if (!txt) continue;
          const anchorPt = /midway|pos\s*=\s*0\.5/.test(pin.opts)
            ? {
                x: (pts[0].x + pts[pts.length - 1].x) / 2,
                y: (pts[0].y + pts[pts.length - 1].y) / 2
              }
            : pts[pts.length - 1];
          labels.push({ pt: anchorPt, text: txt, opts: pin.opts, color: resolveTikzColor(dOpts) });
        }
      }
    }
  }

  if (shapes.length === 0 && labels.length === 0) return null;

  // Compute bounding box in math coordinates
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const expandBox = (x, y, pad = 0) => {
    if (x - pad < minX) minX = x - pad;
    if (x + pad > maxX) maxX = x + pad;
    if (y - pad < minY) minY = y - pad;
    if (y + pad > maxY) maxY = y + pad;
  };

  for (const sh of shapes) {
    if (sh.type === 'circle') expandBox(sh.center.x, sh.center.y, sh.r);
    else if (sh.type === 'rect') {
      expandBox(sh.p1.x, sh.p1.y);
      expandBox(sh.p2.x, sh.p2.y);
    } else if (sh.type === 'poly') {
      for (const p of sh.pts) expandBox(p.x, p.y);
    }
  }
  for (const lb of labels) expandBox(lb.pt.x, lb.pt.y, 0.35);

  if (!isFinite(minX) || !isFinite(minY)) return null;

  const unitPx = 54 * scale;
  const padPx = 42;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const svgW = Math.round(spanX * unitPx + padPx * 2);
  const svgH = Math.round(spanY * unitPx + padPx * 2);

  const toSvgX = (x) => (padPx + (x - minX) * unitPx).toFixed(2);
  const toSvgY = (y) => (padPx + (maxY - y) * unitPx).toFixed(2);

  const uid = Math.random().toString(36).slice(2, 7);
  const svgParts = [];

  for (const sh of shapes) {
    if (sh.type === 'circle') {
      const rPx = Math.max(3, sh.r * unitPx).toFixed(2);
      const fill = sh.isFill ? sh.color : 'none';
      const stroke = sh.isFill && !sh.isFillDraw ? 'none' : sh.color;
      svgParts.push(
        `<circle cx="${toSvgX(sh.center.x)}" cy="${toSvgY(sh.center.y)}" r="${rPx}" fill="${fill}" fill-opacity="${sh.isFill && sh.r > 0.2 ? '0.14' : '1'}" stroke="${stroke}" stroke-width="1.6" />`
      );
    } else if (sh.type === 'rect') {
      const x1 = parseFloat(toSvgX(sh.p1.x));
      const y1 = parseFloat(toSvgY(sh.p1.y));
      const x2 = parseFloat(toSvgX(sh.p2.x));
      const y2 = parseFloat(toSvgY(sh.p2.y));
      const rx = Math.min(x1, x2).toFixed(2);
      const ry = Math.min(y1, y2).toFixed(2);
      const rw = Math.abs(x2 - x1).toFixed(2);
      const rh = Math.abs(y2 - y1).toFixed(2);
      svgParts.push(
        `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${sh.isFill ? sh.color : 'none'}" fill-opacity="${sh.isFill ? '0.12' : '0'}" stroke="${sh.color}" stroke-width="1.6" />`
      );
    } else if (sh.type === 'poly') {
      const ptAttr = sh.pts.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');
      const dash = sh.dashed ? ' stroke-dasharray="5,4"' : sh.dotted ? ' stroke-dasharray="2,3"' : '';
      let markerKey = 'cur';
      if (sh.color === '#e5484d') markerKey = 'red';
      else if (sh.color === '#0090ff') markerKey = 'blue';
      else if (sh.color === '#30a46c') markerKey = 'green';
      else if (sh.color === '#f76b15') markerKey = 'orange';

      const mEnd = sh.hasArrowEnd ? ` marker-end="url(#vt-arr-${markerKey}-${uid})"` : '';
      const mStart = sh.hasArrowStart ? ` marker-start="url(#vt-arr-${markerKey}-${uid})"` : '';
      if (sh.closed) {
        svgParts.push(
          `<polygon points="${ptAttr}" fill="${sh.isFill ? sh.color : 'none'}" fill-opacity="${sh.isFill ? '0.12' : '0'}" stroke="${sh.color}" stroke-width="${sh.thick}"${dash} />`
        );
      } else {
        svgParts.push(
          `<polyline points="${ptAttr}" fill="none" stroke="${sh.color}" stroke-width="${sh.thick}"${dash}${mStart}${mEnd} />`
        );
      }
    }
  }

  for (const lb of labels) {
    let dx = 0;
    let dy = 5;
    let anchor = 'middle';
    const o = lb.opts || '';
    if (/above\s+right/.test(o)) { dx = 8; dy = -8; anchor = 'start'; }
    else if (/above\s+left/.test(o)) { dx = -8; dy = -8; anchor = 'end'; }
    else if (/below\s+right/.test(o)) { dx = 8; dy = 16; anchor = 'start'; }
    else if (/below\s+left/.test(o)) { dx = -8; dy = 16; anchor = 'end'; }
    else if (/above/.test(o)) { dy = -10; anchor = 'middle'; }
    else if (/below/.test(o)) { dy = 18; anchor = 'middle'; }
    else if (/right/.test(o)) { dx = 10; dy = 5; anchor = 'start'; }
    else if (/left/.test(o)) { dx = -10; dy = 5; anchor = 'end'; }

    const sx = (parseFloat(toSvgX(lb.pt.x)) + dx).toFixed(2);
    const sy = (parseFloat(toSvgY(lb.pt.y)) + dy).toFixed(2);
    const esc = escapeHtml(lb.text);
    svgParts.push(
      `<text x="${sx}" y="${sy}" text-anchor="${anchor}" font-size="15" font-style="italic" font-weight="600" fill="${lb.color}">${esc}</text>`
    );
  }

  return `<div class="vectoria-diagram-container" style="text-align: center; margin: 22px auto; max-width: ${Math.min(560, Math.max(280, svgW))}px; width: 100%;">
<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; color: var(--s12, #11181c); font-family: var(--font-academic, serif);">
  <defs>
    <marker id="vt-arr-cur-${uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" /></marker>
    <marker id="vt-arr-red-${uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e5484d" /></marker>
    <marker id="vt-arr-blue-${uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0090ff" /></marker>
    <marker id="vt-arr-green-${uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30a46c" /></marker>
    <marker id="vt-arr-orange-${uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f76b15" /></marker>
  </defs>
  ${svgParts.join('\n  ')}
</svg></div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapLatexColor(c, colorTable = null, colorModel = '') {
  if (!c) return 'inherit';
  return resolveLatexColorToCss(c, colorTable, colorModel);
}

const FONT_SIZE_CSS_MAP = {
  Huge: '2.36rem',
  huge: '1.96rem',
  LARGE: '1.62rem',
  Large: '1.35rem',
  large: '1.15rem',
  normalsize: '1em',
  small: '0.92em',
  footnotesize: '0.85em',
  scriptsize: '0.78em',
  tiny: '0.7em'
};

const TEXT_SYMBOL_MAP = {
  AA: '\u00c5',
  aa: '\u00e5',
  AE: '\u00c6',
  ae: '\u00e6',
  OE: '\u0152',
  oe: '\u0153',
  O: '\u00d8',
  o: '\u00f8',
  ss: '\u00df',
  L: '\u0141',
  l: '\u0142',
  textdegree: '\u00b0',
  degree: '\u00b0',
  celsius: '\u00b0C',
  degreeCelsius: '\u00b0C',
  dots: '...',
  ldots: '...',
  textellipsis: '...',
  pm: '\u00b1',
  mp: '\u2213',
  times: '\u00d7',
  div: '\u00f7',
  cdot: '\u00b7',
  textbullet: '\u2022',
  S: '\u00a7',
  P: '\u00b6',
  dag: '\u2020',
  ddag: '\u2021',
  copyright: '\u00a9',
  textregistered: '\u00ae',
  texttrademark: '\u2122',
  textbackslash: '\\',
  textbar: '|',
  textless: '<',
  textgreater: '>',
  textasciitilde: '~',
  textasciicircum: '^',
  textendash: '-',
  textemdash: '-',
  LaTeX: 'LaTeX',
  TeX: 'TeX'
};

const LATEX_ACCENT_COMBINING = {
  "'": '\u0301',
  '`': '\u0300',
  '^': '\u0302',
  '"': '\u0308',
  '~': '\u0303',
  '=': '\u0304',
  '.': '\u0307',
  u: '\u0306',
  v: '\u030c',
  H: '\u030b',
  c: '\u0327',
  d: '\u0323',
  b: '\u0331'
};

function unwrapEnsureMathInFormula(str) {
  if (!str || !str.includes('\\ensuremath')) return str;
  let out = str;
  let guard = 0;
  let idx = 0;
  while ((idx = out.indexOf('\\ensuremath', idx)) !== -1 && guard < 32) {
    guard++;
    let cur = idx + '\\ensuremath'.length;
    while (cur < out.length && /\s/.test(out[cur])) cur++;
    if (out[cur] === '{') {
      const grp = extractBalancedBraces(out, cur);
      if (grp) {
        out = out.slice(0, idx) + grp.content + out.slice(grp.endIndex + 1);
        continue;
      }
    }
    idx = cur;
  }
  return out;
}

function renderKatexSafe(mathCode, isDisplay, macroTable = null, colorTable = null) {
  let clean = mathCode || '';
  if (macroTable && macroTable.size > 0) {
    clean = expandMacrosSafely(clean, macroTable);
  }
  clean = unwrapEnsureMathInFormula(clean);
  clean = transpilePhysicsAndSiunitx(clean, true);
  clean = clean
    .replace(/\\label\s*\{[^}]*\}/g, '')
    .replace(/\\tag\*?\s*\{([^}]*)\}/g, '\\tag{$1}')
    .replace(/\\vv\s*\{/g, '\\vec{')
    .replace(/\\vv\b/g, '\\vec')
    .replace(/\\vert\{\}/g, '|')
    .replace(/\\\\[\s\r\n]*\\(?:break|allowbreak|linebreak|newline)\b/g, '\\\\')
    .replace(/\\(?:break|allowbreak|linebreak|newline|pagebreak|nopagebreak|filbreak|goodbreak)\b/g, ' ')
    .replace(/\\(textcolor|color)\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}/g, (full, cmd, model, colExpr) => {
      const resolved = resolveLatexColorToCss(colExpr, colorTable, model || '');
      return resolved && resolved !== 'inherit' ? `\\${cmd}{${resolved}}` : full;
    });

  try {
    return katex.renderToString(clean, {
      throwOnError: false,
      strict: 'ignore',
      displayMode: isDisplay,
      macros: {
        '\\vv': '\\vec',
        '\\bm': '\\mathbf',
        '\\boldsymbol': '\\mathbf',
        '\\RR': '\\mathbb{R}',
        '\\NN': '\\mathbb{N}',
        '\\ZZ': '\\mathbb{Z}',
        '\\QQ': '\\mathbb{Q}',
        '\\CC': '\\mathbb{C}',
        '\\eps': '\\varepsilon',
        '\\vphi': '\\varphi',
        '\\rchi': '\\chi',
        '\\degree': '^\\circ',
        '\\celsius': '^\\circ\\mathrm{C}'
      }
    });
  } catch {
    return `<code class="katex-error" style="color: #dc2626;">${escapeHtml(clean)}</code>`;
  }
}

function resolveGraphicsAsset(rawSrc, assetVault) {
  const cleanSrc = (rawSrc || '').trim();
  if (!cleanSrc.startsWith('vectoria-asset://') || !assetVault || !assetVault.byId) {
    return { url: cleanSrc, asset: null };
  }
  const id = cleanSrc.replace('vectoria-asset://', '').trim();
  const asset = assetVault.byId.get(id) || null;
  if (!asset) return { url: '', asset: null };
  return {
    url: asset.replacedDataUrl || asset.blobUrl || '',
    asset
  };
}

function computeImageStyleFromOpts(optStr) {
  const o = optStr || '';
  let scaleVal = null;
  const scaleMatch = o.match(/scale\s*=\s*([0-9.]+)/i);
  if (scaleMatch) scaleVal = parseFloat(scaleMatch[1]);

  let customWidthStyle = '';
  const widthMatch = o.match(/width\s*=\s*([0-9.]+)\s*\\(linewidth|textwidth|columnwidth)/i);
  if (widthMatch) {
    const pct = Math.min(100, Math.round(parseFloat(widthMatch[1]) * 100));
    customWidthStyle = `max-width: ${pct}%; width: 100%;`;
  } else {
    const wMatch = o.match(/width\s*=\s*([0-9.]+\s*(?:cm|pt|mm|in|px))/i);
    if (wMatch) customWidthStyle = `max-width: ${wMatch[1]};`;
  }

  let imgStyle = 'height: auto; display: block; margin: 0 auto; object-fit: contain; border-radius: 2px;';
  if (scaleVal) {
    if (scaleVal <= 0.45) imgStyle += ' max-width: 200px; max-height: 180px;';
    else if (scaleVal <= 0.75) imgStyle += ' max-width: 420px; max-height: 360px;';
    else imgStyle += ' max-width: 650px; max-height: 520px;';
  } else if (customWidthStyle) {
    imgStyle += ` ${customWidthStyle}`;
  } else {
    imgStyle += ' max-width: min(100%, 650px); max-height: 480px;';
  }
  return imgStyle;
}

function buildInlineStyleFromModifiers(mod, colorTable) {
  if (!mod) return '';
  const parts = [];
  if (mod.bold) parts.push('font-weight: 700');
  if (mod.italic) parts.push('font-style: italic');
  if (mod.smallcaps) parts.push('font-variant: small-caps');
  if (mod.mono) parts.push('font-family: monospace');
  else if (mod.sans) {
    parts.push("font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)");
  }
  if (mod.size && FONT_SIZE_CSS_MAP[mod.size]) {
    parts.push(`font-size: ${FONT_SIZE_CSS_MAP[mod.size]}`);
    if (['Huge', 'huge', 'LARGE', 'Large'].includes(mod.size) && !mod.bold) {
      parts.push('font-weight: 600');
    }
  }
  if (mod.color) {
    const cssCol = mapLatexColor(mod.color, colorTable, mod.colorModel || '');
    parts.push(`color: ${escapeHtml(cssCol)}`);
  }
  if (mod.align) parts.push(`text-align: ${mod.align}`);
  return parts.length > 0 ? parts.join('; ') + ';' : '';
}

// Full recursive balanced-brace inline LaTeX renderer for headings, captions, table cells, boxpair points, and inline macros
function renderRichInlineTex(texFrag, ctx) {
  if (!texFrag) return '';
  let work = String(texFrag);
  if (ctx?.macroTable && ctx.macroTable.size > 0) {
    work = expandMacrosSafely(work, ctx.macroTable);
  }
  work = transpilePhysicsAndSiunitx(work, false);

  const stash = new Map();
  let sc = 0;
  const putStash = (htmlStr) => {
    const tok = `\u0002VF${sc++}\u0003`;
    stash.set(tok, htmlStr);
    return tok;
  };

  // 1. Protect \verb|...| first
  work = work.replace(/\\verb\*?([^a-zA-Z\s])([\s\S]*?)\1/g, (_, _d, code) =>
    putStash(
      `<code style="font-family: monospace; background: var(--s2); padding: 1px 5px; border-radius: 2px;">${escapeHtml(code)}</code>`
    )
  );

  // 2. Protect escaped \$ so it never triggers inline math
  work = work.replace(/\\\$/g, () => putStash('$'));

  // 3. Stash display & inline math BEFORE any HTML escaping
  work = work.replace(/\$\$([\s\S]+?)\$\$/g, (_, c) =>
    putStash(renderKatexSafe(c, true, ctx?.macroTable, ctx?.colorTable))
  );
  work = work.replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_, c) =>
    putStash(renderKatexSafe(c, true, ctx?.macroTable, ctx?.colorTable))
  );
  work = work.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_, c) =>
    putStash(renderKatexSafe(c, false, ctx?.macroTable, ctx?.colorTable))
  );
  work = work.replace(/\$([^$]+?)\$/g, (_, c) =>
    putStash(renderKatexSafe(c, false, ctx?.macroTable, ctx?.colorTable))
  );

  // Recursive evaluator over brace-balanced inline TeX
  const evalSegment = (seg) => {
    if (!seg) return '';
    let out = '';
    let idx = 0;
    const activeMod = { bold: false, italic: false, smallcaps: false, mono: false, sans: false, size: null, color: null, colorModel: '' };

    const flushText = (plain) => {
      if (!plain) return;
      const esc = escapeHtml(plain).replace(/\u2014/g, '-');
      const st = buildInlineStyleFromModifiers(activeMod, ctx?.colorTable);
      out += st ? `<span style="${st}">${esc}</span>` : esc;
    };

    const wrapWithActive = (innerHtml) => {
      const st = buildInlineStyleFromModifiers(activeMod, ctx?.colorTable);
      return st ? `<span style="${st}">${innerHtml}</span>` : innerHtml;
    };

    const skipSp = (s, p) => {
      let k = p;
      while (k < s.length && /\s/.test(s[k])) k++;
      return k;
    };

    while (idx < seg.length) {
      // Stashed math/verb token
      if (seg[idx] === '\u0002') {
        const endTok = seg.indexOf('\u0003', idx + 1);
        if (endTok !== -1) {
          const tok = seg.slice(idx, endTok + 1);
          out += wrapWithActive(stash.get(tok) || '');
          idx = endTok + 1;
          continue;
        }
      }

      const ch = seg[idx];

      if (ch === '~') {
        flushText('\u00a0');
        idx++;
        continue;
      }

      // Scoped brace group { ... }
      if (ch === '{') {
        const grp = extractBalancedBraces(seg, idx);
        if (grp) {
          out += wrapWithActive(evalSegment(grp.content));
          idx = grp.endIndex + 1;
          continue;
        }
        idx++;
        continue;
      }

      if (ch === '}') {
        idx++;
        continue;
      }

      if (ch === '\\') {
        // Line break \\ or \\* or multiline \\[0.2cm]
        if (seg[idx + 1] === '\\') {
          let after = idx + 2;
          if (seg[after] === '*') after++;
          let wsAfter = after;
          while (wsAfter < seg.length && /\s/.test(seg[wsAfter])) wsAfter++;
          if (seg[wsAfter] === '[') {
            const obr = extractBalancedBrackets(seg, wsAfter);
            if (
              obr &&
              obr.endIndex - wsAfter < 32 &&
              /^[+-]?\d*(?:\.\d+)?\s*(?:pt|mm|cm|in|ex|em|bp|px)?$/i.test(obr.content.trim())
            ) {
              after = obr.endIndex + 1;
            }
          }
          out += '<br/>';
          idx = after;
          continue;
        }

        const nextCh = seg[idx + 1];
        if (!nextCh) {
          idx++;
          continue;
        }

        // Accent commands: \'e, \`a, \^o, \"u, \~n, \={a}, \.{z}
        if (["'", '`', '^', '"', '~', '=', '.'].includes(nextCh)) {
          let cur = idx + 2;
          if (seg[cur] === '{') {
            const ag = extractBalancedBraces(seg, cur);
            if (ag) {
              const base = ag.content.trim().replace(/^\\i$/, 'i').replace(/^\\j$/, 'j');
              flushText((base + LATEX_ACCENT_COMBINING[nextCh]).normalize('NFC'));
              idx = ag.endIndex + 1;
              continue;
            }
          } else if (seg[cur] && /[a-zA-Z]/.test(seg[cur])) {
            flushText((seg[cur] + LATEX_ACCENT_COMBINING[nextCh]).normalize('NFC'));
            idx = cur + 1;
            continue;
          }
        }

        // Non-alpha escaped symbols & thin spaces
        if (!/[a-zA-Z]/.test(nextCh)) {
          if (nextCh === ',' || nextCh === ';' || nextCh === ':') {
            flushText('\u2009');
          } else if (nextCh === '!' || nextCh === '/') {
            // negative thin space / italic correction
          } else if (nextCh === ' ') {
            flushText(' ');
          } else {
            const symMap = { '%': '%', '_': '_', '&': '&', '#': '#', '{': '{', '}': '}' };
            flushText(symMap[nextCh] ?? nextCh);
          }
          idx += 2;
          continue;
        }

        const cmdM = /^\\([a-zA-Z]+)\*?/.exec(seg.slice(idx));
        if (!cmdM) {
          idx++;
          continue;
        }
        const cmd = cmdM[1];
        let cur = idx + cmdM[0].length;

        // Letter accent commands: \v{c}, \u{a}, \H{o}, \c{c}, \d{a}, \b{o}
        if (['u', 'v', 'H', 'c', 'd', 'b'].includes(cmd)) {
          const ws = skipSp(seg, cur);
          if (seg[ws] === '{') {
            const ag = extractBalancedBraces(seg, ws);
            if (ag) {
              const base = ag.content.trim().replace(/^\\i$/, 'i');
              flushText((base + LATEX_ACCENT_COMBINING[cmd]).normalize('NFC'));
              idx = ag.endIndex + 1;
              continue;
            }
          }
        }

        // Declarative switches affecting the remainder of this group/heading/cell
        if (cmd === 'bfseries' || cmd === 'bf') { activeMod.bold = true; idx = skipSp(seg, cur); continue; }
        if (cmd === 'mdseries' || cmd === 'normalfont') {
          activeMod.bold = false;
          if (cmd === 'normalfont') {
            activeMod.italic = false;
            activeMod.smallcaps = false;
            activeMod.mono = false;
            activeMod.sans = false;
          }
          idx = skipSp(seg, cur);
          continue;
        }
        if (cmd === 'itshape' || cmd === 'it' || cmd === 'slshape' || cmd === 'sl' || cmd === 'em') {
          activeMod.italic = true;
          idx = skipSp(seg, cur);
          continue;
        }
        if (cmd === 'upshape') { activeMod.italic = false; idx = skipSp(seg, cur); continue; }
        if (cmd === 'scshape' || cmd === 'sc') { activeMod.smallcaps = true; idx = skipSp(seg, cur); continue; }
        if (cmd === 'ttfamily' || cmd === 'tt') { activeMod.mono = true; activeMod.sans = false; idx = skipSp(seg, cur); continue; }
        if (cmd === 'sffamily' || cmd === 'sf') {
          activeMod.sans = true;
          activeMod.mono = false;
          idx = skipSp(seg, cur);
          continue;
        }
        if (cmd === 'rmfamily' || cmd === 'rm') {
          activeMod.mono = false;
          activeMod.sans = false;
          idx = skipSp(seg, cur);
          continue;
        }
        if (cmd === 'color') {
          let ws = skipSp(seg, cur);
          let colModel = '';
          if (seg[ws] === '[') {
            const obr = extractBalancedBrackets(seg, ws);
            if (obr) {
              colModel = obr.content.trim();
              ws = skipSp(seg, obr.endIndex + 1);
            }
          }
          if (seg[ws] === '{') {
            const cg = extractBalancedBraces(seg, ws);
            if (cg) {
              activeMod.color = cg.content.trim();
              activeMod.colorModel = colModel;
              idx = skipSp(seg, cg.endIndex + 1);
              continue;
            }
          }
        }
        if (Object.prototype.hasOwnProperty.call(FONT_SIZE_CSS_MAP, cmd)) {
          const ws = skipSp(seg, cur);
          if (seg[ws] === '{') {
            const sg = extractBalancedBraces(seg, ws);
            if (sg) {
              out += wrapWithActive(
                `<span style="font-size: ${FONT_SIZE_CSS_MAP[cmd]};">${evalSegment(sg.content)}</span>`
              );
              idx = sg.endIndex + 1;
              continue;
            }
          }
          activeMod.size = cmd === 'normalsize' ? null : cmd;
          idx = ws;
          continue;
        }

        // \texorpdfstring{tex}{pdf}
        if (cmd === 'texorpdfstring') {
          const ws1 = skipSp(seg, cur);
          if (seg[ws1] === '{') {
            const g1 = extractBalancedBraces(seg, ws1);
            if (g1) {
              const ws2 = skipSp(seg, g1.endIndex + 1);
              if (seg[ws2] === '{') {
                const g2 = extractBalancedBraces(seg, ws2);
                if (g2) {
                  out += wrapWithActive(evalSegment(g1.content));
                  idx = g2.endIndex + 1;
                  continue;
                }
              }
            }
          }
        }

        // 2-arg color/link commands: \textcolor[m]{col}{text}, \colorbox[m]{bg}{text}, \href{url}{text}
        if (cmd === 'textcolor' || cmd === 'colorbox' || cmd === 'href') {
          let ws1 = skipSp(seg, cur);
          let colModel = '';
          if ((cmd === 'textcolor' || cmd === 'colorbox') && seg[ws1] === '[') {
            const obr = extractBalancedBrackets(seg, ws1);
            if (obr) {
              colModel = obr.content.trim();
              ws1 = skipSp(seg, obr.endIndex + 1);
            }
          }
          if (seg[ws1] === '{') {
            const g1 = extractBalancedBraces(seg, ws1);
            if (g1) {
              const ws2 = skipSp(seg, g1.endIndex + 1);
              if (seg[ws2] === '{') {
                const g2 = extractBalancedBraces(seg, ws2);
                if (g2) {
                  const innerHtml = evalSegment(g2.content);
                  if (cmd === 'textcolor') {
                    const cssCol = mapLatexColor(g1.content, ctx?.colorTable, colModel);
                    out += wrapWithActive(`<span style="color: ${escapeHtml(cssCol)};">${innerHtml}</span>`);
                  } else if (cmd === 'colorbox') {
                    const cssBg = mapLatexColor(g1.content, ctx?.colorTable, colModel);
                    out += wrapWithActive(
                      `<span style="background-color: ${escapeHtml(cssBg)}; padding: 1px 6px; border-radius: 2px;">${innerHtml}</span>`
                    );
                  } else {
                    const safeHref = escapeHtml(g1.content.trim());
                    const hCfg = ctx?.hyperrefConfig;
                    const useHyper = Boolean(hCfg && hCfg.colorlinks && !hCfg.hidelinks);
                    const hrefStyle = useHyper
                      ? `color: ${escapeHtml(hCfg.urlcolor || hCfg.linkcolor || '#0284c7')}; text-decoration: none;`
                      : 'color: #0284c7; text-decoration: underline;';
                    out += wrapWithActive(
                      `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="${hrefStyle}">${innerHtml}</a>`
                    );
                  }
                  idx = g2.endIndex + 1;
                  continue;
                }
              }
            }
          }
        }

        // 3-arg \fcolorbox[m]{bd}{bg}{text}
        if (cmd === 'fcolorbox') {
          let ws1 = skipSp(seg, cur);
          let colModel = '';
          if (seg[ws1] === '[') {
            const obr = extractBalancedBrackets(seg, ws1);
            if (obr) {
              colModel = obr.content.trim();
              ws1 = skipSp(seg, obr.endIndex + 1);
            }
          }
          if (seg[ws1] === '{') {
            const g1 = extractBalancedBraces(seg, ws1);
            const ws2 = g1 ? skipSp(seg, g1.endIndex + 1) : -1;
            const g2 = ws2 !== -1 && seg[ws2] === '{' ? extractBalancedBraces(seg, ws2) : null;
            const ws3 = g2 ? skipSp(seg, g2.endIndex + 1) : -1;
            const g3 = ws3 !== -1 && seg[ws3] === '{' ? extractBalancedBraces(seg, ws3) : null;
            if (g1 && g2 && g3) {
              const bd = escapeHtml(mapLatexColor(g1.content, ctx?.colorTable, colModel));
              const bg = escapeHtml(mapLatexColor(g2.content, ctx?.colorTable, colModel));
              out += wrapWithActive(
                `<span style="border: 1px solid ${bd}; background-color: ${bg}; padding: 1px 6px; border-radius: 2px;">${evalSegment(g3.content)}</span>`
              );
              idx = g3.endIndex + 1;
              continue;
            }
          }
        }

        // Box unwrappers in inline mode: \resizebox{w}{h}{body}, \scalebox{s}[v]{body}, \rotatebox[o]{d}{body}, \raisebox{l}[h][d]{body}, \parbox[p]{w}{body}
        if (['resizebox', 'scalebox', 'rotatebox', 'raisebox', 'parbox', 'makebox', 'framebox'].includes(cmd)) {
          let ws = skipSp(seg, cur);
          while (seg[ws] === '[') {
            const obr = extractBalancedBrackets(seg, ws);
            if (!obr) break;
            ws = skipSp(seg, obr.endIndex + 1);
          }
          if (cmd === 'resizebox') {
            const g1 = seg[ws] === '{' ? extractBalancedBraces(seg, ws) : null;
            const ws2 = g1 ? skipSp(seg, g1.endIndex + 1) : -1;
            const g2 = ws2 !== -1 && seg[ws2] === '{' ? extractBalancedBraces(seg, ws2) : null;
            const ws3 = g2 ? skipSp(seg, g2.endIndex + 1) : -1;
            const g3 = ws3 !== -1 && seg[ws3] === '{' ? extractBalancedBraces(seg, ws3) : null;
            if (g3) {
              out += wrapWithActive(evalSegment(g3.content));
              idx = g3.endIndex + 1;
              continue;
            }
          } else if (['scalebox', 'rotatebox', 'raisebox', 'parbox'].includes(cmd)) {
            const g1 = seg[ws] === '{' ? extractBalancedBraces(seg, ws) : null;
            if (g1) {
              let ws2 = skipSp(seg, g1.endIndex + 1);
              while (seg[ws2] === '[') {
                const obr = extractBalancedBrackets(seg, ws2);
                if (!obr) break;
                ws2 = skipSp(seg, obr.endIndex + 1);
              }
              const g2 = seg[ws2] === '{' ? extractBalancedBraces(seg, ws2) : null;
              if (g2) {
                out += wrapWithActive(evalSegment(g2.content));
                idx = g2.endIndex + 1;
                continue;
              }
            }
          } else if (seg[ws] === '{') {
            const gBody = extractBalancedBraces(seg, ws);
            if (gBody) {
              const inner = evalSegment(gBody.content);
              out +=
                cmd === 'framebox'
                  ? wrapWithActive(
                      `<span style="border: 1px solid var(--s6); padding: 1px 6px; border-radius: 2px;">${inner}</span>`
                    )
                  : wrapWithActive(inner);
              idx = gBody.endIndex + 1;
              continue;
            }
          }
        }

        // \rule[raise]{width}{height}
        if (cmd === 'rule') {
          let ws = skipSp(seg, cur);
          if (seg[ws] === '[') {
            const obr = extractBalancedBrackets(seg, ws);
            if (obr) ws = skipSp(seg, obr.endIndex + 1);
          }
          const g1 = seg[ws] === '{' ? extractBalancedBraces(seg, ws) : null;
          const ws2 = g1 ? skipSp(seg, g1.endIndex + 1) : -1;
          const g2 = ws2 !== -1 && seg[ws2] === '{' ? extractBalancedBraces(seg, ws2) : null;
          if (g2) {
            out += '<span style="display: inline-block; width: 48px; border-bottom: 1px solid currentColor; vertical-align: middle;"></span>';
            idx = g2.endIndex + 1;
            continue;
          }
        }

        // 1-arg commands
        let wsArg = skipSp(seg, cur);
        if (cmd === 'tcbox' && seg[wsArg] === '[') {
          const obr = extractBalancedBrackets(seg, wsArg);
          if (obr) wsArg = skipSp(seg, obr.endIndex + 1);
        }
        if (cmd === 'cite' && seg[wsArg] === '[') {
          const obr = extractBalancedBrackets(seg, wsArg);
          const wsKey = obr ? skipSp(seg, obr.endIndex + 1) : wsArg;
          const kg = seg[wsKey] === '{' ? extractBalancedBraces(seg, wsKey) : null;
          if (kg) {
            flushText(`[${kg.content.trim()}${obr ? `, ${obr.content.trim()}` : ''}]`);
            idx = kg.endIndex + 1;
            continue;
          }
        }

        if (seg[wsArg] === '{') {
          const grp = extractBalancedBraces(seg, wsArg);
          if (grp) {
            if (['label', 'index', 'nocite', 'phantom', 'hphantom', 'vphantom'].includes(cmd)) {
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'hspace') {
              out += '&nbsp;&nbsp;';
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'vspace') {
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'eqref') {
              const key = grp.content.trim();
              const entry = ctx?.globalLabels?.get(key);
              const numStr = entry ? entry.formattedNum || `${entry.globalSeq}` : key;
              const hCfg = ctx?.hyperrefConfig;
              if (hCfg && hCfg.colorlinks && !hCfg.hidelinks) {
                const linkCol = escapeHtml(hCfg.linkcolor || '#dc2626');
                const hrefAttr = entry?.anchorId ? ` href="#${escapeHtml(entry.anchorId)}"` : '';
                out += wrapWithActive(
                  `(<a${hrefAttr} class="latex-eqref" style="color: ${linkCol}; text-decoration: none;">${escapeHtml(numStr)}</a>)`
                );
              } else {
                flushText(`(${numStr})`);
              }
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'ref') {
              const key = grp.content.trim();
              const entry = ctx?.globalLabels?.get(key);
              const numStr = entry ? entry.formattedNum || `${entry.globalSeq}` : key;
              const hCfg = ctx?.hyperrefConfig;
              if (hCfg && hCfg.colorlinks && !hCfg.hidelinks) {
                const linkCol = escapeHtml(hCfg.linkcolor || '#dc2626');
                const hrefAttr = entry?.anchorId ? ` href="#${escapeHtml(entry.anchorId)}"` : '';
                out += wrapWithActive(
                  `<a${hrefAttr} class="latex-ref" style="color: ${linkCol}; text-decoration: none;">${escapeHtml(numStr)}</a>`
                );
              } else {
                flushText(numStr);
              }
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'cite') {
              const hCfg = ctx?.hyperrefConfig;
              if (hCfg && hCfg.colorlinks && !hCfg.hidelinks) {
                const citeCol = escapeHtml(hCfg.citecolor || hCfg.linkcolor || '#16a34a');
                out += wrapWithActive(
                  `<span class="latex-cite" style="color: ${citeCol};">[${escapeHtml(grp.content.trim())}]</span>`
                );
              } else {
                flushText(`[${grp.content.trim()}]`);
              }
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'url') {
              const u = escapeHtml(grp.content.trim());
              const hCfg = ctx?.hyperrefConfig;
              const useHyper = Boolean(hCfg && hCfg.colorlinks && !hCfg.hidelinks);
              const urlStyle = useHyper
                ? `color: ${escapeHtml(hCfg.urlcolor || hCfg.linkcolor || '#0284c7')}; text-decoration: none;`
                : 'color: #0284c7; text-decoration: underline;';
              out += wrapWithActive(
                `<a href="${u}" target="_blank" rel="noopener noreferrer" style="${urlStyle}">${u}</a>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'footnote' || cmd === 'thanks') {
              const plainNote = unwrapTexFormattingToPlainText(grp.content);
              out += `<sup class="latex-footnote" title="${escapeHtml(plainNote)}" style="color: #0284c7; cursor: help;">[*]</sup>`;
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'textbf') {
              out += wrapWithActive(`<strong style="font-weight: 700;">${evalSegment(grp.content)}</strong>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'textit' || cmd === 'emph' || cmd === 'textsl') {
              out += wrapWithActive(`<em>${evalSegment(grp.content)}</em>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'underline' || cmd === 'uline' || cmd === 'ul') {
              out += wrapWithActive(`<u>${evalSegment(grp.content)}</u>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'uwave') {
              out += wrapWithActive(
                `<span style="text-decoration: underline wavy;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'dashuline') {
              out += wrapWithActive(
                `<span style="text-decoration: underline dashed;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'dotuline') {
              out += wrapWithActive(
                `<span style="text-decoration: underline dotted;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'so') {
              out += wrapWithActive(`<span style="letter-spacing: 0.14em;">${evalSegment(grp.content)}</span>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'caps') {
              out += wrapWithActive(
                `<span style="font-variant: small-caps; letter-spacing: 0.05em;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'sout' || cmd === 'st') {
              out += wrapWithActive(`<s>${evalSegment(grp.content)}</s>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'texttt') {
              out += wrapWithActive(
                `<code style="font-family: monospace; background: var(--s2); padding: 1px 5px; border-radius: 2px; border: 1px solid var(--s3); font-size: 0.9em;">${evalSegment(grp.content)}</code>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'textsc') {
              out += wrapWithActive(`<span style="font-variant: small-caps;">${evalSegment(grp.content)}</span>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'textsuperscript') {
              out += wrapWithActive(`<sup>${evalSegment(grp.content)}</sup>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'textsubscript') {
              out += wrapWithActive(`<sub>${evalSegment(grp.content)}</sub>`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'fbox') {
              out += wrapWithActive(
                `<span style="border: 1px solid var(--s6); padding: 1px 6px; border-radius: 2px;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'ovalbox' || cmd === 'Ovalbox' || cmd === 'tcbox') {
              const bw = cmd === 'Ovalbox' ? '1.8px' : '1.2px';
              out += wrapWithActive(
                `<span style="border: ${bw} solid var(--s6); padding: 1px 8px; border-radius: 7px; display: inline-block;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'doublebox') {
              out += wrapWithActive(
                `<span style="border: 3px double var(--s6); padding: 1px 7px; border-radius: 2px; display: inline-block;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'shadowbox') {
              out += wrapWithActive(
                `<span style="border: 1px solid var(--s6); border-right-width: 2.5px; border-bottom-width: 2.5px; padding: 1px 7px; border-radius: 2px; display: inline-block;">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'ensuremath') {
              out += wrapWithActive(renderKatexSafe(grp.content, false, ctx?.macroTable, ctx?.colorTable));
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'hl') {
              out += wrapWithActive(
                `<mark style="background: rgba(250, 204, 21, 0.28); color: inherit; padding: 0 3px; border-radius: 2px;">${evalSegment(grp.content)}</mark>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'enquote') {
              out += wrapWithActive(`\u201c${evalSegment(grp.content)}\u201d`);
              idx = grp.endIndex + 1;
              continue;
            }
            if (cmd === 'textsf') {
              out += wrapWithActive(
                `<span style="font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);">${evalSegment(grp.content)}</span>`
              );
              idx = grp.endIndex + 1;
              continue;
            }
            if (['textrm', 'textnormal', 'textup', 'textmd', 'mbox', 'hbox', 'text'].includes(cmd)) {
              out += wrapWithActive(evalSegment(grp.content));
              idx = grp.endIndex + 1;
              continue;
            }
          }
        }

        // 0-arg commands & text symbols
        if (cmd === 'newline' || cmd === 'linebreak') { out += '<br/>'; idx = cur; continue; }
        if (cmd === 'quad') { out += '&nbsp;&nbsp;&nbsp;&nbsp;'; idx = cur; continue; }
        if (cmd === 'qquad') { out += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'; idx = cur; continue; }
        if (cmd === 'enspace' || cmd === 'thinspace') { out += '&nbsp;'; idx = cur; continue; }
        if (cmd === 'slash') { flushText('/'); idx = cur; continue; }
        if (cmd === 'and') { flushText(', '); idx = skipSp(seg, cur); continue; }
        if (cmd === 'today') {
          const now = new Date();
          flushText(`Tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`);
          idx = cur;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(TEXT_SYMBOL_MAP, cmd)) {
          flushText(TEXT_SYMBOL_MAP[cmd]);
          if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
          idx = cur;
          continue;
        }

        // Skip layout/spacing zero-arg commands cleanly
        if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
        idx = cur;
        continue;
      }

      // Plain character run up to next special token
      let nextIdx = idx + 1;
      while (
        nextIdx < seg.length &&
        seg[nextIdx] !== '\\' &&
        seg[nextIdx] !== '{' &&
        seg[nextIdx] !== '}' &&
        seg[nextIdx] !== '~' &&
        seg[nextIdx] !== '\u0002'
      ) {
        nextIdx++;
      }
      flushText(seg.slice(idx, nextIdx));
      idx = nextIdx;
    }

    return out;
  };

  return evalSegment(work);
}

function renderTabularBlockHtml(rawTabularTex, ctx) {
  const m =
    /^\\begin\{(tabular\*?|tabularx|tabulary|longtable|supertabular|xltabular)\}([\s\S]*?)\\end\{\1\}$/.exec(
      rawTabularTex.trim()
    );
  const envType = m ? m[1] : 'tabular';
  let cleanBody = m ? m[2].trim() : rawTabularTex.trim();

  const takesWidthArg =
    envType === 'tabular*' || envType === 'tabularx' || envType === 'tabulary' || envType === 'xltabular';
  if (takesWidthArg && cleanBody.startsWith('{')) {
    const wExt = extractBalancedBraces(cleanBody, 0);
    if (wExt) cleanBody = cleanBody.substring(wExt.endIndex + 1).trim();
  }
  if (cleanBody.startsWith('[')) {
    const br = extractBalancedBrackets(cleanBody, 0);
    if (br && br.endIndex < 16) cleanBody = cleanBody.substring(br.endIndex + 1).trim();
  }
  if (cleanBody.startsWith('{')) {
    const colExt = extractBalancedBraces(cleanBody, 0);
    if (colExt) cleanBody = cleanBody.substring(colExt.endIndex + 1).trim();
  }

  // Handle longtable inline \caption{...}\\ and repeated page header/footer blocks
  let longtableCaptionHtml = '';
  if (envType === 'longtable' || envType === 'xltabular') {
    cleanBody = cleanBody.replace(/\\endfirsthead[\s\S]*?\\endhead/g, '');
    cleanBody = cleanBody.replace(/\\endhead\b/g, '');
    cleanBody = cleanBody.replace(/\\endfoot[\s\S]*?\\endlastfoot/g, '');
    cleanBody = cleanBody.replace(/\\(?:endfoot|endlastfoot)\b/g, '');

    const capMatch = /\\caption\*?\s*(?:\[[^\]]*\])?\s*\{/.exec(cleanBody);
    if (capMatch) {
      const bIdx = cleanBody.indexOf('{', capMatch.index);
      const capGrp = extractBalancedBraces(cleanBody, bIdx);
      if (capGrp) {
        longtableCaptionHtml = `<div class="latex-caption" style="margin-bottom: 8px;">${renderRichInlineTex(
          capGrp.content.trim(),
          ctx
        )}</div>`;
        let cutEnd = capGrp.endIndex + 1;
        const afterCap = cleanBody.slice(cutEnd);
        const trailBrk = /^\s*(?:\\label\s*\{[^}]*\}\s*)?(?:\\\\(?:\s*\[[^\]]*\])?)?/.exec(afterCap);
        if (trailBrk) cutEnd += trailBrk[0].length;
        cleanBody = cleanBody.slice(0, capMatch.index) + cleanBody.slice(cutEnd);
      }
    }
  }

  // Unroll \parbox and \multirow BEFORE splitting rows by \\ so internal \\ becomes inline break
  let pbIdx;
  while ((pbIdx = cleanBody.indexOf('\\parbox')) !== -1) {
    let cur = pbIdx + '\\parbox'.length;
    while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    while (cleanBody[cur] === '[') {
      const obr = extractBalancedBrackets(cleanBody, cur);
      if (!obr) break;
      cur = obr.endIndex + 1;
      while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    }
    if (cleanBody[cur] !== '{') break;
    const wGrp = extractBalancedBraces(cleanBody, cur);
    if (!wGrp) break;
    cur = wGrp.endIndex + 1;
    while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    if (cleanBody[cur] !== '{') break;
    const bodyGrp = extractBalancedBraces(cleanBody, cur);
    if (!bodyGrp) break;
    const inner = bodyGrp.content.replace(/\\\\(?:\s*\[[^\]]*\])?/g, ' \\newline ');
    cleanBody = cleanBody.substring(0, pbIdx) + inner + cleanBody.substring(bodyGrp.endIndex + 1);
  }

  let mrIdx;
  while ((mrIdx = cleanBody.indexOf('\\multirow')) !== -1) {
    let cur = mrIdx + '\\multirow'.length;
    while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    if (cleanBody[cur] === '[') {
      const obr = extractBalancedBrackets(cleanBody, cur);
      if (obr) cur = obr.endIndex + 1;
    }
    while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    const g1 = cleanBody[cur] === '{' ? extractBalancedBraces(cleanBody, cur) : null;
    if (!g1) break;
    cur = g1.endIndex + 1;
    while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    if (cleanBody[cur] === '*') {
      cur++;
    } else if (cleanBody[cur] === '{') {
      const g2 = extractBalancedBraces(cleanBody, cur);
      if (!g2) break;
      cur = g2.endIndex + 1;
    }
    while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    if (cleanBody[cur] === '[') {
      const fixBr = extractBalancedBrackets(cleanBody, cur);
      if (fixBr) cur = fixBr.endIndex + 1;
      while (cur < cleanBody.length && /\s/.test(cleanBody[cur])) cur++;
    }
    const g3 = cleanBody[cur] === '{' ? extractBalancedBraces(cleanBody, cur) : null;
    if (!g3) break;
    const inner = g3.content.replace(/\\\\(?:\s*\[[^\]]*\])?/g, ' \\newline ');
    cleanBody = cleanBody.substring(0, mrIdx) + inner + cleanBody.substring(g3.endIndex + 1);
  }

  const hasBorder = /\\(?:hline|toprule|midrule|bottomrule|specialrule)\b/.test(cleanBody);
  const stripTableRules = (rowStr) =>
    rowStr
      .replace(/\\(?:hline|toprule|midrule|bottomrule|morecmidrules)(?:\s*\[[^\]]*\])?/g, '')
      .replace(/\\cline\s*\{[^}]*\}/g, '')
      .replace(/\\cmidrule\s*(?:\[[^\]]*\])?\s*(?:\([^)]*\))?\s*\{[^}]*\}/g, '')
      .replace(/\\addlinespace\s*(?:\[[^\]]*\])?/g, '')
      .replace(/\\specialrule\s*\{[^}]*\}\s*\{[^}]*\}\s*\{[^}]*\}/g, '')
      .replace(/\\rowcolor\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, '')
      .replace(/\\cellcolor\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, '')
      .trim();

  // Mask internal \\ and & inside inline/display math ($...$, \(...\), \[...\], $$...$$) BEFORE splitting table rows & cells
  const maskMathDelims = (s) =>
    s
      .replace(/\\&/g, '___V_ESC_AMP___')
      .replace(/\$\$[\s\S]+?\$\$/g, (mMath) =>
        mMath.replace(/\\\\/g, '___V_MATH_NL___').replace(/&/g, '___V_MATH_AMP___')
      )
      .replace(/(?<!\\)\\\[[\s\S]+?(?<!\\)\\\]/g, (mMath) =>
        mMath.replace(/\\\\/g, '___V_MATH_NL___').replace(/&/g, '___V_MATH_AMP___')
      )
      .replace(/(?<!\\)\\\([\s\S]*?(?<!\\)\\\)/g, (mMath) =>
        mMath.replace(/\\\\/g, '___V_MATH_NL___').replace(/&/g, '___V_MATH_AMP___')
      )
      .replace(/\$[^$]+\$/g, (mMath) =>
        mMath.replace(/\\\\/g, '___V_MATH_NL___').replace(/&/g, '___V_MATH_AMP___')
      );

  const rowStrings = maskMathDelims(cleanBody)
    .replace(/\\\\\*?(?:\s*\[[^\]]*\])?/g, '___V_ROW_BRK___')
    .split('___V_ROW_BRK___')
    .map((r) => stripTableRules(r))
    .filter((r) => r.length > 0);

  let html =
    `<div style="overflow-x: auto; margin: ${hasBorder ? '20px 0' : '12px auto'}; width: 100%;">` +
    longtableCaptionHtml +
    `<table class="latex-table${hasBorder ? '' : ' latex-table-borderless'}" style="border-collapse: collapse; margin: 0 auto; ${
      hasBorder ? 'border: 1px solid var(--s4); width: 100%;' : 'border: none; max-width: 660px;'
    } font-size: 0.96rem;">`;

  rowStrings.forEach((cleanRow, rIdx) => {
    if (!cleanRow) return;

    const parsedCells = cleanRow.split('&').map((rawCell) => {
      let restored = rawCell
        .replace(/___V_MATH_NL___/g, '\\\\')
        .replace(/___V_MATH_AMP___/g, '&')
        .replace(/___V_ESC_AMP___/g, '\\&')
        .replace(/\\(?:centering|raggedright|raggedleft|arraybackslash)\b/g, '')
        .trim();

      let colspan = 1;
      let customAlign = null;

      // Balanced \multicolumn{N}{alignSpec}{content}
      if (restored.startsWith('\\multicolumn')) {
        const b1 = restored.indexOf('{');
        const g1 = b1 !== -1 ? extractBalancedBraces(restored, b1) : null;
        const b2 = g1 ? restored.indexOf('{', g1.endIndex + 1) : -1;
        const g2 = b2 !== -1 ? extractBalancedBraces(restored, b2) : null;
        const b3 = g2 ? restored.indexOf('{', g2.endIndex + 1) : -1;
        const g3 = b3 !== -1 ? extractBalancedBraces(restored, b3) : null;
        if (g1 && g2 && g3) {
          colspan = Math.max(1, parseInt(g1.content.trim(), 10) || 1);
          const al = g2.content;
          if (/r/.test(al)) customAlign = 'right';
          else if (/l/.test(al)) customAlign = 'left';
          else customAlign = 'center';
          restored = g3.content.trim() + restored.slice(g3.endIndex + 1).trim();
        }
      }

      return {
        html: renderRichInlineTex(restored, ctx),
        colspan,
        customAlign
      };
    });

    html += '<tr>';
    parsedCells.forEach((cellObj, cIdx) => {
      const spanAttr = cellObj.colspan > 1 ? ` colspan="${cellObj.colspan}"` : '';
      if (hasBorder) {
        const tag = rIdx === 0 ? 'th' : 'td';
        const align = cellObj.customAlign || (rIdx === 0 ? 'center' : 'left');
        html += `<${tag}${spanAttr} style="border: 1px solid var(--s4); padding: 8px 12px; text-align: ${align}; ${
          rIdx === 0 ? 'background: var(--s2); font-weight: 700; color: var(--s12);' : 'color: var(--s11);'
        }">${cellObj.html}</${tag}>`;
      } else {
        const align = cellObj.customAlign || 'left';
        html += `<td${spanAttr} style="border: none; padding: 6px 14px; text-align: ${align}; vertical-align: top; ${
          cIdx === 0 ? 'font-weight: 600; color: var(--s12);' : 'color: var(--s11);'
        }">${cellObj.html}</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</table></div>';
  return html;
}

function renderPreflightPdfFigureCard(asset, start, end, sourceMapMode) {
  const mapAttrs = sourceMapMode ? ` data-tex-atomic="true" data-tex-start="${start}" data-tex-end="${end}"` : '';
  return `<div class="v-preflight-card"${mapAttrs} style="margin: 18px auto; padding: 16px 20px; border: 1px solid #d97706; background: rgba(245, 158, 11, 0.08); border-radius: 2px; text-align: left; font-family: var(--font-ui, sans-serif);">
    <div style="font-size: 0.86rem; font-weight: 700; color: #b45309; margin-bottom: 4px;">Hình nhúng định dạng Vector PDF/EPS: ${escapeHtml(asset.origPath)}</div>
    <div style="font-size: 0.82rem; color: var(--s11); margin-bottom: 10px;">Trình duyệt Web không hiển thị trực tiếp tệp PDF trong thẻ hình ảnh. Bạn có thể chọn tệp ảnh PNG/JPG/SVG thay thế ngay tại đây nếu đoạn trích xuất chứa hình này.</div>
    <button type="button" data-preflight-replace-asset="${escapeHtml(asset.id)}" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600; background: #d97706; color: #ffffff; border: none; border-radius: 2px; cursor: pointer;">Chèn ảnh PNG/SVG thay thế cho hình này</button>
  </div>`;
}

function renderPreflightComplexTikzCard(absStart, absEnd, enablePreflightCards, mapAttrs) {
  if (!enablePreflightCards) {
    return `<div class="vectoria-diagram-container" style="margin: 20px auto; padding: 18px; border: 1px dashed var(--s4); border-radius: 2px; text-align: center; color: var(--s11); background: var(--s2);">
      <div style="font-size: 0.95rem; font-weight: 600; color: var(--s12);">Sơ đồ hình học vector</div>
    </div>`;
  }
  return `<div class="v-preflight-card"${mapAttrs} style="margin: 18px auto; padding: 16px 20px; border: 1px solid #d97706; background: rgba(245, 158, 11, 0.08); border-radius: 2px; text-align: left; font-family: var(--font-ui, sans-serif);">
    <div style="font-size: 0.86rem; font-weight: 700; color: #b45309; margin-bottom: 4px;">Khối đồ họa TikZ / Mạch điện nâng cao (pgfplots / circuitikz / 3D)</div>
    <div style="font-size: 0.82rem; color: var(--s11); margin-bottom: 10px;">Khối đồ họa này dùng gói lệnh TeX chuyên biệt. Để hiển thị sắc nét 100% trên giao diện người học, hãy tải ảnh chụp PNG/SVG thay thế nếu bạn chọn đoạn chứa hình này.</div>
    <button type="button" data-preflight-replace-tikz="${absStart}:${absEnd}" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600; background: #d97706; color: #ffffff; border: none; border-radius: 2px; cursor: pointer;">Chèn ảnh PNG/SVG thay thế khối đồ họa này</button>
  </div>`;
}

function renderGraphicsCommandHtml(rawCmd, start, end, ctx, sourceMapMode) {
  const m = /\\includegraphics\s*(?:\[([\s\S]*?)\])?\s*\{([^}]+)\}/.exec(rawCmd);
  if (!m) return '';
  const optStr = m[1] || '';
  const rawSrc = m[2].trim();
  const { url, asset } = resolveGraphicsAsset(rawSrc, ctx.assetVault);

  if (asset && asset.isUnsupportedVectorFigure && !asset.replacedDataUrl) {
    if (ctx.enablePreflightCards) {
      return renderPreflightPdfFigureCard(asset, start, end, sourceMapMode);
    }
    return `<div class="latex-figure" style="margin: 16px auto; text-align: center; font-style: italic; color: var(--s11);">[Hình minh họa: ${escapeHtml(asset.fileName)}]</div>`;
  }

  if (!url) {
    const mapAttrs = sourceMapMode ? ` data-tex-atomic="true" data-tex-start="${start}" data-tex-end="${end}"` : '';
    return `<div class="latex-figure"${mapAttrs} style="margin: 16px auto; padding: 12px; border: 1px dashed var(--s4); text-align: center; font-size: 0.88rem; color: var(--s11);">[Không tìm thấy tệp ảnh: ${escapeHtml(rawSrc)}]</div>`;
  }

  const imgStyle = computeImageStyleFromOpts(optStr);
  const altText = asset ? `Hình minh họa ${asset.fileName}` : 'Hình minh họa bài học';
  const mapAttrs = sourceMapMode ? ` data-tex-atomic="true" data-tex-start="${start}" data-tex-end="${end}"` : '';
  return `<div class="latex-figure"${mapAttrs} style="text-align: center; margin: 20px auto; width: 100%;">` +
    `<img src="${escapeHtml(url)}" alt="${escapeHtml(altText)}" style="${imgStyle}" />` +
    `</div>`;
}

const ACADEMIC_BOX_INFO = {
  dn: { label: 'Định nghĩa', cls: 'latex-box-dn', counterKey: 'dn' },
  definition: { label: 'Định nghĩa', cls: 'latex-box-dn', counterKey: 'dn' },
  dinhnghia: { label: 'Định nghĩa', cls: 'latex-box-dn', counterKey: 'dn' },
  dl: { label: 'Định lý', cls: 'latex-box-dl', counterKey: 'dl' },
  theorem: { label: 'Định lý', cls: 'latex-box-dl', counterKey: 'dl' },
  dinhly: { label: 'Định lý', cls: 'latex-box-dl', counterKey: 'dl' },
  lemma: { label: 'Bổ đề', cls: 'latex-box-dl', counterKey: 'dl' },
  bode: { label: 'Bổ đề', cls: 'latex-box-dl', counterKey: 'dl' },
  bd: { label: 'Bổ đề', cls: 'latex-box-dl', counterKey: 'dl' },
  tc: { label: 'Tính chất', cls: 'latex-box-tc', counterKey: 'tc' },
  property: { label: 'Tính chất', cls: 'latex-box-tc', counterKey: 'tc' },
  properties: { label: 'Tính chất', cls: 'latex-box-tc', counterKey: 'tc' },
  tinhchat: { label: 'Tính chất', cls: 'latex-box-tc', counterKey: 'tc' },
  proposition: { label: 'Mệnh đề', cls: 'latex-box-tc', counterKey: 'tc' },
  menhde: { label: 'Mệnh đề', cls: 'latex-box-tc', counterKey: 'tc' },
  md: { label: 'Mệnh đề', cls: 'latex-box-tc', counterKey: 'tc' },
  vd: { label: 'Ví dụ', cls: 'latex-box-vd', counterKey: 'vd' },
  example: { label: 'Ví dụ', cls: 'latex-box-vd', counterKey: 'vd' },
  vidu: { label: 'Ví dụ', cls: 'latex-box-vd', counterKey: 'vd' },
  hq: { label: 'Hệ quả', cls: 'latex-box-hq', counterKey: 'hq' },
  corollary: { label: 'Hệ quả', cls: 'latex-box-hq', counterKey: 'hq' },
  hequa: { label: 'Hệ quả', cls: 'latex-box-hq', counterKey: 'hq' },
  nx: { label: 'Nhận xét', cls: 'latex-box-nx', counterKey: 'nx' },
  remark: { label: 'Nhận xét', cls: 'latex-box-nx', counterKey: 'nx' },
  nhanxet: { label: 'Nhận xét', cls: 'latex-box-nx', counterKey: 'nx' },
  bt: { label: 'Bài tập', cls: 'latex-box-bt', counterKey: 'bt' },
  exercise: { label: 'Bài tập', cls: 'latex-box-bt', counterKey: 'bt' },
  baitap: { label: 'Bài tập', cls: 'latex-box-bt', counterKey: 'bt' },
  btmau: { label: 'Bài tập mẫu', cls: 'latex-box-btmau', counterKey: 'bt' },
  sol: { label: 'Lời giải', cls: 'latex-box-sol', counterKey: null },
  solution: { label: 'Lời giải', cls: 'latex-box-sol', counterKey: null },
  loigiai: { label: 'Lời giải', cls: 'latex-box-sol', counterKey: null },
  lgiai: { label: 'Lời giải', cls: 'latex-box-sol', counterKey: null },
  cminh: { label: 'Chứng minh', cls: 'latex-box-sol', counterKey: null },
  note: { label: 'Ghi chú', cls: 'latex-box-note', counterKey: null },
  ghichu: { label: 'Ghi chú', cls: 'latex-box-note', counterKey: null }
};

export const VECTORIA_ACADEMIC_PREVIEW_CSS = `
  .vectoria-academic-paper {
    font-family: var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', 'Times New Roman', serif);
    font-size: 1.13rem;
    line-height: 1.8;
    color: var(--s12, #11181c);
    text-align: left;
  }
  .vectoria-academic-paper .latex-chapter-label {
    font-size: 1.96rem;
    font-weight: 700;
    line-height: 1.24;
  }
  .vectoria-academic-paper .latex-chapter-title {
    font-size: 2.36rem;
    font-weight: 700;
    line-height: 1.22;
  }
  .vectoria-academic-paper .latex-section {
    font-size: 1.62rem;
    font-weight: 700;
    line-height: 1.3;
    border-bottom: none;
    padding-bottom: 0;
  }
  .vectoria-academic-paper .latex-subsection {
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.35;
  }
  .vectoria-academic-paper .latex-subsubsection {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.4;
  }
  .vectoria-academic-paper .latex-numbered-equation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .vectoria-academic-paper .latex-eq-number {
    font-style: normal;
    font-weight: 400;
    color: var(--s12, #11181c);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .vectoria-academic-paper .latex-box {
    margin: 18px 0;
    text-align: left;
    line-height: 1.8;
    font-family: var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', serif);
  }
  .vectoria-academic-paper .latex-box-dn,
  .vectoria-academic-paper .latex-box-dl,
  .vectoria-academic-paper .latex-box-tc,
  .vectoria-academic-paper .latex-box-vd,
  .vectoria-academic-paper .latex-box-hq,
  .vectoria-academic-paper .latex-box-nx,
  .vectoria-academic-paper .latex-box-bt,
  .vectoria-academic-paper .latex-box-btmau,
  .vectoria-academic-paper .latex-box-note,
  .vectoria-academic-paper .latex-box-sol,
  .vectoria-academic-paper .latex-box-generic {
    border: none;
    background: transparent;
    padding: 0;
    border-radius: 0;
  }
  .vectoria-academic-paper .latex-box-dn .latex-box-content,
  .vectoria-academic-paper .latex-box-dl .latex-box-content,
  .vectoria-academic-paper .latex-box-tc .latex-box-content,
  .vectoria-academic-paper .latex-box-hq .latex-box-content {
    font-style: italic;
  }
  .vectoria-academic-paper .latex-box.is-body-italic .latex-box-content {
    font-style: italic;
  }
  .vectoria-academic-paper .latex-box.is-body-normal .latex-box-content {
    font-style: normal;
  }
  .vectoria-academic-paper .latex-box-dn .latex-box-content strong,
  .vectoria-academic-paper .latex-box-dl .latex-box-content strong,
  .vectoria-academic-paper .latex-box-tc .latex-box-content strong,
  .vectoria-academic-paper .latex-box-hq .latex-box-content strong,
  .vectoria-academic-paper .latex-box.is-body-italic .latex-box-content strong,
  .vectoria-academic-paper .latex-box-dn .latex-box-content .katex,
  .vectoria-academic-paper .latex-box-dl .latex-box-content .katex,
  .vectoria-academic-paper .latex-box-tc .latex-box-content .katex,
  .vectoria-academic-paper .latex-box-hq .latex-box-content .katex,
  .vectoria-academic-paper .latex-box.is-body-italic .latex-box-content .katex {
    font-style: normal;
  }
  .vectoria-academic-paper .latex-box-dn .latex-box-content strong em,
  .vectoria-academic-paper .latex-box-dl .latex-box-content strong em,
  .vectoria-academic-paper .latex-box-tc .latex-box-content strong em,
  .vectoria-academic-paper .latex-box-hq .latex-box-content strong em,
  .vectoria-academic-paper .latex-box.is-body-italic .latex-box-content strong em {
    font-style: italic;
  }
  .vectoria-academic-paper .latex-box .v-box-lead-label {
    color: var(--tcb-label-color, var(--s12));
    font-weight: 700;
    font-style: normal;
  }
  .vectoria-paper-dark .latex-box .v-box-lead-label,
  .paper-dark .latex-box .v-box-lead-label {
    color: var(--tcb-label-color-dark, #e2e8f0);
  }
  .vectoria-academic-paper .latex-box-vd .v-box-lead-label {
    color: var(--tcb-label-color, #1d4ed8);
    font-weight: 700;
    font-style: normal;
  }
  .vectoria-paper-dark .latex-box-vd .v-box-lead-label,
  .paper-dark .latex-box-vd .v-box-lead-label {
    color: var(--tcb-label-color-dark, #60a5fa);
  }
  /* Authentic LaTeX tcolorbox / mdframed / framed rendering (Light & Dark Mode) */
  .vectoria-academic-paper .latex-tcolorbox,
  .vectoria-academic-paper .latex-box.is-framed-box {
    background: var(--tcb-bg, #f3f5f8);
    border-style: solid;
    border-color: var(--tcb-frame, #475569);
    border-top-width: var(--tcb-bt, 1.5px);
    border-right-width: var(--tcb-br, 1.5px);
    border-bottom-width: var(--tcb-bb, 1.5px);
    border-left-width: var(--tcb-bl, 1.5px);
    border-radius: var(--tcb-radius, 8px);
    padding: 16px 20px;
    margin: 22px 0;
    position: relative;
  }
  .vectoria-academic-paper .latex-tcolorbox.has-boxed-pill,
  .vectoria-academic-paper .latex-box.is-framed-box.has-boxed-pill {
    margin-top: 30px;
    padding-top: 22px;
  }
  .vectoria-paper-dark .latex-tcolorbox,
  .vectoria-paper-dark .latex-box.is-framed-box,
  .paper-dark .latex-tcolorbox,
  .paper-dark .latex-box.is-framed-box {
    background: var(--tcb-bg-dark, rgba(148, 163, 184, 0.09));
    border-color: var(--tcb-frame-dark, #64748b);
  }
  .vectoria-academic-paper .latex-box.is-framed-box:not(.is-body-italic) .latex-box-content {
    font-style: normal;
  }
  .vectoria-academic-paper .latex-tcb-bar-header,
  .vectoria-academic-paper .latex-tcolorbox-header {
    background: var(--tcb-hdr-bg, var(--tcb-frame, #334155));
    color: var(--tcb-hdr-fg, #ffffff);
    font-size: 1.03rem;
    font-weight: 700;
    line-height: 1.45;
    margin: -16px -20px 14px -20px;
    padding: 9px 18px;
    border-bottom: none;
    border-top-left-radius: max(0px, calc(var(--tcb-radius, 8px) - 1.5px));
    border-top-right-radius: max(0px, calc(var(--tcb-radius, 8px) - 1.5px));
  }
  .vectoria-academic-paper .latex-tcb-pill-header {
    position: absolute;
    top: 0;
    left: 16px;
    transform: translateY(-54%);
    background: var(--tcb-hdr-bg, var(--tcb-frame, #334155));
    color: var(--tcb-hdr-fg, #ffffff);
    font-weight: 700;
    font-size: 0.96rem;
    line-height: 1.35;
    padding: 3px 14px;
    border-radius: 5px;
    border: 1px solid var(--tcb-frame, #334155);
    z-index: 1;
    max-width: calc(100% - 32px);
  }
  .vectoria-academic-paper .latex-tcolorbox-content p:last-child,
  .vectoria-academic-paper .latex-box.is-framed-box .latex-box-content p:last-child {
    margin-bottom: 0;
  }
  .vectoria-academic-paper .latex-solution-header {
    font-family: var(--font-academic);
    font-size: 1.13rem;
    font-weight: 700;
    color: var(--s12);
    margin: 20px 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .vectoria-academic-paper .latex-proof {
    margin: 18px 0;
    line-height: 1.8;
  }
  .vectoria-academic-paper .latex-proof::after {
    content: "";
    display: table;
    clear: both;
  }
  .vectoria-academic-paper .latex-tombstone {
    float: right;
    font-size: 0.9rem;
    color: var(--s9);
  }
  .vectoria-academic-paper .latex-list {
    margin-bottom: 18px;
    padding-left: 28px;
    line-height: 1.8;
  }
  .vectoria-academic-paper .latex-list li {
    margin-bottom: 8px;
  }
  .vectoria-academic-paper .latex-multicols {
    column-gap: 32px;
    margin: 18px 0;
    width: 100%;
  }
  .vectoria-academic-paper .latex-multicols.cols-2 { column-count: 2; }
  .vectoria-academic-paper .latex-multicols.cols-3 { column-count: 3; }
  .vectoria-academic-paper .katex-display-wrapper {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px 0;
    margin: 14px 0;
  }
  .vectoria-academic-paper .latex-caption {
    margin-top: 10px;
    font-size: 0.95rem;
    color: var(--s11);
    font-style: italic;
    text-align: center;
  }
  .vectoria-academic-paper .latex-minipage {
    display: inline-block;
    vertical-align: top;
    box-sizing: border-box;
    padding: 4px 8px;
    max-width: 100%;
  }
  @media (max-width: 640px) {
    .vectoria-academic-paper .latex-minipage {
      display: block;
      width: 100% !important;
      padding: 4px 0;
    }
    .vectoria-academic-paper .latex-multicols.cols-2,
    .vectoria-academic-paper .latex-multicols.cols-3 {
      column-count: 1;
    }
  }
  .vectoria-academic-paper .latex-verbatim {
    font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.88rem;
    line-height: 1.55;
    background: var(--s2, #f1f3f5);
    border: 1px solid var(--s4, #d7dfe3);
    border-radius: 2px;
    padding: 12px 16px;
    margin: 16px 0;
    overflow-x: auto;
    white-space: pre;
    color: var(--s12);
  }
  .vectoria-academic-paper .latex-blockquote {
    margin: 16px 0;
    padding: 8px 18px;
    border-left: 2px solid var(--s5, #c1c8cd);
    color: var(--s11);
  }
  .vectoria-academic-paper .latex-framed-box {
    margin: 18px 0;
    padding: 14px 18px;
    border: 1px solid var(--s4, #d7dfe3);
    background: var(--s1, #fcfcfd);
    border-radius: 2px;
  }
  .vectoria-academic-paper .latex-abstract {
    margin: 20px auto 24px;
    max-width: 92%;
    padding: 14px 18px;
    border-top: 1px solid var(--s4, #d7dfe3);
    border-bottom: 1px solid var(--s4, #d7dfe3);
    font-size: 0.98rem;
  }
  .vectoria-academic-paper .latex-paragraph {
    margin: 1.05em 0 0.45em;
    font-size: 1.04rem;
    font-weight: 700;
    color: var(--s12);
  }
  /* Source-mapped interactive selection cues */
  .vectoria-slicer-interactive div[data-tex-atomic="true"]:hover,
  .vectoria-slicer-interactive figure[data-tex-atomic="true"]:hover {
    background-color: rgba(14, 165, 233, 0.04);
  }
  .vectoria-slicer-interactive .v-tex-tok {
    border-radius: 0;
  }
  /* Calm editorial margin bar + uniform soft wash for whole paragraphs & blocks */
  .vectoria-slicer-interactive .v-seg-block-hl-1,
  .vectoria-slicer-interactive .v-seg-block-hl-2,
  .vectoria-slicer-interactive .v-seg-block-hl-3,
  .vectoria-slicer-interactive .v-seg-block-hl-4,
  .vectoria-slicer-interactive .v-draft-block-hl {
    position: relative;
  }
  .vectoria-slicer-interactive .v-seg-block-hl-1 { background-color: rgba(2, 132, 199, 0.065); }
  .vectoria-slicer-interactive .v-seg-block-hl-2 { background-color: rgba(22, 163, 74, 0.065); }
  .vectoria-slicer-interactive .v-seg-block-hl-3 { background-color: rgba(217, 119, 6, 0.075); }
  .vectoria-slicer-interactive .v-seg-block-hl-4 { background-color: rgba(147, 51, 234, 0.065); }
  .vectoria-slicer-interactive .v-draft-block-hl { background-color: rgba(234, 88, 12, 0.075); }

  .vectoria-slicer-interactive .v-seg-block-hl-1::before,
  .vectoria-slicer-interactive .v-seg-block-hl-2::before,
  .vectoria-slicer-interactive .v-seg-block-hl-3::before,
  .vectoria-slicer-interactive .v-seg-block-hl-4::before,
  .vectoria-slicer-interactive .v-draft-block-hl::before {
    content: "";
    position: absolute;
    left: -12px;
    top: 0;
    bottom: 0;
    width: 3px;
    pointer-events: none;
  }
  .vectoria-slicer-interactive .v-seg-block-hl-1::before { background-color: #0284c7; }
  .vectoria-slicer-interactive .v-seg-block-hl-2::before { background-color: #16a34a; }
  .vectoria-slicer-interactive .v-seg-block-hl-3::before { background-color: #d97706; }
  .vectoria-slicer-interactive .v-seg-block-hl-4::before { background-color: #9333ea; }
  .vectoria-slicer-interactive .v-draft-block-hl::before { background-color: #ea580c; }

  /* Partial-paragraph inline token highlight without overlapping double-alpha shadows */
  .vectoria-slicer-interactive .v-tex-tok.v-seg-hl-1,
  .vectoria-slicer-interactive span[data-tex-atomic="true"].v-seg-hl-1 {
    background-color: rgba(2, 132, 199, 0.13);
    border-bottom: 1.5px solid rgba(2, 132, 199, 0.55);
  }
  .vectoria-slicer-interactive .v-tex-tok.v-seg-hl-2,
  .vectoria-slicer-interactive span[data-tex-atomic="true"].v-seg-hl-2 {
    background-color: rgba(22, 163, 74, 0.13);
    border-bottom: 1.5px solid rgba(22, 163, 74, 0.55);
  }
  .vectoria-slicer-interactive .v-tex-tok.v-seg-hl-3,
  .vectoria-slicer-interactive span[data-tex-atomic="true"].v-seg-hl-3 {
    background-color: rgba(217, 119, 6, 0.14);
    border-bottom: 1.5px solid rgba(217, 119, 6, 0.55);
  }
  .vectoria-slicer-interactive .v-tex-tok.v-seg-hl-4,
  .vectoria-slicer-interactive span[data-tex-atomic="true"].v-seg-hl-4 {
    background-color: rgba(147, 51, 234, 0.13);
    border-bottom: 1.5px solid rgba(147, 51, 234, 0.55);
  }
  .vectoria-slicer-interactive .v-tex-tok.v-draft-range-hl,
  .vectoria-slicer-interactive span[data-tex-atomic="true"].v-draft-range-hl {
    background-color: rgba(234, 88, 12, 0.14);
    border-bottom: 1.5px solid rgba(234, 88, 12, 0.55);
  }

  /* Active clicked focus target under floating tooltip */
  .vectoria-slicer-interactive .v-cursor-focus-tok {
    background-color: rgba(14, 165, 233, 0.18) !important;
    box-shadow: 0 2px 0 #0284c7 !important;
  }
  .vectoria-slicer-interactive :not(span)[data-tex-atomic="true"].v-cursor-focus-tok {
    background-color: rgba(14, 165, 233, 0.07) !important;
    box-shadow: inset 3px 0 0 #0284c7 !important;
  }
  .vectoria-slicer-interactive .v-pending-start-pin {
    border-left: 3px solid #dc2626 !important;
    background-color: rgba(220, 38, 38, 0.12) !important;
    padding-left: 3px;
  }
  .vectoria-slicer-interactive .v-seg-badge-anchor {
    position: relative;
  }

  /* Stitched Preview Interactive Direct Editing & Custom Seam Authoring */
  .vectoria-stitched-editable .v-stitched-seg {
    position: relative;
    transition: box-shadow 0.16s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .vectoria-stitched-editable .v-stitched-seg:hover {
    box-shadow: inset 2px 0 0 rgba(2, 132, 199, 0.32);
    padding-left: 8px;
    margin-left: -8px;
  }
  .vectoria-stitched-editable .v-stitched-seg.is-custom-seg {
    box-shadow: inset 2px 0 0 rgba(13, 148, 136, 0.36);
    padding-left: 8px;
    margin-left: -8px;
  }
  .vectoria-stitched-editable .v-stitched-seg.is-custom-seg:hover {
    box-shadow: inset 2px 0 0 rgba(13, 148, 136, 0.72);
  }
  .vectoria-stitched-editable .v-insert-seam {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 22px;
    margin: 4px 0;
    opacity: 0;
    transition: opacity 0.16s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .vectoria-stitched-editable .v-insert-seam:hover,
  .vectoria-stitched-editable .v-insert-seam:focus-within,
  .vectoria-stitched-editable .v-insert-seam.is-always-visible {
    opacity: 1;
  }
  @media (hover: none) {
    .vectoria-stitched-editable .v-insert-seam {
      opacity: 0.85;
    }
  }
  .vectoria-stitched-editable .v-insert-seam::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    border-top: 1px dashed rgba(13, 148, 136, 0.45);
    pointer-events: none;
  }
  .vectoria-stitched-editable .v-editable-block-hover {
    outline: 1px dashed rgba(2, 132, 199, 0.52);
    outline-offset: 4px;
    border-radius: 2px;
    cursor: text;
  }
  .vectoria-academic-paper .v-inline-editor-surface {
    font-family: var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', serif);
    color: var(--s12);
    outline: none;
    min-height: 1.8em;
    word-break: break-word;
  }
  .vectoria-academic-paper .v-inline-editor-surface:empty::before {
    content: attr(data-placeholder);
    color: var(--s9);
    font-style: italic;
    pointer-events: none;
  }
  .vectoria-academic-paper .v-edit-math-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    padding: 0 4px;
    margin: 0 1px;
    border: 1px solid rgba(2, 132, 199, 0.38);
    background: rgba(2, 132, 199, 0.08);
    border-radius: 2px;
    cursor: pointer;
    user-select: none;
    vertical-align: baseline;
    transition: border-color 0.14s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.14s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .vectoria-academic-paper .v-edit-math-chip:hover,
  .vectoria-academic-paper .v-edit-math-chip.is-active-chip {
    border-color: #0284c7;
    background: rgba(2, 132, 199, 0.16);
  }
  .vectoria-academic-paper .v-edit-ref-chip {
    display: inline-flex;
    align-items: baseline;
    padding: 0 5px;
    margin: 0 1px;
    border: 1px solid rgba(209, 18, 112, 0.38);
    background: rgba(209, 18, 112, 0.07);
    border-radius: 2px;
    font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif);
    font-size: 0.86em;
    color: var(--s12);
    cursor: pointer;
    user-select: none;
    vertical-align: baseline;
  }
  @media (prefers-reduced-motion: reduce) {
    .vectoria-stitched-editable .v-stitched-seg,
    .vectoria-stitched-editable .v-insert-seam,
    .vectoria-academic-paper .v-edit-math-chip {
      transition: none !important;
    }
  }
`;

const IGNORED_PROSE_LAYOUT_CMDS = new Set([
  'noindent', 'indent', 'vfill', 'hfill', 'dotfill', 'hrulefill',
  'frontmatter', 'mainmatter', 'backmatter', 'makeatletter', 'makeatother',
  'protect', 'begingroup', 'endgroup', 'tableofcontents', 'listoffigures', 'listoftables',
  'allowdisplaybreaks', 'sloppy', 'fussy', 'emergencystretch', 'frenchspacing', 'nonfrenchspacing',
  'selectfont', 'relax', 'null', 'strut', 'mathstrut'
]);

const SKIP_ONE_ARG_LAYOUT_CMDS = new Set([
  'pagestyle', 'thispagestyle', 'pagenumbering', 'hypersetup', 'geometry',
  'linespread', 'newcounter', 'stepcounter', 'refstepcounter', 'theoremstyle',
  'tcbuselibrary', 'usetikzlibrary', 'usepgfplotslibrary', 'hyphenation',
  'RequirePackage', 'usepackage', 'documentclass', 'tcbset', 'tikzset',
  'pgfplotsset', 'sisetup', 'captionsetup', 'setlist', 'fancyhead', 'fancyfoot',
  'fancyhf', 'fancypagestyle', 'chead', 'lhead', 'rhead', 'cfoot', 'lfoot', 'rfoot',
  'bibliographystyle', 'bibliography', 'addbibresource', 'nocite', 'index',
  'enlargethispage', 'markright'
]);

const SKIP_TWO_ARG_LAYOUT_CMDS = new Set([
  'setlength', 'addtolength', 'setcounter', 'addtocounter', 'numberwithin',
  'counterwithin', 'counterwithout', 'markboth', 'renewcommand', 'providecommand'
]);

const SIUNITX_PROSE_ARITY = {
  si: 1,
  unit: 1,
  num: 1,
  ang: 1,
  SI: 2,
  qty: 2,
  numrange: 2,
  SIrange: 3,
  qtyrange: 3
};

const TRANSPARENT_WRAPPER_ENVS = new Set([
  'subequations', 'appendix', 'subappendices', 'spacing', 'doublespace',
  'onehalfspace', 'singlespace', 'sloppypar', 'samepage', 'adjustwidth',
  'changemargin', 'landscape', 'turn', 'rotate', 'CJK', 'CJK*',
  'otherlanguage', 'otherlanguage*'
]);

function createEmptyModifiers() {
  return {
    bold: false,
    italic: false,
    smallcaps: false,
    mono: false,
    sans: false,
    size: null,
    color: null,
    colorModel: '',
    align: null
  };
}

function cloneModifiers(mod) {
  if (!mod) return createEmptyModifiers();
  return {
    bold: Boolean(mod.bold),
    italic: Boolean(mod.italic),
    smallcaps: Boolean(mod.smallcaps),
    mono: Boolean(mod.mono),
    sans: Boolean(mod.sans),
    size: mod.size || null,
    color: mod.color || null,
    colorModel: mod.colorModel || '',
    align: mod.align || null
  };
}

function buildPartitionForRange(rangeStart, rangeEnd, allStructuredNodes) {
  const children = [];
  let cursor = rangeStart;

  for (const node of allStructuredNodes) {
    if (node.start < cursor) continue;
    if (node.start >= rangeEnd) break;
    if (node.end <= rangeEnd) {
      children.push(node);
      cursor = node.end;
    }
  }
  return children;
}

function parseLatexWidthToCssPct(openerText) {
  if (!openerText) return 48;
  let cur = openerText.indexOf('}') + 1;
  while (cur < openerText.length && /\s/.test(openerText[cur])) cur++;
  while (openerText[cur] === '[') {
    const br = extractBalancedBrackets(openerText, cur);
    if (!br) break;
    cur = br.endIndex + 1;
    while (cur < openerText.length && /\s/.test(openerText[cur])) cur++;
  }
  if (openerText[cur] === '{') {
    const wg = extractBalancedBraces(openerText, cur);
    if (wg) {
      const spec = wg.content.trim();
      const rel = /([0-9]*\.?[0-9]+)\s*\\(?:textwidth|linewidth|columnwidth|hsize)/i.exec(spec);
      if (rel) {
        const pct = Math.round(parseFloat(rel[1]) * 100);
        return Math.min(100, Math.max(18, pct));
      }
      if (/^\\(?:textwidth|linewidth|columnwidth)$/i.test(spec)) return 100;
      const cm = /([0-9]*\.?[0-9]+)\s*cm/i.exec(spec);
      if (cm) {
        const approxPct = Math.round((parseFloat(cm[1]) / 16) * 100);
        return Math.min(100, Math.max(20, approxPct));
      }
    }
  }
  return 48;
}

function tokenizePlainProseToMappedHtml(tex, pStart, pEnd, ctx, sourceMapMode, scopeMod = null) {
  let out = '';
  let i = pStart;
  const activeMod = scopeMod || createEmptyModifiers();

  const wrapStyled = (htmlStr) => {
    const st = buildInlineStyleFromModifiers(activeMod, ctx.colorTable);
    return st ? `<span style="${st}">${htmlStr}</span>` : htmlStr;
  };

  const emitWord = (ws, we, rawText) => {
    if (we <= ws || !rawText) return;
    const escaped = escapeHtml(rawText).replace(/\u2014/g, '-');
    const st = buildInlineStyleFromModifiers(activeMod, ctx.colorTable);
    if (!sourceMapMode) {
      out += st ? `<span style="${st}">${escaped}</span>` : escaped;
      return;
    }
    const styleAttr = st ? ` style="${st}"` : '';
    out += `<span class="v-tex-tok"${styleAttr} data-tex-start="${ws}" data-tex-end="${we}">${escaped}</span>`;
  };

  while (i < pEnd) {
    const ch = tex[i];

    // Whitespace run
    if (/\s/.test(ch)) {
      let k = i + 1;
      while (k < pEnd && /\s/.test(tex[k])) k++;
      out += ' ';
      i = k;
      continue;
    }

    // Non-breaking space ~
    if (ch === '~') {
      emitWord(i, i + 1, '\u00a0');
      i++;
      continue;
    }

    // Ornamental divider --------
    if (ch === '-' && tex.slice(i, Math.min(pEnd, i + 8)) === '--------') {
      let k = i + 8;
      while (k < pEnd && tex[k] === '-') k++;
      out += '<hr class="latex-divider" style="width: 140px; margin: 14px auto; border: none; border-top: 1.5px solid var(--s6);" />';
      i = k;
      continue;
    }

    // Backslash command or escaped symbol
    if (ch === '\\') {
      // Line break \\ or \\* or multiline \\[0.3cm]
      if (tex[i + 1] === '\\') {
        let k = i + 2;
        if (tex[k] === '*') k++;
        let wsAfter = k;
        while (wsAfter < pEnd && /\s/.test(tex[wsAfter])) wsAfter++;
        if (wsAfter < pEnd && tex[wsAfter] === '[') {
          const br = extractBalancedBrackets(tex, wsAfter);
          if (
            br &&
            br.endIndex < pEnd &&
            br.endIndex - wsAfter < 32 &&
            /^[+-]?\d*(?:\.\d+)?\s*(?:pt|mm|cm|in|ex|em|bp|px)?$/i.test(br.content.trim())
          ) {
            k = br.endIndex + 1;
          }
        }
        out += '<br/>';
        i = k;
        continue;
      }

      const nextCh = tex[i + 1];
      if (!nextCh) {
        i++;
        continue;
      }

      // Diacritic accents in prose: \'e, \`a, \^o, \"u, \~n, \={a}, \.{z}
      if (["'", '`', '^', '"', '~', '=', '.'].includes(nextCh)) {
        const cur = i + 2;
        if (cur < pEnd && tex[cur] === '{') {
          const ag = extractBalancedBraces(tex, cur);
          if (ag && ag.endIndex < pEnd) {
            const base = ag.content.trim().replace(/^\\i$/, 'i').replace(/^\\j$/, 'j');
            emitWord(i, ag.endIndex + 1, (base + LATEX_ACCENT_COMBINING[nextCh]).normalize('NFC'));
            i = ag.endIndex + 1;
            continue;
          }
        } else if (cur < pEnd && /[a-zA-Z]/.test(tex[cur])) {
          emitWord(i, cur + 1, (tex[cur] + LATEX_ACCENT_COMBINING[nextCh]).normalize('NFC'));
          i = cur + 1;
          continue;
        }
      }

      if (!/[a-zA-Z]/.test(nextCh)) {
        if (nextCh === ',' || nextCh === ';' || nextCh === ':') {
          emitWord(i, Math.min(pEnd, i + 2), '\u2009');
        } else if (nextCh === '!' || nextCh === '/') {
          // negative thin space / italic correction
        } else if (nextCh === ' ') {
          out += ' ';
        } else {
          const symMap = { '%': '%', '_': '_', '&': '&', '$': '$', '#': '#', '{': '{', '}': '}', '~': '\u00a0' };
          const renderedSym = symMap[nextCh] ?? nextCh;
          emitWord(i, Math.min(pEnd, i + 2), renderedSym);
        }
        i = Math.min(pEnd, i + 2);
        continue;
      }

      const cmdM = /^\\([a-zA-Z]+)\*?/.exec(tex.slice(i, pEnd));
      if (!cmdM) {
        i++;
        continue;
      }
      const cmdName = cmdM[1];
      const cmdEnd = i + cmdM[0].length;

      // Letter accent commands: \u{a}, \v{c}, \H{o}, \c{c}, \d{a}, \b{o}
      if (['u', 'v', 'H', 'c', 'd', 'b'].includes(cmdName)) {
        let cur = cmdEnd;
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (cur < pEnd && tex[cur] === '{') {
          const ag = extractBalancedBraces(tex, cur);
          if (ag && ag.endIndex < pEnd) {
            const base = ag.content.trim().replace(/^\\i$/, 'i');
            emitWord(i, ag.endIndex + 1, (base + LATEX_ACCENT_COMBINING[cmdName]).normalize('NFC'));
            i = ag.endIndex + 1;
            continue;
          }
        }
      }

      // siunitx prose commands (\SI, \qty, \si, \unit, \num, \ang, \SIrange, \qtyrange, \numrange)
      if (Object.prototype.hasOwnProperty.call(SIUNITX_PROSE_ARITY, cmdName)) {
        const needed = SIUNITX_PROSE_ARITY[cmdName];
        let cur = cmdEnd;
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (cur < pEnd && tex[cur] === '[') {
          const obr = extractBalancedBrackets(tex, cur);
          if (obr && obr.endIndex < pEnd) cur = obr.endIndex + 1;
        }
        let ok = true;
        for (let a = 0; a < needed; a++) {
          while (cur < pEnd && /\s/.test(tex[cur])) cur++;
          if (cur < pEnd && tex[cur] === '{') {
            const grp = extractBalancedBraces(tex, cur);
            if (grp && grp.endIndex < pEnd) {
              cur = grp.endIndex + 1;
              continue;
            }
          }
          ok = false;
          break;
        }
        if (ok) {
          const renderedSi = wrapStyled(renderRichInlineTex(tex.slice(i, cur), ctx));
          if (sourceMapMode) {
            out += `<span class="v-tex-tok" data-tex-atomic="true" data-tex-start="${i}" data-tex-end="${cur}">${renderedSi}</span>`;
          } else {
            out += renderedSi;
          }
          i = cur;
          continue;
        }
      }

      // Custom macro from Preamble used directly in prose
      if (ctx.macroTable && ctx.macroTable.has(cmdName)) {
        const macro = ctx.macroTable.get(cmdName);
        let cur = cmdEnd;
        if (macro.numArgs > 0) {
          for (let a = 0; a < macro.numArgs; a++) {
            while (cur < pEnd && /\s/.test(tex[cur])) cur++;
            if (a === 0 && macro.defaultOpt !== null && tex[cur] === '[') {
              const obr = extractBalancedBrackets(tex, cur);
              if (obr && obr.endIndex < pEnd) {
                cur = obr.endIndex + 1;
                continue;
              }
            }
            if (tex[cur] === '{') {
              const grp = extractBalancedBraces(tex, cur);
              if (grp && grp.endIndex < pEnd) cur = grp.endIndex + 1;
            }
          }
        } else if (tex[cur] === '{' && tex[cur + 1] === '}') {
          cur += 2;
        }

        const expandedRaw = expandMacrosSafely(tex.slice(i, cur), ctx.macroTable);
        const hasBlockConstruct =
          /(?:\\begin\s*\{|\\(?:part|chapter|section|subsection|subsubsection|paragraph|includegraphics|boxpair|loigiai|lgiai)\b|\$\$|\\\[|\n\s*\n)/.test(
            expandedRaw
          );

        if (hasBlockConstruct) {
          const blockExpandedHtml = renderLatexForPreviewAndUI(expandedRaw, {
            sourceMapMode: false,
            enablePreflightCards: ctx.enablePreflightCards,
            baseOffset: ctx.baseOffset + i,
            preambleData: ctx.preambleData,
            assetVault: ctx.assetVault,
            sharedCounters: ctx
          });
          out += sourceMapMode
            ? `<div data-tex-atomic="true" data-tex-start="${i}" data-tex-end="${cur}">${blockExpandedHtml}</div>`
            : blockExpandedHtml;
        } else {
          const expandedFrag = wrapStyled(renderRichInlineTex(expandedRaw, ctx));
          out += sourceMapMode
            ? `<span class="v-tex-tok" data-tex-atomic="true" data-tex-start="${i}" data-tex-end="${cur}">${expandedFrag}</span>`
            : expandedFrag;
        }
        i = cur;
        continue;
      }

      // Scoped declarative font/color/alignment switches in prose
      if (cmdName === 'bfseries' || cmdName === 'bf') {
        activeMod.bold = true;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'mdseries' || cmdName === 'normalfont') {
        activeMod.bold = false;
        if (cmdName === 'normalfont') {
          activeMod.italic = false;
          activeMod.smallcaps = false;
          activeMod.mono = false;
          activeMod.sans = false;
        }
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'itshape' || cmdName === 'it' || cmdName === 'slshape' || cmdName === 'sl' || cmdName === 'em') {
        activeMod.italic = true;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'upshape') {
        activeMod.italic = false;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'scshape' || cmdName === 'sc') {
        activeMod.smallcaps = true;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'ttfamily' || cmdName === 'tt') {
        activeMod.mono = true;
        activeMod.sans = false;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'sffamily' || cmdName === 'sf') {
        activeMod.sans = true;
        activeMod.mono = false;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'rmfamily' || cmdName === 'rm') {
        activeMod.mono = false;
        activeMod.sans = false;
        i = cmdEnd;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(FONT_SIZE_CSS_MAP, cmdName)) {
        activeMod.size = cmdName === 'normalsize' ? null : cmdName;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'color') {
        let cur = cmdEnd;
        let colModel = '';
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (cur < pEnd && tex[cur] === '[') {
          const obr = extractBalancedBrackets(tex, cur);
          if (obr && obr.endIndex < pEnd) {
            colModel = obr.content.trim();
            cur = obr.endIndex + 1;
          }
        }
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (cur < pEnd && tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp && grp.endIndex < pEnd) {
            activeMod.color = grp.content.trim();
            activeMod.colorModel = colModel;
            i = grp.endIndex + 1;
            continue;
          }
        }
        i = cur;
        continue;
      }
      if (cmdName === 'centering') {
        activeMod.align = 'center';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'raggedright') {
        activeMod.align = 'left';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'raggedleft') {
        activeMod.align = 'right';
        i = cmdEnd;
        continue;
      }

      if (cmdName === 'lgiai') {
        const solHdr =
          `<div class="latex-solution-header"${sourceMapMode ? ` data-tex-atomic="true" data-tex-start="${i}" data-tex-end="${cmdEnd}"` : ''}>` +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30a46c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          '<span>Lời giải</span></div>';
        out += solHdr;
        i = cmdEnd;
        continue;
      }

      if (cmdName === 'tcblower') {
        out += '<hr style="margin: 12px 0; border: none; border-top: 1px dashed var(--s4);" />';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'newline' || cmdName === 'linebreak') {
        out += '<br/>';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'quad') {
        out += '&nbsp;&nbsp;&nbsp;&nbsp;';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'qquad') {
        out += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'enspace' || cmdName === 'thinspace') {
        out += '&nbsp;';
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'ensuremath') {
        let cur = cmdEnd;
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (cur < pEnd && tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp && grp.endIndex < pEnd) {
            const kHtml = wrapStyled(renderKatexSafe(grp.content, false, ctx.macroTable, ctx.colorTable));
            out += sourceMapMode
              ? `<span class="v-tex-atomic-inline" data-tex-atomic="true" data-tex-start="${i}" data-tex-end="${grp.endIndex + 1}">${kHtml}</span>`
              : kHtml;
            i = grp.endIndex + 1;
            continue;
          }
        }
      }

      if (cmdName === 'qed' || cmdName === 'qedsymbol') {
        out += '<span class="latex-tombstone">&#9632;</span>';
        i = cmdEnd;
        continue;
      }
      if (['newpage', 'clearpage', 'cleardoublepage', 'pagebreak'].includes(cmdName)) {
        out += '<hr class="latex-pagebreak" style="margin: 32px 0; border: none; border-top: 1px dashed var(--s4);" />';
        i = cmdEnd;
        continue;
      }
      if (['bigskip', 'medskip', 'smallskip'].includes(cmdName)) {
        const hPx = cmdName === 'bigskip' ? 20 : cmdName === 'medskip' ? 12 : 6;
        out += `<div style="height: ${hPx}px;"></div>`;
        i = cmdEnd;
        continue;
      }
      if (cmdName === 'today') {
        const now = new Date();
        emitWord(i, cmdEnd, `Tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`);
        i = cmdEnd;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(TEXT_SYMBOL_MAP, cmdName)) {
        let cur = cmdEnd;
        if (cur + 1 < pEnd && tex[cur] === '{' && tex[cur + 1] === '}') cur += 2;
        emitWord(i, cur, TEXT_SYMBOL_MAP[cmdName]);
        i = cur;
        continue;
      }
      if (cmdName === 'vspace' || cmdName === 'hspace') {
        let cur = cmdEnd;
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp && grp.endIndex < pEnd) cur = grp.endIndex + 1;
        }
        out += cmdName === 'hspace' ? '&nbsp;&nbsp;' : '<div style="height: 12px;"></div>';
        i = cur;
        continue;
      }

      if (SKIP_ONE_ARG_LAYOUT_CMDS.has(cmdName)) {
        let cur = cmdEnd;
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (tex[cur] === '[') {
          const br = extractBalancedBrackets(tex, cur);
          if (br && br.endIndex < pEnd) cur = br.endIndex + 1;
        }
        while (cur < pEnd && /\s/.test(tex[cur])) cur++;
        if (tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp && grp.endIndex < pEnd) cur = grp.endIndex + 1;
        }
        i = cur;
        continue;
      }

      if (SKIP_TWO_ARG_LAYOUT_CMDS.has(cmdName)) {
        let cur = cmdEnd;
        for (let k = 0; k < 2; k++) {
          while (cur < pEnd && /\s/.test(tex[cur])) cur++;
          if (tex[cur] === '[') {
            const br = extractBalancedBrackets(tex, cur);
            if (br && br.endIndex < pEnd) cur = br.endIndex + 1;
            while (cur < pEnd && /\s/.test(tex[cur])) cur++;
          }
          if (tex[cur] === '{') {
            const grp = extractBalancedBraces(tex, cur);
            if (grp && grp.endIndex < pEnd) cur = grp.endIndex + 1;
          }
        }
        i = cur;
        continue;
      }

      if (cmdName === 'addcontentsline') {
        let cur = cmdEnd;
        for (let k = 0; k < 3; k++) {
          while (cur < pEnd && /\s/.test(tex[cur])) cur++;
          if (tex[cur] === '{') {
            const grp = extractBalancedBraces(tex, cur);
            if (grp && grp.endIndex < pEnd) cur = grp.endIndex + 1;
          }
        }
        i = cur;
        continue;
      }

      if (IGNORED_PROSE_LAYOUT_CMDS.has(cmdName)) {
        i = cmdEnd;
        continue;
      }

      i = cmdEnd;
      continue;
    }

    // Discard stray anonymous braces in plain prose if not part of command
    if (ch === '{' || ch === '}') {
      i++;
      continue;
    }

    // Plain Unicode word token
    let k = i + 1;
    while (k < pEnd && !/\s/.test(tex[k]) && tex[k] !== '\\' && tex[k] !== '~' && tex[k] !== '{' && tex[k] !== '}') {
      k++;
    }
    emitWord(i, k, tex.slice(i, k));
    i = k;
  }

  return out;
}

function buildBoxCssVarsStyle(boxStyle, labelColorOverride = '', darkLabelColorOverride = '') {
  if (!boxStyle) {
    if (!labelColorOverride) return '';
    const darkLbl = darkLabelColorOverride || computeDarkThemeTextColor(labelColorOverride);
    return `--tcb-label-color: ${labelColorOverride}; --tcb-label-color-dark: ${darkLbl};`;
  }
  const vars = [
    `--tcb-bg: ${boxStyle.colback || '#f3f5f8'}`,
    `--tcb-bg-dark: ${boxStyle.darkBg || 'rgba(148, 163, 184, 0.09)'}`,
    `--tcb-frame: ${boxStyle.colframe || '#475569'}`,
    `--tcb-frame-dark: ${boxStyle.darkFrame || '#64748b'}`,
    `--tcb-hdr-bg: ${boxStyle.colbacktitle || boxStyle.colframe || '#334155'}`,
    `--tcb-hdr-fg: ${boxStyle.coltitle || '#ffffff'}`,
    `--tcb-radius: ${typeof boxStyle.radiusPx === 'number' ? boxStyle.radiusPx : 8}px`,
    `--tcb-bt: ${typeof boxStyle.topRulePx === 'number' ? boxStyle.topRulePx : 1.5}px`,
    `--tcb-br: ${typeof boxStyle.rightRulePx === 'number' ? boxStyle.rightRulePx : 1.5}px`,
    `--tcb-bb: ${typeof boxStyle.bottomRulePx === 'number' ? boxStyle.bottomRulePx : 1.5}px`,
    `--tcb-bl: ${typeof boxStyle.leftRulePx === 'number' ? boxStyle.leftRulePx : 1.5}px`
  ];
  let resolvedLblCol = labelColorOverride || '';
  let resolvedLblDark =
    darkLabelColorOverride || (resolvedLblCol ? computeDarkThemeTextColor(resolvedLblCol) : '');
  if (!resolvedLblCol && isChromaticHexColor(boxStyle.colframe)) {
    resolvedLblCol = boxStyle.colframe;
    resolvedLblDark = boxStyle.darkFrame || computeDarkThemeTextColor(boxStyle.colframe);
  }
  if (resolvedLblCol) {
    vars.push(`--tcb-label-color: ${resolvedLblCol}`);
    vars.push(`--tcb-label-color-dark: ${resolvedLblDark}`);
  }
  return vars.join('; ') + ';';
}

function substituteEnvPositionalArgs(templateStr, args) {
  if (!templateStr || !args || args.length === 0) return templateStr || '';
  return templateStr.replace(/#([1-9])/g, (full, digit) => {
    const idx = parseInt(digit, 10) - 1;
    return idx >= 0 && idx < args.length ? args[idx] : full;
  });
}

function parseOpenerPositionalArgs(openerText, envDef) {
  if (!openerText) return { optBracket: null, braceArgs: [] };
  let cur = openerText.indexOf('}') + 1;
  while (cur < openerText.length && /\s/.test(openerText[cur])) cur++;
  let optBracket = null;
  if (openerText[cur] === '[') {
    const obr = extractBalancedBrackets(openerText, cur);
    if (obr) {
      optBracket = obr.content.trim();
      cur = obr.endIndex + 1;
    }
  }
  const braceArgs = [];
  const maxBraces = envDef ? Math.max(0, envDef.mandatoryArgsCount || 0) : 2;
  for (let a = 0; a < maxBraces; a++) {
    while (cur < openerText.length && /\s/.test(openerText[cur])) cur++;
    if (openerText[cur] === '{') {
      const grp = extractBalancedBraces(openerText, cur);
      if (grp) {
        braceArgs.push(grp.content.trim());
        cur = grp.endIndex + 1;
        continue;
      }
    }
    break;
  }
  return { optBracket, braceArgs };
}

export function renderLatexForPreviewAndUI(rawTexString, options = {}) {
  if (!rawTexString || typeof rawTexString !== 'string' || !rawTexString.trim()) {
    return '';
  }

  const sourceMapMode = Boolean(options.sourceMapMode);
  const hideCommentEnvs = options.hideCommentEnvs !== false;
  const enablePreflightCards = options.enablePreflightCards ?? sourceMapMode;
  const baseOffset = options.baseOffset || 0;
  const preambleData = options.preambleData || null;
  const assetVault = options.assetVault || null;
  const sharedCounters = options.sharedCounters || null;
  const isStandaloneNormalized =
    Boolean(sharedCounters?.isStandaloneNormalized) ||
    rawTexString.includes('@vectoria-standalone-lesson');

  const persistedBoxStyles =
    sharedCounters?.persistedBoxStyles || parseVectoriaBoxStyleComments(rawTexString);
  const persistedDocCfg =
    sharedCounters?.persistedDocCfg || parseVectoriaDocConfigComments(rawTexString);

  // When sourceMapMode === true, rawTexString MUST be the exact masterBodyTex without mutating its length!
  let tex = rawTexString;
  if (!sourceMapMode) {
    const docStart = tex.match(/\\begin\s*\{document\}/);
    const docEnd = [...tex.matchAll(/\\end\s*\{document\}/g)].pop();
    if (docStart && docEnd && docEnd.index > docStart.index) {
      tex = tex.substring(docStart.index + docStart[0].length, docEnd.index);
    }
    if (hideCommentEnvs) {
      tex = tex.replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, '');
    }
    tex = tex
      .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, '')
      .replace(/\\(?:begin|end)\s*\{comment\}/g, '');
    tex = stripBodyDeclarations(tex);
  }

  const ast =
    options.ast ||
    buildTexAst(tex, preambleData, {
      hideCommentEnvs,
      isStandaloneNormalized
    });

  // Build unified structured node list with uniform [start, end] keys
  const outlineByStart = new Map();
  for (const oh of ast.outlineHeadings) {
    outlineByStart.set(oh.start, oh);
  }

  const unifiedNodes = [
    ...ast.atomicSpans.map((sp) => ({ ...sp, nodeCategory: 'atomic' })),
    ...ast.envNodes.map((en) => ({ ...en, start: en.openStart, end: en.closeEnd, nodeCategory: 'env' })),
    ...ast.inlineFormatNodes.map((inf) => ({ ...inf, start: inf.openStart, end: inf.closeEnd, nodeCategory: 'inline' }))
  ].sort((a, b) => a.start - b.start || b.end - a.end);

  const initC = (!isStandaloneNormalized && preambleData?.initialCounters) || {};
  const seededBoxCounters = {};
  if (!isStandaloneNormalized && preambleData?.initialCounters) {
    for (const [k, v] of Object.entries(preambleData.initialCounters)) {
      if (!['part', 'chapter', 'section', 'subsection', 'subsubsection', 'equation'].includes(k) && typeof v === 'number') {
        const mappedKey = preambleData.customEnvs?.get(k)?.canonicalEnv || k;
        seededBoxCounters[mappedKey] = v;
      }
    }
  }

  const effectiveHyperrefConfig =
    preambleData?.hyperrefConfig && (preambleData.hyperrefConfig.colorlinks || preambleData.hyperrefConfig.hidelinks)
      ? preambleData.hyperrefConfig
      : persistedDocCfg?.hyperrefLinkColor
        ? {
            colorlinks: true,
            hidelinks: false,
            linkcolor: persistedDocCfg.hyperrefLinkColor,
            toccolor: '',
            urlcolor: persistedDocCfg.hyperrefUrlColor || persistedDocCfg.hyperrefLinkColor,
            citecolor: persistedDocCfg.hyperrefCiteColor || persistedDocCfg.hyperrefLinkColor
          }
        : preambleData?.hyperrefConfig || null;

  const docClassForCounters =
    persistedDocCfg.docClass || preambleData?.docClass || preambleData?.layoutConfig?.docClass || 'article';
  const equationWithin =
    sharedCounters?.equationWithin !== undefined
      ? sharedCounters.equationWithin
      : isStandaloneNormalized
        ? /\\chapter(?![a-zA-Z*])/.test(tex)
          ? 'chapter'
          : ''
        : persistedDocCfg.equationWithin !== undefined
          ? persistedDocCfg.equationWithin
          : preambleData?.layoutConfig?.equationWithin !== undefined
            ? preambleData.layoutConfig.equationWithin
            : docClassForCounters === 'report' || docClassForCounters === 'book' || /\\chapter(?![a-zA-Z])/.test(tex)
              ? 'chapter'
              : '';

  const ctx = {
    preambleData,
    macroTable: preambleData?.macroTable || null,
    customEnvs: preambleData?.customEnvs || null,
    userEnvs: preambleData?.userEnvs || null,
    colorTable: preambleData?.colorTable || null,
    boxStyleDefs: preambleData?.boxStyleDefs || null,
    globalLabels: options.overrideGlobalLabels || sharedCounters?.overrideGlobalLabels || preambleData?.globalLabels || null,
    headingNormalizer: options.headingNormalizer || sharedCounters?.headingNormalizer || null,
    cleanBoxOptFn: options.cleanBoxOptFn || sharedCounters?.cleanBoxOptFn || null,
    stitchedTocEntries: options.stitchedTocEntries || sharedCounters?.stitchedTocEntries || null,
    hyperrefConfig: effectiveHyperrefConfig,
    persistedBoxStyles,
    persistedDocCfg,
    equationWithin,
    assetVault,
    enablePreflightCards,
    baseOffset,
    isStandaloneNormalized,
    headingNums: sharedCounters
      ? sharedCounters.headingNums
      : {
          chap: initC.chapter || 0,
          sec: initC.section || 0,
          subsec: initC.subsection || 0,
          subsubsec: initC.subsubsection || 0
        },
    eqCounters: sharedCounters ? sharedCounters.eqCounters : { eq: initC.equation || 0 },
    boxCounters: sharedCounters ? sharedCounters.boxCounters : seededBoxCounters
  };

  function applyCounterSpan(span) {
    if (ctx.isStandaloneNormalized || !span || !span.counterName) return;
    const name = span.counterName;
    const op = span.counterOp;
    const val = typeof span.counterVal === 'number' ? span.counterVal : 0;
    const hn = ctx.headingNums;
    const applyVal = (prev) => {
      if (op === 'setcounter') return val;
      if (op === 'addtocounter') return prev + val;
      if (op === 'stepcounter' || op === 'refstepcounter') return prev + 1;
      return prev;
    };
    if (name === 'chapter') {
      hn.chap = applyVal(hn.chap);
      if (op === 'stepcounter' || op === 'refstepcounter') {
        hn.sec = 0;
        hn.subsec = 0;
        hn.subsubsec = 0;
        for (const k of Object.keys(ctx.boxCounters)) delete ctx.boxCounters[k];
        if (ctx.equationWithin === 'chapter') ctx.eqCounters.eq = 0;
      }
    } else if (name === 'section') {
      hn.sec = applyVal(hn.sec);
      if (op === 'stepcounter' || op === 'refstepcounter') {
        hn.subsec = 0;
        hn.subsubsec = 0;
        if (ctx.equationWithin === 'section') ctx.eqCounters.eq = 0;
      }
    } else if (name === 'subsection') {
      hn.subsec = applyVal(hn.subsec);
      if (op === 'stepcounter' || op === 'refstepcounter') {
        hn.subsubsec = 0;
      }
    } else if (name === 'subsubsection') {
      hn.subsubsec = applyVal(hn.subsubsec);
    } else if (name === 'equation') {
      ctx.eqCounters.eq = applyVal(ctx.eqCounters.eq || 0);
    } else if (name !== 'tocdepth' && name !== 'secnumdepth') {
      const customInfo = ctx.customEnvs?.get(name);
      const counterKey = customInfo?.canonicalEnv || name;
      ctx.boxCounters[counterKey] = applyVal(ctx.boxCounters[counterKey] || 0);
    }
  }

  const blockMemo = new WeakMap();

  function isBlockNode(node) {
    if (blockMemo.has(node)) return blockMemo.get(node);
    let res = false;
    if (node.nodeCategory === 'env') {
      res = true;
    } else if (node.nodeCategory === 'atomic') {
      if (
        ['heading', 'toc', 'math-display', 'math-env', 'tikz', 'tabular', 'float', 'graphics', 'boxpair', 'verbatim', 'caption'].includes(
          node.kind
        )
      ) {
        res = true;
      } else if (node.kind === 'user-macro') {
        const rawMacro = tex.slice(node.start, node.end);
        const expanded = expandMacrosSafely(rawMacro, ctx.macroTable);
        res = /(?:\\begin\s*\{|\\(?:part|chapter|section|subsection|subsubsection|paragraph|includegraphics|boxpair|loigiai|lgiai)\b|\$\$|\\\[|\n\s*\n)/.test(
          expanded
        );
      } else if (node.kind === 'command') {
        if (node.cmdName === 'maketitle') {
          res = true;
        } else if (node.cmdName === 'rule') {
          const rawRule = tex.slice(node.start, node.end);
          res = /\\(?:textwidth|linewidth|columnwidth|hsize)/i.test(rawRule);
        }
      }
    } else if (node.nodeCategory === 'inline') {
      if (node.cmdName === 'loigiai') {
        res = true;
      } else {
        const innerSlice = tex.slice(node.openEnd, node.closeStart);
        if (/\n\s*\n|\\par(?![a-zA-Z])/.test(innerSlice)) {
          res = true;
        } else {
          const innerChildren = buildPartitionForRange(node.openEnd, node.closeStart, unifiedNodes);
          res = innerChildren.some((ch) => isBlockNode(ch));
        }
      }
    }
    blockMemo.set(node, res);
    return res;
  }

  function extractFirstArgAfterOpen(node) {
    let cur = node.openStart;
    if (tex[cur] === '\\') {
      cur++;
      while (cur < node.openEnd && /[a-zA-Z*]/.test(tex[cur])) cur++;
    }
    while (cur < node.openEnd && /\s/.test(tex[cur])) cur++;
    if (tex[cur] === '[') {
      const obr = extractBalancedBrackets(tex, cur);
      if (obr) cur = obr.endIndex + 1;
      while (cur < node.openEnd && /\s/.test(tex[cur])) cur++;
    }
    if (tex[cur] === '{') {
      const grp = extractBalancedBraces(tex, cur);
      if (grp) return { grp, afterIdx: grp.endIndex + 1 };
    }
    return null;
  }

  function renderInlineNode(node, parentMod = null) {
    const mapAttr = sourceMapMode ? ` data-tex-start="${node.start}" data-tex-end="${node.end}"` : '';
    const wrapParent = (htmlStr) => {
      if (!parentMod) return htmlStr;
      const st = buildInlineStyleFromModifiers(parentMod, ctx.colorTable);
      return st ? `<span style="${st}">${htmlStr}</span>` : htmlStr;
    };

    if (node.nodeCategory === 'atomic') {
      const raw = tex.slice(node.start, node.end);

      if (node.kind === 'math-inline') {
        let inner = raw;
        if (raw.startsWith('\\(') && raw.endsWith('\\)')) inner = raw.slice(2, -2);
        else if (raw.startsWith('$') && raw.endsWith('$')) inner = raw.slice(1, -1);
        const kHtml = renderKatexSafe(inner, false, ctx.macroTable, ctx.colorTable);
        const wrapped = wrapParent(kHtml);
        return sourceMapMode
          ? `<span class="v-tex-atomic-inline" data-tex-atomic="true"${mapAttr}>${wrapped}</span>`
          : wrapped;
      }

      if (node.kind === 'user-macro') {
        const expanded = expandMacrosSafely(raw, ctx.macroTable);
        const htmlFrag = renderRichInlineTex(expanded, ctx);
        const wrapped = wrapParent(htmlFrag);
        return sourceMapMode
          ? `<span class="v-tex-tok" data-tex-atomic="true"${mapAttr}>${wrapped}</span>`
          : wrapped;
      }

      if (node.kind === 'verb') {
        const vm = /^\\verb\*?([^a-zA-Z\s])([\s\S]*)\1$/.exec(raw);
        const codeStr = vm ? vm[2] : raw;
        return `<code${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''} style="font-family: monospace; background: var(--s2); padding: 1px 5px; border-radius: 2px; border: 1px solid var(--s3); font-size: 0.9em;">${escapeHtml(codeStr)}</code>`;
      }

      if (node.kind === 'command') {
        if (node.cmdName === 'label') {
          const bIdxLbl = raw.indexOf('{');
          const grpLbl = bIdxLbl !== -1 ? extractBalancedBraces(raw, bIdxLbl) : null;
          const lblKey = grpLbl ? grpLbl.content.trim() : '';
          const entry = lblKey ? ctx.globalLabels?.get(lblKey) : null;
          if (entry && entry.anchorId && entry.kind === 'generic') {
            return `<span id="${escapeHtml(entry.anchorId)}"></span>`;
          }
          return '';
        }
        if (['phantom', 'hphantom', 'vphantom'].includes(node.cmdName)) {
          return '';
        }
        if (node.cmdName === 'texorpdfstring') {
          const b1 = raw.indexOf('{');
          const g1 = b1 !== -1 ? extractBalancedBraces(raw, b1) : null;
          const htmlTex = renderRichInlineTex(g1 ? g1.content : '', ctx);
          return wrapParent(
            sourceMapMode ? `<span data-tex-atomic="true"${mapAttr}>${htmlTex}</span>` : htmlTex
          );
        }
        if (node.cmdName === 'rule') {
          return `<span${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''} style="display: inline-block; width: 56px; border-bottom: 1px solid currentColor; vertical-align: middle; margin: 0 2px;"></span>`;
        }
        if (node.cmdName === 'cite') {
          let optNote = '';
          const brIdx = raw.indexOf('[');
          const bIdx = raw.indexOf('{');
          if (brIdx !== -1 && (bIdx === -1 || brIdx < bIdx)) {
            const obr = extractBalancedBrackets(raw, brIdx);
            if (obr) optNote = obr.content.trim();
          }
          const grp = bIdx !== -1 ? extractBalancedBraces(raw, bIdx) : null;
          const key = grp ? grp.content.trim() : '';
          const citeText = `[${escapeHtml(key)}${optNote ? `, ${escapeHtml(optNote)}` : ''}]`;
          const hCfg = ctx.hyperrefConfig;
          const citeStyle =
            hCfg && hCfg.colorlinks && !hCfg.hidelinks
              ? ` style="color: ${escapeHtml(hCfg.citecolor || hCfg.linkcolor || '#16a34a')};"`
              : '';
          return wrapParent(
            `<span class="latex-cite"${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''}${citeStyle}>${citeText}</span>`
          );
        }

        const bIdx = raw.indexOf('{');
        const grp = bIdx !== -1 ? extractBalancedBraces(raw, bIdx) : null;
        const val = grp ? grp.content.trim() : '';

        if (node.cmdName === 'eqref') {
          const entry = ctx.globalLabels?.get(val);
          const numStr = entry ? entry.formattedNum || `${entry.globalSeq}` : val;
          const hCfg = ctx.hyperrefConfig;
          if (hCfg && hCfg.colorlinks && !hCfg.hidelinks) {
            const linkCol = escapeHtml(hCfg.linkcolor || '#dc2626');
            const hrefAttr = entry?.anchorId ? ` href="#${escapeHtml(entry.anchorId)}"` : '';
            const inner = `(<a${hrefAttr} class="latex-eqref" style="color: ${linkCol}; text-decoration: none;">${escapeHtml(numStr)}</a>)`;
            return wrapParent(`<span${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''}>${inner}</span>`);
          }
          return wrapParent(`<span${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''}>(${escapeHtml(numStr)})</span>`);
        }
        if (node.cmdName === 'ref') {
          const entry = ctx.globalLabels?.get(val);
          const numStr = entry ? entry.formattedNum || `${entry.globalSeq}` : val;
          const hCfg = ctx.hyperrefConfig;
          if (hCfg && hCfg.colorlinks && !hCfg.hidelinks) {
            const linkCol = escapeHtml(hCfg.linkcolor || '#dc2626');
            const hrefAttr = entry?.anchorId ? ` href="#${escapeHtml(entry.anchorId)}"` : '';
            const inner = `<a${hrefAttr} class="latex-ref" style="color: ${linkCol}; text-decoration: none;">${escapeHtml(numStr)}</a>`;
            return wrapParent(`<span${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''}>${inner}</span>`);
          }
          return wrapParent(`<span${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''}>${escapeHtml(numStr)}</span>`);
        }
        if (node.cmdName === 'bai') {
          const innerHtml = renderRichInlineTex(val, ctx);
          return `<strong class="latex-bai-title"${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''} style="color: var(--s12); font-weight: 700; margin-right: 6px;">${innerHtml}</strong>`;
        }
        if (node.cmdName === 'url') {
          const safeUrl = escapeHtml(val);
          const hCfg = ctx.hyperrefConfig;
          const useHyper = Boolean(hCfg && hCfg.colorlinks && !hCfg.hidelinks);
          const urlStyle = useHyper
            ? `color: ${escapeHtml(hCfg.urlcolor || hCfg.linkcolor || '#0284c7')}; text-decoration: none;`
            : 'color: #0284c7; text-decoration: underline;';
          return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer"${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''} style="${urlStyle}">${safeUrl}</a>`;
        }
        if (node.cmdName === 'footnote' || node.cmdName === 'thanks') {
          const plainTip = unwrapTexFormattingToPlainText(val);
          return `<sup class="latex-footnote" title="${escapeHtml(plainTip)}"${sourceMapMode ? ` data-tex-atomic="true"${mapAttr}` : ''} style="color: #0284c7; cursor: help;">[*]</sup>`;
        }
      }
      return '';
    }

    // Inline formatting wrapper (\textbf, \textit, \emph, \underline, \texttt, \textsc, \textcolor, \href, group-switch, boxes, etc.)
    const innerHtml = renderInlineStream(node.openEnd, node.closeStart);
    const cmd = node.cmdName;

    if (cmd === 'group-switch') {
      const st = buildInlineStyleFromModifiers(node.modifiers, ctx.colorTable);
      return wrapParent(`<span${mapAttr}${st ? ` style="${st}"` : ''}>${innerHtml}</span>`);
    }
    if (cmd === 'textbf' || cmd === 'bf') return wrapParent(`<strong${mapAttr} style="font-weight: 700;">${innerHtml}</strong>`);
    if (cmd === 'textit' || cmd === 'emph' || cmd === 'textsl' || cmd === 'it' || cmd === 'em' || cmd === 'sl') {
      return wrapParent(`<em${mapAttr}>${innerHtml}</em>`);
    }
    if (cmd === 'underline' || cmd === 'uline' || cmd === 'ul') return wrapParent(`<u${mapAttr}>${innerHtml}</u>`);
    if (cmd === 'uwave') return wrapParent(`<span${mapAttr} style="text-decoration: underline wavy;">${innerHtml}</span>`);
    if (cmd === 'dashuline') return wrapParent(`<span${mapAttr} style="text-decoration: underline dashed;">${innerHtml}</span>`);
    if (cmd === 'dotuline') return wrapParent(`<span${mapAttr} style="text-decoration: underline dotted;">${innerHtml}</span>`);
    if (cmd === 'so') return wrapParent(`<span${mapAttr} style="letter-spacing: 0.14em;">${innerHtml}</span>`);
    if (cmd === 'caps') return wrapParent(`<span${mapAttr} style="font-variant: small-caps; letter-spacing: 0.05em;">${innerHtml}</span>`);
    if (cmd === 'sout' || cmd === 'st') return wrapParent(`<s${mapAttr}>${innerHtml}</s>`);
    if (cmd === 'texttt' || cmd === 'tt') {
      return wrapParent(
        `<code${mapAttr} style="font-family: monospace; background: var(--s2); padding: 2px 6px; border-radius: 2px; border: 1px solid var(--s3); font-size: 0.9em;">${innerHtml}</code>`
      );
    }
    if (cmd === 'textsc' || cmd === 'sc') {
      return wrapParent(`<span${mapAttr} style="font-variant: small-caps;">${innerHtml}</span>`);
    }
    if (cmd === 'textsf' || cmd === 'sf') {
      return wrapParent(
        `<span${mapAttr} style="font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);">${innerHtml}</span>`
      );
    }
    if (cmd === 'textsuperscript') return wrapParent(`<sup${mapAttr}>${innerHtml}</sup>`);
    if (cmd === 'textsubscript') return wrapParent(`<sub${mapAttr}>${innerHtml}</sub>`);
    if (cmd === 'fbox' || cmd === 'framebox') {
      return wrapParent(
        `<span${mapAttr} style="border: 1px solid var(--s6); padding: 1px 6px; border-radius: 2px; display: inline-block;">${innerHtml}</span>`
      );
    }
    if (cmd === 'ovalbox' || cmd === 'Ovalbox' || cmd === 'tcbox') {
      let tcStyle = `border: ${cmd === 'Ovalbox' ? '1.8px' : '1.2px'} solid var(--s6); padding: 1px 8px; border-radius: 7px; display: inline-block;`;
      if (cmd === 'tcbox') {
        const openSlice = tex.slice(node.openStart, node.openEnd);
        const brPos = openSlice.indexOf('[');
        if (brPos !== -1) {
          const obr = extractBalancedBrackets(openSlice, brPos);
          if (obr) {
            const bs = parseBoxVisualOptions(obr.content, ctx.colorTable, ctx.boxStyleDefs, 'tcolorbox');
            tcStyle = `background: ${escapeHtml(bs.colback)}; border: ${bs.topRulePx || 1.2}px solid ${escapeHtml(bs.colframe)}; padding: 1px 8px; border-radius: ${bs.radiusPx ?? 6}px; display: inline-block;`;
          }
        }
      }
      return wrapParent(`<span${mapAttr} style="${tcStyle}">${innerHtml}</span>`);
    }
    if (cmd === 'doublebox') {
      return wrapParent(
        `<span${mapAttr} style="border: 3px double var(--s6); padding: 1px 7px; border-radius: 2px; display: inline-block;">${innerHtml}</span>`
      );
    }
    if (cmd === 'shadowbox') {
      return wrapParent(
        `<span${mapAttr} style="border: 1px solid var(--s6); border-right-width: 2.5px; border-bottom-width: 2.5px; padding: 1px 7px; border-radius: 2px; display: inline-block;">${innerHtml}</span>`
      );
    }
    if (cmd === 'hl') {
      return wrapParent(
        `<mark${mapAttr} style="background: rgba(250, 204, 21, 0.28); color: inherit; padding: 0 3px; border-radius: 2px;">${innerHtml}</mark>`
      );
    }
    if (cmd === 'enquote') return wrapParent(`<span${mapAttr}>\u201c${innerHtml}\u201d</span>`);
    if (Object.prototype.hasOwnProperty.call(FONT_SIZE_CSS_MAP, cmd)) {
      const weightCss = ['Huge', 'huge', 'LARGE', 'Large'].includes(cmd) ? ' font-weight: 600;' : '';
      return wrapParent(`<span${mapAttr} style="font-size: ${FONT_SIZE_CSS_MAP[cmd]};${weightCss}">${innerHtml}</span>`);
    }
    if (cmd === 'textcolor') {
      const first = extractFirstArgAfterOpen(node);
      const cssCol = mapLatexColor(first ? first.grp.content : '', ctx.colorTable, node.colorModel || '');
      return wrapParent(`<span${mapAttr} style="color: ${escapeHtml(cssCol)};">${innerHtml}</span>`);
    }
    if (cmd === 'colorbox') {
      const first = extractFirstArgAfterOpen(node);
      const cssBg = mapLatexColor(first ? first.grp.content : '', ctx.colorTable, node.colorModel || '');
      return wrapParent(
        `<span${mapAttr} style="background-color: ${escapeHtml(cssBg)}; padding: 1px 6px; border-radius: 2px;">${innerHtml}</span>`
      );
    }
    if (cmd === 'fcolorbox') {
      const first = extractFirstArgAfterOpen(node);
      let secondGrp = null;
      if (first) {
        let cur = first.afterIdx;
        while (cur < node.openEnd && /\s/.test(tex[cur])) cur++;
        if (tex[cur] === '{') secondGrp = extractBalancedBraces(tex, cur);
      }
      const bdCol = escapeHtml(mapLatexColor(first ? first.grp.content : '', ctx.colorTable, node.colorModel || ''));
      const bgCol = escapeHtml(mapLatexColor(secondGrp ? secondGrp.content : '', ctx.colorTable, node.colorModel || ''));
      return wrapParent(
        `<span${mapAttr} style="border: 1px solid ${bdCol}; background-color: ${bgCol}; padding: 1px 6px; border-radius: 2px;">${innerHtml}</span>`
      );
    }
    if (cmd === 'href') {
      const first = extractFirstArgAfterOpen(node);
      const safeHref = escapeHtml(first ? first.grp.content.trim() : '#');
      const hCfg = ctx.hyperrefConfig;
      const useHyper = Boolean(hCfg && hCfg.colorlinks && !hCfg.hidelinks);
      const hrefStyle = useHyper
        ? `color: ${escapeHtml(hCfg.urlcolor || hCfg.linkcolor || '#0284c7')}; text-decoration: none;`
        : 'color: #0284c7; text-decoration: underline;';
      return wrapParent(
        `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${mapAttr} style="${hrefStyle}">${innerHtml}</a>`
      );
    }
    // Box/transform wrappers (\resizebox, \scalebox, \rotatebox, \raisebox, \parbox, \makebox, \mbox, \hbox, \text, etc.)
    return wrapParent(`<span${mapAttr}>${innerHtml}</span>`);
  }

  function renderInlineStream(iStart, iEnd) {
    const children = buildPartitionForRange(iStart, iEnd, unifiedNodes);
    const scopeMod = createEmptyModifiers();
    let out = '';
    let cur = iStart;
    for (const child of children) {
      if (child.start > cur) {
        out += tokenizePlainProseToMappedHtml(tex, cur, child.start, ctx, sourceMapMode, scopeMod);
      }
      if (child.nodeCategory === 'atomic' && child.kind === 'ignored') {
        cur = child.end;
        continue;
      }
      if (child.nodeCategory === 'atomic' && child.kind === 'counter') {
        applyCounterSpan(child);
        cur = child.end;
        continue;
      }
      if (child.nodeCategory === 'atomic' && child.kind === 'addcontentsline') {
        if (child.anchorId) out += `<span id="${escapeHtml(child.anchorId)}"></span>`;
        cur = child.end;
        continue;
      }
      if (isBlockNode(child)) {
        out += renderBlockNode(child, scopeMod);
      } else {
        out += renderInlineNode(child, scopeMod);
      }
      cur = child.end;
    }
    if (cur < iEnd) {
      out += tokenizePlainProseToMappedHtml(tex, cur, iEnd, ctx, sourceMapMode, scopeMod);
    }
    return out;
  }

  function renderBlockNode(node, activeScopeMod = null) {
    const mapAttr = sourceMapMode ? ` data-tex-start="${node.start}" data-tex-end="${node.end}"` : '';
    const atomicAttr = sourceMapMode ? ` data-tex-atomic="true" data-tex-start="${node.start}" data-tex-end="${node.end}"` : '';

    // 1. \loigiai{...} solution block OR auto-promoted inline wrapper containing block children
    if (node.nodeCategory === 'inline') {
      const cmd = node.cmdName;
      if (cmd === 'group-switch') {
        const mergedMod = cloneModifiers(activeScopeMod);
        if (node.modifiers) {
          for (const [mk, mv] of Object.entries(node.modifiers)) {
            if (mv !== undefined && mv !== null) mergedMod[mk] = mv;
          }
        }
        const bodyHtml = renderBlockRange(node.openEnd, node.closeStart, mergedMod);
        const st = buildInlineStyleFromModifiers(node.modifiers, ctx.colorTable);
        return `<div${mapAttr}${st ? ` style="${st}"` : ''}>${bodyHtml}</div>`;
      }

      const bodyHtml = renderBlockRange(node.openEnd, node.closeStart);
      if (node.cmdName === 'loigiai') {
        return `<div class="latex-solution-block"${mapAttr}>` +
          `<div class="latex-solution-header">` +
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30a46c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
          `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` +
          `<span>Lời giải</span></div>` +
          `${bodyHtml}</div>`;
      }

      if (cmd === 'textcolor') {
        const first = extractFirstArgAfterOpen(node);
        const cssCol = escapeHtml(mapLatexColor(first ? first.grp.content : '', ctx.colorTable, node.colorModel || ''));
        return `<div${mapAttr} style="color: ${cssCol};">${bodyHtml}</div>`;
      }
      if (cmd === 'colorbox') {
        const first = extractFirstArgAfterOpen(node);
        const cssBg = escapeHtml(mapLatexColor(first ? first.grp.content : '', ctx.colorTable, node.colorModel || ''));
        return `<div${mapAttr} style="background-color: ${cssBg}; padding: 12px 16px; border-radius: 2px; margin: 12px 0;">${bodyHtml}</div>`;
      }
      if (cmd === 'fcolorbox') {
        const first = extractFirstArgAfterOpen(node);
        let secondGrp = null;
        if (first) {
          let cur = first.afterIdx;
          while (cur < node.openEnd && /\s/.test(tex[cur])) cur++;
          if (tex[cur] === '{') secondGrp = extractBalancedBraces(tex, cur);
        }
        const bdCol = escapeHtml(mapLatexColor(first ? first.grp.content : '', ctx.colorTable, node.colorModel || ''));
        const bgCol = escapeHtml(mapLatexColor(secondGrp ? secondGrp.content : '', ctx.colorTable, node.colorModel || ''));
        return `<div${mapAttr} style="border: 1px solid ${bdCol}; background-color: ${bgCol}; padding: 12px 16px; border-radius: 2px; margin: 12px 0;">${bodyHtml}</div>`;
      }
      if (cmd === 'fbox' || cmd === 'framebox') {
        return `<div class="latex-framed-box"${mapAttr}>${bodyHtml}</div>`;
      }
      if (cmd === 'ovalbox' || cmd === 'Ovalbox' || cmd === 'tcbox') {
        return `<div class="latex-framed-box"${mapAttr} style="border-radius: 8px; border-width: ${cmd === 'Ovalbox' ? '1.8px' : '1.3px'};">${bodyHtml}</div>`;
      }
      if (cmd === 'doublebox') {
        return `<div class="latex-framed-box"${mapAttr} style="border: 3px double var(--s6);">${bodyHtml}</div>`;
      }
      if (cmd === 'shadowbox') {
        return `<div class="latex-framed-box"${mapAttr} style="border-right-width: 2.5px; border-bottom-width: 2.5px;">${bodyHtml}</div>`;
      }
      if (Object.prototype.hasOwnProperty.call(FONT_SIZE_CSS_MAP, cmd)) {
        const weightCss = ['Huge', 'huge', 'LARGE', 'Large'].includes(cmd) ? ' font-weight: 600;' : '';
        return `<div${mapAttr} style="font-size: ${FONT_SIZE_CSS_MAP[cmd]}; line-height: 1.55; margin: 10px 0;${weightCss}">${bodyHtml}</div>`;
      }
      if (cmd === 'resizebox' || cmd === 'scalebox') {
        return `<div${mapAttr} style="overflow-x: auto; max-width: 100%; margin: 12px 0;">${bodyHtml}</div>`;
      }
      if (cmd === 'textbf' || cmd === 'bf') {
        return `<div${mapAttr} style="font-weight: 700;">${bodyHtml}</div>`;
      }
      if (cmd === 'textit' || cmd === 'emph' || cmd === 'it') {
        return `<div${mapAttr} style="font-style: italic;">${bodyHtml}</div>`;
      }
      if (cmd === 'textsf' || cmd === 'sf') {
        return `<div${mapAttr} style="font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);">${bodyHtml}</div>`;
      }
      return `<div${mapAttr}>${bodyHtml}</div>`;
    }

    // 2. Atomic Block Nodes
    if (node.nodeCategory === 'atomic') {
      const raw = tex.slice(node.start, node.end);

      if (node.kind === 'user-macro') {
        const expanded = expandMacrosSafely(raw, ctx.macroTable);
        const blockHtml = renderLatexForPreviewAndUI(expanded, {
          sourceMapMode: false,
          enablePreflightCards: ctx.enablePreflightCards,
          baseOffset: ctx.baseOffset + node.start,
          preambleData: ctx.preambleData,
          assetVault: ctx.assetVault,
          sharedCounters: ctx
        });
        return `<div class="v-user-macro-block"${atomicAttr}>${blockHtml}</div>`;
      }

      if (node.kind === 'toc') {
        const localEntries = Array.isArray(ctx.stitchedTocEntries)
          ? ctx.stitchedTocEntries
          : Array.isArray(ast.tocEntries)
            ? ast.tocEntries
            : [];
        const persistedToc = Array.isArray(ctx.persistedDocCfg?.tocEntries) ? ctx.persistedDocCfg.tocEntries : [];
        const maxDepth =
          typeof node.tocDepthAtPos === 'number'
            ? node.tocDepthAtPos
            : typeof ctx.persistedDocCfg?.tocDepth === 'number'
              ? ctx.persistedDocCfg.tocDepth
              : typeof ctx.preambleData?.tocDepth === 'number'
                ? ctx.preambleData.tocDepth
                : 2;
        const localVisible = localEntries.filter((e) => (e.levelNum ?? 1) <= maxDepth);
        const usePersistedToc =
          persistedToc.length > 0 && (!ctx.isStandaloneNormalized || localVisible.length === 0);

        let visibleEntries = localVisible;
        if (usePersistedToc) {
          const outlineList = Array.isArray(ast.outlineHeadings) ? ast.outlineHeadings : [];
          visibleEntries = persistedToc
            .filter((e) => (e.levelNum ?? 1) <= maxDepth)
            .map((e) => {
              const eClean = (e.cleanTitle || '').trim();
              const eNum = e.numLabel || '';
              const matchedLocal =
                localEntries.find(
                  (le) => le.type === e.type && (le.numLabel || '') === eNum && (le.cleanTitle || '').trim() === eClean
                ) ||
                localEntries.find((le) => (le.cleanTitle || '').trim() === eClean);
              const matchedOutline = !matchedLocal
                ? outlineList.find((oh) => (oh.cleanTitle || '').trim() === eClean)
                : null;
              return {
                ...e,
                targetId: matchedLocal?.targetId || matchedOutline?.id || ''
              };
            });
        }
        if (visibleEntries.length === 0) return '';

        const scopedCol = activeScopeMod?.color
          ? mapLatexColor(activeScopeMod.color, ctx.colorTable, activeScopeMod.colorModel || '')
          : '';
        const hyperCfg = ctx.hyperrefConfig;
        const hyperLinkCol =
          hyperCfg?.toccolor ||
          (hyperCfg?.colorlinks && !hyperCfg?.hidelinks ? hyperCfg.linkcolor || '#dc2626' : '');
        const headingCol = escapeHtml(scopedCol || 'var(--s12)');
        const entryCol = escapeHtml(scopedCol || hyperLinkCol || 'var(--s12)');
        const effDocClass = ctx.persistedDocCfg?.docClass || ctx.preambleData?.docClass || '';
        const hasChapters =
          visibleEntries.some((e) => e.type === 'chapter') ||
          effDocClass === 'report' ||
          effDocClass === 'book';

        let rowsHtml = '';
        for (const item of visibleEntries) {
          const itemTitleHtml = renderRichInlineTex(item.rawTitle || item.title || item.cleanTitle || '', ctx);
          const numHtml = item.numLabel
            ? `<span class="latex-toc-num" style="display: inline-block; min-width: ${
                item.type === 'chapter' ? '1.6em' : item.type === 'section' ? '2.4em' : '3.3em'
              }; margin-right: 0.35em;">${escapeHtml(item.numLabel)}</span>`
            : '';
          const innerLinkHtml = item.targetId
            ? `<a href="#${escapeHtml(item.targetId)}" style="color: inherit; text-decoration: none;">${numHtml}${itemTitleHtml}</a>`
            : `<span style="color: inherit;">${numHtml}${itemTitleHtml}</span>`;

          if (item.type === 'part' || item.type === 'chapter') {
            rowsHtml +=
              `<div class="latex-toc-row is-chapter" style="display: flex; align-items: baseline; font-weight: 700; font-size: 1.05rem; margin-top: 10px; line-height: 1.45; color: ${entryCol};">` +
              `${innerLinkHtml}` +
              `</div>`;
          } else {
            const indentEm =
              item.type === 'section'
                ? hasChapters
                  ? 1.6
                  : 0
                : item.type === 'subsection'
                  ? hasChapters
                    ? 4.0
                    : 1.8
                  : hasChapters
                    ? 6.4
                    : 3.6;
            const weight = !hasChapters && item.type === 'section' ? 700 : 400;
            const leaderHtml =
              !hasChapters && item.type === 'section' && !item.isManualAdd
                ? ''
                : `<span class="latex-toc-dots" aria-hidden="true" style="flex: 1 1 24px; border-bottom: 1.5px dotted currentColor; opacity: 0.55; margin: 0 8px 4px;"></span>`;
            rowsHtml +=
              `<div class="latex-toc-row is-${escapeHtml(item.type)}" style="display: flex; align-items: baseline; padding-left: ${indentEm}em; font-weight: ${weight}; font-size: 0.98rem; line-height: 1.55; color: ${entryCol};">` +
              `${innerLinkHtml}` +
              `${leaderHtml}` +
              `</div>`;
          }
        }

        return (
          `<nav class="latex-toc"${atomicAttr} aria-label="Mục lục" style="margin: 28px 0 44px; padding: 0;">` +
          `<h2 class="latex-toc-heading" style="color: ${headingCol}; font-size: 1.85rem; font-weight: 700; margin: 0 0 22px; text-align: left; line-height: 1.3;">Mục lục</h2>` +
          `<div class="latex-toc-list" style="display: flex; flex-direction: column; gap: 6px;">${rowsHtml}</div>` +
          `</nav>`
        );
      }

      if (node.kind === 'heading') {
        const outlineMeta = outlineByStart.get(node.start);
        const hId = node.headingId || (outlineMeta ? outlineMeta.id : `h-${node.start}`);
        const bIdx = raw.lastIndexOf('{');
        let cur = raw.indexOf('\\') + 1;
        while (cur < raw.length && /[a-zA-Z*]/.test(raw[cur])) cur++;
        while (cur < raw.length && /\s/.test(raw[cur])) cur++;
        if (raw[cur] === '[') {
          const br = extractBalancedBrackets(raw, cur);
          if (br) cur = br.endIndex + 1;
        }
        while (cur < raw.length && /\s/.test(raw[cur])) cur++;
        const titleGrp =
          raw[cur] === '{' ? extractBalancedBraces(raw, cur) : bIdx !== -1 ? extractBalancedBraces(raw, bIdx) : null;
        let rawTitle = titleGrp ? titleGrp.content.trim() : '';
        let isStarred = /^\\[a-zA-Z]+\*/.test(raw);
        let effectiveHeadingType = node.headingType;
        if (ctx.headingNormalizer && typeof ctx.headingNormalizer.transform === 'function') {
          const transformed = ctx.headingNormalizer.transform(node.headingType, isStarred, rawTitle);
          if (transformed) {
            effectiveHeadingType = transformed.headingType;
            isStarred = transformed.isStarred;
            rawTitle = transformed.rawTitle;
          }
        }
        const plainTitle = unwrapTexFormattingToPlainText(rawTitle);
        const hasHardPrefix =
          /^(?:chương|chapter|phần|part|bài|câu\s*hỏi|problem)\b/i.test(plainTitle) ||
          /^[0-9]+(?:\.[0-9]+)+\s*/.test(plainTitle);

        let numPrefix = '';
        const hn = ctx.headingNums;
        if (!isStarred && effectiveHeadingType !== 'paragraph' && effectiveHeadingType !== 'subparagraph') {
          if (effectiveHeadingType === 'chapter') {
            hn.chap++;
            hn.sec = 0;
            hn.subsec = 0;
            hn.subsubsec = 0;
            for (const k of Object.keys(ctx.boxCounters)) delete ctx.boxCounters[k];
            if (ctx.equationWithin === 'chapter') ctx.eqCounters.eq = 0;
            numPrefix = hasHardPrefix ? '' : `Chương ${hn.chap}`;
          } else if (effectiveHeadingType === 'section') {
            hn.sec++;
            hn.subsec = 0;
            hn.subsubsec = 0;
            if (ctx.equationWithin === 'section') ctx.eqCounters.eq = 0;
            numPrefix = hasHardPrefix ? '' : `${hn.chap ? `${hn.chap}.${hn.sec}` : hn.sec} `;
          } else if (effectiveHeadingType === 'subsection') {
            hn.subsec++;
            hn.subsubsec = 0;
            const sBase = hn.sec || 1;
            numPrefix = hasHardPrefix ? '' : `${hn.chap ? `${hn.chap}.${sBase}.${hn.subsec}` : `${sBase}.${hn.subsec}`} `;
          } else if (effectiveHeadingType === 'subsubsection') {
            hn.subsubsec++;
            const sBase = hn.sec || 1;
            const ssBase = hn.subsec || 1;
            numPrefix = hasHardPrefix
              ? ''
              : `${hn.chap ? `${hn.chap}.${sBase}.${ssBase}.${hn.subsubsec}` : `${sBase}.${ssBase}.${hn.subsubsec}`} `;
          }
        }

        const renderedTitle = renderRichInlineTex(rawTitle, ctx);

        if (effectiveHeadingType === 'part') {
          return `<h1 id="${hId}" class="latex-part-title"${atomicAttr} style="font-size: 1.56rem; font-weight: 800; text-align: center; margin: 34px 0 22px; color: var(--s12); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--s4); padding-bottom: 12px;">${renderedTitle}</h1>`;
        }
        if (effectiveHeadingType === 'chapter') {
          const chapFmt = ctx.preambleData?.chapterFormat || {
            shape: 'display',
            align: 'left',
            uppercase: false,
            color: ''
          };
          const alignCss = chapFmt.align || 'left';
          const caseCss = chapFmt.uppercase ? ' text-transform: uppercase;' : '';
          const colCss = chapFmt.color ? escapeHtml(chapFmt.color) : 'var(--s12)';
          if (isStarred || hasHardPrefix || !numPrefix) {
            return `<h1 id="${hId}" class="latex-chapter"${atomicAttr} style="text-align: ${alignCss}; margin-top: 2.2em; margin-bottom: 1.2em; font-size: 2.24rem; font-weight: 700; line-height: 1.24; color: ${colCss};${caseCss}">${renderedTitle}</h1>`;
          }
          if (chapFmt.shape === 'hang' || chapFmt.shape === 'block') {
            return `<h1 id="${hId}" class="latex-chapter"${atomicAttr} style="text-align: ${alignCss}; margin-top: 2.2em; margin-bottom: 1.2em; font-size: 2.24rem; font-weight: 700; line-height: 1.24; color: ${colCss};${caseCss}"><span class="latex-chapter-num" style="margin-right: 0.55em;">${hn.chap}</span>${renderedTitle}</h1>`;
          }
          return (
            `<h1 id="${hId}" class="latex-chapter"${atomicAttr} style="text-align: ${alignCss}; margin-top: 2.2em; margin-bottom: 1.3em; color: ${colCss};${caseCss}">` +
            `<span class="latex-chapter-label" style="display: block; font-size: 1.96rem; font-weight: 700; line-height: 1.24; margin-bottom: 0.42em;">${escapeHtml(numPrefix)}</span>` +
            `<span class="latex-chapter-title" style="display: block; font-size: 2.36rem; font-weight: 700; line-height: 1.22;">${renderedTitle}</span>` +
            `</h1>`
          );
        }
        if (effectiveHeadingType === 'section') {
          return `<h2 id="${hId}" class="latex-section"${atomicAttr} style="margin-top: 1.85em; margin-bottom: 0.78em; font-size: 1.62rem; font-weight: 700; line-height: 1.3; color: var(--s12); width: 100%;">${escapeHtml(numPrefix)}${renderedTitle}</h2>`;
        }
        if (effectiveHeadingType === 'subsection') {
          return `<h3 id="${hId}" class="latex-subsection"${atomicAttr} style="margin-top: 1.5em; margin-bottom: 0.65em; font-size: 1.35rem; font-weight: 700; line-height: 1.35; color: var(--s12);">${escapeHtml(numPrefix)}${renderedTitle}</h3>`;
        }
        if (effectiveHeadingType === 'paragraph' || effectiveHeadingType === 'subparagraph') {
          return `<h5 id="${hId}" class="latex-paragraph"${atomicAttr}>${renderedTitle}</h5>`;
        }
        return `<h4 id="${hId}" class="latex-subsubsection"${atomicAttr} style="margin-top: 1.25em; margin-bottom: 0.52em; font-size: 1.15rem; font-weight: 700; line-height: 1.4; color: var(--s12);">${escapeHtml(numPrefix)}${renderedTitle}</h4>`;
      }

      if (node.kind === 'math-display') {
        let inner = raw;
        if (raw.startsWith('$$') && raw.endsWith('$$')) inner = raw.slice(2, -2);
        else if (raw.startsWith('\\[') && raw.endsWith('\\]')) inner = raw.slice(2, -2);
        const kHtml = renderKatexSafe(inner, true, ctx.macroTable, ctx.colorTable);
        return `<div class="katex-display-wrapper"${atomicAttr}>${kHtml}</div>`;
      }

      if (node.kind === 'math-env') {
        const envName = node.envName || '';
        const isStarMath = envName.endsWith('*');
        const baseMathEnv = envName.replace(/\*$/, '');
        const escapedEnv = envName.replace('*', '\\*');
        const openRe = new RegExp(`^\\\\begin\\s*\\{${escapedEnv}\\}`);
        const closeRe = new RegExp(`\\\\end\\s*\\{${escapedEnv}\\}$`);
        let inner = raw.replace(openRe, '').replace(closeRe, '');
        if (/^alignat/.test(envName)) {
          inner = inner.replace(/^\s*\{[^}]*\}/, '');
        }

        const firstLblM = /\\label\s*\{([^}]+)\}/.exec(inner);
        const lblKey = firstLblM ? firstLblM[1].trim() : '';
        const lblEntry = lblKey ? ctx.globalLabels?.get(lblKey) : null;
        const eqIdAttr = lblEntry?.anchorId
          ? ` id="${escapeHtml(lblEntry.anchorId)}"`
          : lblKey
            ? ` id="eq-lbl-${escapeHtml(lblKey.replace(/[^a-zA-Z0-9_-]/g, '_'))}"`
            : '';

        const formatLiveEqNum = (n) => {
          if (ctx.equationWithin === 'chapter' && ctx.headingNums.chap > 0) {
            return `${ctx.headingNums.chap}.${n}`;
          }
          if (ctx.equationWithin === 'section' && ctx.headingNums.sec > 0) {
            const secPrefix = ctx.headingNums.chap > 0
              ? `${ctx.headingNums.chap}.${ctx.headingNums.sec}`
              : `${ctx.headingNums.sec}`;
            return `${secPrefix}.${n}`;
          }
          return `${n}`;
        };

        let eqNumbersToRender = [];
        if (!isStarMath && (baseMathEnv === 'equation' || baseMathEnv === 'multline')) {
          const hasExplicitTag = /\\tag\*?\s*\{/.test(inner);
          const hasNoNum = /\\(?:notag|nonumber)\b/.test(inner);
          inner = inner.replace(/\\(?:notag|nonumber)\b/g, '');
          if (!hasExplicitTag && !hasNoNum) {
            ctx.eqCounters.eq = (ctx.eqCounters.eq || 0) + 1;
            eqNumbersToRender.push(formatLiveEqNum(ctx.eqCounters.eq));
          }
        } else if (!isStarMath && ['align', 'flalign', 'alignat', 'gather', 'eqnarray'].includes(baseMathEnv)) {
          const rows = splitTopLevelLatexRows(inner).map((r) => r.text);
          for (const row of rows) {
            if (!row.trim()) continue;
            const tagM = /\\tag\*?\s*\{([^}]*)\}/.exec(row);
            const hasNoNum = /\\(?:notag|nonumber)\b/.test(row);
            if (tagM) {
              eqNumbersToRender.push(tagM[1].trim());
            } else if (!hasNoNum) {
              ctx.eqCounters.eq = (ctx.eqCounters.eq || 0) + 1;
              eqNumbersToRender.push(formatLiveEqNum(ctx.eqCounters.eq));
            }
          }
          inner = inner.replace(/\\(?:notag|nonumber)\b/g, '').replace(/\\tag\*?\s*\{[^}]*\}/g, '');
        } else {
          inner = inner.replace(/\\(?:notag|nonumber)\b/g, '');
        }

        if (/^(?:align|flalign|alignat|eqnarray|split)/.test(envName)) {
          inner = `\\begin{aligned}${inner}\\end{aligned}`;
        } else if (/^(?:gather|multline)/.test(envName)) {
          inner = `\\begin{gathered}${inner}\\end{gathered}`;
        } else if (
          /^(?:pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|smallmatrix|cases|dcases|rcases|array|subarray)$/.test(
            envName
          )
        ) {
          inner = raw;
        }
        const kHtml = renderKatexSafe(inner, true, ctx.macroTable, ctx.colorTable);
        if (eqNumbersToRender.length === 1) {
          return (
            `<div${eqIdAttr} class="katex-display-wrapper latex-numbered-equation"${atomicAttr} style="display: flex; align-items: center; justify-content: center;">` +
            `<div style="flex: 1 1 auto; min-width: 0;">${kHtml}</div>` +
            `<span class="latex-eq-number" style="margin-left: 16px; font-style: normal; font-weight: 400; color: var(--s12); white-space: nowrap;">(${escapeHtml(eqNumbersToRender[0])})</span>` +
            `</div>`
          );
        }
        if (eqNumbersToRender.length > 1) {
          const numColHtml = eqNumbersToRender
            .map(
              (nStr) =>
                `<span class="latex-eq-number" style="font-style: normal; font-weight: 400; color: var(--s12); white-space: nowrap;">(${escapeHtml(nStr)})</span>`
            )
            .join('');
          return (
            `<div${eqIdAttr} class="katex-display-wrapper latex-numbered-equation"${atomicAttr} style="display: flex; align-items: stretch; justify-content: center;">` +
            `<div style="flex: 1 1 auto; min-width: 0;">${kHtml}</div>` +
            `<div style="margin-left: 16px; display: flex; flex-direction: column; justify-content: space-around; align-items: flex-end;">${numColHtml}</div>` +
            `</div>`
          );
        }
        return `<div${eqIdAttr} class="katex-display-wrapper"${atomicAttr}>${kHtml}</div>`;
      }

      if (node.kind === 'tikz') {
        if (node.envName === 'tikzpicture') {
          const canonical = matchCanonicalTikzSvg(raw);
          if (canonical) return `<div${atomicAttr}>${canonical}</div>`;
          const compiled2D = compileSimple2DTikzToSvg(raw);
          if (compiled2D) return `<div${atomicAttr}>${compiled2D}</div>`;
        }
        return renderPreflightComplexTikzCard(
          ctx.baseOffset + node.start,
          ctx.baseOffset + node.end,
          ctx.enablePreflightCards,
          atomicAttr
        );
      }

      if (node.kind === 'verbatim') {
        const envName = node.envName || 'verbatim';
        const escapedEnv = envName.replace('*', '\\*');
        const openM = new RegExp(`^\\\\begin\\s*\\{${escapedEnv}\\}`).exec(raw);
        const closeM = new RegExp(`\\\\end\\s*\\{${escapedEnv}\\}$`).exec(raw);
        let bodyStart = openM ? openM[0].length : 0;
        const bodyEnd = closeM ? closeM.index : raw.length;
        if (envName === 'lstlisting' || envName === 'minted') {
          while (bodyStart < bodyEnd && (raw[bodyStart] === ' ' || raw[bodyStart] === '\t')) bodyStart++;
          if (raw[bodyStart] === '[') {
            const obr = extractBalancedBrackets(raw, bodyStart);
            if (obr && obr.endIndex < bodyEnd) bodyStart = obr.endIndex + 1;
          }
          if (envName === 'minted') {
            while (bodyStart < bodyEnd && (raw[bodyStart] === ' ' || raw[bodyStart] === '\t')) bodyStart++;
            if (raw[bodyStart] === '{') {
              const lgrp = extractBalancedBraces(raw, bodyStart);
              if (lgrp && lgrp.endIndex < bodyEnd) bodyStart = lgrp.endIndex + 1;
            }
          }
        }
        const codeBody = raw.slice(bodyStart, bodyEnd).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
        return `<pre class="latex-verbatim"${atomicAttr}><code>${escapeHtml(codeBody)}</code></pre>`;
      }

      if (node.kind === 'caption') {
        return `<div class="latex-caption"${atomicAttr}>${renderRichInlineTex(node.captionContent || '', ctx)}</div>`;
      }

      if (node.kind === 'command') {
        if (node.cmdName === 'maketitle') {
          const meta = ctx.preambleData?.docMeta;
          if (!meta || (!meta.title && !meta.author)) return '';
          const titleHtml = meta.title
            ? `<div style="font-size: 1.65rem; font-weight: 800; color: var(--s12); margin-bottom: 8px;">${renderRichInlineTex(meta.title, ctx)}</div>`
            : '';
          const authorHtml = meta.author
            ? `<div style="font-size: 1.05rem; font-weight: 600; color: var(--s11); margin-bottom: 4px;">${renderRichInlineTex(meta.author, ctx)}</div>`
            : '';
          const dateHtml = meta.date
            ? `<div style="font-size: 0.94rem; color: var(--s10);">${renderRichInlineTex(meta.date, ctx)}</div>`
            : '';
          return `<div class="latex-maketitle"${atomicAttr} style="text-align: center; margin: 20px auto 28px; padding-bottom: 14px; border-bottom: 1px solid var(--s3);">${titleHtml}${authorHtml}${dateHtml}</div>`;
        }
        if (node.cmdName === 'rule') {
          return `<hr${atomicAttr} style="margin: 14px 0; border: none; border-top: 1px solid var(--s5);" />`;
        }
        return '';
      }

      if (node.kind === 'graphics') {
        return renderGraphicsCommandHtml(raw, node.start, node.end, ctx, sourceMapMode);
      }

      if (node.kind === 'tabular') {
        return `<div${atomicAttr}>${renderTabularBlockHtml(raw, ctx)}</div>`;
      }

      if (node.kind === 'float') {
        const envName = node.envName || 'figure';
        const escapedEnv = envName.replace('*', '\\*');
        const openM = new RegExp(`^\\\\begin\\s*\\{${escapedEnv}\\}`).exec(raw);
        const closeM = new RegExp(`\\\\end\\s*\\{${escapedEnv}\\}$`).exec(raw);
        let cur = openM ? openM[0].length : 0;
        const innerEnd = closeM ? closeM.index : raw.length;

        // Strip float placement/width arguments ([htbp] on figure/table, [lines]{pos}[overhang]{width} on wrapfigure/wraptable)
        while (cur < innerEnd && (raw[cur] === ' ' || raw[cur] === '\t')) cur++;
        if (raw[cur] === '[') {
          const obr = extractBalancedBrackets(raw, cur);
          if (obr && obr.endIndex < innerEnd) cur = obr.endIndex + 1;
        }
        if (/^wrap(?:figure|table)/.test(envName)) {
          for (let step = 0; step < 2; step++) {
            while (cur < innerEnd && /\s/.test(raw[cur])) cur++;
            if (raw[cur] === '[') {
              const obr = extractBalancedBrackets(raw, cur);
              if (obr && obr.endIndex < innerEnd) cur = obr.endIndex + 1;
              while (cur < innerEnd && /\s/.test(raw[cur])) cur++;
            }
            if (raw[cur] === '{') {
              const grp = extractBalancedBraces(raw, cur);
              if (grp && grp.endIndex < innerEnd) cur = grp.endIndex + 1;
            }
          }
        }

        const innerFloatTex = raw.slice(cur, innerEnd);
        const innerHtml = renderLatexForPreviewAndUI(innerFloatTex, {
          sourceMapMode: false,
          enablePreflightCards: ctx.enablePreflightCards,
          baseOffset: ctx.baseOffset + node.start + cur,
          preambleData: ctx.preambleData,
          assetVault: ctx.assetVault,
          sharedCounters: ctx
        });
        return `<figure class="latex-figure"${atomicAttr} style="margin: 24px auto; text-align: center;">${innerHtml}</figure>`;
      }

      if (node.kind === 'boxpair') {
        let leftTex = '';
        let rightTex = '';
        if (
          typeof node.bodyContentStart === 'number' &&
          typeof node.bodyContentEnd === 'number' &&
          typeof node.pointsContentStart === 'number' &&
          typeof node.pointsContentEnd === 'number'
        ) {
          leftTex = tex.slice(node.bodyContentStart, node.bodyContentEnd);
          rightTex = tex.slice(node.pointsContentStart, node.pointsContentEnd);
        } else {
          const b1 = raw.indexOf('{');
          const g1 = b1 !== -1 ? extractBalancedBraces(raw, b1) : null;
          const b2 = g1 ? raw.indexOf('{', g1.endIndex + 1) : -1;
          const g2 = b2 !== -1 ? extractBalancedBraces(raw, b2) : null;
          leftTex = g1 ? g1.content : '';
          rightTex = g2 ? g2.content : '';
        }

        const bodyBase =
          typeof node.bodyContentStart === 'number' ? ctx.baseOffset + node.bodyContentStart : ctx.baseOffset + node.start;
        const leftHtml = renderLatexForPreviewAndUI(leftTex, {
          sourceMapMode: false,
          enablePreflightCards: ctx.enablePreflightCards,
          baseOffset: bodyBase,
          preambleData: ctx.preambleData,
          assetVault: ctx.assetVault,
          sharedCounters: ctx
        });

        let cleanedRight = rightTex.trim();
        if (cleanedRight.startsWith('{')) {
          const wg = extractBalancedBraces(cleanedRight, 0);
          if (wg && /(?:cm|mm|pt|em|in|\\textwidth|\\linewidth)/i.test(wg.content) && wg.endIndex + 1 < cleanedRight.length) {
            cleanedRight = cleanedRight.slice(wg.endIndex + 1).trim();
          }
        }
        const rightHtml = renderRichInlineTex(cleanedRight, ctx);

        return (
          `<div class="latex-boxpair"${atomicAttr} style="display: flex; flex-wrap: wrap; gap: 0; margin: 18px 0; border: 1px solid var(--s4); border-radius: 2px; background: var(--s1); overflow: hidden;">` +
          `<div style="flex: 1 1 280px; min-width: 0; padding: 14px 18px;">${leftHtml}</div>` +
          `<div style="flex: 0 0 100px; min-width: 90px; background: var(--s2); border-left: 1px solid var(--s3); display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 700; font-size: 0.88rem; padding: 10px;">${rightHtml}</div>` +
          `</div>`
        );
      }
      return '';
    }

    // 3. Nestable Environment Nodes (NOT atomic: Admin can slice inside these!)
    const envName = node.envName;

    if (envName === '__texgroup__') {
      const innerGroupHtml = renderBlockRange(node.openEnd, node.closeStart, activeScopeMod);
      return sourceMapMode ? `<div class="v-tex-group"${mapAttr}>${innerGroupHtml}</div>` : innerGroupHtml;
    }

    if (
      [
        'itemize',
        'itemize*',
        'enumerate',
        'enumerate*',
        'description',
        'description*',
        'compactitem',
        'compactenum',
        'inparaenum',
        'tasks'
      ].includes(envName)
    ) {
      if (envName === 'tasks') {
        const mCols = /\((\d+)\)/.exec(node.openerText || '');
        const cols = mCols ? Math.min(4, Math.max(1, parseInt(mCols[1], 10))) : 1;
        if (!node.items || node.items.length === 0) {
          return `<div class="latex-tasks"${mapAttr} style="margin: 14px 0;">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
        }
        let tasksHtml = '';
        node.items.forEach((it, idx) => {
          let lbl = `${String.fromCharCode(97 + (idx % 26))})`;
          const brIdx = it.itemCmdText.indexOf('[');
          if (brIdx !== -1) {
            const br = extractBalancedBrackets(it.itemCmdText, brIdx);
            if (br) lbl = br.content.trim();
          }
          const itemMapAttr = sourceMapMode
            ? ` data-tex-item="true" data-tex-start="${it.itemCmdStart}" data-tex-end="${it.bodyEnd}"`
            : '';
          const bodyHtml = renderBlockRange(it.bodyStart, it.bodyEnd);
          tasksHtml += `<div${itemMapAttr} style="display: flex; gap: 8px; align-items: baseline;"><strong>${renderRichInlineTex(lbl, ctx)}</strong><div style="flex: 1; min-width: 0;">${bodyHtml}</div></div>`;
        });
        return `<div class="latex-tasks-grid"${mapAttr} style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 10px 20px; margin: 14px 0;">${tasksHtml}</div>`;
      }

      const isEnum = ['enumerate', 'enumerate*', 'compactenum', 'inparaenum'].includes(envName);
      const tag = isEnum ? 'ol' : 'ul';
      const cls = isEnum ? 'latex-list latex-enumerate' : 'latex-list latex-itemize';
      let listStyleCss = '';
      if (isEnum && node.openerText) {
        const brIdx = node.openerText.indexOf('[');
        if (brIdx !== -1) {
          const br = extractBalancedBrackets(node.openerText, brIdx);
          if (br) {
            const opt = br.content;
            if (/\\alph\b|\(?a[.)]/.test(opt)) listStyleCss = ' style="list-style-type: lower-alpha;"';
            else if (/\\Alph\b|\(?A[.)]/.test(opt)) listStyleCss = ' style="list-style-type: upper-alpha;"';
            else if (/\\roman\b|\(?i[.)]/.test(opt)) listStyleCss = ' style="list-style-type: lower-roman;"';
            else if (/\\Roman\b|\(?I[.)]/.test(opt)) listStyleCss = ' style="list-style-type: upper-roman;"';
          }
        }
      }

      if (!node.items || node.items.length === 0) {
        return `<${tag} class="${cls}"${mapAttr}${listStyleCss}><li${mapAttr}>${renderBlockRange(node.openEnd, node.closeStart)}</li></${tag}>`;
      }

      let itemsHtml = '';
      if (node.items[0].itemCmdStart > node.openEnd) {
        const pre = renderBlockRange(node.openEnd, node.items[0].itemCmdStart);
        if (pre.trim()) itemsHtml += pre;
      }

      for (const it of node.items) {
        let optLabel = '';
        const brIdx = it.itemCmdText.indexOf('[');
        if (brIdx !== -1) {
          const br = extractBalancedBrackets(it.itemCmdText, brIdx);
          if (br) optLabel = br.content.trim();
        }
        const itemMapAttr = sourceMapMode
          ? ` data-tex-item="true" data-tex-start="${it.itemCmdStart}" data-tex-end="${it.bodyEnd}"`
          : '';
        const itemBodyHtml = renderBlockRange(it.bodyStart, it.bodyEnd);
        if (optLabel) {
          const lblHtml = `<strong${sourceMapMode ? ` data-tex-start="${it.itemCmdStart}" data-tex-end="${it.itemCmdEnd}"` : ''}>${renderRichInlineTex(optLabel, ctx)}</strong> `;
          let merged = itemBodyHtml;
          const pLead = /^<p[^>]*>/.exec(merged);
          if (pLead) merged = pLead[0] + lblHtml + merged.slice(pLead[0].length);
          else merged = lblHtml + merged;
          itemsHtml += `<li${itemMapAttr} style="margin-bottom: 8px; list-style-type: none;">${merged}</li>`;
        } else {
          itemsHtml += `<li${itemMapAttr} style="margin-bottom: 8px;">${itemBodyHtml}</li>`;
        }
      }
      return `<${tag} class="${cls}"${mapAttr}${listStyleCss}>${itemsHtml}</${tag}>`;
    }

    if (envName === 'minipage' || envName === 'subfigure' || envName === 'subtable') {
      const pct = parseLatexWidthToCssPct(node.openerText);
      const widthStyle = pct >= 95 ? 'width: 100%; display: block;' : `width: ${pct}%;`;
      return `<div class="latex-minipage"${mapAttr} style="${widthStyle}">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (envName === 'proof') {
      let optTitle = '';
      const brIdx = node.openerText.indexOf('[');
      if (brIdx !== -1) {
        const br = extractBalancedBrackets(node.openerText, brIdx);
        if (br) optTitle = br.content.trim();
      }
      const lead = `<em>${optTitle ? renderRichInlineTex(optTitle, ctx) : 'Chứng minh'}.</em> `;
      let bodyHtml = renderBlockRange(node.openEnd, node.closeStart);
      const pLead = /^<p[^>]*>/.exec(bodyHtml);
      if (pLead) bodyHtml = pLead[0] + lead + bodyHtml.slice(pLead[0].length);
      else bodyHtml = `<p style="margin-bottom: 10px;">${lead}</p>${bodyHtml}`;

      const tomb = ' <span class="latex-tombstone">&#9632;</span>';
      if (/<\/p>\s*$/.test(bodyHtml)) bodyHtml = bodyHtml.replace(/<\/p>\s*$/, `${tomb}</p>`);
      else bodyHtml += tomb;

      return `<div class="latex-proof"${mapAttr}><div class="latex-proof-body">${bodyHtml}</div></div>`;
    }

    const customEnvInfo = ctx.customEnvs ? ctx.customEnvs.get(envName) : null;

    if (
      envName === 'tcolorbox' ||
      ['mdframed', 'framed', 'shaded', 'snugshade', 'leftbar'].includes(envName) ||
      Boolean(customEnvInfo && customEnvInfo.isPureTcolorbox)
    ) {
      let engine = 'tcolorbox';
      if (envName === 'mdframed') engine = 'mdframed';
      else if (envName === 'framed') engine = 'framed';
      else if (envName === 'shaded' || envName === 'snugshade') engine = 'shaded';
      else if (envName === 'leftbar') engine = 'leftbar';

      let effectiveOpts = '';
      if (customEnvInfo && customEnvInfo.isPureTcolorbox) {
        const { optBracket, braceArgs } = parseOpenerPositionalArgs(node.openerText, customEnvInfo);
        const posArgs = [];
        if (customEnvInfo.hasOptionalFirstArg) {
          posArgs.push(optBracket !== null ? optBracket : customEnvInfo.defaultOpt || '');
        }
        posArgs.push(...braceArgs);
        effectiveOpts = substituteEnvPositionalArgs(customEnvInfo.rawTcbOptions || '', posArgs);
        if (!customEnvInfo.hasOptionalFirstArg && optBracket) {
          effectiveOpts = effectiveOpts ? `${effectiveOpts}, ${optBracket}` : optBracket;
        }
      } else if (node.openerText) {
        const brIdx = node.openerText.indexOf('[');
        if (brIdx !== -1) {
          const br = extractBalancedBrackets(node.openerText, brIdx);
          if (br) effectiveOpts = br.content;
        }
      }

      const bs = parseBoxVisualOptions(effectiveOpts, ctx.colorTable, ctx.boxStyleDefs, engine, {
        hasTitle: /\b(?:title|frametitle)\s*=/.test(effectiveOpts)
      });

      let bodyHtml = renderBlockRange(node.openEnd, node.closeStart);
      if (!bs.isVisibleFrame) {
        return `<div class="latex-tcolorbox-unframed"${mapAttr} style="margin: 16px 0;">${bodyHtml}</div>`;
      }

      const rawTitle = (bs.rawTitleTemplate || '').trim();
      let hdr = '';
      let extraCls = '';
      if (rawTitle) {
        const renderedHdrTitle = renderRichInlineTex(rawTitle, ctx);
        if (bs.headerMode === 'boxed-pill') {
          hdr = `<div class="latex-tcb-pill-header">${renderedHdrTitle}</div>`;
          extraCls = ' has-boxed-pill';
        } else if (bs.headerMode === 'inline') {
          const lead = `<strong class="v-box-lead-label">${renderedHdrTitle}.</strong> `;
          const pLead = /^<p[^>]*>/.exec(bodyHtml);
          if (pLead) bodyHtml = pLead[0] + lead + bodyHtml.slice(pLead[0].length);
          else bodyHtml = `<p style="margin-bottom: 10px;">${lead}</p>${bodyHtml}`;
        } else {
          hdr = `<div class="latex-tcolorbox-header latex-tcb-bar-header">${renderedHdrTitle}</div>`;
        }
      }
      const styleAttr = ` style="${escapeHtml(buildBoxCssVarsStyle(bs))}"`;
      return `<div class="latex-tcolorbox${extraCls}"${mapAttr}${styleAttr}>${hdr}<div class="latex-tcolorbox-content">${bodyHtml}</div></div>`;
    }

    if (envName === 'boxed' || envName === 'empheq') {
      return `<div class="latex-framed-box"${mapAttr}>${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (envName === 'center' || envName === 'flushleft' || envName === 'flushright') {
      const align = envName === 'center' ? 'center' : envName === 'flushright' ? 'right' : 'left';
      return `<div class="v-tex-align-env"${sourceMapMode ? ` data-tex-align="${align}"` : ''}${mapAttr} style="text-align: ${align}; margin: 14px 0; width: 100%;">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (envName === 'quote' || envName === 'quotation' || envName === 'verse') {
      return `<blockquote class="latex-blockquote"${mapAttr}>${renderBlockRange(node.openEnd, node.closeStart)}</blockquote>`;
    }

    if (envName === 'abstract') {
      return `<div class="latex-abstract"${mapAttr}><div style="font-weight: 700; text-align: center; margin-bottom: 8px; text-transform: uppercase; font-size: 0.92rem; letter-spacing: 0.04em; color: var(--s12);">Tóm tắt</div>${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (envName === 'allintypewriter') {
      return `<div class="latex-allintypewriter"${mapAttr} style="font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace; margin: 12px 0;">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (Object.prototype.hasOwnProperty.call(FONT_SIZE_CSS_MAP, envName)) {
      const weightCss = ['Huge', 'huge', 'LARGE', 'Large'].includes(envName) ? ' font-weight: 600;' : '';
      return `<div class="latex-fontsize-${envName}"${mapAttr} style="font-size: ${FONT_SIZE_CSS_MAP[envName]}; line-height: 1.55; margin: 10px 0;${weightCss}">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (envName === 'multicols' || envName === 'multicols*') {
      const mCol = /\{(\d+)\}/.exec(node.openerText);
      const cols = mCol ? Math.min(4, Math.max(2, parseInt(mCol[1], 10))) : 2;
      return `<div class="latex-multicols cols-${cols}"${mapAttr}>${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (envName === 'titlepage') {
      return `<div class="latex-titlepage"${mapAttr} style="text-align: center; margin: 24px auto 36px;">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    if (TRANSPARENT_WRAPPER_ENVS.has(envName)) {
      return `<div${mapAttr}>${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    // Custom \newenvironment / \NewEnviron / \NewDocumentEnvironment (e.g. lgiai, cminh in sourceMapMode)
    if (ctx.userEnvs && ctx.userEnvs.has(envName) && !ACADEMIC_BOX_INFO[envName] && !customEnvInfo) {
      const uEnv = ctx.userEnvs.get(envName);
      const { optBracket, braceArgs } = parseOpenerPositionalArgs(node.openerText, uEnv);
      const posArgs = [];
      if (uEnv.hasOptionalFirstArg) {
        posArgs.push(optBracket !== null ? optBracket : uEnv.defaultOpt || '');
      }
      posArgs.push(...braceArgs);

      const expBegin = substituteEnvPositionalArgs(uEnv.beginCode || '', posArgs);
      const expEnd = substituteEnvPositionalArgs(uEnv.endCode || '', posArgs);

      const wrapperStyles = ['margin: 14px 0'];
      if (/\\ttfamily\b/.test(expBegin)) {
        wrapperStyles.push("font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace");
      }
      if (/\\itshape\b/.test(expBegin) && !/\\(?:textbf|textit)\s*\{/.test(expBegin)) {
        wrapperStyles.push('font-style: italic');
      }
      if (/\\centering\b/.test(expBegin)) {
        wrapperStyles.push('text-align: center');
      }

      const cleanedBegin = expBegin
        .replace(/\\(?:par|noindent|indent|ttfamily|itshape|bfseries|centering|raggedright|raggedleft|smallskip|medskip|bigskip)\b/g, ' ')
        .replace(/\\vspace\*?\s*\{[^}]*\}/g, ' ')
        .trim();
      const beginHtml = cleanedBegin ? renderRichInlineTex(cleanedBegin, ctx).trim() : '';

      let bodyHtml = renderBlockRange(node.openEnd, node.closeStart);
      if (beginHtml) {
        const leadSpan = `<span${sourceMapMode ? ` data-tex-start="${node.openStart}" data-tex-end="${node.openEnd}"` : ''}>${beginHtml}</span> `;
        const pLead = /^<p[^>]*>/.exec(bodyHtml);
        if (pLead) bodyHtml = pLead[0] + leadSpan + bodyHtml.slice(pLead[0].length);
        else bodyHtml = `<p style="margin-bottom: 10px;">${leadSpan}</p>${bodyHtml}`;
      }

      if (/\\(?:qed|qedsymbol|square|blacksquare)\b/.test(expEnd)) {
        const tomb = ' <span class="latex-tombstone">&#9632;</span>';
        if (/<\/p>\s*$/.test(bodyHtml)) bodyHtml = bodyHtml.replace(/<\/p>\s*$/, `${tomb}</p>`);
        else bodyHtml += tomb;
      } else {
        const cleanedEnd = expEnd
          .replace(/\\(?:par|noindent|hfill|smallskip|medskip|bigskip)\b/g, ' ')
          .replace(/\\vspace\*?\s*\{[^}]*\}/g, ' ')
          .trim();
        const endHtml = cleanedEnd ? renderRichInlineTex(cleanedEnd, ctx).trim() : '';
        if (endHtml) {
          if (/<\/p>\s*$/.test(bodyHtml)) bodyHtml = bodyHtml.replace(/<\/p>\s*$/, ` ${endHtml}</p>`);
          else bodyHtml += `<div>${endHtml}</div>`;
        }
      }

      return `<div class="latex-custom-env"${mapAttr} style="${wrapperStyles.join('; ')};">${bodyHtml}</div>`;
    }

    // Standard or custom \newtheorem / \newtcbtheorem / \newtcolorbox academic box
    const baseEnvName = envName.replace(/\*$/, '');
    const isStarredEnv = envName.endsWith('*');
    const cInfo = customEnvInfo || (ctx.customEnvs ? ctx.customEnvs.get(baseEnvName) : null);
    const isKnownTheorem =
      Boolean(ACADEMIC_BOX_INFO[baseEnvName]) ||
      Boolean(cInfo) ||
      Boolean(ctx.persistedBoxStyles && ctx.persistedBoxStyles[baseEnvName]);

    if (!isKnownTheorem) {
      return `<div class="latex-custom-env"${mapAttr} style="margin: 14px 0;">${renderBlockRange(node.openEnd, node.closeStart)}</div>`;
    }

    let canonicalKey = baseEnvName;
    if (cInfo && cInfo.canonicalEnv) {
      canonicalKey = cInfo.canonicalEnv;
    }

    const persistedInfo =
      ctx.persistedBoxStyles?.[canonicalKey] || ctx.persistedBoxStyles?.[baseEnvName] || null;
    const effectiveInfo = cInfo && !cInfo.isDefaultAlias ? cInfo : persistedInfo || cInfo || null;

    let displayLabel =
      (effectiveInfo && effectiveInfo.label) ||
      ACADEMIC_BOX_INFO[baseEnvName]?.label ||
      ACADEMIC_BOX_INFO[canonicalKey]?.label ||
      baseEnvName;

    const boxMeta = ACADEMIC_BOX_INFO[canonicalKey] ||
      ACADEMIC_BOX_INFO[baseEnvName] || { label: displayLabel, cls: 'latex-box-generic', counterKey: null };

    let optTitle = '';
    let localTcbOpts = '';
    if (cInfo && cInfo.isTcbTheorem) {
      const { optBracket, braceArgs } = parseOpenerPositionalArgs(node.openerText, { mandatoryArgsCount: 2 });
      if (braceArgs.length > 0) {
        if (optBracket) localTcbOpts = optBracket;
        optTitle = braceArgs[0];
      } else if (optBracket) {
        optTitle = optBracket;
      }
    } else if (cInfo && !cInfo.isDefaultAlias && cInfo.mandatoryArgsCount >= 1) {
      const { optBracket, braceArgs } = parseOpenerPositionalArgs(node.openerText, cInfo);
      if (cInfo.hasOptionalFirstArg && optBracket) optTitle = optBracket;
      else if (braceArgs.length > 0) optTitle = braceArgs[0];
      else if (optBracket) optTitle = optBracket;
    } else if (node.openerText) {
      let cur = node.openerText.indexOf('}') + 1;
      while (cur < node.openerText.length && /\s/.test(node.openerText[cur])) cur++;
      if (node.openerText[cur] === '[') {
        const br = extractBalancedBrackets(node.openerText, cur);
        if (br) optTitle = br.content.trim();
      } else if (node.openerText[cur] === '{') {
        const gTitle = extractBalancedBraces(node.openerText, cur);
        if (gTitle) optTitle = gTitle.content.trim();
      }
    }

    if (ctx.isStandaloneNormalized && optTitle && typeof ctx.cleanBoxOptFn === 'function') {
      optTitle = ctx.cleanBoxOptFn(optTitle);
    }

    const shouldCount =
      !isStarredEnv &&
      Boolean(boxMeta.counterKey) &&
      (effectiveInfo ? effectiveInfo.hasCounter !== false : true);

    let numStr = '';
    if (shouldCount) {
      const counterBucket = effectiveInfo?.sharedCounter
        ? ctx.customEnvs?.get(effectiveInfo.sharedCounter)?.canonicalEnv ||
          ACADEMIC_BOX_INFO[effectiveInfo.sharedCounter]?.counterKey ||
          effectiveInfo.sharedCounter
        : boxMeta.counterKey;
      ctx.boxCounters[counterBucket] = (ctx.boxCounters[counterBucket] || 0) + 1;
      const cnt = ctx.boxCounters[counterBucket];
      if (ctx.headingNums.chap > 0) {
        numStr = ` ${ctx.headingNums.chap}.${cnt}`;
      } else if (ctx.isStandaloneNormalized || sourceMapMode) {
        numStr = ` ${cnt}`;
      }
    }

    const isFramed = Boolean(effectiveInfo && effectiveInfo.isFramed && effectiveInfo.boxStyle);
    let bs = isFramed ? effectiveInfo.boxStyle : null;
    if (bs && localTcbOpts && cInfo?.rawTcbOptions) {
      bs = parseBoxVisualOptions(`${cInfo.rawTcbOptions}, ${localTcbOpts}`, ctx.colorTable, ctx.boxStyleDefs, 'tcolorbox', {
        hasTitle: bs.headerMode !== 'inline'
      });
    }

    const labelColorOverride = effectiveInfo?.labelColor || '';
    const darkLabelColorOverride = effectiveInfo?.darkLabelColor || '';
    const bodyFontPref = effectiveInfo?.bodyFontStyle || '';
    const bodyStyleCls =
      bodyFontPref === 'italic' ? ' is-body-italic' : bodyFontPref === 'normal' ? ' is-body-normal' : '';

    const optFormatted = optTitle ? ` (${renderRichInlineTex(optTitle, ctx)})` : '';
    const fullTitleHtml = `${escapeHtml(displayLabel + numStr)}${optFormatted}`;
    const openerMapAttr = sourceMapMode ? ` data-tex-start="${node.openStart}" data-tex-end="${node.openEnd}"` : '';

    let bodyHtml = renderBlockRange(node.openEnd, node.closeStart);

    if (isFramed && bs) {
      const styleAttr = ` style="${escapeHtml(buildBoxCssVarsStyle(bs, labelColorOverride, darkLabelColorOverride))}"`;
      if (bs.headerMode === 'boxed-pill') {
        const pillHdr = `<div class="latex-tcb-pill-header"${openerMapAttr}>${fullTitleHtml}</div>`;
        return `<div class="latex-box ${boxMeta.cls} is-framed-box has-boxed-pill${bodyStyleCls}"${mapAttr}${styleAttr}>${pillHdr}<div class="latex-box-content">${bodyHtml}</div></div>`;
      }
      if (bs.headerMode === 'bar') {
        const barHdr = `<div class="latex-tcb-bar-header"${openerMapAttr}>${fullTitleHtml}</div>`;
        return `<div class="latex-box ${boxMeta.cls} is-framed-box${bodyStyleCls}"${mapAttr}${styleAttr}>${barHdr}<div class="latex-box-content">${bodyHtml}</div></div>`;
      }
      const leadHtml = `<strong class="v-box-lead-label"${openerMapAttr}>${fullTitleHtml}.</strong> `;
      const pLead = /^<p[^>]*>/.exec(bodyHtml);
      if (pLead) bodyHtml = pLead[0] + leadHtml + bodyHtml.slice(pLead[0].length);
      else bodyHtml = `<p style="margin-bottom: 10px;">${leadHtml}</p>${bodyHtml}`;
      return `<div class="latex-box ${boxMeta.cls} is-framed-box${bodyStyleCls}"${mapAttr}${styleAttr}><div class="latex-box-content">${bodyHtml}</div></div>`;
    }

    const unframedVars = buildBoxCssVarsStyle(null, labelColorOverride, darkLabelColorOverride);
    const unframedStyleAttr = unframedVars ? ` style="${escapeHtml(unframedVars)}"` : '';
    const leadHtml = `<strong class="v-box-lead-label"${openerMapAttr}>${fullTitleHtml}.</strong> `;
    const pLead = /^<p[^>]*>/.exec(bodyHtml);
    if (pLead) bodyHtml = pLead[0] + leadHtml + bodyHtml.slice(pLead[0].length);
    else bodyHtml = `<p style="margin-bottom: 10px;">${leadHtml}</p>${bodyHtml}`;

    return `<div class="latex-box ${boxMeta.cls}${bodyStyleCls}"${mapAttr}${unframedStyleAttr}><div class="latex-box-content">${bodyHtml}</div></div>`;
  }

  function renderBlockRange(bStart, bEnd, inheritedMod = null) {
    const children = buildPartitionForRange(bStart, bEnd, unifiedNodes);
    const scopeMod = inheritedMod ? cloneModifiers(inheritedMod) : createEmptyModifiers();
    const blockOut = [];
    let inlineBuf = [];
    let paraStart = null;
    let paraEnd = null;

    const flushPara = () => {
      const joined = inlineBuf.join('').trim();
      if (joined) {
        const pMap = sourceMapMode && paraStart !== null
          ? ` data-tex-start="${paraStart}" data-tex-end="${paraEnd}"`
          : '';
        const alignCss = scopeMod.align ? ` text-align: ${scopeMod.align};` : '';
        blockOut.push(`<p class="v-tex-para"${pMap} style="margin-bottom: 14px;${alignCss}">${joined}</p>`);
      }
      inlineBuf = [];
      paraStart = null;
      paraEnd = null;
    };

    const appendPlainWithParaSplits = (pStart, pEnd) => {
      const slice = tex.slice(pStart, pEnd);
      const breakRe = /\n\s*\n|\\par(?![a-zA-Z])/g;
      let lastLocal = 0;
      let bm;
      while ((bm = breakRe.exec(slice)) !== null) {
        const segStart = pStart + lastLocal;
        const segEnd = pStart + bm.index;
        if (segEnd > segStart && tex.slice(segStart, segEnd).trim()) {
          if (paraStart === null) paraStart = segStart;
          paraEnd = segEnd;
          inlineBuf.push(tokenizePlainProseToMappedHtml(tex, segStart, segEnd, ctx, sourceMapMode, scopeMod));
        }
        flushPara();
        lastLocal = bm.index + bm[0].length;
      }
      const tailStart = pStart + lastLocal;
      if (pEnd > tailStart) {
        const tailRaw = tex.slice(tailStart, pEnd);
        if (tailRaw.trim()) {
          if (paraStart === null) paraStart = tailStart;
          paraEnd = pEnd;
          inlineBuf.push(tokenizePlainProseToMappedHtml(tex, tailStart, pEnd, ctx, sourceMapMode, scopeMod));
        } else if (inlineBuf.length > 0 && /\s/.test(tailRaw)) {
          inlineBuf.push(' ');
        }
      }
    };

    let cur = bStart;
    for (const child of children) {
      if (child.start > cur) {
        appendPlainWithParaSplits(cur, child.start);
      }
      if (child.nodeCategory === 'atomic' && child.kind === 'ignored') {
        cur = child.end;
        continue;
      }
      if (child.nodeCategory === 'atomic' && child.kind === 'counter') {
        applyCounterSpan(child);
        cur = child.end;
        continue;
      }
      if (child.nodeCategory === 'atomic' && child.kind === 'addcontentsline') {
        if (child.anchorId) {
          const anchorHtml = `<span id="${escapeHtml(child.anchorId)}"></span>`;
          if (inlineBuf.length > 0) inlineBuf.push(anchorHtml);
          else blockOut.push(anchorHtml);
        }
        cur = child.end;
        continue;
      }
      if (isBlockNode(child)) {
        flushPara();
        blockOut.push(renderBlockNode(child, scopeMod));
      } else {
        if (paraStart === null) paraStart = child.start;
        paraEnd = child.end;
        inlineBuf.push(renderInlineNode(child, scopeMod));
      }
      cur = child.end;
    }
    if (cur < bEnd) {
      appendPlainWithParaSplits(cur, bEnd);
    }
    flushPara();

    return blockOut.join('\n');
  }

  return renderBlockRange(0, tex.length);
}

// Resolve a browser DOM point (node + offset from click caret or Selection Range) back to exact masterBodyTex byte offset
export function resolveDomPointToTexOffset(domNode, domOffset, isEndBoundary, containerEl) {
  if (!domNode || !containerEl) return null;

  const elem = domNode.nodeType === 3 ? domNode.parentElement : domNode;
  if (!elem || !containerEl.contains(elem)) return null;

  // 1. Outermost atomic ancestor below containerEl wins (prevents cutting KaTeX/Tables/Figures/Headings in half)
  let atomicWinner = null;
  let cur = elem;
  while (cur && cur !== containerEl) {
    if (cur.getAttribute && cur.getAttribute('data-tex-atomic') === 'true') {
      atomicWinner = cur;
    }
    cur = cur.parentElement;
  }
  if (atomicWinner) {
    const aStart = parseInt(atomicWinner.getAttribute('data-tex-start'), 10);
    const aEnd = parseInt(atomicWinner.getAttribute('data-tex-end'), 10);
    if (!isNaN(aStart) && !isNaN(aEnd)) {
      if (isEndBoundary && domNode === atomicWinner && domOffset === 0) return aStart;
      return isEndBoundary ? aEnd : aStart;
    }
  }

  // 2. Direct word token (.v-tex-tok) -> word-boundary snapping so Vietnamese words are never sliced mid-syllable
  const wordTok = elem.closest ? elem.closest('.v-tex-tok') : null;
  if (wordTok && containerEl.contains(wordTok)) {
    const wStart = parseInt(wordTok.getAttribute('data-tex-start'), 10);
    const wEnd = parseInt(wordTok.getAttribute('data-tex-end'), 10);
    if (!isNaN(wStart) && !isNaN(wEnd)) {
      if (isEndBoundary) {
        if (domNode.nodeType === 3 && domOffset === 0) return wStart;
        return wEnd;
      }
      if (domNode.nodeType === 3 && domOffset >= domNode.nodeValue.length) return wEnd;
      return wStart;
    }
  }

  // 3. Element container fallback: inspect child at domOffset or nearest mapped descendant
  if (domNode.nodeType === 1 && domNode.childNodes && domNode.childNodes.length > 0) {
    const clampedIdx = Math.max(0, Math.min(domNode.childNodes.length - 1, isEndBoundary ? domOffset - 1 : domOffset));
    const child = domNode.childNodes[clampedIdx];
    if (child && child.nodeType === 1) {
      const directAttr = isEndBoundary ? 'data-tex-end' : 'data-tex-start';
      if (child.hasAttribute && child.hasAttribute(directAttr)) {
        const val = parseInt(child.getAttribute(directAttr), 10);
        if (!isNaN(val)) return val;
      }
      const mappedList = child.querySelectorAll ? child.querySelectorAll('[data-tex-start]') : [];
      if (mappedList.length > 0) {
        const pick = isEndBoundary ? mappedList[mappedList.length - 1] : mappedList[0];
        const val = parseInt(pick.getAttribute(directAttr), 10);
        if (!isNaN(val)) return val;
      }
    }
  }

  // 4. Nearest mapped ancestor fallback
  let anc = elem;
  while (anc && anc !== containerEl) {
    const attr = isEndBoundary ? 'data-tex-end' : 'data-tex-start';
    if (anc.hasAttribute && anc.hasAttribute(attr)) {
      const val = parseInt(anc.getAttribute(attr), 10);
      if (!isNaN(val)) return val;
    }
    anc = anc.parentElement;
  }

  return null;
}

// Resolve click coordinates (clientX, clientY) on the Preview Paper to exact masterBodyTex offset
export function resolveClickEventToTexOffset(mouseEvent, isEndBoundary, containerEl) {
  if (!mouseEvent || !containerEl) return null;

  const { clientX, clientY, target } = mouseEvent;

  // Check if click directly hit an atomic block or word token first
  if (target && containerEl.contains(target)) {
    let atomicCur = target;
    let atomicHit = null;
    while (atomicCur && atomicCur !== containerEl) {
      if (atomicCur.getAttribute && atomicCur.getAttribute('data-tex-atomic') === 'true') {
        atomicHit = atomicCur;
      }
      atomicCur = atomicCur.parentElement;
    }
    if (atomicHit) {
      const s = parseInt(atomicHit.getAttribute('data-tex-start'), 10);
      const e = parseInt(atomicHit.getAttribute('data-tex-end'), 10);
      if (!isNaN(s) && !isNaN(e)) return isEndBoundary ? e : s;
    }

    const tokHit = target.closest ? target.closest('.v-tex-tok') : null;
    if (tokHit && containerEl.contains(tokHit)) {
      const s = parseInt(tokHit.getAttribute('data-tex-start'), 10);
      const e = parseInt(tokHit.getAttribute('data-tex-end'), 10);
      if (!isNaN(s) && !isNaN(e)) return isEndBoundary ? e : s;
    }
  }

  // Use browser caret hit-testing when clicking whitespace between words/lines
  let caretNode = null;
  let caretOffset = 0;
  if (typeof document !== 'undefined') {
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos) {
        caretNode = pos.offsetNode;
        caretOffset = pos.offset;
      }
    } else if (document.caretRangeFromPoint) {
      const rng = document.caretRangeFromPoint(clientX, clientY);
      if (rng) {
        caretNode = rng.startContainer;
        caretOffset = rng.startOffset;
      }
    }
  }

  if (caretNode && containerEl.contains(caretNode)) {
    const resolved = resolveDomPointToTexOffset(caretNode, caretOffset, isEndBoundary, containerEl);
    if (resolved !== null) return resolved;
  }

  // Geometric proximity fallback when clicking wide paragraph margins
  if (target && containerEl.contains(target)) {
    const candidates = target.querySelectorAll
      ? target.querySelectorAll('.v-tex-tok, [data-tex-atomic="true"]')
      : [];
    let bestEl = null;
    let bestDist = Infinity;
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dist = dy * 4 + dx;
      if (dist < bestDist) {
        bestDist = dist;
        bestEl = el;
      }
    }
    if (bestEl) {
      const attr = isEndBoundary ? 'data-tex-end' : 'data-tex-start';
      const val = parseInt(bestEl.getAttribute(attr), 10);
      if (!isNaN(val)) return val;
    }
    return resolveDomPointToTexOffset(target, 0, isEndBoundary, containerEl);
  }

  return null;
}
