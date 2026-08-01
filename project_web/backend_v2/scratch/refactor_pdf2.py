import re

with open(r'd:\Programming_language\project_web\backend_v2\vectoria_api\explainers\strategies\basis_gauss_rows.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update _latex_vec and _latex_vec_list
code = re.sub(r'def _latex_vec\(v: List\[float\], tol: float = 1e-10\) -> str:.*?return "\\\\left\(" \+ ",\\\\;".join\(items\) \+ "\\\\right\)"',
              r"""def _latex_vec(v, tol: float = 1e-10) -> str:
    items = [_fmt_k(x, tol=tol) for x in v]
    return "\\left(" + ",\\;".join(items) + "\\right)\"""", code, flags=re.DOTALL)

code = re.sub(r'def _latex_vec_list\(vectors: List\[List\[float\]\], tol: float = 1e-10\) -> str:.*?return ",\\\\; ".join\(parts\)',
              r"""def _latex_vec_list(vectors, tol: float = 1e-10) -> str:
    parts = []
    for i, v in enumerate(vectors):
        parts.append(f"v_{{{i+1}}} = {_latex_vec(v, tol=tol)}")
    return ",\\; ".join(parts)\"""", code, flags=re.DOTALL)


# 2. Update _is_multiple
code = re.sub(r'def _is_multiple\(.*?return False, 0\.0',
              r"""def _is_multiple(v1, v2, tol: float = 1e-10):
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
    return (True, k) if k is not None else (False, sp.Integer(0))""", code, flags=re.DOTALL)

# 3. Update _solve_in_span
code = re.sub(r'def _solve_in_span\(.*?return False, \[\]',
              r"""def _solve_in_span(basis_vectors, target_vector, tol: float = 1e-10):
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
            return False, []""", code, flags=re.DOTALL)

# 4. Remove all np.array usages in _eq_stepwise_pdf_latex
code = code.replace("v1 = np.array(vectors[0], dtype=float)", "v1 = vectors[0]")
code = code.replace("np.linalg.norm(v1) <= tol", "sp.Matrix(v1).is_zero_matrix")
code = code.replace("np.array(vectors[k], dtype=float)", "vectors[k]")

# Pass A instead of vectors to _eq_stepwise_pdf_latex inside compute_basis_payload
code = code.replace("eq_step_latex, step_basis_idx, step_dim = _eq_stepwise_pdf_latex(vectors, tol=tol)",
                    "eq_step_latex, step_basis_idx, step_dim = _eq_stepwise_pdf_latex(A, tol=tol)")

code = code.replace("eq_general_latex = _eq_general_pdf_latex(\n        vectors=vectors",
                    "eq_general_latex = _eq_general_pdf_latex(\n        vectors=A")

code = code.replace("rank_eq, m_unknowns = _solve_homogeneous_rank(vectors, tol=tol)",
                    "rank_eq, m_unknowns = _solve_homogeneous_rank(A, tol=tol)")

with open(r'd:\Programming_language\project_web\backend_v2\vectoria_api\explainers\strategies\basis_gauss_rows.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
