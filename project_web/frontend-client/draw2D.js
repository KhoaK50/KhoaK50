// Vẽ 2D bằng Canvas
class Draw2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.scale = 40; // px per unit
        this.offsetX = 0;
        this.offsetY = 0;
        this.initEvents();
        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    initEvents() {
        // Zoom bằng con lăn
        this.canvas.addEventListener("wheel", e => {
            e.preventDefault();
            this.scale *= (e.deltaY > 0 ? 0.9 : 1.1);
            this.render();
        });
        // Pan bằng chuột
        let dragging = false, lastX, lastY;
        this.canvas.addEventListener("mousedown", e => {
            dragging = true; lastX = e.clientX; lastY = e.clientY;
        });
        window.addEventListener("mouseup", () => dragging = false);
        window.addEventListener("mousemove", e => {
            if (dragging) {
                this.offsetX += (e.clientX - lastX);
                this.offsetY += (e.clientY - lastY);
                lastX = e.clientX; lastY = e.clientY;
                this.render();
            }
        });
        window.addEventListener("resize", () => this.resize());
    }

    drawGrid() {
        const {ctx, canvas, scale, offsetX, offsetY} = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width/2 + offsetX, canvas.height/2 + offsetY);
        ctx.scale(1, -1); // Y hướng lên

        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;

        let maxX = Math.floor(canvas.width/scale/2);
        let maxY = Math.floor(canvas.height/scale/2);

        for (let i=-maxX; i<=maxX; i++) {
            ctx.beginPath();
            ctx.moveTo(i*scale, -canvas.height);
            ctx.lineTo(i*scale, canvas.height);
            ctx.stroke();
            ctx.fillStyle = "black";
            ctx.scale(1,-1);
            ctx.fillText(i, i*scale-5, -5);
            ctx.scale(1,-1);
        }
        for (let j=-maxY; j<=maxY; j++) {
            ctx.beginPath();
            ctx.moveTo(-canvas.width, j*scale);
            ctx.lineTo(canvas.width, j*scale);
            ctx.stroke();
            ctx.fillStyle = "black";
            ctx.fillText(j, 5, j*scale+5);
        }

        // Trục X Y
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(-canvas.width,0); ctx.lineTo(canvas.width,0); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0,-canvas.height); ctx.lineTo(0,canvas.height); ctx.stroke();

        ctx.restore();
    }

    drawVector(v) {
        const {ctx, canvas, scale, offsetX, offsetY} = this;
        this.drawGrid();

        ctx.save();
        ctx.translate(canvas.width/2 + offsetX, canvas.height/2 + offsetY);
        ctx.scale(1,-1);

        ctx.strokeStyle = "red";
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(v[0]*scale, v[1]*scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(v[0]*scale, v[1]*scale, 4, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    render(v=null) {
        this.drawGrid();
        if (v) this.drawVector(v);
    }
}
