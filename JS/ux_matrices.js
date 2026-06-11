import UI, { createSection } from "./ui.js";
import Auxiliares from "./auxiliares.js";
import { resolverAXB, resolverInv, calcularDet } from "./calculos.js";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js";
import { configurarEventos, ajustarAnchoColumna } from "./eventos_celdas.js";

let currentOperation = "axb";
let currentMatrixState = null;

// EXPORTAR estas funciones para que eventos.js pueda usarlas
export function actualizarSeparadorGlobal(table) {
    if (!table || !table.rows.length) return;
    eliminarSeparadorGlobal(table);
    const sep = table.rows[0].cells.length - 2;
    if (sep >= 0) {
        requestAnimationFrame(() => {
            for (let row of table.rows) {
                const cell = row.cells[sep];
                if (cell) {
                    cell.style.borderRight = "2px solid var(--primary)";
                    cell.classList.add("separator");
                }
            }
        });
    }
}

export function eliminarSeparadorGlobal(table) {
    if (!table) return;
    for (let row of table.rows) {
        for (let cell of row.cells) {
            cell.style.borderRight = "";
            cell.classList.remove("separator");
        }
    }
}

export function getCurrentOperation() {
    return currentOperation;
}

export function setCurrentOperation(op) {
    currentOperation = op;
}

function obtenerDimensionesInicialesMatriz(modo = currentOperation) {
    if (modo === "axb") return [2, 3];
    if (modo === "inversa" || modo === "determinante") return [2, 2];
    return [2, 2];
}

function reconstruirMatrizVacia(table, modo = currentOperation) {
    if (!table) return;

    const [filas, columnas] = obtenerDimensionesInicialesMatriz(modo);
    table.innerHTML = "";

    table.dataset.minRows = modo === "axb" ? "2" : "1";
    table.dataset.minCols = modo === "axb" ? "3" : "1";

    for (let i = 0; i < filas; i++) {
        const row = UI.createRow(`row${i}`);
        for (let j = 0; j < columnas; j++) {
            const cell = UI.createTd(`cell${i}${j}`);
            cell.appendChild(crearSpanCelda("", i, j));
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
}

function enfocarPrimeraCeldaMatriz(table) {
    const firstSpan = table?.querySelector(".cell-span");
    if (!firstSpan) return;

    const input = spanToInput(firstSpan);
    if (input) {
        input.focus();
        input.select();
    }
}

// En ux_matrices.js, modifica la función inicializarMatriz:

export function inicializarMatriz(article, modo) {
    currentOperation = modo;
    limpiar(article);

    const mainSection = UI.createSection("mainSection", "MATRIZ");
    const wrapper = UI.createDiv("wrapperA");
    const label = UI.createLabel("A=");
    const divTable = UI.createDiv("tableMain");
    const table = UI.createTable("inputTable");

    let [filasIniciales, columnasIniciales] = [2, 2];

    if (modo === "axb") {
        [filasIniciales, columnasIniciales] = [2, 3];
        table.dataset.minRows = "2";
        table.dataset.minCols = "3";
    } else if (modo === "inversa") {
        [filasIniciales, columnasIniciales] = [2, 2];
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
    } else if (modo === "determinante") {
        [filasIniciales, columnasIniciales] = [2, 2];
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
    }

    for (let i = 0; i < filasIniciales; i++) {
        const row = UI.createRow(`row${i}`);
        for (let j = 0; j < columnasIniciales; j++) {
            const cell = UI.createTd(`cell${i}${j}`);
            const span = crearSpanCelda("", i, j);
            cell.appendChild(span);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    divTable.appendChild(table);
    wrapper.appendChild(label);
    wrapper.appendChild(divTable);

    let buttonText = "";
    if (modo === "axb") buttonText = "Calcular AX = B";
    else if (modo === "inversa") buttonText = "Calcular Inversa";
    else if (modo === "determinante") buttonText = "Calcular Determinante";

    const button = UI.createButton("btnCalcular", buttonText, "btnCalcular");
    const btnLimpiar = UI.createButton("btnLimpiarMatriz", "Borrar matriz", "btnCalcular btnLimpiarEV");
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "matrix-actions";
    buttonGroup.append(button, btnLimpiar);

    mainSection.appendChild(wrapper);
    mainSection.appendChild(buttonGroup);
    article.appendChild(mainSection);

    // PRIMERO configurar eventos, después actualizar el separador
    configurarEventos(article, table, modo);

    if (modo === "axb") actualizarSeparadorGlobal(table);
    else eliminarSeparadorGlobal(table);

    const btnCalcular = document.getElementById("btnCalcular");
    const btnLimpiarMatriz = document.getElementById("btnLimpiarMatriz");

    if (btnLimpiarMatriz) {
        // Remover eventos anteriores antes de agregar nuevos
        const newBtnLimpiar = btnLimpiarMatriz.cloneNode(true);
        btnLimpiarMatriz.parentNode.replaceChild(newBtnLimpiar, btnLimpiarMatriz);
        newBtnLimpiar.onclick = () => limpiarMatrizActual(table);
    }

    if (modo === "axb") {
        if (btnCalcular) {
            const newBtn = btnCalcular.cloneNode(true);
            btnCalcular.parentNode.replaceChild(newBtn, btnCalcular);
            newBtn.onclick = () => {
                ajustarTodaLaTabla(table); 
                calcularSistemasEcuaciones();
            };
        }
    } else if (modo === "inversa") {
        if (btnCalcular) {
            const newBtn = btnCalcular.cloneNode(true);
            btnCalcular.parentNode.replaceChild(newBtn, btnCalcular);
            newBtn.onclick = () => {
                ajustarTodaLaTabla(table); 
                calcularInversa();
            };
        }
    } else if (modo === "determinante") {
        if (btnCalcular) {
            const newBtn = btnCalcular.cloneNode(true);
            btnCalcular.parentNode.replaceChild(newBtn, btnCalcular);
            newBtn.onclick = () => {
                ajustarTodaLaTabla(table); 
                calcularDeterminante();
            };
        }
    }
    
    // Enfocar la primera celda directamente (sin click artificial)
    const firstSpan = table.querySelector('.cell-span');
    if (firstSpan) {
        const firstInput = spanToInput(firstSpan);
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }
}

function ajustarTodaLaTabla(table) {
    if (!table || !table.rows.length) return;
    const numCols = table.rows[0].cells.length;
    for (let j = 0; j < numCols; j++) {
        ajustarAnchoColumna(table, j);
    }
}
export function cambiarModo(article, nuevoModo) {
    const table = document.getElementById("inputTable");

    if (table) {
        try {
            currentMatrixState = Auxiliares.parsearMatriz(table);
        } catch (error) {
            console.warn("No se pudo guardar el estado de la matriz:", error);
            currentMatrixState = null;
        }
    }

    if (!table) {
        inicializarMatriz(article, nuevoModo);
        return;
    }

    currentOperation = nuevoModo;
    const btn = document.getElementById("btnCalcular");

    if (nuevoModo === "axb") {
        btn.textContent = "Calcular AX = B";
        btn.onclick = calcularSistemasEcuaciones;
        table.dataset.minRows = "2";
        table.dataset.minCols = "3";
        actualizarSeparadorGlobal(table);
    } else if (nuevoModo === "inversa") {
        btn.textContent = "Calcular Inversa";
        btn.onclick = calcularInversa;
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
        eliminarSeparadorGlobal(table);
    } else if (nuevoModo === "determinante") {
        btn.textContent = "Calcular Determinante";
        btn.onclick = calcularDeterminante;
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
        eliminarSeparadorGlobal(table);
    }
}

// ========== LIMPIEZA ==========

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}

function limpiarResultados() {
    const prev = document.getElementById("resultSection");
    if (prev) prev.remove();
}

function limpiarMatrizActual(table) {
    if (!table) return;

    reconstruirMatrizVacia(table, currentOperation);
    ajustarTodaLaTabla(table);

    if (currentOperation === "axb") actualizarSeparadorGlobal(table);
    else eliminarSeparadorGlobal(table);

    limpiarResultados();
    setTimeout(() => enfocarPrimeraCeldaMatriz(table), 20);
}

function mostrarError(container, mensaje) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.style.cssText = "padding: 10px; background-color: #f8d7da; color: #721c24; border-radius: 5px; margin-top: 20px;";
    errorDiv.innerHTML = `<strong>Error:</strong> ${mensaje}`;
    container.appendChild(errorDiv);
}

// ========== FRACCIÓN HTML ==========

function crearFraccionHTML(valor, tieneDecimal = false) {
    if (tieneDecimal) return valor;
    const str = Auxiliares.fraccionToString(valor);
    if (!str.includes("/")) return str;
    const [num, den] = str.split("/");
    return `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
}

// ========== RESULTADOS ==========

function calcularSistemasEcuaciones() {
    limpiarResultados();
    const result = UI.createSection("resultSection", "RESULTADO AX = B");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        const allInputs = table.querySelectorAll('.cell-input');
        allInputs.forEach(input => inputToSpan(input));

        corregirSpans(table);

        const matriz = Auxiliares.parsearMatriz(table);
        const resultado = resolverAXB(matriz);
        const tieneDecimalesEnEntrada = matriz.some(fila => fila.some(celda => celda._tieneDecimal));

        const wrapper = document.createElement("div");
        wrapper.className = "result-wrapper";
        const label = document.createElement("div");
        label.className = "result-label";
        label.textContent = "A =";
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        const resultadoTable = UI.createTable("resultadoTable");
        resultadoTable.className = "result-table";
        const tieneVectorColumna = resultado[0] && resultado[0].length > 1;

        resultado.forEach((fila) => {
            const row = UI.createRow();
            fila.forEach((valor, colIndex) => {
                const cell = UI.createTd();
                const valorFormateado = Auxiliares.formatearResultado(valor, tieneDecimalesEnEntrada);
                if (tieneDecimalesEnEntrada) {
                    cell.textContent = valorFormateado;
                } else {
                    cell.innerHTML = crearFraccionHTML(valor, false);
                }
                if (tieneVectorColumna && colIndex === fila.length - 2) cell.classList.add("separator-col");
                row.appendChild(cell);
            });
            resultadoTable.appendChild(row);
        });

        if (tieneVectorColumna) resultadoTable.classList.add("separator-mode");
        matrixContainer.appendChild(resultadoTable);
        wrapper.appendChild(label);
        wrapper.appendChild(matrixContainer);
        result.appendChild(wrapper);
        article.appendChild(result);
    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}

function calcularInversa() {
    limpiarResultados();
    const result = UI.createSection("resultSection", "RESULTADO INVERSA");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        const allInputs = table.querySelectorAll('.cell-input');
        allInputs.forEach(input => inputToSpan(input));
        corregirSpans(table);

        const matriz = Auxiliares.parsearMatriz(table);
        const n = matriz.length;
        if (!matriz.every(fila => fila.length === n)) throw new Error("La matriz debe ser cuadrada");

        const resultado = resolverInv(matriz);
        const tieneDecimalesEnEntrada = matriz.some(fila => fila.some(celda => celda._tieneDecimal));

        const wrapper = document.createElement("div");
        wrapper.className = "result-wrapper";
        const label = document.createElement("div");
        label.className = "result-label";
        label.textContent = "A⁻¹ =";
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        const resultadoTable = UI.createTable("resultadoTable");
        resultadoTable.className = "result-table";

        resultado.forEach(fila => {
            const row = UI.createRow();
            fila.forEach(valor => {
                const cell = UI.createTd();
                const valorFormateado = Auxiliares.formatearResultado(valor, tieneDecimalesEnEntrada);
                cell[tieneDecimalesEnEntrada ? 'textContent' : 'innerHTML'] =
                    tieneDecimalesEnEntrada ? valorFormateado : crearFraccionHTML(valor, false);
                row.appendChild(cell);
            });
            resultadoTable.appendChild(row);
        });

        matrixContainer.appendChild(resultadoTable);
        wrapper.appendChild(label);
        wrapper.appendChild(matrixContainer);
        result.appendChild(wrapper);
        article.appendChild(result);
    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}

function calcularDeterminante() {
    limpiarResultados();
    const result = UI.createSection("resultSection", "RESULTADO DETERMINANTE");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        const allInputs = table.querySelectorAll('.cell-input');
        allInputs.forEach(input => inputToSpan(input));
        corregirSpans(table);

        const matriz = Auxiliares.parsearMatriz(table);
        const resultado = calcularDet(matriz);
        const tieneDecimalesEnEntrada = matriz.some(fila => fila.some(celda => celda._tieneDecimal));

        const wrapper = document.createElement("div");
        wrapper.className = "result-wrapper";
        const label = document.createElement("div");
        label.className = "result-label";
        label.innerHTML = "det(A) =";
        
        const container = document.createElement("div");
        container.className = "det-container";
        const content = document.createElement("div");
        content.className = "det-content";
        const step1 = document.createElement("div");
        step1.className = "det-step";

        const factoresContainer = document.createElement("span");
        factoresContainer.className = "det-factores";
        factoresContainer.style.display = "inline-flex";
        factoresContainer.style.alignItems = "center";
        factoresContainer.style.gap = "2px";

        resultado.historialFactores.forEach(f => {
            const spanFactor = document.createElement("span");
            spanFactor.className = "factor-item";
            spanFactor.style.display = "inline-flex";
            spanFactor.style.alignItems = "center";
            
            if (f === -1) {
                spanFactor.textContent = "(-1)";
            } else {
                const contenidoFactor = tieneDecimalesEnEntrada
                    ? Auxiliares.formatearResultado(f, true)
                    : crearFraccionHTML(f, false);

                spanFactor.innerHTML = `(${contenidoFactor})`;
            }
            factoresContainer.appendChild(spanFactor);
        });

        const mult = document.createElement("span");
        mult.className = "det-mult";
        mult.textContent = " ";
        
        const matrixWrapper = document.createElement("div");
        matrixWrapper.className = "det-matrix-wrapper";
        const tableMatrix = UI.createTable();
        tableMatrix.className = "result-table det-matrix";

        resultado.matrizFinal.forEach((fila, i) => {
            const row = UI.createRow();
            fila.forEach((valor, j) => {
                const cell = UI.createTd();
                if (tieneDecimalesEnEntrada) {
                    cell.textContent = Auxiliares.formatearResultado(valor, true);
                } else {
                    cell.innerHTML = crearFraccionHTML(valor, false);
                }
                if (i === j) cell.classList.add("diagonal-cell");
                row.appendChild(cell);
            });
            tableMatrix.appendChild(row);
        });

        matrixWrapper.appendChild(tableMatrix);
        step1.append(factoresContainer, mult, matrixWrapper);
        
        const equal = document.createElement("span");
        equal.className = "det-equal";
        equal.textContent = "=";
        
        const value = document.createElement("span");
        value.className = "det-result-value";
        
        const resFinal = tieneDecimalesEnEntrada ? Auxiliares.formatearResultado(resultado.determinante, true) : crearFraccionHTML(resultado.determinante, false);
            
        value.innerHTML = (typeof resFinal === 'object') ? resFinal.outerHTML : resFinal;

        content.append(step1, equal, value);
        container.appendChild(content);
        wrapper.append(label, container);
        result.appendChild(wrapper);
        article.appendChild(result);
    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}

function corregirSpans(table) {
    const spans = table.querySelectorAll('.cell-span');
    spans.forEach(span => {
        let v = span.getAttribute('data-value') || '';
        if (v === '') {
            span.setAttribute('data-value', '0');
            span.textContent = '0';
            return;
        }
        if (/^\/\d+\.?\d*$/.test(v)) {
            v = `1${v}`;
            span.setAttribute('data-value', v);
        }
        if (Auxiliares.esFraccion(v)) {
            if (Auxiliares.tieneDecimales(v)) {
                const [num, den] = v.split("/");
                span.setAttribute('data-value', v);
                span.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
            } else {
                const fraccion = Auxiliares.parsearFraccion(v);
                const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
                const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
                span.setAttribute('data-value', valorSimplificado);
                if (denSimp === 1) {
                    span.textContent = numSimp;
                } else {
                    span.innerHTML = `<span class="frac"><span class="top">${numSimp}</span><span class="bottom">${denSimp}</span></span>`;
                }
            }
        }
    });
}
