import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterStudent from './pages/RegisterStudent';
import FaceVerification from './pages/FaceVerification';
import Logs from './pages/Logs';
import NotFound from './pages/NotFound';
import ExaminerManagement from './pages/ExaminerManagement';
import ExaminerDashboard from './pages/ExaminerDashboard';
import StudentManagement from './pages/StudentManagement';
import SubjectTemplateManagement from './pages/SubjectTemplateManagement';

// Role-based route component
const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes - Admin Only */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/register-student"
                  element={
                    <RoleBasedRoute allowedRoles={['admin']}>
                      <RegisterStudent />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/verify"
                  element={
                    <RoleBasedRoute allowedRoles={['admin']}>
                      <FaceVerification />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <ProtectedRoute>
                      <Logs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/examiners"
                  element={
                    <RoleBasedRoute allowedRoles={['admin']}>
                      <ExaminerManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/students"
                  element={
                    <RoleBasedRoute allowedRoles={['admin']}>
                      <StudentManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/subject-templates"
                  element={
                    <RoleBasedRoute allowedRoles={['admin']}>
                      <SubjectTemplateManagement />
                    </RoleBasedRoute>
                  }
                />

                {/* Examiner Dashboard */}
                <Route
                  path="/examiner-dashboard"
                  element={
                    <RoleBasedRoute allowedRoles={['examiner']}>
                      <ExaminerDashboard />
                    </RoleBasedRoute>
                  }
                />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
