(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * Comparador de seguidores de Instagram
   * Todo ocurre en el navegador: no hay ninguna llamada de red.
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = 'comparador-seguidores:revisados';
  const PAGE_SIZE = 10;
  const MAX_ZIP_BYTES = 200 * 1024 * 1024;
  const USERNAME_RE = /^[a-z0-9._]{1,30}$/;
  const USER_LABEL_RE = /usuario|username|user name|utilisateur|utente|benutzer/i;
  const DAY_MS = 86400000;
  const MIN_STAMP = Date.UTC(2010, 0, 1);
  const AVATAR_VARIANTS = 6;
  const OPTIONAL_KINDS = ['unfollowed', 'closeFriends', 'pending', 'hideStory', 'favorites'];
  const MAS_PAGE = 10; // cuentas que se ven al abrir cada sección de «Más sobre tu cuenta»
  const MAS_MORE = 10; // cuentas que suma cada «Mostrar más»
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const AYUDA_LISTA = {
    todos: 'Todas tus cuentas en una sola lista. Buscá un usuario para ver cómo es la relación.',
    mutuos: 'Cuentas que se siguen entre sí.',
    dejadas: 'Cuentas que dejaste de seguir hace poco y que no te siguen. Instagram solo guarda los últimos meses.',
    noMeSiguen: 'Cuentas que seguís y no te siguen.',
    noSigo: 'Cuentas que te siguen y no seguís. Abrí el perfil para seguirlas.',
  };

  const FECHA_DE_PESTANA = {
    todos: 'La fecha es la primera que aparece en cada fila.',
    mutuos: 'La fecha es: desde cuándo se siguen.',
    dejadas: 'La fecha es: cuándo la dejaste de seguir.',
    noMeSiguen: 'La fecha es: desde cuándo la seguís.',
    noSigo: 'La fecha es: desde cuándo te sigue.',
  };

  const VACIO_LISTA = {
    todos: 'Todavía no hay cuentas para mostrar.',
    mutuos: 'Todavía no hay cuentas que se sigan entre sí.',
    dejadas: 'No hay cuentas que hayas dejado de seguir hace poco.',
    noMeSiguen: '¡Todas las cuentas que seguís te siguen de vuelta!',
    noSigo: '¡Seguís a todas las cuentas que te siguen!',
  };

    // Demo: 20 cuentas famosas reales (abren su perfil) y algunas inventadas para completar las listas.
  // Los números son "hace cuántos días". Las inventadas no llevan a ningún lado.
  const DEMO = [
        { user: 'leomessi', following: 2100, real: true, pin: 1 },
    { user: 'cristiano', following: 2300, real: true, pin: 2 },
    { user: 'selenagomez', following: 1500, real: true },
    { user: 'kyliejenner', following: 1200, real: true },
    { user: 'therock', following: 900, real: true },
    { user: 'arianagrande', following: 1800, real: true },
    { user: 'kimkardashian', following: 700, real: true },
    { user: 'beyonce', following: 1950, real: true },
    { user: 'taylorswift', following: 400, real: true },
    { user: 'jlo', following: 520, real: true },
    { user: 'neymarjr', following: 2200, real: true },
    { user: 'shakira', following: 1700, real: true },
    { user: 'karolg', following: 300, real: true },
    { user: 'tinistoessel', following: 260, real: true },
    { user: 'zendaya', following: 150, real: true },
    { user: 'billieeilish', following: 80, real: true },
    { user: 'kendalljenner', following: 600, real: true },
    { user: 'mrbeast', following: 35, real: true },
    { user: 'kunaguero', following: 1400, real: true },
    { user: 'khloekardashian', following: 20, real: true },
    { user: '__deleted__x7k2m9qa', follower: 1100 },
    { user: 'ana_foto', follower: 300 },
    { user: 'dani.music', follower: 1500, unfollowed: 20 },
    { user: 'juli.bs', follower: 45 },
    { user: 'pablo_ok', follower: 700 },
    { user: 'meli.vz', follower: 210 },
    { user: 'santi_gm', follower: 1900 },
    { user: 'agus.rm', following: 900, follower: 1200 },
    { user: 'cami.ok', following: 500, follower: 100 },
    { user: 'fede.a', following: 60, follower: 60 },
    { user: 'lau_dg', following: 1300, follower: 1700 },
    { user: 'rama.studio', following: 15, follower: 30 },
    { user: 'tomi_77', unfollowed: 40 },
    { user: 'vale_ok', unfollowed: 12 },
    { user: 'gus.d', unfollowed: 75 },
  ];

  // Números inventados que muestra la demo arriba y en las pestañas (en pantalla hay solo 35 cuentas).
  // Cierran entre sí: seguidos = mutuos + noMeSiguen, seguidores = mutuos + noSigo.
  const DEMO_COUNTS = {
    followers: 1303,
    following: 1688,
    todos: 2008,
    mutuos: 1021,
    dejadas: 38,
    noMeSiguen: 667,
    noSigo: 282,
  };

  const state = {
    followers: new Map(), // origen del archivo -> { users: Map(usuario -> fecha), date: Date | null }
    following: new Map(),
    unfollowed: new Map(),
    closeFriends: new Map(),
    pending: new Map(),
    hideStory: new Map(),
    favorites: new Map(),
    reviewed: new Set(), // casillas guardadas en el navegador (modo real)
    demoReviewed: new Set(), // casillas de la demo (no se guardan)
    storageOk: true,
    mode: null, // 'demo' | 'real'
    lists: null,
    activeList: 'todos',
    query: '',
    hideReviewed: false,
    sort: 'az', // 'az' | 'recent' | 'old'
        visible: PAGE_SIZE,
    username: null, // usuario que viene en el nombre del .zip
    listOpen: false, // sección «Todos, Mutuos…» expandida
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
        usuario: $('res-usuario'),
    fecha: $('fecha'),
    fechaTexto: $('fecha-texto'),
    fechaDetalle: $('fecha-detalle'),
    alternar: $('alternar-lista'),
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
    filtrosBoton: $('filtros-boton'),
    filtrosPunto: $('filtros-punto'),
    filtros: $('filtros'),
    filtrosFecha: $('filtros-fecha'),
    ordenRadios: Array.from(document.querySelectorAll('input[name="orden"]')),
    ocultar: $('ocultar'),
    conteo: $('conteo'),
    avisoStorage: $('aviso-storage'),
    lista: $('lista'),
    vacio: $('vacio'),
    mas: $('mas'),
    borrarMarcas: $('borrar-marcas'),
    masDatos: $('mas-datos'),
    masLista: $('mas-lista'),
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

  // El .zip de Instagram se llama instagram-USUARIO-AAAA-MM-DD-CODIGO.zip
  function usernameFromZipName(name) {
    const m = /^instagram-([a-z0-9._]+)-\d{4}-\d{2}-\d{2}-[a-z0-9_-]+(?:\s*\(\d+\))?\.zip$/i.exec(baseName(name));
    return m ? normalizeUser(m[1]) : null;
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

  // Deduce qué contiene un archivo a partir de su nombre.
  function kindFromName(name) {
    const base = baseName(name).toLowerCase();
    if (/^following_hashtags/.test(base)) return null;
    if (/^recently_unfollowed/.test(base)) return 'unfollowed';
    if (/^close_friends/.test(base)) return 'closeFriends';
    if (/^pending_follow_requests/.test(base)) return 'pending';
    if (/^hide_story_from/.test(base)) return 'hideStory';
    if (/^profiles_you.{1,3}ve_favorited/.test(base)) return 'favorites';
    if (/^followers(?![a-z])/.test(base)) return 'followers';
    if (/^following(?![a-z])/.test(base)) return 'following';
    return null;
  }

  function validDate(d) {
    return !!d && typeof d.getTime === 'function' && !isNaN(d.getTime()) && d.getFullYear() >= 2012;
  }

  function plural(n, uno, otros) {
    return n === 1 ? uno : otros;
  }

    function fmt(n) {
    return Number(n).toLocaleString('es-AR');
  }

  function moreLabel(remaining, step) {
    const n = Math.min(step, remaining);
    return `Mostrar ${fmt(n)} ${plural(n, 'cuenta', 'cuentas')} más`;
  }

    function formatDate(d) {
    const day = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d).replace(/\./g, '');
    return `${day} ${String(d.getFullYear()).slice(-2)}`;
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

    // «Abrir perfil» en PC y «Perfil» en celular (el CSS muestra uno u otro).
  function openLabel() {
    const long = document.createElement('span');
    long.className = 'abrir-largo';
    long.textContent = 'Abrir perfil';
    const short = document.createElement('span');
    short.className = 'abrir-corto';
    short.textContent = 'Perfil';
    return [long, short];
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

  /* ------------------------------ Fechas ----------------------------- */

  function toMs(ts) {
    if (typeof ts !== 'number' || !isFinite(ts) || ts <= 0) return null;
    return ts < 1e11 ? ts * 1000 : ts;
  }

  function validStamp(ms) {
    return typeof ms === 'number' && isFinite(ms) && ms >= MIN_STAMP && ms <= Date.now() + 2 * DAY_MS;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function shortDate(ms) {
    const d = new Date(ms);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  function dayKey(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function yearsText(n) {
    return n === 1 ? 'un año' : `${n} años`;
  }

  // Menos de 365 días: fecha exacta. Desde 365 días: "más de N años".
  function dateParts(ms) {
    if (!validStamp(ms)) return null;
    const days = Math.floor((Date.now() - ms) / DAY_MS);
    if (days >= 365) return { old: true, years: Math.floor(days / 365) };
    return { old: false, text: shortDate(ms) };
  }

  // "desde 12/04/2026" o "hace más de 3 años"
  function since(ms) {
    const p = dateParts(ms);
    if (!p) return '';
    return p.old ? `hace más de ${yearsText(p.years)}` : `desde ${p.text}`;
  }

  // "el 13/09/2026" o "hace más de un año"
  function on(ms) {
    const p = dateParts(ms);
    if (!p) return '';
    return p.old ? `hace más de ${yearsText(p.years)}` : `el ${p.text}`;
  }

  function sentence(base, tail) {
    return `${base}${tail ? ` ${tail}` : ''}.`;
  }

  /* ----------------------------- Lectura ----------------------------- */

  // Devuelve { user, ts } para los dos formatos que usa Instagram:
  // el clásico (string_list_data) y el nuevo (label_values).
  function entryFromItem(item) {
    if (!item || typeof item !== 'object') return null;

    if (Array.isArray(item.string_list_data)) {
      const data = item.string_list_data[0] || {};
      const user =
        normalizeUser(data.value) || normalizeUser(item.title) || normalizeUser(userFromHref(data.href));
      return user ? { user, ts: toMs(data.timestamp) } : null;
    }

    if (Array.isArray(item.label_values)) {
      let user = null;
      for (const lv of item.label_values) {
        if (lv && USER_LABEL_RE.test(String(lv.label))) {
          user = normalizeUser(lv.value);
          if (user) break;
        }
      }
      if (!user) {
        for (const lv of item.label_values) {
          if (lv && lv.value) {
            user = normalizeUser(userFromHref(lv.value));
            if (user) break;
          }
        }
      }
      return user ? { user, ts: toMs(item.timestamp) } : null;
    }

    return null;
  }

  function parseJson(text, hint) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return null;
    }

    let kind = null;
    let items = null;

    if (Array.isArray(data)) {
      items = data;
      const first = data[0];
      kind = hint || (first && Array.isArray(first.string_list_data) ? 'followers' : null);
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.relationships_following)) {
        kind = 'following';
        items = data.relationships_following;
      } else if (Array.isArray(data.relationships_followers)) {
        kind = 'followers';
        items = data.relationships_followers;
      } else if (Array.isArray(data.relationships_unfollowed_users)) {
        kind = 'unfollowed';
        items = data.relationships_unfollowed_users;
      } else if (Array.isArray(data.label_values)) {
        kind = hint;
        items = [data];
      }
    }
    if (!items || !kind) return null;

    const users = new Map();
    items.forEach((item) => {
      const entry = entryFromItem(item);
      if (entry && !users.has(entry.user)) users.set(entry.user, entry.ts);
    });
    return users.size ? { kind, users } : null;
  }

  function parseHtml(text, hint) {
    if (!hint) return null;
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const users = new Map();
    doc.querySelectorAll('a[href]').forEach((a) => {
      const u = normalizeUser(userFromHref(a.getAttribute('href')));
      if (u && !users.has(u)) users.set(u, null);
    });
    return users.size ? { kind: hint, users } : null;
  }

  function parseSource(sourceName, ext, text) {
    const hint = kindFromName(sourceName);
    return ext === 'json' ? parseJson(text, hint) : parseHtml(text, hint);
  }

  function problemFor(sourceName, ext) {
    const name = baseName(sourceName);
    if (OPTIONAL_KINDS.includes(kindFromName(sourceName))) {
      return `No pude leer «${name}». Probá exportar de nuevo «Seguidores y seguidos» en formato JSON.`;
    }
    if (ext !== 'json' && !kindFromName(sourceName)) {
      return `No pude saber qué contiene «${name}». Dejale el nombre original (followers_1.html, following.html, etc.).`;
    }
    return `«${name}» no parece ser un archivo de seguidores ni de seguidos. Revisá que hayas exportado solo «Seguidores y seguidos» en formato JSON.`;
  }

  // Cada archivo leído se "prepara" y recién al final de la subida se guarda.
  // Regla: por cada tipo que trae la subida, se reemplaza lo que hubiera de ese tipo.
  // Un .zip es una exportación completa, así que además renueva las cuentas «dejadas de seguir».
  function prepare(sourceName, ext, text, date, problems, fromZip) {
    const result = parseSource(sourceName, ext, text);
    if (!result) {
      // Un archivo opcional vacío dentro de un .zip (por ejemplo, sin solicitudes pendientes) no es un error.
      if (!(fromZip && OPTIONAL_KINDS.includes(kindFromName(sourceName)))) {
        problems.push(problemFor(sourceName, ext));
      }
      return null;
    }
    return { sourceName, result, date: validDate(date) ? date : null, fromZip: !!fromZip };
  }

  function commit(prepared) {
    const maps = {
      followers: state.followers,
      following: state.following,
      unfollowed: state.unfollowed,
      closeFriends: state.closeFriends,
      pending: state.pending,
      hideStory: state.hideStory,
      favorites: state.favorites,
    };
    const kinds = new Set(prepared.map((p) => p.result.kind));
    if (prepared.some((p) => p.fromZip && !OPTIONAL_KINDS.includes(p.result.kind))) {
      OPTIONAL_KINDS.forEach((kind) => kinds.add(kind));
    }
    kinds.forEach((kind) => maps[kind].clear());
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
      const one = prepare(item.path, item.ext, text, item.entry.date, problems, true);
      if (one) prepared.push(one);
    }
    return prepared;
  }

  async function readFile(file, problems) {
    const ext = getExt(file.name);
    if (ext === 'zip') return readZip(file, problems);
    if (isSupportedExt(ext)) {
      const text = await file.text();
      const one = prepare(file.name, ext, text, new Date(file.lastModified), problems, false);
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
    if (prepared.some((p) => p.fromZip)) {
      const zip = files.find((f) => getExt(f.name) === 'zip');
      state.username = zip ? usernameFromZipName(zip.name) : null;
    }
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
    } else if (!hasFollowers && !hasFollowing && prepared.length) {
      lines.push('Faltan los archivos de seguidores (followers_1.json) y de seguidos (following.json). Subilos también.');
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

  /* ------------------------------ Cuentas ---------------------------- */

  // Junta los archivos de un mismo tipo: usuario -> fecha.
  // Si una cuenta aparece más de una vez, queda la fecha más antigua (o la más nueva si latest).
  function mergeSources(map, latest) {
    const all = new Map();
    map.forEach(({ users }) => {
      users.forEach((ts, user) => {
        if (!all.has(user)) {
          all.set(user, ts);
          return;
        }
        const prev = all.get(user);
        if (ts == null) return;
        if (prev == null || (latest ? ts > prev : ts < prev)) all.set(user, ts);
      });
    });
    return all;
  }

  function newAccount(user) {
    return {
      user,
      follows: false, // vos la seguís
      followsMe: false, // ella te sigue
      followingTs: null,
      followerTs: null,
      unfollowed: false, // la dejaste de seguir hace poco
      unfollowTs: null,
    };
  }

  function accountsFromState() {
    const accounts = new Map();
    const get = (user) => {
      if (!accounts.has(user)) accounts.set(user, newAccount(user));
      return accounts.get(user);
    };
    mergeSources(state.followers, false).forEach((ts, user) => {
      const a = get(user);
      a.followsMe = true;
      a.followerTs = ts;
    });
    mergeSources(state.following, false).forEach((ts, user) => {
      const a = get(user);
      a.follows = true;
      a.followingTs = ts;
    });
    mergeSources(state.unfollowed, true).forEach((ts, user) => {
      const a = get(user);
      a.unfollowed = true;
      a.unfollowTs = ts;
    });
    return accounts;
  }

  function accountsFromDemo() {
    const now = Date.now();
    const ago = (days) => now - days * DAY_MS - 3 * 3600000;
    const accounts = new Map();
    DEMO.forEach((spec) => {
            const a = newAccount(spec.user);
      a.real = !!spec.real;
      a.pin = spec.pin || 0;
      if (spec.following != null) {
        a.follows = true;
        a.followingTs = ago(spec.following);
      }
      if (spec.follower != null) {
        a.followsMe = true;
        a.followerTs = ago(spec.follower);
      }
      if (spec.unfollowed != null) {
        a.unfollowed = true;
        a.unfollowTs = ago(spec.unfollowed);
      }
      accounts.set(a.user, a);
    });
    return accounts;
  }

  function isDeleted(a) {
    return /^__deleted__/.test(a.user) && (a.follows || a.followsMe);
  }

  function buildLists(accounts) {
    const todos = [];
    const mutuos = [];
    const noMeSiguen = [];
    const noSigo = [];
    const dejadas = [];
    let deleted = 0;
    let dejadasQueTeSiguen = 0;

    accounts.forEach((a) => {
      todos.push(a.user);
      if (a.follows && a.followsMe) mutuos.push(a.user);
      else if (a.follows) {
        noMeSiguen.push(a.user);
        if (isDeleted(a)) deleted += 1;
      } else if (a.followsMe) {
        noSigo.push(a.user);
        if (a.unfollowed) dejadasQueTeSiguen += 1;
      } else if (a.unfollowed) dejadas.push(a.user);
    });

  // Las cuentas con prioridad (solo la demo) van primero; el resto, A-Z.
    const rank = (u) => {
      const a = accounts.get(u);
      return a && a.pin ? a.pin : 99;
    };
    [todos, mutuos, noMeSiguen, noSigo, dejadas].forEach((l) =>
      l.sort((x, y) => rank(x) - rank(y) || (x < y ? -1 : x > y ? 1 : 0))
    );
    return {
      accounts,
      todos,
      mutuos,
      noMeSiguen,
      noSigo,
      dejadas,
      deleted,
      dejadasQueTeSiguen,
      followers: noSigo.length + mutuos.length,
      following: noMeSiguen.length + mutuos.length,
    };
  }

  // Desde cuándo se siguen: la más nueva de las dos fechas.
  function mutualSince(a) {
    const f = validStamp(a.followerTs);
    const g = validStamp(a.followingTs);
    if (f && g) return Math.max(a.followerTs, a.followingTs);
    if (g) return a.followingTs;
    if (f) return a.followerTs;
    return null;
  }

  // La primera fecha que aparece en la fila de una cuenta.
  function primaryDate(a) {
    if (isDeleted(a)) return a.follows ? a.followingTs : a.followerTs;
    if (a.follows && a.followsMe) return mutualSince(a);
    if (a.follows) return a.followingTs;
    if (a.followsMe) return a.unfollowed ? a.unfollowTs : a.followerTs;
    return a.unfollowTs;
  }

  // La fecha por la que se ordena cada pestaña.
  function dateForTab(a, tab) {
    switch (tab) {
      case 'mutuos':
        return mutualSince(a);
      case 'dejadas':
        return a.unfollowTs;
      case 'noMeSiguen':
        return a.followingTs;
      case 'noSigo':
        return a.followerTs;
      default:
        return primaryDate(a);
    }
  }

  // Las dos frases de cada cuenta. 'ok' = el vínculo existe, 'no' = no existe.
  function linesFor(a) {
    if (isDeleted(a)) {
      const second = a.follows
        ? sentence('La seguías', since(a.followingTs))
        : sentence('Te seguía', since(a.followerTs));
      return [
        { tone: 'no', text: 'Esta cuenta ya no existe.' },
        { tone: 'no', text: second },
      ];
    }

    if (a.follows && a.followsMe) {
      const both = validStamp(a.followingTs) && validStamp(a.followerTs);
      const out = [{ tone: 'ok', text: sentence('Se siguen', since(mutualSince(a))) }];
      if (both) {
        let first;
        if (dayKey(a.followerTs) === dayKey(a.followingTs)) first = 'Se siguieron el mismo día.';
        else if (a.followerTs < a.followingTs) first = 'Te siguió primero.';
        else first = 'La seguiste primero.';
        out.push({ tone: 'ok', text: first });
      }
      return out;
    }

    if (a.follows) {
      return [
        { tone: 'ok', text: sentence('Seguís esta cuenta', since(a.followingTs)) },
        { tone: 'no', text: 'No te sigue.' },
      ];
    }

    if (a.followsMe) {
      const first = a.unfollowed
        ? sentence('Dejaste de seguir esta cuenta', on(a.unfollowTs))
        : 'No seguís esta cuenta.';
      return [
        { tone: 'no', text: first },
        { tone: 'ok', text: sentence('Te sigue', since(a.followerTs)) },
      ];
    }

    return [
      { tone: 'no', text: sentence('Dejaste de seguir esta cuenta', on(a.unfollowTs)) },
      { tone: 'no', text: 'No te sigue.' },
    ];
  }

  function updateStatus() {
    const followers = mergeSources(state.followers, false).size;
    const following = mergeSources(state.following, false).size;

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

  function exportDate() {
    let oldest = null;
    [state.followers, state.following, state.unfollowed, state.closeFriends, state.pending, state.hideStory, state.favorites].forEach((map) => {
      map.forEach(({ date }) => {
        if (validDate(date) && (!oldest || date < oldest)) oldest = date;
      });
    });
    return oldest;
  }

  function setMode(mode) {
    const real = mode === 'real';
    if (mode !== state.mode) {
      state.hideReviewed = false;
      el.ocultar.checked = false;
      state.sort = 'az';
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
    el.fecha.setAttribute('aria-expanded', 'false');
    el.fechaDetalle.hidden = true;
    el.borrarMarcas.hidden = !real;
  }

  function applyLists(lists, mode) {
    setMode(mode);
    state.lists = lists;
    state.query = '';
    el.buscar.value = '';
    renderMetrics();
    renderFecha();
    renderUsuario();
    setListExpanded(false);
    el.resultados.hidden = false;
    selectTab('todos', false);
    if (mode === 'real') renderMas();
    else el.masDatos.hidden = true;
  }

  function showDemo() {
    applyLists(buildLists(accountsFromDemo()), 'demo');
  }

  function buildRealResults() {
    applyLists(buildLists(accountsFromState()), 'real');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.resultados.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

    function renderMetrics() {
    const l = state.lists;
    const c =
      state.mode === 'demo'
        ? DEMO_COUNTS
        : {
            followers: l.followers,
            following: l.following,
            todos: l.todos.length,
            mutuos: l.mutuos.length,
            dejadas: l.dejadas.length,
            noMeSiguen: l.noMeSiguen.length,
            noSigo: l.noSigo.length,
          };
    const pct = c.following ? Math.round((c.mutuos / c.following) * 100) : 0;

    el.totalSeguidores.textContent = fmt(c.followers);
    el.totalSeguidos.textContent = fmt(c.following);
    el.barraEtiqueta.textContent = `De las ${fmt(c.following)} que seguís`;
    el.leyendaMutuos.textContent = `${fmt(c.mutuos)} te siguen de vuelta (${pct} %)`;
    el.leyendaNo.textContent = `${fmt(c.noMeSiguen)} no te siguen`;

    el.barraMutuos.style.flexGrow = String(c.mutuos);
    el.barraNo.style.flexGrow = String(c.noMeSiguen);
    el.barraMutuos.hidden = c.mutuos === 0;
    el.barraNo.hidden = c.noMeSiguen === 0;

    el.tabs.forEach((tab) => {
      tab.querySelector('.tab-num').textContent = fmt(c[tab.dataset.lista]);
    });
  }

    function renderFecha() {
    if (state.mode !== 'real') return;
    const d = exportDate();
    el.fechaTexto.textContent = d ? `Datos del ${formatDate(d)}` : 'Datos de cuando pediste el archivo';
  }

  function renderUsuario() {
    const name = state.mode === 'real' ? state.username : 'usuario_demo';
    el.usuario.textContent = name ? `@${name}` : '';
    el.usuario.hidden = !name;
  }

  function setListExpanded(open) {
    state.listOpen = open;
    el.panel.hidden = !open;
    el.alternar.setAttribute('aria-expanded', String(open));
    el.alternar.textContent = open ? 'Contraer sección' : 'Expandir sección';
  }

  /* ------------------------------- Listas ---------------------------- */

  function helpFor(name) {
    const l = state.lists;
    if (name === 'dejadas' && l.dejadasQueTeSiguen > 0) {
      return `${AYUDA_LISTA.dejadas} Las que sí te siguen están en «No seguís».`;
    }
    if (name === 'noMeSiguen') {
      const n = l.deleted;
      const extra = n ? ` ${fmt(n)} ${plural(n, 'es una cuenta eliminada.', 'son cuentas eliminadas.')}` : '';
      return `${AYUDA_LISTA.noMeSiguen}${extra} Abrí el perfil para dejar de seguirlas.`;
    }
    return AYUDA_LISTA[name];
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

    el.ayudaLista.textContent = helpFor(name);
    el.avisoLimite.hidden = name !== 'noMeSiguen' || state.mode !== 'real';
    updateFiltersUi();
    renderList();
  }

  function updateFiltersUi() {
    const active = state.sort !== 'az';
    el.ordenRadios.forEach((radio) => {
      radio.checked = radio.value === state.sort;
    });
    el.filtrosPunto.hidden = !active;
    el.filtrosBoton.setAttribute('aria-label', active ? 'Filtros, orden por fecha activo' : 'Filtros');
    el.filtrosFecha.textContent = FECHA_DE_PESTANA[state.activeList] || '';
  }

  function buildRow(user) {
    const account = state.lists.accounts.get(user);
    const li = document.createElement('li');
    const reviewed = reviewedSet().has(user);
    li.className = reviewed ? 'fila revisado' : 'fila';

    const top = document.createElement('div');
    top.className = 'fila-top';

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

    let action;
    if (isDeleted(account)) {
      action = document.createElement('span');
      action.className = 'etiqueta-eliminada';
      action.textContent = 'Eliminada';
        } else if (state.mode === 'demo' && !account.real) {
      action = document.createElement('span');
      action.className = 'abrir';
            action.setAttribute('aria-hidden', 'true');
      action.append(...openLabel(), icon('external'));
    } else {
      action = document.createElement('a');
      action.className = 'abrir';
      action.href = `https://www.instagram.com/${encodeURIComponent(user)}/`;
      action.target = '_blank';
      action.rel = 'noopener noreferrer';
      action.setAttribute('aria-label', `Abrir el perfil de ${user} en Instagram`);
      action.append(...openLabel(), icon('external'));
    }
    top.append(label, avatar, name, action);

    const info = document.createElement('div');
    info.className = 'fila-info';
    linesFor(account).forEach((line) => {
      const p = document.createElement('p');
      p.className = 'dato';
      const dot = document.createElement('span');
      dot.className = `dato-punto ${line.tone}`;
      dot.setAttribute('aria-hidden', 'true');
      p.append(dot, line.text);
      info.appendChild(p);
    });

    li.append(top, info);
    return li;
  }

  // Ordena por fecha. Las cuentas sin fecha van siempre al final; el empate se resuelve A-Z.
  function sortByDate(users) {
    const tab = state.activeList;
    const accounts = state.lists.accounts;
    const dir = state.sort === 'recent' ? -1 : 1;
    const keyed = users.map((user) => {
      const ts = dateForTab(accounts.get(user), tab);
      return { user, ts, has: validStamp(ts) };
    });
    keyed.sort((x, y) => {
      if (x.has !== y.has) return x.has ? -1 : 1;
      if (x.has && x.ts !== y.ts) return dir * (x.ts - y.ts);
      return x.user < y.user ? -1 : x.user > y.user ? 1 : 0;
    });
    return keyed.map((k) => k.user);
  }

  function filteredItems() {
    const full = state.lists[state.activeList];
    const q = state.query.trim().toLowerCase().replace(/^@/, '');
    const marks = reviewedSet();
    let items = state.sort === 'az' ? full : sortByDate(full);
    if (q) items = items.filter((u) => u.includes(q));
    if (state.hideReviewed) items = items.filter((u) => !marks.has(u));
    return items;
  }

  function updateCount(items) {
    const full = state.lists[state.activeList];
    const marks = reviewedSet();
    const reviewedCount = full.filter((u) => marks.has(u)).length;
    if (!full.length) {
      el.conteo.textContent = '';
    } else {
            const head =
        state.mode === 'demo'
          ? `Ejemplo: se muestran ${fmt(full.length)} de ${fmt(DEMO_COUNTS[state.activeList])} cuentas`
          : `${fmt(full.length)} ${plural(full.length, 'cuenta', 'cuentas')}`;
      const parts = [`${head}, ${fmt(reviewedCount)} ${plural(reviewedCount, 'revisada', 'revisadas')}`];
      if (items.length !== full.length) parts.push(`Mostrando ${fmt(items.length)}`);
      if (state.sort !== 'az') {
        parts.push(`Ordenadas por fecha: ${state.sort === 'recent' ? 'más recientes' : 'más antiguas'} primero`);
      }
      el.conteo.textContent = parts.length > 1 ? `${parts.join('. ')}.` : parts[0];
    }
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
      if (full.length && q) {
        text =
          state.activeList === 'todos'
            ? 'No figura en tus seguidores, tus seguidos ni entre las cuentas que dejaste de seguir hace poco.'
            : `Ninguna cuenta coincide con «${q}».`;
      } else if (full.length) {
        text = 'Ya revisaste todas las cuentas de esta lista.';
      }
      el.vacio.textContent = text;
      el.vacio.hidden = false;
    } else {
      el.vacio.hidden = true;
    }

        el.mas.hidden = items.length <= shown.length;
    if (!el.mas.hidden) el.mas.textContent = moreLabel(items.length - shown.length, PAGE_SIZE);
  }

  /* ------------------------ Más sobre tu cuenta ---------------------- */

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function currentYear() {
    return new Date(Date.now()).getFullYear();
  }

  function agoYears(year) {
    const n = currentYear() - year;
    if (n <= 0) return 'este año';
    return n === 1 ? 'hace 1 año' : `hace ${n} años`;
  }

  function byDateAsc(a, b) {
    const av = validStamp(a.ts);
    const bv = validStamp(b.ts);
    if (av !== bv) return av ? -1 : 1;
    if (av && a.ts !== b.ts) return a.ts - b.ts;
    return a.user < b.user ? -1 : a.user > b.user ? 1 : 0;
  }

  function entriesOf(map) {
    return Array.from(mergeSources(map, false), ([user, ts]) => ({ user, ts })).sort(byDateAsc);
  }

  function countsByYear(items) {
    const counts = new Map();
    items.forEach(({ ts }) => {
      const year = new Date(ts).getFullYear();
      counts.set(year, (counts.get(year) || 0) + 1);
    });
    return new Map(Array.from(counts).sort((a, b) => a[0] - b[0]));
  }

  // Escalera de años: una fila por año, con barra, cantidad y «hace N años».
  function renderLadder(container, counts, opts) {
    const wrap = h('div', 'anos');
    const max = Math.max(...counts.values());
    counts.forEach((n, year) => {
      const row = h(opts.selectable ? 'button' : 'div', 'ano-fila');
      if (opts.selectable) {
        row.type = 'button';
        row.setAttribute('aria-pressed', String(opts.selected === year));
      }
      const label = h('span', 'ano-etq');
      label.append(h('span', 'ano-anio', String(year)), h('span', 'ano-hace', agoYears(year)));
      const track = h('span', 'ano-pista');
      const fill = h('span', 'ano-barra');
      fill.style.width = `${Math.max(3, Math.round((n / max) * 100))}%`;
      track.appendChild(fill);
      row.append(label, track, h('span', 'ano-num', fmt(n)));
      if (opts.selectable) row.addEventListener('click', () => opts.onSelect(year));
      wrap.appendChild(row);
    });
    const nodes = [];
    if (opts.title) nodes.push(h('p', 'proporcion-etq', opts.title));
    nodes.push(wrap);
    container.replaceChildren(...nodes);
  }

  function linesForUser(user) {
    const account = state.lists.accounts.get(user);
    return account
      ? linesFor(account)
      : [
          { tone: 'no', text: 'No seguís esta cuenta.' },
          { tone: 'no', text: 'No te sigue.' },
        ];
  }

  // Fila de las secciones de «Más sobre tu cuenta»: las dos frases y, si hay, una tercera línea sin puntito.
  function buildMasRow(user, lines, extra) {
    const account = state.lists.accounts.get(user);
    const reviewed = state.reviewed.has(user);
    const li = h('li', reviewed ? 'fila revisado' : 'fila');

    const top = h('div', 'fila-top');
    const label = h('label', 'casilla');
    label.title = 'Ya lo revisé';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'check';
    check.checked = reviewed;
    check.dataset.usuario = user;
    check.setAttribute('aria-label', `Ya revisé a ${user}`);
    label.appendChild(check);

    const avatar = h('span', `avatar av-${avatarIndex(user)}`, initialOf(user));
    avatar.setAttribute('aria-hidden', 'true');
    const name = h('span', 'usuario', `@${user}`);

    let action;
    if (account && isDeleted(account)) {
      action = h('span', 'etiqueta-eliminada', 'Eliminada');
    } else {
      action = document.createElement('a');
      action.className = 'abrir';
      action.href = `https://www.instagram.com/${encodeURIComponent(user)}/`;
      action.target = '_blank';
      action.rel = 'noopener noreferrer';
      action.setAttribute('aria-label', `Abrir el perfil de ${user} en Instagram`);
            action.append(...openLabel(), icon('external'));
    }

    top.append(label, avatar, name, action);

    const info = h('div', 'fila-info');
    lines.forEach((line) => {
      const p = h('p', 'dato');
      const dot = h('span', `dato-punto ${line.tone}`);
      dot.setAttribute('aria-hidden', 'true');
      p.append(dot, line.text);
      info.appendChild(p);
    });
    if (extra) info.appendChild(h('p', 'dato dato-extra', extra));

    li.append(top, info);
    return li;
  }

  // Frases de «Seguidores veteranos por año»: siempre con la fecha exacta en que te siguen
  // (es la que define el año) y, si la seguís, desde cuándo. La tercera línea aclara quién fue primero.
  function veteranLines(account) {
    if (isDeleted(account)) return { lines: linesFor(account), extra: null };
    const lines = [{ tone: 'ok', text: sentence('Te sigue', `desde ${shortDate(account.followerTs)}`) }];
    let extra = null;
    if (account.follows) {
      const known = validStamp(account.followingTs);
      lines.push({
        tone: 'ok',
        text: known ? sentence('La seguís', `desde ${shortDate(account.followingTs)}`) : 'La seguís.',
      });
      if (known) {
        if (dayKey(account.followerTs) === dayKey(account.followingTs)) extra = 'Se siguieron el mismo día.';
        else extra = account.followerTs < account.followingTs ? 'Te siguió primero.' : 'La seguiste primero.';
      }
    } else {
      lines.push({ tone: 'no', text: 'No la seguís.' });
    }
    return { lines, extra };
  }

  function mutualSwitch(controls, ui, refresh) {
    const label = h('label', 'interruptor');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'sr-only';
    input.setAttribute('role', 'switch');
    const track = h('span', 'pista');
    track.setAttribute('aria-hidden', 'true');
    label.append(input, track, h('span', null, 'Solo mutuos'));
    input.addEventListener('change', () => {
      ui.mutual = input.checked;
      ui.visible = MAS_PAGE;
      refresh();
    });
    controls.appendChild(label);
  }

  // Cada sección: título plegable, descripción, visual, buscador y lista de a 10 cuentas.
  function createSection(cfg) {
    const ui = { query: '', visible: MAS_PAGE, year: null, mutual: false };

    const details = h('details', 'acordeon mas-item');
    details.id = `mas-${cfg.key}`;

    const summary = h('summary');
    const iconBox = h('span', 'ac-icono');
    iconBox.appendChild(icon(cfg.icon));
    const texts = h('span', 'ac-texto');
    texts.append(h('span', 'ac-titulo', cfg.title), h('span', 'ac-sub', cfg.sub));
    summary.append(iconBox, texts, icon('chevron-down', 'ac-flecha'));

    const body = h('div', 'ac-cuerpo mas-cuerpo');
    const desc = h('p', 'mas-desc');
    const controls = h('div', 'mas-extra');
    const visual = h('div', 'mas-visual');
    const searchBox = h('div', 'buscador');
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Buscar usuario';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', `Buscar usuario en ${cfg.title}`);
    searchBox.append(icon('search'), input);
    searchBox.hidden = cfg.baseCount <= MAS_PAGE;
    const count = h('p', 'conteo');
    count.setAttribute('aria-live', 'polite');
    const list = h('ul', 'lista');
    const empty = h('p', 'vacio');
    empty.hidden = true;
    const more = h('button', 'boton-secundario');
    more.type = 'button';
    more.hidden = true;
    body.append(desc, controls, visual, searchBox, count, list, empty, more);
    details.append(summary, body);

    function refresh() {
      if (cfg.visual) cfg.visual(visual, ui, refresh);
      const all = cfg.items(ui);
      const q = ui.query.trim().toLowerCase().replace(/^@/, '');
      const items = q ? all.filter((x) => x.user.includes(q)) : all;
      const shown = items.slice(0, ui.visible);

      desc.textContent = cfg.desc(ui);
      list.replaceChildren(...shown.map((x) => buildMasRow(x.user, x.lines, x.extra)));

      let text = cfg.count ? cfg.count(ui, all.length) : `${fmt(all.length)} ${plural(all.length, 'cuenta', 'cuentas')}`;
      if (q) text += `. Mostrando ${fmt(items.length)}`;
      count.textContent = text;

      empty.hidden = items.length > 0;
      if (!items.length) empty.textContent = q ? `Ninguna cuenta coincide con «${ui.query.trim()}».` : 'No hay cuentas para mostrar.';

            more.hidden = items.length <= shown.length;
      if (!more.hidden) more.textContent = moreLabel(items.length - shown.length, MAS_MORE);
    }

    input.addEventListener('input', () => {
      ui.query = input.value;
      ui.visible = MAS_PAGE;
      refresh();
    });
    more.addEventListener('click', () => {
      ui.visible += MAS_MORE;
      refresh();
    });
    list.addEventListener('change', (e) => {
      const check = e.target;
      if (!(check instanceof HTMLInputElement) || !check.dataset.usuario) return;
      if (check.checked) state.reviewed.add(check.dataset.usuario);
      else state.reviewed.delete(check.dataset.usuario);
      saveReviewed();
      check.closest('.fila').classList.toggle('revisado', check.checked);
    });
    if (cfg.setup) cfg.setup(controls, ui, refresh);

    return { details, summary, refresh };
  }

  function renderMas() {
    const accounts = state.lists.accounts;
    const sections = [];

    // 1) Mejores amigos
    const friends = entriesOf(state.closeFriends);
    if (friends.length) {
      const follows = (f) => !!(accounts.get(f.user) && accounts.get(f.user).followsMe);
      const total = friends.length;
      const back = friends.filter(follows).length;
      const pct = Math.round((back / total) * 100);
      const ordered = friends
        .slice()
        .sort((a, b) => Number(follows(a)) - Number(follows(b)) || (a.user < b.user ? -1 : a.user > b.user ? 1 : 0));
      sections.push(
        createSection({
          key: 'amigos',
          icon: 'star',
          title: 'Mejores amigos',
          sub: `${fmt(back)} de ${fmt(total)} te siguen de vuelta`,
          baseCount: total,
          desc: () => 'Tu lista de Mejores amigos. Las cuentas que no te siguen aparecen primero.',
          visual: (box) => {
            const wrap = h('div', 'proporcion');
            const bar = h('div', 'barra');
            bar.setAttribute('aria-hidden', 'true');
            const okBar = h('div', 'barra-mutuos');
            okBar.style.flexGrow = String(back);
            okBar.hidden = back === 0;
            const noBar = h('div', 'barra-no');
            noBar.style.flexGrow = String(total - back);
            noBar.hidden = total - back === 0;
            bar.append(okBar, noBar);
            const legend = h('ul', 'leyenda');
            [
              ['punto-mutuos', `${fmt(back)} te siguen de vuelta (${pct} %)`],
              ['punto-no', `${fmt(total - back)} no te siguen`],
            ].forEach(([cls, text]) => {
              const li = h('li');
              const dot = h('span', `punto ${cls}`);
              dot.setAttribute('aria-hidden', 'true');
              li.append(dot, h('span', null, text));
              legend.appendChild(li);
            });
            wrap.append(h('p', 'proporcion-etq', `De tus ${fmt(total)} mejores amigos`), bar, legend);
            box.replaceChildren(wrap);
          },
          items: () =>
            ordered.map((f) => ({
              user: f.user,
              lines: linesForUser(f.user),
              extra: sentence('Mejor amigo', since(f.ts)),
            })),
        })
      );
    }

    // 2) Seguidores veteranos por año
    const dated = Array.from(accounts.values())
      .filter((a) => a.followsMe && validStamp(a.followerTs))
      .map((a) => ({ user: a.user, ts: a.followerTs, mutual: a.follows }))
      .sort(byDateAsc);
    if (dated.length) {
      const baseOf = (ui) => (ui.mutual ? dated.filter((x) => x.mutual) : dated);
      sections.push(
        createSection({
          key: 'veteranos',
          icon: 'calendar',
          title: 'Seguidores veteranos por año',
          sub: `${fmt(dated.length)} ${plural(dated.length, 'cuenta', 'cuentas')}, desde ${new Date(dated[0].ts).getFullYear()}`,
          baseCount: dated.length,
          desc: (ui) =>
            ui.mutual
              ? 'Mutuos veteranos: cuentas que te siguen desde hace años y que vos también seguís. Tocá un año para verlas, con la fecha exacta.'
              : 'Desde cuándo te siguen, por año. Solo cuenta a quienes te siguen hoy. Tocá un año para ver esas cuentas, con la fecha exacta.',
          setup: mutualSwitch,
          visual: (box, ui, refresh) => {
            const counts = countsByYear(baseOf(ui));
            if (ui.year != null && !counts.has(ui.year)) ui.year = null;
            if (!counts.size) {
              box.replaceChildren();
              return;
            }
            renderLadder(box, counts, {
              selectable: true,
              selected: ui.year,
              onSelect: (year) => {
                ui.year = ui.year === year ? null : year;
                ui.visible = MAS_PAGE;
                refresh();
              },
            });
          },
          items: (ui) => {
            let base = baseOf(ui);
            if (ui.year != null) base = base.filter((x) => new Date(x.ts).getFullYear() === ui.year);
            return base.map((x) => {
              const account = accounts.get(x.user);
              const { lines, extra } = veteranLines(account);
              return { user: x.user, lines, extra };
            });
          },
          count: (ui, n) => {
            const cuentas = `${fmt(n)} ${plural(n, 'cuenta', 'cuentas')}`;
            const kind = ui.mutual ? ' (solo mutuos)' : '';
            return ui.year != null
              ? `Te siguen desde ${ui.year}: ${cuentas}${kind}. Tocá el año otra vez para ver todos`
              : `${cuentas}${kind}`;
          },
        })
      );
    }

    // 3) Solicitudes sin respuesta
    const pending = entriesOf(state.pending);
    if (pending.length) {
      const datedPending = pending.filter((x) => validStamp(x.ts));
      sections.push(
        createSection({
          key: 'solicitudes',
          icon: 'clock',
          title: 'Solicitudes sin respuesta',
          sub: `${fmt(pending.length)} ${plural(pending.length, 'solicitud', 'solicitudes')}`,
          baseCount: pending.length,
          desc: () =>
            'Cuentas privadas a las que pediste seguir y todavía no te aceptaron. De la más antigua a la más nueva.',
          visual: (box) => {
            const counts = countsByYear(datedPending);
            if (!counts.size) box.replaceChildren();
            else renderLadder(box, counts, { selectable: false, title: 'Solicitudes enviadas por año' });
          },
          items: () =>
            pending.map((x) => {
              const lines = [{ tone: 'no', text: 'Todavía no aceptó tu solicitud.' }];
              if (validStamp(x.ts)) lines.push({ tone: 'no', text: sentence('Se la enviaste', on(x.ts)) });
              return { user: x.user, lines };
            }),
          count: (ui, n) => `${fmt(n)} ${plural(n, 'solicitud', 'solicitudes')}`,
        })
      );
    }

    // 4) y 5) Listas cortas con fecha
    const simple = (key, iconName, title, map, descText, label) => {
      const entries = entriesOf(map);
      if (!entries.length) return;
      sections.push(
        createSection({
          key,
          icon: iconName,
          title,
          sub: `${fmt(entries.length)} ${plural(entries.length, 'cuenta', 'cuentas')}`,
          baseCount: entries.length,
          desc: () => descText,
          items: () =>
            entries.map((x) => ({ user: x.user, lines: linesForUser(x.user), extra: sentence(label, since(x.ts)) })),
        })
      );
    };
    simple('ocultas', 'eye-off', 'Le ocultás tus historias', state.hideStory, 'Cuentas a las que les ocultás tus historias.', 'Le ocultás tus historias');
    simple('favoritos', 'heart', 'Perfiles favoritos', state.favorites, 'Cuentas que marcaste como favoritas.', 'Marcada como favorita');

    // Al abrir una sección, se cierra la que estaba abierta.
    const all = sections.map((s) => s.details);
    sections.forEach(({ details, summary }) => {
      const closeOthers = () =>
        all.forEach((d) => {
          if (d !== details) d.open = false;
        });
      summary.addEventListener('click', () => {
        if (!details.open) closeOthers();
      });
      details.addEventListener('toggle', () => {
        if (details.open) closeOthers();
      });
    });

    el.masLista.replaceChildren(...all);
    el.masDatos.hidden = sections.length === 0;
    sections.forEach((s) => s.refresh());
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

    el.fecha.addEventListener('click', () => {
      const open = el.fechaDetalle.hidden;
      el.fechaDetalle.hidden = !open;
      el.fecha.setAttribute('aria-expanded', String(open));
    });

    el.alternar.addEventListener('click', () => {
      const willOpen = !state.listOpen;
      setListExpanded(willOpen);
      if (!willOpen) {
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.resultados.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    });
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
            tab.addEventListener('click', () => {
        selectTab(tab.dataset.lista, false);
        setListExpanded(true);
      });
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

    el.filtrosBoton.addEventListener('click', () => {
      const open = el.filtros.hidden;
      el.filtros.hidden = !open;
      el.filtrosBoton.setAttribute('aria-expanded', String(open));
    });

    el.ordenRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        state.sort = radio.value;
        state.visible = PAGE_SIZE;
        updateFiltersUi();
        renderList();
      });
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
