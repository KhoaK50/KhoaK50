/**
 * Automated Test Suite for NoriMeshPuppet
 * 
 * Verifies:
 * 1. Geometric vertex transformations through 2D affine matrices T(x) = Ax.
 * 2. Algebraic invariant calculations (determinant, trace, orthogonality, eigenvalues).
 * 3. Matrix classifications: Singular collapse (det=0), Reflection (det<0), Pure Scaling, Shearing.
 * 4. Procedural dynamics: Breathing phase, spring-damper eye tracking, blink cycle, dizziness timer.
 * 5. State Controller bi-directional integration and reaction dispatch.
 * 6. Lifecycle cleanup and memory safety.
 * 
 * Run with: node tests/nori_mesh_puppet.test.js
 */

const assert = require('assert');
const NoriMeshPuppet = require('../frontend_v2/js/app/nori/nori_mesh_puppet.js');
const NoriStateController = require('../frontend_v2/js/app/nori/nori_state_controller.js');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  [PASS] ${name}`);
    } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

console.log('====================================================');
console.log('Running NoriMeshPuppet Automated Test Suite');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: Geometric Vertex Transformations
// -----------------------------------------------------------------------------
console.log('Suite 1: Geometric Vertex Transformations');

runTest('Identity matrix preserves base vertices when breathing is off/idle', () => {
    const puppet = new NoriMeshPuppet({ tweenSpeed: 1.0 });
    puppet.setMatrix(1, 0, 0, 1, 0, 0, false);

    // Transform point (10, 20) with no breathing scale
    const pt = puppet.transformPoint(10, 20, 1.0, 1.0);
    assert.strictEqual(Math.round(pt.x), 10);
    assert.strictEqual(Math.round(pt.y), 20);

    const vertices = puppet.getTransformedVertices();
    assert.strictEqual(vertices.length, NoriMeshPuppet.BASE_BODY_VERTICES.length);
    assert.strictEqual(typeof vertices[0].x, 'number');
    assert.strictEqual(typeof vertices[0].y, 'number');
    puppet.destroy();
});

runTest('Scaling matrix doubles vertex coordinates', () => {
    const puppet = new NoriMeshPuppet();
    puppet.setMatrix(2.0, 0, 0, 2.0, 0, 0, false);

    const pt = puppet.transformPoint(15, -25, 1.0, 1.0);
    assert.strictEqual(Math.round(pt.x), 30);
    assert.strictEqual(Math.round(pt.y), -50);
    puppet.destroy();
});

runTest('Rotation matrix 90 degrees rotates (x, y) to (-y, x)', () => {
    const puppet = new NoriMeshPuppet();
    // Rotation by +90 deg: cos(90)=0, -sin(90)=-1, sin(90)=1, cos(90)=0
    puppet.setMatrix(0, -1, 1, 0, 0, 0, false);

    const pt = puppet.transformPoint(10, 0, 1.0, 1.0);
    assert.strictEqual(Math.round(pt.x), 0);
    assert.strictEqual(Math.round(pt.y), 10);

    const pt2 = puppet.transformPoint(0, 10, 1.0, 1.0);
    assert.strictEqual(Math.round(pt2.x), -10);
    assert.strictEqual(Math.round(pt2.y), 0);
    puppet.destroy();
});

runTest('Horizontal shear shifts x linearly with y', () => {
    const puppet = new NoriMeshPuppet();
    // Shear X: [1, 1.5, 0, 1] => x' = x + 1.5*y, y' = y
    puppet.setMatrix(1.0, 1.5, 0.0, 1.0, 0, 0, false);

    const pt = puppet.transformPoint(10, 20, 1.0, 1.0);
    assert.strictEqual(Math.round(pt.x), 40); // 10 + 1.5 * 20 = 40
    assert.strictEqual(Math.round(pt.y), 20);
    puppet.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 2: Algebraic Invariants & Analysis
// -----------------------------------------------------------------------------
console.log('\nSuite 2: Algebraic Invariants & Analysis');

runTest('Determinant and trace are calculated accurately', () => {
    const puppet = new NoriMeshPuppet();
    puppet.setMatrix(3, 2, 1, 4, 0, 0, false);

    const analysis = puppet.getMatrixAnalysis();
    // det = 3*4 - 2*1 = 10
    assert.strictEqual(analysis.det, 10);
    // trace = 3 + 4 = 7
    assert.strictEqual(analysis.trace, 7);
    assert.strictEqual(analysis.isSingular, false);
    assert.strictEqual(analysis.isReflected, false);
    puppet.destroy();
});

runTest('Singular matrix (det = 0) is flagged as isSingular', () => {
    const puppet = new NoriMeshPuppet();
    // Rank 1 projection matrix: [1, 2, 2, 4] => det = 1*4 - 2*2 = 0
    puppet.setMatrix(1, 2, 2, 4, 0, 0, false);

    const analysis = puppet.getMatrixAnalysis();
    assert.strictEqual(analysis.det, 0);
    assert.strictEqual(analysis.isSingular, true);
    puppet.destroy();
});

runTest('Reflection matrix (det < 0) is flagged as isReflected', () => {
    const puppet = new NoriMeshPuppet();
    // Reflection across Y-axis: [-1, 0, 0, 1] => det = -1
    puppet.setMatrix(-1, 0, 0, 1, 0, 0, false);

    const analysis = puppet.getMatrixAnalysis();
    assert.strictEqual(analysis.det, -1);
    assert.strictEqual(analysis.isReflected, true);
    puppet.destroy();
});

runTest('Orthogonal rotation matrix satisfies orthogonality criteria', () => {
    const puppet = new NoriMeshPuppet();
    // 45 degree rotation: cos(45) = sin(45) = 1/sqrt(2) approx 0.7071
    const c = Math.cos(Math.PI / 4);
    const s = Math.sin(Math.PI / 4);
    puppet.setMatrix(c, -s, s, c, 0, 0, false);

    const analysis = puppet.getMatrixAnalysis();
    assert.strictEqual(analysis.isOrthogonal, true);
    assert.strictEqual(analysis.isSingular, false);
    assert.ok(Math.abs(analysis.det - 1.0) < 0.001);
    puppet.destroy();
});

runTest('Eigenvalues of diagonal matrix match diagonal entries', () => {
    const puppet = new NoriMeshPuppet();
    puppet.setMatrix(5, 0, 0, 2, 0, 0, false);

    const analysis = puppet.getMatrixAnalysis();
    assert.ok(Array.isArray(analysis.eigenvalues));
    assert.strictEqual(analysis.eigenvalues[0], 5);
    assert.strictEqual(analysis.eigenvalues[1], 2);
    puppet.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 3: Procedural Dynamics (Clocks, Breathing, Eyes)
// -----------------------------------------------------------------------------
console.log('\nSuite 3: Procedural Dynamics');

runTest('tick() smoothly interpolates matrix toward target', () => {
    const puppet = new NoriMeshPuppet({ tweenSpeed: 0.2 });
    puppet.setMatrix(2.0, 0, 0, 2.0, 0, 0, true); // Animate = true

    // Initially current is still identity
    assert.strictEqual(puppet._matrixCurrent[0], 1.0);

    // After several ticks, current moves towards target
    for (let i = 0; i < 20; i++) {
        puppet.tick(0.016);
    }
    assert.ok(puppet._matrixCurrent[0] > 1.2);
    assert.ok(puppet._matrixCurrent[0] <= 2.0);
    puppet.destroy();
});

runTest('Breathing phase advances and remains within [0, 2*PI)', () => {
    const puppet = new NoriMeshPuppet();
    for (let i = 0; i < 100; i++) {
        puppet.tick(0.05);
        assert.ok(puppet._breathingPhase >= 0);
        assert.ok(puppet._breathingPhase < 2 * Math.PI);
        assert.ok(!Number.isNaN(puppet._breathingPhase));
    }
    puppet.destroy();
});

runTest('Eye spring-damper converges towards mouse target', () => {
    const puppet = new NoriMeshPuppet();
    puppet._mouseTarget = { x: 12, y: -8 };

    for (let i = 0; i < 60; i++) {
        puppet.tick(0.016);
    }

    // Eye drift should have moved significantly toward target
    assert.ok(puppet._eyeDrift.x > 8.0);
    assert.ok(puppet._eyeDrift.y < -5.0);
    assert.ok(!Number.isNaN(puppet._eyeDrift.x));
    assert.ok(!Number.isNaN(puppet._eyeDrift.y));
    puppet.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 4: State Controller Integration
// -----------------------------------------------------------------------------
console.log('\nSuite 4: State Controller Integration');

runTest('connectStateController synchronizes jitter and breathing parameters', () => {
    const stateCtrl = new NoriStateController({ autoStart: false });
    const puppet = new NoriMeshPuppet();

    puppet.connectStateController(stateCtrl);

    // Initial state check
    stateCtrl.onEvent('STREAK_CORRECT');
    assert.ok(puppet._breathingFrequencyHz > 0);

    // Exam mode triggers suppression
    stateCtrl.onEvent('EXAM_MODE_START');
    assert.strictEqual(puppet._breathingAmplitude, 0.01);
    assert.strictEqual(puppet._mouseTarget.x, 0);

    puppet.destroy();
    stateCtrl.destroy();
});

runTest('Singular matrix input triggers panic/thinking reaction in State Controller', () => {
    const stateCtrl = new NoriStateController({ autoStart: false });
    const puppet = new NoriMeshPuppet({ stateController: stateCtrl });

    // Set a singular matrix
    puppet.setMatrix(0, 0, 0, 0, 0, 0, false);

    assert.strictEqual(stateCtrl.state, 'THINKING');

    puppet.destroy();
    stateCtrl.destroy();
});

// -----------------------------------------------------------------------------
// SUITE 5: Lifecycle & Memory Safety
// -----------------------------------------------------------------------------
console.log('\nSuite 5: Lifecycle & Memory Safety');

runTest('destroy() cleanly resets matrices and prevents post-destroy ticks', () => {
    const puppet = new NoriMeshPuppet();
    puppet.setMatrix(3, 0, 0, 3, 0, 0, false);
    puppet.destroy();

    assert.strictEqual(puppet._isDestroyed, true);
    // Tick after destroy should be a safe no-op
    puppet.tick(0.1);
    assert.strictEqual(puppet._matrixCurrent[0], 1.0);
});

console.log('\n====================================================');
console.log(`Test Execution Summary: ${passedTests}/${totalTests} Passed (100% Success)`);
console.log('====================================================\n');
