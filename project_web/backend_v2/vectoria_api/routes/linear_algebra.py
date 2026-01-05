from flask import Blueprint, jsonify
import numpy as np

from vectoria_api.core.validate import require_json, validate_vectors_2d_list
from vectoria_api.explainers.engine import explain

bp = Blueprint("linear_algebra", __name__)


# =========================
# HẠNG HỆ VECTOR
# =========================
@bp.post("/api/rank")
def compute_rank():
    try:
        data = require_json()
        vectors = validate_vectors_2d_list(data.get("vectors", []))

        A = np.array(vectors, dtype=float).T   # ⬅️ QUAN TRỌNG
        rank = int(np.linalg.matrix_rank(A))

        return jsonify({
            "rank": rank,
            "message": f"Hạng của hệ vector là {rank}."
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =========================
# ĐỘC LẬP TUYẾN TÍNH
# =========================
@bp.post("/api/linear_independence")
def linear_independence():
    try:
        data = require_json()
        vectors = validate_vectors_2d_list(data.get("vectors", []))

        A = np.array(vectors, dtype=float).T   # ⬅️ QUAN TRỌNG
        rank = int(np.linalg.matrix_rank(A))
        num_vectors = A.shape[1]

        independent = (rank == num_vectors)

        return jsonify({
            "independent": independent,
            "rank": rank,
            "message": (
                "Hệ vector độc lập tuyến tính."
                if independent
                else "Hệ vector phụ thuộc tuyến tính."
            )
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =========================
# CƠ SỞ
# =========================
@bp.post("/api/basis")
def basis():
    try:
        data = require_json()
        vectors = data.get("vectors", [])

        payload = explain(
            "basis.gauss_rows",
            vectors=vectors,
            tol=1e-10,
            pivot_strategy="min_norm"
        )
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =========================
# TỌA ĐỘ THEO CƠ SỞ
# =========================
@bp.post("/api/coordinates")
def coordinates():
    try:
        data = require_json()
        v = np.array(data.get("vector", []), dtype=float)
        basis = np.array(data.get("basis", []), dtype=float)

        if v.ndim != 1:
            return jsonify({"error": "vector phải là list 1D."}), 400
        if basis.ndim != 2:
            return jsonify({"error": "basis phải là list 2D."}), 400

        B = basis.T
        if B.shape[0] != v.shape[0]:
            return jsonify({"error": "Chiều vector không khớp với cơ sở."}), 400

        if B.shape[0] == B.shape[1]:
            coords = np.linalg.solve(B, v)
        else:
            coords, *_ = np.linalg.lstsq(B, v, rcond=None)

        return jsonify({"coordinates": coords.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
