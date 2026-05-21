import { spanToInput, inputToSpan, crearSpanCelda, ajustarTodasColumnasEV, actualizarBotonCalcularEV } from "./celdas.js";

let currentTable = null;
let currentArticle = null;
let callbacks = {};
let isProcessingBackspace = false;
let beforeInputHandler = null;

// Para navegación - almacenan referencias a la celda actual
let currentCell = null;
let currentRowIndex = -1;
let currentColIndex = -1;

function esEntradaValidaEV(valor) {
    if (valor === '' || valor === '-') return true;
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(valor)) return false;
    if (/[^0-9\-\/\.]/.test(valor)) return false;
    const slashCount = (valor.match(/\//g) || []).length;
    if (slashCount > 1) return false;
    if (/^\//.test(valor)) return false;
    if (/\/$/.test(valor)) return false;
    if (valor.includes('/')) {
        const parts = valor.split('/');
        if (parts.length > 2) return false;
        const left = parts[0];
        const right = parts[1] !== undefined ? parts[1] : '';
        if (left !== '' && left !== '-' && !/^-?\d*\.?\d*$/.test(left)) return false;
        if (right !== '' && right !== '-' && !/^-?\d*\.?\d*$/.test(right)) return false;
        const den = parseFloat(right);
        if (right !== '' && right !== '-' && den === 0) return false;
    } else {
        if (valor !== '-' && !/^-?\d*\.?\d*$/.test(valor)) return false;
    }
    return true;
}

function obtenerFilasDeVectores() {
    if (!currentTable) return [];
    const filas = [];
    for (let i = 0; i < currentTable.rows.length; i++) {
        const row = currentTable.rows[i];
        const primeraCelda = row.cells[0];
        if (primeraCelda && (primeraCelda.innerHTML.includes("α") || primeraCelda.innerHTML.includes("β"))) {
            filas.push(row);
        }
    }
    return filas;
}

function getComponenteCellsFromRow(row) {
    const cells = [];
    for (let i = 2; i < row.cells.length - 1; i++) { // desde después del paréntesis izquierdo hasta antes del derecho
        const cell = row.cells[i];
        const span = cell.querySelector('.cell-span');
        const input = cell.querySelector('.cell-input');
        if (span || input) {
            cells.push({ cell, element: span || input, colIndex: cells.length });
        }
    }
    return cells;
}

function actualizarCoordenadasDesdeElemento(elemento) {
    const td = elemento.closest('td');
    if (!td) return false;
    const tr = td.closest('tr');
    if (!tr) return false;
    
    const filasVectores = obtenerFilasDeVectores();
    for (let i = 0; i < filasVectores.length; i++) {
        if (filasVectores[i] === tr) {
            currentRowIndex = i;
            break;
        }
    }
    
    const cells = getComponenteCellsFromRow(tr);
    for (let j = 0; j < cells.length; j++) {
        if (cells[j].cell === td) {
            currentColIndex = j;
            break;
        }
    }
    
    currentCell = td;
    if (callbacks.onFocusUpdate) callbacks.onFocusUpdate(currentRowIndex, currentColIndex);
    return true;
}

function obtenerCeldaActual(rowIdx, colIdx) {
    const filasVectores = obtenerFilasDeVectores();
    if (rowIdx < 0 || rowIdx >= filasVectores.length) return null;
    const row = filasVectores[rowIdx];
    const cells = getComponenteCellsFromRow(row);
    if (colIdx < 0 || colIdx >= cells.length) return null;
    return cells[colIdx].cell;
}

function enfocarCelda(rowIdx, colIdx) {
    const cell = obtenerCeldaActual(rowIdx, colIdx);
    if (!cell) return false;
    
    const span = cell.querySelector('.cell-span');
    const input = cell.querySelector('.cell-input');
    
    if (span) {
        currentRowIndex = rowIdx;
        currentColIndex = colIdx;
        currentCell = cell;
        span.click();
        return true;
    }
    if (input) {
        currentRowIndex = rowIdx;
        currentColIndex = colIdx;
        currentCell = cell;
        input.focus();
        input.select();
        return true;
    }
    return false;
}

function moverIzquierda() {
    if (currentColIndex > 0) {
        enfocarCelda(currentRowIndex, currentColIndex - 1);
    } else if (currentRowIndex > 0) {
        const filasVectores = obtenerFilasDeVectores();
        const prevRowCells = getComponenteCellsFromRow(filasVectores[currentRowIndex - 1]);
        enfocarCelda(currentRowIndex - 1, prevRowCells.length - 1);
    }
}

function moverDerecha() {
    const filasVectores = obtenerFilasDeVectores();
    const currentRowCells = getComponenteCellsFromRow(filasVectores[currentRowIndex]);
    if (currentColIndex < currentRowCells.length - 1) {
        enfocarCelda(currentRowIndex, currentColIndex + 1);
    } else if (currentRowIndex < filasVectores.length - 1) {
        enfocarCelda(currentRowIndex + 1, 0);
    }
}

function moverArriba() {
    if (currentRowIndex > 0) {
        const filasVectores = obtenerFilasDeVectores();
        const prevRowCells = getComponenteCellsFromRow(filasVectores[currentRowIndex - 1]);
        const newCol = Math.min(currentColIndex, prevRowCells.length - 1);
        enfocarCelda(currentRowIndex - 1, newCol);
    }
}

function moverAbajo() {
    const filasVectores = obtenerFilasDeVectores();
    if (currentRowIndex < filasVectores.length - 1) {
        const nextRowCells = getComponenteCellsFromRow(filasVectores[currentRowIndex + 1]);
        const newCol = Math.min(currentColIndex, nextRowCells.length - 1);
        enfocarCelda(currentRowIndex + 1, newCol);
    }
}

function manejarFlechas(key) {
    switch (key) {
        case 'ArrowLeft': moverIzquierda(); break;
        case 'ArrowRight': moverDerecha(); break;
        case 'ArrowUp': moverArriba(); break;
        case 'ArrowDown': moverAbajo(); break;
        default: return false;
    }
    return true;
}

export function configurarEventosEV(article, table, cbs = {}) {
    desconfigurarEventosEV();
    currentTable = table;
    currentArticle = article;
    callbacks = cbs;

    // Inicializar primera celda
    setTimeout(() => {
        const filas = obtenerFilasDeVectores();
        if (filas.length > 0) {
            const cells = getComponenteCellsFromRow(filas[0]);
            if (cells.length > 0) {
                enfocarCelda(0, 0);
            }
        }
    }, 50);

    currentArticle.addEventListener('keydown', manejarKeydown);
    currentArticle.addEventListener('click', manejarClick);
    currentArticle.addEventListener('input', manejarInput);
    beforeInputHandler = (e) => manejarBeforeInput(e);
    currentArticle.addEventListener('focusout', manejarFocusout);
    currentArticle.addEventListener('beforeinput', beforeInputHandler);
    window.addEventListener('keydown', prevenirScrollEspacio);
}

export function desconfigurarEventosEV() {
    if (currentArticle) {
        currentArticle.removeEventListener('keydown', manejarKeydown);
        currentArticle.removeEventListener('click', manejarClick);
        currentArticle.removeEventListener('input', manejarInput);
        currentArticle.removeEventListener('focusout', manejarFocusout);
        currentArticle.removeEventListener('beforeinput', beforeInputHandler);
    }
    window.removeEventListener('keydown', prevenirScrollEspacio);
    currentTable = null;
    currentArticle = null;
    callbacks = {};
    isProcessingBackspace = false;
    currentCell = null;
    currentRowIndex = -1;
    currentColIndex = -1;
}

function prevenirScrollEspacio(e) {
    if (e.key === ' ' && (document.activeElement?.classList.contains('cell-input') || document.activeElement?.classList.contains('cell-span'))) {
        e.preventDefault();
    }
}

function manejarKeydown(e) {
    const target = e.target;
    const isInput = target.classList.contains('cell-input');
    const isSpan = target.classList.contains('cell-span');
    if (!isInput && !isSpan) return;

    actualizarCoordenadasDesdeElemento(target);

    // Ctrl+Enter
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const btnCalcular = document.getElementById("btnCalcularEV");
        if (btnCalcular && !btnCalcular.disabled) btnCalcular.click();
        return;
    }

    if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const movido = manejarFlechas(e.key);
        if (movido && isInput) inputToSpan(target);
        if (callbacks.onSync) callbacks.onSync();
        return;
    }

    if (e.key === ' ') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        if (callbacks.onSpace) callbacks.onSpace(currentRowIndex, currentColIndex);
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        if (callbacks.onEnter) callbacks.onEnter();
        return;
    }

    if (e.key === 'Tab') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        moverDerecha();
        if (callbacks.onSync) callbacks.onSync();
        return;
    }

    if (e.key === 'Escape') {
        if (isInput) {
            inputToSpan(target);
            target.blur();
        }
        if (callbacks.onSync) callbacks.onSync();
        return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        
        if (isInput) {
            if (target.value !== "") {
                const newValue = target.value.slice(0, -1);
                target.value = newValue;
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.focus();
                target.setSelectionRange(target.value.length, target.value.length);
                return;
            }
            inputToSpan(target);
            if (!procesarBorradoEstructural(currentRowIndex, currentColIndex)) {
                moverIzquierda();
                if (callbacks.onSync) callbacks.onSync();
            }
        } else if (isSpan) {
            target.setAttribute('data-value', '');
            target.innerHTML = '';
            target.textContent = '';
            target.classList.remove('cell-error');
            actualizarBotonCalcularEV();
            if (!procesarBorradoEstructural(currentRowIndex, currentColIndex)) {
                moverIzquierda();
                if (callbacks.onSync) callbacks.onSync();
            }
        }
        return;
    }
}


function valorEditableVacio(elemento) {
    if (!elemento) return true;
    const valor = elemento.classList.contains('cell-input')
        ? elemento.value
        : (elemento.getAttribute('data-value') || elemento.textContent || "");
    return String(valor || "").trim() === "";
}

function filaVaciaEV(rowIdx) {
    const filasVectores = obtenerFilasDeVectores();
    const row = filasVectores[rowIdx];
    if (!row) return false;
    const cells = getComponenteCellsFromRow(row);
    return cells.every(({ element }) => valorEditableVacio(element));
}

function columnaVaciaEV(colIdx) {
    const filasVectores = obtenerFilasDeVectores();
    if (!filasVectores.length) return false;
    return filasVectores.every(row => {
        const cells = getComponenteCellsFromRow(row);
        return valorEditableVacio(cells[colIdx]?.element);
    });
}

function procesarBorradoEstructural(rowIdx, colIdx) {
    if (!callbacks.onBackspace) return false;

    const filasVectores = obtenerFilasDeVectores();
    const numFilas = filasVectores.length;
    const numColumnas = filasVectores[0] ? getComponenteCellsFromRow(filasVectores[0]).length : 0;
    const minFilas = 2;
    const minColumnas = 2;

    const puedeBorrarFila = numFilas > minFilas && filaVaciaEV(rowIdx);
    const puedeBorrarColumna = numColumnas > minColumnas && columnaVaciaEV(colIdx);

    let tipo = null;
    if (puedeBorrarFila && puedeBorrarColumna) tipo = 'ambos';
    else if (puedeBorrarFila) tipo = 'fila';
    else if (puedeBorrarColumna) tipo = 'columna';

    if (!tipo) return false;

    callbacks.onBackspace(rowIdx, colIdx, tipo);
    return true;
}

function manejarClick(e) {
    const target = e.target;
    if (target.classList.contains('cell-span')) {
        actualizarCoordenadasDesdeElemento(target);
        spanToInput(target);
    }
}

function manejarBeforeInput(e) {
    const input = e.target;
    if (!input || !input.classList.contains('cell-input')) return;

    const data = e.data || "";
    const esEspacioMovil = e.inputType === 'insertText' && /\s/.test(data);
    if (!esEspacioMovil) return;

    e.preventDefault();
    actualizarCoordenadasDesdeElemento(input);
    input.value = input.value.replace(/\s+/g, '');
    inputToSpan(input);

    if (callbacks.onSpace) callbacks.onSpace(currentRowIndex, currentColIndex);
    if (callbacks.onSync) callbacks.onSync();
}

function manejarInput(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;

    let valor = input.value;

    if (/\s/.test(valor)) {
        input.value = valor.replace(/\s+/g, '');
        inputToSpan(input);
        if (callbacks.onSpace) callbacks.onSpace(currentRowIndex, currentColIndex);
        if (callbacks.onSync) callbacks.onSync();
        return;
    }
    
    if (!esEntradaValidaEV(valor)) {
        input.classList.add('cell-error');
        actualizarBotonCalcularEV();
        let cleanValue = valor.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
        cleanValue = cleanValue.replace(/[^0-9\-\/\.]/g, '');
        if (cleanValue !== valor) {
            input.value = cleanValue;
            valor = cleanValue;
        }
    } else {
        input.classList.remove('cell-error');
    }
    
    const slashCount = (valor.match(/\//g) || []).length;
    if (slashCount > 1) {
        const primeraBarra = valor.indexOf('/');
        valor = valor.substring(0, primeraBarra + 1) + valor.substring(primeraBarra + 1).replace(/\//g, '');
        input.value = valor;
    }
    
    input.style.width = (input.value.length + 1) + "ch";
    actualizarBotonCalcularEV();
    if (callbacks.onSync) callbacks.onSync();
}

function manejarFocusout(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;
    if (isProcessingBackspace) return;
    
    const valor = input.value.trim();
    if (valor !== '' && !esEntradaValidaEV(valor)) {
        input.classList.add('cell-error');
        actualizarBotonCalcularEV();
    }
    
    inputToSpan(input);
    
    if (currentTable) {
        setTimeout(() => {
            if (currentCell) {
                ajustarTodasColumnasEV(currentTable);
            }
            actualizarBotonCalcularEV();
        }, 10);
    }
    
    if (callbacks.onSync) callbacks.onSync();
}
