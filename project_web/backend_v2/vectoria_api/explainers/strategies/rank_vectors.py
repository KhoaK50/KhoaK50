# backend_v2/vectoria_api/explainers/strategies/rank_vectors.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import sympy as sp

from vectoria_api.core.validate import parse_latex_to_sympy
from vectoria_api.explainers.registry import register


def _to_exact_sympy(val: Any) -> sp.Expr:
    """
    Chuyen doi gia tri dau vao sang doi tuong SymPy chinh xac tuyet doi.
    Loai bo hoan toan so thuc dau phay dong (sp.Float) thanh phan so toi gian (sp.Rational).
    """
    if isinstance(val, sp.Expr):
        expr = val
    else:
        expr = parse_latex_to_sympy(str(val))
    if expr.has(sp.Float):
        expr = sp.nsimplify(expr, rational=True)
    return sp.simplify(expr)


def _validate_and_parse_vectors(raw_vectors: Any) -> Tuple[List[List[sp.Expr]], int, int]:
    """
    Validate mang 2D chua cac vector va parse thanh List[List[sp.Expr]].
    Tra ve: (mat_exprs, m, n) voi m la so vector, n la chieu khong gian.
    """
    if not isinstance(raw_vectors, list) or len(raw_vectors) == 0:
        raise ValueError("Danh sach vectors phai la mang 2D khong rong.")

    parsed: List[List[sp.Expr]] = []
    dim: Optional[int] = None

    for row in raw_vectors:
        if not isinstance(row, list) or len(row) == 0:
            raise ValueError("Moi vector phai la mot danh sach khong rong.")
        if dim is None:
            dim = len(row)
        elif len(row) != dim:
            raise ValueError("Tat ca cac vector phai co cung chieu khong gian.")

        row_exprs = [_to_exact_sympy(x) for x in row]
        parsed.append(row_exprs)

    m = len(parsed)
    n = dim if dim is not None else 0
    return parsed, m, n


def _matrix_to_latex(M: List[List[Any]], name: Optional[str] = None) -> str:
    """
    Xuat bieu dien ma tran duoi dang LaTeX pmatrix.
    """
    rows: List[str] = []
    for row in M:
        row_str = " & ".join(
            sp.latex(sp.simplify(sp.sympify(x))) if not isinstance(x, str) else x
            for x in row
        )
        rows.append(row_str)
    body = " \\\\ ".join(rows)
    mat_latex = f"\\begin{{pmatrix}} {body} \\end{{pmatrix}}"
    if name:
        return f"{name} = {mat_latex}"
    return mat_latex


def _sub_name(prefix: str, idx: int) -> str:
    """
    Tra ve ky hieu bien kem chi so duoi:
    Vi du: prefix='v', idx=1 -> 'v_1'; idx=10 -> 'v_{10}'.
    """
    return f"{prefix}_{idx}" if idx < 10 else f"{prefix}_{{{idx}}}"


def _perform_gaussian_elimination(
    M: List[List[sp.Expr]],
) -> Tuple[int, List[List[sp.Expr]], List[Dict[str, Any]], List[List[int]]]:
    """
    Thuc hien khu Gauss chinh xac bang SymPy tren ma tran dong M (m x n).
    Ghi nhan cac buoc bien doi so cap theo hang co nhan LaTeX chuan.
    Tra ve: (rank, E, steps, pivots).
    """
    m = len(M)
    n = len(M[0])
    A = [[sp.simplify(x) for x in row] for row in M]
    steps: List[Dict[str, Any]] = []
    r = 0

    def snapshot(mat: List[List[sp.Expr]]) -> List[List[str]]:
        return [[sp.latex(x) for x in row] for row in mat]

    for c in range(n):
        if r >= m:
            break

        candidates = [i for i in range(r, m) if A[i][c] != 0]
        if not candidates:
            continue

        pivot_pos = candidates[0]
        if pivot_pos != r:
            A[r], A[pivot_pos] = A[pivot_pos], A[r]
            steps.append({
                "op": "swap",
                "latex_label": f"{_sub_name('h', r + 1)} \\leftrightarrow {_sub_name('h', pivot_pos + 1)}",
                "matrix": snapshot(A),
            })

        pivot_val = A[r][c]
        elim_labels: List[str] = []
        for i in range(r + 1, m):
            if A[i][c] == 0:
                continue
            factor = sp.simplify(A[i][c] / pivot_val)
            for j in range(n):
                A[i][j] = sp.simplify(A[i][j] - factor * A[r][j])

            h_i = _sub_name("h", i + 1)
            h_r = _sub_name("h", r + 1)
            neg_factor = sp.simplify(-factor)
            if neg_factor == 1:
                label = f"{h_i} \\leftarrow {h_i} + {h_r}"
            elif neg_factor == -1:
                label = f"{h_i} \\leftarrow {h_i} - {h_r}"
            elif neg_factor.is_negative:
                pos_term = sp.latex(sp.simplify(-neg_factor))
                label = f"{h_i} \\leftarrow {h_i} - {pos_term}{h_r}"
            else:
                pos_term = sp.latex(neg_factor)
                label = f"{h_i} \\leftarrow {h_i} + {pos_term}{h_r}"
            elim_labels.append(label)

        if elim_labels:
            steps.append({
                "op": "elim",
                "latex_label": ",\\; ".join(elim_labels),
                "matrix": snapshot(A),
            })

        r += 1

    pivots: List[List[int]] = []
    for row_idx, row in enumerate(A):
        for col_idx, val in enumerate(row):
            if val != 0:
                pivots.append([row_idx, col_idx])
                break

    rank = len(pivots)
    return rank, A, steps, pivots


def explain_rank_vectors(vectors: Any, **kwargs: Any) -> Dict[str, Any]:
    """
    Bo giai thich toan dien bai toan Tinh hang cua he vector.
    Tuan thu nghiem ngat hop dong du lieu 4 pha va Zero Em-dash.
    """
    A_sym, m, n = _validate_and_parse_vectors(vectors)

    # 1. Giai bang Phuong phap 1: Ma tran dong dua ve dang bac thang (REF)
    rank, E_sym, steps, pivots = _perform_gaussian_elimination(A_sym)

    matrix_setup_latex = _matrix_to_latex(A_sym, name="A")
    echelon_matrix_latex = [[sp.latex(x) for x in row] for row in E_sym]

    vec_names = ", ".join([_sub_name("v", i + 1) for i in range(m)])
    deduction_latex = (
        f"\\mathrm{{rank}}(\\{{{vec_names}\\}}) = \\text{{số dòng khác 0 của }} E = {rank}"
    )
    conclusion_matrix = (
        f"Hạng của hệ vector là {rank}. Không gian sinh "
        f"\\mathrm{{span}}(\\{{{vec_names}\\}}) có số chiều là {rank}."
    )
    status_message = f"Hạng của hệ vector là {rank}."

    method_matrix_payload = {
        "title": "Cách 1: Phương pháp biến đổi sơ cấp đưa về ma trận bậc thang",
        "matrix_setup_latex": matrix_setup_latex,
        "steps": steps,
        "echelon_matrix": echelon_matrix_latex,
        "nonzero_rows": rank,
        "pivots": pivots,
        "deduction_latex": deduction_latex,
        "conclusion_text": conclusion_matrix,
    }

    # 2. Giai bang Phuong phap 2: He vector doc lap tuyen tinh toi dai
    # Tim co so cac vector goc thong qua cac cot tru cua ma tran cot V_col = A^T
    V_col = sp.Matrix(A_sym).T
    _, pivot_cols = V_col.rref()
    basis_indices = list(pivot_cols)

    if rank == 0:
        maximal_subset_latex = r"S' = \emptyset"
        span_dim_text = (
            "Hệ vector chỉ gồm vector không, không gian sinh có số chiều bằng 0."
        )
    else:
        basis_vec_names = ", ".join([_sub_name("v", idx + 1) for idx in basis_indices])
        maximal_subset_latex = (
            f"S' = \\{{{basis_vec_names}\\}} \\text{{ là hệ độc lập tuyến tính tối đại}}"
        )
        span_dim_text = (
            f"Mọi vector khác trong hệ đều biểu diễn tuyến tính qua {rank} vector của S', "
            f"do đó rank = {rank}."
        )

    conclusion_equation = (
        f"Số lượng vector độc lập tuyến tính cực đại trong hệ là {rank}, "
        f"nên hạng của hệ vector bằng {rank}."
    )

    method_equation_payload = {
        "title": "Cách 2: Phương pháp hệ vector độc lập tuyến tính tối đại",
        "maximal_independent_subset_latex": maximal_subset_latex,
        "maximal_independent_indices": basis_indices,
        "span_dimension_text": span_dim_text,
        "conclusion_text": conclusion_equation,
    }

    # Serialize vector dau vao thanh list cac gia tri an toan
    vectors_serialized: List[List[Any]] = []
    for row in A_sym:
        row_s: List[Any] = []
        for x in row:
            if x.is_integer:
                row_s.append(int(x))
            else:
                row_s.append(str(x))
        vectors_serialized.append(row_s)

    payload: Dict[str, Any] = {
        # Truong tuong thich nguoc (Root level)
        "rank": rank,
        "message": status_message,
        # Hop dong chi tiet 4 pha
        "problem_id": "rank_vectors",
        "vectors": vectors_serialized,
        "dimension": n,
        "num_vectors": m,
        "result": {
            "rank": rank,
            "dimension_span": rank,
            "pivots": pivots,
            "basis_indices": basis_indices,
        },
        "method_matrix": method_matrix_payload,
        "method_equation": method_equation_payload,
        "method_definition": method_equation_payload,
    }

    return payload


# Dang ky ca 3 alias vao registry
register("rank_vectors", explain_rank_vectors)
register("linear_algebra.rank", explain_rank_vectors)
register("rank", explain_rank_vectors)
