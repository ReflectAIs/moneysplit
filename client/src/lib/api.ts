import type {
  AuthResponse,
  Group,
  GroupMember,
  Expense,
  Balance,
  Debt,
  Settlement,
  InviteLink,
  SplitType,
  UpdateProfileInput,
  ChangePasswordInput,
  ForgotPasswordResponse,
  GroupMemberRole,
  FamilyDetail,
  FamilyBalance,
  FamilyDebt
} from '@moneysplit/shared';

const TOKEN_KEY = 'moneysplit_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed');
  }
  return data as T;
}

export const api = {
  // Auth
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  forgotPassword: (email: string) =>
    request<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    }),
  updateProfile: (data: UpdateProfileInput) =>
    request<AuthResponse>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  changePassword: (data: ChangePasswordInput) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Groups
  listGroups: () => request<Group[]>('/groups'),
  createGroup: (name: string, description?: string) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
  getGroup: (id: string) =>
    request<{ id: string; name: string; description: string | null; members: GroupMember[]; myRole: GroupMemberRole }>(
      `/groups/${id}`
    ),
  createInvite: (groupId: string) =>
    request<InviteLink>(`/groups/${groupId}/invite`, { method: 'POST' }),
  joinGroup: (inviteToken: string, history: 'include' | 'new' = 'new') =>
    request<{ id: string; name: string }>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteToken, history })
    }),
  removeMember: (groupId: string, userId: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE'
    }),
  promoteMember: (groupId: string, userId: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${userId}/promote`, {
      method: 'POST'
    }),
  demoteMember: (groupId: string, userId: string) =>
    request<{ message: string }>(`/groups/${groupId}/members/${userId}/demote`, {
      method: 'POST'
    }),
  deleteExpense: (groupId: string, expenseId: string) =>
    request<{ message: string }>(`/expenses/${groupId}/${expenseId}`, {
      method: 'DELETE'
    }),
  updateExpense: (
    groupId: string,
    expenseId: string,
    data: { description?: string; amount?: number; paidBy?: string; category?: string; date?: string; splitType?: string; splits?: { userId: string; share: number }[] }
  ) =>
    request<{ message: string }>(`/expenses/${groupId}/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  updateGroup: (groupId: string, data: { name?: string; description?: string }) =>
    request<Group>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteGroup: (groupId: string) =>
    request<{ message: string }>(`/groups/${groupId}`, {
      method: 'DELETE'
    }),
  getBalances: (groupId: string) =>
    request<{ balances: Balance[]; debts: Debt[] }>(`/groups/${groupId}/balances`),

  // Expenses
  listExpenses: (groupId: string) => request<Expense[]>(`/expenses/${groupId}`),
  createExpense: (
    groupId: string,
    data: {
      description: string;
      amount: number;
      paidBy: string;
      category: string;
      date: string;
      splitType: SplitType;
      splits: { userId: string; share: number }[];
    }
  ) =>
    request<{ id: string }>(`/expenses/${groupId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  settle: (groupId: string, fromUser: string, toUser: string, amount: number, note?: string) =>
    request<Settlement>(`/expenses/${groupId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ fromUser, toUser, amount, note })
    }),
  listSettlements: (groupId: string) => request<Settlement[]>(`/expenses/${groupId}/settlements`),

  // Families
  listFamilies: (groupId: string) => request<FamilyDetail[]>(`/groups/${groupId}/families`),
  createFamily: (groupId: string, name: string) =>
    request<FamilyDetail>(`/groups/${groupId}/families`, {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
  getFamilyBalances: (groupId: string) =>
    request<{ balances: FamilyBalance[]; debts: FamilyDebt[] }>(`/groups/${groupId}/families/balances`),
  settleFamilies: (groupId: string, fromFamilyId: string, toFamilyId: string, amount: number, note?: string) =>
    request<{ message: string }>(`/groups/${groupId}/families/settle`, {
      method: 'POST',
      body: JSON.stringify({ fromFamilyId, toFamilyId, amount, note })
    }),
  assignMemberToFamily: (groupId: string, familyId: string, userId: string) =>
    request<{ message: string }>(`/groups/${groupId}/families/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
  removeMemberFromFamily: (groupId: string, familyId: string, userId: string) =>
    request<{ message: string }>(`/groups/${groupId}/families/${familyId}/members/${userId}`, {
      method: 'DELETE'
    }),
  deleteFamily: (groupId: string, familyId: string) =>
    request<{ message: string }>(`/groups/${groupId}/families/${familyId}`, {
      method: 'DELETE'
    }),

  // Admin (superadmin only)
  adminListUsers: () =>
    request<{ id: string; email: string; name: string; role: string; createdAt: string }[]>('/admin/users'),
  adminListGroups: () =>
    request<{ id: string; name: string; description: string | null; createdAt: string; createdByEmail: string }[]>('/admin/groups')
};
