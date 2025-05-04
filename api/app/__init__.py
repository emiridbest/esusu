from flask import Flask, jsonify, request
from flask_cors import CORS
import datetime

def create_app():
    app = Flask(__name__)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Import and register blueprints
    from app.routes.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # API-specific 404 handler - return JSON instead of HTML
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify({
            "error": "Not Found",
            "message": "The requested endpoint does not exist"
        }), 404
    
    # Generic error handler for all exceptions
    @app.errorhandler(Exception)
    def handle_exception(e):
        # Log the error here (you might want to add logging)
        return jsonify({
            "error": "Internal Server Error",
            "message": str(e)
        }), 500
    
    @app.route('/')
    def index():
        return jsonify({
            "name": "Esusu API",
            "version": "1.0.0",
            "endpoints": [
                "/api/ping",
                "/api/exchange-rate",
                "/api/stock-data",
            ]
        })
    
    @app.route('/api/ping')
    def ping():
        return jsonify({
            "status": "ok",
            "timestamp": datetime.datetime.now().isoformat(),
            "version": "1.0.0"
        })
    
    return app