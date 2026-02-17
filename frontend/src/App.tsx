/**
 * Main App Component
 *
 * Sets up routing and authentication context.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';

// Auth components
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Upload routes */}
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload/text"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="card max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4">Текстовый ввод</h2>
                    <p className="text-gray-600 mb-4">
                      Эта страница будет реализована в Фазе 4
                    </p>
                    <a href="/dashboard" className="btn-primary">
                      Вернуться в кабинет
                    </a>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload/voice"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="card max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4">Голосовой ввод</h2>
                    <p className="text-gray-600 mb-4">
                      Эта страница будет реализована в Фазе 4
                    </p>
                    <a href="/dashboard" className="btn-primary">
                      Вернуться в кабинет
                    </a>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
