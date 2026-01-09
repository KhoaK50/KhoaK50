from __future__ import annotations
from typing import Dict, List, Tuple
import numpy as np

from vectoria_api.explainers.models import Step
from vectoria_api.core.linalg import gaussian_elimination_rows_with_ops
from vectoria_api.core.format import vector_pretty_score


def _dependent_expressions_rows(A_rows: List[List[float]], pivot_indices: List[int], tol: float = 1e-10):
    """
    A_rows: (m x dim) - mỗi hàng là vector gốc
    pivot_indices: index vector gốc thuộc cơ sở

    Trả về:
      dependents: list index vector gốc phụ thuộc
      coeff_map: dict dep_index -> coeffs theo basis (length = rank)
            v_dep ≈ sum_k coeffs[k] * v_basis_k
    """
    A = np.array(A_rows, dtype=float)
    m, dim = A.shape

    piv = list(pivot_indices)
    dep = [i for i in range(m) if i not in piv]

    if (not dep) or (not piv):
        return dep, {}

    B = A[piv, :]      # r x dim
    BT = B.T           # dim x r

    coeff_map: Dict[int, List[float]] = {}
    for i in dep:
        v = A[i, :]
        # Giải hệ B^T * c = v^T (tìm tọa độ c) để biểu diễn v theo basis B
        c, _, _, _ = np.linalg.lstsq(BT, v, rcond=None)
        coeff_map[i] = c.tolist()

    return dep, coeff_map


def _fmt_k(k: float, tol: float = 1e-10) -> str:
    """Đưa hệ số về dạng đẹp: 2, -3, 1/2... (tránh thập phân dài)."""
    if abs(k) < tol:
        return "0"
    r = round(k)
    if abs(k - r) < tol:
        return str(int(r))
    return f"{k:.4g}"


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
        k = float(op.get("factor", 0.0))

        # row_dst <- row_dst - k*row_src
        if abs(k) < tol:
            return f"d_{dst} \\\\to d_{dst}"

        if abs(k - round(k)) < tol:
            k = int(round(k))

        sign = "-" if k > 0 else "+"
        mag = abs(k)

        if abs(mag - 1) < tol:
            return f"d_{dst} \\\\to d_{dst} {sign} d_{src}"

        return f"d_{dst} \\\\to d_{dst} {sign} {_fmt_k(mag, tol)}d_{src}"

    if kind == "scale":
        i = int(op["i"]) + 1
        k = float(op.get("factor", 1.0))
        return f"d_{i} \\\\to ({_fmt_k(k, tol)})\\\\,d_{i}"

    return ""


def _solve_homogeneous_rank(vectors: List[List[float]], tol: float = 1e-10) -> Tuple[int, int]:
    """
    Rank theo kiểu 'hệ phương trình' k1..km (m ẩn).
    Ma trận hệ: n x m (cột là vector).
    """
    if not vectors:
        return 0, 0
    A = np.array(vectors, dtype=float)  # m x n (rows)
    M = A.T  # n x m (cols)
    r = int(np.linalg.matrix_rank(M, tol=tol))
    m = M.shape[1]
    return r, m


# =========================
# PDF-style LaTeX helpers
# =========================
def _latex_vec(v: List[float], tol: float = 1e-10) -> str:
    items = [_fmt_k(float(x), tol=tol) for x in v]
    return "\\left(" + ",\\;".join(items) + "\\right)"


def _latex_vec_list(vectors: List[List[float]], tol: float = 1e-10) -> str:
    parts = []
    for i, v in enumerate(vectors):
        parts.append(f"v_{{{i+1}}} = {_latex_vec(v, tol=tol)}")
    return ",\\; ".join(parts)


def _build_homogeneous_system_latex(vectors: List[List[float]], tol: float = 1e-10) -> Tuple[str, str]:
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
            a = float(vectors[i][j])
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

    system = "\\left\\{\\begin{array}{l}\n" + " \\\\\n".join(lines) + "\n\\end{array}\\right."
    return eq_line, system


def _eq_general_pdf_latex(vectors: List[List[float]], basis_indices: List[int], rank: int, tol: float = 1e-10) -> str:
    if not vectors:
        return ""

    m = len(vectors)
    vec_list = _latex_vec_list(vectors, tol=tol)
    eq_line, system = _build_homogeneous_system_latex(vectors, tol=tol)

    if rank == m:
        dim_line = f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {rank}."
        basis_line = "\\bullet\\; \\text{Một cơ sở của }V\\text{ là: } B = \\left\\{ " + ",\\; ".join(
            [f"v_{{{i+1}}}" for i in range(m)]
        ) + " \\right\\}."
        concl = (
            "\\textbf{Bước 3: Kết luận. }"
            "Vì hệ phương trình chỉ có nghiệm tầm thường nên hệ vectơ độc lập tuyến tính.\\\\[4pt]\n"
            f"{dim_line}\\\\[2pt]\n"
            f"{basis_line}"
        )
    else:
        dim_line = f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {rank}."
        if basis_indices:
            basis_line = (
                "\\bullet\\; \\text{Một cơ sở của }V\\text{ là: } B = \\left\\{ " +
                ",\\; ".join([f"v_{{{i+1}}}" for i in basis_indices]) +
                " \\right\\}."
            )
        else:
            basis_line = "\\bullet\\; \\text{Một cơ sở của }V\\text{ là: } B = \\left\\{\\;\\right\\}."

        concl = (
            "\\textbf{Bước 3: Kết luận. }"
            "Hệ phương trình có nghiệm không tầm thường nên hệ vectơ phụ thuộc tuyến tính.\\\\[4pt]\n"
            f"{dim_line}\\\\[2pt]\n"
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


def _is_multiple(v2: np.ndarray, v1: np.ndarray, tol: float = 1e-10) -> Tuple[bool, float]:
    if np.linalg.norm(v1) < tol:
        return False, 0.0
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


def _solve_in_span(B_rows: List[List[float]], v: List[float], tol: float = 1e-10) -> Tuple[bool, List[float]]:
    """
    Solve v = sum c_i * b_i where b_i are rows in B_rows.
    Return (in_span, coeffs).
    """
    if not B_rows:
        return False, []

    B = np.array(B_rows, dtype=float)     # r x n (rows)
    BT = B.T                              # n x r
    vv = np.array(v, dtype=float)         # n

    c, _, _, _ = np.linalg.lstsq(BT, vv, rcond=None)
    recon = BT @ c
    ok = np.linalg.norm(recon - vv) < tol
    return ok, c.tolist()


def _eq_stepwise_pdf_latex(vectors: List[List[float]], tol: float = 1e-10) -> Tuple[str, List[int], int]:
    """
    Cách 2 - Xét từng vector (style R^5 trong PDF):
      - Bước 1: xét {v1}, thêm v2 nếu không tỉ lệ
      - Các vector sau: thử biểu diễn tuyến tính qua các vector cơ sở hiện có.
    
    Hàm này quan trọng: Nó thực hiện đúng logic "Xét lần lượt từ trái sang phải".
    Nó sẽ trả về:
      - latex: Chuỗi lời giải
      - basis_idx: Danh sách index cơ sở ĐÚNG THEO THỨ TỰ (VD: [0, 1])
      - dim: Số chiều
    """
    if not vectors:
        return "", [], 0

    m = len(vectors)
    n = len(vectors[0])

    basis_idx: List[int] = []
    basis_rows: List[List[float]] = []

    vec_list = _latex_vec_list(vectors, tol=tol)

    lines = []
    lines.append("\\renewcommand{\\arraystretch}{1.25}")
    lines.append("\\begin{array}{l}")
    lines.append(f"\\text{{Cho }} {vec_list}.\\\\[6pt]")

    # Step 1: Check v1
    v1 = np.array(vectors[0], dtype=float)
    if np.linalg.norm(v1) < tol:
        lines.append("\\textbf{Bước 1: }\\text{Vì }v_1=\\vec{0}\\text{ nên bỏ }v_1\\text{ khỏi hệ.}\\\\[6pt]")
    else:
        basis_idx.append(0)
        basis_rows.append(vectors[0])
        lines.append("\\textbf{Bước 1: }\\text{Xét hệ }\\{v_1\\}.\\\\[2pt]")
        lines.append("\\text{Vì }v_1\\neq\\vec{0}\\text{ nên }\\{v_1\\}\\text{ độc lập tuyến tính.}\\\\[6pt]")

    # Step 2: Check v2
    if m >= 2:
        v2 = np.array(vectors[1], dtype=float)
        if basis_rows:
            mul, t = _is_multiple(v2, np.array(basis_rows[0], dtype=float), tol=tol)
            if not mul:
                basis_idx.append(1)
                basis_rows.append(vectors[1])
                # Tìm tỉ lệ để hiển thị
                a = v1
                b = v2
                # Tìm 2 vị trí khác 0 đầu tiên để so sánh tỉ lệ
                def pick_nonzero_idx(arr):
                    for ii in range(arr.shape[0]):
                        if abs(arr[ii]) >= tol:
                            return ii
                    return 0
                i1 = pick_nonzero_idx(a)
                i2 = pick_nonzero_idx(a[1:] if a.shape[0] > 1 else a) + (1 if a.shape[0] > 1 else 0)
                if i2 == i1 and n > 1:
                    i2 = (i1 + 1) % n

                a1, a2 = _fmt_k(float(a[i1]), tol=tol), _fmt_k(float(a[i2]), tol=tol)
                b1, b2 = _fmt_k(float(b[i1]), tol=tol), _fmt_k(float(b[i2]), tol=tol)

                lines.append("\\textbf{Bước 2: }\\text{Xét hệ }\\{v_1, v_2\\}.\\\\[2pt]")
                lines.append(
                    f"\\text{{Vì }}v_1\\text{{ và }}v_2\\text{{ không tỉ lệ }}"
                    f"\\left(\\dfrac{{{a1}}}{{{b1}}} \\neq \\dfrac{{{a2}}}{{{b2}}}\\right)"
                    f"\\text{{ nên }}\\{{v_1,v_2\\}}\\text{{ độc lập tuyến tính.}}\\\\[6pt]"
                )
            else:
                lines.append("\\textbf{Bước 2: }\\text{Xét hệ }\\{v_1, v_2\\}.\\\\[2pt]")
                lines.append(
                    f"\\text{{Ta có }}v_2 = {_fmt_k(t, tol=tol)}\\,v_1\\text{{ nên }}\\{{v_1,v_2\\}}\\text{{ phụ thuộc tuyến tính. Bỏ }}v_2\\text{{ khỏi cơ sở.}}\\\\[6pt]"
                )
        else:
            if np.linalg.norm(v2) >= tol:
                basis_idx.append(1)
                basis_rows.append(vectors[1])
                lines.append("\\textbf{Bước 2: }\\text{Vì }v_2\\neq\\vec{0}\\text{ nên lấy }\\{v_2\\}\\text{ làm cơ sở ban đầu.}\\\\[6pt]")
            else:
                lines.append("\\textbf{Bước 2: }\\text{Vì }v_2=\\vec{0}\\text{ nên bỏ }v_2.\\\\[6pt]")

    # Step 3+: Check others
    step_no = 3
    for k in range(2, m):
        vk = vectors[k]
        if np.linalg.norm(np.array(vk, dtype=float)) < tol:
            lines.append(f"\\textbf{{Bước {step_no}: }}\\text{{Vì }}v_{{{k+1}}}=\\vec{{0}}\\text{{ nên bỏ }}v_{{{k+1}}}.\\\\[6pt]")
            step_no += 1
            continue

        if not basis_rows:
            basis_idx.append(k)
            basis_rows.append(vk)
            lines.append(f"\\textbf{{Bước {step_no}: }}\\text{{Vì cơ sở đang rỗng và }}v_{{{k+1}}}\\neq\\vec{{0}}\\text{{ nên lấy }}\\{{v_{{{k+1}}}\\}}\\text{{ làm cơ sở.}}\\\\[6pt]")
            step_no += 1
            continue

        in_span, coeffs = _solve_in_span(basis_rows, vk, tol=tol)

        lhs = f"v_{{{k+1}}}"
        rhs_terms = []
        for t_i in range(len(basis_rows)):
            c = float(coeffs[t_i]) if t_i < len(coeffs) else 0.0
            cs = _fmt_k(c, tol=tol)
            if cs == "0":
                continue
            bidx = basis_idx[t_i] + 1
            if cs == "1":
                rhs_terms.append(f"v_{{{bidx}}}")
            elif cs == "-1":
                rhs_terms.append(f"-v_{{{bidx}}}")
            else:
                rhs_terms.append(f"{cs}v_{{{bidx}}}")
        
        if not rhs_terms:
            rhs = "0"
        else:
            rhs = " + ".join(rhs_terms).replace("+ -", "- ")

        lines.append(f"\\textbf{{Bước {step_no}: }}\\text{{Kiểm tra }}v_{{{k+1}}}\\text{{ có là tổ hợp tuyến tính...}}\\\\[2pt]")
        lines.append(f"\\text{{Giả sử }} {lhs} = {rhs}.\\\\[2pt]")

        if in_span:
            lines.append(
                f"\\text{{Thử lại thấy các tọa độ đều thỏa mãn nên }}v_{{{k+1}}}\\text{{ phụ thuộc tuyến tính. Loại }}v_{{{k+1}}}\\text{{ khỏi hệ sinh.}}\\\\[6pt]"
            )
        else:
            basis_idx.append(k)
            basis_rows.append(vk)
            lines.append(
                f"\\text{{Không tìm được hệ số thỏa mãn (sai số vượt ngưỡng) nên }}v_{{{k+1}}}\\text{{ độc lập với các vectơ trước. Bổ sung }}v_{{{k+1}}}\\text{{ vào cơ sở.}}\\\\[6pt]"
            )

        step_no += 1

    dim = len(basis_idx)
    basis_set = "\\left\\{" + ",\\; ".join([f"v_{{{i+1}}}" for i in basis_idx]) + "\\right\\}" if basis_idx else "\\left\\{\\;\\right\\}"
    lines.append("\\textbf{Kết luận.}\\\\[4pt]")
    lines.append(f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {dim}.\\\\[2pt]")
    lines.append(f"\\bullet\\; \\text{{Một cơ sở là: }} B = {basis_set}.")
    lines.append("\\end{array}")

    # TRẢ VỀ basis_idx ĐỂ DÙNG CHO MAIN PAYLOAD
    return "\n".join(lines), basis_idx, dim


# =========================================================================
# MAIN FUNCTION (FIXED LOGIC)
# =========================================================================
def compute_basis_payload(vectors: List[List[float]], tol: float = 1e-10, pivot_strategy: str = "min_norm"):
    """
    vectors: list[list[float]] với mỗi vector là 1 HÀNG.
    """
    if not vectors:
        raise ValueError("Danh sách vector rỗng.")

    mat = np.array(vectors, dtype=float)
    if mat.ndim != 2:
        raise ValueError("Dữ liệu vector không hợp lệ (phải là list 2D).")

    m, dim = mat.shape
    A = mat.tolist()

    # 1. Chạy Khử Gauss (Cho Cách 1 - Ma trận)
    # LƯU Ý: Thuật toán này có thể tráo đổi hàng (swap rows) để khử, dẫn đến pivot_indices bị thay đổi
    # Ví dụ: Nếu row 2 tốt hơn row 1, nó swap lên, làm thay đổi thứ tự cơ sở.
    rank, pivot_indices_gauss, E, ops, row_ids = gaussian_elimination_rows_with_ops(
        A, tol=tol, pivot_strategy=pivot_strategy, snapshot_every_step=True
    )

    # 2. Chạy Logic "Xét từng vector" (Cho Cách 2 - Phương trình & KẾT QUẢ CUỐI CÙNG)
    # Đây là logic CHUẨN mà người dùng muốn: Duyệt từ trái qua phải, không swap lung tung.
    eq_step_latex, step_basis_idx, step_dim = _eq_stepwise_pdf_latex(vectors, tol=tol)

    # [QUAN TRỌNG NHẤT]: GHI ĐÈ KẾT QUẢ CHÍNH BẰNG KẾT QUẢ CỦA CÁCH 2 (step_basis_idx)
    # Vì Cách 2 tuân thủ đúng thứ tự "v1 trước, v2 sau".
    # Nếu Cách 1 (Gauss) ra [0, 2] mà Cách 2 ra [0, 1], ta tin tưởng Cách 2.
    final_pivot_indices = step_basis_idx
    final_pivot_indices.sort() # Đảm bảo index tăng dần (dù thuật toán trên đã đảm bảo rồi)

    basis_vectors = [vectors[i] for i in final_pivot_indices]
    
    # Tính lại phụ thuộc (dependents) và hệ số (coeff_map) dựa trên cơ sở CHUẨN này
    dependents, coeff_map = _dependent_expressions_rows(A, final_pivot_indices, tol=tol)

    # =========================
    # Steps for "Cách 1: Ma trận" (Visual Steps)
    # =========================
    # Vẫn hiển thị các bước biến đổi ma trận (vì nó có giá trị tham khảo về Rank)
    steps: List[dict] = []

    steps.append(Step(
        kind="info",
        text=f"Bước 1: Lập ma trận A gồm {m} hàng (mỗi hàng là 1 vector).",
    ).to_dict())

    steps.append(Step(
        kind="matrix",
        text="Ma trận A ban đầu:",
        matrix=A,
    ).to_dict())

    if ops:
        steps.append(Step(
            kind="info",
            text="Bước 2: Khử Gauss để đưa A về dạng bậc thang E:",
        ).to_dict())

        for op in ops:
            mat_after = op.get("matrix_after")
            if mat_after is None:
                continue

            arrow_text = _fmt_row_op_latex(op, tol=tol).strip()
            steps.append(Step(
                kind="matrix",
                text=arrow_text if arrow_text else "",
                matrix=mat_after,
            ).to_dict())

    steps.append(Step(
        kind="matrix",
        text="",
        matrix=E.tolist() if hasattr(E, "tolist") else E,
    ).to_dict())

    rank_val = int(step_dim) # Dùng rank từ thuật toán chuẩn

    if rank_val == 0:
        steps.append(Step(
            kind="summary",
            text="Kết luận: Tất cả vector đều bằng 0 ⇒ rank = 0, không có cơ sở khác 0.",
        ).to_dict())
    else:
        # Hiển thị kết luận dựa trên final_pivot_indices (Cơ sở chuẩn)
        basis_human = ", ".join([f"#{i+1}" for i in final_pivot_indices])
        steps.append(Step(
            kind="pivot_choose",
            text=f"Bước 3: Dựa trên quá trình xét độc lập tuyến tính (Cách 2), ta chọn các vector {basis_human} làm cơ sở.",
            meta={"pivot_indices": final_pivot_indices},
        ).to_dict())

        if dependents:
            dep_human = ", ".join([f"#{i+1}" for i in dependents])
            steps.append(Step(
                kind="dependents",
                text=f"Bước 4: Các vector còn lại ({dep_human}) là phụ thuộc tuyến tính và sẽ bị ẩn.",
                meta={"dependents": dependents, "coeff_map": coeff_map},
            ).to_dict())

        steps.append(Step(
            kind="summary",
            text=f"Kết luận: rank = {rank_val}. Cơ sở: {basis_human}.",
        ).to_dict())

    # =========================
    # Generate LaTeX Explanations
    # =========================
    # Tính lại rank_eq cho Cách 2 Tổng quát (chỉ để hiển thị text)
    rank_eq, m_unknowns = _solve_homogeneous_rank(vectors, tol=tol)

    eq_general_latex = _eq_general_pdf_latex(
        vectors=vectors,
        basis_indices=final_pivot_indices, # Dùng cơ sở chuẩn
        rank=rank_eq,
        tol=tol
    )

    # eq_step_latex đã tính ở trên rồi

    return {
        "basis": basis_vectors,
        "dimension": rank_val,
        "pivot_indices": final_pivot_indices, # Trả về index chuẩn (0, 1) thay vì (0, 2)
        "dependents": dependents,
        "coeff_map": coeff_map,
        "steps": steps,

        "solution": {
            "eq_general_latex": eq_general_latex,
            "eq_step_latex": eq_step_latex,
            "eq_step_basis_indices": step_basis_idx,
            "eq_step_dimension": int(step_dim),
        }
    }


from vectoria_api.explainers.registry import register
register("basis.gauss_rows", compute_basis_payload)