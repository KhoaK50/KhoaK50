/**
 * Headless CDP Verification for Nori on calculation.html
 * Tests:
 * 1. #btnNoriEntity exists next to #btnImageToVector.
 * 2. Clicking #btnNoriEntity activates App.noriEntityActive.
 * 3. 2D Canvas renders Nori in Normal state without errors.
 * 4. 2D Canvas renders Strained state under shear matrix without errors.
 * 5. 2D Canvas renders Backside Hamster view under reflection (det < 0) without errors.
 * 6. 2D Canvas renders Flat Pancake under singular matrix (det = 0) without errors.
 * 7. Zero console JavaScript errors.
 */
const { spawn } = require('child_process');
const http = require('http');

async function verifyCalculationNori() {
    console.log('Launching Edge Headless on port 9224...');
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9224',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9224/json', (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = pages.find(p => p.type === 'page' && p.url.includes('calculation.html'));
        if (!targetPage) {
            throw new Error('Target page calculation.html not found: ' + JSON.stringify(pages));
        }

        console.log('Found target page:', targetPage.title);
        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        const consoleErrors = [];

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
                        if (data.result && data.result.result && data.result.result.value !== undefined) {
                            resolve(data.result.result.value);
                        } else {
                            resolve(data.result);
                        }
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        ws.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.method === 'Runtime.consoleAPICalled') {
                const type = data.params.type;
                const text = data.params.args.map(a => a.value || a.description || '').join(' ');
                if (type === 'error' && !text.includes('favicon')) {
                    consoleErrors.push(text);
                }
            } else if (data.method === 'Runtime.exceptionThrown') {
                const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text;
                consoleErrors.push(desc);
            }
        });

        await sendCommand('Runtime.enable');
        await sendCommand('Page.enable');

        // Wait for page scripts to settle
        await new Promise(r => setTimeout(r, 1500));

        // 1. Check Button in DOM
        console.log('\n--- Test 1: Button Existence ---');
        const btnCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                const btnNori = document.getElementById('btnNoriEntity');
                const btnImg = document.getElementById('btnImageToVector');
                return {
                    hasNoriBtn: !!btnNori,
                    hasImgBtn: !!btnImg,
                    noriText: btnNori?.textContent?.trim(),
                    nextToImg: btnNori?.parentElement === btnImg?.parentElement
                };
            })()`,
            returnByValue: true
        });
        const resVal = btnCheck.value !== undefined ? btnCheck.value : btnCheck;
        console.log('Button Check Result:', resVal);
        if (!resVal.hasNoriBtn) throw new Error('btnNoriEntity not found in DOM!');
        if (!resVal.nextToImg) throw new Error('btnNoriEntity is not beside btnImageToVector!');

        // 2. Toggle Activation
        console.log('\n--- Test 2: Toggle Activation ---');
        const toggleCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                const btn = document.getElementById('btnNoriEntity');
                btn.click();
                return {
                    active: window.App?.noriEntityActive,
                    hasActiveClass: btn.classList.contains('active')
                };
            })()`,
            returnByValue: true
        });
        const toggleVal = toggleCheck.value !== undefined ? toggleCheck.value : toggleCheck;
        console.log('Toggle Activation Result:', toggleVal);
        if (!toggleVal.active || !toggleVal.hasActiveClass) {
            throw new Error('Clicking btnNoriEntity did not activate noriEntityActive!');
        }

        // 3. Render 2D Normal State
        console.log('\n--- Test 3: Render 2D Normal State ---');
        const renderNormalCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                try {
                    window.Vec2D.draw2DAllVectors();
                    return { success: true };
                } catch(e) {
                    return { success: false, error: e.message };
                }
            })()`,
            returnByValue: true
        });
        const normalVal = renderNormalCheck.value !== undefined ? renderNormalCheck.value : renderNormalCheck;
        console.log('Render Normal Result:', normalVal);
        if (!normalVal.success) throw new Error('Render normal failed: ' + normalVal.error);

        // 4. Render 2D Strained State (Shear matrix)
        console.log('\n--- Test 4: Render 2D Strained State (Shear Matrix) ---');
        const renderStrainedCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                try {
                    // Fake linear transform matrix with high shear
                    const fakeMatrix = [[1, 2.0], [0, 1]];
                    window.App.LinearTransform = window.App.LinearTransform || {};
                    window.App.LinearTransform.isActive = () => true;
                    window.App.LinearTransform.getInterpMatrix = () => fakeMatrix;
                    window.App.LinearTransform.t = 1.0;
                    window.Vec2D.draw2DAllVectors();
                    return { success: true };
                } catch(e) {
                    return { success: false, error: e.message };
                }
            })()`,
            returnByValue: true
        });
        const strainedVal = renderStrainedCheck.value !== undefined ? renderStrainedCheck.value : renderStrainedCheck;
        console.log('Render Strained Result:', strainedVal);
        if (!strainedVal.success) throw new Error('Render strained failed: ' + strainedVal.error);

        // 5. Render 2D Backside View (Reflection matrix det < 0)
        console.log('\n--- Test 5: Render 2D Backside View (Reflection det < 0) ---');
        const renderBacksideCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                try {
                    const reflectionMatrix = [[-1, 0], [0, 1]];
                    window.App.LinearTransform.getInterpMatrix = () => reflectionMatrix;
                    window.Vec2D.draw2DAllVectors();
                    return { success: true };
                } catch(e) {
                    return { success: false, error: e.message };
                }
            })()`,
            returnByValue: true
        });
        const backsideVal = renderBacksideCheck.value !== undefined ? renderBacksideCheck.value : renderBacksideCheck;
        console.log('Render Backside Result:', backsideVal);
        if (!backsideVal.success) throw new Error('Render backside failed: ' + backsideVal.error);

        // 6. Render 2D Flat Pancake (Singular matrix det = 0)
        console.log('\n--- Test 6: Render 2D Flat Pancake (Singular det = 0) ---');
        const renderPancakeCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                try {
                    const singularMatrix = [[1, 1], [1, 1]];
                    window.App.LinearTransform.getInterpMatrix = () => singularMatrix;
                    window.Vec2D.draw2DAllVectors();
                    return { success: true };
                } catch(e) {
                    return { success: false, error: e.message };
                }
            })()`,
            returnByValue: true
        });
        const pancakeVal = renderPancakeCheck.value !== undefined ? renderPancakeCheck.value : renderPancakeCheck;
        console.log('Render Pancake Result:', pancakeVal);
        if (!pancakeVal.success) throw new Error('Render pancake failed: ' + pancakeVal.error);

        // 7. Toggle Deactivation
        console.log('\n--- Test 7: Toggle Deactivation ---');
        const deactivateCheck = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                const btn = document.getElementById('btnNoriEntity');
                btn.click();
                return {
                    active: window.App?.noriEntityActive,
                    hasActiveClass: btn.classList.contains('active')
                };
            })()`,
            returnByValue: true
        });
        const deactVal = deactivateCheck.value !== undefined ? deactivateCheck.value : deactivateCheck;
        console.log('Deactivate Result:', deactVal);
        if (deactVal.active || deactVal.hasActiveClass) {
            throw new Error('Deactivating Nori failed!');
        }

        // 8. Console Error Audit
        console.log('\n--- Test 8: Console Error Audit ---');
        console.log('Recorded Console Errors:', consoleErrors);
        if (consoleErrors.length > 0) {
            throw new Error('Console errors encountered: ' + consoleErrors.join('; '));
        }

        console.log('\n🎉 ALL 8 HEADLESS BROWSER VERIFICATION TESTS PASSED PERFECTLY!');
        ws.close();
    } finally {
        edge.kill();
    }
}

verifyCalculationNori().catch(err => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
});
