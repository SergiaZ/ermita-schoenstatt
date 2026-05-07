(function () {
  var TABLE =
    typeof SUPABASE_ORACIONES_TABLE !== "undefined"
      ? SUPABASE_ORACIONES_TABLE
      : "oraciones";

  var oracionEnEdicionId = null;

  function setStatus(msg, isError) {
    var el = document.getElementById("oracionesAdminStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "var(--color-gold)" : "var(--color-text-muted)";
  }

  function setModoEdicionActivo(isEditing) {
    var btnGuardar = document.getElementById("btnGuardarOracion");
    var btnCancelar = document.getElementById("btnCancelarEdicionOracion");
    if (btnGuardar) {
      btnGuardar.textContent = isEditing ? "Guardar cambios" : "Guardar oración";
    }
    if (btnCancelar) {
      btnCancelar.hidden = !isEditing;
    }
  }

  function limpiarFormulario() {
    var nombreEl = document.getElementById("nuevaOracionNombre");
    var contenidoEl = document.getElementById("nuevaOracionContenido");
    if (nombreEl) nombreEl.value = "";
    if (contenidoEl) contenidoEl.value = "";
  }

  function resetearModoEdicion() {
    oracionEnEdicionId = null;
    setModoEdicionActivo(false);
  }

  async function cargarLista() {
    var ul = document.getElementById("listaOraciones");
    var emptyEl = document.getElementById("oracionesListEmpty");
    if (!ul) return;

    var client =
      typeof getSupabase === "function" ? getSupabase() : null;

    if (!client) {
      setStatus("No se pudo conectar. Revisa tu red y recarga la página.", true);
      return;
    }

    setStatus("Cargando lista…", false);

    var res = await client
      .from(TABLE)
      .select("id, nombre, contenido, created_at")
      .order("nombre", { ascending: true });

    if (res.error) {
      console.error(res.error);
      setStatus(
        "No se pudo cargar la lista: " +
          (res.error.message || "inténtalo más tarde"),
        true
      );
      return;
    }

    setStatus("", false);
    ul.innerHTML = "";

    var rows = res.data || [];
    if (emptyEl) {
      emptyEl.hidden = rows.length > 0;
    }

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var li = document.createElement("li");
      li.className = "oraciones-list-item";

      var meta = document.createElement("span");
      meta.className = "oraciones-list-meta";
      var nombre = row.nombre ? String(row.nombre) : "Sin nombre";
      meta.textContent = nombre;

      var actions = document.createElement("div");
      actions.className = "oraciones-list-actions";

      var btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "btn-oracion-edit";
      btnEditar.setAttribute("data-id", row.id);
      btnEditar.setAttribute(
        "aria-label",
        "Editar oración: " + nombre.replace(/"/g, "")
      );
      btnEditar.textContent = "Editar";

      var btnEliminar = document.createElement("button");
      btnEliminar.type = "button";
      btnEliminar.className = "btn-oracion-delete";
      btnEliminar.setAttribute("data-id", row.id);
      btnEliminar.setAttribute(
        "aria-label",
        "Eliminar oración: " + nombre.replace(/"/g, "")
      );
      btnEliminar.textContent = "Eliminar";

      actions.appendChild(btnEditar);
      actions.appendChild(btnEliminar);
      li.appendChild(meta);
      li.appendChild(actions);
      ul.appendChild(li);
    }
  }

  async function cargarOracionEnFormulario(id) {
    var client =
      typeof getSupabase === "function" ? getSupabase() : null;
    var nombreEl = document.getElementById("nuevaOracionNombre");
    var contenidoEl = document.getElementById("nuevaOracionContenido");

    if (!client || !nombreEl || !contenidoEl) return;

    setStatus("Cargando oración…", false);

    var res = await client
      .from(TABLE)
      .select("id, nombre, contenido")
      .eq("id", id)
      .maybeSingle();

    if (res.error || !res.data) {
      setStatus(
        "No se pudo cargar la oración para editar.",
        true
      );
      return;
    }

    var row = res.data;
    nombreEl.value = row.nombre ? String(row.nombre) : "";
    contenidoEl.value =
      typeof normalizarSaltosOracion === "function"
        ? normalizarSaltosOracion(row.contenido || "")
        : String(row.contenido || "");

    oracionEnEdicionId = row.id;
    setModoEdicionActivo(true);
    setStatus("Editando: " + (row.nombre || "oración"), false);
    nombreEl.focus();
  }

  async function guardarOracion() {
    var nombreEl = document.getElementById("nuevaOracionNombre");
    var contenidoEl = document.getElementById("nuevaOracionContenido");
    var btn = document.getElementById("btnGuardarOracion");

    var nombre = nombreEl ? nombreEl.value.trim() : "";
    var contenidoRaw = contenidoEl ? contenidoEl.value : "";
    var contenido =
      typeof normalizarSaltosOracion === "function"
        ? normalizarSaltosOracion(contenidoRaw)
        : String(contenidoRaw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    if (!nombre || !contenido.trim()) {
      window.alert("Indica al menos nombre y contenido de la oración.");
      return;
    }

    var client =
      typeof getSupabase === "function" ? getSupabase() : null;
    if (!client) {
      setStatus("Sin conexión. Recarga la página.", true);
      return;
    }

    if (btn) btn.disabled = true;
    setStatus(oracionEnEdicionId ? "Guardando cambios…" : "Guardando…", false);

    var res;
    if (oracionEnEdicionId) {
      res = await client
        .from(TABLE)
        .update({ nombre: nombre, contenido: contenido })
        .eq("id", oracionEnEdicionId)
        .select("id");
    } else {
      res = await client.from(TABLE).insert({
        nombre: nombre,
        contenido: contenido,
      });
    }

    if (btn) btn.disabled = false;

    if (res.error) {
      console.error(res.error);
      setStatus(
        "No se pudo guardar: " + (res.error.message || "error desconocido"),
        true
      );
      return;
    }

    if (oracionEnEdicionId) {
      var updatedRows = Array.isArray(res.data) ? res.data.length : 0;
      if (updatedRows === 0) {
        setStatus(
          "No se actualizó la oración. Revisa permisos de edición en Supabase (RLS) o vuelve a cargar la página.",
          true
        );
        return;
      }
    }

    setStatus(oracionEnEdicionId ? "Oración actualizada." : "Oración guardada.", false);
    limpiarFormulario();
    resetearModoEdicion();

    await cargarLista();

    if (typeof window.cargarOracionesSelector === "function") {
      window.cargarOracionesSelector();
    }
  }

  async function eliminarOracion(id) {
    if (!id) return;
    if (
      !window.confirm(
        "¿Eliminar esta oración? También desaparecerá del menú de la Ermita."
      )
    ) {
      return;
    }

    var client =
      typeof getSupabase === "function" ? getSupabase() : null;
    if (!client) {
      setStatus("Sin conexión.", true);
      return;
    }

    setStatus("Eliminando…", false);
    var del = await client.from(TABLE).delete().eq("id", id);

    if (del.error) {
      console.error(del.error);
      setStatus(
        "No se pudo eliminar: " + (del.error.message || ""),
        true
      );
      return;
    }

    if (oracionEnEdicionId === id) {
      limpiarFormulario();
      resetearModoEdicion();
    }

    setStatus("Oración eliminada.", false);
    await cargarLista();

    if (typeof window.cargarOracionesSelector === "function") {
      window.cargarOracionesSelector();
    }
  }

  function init() {
    var btnGuardar = document.getElementById("btnGuardarOracion");
    var btnCancelar = document.getElementById("btnCancelarEdicionOracion");
    var ul = document.getElementById("listaOraciones");
    if (!btnGuardar || !ul) return;

    setModoEdicionActivo(false);

    btnGuardar.addEventListener("click", function () {
      guardarOracion();
    });

    if (btnCancelar) {
      btnCancelar.addEventListener("click", function () {
        limpiarFormulario();
        resetearModoEdicion();
        setStatus("Edición cancelada.", false);
      });
    }

    ul.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      if (t.classList && t.classList.contains("btn-oracion-delete")) {
        var idDel = t.getAttribute("data-id");
        eliminarOracion(idDel);
        return;
      }
      if (t.classList && t.classList.contains("btn-oracion-edit")) {
        var idEdit = t.getAttribute("data-id");
        cargarOracionEnFormulario(idEdit);
      }
    });

    if (!getSupabase() && typeof tryCreateSupabaseClient === "function") {
      tryCreateSupabaseClient();
    }

    cargarLista();
  }

  if (document.getElementById("btnGuardarOracion")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
