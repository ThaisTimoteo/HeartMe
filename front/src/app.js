const API = {
  auth: '/api/auth',
  users: '/api/users',
  posts: '/api/posts',
  notifications: '/api/notifications'
};

const STORAGE = {
  token: 'hm_token'
};

const PUBLIC_ROUTES = ['/', '/login', '/register'];
const PROFILE_REQUIRED_ROUTES = ['/feed', '/explore', '/explore/posts', '/explore/users', '/create', '/folders', '/notifications'];

const state = {
  token: localStorage.getItem(STORAGE.token) || null,
  account: null,
  profile: null,
  userId: null,
  posts: [],
  explorePosts: [],
  exploreUsers: [],
  viewedProfile: null,
  viewedProfilePosts: [],
  notifications: [],
  folders: [],
  unreadCount: 0,
  lastSearch: '',
  ws: null,
  wsConnected: false,
  wsSubId: 0,
  notificationsPoller: null,
  authError: '',
  imageSearch: [],
  selectedPostImage: null,
  selectedPostKeyword: '',
  createPostError: '',
  createPostDraft: { title: '', content: '', keywords: '' },
  avatarPickerOpen: false,
  pendingAvatarUrl: '',
  avatarSelectionDirty: false,
  profileDraft: { username: '', bio: '' }
};

const PRESET_AVATARS_BASE = [
  { label: 'Avatar exemplo', url: 'assets/avatars/avatar-exemplo.jpg' },
  { label: 'Avatar 1', url: 'assets/avatars/avatar (1).png' },
  { label: 'Avatar 2', url: 'assets/avatars/avatar (2).jpg' },
  { label: 'Avatar 3', url: 'assets/avatars/avatar (3).jpg' },
  { label: 'Avatar 4', url: 'assets/avatars/avatar (4).jpg' },
  { label: 'Avatar 5', url: 'assets/avatars/avatar (5).jpg' }
];
let PRESET_AVATARS = [...PRESET_AVATARS_BASE];

function fileExists(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = `${url}?v=${Date.now()}`;
  });
}

async function loadPresetAvatars() {
  const discovered = [];
  const seen = new Set(PRESET_AVATARS_BASE.map(item => item.url));
  for (const item of PRESET_AVATARS_BASE) {
    discovered.push(item);
  }

  for (let i = 1; i <= 40; i += 1) {
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      const url = `assets/avatars/avatar (${i}).${ext}`;
      if (seen.has(url)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await fileExists(url)) {
        seen.add(url);
        discovered.push({ label: `Avatar ${i}`, url });
        break;
      }
    }
  }

  PRESET_AVATARS = discovered;
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function saveLocal() {
  if (state.token) localStorage.setItem(STORAGE.token, state.token);
  else localStorage.removeItem(STORAGE.token);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toast(message, type = 'success') {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast ${type === 'error' ? 'toast--error' : ''}`.trim();
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

function getToken() {
  return state.token || localStorage.getItem(STORAGE.token) || '';
}

function setToken(token) {
  state.token = token || null;
  if (state.token) localStorage.setItem(STORAGE.token, state.token);
  else localStorage.removeItem(STORAGE.token);
}

function authHeaders(extra = {}) {
  const token = getToken();
  if (token && !state.token) state.token = token;
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.headers || {})
    }
  });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '');
  if (!res.ok) {
    let msg = typeof body === 'string' && body ? body : body?.message || body?.error || `Erro ${res.status}`;
    if (typeof msg === 'string' && /<\!doctype html>|<html/i.test(msg)) {
      const title = msg.match(/<title>(.*?)<\/title>/i)?.[1] || '';
      msg = title ? `${title}` : `Erro ${res.status}`;
    }
    throw new Error(msg);
  }
  return body;
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function currentRoute() {
  return (location.hash || '#/').slice(1) || '/';
}

function routeTo(route) {
  location.hash = route.startsWith('#') ? route : `#${route}`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function makeAvatarDataUrl(name = 'Heart.me') {
  const label = (name || 'H').trim().slice(0, 1).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#f3d0d6"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#9b5c67">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function profileAvatar() {
  return state.profile?.avatarUrl || makeAvatarDataUrl(state.profile?.username || state.profile?.name || state.account?.email || 'Heart.me');
}

function displayName() {
  if (state.profile?.username) return state.profile.username;
  if (state.profile?.name) return state.profile.name;
  if (state.account?.email) return state.account.email.split('@')[0];
  return 'Heart.me';
}

function notificationTitle(item = {}) {
  switch (item.type) {
    case 'POST_LIKED':
      return 'Nova curtida';
    default:
      return 'Notificação';
  }
}

function notificationMessageHtml(item = {}) {
  const fallback = escapeHtml(item.message || 'Você recebeu uma notificação.');
  if (!item.actorUserId) return fallback;
  const actorName = escapeHtml(item.actorName || extractActorName(item.message) || 'Usuário');
  const actorId = escapeHtml(item.actorUserId);
  const message = String(item.message || '');
  if (item.actorName && message.includes(item.actorName)) {
    const parts = message.split(item.actorName);
    return `${escapeHtml(parts[0] || '')}<button type="button" class="notif-user-link" data-action="open-profile-from-notification" data-user-id="${actorId}">${actorName}</button>${escapeHtml(parts.slice(1).join(item.actorName) || '')}`;
  }
  const extracted = extractActorName(message);
  if (extracted && message.includes(extracted)) {
    const parts = message.split(extracted);
    return `${escapeHtml(parts[0] || '')}<button type="button" class="notif-user-link" data-action="open-profile-from-notification" data-user-id="${actorId}">${escapeHtml(extracted)}</button>${escapeHtml(parts.slice(1).join(extracted) || '')}`;
  }
  return `<button type="button" class="notif-user-link" data-action="open-profile-from-notification" data-user-id="${actorId}">${actorName}</button>`;
}

function extractActorName(message = '') {
  const text = String(message || '').trim();
  if (!text) return '';
  const match = text.match(/^(.+?)\s+curtiu\s+o\s+seu\s+post/i);
  return match ? match[1].trim() : '';
}

function openModal({ title, body, footer }) {
  $('#modalTitle').textContent = title || 'Confirmar';
  $('#modalBody').innerHTML = body || '';
  $('#modalFooter').innerHTML = footer || '';
  $('#modal').hidden = false;
}

function closeModal() {
  $('#modal').hidden = true;
  $('#modalBody').innerHTML = '';
  $('#modalFooter').innerHTML = '';
}

function bindModalBaseEvents() {
  $$('#modal [data-close], #modal [data-close]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
}

function syncShell() {
  const route = currentRoute();
  const isAuthed = !!state.token;
  const showPrivateChrome = isAuthed && !PUBLIC_ROUTES.includes(route);
  const searchInput = $('#searchInput');
  if (searchInput) {
    searchInput.placeholder = 'Pesquisar posts ou pessoas';
    if (document.activeElement !== searchInput) searchInput.value = state.lastSearch || '';
  }
  $('#sidebar').hidden = !showPrivateChrome;
  $('#topbar').hidden = !showPrivateChrome;
  $('#app').classList.toggle('is-public', !showPrivateChrome);

  if (isAuthed) {
    const avatar = profileAvatar();
    $('#profileAvatar').src = avatar;
    $('#menuAvatar').src = avatar;
    $('#menuNameTop').textContent = displayName();
    $('#menuSubTop').textContent = state.account?.email || 'Conta';
    $('#menuName').textContent = displayName();
    $('#menuSub').textContent = state.account?.email || 'Conta';
  }

  updateNotifBadge();
  setActiveNav();
}

function guardRoute(route) {
  if (!state.token) return PUBLIC_ROUTES.includes(route) ? route : '/';
  if (PUBLIC_ROUTES.includes(route)) return state.profile ? '/feed' : '/onboarding';
  if (!state.profile && (PROFILE_REQUIRED_ROUTES.includes(route) || route.startsWith('/folders/') || route.startsWith('/profile/'))) return '/onboarding';
  if (route === '/') return state.profile ? '/feed' : '/onboarding';
  if (route === '/explore') return '/explore/posts';
  return route;
}

function setActiveNav() {
  const route = currentRoute();
  const map = {
    btnFeed: ['/feed'],
    btnExplore: ['/explore', '/explore/posts', '/explore/users'],
    btnCreate: ['/create'],
    btnFolders: ['/folders'],
    btnNotifs: ['/notifications'],
    btnSettings: ['/settings', '/onboarding']
  };

  Object.entries(map).forEach(([id, routes]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-active', routes.some(item => route === item || route.startsWith(item + '/')));
  });
}

function updateNotifBadge() {
  state.unreadCount = state.notifications.filter(item => !item.read).length;
  const badge = $('#notifBadge');
  if (!badge) return;
  badge.hidden = !state.unreadCount || !state.token;
  badge.textContent = String(Math.min(99, state.unreadCount));
}

function mergeNotifications(items) {
  const byId = new Map();
  [...items, ...state.notifications].forEach(item => {
    if (!item?.id) return;
    byId.set(item.id, { ...item, read: !!item.read });
  });
  state.notifications = Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 100);
  updateNotifBadge();
}

function wsUrlForUser(userId) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws?userId=${encodeURIComponent(userId)}`;
}

function stompFrame(cmd, headers = {}, body = '') {
  const lines = [cmd];
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) lines.push(`${key}:${value}`);
  });
  lines.push('', body);
  return lines.join('\n');
}

function stompSend(frame) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) state.ws.send(frame + '\u0000');
}

function parseStompFrames(data) {
  return String(data)
    .split('\u0000')
    .map(part => part.trimStart())
    .filter(Boolean)
    .map(raw => {
      const [head, ...rest] = raw.split(/\n\n/);
      const lines = head.split('\n');
      const command = lines.shift()?.trim();
      const headers = {};
      lines.forEach(line => {
        const idx = line.indexOf(':');
        if (idx > 0) headers[line.slice(0, idx)] = line.slice(idx + 1);
      });
      return { command, headers, body: rest.join('\n\n') };
    });
}

function updateSocketStatus() {
  const chip = $('#socketStatus');
  if (!chip) return;
  chip.innerHTML = `<span class="status-dot ${state.wsConnected ? 'status-dot--online' : ''}"></span>${state.wsConnected ? 'Tempo real conectado' : 'Tempo real desconectado'}`;
}


function stopNotificationPolling() {
  if (state.notificationsPoller) {
    clearInterval(state.notificationsPoller);
    state.notificationsPoller = null;
  }
}

function startNotificationPolling() {
  if (!state.token) return;
  if (state.notificationsPoller) return;
  state.notificationsPoller = setInterval(async () => {
    if (!state.token) {
      stopNotificationPolling();
      return;
    }
    try {
      await refreshNotifications();
      if (currentRoute() === '/notifications') render();
    } catch {}
  }, 10000);
}

function stopNotificationSocket() {
  try {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      stompSend(stompFrame('DISCONNECT'));
      state.ws.close();
    }
  } catch {}
  state.ws = null;
  state.wsConnected = false;
  updateSocketStatus();
  stopNotificationPolling();
}

function startNotificationSocket() {
  if (!state.token || !state.userId) return;
  if (state.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.ws.readyState)) return;

  try {
    state.ws = new WebSocket(wsUrlForUser(state.userId));
  } catch {
    return;
  }

  state.ws.onopen = () => {
    stompSend(stompFrame('CONNECT', {
      'accept-version': '1.2',
      'heart-beat': '10000,10000'
    }));
  };

  state.ws.onmessage = event => {
    for (const frame of parseStompFrames(event.data)) {
      if (frame.command === 'CONNECTED') {
        state.wsConnected = true;
        updateSocketStatus();
        stompSend(stompFrame('SUBSCRIBE', {
          id: `sub-${++state.wsSubId}`,
          destination: '/user/queue/notifications',
          ack: 'auto'
        }));
      } else if (frame.command === 'MESSAGE') {
        let payload = null;
        try { payload = JSON.parse(frame.body || '{}'); } catch {}
        if (payload) {
          mergeNotifications([payload]);
          toast(payload.message || 'Nova notificação');
          if (currentRoute() === '/notifications') render();
        }
      }
    }
  };

  state.ws.onclose = () => {
    state.wsConnected = false;
    state.ws = null;
    updateSocketStatus();
    if (state.token && state.userId) {
      setTimeout(() => {
        if (!state.ws) startNotificationSocket();
      }, 2500);
    }
  };

  state.ws.onerror = () => {
    state.wsConnected = false;
    updateSocketStatus();
  };
}

async function loadSession() {
  if (!state.token) return;
  const decoded = decodeJwt(state.token);
  state.userId = decoded?.sub || null;

  try {
    state.account = await apiFetch(`${API.auth}/me`, { headers: authHeaders() });
  } catch {
    logout(false);
    return;
  }

  state.profile = await apiFetch(`${API.users}/me`, { headers: authHeaders() }).catch(() => null);
  if (!state.profile && state.userId) {
    state.profile = await apiFetch(`${API.users}/by-auth/${encodeURIComponent(state.userId)}`, { headers: authHeaders() }).catch(() => null);
  }

  if (state.token) {
    await Promise.all([refreshNotifications().catch(() => {}), refreshFolders().catch(() => {})]);
    startNotificationSocket();
    startNotificationPolling();
  }
}

async function refreshNotifications() {
  if (!state.token) return;
  const items = await apiFetch(`${API.notifications}/me`, { headers: authHeaders() });
  mergeNotifications(Array.isArray(items) ? items : []);
}

async function refreshMyPosts() {
  if (!state.userId) {
    state.posts = [];
    return;
  }
  state.posts = await apiFetch(`${API.posts}?userId=${encodeURIComponent(state.userId)}`).catch(() => []);
}

async function refreshFolders() {
  if (!state.token) {
    state.folders = [];
    return;
  }
  const folders = await apiFetch(`${API.users}/me/folders`, { headers: authHeaders() }).catch(() => []);
  state.folders = Array.isArray(folders) ? folders.map(folder => ({ ...folder, posts: Array.isArray(folder.postIds) ? folder.postIds : (folder.posts || []) })) : [];
}

async function searchPosts(query) {
  state.lastSearch = query;
  state.explorePosts = query
    ? await apiFetch(`${API.posts}/search?query=${encodeURIComponent(query)}`).catch(() => [])
    : [];
}

async function searchUsers(query) {
  state.lastSearch = query;
  state.exploreUsers = query
    ? await apiFetch(`${API.users}/search?q=${encodeURIComponent(query)}`).catch(() => [])
    : [];
}

async function searchAll(query) {
  await Promise.all([searchPosts(query), searchUsers(query)]);
}

async function loadViewedProfile(userId) {
  if (!userId) {
    state.viewedProfile = null;
    state.viewedProfilePosts = [];
    return;
  }
  state.viewedProfile = await apiFetch(`${API.users}/by-auth/${encodeURIComponent(userId)}`, { headers: authHeaders() }).catch(() => null);
  state.viewedProfilePosts = await apiFetch(`${API.posts}/user/${encodeURIComponent(userId)}`, { headers: authHeaders() }).catch(() => []);
}

function logout(showToast = true) {
  stopNotificationSocket();
  stopNotificationPolling();
  setToken(null);
  state.account = null;
  state.profile = null;
  state.userId = null;
  state.posts = [];
  state.explorePosts = [];
  state.exploreUsers = [];
  state.viewedProfile = null;
  state.viewedProfilePosts = [];
  state.notifications = [];
  state.folders = [];
  state.authError = '';
  state.pendingAvatarUrl = '';
  state.avatarSelectionDirty = false;
  state.profileDraft = { username: '', bio: '' };
  saveLocal();
  syncShell();
  routeTo('/');
  if (showToast) toast('Sessão encerrada');
  render();
}


function getProfileDraftValues() {
  const usernameInput = document.querySelector('#profileForm input[name="username"], #accountForm input[name="username"]');
  const bioInput = document.querySelector('#profileForm textarea[name="bio"], #accountForm textarea[name="bio"]');
  return {
    username: usernameInput ? usernameInput.value : (state.profileDraft.username || state.profile?.username || ''),
    bio: bioInput ? bioInput.value : (state.profileDraft.bio || state.profile?.bio || '')
  };
}

function syncProfileDraftFromDom() {
  state.profileDraft = getProfileDraftValues();
}

function profileAutoAvatarLabel() {
  const source = state.account?.email || state.profile?.username || state.profile?.name || 'Heart.me';
  return String(source).trim().slice(0, 1).toUpperCase() || 'H';
}

function avatarPresetOptions(selectedUrl = '') {
  if (!PRESET_AVATARS.length) return '';
  const previewAvatar = selectedUrl || 'assets/avatars/avatar-exemplo.jpg';
  return `
    <div class="avatar-actions">
      <button class="avatar-toggle ${!selectedUrl ? 'is-selected' : ''}" type="button" data-action="pick-avatar" data-url="">
        <span class="avatar avatar--choice avatar--auto">${escapeHtml(profileAutoAvatarLabel())}</span>
        <span>Automático</span>
      </button>
      <button class="avatar-toggle ${selectedUrl ? 'is-selected' : ''}" type="button" data-action="toggle-avatar-panel" aria-expanded="${state.avatarPickerOpen ? 'true' : 'false'}">
        <img class="avatar avatar--choice" src="${escapeHtml(previewAvatar)}" alt="Escolher avatar" />
        <span>${selectedUrl ? 'Trocar avatar' : 'Escolher avatar'}</span>
      </button>
    </div>
    <div class="avatar-picker-panel ${state.avatarPickerOpen ? 'is-open' : ''}" ${state.avatarPickerOpen ? '' : 'hidden'}>
      <div class="avatar-picker avatar-picker--scroll">
        ${PRESET_AVATARS.map(item => `
          <button class="avatar-choice ${selectedUrl === item.url ? 'is-selected' : ''}" type="button" data-action="pick-avatar" data-url="${escapeHtml(item.url)}">
            <img class="avatar avatar--choice" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.label)}" />
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function landingTemplate() {
  return `
    <section class="landing">
      <div class="landing__panel landing__panel--art">
        <div>
          <img src="assets/heartme.tela inicial - Logo.png" alt="Heart.me" class="landing__logo-wide" />
          <p class="landing__copy">Um lugar simples para guardar momentos, publicar do seu jeito e acompanhar o que importa para você.</p>
          <div class="landing__stack">
            <button class="btn btn--primary btn--block" id="goLoginBtn" type="button">Entrar</button>
            <button class="btn btn--ghost btn--block" id="goRegisterBtn" type="button">Criar conta</button>
          </div>
        </div>
        <div class="landing__foot">
          Entre ou crie sua conta para começar a publicar, curtir e acompanhar suas notificações.
        </div>
      </div>

      <div class="landing__panel landing__panel--cta">
        <div class="hero__eyebrow">Seu espaço social</div>
        <h2 class="landing__title" style="font-size: clamp(2rem, 3.2vw, 3rem);">Entre, publique e acompanhe tudo em um só lugar</h2>
        <p class="landing__copy">Um espaço leve para compartilhar ideias, descobrir conteúdos e acompanhar o que importa para você.</p>
        <div class="showcase section-sep">
          <h3 class="showcase__title">Dê uma olhada em como tudo funciona por dentro.</h3>
          <div class="showcase__grid">
            <button type="button" class="showcase__item" data-action="expand-showcase-image" data-src="assets/img. 01.png" data-title="Imagem 01"><img src="assets/img. 01.png" alt="Prévia do Heart.me" /></button>
            <button type="button" class="showcase__item" data-action="expand-showcase-image" data-src="assets/img.02.png" data-title="Imagem 02"><img src="assets/img.02.png" alt="Prévia do Heart.me" /></button>
            <button type="button" class="showcase__item" data-action="expand-showcase-image" data-src="assets/img. 03.png" data-title="Imagem 03"><img src="assets/img. 03.png" alt="Prévia do Heart.me" /></button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function authTemplate(kind) {
  const isLogin = kind === 'login';
  return `
    <section class="auth-layout">
      <div class="auth-card">
        <div class="auth-card__head">
          <img src="assets/heartme.tela inicial - Logo.png" alt="Heart.me" class="auth-card__brand" />
          <h1 class="auth-card__title">${isLogin ? 'Entrar na sua conta' : 'Criar sua conta'}</h1>
          <p class="auth-card__sub">${isLogin ? 'Use seu email e sua senha para entrar e continuar de onde parou.' : 'Crie sua conta para começar a montar seu espaço no Heart.me.'}</p>
        </div>

        ${state.authError ? `<div class="error-box">${escapeHtml(state.authError)}</div>` : ''}

        <form id="authForm" class="form-grid section-sep">
          <div class="field field--full">
            <label class="label">Email</label>
            <div class="input-wrap">
              <img src="assets/ProfileLogin.png" alt="" class="input-wrap__icon" />
              <input class="input" type="email" name="email" placeholder="voce@email.com" required />
            </div>
          </div>
          <div class="field field--full">
            <label class="label">Senha</label>
            <div class="input-wrap">
              <img src="assets/lockedSenha.png" alt="" class="input-wrap__icon" />
              <input class="input" type="password" name="password" placeholder="Sua senha" minlength="6" required />
            </div>
          </div>
          ${isLogin ? '' : `
            <div class="field field--full">
              <label class="label">Confirmar senha</label>
              <div class="input-wrap">
                <img src="assets/lockedSenha.png" alt="" class="input-wrap__icon" />
                <input class="input" type="password" name="confirmPassword" placeholder="Repita a senha" minlength="6" required />
              </div>
            </div>`}
          <div class="field field--full row">
            <button class="btn btn--primary" type="submit">${isLogin ? 'Entrar' : 'Criar conta'}</button>
            <button class="btn btn--ghost" id="goHomeBtn" type="button">Voltar</button>
          </div>
        </form>

        <div class="auth-switch section-sep">
          ${isLogin ? 'Não tem conta?' : 'Já tem conta?'}
          <button id="switchAuthBtn" type="button">${isLogin ? 'Criar conta' : 'Entrar'}</button>
        </div>
      </div>
    </section>
  `;
}

function onboardingTemplate() {
  return `
    <div class="page">
      <section class="hero">
        <div class="hero__eyebrow">Onboarding</div>
        <h1 class="hero__title">Complete seu perfil para começar</h1>
        <p class="hero__sub">Defina como seu perfil vai aparecer no app antes de começar a publicar e interagir.</p>
      </section>

      <section class="layout-2">
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Seu perfil</h2>
              <p class="panel__sub">Escolha o nome que vai identificar seu perfil dentro do app.</p>
            </div>
          </div>

          <form id="profileForm" class="form-grid">
            <div class="field field--full">
              <label class="label">Nome no app</label>
              <input class="input" name="username" maxlength="30" value="${escapeHtml(state.profileDraft.username || state.profile?.username || '')}" placeholder="Escolha como seu perfil vai aparecer" required />
            </div>
            <div class="field field--full">
              <label class="label">Bio</label>
              <textarea class="textarea" name="bio" maxlength="280" placeholder="Fale um pouco sobre você">${escapeHtml(state.profileDraft.bio || state.profile?.bio || '')}</textarea>
            </div>
            <div class="field field--full">
              <label class="label">Foto de perfil</label>
              <input type="hidden" name="avatarUrl" id="profileAvatarUrlInput" value="${escapeHtml(state.pendingAvatarUrl || state.profile?.avatarUrl || '')}" />
              <div class="hint">Escolha um avatar da galeria ou deixe no modo automático.</div>
              ${avatarPresetOptions(state.pendingAvatarUrl || state.profile?.avatarUrl || '')}
            </div>
            <div class="field field--full row">
              <button class="btn btn--primary" type="submit">Continuar para o Heart.me</button>
              ${state.profile ? '<button class="btn btn--ghost" type="button" id="skipToFeedBtn">Ir para o início</button>' : ''}
            </div>
          </form>
        </section>

        <section class="showcase">
          <h3 class="showcase__title">O que será liberado depois</h3>
          <p class="panel__sub">Depois disso, você já pode publicar, curtir, receber notificações e organizar posts salvos em pastas.</p>
          <div class="stats">
            <div class="stat"><strong>Posts</strong><span>Criação, edição e exclusão</span></div>
            <div class="stat"><strong>Likes</strong><span>Interação entre usuários</span></div>
            <div class="stat"><strong>Tempo real</strong><span>Avisos instantâneos</span></div>
          </div>
        </section>
      </section>
    </div>
  `;
}

function postCard(post, context = 'feed') {
  const mine = state.userId && post.userId === state.userId;
  const image = (Array.isArray(post.images) && post.images.find(Boolean)) || 'assets/heartme.logo.png';
  const title = post.title || 'Post sem título';
  const likeIcon = mine ? 'assets/curtido.png' : 'assets/curtir.png';
  return `
    <article class="post" data-post-id="${escapeHtml(post.id)}">
      <img class="post__image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      <div class="post__body">
        <h3 class="post__title">${escapeHtml(title)}</h3>
        <p class="post__text">${escapeHtml(post.content || '')}</p>
        <div class="post__meta">
          <span class="pill">${mine ? 'Seu post' : 'Comunidade'}</span>
          <span class="pill">${escapeHtml(formatDate(post.createdAt))}</span>
          ${(post.keywords || []).slice(0,3).map(tag => `<span class="pill">#${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="actions">
          ${!mine ? `<button class="btn btn--soft" data-action="like"><img src="${likeIcon}" alt="" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;" />Curtir</button>` : ''}
          ${mine ? `<button class="btn" data-action="edit"><img src="assets/editar.png" alt="" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;" />Editar</button>` : ''}
          ${mine ? '<button class="btn btn--danger" data-action="delete">Excluir</button>' : ''}
          ${context !== 'folders' ? '<button class="btn btn--ghost" data-action="save-folder">Salvar em pasta</button>' : ''}
        </div>
      </div>
    </article>
  `;
}

function feedTemplate() {
  return `
    <div class="page">
      <section class="hero">
        <div class="hero__eyebrow">Dashboard</div>
        <h1 class="hero__title">Bem-vindo, ${escapeHtml(displayName())}</h1>
        <p class="hero__sub">Seu espaço principal. Daqui você acompanha a sessão, publica novos posts e acessa os recursos privados da rede.</p>
        <div class="stats">
          <div class="stat"><strong>${state.posts.length}</strong><span>posts publicados</span></div>
          <div class="stat"><strong>${state.notifications.length}</strong><span>notificações registradas</span></div>
          <div class="stat"><strong>${state.folders.length}</strong><span>pastas salvas</span></div>
        </div>
      </section>

      <section class="panel panel--wide">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">Seus posts</h2>
            <p class="panel__sub">Crie, edite e remova publicações a partir daqui.</p>
          </div>
          <button class="btn btn--primary" id="goCreatePost" type="button">Novo post</button>
        </div>
        <div class="grid grid--posts-wide">
          ${state.posts.length ? state.posts.map(post => postCard(post)).join('') : '<div class="empty">Você ainda não criou posts. Use o botão acima para publicar seu primeiro conteúdo.</div>'}
        </div>
      </section>
    </div>
  `;
}

function userCard(profile) {
  const username = profile?.username || profile?.name || 'perfil';
  const avatar = profile?.avatarUrl || makeAvatarDataUrl(username);
  const authUserId = profile?.userId || profile?.id;
  return `
    <article class="user-card" data-user-id="${escapeHtml(authUserId || '')}">
      <img class="avatar avatar--lg" src="${escapeHtml(avatar)}" alt="${escapeHtml(username)}" />
      <div class="user-card__body">
        <h3 class="post__title">${escapeHtml(username)}</h3>
        <p class="panel__sub">${escapeHtml(profile?.bio || 'Sem bio por enquanto.')}</p>
      </div>
      <button class="btn btn--ghost" data-action="goto-profile" data-user-id="${escapeHtml(authUserId || '')}" type="button">Ver perfil</button>
    </article>
  `;
}

function exploreTemplate() {
  const hasSearch = !!state.lastSearch;
  return `
    <div class="page">
      <section class="hero">
        <div class="hero__eyebrow">Explorar</div>
        <h1 class="hero__title">Pesquise posts e pessoas</h1>
        <p class="hero__sub">Use a barra superior para encontrar publicações e perfis da comunidade no mesmo lugar.</p>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">${hasSearch ? `Resultados para “${escapeHtml(state.lastSearch)}”` : 'Nenhuma busca realizada'}</h2>
            <p class="panel__sub">A mesma busca mostra perfis encontrados e publicações relacionadas.</p>
          </div>
        </div>
        <div class="stack-lg">
          <section>
            <div class="panel__header">
              <div>
                <h3 class="panel__title">Pessoas</h3>
                <p class="panel__sub">Perfis encontrados para essa busca.</p>
              </div>
            </div>
            <div class="user-grid">${state.exploreUsers.length ? state.exploreUsers.map(userCard).join('') : `<div class="empty">${hasSearch ? 'Nenhum perfil encontrado para essa busca.' : 'Faça uma busca para encontrar perfis de outros usuários.'}</div>`}</div>
          </section>
          <section>
            <div class="panel__header">
              <div>
                <h3 class="panel__title">Posts</h3>
                <p class="panel__sub">Publicações encontradas para essa busca.</p>
              </div>
            </div>
            <div class="grid">${state.explorePosts.length ? state.explorePosts.map(post => postCard(post, 'explore')).join('') : `<div class="empty">${hasSearch ? 'Nenhuma publicação encontrada para essa busca.' : 'Faça uma busca para encontrar publicações de outros usuários.'}</div>`}</div>
          </section>
        </div>
      </section>
    </div>
  `;
}

function profileTemplate() {
  const profile = state.viewedProfile;
  if (!profile) {
    return `<div class="page"><section class="panel"><div class="empty">Perfil não encontrado.</div></section></div>`;
  }
  const publicName = profile.username || profile.name || 'perfil';
  const avatar = profile.avatarUrl || makeAvatarDataUrl(publicName);
  return `
    <div class="page">
      <section class="hero profile-hero">
        <img class="avatar avatar--xl" src="${escapeHtml(avatar)}" alt="${escapeHtml(publicName)}" />
        <div>
          <div class="hero__eyebrow">Perfil público</div>
          <h1 class="hero__title">${escapeHtml(publicName)}</h1>
          <p class="hero__sub">${escapeHtml(profile.bio || 'Esse usuário ainda não adicionou uma bio.')}</p>
        </div>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">Posts publicados</h2>
            <p class="panel__sub">Veja o que esse perfil já compartilhou na rede.</p>
          </div>
          <button class="btn btn--ghost" id="backToExploreBtn" type="button">Voltar para explorar</button>
        </div>
        <div class="grid">
          ${state.viewedProfilePosts.length ? state.viewedProfilePosts.map(post => postCard(post, 'explore')).join('') : '<div class="empty">Esse perfil ainda não publicou posts.</div>'}
        </div>
      </section>
    </div>
  `;
}

function renderImageSearchGrid() {
  if (!state.imageSearch.length) {
    return '<div class="empty">Pesquise por uma palavra-chave para ver opções de imagem vindas da internet.</div>';
  }
  return `<div class="image-grid">${state.imageSearch.map(item => `
    <button type="button" class="image-choice ${state.selectedPostImage === item.regularUrl ? 'is-selected' : ''}" data-action="pick-image" data-url="${escapeHtml(item.regularUrl)}" data-keyword="${escapeHtml(state.selectedPostKeyword)}">
      <img src="${escapeHtml(item.thumbUrl || item.regularUrl)}" alt="${escapeHtml(item.description || state.selectedPostKeyword || 'Imagem do post')}" />
      <span>${escapeHtml(item.description || item.authorName || 'Selecionar')}</span>
    </button>`).join('')}</div>`;
}

function selectedImagePreview() {
  if (!state.selectedPostImage) return '<div class="hint">Nenhuma imagem selecionada ainda.</div>';
  return `<div class="selected-image">
    <img src="${escapeHtml(state.selectedPostImage)}" alt="Imagem selecionada" />
    <div class="panel__sub">Imagem escolhida a partir da busca por “${escapeHtml(state.selectedPostKeyword || 'palavra-chave')}”.</div>
  </div>`;
}

function createPostTemplate() {
  const draft = state.createPostDraft || { title: '', content: '', keywords: '' };
  return `
    <div class="page">
      <section class="panel">
        <div class="panel__header">
          <div>
            <h1 class="panel__title">Criar post</h1>
            <p class="panel__sub">Busque uma imagem, escolha pelo menos uma tag e publique. O conteúdo é opcional, mas a imagem e as tags são obrigatórias.</p>
          </div>
        </div>
        <form id="createPostForm" class="form-grid">
          <div class="field field--full">
            <label class="label" for="createPostTitle">Título</label>
            <input class="input" id="createPostTitle" name="title" maxlength="120" placeholder="Dê um título ao seu post" value="${escapeHtml(draft.title || '')}" />
          </div>
          <div class="field field--full">
            <label class="label" for="createPostContent">Conteúdo</label>
            <textarea class="textarea" id="createPostContent" name="content" maxlength="2200" placeholder="Compartilhe o que quiser (opcional)">${escapeHtml(draft.content || '')}</textarea>
          </div>
          <div class="field field--full">
            <label class="label" for="imageKeywordInput">Buscar imagem</label>
            <div class="row">
              <input class="input" name="imageKeyword" id="imageKeywordInput" placeholder="Ex.: café, praia, livros" value="${escapeHtml(state.selectedPostKeyword || '')}" />
              <button class="btn btn--soft" type="button" id="searchImageBtn">Pesquisar</button>
            </div>
            <div class="hint">Digite uma palavra-chave em português ou inglês, veja até 10 miniaturas e escolha a imagem que vai com o seu post.</div>
          </div>
          <div class="field field--full">
            <div class="label">Escolha uma imagem</div>
            ${renderImageSearchGrid()}
          </div>
          <div class="field field--full">
            <div class="label">Pré-visualização</div>
            <div id="selectedImagePreview">${selectedImagePreview()}</div>
          </div>
          <div class="field field--full">
            <label class="label" for="createPostKeywords">Tags do post</label>
            <input class="input" id="createPostKeywords" name="keywords" placeholder="Ex.: rotina, café, manhã" value="${escapeHtml(draft.keywords || state.selectedPostKeyword || '')}" />
            <div class="hint">A palavra da busca pode ser usada como tag automática, mas você pode adicionar outras separadas por vírgula.</div>
          </div>
          ${state.createPostError ? `<div class="field field--full"><div class="auth-error">${escapeHtml(state.createPostError)}</div></div>` : ''}
          <div class="field field--full row">
            <button class="btn btn--primary" type="submit">Publicar</button>
            <button class="btn btn--ghost" type="button" id="goFeedBtn">Voltar</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function foldersTemplate() {
  return `
    <div class="page">
      <section class="panel">
        <div class="panel__header">
          <div>
            <h1 class="panel__title">Pastas salvas</h1>
            <p class="panel__sub">Organize seus posts salvos do seu jeito.</p>
          </div>
          <button class="btn btn--primary" id="addFolderBtn" type="button">Nova pasta</button>
        </div>

        <div class="folder-list">
          ${state.folders.length ? state.folders.map(folder => `
            <article class="folder" data-folder-id="${escapeHtml(folder.id)}">
              <div class="row row--between">
                <div>
                  <strong>${escapeHtml(folder.name)}</strong>
                  <div class="panel__sub">${(folder.posts || []).length} post(s) salvos</div>
                </div>
                <div class="actions">
                  <button class="btn btn--ghost" data-action="open-folder">Abrir</button>
                  <button class="btn btn--soft" data-action="add-posts-folder">Adicionar posts</button>
                  <button class="btn" data-action="rename-folder">Renomear</button>
                  <button class="btn btn--danger" data-action="delete-folder">Excluir</button>
                </div>
              </div>
            </article>`).join('') : '<div class="empty">Nenhuma pasta criada ainda. Crie uma e salve posts para organizar seus favoritos.</div>'}
        </div>
      </section>
    </div>
  `;
}

function notificationsTemplate() {
  return `
    <div class="page">
      <section class="panel">
        <div class="panel__header">
          <div>
            <h1 class="panel__title">Notificações</h1>
            <p class="panel__sub">Veja quem interagiu com você recentemente.</p>
          </div>
          <div class="status-chip" id="socketStatus"><span class="status-dot"></span>Tempo real desconectado</div>
        </div>

        <div class="notif-list">
          ${state.notifications.length ? state.notifications.map(item => `
            <article class="notif ${item.read ? '' : 'notif--new'}">
              <div class="row row--between">
                <strong>${escapeHtml(notificationTitle(item))}</strong>
                <span class="panel__sub">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p class="post__text">${notificationMessageHtml(item)}</p>
              ${item.read ? '' : `<div class="actions"><button class="btn btn--soft" data-action="mark-read" data-id="${escapeHtml(item.id)}">Marcar como lida</button></div>`}
            </article>`).join('') : '<div class="empty">Ainda não há notificações.</div>'}
        </div>
      </section>
    </div>
  `;
}

function settingsTemplate() {
  return `
    <div class="page">
      <section class="hero">
        <div class="hero__eyebrow">Conta</div>
        <h1 class="hero__title">Gerencie sua conta e seu perfil</h1>
        <p class="hero__sub">Aqui você ajusta o perfil visível no app e também os dados usados para entrar na conta.</p>
      </section>

      <section class="account-grid">
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Perfil</h2>
              <p class="panel__sub">Edite as informações que aparecem no seu perfil.</p>
            </div>
          </div>
          <form id="profileForm" class="form-grid">
            <div class="field field--full">
              <label class="label">Nome no app</label>
              <input class="input" name="username" maxlength="30" value="${escapeHtml(state.profileDraft.username || state.profile?.username || '')}" required />
            </div>
            <div class="field field--full">
              <label class="label">Bio</label>
              <textarea class="textarea" name="bio" maxlength="280">${escapeHtml(state.profileDraft.bio || state.profile?.bio || '')}</textarea>
            </div>
            <div class="field field--full">
              <label class="label">Foto de perfil</label>
              <input type="hidden" name="avatarUrl" id="settingsAvatarUrlInput" value="${escapeHtml(state.pendingAvatarUrl || state.profile?.avatarUrl || '')}" />
              <div class="hint">Escolha um avatar da galeria ou deixe no modo automático.</div>
              ${avatarPresetOptions(state.pendingAvatarUrl || state.profile?.avatarUrl || '')}
            </div>
            <div class="field field--full row">
              <button class="btn btn--primary" type="submit">${state.profile ? 'Salvar perfil' : 'Criar perfil'}</button>
            </div>
          </form>
        </section>

        <section class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Dados de acesso</h2>
              <p class="panel__sub">Atualize o email e a senha usados para entrar na sua conta. Ao excluir a conta, o login, o perfil, os posts, as notificações e as pastas vinculadas são removidos junto com ela.</p>
            </div>
          </div>
          <form id="accountForm" class="form-grid">
            <div class="field field--full">
              <label class="label">Email</label>
              <input class="input" type="email" name="email" value="${escapeHtml(state.account?.email || '')}" required />
            </div>
            <div class="field field--full">
              <label class="label">Senha atual</label>
              <input class="input" type="password" name="currentPassword" placeholder="Obrigatória para confirmar a alteração" required />
            </div>
            <div class="field field--full">
              <label class="label">Nova senha</label>
              <input class="input" type="password" name="password" minlength="6" placeholder="Deixe em branco para manter a atual" />
            </div>
            <div class="field field--full row">
              <button class="btn btn--primary" type="submit">Salvar conta</button>
              <button class="btn btn--danger" type="button" id="deleteAccountBtn">Excluir conta inteira</button>
            </div>
          </form>
        </section>
      </section>
    </div>
  `;
}

function renderFolderPosts(folderId) {
  const folder = state.folders.find(item => item.id === folderId);
  if (!folder) return routeTo('/folders');
  const folderPosts = folder.posts
    .map(id => [...state.posts, ...state.explorePosts].find(post => post.id === id))
    .filter(Boolean);

  return `
    <div class="page">
      <section class="panel">
        <div class="panel__header">
          <div>
            <h1 class="panel__title">${escapeHtml(folder.name)}</h1>
            <p class="panel__sub">Posts salvos nesta pasta.</p>
          </div>
          <button class="btn btn--ghost" id="backToFoldersBtn" type="button">Voltar para pastas</button>
        </div>
        <div class="grid">
          ${folderPosts.length ? folderPosts.map(post => postCard(post, 'folders')).join('') : '<div class="empty">Esta pasta ainda não tem posts disponíveis no feed atual.</div>'}
        </div>
      </section>
    </div>
  `;
}

function renderRoute(route) {
  if (route === '/') return landingTemplate();
  if (route === '/login') return authTemplate('login');
  if (route === '/register') return authTemplate('register');
  if (route === '/onboarding') return onboardingTemplate();
  if (route === '/feed') return feedTemplate();
  if (route === '/explore') return exploreTemplate();
  if (route === '/explore/posts') return exploreTemplate();
  if (route === '/explore/users') return exploreTemplate();
  if (route === '/create') return createPostTemplate();
  if (route === '/folders') return foldersTemplate();
  if (route.startsWith('/folders/')) return renderFolderPosts(route.split('/')[2]);
  if (route === '/notifications') return notificationsTemplate();
  if (route === '/settings') return settingsTemplate();
  if (route.startsWith('/profile/')) return profileTemplate();
  return feedTemplate();
}

function getPostById(postId) {
  return [...state.posts, ...state.explorePosts].find(post => post.id === postId) || null;
}

async function likePost(postId) {
  const likeBtn = document.querySelector(`[data-post-id="${postId}"] [data-action="like"]`);
  if (likeBtn?.disabled) return;
  if (likeBtn) likeBtn.disabled = true;
  try {
    await apiFetch(`${API.posts}/${postId}/like`, {
      method: 'POST',
      headers: authHeaders()
    });
    toast('Curtida enviada');
  } finally {
    if (likeBtn) likeBtn.disabled = false;
  }
}

function addPostToFolder(postId) {
  if (!state.folders.length) {
    toast('Crie uma pasta primeiro', 'error');
    routeTo('/folders');
    return;
  }
  const options = state.folders
    .map(folder => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`)
    .join('');
  openModal({
    title: 'Salvar em pasta',
    body: `
      <div class="field">
        <label class="label">Selecione a pasta</label>
        <select class="input" id="saveFolderSelect">${options}</select>
      </div>`,
    footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="confirmSaveFolder">Salvar</button>'
  });
  bindModalBaseEvents();
  $('#confirmSaveFolder').addEventListener('click', async () => {
    const folderId = $('#saveFolderSelect').value;
    try {
      await apiFetch(`${API.users}/me/folders/${folderId}/posts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ postId })
      });
      await refreshFolders();
      closeModal();
      toast('Post salvo na pasta');
      if (currentRoute().startsWith('/folders')) render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}


function promptAddPostsToFolder(folderId) {
  const folder = state.folders.find(item => item.id === folderId);
  if (!folder) return;
  const availablePosts = (state.posts || []).filter(post => !((folder.posts || []).includes(post.id)));
  openModal({
    title: `Adicionar posts em ${escapeHtml(folder.name)}`,
    body: availablePosts.length ? `
      <div class="folder-post-picker">
        ${availablePosts.map(post => {
          const image = (Array.isArray(post.images) && post.images.find(Boolean)) || 'assets/heartme.logo.png';
          return `
            <label class="folder-post-option">
              <input type="checkbox" value="${escapeHtml(post.id)}" data-folder-post-checkbox />
              <img src="${escapeHtml(image)}" alt="${escapeHtml(post.title || 'Post')}" />
              <div>
                <strong>${escapeHtml(post.title || 'Post sem título')}</strong>
                <div class="panel__sub">${escapeHtml((post.keywords || []).slice(0, 3).map(tag => `#${tag}`).join(' ') || 'Sem tags adicionais')}</div>
              </div>
            </label>`;
        }).join('')}
      </div>` : '<div class="empty">Todos os seus posts atuais já estão nessa pasta.</div>',
    footer: `<button class="btn btn--ghost" type="button" data-close>Cancelar</button><button class="btn btn--primary" type="button" id="confirmAddPostsFolderBtn" ${availablePosts.length ? '' : 'disabled'}>Adicionar posts</button>`
  });
  bindModalBaseEvents();
  $('#confirmAddPostsFolderBtn')?.addEventListener('click', async () => {
    const selected = $$('[data-folder-post-checkbox]:checked').map(node => node.value);
    if (!selected.length) {
      toast('Selecione pelo menos um post.', 'error');
      return;
    }
    try {
      for (const postId of selected) {
        await apiFetch(`${API.users}/me/folders/${folderId}/posts`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ postId })
        });
      }
      await refreshFolders();
      closeModal();
      toast('Posts adicionados à pasta');
      if (currentRoute().startsWith('/folders')) render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function promptFolderCreate() {
  openModal({
    title: 'Nova pasta',
    body: `
      <div class="field">
        <label class="label">Nome da pasta</label>
        <input class="input" id="folderNameInput" maxlength="60" placeholder="Ex.: Inspirações" />
      </div>`,
    footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="confirmCreateFolder">Criar</button>'
  });
  bindModalBaseEvents();
  $('#confirmCreateFolder').addEventListener('click', async () => {
    const name = $('#folderNameInput').value.trim();
    if (!name) return toast('Digite um nome para a pasta', 'error');
    try {
      await apiFetch(`${API.users}/me/folders`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name }) });
      await refreshFolders();
      closeModal();
      render();
      toast('Pasta criada');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function promptFolderRename(folderId) {
  const folder = state.folders.find(item => item.id === folderId);
  if (!folder) return;
  openModal({
    title: 'Renomear pasta',
    body: `
      <div class="field">
        <label class="label">Novo nome</label>
        <input class="input" id="folderRenameInput" maxlength="60" value="${escapeHtml(folder.name)}" />
      </div>`,
    footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="confirmRenameFolder">Salvar</button>'
  });
  bindModalBaseEvents();
  $('#confirmRenameFolder').addEventListener('click', async () => {
    const name = $('#folderRenameInput').value.trim();
    if (!name) return toast('Digite um nome válido', 'error');
    try {
      await apiFetch(`${API.users}/me/folders/${folderId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name }) });
      await refreshFolders();
      closeModal();
      render();
      toast('Pasta renomeada');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function promptFolderDelete(folderId) {
  openModal({
    title: 'Excluir pasta',
    body: '<p>Os posts não serão apagados do sistema. Apenas a pasta será removida da sua conta.</p>',
    footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" id="confirmDeleteFolder">Excluir</button>'
  });
  bindModalBaseEvents();
  $('#confirmDeleteFolder').addEventListener('click', async () => {
    try {
      await apiFetch(`${API.users}/me/folders/${folderId}`, { method: 'DELETE', headers: authHeaders() });
      await refreshFolders();
      closeModal();
      render();
      toast('Pasta removida');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function promptDeletePost(postId) {
  openModal({
    title: 'Excluir post',
    body: '<p>Essa ação remove definitivamente a publicação criada pela sua conta.</p>',
    footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" id="confirmDeletePost">Excluir</button>'
  });
  bindModalBaseEvents();
  $('#confirmDeletePost').addEventListener('click', async () => {
    try {
      await apiFetch(`${API.posts}/${postId}`, { method: 'DELETE', headers: authHeaders() });
      state.folders.forEach(folder => folder.posts = (folder.posts || []).filter(id => id !== postId));
      await refreshMyPosts();
      await refreshFolders().catch(() => {});
      closeModal();
      render();
      toast('Post excluído');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function promptEditPost(postId) {
  const post = getPostById(postId);
  if (!post) return toast('Post não encontrado', 'error');
  openModal({
    title: 'Editar post',
    body: `
      <div class="form-grid">
        <div class="field field--full"><label class="label">Título</label><input class="input" id="editPostTitle" value="${escapeHtml(post.title || '')}" /></div>
        <div class="field field--full"><label class="label">Conteúdo</label><textarea class="textarea" id="editPostContent">${escapeHtml(post.content || '')}</textarea></div>
        <div class="field field--full"><label class="label">Imagem do post (URL salva)</label><input class="input" id="editPostImage" value="${escapeHtml((post.images || [])[0] || '')}" /></div><div class="field field--full"><label class="label">Tags / palavras-chave</label><input class="input" id="editPostKeywords" value="${escapeHtml((post.keywords || []).join(', '))}" /></div>
      </div>`,
    footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="confirmEditPost">Salvar</button>'
  });

  $('#confirmEditPost').addEventListener('click', async () => {
    try {
      await apiFetch(`${API.posts}/${postId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          title: $('#editPostTitle').value.trim(),
          content: $('#editPostContent').value.trim(),
          imageKeywords: $('#editPostKeywords').value.split(',').map(item => item.trim()).filter(Boolean),
          selectedImages: [$('#editPostImage').value.trim()].filter(Boolean),
          keywords: $('#editPostKeywords').value.split(',').map(item => item.trim()).filter(Boolean)
        })
      });
      await refreshMyPosts();
      closeModal();
      render();
      toast('Post atualizado');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function markNotificationRead(id) {
  await apiFetch(`${API.notifications}/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  state.notifications = state.notifications.map(item => item.id === id ? { ...item, read: true } : item);
  saveLocal();
  updateNotifBadge();
  render();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const isLogin = currentRoute() === '/login';
  state.authError = '';

  if (!email) {
    state.authError = 'Informe um email válido.';
    return render();
  }
  if (!password || password.length < 6) {
    state.authError = 'A senha precisa ter pelo menos 6 caracteres.';
    return render();
  }

  if (!isLogin) {
    const confirmPassword = String(form.get('confirmPassword') || '');
    if (password !== confirmPassword) {
      state.authError = 'As senhas não conferem.';
      return render();
    }
  }

  try {
    if (isLogin) {
      const result = await apiFetch(`${API.auth}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(result.token);
      saveLocal();
      await loadSession();
      toast('Login realizado');
      routeTo(state.profile ? '/feed' : '/onboarding');
      render();
      return;
    }

    await apiFetch(`${API.auth}/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const result = await apiFetch(`${API.auth}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(result.token);
    saveLocal();
    await loadSession();
    toast('Conta criada com sucesso');
    routeTo('/onboarding');
    render();
  } catch (err) {
    const msg = err.message || 'Não foi possível concluir a autenticação.';
    if (msg.toLowerCase().includes('401') || msg.toLowerCase().includes('login') || msg.toLowerCase().includes('credenciais')) {
      state.authError = 'Email ou senha inválidos.';
    } else if (msg.toLowerCase().includes('cadastrado') || msg.toLowerCase().includes('conflict')) {
      state.authError = 'Esse email já está cadastrado.';
    } else if (msg.toLowerCase().includes('failed to fetch')) {
      state.authError = 'Servidor indisponível no momento.';
    } else {
      state.authError = msg;
    }
    render();
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const body = {
    username: String(form.get('username') || '').trim(),
    name: '',
    bio: String(form.get('bio') || '').trim(),
    avatarUrl: String(form.get('avatarUrl') || state.pendingAvatarUrl || '').trim()
  };

  if (!body.username) return toast('Informe um nome de usuário', 'error');

  try {
    if (state.profile?.id) {
      state.profile = await apiFetch(`${API.users}/${state.profile.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      state.pendingAvatarUrl = state.profile?.avatarUrl || '';
    state.avatarSelectionDirty = false;
    state.profileDraft = { username: '', bio: '' };
      toast('Perfil atualizado');
    } else {
      state.profile = await apiFetch(API.users, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      state.pendingAvatarUrl = state.profile?.avatarUrl || '';
      state.avatarSelectionDirty = false;
      state.profileDraft = { username: '', bio: '' };
      toast('Perfil criado');
    }
    syncShell();
    routeTo('/feed');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleAccountSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim();
  const currentPassword = String(form.get('currentPassword') || '');
  const password = String(form.get('password') || '');

  if (!email) return toast('Informe um email', 'error');
  if (!currentPassword) return toast('Informe a senha atual para confirmar', 'error');
  if (password && password.length < 6) return toast('A nova senha precisa ter pelo menos 6 caracteres', 'error');

  try {
    state.account = await apiFetch(`${API.auth}/me`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ email, currentPassword, password })
    });
    toast('Conta atualizada');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function syncCreatePostDraftFromDom() {
  state.createPostDraft = {
    title: $('#createPostTitle')?.value || state.createPostDraft?.title || '',
    content: $('#createPostContent')?.value || state.createPostDraft?.content || '',
    keywords: $('#createPostKeywords')?.value || state.createPostDraft?.keywords || ''
  };
}

async function handleImageSearch() {
  syncCreatePostDraftFromDom();
  const input = $('#imageKeywordInput');
  const query = (input?.value || '').trim();
  state.createPostError = '';
  if (!query) {
    state.imageSearch = [];
    state.selectedPostImage = null;
    state.selectedPostKeyword = '';
    state.createPostDraft = {
      title: $('#createPostTitle')?.value || state.createPostDraft?.title || '',
      content: $('#createPostContent')?.value || state.createPostDraft?.content || '',
      keywords: $('#createPostKeywords')?.value || state.createPostDraft?.keywords || ''
    };
    render();
    return;
  }
  try {
    state.selectedPostKeyword = query;
    state.imageSearch = await apiFetch(`${API.posts}/images/search?query=${encodeURIComponent(query)}`);
    state.selectedPostImage = null;
    if (!Array.isArray(state.imageSearch) || !state.imageSearch.length) {
      state.createPostError = 'Nenhuma imagem foi encontrada para essa palavra-chave.';
    }
  } catch (err) {
    state.createPostError = err.message || 'Não foi possível buscar imagens agora.';
  }
  render();
}

function selectPostImage(url, keyword) {
  state.selectedPostImage = url || null;
  if (keyword) state.selectedPostKeyword = keyword;
  state.createPostError = '';
  render();
}

async function handleCreatePost(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get('title') || '').trim();
  const content = String(form.get('content') || '').trim();
  const keywordInput = String(form.get('keywords') || '').trim();
  state.createPostDraft = { title, content, keywords: keywordInput };
  const keywords = keywordInput.split(',').map(item => item.trim()).filter(Boolean);
  if (state.selectedPostKeyword && !keywords.some(item => item.toLowerCase() === state.selectedPostKeyword.toLowerCase())) {
    keywords.unshift(state.selectedPostKeyword);
  }

  if (!state.token) {
    state.createPostError = 'Você precisa estar logado para publicar.';
    render();
    return;
  }
  if (!state.selectedPostImage) {
    state.createPostError = 'Escolha uma imagem antes de publicar.';
    render();
    return;
  }
  if (!keywords.length) {
    state.createPostError = 'Adicione pelo menos uma tag ao post.';
    render();
    return;
  }
  if (!state.profile) {
    state.profile = await apiFetch(`${API.users}/me`, { headers: authHeaders() }).catch(() => null);
    if (!state.profile && state.userId) {
      state.profile = await apiFetch(`${API.users}/by-auth/${encodeURIComponent(state.userId)}`, { headers: authHeaders() }).catch(() => null);
    }
  }
  if (!state.profile) {
    state.createPostError = 'Crie seu perfil antes de publicar.';
    render();
    return;
  }

  try {
    state.createPostError = '';
    await apiFetch(API.posts, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        content,
        imageKeywords: state.selectedPostKeyword ? [state.selectedPostKeyword] : [],
        imageUrl: state.selectedPostImage || null,
        selectedImages: state.selectedPostImage ? [state.selectedPostImage] : [],
        keywords
      })
    });
    await refreshMyPosts();
    state.imageSearch = [];
    state.selectedPostImage = null;
    state.selectedPostKeyword = '';
    state.createPostDraft = { title: '', content: '', keywords: '' };
    toast('Post criado');
    routeTo('/feed');
    render();
  } catch (err) {
    const msg = err.message || 'Não foi possível criar o post.';
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('401') || lowerMsg.includes('unauthorized') || lowerMsg.includes('authorization')) {
      state.createPostError = 'Sua sessão não foi aceita pelo serviço de posts. Faça login novamente e tente publicar.';
    } else if (lowerMsg.includes('crie seu perfil antes de publicar')) {
      state.createPostError = 'Crie seu perfil antes de publicar.';
    } else {
      state.createPostError = msg;
    }
    render();
  }
}

function wireView() {
  $('#goLoginBtn')?.addEventListener('click', () => routeTo('/login'));
  $('#goRegisterBtn')?.addEventListener('click', () => routeTo('/register'));
  $('#goHomeBtn')?.addEventListener('click', () => routeTo('/'));
  $('#switchAuthBtn')?.addEventListener('click', () => routeTo(currentRoute() === '/login' ? '/register' : '/login'));
  $('#authForm')?.addEventListener('submit', handleAuthSubmit);

  $('#profileForm')?.addEventListener('submit', handleProfileSubmit);
  $('#skipToFeedBtn')?.addEventListener('click', () => routeTo('/feed'));
  $('#accountForm')?.addEventListener('submit', handleAccountSubmit);
  $('#createPostForm')?.addEventListener('submit', handleCreatePost);
  $('#searchImageBtn')?.addEventListener('click', handleImageSearch);
  $('#imageKeywordInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); handleImageSearch(); } });
  $('#goCreatePost')?.addEventListener('click', () => routeTo('/create'));
  $('#goFeedBtn')?.addEventListener('click', () => routeTo('/feed'));
  $('#addFolderBtn')?.addEventListener('click', promptFolderCreate);
  $('#backToFoldersBtn')?.addEventListener('click', () => routeTo('/folders'));


  $('#deleteAccountBtn')?.addEventListener('click', () => {
    openModal({
      title: 'Excluir conta inteira',
      body: '<p>Essa ação remove o acesso da conta e, junto com ele, o perfil social, os posts, as curtidas e as notificações vinculadas. Use com cuidado.</p>',
      footer: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" id="confirmDeleteAccount">Excluir conta</button>'
    });
    bindModalBaseEvents();
    $('#confirmDeleteAccount').addEventListener('click', async () => {
      try {
        await apiFetch(`${API.users}/me/account`, { method: 'DELETE', headers: authHeaders() });
        closeModal();
        logout(false);
        toast('Conta excluída');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  $$('#view [data-action="like"]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await likePost(btn.closest('[data-post-id]').dataset.postId);
    } catch (err) {
      toast(err.message, 'error');
    }
  }));

  $$('#view [data-action="edit"]').forEach(btn => btn.addEventListener('click', () => {
    promptEditPost(btn.closest('[data-post-id]').dataset.postId);
  }));

  $$('#view [data-action="delete"]').forEach(btn => btn.addEventListener('click', () => {
    promptDeletePost(btn.closest('[data-post-id]').dataset.postId);
  }));

  $$('#view [data-action="save-folder"]').forEach(btn => btn.addEventListener('click', () => {
    addPostToFolder(btn.closest('[data-post-id]').dataset.postId);
  }));

  $$('#view [data-action="add-posts-folder"]').forEach(btn => btn.addEventListener('click', () => {
    const folderId = btn.dataset.folderId || btn.closest('[data-folder-id]')?.dataset.folderId;
    if (folderId) promptAddPostsToFolder(folderId);
  }));

  $$('#view [data-action="rename-folder"]').forEach(btn => btn.addEventListener('click', () => {
    promptFolderRename(btn.closest('[data-folder-id]').dataset.folderId);
  }));

  $$('#view [data-action="delete-folder"]').forEach(btn => btn.addEventListener('click', () => {
    promptFolderDelete(btn.closest('[data-folder-id]').dataset.folderId);
  }));

  $$('#view [data-action="open-folder"]').forEach(btn => btn.addEventListener('click', () => {
    routeTo(`/folders/${btn.closest('[data-folder-id]').dataset.folderId}`);
  }));

  $$('#view [data-action="mark-read"]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await markNotificationRead(btn.dataset.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  }));

  $$('#view [data-action="pick-image"]').forEach(btn => btn.addEventListener('click', () => {
    selectPostImage(btn.dataset.url, btn.dataset.keyword);
  }));
  $$('#view [data-action="toggle-avatar-panel"]').forEach(btn => btn.addEventListener('click', () => {
    syncProfileDraftFromDom();
    state.avatarPickerOpen = !state.avatarPickerOpen;
    render();
  }));

  $$('#view [data-action="pick-avatar"]').forEach(btn => btn.addEventListener('click', () => {
    syncProfileDraftFromDom();
    const url = btn.dataset.url || '';
    state.pendingAvatarUrl = url;
    state.avatarSelectionDirty = true;
    const input = $('#profileAvatarUrlInput') || $('#settingsAvatarUrlInput') || $('input[name="avatarUrl"]');
    if (input) input.value = url;
    render();
  }));

  $$('#view [data-action="open-profile-from-notification"]').forEach(btn => btn.addEventListener('click', () => {
    const userId = btn.dataset.userId;
    if (!userId) return;
    routeTo(`/profile/${userId}`);
  }));

  $$('#view [data-action="expand-showcase-image"]').forEach(btn => btn.addEventListener('click', () => {
    const src = btn.dataset.src;
    const title = btn.dataset.title || 'Imagem';
    openModal({
      title,
      body: `<div class="showcase-modal"><img src="${escapeHtml(src || '')}" alt="${escapeHtml(title)}" /></div>`,
      footer: `<button class="btn btn--ghost" type="button" data-close>Fechar</button>`
    });
    bindModalBaseEvents();
  }));

  $('#explorePostsTab')?.addEventListener('click', () => routeTo('/explore/posts'));
  $('#exploreUsersTab')?.addEventListener('click', () => routeTo('/explore/posts'));
  $('#backToExploreBtn')?.addEventListener('click', () => routeTo('/explore/posts'));
  $$('#view [data-action="goto-profile"]').forEach(btn => btn.addEventListener('click', () => {
    routeTo(`/profile/${btn.dataset.userId}`);
  }));
}

function wireShell() {
  $('#btnFeed').addEventListener('click', () => routeTo('/feed'));
  $('#btnExplore').addEventListener('click', () => routeTo('/explore/posts'));
  $('#btnCreate').addEventListener('click', () => routeTo('/create'));
  $('#btnFolders').addEventListener('click', () => routeTo('/folders'));
  $('#btnNotifs').addEventListener('click', async () => {
    await refreshNotifications().catch(() => {});
    routeTo('/notifications');
    render();
  });
  $('#btnSettings').addEventListener('click', () => routeTo('/settings'));

  $('#searchForm').addEventListener('submit', async event => {
    event.preventDefault();
    const query = $('#searchInput').value.trim();
    await searchAll(query);
    routeTo('/explore/posts');
    render();
  });

  $('#profileMenuBtn').addEventListener('click', event => {
    event.stopPropagation();
    const menu = $('#profileMenu');
    menu.hidden = !menu.hidden;
    $('#profileMenuBtn').setAttribute('aria-expanded', String(!menu.hidden));
  });

  $('#menuProfile').addEventListener('click', () => {
    $('#profileMenu').hidden = true;
    routeTo('/settings');
  });
  $('#menuLogout').addEventListener('click', () => logout(true));

  document.addEventListener('click', event => {
    if (event.target.matches('[data-close]')) closeModal();
    const menu = $('#profileMenu');
    if (!menu.hidden && !menu.contains(event.target) && !$('#profileMenuBtn').contains(event.target)) {
      menu.hidden = true;
      $('#profileMenuBtn').setAttribute('aria-expanded', 'false');
    }
  });
}

async function render() {
  if (!state.avatarSelectionDirty && !state.pendingAvatarUrl && state.profile?.avatarUrl) state.pendingAvatarUrl = state.profile.avatarUrl;
  const targetRoute = guardRoute(currentRoute());
  if (targetRoute !== currentRoute()) {
    routeTo(targetRoute);
    return;
  }

  syncShell();

  if (state.token) {
    if (['/feed', '/settings', '/folders'].includes(targetRoute)) await refreshMyPosts();
    if (['/folders', '/settings'].includes(targetRoute) || targetRoute.startsWith('/folders/')) await refreshFolders().catch(() => {});
    if (targetRoute.startsWith('/folders/')) await refreshMyPosts();
    if (targetRoute.startsWith('/profile/')) await loadViewedProfile(targetRoute.split('/')[2]);
    if (targetRoute === '/notifications') await refreshNotifications().catch(() => {});
  }

  $('#view').innerHTML = renderRoute(targetRoute);
  wireView();
  updateSocketStatus();
}

async function bootstrap() {
  localStorage.removeItem('hm_notifications');
  localStorage.removeItem('hm_folders');
  await loadPresetAvatars();
  wireShell();
  syncShell();
  await loadSession();
  window.addEventListener('hashchange', render);
  window.addEventListener('focus', () => {
    if (state.token) refreshNotifications().then(() => { if (currentRoute() === '/notifications') render(); }).catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.token) refreshNotifications().then(() => { if (currentRoute() === '/notifications') render(); }).catch(() => {});
  });
  render();
}

bootstrap();
