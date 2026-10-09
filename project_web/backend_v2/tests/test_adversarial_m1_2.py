# backend_v2/tests/test_adversarial_m1_2.py
"""
Adversarial Stress Test Suite for Vectoria Milestone 1 (Backend Explainer Engine).
Tests API routes (/api/linear_independence and /api/rank) via Flask test_client under:
1. Boundary conditions: 1x1, 1xN, Nx1, all-zero, rank-deficient.
2. Large matrices: 10x10 with rank 7, 10x10 full rank (10), 10x10 rank 1, tall 10x3, wide 5x10.
3. Determinant duality: Square matrices with det == 0 vs det != 0.
4. Payload fuzzing and malformed inputs (empty list, missing field, 1D, dimension mismatch, unparseable strings, invalid types).
5. Elementary row operation invariant oracle: every step matrix in method_matrix.steps is a valid row operation.
6. Row Echelon Form (REF) invariant oracle: echelon_matrix is strictly in REF.
7. Zero floats invariant oracle: 0 Python floats, 0 decimal floats in JSON output.
8. Zero Em-dash invariant: em-dash character strictly banned.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, List, Optional
import pytest
import sympy as sp

# Set environment variables for testing before importing app
os.environ["DEBUG"] = "True"
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret"
os.environ["ADMIN_SECRET_KEY"] = "test_admin_secret"

from vectoria_api.core.validate import parse_latex_to_sympy
from vectoria_api.explainers.strategies.linear_independence import _to_exact_sympy
from backend_v2.app import app


@pytest.fixture(scope="module")
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ============================================================================
# MATHEMATICAL ORACLES & INVARIANT VERIFIERS
# ============================================================================

def parse_matrix_strings(mat_strs: List[List[str]]) -> List[List[sp.Expr]]:
    """Parse a 2D list of LaTeX/string expressions into exact SymPy expressions."""
    return [[parse_latex_to_sympy(cell) for cell in row] for row in mat_strs]


def parse_input_vectors(vectors: List[List[Any]]) -> List[List[sp.Expr]]:
    """Parse raw input vectors into exact SymPy expressions."""
    return [[_to_exact_sympy(cell) for cell in row] for row in vectors]


def verify_zero_em_dash(payload: Any) -> None:
    """Recursively verify no em-dash character (\u2014) exists in the output payload."""
    raw = json.dumps(payload, ensure_ascii=False)
    assert "\u2014" not in raw, "Phat hien ky tu em-dash (\\u2014) trong JSON output!"


def verify_zero_floats(obj: Any, path: str = "root") -> None:
    """
    Verify that ZERO floats exist anywhere in the JSON response:
    1. No Python float type (only int, bool, str, list, dict).
    2. No decimal point floating-point numbers in serialized numerical strings (e.g. '0.5', '1.25').
    """
    assert not isinstance(obj, float), f"Found Python float at {path}: {obj}"

    if isinstance(obj, str):
        # Disallow raw decimal floats like '0.5', '-12.34', '0.0', but allow integers like '0', '-1', '12'
        match = re.search(r'(?<![a-zA-Z\\])([-+]?\d+\.\d+)', obj)
        assert match is None, (
            f"Found floating-point decimal string '{match.group(1)}' at {path}: {obj}"
        )
    elif isinstance(obj, dict):
        for k, v in obj.items():
            verify_zero_floats(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            verify_zero_floats(item, f"{path}[{idx}]")


def verify_ref_invariants(
    echelon_strs: List[List[str]],
    expected_rank: int,
    reported_pivots: List[List[int]],
    reported_nonzero_rows: int,
) -> None:
    """
    Mathematically verify that echelon_strs is strictly in Row Echelon Form (REF):
    1. All zero rows are strictly at the bottom.
    2. Leading non-zero entries (pivots) strictly advance to the right row by row.
    3. All entries below every pivot are strictly zero.
    4. Count of non-zero rows equals reported_nonzero_rows and expected_rank.
    5. Reported pivots match exact leading non-zero entry coordinates.
    """
    m = len(echelon_strs)
    assert m > 0, "Echelon matrix has 0 rows"
    n = len(echelon_strs[0])
    E = parse_matrix_strings(echelon_strs)

    # 1. Identify leading entry column for each row
    leading_cols: List[Optional[int]] = []
    for r in range(m):
        lead = None
        for c in range(n):
            if sp.simplify(E[r][c]) != 0:
                lead = c
                break
        leading_cols.append(lead)

    # 2. Check all zero rows are at the bottom
    first_zero_row = None
    for r in range(m):
        if leading_cols[r] is None:
            first_zero_row = r
            break

    if first_zero_row is not None:
        for r in range(first_zero_row, m):
            assert leading_cols[r] is None, (
                f"Row Echelon Form violation: Non-zero row at index {r} is below zero row at {first_zero_row}"
            )

    # 3. Check leading coefficients strictly increase
    nonzero_rows = [r for r in range(m) if leading_cols[r] is not None]
    actual_nonzero_count = len(nonzero_rows)

    assert actual_nonzero_count == reported_nonzero_rows, (
        f"Reported nonzero_rows ({reported_nonzero_rows}) != actual ({actual_nonzero_count})"
    )
    assert actual_nonzero_count == expected_rank, (
        f"Actual rank ({actual_nonzero_count}) != expected rank ({expected_rank})"
    )

    for idx in range(len(nonzero_rows) - 1):
        r1 = nonzero_rows[idx]
        r2 = nonzero_rows[idx + 1]
        c1 = leading_cols[r1]
        c2 = leading_cols[r2]
        assert c1 is not None and c2 is not None
        assert c1 < c2, (
            f"Row Echelon Form violation: Pivot col does not strictly increase: row {r1} (col {c1}) >= row {r2} (col {c2})"
        )

    # 4. Check all entries below leading entries are zero
    for r in nonzero_rows:
        lead_c = leading_cols[r]
        assert lead_c is not None
        for r_below in range(r + 1, m):
            val = sp.simplify(E[r_below][lead_c])
            assert val == 0, (
                f"Row Echelon Form violation: Entry below pivot ({r}, {lead_c}) at row {r_below} is non-zero: {val}"
            )

    # 5. Check reported pivots match actual pivot coordinates
    expected_pivots = [[r, leading_cols[r]] for r in nonzero_rows]
    assert reported_pivots == expected_pivots, (
        f"Reported pivots {reported_pivots} != expected pivots {expected_pivots}"
    )


def verify_row_operations_invariants(
    initial_vectors: List[List[Any]],
    steps: List[dict],
    echelon_strs: List[List[str]],
) -> None:
    """
    Mathematically verify that EVERY step in method_matrix.steps represents a valid
    elementary row operation (swap or elimination), and that chaining them produces echelon_matrix.
    """
    M_curr = parse_input_vectors(initial_vectors)
    m = len(M_curr)
    n = len(M_curr[0])

    for s_idx, step in enumerate(steps):
        op = step["op"]
        label = step["latex_label"]
        M_next = parse_matrix_strings(step["matrix"])
        assert len(M_next) == m, f"Step {s_idx} row count changed"
        assert len(M_next[0]) == n, f"Step {s_idx} col count changed"

        if op == "swap":
            # Exactly two rows swapped, all others identical
            changed_rows = [
                r for r in range(m)
                if any(sp.simplify(M_next[r][c] - M_curr[r][c]) != 0 for c in range(n))
            ]
            assert len(changed_rows) == 2, (
                f"Step {s_idx} op=swap changed {len(changed_rows)} rows instead of 2: {changed_rows}"
            )
            r1, r2 = changed_rows
            # M_next[r1] == M_curr[r2] and M_next[r2] == M_curr[r1]
            for c in range(n):
                assert sp.simplify(M_next[r1][c] - M_curr[r2][c]) == 0, f"Swap mismatch at row {r1}, col {c}"
                assert sp.simplify(M_next[r2][c] - M_curr[r1][c]) == 0, f"Swap mismatch at row {r2}, col {c}"

        elif op == "elim":
            changed_rows = [
                r for r in range(m)
                if any(sp.simplify(M_next[r][c] - M_curr[r][c]) != 0 for c in range(n))
            ]
            assert len(changed_rows) > 0, f"Step {s_idx} op=elim had 0 changed rows"

            # Each changed row must be of the form: M_next[r] = M_curr[r] + factor * M_curr[p_row]
            # for some unchanged pivot row p_row
            for r_chg in changed_rows:
                found_valid_elim = False
                for p_row in range(m):
                    if p_row in changed_rows:
                        continue
                    # Check if diff is a scalar multiple of M_curr[p_row]
                    diff = [sp.simplify(M_next[r_chg][c] - M_curr[r_chg][c]) for c in range(n)]
                    factor = None
                    valid = True
                    for c in range(n):
                        base = sp.simplify(M_curr[p_row][c])
                        d = diff[c]
                        if base != 0:
                            f = sp.simplify(d / base)
                            if factor is None:
                                factor = f
                            elif sp.simplify(factor - f) != 0:
                                valid = False
                                break
                        else:
                            if d != 0:
                                valid = False
                                break
                    if valid and factor is not None:
                        found_valid_elim = True
                        break
                assert found_valid_elim, (
                    f"Step {s_idx} row {r_chg} elimination ({label}) is not a valid elementary row operation"
                )
        else:
            pytest.fail(f"Unknown operation type in steps: {op}")

        M_curr = M_next

    # Final matrix from steps must match echelon_matrix exactly
    echelon_sym = parse_matrix_strings(echelon_strs)
    for r in range(m):
        for c in range(n):
            diff = sp.simplify(M_curr[r][c] - echelon_sym[r][c])
            assert diff == 0, (
                f"Mismatch between final step matrix ({M_curr[r][c]}) and echelon_matrix ({echelon_sym[r][c]}) at ({r}, {c})"
            )


def verify_all_payload_invariants(
    vectors: List[List[Any]],
    payload: dict,
    expected_rank: int,
    expected_independent: Optional[bool] = None,
) -> None:
    """Run all mathematical, structural, and hygiene invariant verifications on a payload."""
    verify_zero_em_dash(payload)
    verify_zero_floats(payload)

    method_mat = payload["method_matrix"]
    verify_ref_invariants(
        echelon_strs=method_mat["echelon_matrix"],
        expected_rank=expected_rank,
        reported_pivots=method_mat["pivots"],
        reported_nonzero_rows=method_mat["nonzero_rows"],
    )

    verify_row_operations_invariants(
        initial_vectors=vectors,
        steps=method_mat["steps"],
        echelon_strs=method_mat["echelon_matrix"],
    )

    if expected_independent is not None:
        assert payload["independent"] is expected_independent
        assert payload["result"]["is_independent"] is expected_independent


# ============================================================================
# 1. BOUNDARY INPUTS (1x1, 1xN, Nx1, Zero Vectors)
# ============================================================================

class TestBoundaryInputs:
    def test_1x1_nonzero_independent(self, client):
        """1x1 non-zero vector is independent, rank 1."""
        vectors = [[5]]
        # 1. Linear independence endpoint
        r1 = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r1.status_code == 200
        d1 = r1.get_json()
        assert d1["independent"] is True
        assert d1["rank"] == 1
        verify_all_payload_invariants(vectors, d1, expected_rank=1, expected_independent=True)

        # 2. Rank endpoint
        r2 = client.post("/api/rank", json={"vectors": vectors})
        assert r2.status_code == 200
        d2 = r2.get_json()
        assert d2["rank"] == 1
        verify_all_payload_invariants(vectors, d2, expected_rank=1)

    def test_1x1_zero_dependent(self, client):
        """1x1 zero vector is dependent, rank 0."""
        vectors = [[0]]
        # 1. Linear independence endpoint
        r1 = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r1.status_code == 200
        d1 = r1.get_json()
        assert d1["independent"] is False
        assert d1["rank"] == 0
        verify_all_payload_invariants(vectors, d1, expected_rank=0, expected_independent=False)

        # 2. Rank endpoint
        r2 = client.post("/api/rank", json={"vectors": vectors})
        assert r2.status_code == 200
        d2 = r2.get_json()
        assert d2["rank"] == 0
        verify_all_payload_invariants(vectors, d2, expected_rank=0)

    def test_1x1_rational_fraction(self, client):
        """1x1 rational string '-3/7' is independent, rank 1."""
        vectors = [["-3/7"]]
        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is True
        assert d["rank"] == 1
        verify_all_payload_invariants(vectors, d, expected_rank=1, expected_independent=True)

    def test_single_vector_in_r3(self, client):
        """Single non-zero vector in R^3 is independent, rank 1."""
        vectors = [[1, 2, 3]]
        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is True
        assert d["rank"] == 1
        verify_all_payload_invariants(vectors, d, expected_rank=1, expected_independent=True)

    def test_single_zero_vector_in_r3(self, client):
        """Single zero vector [0, 0, 0] in R^3 is dependent, rank 0."""
        vectors = [[0, 0, 0]]
        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is False
        assert d["rank"] == 0
        verify_all_payload_invariants(vectors, d, expected_rank=0, expected_independent=False)

    def test_three_vectors_in_r1(self, client):
        """3 vectors in R^1: [[1], [2], [3]] -> dependent, rank 1."""
        vectors = [[1], [2], [3]]
        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is False
        assert d["rank"] == 1
        verify_all_payload_invariants(vectors, d, expected_rank=1, expected_independent=False)

    def test_all_zero_matrix_3x3(self, client):
        """3 zero vectors in R^3 -> dependent, rank 0."""
        vectors = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        r1 = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r1.status_code == 200
        d1 = r1.get_json()
        assert d1["independent"] is False
        assert d1["rank"] == 0
        verify_all_payload_invariants(vectors, d1, expected_rank=0, expected_independent=False)

        r2 = client.post("/api/rank", json={"vectors": vectors})
        assert r2.status_code == 200
        d2 = r2.get_json()
        assert d2["rank"] == 0
        verify_all_payload_invariants(vectors, d2, expected_rank=0)


# ============================================================================
# 2. LARGE MATRICES & RECURSION STRESS (10x10, Rank Deficient, Tall, Wide)
# ============================================================================

class TestLargeMatricesAndStress:
    def test_10x10_rank_7(self, client):
        """
        10x10 matrix with rank 7:
        7 independent unit vectors + 3 explicit linear combinations.
        Tests recursion limits, rational arithmetic performance, and REF invariants.
        """
        rows = []
        for i in range(7):
            row = [1 if j == i else 0 for j in range(10)]
            rows.append(row)
        # 3 linear combinations
        rows.append([rows[0][j] + 2 * rows[1][j] for j in range(10)])
        rows.append([rows[2][j] - rows[3][j] for j in range(10)])
        rows.append([3 * rows[4][j] + rows[5][j] - rows[6][j] for j in range(10)])

        # 1. Linear independence
        r1 = client.post("/api/linear_independence", json={"vectors": rows})
        assert r1.status_code == 200
        d1 = r1.get_json()
        assert d1["independent"] is False
        assert d1["rank"] == 7
        assert len(d1["result"]["dependency_relations"]) == 3
        verify_all_payload_invariants(rows, d1, expected_rank=7, expected_independent=False)

        # 2. Rank
        r2 = client.post("/api/rank", json={"vectors": rows})
        assert r2.status_code == 200
        d2 = r2.get_json()
        assert d2["rank"] == 7
        assert d2["result"]["dimension_span"] == 7
        verify_all_payload_invariants(rows, d2, expected_rank=7)

    def test_10x10_full_rank_10(self, client):
        """10x10 upper triangular matrix with non-zero diagonals -> full rank 10."""
        rows = []
        for i in range(10):
            row = [0] * i + [1] * (10 - i)
            rows.append(row)

        r = client.post("/api/linear_independence", json={"vectors": rows})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is True
        assert d["rank"] == 10
        verify_all_payload_invariants(rows, d, expected_rank=10, expected_independent=True)

    def test_10x10_rank_1(self, client):
        """10x10 matrix where every row is a multiple of [1, 2, ..., 10] -> rank 1."""
        base = list(range(1, 11))
        rows = [[k * x for x in base] for k in range(1, 11)]

        r = client.post("/api/rank", json={"vectors": rows})
        assert r.status_code == 200
        d = r.get_json()
        assert d["rank"] == 1
        verify_all_payload_invariants(rows, d, expected_rank=1)

    def test_wide_matrix_5x10_rank_5(self, client):
        """5 vectors in R^10 with rank 5 -> independent."""
        rows = []
        for i in range(5):
            row = [0] * 10
            row[i] = 1
            row[i + 5] = 2
            rows.append(row)

        r = client.post("/api/linear_independence", json={"vectors": rows})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is True
        assert d["rank"] == 5
        verify_all_payload_invariants(rows, d, expected_rank=5, expected_independent=True)

    def test_tall_matrix_10x3_rank_3(self, client):
        """10 vectors in R^3 -> must be dependent, max rank 3."""
        rows = []
        for i in range(10):
            rows.append([i + 1, (i + 1) ** 2 % 7, (i + 1) ** 3 % 5])

        r = client.post("/api/linear_independence", json={"vectors": rows})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is False
        assert d["rank"] <= 3
        verify_all_payload_invariants(rows, d, expected_rank=d["rank"], expected_independent=False)


# ============================================================================
# 3. DETERMINANT DUALITY (det != 0 vs det == 0)
# ============================================================================

class TestDeterminantDuality:
    def test_square_invertible_3x3_det_nonzero(self, client):
        """3x3 matrix with det != 0 -> full rank 3, independent."""
        # det = 1*(0 - 24) - 2*(0 - 20) + 3*(0 - 5) = -24 + 40 - 15 = 1 != 0
        vectors = [[1, 2, 3], [0, 1, 4], [5, 6, 0]]
        det_val = sp.Matrix(vectors).det()
        assert det_val != 0

        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is True
        assert d["rank"] == 3
        verify_all_payload_invariants(vectors, d, expected_rank=3, expected_independent=True)

    def test_square_singular_3x3_det_zero(self, client):
        """3x3 singular matrix with arithmetic progression -> det == 0, rank 2."""
        vectors = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        det_val = sp.Matrix(vectors).det()
        assert det_val == 0

        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is False
        assert d["rank"] == 2
        verify_all_payload_invariants(vectors, d, expected_rank=2, expected_independent=False)

    def test_square_singular_4x4_det_zero(self, client):
        """4x4 singular matrix where row 4 = row 1 + row 2 - row 3 -> det == 0, rank 3."""
        r1 = [1, 0, 2, -1]
        r2 = [2, 1, 0, 3]
        r3 = [0, -1, 4, 1]
        r4 = [r1[j] + r2[j] - r3[j] for j in range(4)]
        vectors = [r1, r2, r3, r4]
        assert sp.Matrix(vectors).det() == 0

        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is False
        assert d["rank"] == 3
        verify_all_payload_invariants(vectors, d, expected_rank=3, expected_independent=False)

    def test_square_invertible_4x4_det_nonzero(self, client):
        """4x4 identity matrix -> det == 1, rank 4, independent."""
        vectors = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ]
        assert sp.Matrix(vectors).det() == 1

        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()
        assert d["independent"] is True
        assert d["rank"] == 4
        verify_all_payload_invariants(vectors, d, expected_rank=4, expected_independent=True)


# ============================================================================
# 4. MALFORMED INPUTS & FUZZING
# ============================================================================

class TestMalformedAndNegativeInputs:
    def test_empty_vectors_list(self, client):
        """Empty vectors array -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": []})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_missing_vectors_field(self, client):
        """Missing vectors key -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_none_vectors(self, client):
        """vectors: None -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": None})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_string_instead_of_list(self, client):
        """vectors as string -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": "not_a_list"})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_1d_vectors(self, client):
        """1D vector [1, 2, 3] instead of 2D [[1, 2, 3]] -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": [1, 2, 3]})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_nested_empty_row(self, client):
        """A row inside vectors is empty [] -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": [[1, 2], []]})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_mismatched_dimensions(self, client):
        """Rows with differing lengths -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": [[1, 2, 3], [4, 5]]})
            assert r.status_code == 400
            assert "error" in r.get_json()

    def test_unparseable_string_elements(self, client):
        """Syntax error string elements in vectors -> 400 Bad Request."""
        for endpoint in ["/api/linear_independence", "/api/rank"]:
            r = client.post(endpoint, json={"vectors": [["++", 2], [3, 4]]})
            assert r.status_code == 400
            assert "error" in r.get_json()

            r2 = client.post(endpoint, json={"vectors": [["///", 2], [3, 4]]})
            assert r2.status_code == 400
            assert "error" in r2.get_json()



# ============================================================================
# 5. FLOAT ERADICATION & EXACT RATIONAL ARITHMETIC
# ============================================================================

class TestFloatEradicationAndExactArithmetic:
    def test_float_input_converted_to_exact_rational(self, client):
        """
        Pass float inputs (0.5, 0.25, etc.) in JSON request.
        Verify:
        - Response status is 200.
        - ZERO Python floats exist in output JSON.
        - Output uses exact fraction representations or integers, not decimals.
        """
        vectors = [[0.5, 0.25], [1.5, 0.75]]
        r = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()

        assert d["independent"] is False
        assert d["rank"] == 1
        verify_zero_floats(d)
        verify_zero_em_dash(d)

        # Check raw serialized json has no '0.5' or '0.25'
        serialized = json.dumps(d)
        assert "0.5" not in serialized
        assert "0.25" not in serialized
        assert "0.75" not in serialized

    def test_exact_fractions_and_radicals_system(self, client):
        """
        Verify that fraction string inputs remain strictly exact throughout
        Gauss elimination steps and echelon matrix.
        """
        vectors = [["1/3", "-2/5"], ["5/6", "1/2"]]
        r = client.post("/api/rank", json={"vectors": vectors})
        assert r.status_code == 200
        d = r.get_json()

        assert d["rank"] == 2
        verify_zero_floats(d)
        verify_zero_em_dash(d)
        verify_all_payload_invariants(vectors, d, expected_rank=2)


# ============================================================================
# 6. ROW OPERATIONS & REF ORACLE PROPERTY FUZZING
# ============================================================================

class TestRowOperationsAndREFPropertyFuzzing:
    @pytest.mark.parametrize(
        "vectors, expected_rank, expected_indep",
        [
            # Case 1: Needs row swap at top
            ([[0, 2, 1], [1, 3, -1], [2, 1, 0]], 3, True),
            # Case 2: Zero column at start
            ([[0, 0, 1], [0, 0, 2], [0, 1, 3]], 2, False),
            # Case 3: Negative entries and fraction pivots
            ([[-2, 3, 5], [4, -6, -10], [1, 2, 3]], 2, False),
            # Case 4: 4x3 tall matrix (rank 3)
            ([[1, 2, 3], [2, 5, 1], [1, 1, -4], [4, 8, 0]], 3, False),
            # Case 5: 3x4 wide matrix (rank 2)
            ([[1, 1, 1, 1], [2, 2, 2, 2], [0, 1, 2, 3]], 2, False),
        ],
    )
    def test_property_row_operations_and_ref(self, client, vectors, expected_rank, expected_indep):
        """
        Stress test step-by-step row operations and REF invariant across
        various matrix topologies.
        """
        # Test linear independence endpoint
        r_indep = client.post("/api/linear_independence", json={"vectors": vectors})
        assert r_indep.status_code == 200
        d_indep = r_indep.get_json()
        verify_all_payload_invariants(
            vectors, d_indep, expected_rank=expected_rank, expected_independent=expected_indep
        )

        # Test rank endpoint
        r_rank = client.post("/api/rank", json={"vectors": vectors})
        assert r_rank.status_code == 200
        d_rank = r_rank.get_json()
        verify_all_payload_invariants(
            vectors, d_rank, expected_rank=expected_rank
        )
