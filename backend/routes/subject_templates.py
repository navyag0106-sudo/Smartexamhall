"""
Subject Templates routes for managing department-year subject mappings
"""

from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase_client
from datetime import datetime

subject_templates_bp = Blueprint('subject_templates', __name__)

@subject_templates_bp.route('/subject-templates', methods=['GET'])
def get_subject_templates():
    """
    Get all subject templates or filter by department/year
    
    Query Parameters:
        - department: Filter by department (optional)
        - year: Filter by year (optional)
        
    Returns:
        - List of subject templates
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table('subject_templates').select('*')
        
        # Apply filters
        department = request.args.get('department')
        year = request.args.get('year')
        
        if department:
            query = query.eq('department', department)
        
        if year:
            query = query.eq('year', year)
        
        # Order by department and year
        query = query.order('department').order('year')
        
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
            "message": f"Failed to fetch subject templates: {str(e)}"
        }), 500

@subject_templates_bp.route('/subject-templates/<template_id>', methods=['GET'])
def get_subject_template(template_id):
    """
    Get a single subject template by ID
    
    Args:
        template_id: Template UUID
        
    Returns:
        - Subject template data
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('subject_templates').select('*').eq('id', template_id).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Subject template not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch subject template: {str(e)}"
        }), 500

@subject_templates_bp.route('/subject-templates/by-dept-year', methods=['GET'])
def get_template_by_dept_year():
    """
    Get subject template by department and year
    
    Query Parameters:
        - department: Department name (required)
        - year: Year of study (required)
        
    Returns:
        - Subject template data
    """
    try:
        department = request.args.get('department')
        year = request.args.get('year')
        
        if not department or not year:
            return jsonify({
                "status": "error",
                "message": "Department and year are required"
            }), 400
        
        supabase = get_supabase_client()
        
        result = supabase.table('subject_templates')\
            .select('*')\
            .eq('department', department)\
            .eq('year', year)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "No subject template found for this department and year"
            }), 404
        
        return jsonify({
            "status": "success",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch subject template: {str(e)}"
        }), 500

@subject_templates_bp.route('/subject-templates', methods=['POST'])
def create_subject_template():
    """
    Create a new subject template
    
    Request Body:
        - department: Department name (required)
        - year: Year of study (required)
        - subjects: Array of subject names (required)
        
    Returns:
        - Created subject template
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('department') or not data.get('year'):
            return jsonify({
                "status": "error",
                "message": "Department and year are required"
            }), 400
        
        if not data.get('subjects') or not isinstance(data.get('subjects'), list):
            return jsonify({
                "status": "error",
                "message": "Subjects must be a non-empty array"
            }), 400
        
        supabase = get_supabase_client()
        
        # Check if template already exists
        existing = supabase.table('subject_templates')\
            .select('id')\
            .eq('department', data['department'])\
            .eq('year', data['year'])\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            return jsonify({
                "status": "error",
                "message": "Subject template already exists for this department and year. Use PUT to update."
            }), 409
        
        # Create template
        # Convert simple array to objects with exam_date if needed
        subjects_data = []
        for subject in data['subjects']:
            if isinstance(subject, str):
                subjects_data.append({
                    'name': subject,
                    'exam_date': ''
                })
            else:
                subjects_data.append(subject)
        
        template_data = {
            'department': data['department'],
            'year': data['year'],
            'subjects': subjects_data,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('subject_templates').insert(template_data).execute()
        
        return jsonify({
            "status": "success",
            "message": "Subject template created successfully",
            "data": result.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to create subject template: {str(e)}"
        }), 500

@subject_templates_bp.route('/subject-templates/<template_id>', methods=['PUT'])
def update_subject_template(template_id):
    """
    Update a subject template
    
    Args:
        template_id: Template UUID
        
    Request Body:
        - subjects: Array of subject names (required)
        
    Returns:
        - Updated subject template
    """
    try:
        data = request.get_json()
        
        if not data.get('subjects') or not isinstance(data.get('subjects'), list):
            return jsonify({
                "status": "error",
                "message": "Subjects must be a non-empty array"
            }), 400
        
        supabase = get_supabase_client()
        
        # Check if template exists
        existing = supabase.table('subject_templates').select('id').eq('id', template_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Subject template not found"
            }), 404
        
        # Update template
        update_data = {
            'subjects': data['subjects'],
            'updated_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('subject_templates').update(update_data).eq('id', template_id).execute()
        
        return jsonify({
            "status": "success",
            "message": "Subject template updated successfully",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to update subject template: {str(e)}"
        }), 500

@subject_templates_bp.route('/subject-templates/<template_id>', methods=['DELETE'])
def delete_subject_template(template_id):
    """
    Delete a subject template
    
    Args:
        template_id: Template UUID
        
    Returns:
        - Success message
    """
    try:
        supabase = get_supabase_client()
        
        # Check if template exists
        existing = supabase.table('subject_templates').select('id').eq('id', template_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Subject template not found"
            }), 404
        
        # Delete template
        supabase.table('subject_templates').delete().eq('id', template_id).execute()
        
        return jsonify({
            "status": "success",
            "message": "Subject template deleted successfully"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to delete subject template: {str(e)}"
        }), 500
