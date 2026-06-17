import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import NotificationToast from '@/components/NotificationToast';
import WebSocketProvider from '@/components/WebSocketProvider';
import Home from '@/pages/Home';
import Nearby from '@/pages/Nearby';
import Fences from '@/pages/Fences';
import Track from '@/pages/Track';
import Heatmap from '@/pages/Heatmap';

export default function App() {
  return (
    <Router>
      <div className="h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden">
        <WebSocketProvider />
        <Navbar />
        <main className="pt-16 h-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nearby" element={<Nearby />} />
            <Route path="/fences" element={<Fences />} />
            <Route path="/track" element={<Track />} />
            <Route path="/heatmap" element={<Heatmap />} />
          </Routes>
        </main>
        <NotificationToast />
      </div>
    </Router>
  );
}
