export interface InboxItem {
  id: string;
  text: string;
  timestamp: string;
  type: "general" | "budget" | "media";
}

export interface BudgetItem {
  id: string;
  name: string;
  category: string;
  estimatedCost: number;
  advancePaid: number;
  status: "Draft" | "Confirmed";
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "inprogress" | "booked";
  notes: string;
  dueDate?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  priceQuote: number;
  status: "Shortlisted" | "Contacted" | "Booked";
  notes: string;
}

export interface ChecklistItem {
  id: string;
  phase: string;
  text: string;
  done: boolean;
}

export type LinkCategory =
  "Venue" | "Décor" | "Photography" | "Inspiration" | "Vendor" | "Budget" | "Other";

export interface SavedLink {
  id: string;
  url: string;
  comment: string;
  category: LinkCategory;
  timestamp: string;
}

export type CollectionName = "inbox" | "budget" | "tasks" | "vendors" | "checklist" | "links";

export interface WeddingSession {
  token: string;
  roomId: string;
  inviteCode: string;
  weddingDate: string;
}

export interface WeddingData {
  weddingDate: string;
  inbox: InboxItem[];
  budget: BudgetItem[];
  tasks: Task[];
  vendors: Vendor[];
  checklist: ChecklistItem[];
  links: SavedLink[];
  updatedAt: string;
}

export const BUDGET_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Entertainment",
  "Décor",
  "Attire",
  "Jewellery",
  "Transport",
  "Accommodation",
  "Other",
] as const;

export const VENDOR_CATEGORIES = BUDGET_CATEGORIES;

export const LINK_CATEGORIES: LinkCategory[] = [
  "Venue",
  "Décor",
  "Photography",
  "Inspiration",
  "Vendor",
  "Budget",
  "Other",
];

export const CHECKLIST_SEED: { phase: string; text: string }[] = [
  { phase: "12+ Months Out", text: "Set overall budget" },
  { phase: "12+ Months Out", text: "Decide wedding date" },
  { phase: "12+ Months Out", text: "Book venue" },
  { phase: "12+ Months Out", text: "Draft guest list" },
  { phase: "12+ Months Out", text: "Hire wedding planner" },

  { phase: "6–12 Months Out", text: "Book caterer" },
  { phase: "6–12 Months Out", text: "Book photographer / videographer" },
  { phase: "6–12 Months Out", text: "Book DJ or band" },
  { phase: "6–12 Months Out", text: "Choose attire" },
  { phase: "6–12 Months Out", text: "Send save-the-dates" },
  { phase: "6–12 Months Out", text: "Book florist / décor" },
  { phase: "6–12 Months Out", text: "Arrange officiant / pandit" },

  { phase: "3–6 Months Out", text: "Send invitations" },
  { phase: "3–6 Months Out", text: "Plan menu" },
  { phase: "3–6 Months Out", text: "Book hair & makeup" },
  { phase: "3–6 Months Out", text: "Arrange accommodation / shuttles" },
  { phase: "3–6 Months Out", text: "Plan honeymoon" },
  { phase: "3–6 Months Out", text: "Order cake" },

  { phase: "1–3 Months Out", text: "Confirm vendor contracts" },
  { phase: "1–3 Months Out", text: "Finalize seating" },
  { phase: "1–3 Months Out", text: "Apply for marriage license" },
  { phase: "1–3 Months Out", text: "Hair & makeup trial" },
  { phase: "1–3 Months Out", text: "Plan rehearsal dinner" },

  { phase: "Final 2 Weeks", text: "Confirm RSVP count" },
  { phase: "Final 2 Weeks", text: "Final fitting" },
  { phase: "Final 2 Weeks", text: "Share day-of timeline" },
  { phase: "Final 2 Weeks", text: "Write vows" },
  { phase: "Final 2 Weeks", text: "Pack honeymoon bags" },
];
