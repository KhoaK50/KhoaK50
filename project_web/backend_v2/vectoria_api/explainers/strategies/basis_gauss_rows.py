from __future__ import annotations
from typing import Dict, List, Tuple
import numpy as np
import sympy as sp
from vectoria_api.core.validate import parse_latex_to_sympy
import math

from vectoria_api.explainers.models import Step
from vectoria_api.core.linalg import sympy_gaussian_elimination_rows_with_ops
from vectoria_api.core.format import vector_pretty_score, format_number_pretty


def _dependent_expressions_rows(
    A_rows: List[List[float]], pivot_indices: List[int], tol: float = 1e-10
):
    """
    A_rows: (m x dim) - mỗi hàng là vector gốc
    pivot_indices: index vector gốc thuộc cơ sở

    Trả về:
      dependents: list index vector gốc phụ thuộc
      coeff_map: dict dep_index -> coeffs theo basis (length = rank)
            v_dep ≈ sum_k coeffs[k] * v_basis_k
    """
    A = [ [parse_latex_to_sympy(x) for x in row] for row in A_rows ]
    m = len(A)
    dim = len(A[0]) if m > 0 else 0

    piv = list(pivot_indices)
    dep = [i for i in range(m) if i not in piv]

    if (not dep) or (not piv):
        return dep, {}

    # Basis matrix transposed
    BT = sp.Matrix([A[i] for i in piv]).T
    
    coeff_map: Dict[int, List[str]] = {}
    for i in dep:
        v = sp.Matrix(A[i])
        try:
            c = BT.solve_least_squares(v)
            coeff_map[i] = [sp.latex(sp.simplify(x)) for x in c]
        except Exception:
            coeff_map[i] = ["0"]*len(piv)

    return dep, coeff_map


def _fmt_k(val, tol: float = 1e-9) -> str:
    if isinstance(val, sp.Expr):
        return sp.latex(sp.simplify(val))
    # Fallback if float is passed
    try:
        expr = sp.sympify(val)
        return sp.latex(sp.simplify(expr))
    except:
        return str(val)


def _fmt_row_op_latex(op: dict, tol: float = 1e-10) -> str:
    """
    Trả về CHUỖI LaTeX ĐÚNG ĐỂ ĐẶT LÊN MŨI TÊN:
      - swap: d_1 <-> d_2
      - elim: d_3 -> d_3 - 2d_1
      - scale: d_2 -> (1/3) d_2
    """
    kind = op.get("op")

    if kind == "swap":
        a = int(op["i"]) + 1
        b = int(op["j"]) + 1
        return f"d_{a} \\\\leftrightarrow d_{b}"

    if kind == "elim":
        dst = int(op["i"]) + 1
        src = int(op["j"]) + 1
        k_val = op.get("factor", 0.0)

        try:
            k = float(k_val)
            # row_dst <- row_dst - k*row_src
            if abs(k) < tol:
                return f"d_{dst} \\to d_{dst}"

            if abs(k - round(k)) < tol:
                k = int(round(k))

            sign = "-" if k > 0 else "+"
            mag = abs(k)

            if abs(mag - 1) < tol:
                return f"d_{dst} \\to d_{dst} {sign} d_{src}"

            return f"d_{dst} \\to d_{dst} {sign} {_fmt_k(mag, tol)}d_{src}"
        except ValueError:
            k_str = str(k_val).strip()
            if k_str.startswith("-"):
                sign = "+"
                mag_str = k_str[1:].strip()
            else:
                sign = "-"
                mag_str = k_str
            
            if mag_str == "1":
                return f"d_{dst} \\to d_{dst} {sign} d_{src}"
            return f"d_{dst} \\to d_{dst} {sign} {mag_str} d_{src}"

    if kind == "scale":
        i = int(op["i"]) + 1
        k_val = op.get("factor", 1.0)
        
        try:
            k = float(k_val)
            k_str = _fmt_k(k, tol)
        except ValueError:
            k_str = str(k_val).strip()

        # Nếu là chuỗi phức tạp (phân số, căn, số âm) thì đóng ngoặc
        if "\\" in k_str or k_str.startswith("-"):
            return f"d_{{{i}}} \\to ({k_str})\\,d_{{{i}}}"
        else:
            return f"d_{{{i}}} \\to {k_str}\\,d_{{{i}}}"

    return ""


def _solve_homogeneous_rank(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[int, int]:
    """
    Rank theo kiểu 'hệ phương trình' k1..km (m ẩn).
    Ma trận hệ: n x m (cột là vector).
    """
    if not vectors:
        return 0, 0
    A = np.array([[to_float(x) for x in r] for r in vectors], dtype=float)  # m x n (rows)
    M = A.T  # n x m (cols)
    r = int(np.linalg.matrix_rank(M, tol=tol))
    m = M.shape[1]
    return r, m


# =========================
# PDF-style LaTeX helpers
# =========================
def _latex_vec(v, tol: float = 1e-10) -> str:
    items = [_fmt_k(x, tol=tol) for x in v]
    return "\\left(" + ",\\;".join(items) + "\\right)"


def _latex_vec_list(vectors, tol: float = 1e-10) -> str:
    parts = []
    for i, v in enumerate(vectors):
        parts.append(f"v_{{{i+1}}} = {_latex_vec(v, tol=tol)}")
    return ",\\; ".join(parts)


def _build_homogeneous_system_latex(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[str, str]:
    if not vectors:
        return "", ""

    m = len(vectors)
    n = len(vectors[0])

    combo = " + ".join([f"k_{{{i+1}}}v_{{{i+1}}}" for i in range(m)])
    eq_line = f"{combo} = \\vec{{0}}"

    lines = []
    for j in range(n):
        terms = []
        for i in range(m):
            a = vectors[i][j]
            ak = _fmt_k(a, tol=tol)
            if ak == "0":
                continue
            if ak == "1":
                terms.append(f"k_{{{i+1}}}")
            elif ak == "-1":
                terms.append(f"-k_{{{i+1}}}")
            else:
                terms.append(f"{ak}k_{{{i+1}}}")
        if not terms:
            lhs = "0"
        else:
            lhs = " + ".join(terms).replace("+ -", "- ")
        lines.append(f"{lhs} = 0")

    system = (
        "\\left\\{\\begin{array}{l}\n"
        + " \\\\\n".join(lines)
        + "\n\\end{array}\\right."
    )
    return eq_line, system


def _eq_general_pdf_latex(
    vectors: List[List[float]], basis_indices: List[int], rank: int, tol: float = 1e-10
) -> str:
    if not vectors:
        return ""

    m = len(vectors)
    vec_list = _latex_vec_list(vectors, tol=tol)
    eq_line, system = _build_homogeneous_system_latex(vectors, tol=tol)

    # [FIX LAYOUT] Hàm tạo dòng kết luận cơ sở (Tách dòng B riêng biệt)
    def make_basis_line(indices):
        if not indices:
            # Dòng 1: Text --> Xuống dòng 8pt --> Dòng 2: B = rỗng
            return "\\bullet\\; \\text{Một cơ sở của }V\\text{ là:} \\\\[8pt] B = \\emptyset."

        vec_strs = [f"v_{{{i+1}}}" for i in indices]

        # [QUAN TRỌNG] Ngắt dòng dứt khoát ở đây
        return (
            "\\bullet\\; \\text{Một cơ sở của }V\\text{ là:} \\\\[8pt]"
            "B = \\left\\{ " + ",\\; ".join(vec_strs) + " \\right\\}."
        )

    if rank == m:
        dim_line = f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {rank}."
        basis_line = make_basis_line(list(range(m)))

        concl = (
            "\\textbf{Bước 3: Kết luận. }"
            "\\text{Vì hệ phương trình chỉ có nghiệm tầm thường nên hệ vectơ độc lập tuyến tính.}\\\\[4pt]\n"
            f"{dim_line}\\\\[5pt]\n"  # Tăng khoảng cách dòng
            f"{basis_line}"
        )
    else:
        dim_line = f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {rank}."
        basis_line = make_basis_line(basis_indices)

        concl = (
            "\\textbf{Bước 3: Kết luận. }"
            "\\text{Hệ phương trình có nghiệm không tầm thường nên hệ vectơ phụ thuộc tuyến tính.}\\\\[4pt]\n"
            f"{dim_line}\\\\[5pt]\n"  # Tăng khoảng cách dòng
            f"{basis_line}"
        )

    latex = (
        "\\renewcommand{\\arraystretch}{1.25}\n"
        "\\begin{array}{l}\n"
        f"\\text{{Cho }} {vec_list}.\\\\[6pt]\n"
        "\\textbf{Bước 1: }\\text{Kiểm tra tính độc lập tuyến tính của hệ. Xét phương trình}\\\\[2pt]\n"
        f"{eq_line}.\\\\[2pt]\n"
        "\\Leftrightarrow\\\\[-2pt]\n"
        f"{system}\\\\[8pt]\n"
        "\\textbf{Bước 2: }\\text{Giải hệ phương trình.}\\\\[2pt]\n"
        "\\text{(Từ phép khử Gauss, ta xác định được hạng và số ẩn tự do.)}\\\\[10pt]\n"
        f"{concl}\n"
        "\\end{array}"
    )
    return latex


def _is_multiple(v1, v2, tol: float = 1e-10):
    M1 = sp.Matrix(v1)
    M2 = sp.Matrix(v2)
    if M2.is_zero_matrix:
        return False, sp.Integer(0)
    # v1 = k * v2 => k = v1[i]/v2[i] for non-zero v2[i]
    k = None
    for i in range(len(v2)):
        if M2[i] != 0:
            k_cand = sp.simplify(M1[i] / M2[i])
            if k is None:
                k = k_cand
            elif sp.simplify(k - k_cand) != 0:
                return False, sp.Integer(0)
        else:
            if M1[i] != 0:
                return False, sp.Integer(0)
    return (True, k) if k is not None else (False, sp.Integer(0))
    idx = None
    for i in range(v1.shape[0]):
        if abs(v1[i]) >= tol:
            idx = i
            break
    if idx is None:
        return False, 0.0
    t = v2[idx] / v1[idx]
    if np.linalg.norm(v2 - t * v1) < tol:
        return True, float(t)
    return False, float(t)


def _solve_in_span(basis_vectors, target_vector, tol: float = 1e-10):
    if not basis_vectors:
        return False, []
    B = sp.Matrix(basis_vectors).T
    v = sp.Matrix(target_vector)
    try:
        c = B.solve(v)
        return True, list(c)
    except Exception:
        try:
            # check least squares residual
            c = B.solve_least_squares(v)
            if sp.simplify((B*c - v).norm()) == 0:
                return True, list(c)
            return False, []
        except Exception:
            return False, []

    B = np.array(B_rows, dtype=float)  # r x n (rows)
    BT = B.T  # n x r
    vv = np.array(v, dtype=float)  # n

    c, _, _, _ = np.linalg.lstsq(BT, vv, rcond=None)
    recon = BT @ c
    ok = np.linalg.norm(recon - vv) < tol
    return ok, c.tolist()



def to_float(val, tol=1e-10):
    try:
        return float(val.evalf()) if hasattr(val, 'evalf') else float(val)
    except:
        return 0.0

def to_float_array(arr):
    return np.array([to_float(x) for x in arr], dtype=float)

def _eq_stepwise_pdf_latex(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[str, List[int], int]:
    if not vectors:
        return "", [], 0

    m, n = len(vectors), len(vectors[0])
    basis_idx: List[int] = []
    basis_rows: List[List[float]] = []  # Lưu các vector cơ sở dạng float

    vec_list = _latex_vec_list(vectors, tol=tol)
    lines = [
        "\\renewcommand{\\arraystretch}{1.25}",
        "\\begin{array}{l}",
        f"\\text{{Cho }} {vec_list}.\\\\[6pt]",
    ]

    # --- Bước 1: Xét v1 ---
    v1 = vectors[0]
    if np.linalg.norm(to_float_array(v1)) < tol:
        lines.append(
            "\\textbf{Bước 1: }\\text{Vì }v_1=\\vec{0}\\text{ nên bỏ }v_1.\\\\[6pt]"
        )
    else:
        basis_idx.append(0)
        basis_rows.append(vectors[0])
        lines.append(
            "\\textbf{Bước 1: }\\text{Xét hệ }\\{v_1\\}.\\text{ Vì }v_1\\neq\\vec{0}\\text{ nên độc lập tuyến tính.}\\\\[6pt]"
        )

    # --- Bước 2: Xét v2 ---
    if m >= 2:
        v2 = vectors[1]
        if basis_rows:
            # Check tỉ lệ: v2 = k*v1
            mul, t = _is_multiple(v2, basis_rows[0], tol=tol)
            if not mul:
                basis_idx.append(1)
                basis_rows.append(vectors[1])
                # Lấy 2 thành phần đầu để minh họa khác tỉ lệ (nếu n >= 2)
                idx1, idx2 = 0, 1 if n > 1 else 0
                a_val = _fmt_k(basis_rows[0][idx1], tol)
                b_val = _fmt_k(v2[idx1], tol)
                lines.append(
                    f"\\textbf{{Bước 2: }}\\text{{Xét hệ }}\\{{v_1, v_2\\}}.\\\\[2pt]"
                )
                lines.append(
                    f"\\text{{Vì }} v_1, v_2 \\text{{ không tỉ lệ (}}\\frac{{{b_val}}}{{{a_val}}} \\neq ...\\text{{) nên độc lập tuyến tính.}}\\\\[6pt]"
                )
            else:
                k_str = _fmt_k(t, tol)
                lines.append(
                    f"\\textbf{{Bước 2: }}\\text{{Ta có }}v_2 = {k_str}v_1\\text{{ nên phụ thuộc. Bỏ }}v_2.\\\\[6pt]"
                )
        else:
            if np.linalg.norm(to_float_array(v2)) > tol:
                basis_idx.append(1)
                basis_rows.append(vectors[1])
                lines.append(
                    "\\textbf{Bước 2: }\\text{Lấy }v_2\\text{ làm cơ sở.}\\\\[6pt]"
                )
            else:
                lines.append("\\textbf{Bước 2: }\\text{Bỏ }v_2=\\vec{0}.\\\\[6pt]")

    # --- Bước 3 trở đi: Logic Giải hệ con & Thử lại ---
    step_no = 3
    for k in range(2, m):
        vk = vectors[k]
        if np.linalg.norm(to_float_array(vk)) < tol:
            lines.append(
                f"\\textbf{{Bước {step_no}: }}\\text{{Bỏ }}v_{{{k+1}}}=\\vec{{0}}.\\\\[6pt]"
            )
            step_no += 1
            continue

        num_vars = len(basis_rows)
        # Tạo chuỗi phương trình giả định: v_k = x*v_i + y*v_j
        rhs_terms = [f"k_{{{i+1}}}v_{{{basis_idx[i]+1}}}" for i in range(num_vars)]
        rhs_eq = " + ".join(rhs_terms)

        lines.append(
            f"\\textbf{{Bước {step_no}: }}\\text{{Kiểm tra }}v_{{{k+1}}}\\text{{ có là tổ hợp tuyến tính của }}v_1, v_2...\\text{{ không.}}\\\\[2pt]"
        )
        lines.append(
            f"\\text{{Giả sử }} v_{{{k+1}}} = {rhs_eq}. \\text{{ Ta xét {num_vars} thành phần đầu tiên:}}\\\\[2pt]"
        )

        # 1. Giải hệ phương trình con (chỉ lấy num_vars dòng đầu tiên)
        import sympy as sp
        A_sub = sp.Matrix([[r[i] for r in basis_rows] for i in range(num_vars)])
        b_sub = sp.Matrix([vk[i] for i in range(num_vars)])

        # Tạo hệ phương trình LaTeX để hiển thị
        sys_lines = []
        for r_i in range(num_vars):
            row_terms = []
            for c_i in range(num_vars):
                val = basis_rows[c_i][r_i]
                val_s = _fmt_k(val, tol)
                if val_s == "0":
                    continue
                var_char = chr(97 + c_i)  # a, b, c...
                if val_s == "1":
                    row_terms.append(var_char)
                elif val_s == "-1":
                    row_terms.append(f"-{var_char}")
                else:
                    row_terms.append(f"{val_s}{var_char}")

            lhs_expr = " + ".join(row_terms).replace("+ -", "- ") if row_terms else "0"
            rhs_val = _fmt_k(b_sub[r_i], tol)
            sys_lines.append(f"{lhs_expr} = {rhs_val}")

        sys_latex = (
            "\\left\\{\\begin{matrix} "
            + " \\\\ ".join(sys_lines)
            + " \\end{matrix}\\right."
        )

        # Giải nghiệm
        try:
            sol = A_sub.LUsolve(b_sub)
            sol = list(sol)
            has_sol = True
        except Exception:
            has_sol = False
            sol = [sp.Integer(0)] * num_vars

        if not has_sol:
            # Trường hợp hiếm: ngay 2 dòng đầu đã vô nghiệm
            lines.append(f"{sys_latex} \\Rightarrow \\text{{ Hệ vô nghiệm.}}\\\\[2pt]")
            lines.append(
                f"\\text{{Vậy }}v_{{{k+1}}}\\text{{ độc lập tuyến tính. Bổ sung vào cơ sở.}}\\\\[6pt]"
            )
            basis_idx.append(k)
            basis_rows.append(vectors[k])
        else:
            # Hiển thị nghiệm tìm được
            sol_strs = [f"{chr(97+i)} = {_fmt_k(sol[i], tol)}" for i in range(num_vars)]
            sol_latex = "\\begin{cases} " + " \\\\ ".join(sol_strs) + " \\end{cases}"
            lines.append(f"{sys_latex} \\Rightarrow {sol_latex}\\\\[4pt]")

            # 2. Thử lại vào các thành phần còn lại (từ dòng num_vars trở đi)
            is_dependent = True
            lines.append(
                f"\\text{{Thử lại với các thành phần còn lại của }} v_{{{k+1}}}:\\\\[2pt]"
            )

            explanation_parts = []
            for check_idx in range(num_vars, n):
                # Tính vế phải: a*v1[i] + b*v2[i]
                rhs_check = sp.simplify(sum(
                    sol[i] * basis_rows[i][check_idx] for i in range(num_vars)
                ))
                lhs_check = sp.simplify(vk[check_idx])

                # Format chuỗi tính toán: 1(2) + (-2)(3)...
                calc_terms = []
                for i in range(num_vars):
                    c_s = _fmt_k(sol[i], tol)
                    v_s = _fmt_k(basis_rows[i][check_idx], tol)
                    if v_s == "0":
                        continue
                    # Đóng ngoặc số âm/phân số
                    if "-" in v_s or "/" in v_s or "\\" in v_s:
                        v_s = f"({v_s})"
                    if "-" in c_s or "/" in c_s or "\\" in c_s:
                        c_s = f"({c_s})"
                    calc_terms.append(f"{c_s}\\cdot{v_s}")

                calc_str = (
                    " + ".join(calc_terms).replace("+ -", "- ") if calc_terms else "0"
                )
                res_str = _fmt_k(rhs_check, tol)
                target_str = _fmt_k(lhs_check, tol)

                if sp.simplify(rhs_check - lhs_check) == 0:
                    explanation_parts.append(
                        f"\\bullet\\; \\text{{Dòng {check_idx+1}: }} {calc_str} = {res_str} = {target_str} \\;(\\text{{Đúng}})"
                    )
                else:
                    explanation_parts.append(
                        f"\\bullet\\; \\text{{Dòng {check_idx+1}: }} {calc_str} = {res_str} \\neq {target_str} \\;(\\text{{Sai}})"
                    )
                    is_dependent = False
                    break  # Chỉ cần 1 dòng sai là kết luận luôn

            lines.append(" \\\\ ".join(explanation_parts) + "\\\\[4pt]")

            if is_dependent:
                # Tạo chuỗi kết luận v3 = ...
                final_comb = []
                for i, s_val in enumerate(sol):
                    s_fmt = _fmt_k(s_val, tol)
                    v_name = f"v_{{{basis_idx[i]+1}}}"
                    if s_fmt == "0":
                        continue
                    if s_fmt == "1":
                        term = v_name
                    elif s_fmt == "-1":
                        term = f"-{v_name}"
                    else:
                        term = f"{s_fmt}{v_name}"
                    final_comb.append(term)
                res_eq = " + ".join(final_comb).replace("+ -", "- ")

                lines.append(
                    f"\\text{{Tất cả đều thỏa mãn. Vậy }} v_{{{k+1}}} = {res_eq}.\\\\[2pt]"
                )
                lines.append(
                    f"\\text{{Kết luận: }} v_{{{k+1}}} \\text{{ phụ thuộc tuyến tính. Loại bỏ.}}\\\\[6pt]"
                )
            else:
                lines.append(
                    f"\\text{{Xuất hiện mâu thuẫn. Vậy không tồn tại bộ số thỏa mãn.}}\\\\[2pt]"
                )
                lines.append(
                    f"\\text{{Kết luận: }} v_{{{k+1}}} \\text{{ độc lập tuyến tính. Bổ sung vào cơ sở.}}\\\\[6pt]"
                )
                basis_idx.append(k)
                basis_rows.append(vectors[k])

        step_no += 1

    # Kết luận cuối cùng
    dim = len(basis_idx)
    basis_vec_strs = [f"v_{{{i+1}}}" for i in basis_idx]

    lines.append("\\textbf{Kết luận.}\\\\[4pt]")
    lines.append(
        f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {dim}.\\\\[5pt]"
    )  # Thêm giãn dòng 5pt

    # [FIX LAYOUT] Tách B ra dòng riêng hoàn toàn
    if not basis_idx:
        lines.append(
            f"\\bullet\\; \\text{{Một cơ sở của }} V \\text{{ là:}} \\\\[8pt] B = \\emptyset."
        )
    else:
        b_str = "B = \\left\\{ " + ",\\; ".join(basis_vec_strs) + " \\right\\}."
        lines.append(
            f"\\bullet\\; \\text{{Một cơ sở của }} V \\text{{ là:}} \\\\[8pt] {b_str}"
        )

    lines.append("\\end{array}")

    return "\n".join(lines), basis_idx, dim


# =========================================================================
# MAIN FUNCTION (ĐÃ SỬA HIỂN THỊ PHÂN SỐ/CĂN)
# =========================================================================
def compute_basis_payload(
    vectors: List[List[float]], tol: float = 1e-10, pivot_strategy: str = "min_norm"
):
    """
    vectors: list[list[float]] với mỗi vector là 1 HÀNG.
    """
    if not vectors:
        raise ValueError("Danh sách vector rỗng.")

    A = []
    for row in vectors:
        A.append([parse_latex_to_sympy(x) for x in row])
        
    m = len(A)
    dim = len(A[0]) if m > 0 else 0

    # 1. Chạy Khử Gauss (Cho Cách 1 - Ma trận)
    rank, pivot_indices_gauss, E, ops, row_ids = sympy_gaussian_elimination_rows_with_ops(
        A, snapshot_every_step=True
    )

    # 2. Chạy Logic "Xét từng vector" (Cho Cách 2 - Phương trình & KẾT QUẢ CUỐI CÙNG)
    eq_step_latex, step_basis_idx, step_dim = _eq_stepwise_pdf_latex(A, tol=tol)

    # [QUAN TRỌNG]: GHI ĐÈ KẾT QUẢ CHÍNH BẰNG KẾT QUẢ CỦA CÁCH 2
    final_pivot_indices = step_basis_idx
    final_pivot_indices.sort()

    basis_vectors = [[_fmt_k(x, tol) for x in A[i]] for i in final_pivot_indices]

    # Tính lại phụ thuộc (dependents) và hệ số (coeff_map) dựa trên cơ sở CHUẨN này
    dependents, coeff_map = _dependent_expressions_rows(A, final_pivot_indices, tol=tol)

    # =========================
    # Steps for "Cách 1: Ma trận" (Visual Steps)
    # =========================
    steps: List[dict] = []

    steps.append(
        Step(
            kind="info",
            text=f"Bước 1: Lập ma trận A gồm {m} hàng (mỗi hàng là 1 vector).",
        ).to_dict()
    )

    # [SỬA 1]: Format ma trận đầu vào A thành chuỗi đẹp (dùng _fmt_k)
    pretty_A = [[_fmt_k(x, tol) for x in row] for row in A]
    steps.append(
        Step(
            kind="matrix",
            text="Ma trận A ban đầu:",
            matrix=pretty_A,
        ).to_dict()
    )

    if ops:
        steps.append(
            Step(
                kind="info",
                text="Bước 2: Khử Gauss để đưa A về dạng bậc thang E:",
            ).to_dict()
        )

        for op in ops:
            mat_after = op.get("matrix_after")
            if mat_after is None:
                continue

            arrow_text = _fmt_row_op_latex(op, tol=tol).strip()

            # [SỬA 2]: Format ma trận sau mỗi bước biến đổi
            pretty_mat_after = [[_fmt_k(x, tol) for x in row] for row in mat_after]

            steps.append(
                Step(
                    kind="matrix",
                    text=arrow_text if arrow_text else "",
                    matrix=pretty_mat_after,
                ).to_dict()
            )

    # [SỬA 3]: Format ma trận kết quả E thành chuỗi đẹp
    E_list = E.tolist() if hasattr(E, "tolist") else E
    pretty_E = [[_fmt_k(x, tol) for x in row] for row in E_list]

    steps.append(
        Step(
            kind="matrix",
            text="",
            matrix=pretty_E,
        ).to_dict()
    )

    rank_val = int(step_dim)

    if rank_val == 0:
        steps.append(
            Step(
                kind="summary",
                text="Kết luận: Tất cả vector đều bằng 0 ⇒ rank = 0, không có cơ sở khác 0.",
            ).to_dict()
        )
    else:
        basis_human = ", ".join([f"#{i+1}" for i in final_pivot_indices])
        steps.append(
            Step(
                kind="pivot_choose",
                text=f"Bước 3: Dựa trên quá trình xét độc lập tuyến tính (Cách 2), ta chọn các vector {basis_human} làm cơ sở.",
                meta={"pivot_indices": final_pivot_indices},
            ).to_dict()
        )

        if dependents:
            dep_human = ", ".join([f"#{i+1}" for i in dependents])
            steps.append(
                Step(
                    kind="dependents",
                    text=f"Bước 4: Các vector còn lại ({dep_human}) là phụ thuộc tuyến tính và sẽ bị ẩn.",
                    meta={"dependents": dependents, "coeff_map": coeff_map},
                ).to_dict()
            )

        steps.append(
            Step(
                kind="summary",
                text=f"Kết luận: rank = {rank_val}. Cơ sở: {basis_human}.",
            ).to_dict()
        )

    # =========================
    # Generate LaTeX Explanations
    # =========================
    rank_eq, m_unknowns = _solve_homogeneous_rank(A, tol=tol)

    eq_general_latex = _eq_general_pdf_latex(
        vectors=A, basis_indices=final_pivot_indices, rank=rank_eq, tol=tol
    )
    # ... (code cũ) ...

    # --- CHÈN ĐOẠN NÀY ĐỂ DEBUG ---
    print("\n" + "=" * 30)
    print("DEBUG KIỂM TRA FORMAT SỐ:")
    print(f"Input gốc (số xấu): {3.000000000012}")
    print(f"Format thử: {format_number_pretty(3.000000000012)}")

    if len(steps) > 1:
        print("Ma trận đầu tiên trong steps:", steps[1]["matrix"])
    print("=" * 30 + "\n")
    # ------------------------------

    return {
        "basis": basis_vectors,
        "dimension": rank_val,
        "pivot_indices": final_pivot_indices,
        "dependents": dependents,
        "coeff_map": coeff_map,
        "steps": steps,
        "solution": {
            "eq_general_latex": eq_general_latex,
            "eq_step_latex": eq_step_latex,
            "eq_step_basis_indices": step_basis_idx,
            "eq_step_dimension": int(step_dim),
        },
    }


from vectoria_api.explainers.registry import register

register("basis.gauss_rows", compute_basis_payload)
