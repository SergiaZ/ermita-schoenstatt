(function () {
  /** Mismo identificador que en script.js (nombre de la colección en el servicio). */
  var TABLE =
    typeof SUPABASE_CAPITALARIOS_TABLE !== "undefined"
      ? SUPABASE_CAPITALARIOS_TABLE
      : "capitalarios";

  var MES_NOMBRES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  /**
   * Periodo del 19 del mes dado al 18 del mes siguiente (fechas locales).
   * endExclusive = primer instante *después* del periodo (19 del mes siguiente a las 00:00),
   * para filtrar con created_at >= start y created_at < endExclusive (sin depender de .999 ms).
   */
  function periodFromStartMonth(year, month0) {
    var start = new Date(year, month0, 19, 0, 0, 0, 0);
    var endInclusive = new Date(year, month0 + 1, 18, 23, 59, 59, 999);
    var endExclusive = new Date(year, month0 + 1, 19, 0, 0, 0, 0);
    var startLabel = start.toLocaleDateString("es-EC", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    var endLabel = endInclusive.toLocaleDateString("es-EC", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    var label = "Del " + startLabel + " al " + endLabel;
    return {
      start: start,
      endInclusive: endInclusive,
      endExclusive: endExclusive,
      label: label,
    };
  }

  function startOfLocalDay(yyyyMmDd) {
    return new Date(yyyyMmDd + "T00:00:00");
  }

  function endOfLocalDay(yyyyMmDd) {
    return new Date(yyyyMmDd + "T23:59:59.999");
  }

  function setOracionesCountStatus(msg, isError) {
    var el = document.getElementById("oracionesCountStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "var(--color-gold)" : "var(--color-text-muted)";
  }

  async function cargarConteoOracionesEnPeriodo(isoStart, isoEndInclusive) {
    var listEl = document.getElementById("oracionesCountList");
    var client = typeof getSupabase === "function" ? getSupabase() : null;
    if (!listEl) return;

    listEl.innerHTML = "";

    if (!client) {
      setOracionesCountStatus("Sin conexión para calcular el conteo.", true);
      return;
    }

    setOracionesCountStatus("Calculando conteo por oración…", false);

    var oracionesRes = await client
      .from(SUPABASE_ORACIONES_TABLE || "oraciones")
      .select("id, nombre")
      .order("nombre", { ascending: true });

    if (oracionesRes.error) {
      setOracionesCountStatus(
        "No se pudieron cargar las oraciones: " +
          (oracionesRes.error.message || "inténtalo más tarde."),
        true
      );
      return;
    }

    var capitalesRes = await client
      .from(TABLE)
      .select("oracionId")
      .gte("created_at", isoStart)
      .lte("created_at", isoEndInclusive);

    if (capitalesRes.error) {
      setOracionesCountStatus(
        "No se pudo calcular el conteo: " +
          (capitalesRes.error.message || "revisa el campo oracionId."),
        true
      );
      return;
    }

    var conteoPorId = {};
    var rowsCapitales = capitalesRes.data || [];
    for (var i = 0; i < rowsCapitales.length; i++) {
      var id = rowsCapitales[i] && rowsCapitales[i].oracionId;
      if (!id) continue;
      conteoPorId[id] = (conteoPorId[id] || 0) + 1;
    }

    var rowsOraciones = oracionesRes.data || [];
    if (rowsOraciones.length === 0) {
      setOracionesCountStatus("No hay oraciones registradas.", false);
      return;
    }

    for (var j = 0; j < rowsOraciones.length; j++) {
      var row = rowsOraciones[j];
      var item = document.createElement("li");
      item.className = "oraciones-count-item";

      var nameEl = document.createElement("span");
      nameEl.className = "oraciones-count-name";
      nameEl.textContent = row.nombre ? String(row.nombre) : "Sin nombre";

      var valueEl = document.createElement("span");
      valueEl.className = "oraciones-count-value";
      valueEl.textContent = String(conteoPorId[row.id] || 0);

      item.appendChild(nameEl);
      item.appendChild(valueEl);
      listEl.appendChild(item);
    }

    setOracionesCountStatus("", false);
  }

  /** Mes (0-11) y año del periodo que contiene la fecha (regla 19 → 18). */
  function periodStartYearMonthForDate(d) {
    var y = d.getFullYear();
    var m = d.getMonth();
    var day = d.getDate();
    if (day >= 19) {
      return { year: y, month0: m };
    }
    var prev = new Date(y, m - 1, 1);
    return { year: prev.getFullYear(), month0: prev.getMonth() };
  }

  function setStatus(msg, isError) {
    var el = document.getElementById("capitalariosStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "var(--color-gold)" : "var(--color-text-muted)";
  }

  function populateYearSelect(selectEl, centerYear) {
    if (!selectEl) return;
    var minY = centerYear - 8;
    var maxY = centerYear + 3;
    selectEl.innerHTML = "";
    for (var y = minY; y <= maxY; y++) {
      var opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      selectEl.appendChild(opt);
    }
  }

  async function loadCapitalariosForPeriod() {
    var monthSel = document.getElementById("periodMonth");
    var yearSel = document.getElementById("periodYear");
    var totalEl = document.getElementById("capitalariosTotal");
    var rangeEl = document.getElementById("periodRangeLabel");
    var client =
      typeof getSupabase === "function" ? getSupabase() : null;

    if (!monthSel || !yearSel) return;

    var year = parseInt(yearSel.value, 10);
    var month0 = parseInt(monthSel.value, 10);
    if (isNaN(year) || isNaN(month0)) return;

    var period = periodFromStartMonth(year, month0);
    if (rangeEl) rangeEl.textContent = period.label;

    if (!client) {
      setStatus(
        "No se pudo conectar. Revisa tu red y recarga la página.",
        true
      );
      if (totalEl) totalEl.textContent = "—";
      return;
    }

    setStatus("Cargando total…", false);
    if (totalEl) totalEl.textContent = "…";

    var isoStart = period.start.toISOString();
    var isoEndInclusive = period.endInclusive.toISOString();

    const { data: idsRows, count, error } = await client
      .from(TABLE)
      .select("id", { count: "exact" })
      .gte("created_at", isoStart)
      .lte("created_at", isoEndInclusive);

    if (error) {
      console.error(error);
      setStatus(
        "No se pudo cargar la información: " + (error.message || "inténtalo más tarde"),
        true
      );
      if (totalEl) totalEl.textContent = "—";
      return;
    }

    var n =
      count != null && count !== undefined
        ? count
        : idsRows
          ? idsRows.length
          : 0;

    if (totalEl) totalEl.textContent = String(n);

    await cargarConteoOracionesEnPeriodo(isoStart, isoEndInclusive);

    if (n === 0) {
      const { count: totalEnTabla, error: errTotal } = await client
        .from(TABLE)
        .select("id", { count: "exact", head: true });
      var totalTabla =
        !errTotal && totalEnTabla != null ? totalEnTabla : null;
      if (totalTabla !== null && totalTabla > 0) {
        setStatus(
          "Hay " +
            totalTabla +
            " capitalario(s) en total, pero ninguno corresponde a este periodo 19→18. Prueba otro mes/año o revisa la fecha en que se entregó cada uno.",
          false
        );
      } else if (totalTabla === 0) {
        setStatus(
          "No hay capitalarios guardados o no se pueden mostrar. Si acabas de enviar uno desde la Ermita, espera un momento y recarga.",
          false
        );
      } else {
        setStatus(
          "Ningún capitalario en este periodo. Comprueba el mes del 19 elegido.",
          false
        );
      }
    } else {
      setStatus("", false);
    }
  }

  async function eliminarCapitalariosPorRango() {
    var fromInput = document.getElementById("deleteDateFrom");
    var toInput = document.getElementById("deleteDateTo");
    var btn = document.getElementById("btnEliminarPorFechas");
    var statusEl = document.getElementById("deleteStatus");
    var client =
      typeof getSupabase === "function" ? getSupabase() : null;

    if (!fromInput || !toInput) return;

    if (!client) {
      if (statusEl) {
        statusEl.textContent =
          "Sin conexión. Revisa tu red y recarga la página.";
      }
      return;
    }

    var fromStr = fromInput.value;
    var toStr = toInput.value;
    if (!fromStr || !toStr) {
      window.alert("Indica fecha desde y fecha hasta.");
      return;
    }

    var t0 = startOfLocalDay(fromStr).getTime();
    var t1 = endOfLocalDay(toStr).getTime();
    if (t0 > t1) {
      window.alert("La fecha “desde” no puede ser posterior a “hasta”.");
      return;
    }

    if (
      !window.confirm(
        "Se eliminarán los capitalarios entregados entre el " +
          fromStr +
          " y el " +
          toStr +
          " (según la hora de tu dispositivo). ¿Continuar?"
      )
    ) {
      return;
    }

    var confirmText = window.prompt(
      "Confirmación: escribe la palabra ELIMINAR para borrar."
    );
    if (!confirmText || confirmText.trim().toUpperCase() !== "ELIMINAR") {
      if (statusEl) statusEl.textContent = "Operación cancelada.";
      return;
    }

    if (btn) {
      btn.disabled = true;
    }
    if (statusEl) statusEl.textContent = "Eliminando…";

    var isoStart = startOfLocalDay(fromStr).toISOString();
    var isoEnd = endOfLocalDay(toStr).toISOString();

    var deleteResult = await client
      .from(TABLE)
      .delete()
      .gte("created_at", isoStart)
      .lte("created_at", isoEnd)
      .select("id");

    if (btn) {
      btn.disabled = false;
    }

    if (deleteResult.error) {
      console.error(deleteResult.error);
      if (statusEl) {
        statusEl.textContent =
          "Error: " +
          (deleteResult.error.message || "no se pudo eliminar") +
          ". Verifica permisos para borrar en Supabase.";
      }
      return;
    }

    var n = deleteResult.data ? deleteResult.data.length : 0;
    if (statusEl) {
      statusEl.textContent =
        n === 0
          ? "No se eliminó ningún capitalario en ese rango."
          : n === 1
            ? "Se eliminó 1 capitalario."
            : "Se eliminaron " + n + " capitalarios.";
    }

    await loadCapitalariosForPeriod();
  }

  function init() {
    var monthSel = document.getElementById("periodMonth");
    var yearSel = document.getElementById("periodYear");
    var btnDelete = document.getElementById("btnEliminarPorFechas");

    if (!monthSel || !yearSel) return;

    var now = periodStartYearMonthForDate(new Date());
    populateYearSelect(yearSel, now.year);
    yearSel.value = String(now.year);

    MES_NOMBRES.forEach(function (nombre, idx) {
      var opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = nombre;
      monthSel.appendChild(opt);
    });
    monthSel.value = String(now.month0);

    monthSel.addEventListener("change", loadCapitalariosForPeriod);
    yearSel.addEventListener("change", loadCapitalariosForPeriod);

    if (btnDelete)
      btnDelete.addEventListener("click", function () {
        eliminarCapitalariosPorRango();
      });

    var deleteFrom = document.getElementById("deleteDateFrom");
    var deleteTo = document.getElementById("deleteDateTo");
    if (deleteFrom && deleteTo) {
      var todayIso = new Date().toISOString().slice(0, 10);
      if (!deleteFrom.value) deleteFrom.value = todayIso;
      if (!deleteTo.value) deleteTo.value = todayIso;
    }

    loadCapitalariosForPeriod();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
