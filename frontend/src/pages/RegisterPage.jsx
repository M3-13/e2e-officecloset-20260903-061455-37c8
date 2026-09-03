import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import "./auth.css";

function errorText(error) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmedUsername || !trimmedEmail || !password) {
      setError("Bitte füllen Sie alle Felder aus.");
      return;
    }

    setLoading(true);
    try {
      await register({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });
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
        <h1>Registrieren</h1>
        <p className="muted">
          Erstellen Sie ein Konto und beginnen Sie, Ihre Garderobe zu verwalten.
        </p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="register-username">
              Benutzername
            </label>
            <input
              id="register-username"
              className="form-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={error ? "true" : undefined}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              E-Mail
            </label>
            <input
              id="register-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? "true" : undefined}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Passwort
            </label>
            <input
              id="register-password"
              className="form-input"
              type="password"
              autoComplete="new-password"
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
            {loading ? "Registrieren …" : "Registrieren"}
          </button>
        </form>
        <p className="auth-switch muted">
          Bereits ein Konto? <Link to="/login">Anmelden</Link>
        </p>
      </div>
    </section>
  );
}
