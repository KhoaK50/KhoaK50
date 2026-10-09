const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testTrue3DNori() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9260',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9260/json', res => {
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

        // Build the True 3D Nori Mascot Model
        console.log('Building True 3D Nori Mascot Model...');
        const buildRes = await send('Runtime.evaluate', {
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

                // Materials
                const furMat = new THREE.MeshStandardMaterial({
                    color: 0xf59e0b,
                    roughness: 0.42,
                    metalness: 0.02
                });
                const furDarkMat = new THREE.MeshStandardMaterial({
                    color: 0xd97706,
                    roughness: 0.45,
                    metalness: 0.02
                });
                const bellyMat = new THREE.MeshStandardMaterial({
                    color: 0xfefae0,
                    roughness: 0.50,
                    metalness: 0.01
                });
                const earPinkMat = new THREE.MeshStandardMaterial({
                    color: 0xfecdd3,
                    roughness: 0.60,
                    metalness: 0.0
                });
                const eyeMat = new THREE.MeshStandardMaterial({
                    color: 0x1c1917,
                    roughness: 0.15,
                    metalness: 0.08
                });
                const catchlightMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff
                });
                const browMat = new THREE.MeshStandardMaterial({
                    color: 0x78350f,
                    roughness: 0.5,
                    metalness: 0.0
                });
                const blushMat = new THREE.MeshBasicMaterial({
                    color: 0xf43f5e,
                    transparent: true,
                    opacity: 0.45,
                    depthWrite: false
                });

                // 1. MAIN BODY (Pear-shaped plump chubby volume)
                // Using a modified sphere with vertex deformation for authentic hamster shape
                const bodyGeo = new THREE.SphereGeometry(0.92, 36, 28);
                const pos = bodyGeo.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    let x = pos.getX(i);
                    let y = pos.getY(i);
                    let z = pos.getZ(i);

                    // Deform into pear/egg: wider at bottom (lower z), round cheeks
                    // Normalized z from -1 to 1
                    const nz = z / 0.92;
                    // Pear factor: wider at nz = -0.3, narrower at top nz = +0.7
                    const pearFactor = 1.0 - 0.22 * nz;
                    // Chubby front belly factor (bulge slightly forward along +Y at tummy)
                    const bellyBulge = Math.max(0, 1 - (nz + 0.2) ** 2 * 3) * Math.max(0, y / 0.92) * 0.18;

                    x *= pearFactor * 1.02;
                    y = (y * pearFactor * 0.78) + bellyBulge;
                    z = (z + 0.92) * 0.92; // shift base to near z = 0.15

                    pos.setXYZ(i, x, y, z);
                }
                bodyGeo.computeVertexNormals();
                const bodyMesh = new THREE.Mesh(bodyGeo, furMat);
                bodyMesh.name = 'noriBody';
                bodyMesh.position.set(0, 0, 0.18);
                group.add(bodyMesh);

                // 2. CREAMY BELLY PATCH
                const bellyGeo = new THREE.SphereGeometry(0.58, 28, 20);
                const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
                bellyMesh.scale.set(0.94, 0.18, 0.88);
                bellyMesh.position.set(0, 0.54, 0.78);
                group.add(bellyMesh);

                // 3. EARS (Solid 3D ears with pink inner pads)
                function createEar(isLeft) {
                    const earGroup = new THREE.Group();
                    const sign = isLeft ? -1 : 1;

                    // Outer ear
                    const outerGeo = new THREE.SphereGeometry(0.26, 24, 18);
                    const outerMesh = new THREE.Mesh(outerGeo, furMat);
                    outerMesh.scale.set(1.0, 0.40, 0.95);
                    earGroup.add(outerMesh);

                    // Inner pink pad
                    const innerGeo = new THREE.SphereGeometry(0.16, 20, 16);
                    const innerMesh = new THREE.Mesh(innerGeo, earPinkMat);
                    innerMesh.scale.set(1.0, 0.25, 0.90);
                    innerMesh.position.set(0, 0.08, 0);
                    earGroup.add(innerMesh);

                    earGroup.position.set(sign * 0.62, 0.04, 1.62);
                    earGroup.rotation.set(0.12, 0, -sign * 0.28);
                    return earGroup;
                }
                group.add(createEar(true));
                group.add(createEar(false));

                // 4. FEET (Chubby golden feet at bottom)
                function createFoot(isLeft) {
                    const footGeo = new THREE.SphereGeometry(0.20, 20, 16);
                    const footMesh = new THREE.Mesh(footGeo, furDarkMat);
                    const sign = isLeft ? -1 : 1;
                    footMesh.scale.set(1.15, 1.55, 0.65);
                    footMesh.position.set(sign * 0.35, 0.20, 0.12);
                    footMesh.rotation.set(0.08, 0, sign * 0.15);
                    return footMesh;
                }
                group.add(createFoot(true));
                group.add(createFoot(false));

                // 5. PAWS / HANDS (Cute golden paws on tummy)
                function createPaw(isLeft) {
                    const pawGeo = new THREE.SphereGeometry(0.12, 18, 14);
                    const pawMesh = new THREE.Mesh(pawGeo, furMat);
                    const sign = isLeft ? -1 : 1;
                    pawMesh.scale.set(1.1, 0.85, 0.75);
                    pawMesh.position.set(sign * 0.26, 0.62, 0.74);
                    pawMesh.rotation.set(0.2, sign * 0.4, 0);
                    return pawMesh;
                }
                group.add(createPaw(true));
                group.add(createPaw(false));

                // 6. FLUFFY POM-POM TAIL (At the back)
                const tailGeo = new THREE.SphereGeometry(0.18, 22, 18);
                const tailMesh = new THREE.Mesh(tailGeo, bellyMat);
                tailMesh.scale.set(1.0, 0.92, 0.92);
                tailMesh.position.set(0, -0.66, 0.52);
                group.add(tailMesh);

                // 7. ROSY BLUSH (Cheeks)
                function createBlush(isLeft) {
                    const blushGeo = new THREE.CircleGeometry(0.12, 20);
                    const blushMesh = new THREE.Mesh(blushGeo, blushMat);
                    const sign = isLeft ? -1 : 1;
                    blushMesh.position.set(sign * 0.54, 0.54, 0.98);
                    blushMesh.rotation.set(Math.PI / 2 - 0.25, 0, -sign * 0.45);
                    return blushMesh;
                }
                group.add(createBlush(true));
                group.add(createBlush(false));

                // 8. EYES (Glossy dark stylized spheres with catchlights)
                function createEye(isLeft) {
                    const eyeGroup = new THREE.Group();
                    const sign = isLeft ? -1 : 1;

                    const eyeGeo = new THREE.SphereGeometry(0.12, 24, 20);
                    const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
                    eyeMesh.scale.set(0.92, 0.35, 1.05);
                    eyeGroup.add(eyeMesh);

                    // Primary catchlight
                    const c1Geo = new THREE.SphereGeometry(0.042, 14, 12);
                    const c1Mesh = new THREE.Mesh(c1Geo, catchlightMat);
                    c1Mesh.position.set(sign * 0.035, 0.045, 0.042);
                    eyeGroup.add(c1Mesh);

                    // Secondary catchlight
                    const c2Geo = new THREE.SphereGeometry(0.022, 10, 8);
                    const c2Mesh = new THREE.Mesh(c2Geo, catchlightMat);
                    c2Mesh.position.set(-sign * 0.035, 0.042, -0.042);
                    eyeGroup.add(c2Mesh);

                    eyeGroup.position.set(sign * 0.26, 0.67, 1.10);
                    eyeGroup.rotation.set(0.18, -sign * 0.15, 0);
                    return eyeGroup;
                }
                group.add(createEye(true));
                group.add(createEye(false));

                // 9. NOSE & MOUTH
                const noseGeo = new THREE.SphereGeometry(0.035, 14, 12);
                const noseMesh = new THREE.Mesh(noseGeo, eyeMat);
                noseMesh.scale.set(1.3, 0.8, 0.9);
                noseMesh.position.set(0, 0.72, 1.02);
                group.add(noseMesh);

                // Cute mouth: Torus arc
                const mouthGeo = new THREE.TorusGeometry(0.065, 0.016, 10, 20, Math.PI * 0.85);
                const mouthMesh = new THREE.Mesh(mouthGeo, browMat);
                mouthMesh.position.set(0, 0.70, 0.94);
                mouthMesh.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI * 0.08);
                group.add(mouthMesh);

                // 10. EYEBROWS
                function createBrow(isLeft) {
                    const browGeo = new THREE.TorusGeometry(0.09, 0.018, 10, 20, Math.PI * 0.65);
                    const browMesh = new THREE.Mesh(browGeo, browMat);
                    const sign = isLeft ? -1 : 1;
                    browMesh.position.set(sign * 0.25, 0.63, 1.28);
                    browMesh.rotation.set(Math.PI / 2 - 0.25, -sign * 0.25, sign * 0.15);
                    return browMesh;
                }
                group.add(createBrow(true));
                group.add(createBrow(false));

                // 11. GROUND CONTACT SHADOW (Clean soft oval on XY plane)
                const shadowGeo = new THREE.CircleGeometry(0.68, 32);
                const shadowMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.24,
                    depthWrite: false
                });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.name = 'noriShadowMesh';
                shadowMesh.scale.set(1.05, 0.72, 1.0);
                shadowMesh.position.set(0, 0.08, 0.005);
                group.add(shadowMesh);

                Vec3D._nori3DGroup = group;
                Vec3D._mathGroup.add(group);

                return { success: true, childCount: group.children.length };
            })()`,
            returnByValue: true
        });
        console.log('Build status:', buildRes.result.value);

        // 1. Capture 45-degree PERSPECTIVE view
        console.log('Capturing 45-degree Perspective...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (Vec3D._resetAnimId) {
                    cancelAnimationFrame(Vec3D._resetAnimId);
                    Vec3D._resetAnimId = null;
                }
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(2.4, 2.6, 1.8);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_true_3d_angle.png', Buffer.from(shotAngle.data, 'base64'));

        // 2. Capture SIDE PROFILE view (90-degree side!)
        console.log('Capturing 90-degree Side Profile...');
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
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_true_3d_side.png', Buffer.from(shotSide.data, 'base64'));

        // 3. Capture FRONT view
        console.log('Capturing Front View...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.05, 3.2, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_true_3d_front.png', Buffer.from(shotFront.data, 'base64'));

        // 4. Capture BACK view
        console.log('Capturing Back View...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._controls.target.set(0, 0, 0.95);
                Vec3D._camera.position.set(0.05, -3.2, 1.0);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotBack = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_true_3d_back.png', Buffer.from(shotBack.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('True 3D Nori test completed!');
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testTrue3DNori();
