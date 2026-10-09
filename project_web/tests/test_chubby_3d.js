const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testChubby3D() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9255',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9255/json', res => {
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
        await new Promise(r => setTimeout(r, 1000));

        await send('Runtime.evaluate', {
            expression: `(function() {
                if (App.mode === '2D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                App.noriEntityActive = true;

                if (Vec3D._nori3DGroup) {
                    Vec3D._nori3DGroup.parent?.remove(Vec3D._nori3DGroup);
                    Vec3D._nori3DGroup = null;
                }

                const group = new THREE.Group();
                group.name = 'noriHamster3D';

                const W = 2.0;
                const H = 2.0;
                const D = 0.70; // Chubby plump depth!
                const halfD = D / 2;

                const frontTex = Vec3D.getNoriFrontTexture('RELAXED');
                const backTex = Vec3D.getNoriBackTexture();

                // 1. CURVED CONVEX FRONT MESH (Bulges forward in 3D)
                const nx = 20, nz = 20;
                const frontPositions = [];
                const frontUvs = [];
                const frontIndices = [];

                for (let j = 0; j <= nz; j++) {
                    const v = j / nz;
                    const z = v * H;
                    for (let i = 0; i <= nx; i++) {
                        const u = i / nx;
                        // Left is +X, Right is -X when viewed from +Y
                        const x = (0.5 - u) * W;
                        // Normalized coordinates from center
                        const dx = (u - 0.5) * 2;
                        const dz = (v - 0.5) * 2;
                        const distSq = dx * dx + dz * dz;
                        // Pillow bulge factor
                        const bulge = Math.max(0, 1 - distSq * 0.75);
                        const y = 0.06 + Math.sqrt(bulge) * (halfD - 0.06);

                        frontPositions.push(x, y, z);
                        frontUvs.push(u, v);
                    }
                }

                for (let j = 0; j < nz; j++) {
                    for (let i = 0; i < nx; i++) {
                        const a = j * (nx + 1) + i;
                        const b = j * (nx + 1) + (i + 1);
                        const c = (j + 1) * (nx + 1) + i;
                        const d = (j + 1) * (nx + 1) + (i + 1);
                        // CCW when viewed from +Y
                        frontIndices.push(a, b, d);
                        frontIndices.push(a, d, c);
                    }
                }

                const frontGeo = new THREE.BufferGeometry();
                frontGeo.setAttribute('position', new THREE.Float32BufferAttribute(frontPositions, 3));
                frontGeo.setAttribute('uv', new THREE.Float32BufferAttribute(frontUvs, 2));
                frontGeo.setIndex(frontIndices);
                frontGeo.computeVertexNormals();

                const frontMat = new THREE.MeshStandardMaterial({
                    map: frontTex,
                    transparent: true,
                    alphaTest: 0.02,
                    side: THREE.FrontSide,
                    roughness: 0.45,
                    metalness: 0.02
                });
                const frontMesh = new THREE.Mesh(frontGeo, frontMat);
                frontMesh.name = 'noriFrontMesh';
                group.add(frontMesh);

                // 2. CURVED CONVEX BACK MESH (Bulges backward in 3D)
                const backPositions = [];
                const backUvs = [];
                const backIndices = [];

                for (let j = 0; j <= nz; j++) {
                    const v = j / nz;
                    const z = v * H;
                    for (let i = 0; i <= nx; i++) {
                        const u = i / nx;
                        // Left is -X, Right is +X when viewed from -Y
                        const x = (u - 0.5) * W;
                        const dx = (u - 0.5) * 2;
                        const dz = (v - 0.5) * 2;
                        const distSq = dx * dx + dz * dz;
                        const bulge = Math.max(0, 1 - distSq * 0.75);
                        const y = -0.06 - Math.sqrt(bulge) * (halfD - 0.06);

                        backPositions.push(x, y, z);
                        backUvs.push(u, v);
                    }
                }

                for (let j = 0; j < nz; j++) {
                    for (let i = 0; i < nx; i++) {
                        const a = j * (nx + 1) + i;
                        const b = j * (nx + 1) + (i + 1);
                        const c = (j + 1) * (nx + 1) + i;
                        const d = (j + 1) * (nx + 1) + (i + 1);
                        // CCW when viewed from -Y
                        backIndices.push(a, b, d);
                        backIndices.push(a, d, c);
                    }
                }

                const backGeo = new THREE.BufferGeometry();
                backGeo.setAttribute('position', new THREE.Float32BufferAttribute(backPositions, 3));
                backGeo.setAttribute('uv', new THREE.Float32BufferAttribute(backUvs, 2));
                backGeo.setIndex(backIndices);
                backGeo.computeVertexNormals();

                const backMat = new THREE.MeshStandardMaterial({
                    map: backTex,
                    transparent: true,
                    alphaTest: 0.02,
                    side: THREE.FrontSide,
                    roughness: 0.45,
                    metalness: 0.02
                });
                const backMesh = new THREE.Mesh(backGeo, backMat);
                backMesh.name = 'noriBackMesh';
                group.add(backMesh);

                // 3. SOLID CHUBBY INNER BODY (Fills depth between curved caps)
                const coreGeo = new THREE.SphereGeometry(0.80, 32, 24);
                const coreMat = new THREE.MeshStandardMaterial({
                    color: 0xf59e0b,
                    roughness: 0.55,
                    metalness: 0.02
                });
                const coreMesh = new THREE.Mesh(coreGeo, coreMat);
                coreMesh.name = 'noriCoreMesh';
                coreMesh.scale.set(0.92, halfD * 0.95, 0.88);
                coreMesh.position.set(0, 0, H * 0.48);
                group.add(coreMesh);

                // 4. FLUFFY POM-POM TAIL AT THE BACK
                const tailGeo = new THREE.SphereGeometry(0.18, 20, 16);
                const tailMat = new THREE.MeshStandardMaterial({
                    color: 0xfefae0,
                    roughness: 0.85,
                    metalness: 0.0
                });
                const tailMesh = new THREE.Mesh(tailGeo, tailMat);
                tailMesh.name = 'noriTailMesh';
                tailMesh.position.set(0, -halfD - 0.12, 0.52);
                tailMesh.scale.set(1.0, 0.9, 1.0);
                group.add(tailMesh);

                // 5. NATURAL OVAL GROUND SHADOW (Matching chubby proportions)
                // Width = 1.3, Depth = 0.85 (Proportional to body!)
                const shadowGeo = new THREE.CircleGeometry(0.65, 32);
                const shadowMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.26,
                    depthWrite: false
                });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.name = 'noriShadowMesh';
                shadowMesh.scale.set(1.05, 0.68, 1.0); // Natural oval contact shadow
                shadowMesh.position.set(0, 0, 0.005);
                group.add(shadowMesh);

                Vec3D._nori3DGroup = group;
                Vec3D._mathGroup.add(group);

                return { success: true };
            })()`
        });

        // 1. Capture SIDE PROFILE view (to check chubby thickness!)
        console.log('Capturing Side Profile...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (Vec3D._resetAnimId) {
                    cancelAnimationFrame(Vec3D._resetAnimId);
                    Vec3D._resetAnimId = null;
                }
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(3.2, 0.1, 1.0); // Side view looking along X
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotSide = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_chubby_side.png', Buffer.from(shotSide.data, 'base64'));

        // 2. Capture 45-degree PERSPECTIVE view
        console.log('Capturing 45-degree Perspective...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(2.4, 2.6, 1.8);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_chubby_angle.png', Buffer.from(shotAngle.data, 'base64'));

        // 3. Capture FRONT view
        console.log('Capturing Front view...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.2, 3.2, 1.1);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_chubby_front.png', Buffer.from(shotFront.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('Test complete!');
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testChubby3D();
