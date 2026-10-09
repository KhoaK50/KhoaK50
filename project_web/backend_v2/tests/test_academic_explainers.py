# backend_v2/tests/test_academic_explainers.py
import json
import pytest
import sympy as sp
import os

# Set environment variables for testing
os.environ["DEBUG"] = "True"
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret"
os.environ["ADMIN_SECRET_KEY"] = "test_admin_secret"

from vectoria_api.explainers.engine import explain
from vectoria_api.explainers.strategies.linear_independence import explain_linear_independence
from vectoria_api.explainers.strategies.rank_vectors import explain_rank_vectors
from backend_v2.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _assert_zero_em_dash(obj):
    """
    Kiem tra de quy khong ton tai ky tu em-dash (\u2014) trong bat ky chuoi nao.
    """
    serialized = json.dumps(obj, ensure_ascii=False)
    assert "\u2014" not in serialized, "Phat hien ky tu em-dash (\\u2014) trong payload giai thich!"


def test_independent_vectors_r3():
    """
    Kiem thu he 3 vector doc lap tuyen tinh trong R^3.
    """
    vectors = [[1, 2, 3], [0, 1, 4], [5, 6, 0]]
    res = explain("linear_independence", vectors=vectors)

    assert res["independent"] is True
    assert res["rank"] == 3
    assert res["num_vectors"] == 3
    assert res["dimension"] == 3
    assert "doc lap" in res["message"].lower() or "độc lập" in res["message"].lower()

    # Result object
    assert res["result"]["is_independent"] is True
    assert res["result"]["rank"] == 3
    assert len(res["result"]["dependency_relations"]) == 0

    # Method matrix
    assert res["method_matrix"]["nonzero_rows"] == 3
    assert len(res["method_matrix"]["pivots"]) == 3
    assert "rank = 3 = 3" in res["method_matrix"]["deduction_latex"] or "3 = 3" in res["method_matrix"]["deduction_latex"]

    # Method equation
    assert res["method_equation"]["solution_type"] == "unique"
    assert len(res["method_equation"]["free_variables"]) == 0
    assert res["method_equation"]["nontrivial_example"] is None

    _assert_zero_em_dash(res)


def test_dependent_proportional_vectors():
    """
    Kiem thu he 2 vector ti le (phu thuoc tuyen tinh).
    """
    vectors = [[1, 2], [2, 4]]
    res = explain("linear_independence", vectors=vectors)

    assert res["independent"] is False
    assert res["rank"] == 1
    assert res["num_vectors"] == 2
    assert res["dimension"] == 2

    # Dependency relations
    assert len(res["result"]["dependency_relations"]) == 1
    dep = res["result"]["dependency_relations"][0]
    assert dep["dependent_index"] == 1
    assert dep["dependent_name"] == "v_2"
    assert "v_2 = 2v_1" in dep["linear_combination_latex"]

    # Method matrix
    assert res["method_matrix"]["nonzero_rows"] == 1
    assert len(res["method_matrix"]["pivots"]) == 1

    # Method equation
    assert res["method_equation"]["solution_type"] == "infinite"
    assert "c_2" in res["method_equation"]["free_variables"]
    assert res["method_equation"]["nontrivial_example"] is not None

    _assert_zero_em_dash(res)


def test_dependent_nontrivial_combination_r4():
    """
    Kiem thu he 3 vector trong R^4 phu thuoc phuc tap:
    v_1 = (1, 0, 2, -1)
    v_2 = (0, 1, -1, 2)
    v_3 = 2*v_1 - 3*v_2 = (2, -3, 7, -8)
    """
    v1 = [1, 0, 2, -1]
    v2 = [0, 1, -1, 2]
    v3 = [2, -3, 7, -8]
    vectors = [v1, v2, v3]

    res = explain("linear_independence", vectors=vectors)

    assert res["independent"] is False
    assert res["rank"] == 2
    assert res["num_vectors"] == 3
    assert res["dimension"] == 4

    # Dependency relations
    assert len(res["result"]["dependency_relations"]) == 1
    dep = res["result"]["dependency_relations"][0]
    assert dep["dependent_index"] == 2
    assert dep["dependent_name"] == "v_3"
    assert "2v_1 - 3v_2" in dep["linear_combination_latex"]

    # Method equation
    assert res["method_equation"]["solution_type"] == "infinite"
    assert res["method_equation"]["free_variables"] == ["c_3"]
    assert res["method_equation"]["nontrivial_example"] is not None
    assert "v_3 = 2v_1 - 3v_2" in res["method_equation"]["nontrivial_example"]["relation_latex"]

    _assert_zero_em_dash(res)


def test_system_containing_zero_vector():
    """
    Kiem thu he chua vector khong [0, 0, 0] va he toan vector khong.
    """
    vectors = [[0, 0, 0], [1, 2, 3]]
    res = explain("linear_independence", vectors=vectors)

    assert res["independent"] is False
    assert res["rank"] == 1
    dep = res["result"]["dependency_relations"][0]
    assert dep["dependent_index"] == 0
    assert dep["dependent_name"] == "v_1"
    assert r"\vec{0}" in dep["linear_combination_latex"]

    # Test rank explainer with all zero vectors
    all_zeros = [[0, 0], [0, 0]]
    res_rank = explain("rank_vectors", vectors=all_zeros)
    assert res_rank["rank"] == 0
    assert res_rank["result"]["rank"] == 0
    assert res_rank["result"]["dimension_span"] == 0
    assert res_rank["result"]["pivots"] == []
    assert r"\emptyset" in res_rank["method_equation"]["maximal_independent_subset_latex"]

    _assert_zero_em_dash(res)
    _assert_zero_em_dash(res_rank)


def test_exact_rational_fractions_and_radicals():
    """
    Kiem thu so hoc SymPy chinh xac 100%, khong lam tron so thuc.
    v_1 = (1/2, sqrt(3)/2)
    v_2 = (1/3, sqrt(3)/3) -> v_2 = (2/3) * v_1
    """
    vectors = [["1/2", "sqrt(3)/2"], ["1/3", "sqrt(3)/3"]]
    res = explain("linear_independence", vectors=vectors)

    assert res["independent"] is False
    assert res["rank"] == 1

    # Check relation: v_2 = \frac{2}{3}v_1
    dep = res["result"]["dependency_relations"][0]
    assert dep["dependent_name"] == "v_2"
    assert r"\frac{2}{3}" in dep["linear_combination_latex"]

    # Verify no float decimals in the serialized output
    payload_str = json.dumps(res)
    assert "0.3333" not in payload_str
    assert "0.8660" not in payload_str
    assert "0.6666" not in payload_str

    _assert_zero_em_dash(res)


def test_rank_vectors_explainer():
    """
    Kiem thu toan dien strategy rank_vectors.
    """
    vectors = [[1, 2, -1], [2, 5, 1], [1, 1, -4]]
    res = explain("rank_vectors", vectors=vectors)

    assert res["problem_id"] == "rank_vectors"
    assert res["rank"] == 2
    assert res["dimension"] == 3
    assert res["num_vectors"] == 3
    assert "2" in res["message"]

    # Result
    assert res["result"]["rank"] == 2
    assert res["result"]["dimension_span"] == 2
    assert res["result"]["pivots"] == [[0, 0], [1, 1]]
    assert res["result"]["basis_indices"] == [0, 1]

    # Method matrix
    assert res["method_matrix"]["title"] == "Cách 1: Phương pháp biến đổi sơ cấp đưa về ma trận bậc thang"
    assert len(res["method_matrix"]["steps"]) >= 1
    assert res["method_matrix"]["nonzero_rows"] == 2
    assert res["method_matrix"]["pivots"] == [[0, 0], [1, 1]]

    # Method equation & method definition alias
    assert res["method_equation"]["title"] == "Cách 2: Phương pháp hệ vector độc lập tuyến tính tối đại"
    assert res["method_equation"]["maximal_independent_indices"] == [0, 1]
    assert "S'" in res["method_equation"]["maximal_independent_subset_latex"]
    assert res["method_definition"] == res["method_equation"]

    _assert_zero_em_dash(res)


def test_api_endpoints_via_flask(client):
    """
    Kiem thu cac endpoints /api/linear_independence va /api/rank qua Flask HTTP client.
    """
    # 1. POST /api/linear_independence (dependent)
    r1 = client.post(
        "/api/linear_independence",
        json={"vectors": [[1, 2, -1], [2, 5, 1], [1, 1, -4]]},
    )
    assert r1.status_code == 200
    data1 = r1.get_json()
    assert data1["independent"] is False
    assert data1["rank"] == 2
    assert data1["problem_id"] == "linear_independence"
    assert "dependency_relations" in data1["result"]
    assert len(data1["result"]["dependency_relations"]) == 1

    # 2. POST /api/linear_independence (independent)
    r2 = client.post(
        "/api/linear_independence",
        json={"vectors": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]},
    )
    assert r2.status_code == 200
    data2 = r2.get_json()
    assert data2["independent"] is True
    assert data2["rank"] == 3

    # 3. POST /api/rank
    r3 = client.post(
        "/api/rank",
        json={"vectors": [[1, 2, -1], [2, 5, 1], [1, 1, -4]]},
    )
    assert r3.status_code == 200
    data3 = r3.get_json()
    assert data3["rank"] == 2
    assert data3["problem_id"] == "rank_vectors"
    assert data3["result"]["dimension_span"] == 2

    # 4. Error handling: empty vectors
    r_err1 = client.post("/api/linear_independence", json={"vectors": []})
    assert r_err1.status_code == 400

    r_err2 = client.post("/api/rank", json={"vectors": []})
    assert r_err2.status_code == 400

    # 5. Error handling: unequal dimension vectors
    r_err3 = client.post("/api/rank", json={"vectors": [[1, 2], [1, 2, 3]]})
    assert r_err3.status_code == 400

    _assert_zero_em_dash(data1)
    _assert_zero_em_dash(data2)
    _assert_zero_em_dash(data3)
