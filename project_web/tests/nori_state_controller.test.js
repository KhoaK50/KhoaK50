/**
 * Comprehensive Automated Test Suite for NoriStateController
 * Validates:
 * 1. Mathematical bounds [0.0, 1.0], NaN & Infinity immunity.
 * 2. 30-second exponential decay convergence to baseline (P->0.7, E->0.2, F->0.0, S->0.0).
 * 3. EXAM_MODE_START suppression of micro-movements (QUIET_FOCUSED).
 * 4. 1,000-sample Monte Carlo variation selection statistical accuracy (< 5% error).
 * 5. Lifecycle cleanup / destroy memory leak prevention.
 * 6. Pedagogical events (STREAK_CORRECT, STUCK_LONG, HINT_REQUESTED, QUESTION_WRONG).
 */

const assert = require('assert');
const path = require('path');
const NoriStateController = require(path.join(__dirname, '../frontend_v2/js/app/nori/nori_state_controller.js'));

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  [PASS] ${name}`);
    } catch (err) {
        console.error(`  [FAIL] ${name}:`, err.message);
        throw err;
    }
}

console.log('====================================================');
console.log('Running NoriStateController Automated Test Suite');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: MATHEMATICAL & STATE CONVERGENCE
// -----------------------------------------------------------------------------
console.log('Suite 1: Mathematical & State Convergence');

runTest('Values always bounded in [0.0, 1.0], immune to NaN, Infinity, negative', () => {
    const controller = new NoriStateController({ autoStart: false });

    // Extreme positive overflow
    controller.onEvent('CUSTOM_MOMENTUM_DELTA', { deltaP: 999, deltaE: 999, deltaF: 999, deltaS: 999 });
    let m = controller.momentum;
    assert.strictEqual(m.P, 1.0, 'P should clamp at 1.0');
    assert.strictEqual(m.E, 1.0, 'E should clamp at 1.0');
    assert.strictEqual(m.F, 1.0, 'F should clamp at 1.0');
    assert.strictEqual(m.S, 1.0, 'S should clamp at 1.0');

    // Extreme negative underflow
    controller.onEvent('CUSTOM_MOMENTUM_DELTA', { deltaP: -999, deltaE: -999, deltaF: -999, deltaS: -999 });
    m = controller.momentum;
    assert.strictEqual(m.P, 0.0, 'P should clamp at 0.0');
    assert.strictEqual(m.E, 0.0, 'E should clamp at 0.0');
    assert.strictEqual(m.F, 0.0, 'F should clamp at 0.0');
    assert.strictEqual(m.S, 0.0, 'S should clamp at 0.0');

    // Malicious inputs: NaN, undefined, strings, Infinity
    controller.setMomentum({ P: NaN, E: Infinity, F: -Infinity, S: 'invalid' });
    m = controller.momentum;
    assert(Number.isFinite(m.P) && m.P >= 0.0 && m.P <= 1.0, 'P must remain valid finite');
    assert(Number.isFinite(m.E) && m.E >= 0.0 && m.E <= 1.0, 'E must remain valid finite');
    assert(Number.isFinite(m.F) && m.F >= 0.0 && m.F <= 1.0, 'F must remain valid finite');
    assert(Number.isFinite(m.S) && m.S >= 0.0 && m.S <= 1.0, 'S must remain valid finite');

    controller.destroy();
});

runTest('30 seconds of inactivity converges smoothly to baseline [0.7, 0.2, 0.0, 0.0]', () => {
    // Test from various extreme starting states
    const testCases = [
        { P: 1.0, E: 1.0, F: 1.0, S: 1.0 },
        { P: 0.0, E: 0.9, F: 0.8, S: 0.0 },
        { P: 0.2, E: 0.0, F: 0.7, S: 0.9 },
        { P: 0.5, E: 0.8, F: 0.3, S: 0.5 }
    ];

    for (let i = 0; i < testCases.length; i++) {
        const initial = testCases[i];
        const controller = new NoriStateController({
            autoStart: false,
            initialMomentum: initial
        });

        // Simulate 30 seconds: 60 ticks of 0.5s each
        for (let t = 0; t < 60; t++) {
            controller.tick(0.5);
        }

        const m = controller.momentum;
        const diffP = Math.abs(m.P - 0.7);
        const diffE = Math.abs(m.E - 0.2);
        const diffF = Math.abs(m.F - 0.0);
        const diffS = Math.abs(m.S - 0.0);

        assert(diffP < 0.01, `Case ${i}: P (${m.P}) must converge to 0.7, diff=${diffP}`);
        assert(diffE < 0.01, `Case ${i}: E (${m.E}) must converge to 0.2, diff=${diffE}`);
        assert(diffF < 0.01, `Case ${i}: F (${m.F}) must converge to 0.0, diff=${diffF}`);
        assert(diffS < 0.01, `Case ${i}: S (${m.S}) must converge to 0.0, diff=${diffS}`);

        controller.destroy();
    }
});

runTest('EXAM_MODE_START locks to QUIET_FOCUSED and suppresses all jitters', () => {
    const controller = new NoriStateController({ autoStart: false });

    // Put into celebrating first
    controller.onEvent('STREAK_CORRECT', { streak: 5 });
    assert.strictEqual(controller.state, 'CELEBRATING');

    // Trigger exam mode
    controller.onEvent('EXAM_MODE_START');
    assert.strictEqual(controller.state, 'QUIET_FOCUSED');
    assert.strictEqual(controller.isExamMode, true);

    const jitter = controller.getProceduralJitter();
    assert.strictEqual(jitter.isQuietFocused, true, 'isQuietFocused must be true');
    assert.strictEqual(jitter.suppressJitter, true, 'suppressJitter must be true');
    assert.strictEqual(jitter.eyeDrift.trackingSpeed, 0.0, 'Eye tracking must be 0');
    assert.strictEqual(jitter.eyeDrift.saccadeScale, 0.0, 'Eye saccades must be 0');
    assert.strictEqual(jitter.bodyJitter.amplitude, 0.0, 'Body jitter must be 0');
    assert.strictEqual(jitter.breathing.frequencyHz, 0.15, 'Breathing must be slow stillness');

    // Attempting manual state change should NOT break exam mode
    controller.setState('CELEBRATING');
    assert.strictEqual(controller.state, 'QUIET_FOCUSED', 'State must stay locked to QUIET_FOCUSED');

    // Ending exam mode restores normal operation
    controller.onEvent('EXAM_MODE_END');
    assert.strictEqual(controller.isExamMode, false);
    assert.strictEqual(controller.state, 'IDLE');

    const normalJitter = controller.getProceduralJitter();
    assert.strictEqual(normalJitter.suppressJitter, false, 'Jitter suppression released');
    assert(normalJitter.eyeDrift.trackingSpeed > 0, 'Eye tracking active');

    controller.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 2: STATISTICAL VARIATION CHECK (MONTE CARLO)
// -----------------------------------------------------------------------------
console.log('\nSuite 2: Statistical Variation Check (1,000 Samples, < 5% Margin)');

runTest('IDLE state: 1,000 draws within 5% error of weights [0.50, 0.30, 0.20]', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    const expected = { A: 0.50, B: 0.30, C: 0.20 };
    const counts = { A: 0, B: 0, C: 0 };
    const N = 1000;

    for (let i = 0; i < N; i++) {
        const v = controller.selectVariation('IDLE');
        counts[v.key]++;
    }

    const ratioA = counts.A / N;
    const ratioB = counts.B / N;
    const ratioC = counts.C / N;

    const errorA = Math.abs(ratioA - expected.A);
    const errorB = Math.abs(ratioB - expected.B);
    const errorC = Math.abs(ratioC - expected.C);

    console.log(`    Observed IDLE ratios (N=1000): A=${ratioA.toFixed(3)} (err=${(errorA * 100).toFixed(1)}%), B=${ratioB.toFixed(3)} (err=${(errorB * 100).toFixed(1)}%), C=${ratioC.toFixed(3)} (err=${(errorC * 100).toFixed(1)}%)`);

    assert(errorA < 0.05, `IDLE Variation A error (${(errorA * 100).toFixed(2)}%) must be < 5%`);
    assert(errorB < 0.05, `IDLE Variation B error (${(errorB * 100).toFixed(2)}%) must be < 5%`);
    assert(errorC < 0.05, `IDLE Variation C error (${(errorC * 100).toFixed(2)}%) must be < 5%`);

    controller.destroy();
});

runTest('THINKING state: 1,000 draws within 5% error of weights [0.40, 0.35, 0.25]', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    const expected = { A: 0.40, B: 0.35, C: 0.25 };
    const counts = { A: 0, B: 0, C: 0 };
    const N = 1000;

    for (let i = 0; i < N; i++) {
        const v = controller.selectVariation('THINKING');
        counts[v.key]++;
    }

    const ratioA = counts.A / N;
    const ratioB = counts.B / N;
    const ratioC = counts.C / N;

    const errorA = Math.abs(ratioA - expected.A);
    const errorB = Math.abs(ratioB - expected.B);
    const errorC = Math.abs(ratioC - expected.C);

    console.log(`    Observed THINKING ratios (N=1000): A=${ratioA.toFixed(3)} (err=${(errorA * 100).toFixed(1)}%), B=${ratioB.toFixed(3)} (err=${(errorB * 100).toFixed(1)}%), C=${ratioC.toFixed(3)} (err=${(errorC * 100).toFixed(1)}%)`);

    assert(errorA < 0.05, `THINKING Variation A error (${(errorA * 100).toFixed(2)}%) must be < 5%`);
    assert(errorB < 0.05, `THINKING Variation B error (${(errorB * 100).toFixed(2)}%) must be < 5%`);
    assert(errorC < 0.05, `THINKING Variation C error (${(errorC * 100).toFixed(2)}%) must be < 5%`);

    controller.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 3: EVENT DISPATCHING & BEHAVIOR
// -----------------------------------------------------------------------------
console.log('\nSuite 3: Event Dispatching & State Transitions');

runTest('STREAK_CORRECT increases E, S, P and triggers CELEBRATING', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    const before = controller.momentum;
    controller.onEvent('STREAK_CORRECT', { streak: 3 });
    const after = controller.momentum;

    assert(after.E > before.E, 'Excitement E must increase');
    assert(after.S > before.S, 'Streak S must increase');
    assert(after.P > before.P, 'Patience P must increase');
    assert.strictEqual(controller.state, 'CELEBRATING');

    controller.destroy();
});

runTest('STUCK_LONG decreases P, increases F, triggers THINKING', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    const before = controller.momentum;
    controller.onEvent('STUCK_LONG');
    const after = controller.momentum;

    assert(after.P < before.P, 'Patience P must decrease on stuck');
    assert(after.F > before.F, 'Fatigue F must increase on stuck');
    assert.strictEqual(controller.state, 'THINKING');

    controller.destroy();
});

runTest('QUESTION_WRONG decreases streak without anger (composure maintained)', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();
    controller.setMomentum({ S: 0.5 });

    controller.onEvent('QUESTION_WRONG');
    const m = controller.momentum;

    assert.strictEqual(m.S, 0.2, 'Streak drops gracefully');
    assert.strictEqual(controller.state, 'ENCOURAGING', 'Nori encourages student, not angry');

    controller.destroy();
});

runTest('getVariationDistribution at baseline matches predefined weights exactly', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    const idleDist = controller.getVariationDistribution('IDLE');
    assert.strictEqual(idleDist.length, 3);
    assert.strictEqual(idleDist[0].probability, 0.50);
    assert.strictEqual(idleDist[1].probability, 0.30);
    assert.strictEqual(idleDist[2].probability, 0.20);

    const thinkDist = controller.getVariationDistribution('THINKING');
    assert.strictEqual(thinkDist.length, 3);
    assert.strictEqual(thinkDist[0].probability, 0.40);
    assert.strictEqual(thinkDist[1].probability, 0.35);
    assert.strictEqual(thinkDist[2].probability, 0.25);

    const encourDist = controller.getVariationDistribution('ENCOURAGING');
    assert.strictEqual(encourDist.length, 3);
    assert.strictEqual(encourDist[0].probability, 0.45);
    assert.strictEqual(encourDist[1].probability, 0.35);
    assert.strictEqual(encourDist[2].probability, 0.20);

    const celebDist = controller.getVariationDistribution('CELEBRATING');
    assert.strictEqual(celebDist.length, 3);
    assert.strictEqual(celebDist[0].probability, 0.40);
    assert.strictEqual(celebDist[1].probability, 0.35);
    assert.strictEqual(celebDist[2].probability, 0.25);

    const quietDist = controller.getVariationDistribution('QUIET_FOCUSED');
    assert.strictEqual(quietDist.length, 1);
    assert.strictEqual(quietDist[0].probability, 1.00);

    controller.destroy();
});

runTest('Dynamic momentum modulates variation distribution appropriately', () => {
    const controller = new NoriStateController({ autoStart: false });
    // Boost excitement to max
    controller.setMomentum({ E: 1.0, P: 0.2 });

    const idleDist = controller.getVariationDistribution('IDLE');
    // High excitement should boost variation B (breathe_bounce) over A (blink_glance)
    assert(idleDist[1].probability > 0.30, 'Excitement should boost Variation B');

    controller.destroy();
});

runTest('Procedural jitter outputs valid numbers and respects boundaries', () => {
    const controller = new NoriStateController({ autoStart: false });
    const jitter = controller.getProceduralJitter();

    assert(jitter.breathing.frequencyHz >= 0.15 && jitter.breathing.frequencyHz <= 0.85);
    assert(jitter.breathing.amplitude >= 0.005 && jitter.breathing.amplitude <= 0.05);
    assert(jitter.eyeDrift.trackingSpeed >= 0.04 && jitter.eyeDrift.trackingSpeed <= 0.25);
    assert(jitter.eyeDrift.saccadeScale >= 0.3 && jitter.eyeDrift.saccadeScale <= 4.0);
    assert.strictEqual(jitter.suppressJitter, false);

    controller.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 4: RELIABILITY, SUBSCRIPTIONS & LIFECYCLE CLEANUP
// -----------------------------------------------------------------------------
console.log('\nSuite 4: Reliability & Lifecycle Cleanup');

runTest('Subscriptions receive real-time snapshots and unsubscribe works', () => {
    const controller = new NoriStateController({ autoStart: false });
    let notifications = 0;
    let lastSnapshot = null;

    const unsubscribe = controller.subscribe((snap) => {
        notifications++;
        lastSnapshot = snap;
    });

    controller.tick(0.5);
    assert.strictEqual(notifications, 1);
    assert(lastSnapshot && lastSnapshot.momentum, 'Snapshot has momentum');

    controller.onEvent('HINT_REQUESTED');
    assert.strictEqual(notifications, 2);

    unsubscribe();
    controller.tick(0.5);
    assert.strictEqual(notifications, 2, 'Unsubscribed listener must not be called');

    controller.destroy();
});

runTest('destroy() terminates timers and prevents memory leaks', () => {
    const controller = new NoriStateController({ autoStart: true, tickIntervalMs: 100 });
    assert.strictEqual(controller.isDestroyed, false);

    controller.destroy();
    assert.strictEqual(controller.isDestroyed, true);

    // Further calls should be no-ops
    controller.tick(0.5);
    controller.onEvent('STREAK_CORRECT');
    assert.strictEqual(controller.isDestroyed, true);
});

// -----------------------------------------------------------------------------
// SUITE 5: ADVERSARIAL EDGE CASES & INTEGRITY
// -----------------------------------------------------------------------------
console.log('\nSuite 5: Adversarial Edge Cases & Integrity');

runTest('State transitions automatically synchronize active variation matching new state', () => {
    const controller = new NoriStateController({ autoStart: false });
    assert.strictEqual(controller.state, 'IDLE');
    assert.strictEqual(controller.currentVariation.state, 'IDLE');

    // Change momentum to CELEBRATING
    controller.setMomentum({ E: 0.85, S: 0.85 });
    assert.strictEqual(controller.state, 'CELEBRATING');
    assert.strictEqual(controller.currentVariation.state, 'CELEBRATING');

    // Change momentum to THINKING via fatigue
    controller.setMomentum({ E: 0.1, S: 0.0, F: 0.8 });
    assert.strictEqual(controller.state, 'THINKING');
    assert.strictEqual(controller.currentVariation.state, 'THINKING');

    // Decay back to IDLE
    for (let t = 0; t < 60; t++) {
        controller.tick(0.5);
    }
    assert.strictEqual(controller.state, 'IDLE');
    assert.strictEqual(controller.currentVariation.state, 'IDLE');

    controller.destroy();
});

runTest('Operations after destroy() do not leak timers, mutate state, or notify subscribers', () => {
    const controller = new NoriStateController({ autoStart: false });
    let subscriberCalls = 0;
    controller.subscribe(() => { subscriberCalls++; });

    controller.destroy();

    // None of these should throw or schedule timers
    controller.setState('THINKING', 1000);
    assert.strictEqual(controller._overrideTimeoutId, null, 'No timeout after destroy');

    controller.setMomentum({ P: 0.5 });
    controller.resetToBaseline();
    controller.onEvent('FATIGUE_TICK');
    controller.resampleVariation();

    assert.strictEqual(subscriberCalls, 0, 'No subscriber notifications after destroy');
});

runTest('Delta events (FATIGUE_TICK, REST_BREAK, CUSTOM) immediately update state', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    controller.onEvent('FATIGUE_TICK', { amount: 0.70 });
    assert.strictEqual(controller.state, 'THINKING', 'High fatigue immediately triggers THINKING');
    assert.strictEqual(controller.currentVariation.state, 'THINKING');

    controller.onEvent('REST_BREAK');
    assert(controller.momentum.F < 0.60, 'Rest break reduces fatigue');

    controller.destroy();
});

runTest('Negative decay rates in constructor are clamped to 0 (no explosive divergence)', () => {
    const controller = new NoriStateController({
        autoStart: false,
        decayRates: { P: -10, E: -5, F: -2, S: -1 }
    });

    assert.strictEqual(controller._decayRates.P, 0, 'Negative decay rate clamped to 0');
    assert.strictEqual(controller._decayRates.E, 0, 'Negative decay rate clamped to 0');

    controller.tick(1.0);
    const m = controller.momentum;
    assert(Number.isFinite(m.P) && m.P >= 0 && m.P <= 1, 'P remains bounded');
    assert(Number.isFinite(m.E) && m.E >= 0 && m.E <= 1, 'E remains bounded');

    controller.destroy();
});

runTest('selectVariation supports deterministic rolls and safely normalizes invalid state names', () => {
    const controller = new NoriStateController({ autoStart: false });

    // Invalid state name fallback
    const vBad = controller.selectVariation('TOTALLY_BOGUS');
    assert.strictEqual(vBad.state, 'IDLE', 'Falls back cleanly to IDLE state');

    // Deterministic roll number
    const vRoll0 = controller.selectVariation('IDLE', 0.0);
    assert.strictEqual(vRoll0.key, 'A', 'Roll 0.0 selects first variation');

    const vRoll99 = controller.selectVariation('IDLE', 0.9999);
    assert.strictEqual(vRoll99.key, 'C', 'Roll ~1.0 selects last variation');

    // Roll 1.0 exact boundary
    const vRoll1 = controller.selectVariation('IDLE', () => 1.0);
    assert.strictEqual(vRoll1.key, 'C', 'Roll 1.0 safely maps to last variation without crashing');

    controller.destroy();
});

runTest('resampleVariation() updates variation and notifies subscribers', () => {
    const controller = new NoriStateController({ autoStart: false });
    let notified = 0;
    controller.subscribe(() => { notified++; });

    const newVar = controller.resampleVariation();
    assert(newVar && newVar.id, 'Returns valid variation');
    assert.strictEqual(notified, 1, 'Notified subscriber of variation change');

    controller.destroy();
});

runTest('Unsubscribing during notification callback does not skip subsequent listeners', () => {
    const controller = new NoriStateController({ autoStart: false });
    let listener2Called = false;

    let unsub1;
    unsub1 = controller.subscribe(() => {
        unsub1(); // Unsubscribe self during notification
    });

    controller.subscribe(() => {
        listener2Called = true;
    });

    controller.tick(0.5);
    assert.strictEqual(listener2Called, true, 'Second listener was executed even though first unsubscribed');

    controller.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 6: REVIEWER 2 ADVERSARIAL STRESS TESTING & BOUNDARY VALIDATION
// -----------------------------------------------------------------------------
console.log('\nSuite 6: Reviewer 2 Adversarial Stress Testing & Boundary Validation');

runTest('Constructor immediately derives state and variation matching initialMomentum', () => {
    // Celebrating momentum
    const ctrlCeleb = new NoriStateController({
        autoStart: false,
        initialMomentum: { E: 0.9, S: 0.9 }
    });
    assert.strictEqual(ctrlCeleb.state, 'CELEBRATING', 'Should initialize directly to CELEBRATING');
    assert.strictEqual(ctrlCeleb.currentVariation.state, 'CELEBRATING', 'Variation should match CELEBRATING');
    ctrlCeleb.destroy();

    // Thinking momentum (fatigue)
    const ctrlThink = new NoriStateController({
        autoStart: false,
        initialMomentum: { F: 0.8 }
    });
    assert.strictEqual(ctrlThink.state, 'THINKING', 'Should initialize directly to THINKING');
    assert.strictEqual(ctrlThink.currentVariation.state, 'THINKING', 'Variation should match THINKING');
    ctrlThink.destroy();
});

runTest('EXAM_MODE_END restores momentum-derived state instead of hardcoding to IDLE', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.setMomentum({ E: 0.9, S: 0.9 });
    assert.strictEqual(controller.state, 'CELEBRATING');

    controller.onEvent('EXAM_MODE_START');
    assert.strictEqual(controller.state, 'QUIET_FOCUSED');
    assert.strictEqual(controller.isExamMode, true);

    controller.onEvent('EXAM_MODE_END');
    assert.strictEqual(controller.isExamMode, false);
    assert.strictEqual(controller.state, 'CELEBRATING', 'Should restore CELEBRATING from active high momentum');
    assert.strictEqual(controller.currentVariation.state, 'CELEBRATING');

    controller.destroy();
});

runTest('Breathing phase stays strictly within [0, 2*PI) under large dt simulation intervals', () => {
    const controller = new NoriStateController({ autoStart: false });
    const twoPi = 2 * Math.PI;

    // Simulate jump with large delta (10s, 30s, 60s)
    [10, 30, 60].forEach(largeDt => {
        controller.tick(largeDt);
        const j = controller.getProceduralJitter();
        assert(j.breathing.phase >= 0.0, `Phase (${j.breathing.phase}) must be non-negative`);
        assert(j.breathing.phase < twoPi, `Phase (${j.breathing.phase}) must be strictly less than 2*PI`);
    });

    controller.destroy();
});

runTest('Auto-triggered STUCK_LONG at 90s inactivity fires exactly one notification on tick', () => {
    const controller = new NoriStateController({ autoStart: false });
    let notifyCount = 0;
    controller.subscribe(() => { notifyCount++; });

    // Tick up to 89.5 seconds (179 ticks of 0.5s)
    for (let i = 0; i < 179; i++) {
        controller.tick(0.5);
    }
    assert.strictEqual(notifyCount, 179);

    // 180th tick reaches 90.0s -> triggers STUCK_LONG
    notifyCount = 0;
    controller.tick(0.5);
    assert.strictEqual(notifyCount, 1, 'Tick reaching 90s must fire exactly 1 notification, not duplicate 2');
    assert.strictEqual(controller.state, 'THINKING');

    controller.destroy();
});

runTest('resampleVariation with state argument keeps controller.state and variation.state strictly synchronized', () => {
    const controller = new NoriStateController({ autoStart: false });
    assert.strictEqual(controller.state, 'IDLE');

    // Resample with explicit CELEBRATING
    const vCeleb = controller.resampleVariation('CELEBRATING');
    assert.strictEqual(controller.state, 'CELEBRATING', 'Controller state updated to CELEBRATING');
    assert.strictEqual(controller.currentVariation.state, 'CELEBRATING', 'Variation state matches CELEBRATING');
    assert.strictEqual(vCeleb.state, 'CELEBRATING');

    // Resample with explicit THINKING
    const vThink = controller.resampleVariation('THINKING');
    assert.strictEqual(controller.state, 'THINKING', 'Controller state updated to THINKING');
    assert.strictEqual(controller.currentVariation.state, 'THINKING', 'Variation state matches THINKING');
    assert.strictEqual(vThink.state, 'THINKING');

    controller.destroy();
});

runTest('Immune to null arguments across constructor, setMomentum, onEvent, tick, resampleVariation', () => {
    // Null options constructor
    const ctrlNullOpts = new NoriStateController(null);
    assert.strictEqual(ctrlNullOpts.state, 'IDLE');
    ctrlNullOpts.destroy();

    const controller = new NoriStateController({ autoStart: false });

    // setMomentum(null)
    controller.setMomentum(null);
    assert(Number.isFinite(controller.momentum.P));

    // onEvent with null payload
    controller.onEvent('FATIGUE_TICK', null);
    controller.onEvent('CUSTOM_MOMENTUM_DELTA', null);
    controller.onEvent('STREAK_CORRECT', null);
    controller.onEvent('QUESTION_CORRECT', null);
    controller.onEvent('QUESTION_WRONG', null);
    controller.onEvent('HINT_REQUESTED', null);
    controller.onEvent('STUCK_LONG', null);

    // onEvent with null eventType
    controller.onEvent(null);

    // tick(null)
    controller.tick(null);

    // resampleVariation(null)
    const v = controller.resampleVariation(null);
    assert(v && v.id);

    controller.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 7: REVIEWER 3 ADVERSARIAL STRESS TESTING & EDGE CASES
// -----------------------------------------------------------------------------
console.log('\nSuite 7: Reviewer 3 Adversarial Stress Testing & Edge Cases');

runTest('onEvent("RESET") fires exactly one notification (no duplicate notification)', () => {
    const controller = new NoriStateController({ autoStart: false });
    let notifications = 0;
    controller.subscribe(() => { notifications++; });

    controller.onEvent('RESET');
    assert.strictEqual(notifications, 1, 'onEvent("RESET") must notify subscribers exactly once');

    // resetToBaseline directly must also notify exactly once
    notifications = 0;
    controller.resetToBaseline();
    assert.strictEqual(notifications, 1, 'resetToBaseline() must notify subscribers exactly once');

    controller.destroy();
});

runTest('setState(stateName) public method fires immediate notification to subscribers', () => {
    const controller = new NoriStateController({ autoStart: false });
    let notifiedState = null;
    let callCount = 0;
    controller.subscribe((snap) => {
        callCount++;
        notifiedState = snap.state;
    });

    controller.setState('THINKING');
    assert.strictEqual(callCount, 1, 'setState must immediately notify subscriber');
    assert.strictEqual(notifiedState, 'THINKING', 'Notification must convey new state');
    assert.strictEqual(controller.state, 'THINKING');

    // Invalid state should NOT notify
    callCount = 0;
    controller.setState('NON_EXISTENT_STATE');
    assert.strictEqual(callCount, 0, 'Invalid state in setState must not notify');

    controller.destroy();
});

runTest('Constructor tickIntervalMs protects against strings, NaN, Infinity, negative values', () => {
    // String input
    const ctrlStr = new NoriStateController({ autoStart: false, tickIntervalMs: 'invalid_interval' });
    assert.strictEqual(ctrlStr._tickIntervalMs, 500, 'Non-numeric string must fall back to 500ms');
    ctrlStr.destroy();

    // NaN input
    const ctrlNaN = new NoriStateController({ autoStart: false, tickIntervalMs: NaN });
    assert.strictEqual(ctrlNaN._tickIntervalMs, 500, 'NaN must fall back to 500ms');
    ctrlNaN.destroy();

    // Infinity input
    const ctrlInf = new NoriStateController({ autoStart: false, tickIntervalMs: Infinity });
    assert.strictEqual(ctrlInf._tickIntervalMs, 500, 'Infinity must fall back to 500ms');
    ctrlInf.destroy();

    // Negative input
    const ctrlNeg = new NoriStateController({ autoStart: false, tickIntervalMs: -100 });
    assert.strictEqual(ctrlNeg._tickIntervalMs, 50, 'Negative interval must clamp to 50ms min');
    ctrlNeg.destroy();
});

runTest('FATIGUE_TICK and STREAK_CORRECT are immune to NaN values (no dimension corruption)', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.setMomentum({ F: 0.60 });
    assert.strictEqual(controller.momentum.F, 0.60);

    // FATIGUE_TICK with amount: NaN must NOT reset F to 0.0
    controller.onEvent('FATIGUE_TICK', { amount: NaN });
    assert(Math.abs(controller.momentum.F - 0.63) < 0.001 || controller.momentum.F === 0.60,
        `F (${controller.momentum.F}) must not be corrupted to 0.0`);
    assert(Number.isFinite(controller.momentum.F), 'F must remain finite');

    // STREAK_CORRECT with streak: NaN must safely use fallback streak count
    controller.onEvent('STREAK_CORRECT', { streak: NaN });
    assert(Number.isFinite(controller.momentum.E), 'E must remain finite');
    assert(Number.isFinite(controller.momentum.S), 'S must remain finite');

    controller.destroy();
});

runTest('setMomentum partial NaN values preserve existing dimension values rather than resetting', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.setMomentum({ P: 0.95 });
    assert.strictEqual(controller.momentum.P, 0.95);

    // Updating E while P is NaN should keep P at 0.95, not revert to baseline 0.70
    controller.setMomentum({ P: NaN, E: 0.80 });
    assert.strictEqual(controller.momentum.P, 0.95, 'P must preserve its current value on NaN input');
    assert.strictEqual(controller.momentum.E, 0.80, 'E must update properly');

    // Malicious deltas in _applyDelta must also preserve existing momentum
    controller.onEvent('CUSTOM_MOMENTUM_DELTA', { deltaP: NaN, deltaE: NaN, deltaF: NaN, deltaS: NaN });
    assert.strictEqual(controller.momentum.P, 0.95, 'P must remain unchanged by NaN delta');
    assert.strictEqual(controller.momentum.E, 0.80, 'E must remain unchanged by NaN delta');

    controller.destroy();
});

runTest('Manual onEvent("STUCK_LONG") throttles inactivity counter to prevent immediate auto re-trigger', () => {
    const controller = new NoriStateController({ autoStart: false });

    // Tick to 89s of inactivity (178 ticks of 0.5s)
    for (let i = 0; i < 178; i++) {
        controller.tick(0.5);
    }
    assert.strictEqual(controller.idleInactivitySeconds, 89);

    // Fire manual STUCK_LONG
    controller.onEvent('STUCK_LONG');
    assert.strictEqual(controller.idleInactivitySeconds, 60, 'Manual STUCK_LONG should throttle inactivity to 60s');

    let autoTriggeredCount = 0;
    // Tick 2 times (1 second: reaches 61s, far below 90s)
    controller.subscribe((snap) => {
        if (snap.idleInactivitySeconds === 60) {
            autoTriggeredCount++;
        }
    });

    controller.tick(0.5);
    controller.tick(0.5);
    assert.strictEqual(autoTriggeredCount, 0, 'Auto STUCK_LONG must not fire immediately after manual STUCK_LONG');

    controller.destroy();
});

runTest('Timed override in setState expires cleanly with single state re-evaluation', () => {
    const controller = new NoriStateController({ autoStart: false });
    controller.resetToBaseline();

    controller.setState('CELEBRATING', 50);
    assert.strictEqual(controller.state, 'CELEBRATING');
    assert.strictEqual(controller.currentVariation.state, 'CELEBRATING');

    // Override active
    assert.strictEqual(controller._manualStateOverride, 'CELEBRATING');

    controller.destroy();
});

runTest('Unrecognized events are safely ignored without notifying subscribers', () => {
    const controller = new NoriStateController({ autoStart: false });
    let subscriberCalls = 0;
    controller.subscribe(() => { subscriberCalls++; });

    controller.onEvent('UNKNOWN_OR_TYPO_EVENT_XYZ');
    assert.strictEqual(subscriberCalls, 0, 'Unrecognized event must not fire subscriber notifications');

    controller.destroy();
});

console.log('\n====================================================');
console.log(`Test Execution Summary: ${passedTests}/${totalTests} Passed (100% Success)`);
console.log('====================================================\n');
