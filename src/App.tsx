import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import './App.css'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TeamDetails from './pages/TeamDetails'
import CreateTeam from './pages/CreateTeam'
import CreateHatim from './pages/CreateHatim'
import HatimDetails from './pages/HatimDetails'
import NotFound from './pages/NotFound'

import Navbar from './components/Navbar'
import AuthGuard from './components/AuthGuard'

function App() {
  const [user, setUser] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setAuthReady(true)
    })

    return () => unsubscribe()
  }, [])

  if (!authReady) {
    return <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

            <Route path="/dashboard" element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            } />
            <Route path="/teams/create" element={
              <AuthGuard>
                <CreateTeam />
              </AuthGuard>
            } />
            <Route path="/teams/:teamId" element={
              <AuthGuard>
                <TeamDetails />
              </AuthGuard>
            } />
            <Route path="/teams/:teamId/hatim/create" element={
              <AuthGuard>
                <CreateHatim />
              </AuthGuard>
            } />
            <Route path="/teams/:teamId/hatim/:hatimId" element={
              <AuthGuard>
                <HatimDetails />
              </AuthGuard>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
