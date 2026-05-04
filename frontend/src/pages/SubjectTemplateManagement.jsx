import { useState, useEffect } from 'react';
import { subjectTemplateAPI } from '../services/api';
import { 
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Calendar
} from 'lucide-react';
import Toast from '../components/Toast';

const SubjectTemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    department: '',
    year: '',
    subjects: []
  });
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentExamDate, setCurrentExamDate] = useState('');
  const [currentExamTime, setCurrentExamTime] = useState('09:00');

  const departments = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Other'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await subjectTemplateAPI.getAll();
      if (response.data.status === 'success') {
        setTemplates(response.data.data);
      }
    } catch (error) {
      setToast({ 
        message: error.response?.data?.message || 'Failed to fetch templates', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Open add modal
  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData({
      department: '',
      year: '',
      subjects: []
    });
    setCurrentSubject('');
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      department: template.department,
      year: template.year,
      subjects: Array.isArray(template.subjects) ? template.subjects : []
    });
    setCurrentSubject('');
    setShowModal(true);
  };

  // Add subject
  const addSubject = () => {
    if (currentSubject.trim()) {
      const subjectObj = {
        name: currentSubject.trim(),
        exam_date: currentExamDate || '',
        exam_time: currentExamTime || '09:00'
      };
      
      // Check if subject already exists
      const exists = formData.subjects.some(s => 
        typeof s === 'object' ? s.name === currentSubject.trim() : s === currentSubject.trim()
      );
      
      if (!exists) {
        setFormData(prev => ({
          ...prev,
          subjects: [...prev.subjects, subjectObj]
        }));
        setCurrentSubject('');
        setCurrentExamDate('');
        setCurrentExamTime('09:00');
      } else {
        setToast({ message: 'Subject already exists in the list', type: 'warning' });
      }
    }
  };

  // Remove subject
  const removeSubject = (subjectToRemove) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => 
        typeof s === 'object' ? s.name !== subjectToRemove.name : s !== subjectToRemove
      )
    }));
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubject();
    }
  };

  // Save template
  const handleSave = async () => {
    if (!formData.department || !formData.year) {
      setToast({ message: 'Department and year are required', type: 'error' });
      return;
    }
    if (formData.subjects.length === 0) {
      setToast({ message: 'At least one subject is required', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      if (editingTemplate) {
        // Update existing
        const response = await subjectTemplateAPI.update(editingTemplate.id, {
          subjects: formData.subjects
        });
        if (response.data.status === 'success') {
          setToast({ message: 'Template updated successfully', type: 'success' });
        }
      } else {
        // Create new
        const response = await subjectTemplateAPI.create({
          department: formData.department,
          year: formData.year,
          subjects: formData.subjects
        });
        if (response.data.status === 'success') {
          setToast({ message: 'Template created successfully', type: 'success' });
        }
      }
      
      setShowModal(false);
      fetchTemplates();
    } catch (error) {
      setToast({ 
        message: error.response?.data?.message || 'Failed to save template', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Open delete modal
  const handleDeleteClick = (template) => {
    setDeletingTemplate(template);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await subjectTemplateAPI.delete(deletingTemplate.id);
      setToast({ message: 'Template deleted successfully', type: 'success' });
      setDeleteModalOpen(false);
      fetchTemplates();
    } catch (error) {
      setToast({ 
        message: error.response?.data?.message || 'Failed to delete template', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Subject Templates
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage subjects for each department and year combination
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Template
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && templates.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
              <p className="text-sm mt-1">Create a template to auto-assign subjects to students</p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.department}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {template.year}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(template)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-sm text-gray-500">
                    {template.subject_count} subject{template.subject_count !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1">
                  {template.subjects?.slice(0, 5).map((subject, idx) => {
                    const subjectName = typeof subject === 'object' ? subject.name : subject;
                    const examDate = typeof subject === 'object' ? subject.exam_date : '';
                    const examTime = typeof subject === 'object' ? subject.exam_time : '';
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span className="font-medium">{subjectName}</span>
                        {(examDate || examTime) && (
                          <span className="text-purple-600 dark:text-purple-400">
                            {examDate}{examTime ? ` ${examTime}` : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {template.subject_count > 5 && (
                    <span className="text-xs text-gray-500">
                      +{template.subject_count - 5} more
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingTemplate ? 'Edit Template' : 'Add Subject Template'}
              </h2>
              
              <div className="space-y-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    disabled={editingTemplate}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    disabled={editingTemplate}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Subjects */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subjects ({formData.subjects.length} added)
                  </label>
                  <div className="space-y-2 mb-2">
                    {/* Subject Name Input */}
                    <input
                      type="text"
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                      placeholder="Enter subject name"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    
                    {/* Exam Date and Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={currentExamDate}
                        onChange={(e) => setCurrentExamDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        title="Exam Date"
                      />
                      <input
                        type="time"
                        value={currentExamTime}
                        onChange={(e) => setCurrentExamTime(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        title="Exam Time"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={addSubject}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </button>
                  </div>
                  
                  {/* Display added subjects */}
                  {formData.subjects.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.subjects.map((subject, index) => {
                        const subjectName = typeof subject === 'object' ? subject.name : subject;
                        const examDate = typeof subject === 'object' ? subject.exam_date : '';
                        const examTime = typeof subject === 'object' ? subject.exam_time : '';
                        
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-purple-800 dark:text-purple-300">
                                {subjectName}
                              </div>
                              {(examDate || examTime) && (
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  {examDate && <span>{examDate}</span>}
                                  {examDate && examTime && <span> at </span>}
                                  {examTime && <span>{examTime}</span>}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSubject(typeof subject === 'object' ? subject : { name: subject })}
                              className="ml-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
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
                Are you sure you want to delete the template for{' '}
                <strong>{deletingTemplate?.department}</strong> -{' '}
                <strong>{deletingTemplate?.year}</strong>?
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
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
  );
};

export default SubjectTemplateManagement;
