import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PredictionPage } from '@/pages/PredictionPage';
import { RotationPage } from '@/pages/RotationPage';
import { DistrictPage } from '@/pages/DistrictPage';
import { DataPage } from '@/pages/DataPage';
import { ModelInfoPage } from '@/pages/ModelInfoPage';
import { MethodologyPage } from '@/pages/MethodologyPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/predict" element={<PredictionPage />} />
            <Route path="/rotation" element={<RotationPage />} />
            <Route path="/district" element={<DistrictPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/model" element={<ModelInfoPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
