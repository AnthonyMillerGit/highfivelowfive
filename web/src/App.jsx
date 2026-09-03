import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import ListPage from "./pages/ListPage";
import NewList from "./pages/NewList";
import EditList from "./pages/EditList";
import NewTake from "./pages/NewTake";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public: reading a list or a profile needs no account. */}
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/u/:username/:slug" element={<ListPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/u/:username/:slug/take"
            element={
              <ProtectedRoute>
                <NewTake />
              </ProtectedRoute>
            }
          />
          <Route
            path="/u/:username/:slug/edit"
            element={
              <ProtectedRoute>
                <EditList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new"
            element={
              <ProtectedRoute>
                <NewList />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
