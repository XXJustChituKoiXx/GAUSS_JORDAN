import UI from "./ui.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_ev.js";
import Auxiliares from "./auxiliares.js";
import { clasificarLIoLD, perteneceAS, hallarBase, completarBase } from "./calculos.js";
import { initDragAndDropEV, setEVCallbacks, clearEVFileData } from "./dragDropEV.js";
import { crearSpanCelda, setEVMode, ajustarAnchoColumnaEV, ajustarTodasColumnasEV } from "./celdas.js";

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
                    if (firstCell && (firstCell.innerHTML.includes("v") || firstCell.innerHTML.includes("B"))) {
                        const span = row.cells[1]?.querySelector('.cell-span');
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
    tablaVectores.style.borderSpacing = "6px";

    if (preserveState && savedVectoresState && savedVectoresState.length > 0) {
        vectoresHorizontales = JSON.parse(JSON.stringify(savedVectoresState));
        
        // Validar que la estructura sea correcta según el modo
        const esPertenecer = modo === "pertenecer";
        
        if (esPertenecer) {
            // En modo pertenecer, NO agregar vectores extra - usar exactamente los guardados
            // Solo asegurar que todas las filas tengan la misma longitud
            const numComp = vectoresHorizontales[0]?.length || 2;
            for (let i = 0; i < vectoresHorizontales.length; i++) {
                while (vectoresHorizontales[i].length < numComp) {
                    vectoresHorizontales[i].push("");
                }
            }
        } else {
            // En otros modos, asegurar al menos 2 vectores
            const numComp = vectoresHorizontales[0]?.length || 2;
            while (vectoresHorizontales.length < 2) {
                vectoresHorizontales.push(Array(numComp).fill(""));
            }
            // Asegurar que todas las filas tengan la misma longitud
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

    const resultSection = UI.createSection("resultSection", "MATRIZ (VECTORES COMO COLUMNAS)");
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
        }

        mostrarResultadoEV(resultado, currentOperation);
    };
    resultSection.appendChild(btnCalcular);

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
        const labelCell = document.createElement("td");
        const label = esVectorB ? "\u03B2 =" : `\u03B1${i + 1} =`;
        labelCell.innerHTML = `<span style="color:var(--primary); font-weight:600;">${label}</span>`;
        labelCell.style.pointerEvents = "none";
        row.appendChild(labelCell);

        for (let j = 0; j < numComponentes; j++) {
            const cell = document.createElement("td");
            const span = crearSpanCelda(vector[j] || "", i, j);
            cell.appendChild(span);
            row.appendChild(cell);
        }
        tablaVectores.appendChild(row);

        // SOLO separador entre vectores y B en modo pertenecer
        if (esPertenecer && i === numVectores - 2 && numVectores >= 2) {
            const separatorRow = document.createElement("tr");
            const separatorCell = document.createElement("td");
            separatorCell.colSpan = numComponentes + 1;
            separatorCell.style.borderTop = "2px solid var(--primary)";
            separatorCell.style.margin = "6px 0";
            separatorCell.style.padding = "0";
            separatorRow.appendChild(separatorCell);
            tablaVectores.appendChild(separatorRow);
        }
    });

    // Botón agregar vector
    const rowBtn = document.createElement("tr");
    const cellBtn = document.createElement("td");
    cellBtn.colSpan = numComponentes + 1;
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

    setTimeout(() => {
        if (tablaVectores) {
            for (let j = 1; j <= numComponentes; j++) {
                ajustarAnchoColumnaEV(tablaVectores, j);
            }
        }
    }, 50);
}

function construirMatrizColumnas(table) {
    if (!table) return;
    table.innerHTML = "";

    let numVectores = vectoresHorizontales.length;
    const numComponentes = vectoresHorizontales[0]?.length || 2;
    const esPertenecer = currentOperation === "pertenecer";

    // Para operaciones que no son "pertenecer", agregar una columna de ceros al final (vector B = 0)
    let columnasAMostrar = numVectores;
    let mostrarColumnaCeros = false;

    if (!esPertenecer) {
        mostrarColumnaCeros = true;
        columnasAMostrar = numVectores + 1;
    }

    // El separador va ANTES de la última columna (que es B)
    const columnaSeparador = esPertenecer ? numVectores - 2 : numVectores - 1;

    for (let i = 0; i < numComponentes; i++) {
        const row = document.createElement("tr");

        for (let j = 0; j < columnasAMostrar; j++) {
            const cell = document.createElement("td");
            let valor;

            if (!esPertenecer && j === numVectores) {
                // Esta es la columna extra de ceros
                valor = "0";
            } else {
                valor = vectoresHorizontales[j][i] || "";
            }

            if (valor && valor.includes('/')) {
                const [num, den] = valor.split('/');
                cell.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
            } else {
                cell.textContent = valor === "" ? "0" : valor;
            }

            // Aplicar separador vertical ANTES de la última columna
            if (j === columnaSeparador) {
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
        if (primeraCelda && (primeraCelda.innerHTML.includes("v") || primeraCelda.innerHTML.includes("B"))) {
            if (contador === r) {
                filaEncontrada = row;
                break;
            }
            contador++;
        }
    }

    if (!filaEncontrada) return;

    const columna = c + 1;
    if (columna >= filaEncontrada.cells.length) return;

    const cell = filaEncontrada.cells[columna];
    if (!cell) return;

    const span = cell.querySelector('.cell-span');
    if (span) span.click();
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
        if (primeraCelda && (primeraCelda.innerHTML.includes("v") || primeraCelda.innerHTML.includes("B"))) {
            const vector = Array.from(celdas).map(el => {
                let valor = el.tagName === "INPUT" ? el.value : (el.getAttribute("data-value") || "");
                // Convertir celdas vacías a "0"
                if (valor === "" || valor === null || valor === undefined) {
                    return "0";
                }
                return valor;
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
        "pertenecer": "Verificar pertenencia a \u2112(V)",
        "base": "Hallar base",
        "completar": "Completar base"
    };
    return textos[modo] || "Calcular";
}

function getNombreOperacion(modo) {
    const nombres = {
        "li": "CLASIFICACIÓN LI / LD",
        "pertenecer": "PERTENENCIA A \u2112(V)",
        "base": "BASE DEL ESPACIO VECTORIAL",
        "completar": "COMPLETACIÓN DE BASE"
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

function mostrarResultadoEV(resultado, operacion) {
    const prev = document.getElementById("resultadoEVSection");
    if (prev) prev.remove();

    const section = UI.createSection("resultadoEVSection", `RESULTADO: ${getNombreOperacion(operacion)}`);
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.gap = "1.5rem";

    // Agregar el label V = antes de la matriz
    if (resultado.matrizReducida) {
        const wrapperMatriz = document.createElement("div");
        wrapperMatriz.className = "result-wrapper";
        wrapperMatriz.style.marginBottom = "1rem";

        const label = document.createElement("div");
        label.className = "result-label";
        label.textContent = "W =";
        label.style.fontSize = "2rem";
        label.style.fontWeight = "700";
        label.style.color = "var(--primary)";
        label.style.padding = "0.5rem 0.8rem";
        label.style.whiteSpace = "nowrap";

        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";

        const tabla = document.createElement("table");
        tabla.className = "result-table";

        const numCols = resultado.matrizReducida[0]?.length || 0;
        const esPertenecer = currentOperation === "pertenecer";
        // El separador va ENTRE las últimas 2 columnas (penúltima y última)
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
                // Aplicar separador vertical ENTRE las últimas 2 columnas
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

    // Mensaje de resultado con estilo más destacado
    const mensajeDiv = document.createElement("div");
    mensajeDiv.style.cssText = `
        text-align: center;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1.2rem;
        letter-spacing: 0.5px;
        width: 100%;
    `;

    switch (operacion) {
        case "li":
            mensajeDiv.textContent = resultado.esLI ? "LINEALMENTE INDEPENDIENTE" : "LINEALMENTE DEPENDIENTE";
            mensajeDiv.style.backgroundColor = resultado.esLI ? "rgba(0, 200, 160, 0.15)" : "rgba(255, 59, 92, 0.15)";
            mensajeDiv.style.color = resultado.esLI ? "var(--success)" : "var(--error)";
            mensajeDiv.style.borderLeft = `4px solid ${resultado.esLI ? "var(--success)" : "var(--error)"}`;
            break;
        case "pertenecer":
            mensajeDiv.textContent = resultado.pertenece ? "EL VECTOR PERTENECE AL \u2112(V)" : "EL VECTOR NO PERTENECE A \u2112(V)";
            mensajeDiv.style.backgroundColor = resultado.pertenece ? "rgba(0, 200, 160, 0.15)" : "rgba(255, 59, 92, 0.15)";
            mensajeDiv.style.color = resultado.pertenece ? "var(--success)" : "var(--error)";
            mensajeDiv.style.borderLeft = `4px solid ${resultado.pertenece ? "var(--success)" : "var(--error)"}`;
            break;
        case "base":
            mensajeDiv.textContent = resultado.columnasEliminadas?.length === 0
                ? "EL CONJUNTO YA ES UNA BASE"
                : `BASE ENCONTRADA: ${resultado.base.length} VECTORES`;
            mensajeDiv.style.backgroundColor = "rgba(0, 200, 160, 0.15)";
            mensajeDiv.style.color = "var(--success)";
            mensajeDiv.style.borderLeft = "4px solid var(--success)";
            break;
        case "completar":
            mensajeDiv.textContent = resultado.canonicosAgregados?.length === 0
                ? "LA BASE YA ESTÁ COMPLETA"
                : `BASE COMPLETADA CON ${resultado.canonicosAgregados.length} CANÓNICOS`;
            mensajeDiv.style.backgroundColor = "rgba(0, 200, 160, 0.15)";
            mensajeDiv.style.color = "var(--success)";
            mensajeDiv.style.borderLeft = "4px solid var(--success)";
            break;
    }
    content.appendChild(mensajeDiv);

    if (operacion === "base") {
        if (resultado.columnasEliminadas?.length > 0) {
            const p = document.createElement("p");
            p.textContent = `Vectores eliminados: ${resultado.columnasEliminadas.map(c => c + 1).join(", ")}`;
            p.style.cssText = `
                color: var(--text-secondary);
                margin: 0;
                padding: 0.5rem 1rem;
                background: rgba(255, 59, 92, 0.1);
                border-radius: 6px;
            `;
            content.appendChild(p);
        }

        if (resultado.base && resultado.base.length > 0) {
            const baseContainer = document.createElement("div");
            baseContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 1rem;
                align-items: center;
                margin-top: 0.5rem;
                padding: 1.5rem;
                background: var(--bg-surface);
                border-radius: 12px;
                border: 2px solid var(--success);
                width: 100%;
            `;

            const baseTitle = document.createElement("p");
            baseTitle.textContent = "BASE DEL ESPACIO VECTORIAL";
            baseTitle.style.cssText = `
                color: var(--success);
                font-weight: 700;
                margin: 0;
                font-size: 1rem;
                letter-spacing: 1px;
            `;
            baseContainer.appendChild(baseTitle);

            // Formato W = {(v1), (v2), ...}
            const conjuntoDiv = document.createElement("div");
            conjuntoDiv.style.cssText = `
                display: flex;
                align-items: baseline;
                justify-content: center;
                flex-wrap: wrap;
                gap: 0.5rem;
                font-size: 1.1rem;
                padding: 1rem;
                background: var(--bg-page);
                border-radius: 8px;
                width: 100%;
            `;

            const wLabel = document.createElement("span");
            wLabel.style.cssText = `
                font-weight: 700;
                color: var(--primary);
                margin-right: 0.5rem;
            `;
            wLabel.textContent = "W = {";
            conjuntoDiv.appendChild(wLabel);

            resultado.base.forEach((vector, idx) => {
                const vectorStr = vector.map(v => Auxiliares.fraccionToString(v)).join(", ");

                const vectorSpan = document.createElement("span");
                vectorSpan.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-family: monospace;
                    font-size: 1rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    background: rgba(0, 200, 160, 0.1);
                `;
                vectorSpan.textContent = `(${vectorStr})`;

                conjuntoDiv.appendChild(vectorSpan);

                if (idx < resultado.base.length - 1) {
                    const comma = document.createElement("span");
                    comma.style.cssText = `margin-right: 0.5rem;`;
                    comma.textContent = ",";
                    conjuntoDiv.appendChild(comma);
                }
            });

            const closeBrace = document.createElement("span");
            closeBrace.style.cssText = `
                font-weight: 700;
                color: var(--primary);
                margin-left: 0.5rem;
            `;
            closeBrace.textContent = "}";
            conjuntoDiv.appendChild(closeBrace);

            baseContainer.appendChild(conjuntoDiv);
            content.appendChild(baseContainer);
        }
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
            const vectorStr = vector.map(v => Auxiliares.fraccionToString(v)).join(", ");
            const esCanonico = resultado.canonicosAgregados?.includes(idx - (resultado.baseOriginal || []).length);

            const vectorSpan = document.createElement("span");
            vectorSpan.className = `base-completa-vector ${esCanonico ? 'base-completa-vector-nuevo' : 'base-completa-vector-original'}`;
            vectorSpan.textContent = `(${vectorStr})`;

            conjuntoDiv.appendChild(vectorSpan);

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

    section.appendChild(content);
    document.getElementById("article").appendChild(section);
}