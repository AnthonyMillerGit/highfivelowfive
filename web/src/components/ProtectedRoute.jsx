import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Wraps routes that need a signed-in user. While the token is being verified
 *  we render nothing rather than redirecting, or a refresh on a protected page
 *  would kick the user to /login every time. */
export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return null;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
