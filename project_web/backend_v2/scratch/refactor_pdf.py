import re

with open(r'd:\Programming_language\project_web\backend_v2\vectoria_api\explainers\strategies\basis_gauss_rows.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update _solve_homogeneous_rank to use SymPy
solve_rank_orig = """def _solve_homogeneous_rank(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[int, int]:
    \"\"\"
    Rank theo kiểu 'hệ phương trình' k1..km (m ẩn).
    Ma trận hệ: n x m (cột là vector).
    \"\"\"
    if not vectors:
        return 0, 0
    A = np.array(vectors, dtype=float)  # m x n (rows)
    M = A.T  # n x m (cols)
    r = int(np.linalg.matrix_rank(M, tol=tol))
    m = M.shape[1]
    return r, m"""

solve_rank_new = """def _solve_homogeneous_rank(
    vectors: List[List[sp.Expr]], tol: float = 1e-10
) -> Tuple[int, int]:
    if not vectors:
        return 0, 0
    M = sp.Matrix(vectors).T
    return M.rank(), M.shape[1]"""
code = code.replace(solve_rank_orig, solve_rank_new)


# 2. Update _build_homogeneous_system_latex to NOT cast to float
build_sys_orig = """    for j in range(n):
        terms = []
        for i in range(m):
            a = float(vectors[i][j])
            ak = _fmt_k(a, tol=tol)"""
build_sys_new = """    for j in range(n):
        terms = []
        for i in range(m):
            a = vectors[i][j]
            ak = _fmt_k(a, tol=tol)"""
code = code.replace(build_sys_orig, build_sys_new)


# 3. Update _eq_stepwise_pdf_latex to use SymPy
# This function is large, let's just do regex replacements for np.array and np.linalg.solve
# Re-read _eq_stepwise_pdf_latex inside python...
# Actually, it's easier to just pass "vectors" as evaluated sp.Expr to the old functions, 
# and NOT cast them. I'll replace `dtype=float` with `dtype=object` for NumPy. 
# Wait, np.linalg.lstsq doesn't support dtype=object!
# Instead of fighting with replacing all numpy logic in this 300-line function, 
# I will just write the function `_eq_stepwise_pdf_latex` to use SymPy directly for solve!
