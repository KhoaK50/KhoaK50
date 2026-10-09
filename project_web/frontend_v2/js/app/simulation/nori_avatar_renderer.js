/**
 * Nori Avatar Renderer & Parametric Living SVG Engine v9
 * Vectoria Academic Companion - Anti-Slop Academic PDF Architecture
 * 
 * Replaces legacy 24 expressions with 6 authentic Core Pedagogical States:
 *  1. FOCUSED_NEUTRAL: 3.8s deep breath, biological blinks, attentive focus.
 *  2. JOY_INSIGHT: Eyes light up, joyful smile, polite gentle nod (1.2s hold -> auto-decay).
 *  3. EMPATHETIC_HINT: 3° comforting tilt, warm eyebrows, reassuring companion.
 *  4. THINKING_CONTEMPLATE: 15° upward gaze, furrowed brow, contemplative chin rest.
 *  5. RESTFUL_PAUSE: Relaxed eyelids, deep 4.5s slow breath, study break reminder.
 *  6. CURIOUS_ALERT: Perked ears, round inquisitive eyes, new theorem discovery.
 * 
 * Features:
 *  - Procedural Gaze Tracking (clamped ±1.8px, exponential smoothing).
 *  - Biological Blink Cycle (Poisson random 3.5s - 5.0s, 15% double-blink).
 *  - Organic Ear Twitches & Voice Waveform Flap.
 *  - 100% Pure SVG Vector Engine, 0 External Dependencies.
 */
(function(global) {
    'use strict';

    // 1. Core Pedagogical State Definitions
    const NORI_PEDAGOGICAL_STATES = Object.freeze({
        FOCUSED_NEUTRAL: 'focused_neutral',
        JOY_INSIGHT: 'joy_insight',
        EMPATHETIC_HINT: 'empathetic_hint',
        THINKING_CONTEMPLATE: 'thinking_contemplate',
        RESTFUL_PAUSE: 'restful_pause',
        CURIOUS_ALERT: 'curious_alert'
    });

    const PEDAGOGICAL_METADATA = {
        'focused_neutral': {
            id: 'focused_neutral',
            col: '#d97706',
            bg: '#fffbeb',
            label: 'Tập trung / Lắng nghe (Focused Neutral)',
            desc: 'Tư thế đĩnh đạc, thở êm 3.8s, chớp mắt sinh học, tập trung lắng nghe bài giảng.',
            speech: 'Mình đang lắng nghe bạn đây. Bạn cứ thong thả đọc đề và ghi chép, khi nào cần gợi ý cứ bảo mình nhé!'
        },
        'joy_insight': {
            id: 'joy_insight',
            col: '#16a34a',
            bg: '#f0fdf4',
            label: 'Hứng khởi / Ngộ ra (Joy Insight)',
            desc: 'Ánh mắt sáng lên, mỉm cười rạng rỡ, gật đầu nhẹ nhàng lịch thiệp mừng rỡ khi làm đúng, duy trì 1.2s rồi tự hạ nhiệt.',
            speech: 'Xuất sắc! Lập luận của bạn rất chặt chẽ và chính xác. Cứ phát huy thế này nhé!'
        },
        'empathetic_hint': {
            id: 'empathetic_hint',
            col: '#0284c7',
            bg: '#f0f9ff',
            label: 'Thấu cảm / Đồng hành (Empathetic Hint)',
            desc: 'Đầu khẽ nghiêng 3°, cung mày ấm áp động viên khi học sinh làm sai hoặc bế tắc.',
            speech: 'Không sao cả đâu, định lý này ai mới học cũng dễ nhầm lẫn. Chúng mình cùng kiểm tra lại từng bước tính nhé.'
        },
        'thinking_contemplate': {
            id: 'thinking_contemplate',
            col: '#b45309',
            bg: '#fffbeb',
            label: 'Trầm ngâm / Suy tư (Thinking Contemplate)',
            desc: 'Mắt hơi liếc lên trên 15°, lông mày khẽ tập trung suy ngẫm cùng người học.',
            speech: 'Bài toán này có cấu trúc ma trận khá thú vị... Hãy thử nghĩ xem định thức của nó thay đổi thế nào khi ta nhân hai hàng?'
        },
        'restful_pause': {
            id: 'restful_pause',
            col: '#0d9488',
            bg: '#f0fdfa',
            label: 'Thư thái / Giữ sức (Restful Pause)',
            desc: 'Mí mắt rủ nhẹ thư thái, nhịp thở chậm lại (4.5s), nhắc nhở giải lao sau giờ giải toán căng thẳng.',
            speech: 'Bạn đã tập trung liên tục hơn 40 phút rồi. Hãy vươn vai uống một ngụm nước để não bộ nạp lại năng lượng nhé.'
        },
        'curious_alert': {
            id: 'curious_alert',
            col: '#8b5cf6',
            bg: '#f5f3ff',
            label: 'Hiếu kỳ / Định lý mới (Curious Alert)',
            desc: 'Hai tai vểnh nhẹ, mắt mở tròn tò mò khi xuất hiện định lý hoặc kiến thức mới thú vị.',
            speech: 'Ồ! Một bổ đề mới xuất hiện kìa! Tính chất trực giao này sẽ giúp rút ngắn một nửa phép tính đấy, cùng khám phá nào!'
        }
    };

    /**
     * Normalizes any input mood string (canonical or legacy) to one of the 6 core pedagogical states.
     */
    function normalizePedagogicalMood(inputMood) {
        if (!inputMood) return NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL;
        const key = String(inputMood).trim().toLowerCase().replace(/[-]/g, '_');

        if (key === 'joy_insight' || key.includes('insight') || key.includes('joy') || key.startsWith('proud') || key === 'ecstatic' || key === 'celebratory_proud') {
            return NORI_PEDAGOGICAL_STATES.JOY_INSIGHT;
        }
        if (key === 'empathetic_hint' || key.includes('empath') || key.includes('hint') || key.startsWith('comfort')) {
            return NORI_PEDAGOGICAL_STATES.EMPATHETIC_HINT;
        }
        if (key === 'thinking_contemplate' || key.includes('contemplat') || key.startsWith('thoughtful') || key === 'thinking' || key === 'puzzled_2') {
            return NORI_PEDAGOGICAL_STATES.THINKING_CONTEMPLATE;
        }
        if (key === 'restful_pause' || key.includes('rest') || key.includes('pause') || key.startsWith('relieved') || key === 'idle_rest' || key === 'sleep') {
            return NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE;
        }
        if (key === 'curious_alert' || key.includes('curious') || key.includes('alert') || key.startsWith('puzzled') || key.startsWith('shocked') || key.startsWith('stern') || key.startsWith('wink')) {
            return NORI_PEDAGOGICAL_STATES.CURIOUS_ALERT;
        }
        return NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL;
    }

    /**
     * Retrieves visual metadata (color, background, label, speech) for a mood.
     */
    function getMoodColorAndLabel(mood) {
        const canonical = normalizePedagogicalMood(mood);
        return PEDAGOGICAL_METADATA[canonical] || PEDAGOGICAL_METADATA['focused_neutral'];
    }

    /**
     * Injects living CSS animation keyframes once into the document if running in a browser.
     */
    function ensureNoriStylesInjected() {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || typeof document.createElement !== 'function') return;
        if (document.getElementById('nori-living-engine-styles')) return;

        const style = document.createElement('style');
        style.id = 'nori-living-engine-styles';
        style.textContent = `
            /* === NORI PARAMETRIC LIVING ENGINE STYLES === */
            @keyframes noriBreathe {
                0%, 100% { transform: translateY(0px) scale(1, 1); }
                50% { transform: translateY(-1.3px) scale(1.015, 0.985); }
            }
            .actor-breathe {
                animation: noriBreathe 3.8s infinite cubic-bezier(0.4, 0, 0.6, 1);
                transform-origin: 50px 75px;
            }

            @keyframes noriRestfulBreathe {
                0%, 100% { transform: translateY(0px) scale(1, 1); }
                50% { transform: translateY(-0.9px) scale(1.01, 0.99); }
            }
            .actor-restful-breathe {
                animation: noriRestfulBreathe 4.5s infinite cubic-bezier(0.4, 0, 0.6, 1);
                transform-origin: 50px 75px;
            }

            @keyframes noriInsightNod {
                0% { transform: translateY(0px) scale(1, 1); }
                25% { transform: translateY(-2.2px) scale(1.02, 0.98); }
                50% { transform: translateY(1.2px) scale(0.99, 1.01); }
                75% { transform: translateY(-0.8px) scale(1.01, 0.99); }
                100% { transform: translateY(0px) scale(1, 1); }
            }
            .actor-insight-nod {
                animation: noriInsightNod 1.2s cubic-bezier(0.25, 1, 0.5, 1);
                transform-origin: 50px 75px;
            }

            @keyframes noriCuriousAlert {
                0%, 100% { transform: translateY(-0.8px) scale(1, 1); }
                50% { transform: translateY(-1.6px) scale(1.012, 0.988); }
            }
            .actor-curious {
                animation: noriCuriousAlert 3.2s infinite cubic-bezier(0.4, 0, 0.6, 1);
                transform-origin: 50px 75px;
            }

            @keyframes eyeBlink {
                0%, 100% { transform: scaleY(1); }
                45%, 55% { transform: scaleY(0.08); }
            }
            @keyframes eyeDoubleBlink {
                0%, 100% { transform: scaleY(1); }
                18%, 28% { transform: scaleY(0.08); }
                48% { transform: scaleY(1); }
                68%, 78% { transform: scaleY(0.08); }
            }
            .companion-eyes.eye-blink {
                animation: eyeBlink 0.24s cubic-bezier(0.25, 1, 0.5, 1);
                transform-origin: 50px 49px;
            }
            .companion-eyes.eye-double-blink {
                animation: eyeDoubleBlink 0.44s cubic-bezier(0.25, 1, 0.5, 1);
                transform-origin: 50px 49px;
            }

            @keyframes earTwitchLeftKey {
                0%, 100% { transform: rotate(0deg); }
                30% { transform: rotate(-6deg) scale(1.03); }
                60% { transform: rotate(1.5deg); }
                80% { transform: rotate(-2deg); }
            }
            @keyframes earTwitchRightKey {
                0%, 100% { transform: rotate(0deg); }
                30% { transform: rotate(6deg) scale(1.03); }
                60% { transform: rotate(-1.5deg); }
                80% { transform: rotate(2deg); }
            }
            .companion-ear-left.ear-twitch {
                animation: earTwitchLeftKey 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
                transform-origin: 25px 23px;
            }
            .companion-ear-right.ear-twitch {
                animation: earTwitchRightKey 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
                transform-origin: 75px 23px;
            }

            @keyframes mathWaveBar {
                0%, 100% { height: 4px; }
                50% { height: 12px; }
            }

            @media (prefers-reduced-motion: reduce) {
                #nori-actor.actor-breathe,
                #nori-actor.actor-restful-breathe,
                #nori-actor.actor-insight-nod,
                #nori-actor.actor-curious,
                #nori-pose,
                .companion-ear-left-pose,
                .companion-ear-right-pose,
                .companion-eyes.eye-blink,
                .companion-eyes.eye-double-blink,
                .companion-ear-left.ear-twitch,
                .companion-ear-right.ear-twitch,
                .companion-voice-waves span,
                #vectoria-avatar-voice-waves span {
                    animation: none !important;
                    transition: none !important;
                }
            }

            .nori-reduced-motion #nori-actor.actor-breathe,
            .nori-reduced-motion #nori-actor.actor-restful-breathe,
            .nori-reduced-motion #nori-actor.actor-insight-nod,
            .nori-reduced-motion #nori-actor.actor-curious,
            .nori-reduced-motion #nori-pose,
            .nori-reduced-motion .companion-ear-left-pose,
            .nori-reduced-motion .companion-ear-right-pose,
            .nori-reduced-motion .companion-eyes.eye-blink,
            .nori-reduced-motion .companion-eyes.eye-double-blink,
            .nori-reduced-motion .companion-ear-left.ear-twitch,
            .nori-reduced-motion .companion-ear-right.ear-twitch,
            .nori-reduced-motion .companion-voice-waves span,
            .nori-reduced-motion #vectoria-avatar-voice-waves span {
                animation: none !important;
                transition: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Shared organic palette for Vectoria academic companion
    const NORI_PALETTE = Object.freeze({
        cBody: '#f59e0b',
        cShade: '#d97706',
        cTummy: '#fefae0',
        cInner: '#fecdd3',
        cStroke: '#78350f',
        cEye: '#292524',
        cBlush: 'rgba(244, 63, 94, 0.38)',
        cMouthBg: '#451a03',
        cTongue: '#fb7185'
    });

    /**
     * Extracts visual configuration and SVG snippets for each of the 6 canonical states.
     */
    function getPedagogicalStateVisuals(canonicalMood, isTalking = false) {
        const canonical = normalizePedagogicalMood(canonicalMood);
        const { cBody, cShade, cInner, cStroke, cEye, cMouthBg, cTongue } = NORI_PALETTE;
        const isReducedMotion = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
            (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('nori-reduced-motion'));

        const speechMouthMarkup = isReducedMotion ? `
            <g class="companion-mouth">
                <path d="M 46 59 Q 50 58 54 59 Q 54 63.2 50 63.5 Q 46 63.2 46 59 Z" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round"/>
                <ellipse cx="50" cy="63.5" rx="2.4" ry="1.2" fill="${cTongue}"/>
            </g>
        ` : `
            <g class="companion-mouth">
                <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                    <animate attributeName="d" dur="0.42s" repeatCount="indefinite"
                        values="
                            M 46 59 Q 50 58 54 59 Q 54 63.2 50 63.5 Q 46 63.2 46 59 Z;
                            M 44.5 58 Q 50 57 55.5 58 Q 55.5 65 50 65.5 Q 44.5 65 44.5 58 Z;
                            M 46 59 Q 50 58 54 59 Q 54 63.2 50 63.5 Q 46 63.2 46 59 Z
                        "
                    />
                </path>
                <ellipse cx="50" cy="63.5" rx="2.4" ry="1.2" fill="${cTongue}"/>
            </g>
        `;

        let headRot = 0;
        let headTy = 0;
        let leftEarRot = 0;
        let rightEarRot = 0;
        let actorAnimClass = 'actor-breathe';
        let browsMarkup = '';
        let eyesMarkup = '';
        let mouthMarkup = '';
        let pawsMarkup = '';

        // 1. FOCUSED_NEUTRAL: Attentive, centered posture, 3.8s respiration
        if (canonical === NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL) {
            headRot = 0;
            headTy = 0;
            leftEarRot = 0;
            rightEarRot = 0;
            actorAnimClass = 'actor-breathe';

            browsMarkup = `
                <path d="M 34 40.5 Q 39 38 45 40.5" stroke="${cStroke}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
                <path d="M 55 40.5 Q 61 38 66 40.5" stroke="${cStroke}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.2" ry="5.8" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.2" ry="5.8" fill="${cEye}"/>
                <circle cx="39.6" cy="46.8" r="1.8" fill="#ffffff"/>
                <circle cx="63.6" cy="46.8" r="1.8" fill="#ffffff"/>
                <circle cx="36.8" cy="51.2" r="0.85" fill="#ffffff" opacity="0.85"/>
                <circle cx="60.8" cy="51.2" r="0.85" fill="#ffffff" opacity="0.85"/>
            `;
            mouthMarkup = isTalking ? speechMouthMarkup : `
                <path d="M 45.5 59.5 Q 50 61.5 54.5 59.5" stroke="${cStroke}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
        }
        // 2. JOY_INSIGHT: Eyes light up, joyful smile, polite gentle nod (1.2s)
        else if (canonical === NORI_PEDAGOGICAL_STATES.JOY_INSIGHT) {
            headRot = 0;
            headTy = -1.0;
            leftEarRot = -3;
            rightEarRot = 3;
            actorAnimClass = 'actor-insight-nod';

            browsMarkup = `
                <path d="M 33 37.5 Q 39 34 45 37.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
                <path d="M 55 37.5 Q 61 34 67 37.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="48.5" rx="5.4" ry="6.0" fill="${cEye}"/>
                <ellipse cx="62" cy="48.5" rx="5.4" ry="6.0" fill="${cEye}"/>
                <circle cx="39.8" cy="46.2" r="2.2" fill="#ffffff"/>
                <circle cx="63.8" cy="46.2" r="2.2" fill="#ffffff"/>
                <circle cx="36.5" cy="51" r="1.1" fill="#ffffff" opacity="0.9"/>
                <circle cx="60.5" cy="51" r="1.1" fill="#ffffff" opacity="0.9"/>
                <polygon points="41,48 42,48 42.5,47.5 42,47 41,47 40.5,47.5" fill="#ffffff"/>
                <polygon points="65,48 66,48 66.5,47.5 66,47 65,47 64.5,47.5" fill="#ffffff"/>
            `;
            mouthMarkup = isTalking ? speechMouthMarkup : `
                <g class="companion-mouth">
                    <path d="M 44.5 58.5 Q 50 63.5 55.5 58.5 Q 50 64.5 44.5 58.5 Z" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2"/>
                    <ellipse cx="50" cy="62" rx="2.4" ry="1.2" fill="${cTongue}"/>
                </g>
            `;
            pawsMarkup = `
                <ellipse cx="35" cy="61" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="65" cy="61" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
        }
        // 3. EMPATHETIC_HINT: Gentle 3° head tilt, comforting warm brows
        else if (canonical === NORI_PEDAGOGICAL_STATES.EMPATHETIC_HINT) {
            headRot = 3;
            headTy = 0;
            leftEarRot = 2;
            rightEarRot = -2;
            actorAnimClass = 'actor-breathe';

            browsMarkup = `
                <path d="M 34 42 Q 40 39.5 46 42.5" stroke="${cStroke}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
                <path d="M 54 42.5 Q 60 39.5 66 42" stroke="${cStroke}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.0" ry="5.5" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.0" ry="5.5" fill="${cEye}"/>
                <circle cx="39.6" cy="47.2" r="1.9" fill="#ffffff"/>
                <circle cx="63.6" cy="47.2" r="1.9" fill="#ffffff"/>
                <circle cx="36.8" cy="51.2" r="0.9" fill="#ffffff" opacity="0.85"/>
                <circle cx="60.8" cy="51.2" r="0.9" fill="#ffffff" opacity="0.85"/>
            `;
            mouthMarkup = isTalking ? speechMouthMarkup : `
                <path d="M 46 60.5 Q 50 62 54 60.5" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <ellipse cx="44.5" cy="63.5" rx="4.2" ry="3.4" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="55.5" cy="63.5" rx="4.2" ry="3.4" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
        }
        // 4. THINKING_CONTEMPLATE: 15° upward gaze, furrowed brow, chin-rest paw
        else if (canonical === NORI_PEDAGOGICAL_STATES.THINKING_CONTEMPLATE) {
            headRot = -2.5;
            headTy = 0;
            leftEarRot = -2;
            rightEarRot = 1;
            actorAnimClass = 'actor-breathe';

            browsMarkup = `
                <path d="M 34 39 Q 40 40.5 45 38.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
                <path d="M 55 38.5 Q 60 40.5 66 39" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="47" rx="5.0" ry="5.4" fill="${cEye}"/>
                <ellipse cx="62" cy="47" rx="5.0" ry="5.4" fill="${cEye}"/>
                <circle cx="39.5" cy="44.8" r="1.8" fill="#ffffff"/>
                <circle cx="63.5" cy="44.8" r="1.8" fill="#ffffff"/>
                <circle cx="36.8" cy="49.2" r="0.85" fill="#ffffff" opacity="0.85"/>
                <circle cx="60.8" cy="49.2" r="0.85" fill="#ffffff" opacity="0.85"/>
            `;
            mouthMarkup = isTalking ? speechMouthMarkup : `
                <path d="M 46 60 Q 50 59.2 54 60" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <ellipse cx="35" cy="63" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="60" cy="57" rx="4.2" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
        }
        // 5. RESTFUL_PAUSE: Relaxed eyelids, deep 4.5s respiration, peaceful rest
        else if (canonical === NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE) {
            headRot = 0;
            headTy = 1.0;
            leftEarRot = -4;
            rightEarRot = 4;
            actorAnimClass = 'actor-restful-breathe';

            browsMarkup = `
                <path d="M 34 42 Q 39 40.5 45 42" stroke="${cStroke}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
                <path d="M 55 42 Q 61 40.5 66 42" stroke="${cStroke}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <path d="M 33 49.5 Q 38 53 43 49.5" stroke="${cEye}" stroke-width="2.3" stroke-linecap="round" fill="none"/>
                <path d="M 57 49.5 Q 62 53 67 49.5" stroke="${cEye}" stroke-width="2.3" stroke-linecap="round" fill="none"/>
            `;
            mouthMarkup = isTalking ? speechMouthMarkup : `
                <path d="M 46 60.5 Q 50 62 54 60.5" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <ellipse cx="38" cy="65" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="62" cy="65" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
        }
        // 6. CURIOUS_ALERT: Perked ears, round inquisitive eyes, theorem discovery
        else if (canonical === NORI_PEDAGOGICAL_STATES.CURIOUS_ALERT) {
            headRot = 0;
            headTy = -1.2;
            leftEarRot = 6;
            rightEarRot = -6;
            actorAnimClass = 'actor-curious';

            browsMarkup = `
                <path d="M 33 36.5 Q 39 33.5 45 36.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
                <path d="M 55 36.5 Q 61 33.5 67 36.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <circle cx="38" cy="48" r="5.6" fill="${cEye}"/>
                <circle cx="62" cy="48" r="5.6" fill="${cEye}"/>
                <circle cx="39.6" cy="46" r="2.2" fill="#ffffff"/>
                <circle cx="63.6" cy="46" r="2.2" fill="#ffffff"/>
                <circle cx="36.5" cy="50.2" r="1.0" fill="#ffffff" opacity="0.9"/>
                <circle cx="60.5" cy="50.2" r="1.0" fill="#ffffff" opacity="0.9"/>
            `;
            mouthMarkup = isTalking ? speechMouthMarkup : `
                <ellipse cx="50" cy="60.5" rx="2.4" ry="2.8" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="50" cy="62" rx="1.5" ry="1.0" fill="${cTongue}"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62.5" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62.5" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
        }

        return {
            headRot,
            headTy,
            leftEarRot,
            rightEarRot,
            actorAnimClass,
            browsMarkup,
            eyesMarkup,
            mouthMarkup,
            pawsMarkup
        };
    }

    /**
     * Main Renderer: Generates pure SVG string for the 6 Core Pedagogical States.
     * Architectural feature: Breathing animation root (#nori-actor) is cleanly separated
     * from the pedagogical pose posture (#nori-pose), ensuring keyframes do not clobber
     * head tilt angles or ear displacements.
     */
    function renderMentorAvatarHTML(mood = 'focused_neutral', isTalking = false, accentColor = '') {
        ensureNoriStylesInjected();

        const canonical = normalizePedagogicalMood(mood);
        const meta = PEDAGOGICAL_METADATA[canonical] || PEDAGOGICAL_METADATA['focused_neutral'];
        const col = accentColor || meta.col;
        const uid = 'v' + Math.random().toString(36).substring(2, 7);
        const displayWave = isTalking ? 'flex' : 'none';

        const { cBody, cShade, cTummy, cInner, cStroke, cEye, cBlush } = NORI_PALETTE;
        const p = getPedagogicalStateVisuals(canonical, isTalking);

        const headPath = `
            M 50 19
            C 72 19, 85 30, 85 47
            C 85 62, 79 74, 69 79
            C 59 84, 41 84, 31 79
            C 21 74, 15 62, 15 47
            C 15 30, 28 19, 50 19 Z
        `;
        const bellyPath = `
            M 50 43
            C 63 43, 73 51, 73 63
            C 73 74, 63 79, 50 79
            C 37 79, 27 74, 27 63
            C 27 51, 37 43, 50 43 Z
        `;

        const cheeksMarkup = `
            <ellipse cx="25" cy="56" rx="5.2" ry="3.0" fill="${cBlush}"/>
            <ellipse cx="75" cy="56" rx="5.2" ry="3.0" fill="${cBlush}"/>
        `;

        return `
        <div class="vectoria-companion-avatar" style="display:inline-flex; flex-direction:column; align-items:center; position:relative;" data-nori-state="${canonical}" data-nori-talking="${!!isTalking}">
            <svg width="88" height="88" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible;">
                <defs>
                    <radialGradient id="${uid}-body" cx="45%" cy="35%" r="65%">
                        <stop offset="0%" stop-color="${cBody}"/>
                        <stop offset="100%" stop-color="${cShade}"/>
                    </radialGradient>
                    <radialGradient id="${uid}-shadow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="rgba(30, 20, 15, 0.22)"/>
                        <stop offset="100%" stop-color="rgba(30, 20, 15, 0)"/>
                    </radialGradient>
                </defs>

                <!-- Ground Shadow -->
                <ellipse cx="50" cy="92" rx="26" ry="4" fill="url(#${uid}-shadow)"/>

                <!-- Breathing / Respiration Animation Root -->
                <g id="nori-actor" class="companion-floating-body ${p.actorAnimClass}">
                    
                    <!-- Pedagogical Pose Root with 300ms CSS Blending Transition -->
                    <g id="nori-pose" class="companion-pose" style="transform: translate(0px, ${p.headTy}px) rotate(${p.headRot}deg); transform-origin: 50px 55px; transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);">
                        
                        <!-- Left Ear: Pose Slant Group + Organic Twitch Subgroup -->
                        <g class="companion-ear-left-pose" style="transform: rotate(${-10 + p.leftEarRot}deg); transform-origin: 25px 23px; transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);">
                            <g class="companion-ear-left" style="transform-origin: 25px 23px;">
                                <ellipse cx="25" cy="22" rx="10.5" ry="9.5" fill="url(#${uid}-body)" stroke="${cStroke}" stroke-width="1.6"/>
                                <ellipse cx="25.5" cy="22.5" rx="6.2" ry="5.4" fill="${cInner}"/>
                            </g>
                        </g>

                        <!-- Right Ear: Pose Slant Group + Organic Twitch Subgroup -->
                        <g class="companion-ear-right-pose" style="transform: rotate(${10 + p.rightEarRot}deg); transform-origin: 75px 23px; transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);">
                            <g class="companion-ear-right" style="transform-origin: 75px 23px;">
                                <ellipse cx="75" cy="22" rx="10.5" ry="9.5" fill="url(#${uid}-body)" stroke="${cStroke}" stroke-width="1.6"/>
                                <ellipse cx="74.5" cy="22.5" rx="6.2" ry="5.4" fill="${cInner}"/>
                            </g>
                        </g>

                        <!-- Feet -->
                        <ellipse cx="35" cy="85" rx="7.5" ry="4.5" fill="${cShade}" stroke="${cStroke}" stroke-width="1.4"/>
                        <ellipse cx="65" cy="85" rx="7.5" ry="4.5" fill="${cShade}" stroke="${cStroke}" stroke-width="1.4"/>

                        <!-- Head & Body Silhouette -->
                        <path d="${headPath}" fill="url(#${uid}-body)" stroke="${cStroke}" stroke-width="1.6"/>
                        <path d="${bellyPath}" fill="${cTummy}" opacity="0.95"/>

                        <!-- Cheeks -->
                        ${cheeksMarkup}

                        <!-- Eyebrows -->
                        <g class="companion-eyebrows">${p.browsMarkup}</g>

                        <!-- Eyes with Living Gaze Tracking Layer -->
                        <g class="companion-eyes">
                            <g class="nori-gaze-layer" style="transform: translate(0px, 0px);">
                                ${p.eyesMarkup}
                            </g>
                        </g>

                        <!-- Nose -->
                        <ellipse cx="50" cy="54" rx="1.5" ry="1.1" fill="${cEye}" opacity="0.65"/>

                        <!-- Mouth -->
                        <g class="companion-mouth-wrap">${p.mouthMarkup}</g>

                        <!-- Paws -->
                        <g class="companion-paws">${p.pawsMarkup}</g>
                    </g>
                </g>
            </svg>

            <!-- Talking Waveform Badge -->
            <div id="vectoria-avatar-voice-waves" class="companion-voice-waves" style="display: ${displayWave}; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); background: var(--bg-card); border: 1px solid ${col}; border-radius: 0px; padding: 2px 7px; gap: 3px; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
                <span style="display: block; width: 2.5px; height: 4px; background: ${col}; border-radius: 1px; animation: mathWaveBar 0.5s infinite ease-in-out;"></span>
                <span style="display: block; width: 2.5px; height: 10px; background: ${col}; border-radius: 1px; animation: mathWaveBar 0.4s infinite ease-in-out 0.1s;"></span>
                <span style="display: block; width: 2.5px; height: 6px; background: ${col}; border-radius: 1px; animation: mathWaveBar 0.6s infinite ease-in-out 0.2s;"></span>
            </div>
        </div>
        `.trim();
    }

    /**
     * In-place Avatar Morpher: Seamlessly blends an already-mounted Nori avatar
     * into the new pedagogical state using CSS transitions (~300ms) without DOM teardown.
     */
    function updateMentorAvatar(mount, mood = 'focused_neutral', isTalking = false, accentColor = '') {
        ensureNoriStylesInjected();
        let container = null;
        if (typeof mount === 'string') {
            if (typeof document !== 'undefined') {
                try { container = document.querySelector(mount); } catch (e) { container = null; }
            }
        } else if (mount && mount.nodeType === 1) {
            container = mount;
        }
        if (!container) return;

        const canonical = normalizePedagogicalMood(mood);
        const existingAvatar = container.querySelector('.vectoria-companion-avatar');
        const actor = container.querySelector('#nori-actor');
        const pose = container.querySelector('#nori-pose');
        const gazeLayer = container.querySelector('.nori-gaze-layer');

        // Fallback to fresh render if DOM is empty or missing essential parametric hierarchy
        if (!existingAvatar || !actor || !pose || !gazeLayer) {
            container.innerHTML = renderMentorAvatarHTML(canonical, isTalking, accentColor);
            return;
        }

        const prevMood = (typeof existingAvatar.getAttribute === 'function') ? existingAvatar.getAttribute('data-nori-state') : null;
        const prevTalking = (typeof existingAvatar.getAttribute === 'function') ? (existingAvatar.getAttribute('data-nori-talking') === 'true') : false;
        const isStateChanged = (prevMood !== canonical || prevTalking !== !!isTalking);

        if (typeof existingAvatar.setAttribute === 'function') {
            existingAvatar.setAttribute('data-nori-state', canonical);
            existingAvatar.setAttribute('data-nori-talking', String(!!isTalking));
        }

        const earLeftPose = container.querySelector('.companion-ear-left-pose');
        const earRightPose = container.querySelector('.companion-ear-right-pose');
        const brows = container.querySelector('.companion-eyebrows');
        const mouthWrap = container.querySelector('.companion-mouth-wrap');
        const paws = container.querySelector('.companion-paws');
        const waves = container.querySelector('#vectoria-avatar-voice-waves, .companion-voice-waves');
        const eyesWrap = container.querySelector('.companion-eyes');

        const meta = PEDAGOGICAL_METADATA[canonical] || PEDAGOGICAL_METADATA['focused_neutral'];
        const col = accentColor || meta.col;
        const p = getPedagogicalStateVisuals(canonical, isTalking);

        // Update Breathing / Animation Root
        if (actor) {
            actor.classList.remove('actor-breathe', 'actor-restful-breathe', 'actor-insight-nod', 'actor-curious');
            if (p.actorAnimClass === 'actor-insight-nod') {
                void (actor.offsetWidth || (actor.getBoundingClientRect && actor.getBoundingClientRect().width));
            }
            actor.classList.add(p.actorAnimClass);
        }

        // Update Pose (smooth 300ms transition via CSS)
        if (pose) {
            pose.style.transform = `translate(0px, ${p.headTy}px) rotate(${p.headRot}deg)`;
        }

        // Update Ears Pose (smooth 300ms transition via CSS)
        if (earLeftPose) {
            earLeftPose.style.transform = `rotate(${-10 + p.leftEarRot}deg)`;
        }
        if (earRightPose) {
            earRightPose.style.transform = `rotate(${10 + p.rightEarRot}deg)`;
        }

        // When switching to RESTFUL_PAUSE, cancel any active blink squashing closed eyelids
        if (eyesWrap && canonical === NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE) {
            eyesWrap.classList.remove('eye-blink', 'eye-double-blink');
        }

        // Update Eyebrows, Eyes, Mouth, Paws in-place only if state changed (avoid redundant DOM mutation)
        if (isStateChanged) {
            if (brows) brows.innerHTML = p.browsMarkup;
            if (gazeLayer) gazeLayer.innerHTML = p.eyesMarkup;
            if (mouthWrap) mouthWrap.innerHTML = p.mouthMarkup;
            if (paws) paws.innerHTML = p.pawsMarkup;
        }

        // Update Voice Waves
        if (waves) {
            waves.style.display = isTalking ? 'flex' : 'none';
            waves.style.borderColor = col;
            waves.querySelectorAll('span').forEach(bar => {
                bar.style.backgroundColor = col;
            });
        }
    }

    // ============================================================================
    // NORI PARAMETRIC LIVING IDLE ENGINE
    // ============================================================================
    class NoriLivingIdleEngine {
        constructor(mountSelector = '#hero-avatar-mount', onStatusChange = null, onDecayRequest = null, options = {}) {
            this.mountSelector = mountSelector;
            this.onStatusChange = onStatusChange;
            this.onDecayRequest = onDecayRequest;
            this.options = options || {};

            this.currentMood = NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL;
            this.isTalking = false;
            this.isRunning = false;
            this.isTabHidden = false;

            // Gaze Tracking State
            this.gazeEnabled = (this.options.gazeEnabled !== false);
            this.currentGazeX = 0;
            this.currentGazeY = 0;
            this.targetGazeX = 0;
            this.targetGazeY = 0;
            this.lastPointerMoveTime = Date.now();
            this.gazeRafId = null;
            this._lastRenderedGazeX = null;
            this._lastRenderedGazeY = null;

            // Bio-Timers & Transient Animations
            this.blinkTimer = null;
            this.blinkAnimTimer = null;
            this.earTwitchTimer = null;
            this.earTwitchAnimTimer = null;
            this.idleReturnTimer = null;
            this.decayTimers = [];
            this.transientTimers = [];

            // Reduced Motion Accessibility (WCAG 2.1 AAA)
            this.isReducedMotion = (this.options.reducedMotion === true) ||
                (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
                (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('nori-reduced-motion'));
            this._mediaQueryList = null;
            this._boundReducedMotionChange = null;

            // Bind Event Listeners
            this._boundOnPointerMove = this.handlePointerMove.bind(this);
            this._boundOnPointerUp = this.handlePointerUp.bind(this);
            this._boundOnPointerLeave = this.handlePointerLeave.bind(this);
            this._boundOnTouchStart = this.handleTouchStart.bind(this);
            this._boundOnTouchMove = this.handleTouchMove.bind(this);
            this._boundOnTouchEnd = this.handleTouchEnd.bind(this);
            this._boundOnVisibilityChange = this.handleVisibilityChange.bind(this);
            this._boundGazeTick = this.gazeTick.bind(this);
        }

        getMountElement() {
            if (this.mountSelector && this.mountSelector.nodeType === 1) {
                return this.mountSelector;
            }
            if (typeof document !== 'undefined' && typeof this.mountSelector === 'string') {
                try {
                    return document.querySelector(this.mountSelector);
                } catch (e) {
                    return null;
                }
            }
            return null;
        }

        _ensureGazeLoop() {
            if (!this.isRunning || this.isTabHidden) return;
            if (!this.gazeRafId && typeof requestAnimationFrame === 'function') {
                this.gazeRafId = requestAnimationFrame(this._boundGazeTick);
            }
        }

        _setTransientTimer(fn, delay) {
            const timer = setTimeout(() => {
                const idx = this.transientTimers.indexOf(timer);
                if (idx !== -1) this.transientTimers.splice(idx, 1);
                fn();
            }, delay);
            this.transientTimers.push(timer);
            return timer;
        }

        _clearTransientTimers() {
            this.transientTimers.forEach(t => clearTimeout(t));
            this.transientTimers = [];
        }

        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.isTabHidden = (typeof document !== 'undefined' && document.hidden);

            ensureNoriStylesInjected();

            // Register Gaze Tracking & Touch Listeners with Legacy Browser Fallback
            if (typeof window !== 'undefined') {
                const hasPointerEvents = (typeof window.PointerEvent !== 'undefined');
                if (hasPointerEvents) {
                    window.addEventListener('pointermove', this._boundOnPointerMove, { passive: true });
                    window.addEventListener('pointerdown', this._boundOnPointerMove, { passive: true });
                    window.addEventListener('pointerup', this._boundOnPointerUp, { passive: true });
                    window.addEventListener('pointercancel', this._boundOnPointerUp, { passive: true });
                    window.addEventListener('pointerleave', this._boundOnPointerLeave, { passive: true });
                } else {
                    // Fallback for legacy desktop browsers lacking PointerEvent
                    window.addEventListener('mousemove', this._boundOnPointerMove, { passive: true });
                    window.addEventListener('mousedown', this._boundOnPointerMove, { passive: true });
                    window.addEventListener('mouseup', this._boundOnPointerLeave, { passive: true });
                    window.addEventListener('mouseleave', this._boundOnPointerLeave, { passive: true });
                }
                window.addEventListener('blur', this._boundOnPointerLeave, { passive: true });

                // Touch fallbacks for devices without pointer events or touch hybrid
                window.addEventListener('touchstart', this._boundOnTouchStart, { passive: true });
                window.addEventListener('touchmove', this._boundOnTouchMove, { passive: true });
                window.addEventListener('touchend', this._boundOnTouchEnd, { passive: true });
                window.addEventListener('touchcancel', this._boundOnTouchEnd, { passive: true });

                if (!this.gazeRafId && !this.isTabHidden && typeof requestAnimationFrame === 'function') {
                    this.gazeRafId = requestAnimationFrame(this._boundGazeTick);
                }
            }

            if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                document.addEventListener('visibilitychange', this._boundOnVisibilityChange);
            }

            // Listen to runtime prefers-reduced-motion changes if supported
            if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
                try {
                    this._mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
                    this._boundReducedMotionChange = (e) => {
                        this.setReducedMotion(this.options.reducedMotion === true || !!(e && e.matches));
                    };
                    if (typeof this._mediaQueryList.addEventListener === 'function') {
                        this._mediaQueryList.addEventListener('change', this._boundReducedMotionChange);
                    } else if (typeof this._mediaQueryList.addListener === 'function') {
                        this._mediaQueryList.addListener(this._boundReducedMotionChange);
                    }
                } catch (e) {
                    this._mediaQueryList = null;
                    this._boundReducedMotionChange = null;
                }
            }

            // Start Biological Cycles if tab is in foreground and reduced motion is off
            if (!this.isTabHidden && !this.isReducedMotion) {
                this.scheduleNextBlink();
                this.scheduleNextEarTwitch();
            }

            this.updateStatus('Đang thở sinh học tự nhiên (3.8s) · Gaze Tracking sẵn sàng');
        }

        stop() {
            this.destroy();
        }

        destroy() {
            this.isRunning = false;

            if (typeof window !== 'undefined') {
                window.removeEventListener('pointermove', this._boundOnPointerMove);
                window.removeEventListener('pointerdown', this._boundOnPointerMove);
                window.removeEventListener('pointerup', this._boundOnPointerUp);
                window.removeEventListener('pointercancel', this._boundOnPointerUp);
                window.removeEventListener('pointerleave', this._boundOnPointerLeave);

                window.removeEventListener('mousemove', this._boundOnPointerMove);
                window.removeEventListener('mousedown', this._boundOnPointerMove);
                window.removeEventListener('mouseup', this._boundOnPointerLeave);
                window.removeEventListener('mouseleave', this._boundOnPointerLeave);

                window.removeEventListener('blur', this._boundOnPointerLeave);

                window.removeEventListener('touchstart', this._boundOnTouchStart);
                window.removeEventListener('touchmove', this._boundOnTouchMove);
                window.removeEventListener('touchend', this._boundOnTouchEnd);
                window.removeEventListener('touchcancel', this._boundOnTouchEnd);

                if (this.gazeRafId) {
                    if (typeof cancelAnimationFrame === 'function') {
                        cancelAnimationFrame(this.gazeRafId);
                    }
                    this.gazeRafId = null;
                }
            }

            if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
                document.removeEventListener('visibilitychange', this._boundOnVisibilityChange);
            }

            if (this.blinkTimer) {
                clearTimeout(this.blinkTimer);
                this.blinkTimer = null;
            }
            if (this.blinkAnimTimer) {
                clearTimeout(this.blinkAnimTimer);
                this.blinkAnimTimer = null;
            }
            if (this.earTwitchTimer) {
                clearTimeout(this.earTwitchTimer);
                this.earTwitchTimer = null;
            }
            if (this.earTwitchAnimTimer) {
                clearTimeout(this.earTwitchAnimTimer);
                this.earTwitchAnimTimer = null;
            }
            if (this.idleReturnTimer) {
                clearTimeout(this.idleReturnTimer);
                this.idleReturnTimer = null;
            }
            this.clearDecayTimers();
            this._clearTransientTimers();

            if (this._mediaQueryList && this._boundReducedMotionChange) {
                try {
                    if (typeof this._mediaQueryList.removeEventListener === 'function') {
                        this._mediaQueryList.removeEventListener('change', this._boundReducedMotionChange);
                    } else if (typeof this._mediaQueryList.removeListener === 'function') {
                        this._mediaQueryList.removeListener(this._boundReducedMotionChange);
                    }
                } catch (e) {}
                this._mediaQueryList = null;
                this._boundReducedMotionChange = null;
            }

            // Restore neutral avatar state and clean up transient classes
            const mount = this.getMountElement();
            if (mount) {
                if (typeof mount.querySelectorAll === 'function') {
                    const gazeLayers = mount.querySelectorAll('.nori-gaze-layer');
                    if (gazeLayers && typeof gazeLayers.forEach === 'function') {
                        gazeLayers.forEach(layer => {
                            if (layer && layer.style) layer.style.transform = 'translate(0px, 0px)';
                        });
                    }
                    const ears = mount.querySelectorAll('.companion-ear-left, .companion-ear-right');
                    if (ears && typeof ears.forEach === 'function') {
                        ears.forEach(e => {
                            if (e && e.classList && typeof e.classList.remove === 'function') {
                                e.classList.remove('ear-twitch');
                            }
                        });
                    }
                }
                if (typeof mount.querySelector === 'function') {
                    const eyes = mount.querySelector('.companion-eyes');
                    if (eyes && eyes.classList && typeof eyes.classList.remove === 'function') {
                        eyes.classList.remove('eye-blink', 'eye-double-blink');
                    }
                }
            }

            // Clean up coordinates
            this.currentGazeX = 0;
            this.currentGazeY = 0;
            this.targetGazeX = 0;
            this.targetGazeY = 0;
            this._lastRenderedGazeX = null;
            this._lastRenderedGazeY = null;
        }

        clearDecayTimers() {
            this.decayTimers.forEach(t => clearTimeout(t));
            this.decayTimers = [];
        }

        // ========================================================================
        // 1. Procedural Gaze Control (Clamp ±1.8px & Exponential Smoothing)
        // ========================================================================
        handlePointerMove(e) {
            if (!this.isRunning || !this.gazeEnabled || !e) return;
            if (typeof document === 'undefined') return;

            const clientX = (typeof e.clientX === 'number') ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const clientY = (typeof e.clientY === 'number') ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;

            const mount = this.getMountElement();
            if (!mount) return;

            const rect = mount.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const noriCenterX = rect.left + rect.width / 2;
            const noriCenterY = rect.top + rect.height / 2;

            // Normalized displacement relative to viewport with bounds clamp for ultrawide (21:9 / 32:9)
            // and extreme resolutions, maintaining isotropic sensitivity across all aspect ratios
            const winW = (typeof window !== 'undefined' && typeof window.innerWidth === 'number') ? window.innerWidth : 1000;
            const winH = (typeof window !== 'undefined' && typeof window.innerHeight === 'number') ? window.innerHeight : 800;
            const vpW = Math.max(250, Math.min(750, winW * 0.45));
            const vpH = Math.max(250, Math.min(650, winH * 0.45));

            const dx = (clientX - noriCenterX) / vpW;
            const dy = (clientY - noriCenterY) / vpH;

            const rawX = dx * 1.8;
            const rawY = dy * 1.8;

            // Circular Euclidean clamp: strictly constrains gaze vector within ±1.8px radius
            // Prevents diagonal socket overflow (hypot <= 1.8px) and eliminates iris distortion
            const dist = Math.hypot(rawX, rawY);
            let clampedX = rawX;
            let clampedY = rawY;
            if (dist > 1.8 && dist > 0) {
                const scale = 1.8 / dist;
                clampedX = rawX * scale;
                clampedY = rawY * scale;
            }

            this.targetGazeX = Number.isFinite(clampedX) ? clampedX : 0;
            this.targetGazeY = Number.isFinite(clampedY) ? clampedY : 0;
            this.lastPointerMoveTime = Date.now();

            this._ensureGazeLoop();
        }

        handlePointerUp(e) {
            // When finger or stylus lifts on touch/pen devices, smoothly return gaze to center
            if (e && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
                this.targetGazeX = 0;
                this.targetGazeY = 0;
                this._ensureGazeLoop();
            }
        }

        handleTouchStart(e) {
            if (e && e.touches && e.touches[0]) {
                this.handlePointerMove(e.touches[0]);
            }
        }

        handleTouchMove(e) {
            if (e && e.touches && e.touches[0]) {
                this.handlePointerMove(e.touches[0]);
            }
        }

        handleTouchEnd() {
            this.targetGazeX = 0;
            this.targetGazeY = 0;
            this._ensureGazeLoop();
        }

        handlePointerLeave() {
            // Smoothly returns to center (0, 0)
            this.targetGazeX = 0;
            this.targetGazeY = 0;
            this._ensureGazeLoop();
        }

        handleVisibilityChange() {
            if (typeof document === 'undefined') return;

            if (document.hidden) {
                // Tab went into background: pause timers to avoid throttled buildup
                this.isTabHidden = true;
                if (this.blinkTimer) {
                    clearTimeout(this.blinkTimer);
                    this.blinkTimer = null;
                }
                if (this.earTwitchTimer) {
                    clearTimeout(this.earTwitchTimer);
                    this.earTwitchTimer = null;
                }
                if (this.idleReturnTimer) {
                    clearTimeout(this.idleReturnTimer);
                    this.idleReturnTimer = null;
                }
                this._clearTransientTimers();

                // Clean up transient animation classes so elements do not freeze midway
                const mount = this.getMountElement();
                if (mount) {
                    const eyes = mount.querySelector('.companion-eyes');
                    if (eyes) eyes.classList.remove('eye-blink', 'eye-double-blink');
                    const ears = mount.querySelectorAll('.companion-ear-left, .companion-ear-right');
                    ears.forEach(e => e.classList.remove('ear-twitch'));
                }

                this.targetGazeX = 0;
                this.targetGazeY = 0;
            } else {
                // Tab returned to active foreground: resync clocks & resume natural cycle
                this.isTabHidden = false;
                this.lastPointerMoveTime = Date.now();
                this.targetGazeX = 0;
                this.targetGazeY = 0;

                if (this.isRunning) {
                    this.scheduleNextBlink();
                    this.scheduleNextEarTwitch();
                    this._ensureGazeLoop();
                }
            }
        }

        gazeTick() {
            if (!this.isRunning) return;

            if (this.isTabHidden) {
                this.gazeRafId = null;
                return;
            }

            // Closed eyes during RESTFUL_PAUSE should not look around
            if (this.currentMood === NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE || !this.gazeEnabled) {
                this.targetGazeX = 0;
                this.targetGazeY = 0;
            } else if (Date.now() - this.lastPointerMoveTime > 2800) {
                // If cursor idle for > 2.8s, smoothly drift back to center
                this.targetGazeX = 0;
                this.targetGazeY = 0;
            }

            if (!Number.isFinite(this.targetGazeX)) this.targetGazeX = 0;
            if (!Number.isFinite(this.targetGazeY)) this.targetGazeY = 0;

            // Radial defense-in-depth: ensure target gaze never exceeds 1.8px radius
            const targetDist = Math.hypot(this.targetGazeX, this.targetGazeY);
            if (targetDist > 1.8 && targetDist > 0) {
                const scale = 1.8 / targetDist;
                this.targetGazeX *= scale;
                this.targetGazeY *= scale;
            }

            // Exponential smoothing (damping coefficient = 0.16)
            this.currentGazeX += (this.targetGazeX - this.currentGazeX) * 0.16;
            this.currentGazeY += (this.targetGazeY - this.currentGazeY) * 0.16;

            if (!Number.isFinite(this.currentGazeX)) this.currentGazeX = 0;
            if (!Number.isFinite(this.currentGazeY)) this.currentGazeY = 0;

            // Snap when within epsilon to eliminate redundant micro-ticks
            if (Math.abs(this.currentGazeX - this.targetGazeX) < 0.005) {
                this.currentGazeX = this.targetGazeX;
            }
            if (Math.abs(this.currentGazeY - this.targetGazeY) < 0.005) {
                this.currentGazeY = this.targetGazeY;
            }

            const gazeXStr = this.currentGazeX.toFixed(2);
            const gazeYStr = this.currentGazeY.toFixed(2);

            // Dirty check: only update DOM when coordinates actually change
            if (gazeXStr !== this._lastRenderedGazeX || gazeYStr !== this._lastRenderedGazeY) {
                this._lastRenderedGazeX = gazeXStr;
                this._lastRenderedGazeY = gazeYStr;

                const mount = this.getMountElement();
                if (mount) {
                    const gazeLayers = mount.querySelectorAll('.nori-gaze-layer');
                    gazeLayers.forEach(layer => {
                        layer.style.transform = `translate(${gazeXStr}px, ${gazeYStr}px)`;
                    });
                }
            }

            // If settled at (0, 0) after idle timeout or gaze disabled, suspend RAF loop to preserve battery/CPU
            const isSettledAtCenter = (this.targetGazeX === 0 && this.targetGazeY === 0 && this.currentGazeX === 0 && this.currentGazeY === 0);
            const isIdlePastGrace = (Date.now() - this.lastPointerMoveTime > 2800);
            if (isSettledAtCenter && (isIdlePastGrace || !this.gazeEnabled || this.currentMood === NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE)) {
                this.gazeRafId = null;
                return;
            }

            if (typeof requestAnimationFrame === 'function') {
                this.gazeRafId = requestAnimationFrame(this._boundGazeTick);
            } else {
                this.gazeRafId = null;
            }
        }

        setGazeTracking(enabled) {
            this.gazeEnabled = !!enabled;
            if (!this.gazeEnabled) {
                this.targetGazeX = 0;
                this.targetGazeY = 0;
                this.currentGazeX = 0;
                this.currentGazeY = 0;
                this._lastRenderedGazeX = '0.00';
                this._lastRenderedGazeY = '0.00';

                const mount = this.getMountElement();
                if (mount) {
                    const gazeLayers = mount.querySelectorAll('.nori-gaze-layer');
                    gazeLayers.forEach(layer => {
                        layer.style.transform = 'translate(0px, 0px)';
                    });
                }
                this.updateStatus('Đã tắt Gaze Tracking (Mắt ở chính giữa)');
            } else {
                this.lastPointerMoveTime = Date.now();
                if (!this.gazeRafId && !this.isTabHidden && typeof requestAnimationFrame === 'function') {
                    this.gazeRafId = requestAnimationFrame(this._boundGazeTick);
                }
                this.updateStatus('Đã bật Gaze Tracking (Dõi mắt theo chuột)');
            }
        }

        // ========================================================================
        // 2. Biological Blink Cycle (Poisson random 3.5s - 5.0s, 15% double-blink)
        // ========================================================================
        scheduleNextBlink() {
            if (!this.isRunning || this.isTabHidden || this.isReducedMotion) return;
            // Poisson random wait: 3500ms - 5000ms
            const delay = Math.floor(Math.random() * 1500) + 3500;
            this.blinkTimer = setTimeout(() => {
                if (!this.isRunning || this.isTabHidden || this.isReducedMotion) return;
                if (this.currentMood !== NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE && !this.isTalking) {
                    this.triggerBlink();
                }
                this.scheduleNextBlink();
            }, delay);
        }

        triggerBlink(forceDouble = false) {
            if (!this.isRunning || this.isTabHidden || this.isReducedMotion) return;
            if (this.currentMood === NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE) return;

            const mount = this.getMountElement();
            if (!mount) return;

            const eyes = (typeof mount.querySelector === 'function') ? mount.querySelector('.companion-eyes') : null;
            if (!eyes) return;

            // 15% probability of natural double-blink
            const isDouble = forceDouble || (Math.random() < 0.15);
            const className = isDouble ? 'eye-double-blink' : 'eye-blink';
            const duration = isDouble ? 480 : 260;

            if (this.blinkAnimTimer) {
                clearTimeout(this.blinkAnimTimer);
                this.blinkAnimTimer = null;
            }

            if (eyes.classList && typeof eyes.classList.remove === 'function') {
                eyes.classList.remove('eye-blink', 'eye-double-blink');
            }
            void (eyes.offsetWidth || (eyes.getBoundingClientRect && eyes.getBoundingClientRect().width));
            if (eyes.classList && typeof eyes.classList.add === 'function') {
                eyes.classList.add(className);
            }

            this.blinkAnimTimer = this._setTransientTimer(() => {
                if (eyes && eyes.classList && typeof eyes.classList.remove === 'function') {
                    eyes.classList.remove('eye-blink', 'eye-double-blink');
                }
                this.blinkAnimTimer = null;
            }, duration);
        }

        // ========================================================================
        // 3. Rodent Ear Twitch Reflex
        // ========================================================================
        scheduleNextEarTwitch() {
            if (!this.isRunning || this.isTabHidden || this.isReducedMotion) return;
            // Interval: 6.0s - 11.0s
            const delay = Math.floor(Math.random() * 5000) + 6000;
            this.earTwitchTimer = setTimeout(() => {
                if (!this.isRunning || this.isTabHidden || this.isReducedMotion) return;
                if (!this.isTalking) {
                    this.triggerEarTwitch();
                }
                this.scheduleNextEarTwitch();
            }, delay);
        }

        triggerEarTwitch() {
            if (!this.isRunning || this.isTabHidden || this.isReducedMotion) return;
            const mount = this.getMountElement();
            if (!mount) return;

            const pickLeft = Math.random() < 0.5;
            const ear = (typeof mount.querySelector === 'function')
                ? mount.querySelector(pickLeft ? '.companion-ear-left' : '.companion-ear-right')
                : null;
            if (ear) {
                if (this.earTwitchAnimTimer) {
                    clearTimeout(this.earTwitchAnimTimer);
                    this.earTwitchAnimTimer = null;
                }

                if (ear.classList && typeof ear.classList.remove === 'function') {
                    ear.classList.remove('ear-twitch');
                }
                void (ear.offsetWidth || (ear.getBoundingClientRect && ear.getBoundingClientRect().width));
                if (ear.classList && typeof ear.classList.add === 'function') {
                    ear.classList.add('ear-twitch');
                }
                this.earTwitchAnimTimer = this._setTransientTimer(() => {
                    if (ear && ear.classList && typeof ear.classList.remove === 'function') {
                        ear.classList.remove('ear-twitch');
                    }
                    this.earTwitchAnimTimer = null;
                }, 380);
            }
        }

        // ========================================================================
        // 3.1 Reduced Motion Accessibility Control (WCAG 2.1 AAA)
        // ========================================================================
        setReducedMotion(enabled) {
            this.isReducedMotion = !!enabled;
            if (this.isReducedMotion) {
                if (this.blinkTimer) {
                    clearTimeout(this.blinkTimer);
                    this.blinkTimer = null;
                }
                if (this.earTwitchTimer) {
                    clearTimeout(this.earTwitchTimer);
                    this.earTwitchTimer = null;
                }
                if (this.blinkAnimTimer) {
                    clearTimeout(this.blinkAnimTimer);
                    this.blinkAnimTimer = null;
                }
                if (this.earTwitchAnimTimer) {
                    clearTimeout(this.earTwitchAnimTimer);
                    this.earTwitchAnimTimer = null;
                }
                this._clearTransientTimers();

                const mount = this.getMountElement();
                if (mount) {
                    if (typeof mount.querySelector === 'function') {
                        const eyes = mount.querySelector('.companion-eyes');
                        if (eyes && eyes.classList && typeof eyes.classList.remove === 'function') {
                            eyes.classList.remove('eye-blink', 'eye-double-blink');
                        }
                    }
                    if (typeof mount.querySelectorAll === 'function') {
                        const ears = mount.querySelectorAll('.companion-ear-left, .companion-ear-right');
                        if (ears && typeof ears.forEach === 'function') {
                            ears.forEach(e => {
                                if (e && e.classList && typeof e.classList.remove === 'function') {
                                    e.classList.remove('ear-twitch');
                                }
                            });
                        }
                    }
                }
                this.updateStatus('Đã bật Trợ năng (Reduced Motion): Tắt chuyển động rung giật');
            } else {
                if (this.isRunning && !this.isTabHidden) {
                    this.scheduleNextBlink();
                    this.scheduleNextEarTwitch();
                }
                this.updateStatus('Đang thở sinh học tự nhiên (3.8s) · Gaze Tracking sẵn sàng');
            }
        }

        // ========================================================================
        // 4. State Management & Cascading Decay
        // ========================================================================
        setMood(mood, autoDecay = true) {
            const canonical = normalizePedagogicalMood(mood);
            this.currentMood = canonical;
            this.clearDecayTimers();

            // When switching to RESTFUL_PAUSE, cancel any active or pending blink and return gaze
            if (canonical === NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE) {
                if (this.blinkAnimTimer) {
                    clearTimeout(this.blinkAnimTimer);
                    this.blinkAnimTimer = null;
                }
                this.targetGazeX = 0;
                this.targetGazeY = 0;
                this._ensureGazeLoop();
            }

            // Re-render / update avatar inside mount if callback provided
            if (typeof this.onDecayRequest === 'function') {
                this.onDecayRequest(canonical);
            } else {
                const mount = this.getMountElement();
                if (mount) {
                    updateMentorAvatar(mount, canonical, this.isTalking);
                }
            }

            const meta = PEDAGOGICAL_METADATA[canonical];
            this.updateStatus(meta ? meta.label : canonical);

            // JOY_INSIGHT: Polite gentle nod, hold 1.2s, then decay smoothly to FOCUSED_NEUTRAL
            if (canonical === NORI_PEDAGOGICAL_STATES.JOY_INSIGHT && autoDecay) {
                this.updateStatus('Ngộ ra (Joy Insight) · Giữ nhịp 1.2s...');
                const timer = setTimeout(() => {
                    if (!this.isRunning || this.isTalking) return;
                    this.applyDecayStep(NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL, 'Hạ nhiệt êm dịu về Focused Neutral');
                }, 1200);
                this.decayTimers.push(timer);
            }
        }

        setTalking(talking, mood = '') {
            this.isTalking = !!talking;
            if (mood) {
                this.currentMood = normalizePedagogicalMood(mood);
            }

            const mount = this.getMountElement();
            if (mount) {
                updateMentorAvatar(mount, this.currentMood, this.isTalking);
            }

            if (this.isTalking) {
                this.clearDecayTimers();
                this.updateStatus('Đang hội thoại cùng người học');
            } else {
                // If non-neutral state was active during speech, decay to neutral
                if (this.currentMood === NORI_PEDAGOGICAL_STATES.JOY_INSIGHT) {
                    const timer = setTimeout(() => {
                        this.applyDecayStep(NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL, 'Dứt lời thoại, trở về Focused Neutral');
                    }, 1200);
                    this.decayTimers.push(timer);
                } else {
                    const meta = PEDAGOGICAL_METADATA[this.currentMood] || PEDAGOGICAL_METADATA['focused_neutral'];
                    this.updateStatus(meta.label || 'Sẵn sàng lắng nghe');
                }
            }
        }

        demoCascadingDecay(startMood = NORI_PEDAGOGICAL_STATES.JOY_INSIGHT) {
            this.setMood(startMood, true);
        }

        applyDecayStep(moodKey, statusText) {
            this.currentMood = moodKey;
            if (typeof this.onDecayRequest === 'function') {
                this.onDecayRequest(moodKey);
            } else {
                const mount = this.getMountElement();
                if (mount) {
                    updateMentorAvatar(mount, moodKey, this.isTalking);
                }
            }
            this.updateStatus(statusText);
        }

        updateStatus(statusText) {
            if (typeof this.onStatusChange === 'function') {
                this.onStatusChange({
                    status: statusText,
                    currentMood: this.currentMood,
                    isTalking: this.isTalking,
                    gazeEnabled: this.gazeEnabled,
                    gazeOffset: { x: this.currentGazeX, y: this.currentGazeY }
                });
            }
        }
    }

    // Expose to Global Scope
    global.NORI_PEDAGOGICAL_STATES = NORI_PEDAGOGICAL_STATES;
    global.PEDAGOGICAL_METADATA = PEDAGOGICAL_METADATA;
    global.normalizePedagogicalMood = normalizePedagogicalMood;
    global.getMoodColorAndLabel = getMoodColorAndLabel;
    global.renderMentorAvatarHTML = renderMentorAvatarHTML;
    global.updateMentorAvatar = updateMentorAvatar;
    global.NoriLivingIdleEngine = NoriLivingIdleEngine;

    // Node.js CommonJS Compatibility
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            NORI_PEDAGOGICAL_STATES,
            PEDAGOGICAL_METADATA,
            normalizePedagogicalMood,
            getMoodColorAndLabel,
            renderMentorAvatarHTML,
            updateMentorAvatar,
            NoriLivingIdleEngine
        };
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
