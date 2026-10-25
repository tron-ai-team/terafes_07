import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

// Core Modes
import { AuthPage } from './pages/AuthPage';
import { ChatModePage } from './pages/ChatModePage';
import { VoiceModePage } from './pages/VoiceModePage';

// Workspace & Desktop Agent Pages
import { WorkspaceDashboardPage } from './pages/WorkspaceDashboardPage';
import { CodingAgentPage } from './pages/CodingAgentPage';
import { DevicesPage } from './pages/DevicesPage';
import { ActiveTasksPage } from './pages/ActiveTasksPage';
import { AgentTaskDetailPage } from './pages/AgentTaskDetailPage';
import { AgentHistoryPage } from './pages/AgentHistoryPage';

// Career Center Pages (Dedicated Separate Product Area)
import { CareerCenterPage } from './pages/CareerCenterPage';
import { DashboardPage } from './pages/DashboardPage'; // Interview Practice Dashboard
import { CVManagementPage } from './pages/CVManagementPage';
import { InterviewSetupPage } from './pages/InterviewSetupPage';
import { InterviewRoomPage } from './pages/InterviewRoomPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { HistoryPage } from './pages/HistoryPage';
import { AgentPage } from './pages/AgentPage'; // Interview Preparation Agent
import { CareerSearchAgentPage } from './pages/CareerSearchAgentPage'; // Job Finder

// Common Support & Settings Pages
import { AIMentorPage } from './pages/AIMentorPage';
import { AboutPage } from './pages/AboutPage';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ConnectDevicePage } from './pages/ConnectDevicePage';
import { AdminControlPage } from './pages/AdminControlPage';

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Standalone Auth & OAuth Callback Pages */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Standalone Device Authorization Pages (Desktop Agent Connect) */}
          <Route path="/connect-device" element={<ConnectDevicePage />} />
          <Route path="/devices/connect/:requestId" element={<ConnectDevicePage />} />

          {/* Main Layout containing Sidebar and TopBar */}
          <Route element={<AppLayout />}>
            {/* Root redirect to Chat Mode */}
            <Route path="/" element={<Navigate to="/chat" replace />} />

            {/* 1. CHAT MODE ROUTES */}
            <Route path="/chat" element={<ChatModePage />} />
            <Route path="/chat/:conversationId" element={<ChatModePage />} />

            {/* 2. VOICE MODE ROUTES */}
            <Route path="/voice" element={<VoiceModePage />} />

            {/* 3. WORKSPACE ROUTES (DESKTOP AGENT PLATFORM ONLY) */}
            <Route path="/workspace" element={<WorkspaceDashboardPage />} />
            <Route path="/workspace/agent" element={<CodingAgentPage />} />
            <Route path="/workspace/agent/devices" element={<DevicesPage />} />
            <Route path="/workspace/devices" element={<Navigate to="/workspace/agent/devices" replace />} />
            <Route path="/workspace/agent/tasks" element={<ActiveTasksPage />} />
            <Route path="/workspace/agent/tasks/:id" element={<AgentTaskDetailPage />} />
            <Route path="/workspace/agent/history" element={<AgentHistoryPage />} />

            {/* 4. CAREER CENTER ROUTES (SEPARATE DEDICATED PRODUCT SUITE) */}
            <Route path="/career" element={<CareerCenterPage />} />
            <Route path="/career/jobs" element={<CareerSearchAgentPage />} />
            <Route path="/career/interview" element={<DashboardPage />} />
            <Route path="/career/interview/setup" element={<InterviewSetupPage />} />
            <Route path="/career/interview/room" element={<InterviewRoomPage />} />
            <Route path="/career/interview/feedback" element={<FeedbackPage />} />
            <Route path="/career/interview-agent" element={<AgentPage />} />
            <Route path="/career/cv" element={<CVManagementPage />} />
            <Route path="/career/history" element={<HistoryPage />} />

            {/* Backward-Compatibility Redirects to Career Center */}
            <Route path="/workspace/jobs" element={<Navigate to="/career/jobs" replace />} />
            <Route path="/workspace/interview" element={<Navigate to="/career/interview" replace />} />
            <Route path="/workspace/interview/setup" element={<Navigate to="/career/interview/setup" replace />} />
            <Route path="/workspace/interview/room" element={<Navigate to="/career/interview/room" replace />} />
            <Route path="/workspace/interview/feedback" element={<Navigate to="/career/interview/feedback" replace />} />
            <Route path="/workspace/interview-agent" element={<Navigate to="/career/interview-agent" replace />} />
            <Route path="/workspace/cv" element={<Navigate to="/career/cv" replace />} />
            <Route path="/workspace/history" element={<Navigate to="/career/history" replace />} />

            {/* Legacy Deep Links */}
            <Route path="/interview" element={<Navigate to="/career/interview" replace />} />
            <Route path="/interview/setup" element={<InterviewSetupPage />} />
            <Route path="/interview/room" element={<InterviewRoomPage />} />
            <Route path="/interview/feedback" element={<FeedbackPage />} />
            <Route path="/interview/history" element={<Navigate to="/career/history" replace />} />
            <Route path="/interview/cv" element={<Navigate to="/career/cv" replace />} />
            <Route path="/cv" element={<Navigate to="/career/cv" replace />} />
            <Route path="/history" element={<Navigate to="/career/history" replace />} />
            <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
            <Route path="/agent" element={<Navigate to="/workspace/agent" replace />} />
            <Route path="/agent/interview" element={<Navigate to="/career/interview-agent" replace />} />
            <Route path="/agent/career-search" element={<Navigate to="/career/jobs" replace />} />

            {/* Common Support & Settings Routes */}
            <Route path="/mentor" element={<AIMentorPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminControlPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
