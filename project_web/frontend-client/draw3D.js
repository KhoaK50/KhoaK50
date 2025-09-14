class Draw3D {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth/container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

        // Lưới và trục
        const grid = new THREE.GridHelper(20,20);
        this.scene.add(grid);
        const axes = new THREE.AxesHelper(10);
        this.scene.add(axes);

        this.camera.position.set(5,5,5);
        this.controls.update();

        window.addEventListener("resize", () => this.onResize());
        this.animate();
    }

    onResize() {
        this.camera.aspect = this.container.clientWidth/this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    drawVector(v) {
        if (this.vectorObj) this.scene.remove(this.vectorObj);

        const material = new THREE.LineBasicMaterial({color:0xff0000});
        const points = [ new THREE.Vector3(0,0,0), new THREE.Vector3(v[0], v[1], v[2]) ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.vectorObj = new THREE.Line(geometry, material);
        this.scene.add(this.vectorObj);
    }

    animate() {
        requestAnimationFrame(()=>this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
