import { crearSpanCelda, inputToSpan } from "./celdas.js";
import { actualizarSeparadorGlobal, getCurrentOperation } from "./ux_matrices.js";
import Auxiliares from "./auxiliares.js";

let currentFileData = null;
let currentFileName = null;
let errorCells = new Set();
let isProcessing = false;

export function parseMatrixText(text) {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error("Archivo vacío");
    }
    
    const matrix = lines.map((line, index) => {
        const tokens = line.trim().split(/[\s,;]+/).filter(token => token);
        
        if (tokens.length === 0) {
            throw new Error(`Línea ${index + 1} vacía`);
        }
        
        return tokens;
    });
    
    const columnCounts = matrix.map(row => row.length);
    const maxCols = Math.max(...columnCounts);
    
    matrix.forEach(row => {
        while (row.length < maxCols) {
            row.push("0");
        }
    });
    
    return matrix;
}

export function isValidMatrixValue(value) {
    if (!value || value.trim() === "") return true;
    
    const trimmed = value.trim();
    
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(trimmed)) return false;
    
    if (/[^0-9\-\/\.]/.test(trimmed)) return false;
    
    const slashCount = (trimmed.match(/\//g) || []).length;
    if (slashCount > 1) return false;
    
    if (/^\//.test(trimmed)) return false;
    
    if (/\/$/.test(trimmed)) return false;
    
    if (trimmed.includes('/')) {
        const slashIndex = trimmed.indexOf('/');
        const beforeSlash = trimmed.substring(0, slashIndex);
        const afterSlash = trimmed.substring(slashIndex + 1);
        
        if (beforeSlash !== '' && beforeSlash !== '-' && !/^-?\d*\.?\d*$/.test(beforeSlash)) {
            return false;
        }
        
        if (afterSlash === '' || afterSlash === '-') return false;
        if (!/^-?\d*\.?\d*$/.test(afterSlash)) return false;
        
        const denom = parseFloat(afterSlash);
        if (denom === 0) return false;
        
        if ((beforeSlash.match(/\./g) || []).length > 1) return false;
        if ((afterSlash.match(/\./g) || []).length > 1) return false;
    } else {
        if (trimmed !== '-' && !/^-?\d*\.?\d*$/.test(trimmed)) return false;
        if ((trimmed.match(/\./g) || []).length > 1) return false;
    }
    
    return true;
}

export function findErrors(matrix) {
    const errors = [];
    
    matrix.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
            if (!isValidMatrixValue(value)) {
                errors.push({
                    row: rowIndex,
                    col: colIndex,
                    value: value
                });
            }
        });
    });
    
    actualizarEstadoBotonCalcular(errors.length > 0);
    
    return errors;
}

function actualizarEstadoBotonCalcular(hayErrores) {
    const btnCalcular = document.getElementById("btnCalcular");
    if (!btnCalcular) return;
    
    if (hayErrores) {
        btnCalcular.disabled = true;
        btnCalcular.style.opacity = "0.5";
        btnCalcular.style.cursor = "not-allowed";
        btnCalcular.title = "Corrige los errores antes de calcular";
    } else {
        btnCalcular.disabled = false;
        btnCalcular.style.opacity = "1";
        btnCalcular.style.cursor = "pointer";
        btnCalcular.title = "";
    }
}

function getCurrentTable() {
    return document.getElementById("inputTable");
}

function obtenerValorCelda(cell) {
    const input = cell.querySelector(".cell-input");
    const span = cell.querySelector(".cell-span");
    
    if (input) return input.value.trim();
    if (span) {
        const dataValue = span.getAttribute("data-value") || "";
        if (dataValue) return dataValue;
        const textContent = span.textContent.trim();
        return textContent || "";
    }
    return "";
}

export function clearAllErrors() {
    const table = getCurrentTable();
    if (!table) return;
    
    const allCells = table.querySelectorAll(".cell-span, .cell-input");
    allCells.forEach(cell => {
        cell.classList.remove("cell-error");
    });
    
    errorCells.clear();
    
    if (currentFileName) {
        updateFileIndicator(currentFileName, true);
    }
    
    actualizarEstadoBotonCalcular(false);
}

export function markErrors(errorPositions) {
    clearAllErrors();
    
    const table = getCurrentTable();
    if (!table) return;
    
    errorPositions.forEach(({ row, col }) => {
        const key = `${row}-${col}`;
        errorCells.add(key);
        
        if (row < table.rows.length) {
            const targetRow = table.rows[row];
            if (col < targetRow.cells.length) {
                const cell = targetRow.cells[col];
                const span = cell.querySelector(".cell-span");
                const input = cell.querySelector(".cell-input");
                
                if (span) span.classList.add("cell-error");
                if (input) input.classList.add("cell-error");
            }
        }
    });
    
    if (currentFileName) {
        updateFileIndicator(currentFileName, false);
    }
    
    actualizarEstadoBotonCalcular(errorPositions.length > 0);
}

export function applyMatrixToTable(matrix, fileName) {
    const table = getCurrentTable();
    if (!table) {
        console.error("Tabla no encontrada");
        return;
    }
    
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }
    
    const numRows = matrix.length;
    const numCols = matrix[0].length;
    
    const currentOp = getCurrentOperation();
    if (currentOp === "axb") {
        table.dataset.minRows = Math.max(numRows, 2);
        table.dataset.minCols = Math.max(numCols, 3);
    } else {
        table.dataset.minRows = Math.max(numRows, 1);
        table.dataset.minCols = Math.max(numCols, 1);
    }
    
    for (let i = 0; i < numRows; i++) {
        const row = document.createElement("tr");
        row.id = `row${i}`;
        
        for (let j = 0; j < numCols; j++) {
            const cell = document.createElement("td");
            cell.id = `cell${i}${j}`;
            
            const value = matrix[i][j] || "0";
            const span = crearSpanCelda(value, i, j);
            
            if (!isValidMatrixValue(value)) {
                span.classList.add("cell-error");
            }
            
            cell.appendChild(span);
            row.appendChild(cell);
        }
        
        table.appendChild(row);
    }
    
    if (currentOp === "axb") {
        actualizarSeparadorGlobal(table);
    }
    
    const errors = findErrors(matrix);
    if (errors.length > 0) {
        markErrors(errors);
    }
    
    currentFileData = JSON.parse(JSON.stringify(matrix));
    currentFileName = fileName;
    
    updateFileIndicator(fileName, errors.length === 0);
}

// Sincroniza el estado actual de la tabla con los datos del archivo cargado en memoria
export function syncTableToFileData() {
    if (!currentFileData || !currentFileName) return;
    if (isProcessing) return;
    
    isProcessing = true;
    
    const table = getCurrentTable();
    if (!table) {
        isProcessing = false;
        return;
    }
    
    const newMatrix = [];
    let hasErrors = false;
    const errorPositions = [];
    
    for (let i = 0; i < table.rows.length; i++) {
        const row = [];
        for (let j = 0; j < table.rows[i].cells.length; j++) {
            const cell = table.rows[i].cells[j];
            const value = obtenerValorCelda(cell);
            
            if (!isValidMatrixValue(value)) {
                hasErrors = true;
                errorPositions.push({ row: i, col: j, value });
            }
            
            row.push(value || "0");
        }
        newMatrix.push(row);
    }
    
    currentFileData = newMatrix;
    
    if (hasErrors) {
        markErrors(errorPositions);
    } else {
        clearAllErrors();
    }
    
    updateFileIndicator(currentFileName, !hasErrors);
    actualizarEstadoBotonCalcular(hasErrors);
    
    isProcessing = false;
}

// En caso de que se pida descargar la matriz corregida
export function descargarMatrizCorregida() {
    if (!currentFileData) return;
    
    let contenido = "";
    
    for (let i = 0; i < currentFileData.length; i++) {
        contenido += currentFileData[i].join(" ") + "\n";
    }
    
    const blob = new Blob([contenido], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFileName || "matriz.txt";
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function updateFileIndicator(fileName, isValid) {
    let indicator = document.querySelector(".file-indicator");
    
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "file-indicator";
        document.body.appendChild(indicator);
    }
    
    indicator.className = "file-indicator show";
    indicator.innerHTML = `
        <span class="file-name">📄 ${fileName}</span>
        <span class="file-status ${isValid ? 'valid' : 'error'}">
            ${isValid ? '✓ Válido' : '⚠ Error'}
        </span>
        <button class="download-file" title="Descargar matriz corregida" ${!isValid ? 'disabled' : ''}>💾</button>
        <button class="remove-file" title="Quitar archivo">×</button>
    `;
    
    const downloadBtn = indicator.querySelector(".download-file");
    if (downloadBtn && isValid) {
        downloadBtn.addEventListener("click", () => {
            descargarMatrizCorregida();
        });
    }
    
    const removeBtn = indicator.querySelector(".remove-file");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            clearFileData();
        });
    }
}

export function clearFileData() {
    currentFileData = null;
    currentFileName = null;
    clearAllErrors();
    
    const indicator = document.querySelector(".file-indicator");
    if (indicator) {
        indicator.classList.remove("show");
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 300);
    }
}

export function getCurrentFileData() {
    return {
        data: currentFileData,
        fileName: currentFileName,
        hasErrors: errorCells.size > 0
    };
}

export function initDragAndDrop() {
    const body = document.body;
    let dragCounter = 0;
    
    const dropZone = document.createElement("div");
    dropZone.id = "dropZone";
    dropZone.className = "drop-zone";
    dropZone.innerHTML = `
        <div class="drop-zone-content">
            <div class="icon">📥</div>
            <h2>Soltar archivo de matriz</h2>
            <p>Formatos aceptados: .txt, .csv</p>
        </div>
    `;
    body.appendChild(dropZone);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    body.addEventListener('dragenter', (e) => {
        preventDefaults(e);
        dragCounter++;
        if (dragCounter === 1) {
            dropZone.classList.add('active');
        }
    });
    
    body.addEventListener('dragleave', (e) => {
        preventDefaults(e);
        dragCounter--;
        if (dragCounter === 0) {
            dropZone.classList.remove('active');
        }
    });
    
    body.addEventListener('drop', (e) => {
        preventDefaults(e);
        dragCounter = 0;
        dropZone.classList.remove('active');

        // Si el módulo de espacios vectoriales está activo, este manejador no debe tocar el archivo.
        if (document.getElementById("btnCalcularEV")) return;
        
        const files = e.dataTransfer.files;
        if (files.length === 0) return;
        
        const file = files[0];
        
        const validExtensions = ['.txt', '.csv'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExtension) {
            alert('Formato no soportado. Use archivos .txt o .csv');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const matrix = parseMatrixText(content);
                applyMatrixToTable(matrix, file.name);
            } catch (error) {
                alert(`Error al procesar el archivo: ${error.message}`);
            }
        };
        reader.onerror = () => {
            alert('Error al leer el archivo');
        };
        reader.readAsText(file);
    });
}

export function initTableSync() {
    const article = document.getElementById("article");
    if (!article) return;
    
    article.addEventListener('keyup', (e) => {
        if (!currentFileData) return;
        
        const target = e.target;
        if (target.classList.contains('cell-input') || 
            target.classList.contains('cell-span')) {
            clearTimeout(article._syncTimeout);
            article._syncTimeout = setTimeout(() => {
                syncTableToFileData();
            }, 200);
        }
    });
    
    article.addEventListener('focusout', (e) => {
        if (!currentFileData) return;
        
        const target = e.target;
        if (target.classList.contains('cell-input')) {
            syncTableToFileData();
        }
    });
    
    const observer = new MutationObserver((mutations) => {
        if (!currentFileData || isProcessing) return;
        
        let shouldSync = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const table = getCurrentTable();
                if (table && (mutation.target === table || 
                    mutation.target.closest('#inputTable') ||
                    mutation.target.querySelector('#inputTable'))) {
                    shouldSync = true;
                    break;
                }
            }
        }
        
        if (shouldSync) {
            clearTimeout(article._syncTimeout);
            article._syncTimeout = setTimeout(() => {
                syncTableToFileData();
            }, 200);
        }
    });
    
    observer.observe(article, {
        childList: true,
        subtree: true
    });
}
