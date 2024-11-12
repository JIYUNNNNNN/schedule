import React from 'react';
import { createRoot } from 'react-dom/client'; // createRoot를 import
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';


const Root = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </Router>
  );
};

const rootElement = document.getElementById('root');
const root = createRoot(rootElement); // createRoot 사용
root.render(<Root />); // 변경된 render 메서드
