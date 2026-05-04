import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { studentAPI, subjectTemplateAPI } from '../services/api';
import { 
  Camera, 
  Upload, 
  User, 
  Building, 
  Calendar, 
  Hash,
  Loader2,
  CheckCircle,
  X,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import Toast from '../components/Toast';

const RegisterStudent = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    register_no: '',
    department: '',
    year: '',
    hall_no: '',
    seat_no: '',
  });
  const [matchedTemplate, setMatchedTemplate] = useState(null);
  
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const departments = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Other'];

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  // Auto-find subject template when department or year changes (for display only)
  useEffect(() => {
    const findTemplate = async () => {
      if (formData.department && formData.year) {
        try {
          const response = await subjectTemplateAPI.getAll({ 
            department: formData.department, 
            year: formData.year 
          });
          if (response.data.status === 'success' && response.data.data.length > 0) {
            setMatchedTemplate(response.data.data[0]);
          } else {
            setMatchedTemplate(null);
          }
        } catch (error) {
          setMatchedTemplate(null);
        }
      } else {
        setMatchedTemplate(null);
      }
    };

    findTemplate();
  }, [formData.department, formData.year]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const captureImage = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowCamera(false);
  }, [webcamRef]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setToast({ message: 'Please enter student name', type: 'error' });
      return false;
    }
    if (!formData.register_no.trim()) {
      setToast({ message: 'Please enter register number', type: 'error' });
      return false;
    }
    if (!formData.department) {
      setToast({ message: 'Please select department', type: 'error' });
      return false;
    }
    if (!formData.year) {
      setToast({ message: 'Please select year', type: 'error' });
      return false;
    }
    if (!formData.hall_no) {
      setToast({ message: 'Please enter hall number', type: 'error' });
      return false;
    }
    if (!formData.seat_no) {
      setToast({ message: 'Please enter seat number', type: 'error' });
      return false;
    }
    if (!capturedImage) {
      setToast({ message: 'Please capture or upload a photo', type: 'error' });
      return false;
    }
    return true;
  };

  // No template selection needed - auto-assigned by backend based on dept/year

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const response = await studentAPI.register({
        ...formData,
        image: capturedImage,
      });
      
      if (response.data.status === 'success') {
        const subjectCount = matchedTemplate ? matchedTemplate.subject_count : 0;
        setToast({ 
          message: `Student registered successfully! ${subjectCount > 0 ? `(${subjectCount} subjects assigned)` : ''}`, 
          type: 'success' 
        });
        
        // Reset form
        setFormData({
          name: '',
          register_no: '',
          department: '',
          year: '',
          hall_no: '',
          seat_no: '',
        });
        setMatchedTemplate(null);
        setCapturedImage(null);
        
        // Redirect after delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to register student';
      setToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Register New Student
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Add a new student to the verification system
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="glass-card rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter student name"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {/* Register Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Register Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="register_no"
                    value={formData.register_no}
                    onChange={handleInputChange}
                    placeholder="e.g., 2024001"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="input-field pl-12 appearance-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year of Study
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="input-field pl-12 appearance-none"
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto-assigned Subject Template Info */}
              {formData.department && formData.year && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subjects (Auto-assigned)
                    </span>
                  </div>
                  {matchedTemplate ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        {matchedTemplate.subject_count} subjects will be assigned for {formData.department} {formData.year}
                      </p>
                      <p className="text-xs text-gray-400">
                        Subjects will be displayed after registration
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-yellow-600">
                      No subject template found for {formData.department} {formData.year}. 
                      Create one in Dashboard first.
                    </p>
                  )}
                </div>
              )}

              {/* Hall Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hall Number
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="hall_no"
                    value={formData.hall_no}
                    onChange={handleInputChange}
                    placeholder="Enter hall number (e.g., Hall A, Room 101)"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              {/* Seat Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seat Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="seat_no"
                    value={formData.seat_no}
                    onChange={handleInputChange}
                    placeholder="Enter seat number (e.g., A1, 15)"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Register Student
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Photo Capture Section */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Student Photo
              </h3>
              
              {showCamera ? (
                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-xl"
                    videoConstraints={{
                      facingMode: 'user',
                      width: 640,
                      height: 480,
                    }}
                  />
                  <div className="face-guide" />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <button
                      onClick={captureImage}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                    >
                      Capture
                    </button>
                    <button
                      onClick={() => setShowCamera(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : capturedImage ? (
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full rounded-xl"
                  />
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setShowCamera(true);
                    }}
                    className="absolute bottom-2 right-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowCamera(true)}
                    className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex flex-col items-center gap-3"
                  >
                    <Camera className="w-12 h-12 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Open Camera
                    </span>
                  </button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
                        Or
                      </span>
                    </div>
                  </div>
                  
                  <label className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex flex-col items-center gap-3 cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Upload Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-4 text-center">
                Please ensure the face is clearly visible and well-lit
              </p>
            </div>

            {/* Guidelines */}
            <div className="glass-card rounded-2xl p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Photo Guidelines
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Face should be clearly visible and centered
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Good lighting without shadows on face
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Neutral expression, eyes open
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  No glasses, hats, or face coverings
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default RegisterStudent;
