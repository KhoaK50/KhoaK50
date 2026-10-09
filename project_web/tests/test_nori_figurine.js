const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testFigurine() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9235',
        '--window-size=1200,800',
        '--disable-gpu',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9235/json', res => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
        const targetPage = pages.find(p => p.type === 'page' && p.url.includes('calculation.html'));
        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

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
        await new Promise(r => setTimeout(r, 1500));

        const testRes = await send('Runtime.evaluate', {
            expression: `(function() {
                App.mode = '3D';
                if (Vec3D.init3D) Vec3D.init3D();
                Vec3D.show3D();
                App.noriEntityActive = true;

                // Use Vec2D.renderNoriToCanvas for 100% CANONICAL 1:1 TEXTURES
                function getCanonTex(state) {
                    const cv = document.createElement('canvas');
                    cv.width = 1024;
                    cv.height = 1024;
                    Vec2D.renderNoriToCanvas(cv, state, false);
                    const tex = new THREE.CanvasTexture(cv);
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    return tex;
                }

                if (Vec3D._nori3DGroup) {
                    Vec3D._nori3DGroup.parent?.remove(Vec3D._nori3DGroup);
                    Vec3D._nori3DGroup = null;
                }

                const group = new THREE.Group();
                group.name = 'noriHamster3D';

                const W = 1.8, H = 1.8, D = 0.12;
                const frontTex = getCanonTex('RELAXED');
                const backTex = getCanonTex('BACKSIDE');

                // FRONT PLANE (Facing +Y)
                const frontGeo = new THREE.PlaneGeometry(W, H);
                const frontMat = new THREE.MeshStandardMaterial({
                    map: frontTex,
                    transparent: true,
                    alphaTest: 0.05,
                    side: THREE.FrontSide,
                    roughness: 0.45,
                    metalness: 0.02
                });
                const frontMesh = new THREE.Mesh(frontGeo, frontMat);
                frontMesh.name = 'noriFrontMesh';
                frontMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
                frontMesh.position.set(0, D / 2, 0.95);
                group.add(frontMesh);

                // BACK PLANE (Facing -Y)
                const backGeo = new THREE.PlaneGeometry(W, H);
                const backMat = new THREE.MeshStandardMaterial({
                    map: backTex,
                    transparent: true,
                    alphaTest: 0.05,
                    side: THREE.FrontSide,
                    roughness: 0.45,
                    metalness: 0.02
                });
                const backMesh = new THREE.Mesh(backGeo, backMat);
                backMesh.name = 'noriBackMesh';
                backMesh.rotation.set(Math.PI / 2, 0, 0); // Normal faces -Y
                backMesh.position.set(0, -D / 2, 0.95);
                group.add(backMesh);

                // 3D Fluffy Pom-pom Tail at back
                const tailGeo = new THREE.SphereGeometry(0.16, 20, 16);
                const tailMat = new THREE.MeshStandardMaterial({
                    color: 0xfefae0,
                    roughness: 0.85,
                    metalness: 0.0
                });
                const tailMesh = new THREE.Mesh(tailGeo, tailMat);
                tailMesh.position.set(0, -D / 2 - 0.10, 0.52);
                tailMesh.scale.set(1.0, 0.8, 1.0);
                group.add(tailMesh);

                // 3D Soft Ground Shadow
                const shadowGeo = new THREE.CircleGeometry(0.85, 32);
                const shadowMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.22,
                    depthWrite: false
                });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.position.set(0, 0, 0.005);
                group.add(shadowMesh);

                Vec3D._nori3DGroup = group;
                Vec3D._mathGroup.add(group);

                // Camera at front
                Vec3D._camera.position.set(0, 3.5, 1.1);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
                return { success: true };
            })()`,
            returnByValue: true
        });

        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_canon_front.png', Buffer.from(shotFront.data, 'base64'));

        // Angle view
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._camera.position.set(2.2, 2.5, 1.8);
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_canon_angle.png', Buffer.from(shotAngle.data, 'base64'));

        // Back view
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._camera.position.set(0, -3.5, 1.1);
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotBack = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_canon_back.png', Buffer.from(shotBack.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('Result:', testRes);
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testFigurine();
