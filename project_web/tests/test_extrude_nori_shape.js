const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testExtrudeNoriShape() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9263',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9263/json', res => {
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

        console.log('Building ExtrudeGeometry Figurine...');
        const res = await send('Runtime.evaluate', {
            expression: `(function() {
                try {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.style.display = 'none';

                if (App.mode === '2D' && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
                App.noriEntityActive = true;

                if (Vec3D._nori3DGroup) {
                    Vec3D._nori3DGroup.parent?.remove(Vec3D._nori3DGroup);
                    Vec3D._nori3DGroup = null;
                }

                // 1. Render front texture
                const frontTex = Vec3D.getNoriFrontTexture('RELAXED');
                const backTex = Vec3D.getNoriBackTexture();

                // 2. Extract contour from canvas
                const cv = document.createElement('canvas');
                cv.width = 512;
                cv.height = 512;
                const ctx = cv.getContext('2d');
                Vec2D.renderNoriToCanvas(cv, 'RELAXED', false);
                const img = ctx.getImageData(0, 0, 512, 512);
                const d = img.data;

                const cx = 256, cy = 265;
                const numAngles = 100;
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

                // Smooth contour slightly to remove raymarching pixel stepping
                const smoothed = [];
                for (let i = 0; i < numAngles; i++) {
                    const prev = poly[(i - 1 + numAngles) % numAngles];
                    const curr = poly[i];
                    const next = poly[(i + 1) % numAngles];
                    smoothed.push({
                        x: (prev.x + curr.x * 2 + next.x) / 4,
                        y: (prev.y + curr.y * 2 + next.y) / 4
                    });
                }

                const W = 2.0, H = 2.0;
                const D = 0.46; // Solid thick figurine depth

                // Create THREE.Shape in (X, Y) plane
                const shape = new THREE.Shape();
                for (let i = 0; i < numAngles; i++) {
                    const p = smoothed[i];
                    const u = p.x / 512;
                    const v = 1 - (p.y / 512);
                    // Map to 3D world: X in [-1, 1], Y in [0, 2]
                    const sx = (0.5 - u) * W;
                    const sy = v * H;
                    if (i === 0) shape.moveTo(sx, sy);
                    else shape.lineTo(sx, sy);
                }
                shape.closePath();

                // Extrude geometry along depth
                const extrudeSettings = {
                    steps: 1,
                    depth: D,
                    bevelEnabled: true,
                    bevelThickness: 0.08,
                    bevelSize: 0.06,
                    bevelOffset: 0,
                    bevelSegments: 4
                };
                const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

                // Rotate and translate so:
                // Extrusion depth is along Y (depth in world: -halfD to +halfD)
                // Shape X is X in world
                // Shape Y is Z (height in world)
                geom.rotateX(Math.PI / 2); // now Z became Y, Y became Z
                geom.translate(0, -D / 2 - 0.08, 0); // center depth at Y = 0

                // Generate accurate UVs for front face, back face, and sides
                const pos = geom.attributes.position;
                const uvs = new Float32Array(pos.count * 2);

                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    const z = pos.getZ(i);

                    // Front face is at +Y (y > 0)
                    // Back face is at -Y (y < 0)
                    if (y >= 0) {
                        // Map front face: u in [0, 1] (left is +X), v in [0, 1] (up is +Z)
                        const u = 0.5 - (x / W);
                        const v = z / H;
                        uvs[i * 2] = u;
                        uvs[i * 2 + 1] = v;
                    } else {
                        // Map back face: mirrored X
                        const u = 0.5 + (x / W);
                        const v = z / H;
                        uvs[i * 2] = u;
                        uvs[i * 2 + 1] = v;
                    }
                }
                geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                geom.computeVertexNormals();

                // Material groups in ExtrudeGeometry:
                // Split into Front (normal +Y), Back (normal -Y), and Side (perimeter wall)
                const normal = geom.attributes.normal;
                const numVerts = pos.count;
                const frontIndices = [];
                const backIndices = [];
                const sideIndices = [];

                for (let i = 0; i < numVerts; i += 3) {
                    const ny = (normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3;

                    if (ny > 0.45) {
                        frontIndices.push(i, i + 1, i + 2);
                    } else if (ny < -0.45) {
                        backIndices.push(i, i + 1, i + 2);
                    } else {
                        sideIndices.push(i, i + 1, i + 2);
                    }
                }

                const newIndices = [...frontIndices, ...backIndices, ...sideIndices];
                geom.setIndex(newIndices);

                geom.clearGroups();
                geom.addGroup(0, frontIndices.length, 0); // Front material
                geom.addGroup(frontIndices.length, backIndices.length, 1); // Back material
                geom.addGroup(frontIndices.length + backIndices.length, sideIndices.length, 2); // Side fur material

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
                    metalness: 0.03
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
                    frontTris: frontIndices.length / 3,
                    backTris: backIndices.length / 3,
                    sideTris: sideIndices.length / 3
                };
                } catch(err) {
                    return { error: err.message, stack: err.stack };
                }
            })()`,
            returnByValue: true
        });

        console.log('Build status:', res.result.value);

        // 1. Capture 45-degree angle
        console.log('Capturing 45-degree angle...');
        await send('Runtime.evaluate', {
            expression: `(function() {
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
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_extrude_angle.png', Buffer.from(shotAngle.data, 'base64'));

        // 2. Capture 90-degree Side Profile
        console.log('Capturing 90-degree Side Profile...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(5.0, 0.05, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotSide = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_extrude_side.png', Buffer.from(shotSide.data, 'base64'));

        // 3. Capture Front View
        console.log('Capturing Front View...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.05, 5.0, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_extrude_front.png', Buffer.from(shotFront.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('Extrude test completed successfully!');
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testExtrudeNoriShape();
