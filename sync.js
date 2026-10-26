/* =========================================================
   Cosmic Currents — cloud sync (Firebase: email & password accounts + Firestore)
   Your data is stored under your own account (user id):
     users/{your-uid}/meta/state       pockets, schedules, tags, settings
     users/{your-uid}/txns/{record-id} one document per record
   If firebase-config.js is empty, the app simply works offline-only.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.COSMIC_FIREBASE || {};
  const enabled = !!(cfg.apiKey && cfg.projectId && cfg.appId);
  const VERSION = '10.12.2';
  const BASE = `https://www.gstatic.com/firebasejs/${VERSION}/`;

  const st = {enabled, state: enabled ? 'loading' : 'off', email: '', uid: '', lastSync: 0, error: ''};
  const subs = [];
  let F = null, auth = null, db = null, hooks = null, ready = false, unsubs = [], applyT = null;
  let synced = {meta: null, txns: new Map()};          // what the cloud has (as JSON strings)
  const remote = {meta: null, txns: new Map()};        // live copy from the listeners

  const set = patch => { Object.assign(st, patch); subs.forEach(f => { try { f({...st}); } catch (e) { /* ignore */ } }); };
  const metaRef = () => F.doc(db, 'users', st.uid, 'meta', 'state');
  const txCol = () => F.collection(db, 'users', st.uid, 'txns');

  function friendly(e) {
    const c = (e && e.code) || '';
    if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login')) return 'Email or password is incorrect.';
    if (c.includes('invalid-email')) return 'That email address doesn\'t look right.';
    if (c.includes('email-already-in-use')) return 'An account with this email already exists — sign in instead.';
    if (c.includes('weak-password')) return 'Password is too short — use at least 6 characters.';
    if (c.includes('too-many-requests')) return 'Too many tries. Wait a few minutes, or reset your password.';
    if (c.includes('user-disabled')) return 'This account has been disabled.';
    if (c.includes('admin-restricted-operation')) return 'Creating new accounts is turned off for this website.';
    if (c.includes('unauthorized-domain')) return 'This website address is not authorised in Firebase yet. Add it in Firebase: Authentication > Settings > Authorized domains.';
    if (c.includes('permission-denied')) return 'Firestore rules are blocking access. Paste the rules from the manual and press Publish.';
    if (c.includes('network') || c.includes('unavailable')) return 'No internet connection right now.';
    if (c.includes('configuration-not-found') || c.includes('operation-not-allowed')) return 'Email & password sign-in is not turned on yet. In Firebase: Authentication > Sign-in method > Email/Password > Enable.';
    return (e && e.message) || 'Something went wrong with cloud sync.';
  }

  async function boot() {
    try {
      const [a, au, fs] = await Promise.all([import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')]);
      F = Object.assign({}, a, au, fs);
      const app = F.initializeApp(cfg);
      auth = F.getAuth(app);
      try { db = F.initializeFirestore(app, {localCache: F.persistentLocalCache({tabManager: F.persistentMultipleTabManager()})}); }
      catch (e) { db = F.getFirestore(app); }
      F.onAuthStateChanged(auth, u => { u ? onSignedIn(u) : onSignedOut(); });
    } catch (e) {
      set({state: 'error', sdkFailed: true, error: 'Could not reach the cloud. Check your internet connection and try again.'});
    }
  }

  function stopListening() { unsubs.forEach(u => { try { u(); } catch (e) { /* ignore */ } }); unsubs = []; clearTimeout(applyT); }

  function onSignedOut() {
    stopListening(); ready = false;
    set({state: 'signedout', email: '', uid: ''});
    if (hooks && hooks.signedOut) hooks.signedOut();
  }

  async function onSignedIn(u) {
    stopListening(); ready = false;
    set({state: 'syncing', email: u.email || '', uid: u.uid, error: ''});
    try {
      const [m, q] = await Promise.all([F.getDoc(metaRef()), F.getDocs(txCol())]);
      remote.meta = m.exists() ? JSON.parse(m.data().j) : null;
      remote.txns = new Map();
      q.forEach(d => remote.txns.set(d.id, JSON.parse(d.data().j)));
      synced = {meta: remote.meta ? JSON.stringify(remote.meta) : null, txns: new Map([...remote.txns].map(([k, v]) => [k, JSON.stringify(v)]))};
      // The app decides what to keep (cloud, this device, or both)
      const finalData = await hooks.resolve({meta: remote.meta, txns: [...remote.txns.values()]}, u.uid);
      hooks.apply(finalData, u.uid);
      ready = true;
      writeDiff(finalData).catch(e => set({state: 'error', error: friendly(e)}));
      listen();
      set({state: 'synced', lastSync: Date.now()});
    } catch (e) {
      set({state: 'error', error: friendly(e)});
    }
  }

  // Write only what changed since the last known cloud copy
  async function writeDiff(data) {
    const ops = [];
    const metaStr = JSON.stringify(data.meta);
    if (metaStr !== synced.meta) ops.push(['set', metaRef(), {j: metaStr, at: Date.now()}]);
    const seen = new Set();
    for (const t of data.txns) {
      const s = JSON.stringify(t);
      seen.add(t.id);
      if (synced.txns.get(t.id) !== s) ops.push(['set', F.doc(txCol(), t.id), {j: s, d: t.date || ''}]);
    }
    for (const id of synced.txns.keys()) if (!seen.has(id)) ops.push(['del', F.doc(txCol(), id)]);
    if (!ops.length) return;
    synced = {meta: metaStr, txns: new Map(data.txns.map(t => [t.id, JSON.stringify(t)]))};
    const commits = [];
    for (let i = 0; i < ops.length; i += 400) {
      const b = F.writeBatch(db);
      ops.slice(i, i + 400).forEach(([kind, ref, val]) => kind === 'set' ? b.set(ref, val) : b.delete(ref));
      commits.push(b.commit());   // applied to the local cache right away, sent when online
    }
    await Promise.all(commits);
  }

  function listen() {
    const onErr = e => set({state: 'error', error: friendly(e)});
    unsubs.push(F.onSnapshot(metaRef(), snap => {
      remote.meta = snap.exists() ? JSON.parse(snap.data().j) : null;
      scheduleApply();
    }, onErr));
    unsubs.push(F.onSnapshot(txCol(), snap => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'removed') remote.txns.delete(ch.doc.id);
        else remote.txns.set(ch.doc.id, JSON.parse(ch.doc.data().j));
      });
      scheduleApply();
    }, onErr));
  }

  function scheduleApply() {
    clearTimeout(applyT);
    applyT = setTimeout(() => {
      if (!remote.meta) return;
      const data = {meta: remote.meta, txns: [...remote.txns.values()]};
      synced = {meta: JSON.stringify(remote.meta), txns: new Map(data.txns.map(t => [t.id, JSON.stringify(t)]))};
      hooks.applyRemote(data);
      if (st.state !== 'error') set({state: 'synced', lastSync: Date.now()});
    }, 150);
  }

  function push(data) {
    if (!ready || !st.uid) return false;
    set({state: navigator.onLine === false ? 'offline' : 'syncing'});
    writeDiff(data)
      .then(() => set({state: 'synced', lastSync: Date.now(), error: ''}))
      .catch(e => set({state: 'error', error: friendly(e)}));
    return true;
  }

  // Email & password accounts. Each returns {ok, error}.
  async function call(fn) {
    if (!enabled) return {ok: false, error: 'Cloud sync is not set up yet.'};
    if (!auth) return {ok: false, error: 'Still connecting — try again in a moment.'};
    try { await fn(); return {ok: true}; } catch (e) { return {ok: false, error: friendly(e)}; }
  }
  const signInEmail = (email, pw) => call(() => F.signInWithEmailAndPassword(auth, email.trim(), pw));
  const signUpEmail = (email, pw) => call(async () => {
    const cred = await F.createUserWithEmailAndPassword(auth, email.trim(), pw);
    try { await F.sendEmailVerification(cred.user); } catch (e) { /* optional */ }
  });
  const resetPassword = email => call(() => F.sendPasswordResetEmail(auth, email.trim()));

  // Sign out after pending changes reach the cloud (gives up waiting after 6 s)
  async function signOut() {
    if (db && navigator.onLine !== false) {
      try { await Promise.race([F.waitForPendingWrites(db), new Promise(r => setTimeout(r, 6000))]); } catch (e) { /* ignore */ }
    }
    stopListening(); ready = false;
    if (auth) await F.signOut(auth);
  }
  const hasPending = () => st.state === 'syncing' || st.state === 'offline';

  window.addEventListener('online', () => { if (ready && st.state === 'offline') set({state: 'syncing'}); });
  window.addEventListener('offline', () => { if (ready) set({state: 'offline'}); });

  window.CloudSync = {
    enabled,
    status: () => ({...st}),
    onChange: f => subs.push(f),
    start(h) { hooks = h; if (enabled) boot(); else set({state: 'off'}); },
    signInEmail, signUpEmail, resetPassword, signOut, push, hasPending
  };
})();
