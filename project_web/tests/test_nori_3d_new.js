const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testNew3D() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9234',
        '--window-size=1200,800',
        '--disable-gpu',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9234/json', res => {
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

        // Evaluate custom 3D build in browser
        const buildRes = await send('Runtime.evaluate', {
            expression: `(function() {
                App.mode = '3D';
                if (Vec3D.init3D) Vec3D.init3D();
                Vec3D.show3D();
                App.noriEntityActive = true;

                // Function to draw full front Nori canvas
                function makeFullNoriCanvas(state = 'RELAXED') {
                    const cv = document.createElement('canvas');
                    cv.width = 1024;
                    cv.height = 1024;
                    const ctx = cv.getContext('2d');
                    ctx.scale(10.24, 10.24);

                    // 1. Drop shadow inside silhouette
                    // 2. Ears
                    ctx.fillStyle = '#f59e0b';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath(); ctx.ellipse(26, 23, 10, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(74, 23, 10, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = '#fbcfe8';
                    ctx.beginPath(); ctx.ellipse(26, 23, 6.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(74, 23, 6.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();

                    // 3. Feet
                    ctx.fillStyle = '#d97706';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.0;
                    ctx.beginPath(); ctx.ellipse(35, 87, 8, 4.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(65, 87, 8, 4.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                    // 4. Head and Body Seamless Silhouette (SINGLE CHUBBY SHAPE)
                    const bodyPath = new Path2D('M 50 19 C 74 19, 87 31, 87 49 C 87 64, 80 76, 70 81 C 60 86, 40 86, 30 81 C 20 76, 13 64, 13 49 C 13 31, 26 19, 50 19 Z');
                    const grad = ctx.createRadialGradient(48, 35, 5, 50, 52, 45);
                    grad.addColorStop(0, '#f59e0b');
                    grad.addColorStop(1, '#d97706');
                    ctx.fillStyle = grad;
                    ctx.fill(bodyPath);
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.4;
                    ctx.stroke(bodyPath);

                    // 5. Creamy Tummy (Belly)
                    const bellyPath = new Path2D('M 50 43 C 65 43, 76 52, 76 64 C 76 76, 64 81, 50 81 C 36 81, 24 76, 24 64 C 24 52, 35 43, 50 43 Z');
                    ctx.fillStyle = '#fefae0';
                    ctx.fill(bellyPath);

                    // 6. Pink blush
                    ctx.fillStyle = 'rgba(244, 63, 94, 0.42)';
                    ctx.beginPath(); ctx.ellipse(25, 58, 6.0, 3.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(75, 58, 6.0, 3.5, 0, 0, Math.PI * 2); ctx.fill();

                    // 7. Paws
                    ctx.fillStyle = '#f59e0b';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath(); ctx.ellipse(36, 64, 5.2, 4.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(64, 64, 5.2, 4.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                    // 8. Nose
                    ctx.fillStyle = '#292524';
                    ctx.beginPath(); ctx.ellipse(50, 56, 1.8, 1.3, 0, 0, Math.PI * 2); ctx.fill();

                    // 9. Eyes & Eyebrows based on state
                    if (state === 'CURIOUS') {
                        // Arched brow
                        ctx.strokeStyle = '#78350f';
                        ctx.lineWidth = 2.4; ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(33, 40); ctx.quadraticCurveTo(39, 37, 45, 41);
                        ctx.moveTo(55, 42); ctx.quadraticCurveTo(61, 43, 67, 41);
                        ctx.stroke();
                        // Glancing eyes
                        ctx.fillStyle = '#292524';
                        ctx.beginPath();
                        ctx.ellipse(39.5, 50.5, 5.5, 6.2, 0, 0, Math.PI * 2);
                        ctx.ellipse(63.5, 50.5, 5.5, 6.2, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(41, 48.5, 2.0, 0, Math.PI * 2);
                        ctx.arc(65, 48.5, 2.0, 0, Math.PI * 2);
                        ctx.fill();
                        // Smile
                        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(45, 61); ctx.quadraticCurveTo(50, 63, 55, 61);
                        ctx.stroke();
                    } else {
                        // RELAXED normal
                        ctx.strokeStyle = '#78350f';
                        ctx.lineWidth = 2.4; ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(33, 42); ctx.quadraticCurveTo(39, 39, 45, 42);
                        ctx.moveTo(55, 42); ctx.quadraticCurveTo(61, 39, 67, 42);
                        ctx.stroke();

                        ctx.fillStyle = '#292524';
                        ctx.beginPath();
                        ctx.ellipse(38, 51, 5.5, 6.2, 0, 0, Math.PI * 2);
                        ctx.ellipse(62, 51, 5.5, 6.2, 0, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(39.8, 48.6, 2.0, 0, Math.PI * 2);
                        ctx.arc(63.8, 48.6, 2.0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(36.8, 53.2, 1.0, 0, Math.PI * 2);
                        ctx.arc(60.8, 53.2, 1.0, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(45.5, 61.5); ctx.quadraticCurveTo(50, 63.5, 54.5, 61.5);
                        ctx.stroke();
                    }
                    return cv;
                }

                // Backside canvas
                function makeFullBackNoriCanvas() {
                    const cv = document.createElement('canvas');
                    cv.width = 1024;
                    cv.height = 1024;
                    const ctx = cv.getContext('2d');
                    ctx.scale(10.24, 10.24);

                    // Ears (Backside: plain golden fur with dark stroke)
                    ctx.fillStyle = '#f59e0b';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath(); ctx.ellipse(26, 23, 10, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(74, 23, 10, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                    // Feet
                    ctx.fillStyle = '#d97706';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.0;
                    ctx.beginPath(); ctx.ellipse(35, 87, 8, 4.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(65, 87, 8, 4.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                    // Body
                    const bodyPath = new Path2D('M 50 19 C 74 19, 87 31, 87 49 C 87 64, 80 76, 70 81 C 60 86, 40 86, 30 81 C 20 76, 13 64, 13 49 C 13 31, 26 19, 50 19 Z');
                    const grad = ctx.createRadialGradient(48, 35, 5, 50, 52, 45);
                    grad.addColorStop(0, '#f59e0b');
                    grad.addColorStop(1, '#d97706');
                    ctx.fillStyle = grad;
                    ctx.fill(bodyPath);
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.4;
                    ctx.stroke(bodyPath);

                    // Pom-pom tail
                    ctx.fillStyle = '#fefae0';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath(); ctx.ellipse(50, 75, 7.5, 7.0, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                    return cv;
                }

                // Remove existing group
                if (Vec3D._nori3DGroup) {
                    Vec3D._nori3DGroup.parent?.remove(Vec3D._nori3DGroup);
                    Vec3D._nori3DGroup = null;
                }

                const noriGroup = new THREE.Group();
                noriGroup.name = 'noriHamster3D';

                // CREATE A SINGLE SEAMLESS CHUBBY 3D BODY WITH PLANAR PROJECTION
                // Dimensions: width = 1.6, height = 1.5, depth = 0.8
                const frontTex = new THREE.CanvasTexture(makeFullNoriCanvas('RELAXED'));
                const backTex = new THREE.CanvasTexture(makeFullBackNoriCanvas());

                // Front curved shell
                const frontGeo = new THREE.SphereGeometry(1.0, 36, 24, 0, Math.PI); // Half sphere along Y
                // Custom UV mapping: planar projection from (X, Z) onto [0, 1]x[0, 1]
                const pos = frontGeo.attributes.position;
                const uvs = frontGeo.attributes.uv;
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    const z = pos.getZ(i);
                    // Map x from [-1, 1] -> [0.1, 0.9] (horizontal)
                    // Map z from [-1, 1] -> [0.1, 0.9] (vertical)
                    const u = 0.5 - (x * 0.45);
                    const v = 0.5 + (z * 0.45);
                    uvs.setXY(i, u, v);
                }
                uvs.needsUpdate = true;

                const frontMat = new THREE.MeshStandardMaterial({
                    map: frontTex,
                    roughness: 0.6,
                    metalness: 0.05,
                    side: THREE.FrontSide
                });

                const frontShell = new THREE.Mesh(frontGeo, frontMat);
                frontShell.name = 'noriFrontShell';
                frontShell.rotation.x = Math.PI / 2;
                frontShell.rotation.z = Math.PI / 2;
                frontShell.scale.set(0.95, 0.55, 0.92);
                frontShell.position.set(0, 0, 0.95);
                noriGroup.add(frontShell);

                // Back curved shell
                const backGeo = new THREE.SphereGeometry(1.0, 36, 24, Math.PI, Math.PI);
                const bPos = backGeo.attributes.position;
                const bUvs = backGeo.attributes.uv;
                for (let i = 0; i < bPos.count; i++) {
                    const x = bPos.getX(i);
                    const z = bPos.getZ(i);
                    const u = 0.5 + (x * 0.45);
                    const v = 0.5 + (z * 0.45);
                    bUvs.setXY(i, u, v);
                }
                bUvs.needsUpdate = true;

                const backMat = new THREE.MeshStandardMaterial({
                    map: backTex,
                    roughness: 0.6,
                    metalness: 0.05,
                    side: THREE.FrontSide
                });
                const backShell = new THREE.Mesh(backGeo, backMat);
                backShell.name = 'noriBackShell';
                backShell.rotation.x = Math.PI / 2;
                backShell.rotation.z = Math.PI / 2;
                backShell.scale.set(0.95, 0.55, 0.92);
                backShell.position.set(0, 0, 0.95);
                noriGroup.add(backShell);

                // 3D Fluffy Pom-pom Tail at back
                const tailGeo = new THREE.SphereGeometry(0.20, 20, 16);
                const tailMat = new THREE.MeshStandardMaterial({ color: 0xfefae0, roughness: 0.9 });
                const tailMesh = new THREE.Mesh(tailGeo, tailMat);
                tailMesh.position.set(0, -0.58, 0.65);
                noriGroup.add(tailMesh);

                // Ground Shadow
                const shadowGeo = new THREE.CircleGeometry(0.85, 32);
                const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.position.set(0, 0, 0.005);
                noriGroup.add(shadowMesh);

                Vec3D._nori3DGroup = noriGroup;
                Vec3D._mathGroup.add(noriGroup);

                // Camera settings
                Vec3D._camera.position.set(0, 3.8, 1.2);
                Vec3D._camera.up.set(0, 0, 1);
                Vec3D._controls.target.set(0, 0, 1.0);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
                return { success: true };
            })()`,
            returnByValue: true
        });

        await new Promise(r => setTimeout(r, 600));
        let shotFront = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_new_3d_front.png', Buffer.from(shotFront.data, 'base64'));

        // Angle view
        await send('Runtime.evaluate', {
            expression: `(function() {
                Vec3D._camera.position.set(2.0, 3.0, 1.8);
                Vec3D._controls.target.set(0, 0, 1.0);
                Vec3D._controls.update();
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            })()`
        });
        await new Promise(r => setTimeout(r, 600));
        let shotAngle = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_new_3d_angle.png', Buffer.from(shotAngle.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('Result:', buildRes);
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testNew3D();
