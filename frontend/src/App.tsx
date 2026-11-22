import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import RealtimeVideoAnalysis from './pages/RealtimeVideoAnalysis';
import Opponents from './pages/Opponents';
import Matches from './pages/Matches';
import TacticalIntelligence from './pages/TacticalIntelligence';
import Players from './pages/Players';
import Heatmaps from './pages/Heatmaps';
import Reports from './pages/Reports';
import DataManagement from './pages/DataManagement';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/video-analysis" replace />} />
            <Route path="/video-analysis" element={<RealtimeVideoAnalysis />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/opponents" element={<Opponents />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/tactical-intelligence" element={<TacticalIntelligence />} />
            <Route path="/players" element={<Players />} />
            <Route path="/heatmaps" element={<Heatmaps />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
