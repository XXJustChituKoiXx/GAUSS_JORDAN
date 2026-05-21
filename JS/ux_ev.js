import UI from "./ui.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_ev.js?v=11";
import Auxiliares from "./auxiliares.js";
import { clasificarLIoLD, perteneceAS, hallarBase, completarBase, ortogonalizar } from "./calculos.js";
import { initDragAndDropEV, setEVCallbacks, clearEVFileData } from "./dragDropEV.js?v=11";
import { crearSpanCelda, setEVMode, ajustarTodasColumnasEV } from "./celdas.js";

let currentOperation = "li";
let vectoresHorizontales = [["", ""], ["", ""]];
let tablaVectores = null;
let currentRow = 0;
let currentCol = 0;
let savedVectoresState = null;

export function cambiarOperacionEV(article, modo) {
    guardarVectoresDesdeTabla();
    if (vectoresHorizontales && vectoresHorizontales.length > 0) {
        savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));
    }
    currentOperation = modo;
    inicializarEV(article, modo, true);
}

export function inicializarEV(article, modo, preserveState = false) {
    desconfigurarEventosEV();
    currentOperation = modo;
    clearEVFileData();
    setEVMode(true);
    setEVCallbacks((vectores, fileName) => {
        if (vectores === null) {
            return;
        }

        vectoresHorizontales = JSON.parse(JSON.stringify(vectores));
        savedVectoresState = JSON.parse(JSON.stringify(vectoresHorizontales));

        construirFilasVectores();
        sincronizarMatrizDesdeVectores();

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

        const esPertenecer = currentOperation === "pertenecer";
        const matriz = Auxiliares.parsearVectoresAMatriz(vectoresHorizontales, !esPertenecer);

        let resultado;

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
                try {
                    resultado = ortogonalizar(matriz);
                } catch (error) {
                    resultado = { esError: true, mensaje: error.message };
                }
                break;
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
}

function getBotonTexto(modo) {
    const textos = {
        "li": "Calcular si es LI o LD",
        "pertenecer": "Verificar pertenencia a ℒ(V)",
        "base": "Hallar base",
        "completar": "Completar base",
        "ortogonalizar": "Calcular base ortogonal"
    };
    return textos[modo] || "Calcular";
}

function getNombreOperacion(modo) {
    const nombres = {
        "li": "CLASIFICACIÓN LI / LD",
        "pertenecer": "PERTENENCIA A \u2112(V)",
        "base": "BASE DEL ESPACIO VECTORIAL",
        "completar": "COMPLETACIÓN DE BASE",
        "ortogonalizar": "BASE ORTOGONAL"
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


function limpiarTodoEV() {
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
