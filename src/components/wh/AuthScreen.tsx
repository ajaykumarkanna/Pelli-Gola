import { useState } from "react";
import { Heart, Copy, Check, ArrowRight, Users } from "lucide-react";
import { authCreate, authJoin } from "@/lib/wh.functions";
import type { WeddingSession } from "@/lib/wh-types";

type Mode = "landing" | "create" | "join" | "created";

export function AuthScreen({ onSession }: { onSession: (s: WeddingSession) => void }) {
  const [mode, setMode] = useState<Mode>("landing");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<WeddingSession | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "create") {
        if (password.length < 4) throw new Error("Password must be at least 4 characters");
        const s = await authCreate({ data: { password } });
        setCreated(s);
        setMode("created");
      } else if (mode === "join") {
        const s = await authJoin({ data: { inviteCode: code, password } });
        onSession(s);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-radial-gradient(ellipse at center, var(--background), var(--secondary)/30)">
      {/* Golden garland strip on Auth screen */}
      <div className="fixed top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent via-primary to-accent z-50" />

      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center relative z-10">
        <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/40">
          <div className="size-11 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-primary">
            {/* Traditional Lotus Motif */}
            <svg
              className="size-6 text-accent"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M50,15 C40,35 15,40 15,50 C15,60 40,65 50,85 C60,65 85,60 85,50 C85,40 60,35 50,15 Z" />
              <circle cx="50" cy="50" r="10" stroke="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-serif font-extrabold tracking-wide text-primary">
              Shubh Vivah
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Auspicious Wedding Planner</p>
          </div>
        </div>

        {/* Traditional Card container */}
        <div className="wh-card !p-6 shadow-xl border border-accent/30 bg-gradient-to-br from-card to-secondary/10 relative overflow-hidden">
          {/* Traditional corner border patterns */}
          <div className="absolute top-2 left-2 size-4 border-t-2 border-l-2 border-accent/30" />
          <div className="absolute top-2 right-2 size-4 border-t-2 border-r-2 border-accent/30" />
          <div className="absolute bottom-2 left-2 size-4 border-b-2 border-l-2 border-accent/30" />
          <div className="absolute bottom-2 right-2 size-4 border-b-2 border-r-2 border-accent/30" />

          {mode === "landing" && (
            <div className="space-y-5 py-2 relative z-10 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
                  Subha Mangalyam
                </span>
                <h2 className="text-2xl font-serif font-black leading-tight text-primary mt-2">
                  One Shared Room for Your Auspicious Journey
                </h2>
                <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
                  Plan your sacred celebrations together in real time. Budget, checklist, vendors,
                  and ideas in one calm, elegant space. No signup — just a private room and your
                  shared password.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <Btn primary onClick={() => setMode("create")}>
                  Create Wedding Room <ArrowRight className="size-4" />
                </Btn>
                <Btn onClick={() => setMode("join")}>
                  <Users className="size-4 text-primary" /> Join Wedding Room
                </Btn>
              </div>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4 py-2 relative z-10">
              <button
                onClick={() => setMode("landing")}
                className="text-xs font-bold text-primary hover:underline"
              >
                ← Back
              </button>
              <h2 className="text-xl font-serif font-bold text-primary">Begin Your Planning</h2>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Pick a private shared password. You will share this password alongside an invite
                code with your partner to plan together.
              </p>
              <Field label="Shared Password">
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="wh-input !bg-card"
                />
              </Field>
              {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
              <Btn primary disabled={busy} onClick={submit}>
                {busy ? "Creating Room…" : "Create Wedding Room"}
              </Btn>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4 py-2 relative z-10">
              <button
                onClick={() => setMode("landing")}
                className="text-xs font-bold text-primary hover:underline"
              >
                ← Back
              </button>
              <h2 className="text-xl font-serif font-bold text-primary">Enter Wedding Hub</h2>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Enter the 6-character room invite code and your shared password to start planning
                with your partner.
              </p>
              <Field label="Invite Code">
                <input
                  autoFocus
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCXYZ"
                  className="wh-input !bg-card font-mono-num tracking-[0.4em] uppercase text-center text-lg font-bold"
                />
              </Field>
              <Field label="Shared Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="wh-input !bg-card"
                />
              </Field>
              {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
              <Btn primary disabled={busy} onClick={submit}>
                {busy ? "Joining Room…" : "Enter Wedding Room"}
              </Btn>
            </div>
          )}

          {mode === "created" && created && (
            <div className="space-y-5 py-2 relative z-10 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-success">
                  Auspicious Room Ready ✨
                </span>
                <h2 className="text-xl font-serif font-bold text-primary mt-2">
                  Your Room is Ready!
                </h2>
                <p className="mt-2 text-xs text-muted-foreground font-medium leading-relaxed">
                  Share this sacred invite code with your partner. They will need both this invite
                  code and your shared password to join and edit.
                </p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {created.inviteCode.split("").map((c, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl bg-card border border-accent/40 flex items-center justify-center font-mono-num text-xl font-bold text-primary"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <Btn onClick={copy}>
                {copied ? (
                  <>
                    <Check className="size-4 text-success" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4 text-primary" /> Copy Invite Code
                  </>
                )}
              </Btn>
              <div className="rounded-xl bg-secondary/60 border border-accent/25 px-4 py-3 text-xs text-muted-foreground font-medium text-center">
                Your partner needs <span className="text-primary font-bold">both</span> the invite
                code and the password to enter.
              </div>
              <Btn primary onClick={() => onSession(created)}>
                Enter Wedding Hub <ArrowRight className="size-4" />
              </Btn>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] font-bold tracking-wide text-muted-foreground mt-8 relative z-10">
        Subha Mangalyam · Happy Planning!
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Btn({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "w-full h-[52px] px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 " +
        (primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          : "bg-card border border-border hover:bg-secondary text-foreground")
      }
    >
      {children}
    </button>
  );
}
