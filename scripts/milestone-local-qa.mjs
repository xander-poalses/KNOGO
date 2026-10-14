import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

process.loadEnvFile(new URL('../apps/mobile/.env.local', import.meta.url));
const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
assert.equal(base, 'http://127.0.0.1:54321', 'This check is restricted to the local testing backend.');
const headers = { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
const email = `milestone-${Date.now()}@example.test`;
// A disposable local test credential, never a hosted account password.
const password = 'MilestoneOnly-LocalTest-2026!';
const request = (path, body, token) => fetch(`${base}${path}`, { method: 'POST', headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

const signup = await request('/auth/v1/signup?redirect_to=http%3A%2F%2Flocalhost%3A8083%2Fauth%2Fcallback', { email, password });
assert.equal(signup.status, 200);
assert.equal((await signup.json()).access_token, undefined, 'Confirmation must remain required.');
const unconfirmed = await request('/auth/v1/token?grant_type=password', { email, password });
assert.equal(unconfirmed.status, 400);
assert.equal((await unconfirmed.json()).error_code, 'email_not_confirmed');

let message;
for (let attempt = 0; attempt < 10; attempt++) {
  const inbox = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
  const entry = inbox.messages?.find(item => item.To?.some(recipient => recipient.Address === email));
  if (entry) {
    message = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${encodeURIComponent(entry.ID)}`)).json();
    break;
  }
  await new Promise(resolve => setTimeout(resolve, 250));
}
assert.ok(message, 'Confirmation email must reach the local inbox.');
const doc = new JSDOM(message.HTML).window.document;
const link = [...doc.querySelectorAll('a[href]')].map(item => new URL(item.href)).find(url => url.origin === base && url.pathname === '/auth/v1/verify');
assert.ok(link, 'Email must contain a local verification link.');
assert.equal(link.searchParams.get('redirect_to'), 'http://localhost:8083/auth/callback');
const confirmed = await request('/auth/v1/verify', { token_hash: link.searchParams.get('token'), type: 'signup' });
assert.equal(confirmed.status, 200);
const login = await request('/auth/v1/token?grant_type=password', { email, password });
assert.equal(login.status, 200);
const session = await login.json();
assert.ok(session.access_token);

const submitted = await request('/rest/v1/rpc/submit_status_report', { p_place_id: 'milestone-test-venue', p_report_source: 'phone', p_source_url: null, p_answers: [{ type: 'open_status', value: 'open' }] }, session.access_token);
assert.equal(submitted.status, 200);
const [report] = await submitted.json();
assert.ok(report.report_id);
const persisted = await fetch(`${base}/rest/v1/report_batches?id=eq.${report.report_id}&select=id`, { headers: { ...headers, Authorization: `Bearer ${session.access_token}` } });
assert.deepEqual(await persisted.json(), [{ id: report.report_id }]);
const receipt = await request('/rest/v1/rpc/read_report_assessment', { p_report_id: report.report_id }, session.access_token);
assert.equal(receipt.status, 200);
assert.equal((await receipt.json()).state, 'unavailable', 'An unconfigured provider must not claim Gemini ran.');
const logout = await request('/auth/v1/logout?scope=local', {}, session.access_token);
assert.equal(logout.status, 204);
const refresh = await request('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
assert.equal(refresh.status, 400);
console.log('PASS: local signup, required confirmation, inbox delivery, sign-in, report persistence, honest unavailable receipt, logout and refresh revocation.');
console.log(`Disposable local account for browser sign-in: ${email}`);
