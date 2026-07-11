import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Inbox,
  DollarSign,
  CheckSquare,
  Store,
  Heart,
  LogOut,
  Plus,
  Trash2,
  Calendar,
  Globe,
  Phone,
  ArrowRight,
  ListChecks,
  Sparkles,
} from "lucide-react";
import type { BudgetItem, InboxItem, SavedLink, Task, Vendor, LinkCategory } from "@/lib/wh-types";
import { BUDGET_CATEGORIES, LINK_CATEGORIES, VENDOR_CATEGORIES } from "@/lib/wh-types";
import {
  daysUntil,
  detectType,
  extractDomain,
  extractNumber,
  formatINR,
  formatWeddingDate,
  newId,
  relativeTime,
  type Store as WhStore,
} from "@/lib/wh-store";

type TabId = "home" | "inbox" | "budget" | "tasks" | "vendors";

export function MainApp({ store }: { store: WhStore }) {
  const [tab, setTab] = useState<TabId>("home");
  const { session, data, syncing, logout } = store;

  const openTasks = data.tasks.filter((t) => t.status === "todo").length;
  const uncheckedList = data.checklist.filter((c) => !c.done).length;
  const inboxBadge = data.inbox.length + data.links.length;
  const tasksBadge = openTasks + uncheckedList;

  // Traditional South Indian greetings
  const title = tab === "home" ? "Shubh Vivah" : tab[0].toUpperCase() + tab.slice(1);
  const dateLabel = data.weddingDate ? formatWeddingDate(data.weddingDate) : "";
  const days = data.weddingDate ? daysUntil(data.weddingDate) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* South Indian Garland / Kolam border border indicator */}
      <div className="h-1.5 w-full bg-gradient-to-r from-accent via-primary to-accent" />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/90 border-b border-border shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-serif font-bold tracking-wide text-primary truncate">
              {title}
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono-num truncate font-medium">
              {dateLabel
                ? `${dateLabel} · ${days > 0 ? `${days} auspicious days to go` : days === 0 ? "Today is the Auspicious Day!" : `${-days} days ago`}`
                : "Set your wedding date to begin the auspicious planning"}
            </p>
          </div>
          {openTasks > 0 && (
            <span className="wh-chip animate-pulse" data-tone="primary">
              {openTasks} pending
            </span>
          )}
          <span
            aria-label={syncing ? "Syncing" : "Idle"}
            className={
              "size-2 rounded-full " +
              (syncing ? "bg-accent animate-ping" : "bg-primary opacity-40")
            }
          />
          <button
            onClick={logout}
            className="wh-icon-btn hover:scale-105 transition-transform"
            data-danger="true"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl px-4 py-4">
          {tab === "home" && <HomeTab store={store} goto={setTab} />}
          {tab === "inbox" && <InboxTab store={store} />}
          {tab === "budget" && <BudgetTab store={store} />}
          {tab === "tasks" && <TasksTab store={store} />}
          {tab === "vendors" && <VendorsTab store={store} />}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur-md safe-bottom shadow-lg">
        <div className="mx-auto max-w-2xl grid grid-cols-5 h-[62px]">
          <NavBtn
            active={tab === "home"}
            onClick={() => setTab("home")}
            icon={<LayoutDashboard />}
            label="Home"
          />
          <NavBtn
            active={tab === "inbox"}
            onClick={() => setTab("inbox")}
            icon={<Inbox />}
            label="Inbox"
            badge={inboxBadge}
          />
          <NavBtn
            active={tab === "budget"}
            onClick={() => setTab("budget")}
            icon={<DollarSign />}
            label="Budget"
          />
          <NavBtn
            active={tab === "tasks"}
            onClick={() => setTab("tasks")}
            icon={<CheckSquare />}
            label="Tasks"
            badge={tasksBadge}
          />
          <NavBtn
            active={tab === "vendors"}
            onClick={() => setTab("vendors")}
            icon={<Store />}
            label="Vendors"
          />
        </div>
      </nav>

      {/* Invite code footer bubble */}
      {session && (
        <div
          className="fixed top-3 right-3 md:top-4 md:right-4 z-40 pointer-events-none opacity-0"
          aria-hidden
        />
      )}
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "relative flex flex-col items-center justify-center gap-0.5 transition-all " +
        (active
          ? "text-primary scale-105 font-semibold"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      <span className="size-5 [&>svg]:size-5">{icon}</span>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute top-1 right-[calc(50%-24px)] min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono-num flex items-center justify-center font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// ============= HOME =============
function HomeTab({ store, goto }: { store: WhStore; goto: (t: TabId) => void }) {
  const { data, setWeddingDate, session } = store;
  const [showPicker, setShowPicker] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const totalBudget = data.budget.reduce((a, b) => a + b.estimatedCost, 0);
  const paid = data.budget.reduce((a, b) => a + b.advancePaid, 0);
  const openTasks = data.tasks.filter((t) => t.status === "todo").length;
  const bookedVendors = data.vendors.filter((v) => v.status === "Booked").length;
  const checklistDone = data.checklist.filter((c) => c.done).length;
  const checklistPct = data.checklist.length
    ? Math.round((checklistDone / data.checklist.length) * 100)
    : 0;

  const submitQuickNote = () => {
    const text = quickNote.trim();
    if (!text) return;
    const item: InboxItem = {
      id: newId("inb"),
      text,
      timestamp: new Date().toISOString(),
      type: detectType(text),
    };
    store.update("inbox", (prev) => [item, ...prev]);
    setQuickNote("");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Wedding date banner */}
      <div className="wh-card !p-6 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border-accent/40 shadow-sm relative overflow-hidden">
        {/* Subtle decorative zari side lines */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-accent/40" />
        <div className="absolute top-0 bottom-0 right-0 w-1 bg-accent/40" />

        {!data.weddingDate ? (
          <div className="text-center py-4 relative z-10">
            {/* Elegant South Indian Geometric Kolam / Lotus motif SVG */}
            <svg
              className="mx-auto size-12 text-accent mb-3"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M50,15 C40,35 15,40 15,50 C15,60 40,65 50,85 C60,65 85,60 85,50 C85,40 60,35 50,15 Z" />
              <circle cx="50" cy="50" r="10" stroke="currentColor" />
              <path
                d="M50,5 C25,25 5,50 5,50 C5,50 25,75 50,95 C75,75 95,50 95,50 C95,50 75,25 50,5 Z"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </svg>
            <h3 className="text-lg font-serif font-bold text-primary mb-1">Auspicious Vivaha</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Every beautiful journey begins with a date.
            </p>
            <button
              onClick={() => setShowPicker(true)}
              className="wh-btn hover:scale-105 transition-transform"
              data-variant="primary"
            >
              Set wedding date
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full text-left relative z-10 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground/80 font-mono-num">
                  The Auspicious Date
                </p>
                <p className="text-3xl font-serif font-black text-primary mt-1.5 font-mono-num group-hover:text-primary/80 transition-colors">
                  {formatWeddingDate(data.weddingDate)}
                </p>
                <p className="text-accent-foreground font-semibold text-sm mt-1.5 flex items-center gap-1">
                  <Sparkles className="size-3.5 text-accent animate-pulse" />{" "}
                  {daysUntil(data.weddingDate)} days to go
                </p>
              </div>
              <div className="size-12 rounded-full border border-accent/30 bg-card flex items-center justify-center group-hover:bg-accent/10 transition-all">
                <svg
                  className="size-7 text-accent"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M50,15 C40,35 15,40 15,50 C15,60 40,65 50,85 C60,65 85,60 85,50 C85,40 60,35 50,15 Z" />
                  <circle cx="50" cy="50" r="10" stroke="currentColor" />
                </svg>
              </div>
            </div>
          </button>
        )}
        {showPicker && (
          <div className="mt-4 pt-4 border-t border-border/60 animate-fade-in relative z-10">
            <input
              type="date"
              value={data.weddingDate?.slice(0, 10) ?? ""}
              onChange={(e) => {
                setWeddingDate(e.target.value);
              }}
              className="wh-input !bg-card"
            />
            <div className="flex justify-end mt-2">
              <button
                className="text-xs font-semibold text-primary hover:underline px-2 py-1"
                onClick={() => setShowPicker(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Quick Capture Note Field */}
      <div className="wh-card">
        <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-accent" /> Quick thoughts & Ideas
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitQuickNote();
            }}
            placeholder="Type quote, vendor name, or a quick todo..."
            className="wh-input flex-1 !min-height-[44px] !h-[44px] text-sm"
          />
          <button
            onClick={submitQuickNote}
            disabled={!quickNote.trim()}
            className="wh-btn !min-height-[44px] !h-[44px] !px-4"
            data-variant="secondary"
          >
            Capture
          </button>
        </div>
      </div>

      {/* Redesigned completely interactive stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Budget total" value={formatINR(totalBudget)} onClick={() => goto("budget")} />
        <Stat label="Paid" value={formatINR(paid)} tone="success" onClick={() => goto("budget")} />
        <Stat label="Open tasks" value={openTasks} onClick={() => goto("tasks")} />
        <Stat label="Vendors booked" value={bookedVendors} onClick={() => goto("vendors")} />
      </div>

      {/* Checklist progress */}
      <button
        onClick={() => goto("tasks")}
        className="wh-card w-full text-left hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            <span className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors">
              Vivaha Checklist
            </span>
          </div>
          <span className="font-mono-num text-sm text-muted-foreground font-semibold">
            {checklistDone} / {data.checklist.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${checklistPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono-num font-medium">
          {checklistPct}% complete · Tap to view tasks
        </p>
      </button>

      {/* Recent inbox */}
      <SectionCard
        title="Recent notes"
        action={data.inbox.length ? { label: "View all", onClick: () => goto("inbox") } : undefined}
      >
        {data.inbox.length === 0 ? (
          <EmptyRow
            icon={<Inbox className="size-4" />}
            text="No notes yet — type in Quick Capture above"
          />
        ) : (
          <ul className="space-y-1.5">
            {data.inbox.slice(0, 3).map((i) => (
              <li
                key={i.id}
                onClick={() => goto("inbox")}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/60 transition-all cursor-pointer border border-transparent hover:border-border/60"
              >
                <span
                  className="wh-chip mt-0.5"
                  data-tone={
                    i.type === "budget" ? "success" : i.type === "media" ? "purple" : undefined
                  }
                >
                  {i.type.toUpperCase()}
                </span>
                <span className="text-sm flex-1 line-clamp-1 text-foreground font-medium">
                  {i.text}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Recent tasks */}
      <SectionCard
        title="Up next"
        action={
          data.tasks.length ? { label: "All tasks", onClick: () => goto("tasks") } : undefined
        }
      >
        {data.tasks.length === 0 ? (
          <EmptyRow
            icon={<CheckSquare className="size-4" />}
            text="Nothing pending — add tasks in the Tasks tab"
          />
        ) : (
          <ul className="space-y-1.5">
            {data.tasks
              .filter((t) => t.status === "todo")
              .slice(0, 3)
              .map((t) => (
                <li
                  key={t.id}
                  onClick={() => goto("tasks")}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/60 transition-all cursor-pointer border border-transparent hover:border-border/60"
                >
                  <span className="wh-chip">To Do</span>
                  <span className="text-sm flex-1 truncate text-foreground font-medium">
                    {t.title}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      {/* Saved links preview */}
      {data.links.length > 0 && (
        <SectionCard
          title="Latest inspiration"
          action={{ label: "All links", onClick: () => goto("inbox") }}
        >
          <ul className="space-y-1.5">
            {data.links.slice(0, 2).map((l) => (
              <li
                key={l.id}
                onClick={() => goto("inbox")}
                className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-secondary/60 transition-all cursor-pointer border border-transparent hover:border-border/60"
              >
                <Globe className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground truncate font-medium">
                  {extractDomain(l.url)}
                </span>
                {l.comment && <span className="truncate text-foreground">· {l.comment}</span>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Invite code footer */}
      {session && (
        <div className="wh-card text-center bg-gradient-to-br from-secondary to-card border-accent/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Share Room Invite Code
          </p>
          <p className="mt-1.5 font-mono-num text-xl font-bold tracking-[0.4em] text-primary">
            {session.inviteCode}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
            Partner needs this code + your shared password to join
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: "success";
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={
        "wh-card text-left w-full transition-all duration-200 group relative " +
        (onClick
          ? "cursor-pointer hover:border-primary/40 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          : "")
      }
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
        {label}
      </p>
      <p
        className={
          "mt-1.5 text-xl font-mono-num font-extrabold text-primary " +
          (tone === "success" ? "!text-success" : "")
        }
      >
        {value}
      </p>
      {onClick && (
        <span className="absolute bottom-2 right-2 text-[10px] text-accent font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      )}
    </Tag>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="wh-card">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-serif font-bold text-foreground">{title}</h3>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
          >
            {action.label} <ArrowRight className="size-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 font-medium">
      {icon} <span>{text}</span>
    </div>
  );
}

// ============= INBOX =============
function InboxTab({ store }: { store: WhStore }) {
  const [sub, setSub] = useState<"notes" | "links">("notes");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
        <SubTab active={sub === "notes"} onClick={() => setSub("notes")}>
          Notes
        </SubTab>
        <SubTab active={sub === "links"} onClick={() => setSub("links")}>
          Links
        </SubTab>
      </div>
      {sub === "notes" ? <InboxNotes store={store} /> : <InboxLinks store={store} />}
    </div>
  );
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 h-10 rounded-lg text-sm font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function InboxNotes({ store }: { store: WhStore }) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    const item: InboxItem = {
      id: newId("inb"),
      text: t,
      timestamp: new Date().toISOString(),
      type: detectType(t),
    };
    store.update("inbox", (prev) => [item, ...prev]);
    setText("");
  };
  const toTask = (i: InboxItem) => {
    const task: Task = {
      id: newId("task"),
      title: i.text.slice(0, 80),
      status: "todo",
      notes: "",
      createdAt: new Date().toISOString(),
    };
    store.update("tasks", (prev) => [task, ...prev]);
    store.update("inbox", (prev) => prev.filter((x) => x.id !== i.id));
  };
  const toBudget = (i: InboxItem) => {
    const est = extractNumber(i.text);
    const b: BudgetItem = {
      id: newId("bud"),
      name: i.text.slice(0, 60),
      category: "Other",
      estimatedCost: est,
      advancePaid: 0,
      status: "Draft",
    };
    store.update("budget", (prev) => [b, ...prev]);
    store.update("inbox", (prev) => prev.filter((x) => x.id !== i.id));
  };
  return (
    <div className="space-y-3">
      <div className="wh-card space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Type or paste anything — prices, ideas, links…"
          className="wh-input"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="wh-btn w-full"
          data-variant="primary"
        >
          <Sparkles className="size-4" /> Capture
        </button>
      </div>

      {store.data.inbox.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          title="Your brain dump starts here"
          body="Paste prices, ideas, links — anything. Sort it later."
        />
      ) : (
        <ul className="space-y-2">
          {store.data.inbox.map((i) => (
            <li key={i.id} className="wh-card">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="wh-chip"
                  data-tone={
                    i.type === "budget" ? "success" : i.type === "media" ? "purple" : undefined
                  }
                >
                  {i.type.toUpperCase()}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono-num">
                  {relativeTime(i.timestamp)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{i.text}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => toTask(i)} className="wh-chip">
                  → Task
                </button>
                <button onClick={() => toBudget(i)} className="wh-chip">
                  → Budget
                </button>
                <button
                  onClick={() => store.update("inbox", (p) => p.filter((x) => x.id !== i.id))}
                  className="wh-icon-btn ml-auto"
                  data-danger="true"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InboxLinks({ store }: { store: WhStore }) {
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<LinkCategory>("Inspiration");
  const submit = () => {
    if (!url.trim()) return;
    const link: SavedLink = {
      id: newId("lnk"),
      url: url.trim(),
      comment: comment.trim().slice(0, 120),
      category,
      timestamp: new Date().toISOString(),
    };
    store.update("links", (prev) => [link, ...prev]);
    setUrl("");
    setComment("");
  };
  const toTask = (l: SavedLink) => {
    const title = (l.comment || extractDomain(l.url)).slice(0, 80);
    const task: Task = {
      id: newId("task"),
      title,
      status: "todo",
      notes: l.url,
      createdAt: new Date().toISOString(),
    };
    store.update("tasks", (prev) => [task, ...prev]);
    store.update("links", (prev) => prev.filter((x) => x.id !== l.id));
  };
  return (
    <div className="space-y-3">
      <div className="wh-card space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL"
          className="wh-input"
        />
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={120}
          placeholder="What is this for? (optional)"
          className="wh-input"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LinkCategory)}
          className="wh-input"
        >
          {LINK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={!url.trim()}
          className="wh-btn w-full"
          data-variant="primary"
        >
          <Plus className="size-4" /> Save link
        </button>
      </div>

      {store.data.links.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-6" />}
          title="No links saved yet"
          body="Save vendor sites, Pinterest pins, Instagram posts."
        />
      ) : (
        <ul className="space-y-2">
          {store.data.links.map((l) => (
            <li key={l.id} className="wh-card">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="size-3.5 text-muted-foreground" />
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate"
                >
                  {extractDomain(l.url)}
                </a>
                <span className="wh-chip ml-auto" data-tone="info">
                  {l.category}
                </span>
              </div>
              {l.comment && <p className="text-sm">{l.comment}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-muted-foreground font-mono-num">
                  {relativeTime(l.timestamp)}
                </span>
                <button onClick={() => toTask(l)} className="wh-chip ml-auto">
                  → Task
                </button>
                <button
                  onClick={() => store.update("links", (p) => p.filter((x) => x.id !== l.id))}
                  className="wh-icon-btn"
                  data-danger="true"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============= BUDGET =============
function BudgetTab({ store }: { store: WhStore }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(BUDGET_CATEGORIES[0]);
  const [est, setEst] = useState("");
  const [paid, setPaid] = useState("");
  const [status, setStatus] = useState<"Draft" | "Confirmed">("Draft");
  const { budget } = store.data;

  const totalEst = budget.reduce((a, b) => a + b.estimatedCost, 0);
  const totalPaid = budget.reduce((a, b) => a + b.advancePaid, 0);
  const remaining = totalEst - totalPaid;
  const pct = totalEst ? Math.min(100, Math.round((totalPaid / totalEst) * 100)) : 0;

  const submit = () => {
    if (!name.trim()) return;
    const item: BudgetItem = {
      id: newId("bud"),
      name: name.trim(),
      category,
      estimatedCost: Math.max(0, parseFloat(est) || 0),
      advancePaid: Math.max(0, parseFloat(paid) || 0),
      status,
    };
    store.update("budget", (prev) => [item, ...prev]);
    setName("");
    setEst("");
    setPaid("");
    setStatus("Draft");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="wh-card">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="font-mono-num font-semibold">{formatINR(totalEst)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
            <p className="font-mono-num font-semibold text-[color:var(--success)]">
              {formatINR(totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
            <p className="font-mono-num font-semibold">{formatINR(remaining)}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="wh-btn w-full" data-variant="primary">
          <Plus className="size-4" /> Add budget item
        </button>
      ) : (
        <div className="wh-card space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What is this for?"
            className="wh-input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="wh-input"
          >
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              value={est}
              onChange={(e) => setEst(e.target.value)}
              placeholder="Estimated ₹"
              className="wh-input font-mono-num"
            />
            <input
              inputMode="decimal"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder="Advance paid ₹"
              className="wh-input font-mono-num"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus(status === "Draft" ? "Confirmed" : "Draft")}
              className="wh-chip"
              data-tone={status === "Confirmed" ? "success" : undefined}
            >
              {status}
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="wh-btn flex-1" data-variant="ghost">
              Cancel
            </button>
            <button onClick={submit} className="wh-btn flex-1" data-variant="primary">
              Save
            </button>
          </div>
        </div>
      )}

      {budget.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="size-6" />}
          title="No budget items yet"
          body="Add your first expense to start tracking."
        />
      ) : (
        <ul className="space-y-2">
          {budget.map((b) => (
            <li key={b.id} className="wh-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{b.name}</p>
                  <span className="wh-chip mt-1" data-tone="info">
                    {b.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-mono-num font-semibold text-primary">
                    {formatINR(b.estimatedCost)}
                  </p>
                  <p className="font-mono-num text-xs text-muted-foreground">
                    Paid {formatINR(b.advancePaid)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() =>
                    store.update("budget", (p) =>
                      p.map((x) =>
                        x.id === b.id
                          ? { ...x, status: x.status === "Draft" ? "Confirmed" : "Draft" }
                          : x,
                      ),
                    )
                  }
                  className="wh-chip"
                  data-tone={b.status === "Confirmed" ? "success" : undefined}
                >
                  {b.status}
                </button>
                <button
                  onClick={() => store.update("budget", (p) => p.filter((x) => x.id !== b.id))}
                  className="wh-icon-btn ml-auto"
                  data-danger="true"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============= TASKS =============
function TasksTab({ store }: { store: WhStore }) {
  const [sub, setSub] = useState<"tasks" | "checklist">("tasks");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
        <SubTab active={sub === "tasks"} onClick={() => setSub("tasks")}>
          Tasks
        </SubTab>
        <SubTab active={sub === "checklist"} onClick={() => setSub("checklist")}>
          Checklist
        </SubTab>
      </div>
      {sub === "tasks" ? <TasksList store={store} /> : <ChecklistView store={store} />}
    </div>
  );
}

function TasksList({ store }: { store: WhStore }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");

  const submit = () => {
    if (!title.trim()) return;
    const t: Task = {
      id: newId("task"),
      title: title.trim(),
      status: "todo",
      notes: notes.trim(),
      dueDate: due || undefined,
      createdAt: new Date().toISOString(),
    };
    store.update("tasks", (prev) => [t, ...prev]);
    setTitle("");
    setNotes("");
    setDue("");
    setOpen(false);
  };

  const cycle = (t: Task): Task["status"] =>
    t.status === "todo" ? "inprogress" : t.status === "inprogress" ? "booked" : "todo";

  const filtered =
    filter === "all" ? store.data.tasks : store.data.tasks.filter((t) => t.status === filter);
  const todoCount = store.data.tasks.filter((t) => t.status === "todo").length;

  return (
    <div className="space-y-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="wh-btn w-full" data-variant="primary">
          <Plus className="size-4" /> Add task
        </button>
      ) : (
        <div className="wh-card space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="wh-input"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="wh-input"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="wh-input"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="wh-btn flex-1" data-variant="ghost">
              Cancel
            </button>
            <button onClick={submit} className="wh-btn flex-1" data-variant="primary">
              Save
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto">
        {(["all", "todo", "inprogress", "booked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "wh-chip whitespace-nowrap " +
              (filter === f ? "!bg-primary/25 !text-primary !border-primary/40" : "")
            }
          >
            {f === "all"
              ? "All"
              : f === "todo"
                ? "To Do"
                : f === "inprogress"
                  ? "In Progress"
                  : "Booked"}
            {f === "todo" && todoCount > 0 && ` · ${todoCount}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="size-6" />}
          title="All clear!"
          body="Add a new task above."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li key={t.id} className="wh-card">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t.title}</p>
                  {t.notes && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {t.notes}
                    </p>
                  )}
                  {t.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono-num">
                      <Calendar className="size-3" /> {formatWeddingDate(t.dueDate)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    store.update("tasks", (p) =>
                      p.map((x) => (x.id === t.id ? { ...x, status: cycle(x) } : x)),
                    )
                  }
                  className="wh-chip"
                  data-tone={
                    t.status === "inprogress"
                      ? "warning"
                      : t.status === "booked"
                        ? "success"
                        : undefined
                  }
                >
                  {t.status === "todo"
                    ? "To Do"
                    : t.status === "inprogress"
                      ? "In Progress"
                      : "Booked"}
                </button>
              </div>
              <button
                onClick={() => store.update("tasks", (p) => p.filter((x) => x.id !== t.id))}
                className="wh-icon-btn mt-2 ml-auto flex"
                data-danger="true"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChecklistView({ store }: { store: WhStore }) {
  const { checklist } = store.data;
  const grouped = useMemo(() => {
    const map = new Map<string, typeof checklist>();
    for (const c of checklist) {
      const arr = map.get(c.phase) ?? [];
      arr.push(c);
      map.set(c.phase, arr);
    }
    return Array.from(map.entries());
  }, [checklist]);
  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-3">
      <div className="wh-card">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall progress</p>
        <p className="text-2xl font-mono-num font-semibold mt-1">
          {done} <span className="text-muted-foreground text-lg">/ {checklist.length}</span>
        </p>
        <div className="h-2 rounded-full bg-secondary mt-2 overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${checklist.length ? (done / checklist.length) * 100 : 0}%` }}
          />
        </div>
      </div>
      {grouped.map(([phase, items]) => (
        <div key={phase} className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground sticky top-[73px] bg-background/95 backdrop-blur py-1.5">
            {phase}
          </h4>
          <ul className="wh-card !p-2 divide-y divide-border">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() =>
                    store.update("checklist", (p) =>
                      p.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)),
                    )
                  }
                  className="w-full flex items-center gap-3 py-3 px-2 text-left"
                >
                  <span
                    className={
                      "size-5 rounded-md border flex items-center justify-center transition " +
                      (c.done
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border")
                    }
                  >
                    {c.done && <CheckSquare className="size-3" />}
                  </span>
                  <span className={"text-sm flex-1 " + (c.done ? "line-through opacity-50" : "")}>
                    {c.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============= VENDORS =============
function VendorsTab({ store }: { store: WhStore }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(VENDOR_CATEGORIES[0]);
  const [contact, setContact] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<string>("All");

  const submit = () => {
    if (!name.trim()) return;
    const v: Vendor = {
      id: newId("ven"),
      name: name.trim(),
      category,
      contact: contact.trim(),
      priceQuote: Math.max(0, parseFloat(price) || 0),
      status: "Shortlisted",
      notes: notes.trim(),
    };
    store.update("vendors", (prev) => [v, ...prev]);
    setName("");
    setContact("");
    setPrice("");
    setNotes("");
    setOpen(false);
  };

  const cycle = (v: Vendor): Vendor["status"] =>
    v.status === "Shortlisted" ? "Contacted" : v.status === "Contacted" ? "Booked" : "Shortlisted";

  const filtered =
    filter === "All" ? store.data.vendors : store.data.vendors.filter((v) => v.category === filter);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of store.data.vendors) map[v.category] = (map[v.category] || 0) + 1;
    return map;
  }, [store.data.vendors]);

  return (
    <div className="space-y-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="wh-btn w-full" data-variant="primary">
          <Plus className="size-4" /> Add vendor
        </button>
      ) : (
        <div className="wh-card space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vendor name"
            className="wh-input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="wh-input"
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email"
            className="wh-input"
          />
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price quote ₹"
            className="wh-input font-mono-num"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="wh-input"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="wh-btn flex-1" data-variant="ghost">
              Cancel
            </button>
            <button onClick={submit} className="wh-btn flex-1" data-variant="primary">
              Save
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4">
        {(["All", ...VENDOR_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={
              "wh-chip whitespace-nowrap " +
              (filter === c ? "!bg-primary/25 !text-primary !border-primary/40" : "")
            }
          >
            {c}
            {c !== "All" && counts[c] ? ` · ${counts[c]}` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="size-6" />}
          title="No vendors shortlisted yet"
          body="Add your first vendor to start comparing quotes."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((v) => (
            <li key={v.id} className="wh-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{v.name}</p>
                  <span className="wh-chip mt-1" data-tone="info">
                    {v.category}
                  </span>
                  {v.contact && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Phone className="size-3" /> {v.contact}
                    </p>
                  )}
                  {v.notes && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {v.notes}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {v.priceQuote > 0 && (
                    <p className="font-mono-num font-semibold">{formatINR(v.priceQuote)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() =>
                    store.update("vendors", (p) =>
                      p.map((x) => (x.id === v.id ? { ...x, status: cycle(x) } : x)),
                    )
                  }
                  className="wh-chip"
                  data-tone={
                    v.status === "Contacted"
                      ? "warning"
                      : v.status === "Booked"
                        ? "success"
                        : "info"
                  }
                >
                  {v.status}
                </button>
                <button
                  onClick={() => store.update("vendors", (p) => p.filter((x) => x.id !== v.id))}
                  className="wh-icon-btn ml-auto"
                  data-danger="true"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============= SHARED =============
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="wh-card text-center py-10">
      <div className="mx-auto size-11 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{body}</p>
    </div>
  );
}
