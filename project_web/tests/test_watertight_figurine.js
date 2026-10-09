const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testWatertightFigurine() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9262',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9262/json', res => {
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
        await new Promise(r => setTimeout(r, 1000));

        // Build Watertight Figurine Mesh in browser
        console.log('Building Watertight Figurine Mesh...');
        const res = await send('Runtime.evaluate', {
            expression: `(function() {
                if (App.mode === '2D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                App.noriEntityActive = true;

                if (Vec3D._nori3DGroup) {
                    Vec3D._nori3DGroup.parent?.remove(Vec3D._nori3DGroup);
                    Vec3D._nori3DGroup = null;
                }

                // 1. Render front and back textures without ground shadow
                const frontTex = Vec3D.getNoriFrontTexture('RELAXED');
                const backTex = Vec3D.getNoriBackTexture();

                // 2. Extract 2D boundary polygon from canvas
                const cv = document.createElement('canvas');
                cv.width = 512;
                cv.height = 512;
                const ctx = cv.getContext('2d');
                Vec2D.renderNoriToCanvas(cv, 'RELAXED', false);
                const img = ctx.getImageData(0, 0, 512, 512);
                const d = img.data;

                const cx = 256, cy = 265;
                const numAngles = 96;
                const poly = [];
                for (let i = 0; i < numAngles; i++) {
                    const angle = (i / numAngles) * Math.PI * 2;
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);
                    let lastR = 0;
                    for (let r = 10; r < 245; r += 1.5) {
                        const px = Math.round(cx + r * cosA);
                        const py = Math.round(cy + r * sinA);
                        if (px < 0 || px >= 512 || py < 0 || py >= 512) break;
                        const a = d[(py * 512 + px) * 4 + 3];
                        if (py > 440 && a < 120) continue; // ignore bottom soft shadow
                        if (a > 50) lastR = r;
                    }
                    poly.push({ x: cx + lastR * cosA, y: cy + lastR * sinA });
                }

                // Convert canvas pixels to 3D world coordinates
                // Canvas: (0, 0) top-left, (512, 512) bottom-right
                // 3D World: X in [-1, 1], Z in [0, 2]
                const W = 2.0, H = 2.0;
                const D = 0.52; // Solid figurine depth!
                const halfD = D / 2;

                const pts3D = poly.map(p => {
                    const u = p.x / 512;
                    const v = 1 - (p.y / 512); // invert Y to Z
                    const x = (0.5 - u) * W;    // left is +X, right is -X
                    const z = v * H;
                    return { x, z, u, v };
                });

                // Center point in 3D
                const centerU = cx / 512;
                const centerV = 1 - (cy / 512);
                const centerX = (0.5 - centerU) * W;
                const centerZ = centerV * H;

                // 3. Build geometry:
                // We have:
                // - Front cap: center vertex + N perimeter vertices (triangle fan)
                // - Back cap: center vertex + N perimeter vertices (triangle fan)
                // - Side walls: 2 * N quads connecting front rim to back rim
                const positions = [];
                const uvs = [];
                const indices = [];

                // --- FRONT CAP ---
                // Vertex 0: Front Center (bulged out slightly for chubby feel)
                const frontCenterIdx = 0;
                positions.push(centerX, halfD + 0.12, centerZ);
                uvs.push(centerU, 1 - centerV);

                // Front perimeter vertices: 1 to numAngles
                for (let i = 0; i < numAngles; i++) {
                    const p = pts3D[i];
                    positions.push(p.x, halfD, p.z);
                    uvs.push(p.u, 1 - p.v);
                }

                // Front fan triangles: CCW when viewed from +Y
                for (let i = 0; i < numAngles; i++) {
                    const next = (i + 1) % numAngles;
                    indices.push(frontCenterIdx, 1 + next, 1 + i);
                }

                // --- BACK CAP ---
                const backCenterIdx = positions.length / 3;
                positions.push(-centerX, -halfD - 0.12, centerZ);
                uvs.push(1 - centerU, 1 - centerV);

                const backStartIdx = positions.length / 3;
                // Back perimeter vertices (mirrored X for back view)
                for (let i = 0; i < numAngles; i++) {
                    const p = pts3D[i];
                    positions.push(-p.x, -halfD, p.z);
                    uvs.push(1 - p.u, 1 - p.v);
                }

                // Back fan triangles: CCW when viewed from -Y
                for (let i = 0; i < numAngles; i++) {
                    const next = (i + 1) % numAngles;
                    indices.push(backCenterIdx, backStartIdx + i, backStartIdx + next);
                }

                // --- SIDE WALLS (Connecting Front Rim directly to Back Rim) ---
                // For each perimeter segment, connect front vertex to back vertex!
                const sideStartIdx = positions.length / 3;
                // Duplicate perimeter vertices for crisp normals on side walls
                for (let i = 0; i < numAngles; i++) {
                    const p = pts3D[i];
                    // Front rim vertex
                    positions.push(p.x, halfD, p.z);
                    uvs.push(i / numAngles, 1);
                    // Back rim vertex
                    positions.push(-p.x, -halfD, p.z);
                    uvs.push(i / numAngles, 0);
                }

                for (let i = 0; i < numAngles; i++) {
                    const next = (i + 1) % numAngles;
                    const f0 = sideStartIdx + i * 2;
                    const b0 = sideStartIdx + i * 2 + 1;
                    const f1 = sideStartIdx + next * 2;
                    const b1 = sideStartIdx + next * 2 + 1;

                    // Quad: (f0, b0, b1) and (f0, b1, f1)
                    indices.push(f0, b0, b1);
                    indices.push(f0, b1, f1);
                }

                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geom.setIndex(indices);
                geom.computeVertexNormals();

                // Define 3 Material Groups on the Geometry:
                // Group 0: Front cap triangles -> Front Material
                // Group 1: Back cap triangles -> Back Material
                // Group 2: Side wall triangles -> Side Golden Fur Material
                const frontTriCount = numAngles;
                const backTriCount = numAngles;
                const sideTriCount = numAngles * 2;

                geom.clearGroups();
                geom.addGroup(0, frontTriCount * 3, 0);
                geom.addGroup(frontTriCount * 3, backTriCount * 3, 1);
                geom.addGroup((frontTriCount + backTriCount) * 3, sideTriCount * 3, 2);

                const frontMat = new THREE.MeshStandardMaterial({
                    map: frontTex,
                    roughness: 0.40,
                    metalness: 0.02
                });
                const backMat = new THREE.MeshStandardMaterial({
                    map: backTex,
                    roughness: 0.40,
                    metalness: 0.02
                });
                const sideMat = new THREE.MeshStandardMaterial({
                    color: 0xf59e0b,
                    roughness: 0.35,
                    metalness: 0.05
                });

                const figurineMesh = new THREE.Mesh(geom, [frontMat, backMat, sideMat]);
                figurineMesh.name = 'noriSolidFigurine';

                const group = new THREE.Group();
                group.name = 'noriHamster3D';
                group.add(figurineMesh);

                // Ground Contact Shadow
                const shadowGeo = new THREE.CircleGeometry(0.65, 32);
                const shadowMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.24,
                    depthWrite: false
                });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.name = 'noriShadowMesh';
                shadowMesh.scale.set(1.05, 0.68, 1.0);
                shadowMesh.position.set(0, 0, 0.005);
                group.add(shadowMesh);

                Vec3D._nori3DGroup = group;
                Vec3D._mathGroup.add(group);

                return {
                    success: true,
                    vertexCount: positions.length / 3,
                    triCount: indices.length / 3
                };
            })()`,
            returnByValue: true
        });

        console.log('Build status:', res.result.value);

        // 1. Capture 45-degree angle
        console.log('Capturing 45-degree angle...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.style.display = 'none'; // hide sidebar to see full 3D canvas
                if (Vec3D._resetAnimId) {
                    cancelAnimationFrame(Vec3D._resetAnimId);
                    Vec3D._resetAnimId = null;
                }
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(4.5, 4.5, 3.2);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_watertight_angle.png', Buffer.from(shotAngle.data, 'base64'));

        // 2. Capture SIDE PROFILE view (90-degree side!)
        console.log('Capturing 90-degree Side Profile...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(5.5, 0.05, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotSide = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_watertight_side.png', Buffer.from(shotSide.data, 'base64'));

        // 3. Capture FRONT view
        console.log('Capturing Front View...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.05, 5.5, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_watertight_front.png', Buffer.from(shotFront.data, 'base64'));

        // 4. Capture BACK view
        console.log('Capturing Back View...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.05, -5.5, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotBack = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_watertight_back.png', Buffer.from(shotBack.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('Test completed successfully!');
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testWatertightFigurine();
