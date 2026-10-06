"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RegisterModal from "@/components/RegisterModal";

type EventRow = {
  id: number;
  title: string;
  venue: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  status: string | null;
};

export default function HomePage() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const isAdmin = useMemo(() => !!email && !!adminEmail && email === adminEmail, [email, adminEmail]);

  const [registeredEventIds, setRegisteredEventIds] = useState<number[]>([]);
  const registeredSet = useMemo(() => new Set(registeredEventIds), [registeredEventIds]);

  const [regEvent, setRegEvent] = useState<{ id: number; title: string } | null>(null);

  const load = async () => {
    setLoading(true);

    const { data: uRes } = await supabase.auth.getUser();
    const user = uRes.user;
    setUserId(user?.id ?? null);
    setEmail(user?.email ?? null);

    const ev = await supabase
      .from("events")
      .select("id,title,venue,start_time,end_time,capacity,status")
      .eq("status", "approved")
      .order("start_time", { ascending: true });

    if (ev.error) {
      alert(ev.error.message);
      setEvents([]);
      setLoading(false);
      return;
    }
    setEvents((ev.data as EventRow[]) ?? []);

    // load registrations only if NOT admin
    if (user && !(user.email === adminEmail)) {
      const regs = await supabase
        .from("registrations")
        .select("event_id")
        .eq("user_id", user.id);

      if (regs.error) {
        alert(regs.error.message);
        setRegisteredEventIds([]);
      } else {
        setRegisteredEventIds(((regs.data ?? []) as { event_id: number }[]).map((r) => r.event_id));
      }
    } else {
      setRegisteredEventIds([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRegisteredDone = () => {
    if (regEvent?.id) {
      setRegisteredEventIds((prev) => (prev.includes(regEvent.id) ? prev : [...prev, regEvent.id]));
    }
    setRegEvent(null);
  };

  return (
    <div className="card card-pad">
      <div className="page-head">
        <div className="page-meta">
          <h1 className="h1">Campus Events</h1>
          <p className="p-muted">Approved events are shown here.</p>
        </div>
        <div className="page-actions">
          <Link className="btn" href="/create">Create event</Link>
          <Link className="btn btn-primary" href="/my-registrations">My registrations</Link>
        </div>
      </div>

      <div className="hr" />

      {loading ? (
        <div className="notice">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="notice">No approved events yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Venue</th>
                <th>Start</th>
                <th>End</th>
                <th>Capacity</th>
                <th style={{ width: 220 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const isRegistered = registeredSet.has(e.id);

                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 950 }}>{e.title}</td>
                    <td className="p-muted">{e.venue ?? "-"}</td>
                    <td className="p-muted">{e.start_time ? new Date(e.start_time).toLocaleString() : "-"}</td>
                    <td className="p-muted">{e.end_time ? new Date(e.end_time).toLocaleString() : "-"}</td>
                    <td className="p-muted">{e.capacity ?? "-"}</td>
                    <td>
                      {!userId ? (
                        <Link className="btn btn-primary" href="/login">Login to register</Link>
                      ) : isAdmin ? (
                        <button className="btn" disabled>Admin cannot register</button>
                      ) : isRegistered ? (
                        <button className="btn" disabled>Registered</button>
                      ) : (
                        <button className="btn btn-primary" onClick={() => setRegEvent({ id: e.id, title: e.title })}>
                          Register
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RegisterModal
        open={!!regEvent}
        event={regEvent}
        onClose={() => setRegEvent(null)}
        onDone={onRegisteredDone}
      />
    </div>
  );
}