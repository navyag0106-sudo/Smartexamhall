import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';
import { studentAPI, verificationAPI } from '../services/api';
import { 
  Search,
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  UserCheck,
  UserX,
  ScanFace,
  ArrowRight,
  Building,
  AlertTriangle,
  Activity,
  Calendar,
  Clock,
  BookOpen,
  RefreshCw,
  Users
} from 'lucide-react';
import Toast from '../components/Toast';

const ExaminerDashboard = () => {
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const [registerNo, setRegisterNo] = useState('');
  const [student, setStudent] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [attendanceWarning, setAttendanceWarning] = useState(null);
  const [hallStudents, setHallStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all'); // all, verified, pending

  // Search student by register number
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!registerNo.trim()) {
      setToast({ message: 'Please enter a registration number', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setStudent(null);
      setStudentSubjects([]);
      setSelectedSubject(null);
      setVerificationResult(null);
      setCapturedImage(null);
      
      const response = await studentAPI.getByRegisterNo(registerNo.trim());
      
      if (response.data.status === 'success') {
        const studentData = response.data.data;
        
        // Check if student belongs to examiner's hall
        if (studentData.hall_no !== user?.hall_no) {
          setToast({ 
            message: `This student is assigned to ${studentData.hall_no}. You are assigned to ${user?.hall_no}.`, 
            type: 'error' 
          });
          setLoading(false);
          return;
        }
        
        setStudent(studentData);
        
        // Fetch student's subject attendance
        try {
          const attendanceResponse = await verificationAPI.getStudentAttendance(registerNo.trim());
          if (attendanceResponse.data.status === 'success') {
            setStudentSubjects(attendanceResponse.data.data.subjects);
            // Check for warning about missing table
            if (attendanceResponse.data.data.warning) {
              setAttendanceWarning(attendanceResponse.data.data.warning);
            }
          }
        } catch (err) {
          console.error('Failed to fetch attendance:', err);
        }
        
        setToast({ message: 'Student found', type: 'success' });
        // Start camera automatically
        startCamera();
      }
    } catch (error) {
      setToast({ 
        message: error.response?.data?.message || 'Student not found', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch students assigned to examiner's hall
  const fetchHallStudents = async () => {
    if (!user?.hall_no) return;
    
    setLoadingStudents(true);
    try {
      const response = await studentAPI.getAll({ hall_no: user.hall_no });
      if (response.data.status === 'success') {
        setHallStudents(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hall students:', error);
      setToast({ message: 'Failed to load hall students', type: 'error' });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Start camera
  const startCamera = async () => {
    setCameraActive(true);
  };

  // Stop camera
  const stopCamera = () => {
    setCameraActive(false);
  };

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      stopCamera();
    }
  }, [webcamRef]);

  // Verify face with standard face recognition
  const handleVerify = async () => {
    if (!capturedImage) {
      setToast({ message: 'Please capture an image first', type: 'error' });
      return;
    }

    if (!student) {
      setToast({ message: 'Please search for a student first', type: 'error' });
      return;
    }

    try {
      setVerifying(true);
      
      // Use standard face verification
      const response = await verificationAPI.verifyFace(
        capturedImage, 
        student.register_no
      );
      
      setVerificationResult(response.data);
      
      if (response.data.verified) {
        setToast({ 
          message: `Verified! ${selectedSubject} - Confidence: ${response.data.confidence}%`, 
          type: 'success' 
        });
        
        // Update subject attendance
        try {
          const attendanceResponse = await verificationAPI.verifyLive(
            [capturedImage], 
            student.register_no,
            selectedSubject,
            false  // Disable liveness requirement
          );
          
          // Refresh attendance data
          const refreshResponse = await verificationAPI.getStudentAttendance(registerNo.trim());
          if (refreshResponse.data.status === 'success') {
            setStudentSubjects(refreshResponse.data.data.subjects);
          }
          
          // Refresh hall students list to update verification status
          await fetchHallStudents();
        } catch (attendanceError) {
          console.error('Failed to update attendance:', attendanceError);
        }
      } else {
        setToast({ 
          message: `Face does not match. Confidence: ${response.data.confidence}%`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setToast({ 
        message: error.response?.data?.message || 'Verification failed', 
        type: 'error' 
      });
    } finally {
      setVerifying(false);
    }
  };

  // Filter hall students based on search and filter
  const filteredHallStudents = hallStudents.filter(student => {
    const matchesSearch = studentSearch === '' || 
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.register_no.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.department.toLowerCase().includes(studentSearch.toLowerCase());
    
    const matchesFilter = studentFilter === 'all' ||
      (studentFilter === 'verified' && student.verified_status) ||
      (studentFilter === 'pending' && !student.verified_status);
    
    return matchesSearch && matchesFilter;
  });

  // Fetch hall students on component mount
  useEffect(() => {
    fetchHallStudents();
  }, [user?.hall_no]);

  // Reset for next student
  const handleReset = () => {
    setRegisterNo('');
    setStudent(null);
    setStudentSubjects([]);
    setSelectedSubject(null);
    setVerificationResult(null);
    setCapturedImage(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Examiner Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome, {user?.name}. Verify student attendance by registration number and face.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
            <Building className="w-5 h-5" />
            <span className="font-medium">Assigned Hall: {user?.hall_no || 'Not Assigned'}</span>
          </div>
        </div>

        {/* Search Section */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={registerNo}
                onChange={(e) => setRegisterNo(e.target.value)}
                placeholder="Enter student registration number..."
                className="input-field pl-12"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Attendance Table Warning */}
        {attendanceWarning && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-1">
                  Database Setup Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                  {attendanceWarning}
                </p>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200">
                  <strong>Quick Fix:</strong> Run the SQL script in Supabase Dashboard → SQL Editor:<br/>
                  <code className="text-blue-600 dark:text-blue-400">backend/create_subject_attendance_table.sql</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hall Students List */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Hall Students List
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{hallStudents.length} students</span>
              </div>
              <button
                onClick={fetchHallStudents}
                disabled={loadingStudents}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh student list"
              >
                {loadingStudents ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name, register no, or department..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStudentFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  studentFilter === 'all'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All ({hallStudents.length})
              </button>
              <button
                onClick={() => setStudentFilter('verified')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  studentFilter === 'verified'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Verified ({hallStudents.filter(s => s.verified_status).length})
              </button>
              <button
                onClick={() => setStudentFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  studentFilter === 'pending'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Pending ({hallStudents.filter(s => !s.verified_status).length})
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : hallStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Register No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Department</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Seat</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHallStudents.length > 0 ? (
                    filteredHallStudents.map((studentItem) => (
                    <tr key={studentItem.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {studentItem.photo_url ? (
                            <img 
                              src={studentItem.photo_url} 
                              alt={studentItem.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <ScanFace className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{studentItem.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{studentItem.year}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-gray-900 dark:text-white">{studentItem.register_no}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 dark:text-white">{studentItem.department}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-bold">
                          {studentItem.seat_no}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {studentItem.verified_status ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Pending</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setRegisterNo(studentItem.register_no);
                            handleSearch({ preventDefault: () => {} });
                          }}
                          className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            No students found matching "{studentSearch}" with filter "{studentFilter}"
                          </p>
                          <button
                            onClick={() => {
                              setStudentSearch('');
                              setStudentFilter('all');
                            }}
                            className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
                          >
                            Clear filters
                          </button>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <ScanFace className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No students assigned to your hall</p>
            </div>
          )}
        </div>

        {/* Student Info & Verification */}
        {student && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Student Details */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Student Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {student.photo_url ? (
                    <img 
                      src={student.photo_url} 
                      alt={student.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary-500"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <ScanFace className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {student.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{student.register_no}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900 dark:text-white">{student.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Year</p>
                    <p className="font-medium text-gray-900 dark:text-white">{student.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Hall Number</p>
                    <p className="font-medium text-gray-900 dark:text-white">{student.hall_no}</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold">SEAT NUMBER</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{student.seat_no}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm text-gray-500">Verification Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {student.verified_status ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-600 font-medium">Pending</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Subject Selection */}
                {studentSubjects.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Select Subject for Verification
                      {!selectedSubject && (
                        <span className="text-xs text-orange-500 font-normal">* Required</span>
                      )}
                    </label>
                    <select
                      value={selectedSubject || ''}
                      onChange={(e) => setSelectedSubject(e.target.value || null)}
                      className={`mt-2 w-full px-4 py-3 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium transition-colors ${
                        !selectedSubject 
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' 
                          : 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      }`}
                    >
                      <option value="">-- Choose a subject --</option>
                      {studentSubjects.map((subj, index) => (
                        <option key={index} value={subj.name}>
                          {subj.name} - {subj.exam_date} at {subj.exam_time} ({subj.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    {!selectedSubject && (
                      <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Please select a subject before verifying
                      </p>
                    )}
                  </div>
                )}

                {/* Attendance Summary */}
                {studentSubjects.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 font-medium mb-2">Subject Attendance</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {studentSubjects.map((subj, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            subj.status === 'verified' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : subj.status === 'present'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{subj.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <Calendar className="w-3 h-3" />
                              <span>{subj.exam_date}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{subj.exam_time}</span>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              subj.status === 'verified'
                                ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                                : subj.status === 'present'
                                ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {subj.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Face Verification */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Face Verification
              </h2>

              {!capturedImage ? (
                <div className="space-y-4">
                  {/* Camera Preview */}
                  <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    {cameraActive ? (
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{
                          facingMode: 'user',
                          width: 640,
                          height: 480,
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={cameraActive ? captureImage : startCamera}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    {cameraActive ? 'Capture Photo' : 'Start Camera'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Captured Image */}
                  <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    <img 
                      src={capturedImage} 
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Verification Result */}
                  {verificationResult && (
                    <div className={`p-4 rounded-xl ${
                      verificationResult.verified 
                        ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                        : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {verificationResult.verified ? (
                          <UserCheck className="w-8 h-8 text-green-600" />
                        ) : (
                          <UserX className="w-8 h-8 text-red-600" />
                        )}
                        <div>
                          <p className={`font-bold ${
                            verificationResult.verified ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {verificationResult.verified ? 'PRESENT' : 'ABSENT'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {!verificationResult && (
                      <button
                        onClick={handleVerify}
                        disabled={verifying || !selectedSubject}
                        className={`flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                          selectedSubject 
                            ? 'btn-primary' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        title={!selectedSubject ? 'Please select a subject first' : ''}
                      >
                        {verifying ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ScanFace className="w-5 h-5" />
                            {!selectedSubject ? 'Select Subject First' : 'Verify Face'}
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setVerificationResult(null);
                        startCamera();
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              )}

                          </div>
          </div>
        )}

        {/* Next Student Button */}
        {(student || verificationResult) && (
          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-2 mx-auto"
            >
              <ArrowRight className="w-5 h-5" />
              Verify Next Student
            </button>
          </div>
        )}
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

export default ExaminerDashboard;
