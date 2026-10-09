const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testCanvas() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9237',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9237/json', res => {
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
                        const val = data.result?.result?.value !== undefined ? data.result.result.value : data.result;
                        resolve(val); 
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }
        await send('Runtime.enable');

        const cvRes = await send('Runtime.evaluate', {
            expression: `(function() {
                const cv = document.createElement('canvas');
                cv.width = 512;
                cv.height = 512;
                Vec2D.renderNoriToCanvas(cv, 'RELAXED', false);
                return cv.toDataURL('image/png');
            })()`,
            returnByValue: true
        });

        console.log('cvRes:', cvRes);
        if (cvRes && typeof cvRes === 'string') {
            const b64 = cvRes.split(',')[1];
            fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_direct_2d_nori.png', Buffer.from(b64, 'base64'));
            console.log('Saved direct 2D Nori front canvas!');
        }

        const cvBack = await send('Runtime.evaluate', {
            expression: `(function() {
                const cv = document.createElement('canvas');
                cv.width = 512;
                cv.height = 512;
                Vec2D.renderNoriToCanvas(cv, 'BACKSIDE', false);
                return cv.toDataURL('image/png');
            })()`,
            returnByValue: true
        });
        if (cvBack && typeof cvBack === 'string') {
            const b64 = cvBack.split(',')[1];
            fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_direct_2d_nori_back.png', Buffer.from(b64, 'base64'));
            console.log('Saved direct 2D Nori back canvas!');
        }
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testCanvas();
