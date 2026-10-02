(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * Comparador de seguidores de Instagram
   * Todo ocurre en el navegador: no hay ninguna llamada de red.
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = 'comparador-seguidores:revisados';
  const PAGE_SIZE = 200;
  const MAX_ZIP_BYTES = 200 * 1024 * 1024;
  const USERNAME_RE = /^[a-z0-9._]{1,30}$/;
  const AVATAR_VARIANTS = 6;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const AYUDA_LISTA = {
    noMeSiguen: 'Cuentas que seguís y no te siguen. Abrí el perfil para dejar de seguirlas.',
    noSigo: 'Cuentas que te siguen y no seguís. Abrí el perfil para seguirlas.',
    mutuos: 'Cuentas que se siguen entre sí.',
  };

  const VACIO_LISTA = {
    noMeSiguen: '¡Todas las cuentas que seguís te siguen de vuelta!',
    noSigo: '¡Seguís a todas las cuentas que te siguen!',
    mutuos: 'Todavía no hay cuentas que se sigan entre sí.',
  };

  // Cuentas inventadas para la demo. Sus botones de perfil no llevan a ningún lado.
  const DEMO = {
    noMeSiguen: ['el_nacho', 'lucas.fit', 'mica_art', 'nico.travel', 'sofi.dg', 'tomi_77', 'vero.cocina'],
    noSigo: ['ana_foto', 'dani.music', 'juli.bs', 'pablo_ok'],
    mutuos: ['agus.rm', 'cami.ok', 'fede.a', 'lau_dg', 'rama.studio'],
  };

  const state = {
    followers: new Map(), // origen del archivo -> { users: Set, date: Date | null }
    following: new Map(),
    reviewed: new Set(), // casillas guardadas en el navegador (modo real)
    demoReviewed: new Set(), // casillas de la demo (no se guardan)
    storageOk: true,
    mode: null, // 'demo' | 'real'
    lists: null,
    activeList: 'noMeSiguen',
    query: '',
    hideReviewed: false,
    visible: PAGE_SIZE,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    input: $('file-input'),
    subida: $('subida'),
    estado: $('estado'),
    estadoSeguidores: $('estado-seguidores'),
    estadoSeguidos: $('estado-seguidos'),
    mensaje: $('mensaje'),
    mensajeRes: $('mensaje-res'),
    resultados: $('resultados'),
    titulo: $('res-titulo'),
    insigniaDemo: $('insignia-demo'),
    cambiar: $('cambiar'),
    fecha: $('fecha'),
    fechaTexto: $('fecha-texto'),
    demoNota: $('demo-nota'),
    totalSeguidores: $('total-seguidores'),
    totalSeguidos: $('total-seguidos'),
    barraEtiqueta: $('barra-etiqueta'),
    barraMutuos: $('barra-mutuos'),
    barraNo: $('barra-no'),
    leyendaMutuos: $('leyenda-mutuos'),
    leyendaNo: $('leyenda-no'),
    tabs: Array.from(document.querySelectorAll('.tabs [role="tab"]')),
    panel: $('panel'),
    ayudaLista: $('ayuda-lista'),
    avisoLimite: $('aviso-limite'),
    buscar: $('buscar'),
    ocultar: $('ocultar'),
    conteo: $('conteo'),
    avisoStorage: $('aviso-storage'),
    lista: $('lista'),
    vacio: $('vacio'),
    mas: $('mas'),
    borrarMarcas: $('borrar-marcas'),
    guia: $('como-funciona'),
    irASubir: $('ir-a-subir'),
  };

  /* ---------------------------- Utilidades --------------------------- */

  function baseName(path) {
    return String(path).split('/').pop().split('\\').pop();
  }

  function getExt(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name);
    return m ? m[1].toLowerCase() : '';
  }

  function isSupportedExt(ext) {
    return ext === 'json' || ext === 'html' || ext === 'htm';
  }

  function normalizeUser(raw) {
    if (typeof raw !== 'string') return null;
    const u = raw.trim().replace(/^@/, '').toLowerCase();
    return USERNAME_RE.test(u) ? u : null;
  }

  function userFromHref(href) {
    if (typeof href !== 'string') return null;
    try {
      const url = new URL(href, 'https://www.instagram.com');
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === '_u') parts.shift();
      return parts.length === 1 ? parts[0] : null;
    } catch (err) {
      return null;
    }
  }

  // Deduce si un archivo es de seguidores o de seguidos a partir de su nombre.
  function kindFromName(name) {
    const base = baseName(name).toLowerCase();
    if (/^following_hashtags/.test(base)) return null;
    if (/^followers(?![a-z])/.test(base)) return 'followers';
    if (/^following(?![a-z])/.test(base)) return 'following';
    return null;
  }

  function validDate(d) {
    return !!d && typeof d.getTime === 'function' && !isNaN(d.getTime()) && d.getFullYear() >= 2012;
  }

  function unionOf(map) {
    const all = new Set();
    map.forEach((entry) => entry.users.forEach((u) => all.add(u)));
    return all;
  }

  function plural(n, uno, otros) {
    return n === 1 ? uno : otros;
  }

  function fmt(n) {
    return Number(n).toLocaleString('es-AR');
  }

  function formatDate(d) {
    const opts = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return new Intl.DateTimeFormat('es-AR', opts).format(d).replace(/\./g, '');
  }

  function icon(name, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', className ? `icono ${className}` : 'icono');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function avatarIndex(user) {
    let h = 0;
    for (let i = 0; i < user.length; i += 1) h = (h * 31 + user.charCodeAt(i)) >>> 0;
    return h % AVATAR_VARIANTS;
  }

  function initialOf(user) {
    const m = /[a-z0-9]/.exec(user);
    return (m ? m[0] : user.charAt(0) || '?').toUpperCase();
  }

  function reviewedSet() {
    return state.mode === 'demo' ? state.demoReviewed : state.reviewed;
  }

  /* ----------------------------- Lectura ----------------------------- */

  function usernameFromEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const data = Array.isArray(entry.string_list_data) ? entry.string_list_data[0] : null;
    return (
      normalizeUser(data && data.value) ||
      normalizeUser(entry.title) ||
      normalizeUser(userFromHref(data && data.href))
    );
  }

  function parseJson(text, hint) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return null;
    }

    let kind = null;
    let entries = null;

    if (Array.isArray(data)) {
      entries = data;
      kind = hint || 'followers';
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.relationships_following)) {
        kind = 'following';
        entries = data.relationships_following;
      } else if (Array.isArray(data.relationships_followers)) {
        kind = 'followers';
        entries = data.relationships_followers;
      }
    }
    if (!entries) return null;

    const users = new Set();
    entries.forEach((entry) => {
      const u = usernameFromEntry(entry);
      if (u) users.add(u);
    });
    return users.size ? { kind, users } : null;
  }

  function parseHtml(text, hint) {
    if (!hint) return null;
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const users = new Set();
    doc.querySelectorAll('a[href]').forEach((a) => {
      const u = normalizeUser(userFromHref(a.getAttribute('href')));
      if (u) users.add(u);
    });
    return users.size ? { kind: hint, users } : null;
  }

  function parseSource(sourceName, ext, text) {
    const hint = kindFromName(sourceName);
    return ext === 'json' ? parseJson(text, hint) : parseHtml(text, hint);
  }

  function problemFor(sourceName, ext) {
    const name = baseName(sourceName);
    if (ext !== 'json' && !kindFromName(sourceName)) {
      return `No pude saber si «${name}» es de seguidores o de seguidos. Dejale el nombre original (followers_1.html o following.html).`;
    }
    return `«${name}» no parece ser un archivo de seguidores ni de seguidos. Revisá que hayas exportado solo «Seguidores y seguidos» en formato JSON.`;
  }

  // Cada archivo leído se "prepara" y recién al final de la subida se guarda.
  // Regla: por cada tipo que trae la subida (seguidores o seguidos), se reemplaza
  // lo que hubiera de ese tipo. Lo que no trae, se conserva.
  function prepare(sourceName, ext, text, date, problems) {
    const result = parseSource(sourceName, ext, text);
    if (!result) {
      problems.push(problemFor(sourceName, ext));
      return null;
    }
    return { sourceName, result, date: validDate(date) ? date : null };
  }

  function commit(prepared) {
    const maps = { followers: state.followers, following: state.following };
    new Set(prepared.map((p) => p.result.kind)).forEach((kind) => maps[kind].clear());
    prepared.forEach((p) => maps[p.result.kind].set(p.sourceName, { users: p.result.users, date: p.date }));
  }

  async function readZip(file, problems) {
    if (typeof JSZip === 'undefined') {
      problems.push(
        'No se pudo cargar el lector de .zip. Descomprimí el archivo y subí followers_1.json y following.json.'
      );
      return [];
    }
    if (file.size > MAX_ZIP_BYTES) {
      problems.push(
        `«${file.name}» pesa demasiado: parece traer más que seguidores y seguidos. Volvé a exportar solo «Seguidores y seguidos».`
      );
      return [];
    }

    let zip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch (err) {
      problems.push(`«${file.name}» no se pudo abrir como .zip. Fijate que se haya descargado completo.`);
      return [];
    }

    const found = [];
    zip.forEach((path, entry) => {
      if (entry.dir) return;
      const base = baseName(path);
      const ext = getExt(base);
      if (isSupportedExt(ext) && kindFromName(base)) found.push({ path, entry, ext });
    });

    if (!found.length) {
      problems.push(
        `En «${file.name}» no encontré archivos de seguidores ni de seguidos. Fijate que hayas exportado «Seguidores y seguidos».`
      );
      return [];
    }

    const prepared = [];
    for (const item of found) {
      const text = await item.entry.async('string');
      const one = prepare(item.path, item.ext, text, item.entry.date, problems);
      if (one) prepared.push(one);
    }
    return prepared;
  }

  async function readFile(file, problems) {
    const ext = getExt(file.name);
    if (ext === 'zip') return readZip(file, problems);
    if (isSupportedExt(ext)) {
      const text = await file.text();
      const one = prepare(file.name, ext, text, new Date(file.lastModified), problems);
      return one ? [one] : [];
    }
    problems.push(`«${file.name}» no es un archivo .zip, .json ni .html.`);
    return [];
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    showMessage(['Leyendo archivos…'], 'info');

    const problems = [];
    const prepared = [];
    for (const file of files) {
      try {
        prepared.push(...(await readFile(file, problems)));
      } catch (err) {
        problems.push(`No pude leer «${file.name}».`);
      }
    }

    commit(prepared);
    updateStatus();

    const hasFollowers = state.followers.size > 0;
    const hasFollowing = state.following.size > 0;

    if (hasFollowers && hasFollowing) {
      buildRealResults();
      if (problems.length) showMessage(problems, 'error');
      else hideMessage();
      return;
    }

    if (state.mode !== 'demo') showDemo();

    const lines = problems.slice();
    if (hasFollowing && !hasFollowers) {
      lines.push('Falta el archivo de seguidores (followers_1.json). Subilo también.');
    } else if (hasFollowers && !hasFollowing) {
      lines.push('Falta el archivo de seguidos (following.json). Subilo también.');
    }
    if (!lines.length && !prepared.length) lines.push('No encontré ningún archivo para leer.');
    showMessage(lines, 'error');
  }

  /* ----------------------------- Mensajes ---------------------------- */

  function showMessage(lines, tone) {
    hideMessage();
    const target = state.mode === 'real' ? el.mensajeRes : el.mensaje;
    target.replaceChildren(
      ...lines.map((text) => {
        const p = document.createElement('p');
        p.className = 'linea';
        p.textContent = text;
        return p;
      })
    );
    target.dataset.tono = tone;
    target.hidden = false;
  }

  function hideMessage() {
    [el.mensaje, el.mensajeRes].forEach((box) => {
      box.hidden = true;
      box.replaceChildren();
    });
  }

  function updateStatus() {
    const followers = unionOf(state.followers).size;
    const following = unionOf(state.following).size;

    el.estado.hidden = !followers && !following;

    el.estadoSeguidores.dataset.ok = String(followers > 0);
    el.estadoSeguidores.textContent = followers
      ? `✓ Seguidores: ${fmt(followers)} ${plural(followers, 'cuenta', 'cuentas')}`
      : 'Seguidores: falta subir el archivo';

    el.estadoSeguidos.dataset.ok = String(following > 0);
    el.estadoSeguidos.textContent = following
      ? `✓ Seguidos: ${fmt(following)} ${plural(following, 'cuenta', 'cuentas')}`
      : 'Seguidos: falta subir el archivo';
  }

  /* ----------------------- Modos: demo y resultados ------------------- */

  function listsFrom(noMeSiguen, noSigo, mutuos) {
    return {
      noMeSiguen,
      noSigo,
      mutuos,
      followers: noSigo.length + mutuos.length,
      following: noMeSiguen.length + mutuos.length,
    };
  }

  function computeLists() {
    const followers = unionOf(state.followers);
    const following = unionOf(state.following);
    const noMeSiguen = [];
    const noSigo = [];
    const mutuos = [];

    following.forEach((u) => (followers.has(u) ? mutuos : noMeSiguen).push(u));
    followers.forEach((u) => {
      if (!following.has(u)) noSigo.push(u);
    });

    [noMeSiguen, noSigo, mutuos].forEach((l) => l.sort());
    return listsFrom(noMeSiguen, noSigo, mutuos);
  }

  function exportDate() {
    let oldest = null;
    [...state.followers.values(), ...state.following.values()].forEach(({ date }) => {
      if (validDate(date) && (!oldest || date < oldest)) oldest = date;
    });
    return oldest;
  }

  function setMode(mode) {
    const real = mode === 'real';
    if (mode !== state.mode) {
      state.hideReviewed = false;
      el.ocultar.checked = false;
    }
    state.mode = mode;
    document.body.dataset.estado = real ? 'resultados' : 'inicio';
    el.subida.hidden = real;
    el.input.tabIndex = real ? -1 : 0;
    el.titulo.textContent = real ? 'Tus resultados' : 'Así se ve tu resultado';
    el.insigniaDemo.hidden = real;
    el.demoNota.hidden = real;
    el.cambiar.hidden = !real;
    el.fecha.hidden = !real;
    el.borrarMarcas.hidden = !real;
  }

  function applyLists(lists, mode) {
    setMode(mode);
    state.lists = lists;
    state.query = '';
    el.buscar.value = '';
    renderMetrics();
    renderFecha();
    el.resultados.hidden = false;
    selectTab('noMeSiguen', false);
  }

  function showDemo() {
    applyLists(listsFrom(DEMO.noMeSiguen.slice(), DEMO.noSigo.slice(), DEMO.mutuos.slice()), 'demo');
  }

  function buildRealResults() {
    applyLists(computeLists(), 'real');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.resultados.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function renderMetrics() {
    const { followers, following, mutuos, noMeSiguen } = state.lists;
    const pct = following ? Math.round((mutuos.length / following) * 100) : 0;

    el.totalSeguidores.textContent = fmt(followers);
    el.totalSeguidos.textContent = fmt(following);
    el.barraEtiqueta.textContent = `De las ${fmt(following)} que seguís`;
    el.leyendaMutuos.textContent = `${fmt(mutuos.length)} te siguen de vuelta (${pct} %)`;
    el.leyendaNo.textContent = `${fmt(noMeSiguen.length)} no te siguen`;

    el.barraMutuos.style.flexGrow = String(mutuos.length);
    el.barraNo.style.flexGrow = String(noMeSiguen.length);
    el.barraMutuos.hidden = mutuos.length === 0;
    el.barraNo.hidden = noMeSiguen.length === 0;

    el.tabs.forEach((tab) => {
      const name = tab.dataset.lista;
      tab.querySelector('.tab-num').textContent = fmt(state.lists[name].length);
    });
  }

  function renderFecha() {
    if (state.mode !== 'real') return;
    const d = exportDate();
    el.fechaTexto.textContent = d ? `Datos del ${formatDate(d)}` : 'Datos de cuando pediste el archivo';
    el.fecha.open = false;
  }

  /* ------------------------------- Listas ---------------------------- */

  function selectTab(name, focus) {
    state.activeList = name;
    state.visible = PAGE_SIZE;

    el.tabs.forEach((tab) => {
      const active = tab.dataset.lista === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) {
        el.panel.setAttribute('aria-labelledby', tab.id);
        if (focus) tab.focus();
      }
    });

    el.ayudaLista.textContent = AYUDA_LISTA[name];
    el.avisoLimite.hidden = name !== 'noMeSiguen' || state.mode !== 'real';
    renderList();
  }

  function buildRow(user) {
    const li = document.createElement('li');
    const reviewed = reviewedSet().has(user);
    li.className = reviewed ? 'fila revisado' : 'fila';

    const label = document.createElement('label');
    label.className = 'casilla';
    label.title = 'Ya lo revisé';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'check';
    check.checked = reviewed;
    check.dataset.usuario = user;
    check.setAttribute('aria-label', `Ya revisé a ${user}`);
    label.appendChild(check);

    const avatar = document.createElement('span');
    avatar.className = `avatar av-${avatarIndex(user)}`;
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initialOf(user);

    const name = document.createElement('span');
    name.className = 'usuario';
    name.textContent = `@${user}`;

    let open;
    if (state.mode === 'demo') {
      open = document.createElement('span');
      open.className = 'abrir';
      open.setAttribute('aria-hidden', 'true');
    } else {
      open = document.createElement('a');
      open.className = 'abrir';
      open.href = `https://www.instagram.com/${encodeURIComponent(user)}/`;
      open.target = '_blank';
      open.rel = 'noopener noreferrer';
      open.setAttribute('aria-label', `Abrir el perfil de ${user} en Instagram`);
    }
    open.append('Abrir perfil', icon('external'));

    li.append(label, avatar, name, open);
    return li;
  }

  function filteredItems() {
    const full = state.lists[state.activeList];
    const q = state.query.trim().toLowerCase().replace(/^@/, '');
    const marks = reviewedSet();
    let items = full;
    if (q) items = items.filter((u) => u.includes(q));
    if (state.hideReviewed) items = items.filter((u) => !marks.has(u));
    return items;
  }

  function updateCount(items) {
    const full = state.lists[state.activeList];
    const marks = reviewedSet();
    const reviewedCount = full.filter((u) => marks.has(u)).length;
    el.conteo.textContent = full.length
      ? `${fmt(full.length)} ${plural(full.length, 'cuenta', 'cuentas')}, ${fmt(reviewedCount)} ${plural(reviewedCount, 'revisada', 'revisadas')}` +
        (items.length !== full.length ? `. Mostrando ${fmt(items.length)}.` : '')
      : '';
    el.avisoStorage.hidden = state.mode !== 'real' || state.storageOk;
  }

  function renderList() {
    if (!state.lists) return;
    const full = state.lists[state.activeList];
    const items = filteredItems();
    const shown = items.slice(0, state.visible);

    el.lista.replaceChildren(...shown.map(buildRow));
    updateCount(items);

    if (!items.length) {
      const q = state.query.trim();
      let text = VACIO_LISTA[state.activeList];
      if (full.length && q) text = `Ninguna cuenta coincide con «${q}».`;
      else if (full.length) text = 'Ya revisaste todas las cuentas de esta lista.';
      el.vacio.textContent = text;
      el.vacio.hidden = false;
    } else {
      el.vacio.hidden = true;
    }

    el.mas.hidden = items.length <= shown.length;
    if (!el.mas.hidden) el.mas.textContent = `Mostrar más (faltan ${fmt(items.length - shown.length)})`;
  }

  /* --------------------------- Casillas guardadas -------------------- */

  function loadReviewed() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
    } catch (err) {
      state.storageOk = false;
      return new Set();
    }
  }

  function saveReviewed() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.reviewed)));
      state.storageOk = true;
    } catch (err) {
      state.storageOk = false;
    }
  }

  /* ------------------------------ Eventos ---------------------------- */

  function openGuide() {
    el.guia.open = true;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.guia.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function hasFiles(e) {
    return !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  }

  function bindEvents() {
    el.input.addEventListener('change', () => {
      handleFiles(el.input.files).finally(() => {
        el.input.value = '';
      });
    });

    el.cambiar.addEventListener('click', () => el.input.click());
    el.irASubir.addEventListener('click', () => el.input.click());

    document.querySelectorAll('a[href="#como-funciona"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openGuide();
      });
    });

    // Se puede soltar el archivo en cualquier parte de la página.
    let dragDepth = 0;
    const root = document.documentElement;
    window.addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return;
      dragDepth += 1;
      root.classList.add('arrastrando');
    });
    window.addEventListener('dragleave', (e) => {
      if (!hasFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) root.classList.remove('arrastrando');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      root.classList.remove('arrastrando');
      if (hasFiles(e)) handleFiles(e.dataTransfer.files);
    });

    el.tabs.forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab.dataset.lista, false));
      tab.addEventListener('keydown', (e) => {
        const i = el.tabs.indexOf(tab);
        let next = null;
        if (e.key === 'ArrowRight') next = el.tabs[(i + 1) % el.tabs.length];
        if (e.key === 'ArrowLeft') next = el.tabs[(i - 1 + el.tabs.length) % el.tabs.length];
        if (e.key === 'Home') next = el.tabs[0];
        if (e.key === 'End') next = el.tabs[el.tabs.length - 1];
        if (next) {
          e.preventDefault();
          selectTab(next.dataset.lista, true);
        }
      });
    });

    el.buscar.addEventListener('input', () => {
      state.query = el.buscar.value;
      state.visible = PAGE_SIZE;
      renderList();
    });

    el.ocultar.addEventListener('change', () => {
      state.hideReviewed = el.ocultar.checked;
      state.visible = PAGE_SIZE;
      renderList();
    });

    el.lista.addEventListener('change', (e) => {
      const check = e.target;
      if (!(check instanceof HTMLInputElement) || !check.dataset.usuario) return;
      const user = check.dataset.usuario;
      const marks = reviewedSet();
      if (check.checked) marks.add(user);
      else marks.delete(user);
      if (state.mode === 'real') saveReviewed();

      if (state.hideReviewed) {
        renderList();
      } else {
        // Sin redibujar la lista, así no se pierde el foco del teclado.
        check.closest('.fila').classList.toggle('revisado', check.checked);
        updateCount(filteredItems());
      }
    });

    el.mas.addEventListener('click', () => {
      state.visible += PAGE_SIZE;
      renderList();
    });

    el.borrarMarcas.addEventListener('click', () => {
      if (!state.reviewed.size) return;
      if (!window.confirm('¿Borrar todas las casillas que marcaste como revisadas?')) return;
      state.reviewed.clear();
      saveReviewed();
      renderList();
    });
  }

  /* ------------------------------- Inicio ---------------------------- */

  state.reviewed = loadReviewed();
  bindEvents();
  updateStatus();
  showDemo();
})();
