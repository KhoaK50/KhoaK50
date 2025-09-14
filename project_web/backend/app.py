from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

# ==== CORS (cho phép tất cả origin để dễ deploy) ====
@app.before_request
def _cors_preflight():
    if request.method == "OPTIONS" and request.path.startswith("/api/"):
        return _corsify(app.make_response(("OK", 200)))

@app.after_request
def _corsify(resp):
    origin = request.headers.get("Origin", "")
    resp.headers["Access-Control-Allow-Origin"] = "*"  # Cho phép tất cả
    resp.headers["Vary"] = "Origin"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Max-Age"] = "3600"
    return resp

# ==== helpers ====
def to_vec(x):
    if not isinstance(x, list) or not (2 <= len(x) <= 3):
        raise ValueError("Vector phải là list độ dài 2 hoặc 3.")
    return np.array([float(v) for v in x], dtype=float)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True})

# 1) add
@app.route("/api/add_vectors", methods=["POST", "OPTIONS"])
def add_vectors():
    try:
        data = request.get_json(silent=True) or {}
        v1, v2 = to_vec(data.get("v1", [])), to_vec(data.get("v2", []))
        if len(v1) != len(v2):
            return jsonify({"error": "Hai vector phải cùng chiều."}), 400
        return jsonify({"result": (v1 + v2).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 2) sub
@app.route("/api/sub_vectors", methods=["POST", "OPTIONS"])
def sub_vectors():
    try:
        data = request.get_json(silent=True) or {}
        v1, v2 = to_vec(data.get("v1", [])), to_vec(data.get("v2", []))
        if len(v1) != len(v2):
            return jsonify({"error": "Hai vector phải cùng chiều."}), 400
        return jsonify({"result": (v1 - v2).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 3) scale
@app.route("/api/scale_vector", methods=["POST", "OPTIONS"])
def scale_vector():
    try:
        data = request.get_json(silent=True) or {}
        v = to_vec(data.get("v", []))
        k = float(data.get("scalar", 0.0))
        return jsonify({"result": (v * k).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 4) dot
@app.route("/api/dot_product", methods=["POST", "OPTIONS"])
def dot_product():
    try:
        data = request.get_json(silent=True) or {}
        v1, v2 = to_vec(data.get("v1", [])), to_vec(data.get("v2", []))
        if len(v1) != len(v2):
            return jsonify({"error": "Hai vector phải cùng chiều."}), 400
        return jsonify({"result": float(np.dot(v1, v2))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 5) cross (tự nâng 2D -> 3D bằng z=0)
@app.route("/api/cross_product", methods=["POST", "OPTIONS"])
def cross_product():
    try:
        data = request.get_json(silent=True) or {}
        v1, v2 = to_vec(data.get("v1", [])), to_vec(data.get("v2", []))
        a = v1 if len(v1) == 3 else np.array([v1[0], v1[1], 0.0])
        b = v2 if len(v2) == 3 else np.array([v2[0], v2[1], 0.0])
        return jsonify({"result": np.cross(a, b).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 6) norm
@app.route("/api/vector_norm", methods=["POST", "OPTIONS"])
def vector_norm():
    try:
        data = request.get_json(silent=True) or {}
        v = to_vec(data.get("v", []))
        return jsonify({"result": float(np.linalg.norm(v))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 7) projection
@app.route("/api/projection", methods=["POST", "OPTIONS"])
def projection():
    try:
        data = request.get_json(silent=True) or {}
        v, u = to_vec(data.get("v", [])), to_vec(data.get("u", []))
        if np.linalg.norm(u) == 0:
            return jsonify({"error": "Vector u không thể bằng 0"}), 400
        proj = (np.dot(v, u) / np.dot(u, u)) * u
        return jsonify({"result": proj.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 8) angle (radian)
@app.route("/api/angle_between", methods=["POST", "OPTIONS"])
def angle_between():
    try:
        data = request.get_json(silent=True) or {}
        v1, v2 = to_vec(data.get("v1", [])), to_vec(data.get("v2", []))
        den = np.linalg.norm(v1) * np.linalg.norm(v2)
        if den == 0:
            return jsonify({"error": "Vector không được bằng 0"}), 400
        cos_theta = np.dot(v1, v2) / den
        angle = np.arccos(np.clip(cos_theta, -1.0, 1.0))
        return jsonify({"result": float(angle)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 9) normalize
@app.route("/api/normalize", methods=["POST", "OPTIONS"])
def normalize():
    try:
        data = request.get_json(silent=True) or {}
        v = to_vec(data.get("v", []))
        n = np.linalg.norm(v)
        if n == 0:
            return jsonify({"result": [0.0] * len(v)})
        return jsonify({"result": (v / n).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 10) linear independence
@app.route("/api/linear_independence", methods=["POST", "OPTIONS"])
def linear_independence():
    try:
        data = request.get_json(silent=True) or {}
        vectors = np.array(data.get("vectors", []), dtype=float).T
        rank = np.linalg.matrix_rank(vectors)
        msg = "Độc lập tuyến tính" if rank == vectors.shape[1] else "Phụ thuộc tuyến tính"
        return jsonify({"result": msg})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 11) rank
@app.route("/api/rank", methods=["POST", "OPTIONS"])
def compute_rank():
    try:
        data = request.get_json(silent=True) or {}
        mat = np.array(data.get("vectors", []), dtype=float)
        return jsonify({"rank": int(np.linalg.matrix_rank(mat))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 12) basis + dimension
@app.route("/api/basis", methods=["POST", "OPTIONS"])
def basis():
    try:
        data = request.get_json(silent=True) or {}
        mat = np.array(data.get("vectors", []), dtype=float)
        _, s, vh = np.linalg.svd(mat)
        rank = int(np.sum(s > 1e-10))
        return jsonify({"basis": vh[:rank, :].tolist(), "dimension": rank})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 13) coordinates theo cơ sở
@app.route("/api/coordinates", methods=["POST", "OPTIONS"])
def coordinates():
    try:
        data = request.get_json(silent=True) or {}
        v = np.array(data.get("vector", []), dtype=float)
        basis = np.array(data.get("basis", []), dtype=float).T
        coords = np.linalg.solve(basis, v)
        return jsonify({"coordinates": coords.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    # local test
    app.run(host="0.0.0.0", port=5000, debug=True)
