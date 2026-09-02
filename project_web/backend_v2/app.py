import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from vectoria_api.routes import register_blueprints
from vectoria_api.config import HOST, PORT, DEBUG, JWT_SECRET_KEY, ADMIN_SECRET_KEY
import sys

if not DEBUG and (not JWT_SECRET_KEY or not ADMIN_SECRET_KEY):
    print('CRITICAL: Missing JWT_SECRET_KEY or ADMIN_SECRET_KEY in production. Exiting.')
    sys.exit(1)

from vectoria_api.explainers import init_explainers
from vectoria_api.routes.contact import contact_bp
from vectoria_api.routes.user import user_bp
from test_neo4j import driver

# T?o instance global cho SocketIO
socketio = SocketIO()

rooms_state = {}


def create_app():
    print(">> FORCE UPDATE VERCEL V1")
    app = Flask(__name__)

    # Cấu hình CORS
    from vectoria_api.config import ALLOWED_ORIGINS
    CORS(app, origins=list(ALLOWED_ORIGINS))

    from vectoria_api.middleware.rate_limit import limiter
    limiter.init_app(app)


    # Nạp explainers
    init_explainers()

    # Đăng ký các routes cũ của sếp
    register_blueprints(app)

    # Đăng ký Route Liên hệ
    app.register_blueprint(contact_bp)

    # [BƯỚC 2 QUAN TRỌNG NHẤT] GẮN API USER VÀO APP
    # Phải có dòng này thì Flask mới nhận diện được đường dẫn /api/get_history
    app.register_blueprint(user_bp)

    # Register Course Blueprint
    from vectoria_api.routes.course import course_bp
    app.register_blueprint(course_bp)

    # Register Admin Blueprint
    from vectoria_api.routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    # Register Comment Blueprint
    from vectoria_api.routes.comment import comment_bp
    app.register_blueprint(comment_bp)

    # Register Admin Moderation Blueprint
    from vectoria_api.routes.admin_moderation import admin_moderation_bp
    app.register_blueprint(admin_moderation_bp)
    
    # Register Notification Blueprint
    from vectoria_api.routes.notification import notification_bp
    app.register_blueprint(notification_bp)

    socketio.init_app(app, cors_allowed_origins=list(ALLOWED_ORIGINS))
    return app


# Tạo instance global
app = create_app()


@app.errorhandler(Exception)
def handle_global_error(error):
    from werkzeug.exceptions import HTTPException
    import traceback
    import uuid
    if isinstance(error, HTTPException):
        return jsonify({"error": error.description}), error.code
    
    req_id = str(uuid.uuid4())
    print(f"[ERROR {req_id}] {str(error)}")
    traceback.print_exc()
    return jsonify({
        "error": "Lỗi hệ thống nội bộ, vui lòng thử lại sau.",
        "request_id": req_id
    }), 500



@socketio.on("join")
def on_join(data):
    token = data.get("token")
    if not token:
        emit("error", {"msg": "Authentication required. Vui lòng đăng nhập."})
        return
    
    try:
        from vectoria_api.config import JWT_SECRET_KEY
        import jwt
        decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = decoded.get("user_id")
    except Exception as e:
        emit("error", {"msg": "Invalid or expired token."})
        return

    room = data.get("room")
    if not room:
        return
        
    name = data.get("name", "Ẩn danh")
    sid = request.sid  # Lấy ID duy nhất của kết nối này

    join_room(room)

    # Nếu phòng chưa tồn tại, người đầu tiên vào sẽ làm Owner (Chủ phòng)
    if room not in rooms_state:
        rooms_state[room] = {"owner": sid, "members": {}}

    # Thêm người này vào danh sách thành viên
    rooms_state[room]["members"][sid] = {"name": name, "muted": False, "blocked": False}

    print(f">> {name} ({sid}) đã chui vào phòng: {room}")
    emit("status", {"msg": f"{name} đã tham gia phòng."}, room=room)

    # [QUAN TRỌNG]: Phát bản đồ quyền lực cho toàn bộ phòng
    emit("permission_update", rooms_state[room], room=room)


@socketio.on("mouse_move")
def handle_mouse_move(data):
    # Lấy mã phòng từ gói tin gửi lên
    room = data.get("room")
    # CHỈ phát lại tọa độ chuột cho những người CÙNG PHÒNG
    emit("mouse_update", data, room=room, include_self=False)


@socketio.on("sync_action")
def handle_sync_action(data):
    room = data.get("room")
    emit("action_update", data, room=room, include_self=False)


# [THÊM MỚI]: Xử lý lệnh từ Chủ phòng (Khóa thao tác, Nhượng quyền)
@socketio.on("admin_control")
def handle_admin(data):
    room = data.get("room")
    if room not in rooms_state:
        return

    # CHỈ XỬ LÝ NẾU NGƯỜI GỬI LỆNH ĐÚNG LÀ CHỦ PHÒNG
    if request.sid == rooms_state[room]["owner"]:
        target_sid = data["target_sid"]
        action = data["action"]  # 'block', 'transfer'

        if action == "transfer":
            rooms_state[room]["owner"] = target_sid
        elif action == "block":
            # data['value'] sẽ là True (Cấm) hoặc False (Mở)
            rooms_state[room]["members"][target_sid]["blocked"] = data["value"]

        # Báo cáo lại cho cả phòng biết sự thay đổi
        emit("permission_update", rooms_state[room], room=room)


# [BỔ SUNG]: DỌN RÁC KHI USER F5 HOẶC TẮT TRÌNH DUYỆT
@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    
    # Quét qua tất cả các phòng xem thanh niên này đang trốn ở đâu
    for room, state in list(rooms_state.items()):
        if sid in state["members"]:
            name = state["members"][sid]["name"]
            
            # 1. Đuổi cổ bóng ma khỏi phòng
            del state["members"][sid]
            print(f">> {name} ({sid}) đã ngắt kết nối / rời phòng {room}")

            # 2. Xử lý hậu quả
            if len(state["members"]) == 0:
                # Nếu phòng trống trơn -> Đập bỏ phòng luôn cho nhẹ RAM
                del rooms_state[room]
                print(f">> Phòng {room} đã giải tán vì không còn ai.")
            else:
                # Nếu người rời đi là CHỦ PHÒNG -> Ép nhượng quyền cho người kế tiếp
                if state["owner"] == sid:
                    new_owner_sid = list(state["members"].keys())[0]
                    state["owner"] = new_owner_sid
                    print(f">> Chủ phòng rớt mạng. Tự động trao quyền cho {state['members'][new_owner_sid]['name']}")
                
                # 3. Báo cáo lại bản đồ quyền lực cho những người còn sống sót trong phòng
                emit("permission_update", rooms_state[room], room=room)
            
            # Đã tìm thấy và xử lý xong thì thoát vòng lặp
            break

@app.route('/api/graph-data', methods=['GET'])
def get_graph_data():
    query = """
    MATCH (n:Lesson)
    OPTIONAL MATCH (n)-[r:REQUIRES]->(m:Lesson)
    RETURN n.id AS id, n.name AS name, m.id AS target
    """
    nodes_dict = {}
    edges = []
    
    try:
        # Nhớ dùng session của Neo4j driver
        with driver.session() as session:
            result = session.run(query)
            for record in result:
                node_id = record["id"]
                if node_id not in nodes_dict:
                    nodes_dict[node_id] = {"id": node_id, "label": record["name"]}
                
                if record["target"]:
                    edges.append({"from": node_id, "to": record["target"]})
                    
        return jsonify({"nodes": list(nodes_dict.values()), "edges": edges}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/keep-awake', methods=['GET'])
def keep_awake():
    try:
        # Gọi 1 câu lệnh để đánh thức Neo4j
        with driver.session() as session:
            session.run("RETURN 1 AS ping")
        
        return jsonify({
            "status": "success", 
            "message": "Render và Neo4j đã được Uptime Robot đánh thức!"
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    print(f">> Server đang chạy tại: http://{HOST}:{PORT}")
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)
