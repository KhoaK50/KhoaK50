import math
import os
from typing import Any, Dict, List, Optional, Tuple
from neo4j import GraphDatabase

# ---------------------------------------------------------
# 1. BKT (Bayesian Knowledge Tracing) Engine
# ---------------------------------------------------------
def calculate_bkt_update(
    p_l_prev: float,
    is_correct: bool,
    p_slip: float = 0.10,
    p_guess: float = 0.25,
    p_transit: float = 0.15
) -> float:
    """
    Cập nhật xác suất thành thạo khái niệm theo định lý xác suất Bayes.
    P(L_{t+1}) = P(L_t | obs) + (1 - P(L_t | obs)) * P(T)
    """
    p_l = max(0.01, min(0.99, float(p_l_prev)))
    
    if is_correct:
        numerator = p_l * (1.0 - p_slip)
        denominator = numerator + (1.0 - p_l) * p_guess
    else:
        numerator = p_l * p_slip
        denominator = numerator + (1.0 - p_l) * (1.0 - p_guess)
        
    p_l_obs = numerator / denominator if denominator > 0 else p_l
    p_l_next = p_l_obs + (1.0 - p_l_obs) * p_transit
    
    return round(max(0.01, min(0.99, p_l_next)), 4)


# ---------------------------------------------------------
# 2. IRT 2PL & Person-Fit l_z Engine
# ---------------------------------------------------------
def irt_2pl_prob(theta: float, a: float, b: float) -> float:
    """
    Xác suất trả lời đúng câu hỏi theo mô hình 2PL IRT:
    P_i(theta) = 1 / (1 + exp(-a_i * (theta - b_i)))
    """
    try:
        val = -a * (theta - b)
        val = max(-20.0, min(20.0, val))
        p = 1.0 / (1.0 + math.exp(val))
        return max(0.001, min(0.999, p))
    except OverflowError:
        return 0.999 if theta > b else 0.001


def calculate_person_fit_lz(
    responses: List[Dict[str, Any]],
    theta: float = 0.0
) -> Tuple[float, float, float]:
    """
    Tính Thước đo độ bất thường mẫu làm bài (Chỉ số Person-Fit l_z):
    l(theta) = sum [u_i * ln(P_i) + (1 - u_i) * ln(1 - P_i)]
    E[l(theta)] = sum [P_i * ln(P_i) + (1 - P_i) * ln(1 - P_i)]
    Var[l(theta)] = sum P_i * (1 - P_i) * [ln(P_i / (1 - P_i))]^2
    l_z = (l(theta) - E) / sqrt(Var)
    """
    if not responses:
        return 0.0, 0.0, 0.0
        
    log_likelihood = 0.0
    expected_log_lik = 0.0
    var_log_lik = 0.0
    
    for r in responses:
        u = 1.0 if r.get("is_correct") else 0.0
        a = float(r.get("discrimination_index") or 1.0)
        b = float(r.get("difficulty_index") or 0.0)
        
        p = irt_2pl_prob(theta, a, b)
        q = 1.0 - p
        
        log_p = math.log(p)
        log_q = math.log(q)
        logit = math.log(p / q)
        
        log_likelihood += u * log_p + (1.0 - u) * log_q
        expected_log_lik += p * log_p + q * log_q
        var_log_lik += p * q * (logit ** 2)
        
    if var_log_lik > 1e-6:
        l_z = (log_likelihood - expected_log_lik) / math.sqrt(var_log_lik)
    else:
        l_z = 0.0
        
    return round(l_z, 3), round(log_likelihood, 3), round(var_log_lik, 3)


# ---------------------------------------------------------
# 3. RTE (Response Time Effort) Engine
# ---------------------------------------------------------
def calculate_rte(
    responses: List[Dict[str, Any]],
    default_expected_time: float = 60.0,
    threshold_ratio: float = 0.10
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Tính Chỉ số Nỗ lực Thời gian Phản hồi (RTE):
    Ngưỡng đoán mò siêu tốc NT_{10%} = max(3s, threshold_ratio * T_expected).
    Nếu T_spent < NT_{10%}: RTE_i = 0, ngược lại RTE_i = 1.
    """
    if not responses:
        return 1.0, []
        
    rte_scores = []
    enriched = []
    
    for r in responses:
        t_spent = float(r.get("time_spent_seconds", 0))
        t_exp = float(r.get("expected_time", default_expected_time))
        threshold = max(3.0, t_exp * threshold_ratio)
        
        is_rapid_guess = (t_spent < threshold)
        rte_val = 0.0 if is_rapid_guess else 1.0
        rte_scores.append(rte_val)
        
        item_copy = dict(r)
        item_copy["is_rapid_guess"] = is_rapid_guess
        item_copy["nt_threshold"] = threshold
        enriched.append(item_copy)
        
    overall_rte = sum(rte_scores) / len(rte_scores) if rte_scores else 1.0
    return round(overall_rte, 3), enriched


# ---------------------------------------------------------
# 4. Bộ Phân Loại 8 Trường Hợp Biên (8 Edge Cases Classifier)
# ---------------------------------------------------------
def classify_edge_cases(
    items: List[Dict[str, Any]],
    l_z: float,
    overall_rte: float,
    user_p_l_map: Dict[str, float]
) -> Dict[str, Any]:
    """
    Phân loại chính xác 8 Edge Cases nhận thức dựa trên dữ liệu vi hành vi.
    """
    detected_cases = []
    item_diagnoses = {}
    
    procedural_items = [it for it in items if "procedural" in (it.get("tags") or [])]
    conceptual_items = [it for it in items if "conceptual" in (it.get("tags") or [])]
    
    proc_score = (sum(1 for it in procedural_items if it.get("is_correct")) / len(procedural_items)) if procedural_items else None
    conc_score = (sum(1 for it in conceptual_items if it.get("is_correct")) / len(conceptual_items)) if conceptual_items else None
    
    suspected_lucky_count = 0
    rapid_guess_count = 0
    rapid_indices = []
    
    has_easy_wrong = any(not it.get("is_correct") and (it.get("difficulty_level") == "EASY" or (it.get("difficulty_index") or 0) < -0.5) for it in items)
    
    for idx, it in enumerate(items):
        q_id = it.get("question_id")
        is_corr = bool(it.get("is_correct"))
        t_spent = float(it.get("time_spent_seconds", 0))
        is_rapid = bool(it.get("is_rapid_guess"))
        distractor = it.get("distractor_type") or "NONE"
        diff_level = it.get("difficulty_level", "MEDIUM")
        kc_tag = (it.get("tags") or ["default"])[0]
        prior_bkt = user_p_l_map.get(kc_tag, 0.5)
        
        flag = "NORMAL"
        
        # EC-1: Ăn may ở câu khó (Lucky Guessing)
        if is_corr:
            if is_rapid or (diff_level == "HARD" and has_easy_wrong) or (diff_level == "HARD" and l_z < -1.8):
                flag = "SUSPECTED_LUCKY"
                suspected_lucky_count += 1
                if "EC-1_LUCKY_GUESS" not in [d["code"] for d in detected_cases]:
                    detected_cases.append({
                        "code": "EC-1_LUCKY_GUESS",
                        "title": "Nghi ngờ ăn may ở câu khó",
                        "reason": f"Làm đúng câu hỏi mức {diff_level} nhưng tốc độ thao tác quá nhanh so với độ dài câu hỏi ({t_spent}s)."
                    })
        else:
            # EC-3: Sơ suất do nghĩ quá nhiều (Overthinking Slip)
            if prior_bkt >= 0.75 and t_spent > 120 and distractor in ["BOUNDARY_TRAP", "DEGENERACY_TRAP"]:
                flag = "OVERTHINKING_SLIP"
                if "EC-3_OVERTHINKING" not in [d["code"] for d in detected_cases]:
                    detected_cases.append({
                        "code": "EC-3_OVERTHINKING",
                        "title": "Bất cẩn do nghĩ quá nhiều",
                        "reason": f"Dành nhiều thời gian ngẫm nghĩ ({t_spent}s) nhưng chọn nhầm phương án gài bẫy khái niệm đặc biệt."
                    })
            # EC-8: Bất cẩn số học thông thường (Careless Slip)
            elif prior_bkt >= 0.70 and distractor in ["ARITHMETIC_SLIP", "SIGN_SLIP"]:
                flag = "CARELESS_ERROR"
                if "EC-8_CARELESS_SLIP" not in [d["code"] for d in detected_cases]:
                    detected_cases.append({
                        "code": "EC-8_CARELESS_SLIP",
                        "title": "Bất cẩn tính toán số học",
                        "reason": "Nắm được phương pháp nhưng sơ suất nhầm dấu âm hoặc tính nhẩm sai ở bước chọn đáp án."
                    })
                    
        if is_rapid:
            rapid_guess_count += 1
            rapid_indices.append(idx + 1)
            
        item_diagnoses[q_id] = flag

    total_items = len(items)
    avg_time = sum(float(it.get("time_spent_seconds", 0)) for it in items) / total_items if total_items > 0 else 0
    correct_items = sum(1 for it in items if it.get("is_correct"))
    is_passing = (correct_items / total_items >= 0.70) if total_items > 0 else False
    high_switch_wrong_count = sum(1 for it in items if int(it.get("switch_count", 0)) >= 3 and not it.get("is_correct"))

    all_rushed = (rapid_guess_count == total_items) or (total_items > 0 and (rapid_guess_count / total_items >= 0.8 or (overall_rte <= 0.25 and avg_time < 5.0)))
    tail_rushed = (rapid_guess_count >= 1) and not all_rushed and all(i >= (total_items / 2) for i in rapid_indices)

    # EC-2: Bẫy học vẹt thao tác (Procedural Trap)
    if proc_score is not None and conc_score is not None:
        if proc_score >= 0.75 and conc_score <= 0.35:
            detected_cases.append({
                "code": "EC-2_PROCEDURAL_TRAP",
                "title": "Học vẹt thao tác / Rỗng bản chất",
                "reason": f"Điểm thao tác tính toán đạt {int(proc_score*100)}% nhưng điểm bản chất lý thuyết chỉ đạt {int(conc_score*100)}%."
            })

    # EC-4A: Làm vội toàn bài (Global Rapid Guessing / Spamming)
    if all_rushed:
        detected_cases.append({
            "code": "EC-4A_GLOBAL_SPAM_GUESSING",
            "title": "Chọn nhanh và làm vội toàn bài",
            "pacing_type": "GLOBAL_RUSH",
            "reason": f"Học viên hoàn thành bài kiểm tra quá vội ở tất cả {rapid_guess_count}/{total_items} câu hỏi dưới ngưỡng đọc hiểu (RTE={overall_rte}, trung bình {round(avg_time, 1)}s/câu)."
        })
    # EC-4B: Đuối sức / Vội ở các câu cuối (End-of-test Fatigue / Tail Rush)
    elif tail_rushed or (rapid_guess_count >= 1 and any(i == total_items for i in rapid_indices) and not all_rushed and rapid_guess_count <= total_items // 2):
        rushed_str = ", ".join(f"câu {i}" for i in rapid_indices)
        detected_cases.append({
            "code": "EC-4B_END_OF_TEST_FATIGUE",
            "title": "Đuối sức ở những câu cuối",
            "pacing_type": "TAIL_RUSH",
            "reason": f"Nhịp độ làm bài giảm sút rõ rệt ở các câu cuối ({rushed_str}) dưới ngưỡng đọc hiểu (RTE={overall_rte})."
        })
    elif overall_rte < 0.60 or rapid_guess_count >= 2:
        rushed_str = ", ".join(f"câu {i}" for i in rapid_indices)
        detected_cases.append({
            "code": "EC-4_RAPID_GUESSING",
            "title": "Chọn nhanh rải rác dưới ngưỡng đọc hiểu",
            "pacing_type": "SCATTERED_RUSH",
            "reason": f"Có {rapid_guess_count}/{total_items} câu chọn nhanh bất thường ({rushed_str})."
        })

    # EC-3B: Nỗ lực nhưng bế tắc / phân vân (Diligent Struggle)
    if high_switch_wrong_count >= 2 or (not any(it.get("is_rapid_guess") for it in items) and avg_time > 45.0 and correct_items <= 1):
        detected_cases.append({
            "code": "EC-3B_DILIGENT_STRUGGLE",
            "title": "Nỗ lực suy nghĩ nhưng bối rối khái niệm",
            "reason": "Dành nhiều thời gian và phân vân đổi đáp án nhiều lần nhưng chưa làm chủ được bẫy khái niệm."
        })

    # EC-7: Ảo tưởng thành thạo (False Mastery)
    if is_passing and (suspected_lucky_count / total_items > 0.35 or l_z < -2.00 or all_rushed):
        detected_cases.append({
            "code": "EC-7_FALSE_MASTERY",
            "title": "Ảo tưởng thành thạo do đoán may rủi",
            "reason": f"Điểm số bài thi đạt chuẩn qua bài ({correct_items}/{total_items}) nhưng nhịp độ làm bài quá ngắn hoặc không nhất quán với năng lực thực chất (l_z={l_z})."
        })

    return {
        "item_diagnoses": item_diagnoses,
        "detected_cases": detected_cases,
        "suspected_lucky_count": suspected_lucky_count,
        "is_false_mastery": any(d["code"] == "EC-7_FALSE_MASTERY" for d in detected_cases),
        "l_z": l_z,
        "overall_rte": overall_rte,
        "pacing_summary": {
            "all_rushed": all_rushed,
            "tail_rushed": tail_rushed,
            "rapid_indices": rapid_indices,
            "avg_time": round(avg_time, 1)
        }
    }


# ---------------------------------------------------------
# 5. Neo4j Real Prerequisite Graph Traversal
# ---------------------------------------------------------
def get_neo4j_prerequisites(node_id: str) -> List[Dict[str, str]]:
    """
    Truy vấn đồ thị tri thức Neo4j thực tế qua quan hệ [:REQUIRES].
    Thay thế hoàn toàn dữ liệu mock.
    """
    uri = os.getenv("NEO4J_URI", "")
    user = os.getenv("NEO4J_USER", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD", "")
    
    if not uri or not pwd:
        return []
        
    driver = None
    try:
        driver = GraphDatabase.driver(uri, auth=(user, pwd))
        with driver.session() as session:
            query = """
            MATCH (n:Lesson {id: $node_id})-[:REQUIRES]->(pre:Lesson)
            RETURN pre.id AS id, pre.title AS title
            """
            result = session.run(query, node_id=node_id)
            prereqs = [{"id": record["id"], "title": record["title"]} for record in result]
            
            if not prereqs:
                query_fallback = """
                MATCH (n {id: $node_id})-[:REQUIRES]->(pre)
                RETURN pre.id AS id, coalesce(pre.title, pre.name, pre.id) AS title
                """
                res2 = session.run(query_fallback, node_id=node_id)
                prereqs = [{"id": r["id"], "title": r["title"]} for r in res2]
                
            return prereqs
    except Exception as e:
        print(f">> [Neo4j Traversal Warning] {e}")
        return []
    finally:
        if driver:
            driver.close()
