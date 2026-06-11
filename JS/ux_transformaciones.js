import UI from "./ui.js";
import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js";
import { configurarEventosMulti, desconfigurarEventosMulti } from "./eventos_celdas.js";
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

function crearTablaEditable(key, rows, cols) {
    const cfg = MATRICES[key];
    const table = UI.createTable(cfg.id);
    table.dataset.minRows = "1";
    table.dataset.minCols = "1";
    table.classList.add("tf-input-table");   // usa mismos estilos que #inputTable

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
        table.querySelectorAll('.cell-input').forEach(inp => inputToSpan(inp));
        const raw = Auxiliares.parsearMatriz(table);
        for (const row of table.rows) {
            for (const cell of row.cells) {
                const span = cell.querySelector('.cell-span');
                const val = span ? (span.getAttribute('data-value') || '').trim() : '';
                if (val === '') return null;
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
            const span = cell.querySelector('.cell-span');
            const input = cell.querySelector('.cell-input');
            if (input) {
                input.value = val;
                inputToSpan(input);
            }
            if (span) {
                span.setAttribute('data-value', val);
                span.textContent = val;
            }
        }
    }
    table.querySelectorAll('.cell-span, .cell-input').forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.6';
    });
}

function desbloquearTabla(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll('.cell-span, .cell-input').forEach(el => {
        el.style.pointerEvents = '';
        el.style.opacity = '';
    });
}

// ─── sección editable (B1/B2/B3/B4) con botón ON/OFF ─────────────────────────

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

    // Fila: B₁ [α↓] = [MATRIZ] (todo en una línea)
    const row = document.createElement("div");
    row.className = "tf-matrix-row";

    const label = document.createElement("span");
    label.className = "tf-matrix-label";
    label.innerHTML = `${cfg.label} <span class="tf-symbol">[${simbolo}]</span> =`;
    
    const matrixContainer = document.createElement("div");
    matrixContainer.className = "tf-matrix-container tableMain";   // [ ] brackets via CSS
    const table = crearTablaEditable(key, cfg.rows, cfg.cols);
    matrixContainer.appendChild(table);
    
    row.appendChild(label);
    row.appendChild(matrixContainer);
    wrapper.appendChild(row);

    // Botón ON/OFF en esquina inferior derecha
    const btnOnOff = document.createElement("button");
    btnOnOff.className = "tf-toggle-btn tf-off";
    btnOnOff.id = `toggle_${key}`;
    btnOnOff.textContent = "OFF";
    btnOnOff.title = "Activar → usar matriz identidad";
    btnOnOff.style.position = "absolute";
    btnOnOff.style.bottom = "8px";
    btnOnOff.style.right = "8px";
    btnOnOff.style.padding = "4px 10px";
    btnOnOff.style.fontSize = "0.7rem";
    btnOnOff.style.borderRadius = "12px";
    btnOnOff.style.border = "none";
    btnOnOff.style.cursor = "pointer";
    btnOnOff.style.background = "#333";
    btnOnOff.style.color = "#aaa";
    btnOnOff.addEventListener("click", () => toggleIdentidad(key));
    wrapper.appendChild(btnOnOff);

    return wrapper;
}

function toggleIdentidad(key) {
    const grupo = (key === "B1" || key === "B2") ? "V" : "W";
    const pareja = grupo === "V"
        ? (key === "B1" ? "B2" : "B1")
        : (key === "B3" ? "B4" : "B3");
    const activeRef = grupo === "V" ? activeV : activeW;

    if (activeRef === key) {
        MATRICES[key].isIdentity = false;
        MATRICES[key].locked = false;
        desbloquearTabla(MATRICES[key].id);
        const btn = document.getElementById(`toggle_${key}`);
        if (btn) { 
            btn.textContent = "OFF"; 
            btn.style.background = "#333";
            btn.style.color = "#aaa";
        }
        if (grupo === "V") activeV = null;
        else activeW = null;
    } else {
        if (activeRef !== null) {
            MATRICES[pareja].isIdentity = false;
            MATRICES[pareja].locked = false;
            desbloquearTabla(MATRICES[pareja].id);
            const btnP = document.getElementById(`toggle_${pareja}`);
            if (btnP) { 
                btnP.textContent = "OFF"; 
                btnP.style.background = "#333";
                btnP.style.color = "#aaa";
            }
        }
        MATRICES[key].isIdentity = true;
        MATRICES[key].locked = true;
        ponerIdentidad(MATRICES[key].id);
        const btn = document.getElementById(`toggle_${key}`);
        if (btn) { 
            btn.textContent = "ON"; 
            btn.style.background = "var(--primary)";
            btn.style.color = "#fff";
        }
        if (grupo === "V") activeV = key;
        else activeW = key;
    }
    actualizarMatricesDerivadas();
}

// ─── actualizar P, Q, A, C ───────────────────────────────────────────────────

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
    if (B1 && B2 && esMatrizCuadrada(B1) && mismasDimensiones(B1, B2)) {
        try { P = matrizCambioBase(B1, B2); } catch { P = null; }
    }

    let Q = null;
    if (B3 && B4 && esMatrizCuadrada(B3) && mismasDimensiones(B3, B4)) {
        try { Q = matrizCambioBase(B3, B4); } catch { Q = null; }
    }

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
    if (subindice) {
        lbl.innerHTML = `${nombre}<sub>${subindice}</sub> =`;
    } else {
        lbl.innerHTML = `${nombre} =`;
    }
    row.appendChild(lbl);

    if (!matriz) {
        const placeholder = document.createElement("div");
        placeholder.className = "tf-derived-placeholder";
        placeholder.textContent = "Esperando bases compatibles…";
        row.appendChild(placeholder);
    } else {
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        const table = crearTablaResultado(matriz, `result_${zoneId}`);
        matrixContainer.appendChild(table);
        row.appendChild(matrixContainer);
    }
    zone.appendChild(row);
}

export function inicializarTransformaciones(article) {
    _article = article;
    while (article.firstChild) article.removeChild(article.firstChild);

    const section = UI.createSection("tfSection", "TRANSFORMACIONES LINEALES");
    section.style.display = "flex";
    section.style.flexDirection = "column";
    section.style.alignItems = "center";
    section.style.gap = "2rem";
    section.style.padding = "2rem";

    const formula = document.createElement("p");
    formula.className = "tf-formula";
    formula.innerHTML = "T: ℝ<sup>n</sup> → ℝ<sup>m</sup>";
    section.appendChild(formula);

    // ==================== 3 COLUMNAS ====================
    const threeColumns = document.createElement("div");
    threeColumns.style.display = "flex";
    threeColumns.style.alignItems = "stretch";
    threeColumns.style.justifyContent = "center";
    threeColumns.style.gap = "2rem";
    threeColumns.style.flexWrap = "wrap";

    // ---------- COLUMNA 1: ESPACIO V (B₂ arriba, B₁ abajo) ----------
    const col1 = document.createElement("div");
    col1.style.display = "flex";
    col1.style.flexDirection = "column";
    col1.style.alignItems = "center";

    const espacioV = document.createElement("div");
    espacioV.className = "tf-espacio";

    const lblV = document.createElement("div");
    lblV.className = "tf-espacio-label";
    lblV.textContent = "Espacio Vectorial V";

    const b2Container = crearBloqueMatrizEditable("B2", "β↓");
    
    // Flecha P (apunta de B₁ → B₂, o sea hacia ARRIBA)
    const pArrow = document.createElement("div");
    pArrow.className = "tf-arrow-vertical";
    pArrow.innerHTML = `<span class="arrow-symbol">↑</span><span class="arrow-label">P<sub>B₁→B₂</sub></span>`;
    
    const b1Container = crearBloqueMatrizEditable("B1", "α↓");

    espacioV.appendChild(lblV);
    espacioV.appendChild(b2Container);
    espacioV.appendChild(pArrow);
    espacioV.appendChild(b1Container);
    col1.appendChild(espacioV);

    // ---------- COLUMNA 2: A y C (con flechas horizontales encima) ----------
    const col2 = document.createElement("div");
    col2.className = "tf-center-column";

    // Flecha horizontal hacia A (desde V)
    const arrowToA = document.createElement("div");
    arrowToA.className = "tf-long-arrow-horizontal";
    arrowToA.textContent = "→";
    
    const zoneA = document.createElement("div");
    zoneA.id = "zone_A";
    zoneA.style.display = "flex";
    zoneA.style.justifyContent = "center";
    
    // Espaciador vertical entre A y C
    const spacer = document.createElement("div");
    spacer.style.height = "2rem";
    
    // Flecha horizontal hacia C (desde V, parte inferior)
    const arrowToC = document.createElement("div");
    arrowToC.className = "tf-long-arrow-horizontal";
    arrowToC.textContent = "→";
    
    const zoneC = document.createElement("div");
    zoneC.id = "zone_C";
    zoneC.style.display = "flex";
    zoneC.style.justifyContent = "center";

    col2.appendChild(arrowToA);
    col2.appendChild(zoneA);
    col2.appendChild(spacer);
    col2.appendChild(arrowToC);
    col2.appendChild(zoneC);

    // ---------- COLUMNA 3: ESPACIO W (B₃ arriba, B₄ abajo) ----------
    const col3 = document.createElement("div");
    col3.style.display = "flex";
    col3.style.flexDirection = "column";
    col3.style.alignItems = "center";

    const espacioW = document.createElement("div");
    espacioW.className = "tf-espacio";

    const lblW = document.createElement("div");
    lblW.className = "tf-espacio-label";
    lblW.textContent = "Espacio Vectorial W";

    const b3Container = crearBloqueMatrizEditable("B3", "γ↓");
    
    // Flecha Q (apunta de B₃ → B₄, o sea hacia ABAJO)
    const qArrow = document.createElement("div");
    qArrow.className = "tf-arrow-vertical";
    qArrow.innerHTML = `<span class="arrow-label">Q<sub>B₃→B₄</sub></span><span class="arrow-symbol">↓</span>`;
    
    const b4Container = crearBloqueMatrizEditable("B4", "δ↓");

    espacioW.appendChild(lblW);
    espacioW.appendChild(b3Container);
    espacioW.appendChild(qArrow);
    espacioW.appendChild(b4Container);
    col3.appendChild(espacioW);

    threeColumns.appendChild(col1);
    threeColumns.appendChild(col2);
    threeColumns.appendChild(col3);
    section.appendChild(threeColumns);

    // ---------- FILA INFERIOR: P y Q (debajo de todo) ----------
    const bottomRow = document.createElement("div");
    bottomRow.style.display = "flex";
    bottomRow.style.alignItems = "center";
    bottomRow.style.justifyContent = "center";
    bottomRow.style.gap = "4rem";
    bottomRow.style.flexWrap = "wrap";
    bottomRow.style.marginTop = "1rem";
    bottomRow.style.paddingTop = "1rem";
    bottomRow.style.borderTop = "1px solid var(--border)";

    const zoneP = document.createElement("div");
    zoneP.id = "zone_P";
    
    const zoneQ2 = document.createElement("div");
    zoneQ2.id = "zone_Q";

    bottomRow.appendChild(zoneP);
    bottomRow.appendChild(zoneQ2);
    section.appendChild(bottomRow);

    article.appendChild(section);

    // Configurar eventos
    const tableIds = ["B1", "B2", "B3", "B4"].map(k => MATRICES[k].id);
    configurarEventosMulti(article, tableIds);

    article.addEventListener("focusout", _onCeldaFocusout);
    article.addEventListener("tf:recalcular", actualizarMatricesDerivadas);

    actualizarMatricesDerivadas();
}

function _onCeldaFocusout(e) {
    if (e.target.classList.contains('cell-input')) {
        setTimeout(actualizarMatricesDerivadas, 30);
    }
}

export function limpiarTransformaciones() {
    activeV = null;
    activeW = null;
    Object.values(MATRICES).forEach(m => {
        m.locked = false;
        m.isIdentity = false;
    });
    if (_article) {
        _article.removeEventListener("focusout", _onCeldaFocusout);
        _article.removeEventListener("tf:recalcular", actualizarMatricesDerivadas);
    }
    desconfigurarEventosMulti();
    _article = null;
}