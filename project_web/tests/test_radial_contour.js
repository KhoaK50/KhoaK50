const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testRadialContour() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9261',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9261/json', res => {
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

        const res = await send('Runtime.evaluate', {
            expression: `(function() {
                const cv = document.createElement('canvas');
                cv.width = 512;
                cv.height = 512;
                const ctx = cv.getContext('2d');
                Vec2D.renderNoriToCanvas(cv, 'RELAXED', false);
                const img = ctx.getImageData(0, 0, 512, 512);
                const d = img.data;

                // Center of Nori on 512x512 canvas
                const cx = 256;
                const cy = 265;

                // Raycast 120 angles
                const numAngles = 120;
                const pts = [];
                for (let i = 0; i < numAngles; i++) {
                    const angle = (i / numAngles) * Math.PI * 2;
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);

                    let lastR = 0;
                    for (let r = 10; r < 250; r += 1) {
                        const px = Math.round(cx + r * cosA);
                        const py = Math.round(cy + r * sinA);
                        if (px < 0 || px >= 512 || py < 0 || py >= 512) break;
                        const idx = (py * 512 + px) * 4;
                        const a = d[idx + 3];
                        // Ignore bottom soft ground shadow (py > 440 with low alpha)
                        if (py > 440 && a < 120) continue;
                        if (a > 50) {
                            lastR = r;
                        }
                    }
                    pts.push([cx + lastR * cosA, cy + lastR * sinA]);
                }

                // Draw polygon on top to verify
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i][0], pts[i][1]);
                }
                ctx.closePath();
                ctx.stroke();

                return {
                    count: pts.length,
                    first: pts[0],
                    dataUrl: cv.toDataURL()
                };
            })()`,
            returnByValue: true
        });

        console.log('Raycast result:', { count: res.result.value.count, first: res.result.value.first });

        const b64 = res.result.value.dataUrl.split(',')[1];
        fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\scratch_nori_contour_verify.png', Buffer.from(b64, 'base64'));

        ws.close();
        edge.kill();
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testRadialContour();
