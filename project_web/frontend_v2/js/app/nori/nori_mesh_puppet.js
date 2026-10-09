/**
 * Vectoria Nori Procedural Mesh Puppet Engine
 * 
 * Represents Nori as a deformable 2D vector mesh in coordinate space.
 * Capable of undergoing real-time linear matrix transformations T(x) = Ax:
 * - Rotation, Scaling, Shearing, Reflection (det < 0), and Singular Collapse (det = 0).
 * - Algebraic invariant analysis (det, trace, orthogonality, rank).
 * - Organic procedural dynamics: 2-axis breathing, spring-damper eye tracking, blink cycle.
 * - 60 FPS Canvas 2D renderer with Retina scaling and Dark/Light mode theme awareness.
 * - Bi-directional integration with NoriStateController.
 * 
 * Standards Compliance: Vanilla JS, UMD (Browser + Node.js), Zero Em-dash, Strict NaN safety.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.NoriMeshPuppet = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Clamps a numeric value safely between min and max.
     */
    function clampSafe(val, min, max, fallback) {
        if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
            return fallback;
        }
        return Math.max(min, Math.min(max, val));
    }

    /**
     * Base canonical vertices of Nori's body hull in local normalized space [-100, 100].
     * Forms a smooth, friendly dumpling contour centered at (0, 0).
     */
    const BASE_BODY_VERTICES = Object.freeze([
        Object.freeze({ x: 0, y: -65 }),    // 0: Head crown apex
        Object.freeze({ x: 26, y: -62 }),   // 1: Upper right curve
        Object.freeze({ x: 48, y: -45 }),   // 2: Right temple
        Object.freeze({ x: 62, y: -20 }),   // 3: Right upper cheek
        Object.freeze({ x: 66, y: 12 }),    // 4: Right cheek apex
        Object.freeze({ x: 58, y: 44 }),    // 5: Right lower jaw
        Object.freeze({ x: 38, y: 64 }),    // 6: Right base corner
        Object.freeze({ x: 18, y: 68 }),    // 7: Bottom right base
        Object.freeze({ x: 0, y: 69 }),     // 8: Bottom center
        Object.freeze({ x: -18, y: 68 }),   // 9: Bottom left base
        Object.freeze({ x: -38, y: 64 }),   // 10: Left base corner
        Object.freeze({ x: -58, y: 44 }),   // 11: Left lower jaw
        Object.freeze({ x: -66, y: 12 }),   // 12: Left cheek apex
        Object.freeze({ x: -62, y: -20 }),  // 13: Left upper cheek
        Object.freeze({ x: -48, y: -45 }),  // 14: Left temple
        Object.freeze({ x: -26, y: -62 })   // 15: Upper left curve
    ]);

    /**
     * Belly patch vertices (soft oval centered slightly below midline).
     */
    const BASE_BELLY_VERTICES = Object.freeze([
        Object.freeze({ x: 0, y: -10 }),
        Object.freeze({ x: 22, y: 2 }),
        Object.freeze({ x: 32, y: 24 }),
        Object.freeze({ x: 20, y: 48 }),
        Object.freeze({ x: 0, y: 56 }),
        Object.freeze({ x: -20, y: 48 }),
        Object.freeze({ x: -32, y: 24 }),
        Object.freeze({ x: -22, y: 2 })
    ]);

    /**
     * Ear geometry (horns / ears at top corners).
     */
    const BASE_EARS = Object.freeze({
        left: Object.freeze([
            Object.freeze({ x: -28, y: -58 }), // Base inner
            Object.freeze({ x: -48, y: -88 }), // Tip
            Object.freeze({ x: -50, y: -48 })  // Base outer
        ]),
        right: Object.freeze([
            Object.freeze({ x: 28, y: -58 }),  // Base inner
            Object.freeze({ x: 48, y: -88 }),  // Tip
            Object.freeze({ x: 50, y: -48 })   // Base outer
        ])
    });

    /**
     * Eye anchor positions and dimensions.
     */
    const BASE_EYES = Object.freeze({
        left: Object.freeze({ x: -25, y: -6, rx: 7.5, ry: 9.5 }),
        right: Object.freeze({ x: 25, y: -6, rx: 7.5, ry: 9.5 })
    });

    /**
     * Blush cheek anchors.
     */
    const BASE_CHEEKS = Object.freeze({
        left: Object.freeze({ x: -42, y: 14, rx: 9, ry: 5.5 }),
        right: Object.freeze({ x: 42, y: 14, rx: 9, ry: 5.5 })
    });

    /**
     * Paws / little hands.
     */
    const BASE_PAWS = Object.freeze({
        left: Object.freeze({ x: -34, y: 42, rx: 8, ry: 6.5 }),
        right: Object.freeze({ x: 34, y: 42, rx: 8, ry: 6.5 })
    });

    /**
     * Theme color palettes for Canvas rendering.
     */
    const PALETTES = Object.freeze({
        light: Object.freeze({
            bodyFill: '#f59e0b',          // Amber 500
            bodyShade: '#d97706',         // Amber 600
            bodyStroke: '#78350f',        // Amber 900
            bellyFill: '#fef3c7',         // Amber 100
            bellyStroke: '#fde68a',       // Amber 200
            earInner: '#fbcfe8',          // Pink 200
            blushFill: 'rgba(244, 63, 94, 0.42)', // Rose 500 with opacity
            eyeWhite: '#ffffff',
            eyePupil: '#1c1917',          // Stone 900
            eyeCatch: '#ffffff',
            mouthFill: '#881337',         // Rose 900
            pawFill: '#fef3c7',
            pawStroke: '#d97706',
            gridLine: 'rgba(120, 113, 108, 0.15)',
            axisLine: '#78716c',
            basisE1: '#dc2626',           // Red (e1)
            basisE2: '#2563eb'            // Blue (e2)
        }),
        dark: Object.freeze({
            bodyFill: '#d97706',          // Warm glowing amber
            bodyShade: '#b45309',
            bodyStroke: '#fed7aa',        // Bright edge highlight
            bellyFill: '#451a03',
            bellyStroke: '#78350f',
            earInner: '#9d174d',
            blushFill: 'rgba(251, 113, 133, 0.45)',
            eyeWhite: '#f5f5f4',
            eyePupil: '#0c0a09',
            eyeCatch: '#ffffff',
            mouthFill: '#4c0519',
            pawFill: '#78350f',
            pawStroke: '#f59e0b',
            gridLine: 'rgba(214, 211, 209, 0.10)',
            axisLine: '#a8a29e',
            basisE1: '#ef4444',
            basisE2: '#3b82f6'
        })
    });

    /**
     * NoriMeshPuppet Class
     */
    class NoriMeshPuppet {
        /**
         * @param {Object} [options] Configuration options
         */
        constructor(options = {}) {
            const opts = options || {};

            // 1. Matrix State [a, b, c, d, tx, ty]
            // Represents affine 2D transform: x' = a*x + b*y + tx, y' = c*x + d*y + ty
            this._matrixCurrent = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
            this._matrixTarget = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
            this._matrixTweenSpeed = clampSafe(opts.tweenSpeed, 0.01, 1.0, 0.18);

            // 2. Procedural Dynamic Parameters
            this._breathingPhase = 0.0;
            this._breathingFrequencyHz = 0.28;
            this._breathingAmplitude = 0.038;

            // Eye tracking with 2nd-order spring damper physics
            this._mouseTarget = { x: 0.0, y: 0.0 };
            this._eyeDrift = { x: 0.0, y: 0.0 };
            this._eyeVelocity = { x: 0.0, y: 0.0 };
            this._eyeSpringK = 0.12;
            this._eyeDamping = 0.24;

            // Blinking mechanism
            this._isBlinking = false;
            this._blinkDurationMs = 130;
            this._blinkElapsedMs = 0;
            this._timeUntilNextBlinkMs = 2800 + Math.random() * 2400;

            // Rotation accumulation & dizziness tracker
            this._angularVelocity = 0.0;
            this._lastAngle = 0.0;
            this._dizzyTimerMs = 0;

            // Connected NoriStateController
            this._stateController = null;
            this._stateUnsubscribe = null;

            // Rendering context
            this._canvas = null;
            this._ctx = null;
            this._animationFrameId = null;
            this._lastTimestamp = 0;
            this._isDestroyed = false;

            // Display configuration
            this.showAxes = opts.showAxes !== false;
            this.showGrid = opts.showGrid !== false;
            this.theme = opts.theme || 'auto';
            this.scale = clampSafe(opts.scale, 0.1, 5.0, 1.0);

            // Mouse event listeners for automatic eye tracking
            this._boundOnPointerMove = this._onPointerMove.bind(this);
            this._boundOnPointerLeave = this._onPointerLeave.bind(this);

            if (opts.stateController) {
                this.connectStateController(opts.stateController);
            }
        }

        // =====================================================================
        // MATRIX OPERATIONS & ALGEBRAIC ANALYSIS
        // =====================================================================

        /**
         * Sets the target transformation matrix.
         * @param {number} a - Row 1, Col 1 (Scale X / Cosine)
         * @param {number} b - Row 1, Col 2 (Shear X / -Sine)
         * @param {number} c - Row 2, Col 1 (Shear Y / Sine)
         * @param {number} d - Row 2, Col 2 (Scale Y / Cosine)
         * @param {number} [tx=0] - Translation X
         * @param {number} [ty=0] - Translation Y
         * @param {boolean} [animate=true] - Whether to smoothly tween or snap immediately
         */
        setMatrix(a, b, c, d, tx = 0, ty = 0, animate = true) {
            if (this._isDestroyed) return;

            const safeA = clampSafe(a, -100, 100, 1.0);
            const safeB = clampSafe(b, -100, 100, 0.0);
            const safeC = clampSafe(c, -100, 100, 0.0);
            const safeD = clampSafe(d, -100, 100, 1.0);
            const safeTx = clampSafe(tx, -500, 500, 0.0);
            const safeTy = clampSafe(ty, -500, 500, 0.0);

            this._matrixTarget = [safeA, safeB, safeC, safeD, safeTx, safeTy];

            if (!animate) {
                this._matrixCurrent = [safeA, safeB, safeC, safeD, safeTx, safeTy];
            }

            // Trigger potential pedagogical state responses based on algebraic properties
            this._evaluateAlgebraicReaction(safeA, safeB, safeC, safeD);
        }

        /**
         * Resets matrix to Identity [1, 0, 0, 1, 0, 0].
         * @param {boolean} [animate=true]
         */
        resetMatrix(animate = true) {
            this.setMatrix(1.0, 0.0, 0.0, 1.0, 0.0, 0.0, animate);
        }

        /**
         * Returns current algebraic invariants and characteristics of the transformation.
         * @returns {Object}
         */
        getMatrixAnalysis() {
            const [a, b, c, d, tx, ty] = this._matrixCurrent;
            const det = a * d - b * c;
            const trace = a + d;

            // Orthogonality: A^T * A = I and det = 1
            const dot11 = a * a + c * c;
            const dot22 = b * b + d * d;
            const dot12 = a * b + c * d;
            const isOrthogonal = Math.abs(dot11 - 1.0) < 0.04 &&
                                 Math.abs(dot22 - 1.0) < 0.04 &&
                                 Math.abs(dot12) < 0.04 &&
                                 Math.abs(det - 1.0) < 0.04;

            // Rotation angle
            const angleRad = Math.atan2(c, a);
            const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

            // Singular (Rank collapse)
            const isSingular = Math.abs(det) < 1e-4;

            // Reflection (Orientation flip)
            const isReflected = det < -1e-4;

            // Pure scaling check
            const isPureScale = Math.abs(b) < 1e-4 && Math.abs(c) < 1e-4 && !isSingular;

            // Shear check
            const isShear = Math.abs(det - 1.0) < 0.05 && (Math.abs(b) > 0.08 || Math.abs(c) > 0.08);

            // Eigenvalues for 2x2 matrix: lambda^2 - trace*lambda + det = 0
            // Discriminant Delta = trace^2 - 4*det
            const discriminant = trace * trace - 4 * det;
            let eigenvalues = null;
            if (discriminant >= 0) {
                const sqrtD = Math.sqrt(discriminant);
                eigenvalues = [
                    (trace + sqrtD) / 2.0,
                    (trace - sqrtD) / 2.0
                ];
            }

            return {
                matrix: [a, b, c, d, tx, ty],
                targetMatrix: [...this._matrixTarget],
                det: det,
                trace: trace,
                isSingular: isSingular,
                isReflected: isReflected,
                isOrthogonal: isOrthogonal,
                isPureScale: isPureScale,
                isShear: isShear,
                angleRad: angleRad,
                angleDeg: angleDeg,
                scaleMagnitude: Math.sqrt(Math.max(0, Math.abs(det))),
                eigenvalues: eigenvalues
            };
        }

        /**
         * Evaluates algebraic properties and sends reactions to connected NoriStateController.
         */
        _evaluateAlgebraicReaction(a, b, c, d) {
            if (!this._stateController) return;

            const det = a * d - b * c;

            if (Math.abs(det) < 1e-4) {
                // Singular matrix: space collapses, Nori panics
                this._stateController.onEvent('STUCK_LONG', { reason: 'matrix_singular', det: 0 });
                if (typeof this._stateController.setState === 'function') {
                    this._stateController.setState('THINKING', 3000);
                }
            } else if (det < -0.01) {
                // Reflection: Nori is flipped curiously
                if (typeof this._stateController.setState === 'function') {
                    this._stateController.setState('ENCOURAGING', 2000);
                }
            } else if (Math.abs(det - 1.0) < 0.02 && (a * a + c * c) > 0.95) {
                // Isometric rotation or preservation: happy celebrating
                this._stateController.onEvent('QUESTION_CORRECT', { reason: 'isometry' });
            }
        }

        // =====================================================================
        // STATE CONTROLLER INTEGRATION
        // =====================================================================

        /**
         * Connects a NoriStateController instance to sync breathing and emotional parameters.
         * @param {Object} controller
         */
        connectStateController(controller) {
            if (!controller) return;
            this.disconnectStateController();

            this._stateController = controller;
            if (typeof controller.subscribe === 'function') {
                this._stateUnsubscribe = controller.subscribe((snapshot) => {
                    this._onStateSnapshot(snapshot);
                });
            }
        }

        /**
         * Disconnects the active NoriStateController.
         */
        disconnectStateController() {
            if (typeof this._stateUnsubscribe === 'function') {
                this._stateUnsubscribe();
            }
            this._stateUnsubscribe = null;
            this._stateController = null;
        }

        /**
         * Handles state controller updates.
         */
        _onStateSnapshot(snapshot) {
            if (!snapshot || this._isDestroyed) return;

            if (snapshot.jitter && snapshot.jitter.breathing) {
                this._breathingFrequencyHz = snapshot.jitter.breathing.frequencyHz || 0.28;
                this._breathingAmplitude = 0.038 * (snapshot.jitter.breathing.amplitudeScale || 1.0);
            }

            if (snapshot.isExamMode) {
                // In exam mode: freeze eye wander and suppress breathing amplitude
                this._breathingAmplitude = 0.01;
                this._mouseTarget.x = 0;
                this._mouseTarget.y = 0;
            }
        }

        // =====================================================================
        // GEOMETRIC TRANSFORMATIONS
        // =====================================================================

        /**
         * Transforms a single local point (x, y) through the current matrix with breathing.
         * @param {number} x
         * @param {number} y
         * @param {number} [scaleX=1]
         * @param {number} [scaleY=1]
         * @returns {{ x: number, y: number }}
         */
        transformPoint(x, y, scaleX = 1.0, scaleY = 1.0) {
            const [a, b, c, d, tx, ty] = this._matrixCurrent;
            const bx = x * scaleX;
            const by = y * scaleY;
            return {
                x: a * bx + b * by + tx,
                y: c * bx + d * by + ty
            };
        }

        /**
         * Returns an array of transformed body hull vertices.
         * @returns {Array<{ x: number, y: number }>}
         */
        getTransformedVertices() {
            const sx = 1.0 - this._breathingAmplitude * Math.sin(this._breathingPhase);
            const sy = 1.0 + this._breathingAmplitude * 1.25 * Math.sin(this._breathingPhase);

            return BASE_BODY_VERTICES.map(pt => this.transformPoint(pt.x, pt.y, sx, sy));
        }

        // =====================================================================
        // PROCEDURAL ANIMATION TICK
        // =====================================================================

        /**
         * Advances procedural clocks by dt (in seconds).
         * @param {number} dt Delta time in seconds
         */
        tick(dt) {
            if (this._isDestroyed) return;
            const deltaSec = clampSafe(dt, 0.001, 0.2, 0.016);

            // 1. Matrix interpolation (Smooth tween towards target)
            const speed = this._matrixTweenSpeed;
            for (let i = 0; i < 6; i++) {
                const diff = this._matrixTarget[i] - this._matrixCurrent[i];
                if (Math.abs(diff) < 0.0005) {
                    this._matrixCurrent[i] = this._matrixTarget[i];
                } else {
                    this._matrixCurrent[i] += diff * (1.0 - Math.exp(-speed * deltaSec * 60));
                }
            }

            // 2. Breathing clock
            const twoPi = 2 * Math.PI;
            this._breathingPhase = (this._breathingPhase + twoPi * this._breathingFrequencyHz * deltaSec) % twoPi;

            // 3. Eye Spring-Damper dynamics
            const targetX = clampSafe(this._mouseTarget.x, -18, 18, 0);
            const targetY = clampSafe(this._mouseTarget.y, -14, 14, 0);

            const forceX = (targetX - this._eyeDrift.x) * this._eyeSpringK;
            const forceY = (targetY - this._eyeDrift.y) * this._eyeSpringK;

            this._eyeVelocity.x = (this._eyeVelocity.x + forceX) * (1.0 - this._eyeDamping);
            this._eyeVelocity.y = (this._eyeVelocity.y + forceY) * (1.0 - this._eyeDamping);

            this._eyeDrift.x += this._eyeVelocity.x;
            this._eyeDrift.y += this._eyeVelocity.y;

            // 4. Blinking cycle
            const deltaMs = deltaSec * 1000;
            if (this._isBlinking) {
                this._blinkElapsedMs += deltaMs;
                if (this._blinkElapsedMs >= this._blinkDurationMs) {
                    this._isBlinking = false;
                    this._blinkElapsedMs = 0;
                    this._timeUntilNextBlinkMs = 2800 + Math.random() * 2600;
                }
            } else {
                this._timeUntilNextBlinkMs -= deltaMs;
                if (this._timeUntilNextBlinkMs <= 0) {
                    this._isBlinking = true;
                    this._blinkElapsedMs = 0;
                }
            }

            // 5. Angular velocity & dizziness tracker
            const currentAngle = Math.atan2(this._matrixCurrent[2], this._matrixCurrent[0]);
            let angleDiff = currentAngle - this._lastAngle;
            while (angleDiff > Math.PI) angleDiff -= twoPi;
            while (angleDiff < -Math.PI) angleDiff += twoPi;

            this._angularVelocity = angleDiff / Math.max(0.001, deltaSec);
            this._lastAngle = currentAngle;

            if (Math.abs(this._angularVelocity) > 2.8) {
                this._dizzyTimerMs = Math.min(3000, this._dizzyTimerMs + deltaMs * 2);
            } else if (this._dizzyTimerMs > 0) {
                this._dizzyTimerMs = Math.max(0, this._dizzyTimerMs - deltaMs);
            }
        }

        // =====================================================================
        // CANVAS RENDERING
        // =====================================================================

        /**
         * Renders Nori onto a 2D Canvas context.
         * @param {CanvasRenderingContext2D} ctx
         * @param {number} width
         * @param {number} height
         * @param {string} [themeMode='auto']
         */
        render(ctx, width, height, themeMode = 'auto') {
            if (!ctx || width <= 0 || height <= 0) return;

            // Determine active theme colors
            let isDark = false;
            if (themeMode === 'dark') {
                isDark = true;
            } else if (themeMode === 'light') {
                isDark = false;
            } else {
                if (typeof document !== 'undefined') {
                    isDark = document.documentElement.classList.contains('dark');
                }
            }

            const p = isDark ? PALETTES.dark : PALETTES.light;
            const analysis = this.getMatrixAnalysis();

            ctx.save();
            ctx.clearRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;
            const baseScale = (Math.min(width, height) / 220) * this.scale;

            // 1. Draw Coordinate Grid & Axes (if enabled)
            if (this.showGrid) {
                this._drawGrid(ctx, width, height, centerX, centerY, baseScale, p);
            }

            // Center origin at middle of canvas
            ctx.translate(centerX, centerY);
            ctx.scale(baseScale, baseScale);

            // Breathing scale factors
            const sx = 1.0 - this._breathingAmplitude * Math.sin(this._breathingPhase);
            const sy = 1.0 + this._breathingAmplitude * 1.25 * Math.sin(this._breathingPhase);

            // Dynamic color modulation based on matrix properties
            let bodyFill = p.bodyFill;
            let bodyStroke = p.bodyStroke;

            if (analysis.isSingular) {
                // Collapsed panic (Rose red)
                bodyFill = isDark ? '#9f1239' : '#e11d48';
                bodyStroke = isDark ? '#fda4af' : '#881337';
            } else if (analysis.isReflected) {
                // Mirrored curiosity (Cyan blue)
                bodyFill = isDark ? '#0369a1' : '#0284c7';
                bodyStroke = isDark ? '#bae6fd' : '#075985';
            } else if (this._dizzyTimerMs > 400) {
                // Spinning dizzy (Amethyst purple)
                bodyFill = isDark ? '#7e22ce' : '#9333ea';
                bodyStroke = isDark ? '#f3e8ff' : '#581c87';
            }

            // 2. Draw Ears (Behind Body)
            this._drawEars(ctx, sx, sy, bodyFill, bodyStroke, p.earInner);

            // 3. Draw Body Hull
            this._drawBodyHull(ctx, sx, sy, bodyFill, bodyStroke);

            // 4. Draw Belly Patch
            this._drawBelly(ctx, sx, sy, p.bellyFill, p.bellyStroke);

            // 5. Draw Cheeks
            if (!analysis.isSingular) {
                this._drawCheeks(ctx, sx, sy, p.blushFill);
            }

            // 6. Draw Eyes & Pupils
            this._drawEyes(ctx, sx, sy, p, analysis);

            // 7. Draw Mouth
            this._drawMouth(ctx, sx, sy, p.mouthFill, analysis);

            // 8. Draw Paws
            this._drawPaws(ctx, sx, sy, p.pawFill, p.pawStroke);

            ctx.restore();

            // 9. Draw Basis Vectors e1, e2 overlay (if enabled)
            if (this.showAxes) {
                this._drawBasisVectors(ctx, centerX, centerY, baseScale * 45, p);
            }
        }

        /**
         * Draws background coordinate grid and main axes.
         */
        _drawGrid(ctx, w, h, cx, cy, scale, p) {
            ctx.save();
            ctx.strokeStyle = p.gridLine;
            ctx.lineWidth = 1.0;

            const step = 25 * scale;
            if (step > 4) {
                // Vertical grid lines
                for (let x = cx % step; x < w; x += step) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, h);
                    ctx.stroke();
                }
                // Horizontal grid lines
                for (let y = cy % step; y < h; y += step) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();
                }
            }

            // Primary crosshair axes
            ctx.strokeStyle = p.axisLine;
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(w, cy);
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, h);
            ctx.stroke();

            ctx.restore();
        }

        /**
         * Draws transformed ears with soft quadratic curves.
         */
        _drawEars(ctx, sx, sy, fill, stroke, innerFill) {
            ['left', 'right'].forEach(side => {
                const pts = BASE_EARS[side];
                const t0 = this.transformPoint(pts[0].x, pts[0].y, sx, sy);
                const t1 = this.transformPoint(pts[1].x, pts[1].y, sx, sy);
                const t2 = this.transformPoint(pts[2].x, pts[2].y, sx, sy);

                ctx.beginPath();
                ctx.moveTo(t0.x, t0.y);
                ctx.quadraticCurveTo(t1.x, t1.y, t2.x, t2.y);
                ctx.closePath();

                ctx.fillStyle = fill;
                ctx.fill();
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 2.0;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();

                // Inner ear accent
                const midX = (t0.x + t1.x * 2 + t2.x) / 4;
                const midY = (t0.y + t1.y * 2 + t2.y) / 4;
                ctx.beginPath();
                ctx.arc(midX, midY, Math.abs(t1.y - t0.y) * 0.12, 0, 2 * Math.PI);
                ctx.fillStyle = innerFill;
                ctx.fill();
            });
        }

        /**
         * Draws smooth closed body hull using Catmull-Rom or Chaikin spline.
         */
        _drawBodyHull(ctx, sx, sy, fill, stroke) {
            const transformed = BASE_BODY_VERTICES.map(pt => this.transformPoint(pt.x, pt.y, sx, sy));
            const n = transformed.length;
            if (n < 3) return;

            ctx.beginPath();
            const startMidX = (transformed[0].x + transformed[1].x) / 2;
            const startMidY = (transformed[0].y + transformed[1].y) / 2;
            ctx.moveTo(startMidX, startMidY);

            for (let i = 1; i <= n; i++) {
                const curr = transformed[i % n];
                const next = transformed[(i + 1) % n];
                const midX = (curr.x + next.x) / 2;
                const midY = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            }
            ctx.closePath();

            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        /**
         * Draws the belly patch.
         */
        _drawBelly(ctx, sx, sy, fill, stroke) {
            const transformed = BASE_BELLY_VERTICES.map(pt => this.transformPoint(pt.x, pt.y, sx, sy));
            const n = transformed.length;
            if (n < 3) return;

            ctx.beginPath();
            const startMidX = (transformed[0].x + transformed[1].x) / 2;
            const startMidY = (transformed[0].y + transformed[1].y) / 2;
            ctx.moveTo(startMidX, startMidY);

            for (let i = 1; i <= n; i++) {
                const curr = transformed[i % n];
                const next = transformed[(i + 1) % n];
                const midX = (curr.x + next.x) / 2;
                const midY = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            }
            ctx.closePath();

            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.0;
            ctx.stroke();
        }

        /**
         * Draws blush cheeks.
         */
        _drawCheeks(ctx, sx, sy, blushColor) {
            ['left', 'right'].forEach(side => {
                const c = BASE_CHEEKS[side];
                const center = this.transformPoint(c.x, c.y, sx, sy);
                const edgeX = this.transformPoint(c.x + c.rx, c.y, sx, sy);
                const edgeY = this.transformPoint(c.x, c.y + c.ry, sx, sy);

                const rx = Math.hypot(edgeX.x - center.x, edgeX.y - center.y);
                const ry = Math.hypot(edgeY.x - center.x, edgeY.y - center.y);
                const rot = Math.atan2(edgeX.y - center.y, edgeX.x - center.x);

                ctx.save();
                ctx.translate(center.x, center.y);
                ctx.rotate(rot);
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
                ctx.fillStyle = blushColor;
                ctx.fill();
                ctx.restore();
            });
        }

        /**
         * Draws eyes with dynamic pupil movement, blinking, or dizziness spirals.
         */
        _drawEyes(ctx, sx, sy, p, analysis) {
            const isDizzy = this._dizzyTimerMs > 400;
            const isSingular = analysis.isSingular;
            const blinkScale = this._isBlinking ? 0.12 : 1.0;

            ['left', 'right'].forEach(side => {
                const eye = BASE_EYES[side];
                const center = this.transformPoint(eye.x, eye.y, sx, sy);
                const edgeX = this.transformPoint(eye.x + eye.rx, eye.y, sx, sy);
                const edgeY = this.transformPoint(eye.x, eye.y + eye.ry * blinkScale, sx, sy);

                const rx = Math.max(1.0, Math.hypot(edgeX.x - center.x, edgeX.y - center.y));
                const ry = Math.max(0.5, Math.hypot(edgeY.x - center.x, edgeY.y - center.y));
                const rot = Math.atan2(edgeX.y - center.y, edgeX.x - center.x);

                ctx.save();
                ctx.translate(center.x, center.y);
                ctx.rotate(rot);

                if (isSingular) {
                    // Singular state: wide panicked dot or collapsed horizontal slit
                    ctx.beginPath();
                    ctx.moveTo(-rx, 0);
                    ctx.lineTo(rx, 0);
                    ctx.strokeStyle = p.eyePupil;
                    ctx.lineWidth = 2.0;
                    ctx.stroke();
                } else if (isDizzy) {
                    // Dizzy spiral eyes
                    ctx.beginPath();
                    ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
                    ctx.fillStyle = p.eyeWhite;
                    ctx.fill();
                    ctx.strokeStyle = p.eyePupil;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Draw spiral
                    ctx.beginPath();
                    for (let a = 0; a < 3.5 * Math.PI; a += 0.2) {
                        const r = (a / (3.5 * Math.PI)) * (rx * 0.75);
                        const spin = a + (this._lastTimestamp * 0.008);
                        const sxSpiral = Math.cos(spin) * r;
                        const sySpiral = Math.sin(spin) * r * (ry / rx);
                        if (a === 0) ctx.moveTo(sxSpiral, sySpiral);
                        else ctx.lineTo(sxSpiral, sySpiral);
                    }
                    ctx.strokeStyle = p.eyePupil;
                    ctx.lineWidth = 1.25;
                    ctx.stroke();
                } else {
                    // Standard living eyes
                    ctx.beginPath();
                    ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
                    ctx.fillStyle = p.eyeWhite;
                    ctx.fill();
                    ctx.strokeStyle = p.bodyStroke;
                    ctx.lineWidth = 1.25;
                    ctx.stroke();

                    if (!this._isBlinking) {
                        // Pupil tracking mouse offset
                        const pupilMaxX = rx * 0.45;
                        const pupilMaxY = ry * 0.45;
                        const px = clampSafe(this._eyeDrift.x * 0.35, -pupilMaxX, pupilMaxX, 0);
                        const py = clampSafe(this._eyeDrift.y * 0.35, -pupilMaxY, pupilMaxY, 0);
                        const pr = Math.min(rx, ry) * 0.58;

                        ctx.beginPath();
                        ctx.arc(px, py, pr, 0, 2 * Math.PI);
                        ctx.fillStyle = p.eyePupil;
                        ctx.fill();

                        // Catchlight shine
                        ctx.beginPath();
                        ctx.arc(px - pr * 0.32, py - pr * 0.32, pr * 0.35, 0, 2 * Math.PI);
                        ctx.fillStyle = p.eyeCatch;
                        ctx.fill();
                    }
                }

                ctx.restore();
            });
        }

        /**
         * Draws mouth responding to algebraic and emotional states.
         */
        _drawMouth(ctx, sx, sy, mouthColor, analysis) {
            const mCenter = this.transformPoint(0, 16, sx, sy);
            const mLeft = this.transformPoint(-10, 16, sx, sy);
            const mRight = this.transformPoint(10, 16, sx, sy);

            ctx.save();
            ctx.beginPath();

            if (analysis.isSingular) {
                // Panicked squiggle mouth
                ctx.moveTo(mLeft.x, mLeft.y);
                const mid1 = this.transformPoint(-5, 13, sx, sy);
                const mid2 = this.transformPoint(0, 19, sx, sy);
                const mid3 = this.transformPoint(5, 13, sx, sy);
                ctx.lineTo(mid1.x, mid1.y);
                ctx.lineTo(mid2.x, mid2.y);
                ctx.lineTo(mid3.x, mid3.y);
                ctx.lineTo(mRight.x, mRight.y);
                ctx.strokeStyle = mouthColor;
                ctx.lineWidth = 2.0;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            } else if (analysis.isReflected) {
                // Surprised 'o' mouth
                const mBottom = this.transformPoint(0, 24, sx, sy);
                const rx = Math.hypot(mRight.x - mLeft.x, mRight.y - mLeft.y) / 2;
                const ry = Math.hypot(mBottom.x - mCenter.x, mBottom.y - mCenter.y);
                ctx.ellipse(mCenter.x, mCenter.y + ry / 2, Math.max(1, rx * 0.6), Math.max(1, ry * 0.7), 0, 0, 2 * Math.PI);
                ctx.fillStyle = mouthColor;
                ctx.fill();
            } else {
                // Cheerful warm smile curve
                const mBottom = this.transformPoint(0, 23, sx, sy);
                ctx.moveTo(mLeft.x, mLeft.y);
                ctx.quadraticCurveTo(mBottom.x, mBottom.y, mRight.x, mRight.y);
                ctx.strokeStyle = mouthColor;
                ctx.lineWidth = 2.25;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            ctx.restore();
        }

        /**
         * Draws paws/hands.
         */
        _drawPaws(ctx, sx, sy, fill, stroke) {
            ['left', 'right'].forEach(side => {
                const paw = BASE_PAWS[side];
                const center = this.transformPoint(paw.x, paw.y, sx, sy);
                const edgeX = this.transformPoint(paw.x + paw.rx, paw.y, sx, sy);
                const edgeY = this.transformPoint(paw.x, paw.y + paw.ry, sx, sy);

                const rx = Math.hypot(edgeX.x - center.x, edgeX.y - center.y);
                const ry = Math.hypot(edgeY.x - center.x, edgeY.y - center.y);

                ctx.beginPath();
                ctx.ellipse(center.x, center.y, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
                ctx.fillStyle = fill;
                ctx.fill();
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        }

        /**
         * Draws transformed basis vectors e1 and e2 with vector arrows.
         */
        _drawBasisVectors(ctx, originX, originY, length, p) {
            const [a, b, c, d] = this._matrixCurrent;

            // e1 = A * [1, 0]^T = [a, c]^T
            const e1x = originX + a * length;
            const e1y = originY + c * length;

            // e2 = A * [0, 1]^T = [b, d]^T
            const e2x = originX + b * length;
            const e2y = originY + d * length;

            ctx.save();

            // Vector e1 (Red)
            this._drawArrow(ctx, originX, originY, e1x, e1y, p.basisE1, 'e1');

            // Vector e2 (Blue)
            this._drawArrow(ctx, originX, originY, e2x, e2y, p.basisE2, 'e2');

            ctx.restore();
        }

        /**
         * Helper to render an arrow with label.
         */
        _drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
            const headLen = 9;
            const dx = toX - fromX;
            const dy = toY - fromY;
            const angle = Math.atan2(dy, dx);
            const dist = Math.hypot(dx, dy);

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2.0;

            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();

            if (dist > 5) {
                ctx.beginPath();
                ctx.moveTo(toX, toY);
                ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
            }

            // Draw label
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.fillText(label, toX + 6 * Math.cos(angle), toY + 6 * Math.sin(angle));
        }

        // =====================================================================
        // CANVAS BINDING & INTERACTION
        // =====================================================================

        /**
         * Binds this puppet to an HTML5 <canvas> element and launches the 60 FPS animation loop.
         * @param {HTMLCanvasElement} canvasElement
         */
        attachToCanvas(canvasElement) {
            if (!canvasElement || typeof canvasElement.getContext !== 'function') {
                return;
            }

            this.detachFromCanvas();

            this._canvas = canvasElement;
            this._ctx = canvasElement.getContext('2d');

            canvasElement.addEventListener('pointermove', this._boundOnPointerMove);
            canvasElement.addEventListener('pointerleave', this._boundOnPointerLeave);

            this._lastTimestamp = (typeof performance !== 'undefined') ? performance.now() : Date.now();

            const loop = (timestamp) => {
                if (this._isDestroyed || !this._canvas) return;

                const now = timestamp || ((typeof performance !== 'undefined') ? performance.now() : Date.now());
                const dt = Math.min(0.1, (now - this._lastTimestamp) / 1000);
                this._lastTimestamp = now;

                this.tick(dt);

                // Handle retina display backing store sizing
                const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
                const rect = this._canvas.getBoundingClientRect();
                const displayWidth = Math.round(rect.width * dpr);
                const displayHeight = Math.round(rect.height * dpr);

                if (this._canvas.width !== displayWidth || this._canvas.height !== displayHeight) {
                    this._canvas.width = displayWidth;
                    this._canvas.height = displayHeight;
                }

                this.render(this._ctx, this._canvas.width, this._canvas.height, this.theme);

                this._animationFrameId = requestAnimationFrame(loop);
            };

            this._animationFrameId = requestAnimationFrame(loop);
        }

        /**
         * Detaches from the active canvas element and stops the animation loop.
         */
        detachFromCanvas() {
            if (this._animationFrameId && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this._animationFrameId);
                this._animationFrameId = null;
            }

            if (this._canvas) {
                this._canvas.removeEventListener('pointermove', this._boundOnPointerMove);
                this._canvas.removeEventListener('pointerleave', this._boundOnPointerLeave);
                this._canvas = null;
                this._ctx = null;
            }
        }

        /**
         * Pointer move listener for smooth mouse look-at tracking.
         */
        _onPointerMove(e) {
            if (!this._canvas) return;
            const rect = this._canvas.getBoundingClientRect();
            const relX = (e.clientX - rect.left) - rect.width / 2;
            const relY = (e.clientY - rect.top) - rect.height / 2;

            // Map canvas pixel offset into eye offset range [-18, 18]
            const maxRange = Math.min(rect.width, rect.height) / 2;
            if (maxRange > 0) {
                this._mouseTarget.x = clampSafe((relX / maxRange) * 16, -18, 18, 0);
                this._mouseTarget.y = clampSafe((relY / maxRange) * 14, -14, 14, 0);
            }
        }

        /**
         * Pointer leave resets eye target gently to center.
         */
        _onPointerLeave() {
            this._mouseTarget.x = 0;
            this._mouseTarget.y = 0;
        }

        // =====================================================================
        // LIFECYCLE & CLEANUP
        // =====================================================================

        /**
         * Destroys this puppet instance and frees all resources.
         */
        destroy() {
            if (this._isDestroyed) return;
            this._isDestroyed = true;

            this.detachFromCanvas();
            this.disconnectStateController();

            this._matrixCurrent = [1, 0, 0, 1, 0, 0];
            this._matrixTarget = [1, 0, 0, 1, 0, 0];
        }
    }

    // Expose constants for external inspection & testing
    NoriMeshPuppet.BASE_BODY_VERTICES = BASE_BODY_VERTICES;
    NoriMeshPuppet.BASE_BELLY_VERTICES = BASE_BELLY_VERTICES;
    NoriMeshPuppet.BASE_EARS = BASE_EARS;
    NoriMeshPuppet.BASE_EYES = BASE_EYES;
    NoriMeshPuppet.PALETTES = PALETTES;

    return NoriMeshPuppet;
}));
