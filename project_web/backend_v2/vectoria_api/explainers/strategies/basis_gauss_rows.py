# backend_v2/vectoria_api/explainers/strategies/basis_gauss_rows.py
from __future__ import annotations
from typing import Dict, List
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
        c, _, _, _ = np.linalg.lstsq(BT, v, rcond=None)
        coeff_map[i] = c.tolist()

    return dep, coeff_map


def _fmt_row_op(op: dict) -> str:
    """Text kiểu PhotoMath: R2 ↔ R3, R3 ← R3 − 2R1 ... (hiển thị 1-based)."""
    if op["op"] == "swap":
        a = op["i"] + 1
        b = op["j"] + 1
        oa = op.get("orig_i", 0) + 1
        ob = op.get("orig_j", 0) + 1
        return f"Đổi hàng {a} ↔ hàng {b} (đổi vector #{oa} ↔ vector #{ob}) để chọn pivot."

    if op["op"] == "elim":
        dst = op["i"] + 1
        src = op["j"] + 1
        k = float(op["factor"])

        # làm tròn đẹp nếu gần số nguyên
        if abs(k - round(k)) < 1e-10:
            k = int(round(k))

        if k == 0:
            return f"Khử: R{dst} giữ nguyên (hệ số 0)"
        if k == 1:
            return f"Khử: R{dst} ← R{dst} − R{src}"
        if k == -1:
            return f"Khử: R{dst} ← R{dst} + R{src}"

        if k > 0:
            return f"Khử: R{dst} ← R{dst} − {k}·R{src}"
        else:
            return f"Khử: R{dst} ← R{dst} + {abs(k)}·R{src}"

    return "Thao tác hàng"


def _is_independent_rows(rows: np.ndarray, tol: float = 1e-10) -> bool:
    """Kiểm tra độc lập tuyến tính khi mỗi hàng là 1 vector."""
    if rows.ndim != 2 or rows.shape[0] == 0:
        return False
    r = int(np.linalg.matrix_rank(rows, tol=tol))
    return r == rows.shape[0]


def _improve_basis_by_exchange(A_rows: List[List[float]], pivot_indices: List[int], tol: float = 1e-10) -> List[int]:
    """
    Tối ưu cơ sở theo kiểu "basis exchange":
    - Đang có basis = pivot_indices (rank = r)
    - Thử thay từng vector cơ sở bằng vector ngoài cơ sở
      nếu vẫn độc lập và vector mới "đẹp" hơn (score nhỏ hơn).
    Greedy local improvement (đủ Photomath-like mà không brute force).
    """
    A = np.array(A_rows, dtype=float)
    n = A.shape[0]
    basis = pivot_indices[:]
    if not basis:
        return basis

    scores = [vector_pretty_score(A[i, :]) for i in range(n)]

    improved = True
    while improved:
        improved = False

        for bi in range(len(basis)):
            cur_idx = basis[bi]
            cur_score = scores[cur_idx]

            outsiders = [j for j in range(n) if j not in basis]
            best_j = None
            best_score = cur_score

            # tìm ứng viên tốt hơn (score nhỏ hơn)
            for j in outsiders:
                if scores[j] >= best_score - 1e-12:
                    continue

                trial = basis[:]
                trial[bi] = j
                trial_rows = A[trial, :]

                if _is_independent_rows(trial_rows, tol=tol):
                    best_j = j
                    best_score = scores[j]

            if best_j is not None:
                basis[bi] = best_j
                improved = True

    # giữ thứ tự "đẹp" hơn nữa: sort theo score tăng dần để basis nhìn hợp lý
    basis.sort(key=lambda idx: scores[idx])
    return basis


def compute_basis_payload(vectors: List[List[float]], tol: float = 1e-10, pivot_strategy: str = "min_norm"):
    """
    vectors: list[list[float]] với mỗi vector là 1 HÀNG.

    Payload trả về:
      basis: các vector độc lập (theo pivot_indices)
      dimension: rank
      pivot_indices: index vector gốc thuộc cơ sở
      dependents: index vector gốc phụ thuộc
      coeff_map: dep -> hệ số theo basis
      steps: lời giải chi tiết (PhotoMath-like)

    pivot_strategy:
      - "min_norm" | "max_abs" | "pretty"
    """
    if not vectors:
        raise ValueError("Danh sách vector rỗng.")

    mat = np.array(vectors, dtype=float)
    if mat.ndim != 2:
        raise ValueError("Dữ liệu vector không hợp lệ (phải là list 2D).")

    m, dim = mat.shape
    A = mat.tolist()  # (m x dim) mỗi hàng là 1 vector

    rank, pivot_indices, E, ops, row_ids = gaussian_elimination_rows_with_ops(
        A, tol=tol, pivot_strategy=pivot_strategy, snapshot_every_step=True
    )

    # ====== NEW: nếu chọn pretty thì tối ưu lại basis cho "đẹp" hơn ======
    if pivot_strategy == "pretty" and rank > 0:
        pivot_indices = _improve_basis_by_exchange(A, pivot_indices, tol=tol)

    basis_vectors = [vectors[i] for i in pivot_indices]
    dependents, coeff_map = _dependent_expressions_rows(A, pivot_indices, tol=tol)

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

    # PhotoMath-like: log từng phép biến đổi và snapshot ma trận sau bước đó
    if ops:
        steps.append(Step(
            kind="info",
            text="Bước 2: Biến đổi sơ cấp theo hàng (Gauss) để đưa A về dạng bậc thang.",
        ).to_dict())

        for t, op in enumerate(ops, start=1):
            text = f"Bước 2.{t}: {_fmt_row_op(op)}"
            steps.append(Step(
                kind="row_op",
                text=text,
                matrix=op.get("matrix_after"),
                row_op={k: v for k, v in op.items() if k != "matrix_after"},
            ).to_dict())

    steps.append(Step(
        kind="matrix",
        text="Ma trận E (dạng bậc thang) thu được:",
        matrix=E.tolist() if hasattr(E, "tolist") else E,
    ).to_dict())

    # (optional) ghi chú nếu có optimize pretty
    if pivot_strategy == "pretty" and rank > 0:
        steps.append(Step(
            kind="info",
            text="Ghi chú: Vì chọn chế độ 'pretty', hệ thống sẽ ưu tiên một cơ sở dễ nhìn hơn (ít số lẻ, gần nguyên/phân số/căn, ít tọa độ khác 0) nhưng vẫn độc lập tuyến tính.",
        ).to_dict())

    if rank == 0:
        steps.append(Step(
            kind="summary",
            text="Kết luận: Tất cả vector đều bằng 0 ⇒ rank = 0, không có cơ sở khác 0.",
        ).to_dict())
    else:
        basis_human = ", ".join([f"#{i+1}" for i in pivot_indices])
        steps.append(Step(
            kind="pivot_choose",
            text=f"Bước 3: Các vector {basis_human} là độc lập tuyến tính ⇒ chọn làm cơ sở.",
            meta={"pivot_indices": pivot_indices},
        ).to_dict())

        if dependents:
            dep_human = ", ".join([f"#{i+1}" for i in dependents])
            steps.append(Step(
                kind="dependents",
                text=f"Bước 4: Các vector còn lại ({dep_human}) là phụ thuộc tuyến tính và có thể ẩn.",
                meta={"dependents": dependents, "coeff_map": coeff_map},
            ).to_dict())

        steps.append(Step(
            kind="summary",
            text=f"Kết luận: rank = {rank}. Cơ sở lấy từ các vector {basis_human}.",
        ).to_dict())

    return {
        "basis": basis_vectors,
        "dimension": int(rank),
        "pivot_indices": pivot_indices,
        "dependents": dependents,
        "coeff_map": coeff_map,
        "steps": steps,
    }


from vectoria_api.explainers.registry import register
register("basis.gauss_rows", compute_basis_payload)
