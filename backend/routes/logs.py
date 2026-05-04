"""
Verification logs routes
"""

from flask import Blueprint, request, jsonify, Response
from utils.supabase_client import get_supabase_client
from datetime import datetime
import csv
import io

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/logs', methods=['GET'])
def get_logs():
    """
    Get verification logs
    
    Query Parameters:
        - search: Search by student name or register number (optional)
        - result: Filter by result (verified/failed) (optional)
        - date_from: Filter from date (YYYY-MM-DD) (optional)
        - date_to: Filter to date (YYYY-MM-DD) (optional)
        - limit: Number of records to return (default: 50)
        - offset: Offset for pagination (default: 0)
        
    Returns:
        - List of verification logs with student details
    """
    try:
        supabase = get_supabase_client()
        
        # Get query parameters
        search = request.args.get('search')
        result_filter = request.args.get('result')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Build query with join to students table
        query = supabase.table('logs').select(
            '*, students(name, register_no, department, year)'
        )
        
        # Apply filters
        if result_filter:
            query = query.eq('result', result_filter)
        
        if date_from:
            query = query.gte('created_at', date_from)
        
        if date_to:
            # Add one day to include the entire end date
            query = query.lte('created_at', date_to + 'T23:59:59')
        
        # Order by created_at descending
        query = query.order('created_at', desc=True)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        # Execute query
        result = query.execute()
        
        logs = result.data
        
        # Filter by search if provided
        if search:
            filtered_logs = []
            search_lower = search.lower()
            for log in logs:
                student = log.get('students', {})
                if (student.get('name', '').lower().find(search_lower) != -1 or
                    student.get('register_no', '').lower().find(search_lower) != -1):
                    filtered_logs.append(log)
            logs = filtered_logs
        
        # Get total count for pagination
        count_query = supabase.table('logs').select('id', count='exact')
        if result_filter:
            count_query = count_query.eq('result', result_filter)
        if date_from:
            count_query = count_query.gte('created_at', date_from)
        if date_to:
            count_query = count_query.lte('created_at', date_to + 'T23:59:59')
        
        count_result = count_query.execute()
        total_count = count_result.count
        
        return jsonify({
            "status": "success",
            "count": len(logs),
            "total": total_count,
            "data": logs
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch logs: {str(e)}"
        }), 500

@logs_bp.route('/logs/export', methods=['GET'])
def export_logs():
    """
    Export verification logs as CSV
    
    Query Parameters:
        - search: Search by student name or register number (optional)
        - result: Filter by result (verified/failed) (optional)
        - date_from: Filter from date (YYYY-MM-DD) (optional)
        - date_to: Filter to date (YYYY-MM-DD) (optional)
        
    Returns:
        - CSV file download
    """
    try:
        supabase = get_supabase_client()
        
        # Get query parameters
        search = request.args.get('search')
        result_filter = request.args.get('result')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query with join to students table
        query = supabase.table('logs').select(
            '*, students(name, register_no, department, year)'
        )
        
        # Apply filters
        if result_filter:
            query = query.eq('result', result_filter)
        
        if date_from:
            query = query.gte('created_at', date_from)
        
        if date_to:
            query = query.lte('created_at', date_to + 'T23:59:59')
        
        # Order by created_at descending
        query = query.order('created_at', desc=True)
        
        # Execute query
        result = query.execute()
        logs = result.data
        
        # Filter by search if provided
        if search:
            filtered_logs = []
            search_lower = search.lower()
            for log in logs:
                student = log.get('students', {})
                if (student.get('name', '').lower().find(search_lower) != -1 or
                    student.get('register_no', '').lower().find(search_lower) != -1):
                    filtered_logs.append(log)
            logs = filtered_logs
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Log ID',
            'Student Name',
            'Register Number',
            'Department',
            'Year',
            'Result',
            'Confidence (%)',
            'Verified By',
            'Timestamp'
        ])
        
        # Write data
        for log in logs:
            student = log.get('students', {})
            writer.writerow([
                log.get('id', ''),
                student.get('name', 'N/A'),
                student.get('register_no', 'N/A'),
                student.get('department', 'N/A'),
                student.get('year', 'N/A'),
                log.get('result', ''),
                log.get('confidence', ''),
                log.get('verified_by', ''),
                log.get('created_at', '')
            ])
        
        # Prepare response
        output.seek(0)
        filename = f"verification_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={filename}'
            }
        )
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to export logs: {str(e)}"
        }), 500

@logs_bp.route('/logs/<log_id>', methods=['GET'])
def get_log(log_id):
    """
    Get a single log entry by ID
    
    Args:
        log_id: Log UUID
        
    Returns:
        - Log data with student details
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('logs').select(
            '*, students(name, register_no, department, year, photo_url)'
        ).eq('id', log_id).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Log not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "data": result.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch log: {str(e)}"
        }), 500

@logs_bp.route('/logs/summary', methods=['GET'])
def get_logs_summary():
    """
    Get summary statistics for logs
    
    Query Parameters:
        - date_from: Filter from date (YYYY-MM-DD) (optional)
        - date_to: Filter to date (YYYY-MM-DD) (optional)
        
    Returns:
        - Summary statistics
    """
    try:
        supabase = get_supabase_client()
        
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = supabase.table('logs').select('*')
        
        if date_from:
            query = query.gte('created_at', date_from)
        
        if date_to:
            query = query.lte('created_at', date_to + 'T23:59:59')
        
        result = query.execute()
        logs = result.data
        
        # Calculate statistics
        total_logs = len(logs)
        verified_count = len([log for log in logs if log['result'] == 'verified'])
        failed_count = len([log for log in logs if log['result'] == 'failed'])
        
        # Calculate average confidence
        confidences = [log.get('confidence', 0) for log in logs if log.get('confidence')]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Get unique students verified
        verified_student_ids = set(log['student_id'] for log in logs if log['result'] == 'verified' and log['student_id'])
        unique_students = len(verified_student_ids)
        
        return jsonify({
            "status": "success",
            "data": {
                "total_logs": total_logs,
                "verified_count": verified_count,
                "failed_count": failed_count,
                "success_rate": round((verified_count / total_logs * 100), 2) if total_logs > 0 else 0,
                "average_confidence": round(avg_confidence, 2),
                "unique_students_verified": unique_students
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to get summary: {str(e)}"
        }), 500
