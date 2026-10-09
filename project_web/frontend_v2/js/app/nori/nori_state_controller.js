/**
 * Vectoria Nori State Controller & Emotional Momentum Engine
 * 
 * Manages Nori's pedagogical state machine and 4D emotional momentum vector:
 * M(t) = [P(t), E(t), F(t), S(t)]^T in [0, 1]^4
 * - P(t): Patience (Độ kiên nhẫn), baseline = 0.7
 * - E(t): Excitement (Độ phấn khích), baseline = 0.2
 * - F(t): Fatigue (Độ mệt mỏi), baseline = 0.0
 * - S(t): Streak momentum (Động lượng chuỗi đúng), baseline = 0.0
 * 
 * Features:
 * 1. Continuous asymptotic decay towards baseline equilibrium.
 * 2. Event dispatcher: onEvent(eventType, payload).
 * 3. Weighted variation selector with dynamic momentum influence.
 * 4. Procedural jitter & micro-motion parameter generation (breathing, eye drift, stillness).
 * 5. Exam mode freeze (QUIET_FOCUSED) with distraction suppression.
 * 6. Leak-free lifecycle management with destroy() cleanup.
 * 
 * Standards Compliance: Vanilla JS, UMD (Browser + Node), Zero Em-dash, Strict NaN safety.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.NoriStateController = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Base equilibrium constants
    const BASELINE = Object.freeze({
        P: 0.7,
        E: 0.2,
        F: 0.0,
        S: 0.0
    });

    // Default decay rates (per second) configured for smooth 30-second convergence
    const DECAY_RATES = Object.freeze({
        P: 0.18,
        E: 0.18,
        F: 0.18,
        S: 0.22
    });

    // Core pedagogical emotional states
    const STATES = Object.freeze({
        IDLE: 'IDLE',
        THINKING: 'THINKING',
        ENCOURAGING: 'ENCOURAGING',
        CELEBRATING: 'CELEBRATING',
        QUIET_FOCUSED: 'QUIET_FOCUSED'
    });

    // Variation catalog per state with predefined base weights
    const VARIATION_CATALOG = Object.freeze({
        [STATES.IDLE]: [
            {
                id: 'blink_glance',
                key: 'A',
                label: 'Chớp mắt, liếc nhìn chuột',
                baseWeight: 0.50
            },
            {
                id: 'breathe_bounce',
                key: 'B',
                label: 'Nhún nhảy nhẹ theo nhịp thở',
                baseWeight: 0.30
            },
            {
                id: 'rotate_observe_axes',
                key: 'C',
                label: 'Xoay nhẹ người quan sát trục toạ độ',
                baseWeight: 0.20
            }
        ],
        [STATES.THINKING]: [
            {
                id: 'tilt_look_up',
                key: 'A',
                label: 'Nghiêng đầu, mắt nhìn lên',
                baseWeight: 0.40
            },
            {
                id: 'tap_ruler_chin',
                key: 'B',
                label: 'Cầm thước kẻ gõ cằm',
                baseWeight: 0.35
            },
            {
                id: 'brush_sketch_canvas',
                key: 'C',
                label: 'Chấm cọ vẽ nháp hình học',
                baseWeight: 0.25
            }
        ],
        [STATES.ENCOURAGING]: [
            {
                id: 'nod_encourage',
                key: 'A',
                label: 'Gật đầu khích lệ',
                baseWeight: 0.45
            },
            {
                id: 'raise_hands_cheer',
                key: 'B',
                label: 'Giơ hai tay cổ vũ',
                baseWeight: 0.35
            },
            {
                id: 'wink_smile',
                key: 'C',
                label: 'Nháy mắt mỉm cười',
                baseWeight: 0.20
            }
        ],
        [STATES.CELEBRATING]: [
            {
                id: 'spin_360',
                key: 'A',
                label: 'Nhảy xoay vòng 360 độ',
                baseWeight: 0.40
            },
            {
                id: 'triangle_confetti',
                key: 'B',
                label: 'Bắn pháo hoa tam giác',
                baseWeight: 0.35
            },
            {
                id: 'float_hover',
                key: 'C',
                label: 'Bay bổng nhẹ lơ lửng',
                baseWeight: 0.25
            }
        ],
        [STATES.QUIET_FOCUSED]: [
            {
                id: 'still_breath',
                key: 'A',
                label: 'Im lặng tuyệt đối, thở tĩnh',
                baseWeight: 1.00
            }
        ]
    });

    /**
     * Strict numerical clamp and NaN/Infinity sanitation.
     * Guarantees result is within [min, max] and always finite.
     */
    function clampSafe(value, min = 0.0, max = 1.0, fallback = 0.0) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            const safeFallback = (typeof fallback === 'number' && Number.isFinite(fallback)) ? fallback : min;
            return safeFallback < min ? min : (safeFallback > max ? max : safeFallback);
        }
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    class NoriStateController {
        /**
         * @param {Object} options Configuration options
         * @param {Object} [options.initialMomentum] Initial [P, E, F, S]
         * @param {number} [options.tickIntervalMs=500] Update interval in milliseconds
         * @param {boolean} [options.autoStart=true] Automatically start tick timer
         * @param {Object} [options.decayRates] Custom decay rates {P, E, F, S}
         * @param {Function} [options.onUpdate] Callback on every tick update
         */
        constructor(options = {}) {
            const opts = options || {};
            const rawInterval = (typeof opts.tickIntervalMs === 'number' && Number.isFinite(opts.tickIntervalMs))
                ? opts.tickIntervalMs
                : 500;
            this._tickIntervalMs = Math.max(50, rawInterval);
            this._autoStart = opts.autoStart !== false;

            // Decay configuration
            const decay = opts.decayRates || {};
            this._decayRates = {
                P: (decay && Number.isFinite(decay.P)) ? Math.max(0, decay.P) : DECAY_RATES.P,
                E: (decay && Number.isFinite(decay.E)) ? Math.max(0, decay.E) : DECAY_RATES.E,
                F: (decay && Number.isFinite(decay.F)) ? Math.max(0, decay.F) : DECAY_RATES.F,
                S: (decay && Number.isFinite(decay.S)) ? Math.max(0, decay.S) : DECAY_RATES.S
            };

            // Emotional momentum vector M(t) = [P, E, F, S]
            const init = opts.initialMomentum || {};
            this._P = clampSafe(init.P, 0.0, 1.0, BASELINE.P);
            this._E = clampSafe(init.E, 0.0, 1.0, BASELINE.E);
            this._F = clampSafe(init.F, 0.0, 1.0, BASELINE.F);
            this._S = clampSafe(init.S, 0.0, 1.0, BASELINE.S);

            // State management
            this._currentState = STATES.IDLE;
            this._manualStateOverride = null;
            this._overrideTimeoutId = null;
            this._isExamMode = false;

            // Procedural animation clocks
            this._elapsedSeconds = 0;
            this._breathingPhase = 0;
            this._idleInactivitySeconds = 0;

            // Current selected variation & initial state derivation
            this._currentVariation = null;
            this._updateCurrentState();
            if (!this._currentVariation) {
                this._selectVariationForCurrentState();
            }

            // Subscriptions & timer loop
            this._subscribers = [];
            if (typeof opts.onUpdate === 'function') {
                this._subscribers.push(opts.onUpdate);
            }

            this._timerId = null;
            this._isDestroyed = false;

            if (this._autoStart) {
                this.start();
            }
        }

        // =====================================================================
        // PUBLIC GETTERS
        // =====================================================================

        get momentum() {
            return {
                P: this._P,
                E: this._E,
                F: this._F,
                S: this._S
            };
        }

        get state() {
            return this._currentState;
        }

        get isExamMode() {
            return this._isExamMode;
        }

        get isDestroyed() {
            return this._isDestroyed;
        }

        get currentVariation() {
            return this._currentVariation;
        }

        get elapsedSeconds() {
            return this._elapsedSeconds;
        }

        get idleInactivitySeconds() {
            return this._idleInactivitySeconds;
        }

        // =====================================================================
        // LIFECYCLE MANAGEMENT
        // =====================================================================

        /**
         * Starts the internal continuous tick interval.
         */
        start() {
            if (this._isDestroyed || this._timerId !== null) return;
            this._timerId = setInterval(() => {
                const deltaSeconds = this._tickIntervalMs / 1000;
                this.tick(deltaSeconds);
            }, this._tickIntervalMs);
        }

        /**
         * Pauses the internal continuous tick interval.
         */
        stop() {
            if (this._timerId !== null) {
                clearInterval(this._timerId);
                this._timerId = null;
            }
        }

        /**
         * Completely cleans up all timers and listeners, preventing memory leaks.
         */
        destroy() {
            this.stop();
            if (this._overrideTimeoutId !== null) {
                clearTimeout(this._overrideTimeoutId);
                this._overrideTimeoutId = null;
            }
            this._subscribers = [];
            this._isDestroyed = true;
        }

        /**
         * Subscribes a listener to controller updates.
         * @param {Function} callback Callback receiving snapshot data
         * @returns {Function} Unsubscribe function
         */
        subscribe(callback) {
            if (typeof callback !== 'function' || this._isDestroyed) {
                return () => {};
            }
            this._subscribers.push(callback);
            return () => {
                const index = this._subscribers.indexOf(callback);
                if (index !== -1) {
                    this._subscribers.splice(index, 1);
                }
            };
        }

        // =====================================================================
        // SIMULATION TICK & DECAY ENGINE
        // =====================================================================

        /**
         * Executes a single simulation step.
         * @param {number} deltaSeconds Elapsed time in seconds
         */
        tick(deltaSeconds = 0.5) {
            if (this._isDestroyed) return;

            const dt = clampSafe(deltaSeconds, 0.001, 60.0, 0.5);
            this._elapsedSeconds += dt;
            this._idleInactivitySeconds += dt;

            // 1. Asymptotic decay towards baseline equilibrium
            // dX/dt = -lambda * (X - X_base) => X(t+dt) = X_base + (X(t) - X_base) * exp(-lambda * dt)
            this._P = this._decayDimension(this._P, BASELINE.P, this._decayRates.P, dt);
            this._E = this._decayDimension(this._E, BASELINE.E, this._decayRates.E, dt);
            this._F = this._decayDimension(this._F, BASELINE.F, this._decayRates.F, dt);
            this._S = this._decayDimension(this._S, BASELINE.S, this._decayRates.S, dt);

            // 2. Auto-trigger STUCK_LONG if inactivity exceeds 90 seconds
            if (this._idleInactivitySeconds >= 90 && !this._isExamMode) {
                this.onEvent('STUCK_LONG', { autoTriggered: true });
                // Reset inactivity counter slightly to avoid spamming every tick
                this._idleInactivitySeconds = 60;
            }

            // 3. Update state machine
            this._updateCurrentState();

            // 4. Update procedural jitter animation clocks
            const jitter = this.getProceduralJitter();
            const twoPi = 2 * Math.PI;
            const curPhase = Number.isFinite(this._breathingPhase) ? this._breathingPhase : 0;
            this._breathingPhase = (curPhase + twoPi * jitter.breathing.frequencyHz * dt) % twoPi;

            // 5. Notify subscribers
            this._notifySubscribers();
        }

        /**
         * Smoothly decays a dimension towards its target baseline using stable exponential decay.
         * Snaps cleanly if delta is within a negligible epsilon (< 0.002) for mathematical elegance.
         */
        _decayDimension(current, baseline, rate, dt) {
            const decayFactor = Math.exp(-rate * dt);
            let next = baseline + (current - baseline) * decayFactor;

            // Snap cleanly to baseline if within microscopic threshold
            if (Math.abs(next - baseline) < 0.005) {
                next = baseline;
            }

            return clampSafe(next, 0.0, 1.0, baseline);
        }

        // =====================================================================
        // EVENT DISPATCHER
        // =====================================================================

        /**
         * Dispatches external pedagogical events to mutate emotional momentum.
         * @param {string} eventType Event name
         * @param {Object} [payload] Optional event payload
         */
        onEvent(eventType, payload = {}) {
            if (this._isDestroyed) return;
            if (typeof eventType !== 'string') return;
            const p = payload || {};

            // Any user or system action resets or throttles the idle inactivity counter
            if (eventType === 'STUCK_LONG') {
                if (!p.autoTriggered) {
                    this._idleInactivitySeconds = 60;
                }
            } else {
                this._idleInactivitySeconds = 0;
            }

            switch (eventType) {
                case 'STREAK_CORRECT': {
                    const streakCount = (typeof p.streak === 'number' && Number.isFinite(p.streak)) ? p.streak : 2;
                    const deltaE = streakCount >= 2 ? 0.25 : 0.15;
                    const deltaS = streakCount >= 2 ? 0.20 : 0.10;
                    const deltaP = 0.10;
                    const deltaF = -0.05;

                    this._applyDelta(deltaP, deltaE, deltaF, deltaS);
                    if (!this._isExamMode) {
                        this.setState(STATES.CELEBRATING, 2400, { silent: true });
                    }
                    break;
                }

                case 'QUESTION_CORRECT': {
                    this._applyDelta(0.05, 0.15, -0.02, 0.10);
                    if (!this._isExamMode && this._currentState !== STATES.CELEBRATING) {
                        this.setState(STATES.ENCOURAGING, 1800, { silent: true });
                    }
                    break;
                }

                case 'QUESTION_WRONG': {
                    // Nori remains composed and thoughtful, never angry
                    this._applyDelta(-0.05, -0.10, 0.05, -0.30);
                    if (!this._isExamMode) {
                        this.setState(STATES.ENCOURAGING, 2200, { silent: true });
                    }
                    break;
                }

                case 'STUCK_LONG': {
                    // Prolonged inactivity > 90s
                    this._applyDelta(-0.15, -0.12, 0.10, -0.10);
                    if (!this._isExamMode) {
                        this.setState(STATES.THINKING, 3000, { silent: true });
                    }
                    break;
                }

                case 'HINT_REQUESTED': {
                    // Patiently assists the student
                    this._applyDelta(0.05, -0.05, 0.05, 0.0);
                    if (!this._isExamMode) {
                        this.setState(STATES.THINKING, 2500, { silent: true });
                    }
                    break;
                }

                case 'FATIGUE_TICK': {
                    const amount = (typeof p.amount === 'number' && Number.isFinite(p.amount)) ? p.amount : 0.03;
                    this._applyDelta(0.0, -0.02, amount, 0.0);
                    this._updateCurrentState();
                    break;
                }

                case 'REST_BREAK': {
                    this._applyDelta(0.10, 0.05, -0.25, 0.0);
                    this._updateCurrentState();
                    break;
                }

                case 'EXAM_MODE_START': {
                    this._isExamMode = true;
                    if (this._overrideTimeoutId !== null) {
                        clearTimeout(this._overrideTimeoutId);
                        this._overrideTimeoutId = null;
                    }
                    this._manualStateOverride = null;
                    this._currentState = STATES.QUIET_FOCUSED;
                    this._selectVariationForCurrentState();
                    break;
                }

                case 'EXAM_MODE_END': {
                    this._isExamMode = false;
                    this._updateCurrentState();
                    break;
                }

                case 'RESET': {
                    this.resetToBaseline({ silent: true });
                    break;
                }

                case 'CUSTOM_MOMENTUM_DELTA': {
                    const dP = Number.isFinite(p.deltaP) ? p.deltaP : 0;
                    const dE = Number.isFinite(p.deltaE) ? p.deltaE : 0;
                    const dF = Number.isFinite(p.deltaF) ? p.deltaF : 0;
                    const dS = Number.isFinite(p.deltaS) ? p.deltaS : 0;
                    this._applyDelta(dP, dE, dF, dS);
                    this._updateCurrentState();
                    break;
                }

                default:
                    // Unrecognized event ignored safely without notifying subscribers
                    return;
            }

            if (!p.autoTriggered && !p.silent) {
                this._notifySubscribers();
            }
        }

        /**
         * Applies bounded deltas to momentum vector.
         */
        _applyDelta(deltaP = 0, deltaE = 0, deltaF = 0, deltaS = 0) {
            const dP = (typeof deltaP === 'number' && Number.isFinite(deltaP)) ? deltaP : 0;
            const dE = (typeof deltaE === 'number' && Number.isFinite(deltaE)) ? deltaE : 0;
            const dF = (typeof deltaF === 'number' && Number.isFinite(deltaF)) ? deltaF : 0;
            const dS = (typeof deltaS === 'number' && Number.isFinite(deltaS)) ? deltaS : 0;
            this._P = clampSafe(this._P + dP, 0.0, 1.0, this._P);
            this._E = clampSafe(this._E + dE, 0.0, 1.0, this._E);
            this._F = clampSafe(this._F + dF, 0.0, 1.0, this._F);
            this._S = clampSafe(this._S + dS, 0.0, 1.0, this._S);
        }

        /**
         * Directly sets momentum with strict bounds.
         */
        setMomentum(newValues = {}) {
            if (this._isDestroyed) return;
            const vals = newValues || {};
            if (vals.P !== undefined) this._P = clampSafe(vals.P, 0.0, 1.0, this._P);
            if (vals.E !== undefined) this._E = clampSafe(vals.E, 0.0, 1.0, this._E);
            if (vals.F !== undefined) this._F = clampSafe(vals.F, 0.0, 1.0, this._F);
            if (vals.S !== undefined) this._S = clampSafe(vals.S, 0.0, 1.0, this._S);
            this._updateCurrentState();
            this._notifySubscribers();
        }

        /**
         * Resets momentum to baseline equilibrium.
         */
        resetToBaseline(options = {}) {
            if (this._isDestroyed) return;
            const opts = options || {};
            this._P = BASELINE.P;
            this._E = BASELINE.E;
            this._F = BASELINE.F;
            this._S = BASELINE.S;
            this._isExamMode = false;
            this._manualStateOverride = null;
            if (this._overrideTimeoutId !== null) {
                clearTimeout(this._overrideTimeoutId);
                this._overrideTimeoutId = null;
            }
            this._currentState = STATES.IDLE;
            this._idleInactivitySeconds = 0;
            this._selectVariationForCurrentState();
            if (!opts.silent) {
                this._notifySubscribers();
            }
        }

        // =====================================================================
        // STATE MACHINE DERIVATION
        // =====================================================================

        /**
         * Explicitly overrides the current state for a designated duration.
         * Ignored if currently in exam mode.
         */
        setState(stateName, durationMs = 0, options = {}) {
            if (this._isDestroyed) return;
            const opts = options || {};

            if (this._isExamMode) {
                this._currentState = STATES.QUIET_FOCUSED;
                this._selectVariationForCurrentState();
                if (!opts.silent) {
                    this._notifySubscribers();
                }
                return;
            }

            if (!Object.values(STATES).includes(stateName)) {
                return;
            }

            if (this._overrideTimeoutId !== null) {
                clearTimeout(this._overrideTimeoutId);
                this._overrideTimeoutId = null;
            }

            this._currentState = stateName;
            this._selectVariationForCurrentState();

            if (durationMs > 0) {
                this._manualStateOverride = stateName;
                this._overrideTimeoutId = setTimeout(() => {
                    if (this._isDestroyed) return;
                    this._manualStateOverride = null;
                    this._overrideTimeoutId = null;
                    this._updateCurrentState();
                    this._notifySubscribers();
                }, durationMs);
            } else {
                this._manualStateOverride = null;
            }

            if (!opts.silent) {
                this._notifySubscribers();
            }
        }

        /**
         * Updates state based on current momentum vector and mode.
         */
        _updateCurrentState() {
            if (this._isDestroyed) return;

            if (this._isExamMode) {
                if (this._currentState !== STATES.QUIET_FOCUSED) {
                    this._currentState = STATES.QUIET_FOCUSED;
                    this._selectVariationForCurrentState();
                }
                return;
            }

            if (this._manualStateOverride !== null) {
                return;
            }

            const prevState = this._currentState;
            let targetState = STATES.IDLE;

            // Derive state smoothly from M(t)
            if (this._E >= 0.55 && this._S >= 0.40) {
                targetState = STATES.CELEBRATING;
            } else if (this._F >= 0.45 || (this._P <= 0.40 && this._E <= 0.25)) {
                targetState = STATES.THINKING;
            } else if (this._P >= 0.75 && this._E <= 0.20 && this._F <= 0.20) {
                targetState = STATES.ENCOURAGING;
            } else {
                targetState = STATES.IDLE;
            }

            if (targetState !== prevState || !this._currentVariation || this._currentVariation.state !== targetState) {
                this._currentState = targetState;
                this._selectVariationForCurrentState();
            }
        }

        // =====================================================================
        // WEIGHTED VARIATION SELECTOR
        // =====================================================================

        /**
         * Computes effective probability distribution for a state given momentum vector.
         * When M(t) = BASELINE, effective weights match predefined base weights exactly.
         * @param {string} stateName State to evaluate
         * @returns {Array<Object>} List of variations with computed normalized probabilities
         */
        getVariationDistribution(stateName = this._currentState) {
            const validState = Object.values(STATES).includes(stateName) ? stateName : STATES.IDLE;
            const variations = VARIATION_CATALOG[validState];
            const dP = this._P - BASELINE.P;
            const dE = this._E - BASELINE.E;
            const dF = this._F - BASELINE.F;
            const dS = this._S - BASELINE.S;

            // Modulate raw weights smoothly around base weights
            let totalWeight = 0;
            const modulated = variations.map(v => {
                let modifier = 1.0;

                if (validState === STATES.IDLE) {
                    if (v.key === 'A') modifier += 0.20 * dP - 0.20 * dE;
                    if (v.key === 'B') modifier += 0.50 * dE - 0.20 * dF;
                    if (v.key === 'C') modifier += 0.30 * dF - 0.10 * dE;
                } else if (validState === STATES.THINKING) {
                    if (v.key === 'A') modifier += 0.25 * dP - 0.15 * dF;
                    if (v.key === 'B') modifier += 0.30 * dF;
                    if (v.key === 'C') modifier += 0.30 * dE - 0.15 * dP;
                } else if (validState === STATES.ENCOURAGING) {
                    if (v.key === 'A') modifier += 0.30 * dP;
                    if (v.key === 'B') modifier += 0.40 * dE;
                    if (v.key === 'C') modifier += 0.20 * dP + 0.20 * dE;
                } else if (validState === STATES.CELEBRATING) {
                    if (v.key === 'A') modifier += 0.30 * dE + 0.20 * dS;
                    if (v.key === 'B') modifier += 0.40 * dS;
                    if (v.key === 'C') modifier += 0.20 * dP - 0.10 * dE;
                }

                // Minimum weight floor to prevent zero probability
                const rawWeight = Math.max(0.01, v.baseWeight * Math.max(0.05, modifier));
                totalWeight += rawWeight;
                return {
                    id: v.id,
                    key: v.key,
                    label: v.label,
                    baseWeight: v.baseWeight,
                    rawWeight: rawWeight
                };
            });

            // Normalize probabilities to sum to strictly 1.0
            return modulated.map(v => ({
                id: v.id,
                key: v.key,
                label: v.label,
                baseWeight: v.baseWeight,
                probability: totalWeight > 0 ? (v.rawWeight / totalWeight) : (1.0 / modulated.length)
            }));
        }

        /**
         * Randomly samples a variation according to weighted probability distribution.
         * @param {string} [stateName] Target state (defaults to current state)
         * @param {Function|number} [rng] Optional random generator or roll in [0, 1)
         * @returns {Object} Selected variation object
         */
        selectVariation(stateName = this._currentState, rng = Math.random) {
            const validState = Object.values(STATES).includes(stateName) ? stateName : STATES.IDLE;
            const distribution = this.getVariationDistribution(validState);
            const rand = typeof rng === 'function' ? rng() : (typeof rng === 'number' ? rng : Math.random());
            const r = clampSafe(rand, 0.0, 1.0, 0.5);

            let cumulative = 0;
            for (let i = 0; i < distribution.length; i++) {
                cumulative += distribution[i].probability;
                if (r <= cumulative || i === distribution.length - 1) {
                    return {
                        id: distribution[i].id,
                        key: distribution[i].key,
                        label: distribution[i].label,
                        weight: distribution[i].probability,
                        baseWeight: distribution[i].baseWeight,
                        index: i,
                        state: validState,
                        distribution: distribution
                    };
                }
            }

            return {
                id: distribution[0].id,
                key: distribution[0].key,
                label: distribution[0].label,
                weight: distribution[0].probability,
                baseWeight: distribution[0].baseWeight,
                index: 0,
                state: validState,
                distribution: distribution
            };
        }

        /**
         * Re-samples the active variation for the current state (or specified state)
         * and notifies subscribers.
         * @param {string} [stateName] Optional state to sample from
         * @returns {Object|null} The freshly selected variation
         */
        resampleVariation(stateName = this._currentState) {
            if (this._isDestroyed) return null;
            const validState = Object.values(STATES).includes(stateName) ? stateName : this._currentState;
            if (!this._isExamMode && this._currentState !== validState) {
                this._currentState = validState;
            }
            this._selectVariationForCurrentState();
            this._notifySubscribers();
            return this._currentVariation;
        }

        /**
         * Updates current active variation for the current state.
         */
        _selectVariationForCurrentState() {
            this._currentVariation = this.selectVariation(this._currentState);
        }

        // =====================================================================
        // PROCEDURAL JITTER & MICRO-MOTION PARAMETERS
        // =====================================================================

        /**
         * Generates real-time procedural motion parameters for the rendering engine.
         * When in exam mode (QUIET_FOCUSED), all jitter parameters are completely suppressed.
         * @returns {Object} Procedural jitter parameters
         */
        getProceduralJitter() {
            if (this._isExamMode || this._currentState === STATES.QUIET_FOCUSED) {
                return {
                    breathing: {
                        frequencyHz: 0.15,
                        amplitude: 0.005,
                        phase: this._breathingPhase
                    },
                    eyeDrift: {
                        trackingSpeed: 0.0,
                        saccadeScale: 0.0,
                        driftFrequency: 0.0
                    },
                    bodyJitter: {
                        amplitude: 0.0,
                        frequencyHz: 0.0
                    },
                    isQuietFocused: true,
                    suppressJitter: true
                };
            }

            // Normal dynamic modulation based on M(t)
            // Frequency increases with excitement E, slows with fatigue F
            const breathFreq = clampSafe(0.25 + 0.45 * this._E - 0.10 * this._F, 0.15, 0.85, 0.35);
            const breathAmp = clampSafe(0.015 + 0.025 * this._E + 0.010 * this._P, 0.008, 0.050, 0.020);

            // Eye tracking speed and micro-saccades
            // High patience P gives steady tracking; high excitement E gives fast energetic saccades
            const trackingSpeed = clampSafe(0.10 + 0.12 * this._P - 0.05 * this._F, 0.04, 0.25, 0.12);
            const saccadeScale = clampSafe(1.0 + 2.5 * this._E - 0.5 * this._P, 0.3, 4.0, 1.5);
            const driftFrequency = clampSafe(0.5 + 1.2 * this._E, 0.3, 2.5, 0.8);

            // Subtle body jitter/bobbing
            const bodyJitterAmp = clampSafe(0.2 + 1.5 * this._E + 0.8 * this._S - 0.3 * this._F, 0.0, 2.5, 0.5);
            const bodyJitterFreq = clampSafe(0.8 + 1.5 * this._E, 0.4, 3.0, 1.0);

            return {
                breathing: {
                    frequencyHz: breathFreq,
                    amplitude: breathAmp,
                    phase: this._breathingPhase
                },
                eyeDrift: {
                    trackingSpeed: trackingSpeed,
                    saccadeScale: saccadeScale,
                    driftFrequency: driftFrequency
                },
                bodyJitter: {
                    amplitude: bodyJitterAmp,
                    frequencyHz: bodyJitterFreq
                },
                isQuietFocused: false,
                suppressJitter: false
            };
        }

        // =====================================================================
        // SUBSCRIBER NOTIFICATIONS
        // =====================================================================

        _notifySubscribers() {
            if (this._isDestroyed || this._subscribers.length === 0) return;

            const snapshot = {
                momentum: this.momentum,
                state: this._currentState,
                isExamMode: this._isExamMode,
                variation: this._currentVariation,
                jitter: this.getProceduralJitter(),
                elapsedSeconds: this._elapsedSeconds,
                idleInactivitySeconds: this._idleInactivitySeconds
            };

            const listeners = this._subscribers.slice();
            for (let i = 0; i < listeners.length; i++) {
                try {
                    listeners[i](snapshot);
                } catch (err) {
                    console.error('NoriStateController subscriber error:', err);
                }
            }
        }
    }

    // Expose static metadata
    NoriStateController.BASELINE = BASELINE;
    NoriStateController.DECAY_RATES = DECAY_RATES;
    NoriStateController.STATES = STATES;
    NoriStateController.VARIATION_CATALOG = VARIATION_CATALOG;
    NoriStateController.clampSafe = clampSafe;

    return NoriStateController;
}));
