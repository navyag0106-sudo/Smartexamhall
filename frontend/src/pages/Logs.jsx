import { useState, useEffect } from 'react';
import { logsAPI } from '../services/api';
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import Toast from '../components/Toast';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState(null);
  
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, resultFilter, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const params = {
        limit,
        offset: page * limit,
      };
      
      if (resultFilter) params.result = resultFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await logsAPI.getAll(params);
      
      if (response.data.status === 'success') {
        setLogs(response.data.data);
        setTotalCount(response.data.total);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setToast({ message: 'Failed to fetch logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Search is handled client-side for better UX
    // In production, you might want to debounce and search server-side
    fetchLogs();
  };

  const handleExport = () => {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (resultFilter) params.result = resultFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    logsAPI.exportCSV(params);
    setToast({ message: 'Export started...', type: 'success' });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setResultFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
    fetchLogs();
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const student = log.students || {};
    const query = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(query) ||
      student.register_no?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Verification Logs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and export verification history
            </p>
          </div>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or register no..."
                className="input-field pl-12"
              />
            </div>

            {/* Result Filter */}
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Results</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From Date"
                className="input-field pl-12"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To Date"
                className="input-field pl-12"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="table-header">Student</th>
                      <th className="table-header">Register No</th>
                      <th className="table-header">Department</th>
                      <th className="table-header">Result</th>
                      <th className="table-header">Confidence</th>
                      <th className="table-header">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => {
                        const student = log.students || {};
                        return (
                          <tr 
                            key={log.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <td className="table-cell">
                              <div className="flex items-center gap-3">
                                {student.photo_url ? (
                                  <img
                                    src={student.photo_url}
                                    alt={student.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                )}
                                <span className="font-medium">{student.name || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="table-cell">{student.register_no || 'N/A'}</td>
                            <td className="table-cell">{student.department || 'N/A'}</td>
                            <td className="table-cell">
                              {log.result === 'verified' ? (
                                <span className="badge-success flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="badge-error flex items-center gap-1 w-fit">
                                  <XCircle className="w-3 h-3" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="table-cell">
                              {log.confidence ? `${log.confidence.toFixed(1)}%` : 'N/A'}
                            </td>
                            <td className="table-cell">
                              {log.created_at ? format(new Date(log.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No logs found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Try adjusting your filters
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalCount)} of {totalCount} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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

export default Logs;
