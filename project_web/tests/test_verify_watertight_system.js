const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testVerifyWatertightSystem() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9264',
        '--window-size=1280,850',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9264/json', res => {
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
                        resolve(data.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 1200));

        // Switch to 3D and enable Nori through standard app functions
        console.log('Switching to 3D and enabling Nori entity...');
        const initRes = await send('Runtime.evaluate', {
            expression: `(function() {
                if (App.mode === '2D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                if (!App.noriEntityActive && typeof App.toggleNoriEntity === 'function') {
                    App.toggleNoriEntity();
                }

                const group = Vec3D._nori3DGroup;
                const figurine = group ? group.getObjectByName('noriSolidFigurine') : null;
                const shadow = group ? group.getObjectByName('noriShadowMesh') : null;

                // Check for any old hacky meshes
                const hasCore = !!(group && group.getObjectByName('noriCoreMesh'));
                const hasTail = !!(group && group.getObjectByName('noriTailMesh'));
                const hasFrontMesh = !!(group && group.getObjectByName('noriFrontMesh'));
                const hasBackMesh = !!(group && group.getObjectByName('noriBackMesh'));

                return {
                    hasGroup: !!group,
                    hasFigurine: !!figurine,
                    hasShadow: !!shadow,
                    isOldHackGone: !hasCore && !hasTail && !hasFrontMesh && !hasBackMesh,
                    matCount: figurine ? figurine.material.length : 0
                };
            })()`,
            returnByValue: true
        });
        console.log('Init status:', initRes.result.value);

        // 1. Capture 45-degree angle
        console.log('Capturing 45-degree perspective...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.style.display = 'none'; // hide for full viewport snapshot
                if (Vec3D._resetAnimId) {
                    cancelAnimationFrame(Vec3D._resetAnimId);
                    Vec3D._resetAnimId = null;
                }
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(4.2, 4.2, 2.8);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_verified_angle.png', Buffer.from(shotAngle.data, 'base64'));

        // 2. Capture SIDE PROFILE (90-degree side!)
        console.log('Capturing 90-degree Side Profile (Comparing with user screenshot)...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(4.8, 0.05, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotSide = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_verified_side.png', Buffer.from(shotSide.data, 'base64'));

        // 3. Capture FRONT VIEW
        console.log('Capturing Front View...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.05, 4.8, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_verified_front.png', Buffer.from(shotFront.data, 'base64'));

        // 4. Test Matrix Transformation (Stretch & Shear)
        console.log('Testing 3D Transformation...');
        const transRes = await send('Runtime.evaluate', {
            expression: `(function() {
                const M = [
                    [1.3, 0.2, 0],
                    [0, 1.0, 0],
                    [0.1, 0, 1.2]
                ];
                App.animateNoriTransform(M, 100);
                return {
                    isLT: !!(App.LinearTransform && App.LinearTransform.isActive()),
                    hasTransformGroup: !!(Vec3D._transformGroup && Vec3D._transformGroup.parent)
                };
            })()`,
            returnByValue: true
        });
        console.log('Transform check:', transRes.result.value);

        await new Promise(r => setTimeout(r, 300));
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(4.2, 4.2, 2.8);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotTransformed = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_verified_transformed.png', Buffer.from(shotTransformed.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('Verification completed successfully!');
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testVerifyWatertightSystem();
