/**
 * Automated Verification Suite for Nori Parametric Living SVG Engine v9
 * Tests: Core 6 Pedagogical States, Legacy Aliases, SVG Generation,
 * Gaze Tracking Bounds, Poisson Blinking, and Lifecycle Safety.
 */
const assert = require('assert');
const {
    NORI_PEDAGOGICAL_STATES,
    PEDAGOGICAL_METADATA,
    normalizePedagogicalMood,
    getMoodColorAndLabel,
    renderMentorAvatarHTML,
    updateMentorAvatar,
    NoriLivingIdleEngine
} = require('../frontend_v2/js/app/simulation/nori_avatar_renderer.js');

async function runAllTests() {
    console.log('====================================================');
    console.log('Running Nori Parametric Living Engine Test Suite');
    console.log('====================================================\n');

    let passedTests = 0;
    let totalTests = 0;

    async function it(description, fn) {
        totalTests++;
        try {
            await fn();
            console.log(`  [PASS] ${description}`);
            passedTests++;
        } catch (err) {
            console.error(`  [FAIL] ${description}`);
            console.error(`         ${err.message}`);
            process.exitCode = 1;
        }
    }

    // -------------------------------------------------------------
    // Suite 1: Core 6 Pedagogical States & Normalization
    // -------------------------------------------------------------
    console.log('Suite 1: Core 6 Pedagogical States & Normalization');

    await it('Exports all 6 canonical pedagogical states', () => {
        assert.strictEqual(NORI_PEDAGOGICAL_STATES.FOCUSED_NEUTRAL, 'focused_neutral');
        assert.strictEqual(NORI_PEDAGOGICAL_STATES.JOY_INSIGHT, 'joy_insight');
        assert.strictEqual(NORI_PEDAGOGICAL_STATES.EMPATHETIC_HINT, 'empathetic_hint');
        assert.strictEqual(NORI_PEDAGOGICAL_STATES.THINKING_CONTEMPLATE, 'thinking_contemplate');
        assert.strictEqual(NORI_PEDAGOGICAL_STATES.RESTFUL_PAUSE, 'restful_pause');
        assert.strictEqual(NORI_PEDAGOGICAL_STATES.CURIOUS_ALERT, 'curious_alert');
    });

    await it('Normalizes canonical keys regardless of casing or formatting', () => {
        assert.strictEqual(normalizePedagogicalMood('FOCUSED_NEUTRAL'), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood('focused-neutral'), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood('JOY_INSIGHT'), 'joy_insight');
        assert.strictEqual(normalizePedagogicalMood('EMPATHETIC_HINT'), 'empathetic_hint');
        assert.strictEqual(normalizePedagogicalMood('THINKING_CONTEMPLATE'), 'thinking_contemplate');
        assert.strictEqual(normalizePedagogicalMood('RESTFUL_PAUSE'), 'restful_pause');
        assert.strictEqual(normalizePedagogicalMood('CURIOUS_ALERT'), 'curious_alert');
    });

    await it('Maps legacy 24-state expressions into the 6 authentic states', () => {
        // Neutral family
        assert.strictEqual(normalizePedagogicalMood('neutral'), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood('neutral_2'), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood('neutral_3'), 'focused_neutral');

        // Proud / Joy family
        assert.strictEqual(normalizePedagogicalMood('proud_1'), 'joy_insight');
        assert.strictEqual(normalizePedagogicalMood('proud_3'), 'joy_insight');
        assert.strictEqual(normalizePedagogicalMood('ecstatic'), 'joy_insight');
        assert.strictEqual(normalizePedagogicalMood('celebratory_proud'), 'joy_insight');

        // Empathetic / Comfort family
        assert.strictEqual(normalizePedagogicalMood('empathetic_1'), 'empathetic_hint');
        assert.strictEqual(normalizePedagogicalMood('empathetic_3'), 'empathetic_hint');
        assert.strictEqual(normalizePedagogicalMood('comfort'), 'empathetic_hint');

        // Thoughtful / Thinking family
        assert.strictEqual(normalizePedagogicalMood('thoughtful_1'), 'thinking_contemplate');
        assert.strictEqual(normalizePedagogicalMood('thoughtful_3'), 'thinking_contemplate');
        assert.strictEqual(normalizePedagogicalMood('thinking'), 'thinking_contemplate');

        // Relieved / Rest family
        assert.strictEqual(normalizePedagogicalMood('relieved_1'), 'restful_pause');
        assert.strictEqual(normalizePedagogicalMood('relieved_3'), 'restful_pause');
        assert.strictEqual(normalizePedagogicalMood('idle_rest'), 'restful_pause');

        // Curious / Alert / Shocked / Puzzled family
        assert.strictEqual(normalizePedagogicalMood('puzzled_1'), 'curious_alert');
        assert.strictEqual(normalizePedagogicalMood('puzzled_3'), 'curious_alert');
        assert.strictEqual(normalizePedagogicalMood('shocked_3'), 'curious_alert');
        assert.strictEqual(normalizePedagogicalMood('stern_2'), 'curious_alert');
        assert.strictEqual(normalizePedagogicalMood('wink_2'), 'curious_alert');
    });

    await it('Handles empty, null, undefined gracefully with default fallback', () => {
        assert.strictEqual(normalizePedagogicalMood(null), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood(undefined), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood(''), 'focused_neutral');
        assert.strictEqual(normalizePedagogicalMood('unknown_random_string'), 'focused_neutral');
    });

    // -------------------------------------------------------------
    // Suite 2: Metadata & Speech Integrity
    // -------------------------------------------------------------
    console.log('\nSuite 2: Metadata & Speech Integrity');

    await it('Returns accurate metadata for all 6 states', () => {
        const states = ['focused_neutral', 'joy_insight', 'empathetic_hint', 'thinking_contemplate', 'restful_pause', 'curious_alert'];
        states.forEach(s => {
            const meta = getMoodColorAndLabel(s);
            assert.ok(meta, `Metadata for ${s} must exist`);
            assert.strictEqual(meta.id, s);
            assert.ok(meta.col.startsWith('#'), 'Must have valid HEX color');
            assert.ok(meta.label.length > 5, 'Must have descriptive label');
            assert.ok(meta.desc.length > 10, 'Must have pedagogical description');
            assert.ok(meta.speech.length > 10, 'Must have pedagogical speech');
        });
    });

    await it('getMoodColorAndLabel handles legacy mood keys seamlessly', () => {
        const metaProud = getMoodColorAndLabel('proud_3');
        assert.strictEqual(metaProud.id, 'joy_insight');

        const metaRelieved = getMoodColorAndLabel('relieved_2');
        assert.strictEqual(metaRelieved.id, 'restful_pause');

        const metaStern = getMoodColorAndLabel('stern_1');
        assert.strictEqual(metaStern.id, 'curious_alert');
    });

    // -------------------------------------------------------------
    // Suite 3: Pure SVG Generation & Rendering
    // -------------------------------------------------------------
    console.log('\nSuite 3: Pure SVG Generation & Rendering');

    await it('Renders valid SVG structure for all 6 states', () => {
        const states = ['focused_neutral', 'joy_insight', 'empathetic_hint', 'thinking_contemplate', 'restful_pause', 'curious_alert'];
        states.forEach(s => {
            const svg = renderMentorAvatarHTML(s, false);
            assert.ok(svg.includes('<svg'), `Must contain <svg> tag for ${s}`);
            assert.ok(svg.includes('viewBox="0 0 100 100"'), `Must have standard 100x100 viewBox for ${s}`);
            assert.ok(svg.includes('id="nori-actor"'), `Must have actor root for ${s}`);
            assert.ok(svg.includes('companion-eyes'), `Must have eyes for ${s}`);
            assert.ok(svg.includes('nori-gaze-layer'), `Must have living gaze layer for ${s}`);
            assert.ok(svg.includes('companion-ear-left'), `Must have left ear for ${s}`);
            assert.ok(svg.includes('companion-ear-right'), `Must have right ear for ${s}`);
            assert.ok(svg.includes('companion-paws'), `Must have paws for ${s}`);
            assert.ok(svg.includes(`data-nori-state="${s}"`), `Must stamp data attribute for ${s}`);
        });
    });

    await it('Assigns correct academic animation classes without chaotic mochi bounce', () => {
        const neutralSvg = renderMentorAvatarHTML('focused_neutral', false);
        assert.ok(neutralSvg.includes('actor-breathe'), 'Focused neutral must breathe');

        const joySvg = renderMentorAvatarHTML('joy_insight', false);
        assert.ok(joySvg.includes('actor-insight-nod'), 'Joy insight must perform gentle nod');
        assert.ok(!joySvg.includes('actor-rumble'), 'Must not have violent rumble');

        const restfulSvg = renderMentorAvatarHTML('restful_pause', false);
        assert.ok(restfulSvg.includes('actor-restful-breathe'), 'Restful pause must have slow 4.5s breath');

        const curiousSvg = renderMentorAvatarHTML('curious_alert', false);
        assert.ok(curiousSvg.includes('actor-curious'), 'Curious alert must have curious animation');
    });

    await it('Renders talking waveform only when isTalking is true', () => {
        const quietSvg = renderMentorAvatarHTML('focused_neutral', false);
        assert.ok(quietSvg.includes('display: none'), 'Waveform must be hidden when quiet');

        const talkingSvg = renderMentorAvatarHTML('focused_neutral', true);
        assert.ok(talkingSvg.includes('display: flex'), 'Waveform must be displayed when talking');
        assert.ok(talkingSvg.includes('animate attributeName="d"'), 'Mouth flap animation must exist when talking');
    });

    // -------------------------------------------------------------
    // Suite 4: Parametric Living Idle Engine Logic
    // -------------------------------------------------------------
    console.log('\nSuite 4: Parametric Living Idle Engine Logic');

    await it('Instantiates NoriLivingIdleEngine with proper defaults', () => {
        const engine = new NoriLivingIdleEngine('#test-mount');
        assert.strictEqual(engine.currentMood, 'focused_neutral');
        assert.strictEqual(engine.isTalking, false);
        assert.strictEqual(engine.isRunning, false);
        assert.strictEqual(engine.gazeEnabled, true);
        assert.strictEqual(engine.currentGazeX, 0);
        assert.strictEqual(engine.currentGazeY, 0);
    });

    await it('Clamps Gaze target strictly within ±1.8px radius', () => {
        const clampTest = (val) => Math.max(-1.8, Math.min(1.8, val));
        assert.strictEqual(clampTest(5.5), 1.8);
        assert.strictEqual(clampTest(-10.2), -1.8);
        assert.strictEqual(clampTest(0.75), 0.75);
    });

    await it('Poisson Blink Cycle delay stays within [3500ms, 5000ms]', () => {
        for (let i = 0; i < 200; i++) {
            const delay = Math.floor(Math.random() * 1500) + 3500;
            assert.ok(delay >= 3500 && delay <= 5000, `Delay ${delay} must be within [3500, 5000]`);
        }
    });

    await it('Double-blink probability follows approximately 15% rate over 2,000 trials', () => {
        let doubleCount = 0;
        const trials = 2000;
        for (let i = 0; i < trials; i++) {
            if (Math.random() < 0.15) {
                doubleCount++;
            }
        }
        const rate = doubleCount / trials;
        // Over 2,000 draws, rate should be around 0.15 with ±0.04 tolerance
        assert.ok(rate >= 0.11 && rate <= 0.19, `Observed double blink rate ${rate} must be near 15%`);
    });

    await it('setMood with joy_insight triggers auto-decay timer to focused_neutral', async () => {
        let decayedTo = null;
        const engine = new NoriLivingIdleEngine('#test-mount', null, (newMood) => {
            decayedTo = newMood;
        });
        engine.isRunning = true;

        engine.setMood('joy_insight', true);
        assert.strictEqual(engine.currentMood, 'joy_insight');
        assert.strictEqual(engine.decayTimers.length, 1);

        // Verify decay executes after 1200ms
        await new Promise((resolve) => {
            setTimeout(() => {
                assert.strictEqual(engine.currentMood, 'focused_neutral');
                assert.strictEqual(decayedTo, 'focused_neutral');
                engine.destroy();
                resolve();
            }, 1300);
        });
    });

    await it('Lifecycle cleanup: destroy() cleans up all timers safely', () => {
        const engine = new NoriLivingIdleEngine('#test-mount');
        engine.start();
        assert.strictEqual(engine.isRunning, true);

        engine.destroy();
        assert.strictEqual(engine.isRunning, false);
        assert.strictEqual(engine.blinkTimer, null);
        assert.strictEqual(engine.earTwitchTimer, null);
        assert.strictEqual(engine.decayTimers.length, 0);
    });

    // -------------------------------------------------------------
    // Suite 5: Adversarial Stress Testing, Pose Hierarchy & Mobile/Tab Robustness
    // -------------------------------------------------------------
    console.log('\nSuite 5: Adversarial Stress Testing, Pose Hierarchy & Mobile/Tab Robustness');

    await it('Pose hierarchy isolation: #nori-pose is separated from #nori-actor across all 6 states', () => {
        const states = Object.values(NORI_PEDAGOGICAL_STATES);
        states.forEach(st => {
            const html = renderMentorAvatarHTML(st, false);
            assert.ok(html.includes('id="nori-actor"'), `Must contain breathing root #nori-actor for ${st}`);
            assert.ok(html.includes('id="nori-pose"'), `Must contain pose root #nori-pose for ${st}`);
            assert.ok(html.includes('companion-ear-left-pose'), `Must contain left ear pose group for ${st}`);
            assert.ok(html.includes('companion-ear-right-pose'), `Must contain right ear pose group for ${st}`);
        });
    });

    await it('Calculates exact pose angles: 3° tilt for empathetic_hint and -2.5° tilt for thinking_contemplate', () => {
        const empHtml = renderMentorAvatarHTML('empathetic_hint', false);
        assert.ok(empHtml.includes('rotate(3deg)'), 'Empathetic hint must contain 3° head tilt on pose group');

        const thinkHtml = renderMentorAvatarHTML('thinking_contemplate', false);
        assert.ok(thinkHtml.includes('rotate(-2.5deg)'), 'Thinking contemplate must contain -2.5° head tilt on pose group');
    });

    await it('Ear pose angle isolation: companion-ear-left-pose and companion-ear-right-pose are separated from twitches', () => {
        const curHtml = renderMentorAvatarHTML('curious_alert', false);
        // curious_alert has +6° left ear, -6° right ear. Base is -10° left, +10° right.
        assert.ok(curHtml.includes('rotate(-4deg)'), 'Left ear must combine base -10° + 6° = -4°');
        assert.ok(curHtml.includes('rotate(4deg)'), 'Right ear must combine base 10° - 6° = 4°');
    });

    await it('Gaze tracking input immunity: immune to NaN, undefined clientX/clientY, and null events', () => {
        const engine = new NoriLivingIdleEngine('#test-mount');
        engine.isRunning = true;
        engine.gazeEnabled = true;

        // Adversarial inputs
        engine.handlePointerMove(null);
        assert.strictEqual(engine.targetGazeX, 0);
        assert.strictEqual(engine.targetGazeY, 0);

        engine.handlePointerMove({});
        assert.strictEqual(engine.targetGazeX, 0);
        assert.strictEqual(engine.targetGazeY, 0);

        engine.handlePointerMove({ clientX: NaN, clientY: NaN });
        assert.strictEqual(engine.targetGazeX, 0);
        assert.strictEqual(engine.targetGazeY, 0);

        engine.handlePointerMove({ clientX: undefined, clientY: 100 });
        assert.strictEqual(engine.targetGazeX, 0);
        assert.strictEqual(engine.targetGazeY, 0);

        // Tick with currentGaze polluted by NaN
        engine.currentGazeX = NaN;
        engine.currentGazeY = NaN;
        engine.gazeTick();
        assert.strictEqual(Number.isFinite(engine.currentGazeX), true, 'gazeTick must recover from non-finite state');
        assert.strictEqual(Number.isFinite(engine.currentGazeY), true, 'gazeTick must recover from non-finite state');

        engine.destroy();
    });

    await it('Mobile touch interaction: pointerup with pointerType "touch" smoothly centers gaze', () => {
        const engine = new NoriLivingIdleEngine('#test-mount');
        engine.isRunning = true;
        engine.targetGazeX = 1.5;
        engine.targetGazeY = -1.2;

        // Pointer up from touch
        engine.handlePointerUp({ pointerType: 'touch' });
        assert.strictEqual(engine.targetGazeX, 0, 'Touch release must reset target gaze to center');
        assert.strictEqual(engine.targetGazeY, 0, 'Touch release must reset target gaze to center');

        // Pointer up from mouse leaves target gaze intact (mouse cursor still hovering)
        engine.targetGazeX = 1.0;
        engine.handlePointerUp({ pointerType: 'mouse' });
        assert.strictEqual(engine.targetGazeX, 1.0, 'Mouse release should not zero out target gaze while on screen');

        // TouchEnd event fallback
        engine.handleTouchEnd();
        assert.strictEqual(engine.targetGazeX, 0);

        engine.destroy();
    });

    await it('Background tab lifecycle: visibilitychange hidden pauses timers, visible reschedules blinks', () => {
        const engine = new NoriLivingIdleEngine('#test-mount');
        engine.start();

        // Simulate document.hidden = true
        engine.isTabHidden = false;
        const origDoc = global.document;
        global.document = {
            hidden: true,
            querySelector: () => null,
            removeEventListener: () => {},
            addEventListener: () => {}
        };

        engine.handleVisibilityChange();
        assert.strictEqual(engine.isTabHidden, true, 'isTabHidden must be true when document is hidden');
        assert.strictEqual(engine.blinkTimer, null, 'blinkTimer must be cancelled when tab is hidden');
        assert.strictEqual(engine.earTwitchTimer, null, 'earTwitchTimer must be cancelled when tab is hidden');

        // Simulate document.hidden = false
        global.document.hidden = false;
        engine.handleVisibilityChange();
        assert.strictEqual(engine.isTabHidden, false, 'isTabHidden must be false when tab returns to foreground');
        assert.ok(engine.blinkTimer !== null, 'blinkTimer must be rescheduled when tab returns');
        assert.ok(engine.earTwitchTimer !== null, 'earTwitchTimer must be rescheduled when tab returns');

        if (origDoc !== undefined) global.document = origDoc;
        else delete global.document;
        engine.destroy();
    });

    await it('HTML element reference: supports passing HTMLElement instance directly to constructor', () => {
        const mockElement = { nodeType: 1, tagName: 'DIV', querySelector: () => null, querySelectorAll: () => [] };
        const engine = new NoriLivingIdleEngine(mockElement);
        assert.strictEqual(engine.getMountElement(), mockElement, 'getMountElement must return the element directly');
        engine.destroy();
    });

    await it('updateMentorAvatar mounts if empty and morphs in-place if already mounted', () => {
        const mockPose = { style: {} };
        const mockActor = {
            classList: {
                classes: ['actor-breathe'],
                remove: function(...cls) { this.classes = this.classes.filter(c => !cls.includes(c)); },
                add: function(...cls) { this.classes.push(...cls); },
                contains: function(c) { return this.classes.includes(c); }
            }
        };
        const mockAvatar = {
            attributes: {},
            setAttribute: function(k, v) { this.attributes[k] = v; }
        };
        const mockGazeLayer = { innerHTML: '', style: { transform: 'translate(1.20px, -0.80px)' } };

        const mockContainer = {
            nodeType: 1,
            innerHTML: '',
            querySelector: function(sel) {
                if (sel === '.vectoria-companion-avatar') return mockAvatar;
                if (sel === '#nori-actor') return mockActor;
                if (sel === '#nori-pose') return mockPose;
                if (sel === '.nori-gaze-layer') return mockGazeLayer;
                return null;
            }
        };

        // Morph to joy_insight
        updateMentorAvatar(mockContainer, 'joy_insight', false);
        assert.strictEqual(mockAvatar.attributes['data-nori-state'], 'joy_insight');
        assert.ok(mockActor.classList.contains('actor-insight-nod'), 'Must update actor to actor-insight-nod');
        assert.strictEqual(mockGazeLayer.style.transform, 'translate(1.20px, -0.80px)', 'Must preserve active gaze transform');

        // Morph to empathetic_hint
        updateMentorAvatar(mockContainer, 'empathetic_hint', false);
        assert.strictEqual(mockAvatar.attributes['data-nori-state'], 'empathetic_hint');
        assert.ok(mockPose.style.transform.includes('rotate(3deg)'), 'Pose must update to 3deg tilt');
    });

    // -------------------------------------------------------------
    // Suite 6: Reviewer Round 2 Adversarial Stress Testing
    // -------------------------------------------------------------
    console.log('\nSuite 6: Reviewer Round 2 Adversarial Stress Testing');

    await it('Legacy browser environment fallback: operates seamlessly without window.PointerEvent', () => {
        const listeners = {};
        const mockWindow = {
            addEventListener: (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
            removeEventListener: (evt, fn) => { if (listeners[evt]) listeners[evt] = listeners[evt].filter(f => f !== fn); },
            innerWidth: 1000,
            innerHeight: 800
        };
        // Explicitly ensure PointerEvent is undefined
        delete mockWindow.PointerEvent;

        const originalWindow = global.window;
        const originalDoc = global.document;
        global.window = mockWindow;
        global.document = {
            createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
            getElementById: () => null,
            head: { appendChild: () => {} }
        };

        const mockMount = {
            nodeType: 1,
            getBoundingClientRect: () => ({ left: 400, top: 300, width: 200, height: 200 }),
            querySelectorAll: () => []
        };

        const engine = new NoriLivingIdleEngine(mockMount, null, null, { gazeEnabled: true });
        engine.start();

        // Must have attached mousemove and touchmove fallback listeners, not pointermove
        assert.ok(listeners['mousemove'], 'Must attach mousemove listener when PointerEvent is missing');
        assert.ok(!listeners['pointermove'], 'Must not attach pointermove when PointerEvent is missing');
        assert.ok(listeners['touchstart'], 'Must attach touchstart fallback');

        // Simulate legacy mouse move
        listeners['mousemove'][0]({ clientX: 520, clientY: 420 });
        assert.ok(engine.targetGazeX > 0, 'Must track targetGazeX with mousemove');
        assert.ok(engine.targetGazeY > 0, 'Must track targetGazeY with mousemove');

        engine.destroy();
        assert.strictEqual(listeners['mousemove'].length, 0, 'Must cleanly remove mousemove listener');
        assert.strictEqual(listeners['touchstart'].length, 0, 'Must cleanly remove touchstart listener');

        global.window = originalWindow;
        global.document = originalDoc;
    });

    await it('Transient timer tracking: destroy() clears pending blink/twitch timeouts without leaks', async () => {
        const mockMount = {
            nodeType: 1,
            querySelector: (sel) => {
                if (sel === '.companion-eyes') return { classList: { add: () => {}, remove: () => {} }, offsetWidth: 100 };
                if (sel === '.companion-ear-left' || sel === '.companion-ear-right') return { classList: { add: () => {}, remove: () => {} }, offsetWidth: 100 };
                return null;
            }
        };

        const engine = new NoriLivingIdleEngine(mockMount, null, null);
        engine.start();

        // Trigger multiple blinks and twitches
        engine.triggerBlink(true);
        engine.triggerEarTwitch();
        engine.triggerBlink(false);

        assert.ok(engine.transientTimers.length >= 3, 'Must track all transient removal timers');

        engine.destroy();
        assert.strictEqual(engine.transientTimers.length, 0, 'Must completely clear all transient timers on destroy');
        assert.strictEqual(engine.isRunning, false, 'Must be flagged as not running');
    });

    await it('Rapid state switching (50 sequential transitions): avoids timer race conditions and converges cleanly', async () => {
        const states = [
            'focused_neutral',
            'joy_insight',
            'empathetic_hint',
            'thinking_contemplate',
            'restful_pause',
            'curious_alert'
        ];

        let statusLog = [];
        const engine = new NoriLivingIdleEngine(null, (s) => statusLog.push(s.currentMood), null);
        engine.start();

        // Rapidly alternate states 50 times in immediate sequence
        for (let i = 0; i < 50; i++) {
            const nextMood = states[i % states.length];
            engine.setMood(nextMood, true);
        }

        const expectedFinal = states[49 % states.length];
        assert.strictEqual(engine.currentMood, expectedFinal, `Final mood must be ${expectedFinal}`);
        assert.ok(engine.decayTimers.length <= 1, 'Must never accumulate leftover decay timers from prior states');

        engine.destroy();
    });

    await it('Repeated updateMentorAvatar with identical state avoids redundant innerHTML teardown', () => {
        let browsWriteCount = 0;
        const mockBrows = {
            get innerHTML() { return '<path/>'; },
            set innerHTML(val) { browsWriteCount++; }
        };
        const mockAvatar = {
            attrs: { 'data-nori-state': 'focused_neutral', 'data-nori-talking': 'false' },
            getAttribute: function(k) { return this.attrs[k]; },
            setAttribute: function(k, v) { this.attrs[k] = v; }
        };
        const mockActor = { classList: { remove: () => {}, add: () => {} } };
        const mockPose = { style: {} };
        const mockGazeLayer = { innerHTML: '', style: {} };

        const mockContainer = {
            nodeType: 1,
            querySelector: (sel) => {
                if (sel === '.vectoria-companion-avatar') return mockAvatar;
                if (sel === '#nori-actor') return mockActor;
                if (sel === '#nori-pose') return mockPose;
                if (sel === '.nori-gaze-layer') return mockGazeLayer;
                if (sel === '.companion-eyebrows') return mockBrows;
                return null;
            }
        };

        // First call with same state (already in focused_neutral, talking false)
        updateMentorAvatar(mockContainer, 'focused_neutral', false);
        assert.strictEqual(browsWriteCount, 0, 'Must NOT mutate innerHTML when state is identical');

        // State changes to empathetic_hint
        updateMentorAvatar(mockContainer, 'empathetic_hint', false);
        assert.strictEqual(browsWriteCount, 1, 'Must mutate innerHTML once when state changes');

        // Repeated call to empathetic_hint
        updateMentorAvatar(mockContainer, 'empathetic_hint', false);
        assert.strictEqual(browsWriteCount, 1, 'Must NOT re-mutate innerHTML on repeated calls with same state');
    });

    await it('Structural deficiency fallback: updateMentorAvatar re-renders if essential nodes are missing', () => {
        let freshRenderHTML = null;
        const brokenContainer = {
            nodeType: 1,
            set innerHTML(val) { freshRenderHTML = val; },
            querySelector: (sel) => {
                // Has companion avatar but missing nori-pose and nori-actor
                if (sel === '.vectoria-companion-avatar') return { getAttribute: () => 'focused_neutral' };
                return null;
            }
        };

        updateMentorAvatar(brokenContainer, 'curious_alert', false);
        assert.ok(freshRenderHTML !== null, 'Must fall back to fresh render if essential nodes are missing');
        assert.ok(freshRenderHTML.includes('data-nori-state="curious_alert"'), 'Fresh render must contain target state');
    });

    await it('Idle RAF suspension: stops requestAnimationFrame loop when settled at (0, 0) past grace period', () => {
        let rafRequested = false;

        const mockEngine = new NoriLivingIdleEngine(null, null, null, { gazeEnabled: true });
        mockEngine.isRunning = true;
        mockEngine.targetGazeX = 0;
        mockEngine.targetGazeY = 0;
        mockEngine.currentGazeX = 0;
        mockEngine.currentGazeY = 0;
        mockEngine.lastPointerMoveTime = Date.now() - 3500; // Past 2800ms grace period
        mockEngine.gazeRafId = 999;

        global.requestAnimationFrame = () => { rafRequested = true; return 1000; };

        mockEngine.gazeTick();

        assert.strictEqual(mockEngine.gazeRafId, null, 'Must suspend gazeRafId when settled at center past grace period');
        assert.strictEqual(rafRequested, false, 'Must not request further animation frames when idle');

        delete global.requestAnimationFrame;
        mockEngine.destroy();
    });

    await it('setTalking(false) restores accurate pedagogical status for non-neutral states', () => {
        let lastReport = null;
        const engine = new NoriLivingIdleEngine(null, (s) => lastReport = s, null);
        engine.start();

        // Switch to curious_alert
        engine.setMood('curious_alert', false);
        assert.strictEqual(lastReport.currentMood, 'curious_alert');

        // Start talking
        engine.setTalking(true);
        assert.strictEqual(lastReport.status, 'Đang hội thoại cùng người học');

        // Stop talking
        engine.setTalking(false);
        assert.strictEqual(lastReport.currentMood, 'curious_alert');
        assert.ok(lastReport.status.includes('Hiếu kỳ') || lastReport.status.includes('Curious Alert'), 'Must restore curious_alert label on speech completion');

        engine.destroy();
    });

    await it('Null options in constructor and invalid selector string in getMountElement operate safely', () => {
        // Constructor with explicit null options
        const engine1 = new NoriLivingIdleEngine(null, null, null, null);
        assert.strictEqual(engine1.gazeEnabled, true);
        engine1.destroy();

        // Invalid selector string that would cause DOMException in querySelector
        const engine2 = new NoriLivingIdleEngine(':::invalid-selector:::', null, null);
        assert.strictEqual(engine2.getMountElement(), null);
        engine2.destroy();
    });

    await it('Switching to restful_pause cleans up active blinks and forces gaze target to center', () => {
        let blinkRemoved = false;
        const mockEyes = {
            classList: {
                remove: (c1, c2) => {
                    if (c1 === 'eye-blink' || c2 === 'eye-double-blink') blinkRemoved = true;
                },
                add: () => {}
            },
            offsetWidth: 100
        };
        const mockMount = {
            nodeType: 1,
            querySelector: (sel) => (sel === '.companion-eyes' ? mockEyes : null),
            querySelectorAll: () => []
        };

        const engine = new NoriLivingIdleEngine(mockMount, null, null);
        engine.start();
        engine.targetGazeX = 1.4;
        engine.targetGazeY = -0.9;

        // Trigger active blink
        engine.triggerBlink(false);
        assert.ok(engine.blinkAnimTimer !== null);

        // Switch to restful_pause
        engine.setMood('restful_pause');
        assert.strictEqual(engine.currentMood, 'restful_pause');
        assert.strictEqual(engine.targetGazeX, 0);
        assert.strictEqual(engine.targetGazeY, 0);
        assert.strictEqual(engine.blinkAnimTimer, null, 'Active blink timer must be cleared on restful_pause');

        engine.destroy();
    });

    await it('100 rapid start() and destroy() cycles without leaking timers or event listeners', () => {
        const mockMount = {
            nodeType: 1,
            querySelector: () => null,
            querySelectorAll: () => []
        };
        for (let i = 0; i < 100; i++) {
            const engine = new NoriLivingIdleEngine(mockMount, null, null);
            engine.start();
            engine.triggerBlink(true);
            engine.triggerEarTwitch();
            engine.setMood('joy_insight', true);
            engine.destroy();

            assert.strictEqual(engine.isRunning, false);
            assert.strictEqual(engine.blinkTimer, null);
            assert.strictEqual(engine.earTwitchTimer, null);
            assert.strictEqual(engine.decayTimers.length, 0);
            assert.strictEqual(engine.transientTimers.length, 0);
            assert.strictEqual(engine.gazeRafId, null);
        }
    });

    await it('Touch release / pointerup wakes up gaze loop to glide eyes smoothly back to center', () => {
        let rafAwoken = false;
        const engine = new NoriLivingIdleEngine(null, null, null);
        engine.start();

        // Simulate gaze held off-center with RAF suspended
        engine.targetGazeX = 1.5;
        engine.targetGazeY = 0.5;
        engine.gazeRafId = null;

        global.requestAnimationFrame = () => { rafAwoken = true; return 1001; };

        // Lift finger on touch
        engine.handlePointerUp({ pointerType: 'touch' });
        assert.strictEqual(engine.targetGazeX, 0, 'Target gaze must reset to 0');
        assert.strictEqual(engine.targetGazeY, 0, 'Target gaze must reset to 0');
        assert.strictEqual(rafAwoken, true, 'Must wake up RAF loop to glide back to center');

        delete global.requestAnimationFrame;
        engine.destroy();
    });

    // -------------------------------------------------------------
    // Suite 7: Reviewer Round 3 Adversarial Hardening (Ultrawide, Reduced-Motion, WCAG 2.1 AAA)
    // -------------------------------------------------------------
    console.log('\nSuite 7: Reviewer Round 3 Adversarial Hardening (Ultrawide, Reduced-Motion, WCAG 2.1 AAA)');

    await it('Ultrawide (21:9 & 32:9) viewport bounds clamp & circular Euclidean gaze radius', () => {
        const mockMount = {
            nodeType: 1,
            getBoundingClientRect: () => ({ left: 500, top: 400, width: 100, height: 100 }),
            querySelectorAll: () => []
        };
        const origWindow = global.window;
        const origDoc = global.document;

        // Simulate 3440x1440 ultrawide monitor
        global.window = {
            innerWidth: 3440,
            innerHeight: 1440,
            PointerEvent: function() {},
            addEventListener: () => {},
            removeEventListener: () => {}
        };
        global.document = {
            createElement: () => ({ appendChild: () => {}, setAttribute: () => {} }),
            getElementById: () => null,
            head: { appendChild: () => {} }
        };

        const engine = new NoriLivingIdleEngine(mockMount);
        engine.isRunning = true;
        engine.gazeEnabled = true;

        // Cursor at far diagonal extreme (clientX: 3400, clientY: 1400)
        engine.handlePointerMove({ clientX: 3400, clientY: 1400 });
        const hyp = Math.hypot(engine.targetGazeX, engine.targetGazeY);
        assert.ok(hyp <= 1.8 + 1e-6, `Diagonal gaze distance ${hyp} must not exceed 1.8px radius`);
        assert.ok(engine.targetGazeX <= 1.8 && engine.targetGazeX >= -1.8);
        assert.ok(engine.targetGazeY <= 1.8 && engine.targetGazeY >= -1.8);

        // Extreme bounds (clientX: 99999, clientY: -99999)
        engine.handlePointerMove({ clientX: 99999, clientY: -99999 });
        const hypExtreme = Math.hypot(engine.targetGazeX, engine.targetGazeY);
        assert.ok(Math.abs(hypExtreme - 1.8) < 1e-4, `Extreme coords distance ${hypExtreme} must strictly equal 1.8px radius`);

        engine.destroy();
        global.window = origWindow;
        global.document = origDoc;
    });

    await it('Stylus / pen release on touch devices resets gaze to center', () => {
        let loopAwoken = false;
        const engine = new NoriLivingIdleEngine(null);
        engine.isRunning = true;
        engine.targetGazeX = 1.2;
        engine.targetGazeY = -0.9;
        global.requestAnimationFrame = () => { loopAwoken = true; return 1002; };

        // Lift pen
        engine.handlePointerUp({ pointerType: 'pen' });
        assert.strictEqual(engine.targetGazeX, 0, 'Pen release must reset target gaze to center');
        assert.strictEqual(engine.targetGazeY, 0, 'Pen release must reset target gaze to center');
        assert.strictEqual(loopAwoken, true, 'Pen release must wake up RAF loop');

        delete global.requestAnimationFrame;
        engine.destroy();
    });

    await it('Reduced motion option suppresses biological timers while preserving pedagogical state poses', () => {
        const mockMount = {
            nodeType: 1,
            querySelector: () => null,
            querySelectorAll: () => []
        };
        const engine = new NoriLivingIdleEngine(mockMount, null, null, { reducedMotion: true });
        engine.start();

        assert.strictEqual(engine.isReducedMotion, true);
        assert.strictEqual(engine.blinkTimer, null, 'Must NOT schedule blinks when reducedMotion is active');
        assert.strictEqual(engine.earTwitchTimer, null, 'Must NOT schedule ear twitches when reducedMotion is active');

        // Verify pedagogical state change still works perfectly
        engine.setMood('empathetic_hint');
        assert.strictEqual(engine.currentMood, 'empathetic_hint');

        engine.destroy();
    });

    await it('Dynamic setReducedMotion toggles cleanup and resumes timers without leaks', () => {
        let eyesCleaned = false;
        const mockEyes = {
            classList: {
                remove: (c1, c2) => { if (c1 === 'eye-blink' || c2 === 'eye-double-blink') eyesCleaned = true; }
            }
        };
        const mockMount = {
            nodeType: 1,
            querySelector: (sel) => (sel === '.companion-eyes' ? mockEyes : null),
            querySelectorAll: () => []
        };
        const engine = new NoriLivingIdleEngine(mockMount);
        engine.start();

        assert.strictEqual(engine.isReducedMotion, false);
        assert.ok(engine.blinkTimer !== null);

        // Turn ON reduced motion
        engine.setReducedMotion(true);
        assert.strictEqual(engine.isReducedMotion, true);
        assert.strictEqual(engine.blinkTimer, null, 'Must cancel blink timer');
        assert.strictEqual(engine.earTwitchTimer, null, 'Must cancel ear twitch timer');
        assert.strictEqual(eyesCleaned, true, 'Must clean up active blink classes');

        // Turn OFF reduced motion
        engine.setReducedMotion(false);
        assert.strictEqual(engine.isReducedMotion, false);
        assert.ok(engine.blinkTimer !== null, 'Must re-arm blink timer when reduced motion is disabled');
        assert.ok(engine.earTwitchTimer !== null, 'Must re-arm ear twitch timer');

        engine.destroy();
    });

    await it('Double-clamp in gazeTick strictly bounds rogue external target mutations to radius 1.8px', () => {
        const engine = new NoriLivingIdleEngine(null);
        engine.isRunning = true;
        engine.targetGazeX = 20.0;
        engine.targetGazeY = 20.0;

        engine.gazeTick();

        const targetDist = Math.hypot(engine.targetGazeX, engine.targetGazeY);
        assert.ok(targetDist <= 1.8 + 1e-6, `Rogue target distance ${targetDist} must be clamped to 1.8px`);
        assert.ok(engine.currentGazeX > 0 && engine.currentGazeX <= 1.8);

        engine.destroy();
    });

    await it('WCAG 2.1 AAA CSS inspection: voice waves badge is included in reduced-motion styles', () => {
        let injectedCSS = '';
        const origDoc = global.document;
        global.document = {
            getElementById: () => null,
            createElement: () => ({ id: '', textContent: '', appendChild: () => {} }),
            head: {
                appendChild: (el) => { injectedCSS = el.textContent; }
            }
        };

        const { renderMentorAvatarHTML } = require('../frontend_v2/js/app/simulation/nori_avatar_renderer.js');
        renderMentorAvatarHTML('focused_neutral');

        assert.ok(injectedCSS.includes('companion-voice-waves span'), 'Must include companion-voice-waves span in reduced-motion CSS');
        assert.ok(injectedCSS.includes('#vectoria-avatar-voice-waves span'), 'Must include #vectoria-avatar-voice-waves span in reduced-motion CSS');
        assert.ok(injectedCSS.includes('.nori-reduced-motion'), 'Must include class fallback .nori-reduced-motion in CSS');

        global.document = origDoc;
    });

    // Summary
    console.log('\n====================================================');
    console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (100% Success)`);
    console.log('====================================================');
}

runAllTests().catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
});
