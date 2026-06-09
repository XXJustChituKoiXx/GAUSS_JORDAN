import UI from "./ui.js";
import Auxiliares, { multiplicarFracciones, sumarFraccionesObj, restarFracciones, normalizarSigno } from "./auxiliares.js";

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

function crearCampoDimension(id, label, value = 2, min = 1, max = 8) {
    const group = document.createElement("label");
    group.className = "basic-dim-field";
    group.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);

    group.appendChild(input);
    return group;
}

function obtenerDimension(id, fallback = 2) {
    const input = document.getElementById(id);
    const valor = Number(input?.value || fallback);
    if (!Number.isInteger(valor) || valor < 1) return fallback;
    return Math.min(valor, 8);
}

function crearCeldaInput(row, col) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "basic-cell-input";
    input.value = "0";
    input.inputMode = "decimal";
    input.dataset.row = String(row);
    input.dataset.col = String(col);
    input.setAttribute("aria-label", `Celda ${row + 1}, ${col + 1}`);
    return input;
}

function crearMatrizEditable(id, labelText, filas, columnas) {
    const card = document.createElement("div");
    card.className = "basic-matrix-card";

    const label = document.createElement("div");
    label.className = "basic-matrix-label";
    label.textContent = labelText;

    const container = document.createElement("div");
    container.className = "basic-matrix-container";

    const table = document.createElement("table");
    table.id = id;
    table.className = "basic-input-table";

    for (let i = 0; i < filas; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < columnas; j++) {
            const td = document.createElement("td");
            td.appendChild(crearCeldaInput(i, j));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    container.appendChild(table);
    card.append(label, container);
    return card;
}

function leerMatriz(id) {
    const table = document.getElementById(id);
    if (!table) throw new Error("No se encontró la matriz de entrada");

    return Array.from(table.rows).map((row, rowIndex) =>
        Array.from(row.cells).map((cell, colIndex) => {
            const input = cell.querySelector("input");
            const valor = input?.value.trim() || "0";
            if (!Auxiliares.esValorNumericoValido(valor, true)) {
                throw new Error(`Valor inválido en la celda (${rowIndex + 1}, ${colIndex + 1})`);
            }
            return normalizarSigno(Auxiliares.parsearFraccion(valor));
        })
    );
}

function crearFraccionHTML(valor) {
    const str = Auxiliares.fraccionToString(valor);
    if (!str.includes("/")) return str;
    const [num, den] = str.split("/");
    return `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
}

function mostrarResultado(article, titulo, labelText, matriz) {
    const prev = document.getElementById("resultSection");
    if (prev) prev.remove();

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
    const prev = document.getElementById("resultSection");
    if (prev) prev.remove();

    const result = UI.createSection("resultSection", "ERROR");
    const error = document.createElement("div");
    error.className = "error-message";
    error.innerHTML = `<strong>Error:</strong> ${mensaje}`;
    result.appendChild(error);
    article.appendChild(result);
}

function sumarMatrices(A, B) {
    return A.map((fila, i) => fila.map((valor, j) => normalizarSigno(sumarFraccionesObj(valor, B[i][j]))));
}

function restarMatrices(A, B) {
    return A.map((fila, i) => fila.map((valor, j) => normalizarSigno(restarFracciones(valor, B[i][j]))));
}

function multiplicarMatrices(A, B) {
    const filasA = A.length;
    const columnasA = A[0].length;
    const columnasB = B[0].length;
    const resultado = [];

    for (let i = 0; i < filasA; i++) {
        const fila = [];
        for (let j = 0; j < columnasB; j++) {
            let suma = { num: 0, den: 1 };
            for (let k = 0; k < columnasA; k++) {
                suma = sumarFraccionesObj(suma, multiplicarFracciones(A[i][k], B[k][j]));
            }
            fila.push(normalizarSigno(suma));
        }
        resultado.push(fila);
    }

    return resultado;
}

function multiplicarPorEscalar(A, escalar) {
    return A.map(fila => fila.map(valor => normalizarSigno(multiplicarFracciones(valor, escalar))));
}

function crearPanelDimensiones(modo) {
    const panel = document.createElement("div");
    panel.className = "basic-dim-panel";

    if (modo === "multiplicacion") {
        panel.append(
            crearCampoDimension("filasA", "Filas A", 2),
            crearCampoDimension("colsA", "Columnas A / Filas B", 2),
            crearCampoDimension("colsB", "Columnas B", 2)
        );
    } else {
        panel.append(
            crearCampoDimension("filas", "Filas", 2),
            crearCampoDimension("cols", "Columnas", 2)
        );
    }

    const btnCrear = UI.createButton("btnCrearBasicas", "Actualizar matrices", "btnBasicasSecundario");
    btnCrear.type = "button";
    panel.appendChild(btnCrear);

    return panel;
}

function crearVistaMatrices(modo) {
    const matricesZone = document.createElement("div");
    matricesZone.id = "basicMatricesZone";
    matricesZone.className = "basic-matrices-zone";

    if (modo === "multiplicacion") {
        const filasA = obtenerDimension("filasA", 2);
        const colsA = obtenerDimension("colsA", 2);
        const colsB = obtenerDimension("colsB", 2);
        matricesZone.append(
            crearMatrizEditable("basicMatrixA", "A", filasA, colsA),
            crearOperadorVisual("×"),
            crearMatrizEditable("basicMatrixB", "B", colsA, colsB)
        );
    } else if (modo === "escalar") {
        const filas = obtenerDimension("filas", 2);
        const cols = obtenerDimension("cols", 2);
        matricesZone.append(
            crearEscalarVisual(),
            crearOperadorVisual("×"),
            crearMatrizEditable("basicMatrixA", "A", filas, cols)
        );
    } else {
        const filas = obtenerDimension("filas", 2);
        const cols = obtenerDimension("cols", 2);
        matricesZone.append(
            crearMatrizEditable("basicMatrixA", "A", filas, cols),
            crearOperadorVisual(modo === "suma" ? "+" : "−"),
            crearMatrizEditable("basicMatrixB", "B", filas, cols)
        );
    }

    return matricesZone;
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
    label.textContent = "k";

    const input = document.createElement("input");
    input.id = "basicScalar";
    input.className = "basic-cell-input basic-scalar-input";
    input.type = "text";
    input.value = "1";
    input.inputMode = "decimal";

    card.append(label, input);
    return card;
}

function renderBasicas(article, modo) {
    limpiar(article);

    const mainSection = UI.createSection("mainSection", TITULOS[modo] || "OPERACIONES BÁSICAS");
    const description = document.createElement("p");
    description.className = "basic-description";
    description.textContent = "Escribe números enteros, decimales o fracciones. Usa el panel para ajustar las dimensiones.";

    const panel = crearPanelDimensiones(modo);
    const matricesZone = crearVistaMatrices(modo);

    const actions = document.createElement("div");
    actions.className = "basic-actions";

    const btnCalcular = UI.createButton("btnCalcularBasica", "Calcular", "btnCalcular");
    btnCalcular.type = "button";
    const btnLimpiar = UI.createButton("btnLimpiarBasica", "Borrar matrices", "btnCalcular btnLimpiarEV");
    btnLimpiar.type = "button";

    actions.append(btnCalcular, btnLimpiar);
    mainSection.append(description, panel, matricesZone, actions);
    article.appendChild(mainSection);

    document.getElementById("btnCrearBasicas")?.addEventListener("click", () => {
        const oldZone = document.getElementById("basicMatricesZone");
        oldZone?.replaceWith(crearVistaMatrices(modo));
    });

    btnLimpiar.addEventListener("click", () => {
        document.querySelectorAll(".basic-cell-input").forEach(input => {
            input.value = input.id === "basicScalar" ? "1" : "0";
        });
        document.getElementById("resultSection")?.remove();
    });

    btnCalcular.addEventListener("click", () => {
        try {
            let resultado;
            let label = "R =";

            if (modo === "suma") {
                resultado = sumarMatrices(leerMatriz("basicMatrixA"), leerMatriz("basicMatrixB"));
            } else if (modo === "resta") {
                resultado = restarMatrices(leerMatriz("basicMatrixA"), leerMatriz("basicMatrixB"));
            } else if (modo === "multiplicacion") {
                resultado = multiplicarMatrices(leerMatriz("basicMatrixA"), leerMatriz("basicMatrixB"));
            } else if (modo === "escalar") {
                const valorEscalar = document.getElementById("basicScalar")?.value.trim() || "1";
                if (!Auxiliares.esValorNumericoValido(valorEscalar, true)) throw new Error("El escalar no es válido");
                resultado = multiplicarPorEscalar(leerMatriz("basicMatrixA"), Auxiliares.parsearFraccion(valorEscalar));
                label = "kA =";
            }

            mostrarResultado(article, `RESULTADO ${TITULOS[modo]}`, label, resultado);
        } catch (error) {
            mostrarError(article, error.message);
        }
    });
}
