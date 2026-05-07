const supabaseUrl = "https://ptvuhwbpfuiwaoiqxqft.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dnVod2JwZnVpd2FvaXF4cWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDgwOTksImV4cCI6MjA5MzY4NDA5OX0.ohR_CSpQ8dlIZaya5SuP1YLtc42dzBfI5qScq6GdEeg";



var SUPABASE_CAPITALARIOS_TABLE = "capitalarios";

var SUPABASE_ORACIONES_TABLE = "oraciones";

/**
 * Unifica saltos de línea (Windows / Mac / Unicode) para que el texto se vea
 * en la Ermita con el mismo formato que en el cuadro de edición.
 */
function normalizarSaltosOracion(s) {
  if (s == null || s === undefined) return "";
  return String(s)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n");
}

window.normalizarSaltosOracion = normalizarSaltosOracion;



/** No usar el nombre `supabase`: la CDN también declara ese identificador y rompe el parseo. */
let supabaseClient = null;



function tryCreateSupabaseClient() {

  if (typeof window.supabase === "undefined") return false;

  var create =

    typeof window.supabase.createClient === "function"

      ? window.supabase.createClient

      : typeof window.supabase.default !== "undefined" &&

          typeof window.supabase.default.createClient === "function"

        ? window.supabase.default.createClient

        : null;

  if (!create) return false;

  try {

    supabaseClient = create(supabaseUrl, supabaseKey);

    return true;

  } catch (_) {

    return false;

  }

}



(function initSupabaseClient() {

  function connect() {

    tryCreateSupabaseClient();

  }

  if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", connect);

  } else {

    connect();

  }

  window.addEventListener("load", function () {

    if (!supabaseClient) tryCreateSupabaseClient();

    if (typeof actualizarContadorCapitalarios === "function") {

      actualizarContadorCapitalarios();

    }

  });

})();



function getSupabase() {
  return supabaseClient;
}

/** Inicio del día local (00:00) y primer instante del día siguiente, para filtrar «hoy». */
function rangoDiaLocalHoy() {
  var ahora = new Date();
  var inicio = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    0,
    0,
    0,
    0
  );
  var finExclusivo = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return {
    desde: inicio.toISOString(),
    hasta: finExclusivo.toISOString(),
  };
}

async function actualizarContadorCapitalarios() {
  var total = document.getElementById("totalCapitales");

  if (!total) return;

  var client = getSupabase();

  if (!client) {
    total.textContent = "—";
    setCapitalarioFeedback(
      "No se pudo conectar. Revisa tu conexión o recarga la página.",
      true
    );
    return;
  }

  var rango = rangoDiaLocalHoy();

  var q = await client
    .from(SUPABASE_CAPITALARIOS_TABLE)
    .select("*", { count: "exact", head: true })
    .gte("created_at", rango.desde)
    .lt("created_at", rango.hasta);

  if (q.error) {
    total.textContent = "—";
    setCapitalarioFeedback(
      "No se pudo cargar el total en este momento. " +
        (q.error.message || "Inténtalo otra vez más tarde."),
      true
    );
    return;
  }

  total.textContent =
    q.count !== null && q.count !== undefined ? String(q.count) : "0";

  setCapitalarioFeedback("", false);
}



function setCapitalarioFeedback(msg, isError) {

  var el = document.getElementById("capitalarioFeedback");

  if (!el) return;

  el.textContent = msg || "";

  el.style.color = isError ? "var(--color-gold)" : "var(--color-text-muted)";

}



(function () {

  const THEME_KEY = "capitalarios-theme";



  function applyTheme(theme) {

    const root = document.documentElement;

    const toggle = document.getElementById("themeDark");

    if (theme === "dark") {

      root.setAttribute("data-theme", "dark");

      if (toggle) toggle.checked = true;

    } else {

      root.removeAttribute("data-theme");

      if (toggle) toggle.checked = false;

    }

    try {

      localStorage.setItem(THEME_KEY, theme);

    } catch (_) {}

  }



  function initTheme() {

    let theme = "light";

    try {

      const stored = localStorage.getItem(THEME_KEY);

      if (stored === "dark" || stored === "light") {

        theme = stored;

      }

    } catch (_) {}

    applyTheme(theme);

  }



  const toggle = document.getElementById("themeDark");

  if (toggle) {

    toggle.addEventListener("change", function () {

      applyTheme(toggle.checked ? "dark" : "light");

    });

  }



  initTheme();

})();



/** Envía el capitalario al servicio (ofrece, agradece, pide y fecha). */
async function insertarCapitalarioRemoto(row) {
  var client = getSupabase();
  if (!client) {
    return {
      data: null,
      error: { message: "No se pudo conectar con el servicio." },
    };
  }
  return await client.from(SUPABASE_CAPITALARIOS_TABLE).insert(row);
}

/** Lee el formulario, valida y lo envía. */
async function guardarCapitalario() {
  var ofreceEl = document.getElementById("ofreceInput");

  var agradeceEl = document.getElementById("agradeceInput");

  var pideEl = document.getElementById("pideInput");
  var oracionEl = document.getElementById("prayerSelector");

  var btn = document.getElementById("btnEntregarCapital");

  var ofrece = ofreceEl ? ofreceEl.value.trim() : "";

  var agradece = agradeceEl ? agradeceEl.value.trim() : "";

  var pide = pideEl ? pideEl.value.trim() : "";
  var oracionId = oracionEl ? oracionEl.value : "";

  if (!ofrece && !agradece && !pide) {
    window.alert("Escribe algo al menos en un campo para entregar tu capitalario.");
    return;
  }

  if (!getSupabase() && tryCreateSupabaseClient() === false) {
    window.alert(
      "No se pudo cargar el servicio. Recarga la página o revisa tu conexión."
    );
    return;
  }

  var row = {
    created_at: new Date().toISOString(),
    ofrece: ofrece,
    agradece: agradece,
    pide: pide,
    oracionId: oracionId || null,
  };

  if (btn) {
    btn.disabled = true;
  }
  setCapitalarioFeedback("Guardando…", false);

  var res = await insertarCapitalarioRemoto(row);

  if (btn) {
    btn.disabled = false;
  }

  if (res.error) {
    console.error("Error al guardar capitalario:", res.error);
    var msg =
      res.error.message ||
      res.error.details ||
      "No se pudo guardar. Inténtalo de nuevo más tarde.";
    setCapitalarioFeedback(msg, true);
    window.alert("No se guardó tu capitalario: " + msg);
    return;
  }

  setCapitalarioFeedback("Capitalario guardado correctamente.", false);
  if (ofreceEl) ofreceEl.value = "";
  if (agradeceEl) agradeceEl.value = "";
  if (pideEl) pideEl.value = "";

  await actualizarContadorCapitalarios();
}

/** Alias del nombre anterior del botón. */
async function enviarCapital() {
  return guardarCapitalario();
}

window.guardarCapitalario = guardarCapitalario;
window.insertarCapitalarioRemoto = insertarCapitalarioRemoto;
window.enviarCapital = enviarCapital;

/**
 * Mapa id (UUID) → texto, rellenado desde el servicio al cargar la página.
 * Si aún no hay datos, permanece vacío hasta que termine la carga.
 */
var prayerTexts = {};

/**
 * Descarga las oraciones y rellena #prayerSelector en index.html.
 * Vuelve a llamar tras guardar oraciones en el resumen si quieres refrescar otras pestañas (recarga manual).
 */
async function cargarOracionesSelector() {
  var sel = document.getElementById("prayerSelector");
  var hint = document.getElementById("prayerSelectHint");
  if (!sel) return;

  sel.setAttribute("aria-busy", "true");
  if (hint) {
    hint.textContent = "Cargando oraciones…";
    hint.style.color = "var(--color-text-muted)";
  }

  if (!getSupabase() && !tryCreateSupabaseClient()) {
    sel.setAttribute("aria-busy", "false");
    if (hint) {
      hint.textContent =
        "No se pudo conectar. Recarga la página o revisa tu conexión.";
      hint.style.color = "var(--color-gold)";
    }
    return;
  }

  var client = getSupabase();
  if (!client) {
    sel.setAttribute("aria-busy", "false");
    if (hint) hint.textContent = "";
    return;
  }

  var res = await client
    .from(SUPABASE_ORACIONES_TABLE)
    .select("id, nombre, contenido")
    .order("nombre", { ascending: true });

  sel.setAttribute("aria-busy", "false");

  if (res.error) {
    console.error("Oraciones:", res.error);
    if (hint) {
      hint.textContent =
        "No se pudieron cargar las oraciones. " +
        (res.error.message || "Inténtalo de nuevo más tarde.");
      hint.style.color = "var(--color-gold)";
    }
    return;
  }

  if (hint) {
    hint.textContent = "";
    hint.style.color = "var(--color-text-muted)";
  }

  var map = {};
  var rows = res.data || [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.id) {
      map[r.id] = normalizarSaltosOracion(
        r.contenido != null ? String(r.contenido) : ""
      );
    }
  }
  prayerTexts = map;

  while (sel.options.length > 1) {
    sel.remove(1);
  }

  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var opt = document.createElement("option");
    opt.value = row.id;
    opt.textContent = row.nombre ? String(row.nombre) : "Sin nombre";
    sel.appendChild(opt);
  }

  if (rows.length === 0 && hint) {
    hint.textContent =
      "Aún no hay oraciones publicadas. Puedes añadirlas desde la página de resumen.";
    hint.style.color = "var(--color-text-muted)";
  }
}

window.cargarOracionesSelector = cargarOracionesSelector;

function mostrarOracion() {

  var sel = document.getElementById("prayerSelector");

  var box = document.getElementById("prayerDisplay");

  var content = document.getElementById("prayerContent");

  if (!sel || !box || !content) return;

  var key = sel.value;

  if (!key) {

    box.style.display = "none";

    return;

  }

  if (
    window.speechSynthesis &&
    (window.speechSynthesis.speaking || window.speechSynthesis.paused)
  ) {
    window.speechSynthesis.cancel();
  }

  var textos = prayerTexts || {};
  content.textContent = normalizarSaltosOracion(textos[key] || "");

  box.style.display = "block";

  actualizarBotonPausaOracion();

}



function actualizarBotonPausaOracion() {
  var btn = document.getElementById("btnPausarOracion");
  if (!btn || !window.speechSynthesis) return;
  var syn = window.speechSynthesis;
  var activo = syn.speaking || syn.paused;
  btn.disabled = !activo;
  if (!activo) {
    btn.textContent = "⏸ Pausar";
    return;
  }
  btn.textContent = syn.paused ? "▶ Continuar" : "⏸ Pausar";
}

function pausarOReanudarOracion() {
  if (!window.speechSynthesis) return;
  var syn = window.speechSynthesis;
  if (!syn.speaking && !syn.paused) return;
  try {
    if (syn.paused) {
      syn.resume();
    } else {
      syn.pause();
    }
  } catch (_) {}
  actualizarBotonPausaOracion();
}

function leerOracion() {

  var el = document.getElementById("prayerContent");

  if (!el || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  var u = new SpeechSynthesisUtterance(el.textContent);

  u.lang = "es-ES";

  u.onend = function () {
    actualizarBotonPausaOracion();
  };

  u.onerror = function () {
    actualizarBotonPausaOracion();
  };

  window.speechSynthesis.speak(u);

  actualizarBotonPausaOracion();

}

window.pausarOReanudarOracion = pausarOReanudarOracion;

function copiarOracion() {

  var el = document.getElementById("prayerContent");

  if (!el || !navigator.clipboard) return;

  navigator.clipboard.writeText(el.textContent).catch(function () {});

}



(function initCapitalariosUi() {

  function run() {

    actualizarContadorCapitalarios();

  }

  if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", run);

  } else {

    run();

  }

})();

(function initOracionesUi() {
  function run() {
    if (typeof cargarOracionesSelector === "function") {
      cargarOracionesSelector();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

