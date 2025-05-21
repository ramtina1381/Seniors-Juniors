// App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage'
import Decoms from './pages/Decoms';
import JHA from './pages/JHA'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decoms" element={<Decoms />} />
        <Route path="/jha" element={<JHA />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
