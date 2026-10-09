const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function verifyAll() {
    console.log('--- Starting Comprehensive Nori Verification ---');
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9250',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9250/json', res => {
                let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
        const targetPage = pages.find(p => p.type === 'page' && p.url.includes('calculation.html'));
        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let msgId = 1;
        function send(method, params = {}) {
            return new Promise((resolve) => {
                const id = msgId++;
                const handler = (evt) => {
                    const data = JSON.parse(evt.data);
                    if (data.id === id) {
                        ws.removeEventListener('message', handler);
                        const val = data.result?.result?.value !== undefined ? data.result.result.value : data.result;
                        resolve(val);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 1000));

        // 1. Verify No Error When Vectors List is Empty
        console.log('\n[Check 1] Checking empty vector behavior with Nori...');
        const check1 = await send('Runtime.evaluate', {
            expression: `(function() {
                App.vectorList = [];
                if (App.refreshMixedCalcOptions) App.refreshMixedCalcOptions();
                const mixedSel = document.getElementById('mixedVectorSelect');
                const val = mixedSel ? mixedSel.value : null;
                const reqOk = App.requireVectors ? App.requireVectors() : null;
                return {
                    dropdownValue: val,
                    requireVectorsAllowed: reqOk
                };
            })()`,
            returnByValue: true
        });
        console.log('Check 1 result:', check1);
        if (check1.dropdownValue !== 'nori_entity' || !check1.requireVectorsAllowed) {
            throw new Error('Check 1 failed: Nori is not default or requireVectors blocked the user!');
        }

        // 2. Verify 2D Nori Transform as Special Entity (ZERO arrow, ZERO lines)
        console.log('\n[Check 2] Checking 2D Nori Linear Transform (No vector arrows/cables)...');
        const check2 = await send('Runtime.evaluate', {
            expression: `(function() {
                App.mode = '2D';
                if (Vec2D.show2D) Vec2D.show2D();
                
                // Set matrix A = [[1.2, 0.3], [0.3, 0.8]]
                App.matrixList = [{
                    id: 'mat_test',
                    name: 'A',
                    values: [[1.2, 0.3], [0.3, 0.8]]
                }];
                if (App.refreshMixedCalcOptions) App.refreshMixedCalcOptions();
                const matSel = document.getElementById('mixedMatrixSelect');
                const vecSel = document.getElementById('mixedVectorSelect');
                if (matSel) matSel.value = 'mat_test';
                if (vecSel) vecSel.value = 'nori_entity';
                
                // Trigger calculation and animation
                App.runMixedCalc(true);

                const lt = App.LinearTransform;
                const isLtActive = lt ? lt.isActive() : false;
                const targetVecsCount = lt ? lt.targetVectors.length : -1;
                const resBox = document.getElementById('mixedResultBox');
                const hasNoriTitle = resBox ? resBox.innerHTML.includes('BIẾN ĐỔI LINH VẬT NORI') : false;
                const hasResetBtn = resBox ? !!resBox.querySelector('#btnResetNoriTransform') : false;

                return {
                    isLtActive,
                    targetVecsCount,
                    hasNoriTitle,
                    hasResetBtn
                };
            })()`,
            returnByValue: true
        });
        console.log('Check 2 result:', check2);
        if (!check2.isLtActive || check2.targetVecsCount !== 0 || !check2.hasNoriTitle || !check2.hasResetBtn) {
            throw new Error('Check 2 failed: LinearTransform was not started with empty target vectors or result box missing!');
        }

        // Capture 2D screenshot during transform
        await new Promise(r => setTimeout(r, 600));
        let shot2D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_final_2d_transform.png', Buffer.from(shot2D.data, 'base64'));
        console.log('Saved 2D Transform screenshot!');

        // 3. Verify 3D Nori Figurine Structure
        console.log('\n[Check 3] Checking 3D Nori Figurine Structure and Meshes...');
        const check3 = await send('Runtime.evaluate', {
            expression: `(function() {
                if (App.mode === '2D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                App.noriEntityActive = true;
                if (Vec3D.draw3DAllVectors) Vec3D.draw3DAllVectors();

                const grp = Vec3D._nori3DGroup;
                const front = grp?.getObjectByName('noriFrontMesh');
                const back = grp?.getObjectByName('noriBackMesh');
                const core = grp?.getObjectByName('noriCoreMesh');
                const tail = grp?.getObjectByName('noriTailMesh');
                const shadow = grp?.getObjectByName('noriShadowMesh');

                return {
                    hasGroup: !!grp,
                    hasFront: !!front,
                    hasBack: !!back,
                    hasCore: !!core,
                    hasTail: !!tail,
                    hasShadow: !!shadow,
                    frontHasTex: !!front?.material?.map,
                    backHasTex: !!back?.material?.map
                };
            })()`,
            returnByValue: true
        });
        console.log('Check 3 result:', check3);
        if (!check3.hasGroup || !check3.hasFront || !check3.hasBack || !check3.hasCore || !check3.hasTail || !check3.hasShadow) {
            throw new Error('Check 3 failed: 3D Nori Figurine is missing required meshes!');
        }

        // Capture 3D screenshot
        await new Promise(r => setTimeout(r, 600));
        let shot3D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_final_3d_view.png', Buffer.from(shot3D.data, 'base64'));
        console.log('Saved 3D View screenshot!');

        // 4. Verify 3D Matrix Transformation on Nori (e.g. 3x3 rotation / scaling)
        console.log('\n[Check 4] Checking 3D Matrix Transformation on Nori...');
        const check4 = await send('Runtime.evaluate', {
            expression: `(function() {
                App.matrixList = [{
                    id: 'mat_3d_rot',
                    name: 'R',
                    values: [
                        [0, -1, 0],
                        [1,  0, 0],
                        [0,  0, 1]
                    ]
                }];
                if (App.refreshMixedCalcOptions) App.refreshMixedCalcOptions();
                const matSel = document.getElementById('mixedMatrixSelect');
                const vecSel = document.getElementById('mixedVectorSelect');
                if (matSel) matSel.value = 'mat_3d_rot';
                if (vecSel) vecSel.value = 'nori_entity';

                App.runMixedCalc(true);

                const lt = App.LinearTransform;
                return {
                    dim: lt ? lt.dim : null,
                    active: lt ? lt.isActive() : false,
                    targetVectorsLength: lt ? lt.targetVectors.length : -1
                };
            })()`,
            returnByValue: true
        });
        console.log('Check 4 result:', check4);
        if (check4.dim !== 3 || !check4.active || check4.targetVectorsLength !== 0) {
            throw new Error('Check 4 failed: 3D Nori transform did not start properly or had non-empty target vectors!');
        }

        await new Promise(r => setTimeout(r, 800));
        let shot3DTrans = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_final_3d_transform.png', Buffer.from(shot3DTrans.data, 'base64'));
        console.log('Saved 3D Transform screenshot!');

        ws.close();
        edge.kill();
        console.log('\n>>> ALL 4 CHECKS PASSED PERFECTLY! <<<');
    } catch(e) {
        edge.kill();
        console.error('VERIFICATION ERROR:', e);
        process.exit(1);
    }
}
verifyAll();
