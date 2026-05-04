"""
Student management routes
"""

from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase_client
import base64
import uuid
from datetime import datetime

students_bp = Blueprint('students', __name__)

def upload_image_to_storage(image_base64: str, filename: str) -> str:
    """
    Upload image to Supabase Storage
    
    Args:
        image_base64: Base64 encoded image
        filename: Filename for the image
        
    Returns:
        Public URL of the uploaded image
    """
    supabase = get_supabase_client()
    
    # Remove data URL prefix if present
    if ',' in image_base64:
        image_base64 = image_base64.split(',')[1]
    
    # Decode base64 to bytes
    image_bytes = base64.b64decode(image_base64)
    
    # Upload to Supabase Storage
    bucket_name = 'student-images'
    file_path = f"{filename}"
    
    # Upload file
    supabase.storage.from_(bucket_name).upload(
        file_path,
        image_bytes,
        file_options={"content-type": "image/jpeg"}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    
    return public_url

@students_bp.route('/register-student', methods=['POST'])
def register_student():
    """
    Register a new student
    
    Request Body:
        - name: Student name
        - register_no: Registration number
        - department: Department name
        - year: Year of study
        - image: Base64 encoded face image
        
    Returns:
        - Created student data
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'register_no', 'department', 'year', 'hall_no', 'seat_no', 'image']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required"
                }), 400
        
        name = data.get('name')
        register_no = data.get('register_no')
        department = data.get('department')
        year = data.get('year')
        hall_no = data.get('hall_no')
        seat_no = data.get('seat_no')
        image_base64 = data.get('image')
        
        supabase = get_supabase_client()
        
        # Check if register number already exists
        existing = supabase.table('students').select('id').eq('register_no', register_no).execute()
        if existing.data:
            return jsonify({
                "status": "error",
                "message": "Registration number already exists"
            }), 409
        
        # Auto-find subject template based on department and year
        template_result = supabase.table('subject_templates')\
            .select('id')\
            .eq('department', department)\
            .eq('year', year)\
            .execute()
        
        subject_template_id = None
        if template_result.data and len(template_result.data) > 0:
            subject_template_id = template_result.data[0]['id']
        
        # Generate unique filename
        filename = f"{register_no}_{uuid.uuid4().hex[:8]}.jpg"
        
        # Upload image to storage
        photo_url = upload_image_to_storage(image_base64, filename)
        
        # Insert student record
        student_data = {
            'name': name,
            'register_no': register_no,
            'department': department,
            'year': year,
            'subject_template_id': subject_template_id,
            'hall_no': hall_no,
            'seat_no': seat_no,
            'photo_url': photo_url,
            'verified_status': False,
            'entry_time': None,
            'created_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('students').insert(student_data).execute()
        
        return jsonify({
            "status": "success",
            "message": "Student registered successfully",
            "data": result.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to register student: {str(e)}"
        }), 500

@students_bp.route('/students', methods=['GET'])
def get_students():
    """
    Get all students
    
    Query Parameters:
        - search: Search by name or register number (optional)
        - department: Filter by department (optional)
        - year: Filter by year (optional)
        - verified: Filter by verification status (optional)
        
    Returns:
        - List of students
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table('students').select('*')
        
        # Apply filters
        search = request.args.get('search')
        department = request.args.get('department')
        year = request.args.get('year')
        verified = request.args.get('verified')
        
        if search:
            # Search by name or register number
            query = query.or_(f"name.ilike.%{search}%,register_no.ilike.%{search}%")
        
        if department:
            query = query.eq('department', department)
        
        if year:
            query = query.eq('year', year)
        
        if verified is not None:
            is_verified = verified.lower() == 'true'
            query = query.eq('verified_status', is_verified)
        
        # Order by created_at descending
        query = query.order('created_at', desc=True)
        
        # Execute query
        result = query.execute()
        
        return jsonify({
            "status": "success",
            "count": len(result.data),
            "data": result.data
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch students: {str(e)}"
        }), 500

@students_bp.route('/student/<student_id>', methods=['GET'])
def get_student(student_id):
    """
    Get a single student by ID
    
    Args:
        student_id: Student UUID
        
    Returns:
        - Student data
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('students').select('*').eq('id', student_id).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Student not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch student: {str(e)}"
        }), 500

@students_bp.route('/student/<student_id>', methods=['PUT'])
def update_student(student_id):
    """
    Update student details
    
    Args:
        student_id: Student UUID
        
    Request Body:
        - name: Student name (optional)
        - department: Department name (optional)
        - year: Year of study (optional)
        - verified_status: Verification status (optional)
        
    Returns:
        - Updated student data
    """
    try:
        data = request.get_json()
        supabase = get_supabase_client()
        
        # Check if student exists
        existing = supabase.table('students').select('id').eq('id', student_id).execute()
        if not existing.data:
            return jsonify({
                "status": "error",
                "message": "Student not found"
            }), 404
        
        # Build update data
        update_data = {}
        allowed_fields = ['name', 'department', 'year', 'subject_template_id', 'hall_no', 'seat_no', 'verified_status']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({
                "status": "error",
                "message": "No valid fields to update"
            }), 400
        
        # Update student
        result = supabase.table('students').update(update_data).eq('id', student_id).execute()
        
        return jsonify({
            "status": "success",
            "message": "Student updated successfully",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to update student: {str(e)}"
        }), 500

@students_bp.route('/student/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    """
    Delete a student
    
    Args:
        student_id: Student UUID
        
    Returns:
        - Success message
    """
    try:
        supabase = get_supabase_client()
        
        # Check if student exists
        existing = supabase.table('students').select('*').eq('id', student_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Student not found"
            }), 404
        
        student = existing.data[0]
        
        # Delete image from storage if exists
        if student.get('photo_url'):
            try:
                # Extract filename from URL
                photo_url = student['photo_url']
                filename = photo_url.split('/')[-1].split('?')[0]
                supabase.storage.from_('student-images').remove([filename])
            except:
                pass  # Ignore storage deletion errors
        
        # Delete student record
        supabase.table('students').delete().eq('id', student_id).execute()
        
        return jsonify({
            "status": "success",
            "message": "Student deleted successfully"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to delete student: {str(e)}"
        }), 500

@students_bp.route('/student/by-register/<register_no>', methods=['GET'])
def get_student_by_register(register_no):
    """
    Get student by registration number
    
    Args:
        register_no: Student registration number
        
    Returns:
        - Student data
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('students').select('*').eq('register_no', register_no).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Student not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch student: {str(e)}"
        }), 500
