import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import HealthCheck from './components/HealthCheck'; 
import Resource from './components/Resource';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />  {/* Sidebar luôn hiển thị */}

        <div className="main-content">
          <Routes>
            {/* Đặt HealthCheck là route mặc định */}
            <Route path="/" element={<HealthCheck />} />
            <Route path="/Resource"  element={<Resource />} />
            {/* Các route khác nếu có */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
