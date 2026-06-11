import UI from "./ui.js";
import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js";
import { ajustarAnchoColumna } from "./eventos_celdas.js";
import { clasificarLIoLD, matrizCambioBase, matrizTransformacion } from "./calculos.js";
import { multiplicarMatrices } from "./operaciones.js";

const MATRICES = {
    B1: { id: "tfB1", label: "B₁", symbol: "[α↓]", rows: 2, cols: 2 },
    B2: { id: "tfB2", label: "B₂", symbol: "[β↓]", rows: 2, cols: 2 },
    B3: { id: "tfB3", label: "B₃", symbol: "[γ↓]", rows: 2, cols: 2 },
    B4: { id: "tfB4", label: "B₄", symbol: "[δ↓]", rows: 2, cols: 2 },
};

const TABLE_IDS = Object.values(MATRICES).map(m => m.id);

let _article = null;
let _tfHandlers = {};
let _tfMoving = false;

function _tfGetTable(el) {
    const table = el?.closest?.("table");
    if (!table) return null;
    return TABLE_IDS.includes(table.id) ? table : null;
}

function _tfMoveTo(table, rowIndex, colIndex) {
    if (!table?.rows.length) return;
    const row = table.rows[Math.max(0, Math.min(rowIndex, table.rows.length - 1))];
    const cell = row?.cells[Math.max(0, Math.min(colIndex, row.cells.length - 1))];
    if (!cell) return;

    const span = cell.querySelector(".cell-span");
    const input = cell.querySelector(".cell-input");
    _tfMoving = true;

    if (span) {
        const nextInput = spanToInput(span);
        nextInput?.focus?.();
        nextInput?.select?.();
    } else if (input) {
        input.focus();
        input.select?.();
    }

    setTimeout(() => { _tfMoving = false; }, 0);
}

function _tfAjustarTabla(table) {
    if (!table?.rows.length) return;
    for (let j = 0; j < (table.rows[0]?.cells.length || 0); j++) {
        ajustarAnchoColumna(table, j);
    }
}

function _valorCeldaVacioOCero(cell) {
    const input = cell?.querySelector(".cell-input");
    const span = cell?.querySelector(".cell-span");
    const valor = (input?.value ?? span?.getAttribute("data-value") ?? span?.textContent ?? "").trim();

    if (valor === "") return true;

    try {
        return Auxiliares.parsearFraccion(valor).num === 0;
    } catch {
        return false;
    }
}

function _filaVaciaOCero(table, rowIndex) {
    const row = table?.rows[rowIndex];
    if (!row) return true;
    return Array.from(row.cells).every(_valorCeldaVacioOCero);
}

function _columnaVaciaOCero(table, colIndex) {
    if (!table?.rows.length) return true;
    return Array.from(table.rows).every(row => _valorCeldaVacioOCero(row.cells[colIndex]));
}

function _tfRevisarBorrado(table, rowIndex, colIndex) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;

    setTimeout(() => {
        let targetRow = rowIndex;
        let targetCol = colIndex;
        let huboBorrado = false;

        if (table.rows.length > minRows && _filaVaciaOCero(table, rowIndex)) {
            Auxiliares.eliminarFila(table, rowIndex);
            huboBorrado = true;
            targetRow = Math.max(0, Math.min(rowIndex - 1, table.rows.length - 1));
            targetCol = Math.min(colIndex, (table.rows[targetRow]?.cells.length || 1) - 1);
        }

        if ((table.rows[0]?.cells.length || 0) > minCols && _columnaVaciaOCero(table, colIndex)) {
            Auxiliares.eliminarColumna(table, colIndex);
            huboBorrado = true;
            targetCol = Math.max(0, Math.min(colIndex - 1, (table.rows[0]?.cells.length || 1) - 1));
        }

        if (!huboBorrado) {
            if (colIndex > 0) targetCol = colIndex - 1;
            else if (rowIndex > 0) {
                targetRow = rowIndex - 1;
                targetCol = (table.rows[targetRow]?.cells.length || 1) - 1;
            }
        }

        _tfAjustarTabla(table);
        _tfMoveTo(table, targetRow, targetCol);
        actualizarMatricesDerivadas();
    }, 0);
}

function _tfMousedown(event) {
    const target = event.target;
    if (target.classList.contains("cell-input")) return;

    let span = null;
    let cell = null;

    if (target.classList.contains("cell-span")) {
        span = target;
        cell = target.closest("td");
    } else if (target.closest(".cell-span")) {
        span = target.closest(".cell-span");
        cell = span.closest("td");
    } else if (target.tagName === "TD") {
        cell = target;
        span = cell.querySelector(".cell-span");
    } else if (target.closest("td")) {
        cell = target.closest("td");
        span = cell?.querySelector(".cell-span");
    }

    if (!cell || !span || !_tfGetTable(cell)) return;

    event.preventDefault();
    _article?.querySelectorAll(".cell-input").forEach(input => {
        const table = _tfGetTable(input);
        if (table && input.closest("td") !== cell) inputToSpan(input);
    });

    _tfMoving = true;
    const input = spanToInput(span);
    input?.focus?.();
    input?.select?.();
    setTimeout(() => { _tfMoving = false; }, 0);
}

function _tfFocusout(event) {
    if (_tfMoving) return;
    const input = event.target;
    if (!input.classList.contains("cell-input")) return;
    const table = _tfGetTable(input);
    if (!table || !input.isConnected) return;

    const colIndex = input.closest("td")?.cellIndex || 0;
    inputToSpan(input);
    ajustarAnchoColumna(table, colIndex);
    setTimeout(actualizarMatricesDerivadas, 0);
}

function _tfInput(event) {
    const input = event.target;
    if (!input.classList.contains("cell-input") || !_tfGetTable(input)) return;

    let valor = input.value;
    valor = valor.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    valor = valor.replace(/[^0-9\-\/\.]/g, "");

    const slashes = (valor.match(/\//g) || []).length;
    if (slashes > 1) {
        const index = valor.indexOf("/");
        valor = valor.slice(0, index + 1) + valor.slice(index + 1).replace(/\//g, "");
    }

    if (/^\.\d/.test(valor)) valor = `0${valor}`;
    if (/^-\.\d/.test(valor)) valor = `-0${valor.slice(1)}`;

    if (input.value !== valor) input.value = valor;
    input.style.width = `${Math.max(2, valor.length + 1)}ch`;
}

function _tfKeydown(event) {
    const target = event.target;
    const isInput = target.classList.contains("cell-input");
    const isSpan = target.classList.contains("cell-span");
    if (!isInput && !isSpan) return;

    const table = _tfGetTable(target);
    if (!table) return;

    const cell = target.closest("td");
    const row = cell?.parentElement;
    if (!cell || !row) return;

    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Tab"].includes(event.key)) {
        event.preventDefault();
        _tfMoving = true;
        if (isInput) {
            inputToSpan(target);
            ajustarAnchoColumna(table, colIndex);
        }

        if (event.key === "ArrowRight") _tfMoveTo(table, rowIndex, Math.min(colIndex + 1, row.cells.length - 1));
        if (event.key === "ArrowLeft") _tfMoveTo(table, rowIndex, Math.max(colIndex - 1, 0));
        if (event.key === "ArrowUp") _tfMoveTo(table, Math.max(rowIndex - 1, 0), colIndex);
        if (event.key === "ArrowDown") _tfMoveTo(table, Math.min(rowIndex + 1, table.rows.length - 1), colIndex);
        if (event.key === "Tab") {
            const maxCol = row.cells.length - 1;
            if (colIndex < maxCol) _tfMoveTo(table, rowIndex, colIndex + 1);
            else if (rowIndex < table.rows.length - 1) _tfMoveTo(table, rowIndex + 1, 0);
            else _tfMoveTo(table, rowIndex, colIndex);
        }
        return;
    }

    if (event.key === "Escape") {
        if (isInput) {
            inputToSpan(target);
            target.blur();
        }
        return;
    }

    if (event.key === " ") {
        event.preventDefault();
        if (isInput) {
            inputToSpan(target);
            ajustarAnchoColumna(table, colIndex);
        }
        Auxiliares.insertarColumna(table, colIndex + 1);
        _tfAjustarTabla(table);
        setTimeout(() => _tfMoveTo(table, rowIndex, colIndex + 1), 10);
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        if (isInput) {
            inputToSpan(target);
            ajustarAnchoColumna(table, colIndex);
        }
        Auxiliares.insertarFila(table, rowIndex + 1);
        _tfAjustarTabla(table);
        setTimeout(() => _tfMoveTo(table, rowIndex + 1, colIndex), 10);
        return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
        if (isInput && target.value !== "") return;

        event.preventDefault();
        _tfMoving = true;

        if (isInput) {
            const span = crearSpanCelda("", rowIndex, colIndex);
            target.replaceWith(span);
        } else {
            target.setAttribute("data-value", "");
            target.textContent = "";
            target.innerHTML = "";
        }

        _tfRevisarBorrado(table, rowIndex, colIndex);
        return;
    }

    if (isSpan && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(event.key)) return;
        event.preventDefault();
        const input = spanToInput(target);
        if (input) {
            input.value = event.key;
            input.setSelectionRange(1, 1);
        }
    }
}

function _tfConfigurar(article) {
    _tfDesconfigurar();
    _tfHandlers = {
        mousedown: _tfMousedown,
        keydown: _tfKeydown,
        input: _tfInput,
        focusout: _tfFocusout,
        windowKey: event => {
            if (event.key === " " && (
                document.activeElement?.classList.contains("cell-input") ||
                document.activeElement?.classList.contains("cell-span")
            )) {
                event.preventDefault();
            }
        }
    };

    article.addEventListener("mousedown", _tfHandlers.mousedown);
    article.addEventListener("keydown", _tfHandlers.keydown);
    article.addEventListener("input", _tfHandlers.input);
    article.addEventListener("focusout", _tfHandlers.focusout);
    window.addEventListener("keydown", _tfHandlers.windowKey);
}

function _tfDesconfigurar() {
    if (_article) {
        _article.removeEventListener("mousedown", _tfHandlers.mousedown);
        _article.removeEventListener("keydown", _tfHandlers.keydown);
        _article.removeEventListener("input", _tfHandlers.input);
        _article.removeEventListener("focusout", _tfHandlers.focusout);
    }
    if (_tfHandlers.windowKey) window.removeEventListener("keydown", _tfHandlers.windowKey);
    _tfHandlers = {};
    _tfMoving = false;
}

function finalizarEntradasTransformaciones() {
    document.querySelectorAll("#tfSection .cell-input").forEach(inputToSpan);
}

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
    table.classList.add("tf-matrix-table", "tf-result-table", "result-table");

    matriz.forEach(fila => {
        const tr = UI.createRow();
        fila.forEach(valor => {
            const td = UI.createTd();
            const texto = Auxiliares.fraccionToString(valor);
            if (texto.includes("/")) {
                const [num, den] = texto.split("/");
                td.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
            } else {
                td.textContent = texto;
            }
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    return table;
}

function tablaTieneContenido(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return false;

    return Array.from(table.rows).some(row =>
        Array.from(row.cells).some(cell => {
            const input = cell.querySelector(".cell-input");
            const span = cell.querySelector(".cell-span");
            const valor = (input?.value ?? span?.getAttribute("data-value") ?? span?.textContent ?? "").trim();
            return valor !== "";
        })
    );
}

function leerMatrizEditable(tableId) {
    const table = document.getElementById(tableId);
    if (!table || !table.rows.length) return null;
    if (!tablaTieneContenido(tableId)) return null;

    table.querySelectorAll(".cell-input").forEach(inputToSpan);
    return Auxiliares.parsearMatriz(table).map(fila =>
        fila.map(({ num, den }) => Auxiliares.normalizarSigno({ num, den }))
    );
}

function dimensiones(matriz) {
    return { filas: matriz?.length || 0, columnas: matriz?.[0]?.length || 0 };
}

function validarMismaForma(nombreA, A, nombreB, B) {
    const da = dimensiones(A);
    const db = dimensiones(B);

    if (da.filas !== db.filas || da.columnas !== db.columnas) {
        throw new Error(`${nombreA} y ${nombreB} deben tener el mismo tamaño. Actualmente ${nombreA} es ${da.filas}×${da.columnas} y ${nombreB} es ${db.filas}×${db.columnas}.`);
    }
}

function validarBaseLI(nombre, matriz) {
    const dim = dimensiones(matriz);
    if (!matriz || dim.filas === 0 || dim.columnas === 0) {
        throw new Error(`La base ${nombre} está vacía.`);
    }

    const matrizConCeros = matriz.map(fila => [...fila, { num: 0, den: 1 }]);
    const resultado = clasificarLIoLD(matrizConCeros);
    if (!resultado.esLI) {
        throw new Error(`La base ${nombre} no es válida: sus vectores son linealmente dependientes.`);
    }
}

function crearErrorTransformacion(mensaje) {
    return { error: mensaje };
}

function matrizIdentidad(n) {
    return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
    );
}

function calcularMatrizCambio(nombreA, A, nombreB, B) {
    if (!A || !B) return null;

    try {
        validarMismaForma(nombreA, A, nombreB, B);
        validarBaseLI(nombreA, A);
        validarBaseLI(nombreB, B);
        return matrizCambioBase(A, B);
    } catch (error) {
        const mensaje = String(error.message || "");
        if (mensaje.toLowerCase().includes("cuadrada")) {
            return crearErrorTransformacion(`No se pudo calcular la matriz de cambio entre ${nombreA} y ${nombreB} con las dimensiones actuales.`);
        }
        return crearErrorTransformacion(mensaje || `No se pudo calcular la matriz de cambio entre ${nombreA} y ${nombreB}.`);
    }
}

function calcularMatrizA(B2, B3) {
    if (!B2 || !B3) return null;

    try {
        validarMismaForma("B₂", B2, "B₃", B3);
        validarBaseLI("B₂", B2);
        validarBaseLI("B₃", B3);
        return matrizTransformacion(matrizIdentidad(B2.length), B2, B3);
    } catch (error) {
        const mensaje = String(error.message || "");
        if (mensaje.toLowerCase().includes("cuadrada")) {
            return crearErrorTransformacion("No se pudo calcular A con las dimensiones actuales.");
        }
        return crearErrorTransformacion(mensaje || "No se pudo calcular A.");
    }
}

function actualizarMatricesDerivadas() {
    finalizarEntradasTransformaciones();

    const B1 = leerMatrizEditable(MATRICES.B1.id);
    const B2 = leerMatrizEditable(MATRICES.B2.id);
    const B3 = leerMatrizEditable(MATRICES.B3.id);
    const B4 = leerMatrizEditable(MATRICES.B4.id);

    const P = calcularMatrizCambio("B₁", B1, "B₂", B2);
    const Q = calcularMatrizCambio("B₃", B3, "B₄", B4);
    const A = calcularMatrizA(B2, B3);

    let C = null;
    if (P && A && Q && !P.error && !A.error && !Q.error) {
        try {
            C = multiplicarMatrices(Q, multiplicarMatrices(A, P));
        } catch (error) {
            C = crearErrorTransformacion(error.message || "No se pudo calcular C.");
        }
    }

    renderizarResultados(P, Q, A, C);
    sincronizarSwitchesCanonicosTransformaciones();
}

function renderizarResultados(P, Q, A, C) {
    renderMatrizDerivada("zone_P", "P", "B₁→B₂", P);
    renderMatrizDerivada("zone_Q", "Q", "B₃→B₄", Q);
    renderMatrizDerivada("zone_A", "A", "B₂→B₃", A);
    renderMatrizDerivada("zone_C", "C", "Q·A·P", C);
}

function renderMatrizDerivada(zoneId, nombre, subindice, matriz) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.innerHTML = "";

    const row = document.createElement("div");
    row.className = "tf-derived-row";

    const label = document.createElement("div");
    label.className = "tf-derived-label";
    label.innerHTML = subindice ? `${nombre}<sub>${subindice}</sub> =` : `${nombre} =`;
    row.appendChild(label);

    if (!matriz) {
        const placeholder = document.createElement("div");
        placeholder.className = "tf-derived-placeholder";
        placeholder.textContent = "Esperando bases compatibles…";
        row.appendChild(placeholder);
    } else if (matriz.error) {
        const error = document.createElement("div");
        error.className = "tf-derived-error";
        error.textContent = matriz.error;
        row.appendChild(error);
    } else {
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        matrixContainer.appendChild(crearTablaResultado(matriz, `result_${zoneId}`));
        row.appendChild(matrixContainer);
    }

    zone.appendChild(row);
}

function valorVisual(table, row, col) {
    const cell = table?.rows[row]?.cells[col];
    const input = cell?.querySelector(".cell-input");
    const span = cell?.querySelector(".cell-span");
    return (input?.value ?? span?.getAttribute("data-value") ?? span?.textContent ?? "").trim();
}

function esCeroVisual(valor) {
    const limpio = String(valor ?? "").trim();
    if (limpio === "") return true;
    try {
        return Auxiliares.parsearFraccion(limpio).num === 0;
    } catch {
        return false;
    }
}

function esUnoVisual(valor) {
    const limpio = String(valor ?? "").trim();
    if (limpio === "") return false;
    try {
        const f = Auxiliares.parsearFraccion(limpio);
        return f.num === f.den;
    } catch {
        return false;
    }
}

function esIdentidadVisual(table) {
    if (!table || !table.rows.length) return false;
    const filas = table.rows.length;
    const columnas = table.rows[0]?.cells.length || 0;
    if (filas !== columnas) return false;

    for (let i = 0; i < filas; i++) {
        for (let j = 0; j < columnas; j++) {
            const valor = valorVisual(table, i, j);
            if (i === j) {
                if (!esUnoVisual(valor)) return false;
            } else if (!esCeroVisual(valor)) {
                return false;
            }
        }
    }
    return true;
}

function marcarSwitchCanonico(key, checked) {
    const input = document.getElementById(`tfCanonica_${key}`);
    if (!input) return;
    input.checked = checked;
    input.setAttribute("aria-checked", String(checked));
    input.closest(".canonical-switch-wrapper")?.classList.toggle("is-active", checked);
}

function sincronizarSwitchCanonicoTransformaciones(key) {
    const table = document.getElementById(MATRICES[key].id);
    marcarSwitchCanonico(key, esIdentidadVisual(table));
}

function sincronizarSwitchesCanonicosTransformaciones() {
    Object.keys(MATRICES).forEach(sincronizarSwitchCanonicoTransformaciones);
}

function reconstruirIdentidadTransformaciones(key) {
    const table = document.getElementById(MATRICES[key].id);
    if (!table) return;

    const dimension = Math.max(1, table.rows.length, table.rows[0]?.cells.length || 1);
    table.innerHTML = "";

    for (let i = 0; i < dimension; i++) {
        const tr = UI.createRow();
        for (let j = 0; j < dimension; j++) {
            const td = UI.createTd(`${MATRICES[key].id}_cell${i}${j}`);
            const valor = i === j ? "1" : "0";
            const span = crearSpanCelda(valor, i, j);
            span.setAttribute("data-value", valor);
            span.textContent = valor;
            td.appendChild(span);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    marcarSwitchCanonico(key, true);
    _tfAjustarTabla(table);
}

function limpiarTablaTransformaciones(key) {
    const table = document.getElementById(MATRICES[key].id);
    if (!table) return;

    table.innerHTML = "";
    for (let i = 0; i < MATRICES[key].rows; i++) {
        const tr = UI.createRow();
        for (let j = 0; j < MATRICES[key].cols; j++) {
            const td = UI.createTd(`${MATRICES[key].id}_cell${i}${j}`);
            td.appendChild(crearSpanCelda("", i, j));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    marcarSwitchCanonico(key, false);
    _tfAjustarTabla(table);
}

function manejarCambioSwitchCanonicoTransformaciones(key) {
    const input = document.getElementById(`tfCanonica_${key}`);
    if (!input) return;

    finalizarEntradasTransformaciones();

    if (input.checked) reconstruirIdentidadTransformaciones(key);
    else limpiarTablaTransformaciones(key);

    actualizarMatricesDerivadas();

    const firstSpan = document.querySelector(`#${MATRICES[key].id} .cell-span`);
    if (firstSpan) setTimeout(() => spanToInput(firstSpan)?.select?.(), 20);
}

function crearSwitchCanonicoTransformaciones(key) {
    const cfg = MATRICES[key];
    const wrapper = document.createElement("label");
    wrapper.className = "canonical-switch-wrapper tf-canonical-switch";
    wrapper.setAttribute("for", `tfCanonica_${key}`);
    wrapper.setAttribute("title", `Usar base canónica para ${cfg.label}`);

    const symbol = document.createElement("span");
    symbol.className = "canonical-switch-symbol";
    symbol.textContent = "𝔼";
    symbol.setAttribute("aria-hidden", "true");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `tfCanonica_${key}`;
    input.className = "canonical-switch-input";
    input.setAttribute("aria-label", `Usar base canónica para ${cfg.label}`);
    input.addEventListener("change", () => manejarCambioSwitchCanonicoTransformaciones(key));

    const visual = document.createElement("span");
    visual.className = "canonical-switch-visual";
    visual.setAttribute("aria-hidden", "true");

    const knob = document.createElement("span");
    knob.className = "canonical-switch-knob";
    visual.appendChild(knob);

    wrapper.append(symbol, input, visual);
    return wrapper;
}

function crearBloqueMatrizEditable(key) {
    const cfg = MATRICES[key];
    const wrapper = document.createElement("div");
    wrapper.className = "tf-matrix-block";
    wrapper.id = `block_${key}`;

    const header = document.createElement("div");
    header.className = "tf-matrix-header";
    header.appendChild(crearSwitchCanonicoTransformaciones(key));

    const row = document.createElement("div");
    row.className = "tf-matrix-row";

    const label = document.createElement("span");
    label.className = "tf-matrix-label";
    label.innerHTML = `${cfg.label}<span class="tf-symbol"> ${cfg.symbol}</span>=`;

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "tf-matrix-container tableMain";
    matrixContainer.appendChild(crearTablaEditable(key, cfg.rows, cfg.cols));

    row.append(label, matrixContainer);
    wrapper.append(header, row);
    return wrapper;
}

function crearFlechaVertical(clase, etiqueta, direccion) {
    const arrow = document.createElement("div");
    arrow.className = `tf-arrow-vertical ${clase}`;
    if (direccion === "up") {
        arrow.innerHTML = `<span class="arrow-symbol">↑</span><span class="arrow-label">${etiqueta}</span>`;
    } else {
        arrow.innerHTML = `<span class="arrow-label">${etiqueta}</span><span class="arrow-symbol">↓</span>`;
    }
    return arrow;
}

function crearZonaResultado(id) {
    const zone = document.createElement("div");
    zone.id = id;
    zone.className = "tf-result-zone";
    return zone;
}

function crearEspacioVectorial(nombre, bloques) {
    const espacio = document.createElement("div");
    espacio.className = "tf-espacio";

    const label = document.createElement("div");
    label.className = "tf-espacio-label";
    label.textContent = nombre;
    espacio.appendChild(label);

    bloques.forEach(bloque => espacio.appendChild(bloque));
    return espacio;
}

export function inicializarTransformaciones(article) {
    _article = article;
    while (article.firstChild) article.removeChild(article.firstChild);

    const section = UI.createSection("tfSection", "TRANSFORMACIONES LINEALES");
    section.classList.add("tf-section");

    const formula = document.createElement("p");
    formula.className = "tf-formula";
    formula.innerHTML = "T: ℝ<sup>n</sup> → ℝ<sup>m</sup>";
    section.appendChild(formula);

    const diagram = document.createElement("div");
    diagram.className = "tf-diagram";

    const colV = document.createElement("div");
    colV.className = "tf-column";
    colV.appendChild(crearEspacioVectorial("Espacio vectorial V", [
        crearBloqueMatrizEditable("B2"),
        crearFlechaVertical("tf-arrow-p", "P<sub>B₁→B₂</sub>", "up"),
        crearBloqueMatrizEditable("B1")
    ]));

    const colCenter = document.createElement("div");
    colCenter.className = "tf-center-column";
    const arrowToA = document.createElement("div");
    arrowToA.className = "tf-long-arrow-horizontal";
    arrowToA.textContent = "→";
    const arrowToC = document.createElement("div");
    arrowToC.className = "tf-long-arrow-horizontal";
    arrowToC.textContent = "→";
    colCenter.append(arrowToA, crearZonaResultado("zone_A"), arrowToC, crearZonaResultado("zone_C"));

    const colW = document.createElement("div");
    colW.className = "tf-column";
    colW.appendChild(crearEspacioVectorial("Espacio vectorial W", [
        crearBloqueMatrizEditable("B3"),
        crearFlechaVertical("tf-arrow-q", "Q<sub>B₃→B₄</sub>", "down"),
        crearBloqueMatrizEditable("B4")
    ]));

    diagram.append(colV, colCenter, colW);
    section.appendChild(diagram);

    const bottomRow = document.createElement("div");
    bottomRow.className = "tf-bottom-row";
    bottomRow.append(crearZonaResultado("zone_P"), crearZonaResultado("zone_Q"));
    section.appendChild(bottomRow);

    article.appendChild(section);

    _tfConfigurar(article);
    actualizarMatricesDerivadas();

    const firstSpan = document.querySelector(`#${MATRICES.B2.id} .cell-span`);
    if (firstSpan) setTimeout(() => spanToInput(firstSpan)?.select?.(), 30);
}

export function limpiarTransformaciones() {
    _tfDesconfigurar();
    _article = null;
}
