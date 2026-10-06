"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CreateEventPage() {
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState<number>(100);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setNotLoggedIn(true);
      setLoading(false);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const { data: uRes } = await supabase.auth.getUser();
    if (!uRes.user) {
      alert("Please login first.");
      setBusy(false);
      return;
    }

    if (!startTime || !endTime) {
      alert("Please select Start time and End time.");
      setBusy(false);
      return;
    }
    if (new Date(endTime).getTime() < new Date(startTime).getTime()) {
      alert("End time must be after Start time.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("events").insert({
      title,
      venue,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      capacity,
      description,
      status: "pending",
    });

    setBusy(false);

    if (error) alert(error.message);
    else {
      alert("Event submitted! Admin will approve it.");
      setTitle("");
      setVenue("");
      setStartTime("");
      setEndTime("");
      setCapacity(100);
      setDescription("");
    }
  };

  if (loading) return <div className="notice">Loading...</div>;

  if (notLoggedIn) {
    return (
      <div className="card card-pad card-narrow">
        <h1 className="h1">Create Event</h1>
        <p className="p-muted" style={{ marginTop: 6 }}>Please login to create an event.</p>
        <div className="hr" />
        <Link className="btn btn-primary" href="/login">Login</Link>
      </div>
    );
  }

  return (
    <div className="card card-pad card-narrow">
      <div className="page-head">
        <div className="page-meta">
          <h1 className="h1">Create Event</h1>
          <p className="p-muted">Submitted events are pending until approved.</p>
        </div>
        <div className="page-actions">
          <Link className="btn" href="/">Back to events</Link>
        </div>
      </div>

      <div className="hr" />

      <form className="form" onSubmit={submit}>
        <div className="field">
          <div className="label">Event title</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="form-grid">
          <div className="field">
            <div className="label">Venue</div>
            <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Capacity</div>
            <input className="input" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <div className="label">Start time</div>
            <input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div className="field">
            <div className="label">End time</div>
            <input className="input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>

        <div className="field">
          <div className="label">Description</div>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Submitting..." : "Submit for approval"}
          </button>
        </div>
      </form>
    </div>
  );
}