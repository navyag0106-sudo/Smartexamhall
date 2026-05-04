"""
Face verification routes
"""

from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase_client
from utils.face_recognition_utils import (
    verify_face, detect_face_in_image, detect_faces_opencv, 
    verify_face_with_liveness, liveness_detection_blink
)
from datetime import datetime

verification_bp = Blueprint('verification', __name__)

@verification_bp.route('/verify-face', methods=['POST'])
def verify_face_endpoint():
    """
    Verify face by comparing captured image with stored student image
    
    Request Body:
        - image: Base64 encoded captured image
        - register_no: Student registration number (optional - if not provided, will try to match all students)
        
    Returns:
        - Verification result with student info if matched
    """
    try:
        data = request.get_json()
        
        if not data.get('image'):
            return jsonify({
                "status": "error",
                "message": "Image is required"
            }), 400
        
        captured_image = data.get('image')
        register_no = data.get('register_no')
        
        supabase = get_supabase_client()
        
        # First, detect if there's a face in the captured image
        detection_result = detect_face_in_image(captured_image)
        if not detection_result.get('face_detected'):
            return jsonify({
                "status": "error",
                "message": "No face detected in the captured image. Please try again.",
                "verified": False
            }), 400
        
        # If register number is provided, verify against that specific student
        if register_no:
            # Get student by register number
            student_result = supabase.table('students').select('*').eq('register_no', register_no).execute()
            
            if not student_result.data or len(student_result.data) == 0:
                return jsonify({
                    "status": "error",
                    "message": "Student not found",
                    "verified": False
                }), 404
            
            student = student_result.data[0]
            
            # Verify face with strict tolerance (only match the specific registered face)
            verification_result = verify_face(captured_image, student['photo_url'], tolerance=0.5)
            
            if verification_result.get('verified'):
                # Update student verification status and entry time
                current_time = datetime.utcnow()
                supabase.table('students').update({
                    'verified_status': True,
                    'entry_time': current_time.isoformat()
                }).eq('id', student['id']).execute()
                
                # Create verification log with hall and seat info
                log_data = {
                    'student_id': student['id'],
                    'result': 'verified',
                    'confidence': verification_result.get('confidence', 0),
                    'hall_no': student.get('hall_no'),
                    'seat_no': student.get('seat_no'),
                    'verification_time': current_time.isoformat(),
                    'created_at': current_time.isoformat()
                }
                supabase.table('logs').insert(log_data).execute()
                
                return jsonify({
                    "status": "success",
                    "verified": True,
                    "confidence": verification_result.get('confidence'),
                    "message": "Face verified successfully - Entry allowed",
                    "entry_time": current_time.isoformat(),
                    "student": {
                        "id": student['id'],
                        "name": student['name'],
                        "register_no": student['register_no'],
                        "department": student['department'],
                        "year": student['year'],
                        "hall_no": student.get('hall_no'),
                        "seat_no": student.get('seat_no')
                    }
                }), 200
            else:
                # Create failed verification log
                current_time = datetime.utcnow()
                log_data = {
                    'student_id': student['id'],
                    'result': 'failed',
                    'confidence': verification_result.get('confidence', 0),
                    'hall_no': student.get('hall_no'),
                    'seat_no': student.get('seat_no'),
                    'verification_time': current_time.isoformat(),
                    'created_at': current_time.isoformat()
                }
                supabase.table('logs').insert(log_data).execute()
                
                return jsonify({
                    "status": "success",
                    "verified": False,
                    "confidence": verification_result.get('confidence'),
                    "message": verification_result.get('message', 'Face does not match'),
                    "student": {
                        "id": student['id'],
                        "name": student['name'],
                        "register_no": student['register_no']
                    }
                }), 200
        
        else:
            # If no register number provided, return error - we require specific student verification
            return jsonify({
                "status": "error",
                "message": "Registration number is required for verification. Please search for a specific student first.",
                "verified": False
            }), 400
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Verification failed: {str(e)}",
            "verified": False
        }), 500

@verification_bp.route('/check-face', methods=['POST'])
def check_face():
    """
    Check if face is present in image with OpenCV preview (without verification)
    
    Request Body:
        - image: Base64 encoded image
        
    Returns:
        - Face detection result with bounding box
    """
    try:
        data = request.get_json()
        
        if not data.get('image'):
            return jsonify({
                "status": "error",
                "message": "Image is required"
            }), 400
        
        image = data.get('image')
        result = detect_faces_opencv(image)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Face detection failed: {str(e)}"
        }), 500

@verification_bp.route('/verify-live', methods=['POST'])
def verify_live():
    """
    Live face verification with liveness detection and multiple face alert
    
    Request Body:
        - images: List of base64 encoded captured images (minimum 3 for liveness)
        - register_no: Student registration number
        - subject_name: Subject being verified (optional)
        - require_liveness: Boolean (default True)
        
    Returns:
        - Verification result with liveness check
    """
    try:
        data = request.get_json()
        
        if not data.get('images') or not isinstance(data.get('images'), list):
            return jsonify({
                "status": "error",
                "message": "List of images is required"
            }), 400
        
        images = data.get('images')
        register_no = data.get('register_no')
        subject_name = data.get('subject_name')
        require_liveness = data.get('require_liveness', True)
        
        if len(images) < 1:
            return jsonify({
                "status": "error",
                "message": "At least one image is required"
            }), 400
        
        if not register_no:
            return jsonify({
                "status": "error",
                "message": "Registration number is required"
            }), 400
        
        supabase = get_supabase_client()
        
        # Get student by register number
        student_result = supabase.table('students').select('*').eq('register_no', register_no).execute()
        
        if not student_result.data or len(student_result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Student not found",
                "verified": False
            }), 404
        
        student = student_result.data[0]
        
        # Perform live verification with liveness
        verification_result = verify_face_with_liveness(
            images, 
            student['photo_url'], 
            tolerance=0.9,
            require_liveness=require_liveness
        )
        
        if verification_result.get('verified'):
            # Update student verification status and entry time
            current_time = datetime.utcnow()
            supabase.table('students').update({
                'verified_status': True,
                'entry_time': current_time.isoformat()
            }).eq('id', student['id']).execute()
            
            # Create subject attendance record if subject_name is provided
            if subject_name:
                # Get the subject template to find exam date and time
                exam_date = None
                exam_time = '09:00'
                
                if student.get('subject_template_id'):
                    template_result = supabase.table('subject_templates')\
                        .select('subjects')\
                        .eq('id', student['subject_template_id'])\
                        .execute()
                    
                    if template_result.data and len(template_result.data) > 0:
                        subjects = template_result.data[0].get('subjects', [])
                        subject_info = None
                        
                        # Find the subject by name (flexible matching)
                        for subj in subjects:
                            if isinstance(subj, dict):
                                # Try exact match first
                                if subj.get('name') == subject_name:
                                    subject_info = subj
                                    break
                                # Try case-insensitive match
                                elif subj.get('name', '').lower() == subject_name.lower():
                                    subject_info = subj
                                    break
                                # Try partial match
                                elif subject_name.lower() in subj.get('name', '').lower() or subj.get('name', '').lower() in subject_name.lower():
                                    subject_info = subj
                                    break
                        
                        if subject_info:
                            exam_date = subject_info.get('exam_date')
                            exam_time = subject_info.get('exam_time', '09:00')
                        else:
                            # If no subject match found, use today's date and first available subject info
                            if subjects and len(subjects) > 0:
                                first_subject = subjects[0]
                                if isinstance(first_subject, dict):
                                    exam_date = first_subject.get('exam_date')
                                    exam_time = first_subject.get('exam_time', '09:00')
                            else:
                                # Use today's date as fallback
                                from datetime import datetime
                                exam_date = datetime.now().strftime('%Y-%m-%d')
                
                # Always create attendance record, even if subject matching failed
                if exam_date is None:
                    from datetime import datetime
                    exam_date = datetime.now().strftime('%Y-%m-%d')
                
                # Check if attendance already exists for this student and subject today
                existing_attendance = supabase.table('subject_attendance')\
                    .select('*')\
                    .eq('student_id', student['id'])\
                    .eq('subject_name', subject_name)\
                    .eq('exam_date', exam_date)\
                    .execute()
                
                if existing_attendance.data and len(existing_attendance.data) > 0:
                    # Update existing record
                    supabase.table('subject_attendance')\
                        .update({
                            'status': 'verified',
                            'verification_time': current_time.isoformat(),
                            'confidence': verification_result.get('confidence', 0),
                            'hall_no': student.get('hall_no'),
                            'seat_no': student.get('seat_no'),
                            'updated_at': current_time.isoformat()
                        })\
                        .eq('id', existing_attendance.data[0]['id'])\
                        .execute()
                    print(f"Updated attendance record for student {student['id']} subject {subject_name}")
                else:
                    # Create new attendance record
                    attendance_data = {
                        'student_id': student['id'],
                        'subject_name': subject_name,
                        'exam_date': exam_date,
                        'exam_time': exam_time,
                        'status': 'verified',
                        'verification_time': current_time.isoformat(),
                        'confidence': verification_result.get('confidence', 0),
                        'hall_no': student.get('hall_no'),
                        'seat_no': student.get('seat_no'),
                        'created_at': current_time.isoformat(),
                        'updated_at': current_time.isoformat()
                    }
                    supabase.table('subject_attendance').insert(attendance_data).execute()
                    print(f"Created attendance record for student {student['id']} subject {subject_name}")
            else:
                # If no subject name provided, create a general attendance record
                from datetime import datetime
                exam_date = datetime.now().strftime('%Y-%m-%d')
                
                attendance_data = {
                    'student_id': student['id'],
                    'subject_name': 'General Verification',
                    'exam_date': exam_date,
                    'exam_time': '09:00',
                    'status': 'verified',
                    'verification_time': current_time.isoformat(),
                    'confidence': verification_result.get('confidence', 0),
                    'hall_no': student.get('hall_no'),
                    'seat_no': student.get('seat_no'),
                    'created_at': current_time.isoformat(),
                    'updated_at': current_time.isoformat()
                }
                supabase.table('subject_attendance').insert(attendance_data).execute()
                print(f"Created general attendance record for student {student['id']}")
            
            # Create verification log
            log_data = {
                'student_id': student['id'],
                'result': 'verified',
                'confidence': verification_result.get('confidence', 0),
                'hall_no': student.get('hall_no'),
                'seat_no': student.get('seat_no'),
                'verification_time': current_time.isoformat(),
                'created_at': current_time.isoformat()
            }
            supabase.table('logs').insert(log_data).execute()
            
            return jsonify({
                "status": "success",
                "verified": True,
                "is_live": verification_result.get('is_live', True),
                "confidence": verification_result.get('confidence'),
                "message": "Face verified successfully - Entry allowed",
                "entry_time": current_time.isoformat(),
                "annotated_image": verification_result.get('annotated_image'),
                "student": {
                    "id": student['id'],
                    "name": student['name'],
                    "register_no": student['register_no'],
                    "department": student['department'],
                    "year": student['year'],
                    "hall_no": student.get('hall_no'),
                    "seat_no": student.get('seat_no')
                }
            }), 200
        else:
            # Create failed verification log
            current_time = datetime.utcnow()
            log_data = {
                'student_id': student['id'],
                'result': 'failed',
                'confidence': verification_result.get('confidence', 0),
                'hall_no': student.get('hall_no'),
                'seat_no': student.get('seat_no'),
                'verification_time': current_time.isoformat(),
                'created_at': current_time.isoformat()
            }
            supabase.table('logs').insert(log_data).execute()
            
            return jsonify({
                "status": "success",
                "verified": False,
                "is_live": verification_result.get('is_live', True),
                "confidence": verification_result.get('confidence'),
                "message": verification_result.get('message', 'Verification failed'),
                "debug": verification_result.get('debug'),
                "annotated_image": verification_result.get('annotated_image'),
                "student": {
                    "id": student['id'],
                    "name": student['name'],
                    "register_no": student['register_no'],
                    "department": student['department'],
                    "year": student['year'],
                    "hall_no": student.get('hall_no'),
                    "seat_no": student.get('seat_no')
                }
            }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Live verification failed: {str(e)}",
            "verified": False
        }), 500

@verification_bp.route('/check-liveness', methods=['POST'])
def check_liveness():
    """
    Check liveness using blink detection
    
    Request Body:
        - images: List of base64 encoded images (minimum 3)
        
    Returns:
        - Liveness detection result
    """
    try:
        data = request.get_json()
        
        if not data.get('images') or len(data.get('images', [])) < 3:
            return jsonify({
                "status": "error",
                "message": "At least 3 images are required for blink detection"
            }), 400
        
        images = data.get('images')
        result = liveness_detection_blink(images)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Liveness check failed: {str(e)}"
        }), 500

@verification_bp.route('/stats', methods=['GET'])
def get_verification_stats():
    """
    Get verification statistics
    
    Returns:
        - Statistics about verifications
    """
    try:
        supabase = get_supabase_client()
        
        # Get total students
        students_count = supabase.table('students').select('id', count='exact').execute()
        total_students = students_count.count
        
        # Get verified students
        verified_count = supabase.table('students').select('id', count='exact').eq('verified_status', True).execute()
        verified_students = verified_count.count
        
        # Get pending verifications
        pending_students = total_students - verified_students
        
        # Get today's verifications from logs
        today = datetime.utcnow().strftime('%Y-%m-%d')
        today_logs = supabase.table('logs').select('*').gte('created_at', today).execute()
        
        today_verified = len([log for log in today_logs.data if log['result'] == 'verified'])
        today_failed = len([log for log in today_logs.data if log['result'] == 'failed'])
        
        return jsonify({
            "status": "success",
            "data": {
                "total_students": total_students,
                "verified_students": verified_students,
                "pending_students": pending_students,
                "today_verified": today_verified,
                "today_failed": today_failed,
                "verification_rate": round((verified_students / total_students * 100), 2) if total_students > 0 else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to get stats: {str(e)}"
        }), 500

@verification_bp.route('/student-attendance/<register_no>', methods=['GET'])
def get_student_attendance(register_no):
    """
    Get student's subject attendance with dates and times
    
    Args:
        register_no: Student registration number
        
    Returns:
        - Student info with subjects and attendance status
    """
    try:
        supabase = get_supabase_client()
        
        # Get student by register number
        student_result = supabase.table('students').select('*').eq('register_no', register_no).execute()
        
        if not student_result.data or len(student_result.data) == 0:
            return jsonify({
                "status": "error",
                "message": "Student not found"
            }), 404
        
        student = student_result.data[0]
        
        # Get subject template
        subjects = []
        if student.get('subject_template_id'):
            template_result = supabase.table('subject_templates')\
                .select('*')\
                .eq('id', student['subject_template_id'])\
                .execute()
            
            if template_result.data and len(template_result.data) > 0:
                template = template_result.data[0]
                raw_subjects = template.get('subjects', [])
                
                # Parse subjects and get attendance
                for subj in raw_subjects:
                    subject_name = subj.get('name') if isinstance(subj, dict) else subj
                    exam_date = subj.get('exam_date', '') if isinstance(subj, dict) else ''
                    exam_time = subj.get('exam_time', '09:00') if isinstance(subj, dict) else '09:00'
                    
                    # Get attendance for this subject
                    attendance_result = supabase.table('subject_attendance')\
                        .select('*')\
                        .eq('student_id', student['id'])\
                        .eq('subject_name', subject_name)\
                        .eq('exam_date', exam_date)\
                        .execute()
                    
                    attendance = None
                    if attendance_result.data and len(attendance_result.data) > 0:
                        attendance = attendance_result.data[0]
                    
                    subjects.append({
                        'name': subject_name,
                        'exam_date': exam_date,
                        'exam_time': exam_time,
                        'status': attendance.get('status', 'absent') if attendance else 'absent',
                        'verification_time': attendance.get('verification_time') if attendance else None,
                        'confidence': attendance.get('confidence') if attendance else None
                    })
        
        return jsonify({
            "status": "success",
            "data": {
                "student": {
                    "id": student['id'],
                    "name": student['name'],
                    "register_no": student['register_no'],
                    "department": student['department'],
                    "year": student['year'],
                    "hall_no": student.get('hall_no'),
                    "seat_no": student.get('seat_no')
                },
                "subjects": subjects
            }
        }), 200
        
    except Exception as e:
        error_message = str(e)
        
        # Check if it's a missing table error
        if 'subject_attendance' in error_message and ('Could not find' in error_message or 'does not exist' in error_message):
            # Return subjects without attendance data
            subjects = []
            if student.get('subject_template_id'):
                try:
                    template_result = supabase.table('subject_templates')\
                        .select('*')\
                        .eq('id', student['subject_template_id'])\
                        .execute()
                    
                    if template_result.data and len(template_result.data) > 0:
                        template = template_result.data[0]
                        raw_subjects = template.get('subjects', [])
                        
                        for subj in raw_subjects:
                            subject_name = subj.get('name') if isinstance(subj, dict) else subj
                            exam_date = subj.get('exam_date', '') if isinstance(subj, dict) else ''
                            exam_time = subj.get('exam_time', '09:00') if isinstance(subj, dict) else '09:00'
                            
                            subjects.append({
                                'name': subject_name,
                                'exam_date': exam_date,
                                'exam_time': exam_time,
                                'status': 'absent',
                                'verification_time': None,
                                'confidence': None
                            })
                except:
                    pass
            
            return jsonify({
                "status": "success",
                "data": {
                    "student": {
                        "id": student['id'],
                        "name": student['name'],
                        "register_no": student['register_no'],
                        "department": student['department'],
                        "year": student['year'],
                        "hall_no": student.get('hall_no'),
                        "seat_no": student.get('seat_no')
                    },
                    "subjects": subjects,
                    "warning": "Subject attendance table not found. Please run create_subject_attendance_table.sql in Supabase."
                }
            }), 200
        
        return jsonify({
            "status": "error",
            "message": f"Failed to get attendance: {error_message}"
        }), 500

@verification_bp.route('/test-face-recognition', methods=['POST'])
def test_face_recognition():
    """
    Test endpoint to verify face recognition is working
    
    Request Body:
        - image: Base64 encoded image
        
    Returns:
        - Face detection result
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                "status": "error",
                "message": "Image is required"
            }), 400
        
        from utils.face_recognition_utils import decode_base64_image, get_face_encoding
        import face_recognition
        
        # Decode image
        image = decode_base64_image(image_base64)
        
        # Find face locations
        face_locations = face_recognition.face_locations(image)
        
        # Get encodings
        encodings = face_recognition.face_encodings(image, face_locations)
        
        return jsonify({
            "status": "success",
            "face_detected": len(face_locations) > 0,
            "face_count": len(face_locations),
            "encoding_generated": len(encodings) > 0,
            "image_shape": image.shape
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Test failed: {str(e)}"
        }), 500

@verification_bp.route('/attendance', methods=['GET'])
def get_all_attendance():
    """
    Get all subject attendance records with filters
    
    Query Parameters:
        - hall_no: Filter by hall number
        - date: Filter by exam date
        - status: Filter by status (present/absent/verified)
        - search: Search by student name or register number
        
    Returns:
        - List of attendance records with student info
    """
    try:
        supabase = get_supabase_client()
        
        # Get query parameters
        hall_no = request.args.get('hall_no')
        exam_date = request.args.get('date')
        status = request.args.get('status')
        search = request.args.get('search')
        
        # Build query
        query = supabase.table('subject_attendance').select('*')
        
        # Apply filters
        if hall_no:
            query = query.eq('hall_no', hall_no)
        
        if exam_date:
            query = query.eq('exam_date', exam_date)
        
        if status:
            query = query.eq('status', status)
        
        # Order by verification time descending
        query = query.order('created_at', desc=True)
        
        # Execute query
        result = query.execute()
        attendance_records = result.data or []
        
        # Get all students separately
        students_result = supabase.table('students').select('*').execute()
        students = {str(s['id']): s for s in students_result.data or []}
        
        # Combine data manually
        combined_records = []
        for record in attendance_records:
            student_id = str(record.get('student_id', ''))
            student = students.get(student_id, {})
            
            combined_record = {
                **record,
                'students': student if student else None
            }
            combined_records.append(combined_record)
        
        # Filter by search if provided
        if search:
            search_lower = search.lower()
            combined_records = [
                record for record in combined_records
                if search_lower in record.get('students', {}).get('name', '').lower() or
                   search_lower in record.get('students', {}).get('register_no', '').lower()
            ]
        
        return jsonify({
            "status": "success",
            "data": combined_records,
            "count": len(combined_records)
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to get attendance: {str(e)}"
        }), 500

@verification_bp.route('/attendance/summary', methods=['GET'])
def get_attendance_summary():
    """
    Get attendance summary statistics
    
    Returns:
        - Summary of attendance by status, department, hall, etc.
    """
    try:
        supabase = get_supabase_client()
        
        # Get all attendance records
        result = supabase.table('subject_attendance').select('*').execute()
        attendance_records = result.data or []
        
        # Calculate statistics
        total = len(attendance_records)
        verified = len([r for r in attendance_records if r.get('status') == 'verified'])
        present = len([r for r in attendance_records if r.get('status') == 'present'])
        absent = len([r for r in attendance_records if r.get('status') == 'absent'])
        
        # Group by department
        dept_stats = {}
        for record in attendance_records:
            student = record.get('students', {})
            dept = student.get('department', 'Unknown')
            if dept not in dept_stats:
                dept_stats[dept] = {'total': 0, 'verified': 0, 'present': 0, 'absent': 0}
            dept_stats[dept]['total'] += 1
            dept_stats[dept][record.get('status', 'absent')] += 1
        
        # Group by hall
        hall_stats = {}
        for record in attendance_records:
            hall = record.get('hall_no', 'Unknown')
            if hall not in hall_stats:
                hall_stats[hall] = {'total': 0, 'verified': 0, 'present': 0, 'absent': 0}
            hall_stats[hall]['total'] += 1
            hall_stats[hall][record.get('status', 'absent')] += 1
        
        return jsonify({
            "status": "success",
            "data": {
                "total": total,
                "verified": verified,
                "present": present,
                "absent": absent,
                "verification_rate": round((verified / total * 100), 2) if total > 0 else 0,
                "by_department": dept_stats,
                "by_hall": hall_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to get attendance summary: {str(e)}"
        }), 500
