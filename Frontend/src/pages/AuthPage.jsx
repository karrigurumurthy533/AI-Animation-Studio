import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow } from "../components/ui";
import { loginSchema, registerSchema } from "../schemas/forms";
import { useAuthStore } from "../store/useAuthStore";

export default function AuthPage({ register = false }) {
  const [submissionError, setSubmissionError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const createAccount = useAuthStore((s) => s.register);
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(register ? registerSchema : loginSchema), mode: "onTouched" });
  const submit = handleSubmit(async (values) => {
    setSubmissionError("");
    try {
      if (register) await createAccount(values);
      else await login(values);
      const destination = location.state?.from?.pathname || "/studio";
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmissionError(error.message || "We couldn't sign you in. Please try again.");
    }
  });
  return (
    <section className="auth-page">
      <div className="auth-art"><div className="art-ring ring-a"/><div className="art-light"/><div className="auth-cube"/><div className="auth-art-note"><Eyebrow>CREATION / IN PROGRESS</Eyebrow><p>There's a whole world<br/>behind the first image.</p></div></div>
      <div className="auth-panel">
        <Eyebrow>{register ? "YOUR STUDIO BEGINS" : "WELCOME BACK"}</Eyebrow>
        <h1>{register ? "Create your account" : "Step back into the studio."}</h1>
        <p>{register ? "Set up your workspace and begin building." : "Your next frame is right where you left it."}</p>
        <form onSubmit={submit} noValidate>
          {register && <label>Full name<input {...field("name")} autoComplete="name" placeholder="Your name" aria-invalid={!!errors.name}/>{errors.name && <small className="field-error">{errors.name.message}</small>}</label>}
          <label>Email address<input {...field("email")} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email}/>{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
          <label>Password<input {...field("password")} type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="At least 8 characters" aria-invalid={!!errors.password}/>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
          {register && <label>Confirm password<input {...field("confirmPassword")} type="password" autoComplete="new-password" placeholder="Repeat your password" aria-invalid={!!errors.confirmPassword}/>{errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}</label>}
          {!register && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}
          <button className="button auth-submit" disabled={isSubmitting}>{isSubmitting ? "Connecting..." : register ? "Create account" : "Log in"}<ArrowUpRight size={15}/></button>
          {submissionError && <small className="form-error" role="alert">{submissionError}</small>}
        </form>
        <p className="auth-switch">{register ? "Already have an account?" : "New to the studio?"} <Link to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p>
      </div>
    </section>
  );
}
