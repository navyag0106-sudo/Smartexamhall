import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  ScanFace, 
  Users, 
  FileCheck, 
  ArrowRight,
  CheckCircle,
  Lock,
  Zap
} from 'lucide-react';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <ScanFace className="w-8 h-8" />,
      title: 'Face Recognition',
      description: 'Advanced AI-powered face recognition technology for accurate student verification.',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure Access',
      description: 'Role-based authentication ensuring only authorized personnel can access the system.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Student Management',
      description: 'Easy registration and management of student records with photo uploads.',
    },
    {
      icon: <FileCheck className="w-8 h-8" />,
      title: 'Verification Logs',
      description: 'Comprehensive logging of all verification attempts with export capabilities.',
    },
  ];

  const benefits = [
    'Eliminates manual hall ticket verification',
    'Prevents impersonation and proxy attendance',
    'Fast and contactless entry process',
    'Real-time verification status tracking',
    'Detailed analytics and reporting',
    'Mobile-friendly responsive design',
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-bg-light dark:gradient-bg-dark" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-400/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              <span>Next-Gen Exam Security</span>
            </div>
            
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Smart Exam Hall
              <span className="block text-transparent bg-clip-text gradient-bg">
                Verification System
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
              Secure, fast, and reliable face recognition technology for modern exam hall entry verification. 
              Replace manual processes with AI-powered automation.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary inline-flex items-center justify-center gap-2 text-lg">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-primary inline-flex items-center justify-center gap-2 text-lg">
                    Admin Login
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/verify" className="btn-outline inline-flex items-center justify-center gap-2 text-lg">
                    Quick Verify
                    <ScanFace className="w-5 h-5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Key Features
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need for secure and efficient exam hall verification
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card rounded-2xl p-8 card-hover"
              >
                <div className="w-14 h-14 gradient-bg rounded-xl flex items-center justify-center text-white mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose Our System?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Our Smart Exam Hall Verification System offers numerous advantages over traditional 
                manual verification methods, ensuring security, efficiency, and accuracy.
              </p>
              
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 gradient-bg rounded-3xl transform rotate-3 opacity-20" />
              <div className="relative glass-card rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                    <Lock className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">99.8%</h3>
                    <p className="text-gray-600 dark:text-gray-400">Verification Accuracy</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-400">Average Verification Time</span>
                    <span className="font-semibold text-gray-900 dark:text-white">&lt; 2 seconds</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-400">Students Registered</span>
                    <span className="font-semibold text-gray-900 dark:text-white">10,000+</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-400">Successful Verifications</span>
                    <span className="font-semibold text-gray-900 dark:text-white">50,000+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gradient-bg rounded-3xl p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Secure Your Exams?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join hundreds of institutions using our Smart Exam Hall Verification System 
              to ensure fair and secure examinations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isAuthenticated ? "/dashboard" : "/login"}
                className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-400" />
              <span className="text-white font-semibold">SmartExamVerify</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Smart Exam Hall Verification System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
