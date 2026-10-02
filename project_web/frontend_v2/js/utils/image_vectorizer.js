/**
 * image_vectorizer.js - Vectoria High-Fidelity Image to Vector Mesh Engine
 * Chuyển đổi ảnh thực tế (PNG, JPG) thành mạng lưới vector tam giác thích ứng (Adaptive Delaunay Mesh)
 * Kết xuất siêu tốc 60 FPS trên cả Canvas 2D và WebGL / Three.js 3D.
 */

(function () {
  "use strict";

  const App = window.App || {};
  window.App = App;

  // --- 1. THUẬT TOÁN TAM GIÁC HÓA DELAUNAY SIÊU TỐC (DELAUNATOR) ---
  const EDGE_STACK = new Int32Array(512);

  function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function orient(ax, ay, bx, by, cx, cy) {
    return (by - ay) * (cx - bx) - (bx - ax) * (cy - by) < 0;
  }

  function inCircle(ax, ay, bx, by, cx, cy, px, py) {
    const dx = ax - px, dy = ay - py;
    const ex = bx - px, ey = by - py;
    const fx = cx - px, fy = cy - py;
    const ap = dx * dx + dy * dy;
    const bp = ex * ex + ey * ey;
    const cp = fx * fx + fy * fy;
    return (
      dx * (ey * cp - bp * fy) -
      dy * (ex * cp - bp * fx) +
      ap * (ex * fy - ey * fx) < 0
    );
  }

  function circumradius(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax, dy = by - ay;
    const ex = cx - ax, ey = cy - ay;
    const bl = dx * dx + dy * dy, cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);
    const x = (ey * bl - dy * cl) * d;
    const y = (dx * cl - ex * bl) * d;
    return x * x + y * y;
  }

  function circumcenter(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax, dy = by - ay;
    const ex = cx - ax, ey = cy - ay;
    const bl = dx * dx + dy * dy, cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);
    return { x: ax + (ey * bl - dy * cl) * d, y: ay + (dx * cl - ex * bl) * d };
  }

  function pseudoAngle(dx, dy) {
    const p = dx / (Math.abs(dx) + Math.abs(dy));
    return (dy > 0 ? 3 - p : 1 + p) / 4;
  }

  function quicksort(ids, dists, left, right) {
    if (right - left <= 20) {
      for (let i = left + 1; i <= right; i++) {
        const a = ids[i], d = dists[a];
        let j = i - 1;
        while (j >= left && dists[ids[j]] > d) ids[j + 1] = ids[j--];
        ids[j + 1] = a;
      }
      return;
    }
    const median = (left + right) >> 1;
    let i = left - 1, j = right + 1;
    swap(ids, dists, dists[ids[left]] > dists[ids[median]] ? left : median, dists[ids[median]] > dists[ids[right]] ? median : right);
    const pivot = dists[ids[left]];
    while (true) {
      do { i++; } while (dists[ids[i]] < pivot);
      do { j--; } while (dists[ids[j]] > pivot);
      if (i >= j) break;
      swap(ids, dists, i, j);
    }
    quicksort(ids, dists, left, j);
    quicksort(ids, dists, j + 1, right);
  }

  function swap(ids, dists, i, j) {
    const t = ids[i];
    ids[i] = ids[j];
    ids[j] = t;
  }

  class Delaunator {
    constructor(coords) {
      const n = coords.length >> 1;
      this.coords = coords;
      const maxTriangles = Math.max(2 * n - 5, 0);
      this._triangles = new Int32Array(maxTriangles * 3);
      this._halfedges = new Int32Array(maxTriangles * 3);
      this._hashSize = Math.ceil(Math.sqrt(n));
      this._hullPrev = new Int32Array(n);
      this._hullNext = new Int32Array(n);
      this._hullTri = new Int32Array(n);
      this._hullHash = new Int32Array(this._hashSize).fill(-1);
      this._ids = new Uint32Array(n);
      this._dists = new Float64Array(n);
      this.update();
    }

    update() {
      const coords = this.coords;
      const n = coords.length >> 1;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const x = coords[2 * i], y = coords[2 * i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        this._ids[i] = i;
      }
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      let minDist = Infinity, i0 = 0, i1 = 0, i2 = 0;
      for (let i = 0; i < n; i++) {
        const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
        if (d < minDist) { i0 = i; minDist = d; }
      }
      const x0 = coords[2 * i0], y0 = coords[2 * i0 + 1];
      minDist = Infinity;
      for (let i = 0; i < n; i++) {
        if (i === i0) continue;
        const d = dist(x0, y0, coords[2 * i], coords[2 * i + 1]);
        if (d < minDist && d > 0) { i1 = i; minDist = d; }
      }
      let x1 = coords[2 * i1], y1 = coords[2 * i1 + 1];
      let minRadius = Infinity;
      for (let i = 0; i < n; i++) {
        if (i === i0 || i === i1) continue;
        const r = circumradius(x0, y0, x1, y1, coords[2 * i], coords[2 * i + 1]);
        if (r < minRadius) { i2 = i; minRadius = r; }
      }
      let x2 = coords[2 * i2], y2 = coords[2 * i2 + 1];
      if (orient(x0, y0, x1, y1, x2, y2)) {
        const i = i1, x = x1, y = y1;
        i1 = i2; x1 = x2; y1 = y2;
        i2 = i; x2 = x; y2 = y;
      }
      const center = circumcenter(x0, y0, x1, y1, x2, y2);
      this._cx = center.x; this._cy = center.y;
      for (let i = 0; i < n; i++) {
        this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
      }
      quicksort(this._ids, this._dists, 0, n - 1);
      this._hullStart = i0;
      this._hullNext[i0] = this._hullPrev[i2] = i1;
      this._hullNext[i1] = this._hullPrev[i0] = i2;
      this._hullNext[i2] = this._hullPrev[i1] = i0;
      this._hullTri[i0] = 0; this._hullTri[i1] = 1; this._hullTri[i2] = 2;
      this._hullHash.fill(-1);
      this._hullHash[this._hashKey(x0, y0)] = i0;
      this._hullHash[this._hashKey(x1, y1)] = i1;
      this._hullHash[this._hashKey(x2, y2)] = i2;
      this.trianglesLen = 0;
      this._addTriangle(i0, i1, i2, -1, -1, -1);

      let xp = 0, yp = 0;
      for (let k = 0; k < this._ids.length; k++) {
        const i = this._ids[k];
        const x = coords[2 * i], y = coords[2 * i + 1];
        if (k > 0 && Math.abs(x - xp) <= 1e-8 && Math.abs(y - yp) <= 1e-8) continue;
        xp = x; yp = y;
        if (i === i0 || i === i1 || i === i2) continue;
        let start = 0;
        const key = this._hashKey(x, y);
        for (let j = 0; j < this._hashSize; j++) {
          start = this._hullHash[(key + j) % this._hashSize];
          if (start !== -1 && start !== this._hullNext[start]) break;
        }
        start = this._hullPrev[start];
        let e = start, q;
        while ((q = this._hullNext[e]), !orient(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1])) {
          e = q;
          if (e === start) { e = -1; break; }
        }
        if (e === -1) continue;
        let t = this._addTriangle(e, i, this._hullNext[e], -1, -1, this._hullTri[e]);
        this._hullTri[i] = this._legalize(t + 2);
        this._hullTri[e] = t;
        let nxt = this._hullNext[e];
        while ((q = this._hullNext[nxt]), orient(x, y, coords[2 * nxt], coords[2 * nxt + 1], coords[2 * q], coords[2 * q + 1])) {
          t = this._addTriangle(nxt, i, q, this._hullTri[i], -1, this._hullTri[nxt]);
          this._hullTri[i] = this._legalize(t + 2);
          this._hullNext[nxt] = nxt;
          nxt = q;
        }
        if (e === start) {
          while ((q = this._hullPrev[e]), orient(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1])) {
            t = this._addTriangle(q, i, e, -1, this._hullTri[e], this._hullTri[q]);
            this._legalize(t + 2);
            this._hullTri[q] = t;
            this._hullNext[e] = e;
            e = q;
          }
        }
        this._hullStart = this._hullPrev[i] = e;
        this._hullNext[e] = this._hullPrev[nxt] = i;
        this._hullNext[i] = nxt;
        this._hullHash[this._hashKey(x, y)] = i;
        this._hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
      }
      this.triangles = this._triangles.subarray(0, this.trianglesLen);
      this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
    }

    _hashKey(x, y) {
      return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
    }

    _legalize(a) {
      const triangles = this._triangles, halfedges = this._halfedges, coords = this.coords;
      let i = 0, ar = 0;
      while (true) {
        const b = halfedges[a];
        const a0 = a - (a % 3);
        ar = a0 + ((a + 2) % 3);
        if (b === -1) {
          if (i === 0) break;
          a = EDGE_STACK[--i];
          continue;
        }
        const b0 = b - (b % 3);
        const al = a0 + ((a + 1) % 3);
        const bl = b0 + ((b + 2) % 3);
        const p0 = triangles[ar], pr = triangles[a], pl = triangles[al], p1 = triangles[bl];
        const illegal = inCircle(
          coords[2 * p0], coords[2 * p0 + 1],
          coords[2 * pr], coords[2 * pr + 1],
          coords[2 * pl], coords[2 * pl + 1],
          coords[2 * p1], coords[2 * p1 + 1]
        );
        if (illegal) {
          triangles[a] = p1; triangles[b] = p0;
          const hbl = halfedges[bl];
          if (hbl === -1) {
            let e = this._hullStart;
            do {
              if (this._hullTri[e] === bl) { this._hullTri[e] = a; break; }
              e = this._hullPrev[e];
            } while (e !== this._hullStart);
          }
          this._link(a, hbl);
          this._link(b, halfedges[ar]);
          this._link(ar, bl);
          const br = b0 + ((b + 1) % 3);
          if (i < EDGE_STACK.length) EDGE_STACK[i++] = br;
        } else {
          if (i === 0) break;
          a = EDGE_STACK[--i];
        }
      }
      return ar;
    }

    _link(a, b) {
      this._halfedges[a] = b;
      if (b !== -1) this._halfedges[b] = a;
    }

    _addTriangle(i0, i1, i2, a, b, c) {
      const t = this.trianglesLen;
      this._triangles[t] = i0;
      this._triangles[t + 1] = i1;
      this._triangles[t + 2] = i2;
      this._link(t, a);
      this._link(t + 1, b);
      this._link(t + 2, c);
      this.trianglesLen += 3;
      return t;
    }
  }

  // --- 2. PIPELINE VECTOR HÓA ẢNH THÍCH ỨNG (SOBEL EDGE + DELAUNAY) ---
  App.ImageVectorizer = {
    // Biến đổi ảnh thành dữ liệu Mesh vector toán học
    vectorizeImage: function (img, options) {
      options = options || {};
      const targetPoints = options.targetPoints || 7500; // Số điểm mẫu mong muốn
      const depthScale = options.depthScale !== undefined ? options.depthScale : 1.8;
      const worldW = options.worldWidth || 16.0;

      // 1. Phân giải kích thước phân tích theo cấp độ chi tiết
      let maxDim = 400;
      if (targetPoints >= 6000) maxDim = 560;
      if (targetPoints >= 12000) maxDim = 720;

      const aspect = img.naturalWidth / (img.naturalHeight || 1);
      let w = maxDim, h = Math.round(maxDim / aspect);
      if (aspect < 1) {
        h = maxDim;
        w = Math.round(maxDim * aspect);
      }
      w = Math.max(w, 40);
      h = Math.max(h, 40);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 2. Tính thang độ xám (Grayscale) và gradient biên Sobel dải động cao
      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      }

      const grad = new Float32Array(w * h);
      let maxGrad = 0.0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const gx =
            -gray[idx - w - 1] + gray[idx - w + 1] -
            2 * gray[idx - 1] + 2 * gray[idx + 1] -
            gray[idx + w - 1] + gray[idx + w + 1];
          const gy =
            -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
            gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
          const g = Math.sqrt(gx * gx + gy * gy);
          grad[idx] = g;
          if (g > maxGrad) maxGrad = g;
        }
      }

      // 3. Phân bổ điểm lấy mẫu thích ứng (Edge-Aware Feature Sampling)
      const points = [];
      const coordSet = new Set();

      function addPt(x, y) {
        x = Math.max(0, Math.min(w - 1, Math.round(x)));
        y = Math.max(0, Math.min(h - 1, Math.round(y)));
        const key = `${x}_${y}`;
        if (!coordSet.has(key)) {
          coordSet.add(key);
          points.push([x, y]);
        }
      }

      // 3.1. Neo cố định 4 góc và đường viền bao quanh ảnh
      addPt(0, 0); addPt(w - 1, 0); addPt(0, h - 1); addPt(w - 1, h - 1);
      const borderStep = Math.max(3, Math.floor(w / 40));
      for (let x = borderStep; x < w - 1; x += borderStep) {
        addPt(x, 0);
        addPt(x, h - 1);
      }
      for (let y = borderStep; y < h - 1; y += borderStep) {
        addPt(0, y);
        addPt(w - 1, y);
      }

      // 3.2. Lấy mẫu ưu tiên đường nét biên độ tương phản cao (Sobel Edges)
      const edgeThreshold = Math.max(maxGrad * 0.08, 12);
      const candidates = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const g = grad[y * w + x];
          if (g > edgeThreshold) {
            candidates.push({ x, y, g });
          }
        }
      }

      // Sắp xếp ưu tiên các điểm có gradient mạnh nhất (viền nét, chữ, chi tiết cao)
      candidates.sort((a, b) => b.g - a.g);

      const numEdgePoints = Math.min(candidates.length, Math.round(targetPoints * 0.80));
      const minDistanceSq = targetPoints >= 12000 ? 1.8 : (targetPoints >= 6000 ? 2.4 : 3.4);
      for (let i = 0; i < candidates.length && points.length < numEdgePoints + 100; i++) {
        const cand = candidates[i];
        let tooClose = false;
        // Kiểm tra nhanh với 45 điểm gần nhất
        for (let k = Math.max(0, points.length - 45); k < points.length; k++) {
          const dx = points[k][0] - cand.x;
          const dy = points[k][1] - cand.y;
          if (dx * dx + dy * dy < minDistanceSq) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          addPt(cand.x, cand.y);
        }
      }

      // 3.3. Lấy mẫu rải đều (Jittered Grid) trong các vùng phẳng mịn (nền, da)
      const remaining = targetPoints - points.length;
      if (remaining > 0) {
        const stepGrid = Math.max(2.5, Math.sqrt((w * h) / remaining));
        for (let y = stepGrid / 2; y < h; y += stepGrid) {
          for (let x = stepGrid / 2; x < w; x += stepGrid) {
            const jx = x + (Math.random() - 0.5) * (stepGrid * 0.8);
            const jy = y + (Math.random() - 0.5) * (stepGrid * 0.8);
            addPt(jx, jy);
          }
        }
      }

      // 4. Chuyển mảng điểm sang dạng phẳng cho Delaunator
      const coords = new Float64Array(points.length * 2);
      for (let i = 0; i < points.length; i++) {
        coords[2 * i] = points[i][0];
        coords[2 * i + 1] = points[i][1];
      }

      // 5. Tam giác hóa Delaunay cực nhanh
      const delaunay = new Delaunator(coords);
      const triangles = delaunay.triangles;
      const numTriangles = triangles.length / 3;

      // 6. Ánh xạ tọa độ sang hệ trục thế giới Vectoria và lấy màu chính xác
      const worldH = worldW / aspect;
      const worldPoints = [];
      const vertexColors = new Float32Array(points.length * 3);
      const vertexLuminance = new Float32Array(points.length);

      for (let i = 0; i < points.length; i++) {
        const pxX = points[i][0];
        const pxY = points[i][1];

        // Tọa độ thế giới (Tâm tại 0, 0; trục Y hướng lên)
        const wx = ((pxX / w) - 0.5) * worldW;
        const wy = -((pxY / h) - 0.5) * worldH;

        // Màu tại điểm đỉnh
        const pIdx = (Math.floor(pxY) * w + Math.floor(pxX)) * 4;
        const r = data[pIdx] / 255;
        const g = data[pIdx + 1] / 255;
        const b = data[pIdx + 2] / 255;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        const wz = (lum - 0.5) * depthScale; // Độ cao nổi 3D theo độ sáng

        worldPoints.push([wx, wy, wz]);
        vertexColors[i * 3] = r;
        vertexColors[i * 3 + 1] = g;
        vertexColors[i * 3 + 2] = b;
        vertexLuminance[i] = lum;
      }

      // 7. Lấy màu trung bình khử nhiễu đa điểm (cho Canvas 2D)
      const triangleColors = [];
      for (let i = 0; i < triangles.length; i += 3) {
        const i0 = triangles[i];
        const i1 = triangles[i + 1];
        const i2 = triangles[i + 2];

        const p0 = points[i0];
        const p1 = points[i1];
        const p2 = points[i2];
        const cxPx = Math.floor((p0[0] + p1[0] + p2[0]) / 3);
        const cyPx = Math.floor((p0[1] + p1[1] + p2[1]) / 3);

        const samplePts = [
          [cxPx, cyPx, 2],
          [p0[0], p0[1], 1],
          [p1[0], p1[1], 1],
          [p2[0], p2[1], 1]
        ];
        let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
        for (let s = 0; s < samplePts.length; s++) {
          const sx = Math.max(0, Math.min(w - 1, Math.round(samplePts[s][0])));
          const sy = Math.max(0, Math.min(h - 1, Math.round(samplePts[s][1])));
          const weight = samplePts[s][2];
          const pIdx = (sy * w + sx) * 4;
          rSum += data[pIdx] * weight;
          gSum += data[pIdx + 1] * weight;
          bSum += data[pIdx + 2] * weight;
          wSum += weight;
        }
        const rAvg = Math.round(rSum / wSum);
        const gAvg = Math.round(gSum / wSum);
        const bAvg = Math.round(bSum / wSum);
        const hex = `#${((1 << 24) + (rAvg << 16) + (gAvg << 8) + bAvg).toString(16).slice(1)}`;
        triangleColors.push(hex);
      }

      return {
        isImageMesh: true,
        name: options.name || "Tranh Vector nghệ thuật",
        worldPoints: worldPoints,
        baseWorldPoints: worldPoints.map((p) => [p[0], p[1], p[2]]),
        vertexColors: vertexColors,
        triangles: triangles,
        triangleColors: triangleColors,
        numTriangles: numTriangles,
        width: worldW,
        height: worldH,
        depthScale: depthScale,
        showWireframe: false,
        visible: true,
        alpha: 1.0
      };
    },

    // Khởi tạo hộp thoại Vector hóa ảnh
    openModal: function () {
      let modal = document.getElementById("vecImageModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "vecImageModal";
        modal.className = "vec-modal-backdrop";
        modal.innerHTML = `
          <div class="vec-modal-card">
            <div class="vec-modal-header">
              <div class="vec-modal-title">
                <i class="ph ph-image"></i>
                <span>Vector hóa ảnh sang lưới vector tam giác</span>
              </div>
              <button type="button" class="vec-modal-close" id="btnVecModalClose">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="vec-modal-body">
              <div class="vec-dropzone" id="vecDropzone">
                <input type="file" id="vecImageFileInput" accept="image/png, image/jpeg, image/webp" style="display:none;" />
                <div class="vec-drop-icon"><i class="ph ph-cloud-arrow-up"></i></div>
                <div class="vec-drop-text">Bấm vào đây hoặc kéo thả ảnh PNG / JPG vào</div>
                <div class="vec-drop-sub">Tự động bóc tách đường nét và chuyển thành hàng nghìn tam giác vector</div>
                <img id="vecPreviewImg" class="vec-drop-preview" style="display:none;" alt="Xem trước ảnh vector" />
              </div>
              
              <div class="vec-modal-opts" id="vecModalOpts" style="display:none; margin-top:14px;">
                <div class="vec-opt-row">
                  <span class="vec-opt-label">Mức độ chi tiết:</span>
                  <div class="vec-opt-pills" id="vecDetailPills">
                    <button type="button" class="vec-opt-pill" data-pts="3200">Tiêu chuẩn: 6.000 tam giác</button>
                    <button type="button" class="vec-opt-pill active" data-pts="7500">Sắc nét cao: 14.000 tam giác</button>
                    <button type="button" class="vec-opt-pill" data-pts="13500">Siêu sắc nét: 26.000 tam giác</button>
                  </div>
                </div>
                <div class="vec-opt-row" style="margin-top:10px;">
                  <span class="vec-opt-label">Độ nổi khối 3D Relief:</span>
                  <div style="display:flex; align-items:center; gap:8px; flex:1;">
                    <input type="range" id="vecDepthSlider" min="0" max="4.0" step="0.2" value="1.8" style="flex:1;" />
                    <span id="vecDepthVal" style="font-family:monospace; font-weight:700; font-size:12px; min-width:32px;">1.8</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="vec-modal-footer">
              <button type="button" class="vec-btn-subtle" id="btnVecModalCancel">Hủy</button>
              <button type="button" class="vec-btn-primary" id="btnVecModalProcess" disabled>
                <i class="ph ph-sparkle"></i> Tiến hành Vector hóa
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // Sự kiện tương tác
        const closeBtn = modal.querySelector("#btnVecModalClose");
        const cancelBtn = modal.querySelector("#btnVecModalCancel");
        const dropzone = modal.querySelector("#vecDropzone");
        const fileInp = modal.querySelector("#vecImageFileInput");
        const previewImg = modal.querySelector("#vecPreviewImg");
        const modalOpts = modal.querySelector("#vecModalOpts");
        const processBtn = modal.querySelector("#btnVecModalProcess");
        const depthSlider = modal.querySelector("#vecDepthSlider");
        const depthVal = modal.querySelector("#vecDepthVal");
        const pills = modal.querySelectorAll(".vec-opt-pill");

        let selectedImg = null;
        let selectedPts = 7500;

        function closeModal() {
          modal.style.display = "none";
        }

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        dropzone.onclick = () => fileInp.click();

        dropzone.ondragover = (e) => {
          e.preventDefault();
          dropzone.classList.add("drag-hover");
        };
        dropzone.ondragleave = () => dropzone.classList.remove("drag-hover");
        dropzone.ondrop = (e) => {
          e.preventDefault();
          dropzone.classList.remove("drag-hover");
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        };

        fileInp.onchange = (e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        };

        function handleFile(file) {
          if (!file.type.startsWith("image/")) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              selectedImg = img;
              previewImg.src = img.src;
              previewImg.style.display = "block";
              modalOpts.style.display = "block";
              processBtn.disabled = false;
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }

        pills.forEach((p) => {
          p.onclick = () => {
            pills.forEach((x) => x.classList.remove("active"));
            p.classList.add("active");
            selectedPts = parseInt(p.dataset.pts, 10) || 3200;
          };
        });

        depthSlider.oninput = (e) => {
          depthVal.textContent = parseFloat(e.target.value).toFixed(1);
        };

        processBtn.onclick = () => {
          if (!selectedImg) return;
          processBtn.disabled = true;
          processBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Đang xử lý...';

          setTimeout(() => {
            try {
              const depth = parseFloat(depthSlider.value) || 1.8;
              const meshData = App.ImageVectorizer.vectorizeImage(selectedImg, {
                targetPoints: selectedPts,
                depthScale: depth,
                name: `Tranh Vector ${selectedImg.name || "Ảnh mẫu"}`
              });

              // Gắn ID và thêm vào App.vectorList
              const nextId = (App.vectorList || []).reduce((max, v) => Math.max(max, v.id || 0), 0) + 1;
              meshData.id = nextId;

              if (!App.vectorList) App.vectorList = [];
              App.vectorList.push(meshData);

              // Cập nhật giao diện danh sách
              if (typeof App.renderVectorList === "function") {
                App.renderVectorList();
              }
              if (typeof App.redrawAll === "function") {
                App.redrawAll({ frame: true });
              }
              if (App.mode === "3D" && window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
                Vec3D.hardRefresh3D(true);
              } else if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
                Vec2D.draw2DAllVectors();
              }

              closeModal();
            } catch (err) {
              console.error("Lỗi khi vector hóa ảnh:", err);
              alert("Không thể vector hóa ảnh này. Vui lòng thử ảnh khác.");
            } finally {
              processBtn.disabled = false;
              processBtn.innerHTML = '<i class="ph ph-sparkle"></i> Tiến hành Vector hóa';
            }
          }, 50);
        };
      }

      modal.style.display = "flex";
    }
  };
})();
