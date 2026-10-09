const { spawn } = require('child_process');
const http = require('http');

async function verify3DNori() {
    console.log('Testing 3D Nori & Dynamic Expression Engine in Edge Headless...');
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9225',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9225/json', (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = pages.find(p => p.type === 'page' && p.url.includes('calculation.html'));
        if (!targetPage) throw new Error('Target page calculation.html not found');

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
            if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
                consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
            }
        });

        await sendCommand('Runtime.enable');
        await sendCommand('Page.enable');
        await new Promise(r => setTimeout(r, 1500));

        // 1. Switch to 3D mode and activate Nori
        console.log('\n--- Test 1: 3D Nori Initialization in MathGroup ---');
        const modeRes = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                App.mode = '3D';
                if (typeof Vec3D !== 'undefined' && Vec3D.init3D) {
                    Vec3D.init3D();
                }
                App.noriEntityActive = true;
                Vec3D.draw3DAllVectors();
                const grp = Vec3D._nori3DGroup;
                const inMath = grp && grp.parent === Vec3D._mathGroup;
                const front = grp?.getObjectByName('noriFrontMesh');
                return {
                    has3DGroup: !!grp,
                    inMathGroup: inMath,
                    childrenCount: grp ? grp.children.length : 0,
                    hasFrontMesh: !!front,
                    frontTex: !!front?.material?.map
                };
            })()`,
            returnByValue: true
        });
        console.log('3D Nori Initialization:', modeRes);
        if (!modeRes.has3DGroup || !modeRes.inMathGroup || !modeRes.hasFrontMesh || modeRes.childrenCount < 10) {
            throw new Error('3D Nori failed to mount properly in Vec3D._mathGroup!');
        }

        // 2. Mathematical Expression State Decomposition (2D and 3D)
        console.log('\n--- Test 2: Mathematical Expression Classification ---');
        const exprRes = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                // Rotation 2D (90 deg)
                const rot2D = Vec2D.getNoriExpressionState([[0, -1], [1, 0]], false).state;
                // Rotation 3D (90 deg around Z)
                const rot3D = Vec2D.getNoriExpressionState([[0, -1, 0], [1, 0, 0], [0, 0, 1]], false).state;
                // Scaling (2x)
                const scale2D = Vec2D.getNoriExpressionState([[2, 0], [0, 2]], false).state;
                // Mild Shear
                // Mild Shear
                const mildShear = Vec2D.getNoriExpressionState([[1, 0.35], [0, 1]], false).state;
                // Image 4 Shear (t = -1.55, moderate tilt) -> CURIOUS
                const image4Shear = Vec2D.getNoriExpressionState([[1, -1.55], [0, 1]], false).state;
                // Extreme Shear
                const extremeShear = Vec2D.getNoriExpressionState([[1, 3.5], [0, 1]], false).state;
                // Reflection (det < 0)
                const refl = Vec2D.getNoriExpressionState([[-1, 0], [0, 1]], false).state;
                // Pancake collapse (det = 0)
                const pancake = Vec2D.getNoriExpressionState([[1, 2], [2, 4]], false).state;
                // Relieved state
                const relieved = Vec2D.getNoriExpressionState([[1, 3.5], [0, 1]], true).state;

                return {
                    rot2D,
                    rot3D,
                    scale2D,
                    mildShear,
                    image4Shear,
                    extremeShear,
                    refl,
                    pancake,
                    relieved
                };
            })()`,
            returnByValue: true
        });
        console.log('Expression States:', exprRes);
        if (exprRes.rot2D !== 'SPINNING') throw new Error('2D Rotation was not SPINNING: ' + exprRes.rot2D);
        if (exprRes.rot3D !== 'SPINNING') throw new Error('3D Rotation was not SPINNING: ' + exprRes.rot3D);
        if (exprRes.scale2D !== 'SCALING') throw new Error('Scale was not SCALING: ' + exprRes.scale2D);
        if (exprRes.mildShear !== 'CURIOUS') throw new Error('Mild shear was not CURIOUS: ' + exprRes.mildShear);
        if (exprRes.image4Shear !== 'CURIOUS') throw new Error('Image 4 shear was not CURIOUS: ' + exprRes.image4Shear);
        if (exprRes.extremeShear !== 'STRAINED') throw new Error('Extreme shear was not STRAINED: ' + exprRes.extremeShear);
        if (exprRes.refl !== 'BACKSIDE') throw new Error('Reflection was not BACKSIDE: ' + exprRes.refl);
        if (exprRes.pancake !== 'PANCAKE') throw new Error('Singular was not PANCAKE: ' + exprRes.pancake);
        if (exprRes.relieved !== 'RELIEVED') throw new Error('Relieved was not RELIEVED: ' + exprRes.relieved);

        // 3. Dynamic 3D Texture Switching Verification
        console.log('\n--- Test 3: Dynamic 3D Texture Switching ---');
        const texRes = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                const frontMesh = Vec3D._nori3DGroup.getObjectByName('noriFrontMesh');
                const initialMap = frontMesh.material.map;

                // Apply rotation -> SPINNING texture
                const rotM = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
                Vec3D.applyTransformToNori3D(rotM, 1);
                const rotMap = frontMesh.material.map;
                const isSpinningTex = rotMap === Vec3D.getNoriFrontTexture('SPINNING');

                // Apply mild shear -> CURIOUS texture
                const mildM = [[1, 0.35, 0], [0, 1, 0], [0, 0, 1]];
                Vec3D.applyTransformToNori3D(mildM, 1);
                const mildMap = frontMesh.material.map;
                const isCuriousTex = mildMap === Vec3D.getNoriFrontTexture('CURIOUS');

                // Apply extreme shear -> STRAINED texture
                const extremeM = [[1, 3.5, 0], [0, 1, 0], [0, 0, 1]];
                Vec3D.applyTransformToNori3D(extremeM, 1);
                const extremeMap = frontMesh.material.map;
                const isStrainedTex = extremeMap === Vec3D.getNoriFrontTexture('STRAINED');

                // Trigger relief -> RELIEVED texture
                App.triggerNoriRelief();
                Vec3D.applyTransformToNori3D(rotM, 1);
                const relievedMap = frontMesh.material.map;
                const isRelievedTex = relievedMap === Vec3D.getNoriFrontTexture('RELIEVED');

                return {
                    isSpinningTex,
                    isCuriousTex,
                    isStrainedTex,
                    isRelievedTex,
                    cacheSize: Object.keys(Vec3D._noriTextureCache).length
                };
            })()`,
            returnByValue: true
        });
        console.log('3D Dynamic Texture Switching Result:', texRes);
        if (!texRes.isSpinningTex || !texRes.isCuriousTex || !texRes.isStrainedTex || !texRes.isRelievedTex) {
            throw new Error('3D Dynamic texture switching failed: ' + JSON.stringify(texRes));
        }

        // 4. Verify Selection of Nori in Transform Tab
        console.log('\n--- Test 4: Nori in Transform Tab Selector ---');
        const selRes = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                // Ensure vectorList is empty to test unblocking requirement
                App.vectorList = [];
                App.refreshTransformTab();
                const vecSel = document.getElementById('mixedVectorSelect');
                const noriOption = Array.from(vecSel?.options || []).find(o => o.value === 'nori_entity');
                return {
                    hasVecSel: !!vecSel,
                    hasNoriOption: !!noriOption,
                    noriOptionText: noriOption?.textContent
                };
            })()`,
            returnByValue: true
        });
        console.log('Nori Selector Check:', selRes);
        if (!selRes.hasNoriOption) {
            throw new Error('Nori option not found in mixedVectorSelect when vectorList is empty!');
        }

        // 5. Verify clicking btnMixedCompute with Nori does not trigger 'Danh sách trống' toast
        console.log('\n--- Test 5: Click btnMixedCompute with Nori when vectorList is empty ---');
        const clickRes = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                let toastTriggered = false;
                let toastMsg = '';
                const origToast = window.showToast;
                window.showToast = function(msg, type) {
                    toastTriggered = true;
                    toastMsg = msg;
                    if (origToast) origToast(msg, type);
                };

                const vecSel = document.getElementById('mixedVectorSelect');
                if (vecSel) {
                    vecSel.value = 'nori_entity';
                    vecSel.dispatchEvent(new Event('change'));
                }

                const btn = document.getElementById('btnMixedCompute');
                if (btn) btn.click();

                // Restore
                window.showToast = origToast;

                return {
                    toastTriggered,
                    toastMsg
                };
            })()`,
            returnByValue: true
        });
        console.log('Click btnMixedCompute Result:', clickRes);
        if (clickRes.toastTriggered && clickRes.toastMsg.includes('Danh sách trống')) {
            throw new Error('Clicking btnMixedCompute triggered "Danh sách trống" toast!');
        }

        console.log('\nConsole Errors:', consoleErrors);
        ws.close();
        edge.kill();

        if (consoleErrors.length === 0) {
            console.log('\n🎉 ALL 3D NORI & DYNAMIC EXPRESSION TESTS PASSED 100%!');
        } else {
            throw new Error('Console errors encountered: ' + consoleErrors.join('; '));
        }
    } catch (err) {
        edge.kill();
        console.error('Test failed:', err);
        process.exit(1);
    }
}

verify3DNori();
