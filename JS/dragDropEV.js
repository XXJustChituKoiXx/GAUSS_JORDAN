// dragDropEV.js
import { actualizarBotonCalcularEV } from "./celdas.js?v=13";
import Auxiliares from "./auxiliares.js?v=13";

let onMatrixLoadCallback = null;
let evDropListenersAttached = false;
let evDropZone = null;
let evIsProcessingDrop = false;

export function setEVCallbacks(callback) {
    onMatrixLoadCallback = callback;
}

// Validar valor de vector
export function isValidVectorValue(value) {
    return Auxiliares.esValorNumericoValido(value, true);
}

function limpiarValor(valor) {
    if (valor === null || valor === undefined) return "";

    const limpio = String(valor).trim();
    if (limpio === "" || limpio === "-") return limpio;

    if (limpio.includes("/")) {
        const partes = limpio.split("/");
        if (partes.length !== 2) return limpio;

        const num = Number(partes[0]);
        const den = Number(partes[1]);
        if (Number.isNaN(num) || Number.isNaN(den)) return limpio;

        return `${Object.is(num, -0) ? 0 : num}/${Object.is(den, -0) ? 0 : den}`;
    }

    const numero = Number(limpio);
    return Number.isNaN(numero) ? limpio : `${Object.is(numero, -0) ? 0 : numero}`;
}

function normalizarFilas(filas) {
    const matrix = filas
        .map(fila => fila.map(limpiarValor))
        .filter(fila => fila.some(celda => celda !== ""));

    if (matrix.length === 0) {
        throw new Error("Archivo vacío");
    }

    const maxCols = Math.max(...matrix.map(row => row.length));
    matrix.forEach(row => {
        while (row.length < maxCols) {
            row.push("0");
        }
    });

    return matrix;
}

function transponerMatriz(matrix) {
    const filas = matrix.length;
    const columnas = matrix[0]?.length || 0;
    const vectores = [];

    for (let j = 0; j < columnas; j++) {
        const vector = [];
        for (let i = 0; i < filas; i++) {
            vector.push(matrix[i][j] || "0");
        }
        vectores.push(vector);
    }

    return vectores;
}

function parseGreekVectorList(text) {
    const vectores = [];
    const regex = /[\u0370-\u03ff]+(?:\d+|[₀-₉]+)?\s*=\s*[\(\[]([^\)\]]+)[\)\]]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const componentes = match[1]
            .split(/[\s,;]+/)
            .map(limpiarValor)
            .filter(valor => valor !== "");

        if (componentes.length > 0) vectores.push(componentes);
    }

    return vectores.length > 0 ? normalizarFilas(vectores) : null;
}

function filasATexto(filas) {
    return filas.map(fila => fila.map(limpiarValor).join(" ")).join("\n");
}

let formatoArchivoPromise = null;

function obtenerModalFormatoArchivo() {
    let modal = document.getElementById("fileFormatModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "fileFormatModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content file-format-modal-content">
            <div class="modal-header">
                <h2>Formato del archivo</h2>
                <button class="modal-close" type="button">&times;</button>
            </div>
            <div class="modal-body">
                <div class="help-section">
                    <h3>¿Cómo quieres leer los datos?</h3>
                    <p><strong>Lista de vectores:</strong> cada fila del archivo será un vector.</p>
                    <p><strong>Matriz:</strong> cada columna del archivo será tomada como un vector.</p>
                </div>
            </div>
            <div class="modal-footer modal-footer-dual">
                <button type="button" class="btn-close-modal btn-formato-lista">Lista de vectores</button>
                <button type="button" class="btn-close-modal btn-formato-matriz">Matriz</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

function pedirFormatoArchivo() {
    if (formatoArchivoPromise) return formatoArchivoPromise;

    const modal = obtenerModalFormatoArchivo();
    const btnLista = modal.querySelector(".btn-formato-lista");
    const btnMatriz = modal.querySelector(".btn-formato-matriz");
    const btnCerrar = modal.querySelector(".modal-close");

    formatoArchivoPromise = new Promise(resolve => {
        const cerrar = (modo = "lista") => {
            modal.classList.remove("show");
            btnLista?.removeEventListener("click", seleccionarLista);
            btnMatriz?.removeEventListener("click", seleccionarMatriz);
            btnCerrar?.removeEventListener("click", cancelar);
            modal.removeEventListener("click", cerrarPorFondo);
            document.removeEventListener("keydown", cerrarPorEscape);
            formatoArchivoPromise = null;
            resolve(modo);
        };

        const seleccionarLista = () => cerrar("lista");
        const seleccionarMatriz = () => cerrar("matriz");
        const cancelar = () => cerrar("lista");
        const cerrarPorFondo = e => { if (e.target === modal) cerrar("lista"); };
        const cerrarPorEscape = e => { if (e.key === "Escape") cerrar("lista"); };

        btnLista?.addEventListener("click", seleccionarLista);
        btnMatriz?.addEventListener("click", seleccionarMatriz);
        btnCerrar?.addEventListener("click", cancelar);
        modal.addEventListener("click", cerrarPorFondo);
        document.addEventListener("keydown", cerrarPorEscape);

        modal.classList.add("show");
    });

    return formatoArchivoPromise;
}

export function parseMatrixToVectors(text, modo = "lista") {
    const greekVectors = parseGreekVectorList(text);
    if (greekVectors) return greekVectors;

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error("Archivo vacío");
    }
    
    const matrix = normalizarFilas(lines.map((line, index) => {
        const tokens = line.trim().split(/[\s,;]+/).filter(token => token);
        if (tokens.length === 0) {
            throw new Error(`Línea ${index + 1} vacía`);
        }
        return tokens;
    }));
    
    return modo === "matriz" ? transponerMatriz(matrix) : matrix;
}

function parseRowsToVectors(rows, modo = "lista") {
    const texto = filasATexto(rows);
    const greekVectors = parseGreekVectorList(texto);
    if (greekVectors) return greekVectors;

    const matrix = normalizarFilas(rows);
    return modo === "matriz" ? transponerMatriz(matrix) : matrix;
}

function leerArchivoTexto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsText(file);
    });
}

function leerArchivoArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsArrayBuffer(file);
    });
}

async function leerXLSX(file) {
    if (!window.XLSX) {
        throw new Error("No se cargó el lector XLSX. Revisa la conexión o usa .txt/.csv.");
    }

    const buffer = await leerArchivoArrayBuffer(file);
    const workbook = window.XLSX.read(new Uint8Array(buffer), { type: "array" });
    const firstSheet = workbook.SheetNames[0];

    if (!firstSheet) {
        throw new Error("El archivo XLSX no contiene hojas");
    }

    const sheet = workbook.Sheets[firstSheet];
    return window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: ""
    });
}

// Encontrar errores en los vectores
function findErrorsInVectors(vectores) {
    const errors = [];
    for (let i = 0; i < vectores.length; i++) {
        for (let j = 0; j < vectores[i].length; j++) {
            if (!isValidVectorValue(vectores[i][j])) {
                errors.push({ row: i, col: j, value: vectores[i][j] });
            }
        }
    }
    return errors;
}

// Marcar errores en la tabla EV
function markErrorsInEVTable(table, errors) {
    if (!table) return;
    
    // Limpiar errores existentes
    const allSpans = table.querySelectorAll('.cell-span');
    allSpans.forEach(span => span.classList.remove('cell-error'));
    
    // Marcar nuevos errores
    errors.forEach(({ row, col }) => {
        let filaActual = 0;
        for (let i = 0; i < table.rows.length; i++) {
            const tr = table.rows[i];
            const primeraCelda = tr.cells[0];
            if (primeraCelda && (primeraCelda.innerHTML.includes("α") || primeraCelda.innerHTML.includes("β"))) {
                if (filaActual === row) {
                    const componentes = Array.from(tr.querySelectorAll('.cell-span'));
                    const span = componentes[col];
                    if (span) span.classList.add('cell-error');
                    break;
                }
                filaActual++;
            }
        }
    });
    
    // Actualizar indicador de archivo
    updateEVFileIndicatorBasedOnErrors(errors.length > 0);
    
    // Actualizar botón calcular
    actualizarBotonCalcularEV();
}

function updateEVFileIndicatorBasedOnErrors(hasErrors) {
    let indicator = document.querySelector(".file-indicator-ev");
    if (!indicator) return;
    
    const statusSpan = indicator.querySelector(".file-status");
    if (statusSpan) {
        if (hasErrors) {
            statusSpan.className = "file-status error";
            statusSpan.innerHTML = " Error";
        } else {
            statusSpan.className = "file-status valid";
            statusSpan.innerHTML = " Válido";
        }
    }
}

export function clearEVFileData() {
    const indicator = document.querySelector(".file-indicator-ev");
    if (indicator) {
        indicator.remove();
    }
    // Rehabilitar botón calcular después de eliminar archivo
    setTimeout(() => actualizarBotonCalcularEV(), 50);
}

function updateEVFileIndicator(fileName, isValid) {
    let indicator = document.querySelector(".file-indicator-ev");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "file-indicator file-indicator-ev";
        document.body.appendChild(indicator);
    }
    indicator.className = "file-indicator file-indicator-ev show";
    indicator.innerHTML = `
        <span class="file-name">📄 ${fileName}</span>
        <span class="file-status ${isValid ? 'valid' : 'error'}">
            ${isValid ? '✓ Válido' : '⚠ Error'}
        </span>
        <button class="remove-file-ev" title="Quitar archivo">×</button>
    `;
    const removeBtn = indicator.querySelector(".remove-file-ev");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            clearEVFileData();
            if (onMatrixLoadCallback) {
                onMatrixLoadCallback(null, null);
            }
        });
    }
}

async function procesarArchivoEV(file) {
    const fileName = file.name.toLowerCase();
    const esXLSX = fileName.endsWith('.xlsx');
    const esTexto = fileName.endsWith('.txt') || fileName.endsWith('.csv');

    if (!esXLSX && !esTexto) {
        alert('Formato no soportado. Use archivos .txt, .csv o .xlsx');
        return;
    }

    let vectores;

    if (esXLSX) {
        const filas = await leerXLSX(file);
        const texto = filasATexto(filas);
        const greekVectors = parseGreekVectorList(texto);
        if (greekVectors) {
            vectores = greekVectors;
        } else {
            const modo = await pedirFormatoArchivo();
            vectores = parseRowsToVectors(filas, modo);
        }
    } else {
        const content = await leerArchivoTexto(file);
        const greekVectors = parseGreekVectorList(content);
        if (greekVectors) {
            vectores = greekVectors;
        } else {
            const modo = await pedirFormatoArchivo();
            vectores = parseMatrixToVectors(content, modo);
        }
    }

    if (vectores.length < 2) {
        throw new Error("Se requieren al menos 2 vectores");
    }
    if (vectores[0].length < 2) {
        throw new Error("Los vectores deben tener al menos 2 componentes");
    }

    const errors = findErrorsInVectors(vectores);
    const hasErrors = errors.length > 0;

    if (onMatrixLoadCallback) {
        onMatrixLoadCallback(vectores, file.name);
    }

    // Solo actualizar el indicador existente, no crear uno nuevo
    updateEVFileIndicator(file.name, !hasErrors);

    // Marcar errores después de que la tabla se construya
    setTimeout(() => {
        const table = document.getElementById("inputTable");
        if (table && hasErrors) {
            markErrorsInEVTable(table, errors);
        }
        actualizarBotonCalcularEV();
    }, 100);
}

export function initDragAndDropEV() {
    if (evDropZone) {
        evDropZone.remove();
        evDropZone = null;
    }

    const body = document.body;
    evDropZone = document.createElement("div");
    evDropZone.id = "dropZoneEV";
    evDropZone.className = "drop-zone";
    evDropZone.innerHTML = `
        <div class="drop-zone-content">
            <div class="icon">📥</div>
            <h2>Soltar archivo de vectores</h2>
            <p>Formatos: .txt, .csv o .xlsx</p>
            <p>Lista: cada fila es un vector. Matriz: cada columna será un vector.</p>
        </div>
    `;
    body.appendChild(evDropZone);

    if (evDropListenersAttached) return;

    let dragCounter = 0;

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        body.addEventListener(eventName, preventDefaults, false);
    });

    body.addEventListener('dragenter', (e) => {
        preventDefaults(e);
        dragCounter++;
        if (dragCounter === 1 && evDropZone) evDropZone.classList.add('active');
    });

    body.addEventListener('dragleave', (e) => {
        preventDefaults(e);
        dragCounter = Math.max(0, dragCounter - 1);
        if (dragCounter === 0 && evDropZone) evDropZone.classList.remove('active');
    });

    body.addEventListener('drop', async (e) => {
        preventDefaults(e);
        dragCounter = 0;
        if (evDropZone) evDropZone.classList.remove('active');

        // Si no está abierto el módulo de E.V y S.E.V, este manejador no debe procesar el archivo.
        if (!document.getElementById("btnCalcularEV") || evIsProcessingDrop) return;

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        evIsProcessingDrop = true;
        try {
            await procesarArchivoEV(files[0]);
        } catch (error) {
            alert(`Error al procesar el archivo: ${error.message}`);
        } finally {
            evIsProcessingDrop = false;
        }
    });

    evDropListenersAttached = true;
}
