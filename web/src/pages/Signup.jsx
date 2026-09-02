import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="New here"
      title="Create an account"
      footer={
        <>
          Already have one?{" "}
          <Link to="/login" className="text-high underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Alert>{error}</Alert>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update("email")}
        />
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          required
          hint="Letters, numbers and underscores. This is your public handle."
          value={form.username}
          onChange={update("username")}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          value={form.password}
          onChange={update("password")}
        />
        <Button pending={pending}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
