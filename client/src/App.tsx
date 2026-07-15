import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Goals = lazy(() => import('./pages/Goals'));
const Money = lazy(() => import('./pages/Money'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Talos = lazy(() => import('./pages/Talos'));
const TPOVAL = lazy(() => import('./pages/TPOVAL'));
const Travel = lazy(() => import('./pages/Travel'));

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Sidebar />
      <Main>
        <Suspense fallback={<LoadingPage />}>
          <Outlet />
        </Suspense>
      </Main>
    </AppShell>
  );
}

function LoadingPage() {
  return (
    <LoadWrap>
      <LoadDot />
    </LoadWrap>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/money" element={<Money />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/talos" element={<Talos />} />
              <Route path="/tpoval" element={<TPOVAL />} />
              <Route path="/travel" element={<Travel />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

const AppShell = styled.div`
  display: flex;
  min-height: 100vh;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Main = styled.main`
  flex: 1;
  margin-left: 220px;
  min-height: 100vh;
  background: #1C1208;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const LoadWrap = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1C1208;
`;

const LoadDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FBBF24;
  animation: pulse 1s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
`;
