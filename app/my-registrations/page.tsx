"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EventObj = {
  id: number;
  title: string;
  start_time: string | null;
};

type Row = {
  id: number;
  created_at: string;
  attendance: boolean;
  certificate_path: string | null;
  event: EventObj | null;
};

type RowFromDb = Omit<Row, "event"> & {
  event: EventObj | EventObj[] | null;
};

export default function MyRegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setNotLoggedIn(false);

    const { data: uRes, error: uErr } = await supabase.auth.getUser();
    const user = uRes.user;

    if (uErr || !user) {
      setNotLoggedIn(true);
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("registrations")
      .select("id,created_at,attendance,certificate_path,event:events(id,title,start_time)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const raw = (data ?? []) as unknown as RowFromDb[];

    const normalized: Row[] = raw.map((r) => ({
      ...r,
      event: Array.isArray(r.event) ? r.event[0] ?? null : r.event ?? null,
    }));

    setRows(normalized);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const downloadCertificate = async (row: Row) => {
    if (!row.attendance) {
      alert("Certificate available only for Present students.");
      return;
    }
    if (!row.certificate_path) {
      alert("Certificate not generated yet.");
      return;
    }

    setDownloadingId(row.id);

    const { data, error } = await supabase.storage
      .from("certificates")
      .createSignedUrl(row.certificate_path, 60);

    setDownloadingId(null);

    if (error) {
      alert(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) return <div className="notice">Loading...</div>;

  if (notLoggedIn) {
    return (
      <div className="card card-pad card-narrow">
        <h1 className="h1">My Registrations</h1>
        <p className="p-muted" style={{ marginTop: 6 }}>Please login to view your registrations.</p>
        <div className="hr" />
        <Link className="btn btn-primary" href="/login">Login</Link>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <div className="page-head">
        <div className="page-meta">
          <h1 className="h1">My Registrations</h1>
          <p className="p-muted">Certificates can be downloaded only after you are marked Present.</p>
        </div>
        <div className="page-actions">
          <Link className="btn" href="/">Back</Link>
        </div>
      </div>

      <div className="hr" />

      {rows.length === 0 ? (
        <div className="notice">No registrations yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Start</th>
                <th>Attendance</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 950 }}>{r.event?.title ?? "Event"}</td>
                  <td className="p-muted">
                    {r.event?.start_time ? new Date(r.event.start_time).toLocaleString() : "-"}
                  </td>
                  <td>
                    {r.attendance ? <span className="badge badge-ok">Present</span> : <span className="badge">Not marked</span>}
                  </td>
                  <td>
                    {r.attendance && r.certificate_path ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => downloadCertificate(r)}
                        disabled={downloadingId === r.id}
                      >
                        {downloadingId === r.id ? "Preparing..." : "Download"}
                      </button>
                    ) : (
                      <span className="p-muted">{r.attendance ? "Not generated yet" : "Eligible after Present"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}