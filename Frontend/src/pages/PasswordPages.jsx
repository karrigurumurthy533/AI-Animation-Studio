import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow } from "../components/ui";
import { forgotPasswordSchema, resetPasswordSchema } from "../schemas/forms";
import { authApi } from "../services/api";

function PasswordLayout({title,description,children}) {
  return <section className="password-page"><div className="password-card"><Eyebrow>ACCOUNT ACCESS</Eyebrow><h1>{title}</h1><p>{description}</p>{children}<Link className="password-back" to="/login">Back to sign in</Link></div></section>;
}
export function ForgotPassword() {
  const [sent,setSent]=useState(false); const [error,setError]=useState("");
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm({resolver:zodResolver(forgotPasswordSchema),mode:"onTouched"});
  const submit=handleSubmit(async(values)=>{setError("");try{await authApi.forgotPassword(values);setSent(true)}catch(err){setError(err.message||"Unable to request a password reset right now.")}});
  return <PasswordLayout title={sent?"Check your inbox.":"Reset your password."} description={sent?"If an account matches that email, a reset link will be sent.":"Enter the email address associated with your studio account."}>{sent?<div className="password-success"><p>For your security, this message does not confirm whether an account exists.</p><button className="button" onClick={()=>setSent(false)}>Try another email <ArrowUpRight size={15}/></button></div>:<form onSubmit={submit} noValidate><label>Email address<input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email}/>{errors.email&&<small>{errors.email.message}</small>}</label><button className="button" disabled={isSubmitting}>{isSubmitting?"Sending...":"Send reset link"}<ArrowUpRight size={15}/></button>{error&&<small role="alert">{error}</small>}</form>}</PasswordLayout>;
}
export function ResetPassword() {
  const [search]=useSearchParams();const navigate=useNavigate();const [error,setError]=useState("");
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm({resolver:zodResolver(resetPasswordSchema),mode:"onTouched",defaultValues:{token:search.get("token")||""}});
  const submit=handleSubmit(async(values)=>{setError("");try{await authApi.resetPassword(values);navigate("/login",{replace:true,state:{notice:"Password updated. Sign in with your new password."}})}catch(err){setError(err.message||"This reset link is invalid or expired.")}});
  return <PasswordLayout title="Choose a new password." description="Use at least 8 characters. Reset links expire for your account's security."><form onSubmit={submit} noValidate><input type="hidden" {...register("token")}/>{!search.get("token")&&<small className="form-error">A reset token is required. Request a new link first.</small>}<label>New password<input {...register("new_password")} type="password" autoComplete="new-password" placeholder="At least 8 characters" aria-invalid={!!errors.new_password}/>{errors.new_password&&<small>{errors.new_password.message}</small>}</label><label>Confirm new password<input {...register("confirm_password")} type="password" autoComplete="new-password" placeholder="Repeat your password" aria-invalid={!!errors.confirm_password}/>{errors.confirm_password&&<small>{errors.confirm_password.message}</small>}</label><button className="button" disabled={isSubmitting||!search.get("token")}>{isSubmitting?"Updating...":"Update password"}<ArrowUpRight size={15}/></button>{error&&<small role="alert">{error}</small>}</form></PasswordLayout>;
}
