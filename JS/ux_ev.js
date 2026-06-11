import UI from "./ui.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_celdas.js";
import Auxiliares from "./auxiliares.js?v=16";
import { clasificarLIoLD, perteneceAS, hallarBase, completarBase, ortogonalizar, matrizCambioBase } from "./calculos.js";
import { initDragAndDropEV, setEVCallbacks, clearEVFileData } from "./dragDropEV.js?v=16";
import { crearSpanCelda, spanToInput, inputToSpan, setEVMode, ajustarTodasColumnasEV, actualizarBotonCalcularEV, validarCamposEV } from "./celdas.js?v=16";

let currentOperation = "li";
let vectoresHorizontales = [["", ""], ["", ""]];
let tablaVectores = null;
let currentRow = 0;
let currentCol = 0;
let savedVectoresState = null;

function validarEstadoActualEV() {
    if (!tablaVectores) return false;
    const hayErrores = validarCamposEV(tablaVectores);
    actualizarBotonCalcularEV();
    return hayErrores;
}

export function cambiarOperacionEV(article, modo) {
    guardarVectoresDesdeTabla();
    if (vectoresHorizontales && vectoresHorizontales.length > 0) {
        savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
    }
    currentOperation = modo;
    inicializarEV(article, modo, true);
    setTimeout(() => validarEstadoActualEV(), 30);
}

export function inicializarEV(article, modo, preserveState = false) {
    desconfigurarEventosEV();
    currentOperation = modo;
    clearEVFileData();

    if (modo === "cambio-base") {
        setEVMode(false);
        tablaVectores = null;
        limpiar(article);
        renderCambioBase(article);
        return;
    }

    setEVMode(true);
    setEVCallbacks((vectores, fileName) => {
        if (vectores === null) {
            return;
        }

        vectoresHorizontales = JSON.parse(JSON.stringify(vectores));
        savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));

        construirFilasVectores();
        sincronizarMatrizDesdeVectores();
        setTimeout(() => validarEstadoActualEV(), 20);

        // Enfocar la primera celda
        setTimeout(() => {
            if (tablaVectores) {
                // Buscar la primera fila válida
                for (let i = 0; i < tablaVectores.rows.length; i++) {
                    const row = tablaVectores.rows[i];
                    const firstCell = row.cells[0];
                    if (firstCell && (firstCell.innerHTML.includes("α") || firstCell.innerHTML.includes("β"))) {
                        const span = row.querySelector('.cell-span');
                        if (span) span.click();
                        break;
                    }
                }
            }
        }, 50);
    });

    limpiar(article);

    const mainSection = UI.createSection("mainSection", "INGRESO DE VECTORES");
    const wrapperVectores = UI.createDiv("wrapperVectores");

    tablaVectores = UI.createTable("inputTable");
    tablaVectores.className = "ev-vector-table";
    tablaVectores.style.borderSpacing = "14px 18px";

    if (preserveState && savedVectoresState && savedVectoresState.length > 0) {
        vectoresHorizontales = JSON.parse(JSON.stringify(savedVectoresState));

        const esPertenecer = modo === "pertenecer";

        if (esPertenecer) {
            const numComp = vectoresHorizontales[0]?.length || 2;
            for (let i = 0; i < vectoresHorizontales.length; i++) {
                while (vectoresHorizontales[i].length < numComp) {
                    vectoresHorizontales[i].push("");
                }
            }
        } else {
            const numComp = vectoresHorizontales[0]?.length || 2;
            while (vectoresHorizontales.length < 2) {
                vectoresHorizontales.push(Array(numComp).fill(""));
            }
            for (let i = 0; i < vectoresHorizontales.length; i++) {
                while (vectoresHorizontales[i].length < numComp) {
                    vectoresHorizontales[i].push("");
                }
            }
        }
    } else {
        if (modo === "pertenecer") {
            vectoresHorizontales = [["", ""], ["", ""], ["", ""]];
        } else {
            vectoresHorizontales = [["", ""], ["", ""]];
        }
    }


    construirFilasVectores();

    wrapperVectores.appendChild(tablaVectores);
    mainSection.appendChild(wrapperVectores);
    article.appendChild(mainSection);

    const resultSection = UI.createSection("resultSection", "MATRIZ");
    const wrapperMatriz = document.createElement("div");
    wrapperMatriz.className = "result-wrapper";

    const label = document.createElement("div");
    label.className = "result-label";
    label.textContent = "V =";

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "result-matrix-container";

    const matrizTable = UI.createTable("matrizEVTable");
    matrizTable.className = "result-table";

    construirMatrizColumnas(matrizTable);

    matrixContainer.appendChild(matrizTable);
    wrapperMatriz.appendChild(label);
    wrapperMatriz.appendChild(matrixContainer);
    resultSection.appendChild(wrapperMatriz);

    const btnText = getBotonTexto(modo);
    const btnCalcular = UI.createButton("btnCalcularEV", btnText, "btnCalcular");
    btnCalcular.onclick = () => {
        guardarVectoresDesdeTabla();
        sincronizarMatrizDesdeVectores();

        if (validarEstadoActualEV()) {
            mostrarResultadoEV({
                esError: true,
                mensaje: "Corrige los valores marcados en rojo antes de calcular."
            }, currentOperation);
            return;
        }

        let resultado;

        try {
            const esPertenecer = currentOperation === "pertenecer";
            const matriz = Auxiliares.parsearVectoresAMatriz(vectoresHorizontales, !esPertenecer);

            switch (currentOperation) {
                case "li":
                    resultado = clasificarLIoLD(matriz);
                    break;
                case "pertenecer":
                    resultado = calcularPertenencia(matriz);
                    break;
                case "base":
                    resultado = hallarBase(matriz);
                    break;
                case "completar":
                    resultado = completarBase(matriz);
                    break;
                case "ortogonalizar":
                    resultado = ortogonalizar(matriz);
                    break;
            }
        } catch (error) {
            resultado = { esError: true, mensaje: error.message };
        }

        mostrarResultadoEV(resultado, currentOperation);
    };
    const botonesEV = document.createElement("div");
    botonesEV.className = "ev-buttons";
    botonesEV.appendChild(btnCalcular);

    const btnLimpiar = UI.createButton("btnLimpiarEV", "Borrar toda la matriz", "btnCalcular btnLimpiarEV");
    btnLimpiar.onclick = () => {
        limpiarTodoEV();
    };
    botonesEV.appendChild(btnLimpiar);

    resultSection.appendChild(botonesEV);

    article.appendChild(resultSection);

    configurarEventosEV(article, tablaVectores, {
        onSync: () => {
            guardarVectoresDesdeTabla();
            if (vectoresHorizontales && vectoresHorizontales.length > 0) {
                savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
            }
            sincronizarMatrizDesdeVectores();
        },
        onEnter: () => {
            guardarVectoresDesdeTabla();
            agregarNuevoVector(currentRow);
            if (vectoresHorizontales && vectoresHorizontales.length > 0) {
                savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
            }
            sincronizarMatrizDesdeVectores();
        },
        onSpace: (r, c) => {
            guardarVectoresDesdeTabla();
            agregarComponenteATodos(c);
            if (vectoresHorizontales && vectoresHorizontales.length > 0) {
                savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
            }
            sincronizarMatrizDesdeVectores();
        },
        onBackspace: (rowIndex, colIndex, tipo) => {
            guardarVectoresDesdeTabla();

            const esPertenecer = currentOperation === "pertenecer";
            const totalVectores = vectoresHorizontales.length;
            const esVectorB = esPertenecer && (rowIndex === totalVectores - 1);

            if (esPertenecer && esVectorB) {
                if (tipo === 'fila' || tipo === 'ambos') {
                    const numComp = vectoresHorizontales[0]?.length || 2;
                    vectoresHorizontales[rowIndex] = Array(numComp).fill("");
                    construirFilasVectores();
                    setTimeout(() => enfocarCelda(rowIndex, 0), 30);
                    return;
                }
            }

            if (tipo === 'fila' || tipo === 'ambos') {
                if (vectoresHorizontales.length > 2) {
                    vectoresHorizontales.splice(rowIndex, 1);
                }
            }

            if (tipo === 'columna' || tipo === 'ambos') {
                if (vectoresHorizontales[0]?.length > 2) {
                    vectoresHorizontales.forEach(v => v.splice(colIndex, 1));
                }
            }

            verificarEliminarFilasColumnas();
            if (vectoresHorizontales && vectoresHorizontales.length > 0) {
                savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
            }
            sincronizarMatrizDesdeVectores();

            // Reubicar el foco después de la reconstrucción del DOM
            setTimeout(() => {
                const maxFila = Math.max(0, vectoresHorizontales.length - 1);
                const maxCol = Math.max(0, (vectoresHorizontales[0]?.length || 2) - 1);

                let newRow = tipo === 'fila' || tipo === 'ambos' ? rowIndex - 1 : rowIndex;
                let newCol = tipo === 'columna' || tipo === 'ambos' ? colIndex - 1 : colIndex;

                newRow = Math.max(0, Math.min(newRow, maxFila));
                newCol = Math.max(0, Math.min(newCol, maxCol));

                enfocarCelda(newRow, newCol);
            }, 30);
        },
        onFocusUpdate: (r, c) => {
            currentRow = r;
            currentCol = c;
        }
    });

    setTimeout(() => validarEstadoActualEV(), 30);

    initDragAndDropEV();
}

function construirFilasVectores() {
    if (!tablaVectores) return;
    tablaVectores.innerHTML = "";
    const numComponentes = vectoresHorizontales[0]?.length || 2;
    const numVectores = vectoresHorizontales.length;
    const esPertenecer = currentOperation === "pertenecer";

    vectoresHorizontales.forEach((vector, i) => {
        const esUltimo = (i === numVectores - 1);
        const esVectorB = esPertenecer && esUltimo;

        const row = document.createElement("tr");

        // Celda de etiqueta
        const labelCell = document.createElement("td");
        labelCell.className = "ev-vector-label-cell";
        const label = esVectorB ? "β =" : `α<sub>${i + 1}</sub> =`;
        labelCell.innerHTML = `<span class="vector-label">${label}</span>`;
        labelCell.style.pointerEvents = "none";
        labelCell.style.verticalAlign = "middle";
        row.appendChild(labelCell);

        // Paréntesis izquierdo
        const leftParenCell = document.createElement("td");
        leftParenCell.className = "ev-paren-cell ev-paren-left-cell";
        leftParenCell.style.cssText = "padding: 0; vertical-align: middle;";
        const leftParen = document.createElement("div");
        leftParen.className = "paren-left";
        leftParen.textContent = "(";
        leftParenCell.appendChild(leftParen);
        row.appendChild(leftParenCell);

        // Celdas de componentes
        for (let j = 0; j < numComponentes; j++) {
            const cell = document.createElement("td");
            cell.className = "ev-vector-input-cell";
            const span = crearSpanCelda(vector[j] || "", i, j);
            cell.appendChild(span);
            row.appendChild(cell);

            if (j < numComponentes - 1) {
                const commaCell = document.createElement("td");
                commaCell.className = "vector-componente-comma-cell";
                commaCell.innerHTML = `<span class="vector-componente-comma">,</span>`;
                commaCell.style.pointerEvents = "none";
                row.appendChild(commaCell);
            }
        }

        // Paréntesis derecho
        const rightParenCell = document.createElement("td");
        rightParenCell.className = "ev-paren-cell ev-paren-right-cell";
        rightParenCell.style.cssText = "padding: 0; vertical-align: middle;";
        const rightParen = document.createElement("div");
        rightParen.className = "paren-right";
        rightParen.textContent = ")";
        rightParenCell.appendChild(rightParen);
        row.appendChild(rightParenCell);

        tablaVectores.appendChild(row);

        // Separador entre vectores y B en modo pertenecer
        if (esPertenecer && i === numVectores - 2 && numVectores >= 2) {
            const separatorRow = document.createElement("tr");
            const separatorCell = document.createElement("td");
            separatorCell.colSpan = (numComponentes * 2) + 2;
            separatorCell.style.padding = "0";
            separatorCell.innerHTML = `<div class="ev-vector-separator"></div>`;
            separatorRow.className = "ev-vector-separator-row";
            separatorRow.appendChild(separatorCell);
            tablaVectores.appendChild(separatorRow);
        }
    });

    // Botón agregar vector
    const rowBtn = document.createElement("tr");
    const cellBtn = document.createElement("td");
    cellBtn.colSpan = ((vectoresHorizontales[0]?.length || 2) * 2) + 2;
    const btnAgregar = document.createElement("button");
    btnAgregar.textContent = "+ Agregar Vector";
    btnAgregar.className = "btn-agregar-vector";
    btnAgregar.onclick = () => {
        guardarVectoresDesdeTabla();
        agregarNuevoVector(currentRow);
        sincronizarMatrizDesdeVectores();
        setTimeout(() => validarEstadoActualEV(), 20);
    };
    cellBtn.appendChild(btnAgregar);
    rowBtn.appendChild(cellBtn);
    tablaVectores.appendChild(rowBtn);

    setTimeout(() => ajustarAnchosVectores(), 50);
}

function construirMatrizColumnas(table) {
    if (!table) return;
    table.innerHTML = "";

    let numVectores = vectoresHorizontales.length;
    const numComponentes = vectoresHorizontales[0]?.length || 2;
    const esPertenecer = currentOperation === "pertenecer";
    const esOrtogonalizar = currentOperation === "ortogonalizar";

    let columnasAMostrar = numVectores;
    let mostrarColumnaCeros = false;

    if (!esPertenecer && !esOrtogonalizar) {
        mostrarColumnaCeros = true;
        columnasAMostrar = numVectores + 1;
    }

    const columnaSeparador = esPertenecer ? numVectores - 2 : numVectores - 1;

    for (let i = 0; i < numComponentes; i++) {
        const row = document.createElement("tr");

        for (let j = 0; j < columnasAMostrar; j++) {
            const cell = document.createElement("td");
            let valor;

            if (!esPertenecer && !esOrtogonalizar && j === numVectores) {
                valor = "0";
            } else {
                valor = vectoresHorizontales[j][i] || "";
            }

            valor = Auxiliares.normalizarValorTexto(valor);

            if (valor !== "" && !Auxiliares.esValorNumericoValido(valor, true)) {
                valor = "";
            }

            if (valor && valor.includes('/')) {
                const [num, den] = valor.split('/');
                cell.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
            } else {
                cell.textContent = valor === "" ? "0" : valor;
            }

            if (!esOrtogonalizar && j === columnaSeparador) {
                cell.style.borderRight = "2px solid var(--primary)";
                cell.classList.add("separator-col");
            }

            row.appendChild(cell);
        }

        table.appendChild(row);
    }
}

function agregarComponenteATodos(indiceCol) {
    const r = currentRow;
    const c = indiceCol;
    vectoresHorizontales.forEach(v => v.splice(c + 1, 0, ""));
    construirFilasVectores();
    setTimeout(() => enfocarCelda(r, c + 1), 10);
}

function agregarNuevoVector(indiceFila) {
    const numComp = vectoresHorizontales[0]?.length || 2;
    const esPertenecer = currentOperation === "pertenecer";

    if (esPertenecer) {
        // En modo pertenecer, insertar antes del vector B
        const indiceInsercion = vectoresHorizontales.length - 1;
        vectoresHorizontales.splice(indiceInsercion, 0, Array(numComp).fill(""));
        construirFilasVectores();
        setTimeout(() => enfocarCelda(indiceInsercion, 0), 10);
    } else {
        // Modo normal: agregar al final
        vectoresHorizontales.push(Array(numComp).fill(""));
        construirFilasVectores();
        setTimeout(() => enfocarCelda(vectoresHorizontales.length - 1, 0), 10);
    }
}

function enfocarCelda(r, c) {
    if (!tablaVectores) return;

    let filaEncontrada = null;
    let contador = 0;

    for (let i = 0; i < tablaVectores.rows.length; i++) {
        const row = tablaVectores.rows[i];
        const primeraCelda = row.cells[0];
        if (primeraCelda && (primeraCelda.innerHTML.includes("α") || primeraCelda.innerHTML.includes("β"))) {
            if (contador === r) {
                filaEncontrada = row;
                break;
            }
            contador++;
        }
    }

    if (!filaEncontrada) return;

    const celdasComponentes = Array.from(filaEncontrada.querySelectorAll('.cell-span, .cell-input'));
    const elemento = celdasComponentes[c];
    if (!elemento) return;

    if (elemento.classList.contains('cell-span')) elemento.click();
    else {
        elemento.focus();
        elemento.select();
    }
}

function guardarVectoresDesdeTabla() {
    if (!tablaVectores) return;

    const filas = tablaVectores.querySelectorAll("tr");
    const nuevosDatos = [];

    filas.forEach((fila) => {
        const celdas = fila.querySelectorAll(".cell-span, .cell-input");
        if (celdas.length === 0) return;
        if (fila.querySelector(".btn-agregar-vector")) return;

        // Verificar si es una fila de vector (primera celda tiene v o B)
        const primeraCelda = fila.cells[0];
        if (primeraCelda && (primeraCelda.innerHTML.includes("α") || primeraCelda.innerHTML.includes("β"))) {
            const vector = Array.from(celdas).map(el => {
                let valor = el.tagName === "INPUT" ? el.value : (el.getAttribute("data-value") || "");
                // Convertir celdas vacías a "0"
                if (valor === "" || valor === null || valor === undefined) {
                    return "0";
                }
                return Auxiliares.normalizarValorTexto(valor);
            });
            nuevosDatos.push(vector);
        }
    });

    if (nuevosDatos.length > 0) {
        vectoresHorizontales = nuevosDatos;
    }
}

function verificarEliminarFilasColumnas() {
    const esPertenecer = currentOperation === "pertenecer";

    // Borrar filas que solo tengan celdas vacías
    vectoresHorizontales = vectoresHorizontales.filter((fila, index) => {
        const esVectorB = esPertenecer && (index === vectoresHorizontales.length - 1);
        if (esVectorB) return true;

        return fila.some(celda => {
            const v = String(celda || "").trim();
            return v !== "" && v !== "0";
        });
    });
    while (vectoresHorizontales.length < 2) {
        const c = vectoresHorizontales[0]?.length || 2;
        vectoresHorizontales.push(new Array(c).fill(""));
    }

    if (esPertenecer && vectoresHorizontales.length < 3) {
        const c = vectoresHorizontales[0]?.length || 2;
        vectoresHorizontales.push(new Array(c).fill(""));
    }

    if (vectoresHorizontales.length > 0) {
        const totalCols = vectoresHorizontales[0].length;
        let colsAKeep = [];

        for (let j = 0; j < totalCols; j++) {
            let tieneData = vectoresHorizontales.some(f => {
                const v = String(f[j] || "").trim();
                return v !== "" && v !== "0";
            });
            if (tieneData || totalCols <= 2) colsAKeep.push(j);
        }

        vectoresHorizontales = vectoresHorizontales.map(f =>
            colsAKeep.map(idx => f[idx])
        );
    }

    construirFilasVectores();
}

function sincronizarMatrizDesdeVectores() {
    const matrizTable = document.getElementById("matrizEVTable");
    if (matrizTable) construirMatrizColumnas(matrizTable);
    setTimeout(() => validarEstadoActualEV(), 10);
}

function getBotonTexto(modo) {
    const textos = {
        "li": "Calcular si es LI o LD",
        "pertenecer": "Verificar pertenencia a ℒ(V)",
        "base": "Hallar base",
        "completar": "Completar base",
        "ortogonalizar": "Calcular base ortogonal",
        "cambio-base": "Calcular cambio de base"
    };
    return textos[modo] || "Calcular";
}

function getNombreOperacion(modo) {
    const nombres = {
        "li": "CLASIFICACIÓN LI / LD",
        "pertenecer": "PERTENENCIA A \u2112(V)",
        "base": "BASE DEL ESPACIO VECTORIAL",
        "completar": "COMPLETACIÓN DE BASE",
        "ortogonalizar": "BASE ORTOGONAL",
        "cambio-base": "CAMBIO DE BASE"
    };
    return nombres[modo] || "RESULTADO";
}

function calcularPertenencia(matriz) {
    const numVectores = vectoresHorizontales.length;
    const matrizGeneradores = matriz.map(fila => fila.slice(0, numVectores - 1));
    const vectorB = matriz.map(fila => fila[numVectores - 1]);
    return perteneceAS(matrizGeneradores, vectorB);
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}

function crearVectorCanonicoTexto(dimension, indice) {
    const componentes = [];
    for (let i = 0; i < dimension; i++) {
        componentes.push(i === indice ? "1" : "0");
    }
    return `(${componentes.join(", ")})`;
}



function crearTdCambioBase(row, col) {
    const td = document.createElement("td");
    const span = crearSpanCelda("", row, col);
    td.appendChild(span);
    return td;
}

function crearSwitchBaseCanonica(tableId, labelText) {
    const wrapper = document.createElement("label");
    wrapper.className = "canonical-switch-wrapper";
    wrapper.setAttribute("for", `${tableId}CanonicaSwitch`);
    wrapper.setAttribute("title", `Usar base canónica para ${labelText}`);

    const symbol = document.createElement("span");
    symbol.className = "canonical-switch-symbol";
    symbol.textContent = "𝔼";
    symbol.setAttribute("aria-hidden", "true");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `${tableId}CanonicaSwitch`;
    input.className = "canonical-switch-input";
    input.dataset.tableId = tableId;
    input.dataset.baseName = labelText;
    input.setAttribute("aria-label", `Usar base canónica para ${labelText}`);

    const visual = document.createElement("span");
    visual.className = "canonical-switch-visual";
    visual.setAttribute("aria-hidden", "true");

    const knob = document.createElement("span");
    knob.className = "canonical-switch-knob";

    visual.appendChild(knob);
    wrapper.append(symbol, input, visual);
    return wrapper;
}

function crearMatrizCambioBaseEditable(id, labelText, filas = 2, columnas = 2) {
    const card = document.createElement("div");
    card.className = "basic-matrix-card cambio-base-card";

    const header = document.createElement("div");
    header.className = "cambio-base-card-header";
    header.appendChild(crearSwitchBaseCanonica(id, labelText));

    const matrixRow = document.createElement("div");
    matrixRow.className = "cambio-base-matrix-row";

    const label = document.createElement("div");
    label.className = "basic-matrix-label cambio-base-matrix-label";
    label.textContent = `${labelText} =`;

    const container = document.createElement("div");
    container.className = "basic-matrix-container";

    const table = document.createElement("table");
    table.id = id;
    table.className = "basic-input-table cambio-base-table";
    table.dataset.minRows = "1";
    table.dataset.minCols = "1";

    for (let i = 0; i < filas; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < columnas; j++) {
            tr.appendChild(crearTdCambioBase(i, j));
        }
        table.appendChild(tr);
    }

    container.appendChild(table);
    matrixRow.append(label, container);
    card.append(header, matrixRow);
    return card;
}

function actualizarAtributosCambioBase(table) {
    if (!table) return;
    Array.from(table.rows).forEach((row, i) => {
        Array.from(row.cells).forEach((cell, j) => {
            const editable = cell.querySelector(".cell-input, .cell-span");
            if (!editable) return;
            editable.dataset.row = String(i);
            editable.dataset.col = String(j);
            editable.setAttribute("data-row", String(i));
            editable.setAttribute("data-col", String(j));
            editable.setAttribute("aria-label", `Celda ${i + 1}, ${j + 1}`);
        });
    });
}

function obtenerEditableCambioBase(cell) {
    return cell?.querySelector(".cell-input, .cell-span") || null;
}

function enfocarCeldaCambioBase(table, rowIndex, colIndex) {
    if (!table?.rows.length) return;
    const row = table.rows[Math.max(0, Math.min(rowIndex, table.rows.length - 1))];
    if (!row) return;
    const col = Math.max(0, Math.min(colIndex, row.cells.length - 1));
    const editable = obtenerEditableCambioBase(row.cells[col]);
    if (!editable) return;

    if (editable.classList.contains("cell-span")) {
        const input = spanToInput(editable);
        input?.select?.();
    } else {
        editable.focus();
        editable.select?.();
    }
}

function ajustarAnchoColumnaCambioBase(table, colIndex) {
    if (!table) return;
    const minWidth = 5;
    let maxChars = minWidth;

    Array.from(table.rows).forEach(row => {
        const editable = obtenerEditableCambioBase(row.cells[colIndex]);
        if (!editable) return;
        const value = editable.classList.contains("cell-input")
            ? editable.value
            : editable.getAttribute("data-value") || "";
        maxChars = Math.max(maxChars, String(value || "").length + 1);
    });

    Array.from(table.rows).forEach(row => {
        const editable = obtenerEditableCambioBase(row.cells[colIndex]);
        if (!editable) return;
        editable.style.width = `${maxChars}ch`;
        editable.style.minWidth = `${maxChars}ch`;
    });
}

function ajustarTodasColumnasCambioBase(table) {
    if (!table?.rows.length) return;
    const cols = table.rows[0].cells.length;
    for (let j = 0; j < cols; j++) ajustarAnchoColumnaCambioBase(table, j);
}

function insertarFilaCambioBase(table, rowIndex, colIndex) {
    const columnas = table.rows[0].cells.length;
    const nuevaFila = table.insertRow(rowIndex + 1);
    for (let j = 0; j < columnas; j++) {
        nuevaFila.appendChild(crearTdCambioBase(rowIndex + 1, j));
    }
    actualizarAtributosCambioBase(table);
    ajustarTodasColumnasCambioBase(table);
    sincronizarSwitchCanonicoCambioBase(table);
    setTimeout(() => enfocarCeldaCambioBase(table, rowIndex + 1, colIndex), 10);
}

function insertarColumnaCambioBase(table, rowIndex, colIndex) {
    Array.from(table.rows).forEach((row, i) => {
        const td = row.insertCell(colIndex + 1);
        td.appendChild(crearSpanCelda("", i, colIndex + 1));
    });
    actualizarAtributosCambioBase(table);
    ajustarTodasColumnasCambioBase(table);
    sincronizarSwitchCanonicoCambioBase(table);
    setTimeout(() => enfocarCeldaCambioBase(table, rowIndex, colIndex + 1), 10);
}

function celdaVaciaCambioBase(cell) {
    const input = cell?.querySelector(".cell-input");
    const span = cell?.querySelector(".cell-span");
    if (input) return input.value.trim() === "";
    if (span) return (span.getAttribute("data-value") || "") === "";
    return true;
}

function filaVaciaCambioBase(table, rowIndex) {
    const row = table.rows[rowIndex];
    return row ? Array.from(row.cells).every(celdaVaciaCambioBase) : false;
}

function columnaVaciaCambioBase(table, colIndex) {
    return Array.from(table.rows).every(row => celdaVaciaCambioBase(row.cells[colIndex]));
}

function eliminarFilaCambioBase(table, rowIndex) {
    if (table.rows.length <= 1) return false;
    table.deleteRow(rowIndex);
    actualizarAtributosCambioBase(table);
    sincronizarSwitchCanonicoCambioBase(table);
    return true;
}

function eliminarColumnaCambioBase(table, colIndex) {
    if (!table.rows.length || table.rows[0].cells.length <= 1) return false;
    Array.from(table.rows).forEach(row => row.deleteCell(colIndex));
    actualizarAtributosCambioBase(table);
    sincronizarSwitchCanonicoCambioBase(table);
    return true;
}

function revisarBorradoCambioBase(table, rowIndex, colIndex) {
    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (filaVaciaCambioBase(table, rowIndex) && eliminarFilaCambioBase(table, rowIndex)) {
        targetRow = Math.max(0, rowIndex - 1);
    }

    if (columnaVaciaCambioBase(table, colIndex) && eliminarColumnaCambioBase(table, colIndex)) {
        targetCol = Math.max(0, colIndex - 1);
    }

    ajustarTodasColumnasCambioBase(table);
    sincronizarSwitchCanonicoCambioBase(table);
    setTimeout(() => enfocarCeldaCambioBase(table, targetRow, targetCol), 10);
}

function finalizarEntradaCambioBase(input) {
    if (!input || !input.classList.contains("cell-input")) return;
    const table = input.closest("table");
    const cell = input.closest("td");
    const col = cell?.cellIndex ?? 0;
    inputToSpan(input);
    ajustarAnchoColumnaCambioBase(table, col);
    sincronizarSwitchCanonicoCambioBase(table);
}

function moverCambioBase(table, rowIndex, colIndex, deltaRow, deltaCol) {
    const targetRow = rowIndex + deltaRow;
    const targetCol = colIndex + deltaCol;
    if (targetRow < 0 || targetRow >= table.rows.length) return;
    if (targetCol < 0 || targetCol >= table.rows[targetRow].cells.length) return;
    enfocarCeldaCambioBase(table, targetRow, targetCol);
}

function limpiarValorSpanCambioBase(span) {
    span.setAttribute("data-value", "");
    span.innerHTML = "";
    span.textContent = "";
}

function obtenerValorCambioBaseEditable(editable) {
    if (!editable) return "";
    if (editable.classList.contains("cell-input")) return editable.value.trim();
    return (editable.getAttribute("data-value") || editable.textContent || "").trim();
}

function obtenerValorCambioBaseCell(cell) {
    return obtenerValorCambioBaseEditable(obtenerEditableCambioBase(cell));
}

function fraccionCambioBaseIgualA(valor, esperado) {
    const texto = Auxiliares.normalizarValorTexto(valor);
    if (!Auxiliares.esValorNumericoValido(texto, false)) return false;
    const fraccion = Auxiliares.normalizarSigno(Auxiliares.parsearFraccion(texto));
    const [num, den] = Auxiliares.simplificar(fraccion.num, fraccion.den);
    return num === esperado && den === 1;
}

function esCeroVisualCanonicoCambioBase(valor) {
    const texto = String(valor || "").trim();
    if (texto === "") return true;
    return fraccionCambioBaseIgualA(texto, 0);
}

function esMatrizCanonicaCambioBase(table) {
    if (!table?.rows.length) return false;

    const filas = table.rows.length;
    const columnas = table.rows[0]?.cells.length || 0;
    if (filas === 0 || columnas === 0 || filas !== columnas) return false;

    for (let i = 0; i < filas; i++) {
        for (let j = 0; j < columnas; j++) {
            const valor = obtenerValorCambioBaseCell(table.rows[i].cells[j]);

            if (i === j) {
                if (!fraccionCambioBaseIgualA(valor, 1)) return false;
            } else if (!esCeroVisualCanonicoCambioBase(valor)) {
                return false;
            }
        }
    }

    return true;
}

function obtenerSwitchCanonicoCambioBase(table) {
    if (!table?.id) return null;
    return document.querySelector(`.canonical-switch-input[data-table-id="${table.id}"]`);
}

function marcarSwitchCanonicoCambioBase(table, checked) {
    const switchInput = obtenerSwitchCanonicoCambioBase(table);
    if (!switchInput) return;
    switchInput.checked = checked;
    switchInput.setAttribute("aria-checked", String(checked));
    switchInput.closest(".canonical-switch-wrapper")?.classList.toggle("is-active", checked);
}

function sincronizarSwitchCanonicoCambioBase(table) {
    if (!table) return;
    marcarSwitchCanonicoCambioBase(table, esMatrizCanonicaCambioBase(table));
}

function sincronizarSwitchesCanonicosCambioBase() {
    document.querySelectorAll("#mainSection .cambio-base-table").forEach(sincronizarSwitchCanonicoCambioBase);
}

function asignarValorCeldaCambioBase(table, rowIndex, colIndex, valor) {
    const cell = table.rows[rowIndex]?.cells[colIndex];
    if (!cell) return;
    const editable = obtenerEditableCambioBase(cell);
    const span = crearSpanCelda(valor, rowIndex, colIndex);

    if (editable) editable.replaceWith(span);
    else cell.appendChild(span);
}

function reconstruirMatrizCanonicaCambioBase(table, dimension) {
    if (!table) return;
    table.innerHTML = "";

    for (let i = 0; i < dimension; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < dimension; j++) {
            const td = document.createElement("td");
            td.appendChild(crearSpanCelda(i === j ? "1" : "0", i, j));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    actualizarAtributosCambioBase(table);
    ajustarTodasColumnasCambioBase(table);
    marcarSwitchCanonicoCambioBase(table, true);
}

function limpiarTablaCambioBase(table) {
    if (!table) return;

    Array.from(table.rows).forEach((row, rowIndex) => {
        Array.from(row.cells).forEach((cell, colIndex) => {
            asignarValorCeldaCambioBase(table, rowIndex, colIndex, "");
        });
    });

    actualizarAtributosCambioBase(table);
    ajustarTodasColumnasCambioBase(table);
    marcarSwitchCanonicoCambioBase(table, false);
}

function manejarCambioSwitchCanonicoCambioBase(input) {
    const table = document.getElementById(input.dataset.tableId);
    if (!table) return;

    const debeActivarCanonica = input.checked;
    finalizarEntradasCambioBase();
    document.getElementById("resultadoEVSection")?.remove();

    if (debeActivarCanonica) {
        const filas = table.rows.length || 2;
        const columnas = table.rows[0]?.cells.length || 2;
        const dimension = Math.max(1, filas, columnas);
        reconstruirMatrizCanonicaCambioBase(table, dimension);
        setTimeout(() => enfocarCeldaCambioBase(table, 0, 0), 20);
        return;
    }

    limpiarTablaCambioBase(table);
    setTimeout(() => enfocarCeldaCambioBase(table, 0, 0), 20);
}

function sanitizarValorCambioBase(valor) {
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

function manejarKeydownCambioBase(event) {
    const target = event.target;
    const table = target.closest?.(".cambio-base-table");

    if (event.ctrlKey && event.key === "Enter") {
        document.getElementById("btnCalcularCambioBase")?.click();
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
        if (event.key === "Enter") return insertarFilaCambioBase(table, rowIndex, colIndex);
        if (event.key === " ") return insertarColumnaCambioBase(table, rowIndex, colIndex);
        if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            limpiarValorSpanCambioBase(target);
            revisarBorradoCambioBase(table, rowIndex, colIndex);
            return;
        }
        if (event.key === "ArrowLeft") return moverCambioBase(table, rowIndex, colIndex, 0, -1);
        if (event.key === "ArrowRight") return moverCambioBase(table, rowIndex, colIndex, 0, 1);
        if (event.key === "ArrowUp") return moverCambioBase(table, rowIndex, colIndex, -1, 0);
        if (event.key === "ArrowDown") return moverCambioBase(table, rowIndex, colIndex, 1, 0);

        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(event.key)) return;
            const input = spanToInput(target);
            if (input) {
                input.value = event.key;
                input.value = sanitizarValorCambioBase(input.value);
                input.setSelectionRange(input.value.length, input.value.length);
                input.style.width = `${Math.max(5, input.value.length + 1)}ch`;
                sincronizarSwitchCanonicoCambioBase(table);
            }
        }
        return;
    }

    if (!target.classList.contains("cell-input")) return;

    if (event.key === "Enter") {
        finalizarEntradaCambioBase(target);
        insertarFilaCambioBase(table, rowIndex, colIndex);
        return;
    }

    if (event.key === " ") {
        finalizarEntradaCambioBase(target);
        insertarColumnaCambioBase(table, rowIndex, colIndex);
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        finalizarEntradaCambioBase(target);
        if (colIndex < row.cells.length - 1) enfocarCeldaCambioBase(table, rowIndex, colIndex + 1);
        else if (rowIndex < table.rows.length - 1) enfocarCeldaCambioBase(table, rowIndex + 1, 0);
        else document.getElementById("btnCalcularCambioBase")?.focus();
        return;
    }

    if (event.key === "Escape") {
        finalizarEntradaCambioBase(target);
        target.blur();
        return;
    }

    if (event.key === "ArrowLeft") return moverCambioBase(table, rowIndex, colIndex, 0, -1);
    if (event.key === "ArrowRight") return moverCambioBase(table, rowIndex, colIndex, 0, 1);
    if (event.key === "ArrowUp") return moverCambioBase(table, rowIndex, colIndex, -1, 0);
    if (event.key === "ArrowDown") return moverCambioBase(table, rowIndex, colIndex, 1, 0);

    if ((event.key === "Backspace" || event.key === "Delete") && target.value === "") {
        event.preventDefault();
        const span = crearSpanCelda("", rowIndex, colIndex);
        target.replaceWith(span);
        revisarBorradoCambioBase(table, rowIndex, colIndex);
    }
}

function manejarInputCambioBase(event) {
    const input = event.target;
    if (!input.classList?.contains("cell-input")) return;
    const table = input.closest(".cambio-base-table");
    if (!table) return;

    input.value = sanitizarValorCambioBase(input.value);
    input.style.width = `${Math.max(5, input.value.length + 1)}ch`;
    const cell = input.closest("td");
    ajustarAnchoColumnaCambioBase(table, cell?.cellIndex ?? 0);
    sincronizarSwitchCanonicoCambioBase(table);
}

function manejarClickCambioBase(event) {
    const section = event.currentTarget;
    const target = event.target;
    const clickedCell = target.closest?.("td");

    section.querySelectorAll(".cambio-base-table .cell-input").forEach(input => {
        if (input.closest("td") !== clickedCell) finalizarEntradaCambioBase(input);
    });

    const span = target.classList?.contains("cell-span") ? target : target.closest?.(".cell-span");
    if (span && span.closest(".cambio-base-table")) {
        event.preventDefault();
        spanToInput(span);
    }
}

function manejarBeforeInputCambioBase(event) {
    const input = event.target;
    if (!input.classList?.contains("cell-input")) return;
    const table = input.closest(".cambio-base-table");
    if (!table) return;

    const data = event.data || "";
    if (!/\s/.test(data)) return;

    event.preventDefault();
    const cell = input.closest("td");
    const row = cell?.parentElement;
    if (!cell || !row) return;
    finalizarEntradaCambioBase(input);
    insertarColumnaCambioBase(table, row.rowIndex, cell.cellIndex);
}

function configurarEventosCambioBase(section) {
    section.addEventListener("keydown", manejarKeydownCambioBase);
    section.addEventListener("input", manejarInputCambioBase);
    section.addEventListener("click", manejarClickCambioBase);
    section.addEventListener("beforeinput", manejarBeforeInputCambioBase);

    section.querySelectorAll(".canonical-switch-input").forEach(input => {
        input.setAttribute("aria-checked", String(input.checked));
        input.addEventListener("change", () => manejarCambioSwitchCanonicoCambioBase(input));
    });
}

function finalizarEntradasCambioBase() {
    document.querySelectorAll("#mainSection .cambio-base-table .cell-input").forEach(finalizarEntradaCambioBase);
}

function leerMatrizCambioBase(id, nombre) {
    const table = document.getElementById(id);
    if (!table) throw new Error(`No se encontró la base ${nombre}.`);

    return Array.from(table.rows).map((row, rowIndex) =>
        Array.from(row.cells).map((cell, colIndex) => {
            const input = cell.querySelector("input");
            const span = cell.querySelector(".cell-span");
            const valor = (input?.value ?? span?.getAttribute("data-value") ?? span?.textContent ?? "").trim();
            const valorFinal = valor === "" ? "0" : valor;

            if (!Auxiliares.esValorNumericoValido(valorFinal, true)) {
                throw new Error(`El valor de la base ${nombre} en la fila ${rowIndex + 1}, columna ${colIndex + 1} no es válido. Escribe un número, decimal o fracción con denominador distinto de cero.`);
            }

            return Auxiliares.normalizarSigno(Auxiliares.parsearFraccion(valorFinal));
        })
    );
}

function dimensionesMatrizCambio(matriz) {
    return { filas: matriz.length, columnas: matriz[0]?.length || 0 };
}

function validarDimensionesCambioBase(baseOrigen, baseDestino) {
    const dimOrigen = dimensionesMatrizCambio(baseOrigen);
    const dimDestino = dimensionesMatrizCambio(baseDestino);

    if (dimOrigen.filas !== dimOrigen.columnas) {
        throw new Error(`La base de origen B debe ser cuadrada. Actualmente B es ${dimOrigen.filas}×${dimOrigen.columnas}.`);
    }

    if (dimDestino.filas !== dimDestino.columnas) {
        throw new Error(`La base de destino C debe ser cuadrada. Actualmente C es ${dimDestino.filas}×${dimDestino.columnas}.`);
    }

    if (dimOrigen.filas !== dimDestino.filas || dimOrigen.columnas !== dimDestino.columnas) {
        throw new Error(`La base de origen B y la base de destino C deben tener la misma dimensión. Actualmente B es ${dimOrigen.filas}×${dimOrigen.columnas} y C es ${dimDestino.filas}×${dimDestino.columnas}.`);
    }
}

function crearFraccionHTMLCambioBase(valor) {
    const str = Auxiliares.fraccionToString(valor);
    if (!str.includes("/")) return str;
    const [num, den] = str.split("/");
    return `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
}

function mostrarResultadoCambioBase(article, matriz) {
    document.getElementById("resultadoEVSection")?.remove();

    const section = UI.createSection("resultadoEVSection", "RESULTADO: CAMBIO DE BASE");
    const content = document.createElement("div");
    content.className = "resultado-ev-content";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.gap = "1.5rem";

    const wrapper = document.createElement("div");
    wrapper.className = "result-wrapper resultado-matriz-wrapper";

    const label = document.createElement("div");
    label.className = "result-label resultado-matriz-label";
    label.textContent = "P =";

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "result-matrix-container";

    const table = document.createElement("table");
    table.className = "result-table";

    matriz.forEach(fila => {
        const tr = document.createElement("tr");
        fila.forEach(valor => {
            const td = document.createElement("td");
            td.innerHTML = crearFraccionHTMLCambioBase(valor);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    matrixContainer.appendChild(table);
    wrapper.append(label, matrixContainer);
    content.appendChild(wrapper);

    const mensaje = document.createElement("div");
    mensaje.className = "resultado-mensaje mensaje-exito";
    mensaje.textContent = "MATRIZ DE CAMBIO DE BASE CALCULADA";
    content.appendChild(mensaje);

    section.appendChild(content);
    article.appendChild(section);
}

function mostrarErrorCambioBase(article, mensaje) {
    document.getElementById("resultadoEVSection")?.remove();

    const section = UI.createSection("resultadoEVSection", "ERROR");
    const error = document.createElement("div");
    error.className = "resultado-mensaje mensaje-error";
    error.textContent = `Error: ${mensaje}`;
    section.appendChild(error);
    article.appendChild(section);
}

function limpiarCambioBase() {
    document.querySelectorAll("#mainSection .cambio-base-table").forEach(limpiarTablaCambioBase);
    document.getElementById("resultadoEVSection")?.remove();

    const firstTable = document.querySelector("#mainSection .cambio-base-table");
    if (firstTable) setTimeout(() => enfocarCeldaCambioBase(firstTable, 0, 0), 20);
}

function renderCambioBase(article) {
    const mainSection = UI.createSection("mainSection", "CAMBIO DE BASE");
    mainSection.classList.add("cambio-base-section");

    const matricesZone = document.createElement("div");
    matricesZone.className = "cambio-base-zone";
    matricesZone.append(
        crearMatrizCambioBaseEditable("baseOrigenTable", "B", 2, 2),
        crearMatrizCambioBaseEditable("baseDestinoTable", "C", 2, 2)
    );

    const actions = document.createElement("div");
    actions.className = "ev-buttons";

    const btnCalcular = UI.createButton("btnCalcularCambioBase", "Calcular cambio de base", "btnCalcular");
    btnCalcular.type = "button";

    const btnLimpiar = UI.createButton("btnLimpiarCambioBase", "Borrar matrices", "btnCalcular btnLimpiarEV");
    btnLimpiar.type = "button";

    actions.append(btnCalcular, btnLimpiar);
    mainSection.append(matricesZone, actions);
    article.appendChild(mainSection);

    configurarEventosCambioBase(mainSection);
    sincronizarSwitchesCanonicosCambioBase();

    const firstTable = document.getElementById("baseOrigenTable");
    if (firstTable) setTimeout(() => enfocarCeldaCambioBase(firstTable, 0, 0), 30);

    btnLimpiar.addEventListener("click", limpiarCambioBase);

    btnCalcular.addEventListener("click", () => {
        try {
            finalizarEntradasCambioBase();

            const baseOrigen = leerMatrizCambioBase("baseOrigenTable", "B");
            const baseDestino = leerMatrizCambioBase("baseDestinoTable", "C");

            validarDimensionesCambioBase(baseOrigen, baseDestino);

            let resultado;
            try {
                resultado = matrizCambioBase(baseOrigen, baseDestino);
            } catch (error) {
                throw new Error(error.message || "La base de destino C no es invertible.");
            }

            try {
                matrizCambioBase(baseDestino, baseOrigen);
            } catch (error) {
                throw new Error("La base de origen B no es invertible; sus vectores no forman una base.");
            }

            mostrarResultadoCambioBase(article, resultado);
        } catch (error) {
            mostrarErrorCambioBase(article, error.message);
        }
    });
}

function limpiarTodoEV() {
    clearEVFileData();
    const numComp = Math.max(2, vectoresHorizontales[0]?.length || 2);
    if (currentOperation === "pertenecer") {
        vectoresHorizontales = [Array(numComp).fill(""), Array(numComp).fill(""), Array(numComp).fill("")];
    } else {
        vectoresHorizontales = [Array(numComp).fill(""), Array(numComp).fill("")];
    }
    savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
    construirFilasVectores();
    sincronizarMatrizDesdeVectores();
    const prev = document.getElementById("resultadoEVSection");
    if (prev) prev.remove();
    validarEstadoActualEV();
    setTimeout(() => enfocarCelda(0, 0), 30);
}

function ajustarAnchosVectores() {
    if (!tablaVectores) return;
    const filas = Array.from(tablaVectores.rows).filter(row => {
        const primeraCelda = row.cells[0];
        return primeraCelda && (primeraCelda.innerHTML.includes("α") || primeraCelda.innerHTML.includes("β"));
    });
    if (!filas.length) return;

    const numComponentes = vectoresHorizontales[0]?.length || 2;
    for (let j = 0; j < numComponentes; j++) {
        let maxChars = 6;
        const elementos = [];
        filas.forEach(row => {
            const componentes = Array.from(row.querySelectorAll('.cell-span, .cell-input'));
            const el = componentes[j];
            if (!el) return;
            elementos.push(el);
            const valor = el.classList.contains('cell-input') ? el.value : (el.getAttribute('data-value') || el.textContent || "");
            maxChars = Math.max(maxChars, String(valor || "").length + 1);
        });
        const finalWidth = `${maxChars}ch`;
        elementos.forEach(el => {
            el.style.width = finalWidth;
            el.style.minWidth = finalWidth;
        });
    }
}

function convertirVectoresFraccionAMatriz(vectores, agregarColumnaCeros = false) {
    if (!vectores.length) return [];
    const dimension = vectores[0].length;
    const matriz = [];
    for (let i = 0; i < dimension; i++) {
        const fila = vectores.map(vector => ({ num: vector[i].num, den: vector[i].den }));
        if (agregarColumnaCeros) fila.push({ num: 0, den: 1 });
        matriz.push(fila);
    }
    return matriz;
}

function crearFraccionVisualDesdeTexto(texto) {
    const frac = document.createElement("span");
    frac.className = "frac frac-vector";

    const [num, den] = texto.split("/");

    const top = document.createElement("span");
    top.className = "top";
    top.textContent = num;

    const bottom = document.createElement("span");
    bottom.className = "bottom";
    bottom.textContent = den;

    frac.appendChild(top);
    frac.appendChild(bottom);
    return frac;
}

function crearVectorVisual(vector, claseVector = "vector-item") {
    const vectorSpan = document.createElement("span");
    vectorSpan.className = `${claseVector} vector-visual`;

    const leftParen = document.createElement("span");
    leftParen.className = "vector-paren";
    leftParen.textContent = "(";
    vectorSpan.appendChild(leftParen);

    vector.forEach((valor, idx) => {
        const componente = document.createElement("span");
        componente.className = "vector-component";

        const texto = Auxiliares.normalizarValorTexto(Auxiliares.fraccionToString(valor));
        if (texto.includes("/")) {
            componente.appendChild(crearFraccionVisualDesdeTexto(texto));
        } else {
            componente.textContent = texto;
        }

        vectorSpan.appendChild(componente);

        if (idx < vector.length - 1) {
            const comma = document.createElement("span");
            comma.className = "vector-component-comma";
            comma.textContent = ",";
            vectorSpan.appendChild(comma);
        }
    });

    const rightParen = document.createElement("span");
    rightParen.className = "vector-paren";
    rightParen.textContent = ")";
    vectorSpan.appendChild(rightParen);

    return vectorSpan;
}

function crearConjuntoVectores(vectores, etiqueta = "W = {", claseVector = "vector-item") {
    const conjuntoDiv = document.createElement("div");
    conjuntoDiv.className = "conjunto-container";

    const wLabel = document.createElement("span");
    wLabel.className = "conjunto-llave-abierta";
    wLabel.textContent = etiqueta;
    conjuntoDiv.appendChild(wLabel);

    vectores.forEach((vector, idx) => {
        conjuntoDiv.appendChild(crearVectorVisual(vector, claseVector));
        if (idx < vectores.length - 1) {
            const comma = document.createElement("span");
            comma.className = "vector-comma";
            comma.textContent = ",";
            conjuntoDiv.appendChild(comma);
        }
    });

    const closeBrace = document.createElement("span");
    closeBrace.className = "conjunto-llave-cerrada";
    closeBrace.textContent = "}";
    conjuntoDiv.appendChild(closeBrace);

    return conjuntoDiv;
}

function mostrarResultadoEV(resultado, operacion) {
    const prev = document.getElementById("resultadoEVSection");
    if (prev) prev.remove();

    const section = UI.createSection("resultadoEVSection", `RESULTADO: ${getNombreOperacion(operacion)}`);
    const content = document.createElement("div");
    content.className = "resultado-ev-content";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.gap = "1.5rem";

    // Verificar si resultado es un error
    const esError = resultado && resultado.esError;

    // Mostrar matriz solo si no es error
    if (!esError) {
        // Mostrar base ortogonal como vectores, no como matriz
        if (operacion === "ortogonalizar" && resultado && resultado.length > 0) {
            const ortogonalContainer = document.createElement("div");
            ortogonalContainer.className = "base-container base-ortogonal-container";

            const title = document.createElement("p");
            title.className = "base-title";
            title.textContent = "BASE ORTOGONAL";
            ortogonalContainer.appendChild(title);

            ortogonalContainer.appendChild(crearConjuntoVectores(resultado, "W = {", "vector-item vector-ortogonal"));
            content.appendChild(ortogonalContainer);
        }

        // Mostrar matriz reducida (para LI/LD, pertenecer, base, completar)
        if (resultado.matrizReducida && operacion !== "ortogonalizar") {
            const wrapperMatriz = document.createElement("div");
            wrapperMatriz.className = "result-wrapper resultado-matriz-wrapper";
            wrapperMatriz.style.marginBottom = "1rem";

            const label = document.createElement("div");
            label.className = "result-label resultado-matriz-label";
            label.textContent = "W =";

            const matrixContainer = document.createElement("div");
            matrixContainer.className = "result-matrix-container";

            const tabla = document.createElement("table");
            tabla.className = "result-table";

            const numCols = resultado.matrizReducida[0]?.length || 0;
            const esPertenecer = currentOperation === "pertenecer";
            const columnaSeparador = esPertenecer ? numCols - 2 : numCols - 2;

            resultado.matrizReducida.forEach((fila) => {
                const tr = document.createElement("tr");
                fila.forEach((valor, j) => {
                    const td = document.createElement("td");
                    const str = Auxiliares.fraccionToString(valor);
                    if (str.includes("/")) {
                        const [num, den] = str.split("/");
                        td.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
                    } else {
                        td.textContent = str;
                    }
                    if (j === columnaSeparador) {
                        td.style.borderRight = "2px solid var(--primary)";
                        td.classList.add("separator-col");
                    }
                    tr.appendChild(td);
                });
                tabla.appendChild(tr);
            });

            matrixContainer.appendChild(tabla);
            wrapperMatriz.appendChild(label);
            wrapperMatriz.appendChild(matrixContainer);
            content.appendChild(wrapperMatriz);
        }
    }

    const mensajeDiv = document.createElement("div");
    mensajeDiv.className = "resultado-mensaje";

    if (esError) {
        mensajeDiv.textContent = resultado.mensaje;
        mensajeDiv.classList.add("mensaje-error");
    } else {
        switch (operacion) {
            case "li":
                mensajeDiv.textContent = resultado.esLI ? "LINEALMENTE INDEPENDIENTE" : "LINEALMENTE DEPENDIENTE";
                mensajeDiv.classList.add(resultado.esLI ? "mensaje-exito" : "mensaje-error");
                break;
            case "pertenecer":
                mensajeDiv.textContent = resultado.pertenece ? "EL VECTOR PERTENECE AL ℒ(V)" : "EL VECTOR NO PERTENECE A ℒ(V)";
                mensajeDiv.classList.add(resultado.pertenece ? "mensaje-exito" : "mensaje-error");
                break;
            case "base":
                mensajeDiv.textContent = resultado.columnasEliminadas?.length === 0
                    ? "EL CONJUNTO YA ES UNA BASE"
                    : `BASE ENCONTRADA: ${resultado.base.length} VECTORES`;
                mensajeDiv.classList.add("mensaje-exito");
                break;
            case "completar":
                mensajeDiv.textContent = resultado.canonicosAgregados?.length === 0
                    ? "LA BASE YA ESTÁ COMPLETA"
                    : `BASE COMPLETADA CON ${resultado.canonicosAgregados.length} CANÓNICOS`;
                mensajeDiv.classList.add("mensaje-exito");
                break;
            case "ortogonalizar":
                mensajeDiv.textContent = "BASE ORTOGONAL";
                mensajeDiv.classList.add("mensaje-exito");
                break;
        }
    }
    content.appendChild(mensajeDiv);

    if (!esError) {
        if (operacion === "base" && resultado.base && resultado.base.length > 0) {
            if (resultado.columnasEliminadas?.length > 0) {
                const p = document.createElement("p");
                p.className = "vectores-eliminados";
                p.textContent = `Vectores eliminados: ${resultado.columnasEliminadas.map(c => c + 1).join(", ")}`;
                content.appendChild(p);
            }

            const baseContainer = document.createElement("div");
            baseContainer.className = "base-container";

            const baseTitle = document.createElement("p");
            baseTitle.className = "base-title";
            baseTitle.textContent = "BASE DEL ESPACIO VECTORIAL";
            baseContainer.appendChild(baseTitle);

            const conjuntoDiv = crearConjuntoVectores(resultado.base, "W = {", "vector-item");
            baseContainer.appendChild(conjuntoDiv);

            const btnCompletarBase = document.createElement("button");
            btnCompletarBase.className = "btnCalcular btn-completar-desde-base";
            btnCompletarBase.textContent = "Completar esta base";
            btnCompletarBase.onclick = () => {
                try {
                    const matrizBase = convertirVectoresFraccionAMatriz(resultado.base, true);
                    const baseCompletada = completarBase(matrizBase);
                    mostrarResultadoEV(baseCompletada, "completar");
                } catch (error) {
                    mostrarResultadoEV({ esError: true, mensaje: error.message }, "completar");
                }
            };
            baseContainer.appendChild(btnCompletarBase);

            content.appendChild(baseContainer);
        }

        if (operacion === "completar" && resultado.baseCompleta && resultado.baseCompleta.length > 0) {
            const baseCompletaContainer = document.createElement("div");
            baseCompletaContainer.className = "base-completa-container";

            const title = document.createElement("p");
            title.className = "base-completa-title";
            title.textContent = resultado.canonicosAgregados?.length === 0
                ? "CONJUNTO ORIGINAL (YA ERA BASE)"
                : "NUEVO CONJUNTO (BASE COMPLETADA)";
            baseCompletaContainer.appendChild(title);

            const conjuntoDiv = document.createElement("div");
            conjuntoDiv.className = "base-completa-conjunto";

            const wLabel = document.createElement("span");
            wLabel.className = "base-completa-label";
            wLabel.textContent = "W = {";
            conjuntoDiv.appendChild(wLabel);

            resultado.baseCompleta.forEach((vector, idx) => {
                const esCanonico = idx >= (resultado.baseOriginal || []).length;
                conjuntoDiv.appendChild(crearVectorVisual(vector, `base-completa-vector ${esCanonico ? 'base-completa-vector-nuevo' : 'base-completa-vector-original'}`));
                if (idx < resultado.baseCompleta.length - 1) {
                    const comma = document.createElement("span");
                    comma.className = "base-completa-comma";
                    comma.textContent = ",";
                    conjuntoDiv.appendChild(comma);
                }
            });

            const closeBrace = document.createElement("span");
            closeBrace.className = "base-completa-brace";
            closeBrace.textContent = "}";
            conjuntoDiv.appendChild(closeBrace);

            baseCompletaContainer.appendChild(conjuntoDiv);

            if (resultado.canonicosAgregados?.length > 0) {
                const infoBox = document.createElement("div");
                infoBox.className = "base-completa-info";
                infoBox.innerHTML = `
                    <span class="base-completa-info-text">Se agregaron los canónicos:</span>
                    <span class="base-completa-info-canonicos">
                        ${resultado.canonicosAgregados.map(i => `e${i + 1} = ${crearVectorCanonicoTexto(resultado.dimension, i)}`).join(", ")}
                    </span>
                `;
                baseCompletaContainer.appendChild(infoBox);
            }

            content.appendChild(baseCompletaContainer);
        }
    }

    section.appendChild(content);
    document.getElementById("article").appendChild(section);
}
