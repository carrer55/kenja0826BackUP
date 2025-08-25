import React from 'react'
import { useAuth } from '../hooks/useAuth'
import Login from './auth/Login'
import Register from './auth/Register'
import RegisterSuccess from './auth/RegisterSuccess'
import EmailConfirmed from './auth/EmailConfirmed'
import Onboarding from './auth/Onboarding'
import PasswordReset from './auth/PasswordReset'
import Dashboard from './Dashboard'

interface AuthWrapperProps {
  children?: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading, error } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">認証エラー</h3>
            </div>
          </div>
          <div className="text-sm text-gray-700 mb-4">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // 認証済みの場合はダッシュボードを表示
  if (user) {
    return <Dashboard />
  }

  // 未認証の場合はログイン画面を表示
  return <Login onNavigate={() => {}} onLoginSuccess={() => {}} />
}

export default AuthWrapper