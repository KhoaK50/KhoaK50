from flask import Blueprint, request, jsonify
from vectoria_api.database import get_db_connection, release_db_connection
import json
import uuid
import jwt
from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY

learning_path_bp = Blueprint('learning_path', __name__)

def _extract_user_id():
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return payload.get("user_id")
        except Exception as e:
            print(f">> [JWT Error] {e}")
            pass
    if request.is_json and request.json and request.json.get('user_id'):
        return request.json.get('user_id')
    return request.args.get('user_id')

@learning_path_bp.route('/api/path/tasks', methods=['GET'])
def get_user_tasks():
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"error": "Missing user_id or Authorization token"}), 400
    path_id = request.args.get('path_id')
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT node_id, task_type, progress_data, last_accessed
                FROM user_tasks
                WHERE user_id = %s
                ORDER BY last_accessed ASC
            """, (user_id,))
            tasks = []
            for row in cur.fetchall():
                p_data = row[2]
                if isinstance(p_data, str):
                    try:
                        p_data = json.loads(p_data)
                    except Exception:
                        pass
                if path_id and isinstance(p_data, dict) and p_data.get('path_id') and p_data.get('path_id') != path_id:
                    continue
                tasks.append({
                    "node_id": row[0],
                    "task_type": row[1],
                    "progress_data": p_data,
                    "last_accessed": row[3].isoformat() if row[3] else None
                })
            return jsonify({"tasks": tasks}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)

@learning_path_bp.route('/api/path/current', methods=['GET'])
def get_current_task():
    user_id = _extract_user_id()
    node_id = request.args.get('node_id')
    task_type = request.args.get('task_type')
    
    if not user_id or not node_id or not task_type:
        return jsonify({"error": "Missing user_id, node_id, or task_type"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT progress_data, last_accessed 
                FROM user_tasks 
                WHERE user_id = %s AND node_id = %s AND task_type = %s
            """, (user_id, node_id, task_type))
            
            row = cur.fetchone()
            if row:
                return jsonify({
                    "progress_data": row[0],
                    "last_accessed": row[1].isoformat() if row[1] else None
                }), 200
            else:
                return jsonify({"progress_data": None, "message": "No active task found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)


@learning_path_bp.route('/api/path/save', methods=['POST'])
def save_task_progress():
    data = request.json or {}
    user_id = _extract_user_id()
    node_id = data.get('node_id')
    task_type = data.get('task_type')
    progress_data = data.get('progress_data') or {}

    if not all([user_id, node_id, task_type]):
        return jsonify({"error": "Missing required fields (user_id/token, node_id, task_type)"}), 400

    # Chuẩn hóa node_id (e.g. '1' -> 'l1')
    node_id = str(node_id).strip()
    if node_id.startswith("lesson_"):
        node_id = "l" + node_id[7:]
    elif node_id.isdigit():
        node_id = "l" + node_id

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_tasks (user_id, node_id, task_type, progress_data, last_accessed)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, node_id, task_type) 
                DO UPDATE SET 
                    progress_data = EXCLUDED.progress_data,
                    last_accessed = CURRENT_TIMESTAMP;
            """, (user_id, node_id, task_type, json.dumps(progress_data)))
            
        conn.commit()
        return jsonify({"message": "Progress saved successfully", "node_id": node_id, "task_type": task_type}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)


@learning_path_bp.route('/api/path/evaluate', methods=['POST'])
def evaluate_checkpoint():
    """
    Called when a user submits a checkpoint task.
    Evaluates score and creates knowledge debts if they fail.
    """
    data = request.json
    user_id = data.get('user_id')
    node_id = data.get('node_id')
    score = data.get('score') # e.g. 0 to 100
    
    if user_id is None or node_id is None or score is None:
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Update user_node_progress
            status = 'completed' if score >= 80 else 'unlocked'
            
            cur.execute("""
                INSERT INTO user_node_progress (user_id, node_id, status, highest_score, updated_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, node_id) 
                DO UPDATE SET 
                    status = CASE 
                        WHEN EXCLUDED.highest_score >= 80 THEN 'completed' 
                        ELSE user_node_progress.status 
                    END,
                    highest_score = GREATEST(user_node_progress.highest_score, EXCLUDED.highest_score),
                    updated_at = CURRENT_TIMESTAMP;
            """, (user_id, node_id, status, score))
            
            # 2. If failed, record knowledge debt from real Neo4j graph
            if score < 80:
                from vectoria_api.core.diagnostic_engine import get_neo4j_prerequisites
                prereqs = get_neo4j_prerequisites(node_id)
                prerequisite_node = prereqs[0]["id"] if prereqs else f"{node_id}_prereq"
                
                cur.execute("""
                    INSERT INTO knowledge_debts (user_id, debt_node_id, source_node_id, suspected_count, is_cleared, created_at)
                    VALUES (%s, %s, %s, 1, FALSE, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, debt_node_id) 
                    DO UPDATE SET 
                        suspected_count = knowledge_debts.suspected_count + 1,
                        is_cleared = FALSE,
                        created_at = CURRENT_TIMESTAMP;
                """, (user_id, prerequisite_node, node_id))
                
                conn.commit()
                return jsonify({
                    "passed": False, 
                    "message": "Điểm chưa đạt chuẩn mốc tri thức. Hệ thống đã kích hoạt hàng đợi nợ tri thức.",
                    "knowledge_debt_created": prerequisite_node,
                    "prerequisites_found": prereqs
                }), 200
            
            conn.commit()
            return jsonify({"passed": True, "message": "Checkpoint completed successfully!"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)


@learning_path_bp.route('/api/path/create', methods=['POST'])
def create_learning_path():
    data = request.get_json(silent=True) or {}
    user_id = _extract_user_id()
    start_node = data.get('start_node_id')
    target_node = data.get('target_node_id')
    path_nodes = data.get('path_nodes')

    if not all([user_id, start_node, target_node, path_nodes]):
        return jsonify({"error": "Missing required fields (user_id, start_node_id, target_node_id, path_nodes)"}), 400

    path_id = f"path_{uuid.uuid4().hex[:8]}"
    status = data.get('status', 'pending')
    if status not in ['active', 'pending', 'completed']:
        status = 'pending'

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if status == 'active':
                cur.execute("""
                    UPDATE user_learning_paths 
                    SET status = 'pending' 
                    WHERE user_id = %s AND status = 'active'
                """, (user_id,))

            cur.execute("""
                INSERT INTO user_learning_paths 
                (user_id, path_id, start_node_id, target_node_id, path_nodes, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (user_id, path_id, start_node, target_node, json.dumps(path_nodes), status))
            
        conn.commit()
        return jsonify({"message": "Learning path created successfully", "path_id": path_id, "status": status}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)

@learning_path_bp.route('/api/path/list', methods=['GET'])
def list_learning_paths():
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"error": "Missing user_id or Authorization token"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT path_id, start_node_id, target_node_id, path_nodes, status, created_at
                FROM user_learning_paths
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            
            paths = []
            for row in cur.fetchall():
                paths.append({
                    "path_id": row[0],
                    "start_node_id": row[1],
                    "target_node_id": row[2],
                    "path_nodes": row[3],
                    "status": row[4],
                    "created_at": row[5].isoformat()
                })
            return jsonify({"paths": paths}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)

@learning_path_bp.route('/api/path/delete/<path_id>', methods=['DELETE'])
def delete_learning_path(path_id):
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"error": "Missing user_id or Authorization token"}), 400

    try:
        user_id_int = int(user_id) if str(user_id).isdigit() else user_id
    except (ValueError, TypeError):
        user_id_int = user_id

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM user_learning_paths
                WHERE user_id = %s AND path_id = %s
            """, (user_id_int, path_id))
            deleted_paths = cur.rowcount

            # Clean up any related user tasks associated with this path
            try:
                cur.execute("""
                    DELETE FROM user_tasks
                    WHERE user_id = %s AND progress_data->>'path_id' = %s
                """, (user_id_int, path_id))
            except Exception:
                pass
            
        conn.commit()
        return jsonify({
            "success": True, 
            "message": "Learning path deleted successfully",
            "deleted_count": deleted_paths
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        release_db_connection(conn)

@learning_path_bp.route('/api/path/status', methods=['POST'])
def update_path_status():
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"error": "Missing user_id or Authorization token"}), 400

    data = request.get_json(silent=True) or {}
    path_id = data.get('path_id')
    new_status = data.get('status')

    if not path_id or not new_status:
        return jsonify({"error": "Missing path_id or status"}), 400

    if new_status not in ['active', 'pending', 'completed']:
        return jsonify({"error": "Invalid status value. Must be 'active', 'pending', or 'completed'"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if new_status == 'active':
                cur.execute("""
                    UPDATE user_learning_paths
                    SET status = 'pending'
                    WHERE user_id = %s AND status = 'active' AND path_id != %s
                """, (user_id, path_id))

            cur.execute("""
                UPDATE user_learning_paths
                SET status = %s
                WHERE user_id = %s AND path_id = %s
            """, (new_status, user_id, path_id))

        conn.commit()
        return jsonify({"message": f"Path status updated to {new_status}", "path_id": path_id, "status": new_status}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        release_db_connection(conn)
