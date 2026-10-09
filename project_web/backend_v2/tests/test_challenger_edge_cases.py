# backend_v2/tests/test_challenger_edge_cases.py
import json
import random
import pytest
import sympy as sp
import os

# Set environment variables for testing
os.environ["DEBUG"] = "True"
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret"
os.environ["ADMIN_SECRET_KEY"] = "test_admin_secret"

from vectoria_api.explainers.engine import explain
from vectoria_api.explainers.strategies.linear_independence import (
    explain_linear_independence,
    _to_exact_sympy,
)
from vectoria_api.explainers.strategies.rank_vectors import explain_rank_vectors


def _assert_zero_em_dash(obj):
    """
    Kiem tra de quy khong ton tai ky tu em-dash (\u2014) trong bat ky chuoi nao.
    """
    serialized = json.dumps(obj, ensure_ascii=False)
    assert "\u2014" not in serialized, "Phat hien ky tu em-dash (\\u2014) trong payload giai thich!"


def _parse_vectors_to_sympy(vectors):
    return [[_to_exact_sympy(x) for x in row] for row in vectors]


def _verify_ref_properties(res_rank):
    """
    Kiem tra chat che ma tran bac thang echelon_matrix dat chuan REF:
    1. Dong toan 0 o duoi cung.
    2. Chi so cot tru tang ngat theo tung dong.
    3. Moi phan tu duoi cot tru deu bang 0.
    4. So luong phan tu tru bang dung rank.
    """
    echelon = res_rank["method_matrix"]["echelon_matrix"]
    m = len(echelon)
    n = len(echelon[0])
    pivots = res_rank["result"]["pivots"]
    rank = res_rank["rank"]

    assert len(pivots) == rank, f"Pivots {pivots} count != rank {rank}"

    mat = [[_to_exact_sympy(x) for x in row] for row in echelon]

    zero_row_encountered = False
    last_pivot_col = -1
    actual_pivots = []

    for r in range(m):
        first_nonzero_c = None
        for c in range(n):
            if mat[r][c] != 0:
                first_nonzero_c = c
                break

        if first_nonzero_c is None:
            zero_row_encountered = True
        else:
            assert not zero_row_encountered, f"Dong khac 0 xuat hien sau dong toan 0 o dong {r}!"
            assert first_nonzero_c > last_pivot_col, (
                f"Cot tru o dong {r} ({first_nonzero_c}) khong lon hon dong truoc ({last_pivot_col})!"
            )
            last_pivot_col = first_nonzero_c
            actual_pivots.append([r, first_nonzero_c])

            for k in range(r + 1, m):
                assert mat[k][first_nonzero_c] == 0, (
                    f"Phan tu tai ({k}, {first_nonzero_c}) duoi phan tu tru khong bang 0!"
                )

    assert actual_pivots == pivots, f"Actual pivots {actual_pivots} != reported pivots {pivots}"


def _verify_sympy_ground_truth(vectors, res_rank, res_indep):
    """
    Kiem chung doc lap ket qua cua explainers voi ground truth tu SymPy goc.
    """
    A_sym = _parse_vectors_to_sympy(vectors)
    m = len(A_sym)
    n = len(A_sym[0])

    M = sp.Matrix(A_sym)
    expected_rank = M.rank()
    expected_independent = (expected_rank == m)

    # 1. Kiem tra Rank explainer
    assert res_rank["rank"] == expected_rank, (
        f"Rank explainer mismatch: got {res_rank['rank']}, expected {expected_rank}"
    )
    assert res_rank["result"]["rank"] == expected_rank
    assert res_rank["result"]["dimension_span"] == expected_rank
    assert res_rank["method_matrix"]["nonzero_rows"] == expected_rank

    pivots = res_rank["result"]["pivots"]
    assert len(pivots) == expected_rank, (
        f"Pivots count {len(pivots)} does not match rank {expected_rank}"
    )
    for r_idx, c_idx in pivots:
        assert 0 <= r_idx < m
        assert 0 <= c_idx < n

    # Kiem tra cau truc hinh hoc REF
    _verify_ref_properties(res_rank)

    # 2. Kiem tra Independence explainer
    assert res_indep["rank"] == expected_rank
    assert res_indep["independent"] == expected_independent
    assert res_indep["result"]["is_independent"] == expected_independent
    assert res_indep["result"]["rank"] == expected_rank

    _assert_zero_em_dash(res_rank)
    _assert_zero_em_dash(res_indep)


def _verify_dependency_relations_algebraically(vectors, res_indep):
    """
    Kiem chung rang moi he thuc phu thuoc tuyen tinh v_k = sum c_i v_i
    thuc su thoa man ve mat dai so: v_k - sum c_i v_i = 0.
    Dong thoi kiem tra nontrivial_example: sum c_i v_i = 0 voi it nhat mot c_i != 0.
    """
    A_sym = _parse_vectors_to_sympy(vectors)
    m = len(A_sym)
    n = len(A_sym[0])

    if res_indep["independent"]:
        assert len(res_indep["result"]["dependency_relations"]) == 0
        assert res_indep["method_equation"]["nontrivial_example"] is None
        return

    # Kiem tra nontrivial_example sum c_i * v_i == 0
    nontrivial = res_indep["method_equation"]["nontrivial_example"]
    assert nontrivial is not None, "He phu thuoc tuyen tinh phai co nontrivial_example!"
    coeffs = [_to_exact_sympy(c) for c in nontrivial["coeffs"]]
    assert len(coeffs) == m, f"Coeffs length {len(coeffs)} != m {m}"
    assert any(c != 0 for c in coeffs), "Nghiem khong tam thuong khong duoc toan so 0!"

    sum_vec = [sp.Integer(0)] * n
    for i in range(m):
        for j in range(n):
            sum_vec[j] = sp.simplify(sum_vec[j] + coeffs[i] * A_sym[i][j])
    assert all(comp == 0 for comp in sum_vec), (
        f"To hop tuyen tinh cua nghiem khong tam thuong khac 0: {sum_vec}"
    )

    dep_relations = res_indep["result"]["dependency_relations"]
    assert len(dep_relations) == m - res_indep["rank"], (
        f"So he thuc phu thuoc {len(dep_relations)} phai bang so an tu do {m - res_indep['rank']}"
    )

    V_col = sp.Matrix(A_sym).T
    rref_mat, pivot_cols = V_col.rref()
    pivot_cols_list = list(pivot_cols)

    for dep in dep_relations:
        k = dep["dependent_index"]
        assert 0 <= k < m
        assert k not in pivot_cols_list, f"Vector tru v_{k+1} khong duoc xem la vector phu thuoc!"

        reconstructed = [sp.Integer(0)] * n
        for r_idx, p in enumerate(pivot_cols_list):
            c_val = rref_mat[r_idx, k]
            if c_val != 0:
                for j in range(n):
                    reconstructed[j] = sp.simplify(reconstructed[j] + c_val * A_sym[p][j])

        diff = [sp.simplify(A_sym[k][j] - reconstructed[j]) for j in range(n)]
        assert all(d == 0 for d in diff), (
            f"He thuc phu thuoc cho v_{k+1} sai lech dai so! v_k: {A_sym[k]}, reconstructed: {reconstructed}"
        )


# =====================================================================
# STRESS TEST CASES
# =====================================================================

def test_stress_m_greater_than_n():
    """
    Stress 1: He vector co m > n (so vector lon hon so chieu khong gian).
    Theo dinh ly: bat ky he nao co m > n deu PHAI phu thuoc tuyen tinh.
    """
    # 1A: 4 vectors trong R^3
    v1 = [1, 0, 0]
    v2 = [0, 1, 0]
    v3 = [0, 0, 1]
    v4 = [2, -3, 5]
    vectors_4x3 = [v1, v2, v3, v4]

    res_rank_4x3 = explain("rank_vectors", vectors=vectors_4x3)
    res_indep_4x3 = explain("linear_independence", vectors=vectors_4x3)

    assert res_indep_4x3["independent"] is False
    assert res_indep_4x3["rank"] == 3
    _verify_sympy_ground_truth(vectors_4x3, res_rank_4x3, res_indep_4x3)
    _verify_dependency_relations_algebraically(vectors_4x3, res_indep_4x3)

    # 1B: 5 vectors trong R^2
    vectors_5x2 = [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
        [9, 10],
    ]
    res_rank_5x2 = explain("rank_vectors", vectors=vectors_5x2)
    res_indep_5x2 = explain("linear_independence", vectors=vectors_5x2)

    assert res_indep_5x2["independent"] is False
    assert res_indep_5x2["rank"] == 2
    _verify_sympy_ground_truth(vectors_5x2, res_rank_5x2, res_indep_5x2)
    _verify_dependency_relations_algebraically(vectors_5x2, res_indep_5x2)


def test_stress_m_less_than_n():
    """
    Stress 2: He vector co m < n (so vector nho hon so chieu khong gian).
    """
    # 2A: m = 2, n = 4 doc lap
    vectors_2x4_indep = [
        [1, 0, 2, -1],
        [0, 3, 1, 4],
    ]
    res_rank_2x4 = explain("rank_vectors", vectors=vectors_2x4_indep)
    res_indep_2x4 = explain("linear_independence", vectors=vectors_2x4_indep)

    assert res_indep_2x4["independent"] is True
    assert res_indep_2x4["rank"] == 2
    _verify_sympy_ground_truth(vectors_2x4_indep, res_rank_2x4, res_indep_2x4)
    _verify_dependency_relations_algebraically(vectors_2x4_indep, res_indep_2x4)

    # 2B: m = 3, n = 5 phu thuoc
    vectors_3x5_dep = [
        [1, 2, -1, 0, 3],
        [2, 4, -2, 0, 6],  # v2 = 2*v1
        [0, 1, 1, -1, 2],
    ]
    res_rank_3x5 = explain("rank_vectors", vectors=vectors_3x5_dep)
    res_indep_3x5 = explain("linear_independence", vectors=vectors_3x5_dep)

    assert res_indep_3x5["independent"] is False
    assert res_indep_3x5["rank"] == 2
    _verify_sympy_ground_truth(vectors_3x5_dep, res_rank_3x5, res_indep_3x5)
    _verify_dependency_relations_algebraically(vectors_3x5_dep, res_indep_3x5)


def test_stress_collinear_fractional_factors():
    """
    Stress 3: He vector ti le voi he so phan so: v2 = (7/3) * v1.
    """
    # 3A: v1 nguyen, v2 nguyen ti le 7/3
    vectors_frac1 = [
        [3, -6, 9],
        [7, -14, 21],
    ]
    res_rank_f1 = explain("rank_vectors", vectors=vectors_frac1)
    res_indep_f1 = explain("linear_independence", vectors=vectors_frac1)

    assert res_indep_f1["independent"] is False
    assert res_indep_f1["rank"] == 1
    _verify_sympy_ground_truth(vectors_frac1, res_rank_f1, res_indep_f1)
    _verify_dependency_relations_algebraically(vectors_frac1, res_indep_f1)

    dep = res_indep_f1["result"]["dependency_relations"][0]
    assert r"\frac{7}{3}" in dep["linear_combination_latex"]

    # 3B: Toa do la cac chuoi phan so toi gian
    vectors_frac2 = [
        ["1/3", "2/5", "-3/7"],
        ["7/9", "14/15", "-1"],  # (7/3) * (1/3) = 7/9; (7/3)*(2/5)=14/15; (7/3)*(-3/7)=-1
    ]
    res_rank_f2 = explain("rank_vectors", vectors=vectors_frac2)
    res_indep_f2 = explain("linear_independence", vectors=vectors_frac2)

    assert res_indep_f2["independent"] is False
    assert res_indep_f2["rank"] == 1
    _verify_sympy_ground_truth(vectors_frac2, res_rank_f2, res_indep_f2)
    _verify_dependency_relations_algebraically(vectors_frac2, res_indep_f2)


def test_stress_irrational_radical_coordinates():
    """
    Stress 4: Toa do vo ti / can thuc: [sqrt(2), 1], [2, sqrt(2)].
    """
    # 4A: v2 = sqrt(2) * v1 (phu thuoc)
    vectors_rad_dep = [
        ["sqrt(2)", 1],
        [2, "sqrt(2)"],
    ]
    res_rank_rd = explain("rank_vectors", vectors=vectors_rad_dep)
    res_indep_rd = explain("linear_independence", vectors=vectors_rad_dep)

    assert res_indep_rd["independent"] is False
    assert res_indep_rd["rank"] == 1
    _verify_sympy_ground_truth(vectors_rad_dep, res_rank_rd, res_indep_rd)
    _verify_dependency_relations_algebraically(vectors_rad_dep, res_indep_rd)

    # 4B: Can thuc doc lap tuyen tinh
    vectors_rad_indep = [
        ["sqrt(2)", 1],
        [1, "sqrt(3)"],
    ]
    res_rank_ri = explain("rank_vectors", vectors=vectors_rad_indep)
    res_indep_ri = explain("linear_independence", vectors=vectors_rad_indep)

    assert res_indep_ri["independent"] is True
    assert res_indep_ri["rank"] == 2
    _verify_sympy_ground_truth(vectors_rad_indep, res_rank_ri, res_indep_ri)
    _verify_dependency_relations_algebraically(vectors_rad_indep, res_indep_ri)

    # 4C: 3 vectors trong R^3 voi can thuc phu thuoc: v3 = v1 + v2
    vectors_rad_3 = [
        ["sqrt(2)", "sqrt(3)", 0],
        [0, "sqrt(3)", "sqrt(5)"],
        ["sqrt(2)", "2*sqrt(3)", "sqrt(5)"],
    ]
    res_rank_r3 = explain("rank_vectors", vectors=vectors_rad_3)
    res_indep_r3 = explain("linear_independence", vectors=vectors_rad_3)

    assert res_indep_r3["independent"] is False
    assert res_indep_r3["rank"] == 2
    _verify_sympy_ground_truth(vectors_rad_3, res_rank_r3, res_indep_r3)
    _verify_dependency_relations_algebraically(vectors_rad_3, res_indep_r3)


def test_stress_high_multiplicity_dependency():
    """
    Stress 5: To hop tuyen tinh boi so cao va nhieu vector phu thuoc dong thoi:
    v4 = 2*v1 - 3*v2 + 5*v3
    v5 = -v1 + 4*v2 - 2*v3
    """
    v1 = [1, 2, 0, 1]
    v2 = [-1, 0, 3, 2]
    v3 = [2, -1, 1, 0]
    v4 = [15, -1, -4, -4]
    v5 = [-9, 0, 10, 7]

    vectors_high = [v1, v2, v3, v4, v5]
    res_rank_h = explain("rank_vectors", vectors=vectors_high)
    res_indep_h = explain("linear_independence", vectors=vectors_high)

    assert res_indep_h["independent"] is False
    assert res_indep_h["rank"] == 3
    assert len(res_indep_h["result"]["dependency_relations"]) == 2

    _verify_sympy_ground_truth(vectors_high, res_rank_h, res_indep_h)
    _verify_dependency_relations_algebraically(vectors_high, res_indep_h)


def test_stress_all_zero_and_duplicate_vectors():
    """
    Stress 6: Vector khong va vector trung lap o moi vi tri.
    """
    # 6A: He gom 3 vector toan so 0 trong R^3
    all_zeros_3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    res_rank_z3 = explain("rank_vectors", vectors=all_zeros_3)
    res_indep_z3 = explain("linear_independence", vectors=all_zeros_3)

    assert res_rank_z3["rank"] == 0
    assert res_indep_z3["independent"] is False
    assert res_indep_z3["rank"] == 0
    assert len(res_indep_z3["result"]["dependency_relations"]) == 3
    _verify_sympy_ground_truth(all_zeros_3, res_rank_z3, res_indep_z3)
    _verify_dependency_relations_algebraically(all_zeros_3, res_indep_z3)

    # 6B: Vector khong o dau he
    zero_first = [[0, 0], [1, 2], [3, 4]]
    res_rank_zf = explain("rank_vectors", vectors=zero_first)
    res_indep_zf = explain("linear_independence", vectors=zero_first)

    assert res_indep_zf["independent"] is False
    assert res_indep_zf["rank"] == 2
    _verify_sympy_ground_truth(zero_first, res_rank_zf, res_indep_zf)
    _verify_dependency_relations_algebraically(zero_first, res_indep_zf)

    # 6C: Vector khong o giua he
    zero_middle = [[1, 2, 3], [0, 0, 0], [4, 5, 6]]
    res_rank_zm = explain("rank_vectors", vectors=zero_middle)
    res_indep_zm = explain("linear_independence", vectors=zero_middle)

    assert res_indep_zm["independent"] is False
    assert res_indep_zm["rank"] == 2
    _verify_sympy_ground_truth(zero_middle, res_rank_zm, res_indep_zm)
    _verify_dependency_relations_algebraically(zero_middle, res_indep_zm)

    # 6D: Vector trung lap (duplicate)
    duplicate_vecs = [[1, 2, 3], [1, 2, 3], [0, 1, 0]]
    res_rank_dup = explain("rank_vectors", vectors=duplicate_vecs)
    res_indep_dup = explain("linear_independence", vectors=duplicate_vecs)

    assert res_indep_dup["independent"] is False
    assert res_indep_dup["rank"] == 2
    _verify_sympy_ground_truth(duplicate_vecs, res_rank_dup, res_indep_dup)
    _verify_dependency_relations_algebraically(duplicate_vecs, res_indep_dup)


def test_stress_single_vector():
    """
    Stress 7: He chi co dung m = 1 vector.
    """
    # 7A: 1 vector khac 0 -> rank = 1, doc lap tuyen tinh
    single_nonzero = [[1, 2, 3]]
    res_rank_s1 = explain("rank_vectors", vectors=single_nonzero)
    res_indep_s1 = explain("linear_independence", vectors=single_nonzero)

    assert res_rank_s1["rank"] == 1
    assert res_indep_s1["independent"] is True
    assert res_indep_s1["rank"] == 1
    _verify_sympy_ground_truth(single_nonzero, res_rank_s1, res_indep_s1)
    _verify_dependency_relations_algebraically(single_nonzero, res_indep_s1)

    # 7B: 1 vector bang 0 -> rank = 0, phu thuoc tuyen tinh
    single_zero = [[0, 0, 0]]
    res_rank_sz = explain("rank_vectors", vectors=single_zero)
    res_indep_sz = explain("linear_independence", vectors=single_zero)

    assert res_rank_sz["rank"] == 0
    assert res_indep_sz["independent"] is False
    assert res_indep_sz["rank"] == 0
    _verify_sympy_ground_truth(single_zero, res_rank_sz, res_indep_sz)
    _verify_dependency_relations_algebraically(single_zero, res_indep_sz)


def test_stress_large_numbers_and_dimensions():
    """
    Stress 8: So nguyen rat lon va so chieu cao (m = 3, n = 8).
    """
    v1 = [10**12, 2 * 10**12, 3 * 10**12, 4 * 10**12, 5 * 10**12, 6 * 10**12, 7 * 10**12, 8 * 10**12]
    v2 = [3 * 10**12, 6 * 10**12, 9 * 10**12, 12 * 10**12, 15 * 10**12, 18 * 10**12, 21 * 10**12, 24 * 10**12]
    v3 = [1, 0, 0, 0, 0, 0, 0, 0]
    vectors_large = [v1, v2, v3]

    res_rank_lg = explain("rank_vectors", vectors=vectors_large)
    res_indep_lg = explain("linear_independence", vectors=vectors_large)

    assert res_indep_lg["independent"] is False
    assert res_indep_lg["rank"] == 2
    _verify_sympy_ground_truth(vectors_large, res_rank_lg, res_indep_lg)
    _verify_dependency_relations_algebraically(vectors_large, res_indep_lg)


def test_stress_randomized_fuzzing():
    """
    Stress 9: Fuzzing ngau nhien 30 bo du lieu da dang:
    Kiem tra tinh dung dan dai so va tinh chat REF tren 100% truong hop.
    """
    rng = random.Random(42)  # Co dinh seed de bao dam tinh lap lai

    for iteration in range(30):
        m = rng.randint(1, 5)
        n = rng.randint(1, 5)

        # Chon kieu sinh ma tran
        mode = iteration % 4
        if mode == 0:
            # Ngau nhien so nguyen nho [-5, 5]
            vectors = [[rng.randint(-5, 5) for _ in range(n)] for _ in range(m)]
        elif mode == 1:
            # Co dinh vector phu thuoc (dong sau = to hop dong truoc)
            base_vecs = [[rng.randint(-3, 3) for _ in range(n)] for _ in range(max(1, m - 1))]
            if m > 1:
                # Dong cuoi la to hop cua cac dong truoc
                last_vec = [0] * n
                for b_idx, b_vec in enumerate(base_vecs):
                    coeff = rng.randint(-2, 2)
                    for j in range(n):
                        last_vec[j] += coeff * b_vec[j]
                vectors = base_vecs + [last_vec]
            else:
                vectors = base_vecs
        elif mode == 2:
            # Phan so dang chuoi "a/b"
            vectors = []
            for _ in range(m):
                row = []
                for _ in range(n):
                    num = rng.randint(-4, 4)
                    den = rng.randint(1, 4)
                    row.append(f"{num}/{den}")
                vectors.append(row)
        else:
            # Ma tran chua vector 0 hoac trung lap
            vectors = [[rng.randint(-3, 3) for _ in range(n)] for _ in range(m)]
            if m > 1 and rng.random() > 0.5:
                vectors[rng.randint(0, m - 1)] = [0] * n
            elif m > 1:
                vectors[1] = list(vectors[0])

        res_rank = explain("rank_vectors", vectors=vectors)
        res_indep = explain("linear_independence", vectors=vectors)

        _verify_sympy_ground_truth(vectors, res_rank, res_indep)
        _verify_dependency_relations_algebraically(vectors, res_indep)
