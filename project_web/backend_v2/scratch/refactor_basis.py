import re

with open(r'd:\Programming_language\project_web\backend_v2\vectoria_api\explainers\strategies\basis_gauss_rows.py.bak', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace numpy imports and _fmt_k with sp.latex
code = code.replace("import numpy as np", "import numpy as np\nimport sympy as sp\nfrom vectoria_api.core.validate import parse_latex_to_sympy")

# Replace gaussian_elimination_rows_with_ops
code = code.replace("from vectoria_api.core.linalg import gaussian_elimination_rows_with_ops", 
                    "from vectoria_api.core.linalg import sympy_gaussian_elimination_rows_with_ops")

# _fmt_k is heavily used. Let's redefine _fmt_k to just return sp.latex(sp.simplify(val))
fmt_k_replacement = """def _fmt_k(val, tol: float = 1e-9) -> str:
    if isinstance(val, sp.Expr):
        return sp.latex(sp.simplify(val))
    # Fallback if float is passed
    try:
        expr = sp.sympify(val)
        return sp.latex(sp.simplify(expr))
    except:
        return str(val)"""

code = re.sub(r'def _fmt_k\(val: float, tol: float = 1e-9\) -> str:.*?# 5\. Fallback: Số thập phân \(cho ln, pi, e\.\.\.\)\n    return f"\{val:\.4f\}"\.rstrip\("0"\)\.rstrip\("\."\)', fmt_k_replacement, code, flags=re.DOTALL)

# In compute_basis_payload, parse vectors to SymPy
payload_orig = """    if not vectors:
        raise ValueError("Danh sách vector rỗng.")

    mat = np.array(vectors, dtype=float)
    if mat.ndim != 2:
        raise ValueError("Dữ liệu vector không hợp lệ (phải là list 2D).")

    m, dim = mat.shape
    A = mat.tolist()

    # 1. Chạy Khử Gauss (Cho Cách 1 - Ma trận)
    rank, pivot_indices_gauss, E, ops, row_ids = gaussian_elimination_rows_with_ops(
        A, tol=tol, pivot_strategy=pivot_strategy, snapshot_every_step=True
    )"""

payload_new = """    if not vectors:
        raise ValueError("Danh sách vector rỗng.")

    A = []
    for row in vectors:
        A.append([parse_latex_to_sympy(x) for x in row])
        
    m = len(A)
    dim = len(A[0]) if m > 0 else 0

    # 1. Chạy Khử Gauss (Cho Cách 1 - Ma trận)
    rank, pivot_indices_gauss, E, ops, row_ids = sympy_gaussian_elimination_rows_with_ops(
        A, snapshot_every_step=True
    )"""
code = code.replace(payload_orig, payload_new)

# In compute_basis_payload, change basis_vectors to float (for now, to not break frontend drawing)
basis_vec_orig = """    basis_vectors = [vectors[i] for i in final_pivot_indices]"""
basis_vec_new = """    basis_vectors = [[float(parse_latex_to_sympy(x).evalf()) for x in vectors[i]] for i in final_pivot_indices]"""
code = code.replace(basis_vec_orig, basis_vec_new)

# Update _dependent_expressions_rows to use SymPy
dep_orig = """    A = np.array(A_rows, dtype=float)
    m, dim = A.shape

    piv = list(pivot_indices)
    dep = [i for i in range(m) if i not in piv]

    if (not dep) or (not piv):
        return dep, {}

    B = A[piv, :]  # r x dim
    BT = B.T  # dim x r

    coeff_map: Dict[int, List[float]] = {}
    for i in dep:
        v = A[i, :]
        # Giải hệ B^T * c = v^T (tìm tọa độ c) để biểu diễn v theo basis B
        c, _, _, _ = np.linalg.lstsq(BT, v, rcond=None)
        coeff_map[i] = c.tolist()"""

dep_new = """    A = [ [parse_latex_to_sympy(x) for x in row] for row in A_rows ]
    m = len(A)
    dim = len(A[0]) if m > 0 else 0

    piv = list(pivot_indices)
    dep = [i for i in range(m) if i not in piv]

    if (not dep) or (not piv):
        return dep, {}

    # Basis matrix transposed
    BT = sp.Matrix([A[i] for i in piv]).T
    
    coeff_map: Dict[int, List[float]] = {}
    for i in dep:
        v = sp.Matrix(A[i])
        try:
            c = BT.solve_least_squares(v)
            coeff_map[i] = [float(x.evalf()) for x in c]
        except Exception:
            coeff_map[i] = [0.0]*len(piv)"""
code = code.replace(dep_orig, dep_new)

with open(r'd:\Programming_language\project_web\backend_v2\vectoria_api\explainers\strategies\basis_gauss_rows.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
