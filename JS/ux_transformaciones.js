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

// ─── Navegación: bandera para suprimir focusout durante movimiento programático
let _tfMoving = false;

// ─── Obtener tabla permitida que contiene el elemento ────────────────────────
function _tfGetTable(el) {
    const table = el.closest("table");
    if (!table) return null;
    if (!TABLE_IDS.includes(table.id)) return null;
    return table;
}

// ─── Mover foco a celda (r, c) de una tabla ──────────────────────────────────
function _tfMoveTo(table, r, c) {
    if (r < 0 || r >= table.rows.length) return;
    const row = table.rows[r];
    if (!row || c < 0 || c >= row.cells.length) return;
    const cell = row.cells[c];
    const span  = cell.querySelector(".cell-span");
    const input = cell.querySelector(".cell-input");
    _tfMoving = true;
    if (span)       { const inp = spanToInput(span); if (inp) { inp.focus(); inp.select(); } }
    else if (input) { input.focus(); input.select(); }
    setTimeout(() => { _tfMoving = false; }, 0);
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

    setTimeout(() => {
        let tr = r, tc = c;

        // ¿Fila vacía?
        if (table.rows.length > minRows && Auxiliares.filaVacia(table, r)) {
            Auxiliares.eliminarFila(table, r);
            // foco sube a misma columna
            tr = Math.max(0, r - 1);
            tc = Math.min(c, (table.rows[tr]?.cells.length ?? 1) - 1);
        } else if ((table.rows[0]?.cells.length ?? 0) > minCols && Auxiliares.columnaVacia(table, c)) {
            // ¿Columna vacía?
            Auxiliares.eliminarColumna(table, c);
            // foco va a celda anterior en misma fila
            tr = r;
            tc = Math.max(0, c - 1);
        } else {
            // No se borró nada: ir a celda anterior en misma fila
            if (c > 0) { tr = r; tc = c - 1; }
            else if (r > 0) { tr = r - 1; tc = (table.rows[r-1]?.cells.length ?? 1) - 1; }
        }

        _tfMoveTo(table, tr, tc);
        actualizarMatricesDerivadas();
    }, 0);
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
    if (!_tfGetTable(td)) return;

    e.preventDefault();
    // Cerrar otros inputs abiertos en las tablas TF
    _article?.querySelectorAll(".cell-input").forEach(inp => {
        if (inp.closest("td") !== td && TABLE_IDS.includes(inp.closest("table")?.id)) {
            inputToSpan(inp);
        }
    });
    _tfMoving = true;
    const inp = spanToInput(span);
    if (inp) { inp.focus(); inp.select(); }
    setTimeout(() => { _tfMoving = false; }, 0);
}

// ─── Handler: focusout ───────────────────────────────────────────────────────
function _tfFocusout(e) {
    if (_tfMoving) return; // navegación programática: ya se hizo inputToSpan explícito
    const input = e.target;
    if (!input.classList.contains("cell-input")) return;
    if (!_tfGetTable(input)) return;
    const c = input.closest("td")?.cellIndex ?? 0;
    const table = _tfGetTable(input);
    inputToSpan(input);
    if (table) ajustarAnchoColumna(table, c);
    setTimeout(actualizarMatricesDerivadas, 0);
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

    const td  = target.closest("td");
    const row = td?.parentElement;
    if (!td || !row) return;
    const r = row.rowIndex;
    const c = td.cellIndex;

    // ── Flechas: navegar dentro de la tabla, sin salir ───────────────────
    if (e.key === "ArrowRight") {
        e.preventDefault();
        _tfMoving = true;
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        const maxC = (table.rows[r]?.cells.length ?? 1) - 1;
        if (c < maxC) _tfMoveTo(table, r, c + 1);
        else          _tfMoveTo(table, r, c);   // borde: quedarse
        return;
    }
    if (e.key === "ArrowLeft") {
        e.preventDefault();
        _tfMoving = true;
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (c > 0) _tfMoveTo(table, r, c - 1);
        else       _tfMoveTo(table, r, 0);       // borde: quedarse
        return;
    }
    if (e.key === "ArrowUp") {
        e.preventDefault();
        _tfMoving = true;
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (r > 0) _tfMoveTo(table, r - 1, Math.min(c, (table.rows[r-1]?.cells.length ?? 1) - 1));
        else       _tfMoveTo(table, 0, c);       // borde: quedarse
        return;
    }
    if (e.key === "ArrowDown") {
        e.preventDefault();
        _tfMoving = true;
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (r < table.rows.length - 1) _tfMoveTo(table, r + 1, Math.min(c, (table.rows[r+1]?.cells.length ?? 1) - 1));
        else                            _tfMoveTo(table, r, c); // borde: quedarse
        return;
    }

    // ── Tab ───────────────────────────────────────────────────────────────
    if (e.key === "Tab") {
        e.preventDefault();
        _tfMoving = true;
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
            if (target.value !== "") return; // dejar que el input borre su contenido
            e.preventDefault();
            // Input ya vacío: convertir a span y revisar borrado estructural
            _tfMoving = true;
            const empty = crearSpanCelda("", r, c);
            target.replaceWith(empty);
            _tfRevisarBorrado(table, r, c);
        } else if (isSpan) {
            e.preventDefault();
            const val = target.getAttribute("data-value") || "";
            if (val !== "") {
                // Borrar contenido y revisar si fila/columna quedó vacía
                target.setAttribute("data-value", "");
                target.textContent = "";
                target.innerHTML = "";
            }
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
    _tfHandlers.input     = _tfInput;
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
    _tfMoving    = false;
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
    matriz.forEach(fila => {
        const tr = UI.createRow();
        fila.forEach(v => {
            const td = UI.createTd();
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
        table.querySelectorAll(".cell-input").forEach(inp => inputToSpan(inp));
        const raw = Auxiliares.parsearMatriz(table);
        for (const row of table.rows) {
            for (const cell of row.cells) {
                const span = cell.querySelector(".cell-span");
                const val = span ? (span.getAttribute("data-value") || "").trim() : "";
                if (val === "") return null;
            }
        }
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

function crearBloqueMatrizEditable(key, simbolo) {
    const cfg = MATRICES[key];
    const wrapper = document.createElement("div");
    wrapper.className = "tf-matrix-block";
    wrapper.id = `block_${key}`;
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.padding = "1rem";
    wrapper.style.border = "2px solid var(--primary)";
    wrapper.style.borderRadius = "16px";
    wrapper.style.backgroundColor = "var(--bg-surface)";
    wrapper.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";

    const row = document.createElement("div");
    row.className = "tf-matrix-row";

    const label = document.createElement("span");
    label.className = "tf-matrix-label";
    label.innerHTML = `${cfg.label} <span class="tf-symbol">[${simbolo}]</span> =`;

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "tf-matrix-container tableMain";
    const table = crearTablaEditable(key, cfg.rows, cfg.cols);
    matrixContainer.appendChild(table);

    row.appendChild(label);
    row.appendChild(matrixContainer);
    wrapper.appendChild(row);

    const btnOnOff = document.createElement("button");
    btnOnOff.className = "tf-toggle-btn tf-off";
    btnOnOff.id = `toggle_${key}`;
    btnOnOff.textContent = "OFF";
    btnOnOff.title = "Activar → usar matriz identidad";
    btnOnOff.style.cssText = "position:absolute;bottom:8px;right:8px;padding:4px 10px;font-size:0.7rem;border-radius:12px;border:none;cursor:pointer;background:#333;color:#aaa;";
    btnOnOff.addEventListener("click", () => toggleIdentidad(key));
    wrapper.appendChild(btnOnOff);

    return wrapper;
}

function toggleIdentidad(key) {
    const grupo    = (key === "B1" || key === "B2") ? "V" : "W";
    const pareja   = grupo === "V" ? (key === "B1" ? "B2" : "B1") : (key === "B3" ? "B4" : "B3");
    const activeRef = grupo === "V" ? activeV : activeW;

    if (activeRef === key) {
        MATRICES[key].isIdentity = false;
        MATRICES[key].locked = false;
        desbloquearTabla(MATRICES[key].id);
        const btn = document.getElementById(`toggle_${key}`);
        if (btn) { btn.textContent = "OFF"; btn.style.background = "#333"; btn.style.color = "#aaa"; }
        if (grupo === "V") activeV = null; else activeW = null;
    } else {
        if (activeRef !== null) {
            MATRICES[pareja].isIdentity = false;
            MATRICES[pareja].locked = false;
            desbloquearTabla(MATRICES[pareja].id);
            const btnP = document.getElementById(`toggle_${pareja}`);
            if (btnP) { btnP.textContent = "OFF"; btnP.style.background = "#333"; btnP.style.color = "#aaa"; }
        }
        MATRICES[key].isIdentity = true;
        MATRICES[key].locked = true;
        ponerIdentidad(MATRICES[key].id);
        const btn = document.getElementById(`toggle_${key}`);
        if (btn) { btn.textContent = "ON"; btn.style.background = "var(--primary)"; btn.style.color = "#fff"; }
        if (grupo === "V") activeV = key; else activeW = key;
    }
    actualizarMatricesDerivadas();
}

function actualizarMatricesDerivadas() {
    const rawB1 = leerMatrizEditable(MATRICES.B1.id);
    const rawB2 = leerMatrizEditable(MATRICES.B2.id);
    const rawB3 = leerMatrizEditable(MATRICES.B3.id);
    const rawB4 = leerMatrizEditable(MATRICES.B4.id);

    const B1 = rawB1 ? limpiarMatriz(rawB1) : null;
    const B2 = rawB2 ? limpiarMatriz(rawB2) : null;
    const B3 = rawB3 ? limpiarMatriz(rawB3) : null;
    const B4 = rawB4 ? limpiarMatriz(rawB4) : null;

    let P = null;
    if (B1 && B2 && esMatrizCuadrada(B1) && mismasDimensiones(B1, B2))
        try { P = matrizCambioBase(B1, B2); } catch { P = null; }

    let Q = null;
    if (B3 && B4 && esMatrizCuadrada(B3) && mismasDimensiones(B3, B4))
        try { Q = matrizCambioBase(B3, B4); } catch { Q = null; }

    let A = null;
    if (B2 && B3 && esMatrizCuadrada(B2) && esMatrizCuadrada(B3) && B2.length === B3.length) {
        try {
            const n = B2.length;
            const identidad = Array.from({ length: n }, (_, i) =>
                Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
            );
            A = matrizTransformacion(identidad, B2, B3);
        } catch { A = null; }
    }

    let C = null;
    if (P && A && Q) {
        try { const AP = multiplicarMatrices(A, P); C = multiplicarMatrices(Q, AP); }
        catch { C = null; }
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

export function inicializarTransformaciones(article) {
    _article = article;
    while (article.firstChild) article.removeChild(article.firstChild);

    const section = UI.createSection("tfSection", "TRANSFORMACIONES LINEALES");
    section.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2rem;padding:2rem;";

    const formula = document.createElement("p");
    formula.className = "tf-formula";
    formula.innerHTML = "T: ℝ<sup>n</sup> → ℝ<sup>m</sup>";
    section.appendChild(formula);

    const threeColumns = document.createElement("div");
    threeColumns.style.cssText = "display:flex;align-items:stretch;justify-content:center;gap:2rem;flex-wrap:wrap;";

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