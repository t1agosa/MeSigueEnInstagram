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

  const AYUDA_LISTA = {
    noMeSiguen:
      'Cuentas que seguís y no te siguen a vos. Tocá «Abrir perfil», después «Siguiendo» y «Dejar de seguir». Marcá la casilla cuando ya la revisaste.',
    noSigo:
      'Cuentas que te siguen y vos no seguís. Tocá «Abrir perfil» y después «Seguir» si querés seguirla. Marcá la casilla cuando ya la revisaste.',
    mutuos:
      'Cuentas que se siguen entre sí. Marcá la casilla si querés llevar la cuenta de las que ya revisaste.',
  };

  const VACIO_LISTA = {
    noMeSiguen: '¡Todas las cuentas que seguís te siguen de vuelta!',
    noSigo: '¡Seguís a todas las cuentas que te siguen!',
    mutuos: 'Todavía no hay cuentas que se sigan entre sí.',
  };

  const state = {
    followers: new Map(), // origen del archivo -> Set de usuarios
    following: new Map(),
    reviewed: new Set(),
    storageOk: true,
    lists: null,
    activeList: 'noMeSiguen',
    query: '',
    hideReviewed: false,
    visible: PAGE_SIZE,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    drop: $('drop'),
    input: $('file-input'),
    estadoSeguidores: $('estado-seguidores'),
    estadoSeguidos: $('estado-seguidos'),
    mensaje: $('mensaje'),
    resultados: $('resultados'),
    totalSeguidores: $('total-seguidores'),
    totalSeguidos: $('total-seguidos'),
    totalReciprocidad: $('total-reciprocidad'),
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
    reiniciar: $('reiniciar'),
    borrarMarcas: $('borrar-marcas'),
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

  function unionOf(map) {
    const all = new Set();
    map.forEach((set) => set.forEach((u) => all.add(u)));
    return all;
  }

  function plural(n, uno, otros) {
    return n === 1 ? uno : otros;
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

  // Devuelve true si el archivo se entendió y quedó cargado.
  function ingestText(sourceName, ext, text, problems) {
    const hint = kindFromName(sourceName);
    const result = ext === 'json' ? parseJson(text, hint) : parseHtml(text, hint);

    if (!result) {
      const name = baseName(sourceName);
      if (ext !== 'json' && !hint) {
        problems.push(
          `No pude saber si «${name}» es de seguidores o de seguidos. Dejale el nombre original (followers_1.html o following.html).`
        );
      } else {
        problems.push(
          `«${name}» no parece ser un archivo de seguidores ni de seguidos. Revisá que hayas pedido «Seguidores y seguidos» y el formato JSON.`
        );
      }
      return false;
    }

    const target = result.kind === 'followers' ? state.followers : state.following;
    target.set(sourceName, result.users);
    return true;
  }

  async function ingestZip(file, problems) {
    if (typeof JSZip === 'undefined') {
      problems.push(
        'No se pudo cargar el lector de .zip. Descomprimí el archivo y subí followers_1.json y following.json.'
      );
      return 0;
    }
    if (file.size > MAX_ZIP_BYTES) {
      problems.push(
        `«${file.name}» pesa demasiado: parece traer más que seguidores y seguidos. Pedile a Instagram solo «Seguidores y seguidos».`
      );
      return 0;
    }

    let zip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch (err) {
      problems.push(`«${file.name}» no se pudo abrir como .zip. Fijate que se haya descargado completo.`);
      return 0;
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
        `En «${file.name}» no encontré archivos de seguidores ni de seguidos. Fijate que hayas pedido «Seguidores y seguidos» al descargar tu información.`
      );
      return 0;
    }

    // Un .zip es un pedido completo: reemplaza lo que hubiera cargado antes.
    state.followers.clear();
    state.following.clear();

    let added = 0;
    for (const item of found) {
      const text = await item.entry.async('string');
      if (ingestText(item.path, item.ext, text, problems)) added += 1;
    }
    return added;
  }

  async function ingestFile(file, problems) {
    const ext = getExt(file.name);
    if (ext === 'zip') return ingestZip(file, problems);
    if (isSupportedExt(ext)) {
      const text = await file.text();
      return ingestText(file.name, ext, text, problems) ? 1 : 0;
    }
    problems.push(`«${file.name}» no es un archivo .zip, .json ni .html.`);
    return 0;
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    // Los .zip primero, así un pedido completo no pisa archivos sueltos.
    files.sort((a, b) => Number(getExt(b.name) === 'zip') - Number(getExt(a.name) === 'zip'));

    el.drop.setAttribute('aria-busy', 'true');
    showMessage(['Leyendo archivos…'], 'info');

    const problems = [];
    let added = 0;
    for (const file of files) {
      try {
        added += await ingestFile(file, problems);
      } catch (err) {
        problems.push(`No pude leer «${file.name}».`);
      }
    }

    el.drop.removeAttribute('aria-busy');
    updateStatus();

    const hasFollowers = state.followers.size > 0;
    const hasFollowing = state.following.size > 0;
    const lines = problems.slice();

    if (hasFollowers && hasFollowing) {
      if (!problems.length) hideMessage();
      else showMessage(lines, 'error');
      buildResults();
      return;
    }

    if (hasFollowing && !hasFollowers) {
      lines.push('Falta el archivo de seguidores (followers_1.json). Subilo también.');
    } else if (hasFollowers && !hasFollowing) {
      lines.push('Falta el archivo de seguidos (following.json). Subilo también.');
    }
    if (!lines.length && !added) lines.push('No encontré ningún archivo para leer.');

    el.resultados.hidden = true;
    showMessage(lines, 'error');
  }

  /* ----------------------------- Mensajes ---------------------------- */

  function showMessage(lines, tone) {
    el.mensaje.replaceChildren(
      ...lines.map((text) => {
        const p = document.createElement('p');
        p.className = 'linea';
        p.textContent = text;
        return p;
      })
    );
    el.mensaje.dataset.tono = tone;
    el.mensaje.hidden = false;
  }

  function hideMessage() {
    el.mensaje.hidden = true;
    el.mensaje.replaceChildren();
  }

  function updateStatus() {
    const followers = unionOf(state.followers).size;
    const following = unionOf(state.following).size;

    el.estadoSeguidores.dataset.ok = String(followers > 0);
    el.estadoSeguidores.textContent = followers
      ? `✓ Seguidores: ${followers} ${plural(followers, 'cuenta', 'cuentas')}`
      : 'Seguidores: todavía no subiste el archivo';

    el.estadoSeguidos.dataset.ok = String(following > 0);
    el.estadoSeguidos.textContent = following
      ? `✓ Seguidos: ${following} ${plural(following, 'cuenta', 'cuentas')}`
      : 'Seguidos: todavía no subiste el archivo';
  }

  /* ---------------------------- Resultados --------------------------- */

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
    return { noMeSiguen, noSigo, mutuos, followers: followers.size, following: following.size };
  }

  function buildResults() {
    state.lists = computeLists();
    const { followers, following, mutuos } = state.lists;

    el.totalSeguidores.textContent = String(followers);
    el.totalSeguidos.textContent = String(following);
    const pct = following ? Math.round((mutuos.length / following) * 100) : 0;
    el.totalReciprocidad.textContent = `${pct} %`;

    el.tabs.forEach((tab) => {
      const name = tab.dataset.lista;
      tab.querySelector('.tab-num').textContent = String(state.lists[name].length);
    });

    state.query = '';
    el.buscar.value = '';
    selectTab('noMeSiguen', false);

    el.resultados.hidden = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.resultados.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

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
    el.avisoLimite.hidden = name !== 'noMeSiguen';
    renderList();
  }

  function buildRow(user) {
    const li = document.createElement('li');
    const reviewed = state.reviewed.has(user);
    li.className = reviewed ? 'fila revisado' : 'fila';

    const label = document.createElement('label');
    label.className = 'casilla';
    label.title = 'Ya lo revisé';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = reviewed;
    check.dataset.usuario = user;
    check.setAttribute('aria-label', `Ya revisé a ${user}`);
    label.appendChild(check);

    const name = document.createElement('span');
    name.className = 'usuario';
    name.textContent = `@${user}`;

    const link = document.createElement('a');
    link.className = 'abrir';
    link.href = `https://www.instagram.com/${encodeURIComponent(user)}/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir perfil';
    link.setAttribute('aria-label', `Abrir el perfil de ${user} en Instagram`);

    li.append(label, name, link);
    return li;
  }

  function renderList() {
    if (!state.lists) return;
    const full = state.lists[state.activeList];
    const q = state.query.trim().toLowerCase().replace(/^@/, '');

    let items = full;
    if (q) items = items.filter((u) => u.includes(q));
    if (state.hideReviewed) items = items.filter((u) => !state.reviewed.has(u));

    const shown = items.slice(0, state.visible);
    el.lista.replaceChildren(...shown.map(buildRow));

    const reviewedCount = full.filter((u) => state.reviewed.has(u)).length;
    el.conteo.textContent = full.length
      ? `${full.length} ${plural(full.length, 'cuenta', 'cuentas')}, ${reviewedCount} ${plural(reviewedCount, 'revisada', 'revisadas')}` +
        (items.length !== full.length ? `. Mostrando ${items.length}.` : '')
      : '';

    if (!items.length) {
      let text = VACIO_LISTA[state.activeList];
      if (full.length && q) text = `Ninguna cuenta coincide con «${q}».`;
      else if (full.length) text = 'Ya revisaste todas las cuentas de esta lista.';
      el.vacio.textContent = text;
      el.vacio.hidden = false;
    } else {
      el.vacio.hidden = true;
    }

    el.mas.hidden = items.length <= shown.length;
    if (!el.mas.hidden) {
      el.mas.textContent = `Mostrar más (faltan ${items.length - shown.length})`;
    }
    el.avisoStorage.hidden = state.storageOk;
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

  function resetAll() {
    state.followers.clear();
    state.following.clear();
    state.lists = null;
    el.resultados.hidden = true;
    el.lista.replaceChildren();
    hideMessage();
    updateStatus();
    el.input.value = '';
    window.scrollTo({ top: 0, behavior: 'auto' });
    el.input.focus();
  }

  function bindEvents() {
    el.input.addEventListener('change', () => {
      handleFiles(el.input.files).finally(() => {
        el.input.value = '';
      });
    });

    ['dragenter', 'dragover'].forEach((type) =>
      el.drop.addEventListener(type, (e) => {
        e.preventDefault();
        el.drop.classList.add('is-over');
      })
    );
    ['dragleave', 'dragend'].forEach((type) =>
      el.drop.addEventListener(type, () => el.drop.classList.remove('is-over'))
    );
    el.drop.addEventListener('drop', (e) => {
      e.preventDefault();
      el.drop.classList.remove('is-over');
      handleFiles(e.dataTransfer && e.dataTransfer.files);
    });

    // Evita que soltar un archivo fuera de la zona abra el archivo en la pestaña.
    ['dragover', 'drop'].forEach((type) =>
      window.addEventListener(type, (e) => {
        if (!el.drop.contains(e.target)) e.preventDefault();
      })
    );

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
      if (check.checked) state.reviewed.add(user);
      else state.reviewed.delete(user);
      saveReviewed();

      if (state.hideReviewed) {
        renderList();
      } else {
        check.closest('.fila').classList.toggle('revisado', check.checked);
        renderCountOnly();
      }
    });

    el.mas.addEventListener('click', () => {
      state.visible += PAGE_SIZE;
      renderList();
    });

    el.reiniciar.addEventListener('click', resetAll);

    el.borrarMarcas.addEventListener('click', () => {
      if (!state.reviewed.size) return;
      if (!window.confirm('¿Borrar todas las casillas que marcaste como revisadas?')) return;
      state.reviewed.clear();
      saveReviewed();
      renderList();
    });
  }

  // Actualiza solo el contador, sin redibujar la lista (así no se pierde el foco).
  function renderCountOnly() {
    const full = state.lists[state.activeList];
    const reviewedCount = full.filter((u) => state.reviewed.has(u)).length;
    const q = state.query.trim();
    const filtered = q || state.hideReviewed;
    const base = `${full.length} ${plural(full.length, 'cuenta', 'cuentas')}, ${reviewedCount} ${plural(reviewedCount, 'revisada', 'revisadas')}`;
    el.conteo.textContent = filtered ? el.conteo.textContent.replace(/^[^.]*/, base) : base;
    el.avisoStorage.hidden = state.storageOk;
  }

  /* ------------------------------- Inicio ---------------------------- */

  state.reviewed = loadReviewed();
  bindEvents();
})();
