import type {
  AuthResponse,
  Group,
  GroupMember,
  Expense,
  Balance,
  Debt,
  Settlement,
  InviteLink,
  SplitType
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

  // Groups
  listGroups: () => request<Group[]>('/groups'),
  createGroup: (name: string, description?: string) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
  getGroup: (id: string) =>
    request<{ id: string; name: string; description: string | null; members: GroupMember[] }>(
      `/groups/${id}`
    ),
  createInvite: (groupId: string) =>
    request<InviteLink>(`/groups/${groupId}/invite`, { method: 'POST' }),
  joinGroup: (inviteToken: string) =>
    request<{ id: string; name: string }>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteToken })
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

  // Admin (superadmin only)
  adminListUsers: () =>
    request<{ id: string; email: string; name: string; role: string; createdAt: string }[]>('/admin/users'),
  adminListGroups: () =>
    request<{ id: string; name: string; description: string | null; createdAt: string; createdByEmail: string }[]>('/admin/groups')
};
