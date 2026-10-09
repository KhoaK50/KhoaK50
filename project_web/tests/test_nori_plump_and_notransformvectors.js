const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testNoriPlumpAndCleanTransform() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9256',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9256/json', res => {
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

        // 1. Switch to 3D and enable Nori
        console.log('Switching to 3D mode and enabling Nori entity...');
        const initRes = await send('Runtime.evaluate', {
            expression: `(function() {
                if (App.mode === '2D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                if (!App.noriEntityActive && typeof App.toggleNoriEntity === 'function') {
                    App.toggleNoriEntity();
                }
                const group = Vec3D._nori3DGroup;
                const frontMesh = group ? group.getObjectByName('noriFrontMesh') : null;
                const backMesh = group ? group.getObjectByName('noriBackMesh') : null;
                const coreMesh = group ? group.getObjectByName('noriCoreMesh') : null;
                const shadowMesh = group ? group.getObjectByName('noriShadowMesh') : null;

                return {
                    hasGroup: !!group,
                    hasFront: !!frontMesh,
                    hasBack: !!backMesh,
                    hasCore: !!coreMesh,
                    shadowScale: shadowMesh ? [shadowMesh.scale.x, shadowMesh.scale.y] : null,
                    coreScale: coreMesh ? [coreMesh.scale.x, coreMesh.scale.y, coreMesh.scale.z] : null
                };
            })()`,
            returnByValue: true
        });
        console.log('3D Figurine initialization:', initRes.result.value);

        // 2. Set camera angle to see Chubby thickness and oval shadow
        console.log('Capturing 3D Chubby Perspective...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (Vec3D._resetAnimId) {
                    cancelAnimationFrame(Vec3D._resetAnimId);
                    Vec3D._resetAnimId = null;
                }
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(2.8, 2.5, 1.8);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shot3D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_nori_chubby_3d.png', Buffer.from(shot3D.data, 'base64'));

        // 3. Capture Side Profile (thickness check)
        console.log('Capturing Side Profile...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(3.2, 0.05, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotSide = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_nori_chubby_side.png', Buffer.from(shotSide.data, 'base64'));

        // 4. Test Matrix Transformation on Nori in 3D:
        console.log('Testing 3D Transformation on Nori...');
        const transformRes = await send('Runtime.evaluate', {
            expression: `(function() {
                // Apply a 3D scaling + shear matrix
                const M3 = [
                    [1.4, 0.2, 0],
                    [0, 1.0, 0],
                    [0, 0.3, 1.2]
                ];
                // Call animateNoriTransform directly
                App.animateNoriTransform(M3, 100);
                
                return {
                    linearTransformActive: !!(App.LinearTransform && App.LinearTransform.isActive()),
                    hasTransformGroup: !!(Vec3D._transformGroup && Vec3D._transformGroup.parent),
                    activeMatrix: App.activeNoriTransformMatrix
                };
            })()`,
            returnByValue: true
        });
        console.log('Transform status:', transformRes.result.value);

        await new Promise(r => setTimeout(r, 300));
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(2.8, 2.5, 1.8);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shot3DTransformed = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_nori_transformed_3d_clean.png', Buffer.from(shot3DTransformed.data, 'base64'));

        // 5. Switch to 2D and test 2D Transformation on Nori:
        console.log('Testing 2D Transformation on Nori...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (App.mode === '3D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                const M2 = [
                    [1.3, 0.4],
                    [0.1, 1.1]
                ];
                App.animateNoriTransform(M2, 100);
            })()`
        });
        await new Promise(r => setTimeout(r, 300));
        let shot2DTransformed = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_nori_transformed_2d_clean.png', Buffer.from(shot2DTransformed.data, 'base64'));

        // 6. Test Reset
        console.log('Testing Reset...');
        const resetCheck = await send('Runtime.evaluate', {
            expression: `(function() {
                const btnReset = document.getElementById('btnResetNoriTransform');
                if (btnReset) {
                    btnReset.click();
                } else {
                    App.activeNoriTransformMatrix = null;
                    if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
                }
                return {
                    matrixCleared: App.activeNoriTransformMatrix === null,
                    linearTransformActive: !!(App.LinearTransform && App.LinearTransform.isActive())
                };
            })()`,
            returnByValue: true
        });
        console.log('Reset check:', resetCheck.result.value);

        ws.close();
        edge.kill();
        console.log('Test completed successfully!');
    } catch (e) {
        edge.kill();
        console.error(e);
    }
}
testNoriPlumpAndCleanTransform();
