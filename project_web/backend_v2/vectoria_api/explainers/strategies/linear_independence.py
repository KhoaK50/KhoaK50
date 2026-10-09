# backend_v2/vectoria_api/explainers/strategies/linear_independence.py
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


def _format_linear_combo(terms: List[Tuple[Any, str]], zero_str: str = r"\vec{0}") -> str:
    """
    Dinh dang to hop tuyen tinh dang c_1 v_1 + c_2 v_2 - c_3 v_3.
    terms: danh sach cac cap (he_so, ten_bien).
    """
    res = ""
    for coeff, name in terms:
        c = sp.simplify(coeff)
        if c == 0:
            continue
        if c == 1:
            t = name
        elif c == -1:
            t = f"-{name}"
        elif c.is_negative:
            t = f"-{sp.latex(sp.simplify(-c))}{name}"
        else:
            t = f"{sp.latex(c)}{name}"

        if not res:
            res = t
        else:
            if t.startswith("-"):
                res += f" - {t[1:]}"
            else:
                res += f" + {t}"
    return res if res else zero_str


def _sub_name(prefix: str, idx: int) -> str:
    """
    Tra ve ky hieu bien kem chi so duoi:
    Vi du: prefix='v', idx=1 -> 'v_1'; idx=10 -> 'v_{10}'.
    """
    return f"{prefix}_{idx}" if idx < 10 else f"{prefix}_{{{idx}}}"


def _format_scalar_system(A: List[List[sp.Expr]], m: int, n: int) -> str:
    """
    Thiet lap he phuong trinh dai so tuyen tinh thuan nhat tu cac vector:
    sum_{j=1}^m c_j v_{j, k} = 0 voi moi k tu 1 den n.
    """
    eq_lines: List[str] = []
    for k in range(n):
        terms: List[Tuple[sp.Expr, str]] = []
        for j in range(m):
            val = A[j][k]
            if val != 0:
                terms.append((val, _sub_name("c", j + 1)))
        lhs = _format_linear_combo(terms, zero_str="0")
        eq_lines.append(f"{lhs} = 0")
    return "\\begin{cases} " + " \\\\ ".join(eq_lines) + " \\end{cases}"


def _format_augmented_matrix(A: List[List[sp.Expr]], m: int, n: int) -> str:
    """
    Thiet lap ma tran bo sung [V_col | 0] cua he phuong trinh thuan nhat.
    """
    rows: List[str] = []
    for k in range(n):
        cols_str = " & ".join(sp.latex(A[j][k]) for j in range(m))
        rows.append(f"{cols_str} & \\bigm| & 0")
    body = " \\\\ ".join(rows)
    return f"\\begin{{pmatrix}} {body} \\end{{pmatrix}}"


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


def _solve_homogeneous_system(
    A: List[List[sp.Expr]], m: int, n: int
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Giai he phuong trinh vector thuan nhat V_col * c = 0 bang RREF va Nullspace.
    Tra ve: (dependency_relations, method_equation_dict).
    """
    V_col = sp.Matrix(A).T
    rref_mat, pivot_cols = V_col.rref()
    pivot_cols_list = list(pivot_cols)
    free_cols = [j for j in range(m) if j not in pivot_cols_list]

    is_independent = len(free_cols) == 0
    dependency_relations: List[Dict[str, Any]] = []

    # 1. Trich xuat he thuc bieu dien tuyen tinh cho moi vector tu do
    for k in free_cols:
        terms: List[Tuple[sp.Expr, str]] = []
        for r_idx, p in enumerate(pivot_cols_list):
            c_val = rref_mat[r_idx, k]
            if c_val != 0:
                terms.append((c_val, _sub_name("v", p + 1)))
        combo_latex = _format_linear_combo(terms, zero_str=r"\vec{0}")
        dependency_relations.append({
            "dependent_index": k,
            "dependent_name": _sub_name("v", k + 1),
            "linear_combination_latex": f"{_sub_name('v', k + 1)} = {combo_latex}",
        })

    vector_eq_latex = (
        " + ".join([f"{_sub_name('c', i + 1)} {_sub_name('v', i + 1)}" for i in range(m)])
        + r" = \vec{0} \quad (c_i \in \mathbb{R})"
    )
    scalar_sys_latex = _format_scalar_system(A, m, n)
    augmented_mat_latex = _format_augmented_matrix(A, m, n)

    if is_independent:
        solution_type = "unique"
        free_variables: List[str] = []
        gen_sol_lines = [f"{_sub_name('c', i + 1)} = 0" for i in range(m)]
        general_solution_latex = (
            "\\begin{cases} " + " \\\\ ".join(gen_sol_lines) + " \\end{cases}"
        )
        nontrivial_example = None
        conclusion_text = (
            "Hệ phương trình chỉ có nghiệm tầm thường duy nhất c_1 = c_2 = ... = c_m = 0, "
            "do đó hệ vector độc lập tuyến tính."
        )
    else:
        solution_type = "infinite"
        free_variables = [_sub_name("c", j + 1) for j in free_cols]

        if len(free_cols) == 1:
            params = ["t"]
            domain_str = "t \\in \\mathbb{R}"
        else:
            params = [f"t_{idx + 1}" if idx + 1 < 10 else f"t_{{{idx + 1}}}" for idx in range(len(free_cols))]
            domain_str = ", ".join(params) + " \\in \\mathbb{R}"

        sol_lines: List[str] = []
        for i in range(m):
            c_var = _sub_name("c", i + 1)
            if i in free_cols:
                k_idx = free_cols.index(i)
                sol_lines.append(f"{c_var} = {params[k_idx]}")
            else:
                r_idx = pivot_cols_list.index(i)
                terms_param = [
                    (-rref_mat[r_idx, free_cols[k_idx]], params[k_idx])
                    for k_idx in range(len(free_cols))
                ]
                expr_param = _format_linear_combo(terms_param, zero_str="0")
                sol_lines.append(f"{c_var} = {expr_param}")

        general_solution_latex = (
            "\\begin{cases} "
            + " \\\\ ".join(sol_lines)
            + " \\end{cases} \\quad ("
            + domain_str
            + ")"
        )

        # Tim nghiem khong tam thuong nguyen dep qua Nullspace
        ns = V_col.nullspace()
        if ns:
            raw_vec = ns[0]
            lcm_val = sp.Integer(1)
            for val in raw_vec:
                q = sp.sympify(val).q if hasattr(sp.sympify(val), "q") else 1
                lcm_val = sp.lcm(lcm_val, q)
            int_coeffs = [sp.simplify(val * lcm_val) for val in raw_vec]
            gcd_val = sp.gcd([sp.Abs(x) for x in int_coeffs if x != 0])
            if gcd_val > 0:
                clean_coeffs = [sp.simplify(x / gcd_val) for x in int_coeffs]
            else:
                clean_coeffs = int_coeffs

            # Chon vector phu thuoc de bieu dien
            dep_k = free_cols[-1]
            if clean_coeffs[dep_k] < 0:
                clean_coeffs = [-x for x in clean_coeffs]

            lhs_terms = [(c, _sub_name("v", idx + 1)) for idx, c in enumerate(clean_coeffs)]
            lhs_latex = _format_linear_combo(lhs_terms, zero_str=r"\vec{0}") + r" = \vec{0}"

            c_dep = clean_coeffs[dep_k]
            dep_var = _sub_name("v", dep_k + 1)
            if c_dep != 0:
                rhs_terms = [
                    (-sp.simplify(c / c_dep), _sub_name("v", idx + 1))
                    for idx, c in enumerate(clean_coeffs)
                    if idx != dep_k
                ]
                rhs_latex = f"{dep_var} = " + _format_linear_combo(rhs_terms)
                relation_latex = f"{lhs_latex} \\implies {rhs_latex}"
            else:
                relation_latex = lhs_latex

            param_val_str = "t = 1" if len(free_cols) == 1 else "t_1 = 1"
            nontrivial_example = {
                "param_value": param_val_str,
                "coeffs": [int(x) if x.is_integer else str(x) for x in clean_coeffs],
                "relation_latex": relation_latex,
            }
        else:
            nontrivial_example = None

        conclusion_text = (
            "Hệ phương trình có nghiệm không tầm thường, do đó hệ vector phụ thuộc tuyến tính."
        )

    method_equation_payload = {
        "title": "Cách 2: Phương pháp định nghĩa và hệ phương trình thuần nhất",
        "vector_equation_latex": vector_eq_latex,
        "scalar_system_latex": scalar_sys_latex,
        "augmented_matrix_latex": augmented_mat_latex,
        "solution_type": solution_type,
        "free_variables": free_variables,
        "general_solution_latex": general_solution_latex,
        "nontrivial_example": nontrivial_example,
        "conclusion_text": conclusion_text,
    }

    return dependency_relations, method_equation_payload


def explain_linear_independence(vectors: Any, **kwargs: Any) -> Dict[str, Any]:
    """
    Bo giai thich toan dien bai toan Doc lap / Phu thuoc tuyen tinh.
    Tuan thu nghiem ngat hop dong du lieu 4 pha va Zero Em-dash.
    """
    A_sym, m, n = _validate_and_parse_vectors(vectors)

    # 1. Giai bang Phuong phap 1: Ma tran dong & Khu Gauss
    rank, E_sym, steps, pivots = _perform_gaussian_elimination(A_sym)
    is_independent = rank == m

    matrix_setup_latex = _matrix_to_latex(A_sym, name="A")
    echelon_matrix_latex = [[sp.latex(x) for x in row] for row in E_sym]

    vec_names = ", ".join([_sub_name("v", i + 1) for i in range(m)])
    if is_independent:
        deduction_latex = (
            f"\\mathrm{{rank}}(\\{{{vec_names}\\}}) = \\mathrm{{rank}}(A) = {rank} = {m}"
        )
        conclusion_matrix = (
            "Do hạng của ma trận dòng bằng số lượng vector, hệ vector độc lập tuyến tính."
        )
        status_message = "Hệ vector độc lập tuyến tính."
    else:
        deduction_latex = (
            f"\\mathrm{{rank}}(\\{{{vec_names}\\}}) = \\mathrm{{rank}}(A) = {rank} < {m}"
        )
        conclusion_matrix = (
            "Do hạng của ma trận dòng bé hơn số lượng vector, hệ vector phụ thuộc tuyến tính."
        )
        status_message = "Hệ vector phụ thuộc tuyến tính."

    method_matrix_payload = {
        "title": "Cách 1: Phương pháp biến đổi sơ cấp ma trận dòng",
        "matrix_setup_latex": matrix_setup_latex,
        "steps": steps,
        "echelon_matrix": echelon_matrix_latex,
        "nonzero_rows": rank,
        "pivots": pivots,
        "deduction_latex": deduction_latex,
        "conclusion_text": conclusion_matrix,
    }

    # 2. Giai bang Phuong phap 2: He phuong trinh thuan nhat & RREF
    dependency_relations, method_equation_payload = _solve_homogeneous_system(A_sym, m, n)

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
        "independent": is_independent,
        "rank": rank,
        "message": status_message,
        # Hop dong chi tiet 4 pha
        "problem_id": "linear_independence",
        "vectors": vectors_serialized,
        "dimension": n,
        "num_vectors": m,
        "result": {
            "is_independent": is_independent,
            "rank": rank,
            "dependency_relations": dependency_relations,
        },
        "method_matrix": method_matrix_payload,
        "method_equation": method_equation_payload,
    }

    return payload


# Dang ky ca 2 alias vao registry
register("linear_independence", explain_linear_independence)
register("linear_algebra.linear_independence", explain_linear_independence)
