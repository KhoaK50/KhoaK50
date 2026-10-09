const { spawn } = require('child_process');
const http = require('http');

async function test() {
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless=new',
        '--remote-debugging-port=9227',
        '--disable-gpu',
        '--no-first-run',
        'file:///d:/Programming_language/project_web/frontend_v2/calculation.html'
    ]);
    await new Promise(r => setTimeout(r, 1500));
    const pages = await new Promise(res => http.get('http://127.0.0.1:9227/json', r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }));
    const target = pages.find(p => p.url.includes('calculation.html'));
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(res => ws.onopen = res);
    
    function cmd(method, params = {}) {
        return new Promise(res => {
            const id = Math.random();
            const h = (e) => {
                const data = JSON.parse(e.data);
                if (data.id === id) { ws.removeEventListener('message', h); res(data.result); }
            };
            ws.addEventListener('message', h);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }
    await cmd('Runtime.enable');
    ws.addEventListener('message', e => {
        const d = JSON.parse(e.data);
        if (d.method === 'Runtime.consoleAPICalled') {
            console.log('CONSOLE:', d.params.type, d.params.args.map(a => a.value || a.description).join(' '));
        }
    });
    await new Promise(r => setTimeout(r, 1000));
    const res = await cmd('Runtime.evaluate', {
        expression: `({
            btnDraw: !!document.getElementById('btnDraw'),
            btnNori: !!document.getElementById('btnNoriEntity'),
            btnImg: !!document.getElementById('btnImageToVector'),
            masterLayout: !!document.querySelector('.sidebar-master-layout')
        })`,
        returnByValue: true
    });
    console.log('RESULT:', res.result.value);
    edge.kill();
}
test().catch(console.error);
