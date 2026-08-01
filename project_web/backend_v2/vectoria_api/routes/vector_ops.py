# backend_v2/vectoria_api/routes/vector_ops.py
from flask import Blueprint, jsonify
import numpy as np
import sympy as sp

from vectoria_api.core.validate import require_json, validate_vector, ensure_same_dim

bp = Blueprint("vector_ops", __name__)

def to_float_list(expr_list):
    return [float(x.evalf()) for x in expr_list]

def to_latex_list(expr_list):
    return [sp.latex(sp.simplify(x)) for x in expr_list]


@bp.post("/api/add_vectors")
def add_vectors():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)
        
        M1 = sp.Matrix(v1)
        M2 = sp.Matrix(v2)
        res = M1 + M2
        
        return jsonify({
            "result": to_float_list(list(res)),
            "result_latex": to_latex_list(list(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/sub_vectors")
def sub_vectors():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)
        
        M1 = sp.Matrix(v1)
        M2 = sp.Matrix(v2)
        res = M1 - M2
        
        return jsonify({
            "result": to_float_list(list(res)),
            "result_latex": to_latex_list(list(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/scale_vector")
def scale_vector():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        # k could be a string like "sqrt(2)"
        k_raw = data.get("scalar", 0.0)
        from vectoria_api.core.validate import parse_latex_to_sympy
        k = parse_latex_to_sympy(k_raw)
        
        M = sp.Matrix(v)
        res = M * k
        
        return jsonify({
            "result": to_float_list(list(res)),
            "result_latex": to_latex_list(list(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/dot_product")
def dot_product():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)
        
        M1 = sp.Matrix(v1)
        M2 = sp.Matrix(v2)
        res = M1.dot(M2)
        
        return jsonify({
            "result": float(res.evalf()),
            "result_latex": sp.latex(sp.simplify(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/cross_product")
def cross_product():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))

        a = v1 if len(v1) == 3 else [v1[0], v1[1], sp.Integer(0)]
        b = v2 if len(v2) == 3 else [v2[0], v2[1], sp.Integer(0)]

        M1 = sp.Matrix(a)
        M2 = sp.Matrix(b)
        res = M1.cross(M2)

        return jsonify({
            "result": to_float_list(list(res)),
            "result_latex": to_latex_list(list(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/vector_norm")
def vector_norm():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        M = sp.Matrix(v)
        res = M.norm()
        return jsonify({
            "result": float(res.evalf()),
            "result_latex": sp.latex(sp.simplify(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/projection")
def projection():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        u = validate_vector(data.get("u", []))
        ensure_same_dim(v, u)

        M_v = sp.Matrix(v)
        M_u = sp.Matrix(u)
        
        den = M_u.dot(M_u)
        if sp.simplify(den) == 0:
            return jsonify({"error": "Vector u không thể bằng 0"}), 400

        proj = (M_v.dot(M_u) / den) * M_u
        return jsonify({
            "result": to_float_list(list(proj)),
            "result_latex": to_latex_list(list(proj))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/angle_between")
def angle_between():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)

        M1 = sp.Matrix(v1)
        M2 = sp.Matrix(v2)
        
        den = M1.norm() * M2.norm()
        if sp.simplify(den) == 0:
            return jsonify({"error": "Vector không được bằng 0"}), 400

        cos_theta = M1.dot(M2) / den
        
        # Để lấy góc, ta phải đánh giá float vì hàm arccos trong SymPy có thể để dạng biểu thức
        cos_val = float(cos_theta.evalf())
        angle = float(np.arccos(np.clip(cos_val, -1.0, 1.0)))
        
        return jsonify({
            "result": angle,
            "result_latex": sp.latex(sp.simplify(cos_theta)) # Trả về cos(theta) dưới dạng phân số đẹp nếu muốn
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/normalize")
def normalize():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        M = sp.Matrix(v)
        n = M.norm()
        if sp.simplify(n) == 0:
            return jsonify({
                "result": [0.0] * len(v),
                "result_latex": ["0"] * len(v)
            })
            
        res = M / n
        return jsonify({
            "result": to_float_list(list(res)),
            "result_latex": to_latex_list(list(res))
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400
