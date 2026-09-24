import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Notes from "./pages/Notes";
import Assistant from "./pages/Assistant";
import CalendarPage from "./pages/Calendar";
import Sheets from "./pages/Sheets";

function RequireAuth({ children }) {
  const token = localStorage.getItem("hr_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="candidates/:id" element={<CandidateDetail />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="notes" element={<Notes />} />
        <Route path="sheets" element={<Sheets />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="assistant/:sessionId" element={<Assistant />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
