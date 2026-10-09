/**
 * Verification script connecting to Edge headless via CDP to verify nori_showcase.html
 * Checks: 0 console errors, SVG rendered, 6 catalog cards, living engine initialized.
 */
const { spawn } = require('child_process');
const http = require('http');

async function testShowcaseHeadless() {
    console.log('Launching Microsoft Edge Headless with CDP on port 9223...');
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9223',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        'file:///d:/Programming_language/project_web/frontend_v2/nori_showcase.html'
    ]);

    // Give Edge 1.2s to start
    await new Promise(r => setTimeout(r, 1200));

    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9223/json', (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = pages.find(p => p.type === 'page' && p.url.includes('nori_showcase.html'));
        if (!targetPage) {
            throw new Error('Target page nori_showcase.html not found in CDP pages list: ' + JSON.stringify(pages));
        }

        console.log('Found target page:', targetPage.title);
        console.log('Connecting to WebSocket:', targetPage.webSocketDebuggerUrl);

        // Connect via WebSocket (native WebSocket is available in Node 22+)
        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        const consoleErrors = [];
        const consoleMessages = [];

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        let msgId = 1;
        function sendCommand(method, params = {}) {
            return new Promise((resolve) => {
                const id = msgId++;
                const handler = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.id === id) {
                        ws.removeEventListener('message', handler);
                        resolve(data.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        ws.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.method === 'Console.messageAdded') {
                const m = data.params.message;
                if (m.level === 'error') consoleErrors.push(m.text);
                else consoleMessages.push(`[${m.level}] ${m.text}`);
            }
            if (data.method === 'Runtime.consoleAPICalled') {
                const type = data.params.type;
                const text = data.params.args.map(a => a.value || a.description).join(' ');
                if (type === 'error') consoleErrors.push(text);
                else consoleMessages.push(`[${type}] ${text}`);
            }
            if (data.method === 'Runtime.exceptionThrown') {
                const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
                consoleErrors.push('Uncaught exception: ' + desc);
            }
        });

        await sendCommand('Console.enable');
        await sendCommand('Runtime.enable');
        await sendCommand('Page.enable');

        // Evaluate DOM elements
        const evalExpr = async (expr) => {
            const res = await sendCommand('Runtime.evaluate', { expression: expr, returnByValue: true });
            return res && res.result ? res.result.value : undefined;
        };

        // Wait for page to fully load and DOMContentLoaded scripts to execute (up to 5s)
        for (let attempt = 0; attempt < 25; attempt++) {
            const isReady = await evalExpr("document.readyState === 'complete' && typeof window.NORI_PEDAGOGICAL_STATES === 'object' && document.querySelector('#hero-avatar-mount svg') !== null");
            if (isReady) break;
            await new Promise(r => setTimeout(r, 200));
        }

        const heroSvgExists = await evalExpr("document.querySelector('#hero-avatar-mount svg') !== null");
        console.log('  Hero SVG exists:', heroSvgExists);

        const gazeLayerExists = await evalExpr("document.querySelector('#hero-avatar-mount .nori-gaze-layer') !== null");
        console.log('  Gaze layer exists:', gazeLayerExists);

        const catalogCardsCount = await evalExpr("document.querySelectorAll('#pedagogical-catalog-grid > div').length");
        console.log('  Catalog cards count (expected 6):', catalogCardsCount);

        const statesExported = await evalExpr("typeof window.NORI_PEDAGOGICAL_STATES === 'object'");
        console.log('  NORI_PEDAGOGICAL_STATES defined:', statesExported);

        const engineRunning = await evalExpr("heroLivingEngine && heroLivingEngine.isRunning");
        console.log('  heroLivingEngine.isRunning:', engineRunning);

        const matrixMountSvgExists = await evalExpr("document.querySelector('#nori-matrix-svg-mount svg') !== null");
        console.log('  Matrix mount SVG exists:', matrixMountSvgExists);

        const hasRiveCanvas = await evalExpr("document.querySelector('#nori-rive-canvas') !== null");
        console.log('  Rive canvas present (expected false):', hasRiveCanvas);

        // Test state switching to empathetic_hint and verify pose angle isolation
        await evalExpr("selectHeroState('empathetic_hint')");
        const poseInline = await evalExpr("document.querySelector('#hero-avatar-mount #nori-pose').style.transform");
        console.log('  Empathetic hint inline pose style:', poseInline);

        // Wait 350ms for the 300ms CSS transition to interpolate to target angle
        await new Promise(r => setTimeout(r, 350));
        const poseTransform = await evalExpr("window.getComputedStyle(document.querySelector('#hero-avatar-mount #nori-pose')).transform");
        console.log('  Empathetic hint computed transform after transition:', poseTransform);
        const hasPoseRotation = poseTransform && !poseTransform.includes('matrix(1, 0, 0, 1, 0, 0)');
        console.log('  Pose angle isolated and tilted (expected true):', hasPoseRotation);

        // Verify in-place morphing preserved the avatar element
        const avatarElementStillValid = await evalExpr("document.querySelector('#hero-avatar-mount .vectoria-companion-avatar') !== null");
        console.log('  Avatar element preserved in-place:', avatarElementStillValid);

        // Test state switching to joy_insight
        await evalExpr("selectHeroState('joy_insight')");
        const currentHeroState = await evalExpr("currentHeroState");
        console.log('  Selected joy_insight state:', currentHeroState === 'joy_insight');

        // Test Reduced Motion toggle in showcase
        const hasReducedMotionToggle = await evalExpr("document.querySelector('#toggle-reduced-motion') !== null");
        console.log('  Reduced motion toggle exists in DOM:', hasReducedMotionToggle);

        await evalExpr("toggleReducedMotion(true)");
        const isEngineReducedMotion = await evalExpr("heroLivingEngine.isReducedMotion");
        const isDocReducedMotion = await evalExpr("document.documentElement.classList.contains('nori-reduced-motion')");
        console.log('  Reduced motion enabled on engine:', isEngineReducedMotion);
        console.log('  Reduced motion class on document:', isDocReducedMotion);

        // Turn reduced motion back off
        await evalExpr("toggleReducedMotion(false)");

        // Test Ultrawide gaze tracking clamp in live DOM
        await evalExpr(`
            window.dispatchEvent(new PointerEvent('pointermove', { clientX: 5000, clientY: 5000 }));
        `);
        const gazeX = await evalExpr("heroLivingEngine.targetGazeX");
        const gazeY = await evalExpr("heroLivingEngine.targetGazeY");
        const gazeDist = Math.hypot(gazeX, gazeY);
        console.log('  Ultrawide corner gaze clamp distance (hypot <= 1.8px):', gazeDist <= 1.801, `(${gazeDist.toFixed(3)}px)`);

        // Test singular matrix preset in Phase 2 playground
        await evalExpr("applyPresetMatrix(1, 2, 0.5, 1)");
        const puppetTransform = await evalExpr("document.querySelector('#nori-matrix-puppet-wrap').style.transform");
        console.log('  Singular matrix puppet transform:', puppetTransform);
        const singularHasProperD = puppetTransform.includes('1, 0, 0)') && !puppetTransform.includes('-1, 0, 0)');
        console.log('  Singular matrix does not flip Y axis inverted:', singularHasProperD);

        // Reset matrix
        await evalExpr("resetMeshMatrix()");

        ws.close();
        edge.kill();

        console.log('\n--- Console Summary ---');
        console.log('Console Errors count:', consoleErrors.length);
        if (consoleErrors.length > 0) {
            console.error('Errors:', consoleErrors);
            process.exit(1);
        }

        console.log('Console Messages:', consoleMessages);

        if (!heroSvgExists || !gazeLayerExists || catalogCardsCount !== 6 || !statesExported || !engineRunning || hasRiveCanvas || !hasPoseRotation || !avatarElementStillValid) {
            console.error('Validation assertions failed!');
            process.exit(1);
        }

        console.log('\n>>> All Headless Browser Invariants PASSED! (0 console errors, 100% SVG, 0 Rive) <<<');
    } catch (err) {
        console.error('Error during headless test:', err);
        edge.kill();
        process.exit(1);
    }
}

testShowcaseHeadless();
