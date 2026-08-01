from flask import Blueprint, jsonify
import sympy as sp

from vectoria_api.core.validate import require_json, validate_vectors_2d_list, validate_vector
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

        A = sp.Matrix(vectors).T
        rank = A.rank()

        return jsonify({"rank": rank, "message": f"Hạng của hệ vector là {rank}."})
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

        A = sp.Matrix(vectors).T
        rank = A.rank()
        num_vectors = A.shape[1]

        independent = rank == num_vectors

        return jsonify(
            {
                "independent": independent,
                "rank": rank,
                "message": (
                    "Hệ vector độc lập tuyến tính."
                    if independent
                    else "Hệ vector phụ thuộc tuyến tính."
                ),
            }
        )
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
            "basis.gauss_rows", vectors=vectors, tol=1e-10, pivot_strategy="min_norm"
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
        v = validate_vector(data.get("vector", []))
        basis = validate_vectors_2d_list(data.get("basis", []))

        M_v = sp.Matrix(v)
        M_basis = sp.Matrix(basis)
        
        B = M_basis.T
        if B.shape[0] != M_v.shape[0]:
            return jsonify({"error": "Chiều vector không khớp."}), 400

        # 1. Tính toán
        try:
            # Dùng LUSolve cho chính xác, nếu vô nghiệm hoặc vô số nghiệm thì try pseudo-inverse
            coords = B.solve(M_v)
        except ValueError:
            # Nếu hệ quá xác định (overdetermined) nhưng vẫn có nghiệm gần đúng, dùng solve_least_squares
            coords = B.solve_least_squares(M_v)

        # 2. Tạo 2 phiên bản
        # Bản raw (số thực) để vẽ đồ thị
        raw_coords = [float(x.evalf()) for x in coords]

        # Bản pretty (chuỗi đẹp) để hiển thị text
        pretty_coords = [sp.latex(sp.simplify(x)) for x in coords]

        # 3. Trả về cả hai
        return jsonify(
            {
                "coordinates": raw_coords,
                "pretty_coordinates": pretty_coords,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 400
