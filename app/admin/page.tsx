"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type EventRow = {
  id: number;
  title: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  certificate_template_path: string | null;
};

type RegRow = {
  id: number;
  user_id: string;
  event_id: number;
  reg_no: string | null;
  student_name: string | null;
  attendance: boolean;
  certificate_path: string | null;
  created_at: string;
};

const digitsOnly = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

function fitFontSize(font: any, text: string, maxWidth: number, startSize: number) {
  let size = startSize;
  while (size > 12 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

export default function AdminPage() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<EventRow[]>([]);
  const [approved, setApproved] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const [regs, setRegs] = useState<RegRow[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const isAdmin = useMemo(() => !!email && !!adminEmail && email === adminEmail, [email, adminEmail]);
  const selectedEvent = useMemo(
    () => approved.find((e) => e.id === selectedEventId) ?? null,
    [approved, selectedEventId]
  );

  const load = async () => {
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    setEmail(u.user?.email ?? null);

    const p = await supabase
      .from("events")
      .select("id,title,start_time,end_time,status,certificate_template_path")
      .eq("status", "pending")
      .order("start_time", { ascending: true });

    const a = await supabase
      .from("events")
      .select("id,title,start_time,end_time,status,certificate_template_path")
      .eq("status", "approved")
      .order("start_time", { ascending: false });

    if (p.error) alert(p.error.message);
    if (a.error) alert(a.error.message);

    setPending((p.data as EventRow[]) ?? []);
    setApproved((a.data as EventRow[]) ?? []);
    setLoading(false);
  };

  const loadRegistrations = async (eventId: number) => {
    const { data, error } = await supabase
      .from("registrations")
      .select("id,user_id,event_id,reg_no,student_name,attendance,certificate_path,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) alert(error.message);
    setRegs((data as RegRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadRegistrations(selectedEventId);
  }, [selectedEventId]);

  const updateEventStatus = async (id: number, status: "approved" | "rejected") => {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) alert(error.message);
    else load();
  };

  const uploadTemplate = async (eventId: number, file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${eventId}/template.${ext}`;

    const up = await supabase.storage.from("cert-templates").upload(path, file, { upsert: true });
    if (up.error) {
      alert(up.error.message);
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ certificate_template_path: path })
      .eq("id", eventId);

    if (error) alert(error.message);
    else {
      alert("Template uploaded!");
      await load();
    }
  };

  const fetchTemplateBytes = async (templatePath: string) => {
    const signed = await supabase.storage.from("cert-templates").createSignedUrl(templatePath, 60);
    if (signed.error) throw new Error(signed.error.message);

    const res = await fetch(signed.data.signedUrl);
    if (!res.ok) throw new Error("Failed to fetch template");
    return new Uint8Array(await res.arrayBuffer());
  };

  // IMPORTANT: This places NAME in the blank space under "presented to"
  const generateCertificatePdf = async (templateBytes: Uint8Array, templateExt: string, payload: {
    studentName: string;
    regNo: string;
    eventTitle: string;
    eventDate: string;
  }) => {
    const pdfDoc = await PDFDocument.create();

    let embeddedImg: any;
    if (templateExt.toLowerCase().includes("jpg") || templateExt.toLowerCase().includes("jpeg")) {
      embeddedImg = await pdfDoc.embedJpg(templateBytes);
    } else {
      embeddedImg = await pdfDoc.embedPng(templateBytes);
    }

    const { width, height } = embeddedImg.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImg, { x: 0, y: 0, width, height });

    const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const infoFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const nameText = payload.studentName.toUpperCase();

    // These Y values are tuned for the template you sent (1024x768 style)
    const nameY = height * 0.43;     // blank space line
    const regY = height * 0.385;     // slightly below name

    // Gold-ish color
    const gold = rgb(0.88, 0.75, 0.42);

    // Fit name to 80% width
    const maxWidth = width * 0.8;
    const baseSize = Math.min(46, Math.max(26, Math.round(width * 0.04)));
    const nameSize = fitFontSize(nameFont, nameText, maxWidth, baseSize);

    const nameWidth = nameFont.widthOfTextAtSize(nameText, nameSize);
    const nameX = (width - nameWidth) / 2;

    page.drawText(nameText, {
      x: nameX,
      y: nameY,
      size: nameSize,
      font: nameFont,
      color: gold,
    });

    const regLine = `Reg No: ${payload.regNo}`;
    const regSize = Math.max(14, Math.round(width * 0.016));
    const regWidth = infoFont.widthOfTextAtSize(regLine, regSize);
    const regX = (width - regWidth) / 2;

    page.drawText(regLine, {
      x: regX,
      y: regY,
      size: regSize,
      font: infoFont,
      color: rgb(0.9, 0.9, 0.9),
    });

    // (Optional) event/date small text at bottom-left
    page.drawText(`${payload.eventTitle} • ${payload.eventDate}`, {
      x: width * 0.08,
      y: height * 0.08,
      size: 12,
      font: infoFont,
      color: rgb(0.85, 0.85, 0.85),
    });

    return await pdfDoc.save();
  };

  const generateAndUploadForStudent = async (r: RegRow) => {
    if (!selectedEvent) throw new Error("Select an event first");
    if (!selectedEvent.certificate_template_path) throw new Error("Upload template first");
    if (!r.attendance) throw new Error("Student must be Present");

    const regNo = digitsOnly(r.reg_no);
    if (!regNo) throw new Error("Missing reg_no");
    const studentName = (r.student_name ?? "").trim();
    if (!studentName) throw new Error("Missing student_name");

    const templatePath = selectedEvent.certificate_template_path;
    const ext = templatePath.split(".").pop() || "png";
    const templateBytes = await fetchTemplateBytes(templatePath);

    const eventDate = selectedEvent.start_time
      ? new Date(selectedEvent.start_time).toLocaleDateString()
      : new Date().toLocaleDateString();

    const pdfBytes = await generateCertificatePdf(templateBytes, ext, {
      studentName,
      regNo,
      eventTitle: selectedEvent.title,
      eventDate,
    });

    const certPath = `${selectedEvent.id}/${regNo}.pdf`;

    const upload = await supabase.storage
      .from("certificates")
      .upload(certPath, new Blob([pdfBytes], { type: "application/pdf" }), { upsert: true });

    if (upload.error) throw new Error(upload.error.message);

    const { error } = await supabase
      .from("registrations")
      .update({ certificate_path: certPath })
      .eq("id", r.id);

    if (error) throw new Error(error.message);
  };

  const toggleAttendance = async (r: RegRow) => {
    if (!selectedEvent) return;

    const newValue = !r.attendance;
    setBusyId(r.id);

    const { error } = await supabase.from("registrations").update({ attendance: newValue }).eq("id", r.id);
    if (error) {
      setBusyId(null);
      alert(error.message);
      return;
    }

    // If marking Present => auto-generate certificate (if template exists)
    try {
      if (newValue && selectedEvent.certificate_template_path) {
        await generateAndUploadForStudent({ ...r, attendance: true });
      }
    } catch (e: any) {
      alert(`Attendance saved, but certificate not generated: ${e?.message ?? e}`);
    }

    setBusyId(null);
    await loadRegistrations(selectedEvent.id);
  };

  const generateAllForPresent = async () => {
    if (!selectedEvent) return;
    if (!selectedEvent.certificate_template_path) {
      alert("Upload template first.");
      return;
    }

    const targets = regs.filter((r) => r.attendance && !r.certificate_path);
    if (targets.length === 0) {
      alert("No pending certificates (all present students already have certificates).");
      return;
    }

    setBulkBusy(true);

    let ok = 0;
    const failed: string[] = [];

    for (const r of targets) {
      try {
        await generateAndUploadForStudent(r);
        ok++;
      } catch (e: any) {
        failed.push(`${r.reg_no ?? r.id}: ${e?.message ?? e}`);
      }
    }

    setBulkBusy(false);
    await loadRegistrations(selectedEvent.id);

    alert(`Generated: ${ok}\nFailed: ${failed.length}\n\n${failed.slice(0, 10).join("\n")}`);
  };

  if (loading) return <div className="notice">Loading...</div>;
  if (!email) return <div className="notice">Please login to access Admin.</div>;
  if (!isAdmin) return <div className="notice">Access denied. Not an admin account.</div>;

  const presentCount = regs.filter((x) => x.attendance).length;

  return (
    <div className="card card-pad">
      <div className="page-meta">
        <h1 className="h1">Admin</h1>
        <p className="p-muted">Upload template • Mark Present • Auto-generate certificates</p>
      </div>

      <div className="hr" />

      <h2 style={{ margin: 0, fontWeight: 950 }}>Pending events</h2>
      <div style={{ marginTop: 12 }}>
        {pending.length === 0 ? (
          <div className="notice">No pending events.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Start</th>
                  <th>End</th>
                  <th style={{ width: 260 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 950 }}>{e.title}</td>
                    <td className="p-muted">{e.start_time ? new Date(e.start_time).toLocaleString() : "-"}</td>
                    <td className="p-muted">{e.end_time ? new Date(e.end_time).toLocaleString() : "-"}</td>
                    <td style={{ display: "flex", gap: 10, paddingTop: 10, paddingBottom: 10 }}>
                      <button className="btn btn-primary" onClick={() => updateEventStatus(e.id, "approved")}>Approve</button>
                      <button className="btn btn-danger" onClick={() => updateEventStatus(e.id, "rejected")}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="hr" />

      <h2 style={{ margin: 0, fontWeight: 950 }}>Attendance & Certificates</h2>
      <p className="p-muted" style={{ marginTop: 6 }}>Select an approved event.</p>

      <div style={{ marginTop: 12, maxWidth: 520 }}>
        <select
          className="select"
          value={selectedEventId ?? ""}
          onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Select event...</option>
          {approved.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} {e.certificate_template_path ? "✅ template" : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent ? (
        <div style={{ marginTop: 16 }}>
          <div className="notice">
            Total registrations: <b>{regs.length}</b> • Present: <b>{presentCount}</b>
          </div>

          <div className="hr" />

          <div>
            <h3 style={{ margin: 0, fontWeight: 950 }}>Upload certificate template (one time)</h3>
            <p className="p-muted" style={{ marginTop: 6 }}>
              Upload PNG/JPG. Student name will be printed in the blank space when you mark Present.
            </p>

            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadTemplate(selectedEvent.id, f);
                e.currentTarget.value = "";
              }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="p-muted">
                Template: {selectedEvent.certificate_template_path ? selectedEvent.certificate_template_path : "Not uploaded"}
              </span>
              <button className="btn btn-primary" disabled={bulkBusy} onClick={generateAllForPresent}>
                {bulkBusy ? "Generating..." : "Generate for ALL Present (missing only)"}
              </button>
            </div>
          </div>

          <div className="hr" />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Attendance</th>
                  <th>Certificate</th>
                </tr>
              </thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 950 }}>{r.reg_no ?? "-"}</td>
                    <td>{r.student_name ?? "-"}</td>
                    <td>
                      <button className="btn" disabled={busyId === r.id} onClick={() => toggleAttendance(r)}>
                        {r.attendance ? "Present" : "Mark present"}
                      </button>
                    </td>
                    <td>
                      {r.certificate_path ? <span className="badge badge-ok">Generated</span> : <span className="badge">Not generated</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-muted" style={{ marginTop: 10 }}>
            If the name is not exactly in the blank space, tell me “move up/down/left/right”, I’ll give exact numbers to change.
          </div>
        </div>
      ) : null}
    </div>
  );
}