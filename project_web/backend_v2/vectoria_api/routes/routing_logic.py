import json
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection

import heapq
from vectoria_api.config import DB_URL

def get_graph_edges(lessons):
    """
    Tạo đồ thị (danh sách kề) từ danh sách bài học.
    - Nối tuần tự bài i -> bài i+1.
    - Thêm các cạnh nhảy cóc (skip edges) i -> i+2, i -> i+3 trong cùng Topic 
      để thuật toán Dijkstra có thể "né" các bài quá dễ.
    """
    graph = { (l[0], l[1]): [] for l in lessons }
    
    n = len(lessons)
    for i in range(n):
        u_key = (lessons[i][0], lessons[i][1])
        # Nối tới bài tiếp theo
        if i + 1 < n:
            v_key = (lessons[i+1][0], lessons[i+1][1])
            graph[u_key].append(v_key)
        
        # Thêm các cạnh nhảy cóc (skip edges) trong cùng topic
        for jump in range(2, 4): # Có thể nhảy qua 1-2 bài
            if i + jump < n and lessons[i][0] == lessons[i+jump][0]:
                v_key = (lessons[i+jump][0], lessons[i+jump][1])
                graph[u_key].append(v_key)
                
    return graph

def calculate_optimal_path(user_id):
    """
    Tính toán lộ trình tối ưu bằng Dijkstra.
    Returns: (is_new_proposal, proposed_path, reasoning_notes)
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # 1. Get all lessons
        c.execute("SELECT topic_id, order_index, title, complexity, time FROM lessons ORDER BY topic_id, order_index")
        lessons = c.fetchall()
        
        if not lessons:
            return False, [], []

        # 2. Get user metrics
        c.execute("SELECT latent_ability, trust_weight FROM user_metrics WHERE user_id = %s", (user_id,))
        metrics = c.fetchone()
        beta_u = float(metrics[0]) if metrics else 1.0

        # 3. Get user mastery
        c.execute("SELECT topic_id, order_index, mastery_score FROM user_lesson_mastery WHERE user_id = %s", (user_id,))
        mastery_rows = c.fetchall()
        mastery_dict = {(row[0], row[1]): float(row[2]) for row in mastery_rows}

        # 4. Get current path
        c.execute("SELECT current_path FROM user_learning_paths WHERE user_id = %s", (user_id,))
        path_row = c.fetchone()
        if path_row and path_row[0]:
            current_path = path_row[0]
            if isinstance(current_path, str):
                current_path = json.loads(current_path)
        else:
            current_path = [{"topic_id": l[0], "order_index": l[1]} for l in lessons]
            c.execute(
                "INSERT INTO user_learning_paths (user_id, current_path) VALUES (%s, %s) ON CONFLICT (user_id) DO NOTHING",
                (user_id, json.dumps(current_path))
            )
            conn.commit()

        # 5. Build Graph and Node Weights
        graph = get_graph_edges(lessons)
        node_weights = {}
        node_info = {}
        
        for l in lessons:
            t_id, o_idx, title, comp, t_expected = l
            key = (t_id, o_idx)
            node_info[key] = {"title": title, "comp": comp}
            mastery = mastery_dict.get(key, 0.0)
            
            p_u = 1.0 - mastery
            # C là độ phức tạp (Bloom), T là thời gian
            # Trọng số W_u = (C * T / beta_u) * (1 + p_u)
            w_u = (comp * t_expected / beta_u) * (1.0 + p_u)
            
            # Rule: Nếu bài quá dễ so với năng lực thì trọng số = vô cực
            if mastery >= 0.85:
                w_u = float('inf') # Đã biết rồi, né luôn
            elif comp <= 1.5 and beta_u >= 2.0 and mastery >= 0.5:
                w_u = float('inf') # Bài cơ bản, năng lực cao -> né
                
            node_weights[key] = w_u

        # 6. Run Dijkstra from Start to End
        start_node = (lessons[0][0], lessons[0][1])
        end_node = (lessons[-1][0], lessons[-1][1])
        
        # Priority Queue: (cost, node, path)
        pq = [(node_weights[start_node] if node_weights[start_node] != float('inf') else 0, start_node, [start_node])]
        visited = set()
        best_path = []
        
        while pq:
            cost, u, path = heapq.heappop(pq)
            
            if u == end_node:
                best_path = path
                break
                
            if u in visited:
                continue
            visited.add(u)
            
            for v in graph.get(u, []):
                if v not in visited:
                    w_v = node_weights[v]
                    # Bỏ qua nếu cạnh dẫn tới Node Vô cực
                    if w_v != float('inf'):
                        heapq.heappush(pq, (cost + w_v, v, path + [v]))
        
        # Nếu không tìm được đường (do chặn hết), fallback về toàn bộ chưa học
        if not best_path:
            best_path = [k for k in node_weights.keys() if node_weights[k] != float('inf')]
            if not best_path:
                best_path = [start_node, end_node]

        # 7. Format Proposed Path and Reasons
        proposed_path = [{"topic_id": k[0], "order_index": k[1]} for k in best_path]
        reasoning_notes = []
        
        best_path_set = set(best_path)
        for l in lessons:
            key = (l[0], l[1])
            if key not in best_path_set:
                mastery = mastery_dict.get(key, 0.0)
                if mastery >= 0.85:
                    reasoning_notes.append({
                        "topic_id": key[0], "order_index": key[1], "title": l[2],
                        "action": "skip",
                        "reason": f"Bạn đã nắm vững kiến thức này (Thành thạo {int(mastery*100)}%). Đề xuất bỏ qua."
                    })
                elif l[3] <= 1.5 and beta_u >= 2.0:
                    reasoning_notes.append({
                        "topic_id": key[0], "order_index": key[1], "title": l[2],
                        "action": "skip",
                        "reason": f"Bài học khá cơ bản so với năng lực ({beta_u:.1f}) của bạn. Đề xuất nhảy cóc."
                    })
            else:
                # Nếu nó được thêm lại so với current path
                if not any(item['topic_id'] == key[0] and item['order_index'] == key[1] for item in current_path):
                    reasoning_notes.append({
                        "topic_id": key[0], "order_index": key[1], "title": l[2],
                        "action": "add",
                        "reason": f"Thuật toán nhận thấy bạn cần đi qua bài này để làm nền tảng cho các bài khó hơn."
                    })

        # 8. Compare paths and update DB
        current_path_keys = [(item['topic_id'], item['order_index']) for item in current_path]
        is_new_proposal = False
        if current_path_keys != best_path:
            is_new_proposal = True
            c.execute("""
                UPDATE user_learning_paths 
                SET proposed_path = %s, reasoning_notes = %s, is_pending_decision = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (json.dumps(proposed_path), json.dumps(reasoning_notes), user_id))
            conn.commit()

        return is_new_proposal, proposed_path, reasoning_notes

    except Exception as e:
        print("Routing Error:", e)
        return False, [], []
    finally:
        if 'conn' in locals():
            release_db_connection(conn)
