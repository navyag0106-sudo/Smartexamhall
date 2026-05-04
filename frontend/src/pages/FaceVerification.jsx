import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { verificationAPI, studentAPI } from '../services/api';
import { 
  Camera, 
  ScanFace, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  User,
  Hash,
  Building,
  Calendar,
  ArrowRight,
  Search
} from 'lucide-react';
import Toast from '../components/Toast';

const FaceVerification = () => {
  const webcamRef = useRef(null);
  
  const [registerNo, setRegisterNo] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchStudent, setSearchStudent] = useState(null);
  const [searching, setSearching] = useState(false);

  const captureImage = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowCamera(false);
  }, [webcamRef]);

  const handleSearchStudent = async () => {
    if (!registerNo.trim()) {
      setToast({ message: 'Please enter a register number', type: 'error' });
      return;
    }
    
    setSearching(true);
    try {
      const response = await studentAPI.getByRegisterNo(registerNo);
      if (response.data.status === 'success') {
        setSearchStudent(response.data.data);
        setToast({ message: 'Student found!', type: 'success' });
      }
    } catch (error) {
      setSearchStudent(null);
      setToast({ message: 'Student not found', type: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const handleVerify = async () => {
    if (!capturedImage) {
      setToast({ message: 'Please capture an image first', type: 'error' });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await verificationAPI.verifyFace(
        capturedImage, 
        registerNo.trim() || null
      );
      
      if (response.data.status === 'success') {
        setResult(response.data);
        
        if (response.data.verified) {
          setToast({ 
            message: `Verified: ${response.data.student?.name || 'Student'}`, 
            type: 'success' 
          });
        } else {
          setToast({ 
            message: response.data.message || 'Verification failed', 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      setToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetVerification = () => {
    setCapturedImage(null);
    setShowCamera(true);
    setResult(null);
    setRegisterNo('');
    setSearchStudent(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Face Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Verify student identity using face recognition
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Capture Photo
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
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <button
                    onClick={captureImage}
                    className="px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg"
                  >
                    Capture Photo
                  </button>
                </div>
                <p className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                  Position your face within the circle
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-xl"
                />
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setShowCamera(true);
                    setResult(null);
                  }}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake
                </button>
              </div>
            )}
          </div>

          {/* Verification Section */}
          <div className="space-y-6">
            {/* Register Number Input */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Student Registration
              </h3>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={registerNo}
                    onChange={(e) => setRegisterNo(e.target.value)}
                    placeholder="Enter register number (optional)"
                    className="input-field pl-12"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchStudent()}
                  />
                </div>
                <button
                  onClick={handleSearchStudent}
                  disabled={searching}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                Leave empty to search across all registered students
              </p>
              
              {/* Search Result */}
              {searchStudent && (
                <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <div className="flex items-center gap-4">
                    <img
                      src={searchStudent.photo_url}
                      alt={searchStudent.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {searchStudent.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {searchStudent.register_no} • {searchStudent.department}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Verify Button */}
            {capturedImage && !result && (
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ScanFace className="w-6 h-6" />
                    Verify Face
                  </>
                )}
              </button>
            )}

            {/* Verification Result */}
            {result && (
              <div className={`rounded-2xl p-6 ${
                result.verified 
                  ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
              }`}>
                <div className="text-center">
                  {result.verified ? (
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  ) : (
                    <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                  )}
                  
                  <h3 className={`text-2xl font-bold mb-2 ${
                    result.verified ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {result.verified ? 'Verification Successful!' : 'Verification Failed'}
                  </h3>
                  
                  {result.confidence && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Confidence: {result.confidence}%
                    </p>
                  )}
                  
                  {result.student && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={searchStudent?.photo_url || '/default-avatar.png'}
                          alt={result.student.name}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 dark:text-white text-lg">
                            {result.student.name}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            <Hash className="w-4 h-4 inline mr-1" />
                            {result.student.register_no}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            <Building className="w-4 h-4 inline mr-1" />
                            {result.student.department}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {result.student.year}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={resetVerification}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Verify Another
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!result && (
              <div className="glass-card rounded-2xl p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  How to Verify
                </h4>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                  <li>Position the student's face in front of the camera</li>
                  <li>Ensure good lighting and clear visibility</li>
                  <li>Click "Capture Photo" to take a picture</li>
                  <li>Enter the register number (optional)</li>
                  <li>Click "Verify Face" to start verification</li>
                </ol>
              </div>
            )}
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

export default FaceVerification;
