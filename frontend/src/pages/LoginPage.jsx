import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import "./auth.css";

function errorText(error) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Bitte füllen Sie alle Felder aus.");
      return;
    }

    setLoading(true);
    try {
      await login({ username: trimmedUsername, password });
      navigate("/wardrobe");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page auth-page">
      <div className="auth-card">
        <h1>Anmelden</h1>
        <p className="muted">
          Melden Sie sich an, um Ihre Garderobe zu verwalten.
        </p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              Benutzername
            </label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={error ? "true" : undefined}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Passwort
            </label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? "true" : undefined}
            />
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Anmelden …" : "Anmelden"}
          </button>
        </form>
        <p className="auth-switch muted">
          Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
        </p>
      </div>
    </section>
  );
}
