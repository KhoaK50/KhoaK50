const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testContourTracing() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9259',
        '--window-size=1200,800',
        'http://localhost:8000/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    try {
        const pages = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:9259/json', res => {
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
                // 1. Draw Nori on 256x256 canvas without ground shadow (body only!)
                const cv = document.createElement('canvas');
                cv.width = 256;
                cv.height = 256;
                const ctx = cv.getContext('2d');
                
                // Call renderNoriToCanvas
                Vec2D.renderNoriToCanvas(cv, 'RELAXED', false);
                
                // Get alpha channel
                const imgData = ctx.getImageData(0, 0, 256, 256);
                const data = imgData.data;
                const w = 256, h = 256;

                // Create binary grid (threshold alpha > 30, exclude bottom shadow if y > 220 and alpha < 100)
                const grid = new Uint8Array(w * h);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const idx = (y * w + x) * 4;
                        const a = data[idx + 3];
                        // If it's the faint ground shadow at the very bottom, skip
                        if (y > 218 && a < 90) {
                            grid[y * w + x] = 0;
                        } else {
                            grid[y * w + x] = a > 40 ? 1 : 0;
                        }
                    }
                }

                // 2. Moore-Neighbor boundary tracing algorithm
                let startX = -1, startY = -1;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (grid[y * w + x] === 1) {
                            startX = x;
                            startY = y;
                            break;
                        }
                    }
                    if (startX !== -1) break;
                }

                if (startX === -1) return { error: 'No shape found' };

                // 8-directional offsets (clockwise)
                const dx = [0, 1, 1, 1, 0, -1, -1, -1];
                const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

                const contour = [];
                let cx = startX, cy = startY;
                let dir = 7; // backtrack direction
                contour.push([cx, cy]);

                let steps = 0;
                while (steps++ < 2000) {
                    let found = false;
                    const startSearch = (dir + 5) % 8; // backtrack + 1
                    for (let i = 0; i < 8; i++) {
                        const checkDir = (startSearch + i) % 8;
                        const nx = cx + dx[checkDir];
                        const ny = cy + dy[checkDir];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny * w + nx] === 1) {
                            cx = nx;
                            cy = ny;
                            dir = checkDir;
                            found = true;
                            break;
                        }
                    }
                    if (!found) break;
                    if (cx === startX && cy === startY) break;
                    contour.push([cx, cy]);
                }

                // Simplify contour (subsample every 4 points)
                const simplified = [];
                const stepSize = Math.max(1, Math.floor(contour.length / 80));
                for (let i = 0; i < contour.length; i += stepSize) {
                    simplified.push(contour[i]);
                }

                return {
                    totalPoints: contour.length,
                    simplifiedCount: simplified.length,
                    first: simplified[0],
                    middle: simplified[Math.floor(simplified.length / 2)],
                    last: simplified[simplified.length - 1]
                };
            })()`,
            returnByValue: true
        });

        console.log('Boundary trace result:', res.result.value);

        ws.close();
        edge.kill();
    } catch(e) {
        edge.kill();
        console.error(e);
    }
}
testContourTracing();
