# backend_v2/vectoria_api/core/validate.py
from __future__ import annotations
from typing import Any, Dict, List, Tuple
import numpy as np
from flask import request
import sympy as sp
from antlr4.error.ErrorListener import ErrorListener
from sympy.parsing.latex import parse_latex


def require_json() -> Dict[str, Any]:
    return request.get_json(silent=True) or {}


def parse_latex_to_sympy(expr_str: str) -> sp.Expr:
    """
    Chuyển đổi chuỗi (hoặc LaTeX) thành đối tượng SymPy an toàn.
    """
    if isinstance(expr_str, (int, float)):
        return sp.sympify(expr_str)
    
    expr_str = str(expr_str).strip()
    if not expr_str:
        return sp.Integer(0)
        
    try:
        # Thử parse như string bình thường trước (ví dụ: "1/3", "sqrt(2)")
        return sp.sympify(expr_str)
    except Exception:
        pass
        
    try:
        # Nếu lỗi, thử parse bằng LaTeX
        # Sửa các syntax rác của MathLive
        clean_tex = expr_str.replace(r"\mleft", r"\left").replace(r"\mright", r"\right")
        # SymPy parse_latex không hiểu \sqrt3, cần chuyển thành \sqrt{3}
        import re
        clean_tex = re.sub(r'\\sqrt(\d+)', r'\\sqrt{\1}', clean_tex)
        
        return parse_latex(clean_tex)
    except ImportError as ie:
        raise ValueError("Lỗi môi trường Backend: Thiếu thư viện antlr4-python3-runtime==4.11.1. Hãy cài đặt đúng phiên bản này!") from ie
    except Exception as e:
        raise ValueError(f"Không thể parse biểu thức toán học: {expr_str}") from e


def validate_vector(
    x: Any, *, allow_2d_3d: bool = False
) -> list[sp.Expr]:
    if not isinstance(x, list):
        raise ValueError("Vector phải là list.")

    if len(x) == 0:
        raise ValueError("Vector không được rỗng.")

    try:
        return [parse_latex_to_sympy(v) for v in x]
    except Exception as e:
        raise ValueError(str(e))


def validate_vectors_2d_list(vecs: Any) -> list[list[sp.Expr]]:
    """
    vecs: list[list[str/float]] -> list[list[sp.Expr]]
    """
    if not isinstance(vecs, list) or len(vecs) == 0:
        raise ValueError("vectors phải là list 2D không rỗng.")
    
    mat = []
    for row in vecs:
        if not isinstance(row, list):
            raise ValueError("vectors phải là list 2D.")
        mat.append([parse_latex_to_sympy(v) for v in row])
        
    return mat


def ensure_same_dim(a: list, b: list):
    if len(a) != len(b):
        raise ValueError("Hai vector phải cùng chiều.")
