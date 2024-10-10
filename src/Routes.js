// import React from 'react';
// import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
// import Login from './Login';
// import Calendar from './Calendar';

// const AppRoutes = () => {
//   const isLoggedIn = Boolean(localStorage.getItem('token')); // 토큰이 있으면 로그인된 것으로 간주

//   return (
//     <Router>
//       <Routes>
//         <Route path="/login" element={isLoggedIn ? <Navigate to="/calendar" /> : <Login />} />
//         <Route path="/calendar" element={isLoggedIn ? <Calendar /> : <Navigate to="/login" />} />
//         <Route path="/" element={<Navigate to="/login" />} />
//       </Routes>
//     </Router>
//   );
// };

// export default AppRoutes;
