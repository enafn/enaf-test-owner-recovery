// ENAF TEST — NOT LIVE. This browser page has no reset authority of its own.
// The protected staff portal and database action independently verify ownership.

const projectUrl = 'https://ltosmnrnsnkuemfzhwpb.supabase.co';
const publicKey = 'sb_publishable_w3kj9kAGGNrQWCxBvUFnLg_yupbHoMz';
const staffPortalUrl = projectUrl + '/functions/v1/enaf-phase-one-staff-portal?action=staging-test-pin-reset';

let accessToken = '';
let resetIdempotencyKey = crypto.randomUUID();

const signInPanel = document.getElementById('sign-in-panel');
const resetPanel = document.getElementById('reset-panel');
const signInStatus = document.getElementById('sign-in-status');
const resetStatus = document.getElementById('reset-status');
const passwordInput = document.getElementById('password');
const pinInput = document.getElementById('pin');
const signInButton = document.getElementById('sign-in');
const resetButton = document.getElementById('reset');

function showMessage(element, message, kind = 'note') {
  element.textContent = message;
  element.className = kind;
}

function apiHeaders() {
  return { apikey: publicKey, authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' };
}

function clearSession() {
  accessToken = '';
  resetIdempotencyKey = crypto.randomUUID();
  passwordInput.value = '';
  pinInput.value = '';
  resetPanel.classList.add('hidden');
  signInPanel.classList.remove('hidden');
}

function rejectFramedPage() {
  if (window.top === window.self) return false;
  document.body.replaceChildren();
  const message = document.createElement('p');
  message.className = 'warn';
  message.textContent = 'This staging page cannot be displayed in a frame.';
  document.body.append(message);
  return true;
}

if (!rejectFramedPage()) {
  document.getElementById('sign-in-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      showMessage(signInStatus, 'Enter your ENAF owner email and password.', 'warn');
      return;
    }

    signInButton.disabled = true;
    showMessage(signInStatus, 'Signing in.', 'note');
    try {
      const response = await fetch(projectUrl + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: publicKey, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.access_token !== 'string') {
        showMessage(signInStatus, 'Sign-in could not be verified.', 'warn');
        return;
      }
      accessToken = data.access_token;
      signInPanel.classList.add('hidden');
      resetPanel.classList.remove('hidden');
      showMessage(resetStatus, 'Owner access is verified. Enter a staging-only four-digit PIN.', 'ok');
    } catch {
      showMessage(signInStatus, 'Sign-in could not be verified.', 'warn');
    } finally {
      passwordInput.value = '';
      signInButton.disabled = false;
    }
  });

  document.getElementById('reset-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const pin = pinInput.value;
    if (!/^[0-9]{4}$/.test(pin)) {
      showMessage(resetStatus, 'Enter exactly four digits.', 'warn');
      return;
    }

    resetButton.disabled = true;
    showMessage(resetStatus, 'Resetting the staging test PIN.', 'note');
    try {
      const response = await fetch(staffPortalUrl, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ pin, idempotencyKey: resetIdempotencyKey }),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.result !== 'staging-test-pin-reset') {
        showMessage(resetStatus, 'The staging test PIN could not be reset.', 'warn');
        return;
      }
      resetIdempotencyKey = crypto.randomUUID();
      showMessage(resetStatus, data.duplicate === true ? 'That reset request was already completed.' : 'The staging test PIN was reset. Keep it private for the IVR test.', 'ok');
    } catch {
      showMessage(resetStatus, 'The staging test PIN could not be reset.', 'warn');
    } finally {
      pinInput.value = '';
      resetButton.disabled = false;
    }
  });

  document.getElementById('sign-out').addEventListener('click', async () => {
    const token = accessToken;
    clearSession();
    if (token) {
      await fetch(projectUrl + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: publicKey, authorization: 'Bearer ' + token },
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      }).catch(() => undefined);
    }
    showMessage(signInStatus, 'Signed out of the staging owner page.', 'ok');
  });
}
