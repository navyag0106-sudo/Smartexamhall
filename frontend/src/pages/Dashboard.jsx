import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verificationAPI, studentAPI, subjectTemplateAPI } from '../services/api';
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp,
  Plus,
  ScanFace,
  FileText,
  ArrowRight,
  Loader2,
  BookOpen,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import Toast from '../components/Toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Attendance State
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState({
    search: '',
    status: '',
    date: ''
  });
  
  // Subject Templates State
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTemplateModal, setDeleteTemplateModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    department: '',
    year: '',
    numSubjects: '',
    subjects: []
  });
  const [subjectInputs, setSubjectInputs] = useState([]); // Array of input values

  const departments = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Other'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  useEffect(() => {
    fetchDashboardData();
    fetchTemplates();
    fetchAttendanceData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await verificationAPI.getStats();
      if (statsResponse.data.status === 'success') {
        setStats(statsResponse.data.data);
      }
      
      // Fetch recent students
      const studentsResponse = await studentAPI.getAll({ limit: 5 });
      if (studentsResponse.data.status === 'success') {
        setStudents(studentsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch subject templates
  const fetchTemplates = async () => {
    try {
      const response = await subjectTemplateAPI.getAll();
      if (response.data.status === 'success') {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      
      // Fetch summary
      const summaryResponse = await verificationAPI.getAttendanceSummary();
      if (summaryResponse.data.status === 'success') {
        setAttendanceSummary(summaryResponse.data.data);
      }
      
      // Fetch recent records
      const recordsResponse = await verificationAPI.getAllAttendance({ limit: 10 });
      if (recordsResponse.data.status === 'success') {
        setAttendanceRecords(recordsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Filter attendance records
  const filterAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const params = {};
      if (attendanceFilter.search) params.search = attendanceFilter.search;
      if (attendanceFilter.status) params.status = attendanceFilter.status;
      if (attendanceFilter.date) params.date = attendanceFilter.date;
      
      const response = await verificationAPI.getAllAttendance(params);
      if (response.data.status === 'success') {
        setAttendanceRecords(response.data.data);
      }
    } catch (error) {
      console.error('Error filtering attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Template Modal Functions
  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ department: '', year: '', numSubjects: '', subjects: [] });
    setSubjectInputs([]);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    const subjects = Array.isArray(template.subjects) ? template.subjects : [];
    setTemplateForm({
      department: template.department,
      year: template.year,
      numSubjects: subjects.length,
      subjects: subjects
    });
    setSubjectInputs(subjects);
    setShowTemplateModal(true);
  };

  // Handle number of subjects change
  const handleNumSubjectsChange = (e) => {
    const num = parseInt(e.target.value) || '';
    setTemplateForm(prev => ({ ...prev, numSubjects: num }));
    
    // Create empty array of that size with name and exam_date
    if (num && num > 0) {
      setSubjectInputs(new Array(num).fill(null).map(() => ({ name: '', exam_date: '' })));
    } else {
      setSubjectInputs([]);
    }
  };

  // Handle subject name change
  const handleSubjectNameChange = (index, name) => {
    const newInputs = [...subjectInputs];
    newInputs[index] = { ...newInputs[index], name };
    setSubjectInputs(newInputs);
    
    // Update subjects array
    setTemplateForm(prev => ({
      ...prev,
      subjects: newInputs.filter(s => s.name.trim() !== '')
    }));
  };

  // Handle subject exam date change
  const handleSubjectDateChange = (index, exam_date) => {
    const newInputs = [...subjectInputs];
    newInputs[index] = { ...newInputs[index], exam_date };
    setSubjectInputs(newInputs);
    
    // Update subjects array
    setTemplateForm(prev => ({
      ...prev,
      subjects: newInputs.filter(s => s.name.trim() !== '')
    }));
  };

  const saveTemplate = async () => {
    if (!templateForm.department || !templateForm.year) {
      setToast({ message: 'Department and year are required', type: 'error' });
      return;
    }
    if (templateForm.subjects.length === 0) {
      setToast({ message: 'At least one subject is required', type: 'error' });
      return;
    }

    try {
      if (editingTemplate) {
        await subjectTemplateAPI.update(editingTemplate.id, { subjects: templateForm.subjects });
        setToast({ message: 'Template updated successfully', type: 'success' });
      } else {
        await subjectTemplateAPI.create(templateForm);
        setToast({ message: 'Template created successfully', type: 'success' });
      }
      setShowTemplateModal(false);
      fetchTemplates();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to save template', type: 'error' });
    }
  };

  const confirmDeleteTemplate = (template) => {
    setDeletingTemplate(template);
    setDeleteTemplateModal(true);
  };

  const deleteTemplate = async () => {
    try {
      await subjectTemplateAPI.delete(deletingTemplate.id);
      setToast({ message: 'Template deleted successfully', type: 'success' });
      setDeleteTemplateModal(false);
      fetchTemplates();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to delete template', type: 'error' });
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      link: '/students',
    },
    {
      title: 'Verified Today',
      value: stats?.today_verified || 0,
      icon: <UserCheck className="w-6 h-6" />,
      color: 'bg-green-500',
      link: '/logs',
    },
    {
      title: 'Pending Verification',
      value: stats?.pending_students || 0,
      icon: <UserX className="w-6 h-6" />,
      color: 'bg-yellow-500',
      link: '/students',
    },
    {
      title: 'Success Rate',
      value: `${stats?.verification_rate?.toFixed(1) || 0}%`,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-purple-500',
      link: '/logs',
    },
  ];

  const chartData = [
    { name: 'Verified', value: stats?.verified_students || 0, color: '#22c55e' },
    { name: 'Pending', value: stats?.pending_students || 0, color: '#f59e0b' },
  ];

  const verificationData = [
    { name: 'Verified', count: stats?.today_verified || 0 },
    { name: 'Failed', count: stats?.today_failed || 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {user?.name || user?.email}!
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            to="/register-student"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Register Student</p>
              <p className="text-sm text-gray-500">Add new student</p>
            </div>
          </Link>
          
          <Link
            to="/verify"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <ScanFace className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Verify Face</p>
              <p className="text-sm text-gray-500">Start verification</p>
            </div>
          </Link>
          
          <Link
            to="/logs"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">View Logs</p>
              <p className="text-sm text-gray-500">Check history</p>
            </div>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className="glass-card rounded-2xl p-6 card-hover"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} text-white p-3 rounded-xl`}>
                  {card.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Verification Status Chart */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Student Verification Status
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Verifications Chart */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Today's Verifications
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Attendance Summary Section */}
        {attendanceSummary && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Subject Attendance Overview
            </h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceSummary.total}</p>
              </div>
              <div className="glass-card rounded-xl p-4 bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-green-600 dark:text-green-400">Verified</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{attendanceSummary.verified}</p>
              </div>
              <div className="glass-card rounded-xl p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-600 dark:text-blue-400">Present</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{attendanceSummary.present}</p>
              </div>
              <div className="glass-card rounded-xl p-4 bg-purple-50 dark:bg-purple-900/20">
                <p className="text-sm text-purple-600 dark:text-purple-400">Verification Rate</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{attendanceSummary.verification_rate}%</p>
              </div>
            </div>

            {/* Department Stats */}
            {Object.keys(attendanceSummary.by_department).length > 0 && (
              <div className="glass-card rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Department</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(attendanceSummary.by_department).map(([dept, data]) => (
                    <div key={dept} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">{dept}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Verified</p>
                          <p className="font-bold text-green-600">{data.verified}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Present</p>
                          <p className="font-bold text-blue-600">{data.present}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Absent</p>
                          <p className="font-bold text-gray-600">{data.absent}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendance Records Table */}
        <div className="glass-card rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Attendance Records</h3>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by name or register no..."
                value={attendanceFilter.search}
                onChange={(e) => setAttendanceFilter(prev => ({ ...prev, search: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && filterAttendance()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <select
                value={attendanceFilter.status}
                onChange={(e) => setAttendanceFilter(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={attendanceFilter.date}
                  onChange={(e) => setAttendanceFilter(prev => ({ ...prev, date: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={filterAttendance}
                  disabled={attendanceLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {attendanceLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Filter'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Hall/Seat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
                      </td>
                    </tr>
                  ) : attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {record.students?.photo_url ? (
                              <img src={record.students.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <ScanFace className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {record.students?.name || `Student ID: ${record.student_id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.students?.register_no || 'Register number not available'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-white">{record.subject_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-white">{record.exam_date}</p>
                          <p className="text-xs text-gray-500">{record.exam_time}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-white">Hall {record.hall_no}</p>
                          <p className="text-xs text-gray-500">Seat {record.seat_no}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'verified' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            record.status === 'present' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {record.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {record.confidence ? (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {(record.confidence * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subject Templates Section */}
        <div className="glass-card rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Subject Templates
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Define subjects for each department and year. Students will auto-get these subjects.
              </p>
            </div>
            <button
              onClick={openAddTemplate}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Template
            </button>
          </div>
          
          <div className="p-6">
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No templates created yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create a template to auto-assign subjects to students
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {template.department}
                        </h4>
                        <p className="text-sm text-gray-500">{template.year}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditTemplate(template)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteTemplate(template)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {template.subjects?.slice(0, 3).map((subject, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {typeof subject === 'object' ? subject.name : subject}
                          </span>
                          {typeof subject === 'object' && subject.exam_date && (
                            <span className="text-gray-500 text-xs">
                              {new Date(subject.exam_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                      {template.subject_count > 3 && (
                        <span className="text-xs text-gray-500">
                          +{template.subject_count - 3} more subjects
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Students */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recently Registered Students
            </h3>
            <Link
              to="/students"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="table-header">Name</th>
                  <th className="table-header">Register No</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Year</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.length > 0 ? (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.photo_url}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">{student.register_no}</td>
                      <td className="table-cell">{student.department}</td>
                      <td className="table-cell">{student.year}</td>
                      <td className="table-cell">
                        {student.verified_status ? (
                          <span className="badge-success">Verified</span>
                        ) : (
                          <span className="badge-warning">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No students registered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Verification Overview */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Student Verification Overview
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Verified</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Pending</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {stats.total_students || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {stats.verified_students || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Verified Students</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {stats.total_students > 0 ? Math.round((stats.verified_students / stats.total_students) * 100) : 0}% Completion
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                    {stats.pending_students || (stats.total_students - stats.verified_students) || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pending Verification</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">Verification by Hall</h4>
                <button
                  onClick={() => {
                    // Refresh data
                    fetchDashboardData();
                    fetchAttendanceData();
                  }}
                  className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                >
                  Refresh
                  <Loader2 className="w-4 h-4" />
                </button>
              </div>
              
              {attendanceSummary && Object.keys(attendanceSummary).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(attendanceSummary.hall_stats || {}).map(([hallNo, hallData]) => (
                    <div key={hallNo} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900 dark:text-white">Hall {hallNo}</h5>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {hallData.total || 0} students
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600 dark:text-green-400">Verified</span>
                          <span className="font-medium">{hallData.verified || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                          <span className="font-medium">{(hallData.total || 0) - (hallData.verified || 0)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${hallData.total > 0 ? ((hallData.verified || 0) / hallData.total) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No verification data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingTemplate ? 'Edit Template' : 'Add Subject Template'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      value={templateForm.department}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, department: e.target.value }))}
                      disabled={editingTemplate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year
                    </label>
                    <select
                      value={templateForm.year}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, year: e.target.value }))}
                      disabled={editingTemplate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select Year</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Subjects */}
                  {!editingTemplate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Number of Subjects
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={templateForm.numSubjects}
                        onChange={handleNumSubjectsChange}
                        placeholder="Enter number of subjects"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Subject Input Fields with Dates */}
                  {subjectInputs.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enter Subjects & Exam Dates ({templateForm.subjects.length} of {subjectInputs.length} filled)
                      </label>
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {subjectInputs.map((subject, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                            <input
                              type="text"
                              value={subject.name}
                              onChange={(e) => handleSubjectNameChange(index, e.target.value)}
                              placeholder="Subject name"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                            <input
                              type="date"
                              value={subject.exam_date}
                              onChange={(e) => handleSubjectDateChange(index, e.target.value)}
                              className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTemplate}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Delete Template
                  </h2>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Delete template for <strong>{deletingTemplate?.department}</strong> -{' '}
                  <strong>{deletingTemplate?.year}</strong>?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTemplateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteTemplate}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
