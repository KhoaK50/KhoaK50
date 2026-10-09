const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testOrientation() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9245',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9245/json', res => {
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

                // Clear any existing nori group
                if (Vec3D._nori3DGroup) {
                    Vec3D._nori3DGroup.parent?.remove(Vec3D._nori3DGroup);
                    Vec3D._nori3DGroup = null;
                }

                // Create front canvas
                const cvFront = document.createElement('canvas');
                cvFront.width = 1024; cvFront.height = 1024;
                Vec2D.renderNoriToCanvas(cvFront, 'RELAXED', false);
                const frontTex = new THREE.CanvasTexture(cvFront);
                frontTex.minFilter = THREE.LinearFilter;
                frontTex.magFilter = THREE.LinearFilter;

                // Create back canvas
                const cvBack = document.createElement('canvas');
                cvBack.width = 1024; cvBack.height = 1024;
                Vec2D.renderNoriToCanvas(cvBack, 'BACKSIDE', false);
                const backTex = new THREE.CanvasTexture(cvBack);
                backTex.minFilter = THREE.LinearFilter;
                backTex.magFilter = THREE.LinearFilter;

                const group = new THREE.Group();
                group.name = 'noriHamster3D';

                const W = 2.0, H = 2.0;

                // Test FRONT mesh:
                // Camera looks from (+X, +Y, +Z) towards (0, 0, 0).
                // So front plane facing towards camera:
                // Let's create PlaneGeometry with rotation.x = Math.PI / 2
                // When rotation.x = Math.PI / 2: normal is (0, -1, 0).
                // Wait, if camera is at (X > 0, Y > 0), the camera is at +Y!
                // To face camera at +Y, the plane should face +Y!
                // If we use PlaneGeometry and rotate around X by Math.PI / 2,
                // and rotate around Z by Math.PI:
                // Then normal is (0, 1, 0) facing +Y, and U goes right (+X) if we flip or adjust!
                
                // Let's create custom BufferGeometry with explicit vertex positions and UVs:
                // Facing +Y (normal = [0, 1, 0]):
                // Bottom-left: (-W/2, 0, 0), UV: (0, 0)
                // Bottom-right: (W/2, 0, 0), UV: (1, 0)
                // Top-left: (-W/2, 0, H), UV: (0, 1)
                // Top-right: (W/2, 0, H), UV: (1, 1)
                
                // FRONT MESH facing +Y (Normal = [0, 1, 0])
                // Viewed from +Y: Left is +X, Right is -X, Up is +Z
                const frontGeo = new THREE.BufferGeometry();
                const frontPositions = new Float32Array([
                     W/2, 0.08, 0,   // Bottom-left (viewer's left)
                    -W/2, 0.08, 0,   // Bottom-right (viewer's right)
                    -W/2, 0.08, H,   // Top-right
                     W/2, 0.08, 0,   // Bottom-left
                    -W/2, 0.08, H,   // Top-right
                     W/2, 0.08, H    // Top-left
                ]);
                const frontUvs = new Float32Array([
                    0, 0,
                    1, 0,
                    1, 1,
                    0, 0,
                    1, 1,
                    0, 1
                ]);
                frontGeo.setAttribute('position', new THREE.BufferAttribute(frontPositions, 3));
                frontGeo.setAttribute('uv', new THREE.BufferAttribute(frontUvs, 2));
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

                // BACK MESH facing -Y (Normal = [0, -1, 0])
                // Viewed from -Y: Left is -X, Right is +X, Up is +Z
                const backGeo = new THREE.BufferGeometry();
                const backPositions = new Float32Array([
                    -W/2, -0.08, 0,   // Bottom-left (viewer's left from back)
                     W/2, -0.08, 0,   // Bottom-right
                     W/2, -0.08, H,   // Top-right
                    -W/2, -0.08, 0,   // Bottom-left
                     W/2, -0.08, H,   // Top-right
                    -W/2, -0.08, H    // Top-left
                ]);
                const backUvs = new Float32Array([
                    0, 0,
                    1, 0,
                    1, 1,
                    0, 0,
                    1, 1,
                    0, 1
                ]);
                backGeo.setAttribute('position', new THREE.BufferAttribute(backPositions, 3));
                backGeo.setAttribute('uv', new THREE.BufferAttribute(backUvs, 2));
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

                // Rounded Core Body inside the sandwich for smooth 3D figurine rim
                // Half-thickness = 0.78 * 0.07 = 0.055, fully inside [-0.08, 0.08]
                const coreGeo = new THREE.SphereGeometry(0.76, 32, 24);
                const coreMat = new THREE.MeshStandardMaterial({
                    color: 0xf59e0b,
                    roughness: 0.55,
                    metalness: 0.02
                });
                const coreMesh = new THREE.Mesh(coreGeo, coreMat);
                coreMesh.scale.set(0.90, 0.07, 0.88);
                coreMesh.position.set(0, 0, H * 0.48);
                group.add(coreMesh);

                // Pom-pom tail at back:
                const tailGeo = new THREE.SphereGeometry(0.16, 20, 16);
                const tailMat = new THREE.MeshStandardMaterial({
                    color: 0xfefae0,
                    roughness: 0.85
                });
                const tailMesh = new THREE.Mesh(tailGeo, tailMat);
                tailMesh.position.set(0, -0.20, 0.52);
                group.add(tailMesh);

                // Ground shadow:
                const shadowGeo = new THREE.CircleGeometry(0.85, 32);
                const shadowMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.25,
                    depthWrite: false
                });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.position.set(0, 0, 0.005);
                group.add(shadowMesh);

                Vec3D._nori3DGroup = group;
                Vec3D._mathGroup.add(group);

                // Position camera to look directly at front:
                Vec3D._controls.target.set(0, 0, 1.0);
                Vec3D._camera.position.set(0, 3.2, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
                return { success: true };
            })()`
        });

        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_direct_3d_front.png', Buffer.from(shotFront.data, 'base64'));
        console.log('Saved direct 3D Front!');

        // 45 degree angle view (standard user view):
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 1.0);
                Vec3D._camera.position.set(2.2, 2.2, 1.6);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_direct_3d_angle.png', Buffer.from(shotAngle.data, 'base64'));
        console.log('Saved direct 3D Angle!');

        // Back view:
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 1.0);
                Vec3D._camera.position.set(0, -3.2, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotBack = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_direct_3d_back.png', Buffer.from(shotBack.data, 'base64'));
        console.log('Saved direct 3D Back!');

        ws.close();
        edge.kill();
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testOrientation();
