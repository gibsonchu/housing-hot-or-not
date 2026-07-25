// Client for the Building Taste API. All state lives on the server; the only
// thing kept in localStorage is this browser's anonymous voter id.

const VOTER_KEY = 'bt_voter_id';

export function voterId() {
  let id = null;
  try { id = localStorage.getItem(VOTER_KEY); } catch (e) {}
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || fallbackUuid();
    try { localStorage.setItem(VOTER_KEY, id); } catch (e) {}
  }
  return id;
}

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function request(path, options) {
  const res = await fetch(path, options);
  let body = null;
  try { body = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error((body && (body.detail || body.error)) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const post = (path, body, headers = {}) =>
  request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

export const getState = () => request(`/api/state?voterId=${encodeURIComponent(voterId())}`);
export const getInsights = () => request('/api/insights');
export const getProfile = () => request(`/api/profile?voterId=${encodeURIComponent(voterId())}`);

export const castVote = (winnerId, loserId) =>
  post('/api/vote', { voterId: voterId(), winnerId, loserId });

export const sendAnswer = (q, answer, elo) =>
  post('/api/survey', {
    voterId: voterId(),
    qid: q.id, category: q.category, prompt: q.prompt, type: q.type,
    answer, elo: elo || null,
  });

// Admin — the password travels as a header and is verified server-side.
const adminHeaders = (pw) => ({ 'x-admin-password': pw });
export const adminVerify = (pw) => post('/api/admin', { action: 'verify' }, adminHeaders(pw));
export const adminList = (pw) => request('/api/admin', { headers: adminHeaders(pw) });
export const adminCreate = (pw, buildings) => post('/api/admin', { action: 'create', buildings }, adminHeaders(pw));
export const adminUpdate = (pw, building) => post('/api/admin', { action: 'update', building }, adminHeaders(pw));
export const adminDelete = (pw, id) => post('/api/admin', { action: 'delete', id }, adminHeaders(pw));
export const adminResetElo = (pw) => post('/api/admin', { action: 'resetElo' }, adminHeaders(pw));
