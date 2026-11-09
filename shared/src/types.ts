export type SplitType = 'equal' | 'custom' | 'percent';

export type Role = 'user' | 'superadmin';

export type GroupMemberRole = 'admin' | 'member';

// How a newly joined member participates in the group's history.
export type JoinHistoryOption = 'include' | 'new';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  memberCount: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  role: GroupMemberRole;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
  // Role of the currently authenticated user within this group.
  myRole: GroupMemberRole;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  name: string;
  shareAmount: number;
  shareType: SplitType;
}

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;
  paidByName: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
  splits: ExpenseSplit[];
}

export interface Balance {
  userId: string;
  name: string;
  net: number; // positive = owed to you, negative = you owe
}

export interface Debt {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  note: string | null;
  settledAt: string;
}

export interface InviteLink {
  token: string;
  url: string;
  expiresAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordResponse {
  message: string;
  // In dev (no email service), the reset token is returned so it can be used directly.
  resetToken?: string;
}

export interface ApiError {
  error: string;
}
