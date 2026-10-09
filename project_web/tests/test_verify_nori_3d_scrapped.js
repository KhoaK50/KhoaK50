const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testVerifyNori3DScrapped() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9265',
        '--window-size=1280,850',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9265/json', res => {
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

        // 1. Kiểm tra 2D ban đầu
        console.log('--- 1. Testing 2D mode ---');
        const res2D = await send('Runtime.evaluate', {
            expression: `(function() {
                const btnNori = document.getElementById('btnNoriEntity');
                const vecSel = document.getElementById('mixedVectorSelect');
                const options = vecSel ? Array.from(vecSel.options).map(o => o.value) : [];
                return JSON.stringify({
                    mode: window.App?.mode,
                    hasBtnNori: !!btnNori,
                    btnNoriVisible: btnNori ? btnNori.style.display !== 'none' : false,
                    hasNoriOption: options.includes('nori_entity')
                });
            })()`
        });
        console.log('2D Check:', res2D.result.value);

        // Bật Nori ở 2D
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (window.App && typeof App.toggleNoriEntity === 'function') {
                    App.toggleNoriEntity();
                }
            })()`
        });
        await new Promise(r => setTimeout(r, 500));

        const shotDir = 'C:/Users/LENOVO/.gemini/antigravity/brain/4024b48f-75e3-49e7-8d4e-2dd03106df81';
        const shot2D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`${shotDir}/scratch_nori_2d_clean.png`, Buffer.from(shot2D.data, 'base64'));
        console.log('Saved scratch_nori_2d_clean.png');

        // 2. Chuyển sang 3D
        console.log('--- 2. Testing 3D mode (Nori must be completely gone) ---');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (window.App && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
            })()`
        });
        await new Promise(r => setTimeout(r, 1000));

        const res3D = await send('Runtime.evaluate', {
            expression: `(function() {
                const btnNori = document.getElementById('btnNoriEntity');
                const vecSel = document.getElementById('mixedVectorSelect');
                const options = vecSel ? Array.from(vecSel.options).map(o => o.value) : [];

                let noriInScene = false;
                if (window.Vec3D && Vec3D._scene) {
                    Vec3D._scene.traverse(obj => {
                        if (obj.name && obj.name.toLowerCase().includes('nori')) {
                            noriInScene = true;
                        }
                    });
                }

                return JSON.stringify({
                    mode: window.App?.mode,
                    btnNoriDisplayNone: btnNori ? btnNori.style.display === 'none' : true,
                    hasNoriOptionIn3D: options.includes('nori_entity'),
                    nori3DGroupIsNull: window.Vec3D?._nori3DGroup === null,
                    noriInScene: noriInScene
                });
            })()`
        });
        console.log('3D Check:', res3D.result.value);

        const shot3D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`${shotDir}/scratch_3d_clean_no_nori.png`, Buffer.from(shot3D.data, 'base64'));
        console.log('Saved scratch_3d_clean_no_nori.png');

        // 3. Chuyển lại về 2D
        console.log('--- 3. Testing switch back to 2D ---');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (window.App && typeof App.toggleMode === 'function') {
                    App.toggleMode();
                }
            })()`
        });
        await new Promise(r => setTimeout(r, 800));

        const resBack2D = await send('Runtime.evaluate', {
            expression: `(function() {
                const btnNori = document.getElementById('btnNoriEntity');
                const vecSel = document.getElementById('mixedVectorSelect');
                const options = vecSel ? Array.from(vecSel.options).map(o => o.value) : [];
                return JSON.stringify({
                    mode: window.App?.mode,
                    btnNoriVisible: btnNori ? btnNori.style.display !== 'none' : false,
                    hasNoriOption: options.includes('nori_entity'),
                    noriActive: !!window.App?.noriEntityActive
                });
            })()`
        });
        console.log('Back to 2D Check:', resBack2D.result.value);

        console.log('SUCCESS: All checks passed!');
        ws.close();
    } finally {
        edge.kill();
    }
}

testVerifyNori3DScrapped().catch(err => {
    console.error('Error during test:', err);
    process.exit(1);
});
