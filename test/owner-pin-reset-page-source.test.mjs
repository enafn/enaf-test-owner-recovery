import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = new URL('../owner-pin-reset.html', import.meta.url);
const script = new URL('../owner-pin-reset.js', import.meta.url);
const stylesheet = new URL('../owner-pin-reset.css', import.meta.url);
const providerPage = new URL('../provider.html', import.meta.url);

test('owner reset page is a constrained static staging page with no inline executable code', async () => {
  const [html, js, css] = await Promise.all([readFile(page, 'utf8'), readFile(script, 'utf8'), readFile(stylesheet, 'utf8')]);
  assert.match(html, /ENAF TEST — NOT LIVE/);
  assert.match(html, /owner-pin-reset\.css/);
  assert.match(html, /owner-pin-reset\.js/);
  assert.match(html, /default-src 'none'; script-src 'self'; style-src 'self'; connect-src https:\/\/ltosmnrnsnkuemfzhwpb\.supabase\.co; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i);
  assert.doesNotMatch(html, /on(?:click|submit|load)=/i);
  assert.match(css, /\.hidden/);
  assert.match(js, /https:\/\/ltosmnrnsnkuemfzhwpb\.supabase\.co/);
});

test('owner reset page uses the same approved public staging key as the existing provider page', async () => {
  const [js, provider] = await Promise.all([readFile(script, 'utf8'), readFile(providerPage, 'utf8')]);
  const pageKey = js.match(/const publicKey = '([^']+)'/);
  const providerKey = provider.match(/const publicKey = '([^']+)'/);
  assert.ok(pageKey);
  assert.ok(providerKey);
  assert.equal(pageKey[1], providerKey[1]);
  assert.match(pageKey[1], /^sb_publishable_/);
});

test('owner reset page keeps credentials and the PIN in memory and sends resets only to the protected portal', async () => {
  const js = await readFile(script, 'utf8');
  const html = await readFile(page, 'utf8');
  assert.match(html, /id="pin"[^>]*disabled/);
  assert.match(html, /id="reset"[^>]*disabled/);
  assert.match(js, /enaf-phase-one-staff-portal\?action=owner-identity/);
  assert.match(js, /method: 'GET'/);
  assert.match(js, /data\.result === 'owner-identity-authorized'/);
  assert.match(js, /setResetControlsEnabled\(false\)/);
  assert.match(js, /setResetControlsEnabled\(true\)/);
  assert.match(js, /enaf-phase-one-staff-portal\?action=staging-test-pin-reset/);
  assert.match(js, /authorization: 'Bearer ' \+ accessToken/);
  assert.match(js, /credentials: 'omit'/);
  assert.match(js, /referrerPolicy: 'no-referrer'/);
  assert.match(js, /passwordInput\.value = ''/);
  assert.match(js, /pinInput\.value = ''/);
  assert.match(js, /crypto\.randomUUID\(\)/);
  assert.match(js, /rejectFramedPage/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie|console\.|enaf_staging_ivr_test_member_01/i);
  assert.doesNotMatch(js, /serviceRole|SUPABASE_SECRET_KEYS|TWILIO_AUTH_TOKEN|pin_verifier|twilio|stripe/i);
});
