import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';

// Public Landing Page
import { LandingPage } from './pages/LandingPage';

// Core Modes
import { AuthPage } from './pages/AuthPage';
import { ChatModePage } from './pages/ChatModePage';
import { VoiceModePage } from './pages/VoiceModePage';

// Career Center — core surfaces only in public routing
import { CareerCenterPage } from './pages/CareerCenterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CVManagementPage } from './pages/CVManagementPage';
import { InterviewSetupPage } from './pages/InterviewSetupPage';
import { InterviewRoomPage } from './pages/InterviewRoomPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { HistoryPage } from './pages/HistoryPage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { CvBuilderPage } from './pages/CvBuilderPage';

// Common Support & Settings Pages
import { AboutPage } from './pages/AboutPage';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ConnectDevicePage } from './pages/ConnectDevicePage';
import { AdminControlPage } from './pages/AdminControlPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FeatureUnavailablePage } from './pages/FeatureUnavailablePage';

/**
 * NOTE: Workspace / Desktop Agent / Job Finder / Company Analysis / Mentor / Interview Agent
 * page modules remain in src/pages/ for future development. Public routes intentionally
 * render FeatureUnavailablePage instead of deleting those implementations.
 */

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Public Root & Landing Page Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/features" element={<LandingPage defaultSection="features" />} />
          <Route path="/models" element={<LandingPage defaultSection="models" />} />
          <Route path="/pricing" element={<LandingPage defaultSection="pricing" />} />

          {/* Standalone Auth & OAuth Callback Pages */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Standalone Device Authorization Pages (Desktop Agent Connect) — preserve protocol */}
          <Route path="/connect-device" element={<ConnectDevicePage />} />
          <Route path="/devices/connect/:requestId" element={<ConnectDevicePage />} />

          <Route path="/404" element={<NotFoundPage />} />

          {/* Main Layout containing Sidebar and TopBar */}
          <Route element={<AppLayout />}>
            {/* 1. CHAT MODE ROUTES */}
            <Route
              path="/chat"
              element={
                <RequireAuth featureName="AI Chat" featureNameJa="AIチャット">
                  <ChatModePage />
                </RequireAuth>
              }
            />
            <Route
              path="/chat/:conversationId"
              element={
                <RequireAuth featureName="AI Chat" featureNameJa="AIチャット">
                  <ChatModePage />
                </RequireAuth>
              }
            />

            {/* 2. VOICE MODE ROUTES */}
            <Route
              path="/voice"
              element={
                <RequireAuth featureName="AI Voice" featureNameJa="AI音声">
                  <VoiceModePage />
                </RequireAuth>
              }
            />

            {/* 3. WORKSPACE / DESKTOP AGENT — hidden; page source preserved under src/pages/ */}
            <Route path="/workspace" element={<FeatureUnavailablePage />} />
            <Route path="/workspace/agent" element={<FeatureUnavailablePage />} />
            <Route path="/workspace/agent/devices" element={<FeatureUnavailablePage />} />
            <Route path="/workspace/devices" element={<Navigate to="/workspace/agent/devices" replace />} />
            <Route path="/workspace/agent/tasks" element={<FeatureUnavailablePage />} />
            <Route path="/workspace/agent/tasks/:id" element={<FeatureUnavailablePage />} />
            <Route path="/workspace/agent/history" element={<FeatureUnavailablePage />} />

            {/* 4. CAREER CENTER — core interview / CV / profile */}
            <Route
              path="/career"
              element={
                <RequireAuth featureName="Career tools" featureNameJa="キャリア機能">
                  <CareerCenterPage />
                </RequireAuth>
              }
            />
            <Route
              path="/career/profile"
              element={
                <RequireAuth featureName="Candidate Profile" featureNameJa="候補者プロフィール">
                  <CandidateProfilePage />
                </RequireAuth>
              }
            />
            <Route path="/career/jobs" element={<FeatureUnavailablePage />} />
            <Route
              path="/career/interview"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/career/interview/setup"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <InterviewSetupPage />
                </RequireAuth>
              }
            />
            <Route
              path="/career/interview/room"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <InterviewRoomPage />
                </RequireAuth>
              }
            />
            <Route
              path="/career/interview/feedback"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <FeedbackPage />
                </RequireAuth>
              }
            />
            <Route path="/career/interview-agent" element={<FeatureUnavailablePage />} />
            <Route path="/career/company-analysis" element={<FeatureUnavailablePage />} />
            <Route
              path="/career/cv"
              element={
                <RequireAuth featureName="CV drafts" featureNameJa="履歴書管理">
                  <CVManagementPage />
                </RequireAuth>
              }
            />
            <Route
              path="/career/cv-builder"
              element={
                <RequireAuth featureName="AI CV Builder" featureNameJa="AI履歴書ビルダー">
                  <CvBuilderPage />
                </RequireAuth>
              }
            />
            <Route
              path="/career/history"
              element={
                <RequireAuth featureName="Interview History" featureNameJa="面接履歴">
                  <HistoryPage />
                </RequireAuth>
              }
            />

            {/* Backward-Compatibility Redirects */}
            <Route path="/workspace/jobs" element={<Navigate to="/career/jobs" replace />} />
            <Route path="/workspace/interview" element={<Navigate to="/career/interview" replace />} />
            <Route path="/workspace/interview/setup" element={<Navigate to="/career/interview/setup" replace />} />
            <Route path="/workspace/interview/room" element={<Navigate to="/career/interview/room" replace />} />
            <Route path="/workspace/interview/feedback" element={<Navigate to="/career/interview/feedback" replace />} />
            <Route path="/workspace/interview-agent" element={<Navigate to="/career/interview-agent" replace />} />
            <Route path="/workspace/cv" element={<Navigate to="/career/cv" replace />} />
            <Route path="/workspace/history" element={<Navigate to="/career/history" replace />} />

            {/* Legacy Deep Links → core routes */}
            <Route path="/interview" element={<Navigate to="/career/interview" replace />} />
            <Route
              path="/interview/setup"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <InterviewSetupPage />
                </RequireAuth>
              }
            />
            <Route
              path="/interview/room"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <InterviewRoomPage />
                </RequireAuth>
              }
            />
            <Route
              path="/interview/feedback"
              element={
                <RequireAuth featureName="Interview Practice" featureNameJa="面接練習">
                  <FeedbackPage />
                </RequireAuth>
              }
            />
            <Route path="/interview/history" element={<Navigate to="/career/history" replace />} />
            <Route path="/interview/cv" element={<Navigate to="/career/cv" replace />} />
            <Route path="/cv" element={<Navigate to="/career/cv-builder" replace />} />
            <Route path="/history" element={<Navigate to="/career/history" replace />} />
            <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
            <Route path="/agent" element={<FeatureUnavailablePage />} />
            <Route path="/agent/interview" element={<Navigate to="/career/interview" replace />} />
            <Route path="/agent/career-search" element={<Navigate to="/career/jobs" replace />} />

            {/* Common Support & Settings Routes */}
            <Route path="/mentor" element={<FeatureUnavailablePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route
              path="/settings"
              element={
                <RequireAuth featureName="Settings" featureNameJa="設定">
                  <SettingsPage />
                </RequireAuth>
              }
            />
            <Route path="/admin" element={<AdminControlPage />} />
            <Route
              path="/profile"
              element={
                <RequireAuth featureName="Profile" featureNameJa="プロフィール">
                  <ProfilePage />
                </RequireAuth>
              }
            />
          </Route>

          {/* Genuine unknown paths → branded 404 (not Home redirect) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
