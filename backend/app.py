"""
Smart Exam Hall Verification System - Flask Backend
Main application entry point
"""

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000", "https://smart-exam.netlify.app"  ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "apikey"]
    }
})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure uploads directory exists
os.makedirs('uploads', exist_ok=True)

# Import and register routes
from routes.auth import auth_bp
from routes.students import students_bp
from routes.verification import verification_bp
from routes.logs import logs_bp
from routes.subject_templates import subject_templates_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(students_bp, url_prefix='/api')
app.register_blueprint(verification_bp, url_prefix='/api')
app.register_blueprint(logs_bp, url_prefix='/api')
app.register_blueprint(subject_templates_bp, url_prefix='/api')

@app.route('/')
def index():
    """Root endpoint - API status check"""
    return {
        "status": "success",
        "message": "Smart Exam Hall Verification System API",
        "version": "1.0.0"
    }

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Smart Exam Hall Verification API"
    }

if __name__ == '__main__':
    print("🚀 Starting Smart Exam Hall Verification System Backend...")
    print("📡 API available at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
