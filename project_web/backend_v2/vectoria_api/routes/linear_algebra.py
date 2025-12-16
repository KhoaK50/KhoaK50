# backend_v2/vectoria_api/routes/linear_algebra.py
from flask import Blueprint, jsonify
import numpy as np

from vectoria_api.core.validate import require_json, validate_vectors_2d_list
from vectoria_api.explainers.engine import explain

bp = Blueprint("linear_algebra", __name__)


@bp.post("/api/rank")
def compute_rank():
    try:
        data = require_json()
        mat = validate_vectors_2d_list(data.get("vectors", []))
        return jsonify({"rank": int(np.linalg.matrix_rank(mat))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/linear_independence")
def linear_independence():
    try:
        data = require_json()
        mat = validate_vectors_2d_list(data.get("vectors", []))
        r = int(np.linalg.matrix_rank(mat))
        msg = "Độc lập tuyến tính" if r == mat.shape[0] else "Phụ thuộc tuyến tính"
        return jsonify({"result": msg, "rank": r})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


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


@bp.post("/api/coordinates")
def coordinates():
    try:
        data = require_json()
        v = np.array(data.get("vector", []), dtype=float)
        basis = np.array(data.get("basis", []), dtype=float)

        if v.ndim != 1:
            return jsonify({"error": "vector phải là list 1D."}), 400
        if basis.ndim != 2:
            return jsonify({"error": "basis phải là list 2D (list các vector)."}), 400

        BT = basis.T  # dim x r
        if BT.shape[0] != v.shape[0]:
            return jsonify({"error": "Chiều của vector và basis không khớp."}), 400

        if BT.shape[0] == BT.shape[1]:
            coords = np.linalg.solve(BT, v)
        else:
            coords, _, _, _ = np.linalg.lstsq(BT, v, rcond=None)

        return jsonify({"coordinates": coords.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
