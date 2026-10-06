import { useState } from "react";
import InspectorInvitation from "./components/InspectorInvitation";
import ProfileSetup from "./components/ProfileSetup";
import Welcome from "./components/Welcome";
import logo from "./assets/logo.png";

// Placeholder invite data — in the real app, load this from the invite link/token.
const INVITE = { fullName: "John Doe", email: "jdoe@gmail.com", inspectorId: "BASE_INSP_0001" };

export default function App() {
  const [step, setStep] = useState("invite"); // "invite" | "setup" | "welcome"
  const [name, setName] = useState(INVITE.fullName);

  if (step === "invite")
    return <InspectorInvitation logoSrc={logo} onContinue={() => setStep("setup")} />;

  if (step === "setup")
    return (
      <ProfileSetup
        logoSrc={logo}
        fullName={INVITE.fullName}
        email={INVITE.email}
        onSubmit={async ({ fullName, email, password }) => {
          // TODO: call your backend here; throw an Error to show a message on the form.
          console.log("register", fullName, email);
          setName(fullName);
          setStep("welcome");
        }}
      />
    );

  return (
    <Welcome
      logoSrc={logo}
      name={name}
      inspectorId={INVITE.inspectorId}
      onContinue={() => console.log("go to login")}
    />
  );
}