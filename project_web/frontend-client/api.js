// ===================== api.js =====================
// Gom các hàm API rời rạc vào một file.
// - Mặc định gọi backend local: http://127.0.0.1:5000/api
// - Giữ nguyên signature: callAPI(op, payload, outId)
// - Các hàm tiện ích: addVectors, subVectors, scaleVector, crossProduct,
//   dotProduct, vectorNorm, normalizeVec, projection, angleBetween,
//   basisAndDim, checkIndependence, coordinates, rankVec
// --------------------------------------------------

(function () {
  // [0] Config & helpers
  const API_BASE = (window.App && window.App.API_BASE) ? window.App.API_BASE : "http://127.0.0.1:5000";
  const BASE_URL = `${API_BASE}/api`;

  // In ra lỗi đẹp vào 1 element nếu có
  function setOut(outId, text) {
    if (!outId) return;
    const el = document.getElementById(outId);
    if (el) el.innerText = text;
  }

  // Chuẩn hoá kết quả để hiển thị
  function prettyResult(json) {
    if (json == null) return "—";
    if (Array.isArray(json)) return JSON.stringify(json);
    if (typeof json === "object") {
      // Nếu backend trả {result: ...} thì ưu tiên hiển thị nó
      if ("result" in json) {
        const r = json.result;
        return (typeof r === "object") ? JSON.stringify(r) : String(r);
      }
      return JSON.stringify(json);
    }
    return String(json);
  }

  // [1] callAPI chuẩn (giữ đúng chữ ký bạn đang dùng)
  // op: tên endpoint (vd: "add_vectors"), payload: object,
  // outId: id element để hiển thị kết quả (tùy chọn)
  async function callAPI(op, payload, outId) {
    try {
      const res = await fetch(`${BASE_URL}/${op}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify(payload || {})
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${t}`);
      }

      const data = await res.json();
      const txt = prettyResult(data);
      setOut(outId, txt);
      return data;
    } catch (err) {
      setOut(outId, "Lỗi: " + err.message);
      throw err;
    }
  }

  // Expose global cho code cũ
  window.callAPI = callAPI;

  // [2] addVectors
  window.addVectors = function () {
    callAPI("add_vectors", {
      v1: JSON.parse(document.getElementById("v1_add").value),
      v2: JSON.parse(document.getElementById("v2_add").value)
    }, "result_add");
  };

  // [3] subVectors
  window.subVectors = function () {
    callAPI("sub_vectors", {
      v1: JSON.parse(document.getElementById("v1_sub").value),
      v2: JSON.parse(document.getElementById("v2_sub").value)
    }, "result_sub");
  };

  // [4] scaleVector
  window.scaleVector = function () {
    callAPI("scale_vector", {
      v: JSON.parse(document.getElementById("v_scale").value),
      scalar: parseFloat(document.getElementById("scalar").value)
    }, "result_scale");
  };

  // [5] crossProduct
  window.crossProduct = function () {
    callAPI("cross_product", {
      v1: JSON.parse(document.getElementById("v1_cross").value),
      v2: JSON.parse(document.getElementById("v2_cross").value)
    }, "result_cross");
  };

  // [6] dotProduct
  window.dotProduct = function () {
    callAPI("dot_product", {
      v1: JSON.parse(document.getElementById("v1_dot").value),
      v2: JSON.parse(document.getElementById("v2_dot").value)
    }, "result_dot");
  };

  // [7] vectorNorm
  window.vectorNorm = function () {
    callAPI("vector_norm", {
      v: JSON.parse(document.getElementById("v_norm").value)
    }, "result_norm");
  };

  // [8] normalizeVec
  window.normalizeVec = function () {
    const v = JSON.parse(document.getElementById("v_normz").value);
    callAPI("normalize", { v }, "result_normz");
  };

  // [9] projection (nếu backend có endpoint /projection)
  window.projection = function () {
    callAPI("projection", {
      v: JSON.parse(document.getElementById("v_proj").value),
      u: JSON.parse(document.getElementById("u_proj").value)
    }, "result_proj");
  };

  // [10] angleBetween
  window.angleBetween = function () {
    callAPI("angle_between", {
      v1: JSON.parse(document.getElementById("v1_angle").value),
      v2: JSON.parse(document.getElementById("v2_angle").value)
    }, "result_angle");
  };

  // [11] basisAndDim  (dùng đường dẫn đầy đủ tới /api/basis)
  window.basisAndDim = function () {
    fetch(`${BASE_URL}/basis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify({
        vectors: JSON.parse(document.getElementById("vectors_basis").value)
      })
    })
      .then(res => res.json())
      .then(data => {
        const out = `Cơ sở:\n${JSON.stringify(data.basis, null, 2)}\nSố chiều: ${data.dimension}`;
        setOut("result_basis", out);
      })
      .catch(err => setOut("result_basis", "Lỗi: " + err.message));
  };

  // [12] checkIndependence
  window.checkIndependence = function () {
    callAPI("linear_independence", {
      vectors: JSON.parse(document.getElementById("vectors_indep").value)
    }, "result_indep");
  };

  // [13] coordinates
  window.coordinates = function () {
    fetch(`${BASE_URL}/coordinates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify({
        vector: JSON.parse(document.getElementById("coord_vector").value),
        basis: JSON.parse(document.getElementById("coord_basis").value)
      })
    })
      .then(res => res.json())
      .then(data => {
        const coords = data.coordinates;
        const basis = JSON.parse(document.getElementById("coord_basis").value);
        const terms = coords.map((c, i) => `${c} [${basis[i].join(",")}]`);
        setOut("result_coord", `[${coords.join(",")}] = ` + terms.join(" + "));
      })
      .catch(err => setOut("result_coord", "Lỗi: " + err.message));
  };

  // [14] rankVec
  window.rankVec = function () {
    fetch(`${BASE_URL}/rank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify({
        vectors: JSON.parse(document.getElementById("vectors_rank").value)
      })
    })
      .then(res => res.json())
      .then(data => setOut("result_rank", String(data.rank)))
      .catch(err => setOut("result_rank", "Lỗi: " + err.message));
  };

})();
