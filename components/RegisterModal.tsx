"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  event: { id: number; title: string } | null;
  onDone: () => void;
};

export default function RegisterModal({ open, onClose, event, onDone }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [regNo, setRegNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState<number>(1);
  const [phone, setPhone] = useState("");

  if (!open || !event) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const { data: uRes } = await supabase.auth.getUser();
    const user = uRes.user;

    if (!user) {
      alert("Please login first.");
      setBusy(false);
      router.push("/login");
      return;
    }

    const { data: existing, error: exErr } = await supabase
      .from("registrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle();

    if (exErr) {
      alert(exErr.message);
      setBusy(false);
      return;
    }
    if (existing?.id) {
      alert("You already registered for this event.");
      setBusy(false);
      onDone();
      return;
    }

    const { error } = await supabase.from("registrations").insert({
      user_id: user.id,
      event_id: event.id,
      reg_no: regNo,
      student_name: studentName,
      department,
      section,
      year,
      phone,
    });

    setBusy(false);

    if (error) alert(error.message);
    else {
      alert("Registered successfully!");
      onDone();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal card card-pad" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="page-meta">
            <h2 className="h1" style={{ fontSize: 20 }}>
              Register for: {event.title}
            </h2>
            <p className="p-muted">Fill your details to complete registration.</p>
          </div>
          <button className="btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="hr" />

        <form className="form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <div className="label">Register number</div>
              <input className="input" value={regNo} onChange={(e) => setRegNo(e.target.value)} required />
            </div>
            <div className="field">
              <div className="label">Student name</div>
              <input className="input" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <div className="label">Department</div>
              <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} required />
            </div>
            <div className="field">
              <div className="label">Section</div>
              <input className="input" value={section} onChange={(e) => setSection(e.target.value)} />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <div className="label">Year</div>
              <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                <option value={1}>1st year</option>
                <option value={2}>2nd year</option>
                <option value={3}>3rd year</option>
                <option value={4}>4th year</option>
              </select>
            </div>
            <div className="field">
              <div className="label">Phone</div>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Registering..." : "Confirm Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}