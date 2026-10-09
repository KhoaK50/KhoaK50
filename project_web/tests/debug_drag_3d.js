const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HTTP_PORT = 5653;
const CDP_PORT = 9253;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function startStaticServer() {
    const server = http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
        const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found: ' + reqPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    });
    server.listen(HTTP_PORT);
    return server;
}

function findEdgeBinary() {
    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of edgePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Edge binary not found');
}

async function debugDrag() {
    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_debug_drag');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
        '--headless=new',
        '--window-size=1600,1000',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    let ws = null;
    let msgId = 1;

    try {
        await sleep(2500);

        const versionJson = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json/list`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = versionJson.find(t => t.type === 'page');
        if (!targetPage) throw new Error('Cannot find target debug page');
        const wsUrl = targetPage.webSocketDebuggerUrl;

        ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && callbacks.has(data.id)) {
                callbacks.get(data.id)(data);
                callbacks.delete(data.id);
            }
        };

        const send = (method, params = {}) => new Promise((resolve) => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });

        await send('Runtime.enable');
        await send('Page.enable');
        await sleep(1000);

        // Switch to 3D mode
        const evalRes = await send('Runtime.evaluate', {
            expression: `(function() {
                // Set sample vectors: v1 = [-0.68, 3.61, 0], v2 = [1, 2, 0]
                window.App.vectorList = [
                    { id: 1, name: "v_1", vec: [-0.68, 3.61, 0], visible: true, colorHex: "#ef4444", showArrow: true },
                    { id: 2, name: "v_2", vec: [1, 2, 0], visible: true, colorHex: "#8b5cf6", showArrow: true }
                ];
                if (window.App.mode !== "3D") {
                    window.App.toggleMode();
                }
                Vec3D.hardRefresh3D(false);
                return {
                    mode: window.App.mode,
                    vectorsCount: App.vectorList.length,
                    pickableHeadsCount: (Vec3D._pickableHeads || []).length,
                    pickableMeshesCount: (Vec3D._pickableMeshes || []).length,
                    vectorsGroupChildren: (Vec3D._vectorsGroup?.children || []).length
                };
            })()`,
            returnByValue: true
        });

        console.log('[DEBUG 3D Setup]:', evalRes.result?.result?.value);

        // Check head materials and raycast behavior
        const headCheck = await send('Runtime.evaluate', {
            expression: `(function() {
                const results = [];
                for (const h of (Vec3D._pickableHeads || [])) {
                    results.push({
                        visible: h.visible,
                        matVisible: h.material.visible,
                        userData: h.userData,
                        position: h.position
                    });
                }
                return results;
            })()`,
            returnByValue: true
        });
        console.log('[DEBUG Pickable Heads]:', headCheck.result?.result?.value || headCheck);

        // Test raycasting at the tip of v1
        const raycastTest = await send('Runtime.evaluate', {
            expression: `(function() {
                const group = Vec3D.threeVecMap.get(1);
                if (!group) return { error: "No group for v1" };
                const tipWorld = group.userData.tipLocal.clone().add(Vec3D.S3D.offset);
                // Project tipWorld to screen coordinates
                const screenPos = tipWorld.clone().project(Vec3D._camera);
                const rect = Vec3D._renderer.domElement.getBoundingClientRect();
                const screenX = ((screenPos.x + 1) / 2) * rect.width + rect.left;
                const screenY = ((-screenPos.y + 1) / 2) * rect.height + rect.top;

                // Test Raycaster directly in Three.js
                const raycaster = new THREE.Raycaster();
                const mouse = new THREE.Vector2(screenPos.x, screenPos.y);
                raycaster.setFromCamera(mouse, Vec3D._camera);

                const headHits = raycaster.intersectObjects(Vec3D._pickableHeads || [], false);
                const meshHits = raycaster.intersectObjects(Vec3D._pickableMeshes || [], false);

                // Check CSS2D labels
                const labelInfo = [];
                for (const g of Vec3D._vectorsGroup.children) {
                    const lbl = g.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
                    if (lbl && lbl.element) {
                        const lrect = lbl.element.getBoundingClientRect();
                        labelInfo.push({
                            vId: g.userData?.vectorId,
                            text: lbl.element.innerText,
                            rect: { left: lrect.left, top: lrect.top, width: lrect.width, height: lrect.height }
                        });
                    }
                }

                return {
                    tipWorld,
                    screenX,
                    screenY,
                    headHitsCount: headHits.length,
                    meshHitsCount: meshHits.length,
                    labels: labelInfo
                };
            })()`,
            returnByValue: true
        });
        console.log('[DEBUG Raycast Test at v1 tip]:', JSON.stringify(raycastTest.result?.result?.value || raycastTest, null, 2));

        // Test with CDP Input.dispatchMouseEvent (REAL browser mouse events)
        console.log('[DEBUG Testing REAL CDP Mouse Events]');
        const v1TipScreen = await send('Runtime.evaluate', {
            expression: `(function() {
                const group = Vec3D.threeVecMap.get(1);
                const tipWorld = group.userData.tipLocal.clone().add(Vec3D.S3D.offset);
                const screenPos = tipWorld.clone().project(Vec3D._camera);
                const rect = Vec3D._renderer.domElement.getBoundingClientRect();
                return {
                    x: Math.round(((screenPos.x + 1) / 2) * rect.width + rect.left),
                    y: Math.round(((-screenPos.y + 1) / 2) * rect.height + rect.top)
                };
            })()`,
            returnByValue: true
        });
        const tipPt = v1TipScreen.result?.result?.value;
        console.log('[Tip Screen Point]:', tipPt);

        // Inspect intersectPlane in real mouse move
        const inspectRay = await send('Runtime.evaluate', {
            expression: `(function() {
                const renderDom = Vec3D._renderer.domElement;
                const rect = renderDom.getBoundingClientRect();
                const group = Vec3D.threeVecMap.get(1);
                const tipWorld = group.userData.tipLocal.clone().add(Vec3D.S3D.offset);

                const camDir = new THREE.Vector3();
                Vec3D._camera.getWorldDirection(camDir);
                const plane = new THREE.Plane();
                plane.setFromNormalAndCoplanarPoint(camDir.clone().multiplyScalar(-1), tipWorld);

                const raycaster = new THREE.Raycaster();
                const mouse = new THREE.Vector2();

                // Point at tip
                const screenPos = tipWorld.clone().project(Vec3D._camera);
                mouse.x = screenPos.x;
                mouse.y = screenPos.y;
                raycaster.setFromCamera(mouse, Vec3D._camera);

                const hitTarget1 = new THREE.Vector3();
                const res1 = raycaster.ray.intersectPlane(plane, hitTarget1);

                // Point 60px right, 40px up
                const pxX = ((screenPos.x + 1) / 2) * rect.width + 60;
                const pxY = ((-screenPos.y + 1) / 2) * rect.height - 40;
                mouse.x = (pxX / rect.width) * 2 - 1;
                mouse.y = -(pxY / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, Vec3D._camera);

                const hitTarget2 = new THREE.Vector3();
                const res2 = raycaster.ray.intersectPlane(plane, hitTarget2);

                return {
                    camDir,
                    tipWorld,
                    planeNormal: plane.normal,
                    planeConstant: plane.constant,
                    res1: res1 ? { x: res1.x, y: res1.y, z: res1.z } : null,
                    res2: res2 ? { x: res2.x, y: res2.y, z: res2.z } : null
                };
            })()`,
            returnByValue: true
        });
        console.log('[DEBUG Inspect Plane Intersection]:', inspectRay.result?.result?.value);

        const hoverState = await send('Runtime.evaluate', {
            expression: `({
                hoveredVectorId: Vec3D.S3D.hoveredVectorId,
                activeVectorId: Vec3D.S3D.activeVectorId,
                cursor: Vec3D._renderer.domElement.style.cursor,
                targetUnderMouse: document.elementFromPoint(${tipPt.x}, ${tipPt.y})?.tagName
            })`,
            returnByValue: true
        });
        console.log('[Real Hover State]:', hoverState.result?.result?.value);

        // Press down
        await send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            button: 'left',
            buttons: 1,
            clickCount: 1,
            x: tipPt.x,
            y: tipPt.y
        });
        await sleep(100);

        const downState = await send('Runtime.evaluate', {
            expression: `({
                draggedVectorId: Vec3D.S3D.draggedVectorId,
                controlsEnabled: Vec3D._controls.enabled,
                isOrbiting: Vec3D._isOrbiting
            })`,
            returnByValue: true
        });
        console.log('[Real Down State]:', downState.result?.result?.value);

        // Drag by +60px X, -40px Y
        await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            buttons: 1,
            x: tipPt.x + 60,
            y: tipPt.y - 40
        });
        await sleep(100);

        const moveState = await send('Runtime.evaluate', {
            expression: `({
                v1: App.vectorList[0].vec,
                draggedVectorId: Vec3D.S3D.draggedVectorId,
                isOrbiting: Vec3D._isOrbiting
            })`,
            returnByValue: true
        });
        console.log('[Real Move State]:', moveState.result?.result?.value);

        // Release
        await send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            button: 'left',
            x: tipPt.x + 60,
            y: tipPt.y - 40
        });
        await sleep(100);

        // Test 3: Simulate pointerdown and drag on label
        const dragLabelSim = await send('Runtime.evaluate', {
            expression: `(function() {
                const renderDom = Vec3D._renderer.domElement;
                const group = Vec3D.threeVecMap.get(1);
                const lbl = group.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
                const lrect = lbl.element.getBoundingClientRect();
                const startX = lrect.left + lrect.width / 2;
                const startY = lrect.top + lrect.height / 2;

                const v1Before = [...App.vectorList[0].vec];

                // PointerDown on label
                renderDom.dispatchEvent(new PointerEvent('pointerdown', {
                    clientX: startX,
                    clientY: startY,
                    button: 0,
                    bubbles: true,
                    cancelable: true
                }));

                const dragStarted = {
                    draggedVectorId: Vec3D.S3D.draggedVectorId,
                    controlsEnabled: Vec3D._controls.enabled
                };

                // PointerMove by +40px X, +40px Y
                renderDom.dispatchEvent(new PointerEvent('pointermove', {
                    clientX: startX + 40,
                    clientY: startY + 40,
                    bubbles: true,
                    cancelable: true
                }));

                const v1During = [...App.vectorList[0].vec];

                // PointerUp
                renderDom.dispatchEvent(new PointerEvent('pointerup', {
                    clientX: startX + 40,
                    clientY: startY + 40,
                    button: 0,
                    bubbles: true,
                    cancelable: true
                }));

                const v1After = [...App.vectorList[0].vec];

                return { v1Before, dragStarted, v1During, v1After };
            })()`,
            returnByValue: true
        });
        console.log('[DEBUG Drag Label Simulation]:', dragLabelSim.result?.result?.value || dragLabelSim);

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        if (ws) ws.close();
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

debugDrag();
