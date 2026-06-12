import UI from "./ui.js";
import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js";
import { ajustarAnchoColumna } from "./eventos_celdas.js";
import { matrizCambioBase, matrizTransformacion } from "./calculos.js";
import { multiplicarMatrices } from "./operaciones.js";

const MATRICES = {
    B1: { id: "tfB1", label: "B₁", rows: 2, cols: 2, locked: false, isIdentity: false },
    B2: { id: "tfB2", label: "B₂", rows: 2, cols: 2, locked: false, isIdentity: false },
    B3: { id: "tfB3", label: "B₃", rows: 2, cols: 2, locked: false, isIdentity: false },
    B4: { id: "tfB4", label: "B₄", rows: 2, cols: 2, locked: false, isIdentity: false },
};

let activeV = null;
let activeW = null;
let _article = null;

// ─── IDs de las tablas editables ─────────────────────────────────────────────
const TABLE_IDS = ["tfB1", "tfB2", "tfB3", "tfB4"];

// ─── Obtener tabla permitida que contiene el elemento ────────────────────────
function _tfGetTable(el) {
    const table = el.closest("table");
    if (!table) return null;
    if (!TABLE_IDS.includes(table.id)) return null;
    return table;
}

// ─── ¿El elemento pertenece a alguna celda TF? ───────────────────────────────
function _tfEsCeldaTF(el) {
    if (!el) return false;
    return !!(el.closest("table") && TABLE_IDS.includes(el.closest("table").id));
}

// ─── Mover foco a celda (r, c) de una tabla ──────────────────────────────────
// Usa setTimeout(0) para que cualquier evento de foco pendiente del tick
// actual (focusout del input anterior) se procese ANTES de abrir el nuevo input.
function _tfMoveTo(table, r, c) {
    if (r < 0 || r >= table.rows.length) return;
    const row = table.rows[r];
    if (!row || c < 0 || c >= row.cells.length) return;
    const cell = row.cells[c];
    setTimeout(() => {
        const span  = cell.querySelector(".cell-span");
        const input = cell.querySelector(".cell-input");
        if (span)       { const inp = spanToInput(span); if (inp) { inp.focus(); inp.select(); } }
        else if (input) { input.focus(); input.select(); }
    }, 0);
}

// ─── Ajustar todas las columnas de una tabla ─────────────────────────────────
function _tfAjustarTabla(table) {
    if (!table) return;
    for (let j = 0; j < (table.rows[0]?.cells.length ?? 0); j++)
        ajustarAnchoColumna(table, j);
}

// ─── Revisar y eliminar filas/columnas vacías, luego reposicionar foco ───────
function _tfRevisarBorrado(table, r, c) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;
    let tr = r, tc = c;
    let filaEliminada = false;

    // 1. ¿Fila vacía? → eliminar y subir foco a misma columna
    if (table.rows.length > minRows && Auxiliares.filaVacia(table, r)) {
        Auxiliares.eliminarFila(table, r);
        filaEliminada = true;
        tr = Math.max(0, r - 1);
        tc = Math.min(c, (table.rows[tr]?.cells.length ?? 1) - 1);
    }

    // 2. ¿Columna vacía? → eliminar y retroceder columna
    if ((table.rows[0]?.cells.length ?? 0) > minCols && Auxiliares.columnaVacia(table, c)) {
        Auxiliares.eliminarColumna(table, c);
        tc = Math.max(0, c - 1);
    }

    // 3. Si no se eliminó nada: ir a celda anterior en la misma fila
    if (!filaEliminada && tr === r && tc === c) {
        if (c > 0) { tc = c - 1; }
        else if (r > 0) { tr = r - 1; tc = (table.rows[tr]?.cells.length ?? 1) - 1; }
    }

    _tfMoveTo(table, tr, tc);
    actualizarMatricesDerivadas();
}

// ─── Handler: mousedown (clic en celda) ──────────────────────────────────────
function _tfMousedown(e) {
    const target = e.target;
    if (target.classList.contains("cell-input")) return; // ya tiene foco

    let span = null, td = null;
    if      (target.classList.contains("cell-span")) { span = target; td = target.closest("td"); }
    else if (target.closest(".cell-span"))           { span = target.closest(".cell-span"); td = span.closest("td"); }
    else if (target.tagName === "TD")                { td = target; span = td.querySelector(".cell-span"); }
    else if (target.closest("td"))                   { td = target.closest("td"); span = td?.querySelector(".cell-span"); }

    if (!td || !span) return;
    const tableEl = _tfGetTable(td);
    if (!tableEl) return;

    // Si la tabla está bloqueada (identidad ON), no permitir edición
    const tableKey = Object.keys(MATRICES).find(k => MATRICES[k].id === tableEl.id);
    if (tableKey && MATRICES[tableKey].locked) return;

    e.preventDefault();
    const inp = spanToInput(span);
    if (inp) { inp.focus(); inp.select(); }
}

// ─── Handler: focusout ───────────────────────────────────────────────────────
function _tfFocusout(e) {
    const input = e.target;
    if (!input.classList.contains("cell-input")) return;
    if (!input.isConnected) return;
    if (!_tfGetTable(input)) return;

    // Si el foco va a otra celda TF, no hacer nada:
    // _tfMoveTo se encargará en su setTimeout(0)
    const next = e.relatedTarget;
    if (_tfEsCeldaTF(next)) return;

    // El foco salió fuera de las tablas TF → convertir a span
    const c = input.closest("td")?.cellIndex ?? 0;
    const table = _tfGetTable(input);
    inputToSpan(input);
    if (table) ajustarAnchoColumna(table, c);
    actualizarMatricesDerivadas();
}

// ─── Handler: input (filtrar caracteres) ─────────────────────────────────────
function _tfInput(e) {
    const input = e.target;
    if (!input.classList.contains("cell-input")) return;
    if (!_tfGetTable(input)) return;

    let v = input.value;
    v = v.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    v = v.replace(/[^0-9\-\/\.]/g, "");
    const slashes = (v.match(/\//g) || []).length;
    if (slashes > 1) {
        const f = v.indexOf("/");
        v = v.slice(0, f + 1) + v.slice(f + 1).replace(/\//g, "");
    }
    if (/^\.\d/.test(v))  v = "0" + v;
    if (/^-\.\d/.test(v)) v = "-0" + v.slice(1);
    if (input.value !== v) input.value = v;
    input.style.width = (v.length + 1) + "ch";
}

// ─── Handler: keydown ────────────────────────────────────────────────────────
function _tfKeydown(e) {
    const target  = e.target;
    const isInput = target.classList.contains("cell-input");
    const isSpan  = target.classList.contains("cell-span");
    if (!isInput && !isSpan) return;

    const table = _tfGetTable(target);
    if (!table) return;

    // Si la tabla está bloqueada (identidad ON), ignorar todas las teclas de edición
    const tableKey = Object.keys(MATRICES).find(k => MATRICES[k].id === table.id);
    if (tableKey && MATRICES[tableKey].locked) return;

    const td  = target.closest("td");
    const row = td?.parentElement;
    if (!td || !row) return;
    const r = row.rowIndex;
    const c = td.cellIndex;

    // ── Flechas: navegar dentro de la tabla, sin salir ───────────────────
    if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        const maxC = (table.rows[r]?.cells.length ?? 1) - 1;
        if (c < maxC) _tfMoveTo(table, r, c + 1);
        else          _tfMoveTo(table, r, c);   // borde: quedarse
        return;
    }
    if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (c > 0) _tfMoveTo(table, r, c - 1);
        else       _tfMoveTo(table, r, 0);       // borde: quedarse
        return;
    }
    if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (r > 0) _tfMoveTo(table, r - 1, Math.min(c, (table.rows[r-1]?.cells.length ?? 1) - 1));
        else       _tfMoveTo(table, 0, c);       // borde: quedarse
        return;
    }
    if (e.key === "ArrowDown") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (r < table.rows.length - 1) _tfMoveTo(table, r + 1, Math.min(c, (table.rows[r+1]?.cells.length ?? 1) - 1));
        else                            _tfMoveTo(table, r, c); // borde: quedarse
        return;
    }

    // ── Tab ───────────────────────────────────────────────────────────────
    if (e.key === "Tab") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        const maxC = (table.rows[r]?.cells.length ?? 1) - 1;
        if (c < maxC)                       _tfMoveTo(table, r, c + 1);
        else if (r < table.rows.length - 1) _tfMoveTo(table, r + 1, 0);
        else                                _tfMoveTo(table, r, c);
        return;
    }

    // ── Escape ────────────────────────────────────────────────────────────
    if (e.key === "Escape") {
        if (isInput) { inputToSpan(target); target.blur(); }
        return;
    }

    // ── Espacio → nueva columna a la derecha, foco allí ──────────────────
    if (e.key === " ") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        Auxiliares.insertarColumna(table, c + 1);
        _tfAjustarTabla(table);
        setTimeout(() => _tfMoveTo(table, r, c + 1), 10);
        return;
    }

    // ── Enter → nueva fila abajo, foco en misma columna ──────────────────
    if (e.key === "Enter") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        Auxiliares.insertarFila(table, r + 1);
        _tfAjustarTabla(table);
        setTimeout(() => _tfMoveTo(table, r + 1, c), 10);
        return;
    }

    // ── Backspace ─────────────────────────────────────────────────────────
    if (e.key === "Backspace" || e.key === "Delete") {
        if (isInput) {
            // Si quedaría vacío (ya vacío, o último carácter seleccionado o value.length===1):
            const quedaVacio = target.value === "" ||
                (target.value.length === 1 && target.selectionStart === 1) ||
                (target.selectionStart !== target.selectionEnd); // hay selección → borrará todo

            if (!quedaVacio) return; // todavía quedan caracteres, dejar al browser

            e.preventDefault();
            target.value = "";
            // No hacemos replaceWith aquí. _tfFocusout convierte a span
            // cuando el foco se mueva. _tfMoveTo usa setTimeout(0), por lo
            // que el focusout del input vacío ocurre antes de que se abra
            // el nuevo input — flujo limpio sin bandera.
            _tfRevisarBorrado(table, r, c);
        } else if (isSpan) {
            e.preventDefault();
            target.setAttribute("data-value", "");
            target.textContent = "";
            target.innerHTML = "";
            _tfRevisarBorrado(table, r, c);
        }
        return;
    }

    // ── Tecla imprimible sobre span → abrir input con esa tecla ──────────
    if (isSpan && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(e.key)) return;
        e.preventDefault();
        const inp = spanToInput(target);
        if (inp) { inp.value = e.key; inp.setSelectionRange(1, 1); }
        return;
    }
}

// ─── Registrar / desregistrar eventos ────────────────────────────────────────
let _tfHandlers = {};

function _tfConfigurar(article) {
    _tfDesconfigurar();
    _tfHandlers.mousedown = _tfMousedown;
    _tfHandlers.keydown   = _tfKeydown;
    _tfHandlers.input     = (e) => { _tfInput(e); actualizarMatricesDerivadas(); };
    _tfHandlers.focusout  = _tfFocusout;
    _tfHandlers.windowKey = (e) => {
        if (e.key === " " && (
            document.activeElement?.classList.contains("cell-input") ||
            document.activeElement?.classList.contains("cell-span")
        )) e.preventDefault();
    };
    article.addEventListener("mousedown",  _tfHandlers.mousedown);
    article.addEventListener("keydown",    _tfHandlers.keydown);
    article.addEventListener("input",      _tfHandlers.input);
    article.addEventListener("focusout",   _tfHandlers.focusout);
    window.addEventListener("keydown",     _tfHandlers.windowKey);
}

function _tfDesconfigurar() {
    if (_article) {
        _article.removeEventListener("mousedown",  _tfHandlers.mousedown);
        _article.removeEventListener("keydown",    _tfHandlers.keydown);
        _article.removeEventListener("input",      _tfHandlers.input);
        _article.removeEventListener("focusout",   _tfHandlers.focusout);
    }
    if (_tfHandlers.windowKey) window.removeEventListener("keydown", _tfHandlers.windowKey);
    _tfHandlers  = {};
}

// ─── Tablas ───────────────────────────────────────────────────────────────────

function crearTablaEditable(key, rows, cols) {
    const cfg = MATRICES[key];
    const table = UI.createTable(cfg.id);
    table.dataset.minRows = "1";
    table.dataset.minCols = "1";
    table.classList.add("tf-input-table");

    for (let i = 0; i < rows; i++) {
        const tr = UI.createRow();
        for (let j = 0; j < cols; j++) {
            const td = UI.createTd(`${cfg.id}_cell${i}${j}`);
            td.appendChild(crearSpanCelda("", i, j));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table;
}

function crearTablaResultado(matriz, id) {
    const table = UI.createTable(id);
    table.classList.add("tf-matrix-table", "tf-result-table");
    table.style.borderSpacing = "18px 12px";
    matriz.forEach(fila => {
        const tr = UI.createRow();
        fila.forEach(v => {
            const td = UI.createTd();
            td.style.cssText = "padding:12px 18px;text-align:center;font-size:1.3rem;";
            const val = Auxiliares.fraccionToString(v);
            if (val.includes("/")) {
                const [n, d] = val.split("/");
                td.innerHTML = `<span class="frac"><span class="top">${n}</span><span class="bottom">${d}</span></span>`;
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    return table;
}

function leerMatrizEditable(tableId) {
    const table = document.getElementById(tableId);
    if (!table || !table.rows.length) return null;
    try {
        const raw = Array.from(table.rows).map(row =>
            Array.from(row.cells).map(cell => {
                const input = cell.querySelector(".cell-input");
                const span  = cell.querySelector(".cell-span");
                const valor = input
                    ? input.value.trim()
                    : (span?.getAttribute("data-value") || "").trim();
                // Tratar celdas vacías como 0 para permitir cálculo en tiempo real
                if (valor === "") return { num: 0, den: 1 };
                const f = Auxiliares.parsearFraccion(valor);
                const [num, den] = Auxiliares.simplificar(f.num, f.den);
                return { num, den };
            })
        );
        return raw;
    } catch {
        return null;
    }
}

// ─── Verificar si una matriz tiene todas sus celdas llenas (sin vacíos) ─────
function matrizCompletamenteLlena(matrizRaw) {
    if (!matrizRaw || matrizRaw.length === 0) return false;
    for (let i = 0; i < matrizRaw.length; i++) {
        for (let j = 0; j < matrizRaw[i].length; j++) {
            const celda = matrizRaw[i][j];
            // Si es un objeto con num/den, verificar que no sea undefined/null
            if (!celda || celda.num === undefined || celda.den === undefined) return false;
            // También verificar si el valor original estaba vacío (lo marcamos como null)
            if (celda.isEmpty === true) return false;
        }
    }
    return true;
}

// ─── Leer matriz editable con detección de celdas vacías ─────────────────────
function leerMatrizEditableConVacios(tableId) {
    const table = document.getElementById(tableId);
    if (!table || !table.rows.length) return null;
    try {
        const raw = Array.from(table.rows).map(row =>
            Array.from(row.cells).map(cell => {
                const input = cell.querySelector(".cell-input");
                const span  = cell.querySelector(".cell-span");
                const valor = input
                    ? input.value.trim()
                    : (span?.getAttribute("data-value") || "").trim();
                
                // Detectar celda vacía
                if (valor === "") {
                    return { num: 0, den: 1, isEmpty: true };
                }
                const f = Auxiliares.parsearFraccion(valor);
                const [num, den] = Auxiliares.simplificar(f.num, f.den);
                return { num, den, isEmpty: false };
            })
        );
        return raw;
    } catch {
        return null;
    }
}

function limpiarMatriz(m) {
    return m.map(fila => fila.map(({ num, den }) => ({ num, den })));
}
function esMatrizCuadrada(m) {
    return m && m.length > 0 && m.every(fila => fila.length === m.length);
}
function mismasDimensiones(a, b) {
    return a && b && a.length === b.length && a[0].length === b[0].length;
}

function ponerIdentidad(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const n = table.rows.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < table.rows[i].cells.length; j++) {
            const cell = table.rows[i].cells[j];
            const val = i === j ? "1" : "0";
            const span  = cell.querySelector(".cell-span");
            const input = cell.querySelector(".cell-input");
            if (input) { input.value = val; inputToSpan(input); }
            if (span)  { span.setAttribute("data-value", val); span.textContent = val; }
        }
    }
    table.querySelectorAll(".cell-span, .cell-input").forEach(el => {
        el.style.pointerEvents = "none";
        el.style.opacity = "0.6";
    });
}

function desbloquearTabla(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll(".cell-span, .cell-input").forEach(el => {
        el.style.pointerEvents = "";
        el.style.opacity = "";
    });
}

function _actualizarVisualToggle(key, isOn) {
    const wrapper = document.querySelector(`#block_${key} .canonical-switch-wrapper`);
    if (!wrapper) return;
    wrapper.classList.toggle("is-active", isOn);
}

function toggleIdentidad(key) {
    const grupo    = (key === "B1" || key === "B2") ? "V" : "W";
    const pareja   = grupo === "V" ? (key === "B1" ? "B2" : "B1") : (key === "B3" ? "B4" : "B3");
    const activeRef = grupo === "V" ? activeV : activeW;

    // Obtener el estado actual del checkbox
    const input = document.getElementById(`tfCanonica_${key}`);
    const isNowChecked = input?.checked ?? false;

    if (isNowChecked) {
        // Se activó el switch actual → desactivar la pareja si estaba encendida
        if (activeRef !== null && activeRef !== key) {
            MATRICES[activeRef].isIdentity = false;
            MATRICES[activeRef].locked = false;
            desbloquearTabla(MATRICES[activeRef].id);
            _actualizarVisualToggle(activeRef, false);
            
            // Desmarcar el checkbox de la pareja
            const pairingInput = document.getElementById(`tfCanonica_${activeRef}`);
            if (pairingInput) {
                pairingInput.checked = false;
                pairingInput.closest(".canonical-switch-wrapper")?.classList.remove("is-active");
            }
        }

        // Encender el actual: poner identidad y bloquear
        MATRICES[key].isIdentity = true;
        MATRICES[key].locked = true;
        ponerIdentidad(MATRICES[key].id);
        _actualizarVisualToggle(key, true);
        if (grupo === "V") activeV = key; else activeW = key;
    } else {
        // Se desactivó el switch → desbloquear
        MATRICES[key].isIdentity = false;
        MATRICES[key].locked = false;
        desbloquearTabla(MATRICES[key].id);
        _actualizarVisualToggle(key, false);
        if (grupo === "V") activeV = null; else activeW = null;
    }

    actualizarMatricesDerivadas();
}

function actualizarMatricesDerivadas() {
    // Usar la nueva función que detecta vacíos
    const rawB1 = leerMatrizEditableConVacios(MATRICES.B1.id);
    const rawB2 = leerMatrizEditableConVacios(MATRICES.B2.id);
    const rawB3 = leerMatrizEditableConVacios(MATRICES.B3.id);
    const rawB4 = leerMatrizEditableConVacios(MATRICES.B4.id);

    // Verificar que todas las celdas estén llenas para cada par
    const b1Completa = matrizCompletamenteLlena(rawB1);
    const b2Completa = matrizCompletamenteLlena(rawB2);
    const b3Completa = matrizCompletamenteLlena(rawB3);
    const b4Completa = matrizCompletamenteLlena(rawB4);

    const B1 = rawB1 && b1Completa ? limpiarMatriz(rawB1) : null;
    const B2 = rawB2 && b2Completa ? limpiarMatriz(rawB2) : null;
    const B3 = rawB3 && b3Completa ? limpiarMatriz(rawB3) : null;
    const B4 = rawB4 && b4Completa ? limpiarMatriz(rawB4) : null;

    let P = null;
    // P = matriz cambio de B1 → B2 (solo si ambas completas y mismas dimensiones)
    if (B1 && B2 && esMatrizCuadrada(B1) && mismasDimensiones(B1, B2))
        try { P = matrizCambioBase(B1, B2); } catch { P = null; }

    let Q = null;
    // Q = matriz cambio de B3 → B4 (solo si ambas completas y mismas dimensiones)
    if (B3 && B4 && esMatrizCuadrada(B3) && mismasDimensiones(B3, B4))
        try { Q = matrizCambioBase(B3, B4); } catch { Q = null; }

    let A = null;
    // A = matriz transformación de B2 → B3 (solo si ambas completas y mismas dimensiones)
    if (B2 && B3 && esMatrizCuadrada(B2) && esMatrizCuadrada(B3) && B2.length === B3.length) {
        // También verificar que ambas matrices estén completas
        if (b2Completa && b3Completa) {
            try {
                const n = B2.length;
                const identidad = Array.from({ length: n }, (_, i) =>
                    Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
                );
                A = matrizTransformacion(identidad, B2, B3);
            } catch { A = null; }
        }
    }

    let C = null;
    // C = Q·A·P (solo si todas existen)
    if (P && A && Q) {
        try { 
            const AP = multiplicarMatrices(A, P); 
            C = multiplicarMatrices(Q, AP); 
        } catch { C = null; }
    }

    renderizarResultados(P, Q, A, C);
}

function renderizarResultados(P, Q, A, C) {
    renderMatrizDerivada("zone_P", "P", "B₁→B₂", P);
    renderMatrizDerivada("zone_Q", "Q", "B₃→B₄", Q);
    renderMatrizDerivada("zone_A", "A", "B₂→B₃", A);
    renderMatrizDerivada("zone_C", "C = Q·A·P", "", C);
}

function renderMatrizDerivada(zoneId, nombre, subindice, matriz) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.innerHTML = "";
    const row = document.createElement("div");
    row.className = "tf-derived-row";
    const lbl = document.createElement("div");
    lbl.className = "tf-derived-label";
    lbl.innerHTML = subindice ? `${nombre}<sub>${subindice}</sub> =` : `${nombre} =`;
    row.appendChild(lbl);
    if (!matriz) {
        const placeholder = document.createElement("div");
        placeholder.className = "tf-derived-placeholder";
        placeholder.textContent = "Esperando bases compatibles…";
        row.appendChild(placeholder);
    } else {
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        matrixContainer.appendChild(crearTablaResultado(matriz, `result_${zoneId}`));
        row.appendChild(matrixContainer);
    }
    zone.appendChild(row);
}

function crearBloqueMatrizEditable(key, simbolo) {
    const cfg = MATRICES[key];

    // ── Wrapper externo: borde redondeado oscuro ──────────────────────────
    const wrapper = document.createElement("div");
    wrapper.className = "tf-matrix-block";
    wrapper.id = `block_${key}`;
    wrapper.style.cssText = `
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.75rem 1rem 1rem 1rem;
        border: 2px solid var(--primary);
        border-radius: 16px;
        background: var(--bg-surface, #1a1a2e);
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        min-width: fit-content;
    `.replace(/\s+/g, ' ').trim();

    // ── Fila superior: switch canónico con símbolo 𝔼 ──────────────────────
    const topRow = document.createElement("div");
    topRow.style.cssText = "display:flex;justify-content:flex-end;align-items:center;gap:0.6rem;";

    const switchLabel = document.createElement("label");
    switchLabel.className = "canonical-switch-wrapper tf-canonical-switch";
    switchLabel.setAttribute("for", `tfCanonica_${key}`);
    switchLabel.setAttribute("title", `Usar base canónica para ${cfg.label}`);

    const symbolSpan = document.createElement("span");
    symbolSpan.className = "canonical-switch-symbol";
    symbolSpan.textContent = "𝔼";
    symbolSpan.setAttribute("aria-hidden", "true");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `tfCanonica_${key}`;
    input.className = "canonical-switch-input";
    input.setAttribute("aria-label", `Usar base canónica para ${cfg.label}`);
    input.addEventListener("change", () => {
        toggleIdentidad(key);
    });

    const visual = document.createElement("span");
    visual.className = "canonical-switch-visual";
    visual.setAttribute("aria-hidden", "true");

    const knob = document.createElement("span");
    knob.className = "canonical-switch-knob";
    visual.appendChild(knob);

    switchLabel.append(symbolSpan, input, visual);
    topRow.appendChild(switchLabel);
    wrapper.appendChild(topRow);

    // ── Fila central: label + tabla con bordes ────────────────────────────
    const mainRow = document.createElement("div");
    mainRow.style.cssText = "display:flex;align-items:center;gap:0.75rem;";

    // Label Bₙ [símbolo] =
    const label = document.createElement("div");
    label.className = "tf-matrix-label";
    label.innerHTML = `<strong>${cfg.label}</strong> <span style="font-size:0.75em;color:var(--text-muted,#888)">[${simbolo}]</span> =`;
    label.style.cssText = "white-space:nowrap;font-size:1.1rem;color:var(--primary,#e05);";

    // Contenedor para tabla con bordes CSS
    const matrixContainer = document.createElement("div");
    matrixContainer.className = "tf-matrix-container";
    matrixContainer.style.cssText = "position:relative;display:inline-flex;align-items:center;justify-content:center;padding:0.5rem 1rem;";

    // Tabla editable
    const table = crearTablaEditable(key, cfg.rows, cfg.cols);

    matrixContainer.appendChild(table);

    mainRow.appendChild(label);
    mainRow.appendChild(matrixContainer);
    wrapper.appendChild(mainRow);

    return wrapper;
}

export function inicializarTransformaciones(article) {
    _article = article;
    while (article.firstChild) article.removeChild(article.firstChild);

    const section = UI.createSection("tfSection", "TRANSFORMACIONES LINEALES");
    section.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2rem;padding:2rem;min-width:max-content;width:100%;box-sizing:border-box;";

    const formula = document.createElement("p");
    formula.className = "tf-formula";
    formula.innerHTML = "T: ℝ<sup>n</sup> → ℝ<sup>m</sup>";
    section.appendChild(formula);

    const threeColumns = document.createElement("div");
    threeColumns.style.cssText = "display:flex;align-items:stretch;justify-content:center;gap:2rem;flex-wrap:nowrap;overflow-x:auto;width:100%;";

    // Columna 1: Espacio V
    const col1 = document.createElement("div");
    col1.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    const espacioV = document.createElement("div");
    espacioV.className = "tf-espacio";
    const lblV = document.createElement("div");
    lblV.className = "tf-espacio-label";
    lblV.textContent = "Espacio Vectorial V";
    const pArrow = document.createElement("div");
    pArrow.className = "tf-arrow-vertical";
    pArrow.innerHTML = `<span class="arrow-symbol">↑</span><span class="arrow-label">P<sub>B₁→B₂</sub></span>`;
    espacioV.appendChild(lblV);
    espacioV.appendChild(crearBloqueMatrizEditable("B2", "β↓"));
    espacioV.appendChild(pArrow);
    espacioV.appendChild(crearBloqueMatrizEditable("B1", "α↓"));
    col1.appendChild(espacioV);

    // Columna 2: A y C
    const col2 = document.createElement("div");
    col2.className = "tf-center-column";
    const arrowToA = document.createElement("div");
    arrowToA.className = "tf-long-arrow-horizontal";
    arrowToA.textContent = "→";
    const zoneA = document.createElement("div");
    zoneA.id = "zone_A";
    zoneA.style.display = "flex";
    zoneA.style.justifyContent = "center";
    const spacer = document.createElement("div");
    spacer.style.height = "2rem";
    const arrowToC = document.createElement("div");
    arrowToC.className = "tf-long-arrow-horizontal";
    arrowToC.textContent = "→";
    const zoneC = document.createElement("div");
    zoneC.id = "zone_C";
    zoneC.style.cssText = "display:flex;justify-content:center;";
    col2.appendChild(arrowToA);
    col2.appendChild(zoneA);
    col2.appendChild(spacer);
    col2.appendChild(arrowToC);
    col2.appendChild(zoneC);

    // Columna 3: Espacio W
    const col3 = document.createElement("div");
    col3.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    const espacioW = document.createElement("div");
    espacioW.className = "tf-espacio";
    const lblW = document.createElement("div");
    lblW.className = "tf-espacio-label";
    lblW.textContent = "Espacio Vectorial W";
    const qArrow = document.createElement("div");
    qArrow.className = "tf-arrow-vertical";
    qArrow.innerHTML = `<span class="arrow-label">Q<sub>B₃→B₄</sub></span><span class="arrow-symbol">↓</span>`;
    espacioW.appendChild(lblW);
    espacioW.appendChild(crearBloqueMatrizEditable("B3", "γ↓"));
    espacioW.appendChild(qArrow);
    espacioW.appendChild(crearBloqueMatrizEditable("B4", "δ↓"));
    col3.appendChild(espacioW);

    threeColumns.appendChild(col1);
    threeColumns.appendChild(col2);
    threeColumns.appendChild(col3);
    section.appendChild(threeColumns);

    // Fila inferior: P y Q
    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = "display:flex;align-items:center;justify-content:center;gap:4rem;flex-wrap:wrap;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);";
    const zoneP = document.createElement("div");
    zoneP.id = "zone_P";
    const zoneQ2 = document.createElement("div");
    zoneQ2.id = "zone_Q";
    bottomRow.appendChild(zoneP);
    bottomRow.appendChild(zoneQ2);
    section.appendChild(bottomRow);

    article.appendChild(section);

    _tfConfigurar(article);
    actualizarMatricesDerivadas();
}

export function limpiarTransformaciones() {
    activeV = null;
    activeW = null;
    Object.values(MATRICES).forEach(m => { m.locked = false; m.isIdentity = false; });
    _tfDesconfigurar();
    _article = null;
}