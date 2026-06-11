import UI from "./ui.js";
import Auxiliares, { multiplicarFracciones, sumarFraccionesObj, restarFracciones, normalizarSigno } from "./auxiliares.js";
import { crearSpanCelda, spanToInput, inputToSpan } from "./celdas.js";
import { sumarMatrices, restarMatrices, multiplicarMatrices, multiplicarMatrizPorEscalar, validarDimensionesMatrices } from "./operaciones.js";

let currentBasicOperation = "suma";

const TITULOS = {
    suma: "SUMA DE MATRICES",
    resta: "RESTA DE MATRICES",
    multiplicacion: "MULTIPLICACIÓN DE MATRICES",
    escalar: "MULTIPLICACIÓN POR ESCALAR"
};

export function inicializarOperacionesBasicas(article, modo = "suma") {
    currentBasicOperation = modo;
    renderBasicas(article, modo);
}

export function cambiarOperacionBasica(article, modo) {
    currentBasicOperation = modo;
    renderBasicas(article, modo);
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}

function crearTd(row, col) {
    const td = document.createElement("td");
    const span = crearSpanCelda("", row, col);
    td.appendChild(span);
    return td;
}

function crearMatrizEditable(id, labelText, filas = 2, columnas = 2) {
    const card = document.createElement("div");
    card.className = "basic-matrix-card";

    const label = document.createElement("div");
    label.className = "basic-matrix-label";
    label.textContent = `${labelText} =`;

    const container = document.createElement("div");
    container.className = "basic-matrix-container";

    const table = document.createElement("table");
    table.id = id;
    table.className = "basic-input-table";
    table.dataset.minRows = "1";
    table.dataset.minCols = "1";

    for (let i = 0; i < filas; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < columnas; j++) {
            tr.appendChild(crearTd(i, j));
        }
        table.appendChild(tr);
    }

    container.appendChild(table);
    card.append(label, container);
    return card;
}

function crearOperadorVisual(simbolo) {
    const op = document.createElement("div");
    op.className = "basic-operator";
    op.textContent = simbolo;
    return op;
}

function crearEscalarVisual() {
    const card = document.createElement("div");
    card.className = "basic-matrix-card basic-scalar-card";

    const label = document.createElement("div");
    label.className = "basic-matrix-label";
    label.textContent = "k =";

    const input = document.createElement("input");
    input.id = "basicScalar";
    input.className = "cell-input basic-scalar-input";
    input.type = "text";
    input.value = "";
    input.inputMode = "decimal";
    input.setAttribute("aria-label", "Escalar k");

    card.append(label, input);
    return card;
}

function crearVistaMatrices(modo) {
    const matricesZone = document.createElement("div");
    matricesZone.id = "basicMatricesZone";
    matricesZone.className = "basic-matrices-zone";

    if (modo === "multiplicacion") {
        matricesZone.append(
            crearMatrizEditable("basicMatrixA", "A", 2, 2),
            crearOperadorVisual("×"),
            crearMatrizEditable("basicMatrixB", "B", 2, 2)
        );
    } else if (modo === "escalar") {
        matricesZone.append(
            crearEscalarVisual(),
            crearOperadorVisual("×"),
            crearMatrizEditable("basicMatrixA", "A", 2, 2)
        );
    } else {
        matricesZone.append(
            crearMatrizEditable("basicMatrixA", "A", 2, 2),
            crearOperadorVisual(modo === "suma" ? "+" : "−"),
            crearMatrizEditable("basicMatrixB", "B", 2, 2)
        );
    }

    return matricesZone;
}

function actualizarAtributosTabla(table) {
    if (!table) return;
    Array.from(table.rows).forEach((row, i) => {
        Array.from(row.cells).forEach((cell, j) => {
            const editable = cell.querySelector(".cell-input, .cell-span");
            if (editable) {
                editable.dataset.row = String(i);
                editable.dataset.col = String(j);
                editable.setAttribute("data-row", String(i));
                editable.setAttribute("data-col", String(j));
                editable.setAttribute("aria-label", `Celda ${i + 1}, ${j + 1}`);
            }
        });
    });
}

function obtenerEditable(cell) {
    return cell?.querySelector(".cell-input, .cell-span") || null;
}

function enfocarCelda(table, rowIndex, colIndex) {
    if (!table) return;
    const row = table.rows[Math.max(0, Math.min(rowIndex, table.rows.length - 1))];
    if (!row) return;
    const col = Math.max(0, Math.min(colIndex, row.cells.length - 1));
    const editable = obtenerEditable(row.cells[col]);
    if (!editable) return;

    if (editable.classList.contains("cell-span")) {
        const input = spanToInput(editable);
        if (input) input.select();
    } else {
        editable.focus();
        editable.select?.();
    }
}

function ajustarAnchoColumnaBasica(table, colIndex) {
    if (!table) return;
    const minWidth = 5;
    let maxChars = minWidth;

    Array.from(table.rows).forEach(row => {
        const editable = obtenerEditable(row.cells[colIndex]);
        if (!editable) return;
        const value = editable.classList.contains("cell-input")
            ? editable.value
            : editable.getAttribute("data-value") || "";
        maxChars = Math.max(maxChars, value.length + 1);
    });

    Array.from(table.rows).forEach(row => {
        const editable = obtenerEditable(row.cells[colIndex]);
        if (!editable) return;
        editable.style.width = `${maxChars}ch`;
        editable.style.minWidth = `${maxChars}ch`;
    });
}

function ajustarTodasColumnasBasicas(table) {
    if (!table?.rows.length) return;
    const cols = table.rows[0].cells.length;
    for (let j = 0; j < cols; j++) ajustarAnchoColumnaBasica(table, j);
}

function insertarFilaBasica(table, rowIndex, colIndex) {
    const columnas = table.rows[0].cells.length;
    const nuevaFila = table.insertRow(rowIndex + 1);
    for (let j = 0; j < columnas; j++) {
        const td = document.createElement("td");
        td.appendChild(crearSpanCelda("", rowIndex + 1, j));
        nuevaFila.appendChild(td);
    }
    actualizarAtributosTabla(table);
    ajustarTodasColumnasBasicas(table);
    setTimeout(() => enfocarCelda(table, rowIndex + 1, colIndex), 10);
}

function insertarColumnaBasica(table, rowIndex, colIndex) {
    Array.from(table.rows).forEach((row, i) => {
        const td = row.insertCell(colIndex + 1);
        td.appendChild(crearSpanCelda("", i, colIndex + 1));
    });
    actualizarAtributosTabla(table);
    ajustarTodasColumnasBasicas(table);
    setTimeout(() => enfocarCelda(table, rowIndex, colIndex + 1), 10);
}

function celdaVacia(cell) {
    const input = cell?.querySelector(".cell-input");
    const span = cell?.querySelector(".cell-span");
    if (input) return input.value.trim() === "";
    if (span) return (span.getAttribute("data-value") || "") === "";
    return true;
}

function filaVacia(table, rowIndex) {
    const row = table.rows[rowIndex];
    if (!row) return false;
    return Array.from(row.cells).every(celdaVacia);
}

function columnaVacia(table, colIndex) {
    return Array.from(table.rows).every(row => celdaVacia(row.cells[colIndex]));
}

function eliminarFilaBasica(table, rowIndex) {
    if (table.rows.length <= 1) return false;
    table.deleteRow(rowIndex);
    actualizarAtributosTabla(table);
    return true;
}

function eliminarColumnaBasica(table, colIndex) {
    if (!table.rows.length || table.rows[0].cells.length <= 1) return false;
    Array.from(table.rows).forEach(row => row.deleteCell(colIndex));
    actualizarAtributosTabla(table);
    return true;
}

function revisarBorradoEstructural(table, rowIndex, colIndex) {
    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (filaVacia(table, rowIndex) && eliminarFilaBasica(table, rowIndex)) {
        targetRow = Math.max(0, rowIndex - 1);
    }

    if (columnaVacia(table, colIndex) && eliminarColumnaBasica(table, colIndex)) {
        targetCol = Math.max(0, colIndex - 1);
    }

    ajustarTodasColumnasBasicas(table);
    setTimeout(() => enfocarCelda(table, targetRow, targetCol), 10);
}

function finalizarEntrada(input) {
    if (!input || !input.classList.contains("cell-input")) return;
    const table = input.closest("table");
    const cell = input.closest("td");
    const col = cell?.cellIndex ?? 0;
    inputToSpan(input);
    ajustarAnchoColumnaBasica(table, col);
}

function moverDesde(table, rowIndex, colIndex, deltaRow, deltaCol) {
    const targetRow = rowIndex + deltaRow;
    const targetCol = colIndex + deltaCol;
    if (targetRow < 0 || targetRow >= table.rows.length) return;
    if (targetCol < 0 || targetCol >= table.rows[targetRow].cells.length) return;
    enfocarCelda(table, targetRow, targetCol);
}

function limpiarValorSpan(span) {
    span.setAttribute("data-value", "");
    span.innerHTML = "";
    span.textContent = "";
}

function manejarKeydownBasicas(event, article) {
    const target = event.target;
    const table = target.closest?.(".basic-input-table");

    if (event.ctrlKey && event.key === "Enter") {
        const btn = document.getElementById("btnCalcularBasica");
        if (btn) btn.click();
        return;
    }

    if (!table) return;

    const cell = target.closest("td");
    const row = cell?.parentElement;
    if (!cell || !row) return;

    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    if (["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
    }

    if (target.classList.contains("cell-span")) {
        if (event.key === "Enter") {
            insertarFilaBasica(table, rowIndex, colIndex);
            return;
        }
        if (event.key === " ") {
            insertarColumnaBasica(table, rowIndex, colIndex);
            return;
        }
        if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            limpiarValorSpan(target);
            revisarBorradoEstructural(table, rowIndex, colIndex);
            return;
        }
        if (event.key === "ArrowLeft") return moverDesde(table, rowIndex, colIndex, 0, -1);
        if (event.key === "ArrowRight") return moverDesde(table, rowIndex, colIndex, 0, 1);
        if (event.key === "ArrowUp") return moverDesde(table, rowIndex, colIndex, -1, 0);
        if (event.key === "ArrowDown") return moverDesde(table, rowIndex, colIndex, 1, 0);

        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(event.key)) return;
            const input = spanToInput(target);
            if (input) {
                input.value = event.key;
                input.setSelectionRange(1, 1);
            }
        }
        return;
    }

    if (!target.classList.contains("cell-input")) return;

    if (event.key === "Enter") {
        finalizarEntrada(target);
        insertarFilaBasica(table, rowIndex, colIndex);
        return;
    }

    if (event.key === " ") {
        finalizarEntrada(target);
        insertarColumnaBasica(table, rowIndex, colIndex);
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        finalizarEntrada(target);
        if (colIndex < row.cells.length - 1) enfocarCelda(table, rowIndex, colIndex + 1);
        else if (rowIndex < table.rows.length - 1) enfocarCelda(table, rowIndex + 1, 0);
        else document.getElementById("btnCalcularBasica")?.focus();
        return;
    }

    if (event.key === "Escape") {
        finalizarEntrada(target);
        target.blur();
        return;
    }

    if (event.key === "ArrowLeft") return moverDesde(table, rowIndex, colIndex, 0, -1);
    if (event.key === "ArrowRight") return moverDesde(table, rowIndex, colIndex, 0, 1);
    if (event.key === "ArrowUp") return moverDesde(table, rowIndex, colIndex, -1, 0);
    if (event.key === "ArrowDown") return moverDesde(table, rowIndex, colIndex, 1, 0);

    if ((event.key === "Backspace" || event.key === "Delete") && target.value === "") {
        event.preventDefault();
        const span = crearSpanCelda("", rowIndex, colIndex);
        target.replaceWith(span);
        revisarBorradoEstructural(table, rowIndex, colIndex);
    }
}

function sanitizarValor(valor) {
    let limpio = valor.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    limpio = limpio.replace(/[^0-9\-\/.]/g, "");

    const partes = limpio.split("/");
    if (partes.length > 2) limpio = partes[0] + "/" + partes.slice(1).join("").replace(/\//g, "");

    const normalizarPuntos = texto => {
        const pedazos = texto.split(".");
        return pedazos.length <= 2 ? texto : pedazos[0] + "." + pedazos.slice(1).join("");
    };

    const limpiarParte = texto => {
        texto = normalizarPuntos(texto || "");
        const esNegativo = texto.startsWith("-");
        texto = texto.replace(/-/g, "");
        return `${esNegativo ? "-" : ""}${texto}`;
    };

    if (limpio.includes("/")) {
        const [num, den = ""] = limpio.split("/");
        limpio = `${limpiarParte(num)}/${limpiarParte(den)}`;
    } else {
        limpio = limpiarParte(limpio);
    }

    return limpio;
}

function manejarInputBasicas(event) {
    const input = event.target;
    if (!input.classList?.contains("cell-input")) return;
    if (input.id === "basicScalar") {
        input.value = sanitizarValor(input.value);
        input.style.width = `${Math.max(5, input.value.length + 1)}ch`;
        return;
    }

    const table = input.closest(".basic-input-table");
    if (!table) return;
    input.value = sanitizarValor(input.value);
    input.style.width = `${Math.max(5, input.value.length + 1)}ch`;
    const cell = input.closest("td");
    ajustarAnchoColumnaBasica(table, cell?.cellIndex ?? 0);
}

function manejarClickBasicas(event) {
    const section = event.currentTarget;
    const target = event.target;
    const clickedCell = target.closest?.("td");

    section.querySelectorAll(".basic-input-table .cell-input").forEach(input => {
        if (input.closest("td") !== clickedCell) finalizarEntrada(input);
    });

    const span = target.classList?.contains("cell-span") ? target : target.closest?.(".cell-span");
    if (span && span.closest(".basic-input-table")) {
        event.preventDefault();
        spanToInput(span);
    }
}

function manejarBeforeInputBasicas(event) {
    const input = event.target;
    if (!input.classList?.contains("cell-input")) return;
    const table = input.closest(".basic-input-table");
    if (!table) return;

    const data = event.data || "";
    if (!/\s/.test(data)) return;

    event.preventDefault();
    const cell = input.closest("td");
    const row = cell?.parentElement;
    if (!cell || !row) return;
    finalizarEntrada(input);
    insertarColumnaBasica(table, row.rowIndex, cell.cellIndex);
}

function configurarEventosBasicas(section) {
    section.addEventListener("keydown", event => manejarKeydownBasicas(event, section));
    section.addEventListener("input", manejarInputBasicas);
    section.addEventListener("click", manejarClickBasicas);
    section.addEventListener("beforeinput", manejarBeforeInputBasicas);
}

function finalizarTodasLasEntradas() {
    document.querySelectorAll("#mainSection .basic-input-table .cell-input").forEach(finalizarEntrada);
}

function leerMatriz(id, nombre) {
    const table = document.getElementById(id);
    if (!table) throw new Error(`No se encontró la matriz ${nombre}.`);

    return Array.from(table.rows).map((row, rowIndex) =>
        Array.from(row.cells).map((cell, colIndex) => {
            const input = cell.querySelector("input");
            const span = cell.querySelector(".cell-span");
            const valor = (input?.value ?? span?.getAttribute("data-value") ?? span?.textContent ?? "").trim();
            const valorFinal = valor === "" ? "0" : valor;

            if (!Auxiliares.esValorNumericoValido(valorFinal, true)) {
                throw new Error(`El valor de la matriz ${nombre} en la fila ${rowIndex + 1}, columna ${colIndex + 1} no es válido. Escribe un número, decimal o fracción con denominador distinto de cero.`);
            }

            return normalizarSigno(Auxiliares.parsearFraccion(valorFinal));
        })
    );
}

function dimensiones(matriz) {
    return {
        filas: matriz.length,
        columnas: matriz[0]?.length || 0
    };
}

function crearFraccionHTML(valor) {
    const str = Auxiliares.fraccionToString(valor);
    if (!str.includes("/")) return str;
    const [num, den] = str.split("/");
    return `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
}

function mostrarResultado(article, titulo, labelText, matriz) {
    document.getElementById("resultSection")?.remove();

    const result = UI.createSection("resultSection", titulo);
    const wrapper = document.createElement("div");
    wrapper.className = "result-wrapper";

    const label = document.createElement("div");
    label.className = "result-label";
    label.textContent = labelText;

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "result-matrix-container";

    const table = document.createElement("table");
    table.className = "result-table";

    matriz.forEach(fila => {
        const tr = document.createElement("tr");
        fila.forEach(valor => {
            const td = document.createElement("td");
            td.innerHTML = crearFraccionHTML(valor);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    matrixContainer.appendChild(table);
    wrapper.append(label, matrixContainer);
    result.appendChild(wrapper);
    article.appendChild(result);
}

function mostrarError(article, mensaje) {
    document.getElementById("resultSection")?.remove();

    const result = UI.createSection("resultSection", "ERROR");
    const error = document.createElement("div");
    error.className = "resultado-mensaje mensaje-error";
    error.textContent = `Error: ${mensaje}`;
    result.appendChild(error);
    article.appendChild(result);
}

function limpiarMatricesBasicas() {
    document.querySelectorAll("#mainSection .basic-input-table .cell-input, #mainSection .basic-input-table .cell-span").forEach(celda => {
        if (celda.classList.contains("cell-input")) {
            celda.value = "";
        } else {
            celda.setAttribute("data-value", "");
            celda.innerHTML = "";
            celda.textContent = "";
        }
    });

    const scalar = document.getElementById("basicScalar");
    if (scalar) {
        scalar.value = "";
        scalar.style.width = "5ch";
    }
    document.querySelectorAll("#mainSection .basic-input-table").forEach(ajustarTodasColumnasBasicas);
    document.getElementById("resultSection")?.remove();

    const firstTable = document.querySelector("#mainSection .basic-input-table");
    if (firstTable) setTimeout(() => enfocarCelda(firstTable, 0, 0), 20);
}

function renderBasicas(article, modo) {
    limpiar(article);

    const mainSection = UI.createSection("mainSection", TITULOS[modo] || "OPERACIONES BÁSICAS");
    mainSection.classList.add("basic-section");

    const matricesZone = crearVistaMatrices(modo);

    const actions = document.createElement("div");
    actions.className = "basic-actions";

    const btnCalcular = UI.createButton("btnCalcularBasica", "Calcular", "btnCalcular");
    btnCalcular.type = "button";
    const btnLimpiar = UI.createButton("btnLimpiarBasica", "Borrar matrices", "btnCalcular btnLimpiarEV");
    btnLimpiar.type = "button";

    actions.append(btnCalcular, btnLimpiar);
    mainSection.append(matricesZone, actions);
    article.appendChild(mainSection);

    configurarEventosBasicas(mainSection);

    const firstTable = mainSection.querySelector(".basic-input-table");
    if (firstTable) setTimeout(() => enfocarCelda(firstTable, 0, 0), 30);

    btnLimpiar.addEventListener("click", limpiarMatricesBasicas);

    btnCalcular.addEventListener("click", () => {
        try {
            finalizarTodasLasEntradas();

            let resultado;
            let label = "R =";
            const A = leerMatriz("basicMatrixA", "A");

            if (modo === "suma") {
                const B = leerMatriz("basicMatrixB", "B");
                validarDimensionesMatrices(modo, A, B);
                resultado = sumarMatrices(A, B);
            } else if (modo === "resta") {
                const B = leerMatriz("basicMatrixB", "B");
                validarDimensionesMatrices(modo, A, B);
                resultado = restarMatrices(A, B);
            } else if (modo === "multiplicacion") {
                const B = leerMatriz("basicMatrixB", "B");
                validarDimensionesMatrices(modo, A, B);
                resultado = multiplicarMatrices(A, B);
            } else if (modo === "escalar") {
                const valorEscalar = document.getElementById("basicScalar")?.value.trim() || "";
                if (valorEscalar === "") {
                    throw new Error("El escalar k no puede estar vacío. Escribe un número, decimal o fracción con denominador distinto de cero.");
                }
                if (!Auxiliares.esValorNumericoValido(valorEscalar, false)) {
                    throw new Error("El escalar k no es válido. Escribe un número, decimal o fracción con denominador distinto de cero.");
                }
                resultado = multiplicarMatrizPorEscalar(A, Auxiliares.parsearFraccion(valorEscalar));
                label = "kA =";
            }

            mostrarResultado(article, `RESULTADO ${TITULOS[modo]}`, label, resultado);
        } catch (error) {
            mostrarError(article, error.message);
        }
    });
}
