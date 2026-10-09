# backend_v2/vectoria_api/explainers/__init__.py
from __future__ import annotations

# Import strategies để chúng tự register vào registry.
# Lưu ý: chỉ cần import, không cần dùng biến.
def init_explainers() -> None:
    # Them strategy nao thi import o day
    from vectoria_api.explainers.strategies import basis_gauss_rows  # noqa: F401
    from vectoria_api.explainers.strategies import linear_independence  # noqa: F401
    from vectoria_api.explainers.strategies import rank_vectors  # noqa: F401
