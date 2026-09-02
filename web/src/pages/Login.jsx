import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // If ProtectedRoute bounced them here, send them back where they were going.
  const destination = location.state?.from ?? "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(identifier, password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          No account yet?{" "}
          <Link to="/signup" className="text-high underline underline-offset-4">
            Make your first list
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Alert>{error}</Alert>
        <Field
          label="Email or username"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button pending={pending}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
