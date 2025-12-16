# backend_v2/vectoria_api/core/format.py
import math
import numpy as np


def _is_close(x, y, eps=1e-10):
    return abs(x - y) <= eps


def _coord_pretty_cost(x: float) -> float:
    """Chi phí 'xấu' của 1 tọa độ thực. Càng nhỏ càng đẹp."""
    ax = abs(float(x))
    if ax < 1e-12:
        return 0.0  # coi như 0

    # gần số nguyên
    rx = round(x)
    if _is_close(x, rx, 1e-10):
        # nguyên nhỏ rất đẹp
        return 0.2 + 0.02 * min(12, len(str(abs(int(rx)))))

    # gần phân số mẫu nhỏ (<= 12)
    best = None
    for d in range(2, 13):
        n = round(x * d)
        approx = n / d
        err = abs(approx - x)
        if err < 1e-9:
            # mẫu nhỏ càng đẹp
            cost = 0.6 + 0.08 * d + 0.02 * len(str(abs(int(n))))
            best = cost if best is None else min(best, cost)
    if best is not None:
        return best

    # gần dạng k*sqrt(m) với m <= 50 (đọc kiểu căn bậc hai)
    for m in range(2, 51):
        s = math.sqrt(m)
        k = x / s
        rk = round(k)
        if _is_close(k, rk, 1e-9) and abs(rk) <= 12:
            return 0.9 + 0.06 * m + 0.05 * abs(rk)

    # fallback: thập phân -> phạt theo số chữ số cần để biểu diễn "gọn"
    s = f"{x:.6f}".rstrip("0").rstrip(".")
    digits = len(s.replace("-", "").replace(".", ""))
    return 1.8 + 0.03 * digits + 0.15 * math.log10(ax + 1.0)


def vector_pretty_score(row: np.ndarray) -> float:
    """Điểm đẹp cho 1 vector (hàng). Điểm càng nhỏ càng đẹp."""
    # sparsity: ít phần tử khác 0 thì đẹp hơn
    nz = int(np.sum(np.abs(row) > 1e-12))
    sparsity_cost = 0.45 * nz

    # magnitude: nhẹ tay để không chọn pivot "bé tí" gây mất ổn định
    norm = float(np.linalg.norm(row))
    magnitude_cost = 0.18 * math.log10(norm + 1.0)

    # coordinate simplicity
    coord_cost = 0.0
    for v in row.tolist():
        coord_cost += _coord_pretty_cost(float(v))

    return sparsity_cost + magnitude_cost + coord_cost
