import { useState, useEffect } from "react";
import { inspectorRequest, inspectorJob } from './inspectorApi';
import InspectorInvitation from "./components/InspectorInvitation";
import ProfileSetup from "./components/ProfileSetup";
import Welcome from "./components/Welcome";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from './components/ResetPassword';
import InspectorDashboard from "./components/InspectorDashboard";
import JobRequest from "./components/JobRequest";
import Messages from "./components/Messages";
import Profile from "./components/Profile";
import PartAnalysis from "./components/Partanalysis";
import InspectionSheet from "./components/Inspectionsheet";
import InspectorShell from "./components/InspectorShell";
import logo from "./assets/logo.png";

// Placeholder invite data — in the real app, load this from the invite link/token.
const invitation = new URLSearchParams(window.location.search);
const INVITE = { fullName: invitation.get('name') || '', email: invitation.get('email') || '', inspectorId: '' };

// Every part starts completely empty, so it shows as "To-do" until the inspector fills it in.
const mkPart = (id, name) => ({
  id, name, qty: "", type: "", make: "", model: "", serial: "", condition: "", year: "", mileage: "", comments: "", photos: [],
});

// Placeholder jobs — replace with an API call.
const INITIAL_JOBS = [
  { id: 1, status: "new", title: "Ford", address: "Sheridan Ave.", businessName: "McDonalds",
    contactName: "John Doe", email: "JohnDoe@gmail.com", businessAddress: "123 Street, 14228 Buffalo NY",
    requestDate: "mm/dd/yyyy", compensation: 0 },
  { id: 2, status: "new", title: "Site 2: Site Name", address: "Lorem Ipsum", businessName: "Acme Co.",
    contactName: "Jane Smith", email: "jane@acme.com", businessAddress: "45 Main St, Buffalo NY",
    requestDate: "mm/dd/yyyy", compensation: 0 },
  { id: 3, status: "in-progress", title: "Burger King: Site Name", address: "Buffalo Ny", businessName: "Burger King", parts: [
    mkPart("p1", "Ford F-150"),
    mkPart("p2", "Desk"),
    mkPart("p3", "3D printer"),
    mkPart("p4", "Name 4"),
    mkPart("p5", "Name 5"),
  ] },
  { id: 4, status: "submitted", title: "Site 1: Site Name", address: "Lorem Ipsum", parts: [mkPart("q1", "Ford F-150"), mkPart("q2", "Name 2")] },
];

// Placeholder thread — replace with your API. Admin replies come from the separate admin app.
const INITIAL_MESSAGES = [
  { id: "m1", from: "admin", text: "Welcome to Bison Valuation! Message me here if you have any questions about a job.",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
];

export default function App() {
  // "invite" | "setup" | "welcome" | "login" | "forgot" | "dashboard" | "job" | "parts" | "sheet"
  // Tip: change "invite" to "login" below if you want the app to open on the login screen.
  const [step, setStep] = useState(window.location.pathname.endsWith('/UpdatePass') ? 'reset' : invitation.get('token') ? 'invite' : 'checking');
  const [name, setName] = useState(INVITE.fullName);
  const [email, setEmail] = useState(INVITE.email);
  const [inspectorId, setInspectorId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobError, setJobError] = useState('');
  const loadJobs = async () => {
    const data = await inspectorRequest('/api/inspector/jobs/');
    setJobs(data.jobs.map(inspectorJob)); setInspectorId(data.inspectorId); setName(data.name); setEmail(data.email || ''); setJobError('');
  };
  const restoreSession = async () => {
    setJobError('');
    try { await loadJobs(); setStep('dashboard'); }
    catch (error) {
      if ([401, 403, 404].includes(error.status)) setStep('login');
      else setJobError('Unable to connect. Check that Django is running, then retry.');
    }
  };
  useEffect(() => {
    if (!window.location.pathname.endsWith('/UpdatePass') && !invitation.get('token')) restoreSession();
  }, []);
  const [activeId, setActiveId] = useState(null);
  const [partId, setPartId] = useState(null); // null = adding a new part
  const [tab, setTab] = useState("jobs");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const findJob = (id) => jobs.find((j) => String(j.id) === String(id));

  const setJobStatus = (id, status) =>
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, status } : j)));

  const savePart = (jobId, part) =>
    setJobs((js) => js.map((j) => {
      if (j.id !== jobId) return j;
      const parts = j.parts || [];
      return { ...j, parts: parts.some((p) => p.id === part.id) ? parts.map((p) => (p.id === part.id ? part : p)) : [...parts, part] };
    }));

  const goTab = (t) => { setTab(t); setStep("dashboard"); };

  const logout = async () => {
    try { await inspectorRequest('/api/auth/logout/', {}); }
    catch (error) { window.alert(error.message); return; }
    setJobs([]); setInspectorId(null);
    setTab("jobs");
    setActiveId(null);
    setPartId(null);
    setStep("login");
  };

  const notFound = () => {
    console.error("No job found for activeId:", activeId, jobs);
    return (
      <InspectorShell logoSrc={logo} tab={tab} onTab={goTab} userName={name} onBack={() => setStep("dashboard")}>
        <h1 className="ix__title">Job not found</h1>
      </InspectorShell>
    );
  };

  if (step === 'checking') return <div role="status" style={{ padding: 24 }}>
    {jobError || 'Restoring your session…'}
    {jobError && <button type="button" onClick={restoreSession}>Retry</button>}
  </div>;

  if (step === "invite")
    return <InspectorInvitation logoSrc={logo} onContinue={() => setStep("setup")} onLogin={() => setStep("login")} />;

  if (step === "setup")
    return (
      <ProfileSetup
        logoSrc={logo}
        fullName={INVITE.fullName}
        email={INVITE.email}
        onSubmit={async ({ fullName, email: newEmail, password, ...profile }) => {
          const token = invitation.get('token');
          if (!token) throw new Error('Open the registration link in your invitation email.');
          const csrfResponse = await fetch('/api/auth/csrf/', { credentials: 'include' });
          if (!csrfResponse.ok) throw new Error('Unable to connect to registration.');
          const { csrfToken } = await csrfResponse.json();
          const response = await fetch('/api/inspector-registration/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ token, fullName, email: newEmail, password, ...profile }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to register.');
          setName(fullName);
          setEmail(result.email);
          setInspectorId(result.inspectorId);
          if (result.status === 'Inactive') { window.alert('Registration complete. Your account is inactive. Contact your administrator to activate it.'); setStep('login'); return; }
          window.history.replaceState(null, '', window.location.pathname);
          await inspectorRequest('/api/auth/inspector-login/', { email: result.email, password });
          await loadJobs();
          setTab("jobs");
          setStep("welcome");
        }}
      />
    );

  // The inspector is already signed in at this point (registration logs them in), so Continue goes to the app.
  if (step === "welcome")
    return (
      <Welcome
        logoSrc={logo}
        name={name}
        inspectorId={inspectorId}
        onContinue={() => { setTab("jobs"); setStep("dashboard"); }}
      />
    );

  if (step === "login")
    return (
      <Login
        logoSrc={logo}
        email={email}
        onForgotPassword={() => setStep("forgot")}
        onSubmit={async ({ email: loginEmail, password }) => {
          await inspectorRequest('/api/auth/inspector-login/', { email: loginEmail, password });
          await loadJobs();
          setEmail(loginEmail);
          setTab("jobs");
          setStep("dashboard");
        }}
      />
    );

  if (step === 'reset') return <ResetPassword logoSrc={logo} onLogin={() => setStep('login')} />;
  if (step === "forgot")
    return (
      <ForgotPassword
        logoSrc={logo}
        email={email}
        onBack={() => setStep("login")}
        onSubmit={async ({ email: resetEmail }) => {
          await inspectorRequest('/api/auth/password-reset/', { email: resetEmail, app: 'inspector' });
          setEmail(resetEmail);
        }}
      />
    );

  if (step === "parts") {
    const job = findJob(activeId);
    if (!job) return notFound();
    return (
      <PartAnalysis
        job={job}
        logoSrc={logo}
        userName={name}
        onTab={goTab}
        onBack={() => setStep("dashboard")}
        onOpenPart={(p) => { setPartId(p.id); setStep("sheet"); }}
        onAddPart={() => { setPartId(null); setStep("sheet"); }}
        onComplete={async (j) => {
          await inspectorRequest(`/api/inspector/jobs/${j.id}/`, { action: 'complete', revision: j.revision });
          await loadJobs();
          setStep("dashboard");
        }}
      />
    );
  }

  if (step === "sheet") {
    const job = findJob(activeId);
    if (!job) return notFound();
    const part = partId ? (job.parts || []).find((p) => p.id === partId) : undefined;
    return (
      <InspectionSheet
        key={partId || "new"}
        job={job}
        part={part}
        logoSrc={logo}
        userName={name}
        onTab={goTab}
        onBack={() => setStep("parts")}
        onSave={async (p) => {
          const result = await inspectorRequest(`/api/inspector/jobs/${job.id}/parts/`, { part: p, revision: job.revision });
          setJobs((previous) => previous.map((entry) => entry.id === result.id ? inspectorJob(result) : entry));
          setStep("parts");
        }}
      />
    );
  }

  if (step === "job") {
    const job = findJob(activeId);
    if (!job) return notFound();
    return (
      <JobRequest
        job={job}
        logoSrc={logo}
        userName={name}
        onTab={goTab}
        onBack={() => setStep("dashboard")}
        onAccept={async (j) => {
          await inspectorRequest(`/api/inspector/jobs/${j.id}/`, { action: 'accept', revision: j.revision });
          await loadJobs();
          setStep("dashboard");
        }}
        onDecline={async (j) => {
          await inspectorRequest(`/api/inspector/jobs/${j.id}/`, { action: 'decline', revision: j.revision });
          await loadJobs();
          setStep("dashboard");
        }}
        onViewAgreement={() => window.open(`/api/inspector/jobs/${job.id}/agreement/`, '_blank', 'noopener,noreferrer')}
      />
    );
  }

  if (tab === "messages")
    return (
      <Messages
        logoSrc={logo}
        userName={name}
        tab={tab}
        onTab={setTab}
        messages={messages}
        onSend={async (text, files = []) => {
          // TODO: POST to your backend, e.g. /messages { text } — the server sets the recipient to the admin
          // and the sender from the auth token (never trust a recipient id from the client).
          // Throw an Error to mark the message "Not sent" with a Retry link.
          // TODO: upload each File to storage first (e.g. signed upload URLs), then send the returned URLs with the message.
          const attachments = files.map((f, i) => ({
            id: `att${Date.now()}${i}`, name: f.name, url: URL.createObjectURL(f), // demo: local preview URL
            type: f.type.startsWith("video/") ? "video" : "image",
          }));
          const mine = { id: `m${Date.now()}`, from: "inspector", text, attachments, createdAt: new Date().toISOString() };
          setMessages((m) => [...m, mine]);

          // DEMO ONLY: fake an admin reply. Delete this and load real replies via polling/websocket.
          setTimeout(() => {
            setMessages((m) => [...m, { id: `a${Date.now()}`, from: "admin", text: "Thanks, got your message. I'll get back to you shortly.", createdAt: new Date().toISOString() }]);
          }, 1500);
        }}
      />
    );

  if (tab === "profile")
    return (
      <Profile
        onProfileSaved={(profile) => { setName(profile.name); setEmail(profile.email); }}
        logoSrc={logo}
        tab={tab}
        onTab={setTab}
        name={name}
        email={email}
        inspectorId={inspectorId}
        jobs={jobs}
        onLogout={logout}
      />
    );

  return (
    <InspectorDashboard
      jobs={jobs}
      logoSrc={logo}
      userName={name}
      tab={tab}
      onTab={setTab}
      onOpenJob={(j) => { setActiveId(j.id); setStep("job"); }}
      onOpenCurrent={(j) => { setActiveId(j.id); setStep("parts"); }}
    />
  );
}
