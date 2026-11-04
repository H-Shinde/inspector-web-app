import { useState } from "react";
import InspectorInvitation from "./components/InspectorInvitation";
import ProfileSetup from "./components/ProfileSetup";
import Welcome from "./components/Welcome";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import InspectorDashboard from "./components/InspectorDashboard";
import JobRequest from "./components/JobRequest";
import Messages from "./components/Messages";
import Profile from "./components/Profile";
import PartAnalysis from "./components/Partanalysis";
import InspectionSheet from "./components/Inspectionsheet";
import InspectorShell from "./components/InspectorShell";
import logo from "./assets/logo.png";

// Placeholder invite data — in the real app, load this from the invite link/token.
const INVITE = { fullName: "John Doe", email: "jdoe@gmail.com", inspectorId: "BASE_INSP_0001" };

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
  const [step, setStep] = useState("invite");
  const [name, setName] = useState(INVITE.fullName);
  const [email, setEmail] = useState(INVITE.email);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
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

  const logout = () => {
    // TODO: clear your auth token / session here.
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

  if (step === "invite")
    return <InspectorInvitation logoSrc={logo} onContinue={() => setStep("setup")} onLogin={() => setStep("login")} />;

  if (step === "setup")
    return (
      <ProfileSetup
        logoSrc={logo}
        fullName={INVITE.fullName}
        email={INVITE.email}
        onSubmit={async ({ fullName, email: newEmail, password }) => {
          // TODO: call your backend here to create the account. It should return a session/token so the
          // inspector is signed in automatically. Throw an Error to show a message on the form.
          console.log("register", fullName, newEmail);
          setName(fullName);
          setEmail(newEmail);
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
        inspectorId={INVITE.inspectorId}
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
          // TODO: call your backend here; throw an Error("Incorrect email or password.") to show it on the form.
          console.log("login", loginEmail);
          setEmail(loginEmail);
          setTab("jobs");
          setStep("dashboard");
        }}
      />
    );

  if (step === "forgot")
    return (
      <ForgotPassword
        logoSrc={logo}
        email={email}
        onBack={() => setStep("login")}
        onSubmit={async ({ email: resetEmail }) => {
          // TODO: call your backend to email a reset link. Always show success, even if the email
          // isn't registered, so the form can't be used to find out who has an account.
          console.log("reset password for", resetEmail);
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
          // TODO: backend call to submit the inspection
          setJobStatus(j.id, "submitted");
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
          // TODO: backend call (upload photos first, then save the part)
          savePart(job.id, p);
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
          // TODO: backend call
          setJobStatus(j.id, "in-progress");
          setStep("dashboard");
        }}
        onDecline={async (j) => {
          // TODO: backend call
          setJobs((js) => js.filter((x) => x.id !== j.id));
          setStep("dashboard");
        }}
        onViewAgreement={() => console.log("open engagement agreement")}
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
        logoSrc={logo}
        tab={tab}
        onTab={setTab}
        name={name}
        email={email}
        inspectorId={INVITE.inspectorId}
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