"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. Now login.");
        setMode("login");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad card-narrow">
      <div className="page-head">
        <div className="page-meta">
          <h1 className="h1">{mode === "login" ? "Login" : "Create account"}</h1>
          <p className="p-muted">Use your college email if possible.</p>
        </div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}>
            Switch to {mode === "login" ? "Sign up" : "Login"}
          </button>
        </div>
      </div>

      <div className="hr" />

      {msg ? <div className="notice" style={{ marginBottom: 14 }}>{msg}</div> : null}

      <form className="form" onSubmit={submit}>
        <div className="field">
          <div className="label">Email</div>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <div className="label">Password</div>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}