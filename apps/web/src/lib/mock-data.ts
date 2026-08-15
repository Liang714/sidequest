import type { Achievement, ChatMessage, Quest, QuestUser } from "./types";

// Quest titles/descriptions/locations are user-generated content, not UI
// chrome — real quests are never machine-translated per locale (see
// docs/ARCHITECTURE.md §Internationalization), so this mock content is
// deliberately plain strings, unlike the UI copy in packages/i18n.

export const currentUser: QuestUser = {
  id: "u-erh",
  username: "Erh",
  avatarInitial: "E",
  avatarColor: "blue",
  level: 12,
};

export const users = {
  erh: currentUser,
  alex: { id: "u-alex", username: "Alex", avatarInitial: "A", avatarColor: "violet", level: 8 },
  jamie: { id: "u-jamie", username: "Jamie", avatarInitial: "J", avatarColor: "coral", level: 5 },
  chris: { id: "u-chris", username: "Chris", avatarInitial: "C", avatarColor: "lime", level: 14 },
  priya: { id: "u-priya", username: "Priya", avatarInitial: "P", avatarColor: "blue", level: 3 },
  noah: { id: "u-noah", username: "Noah", avatarInitial: "N", avatarColor: "violet", level: 21 },
  seoulwalker: {
    id: "u-seoulwalker",
    username: "@seoulwalker",
    avatarInitial: "S",
    avatarColor: "coral",
    level: 19,
  },
} satisfies Record<string, QuestUser>;

export const quests: Quest[] = [
  {
    id: "q-arcade-battle",
    title: "Arcade Battle",
    description:
      "Head-to-head retro arcade night — rhythm games, claw machines, a photo booth strip at the end.",
    category: "gaming",
    location: "Hongdae",
    startLabel: "9:30 PM",
    budgetLabel: "₩15,000",
    maxParticipants: 4,
    joinedParticipants: [users.alex, users.jamie, users.chris],
    difficulty: "medium",
    xpReward: 250,
    visibility: "public",
    status: "open",
    compatibility: 88,
    compatibilityBreakdown: [
      { labelKey: "category.gaming", points: 22 },
      { labelKey: "quest.compatBudget", points: 18 },
      { labelKey: "quest.compatLocation", points: 20 },
      { labelKey: "quest.compatTime", points: 16 },
      { labelKey: "quest.compatGroup", points: 12 },
    ],
    objectives: [
      { id: "o1", label: "Play 3 arcade games", completed: false },
      { id: "o2", label: "Beat a target score on one", completed: false },
      { id: "o3", label: "Photo booth strip with the group", completed: false },
    ],
    meetingPoint: "Hongdae Station, Exit 9",
    host: users.chris,
    gradient: "linear-gradient(135deg, #2d6fd1, #6b3fd4)",
    mapPosition: { x: 32, y: 44 },
  },
  {
    id: "q-photo-hunt",
    title: "Seoul Night Photo Hunt",
    description:
      "Chase neon signs and reflections through Seongsu's old factory streets. Ends with everyone picking a favorite shot.",
    category: "photography",
    location: "Seongsu",
    startLabel: "8:00 PM",
    budgetLabel: "₩10,000",
    maxParticipants: 5,
    joinedParticipants: [currentUser, users.priya, users.noah],
    difficulty: "easy",
    xpReward: 300,
    visibility: "public",
    status: "open",
    compatibility: 76,
    compatibilityBreakdown: [
      { labelKey: "category.photography", points: 20 },
      { labelKey: "quest.compatBudget", points: 16 },
      { labelKey: "quest.compatLocation", points: 14 },
      { labelKey: "quest.compatTime", points: 14 },
      { labelKey: "quest.compatGroup", points: 12 },
    ],
    objectives: [
      { id: "o1", label: "Find a reflection shot", completed: false },
      { id: "o2", label: "Photograph a neon sign", completed: false },
      { id: "o3", label: "Group photo in an alley", completed: false },
      { id: "o4", label: "Vote on a favorite shot", completed: false },
    ],
    meetingPoint: "Seongsu Station, Exit 3",
    host: users.priya,
    gradient: "linear-gradient(135deg, #178a7a, #2d6fd1)",
    mapPosition: { x: 68, y: 30 },
  },
  {
    id: "q-dance-quest",
    title: "Random Dance Quest",
    description:
      "Learn a short K-pop choreo as a group, then film one clean take together. No experience needed.",
    category: "dance",
    location: "Gangnam",
    startLabel: "Starts in 45 min",
    startsInMinutes: 45,
    budgetLabel: "Free",
    maxParticipants: 6,
    joinedParticipants: [currentUser, users.alex, users.jamie, users.priya, users.noah],
    difficulty: "medium",
    xpReward: 200,
    visibility: "public",
    status: "open",
    compatibility: 94,
    compatibilityBreakdown: [
      { labelKey: "category.dance", points: 20 },
      { labelKey: "category.photography", points: 18 },
      { labelKey: "quest.compatBudget", points: 20 },
      { labelKey: "quest.compatLocation", points: 18 },
      { labelKey: "quest.compatTime", points: 18 },
    ],
    objectives: [
      { id: "o1", label: "Learn the 30-second choreo", completed: false },
      { id: "o2", label: "Film one full-group take", completed: false },
      { id: "o3", label: "Check in at the meeting point", completed: false },
    ],
    meetingPoint: "Gangnam Station, Exit 11 — near the busking spot",
    host: users.alex,
    gradient: "linear-gradient(135deg, #d1466b, #ef8f3d)",
    mapPosition: { x: 50, y: 68 },
  },
  {
    id: "q-cafe-hunt",
    title: "Hidden Seoul Café Hunt",
    description:
      "A creator-made route through three cafés most tourists never find, ending at a rooftop with a Han River view.",
    category: "cafe",
    location: "Yeonnam-dong",
    startLabel: "2:00 PM",
    budgetLabel: "₩20,000",
    maxParticipants: 4,
    joinedParticipants: [users.jamie],
    difficulty: "easy",
    xpReward: 180,
    visibility: "public",
    status: "open",
    objectives: [
      { id: "o1", label: "Order the café's signature drink", completed: false },
      { id: "o2", label: "Find the hidden rooftop entrance", completed: false },
      { id: "o3", label: "Group photo with the river view", completed: false },
    ],
    meetingPoint: "Yeonnam-dong, in front of the mural wall",
    host: users.seoulwalker,
    gradient: "linear-gradient(135deg, #b6883f, #d1466b)",
    mapPosition: { x: 22, y: 20 },
  },
  {
    id: "q-kpop-challenge",
    title: "K-Pop Random Dance Challenge",
    description:
      "Sponsored by ABC Dance Studio — learn one routine, complete it as a group of 3+, and everyone gets 10% off a trial class.",
    category: "dance",
    location: "Gangnam",
    startLabel: "7:00 PM",
    budgetLabel: "Free",
    maxParticipants: 8,
    joinedParticipants: [users.noah, users.chris],
    difficulty: "easy",
    xpReward: 150,
    visibility: "public",
    status: "open",
    objectives: [
      { id: "o1", label: "3+ participants check in together", completed: false },
      { id: "o2", label: "Learn the featured routine", completed: false },
      { id: "o3", label: "Upload a completion photo", completed: false },
    ],
    meetingPoint: "ABC Dance Studio, front desk",
    host: users.alex,
    gradient: "linear-gradient(135deg, #7c4fe0, #d1466b)",
    mapPosition: { x: 55, y: 72 },
    sponsored: { businessName: "ABC Dance Studio" },
  },
  {
    id: "q-explore-market",
    title: "Gwangjang Market Snack Crawl",
    description:
      "Six stalls, six bites, one shared bill. Ends with everyone voting on the best find.",
    category: "food",
    location: "Jongno",
    startLabel: "6:30 PM",
    budgetLabel: "₩18,000",
    maxParticipants: 5,
    joinedParticipants: [users.priya],
    difficulty: "easy",
    xpReward: 220,
    visibility: "public",
    status: "open",
    objectives: [
      { id: "o1", label: "Try 3 different stalls as a group", completed: false },
      { id: "o2", label: "Vote on the best bite", completed: false },
    ],
    meetingPoint: "Gwangjang Market, Jongno 4-ga gate",
    host: users.priya,
    gradient: "linear-gradient(135deg, #ef8f3d, #b6883f)",
    mapPosition: { x: 78, y: 55 },
  },
];

export const questById = (id: string) => quests.find((q) => q.id === id);

export const myQuests = quests.filter((q) =>
  q.joinedParticipants.some((p) => p.id === currentUser.id),
);

export const currentUserAchievements: Achievement[] = [
  { id: "a1", emoji: "🏆", labelKey: "achievement.firstQuest" },
  { id: "a2", emoji: "🌙", labelKey: "achievement.nightOwl" },
  { id: "a3", emoji: "📸", labelKey: "achievement.photographer" },
  { id: "a4", emoji: "🍜", labelKey: "achievement.foodHunter" },
  { id: "a5", emoji: "🗺️", labelKey: "achievement.explorer" },
];

export const friendsList: QuestUser[] = [users.alex, users.jamie, users.chris, users.noah];
export const friendRequests: QuestUser[] = [users.priya];

export const questRoomMessages: ChatMessage[] = [
  { id: "m1", sender: users.alex, content: "on my way, 5 min out 🏃", timeLabel: "9:22 PM" },
  { id: "m2", sender: users.jamie, content: "same! grabbing water first", timeLabel: "9:24 PM" },
  {
    id: "m3",
    sender: users.chris,
    content: "already here, by the exit 9 gate",
    timeLabel: "9:26 PM",
  },
];
