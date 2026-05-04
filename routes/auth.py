"""
Authentication routes for admin login and examiner management
"""

from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase_client
from functools import wraps
import os
import requests

auth_bp = Blueprint('auth', __name__)

def require_admin(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"status": "error", "message": "Authorization required"}), 401
        
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
        supabase = get_supabase_client()
        
        try:
            user_response = supabase.auth.get_user(token)
            profile_response = supabase.table('profiles').select('*').eq('id', user_response.user.id).execute()
            
            if not profile_response.data or len(profile_response.data) == 0:
                return jsonify({"status": "error", "message": "Profile not found"}), 404
            
            profile = profile_response.data[0]
            if profile.get('role') != 'admin':
                return jsonify({"status": "error", "message": "Admin access required"}), 403
            
            request.user = profile
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"status": "error", "message": f"Authentication failed: {str(e)}"}), 401
    
    return decorated_function

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Admin login endpoint
    
    Request Body:
        - email: Admin email
        - password: Admin password
        
    Returns:
        - JWT token and user data on success
        - Error message on failure
    """
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                "status": "error",
                "message": "Email and password are required"
            }), 400
        
        # Authenticate with Supabase Auth
        supabase = get_supabase_client()
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        # Get user profile from profiles table
        user_id = auth_response.user.id
        profile_response = supabase.table('profiles').select('*').eq('id', user_id).execute()
        
        if not profile_response.data or len(profile_response.data) == 0:
            # Profile doesn't exist - user needs to be set up properly
            return jsonify({
                "status": "error",
                "message": "User profile not found. Please contact administrator to set up your account."
            }), 404
        else:
            profile = profile_response.data[0]
        
        # Check if user has admin or examiner role
        if profile.get('role') not in ['admin', 'examiner']:
            return jsonify({
                "status": "error",
                "message": "Unauthorized access. Admin or Examiner role required."
            }), 403
        
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "data": {
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email,
                    "name": profile.get('name'),
                    "role": profile.get('role'),
                    "hall_no": profile.get('hall_no')
                },
                "session": {
                    "access_token": auth_response.session.access_token,
                    "refresh_token": auth_response.session.refresh_token,
                    "expires_at": auth_response.session.expires_at
                }
            }
        }), 200
        
    except Exception as e:
        error_message = str(e)
        if "Invalid login credentials" in error_message:
            return jsonify({
                "status": "error",
                "message": "Invalid email or password"
            }), 401
        
        return jsonify({
            "status": "error",
            "message": f"Login failed: {error_message}"
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint
    
    Headers:
        - Authorization: Bearer <token>
        
    Returns:
        - Success message
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                "status": "error",
                "message": "Authorization header required"
            }), 401
        
        # Extract token
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
        
        # Sign out from Supabase
        supabase = get_supabase_client()
        supabase.auth.sign_out()
        
        return jsonify({
            "status": "success",
            "message": "Logout successful"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Logout failed: {str(e)}"
        }), 500

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """
    Get current user info
    
    Headers:
        - Authorization: Bearer <token>
        
    Returns:
        - User data
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                "status": "error",
                "message": "Authorization header required"
            }), 401
        
        # Extract token
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
        
        # Get user from Supabase
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        
        # Get user profile
        profile_response = supabase.table('profiles').select('*').eq('id', user_response.user.id).execute()
        
        profile = profile_response.data[0] if profile_response.data and len(profile_response.data) > 0 else {}
        
        return jsonify({
            "status": "success",
            "data": {
                "id": user_response.user.id,
                "email": user_response.user.email,
                "name": profile.get('name'),
                "role": profile.get('role'),
                "hall_no": profile.get('hall_no')
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to get user: {str(e)}"
        }), 401

@auth_bp.route('/examiners', methods=['GET'])
@require_admin
def get_examiners():
    """
    Get all examiners (Admin only)
    
    Returns:
        - List of examiners
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('profiles').select('*').eq('role', 'examiner').execute()
        
        return jsonify({
            "status": "success",
            "count": len(result.data),
            "data": result.data
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch examiners: {str(e)}"
        }), 500

@auth_bp.route('/examiners', methods=['POST'])
@require_admin
def create_examiner():
    """
    Create a new examiner (Admin only)
    
    Request Body:
        - name: Examiner name
        - email: Examiner email
        - password: Examiner password
        
    Returns:
        - Created examiner data
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'hall_no']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required"
                }), 400
        
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        hall_no = data.get('hall_no')
        
        supabase = get_supabase_client()
        
        # Create user in Supabase Auth using admin API
        supabase_url = os.getenv('SUPABASE_URL')
        service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        # Use Supabase Auth Admin API to create user
        auth_admin_url = f"{supabase_url}/auth/v1/admin/users"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json"
        }
        
        user_data = {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "name": name,
                "role": "examiner"
            }
        }
        
        response = requests.post(auth_admin_url, headers=headers, json=user_data)
        
        if response.status_code != 200:
            error_data = response.json()
            if "User already registered" in str(error_data):
                return jsonify({
                    "status": "error",
                    "message": "Email already registered"
                }), 409
            return jsonify({
                "status": "error",
                "message": f"Failed to create user: {error_data.get('message', 'Unknown error')}"
            }), 500
        
        auth_response = response.json()
        user_id = auth_response.get('id')
        
        # Create profile in profiles table
        profile_data = {
            'id': user_id,
            'name': name,
            'email': email,
            'role': 'examiner',
            'hall_no': hall_no
        }
        
        supabase.table('profiles').insert(profile_data).execute()
        
        return jsonify({
            "status": "success",
            "message": "Examiner created successfully",
            "data": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": "examiner"
            }
        }), 201
        
    except Exception as e:
        error_message = str(e)
        if "User already registered" in error_message:
            return jsonify({
                "status": "error",
                "message": "Email already registered"
            }), 409
        
        return jsonify({
            "status": "error",
            "message": f"Failed to create examiner: {error_message}"
        }), 500

@auth_bp.route('/examiners/<examiner_id>', methods=['DELETE'])
@require_admin
def delete_examiner(examiner_id):
    """
    Delete an examiner (Admin only)
    
    Args:
        examiner_id: Examiner UUID
        
    Returns:
        - Success message
    """
    try:
        supabase = get_supabase_client()
        
        # Delete user from Supabase Auth using admin API
        supabase_url = os.getenv('SUPABASE_URL')
        service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        auth_admin_url = f"{supabase_url}/auth/v1/admin/users/{examiner_id}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key
        }
        
        response = requests.delete(auth_admin_url, headers=headers)
        
        # Delete profile from profiles table (even if auth delete fails)
        try:
            supabase.table('profiles').delete().eq('id', examiner_id).execute()
        except:
            pass
        
        return jsonify({
            "status": "success",
            "message": "Examiner deleted successfully"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to delete examiner: {str(e)}"
        }), 500
