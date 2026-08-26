/**
 * Mock chat data, per "GoTogether Chat List Page.dc.html" — illustrative
 * sample content for the design (there's no real chat backend in this
 * frontend-only build), not literal required copy. Trip group chats are
 * keyed to real trip ids so "View Trip" links resolve somewhere real.
 */

export type ChatMessage = {
  id: string;
  fromSelf: boolean;
  senderName?: string;
  text: string;
};

export type TripChat = {
  tripId: string;
  title: string;
  subtitle: string; // "Dec 20–24 · 5 members"
  lastMessage: string;
  time: string;
  unread: number;
  badge: string; // member count, or "VP" for a Verified Partner chat
  badgeVariant: "default" | "partner";
  messages: ChatMessage[];
};

export type DirectMessage = {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
};

export const tripChats: TripChat[] = [
  {
    tripId: "manali-snow-trek",
    title: "Manali Snow Trek",
    subtitle: "Dec 20–24 · 5 members",
    lastMessage: "Yes! I found one for ₹1,200/night, sending the link",
    time: "2m",
    unread: 0,
    badge: "5",
    badgeVariant: "default",
    messages: [
      { id: "m1", fromSelf: false, senderName: "Priya Sharma", text: "Should we book the guesthouse near the mall road?" },
      { id: "m2", fromSelf: true, text: "Yes! I found one for ₹1,200/night, sending the link" },
    ],
  },
  {
    tripId: "rishikesh-river-rafting",
    title: "Rishikesh River Rafting",
    subtitle: "Mar 8–10 · 4 members",
    lastMessage: "Kabir: See you all at the pickup point",
    time: "1h",
    unread: 3,
    badge: "4",
    badgeVariant: "default",
    messages: [
      { id: "m1", fromSelf: false, senderName: "Kabir Rathi", text: "See you all at the pickup point" },
    ],
  },
  {
    tripId: "spiti-valley-expedition",
    title: "Spiti Valley Expedition",
    subtitle: "Jan 14–24 · 6 members",
    lastMessage: "Peak Expeditions: Your request is pending",
    time: "3h",
    unread: 1,
    badge: "VP",
    badgeVariant: "partner",
    messages: [
      { id: "m1", fromSelf: false, senderName: "Peak Expeditions", text: "Your request is pending" },
    ],
  },
  {
    tripId: "goa-beach-retreat",
    title: "Goa Beach Weekend",
    subtitle: "Oct 4–6 · 6 members",
    lastMessage: "Meera: Can't wait for this trip!",
    time: "1d",
    unread: 0,
    badge: "6",
    badgeVariant: "default",
    messages: [{ id: "m1", fromSelf: false, senderName: "Meera Shah", text: "Can't wait for this trip!" }],
  },
];

export const directMessages: DirectMessage[] = [
  {
    id: "rohan-t",
    name: "Rohan T.",
    initials: "RT",
    lastMessage: "Sounds good, see you at the trailhead",
  },
];
