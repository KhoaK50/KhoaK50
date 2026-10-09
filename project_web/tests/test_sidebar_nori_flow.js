const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testSidebarNoriFlow() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9257',
        '--window-size=1280,850',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9257/json', res => {
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

        // Create a matrix if none exists
        console.log('Ensuring a matrix exists...');
        await send('Runtime.evaluate', {
            expression: `(function() {
                if (!App.matrixList || App.matrixList.length === 0) {
                    App.matrixList = [{
                        id: 1,
                        name: 'A',
                        values: [[1.5, 0.3], [0.2, 1.2]],
                        rows: 2,
                        cols: 2
                    }];
                }
                if (typeof App.refreshMixedCalcOptions === 'function') {
                    App.refreshMixedCalcOptions();
                }
            })()`
        });

        // Click Mixed Calc tab
        console.log('Switching to Mixed Calc panel and selecting Nori...');
        const selectRes = await send('Runtime.evaluate', {
            expression: `(function() {
                const tabMixed = document.querySelector('[data-tab="mixed"]');
                if (tabMixed) tabMixed.click();
                
                const vecSel = document.getElementById('mixedVectorSelect');
                if (vecSel) {
                    vecSel.value = 'nori_entity';
                    vecSel.dispatchEvent(new Event('change'));
                }
                return {
                    vecValue: vecSel ? vecSel.value : null,
                    options: vecSel ? Array.from(vecSel.options).map(o => o.value) : []
                };
            })()`,
            returnByValue: true
        });
        console.log('Mixed select options:', selectRes.result.value);

        // Click "Thực hiện"
        console.log('Clicking btnMixedCompute...');
        const clickRes = await send('Runtime.evaluate', {
            expression: `(function() {
                const btn = document.getElementById('btnMixedCompute');
                if (btn) btn.click();
                return {
                    clicked: !!btn,
                    isLT: !!(App.LinearTransform && App.LinearTransform.isActive()),
                    activeNoriMatrix: App.activeNoriTransformMatrix
                };
            })()`,
            returnByValue: true
        });
        console.log('Click result:', clickRes.result.value);

        // Wait for morph animation
        await new Promise(r => setTimeout(r, 1100));

        const postAnimRes = await send('Runtime.evaluate', {
            expression: `(function() {
                return {
                    activeNoriMatrix: App.activeNoriTransformMatrix,
                    isLT: !!(App.LinearTransform && App.LinearTransform.isActive()),
                    playbackHUDVisible: document.getElementById('sidebarTransformPlayback')?.style.display !== 'none'
                };
            })()`,
            returnByValue: true
        });
        console.log('Post-animation result:', postAnimRes.result.value);

        let shotEndToEnd = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_end_to_end_nori.png', Buffer.from(shotEndToEnd.data, 'base64'));

        ws.close();
        edge.kill();
        console.log('End-to-end test completed successfully!');
    } catch (e) {
        edge.kill();
        console.error(e);
    }
}
testSidebarNoriFlow();
