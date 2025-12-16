from flask import Flask

from vectoria_api.middleware.cors import attach_cors_middleware
from vectoria_api.routes import register_blueprints
from vectoria_api.config import HOST, PORT, DEBUG

# QUAN TRỌNG: nạp strategies để registry có "basis.gauss_rows"
from vectoria_api.explainers import init_explainers


def create_app():
    app = Flask(__name__)

    # 1) CORS
    attach_cors_middleware(app)

    # 2) Nạp explainer strategies (để register(...) chạy)
    init_explainers()

    # 3) Register routes/blueprints
    register_blueprints(app)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host=HOST, port=PORT, debug=DEBUG)
