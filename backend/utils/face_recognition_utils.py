"""
Face recognition utilities using face_recognition library and OpenCV
"""

import face_recognition
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import requests
from typing import Tuple, Optional, List
import time

# OpenCV face cascade for quick face detection
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
EYE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

def decode_base64_image(base64_string: str) -> np.ndarray:
    """
    Decode base64 image string to numpy array
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        numpy array of the image
    """
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Decode base64 to bytes
    image_bytes = base64.b64decode(base64_string)
    
    # Convert to PIL Image
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB (face_recognition requires RGB)
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy array
    return np.array(image)

def load_image_from_url(url: str) -> np.ndarray:
    """
    Load image from URL
    
    Args:
        url: Image URL
        
    Returns:
        numpy array of the image
    """
    print(f"Loading image from URL: {url}")
    response = requests.get(url)
    print(f"Response status: {response.status_code}, Content length: {len(response.content)}")
    
    if response.status_code != 200:
        raise Exception(f"Failed to load image: HTTP {response.status_code}")
    
    image = Image.open(io.BytesIO(response.content))
    print(f"Image loaded: mode={image.mode}, size={image.size}")
    
    # Convert to RGB
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    return np.array(image)

def get_face_encoding(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Get face encoding from image
    
    Args:
        image: numpy array of the image
        
    Returns:
        Face encoding array or None if no face detected
    """
    # Find face locations
    face_locations = face_recognition.face_locations(image)
    
    if not face_locations:
        return None
    
    # Get face encodings
    face_encodings = face_recognition.face_encodings(image, face_locations)
    
    if not face_encodings:
        return None
    
    # Ensure we return a numpy array, not a list
    encoding = face_encodings[0]
    if isinstance(encoding, list):
        encoding = np.array(encoding)
    return encoding

def compare_faces(known_encoding, unknown_encoding, tolerance: float = 0.6) -> Tuple[bool, float]:
    """
    Compare two face encodings
    
    Args:
        known_encoding: Known face encoding (numpy array or list)
        unknown_encoding: Unknown face encoding to compare (numpy array or list)
        tolerance: Face comparison tolerance (lower = stricter)
        
    Returns:
        Tuple of (is_match, confidence_score)
    """
    try:
        # Ensure encodings are numpy arrays
        if isinstance(known_encoding, list):
            known_encoding = np.array(known_encoding)
        if isinstance(unknown_encoding, list):
            unknown_encoding = np.array(unknown_encoding)
        
        # Ensure 1D arrays
        if len(known_encoding.shape) > 1:
            known_encoding = known_encoding.flatten()
        if len(unknown_encoding.shape) > 1:
            unknown_encoding = unknown_encoding.flatten()
        
        # Calculate face distance using numpy
        distance = np.linalg.norm(known_encoding - unknown_encoding)
        
        # Convert distance to similarity score (0-1, higher = more similar)
        similarity = max(0.0, 1 - distance)
        
        # Check if faces match
        is_match = distance <= tolerance
        
        print(f"Custom comparison - Distance: {distance:.4f}, Similarity: {similarity:.4f}, Match: {is_match}")
        
        return is_match, similarity
    except Exception as e:
        print(f"Error in compare_faces: {e}")
        return False, 0.0

def verify_face(captured_image_base64: str, stored_image_url: str, tolerance: float = 0.5) -> dict:
    """
    Verify face by comparing captured image with stored image
    
    Args:
        captured_image_base64: Base64 encoded captured image
        stored_image_url: URL of the stored student image
        tolerance: Face comparison tolerance
        
    Returns:
        Dictionary with verification result
    """
    try:
        print(f"\n=== FACE VERIFICATION DEBUG ===")
        print(f"Stored image URL: {stored_image_url}")
        
        # Decode captured image
        captured_image = decode_base64_image(captured_image_base64)
        print(f"Captured image shape: {captured_image.shape}")
        
        # Load stored image from URL
        stored_image = load_image_from_url(stored_image_url)
        print(f"Stored image shape: {stored_image.shape}")
        
        # Get face encodings
        captured_encoding = get_face_encoding(captured_image)
        stored_encoding = get_face_encoding(stored_image)
        
        print(f"Captured encoding: {captured_encoding is not None}")
        print(f"Stored encoding: {stored_encoding is not None}")
        
        if captured_encoding is None:
            return {
                "status": "error",
                "message": "No face detected in captured image",
                "verified": False
            }
        
        if stored_encoding is None:
            return {
                "status": "error",
                "message": "No face detected in stored image",
                "verified": False
            }
        
        # Compare faces using face_recognition library directly
        try:
            # Ensure encodings are numpy arrays
            if isinstance(stored_encoding, list):
                stored_encoding = np.array(stored_encoding)
            if isinstance(captured_encoding, list):
                captured_encoding = np.array(captured_encoding)
            
            # Use face_recognition.compare_faces for better accuracy
            results = face_recognition.compare_faces([stored_encoding], captured_encoding, tolerance=tolerance)
            face_distances = face_recognition.face_distance([stored_encoding], [captured_encoding])
            is_match_lib = results[0]
            distance = face_distances[0]
            confidence_lib = 1 - distance
            
            print(f"Library comparison - Match: {is_match_lib}, Distance: {distance}, Confidence: {confidence_lib}")
        except Exception as e:
            print(f"Library comparison error: {e}")
            is_match_lib = False
            confidence_lib = 0
        
        # Also use our custom comparison
        is_match, confidence = compare_faces(stored_encoding, captured_encoding, tolerance)
        
        print(f"Custom comparison - Match: {is_match}, Confidence: {confidence}, Tolerance: {tolerance}")
        print(f"Stored encoding shape: {stored_encoding.shape}, Captured encoding shape: {captured_encoding.shape}")
        print(f"=== END DEBUG ===\n")
        
        # Use the more confident result
        final_match = is_match or is_match_lib
        final_confidence = max(confidence, confidence_lib)
        
        return {
            "status": "success",
            "verified": final_match,
            "confidence": round(final_confidence * 100, 2),
            "message": "Face verified successfully" if final_match else f"Face does not match (confidence: {round(final_confidence * 100, 1)}%, tolerance: {tolerance})",
            "debug": {
                "library_match": is_match_lib,
                "library_confidence": round(confidence_lib * 100, 2),
                "custom_match": is_match,
                "custom_confidence": round(confidence * 100, 2),
                "tolerance": tolerance
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "verified": False
        }

def detect_face_in_image(image_base64: str) -> dict:
    """
    Check if face is present in image
    
    Args:
        image_base64: Base64 encoded image
        
    Returns:
        Dictionary with detection result
    """
    try:
        image = decode_base64_image(image_base64)
        face_locations = face_recognition.face_locations(image)
        
        return {
            "status": "success",
            "face_detected": len(face_locations) > 0,
            "face_count": len(face_locations)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "face_detected": False
        }

def detect_faces_opencv(image_base64: str) -> dict:
    """
    Detect faces using OpenCV with bounding box coordinates
    
    Args:
        image_base64: Base64 encoded image
        
    Returns:
        Dictionary with face locations and annotated image
    """
    try:
        # Decode image
        image = decode_base64_image(image_base64)
        
        # Convert to grayscale for OpenCV
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Detect faces
        faces = FACE_CASCADE.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100)
        )
        
        # Draw bounding boxes
        annotated_image = image.copy()
        face_boxes = []
        
        for (x, y, w, h) in faces:
            # Draw rectangle
            cv2.rectangle(annotated_image, (x, y), (x+w, y+h), (0, 255, 0), 3)
            
            # Add label
            cv2.putText(annotated_image, 'Face', (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            
            face_boxes.append({
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h)
            })
        
        # Convert back to base64
        pil_image = Image.fromarray(annotated_image)
        buffered = io.BytesIO()
        pil_image.save(buffered, format="JPEG")
        annotated_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "status": "success",
            "face_detected": len(faces) > 0,
            "face_count": len(faces),
            "faces": face_boxes,
            "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
            "multiple_faces": len(faces) > 1
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "face_detected": False,
            "face_count": 0,
            "multiple_faces": False
        }

def detect_eyes_opencv(image_base64: str, face_box: dict = None) -> dict:
    """
    Detect eyes in face region using OpenCV with improved sensitivity
    
    Args:
        image_base64: Base64 encoded image
        face_box: Optional face bounding box {'x', 'y', 'width', 'height'}
        
    Returns:
        Dictionary with eye detection results
    """
    try:
        image = decode_base64_image(image_base64)
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # If face box provided, crop to face region with some padding
        if face_box:
            x, y, w, h = face_box['x'], face_box['y'], face_box['width'], face_box['height']
            # Add padding to ensure eyes are captured
            padding = int(h * 0.2)
            x_start = max(0, x - padding)
            y_start = max(0, y - padding)
            x_end = min(gray.shape[1], x + w + padding)
            y_end = min(gray.shape[0], y + h + padding)
            roi_gray = gray[y_start:y_end, x_start:x_end]
        else:
            roi_gray = gray
        
        # Enhance contrast for better eye detection
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        roi_gray = clahe.apply(roi_gray)
        
        # Detect eyes with multiple scales and parameters
        eyes_list = []
        
        # Try different parameters for eye detection
        for scale_factor in [1.1, 1.2, 1.3]:
            for min_neighbors in [3, 4, 5]:
                eyes = EYE_CASCADE.detectMultiScale(
                    roi_gray,
                    scaleFactor=scale_factor,
                    minNeighbors=min_neighbors,
                    minSize=(20, 20),
                    maxSize=(80, 80)
                )
                if len(eyes) > 0:
                    eyes_list.extend(eyes)
                    break
        
        # Remove duplicate detections
        if eyes_list:
            eyes_list = list(set([tuple(eye) for eye in eyes_list]))
            eyes_list = [list(eye) for eye in eyes_list]
        
        # Consider eyes detected if we find at least one eye pair or single eye
        eyes_detected = len(eyes_list)
        eyes_open = eyes_detected >= 1  # More lenient - accept single eye detection
        
        return {
            "status": "success",
            "eyes_detected": eyes_detected,
            "eyes_open": eyes_open,
            "eye_positions": eyes_list
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "eyes_detected": 0,
            "eyes_open": False,
            "eye_positions": []
        }

def liveness_detection_blink(image_base64_list: List[str]) -> dict:
    """
    Liveness detection using improved blink detection across multiple frames
    
    Args:
        image_base64_list: List of base64 encoded images (minimum 3 frames)
        
    Returns:
        Dictionary with liveness detection result
    """
    try:
        if len(image_base64_list) < 3:
            return {
                "status": "error",
                "is_live": False,
                "message": "Need at least 3 frames for blink detection"
            }
        
        eye_states = []
        eye_counts = []
        
        for i, image_base64 in enumerate(image_base64_list):
            # Detect face first
            face_result = detect_faces_opencv(image_base64)
            
            if not face_result.get('face_detected'):
                eye_states.append('no_face')
                eye_counts.append(0)
                continue
            
            # Get first face box
            face_box = face_result['faces'][0] if face_result['faces'] else None
            
            # Detect eyes
            eye_result = detect_eyes_opencv(image_base64, face_box)
            eye_count = eye_result.get('eyes_detected', 0)
            eye_counts.append(eye_count)
            
            if eye_result.get('eyes_open'):
                eye_states.append('open')
            else:
                eye_states.append('closed')
        
        # Multiple blink detection strategies
        
        # Strategy 1: Classic blink pattern (open -> closed -> open)
        classic_blink = False
        for i in range(len(eye_states) - 2):
            if (eye_states[i] == 'open' and eye_states[i+1] == 'closed' and eye_states[i+2] == 'open'):
                classic_blink = True
                break
        
        # Strategy 2: Eye count variation (detect changes in eye detection)
        count_variation = False
        if len(eye_counts) >= 3:
            max_count = max(eye_counts)
            min_count = min(eye_counts)
            # If there's significant variation in eye detection counts
            if max_count >= 2 and min_count <= 1:
                count_variation = True
        
        # Strategy 3: Any closed eyes followed by open eyes
        any_blink = False
        for i in range(len(eye_states) - 1):
            if eye_states[i] == 'closed' and eye_states[i+1] == 'open':
                any_blink = True
                break
        
        # Strategy 4: Fallback - if we have consistent face detection with some eye detection
        fallback_live = False
        face_frames = sum(1 for state in eye_states if state != 'no_face')
        if face_frames >= len(eye_states) * 0.8:  # 80% frames have faces
            eye_frames = sum(1 for count in eye_counts if count > 0)
            if eye_frames >= face_frames * 0.5:  # 50% of face frames have eyes
                fallback_live = True
        
        # Determine final result
        blink_detected = classic_blink or count_variation or any_blink
        is_live = blink_detected or fallback_live
        
        # Determine message
        if classic_blink:
            message = "Liveness confirmed - natural blink detected"
        elif count_variation:
            message = "Liveness confirmed - eye movement detected"
        elif any_blink:
            message = "Liveness confirmed - blink pattern detected"
        elif fallback_live:
            message = "Liveness likely - face and eye consistency verified"
        else:
            message = "No liveness indicators detected - please blink naturally"
        
        return {
            "status": "success",
            "is_live": is_live,
            "blink_detected": blink_detected,
            "fallback_used": fallback_live and not blink_detected,
            "eye_states": eye_states,
            "eye_counts": eye_counts,
            "detection_methods": {
                "classic_blink": classic_blink,
                "count_variation": count_variation,
                "any_blink": any_blink,
                "fallback_live": fallback_live
            },
            "message": message
        }
        
    except Exception as e:
        return {
            "status": "error",
            "is_live": False,
            "message": f"Liveness detection error: {str(e)}"
        }

def verify_face_with_liveness(captured_images: List[str], stored_image_url: str, 
                               tolerance: float = 0.8, require_liveness: bool = True) -> dict:
    """
    Verify face with liveness detection and multiple face alert
    
    Args:
        captured_images: List of base64 encoded captured images (for liveness)
        stored_image_url: URL of the stored student image
        tolerance: Face comparison tolerance
        require_liveness: Whether to require liveness detection
        
    Returns:
        Dictionary with complete verification result
    """
    try:
        # Use the middle image for face comparison
        main_image = captured_images[len(captured_images) // 2] if len(captured_images) > 1 else captured_images[0]
        
        # Check for multiple faces in main image
        face_detection = detect_faces_opencv(main_image)
        
        if face_detection.get('multiple_faces'):
            return {
                "status": "warning",
                "verified": False,
                "message": "Multiple faces detected! Only one person allowed.",
                "face_count": face_detection.get('face_count', 0),
                "annotated_image": face_detection.get('annotated_image')
            }
        
        if not face_detection.get('face_detected'):
            return {
                "status": "error",
                "verified": False,
                "message": "No face detected in captured image"
            }
        
        # Liveness detection
        liveness_result = {"is_live": True}
        if require_liveness and len(captured_images) >= 3:
            liveness_result = liveness_detection_blink(captured_images)
            
            if not liveness_result.get('is_live'):
                return {
                    "status": "error",
                    "verified": False,
                    "is_live": False,
                    "message": "Liveness check failed. Please blink naturally.",
                    "annotated_image": face_detection.get('annotated_image')
                }
        
        # Perform face verification
        verification_result = verify_face(main_image, stored_image_url, tolerance)
        
        # Add liveness info to result
        verification_result['is_live'] = liveness_result.get('is_live', True)
        verification_result['annotated_image'] = face_detection.get('annotated_image')
        verification_result['face_count'] = face_detection.get('face_count', 1)
        
        return verification_result
        
    except Exception as e:
        return {
            "status": "error",
            "verified": False,
            "message": str(e)
        }
