"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
  const [email, setEmail] = useState<string | null>(null);

  const isAdmin = useMemo(() => !!email && !!adminEmail && email === adminEmail, [email, adminEmail]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-logo">
            <img src="/logo.png" alt="Logo" />
          </span>
          <span className="brand-text">Dhanalakshmi Srinivasan University</span>
        </Link>

        <div className="nav-links">
          <Link className="nav-link" href="/">Events</Link>
          <Link className="nav-link" href="/create">Create</Link>
          <Link className="nav-link" href="/my-registrations">My Registrations</Link>

          {/* Admin link ONLY for admin */}
          {isAdmin ? <Link className="nav-link" href="/admin">Admin</Link> : null}

          {email ? (
            <>
              <span className="nav-link">{email}</span>
              <button className="btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link className="btn btn-primary" href="/login">Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}