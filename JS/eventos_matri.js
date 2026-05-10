import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, spanToInput, inputToSpan } from "./celdas.js";
import { actualizarSeparadorGlobal, getCurrentOperation } from "./ux_matrices.js";
import { syncTableToFileData } from "./dragDrop.js";

let keydownHandler = null;
let inputHandler = null;
let clickHandler = null;
let pasteHandler = null;
let currentTable = null;
let currentRow = 0;
let currentCol = 0;
let lastKeyTime = 0;
export function desconfigurarEventosMatri(article) {
    if (keydownHandler) article.removeEventListener('keydown', keydownHandler);
    if (inputHandler) article.removeEventListener('input', inputHandler);
    if (clickHandler) article.removeEventListener('click', clickHandler);
    if (pasteHandler) article.removeEventListener('paste', pasteHandler);
    
    keydownHandler = null;
    inputHandler = null;
    clickHandler = null;
    pasteHandler = null;
    currentTable = null;
}

export function configurarEventos(article, table, operation) {
    currentTable = table;

    if (keydownHandler) article.removeEventListener('keydown', keydownHandler);
    if (inputHandler) article.removeEventListener('input', inputHandler);
    if (clickHandler) article.removeEventListener('click', clickHandler);
    if (pasteHandler) article.removeEventListener('paste', pasteHandler);

    keydownHandler = (e) => manejarKeydown(e);
    inputHandler = manejarInput;
    clickHandler = (e) => manejarClick(e);
    pasteHandler = (e) => manejarPegado(e);

    article.addEventListener('keydown', keydownHandler);
    article.addEventListener('input', inputHandler);
    article.addEventListener('click', clickHandler);
    article.addEventListener('paste', pasteHandler);

    // Prevenir el scroll por espacio en la página completa
    window.addEventListener('keydown', function (e) {
        if (e.key === ' ' && document.activeElement &&
            (document.activeElement.classList.contains('cell-input') ||
                document.activeElement.classList.contains('cell-span'))) {
            e.preventDefault();
        }
    });
}

function actualizarCoordenadasDesdeElemento(elemento) {
    const td = elemento.closest('td');
    const tr = td?.closest('tr');
    if (tr && td) {
        currentRow = tr.rowIndex;
        currentCol = td.cellIndex;
    }
}

function obtenerCelda(row, col) {
    if (!currentTable) return null;
    if (row < 0 || col < 0) return null;
    if (row >= currentTable.rows.length) return null;
    const targetRow = currentTable.rows[row];
    if (!targetRow || col >= targetRow.cells.length) return null;
    return targetRow.cells[col];
}

function obtenerElementoEditableEnCelda(cell) {
    if (!cell) return null;
    let input = cell.querySelector('.cell-input');
    if (input) return input;
    let span = cell.querySelector('.cell-span');
    if (span) return span;
    return null;
}

function enfocarCelda(row, col, mantenerValor = false) {
    if (!currentTable) return false;

    const cell = obtenerCelda(row, col);
    if (!cell) return false;

    const elemento = obtenerElementoEditableEnCelda(cell);
    if (!elemento) return false;

    currentRow = row;
    currentCol = col;

    if (elemento.classList.contains('cell-span')) {
        const input = spanToInput(elemento);
        if (input) {
            if (!mantenerValor) {
                input.focus();
                input.select();
            }
            return true;
        }
        return false;
    }

    if (elemento.classList.contains('cell-input')) {
        elemento.focus();
        if (!mantenerValor) {
            elemento.select();
        }
        return true;
    }

    return false;
}

function moverIzquierda() {
    if (currentCol > 0) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
                ajustarAnchoColumna(currentTable, currentCol);
            }
        }
        enfocarCelda(currentRow, currentCol - 1);
    }
}

function moverDerecha() {
    const maxCol = currentTable.rows[currentRow]?.cells.length - 1 || 0;
    if (currentCol < maxCol) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
                ajustarAnchoColumna(currentTable, currentCol);
            }
        }
        enfocarCelda(currentRow, currentCol + 1);
    }
}

function moverArriba() {
    if (currentRow > 0) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
                ajustarAnchoColumna(currentTable, currentCol);
            }
        }
        const targetCol = Math.min(currentCol, currentTable.rows[currentRow - 1].cells.length - 1);
        enfocarCelda(currentRow - 1, targetCol);
    }
}

function moverAbajo() {
    if (currentRow < currentTable.rows.length - 1) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
                ajustarAnchoColumna(currentTable, currentCol);
            }
        }
        const targetCol = Math.min(currentCol, currentTable.rows[currentRow + 1].cells.length - 1);
        enfocarCelda(currentRow + 1, targetCol);
    }
}

function crearNuevaColumna(table, rowIndex, colIndex) {
    Auxiliares.insertarColumna(table, colIndex + 1);
    if (getCurrentOperation() === "axb") {
        actualizarSeparadorGlobal(table);
    }
    setTimeout(() => {
        enfocarCelda(rowIndex, colIndex + 1);
    }, 10);
}

function crearNuevaFila(table, rowIndex, colIndex) {
    Auxiliares.insertarFila(table, rowIndex + 1);
    if (getCurrentOperation() === "axb") {
        requestAnimationFrame(() => actualizarSeparadorGlobal(table));
    }
    const numCols = table.rows[0].cells.length;
    for (let j = 0; j < numCols; j++) {
        ajustarAnchoColumna(table, j);
    }
    setTimeout(() => {
        enfocarCelda(rowIndex + 1, colIndex);
    }, 10);
}

// ========== VALIDACIÓN DE ENTRADA ==========

function esEntradaValida(valor) {
    if (valor === '') return true;
    if (valor === '-') return true; // Permitir escribir el signo negativo
    
    // Detectar letras (incluyendo acentuadas)
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(valor)) return false;
    
    // Detectar cualquier carácter no permitido
    if (/[^0-9\-\/\.]/.test(valor)) return false;
    
    // Detectar más de una barra diagonal
    const slashCount = (valor.match(/\//g) || []).length;
    if (slashCount > 1) return false;
    
    // Detectar dos puntos consecutivos
    if (/\.\./.test(valor)) return false;
    
    // Detectar dos puntos en la misma parte (antes o después de la barra)
    if (valor.includes('/')) {
        const parts = valor.split('/');
        if (parts.length > 2) return false;
        
        const left = parts[0];
        const right = parts[1] !== undefined ? parts[1] : '';
        
        // Numerador: no puede tener más de un punto
        if ((left.match(/\./g) || []).length > 1) return false;
        
        // Denominador: no puede tener más de un punto
        if ((right.match(/\./g) || []).length > 1) return false;
        
        // Patrones válidos para numerador 
        if (left !== '' && left !== '-' && !/^-?\d*\.?\d*$/.test(left)) return false;
        
        // Patrones válidos para denominador 
        if (right !== '' && right !== '-' && !/^-?\d*\.?\d*$/.test(right)) return false;
        
        // Símbolo justo antes de la barra 
        if (left !== '' && left !== '-' && /[^0-9\.]\//.test(valor) && !/\/-/.test(valor)) {
            // Permitir si es un punto seguido de barra 
            if (!/\.\//.test(valor)) return false;
        }
    } else {
        // Sin barra: validar formato de número
        if (valor !== '-' && !/^-?\d*\.?\d*$/.test(valor)) return false;
        
        // No puede tener más de un punto
        if ((valor.match(/\./g) || []).length > 1) return false;
    }
    
    return true;
}

// ========== MANEJADORES DE EVENTOS ==========

function manejarPegado(e) {
    const target = e.target;

    // Solo procesar pegado en inputs de celda
    if (!target.classList.contains('cell-input')) return;

    e.preventDefault();

    // Obtener texto pegado
    const clipboardData = e.clipboardData || window.clipboardData;
    let textoPegado = clipboardData.getData('text/plain');

    if (!textoPegado) return;

    // Limpiar el texto pegado: eliminar todo lo que no sea un carácter válido de matriz
    textoPegado = textoPegado.trim();

    // Eliminar todas las letras y símbolos inválidos
    // Solo mantener: dígitos, signo menos, barra diagonal, punto, espacios, tabs, saltos de línea, comas, punto y coma
    textoPegado = textoPegado.replace(/[^0-9\-\/\.\s\,\;\n\r\t]/g, '');

    // Si no queda nada válido, no pegar
    if (!textoPegado) return;

    // Obtener posición actual del cursor
    const inicio = target.selectionStart;
    const fin = target.selectionEnd;
    const valorActual = target.value;

    // Insertar texto limpio en la posición del cursor
    const nuevoValor = valorActual.substring(0, inicio) + textoPegado + valorActual.substring(fin);

    // Validar el nuevo valor
    if (!esEntradaValida(nuevoValor)) {
        return;
    }

    // Aplicar el valor limpio
    target.value = nuevoValor;
    target.setSelectionRange(inicio + textoPegado.length, inicio + textoPegado.length);

    // Disparar evento input para ajuste de ancho y validación
    target.dispatchEvent(new Event('input', { bubbles: true }));

    // Sincronizar con archivo si existe
    setTimeout(() => {
        syncTableToFileData();
    }, 100);
}

function manejarClick(e) {
    const target = e.target;
    const table = currentTable;
    if (!table) return;

    const allInputs = table.querySelectorAll('.cell-input');
    allInputs.forEach(input => {
        const inputCell = input.closest('td');
        const clickedCell = target.closest('td');
        if (inputCell !== clickedCell) {
            inputToSpan(input);
            ajustarAnchoColumna(currentTable, currentCol);
        }
    });

    if (target.classList.contains('cell-span') || target.classList.contains('cell-input')) {
        actualizarCoordenadasDesdeElemento(target);
    } else if (target.closest('.frac')) {
        const span = target.closest('.cell-span');
        if (span) actualizarCoordenadasDesdeElemento(span);
    } else if (target.tagName === 'TD') {
        const span = target.querySelector('.cell-span');
        if (span) actualizarCoordenadasDesdeElemento(span);
    }

    if (target.classList.contains('cell-span')) {
        e.preventDefault();
        e.stopPropagation();
        const input = spanToInput(target);
        if (input) {
            actualizarCoordenadasDesdeElemento(input);
        }
        return;
    }

    if (target.closest('.frac') && target.closest('.cell-span')) {
        const span = target.closest('.cell-span');
        e.preventDefault();
        e.stopPropagation();
        const input = spanToInput(span);
        if (input) {
            actualizarCoordenadasDesdeElemento(input);
        }
        return;
    }

    if (target.tagName === 'TD') {
        const span = target.querySelector('.cell-span');
        if (span) {
            e.preventDefault();
            const input = spanToInput(span);
            if (input) {
                actualizarCoordenadasDesdeElemento(input);
            }
        }
    }
}

function manejarInput(e) {
    const input = e.target;
    if (input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return;

    actualizarCoordenadasDesdeElemento(input);

    let valor = input.value;
    
    // Bloquear cualquier letra inmediatamente
    const tieneLetras = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(valor);
    if (tieneLetras) {
        // Eliminar TODAS las letras
        valor = valor.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
        input.value = valor;
        
        // Si después de eliminar letras el valor queda vacío o inválido, limpiar
        if (valor === '' || !esEntradaValida(valor)) {
            input.value = '';
            input.style.width = "5ch";
            syncTableToFileData();
            return;
        }
    }
    
    // Bloquear símbolos inválidos (cualquier cosa que no sea dígito, menos, barra o punto)
    const simbolosInvalidos = /[^0-9\-\/\.]/g;
    if (simbolosInvalidos.test(valor)) {
        valor = valor.replace(simbolosInvalidos, '');
        input.value = valor;
    }
    
    // Bloquear doble barra diagonal o más
    if ((valor.match(/\//g) || []).length > 1) {
        // Quedarse solo con la primera barra y eliminar el resto
        const primeraBarra = valor.indexOf('/');
        valor = valor.substring(0, primeraBarra + 1) + valor.substring(primeraBarra + 1).replace(/\//g, '');
        input.value = valor;
        syncTableToFileData();
        return;
    }
    
    if (valor === "") {
        syncTableToFileData();
        return;
    }

    // Convertir .5 a 0.5
    if (/^\.\d/.test(valor)) {
        input.value = '0' + valor;
        syncTableToFileData();
        return;
    }
    if (/^-\.\d/.test(valor)) {
        input.value = '-0' + valor.substring(1);
        syncTableToFileData();
        return;
    }
    if (/\/(\.\d)/.test(valor)) {
        const partes = valor.split('/');
        if (partes[1] && partes[1].startsWith('.')) {
            input.value = partes[0] + '/0.' + partes[1].substring(1);
            syncTableToFileData();
            return;
        }
    }
    if (/\/(-\.\d)/.test(valor)) {
        const partes = valor.split('/');
        if (partes[1] && partes[1].startsWith('-.')) {
            input.value = partes[0] + '/-0.' + partes[1].substring(2);
            syncTableToFileData();
            return;
        }
    }

    // Bloquear múltiples puntos en una misma parte
    if (valor.includes('./')) {
        input.value = valor.slice(0, -1);
        syncTableToFileData();
        return;
    }

    const partes = valor.split('/');

    // Bloquear más de una barra diagonal (doble verificación)
    if (partes.length > 2) {
        input.value = partes[0] + '/' + partes[1];
        syncTableToFileData();
        return;
    }

    // Verificar puntos por cada parte de la fracción
    if (partes.length === 2) {
        const izquierda = partes[0];
        const derecha = partes[1];
        if ((izquierda.match(/\./g) || []).length > 1) {
            input.value = valor.slice(0, -1);
            syncTableToFileData();
            return;
        }
        if ((derecha.match(/\./g) || []).length > 1) {
            input.value = valor.slice(0, -1);
            syncTableToFileData();
            return;
        }
        
        // Bloquear símbolos justo antes de la barra (excepto dígitos y punto)
        if (izquierda.length > 0 && /[^0-9\.]\//.test(valor) && !/\/-/.test(valor)) {
            // Si lo que está antes de la barra no es un dígito ni un punto, eliminar el último carácter
            input.value = valor.slice(0, -2) + valor.slice(-1);
            syncTableToFileData();
            return;
        }
    } else {
        if ((valor.match(/\./g) || []).length > 1) {
            input.value = valor.slice(0, -1);
            syncTableToFileData();
            return;
        }
    }

    // Verificar signos negativos
    const negativos = (valor.match(/-/g) || []).length;

    if (negativos > 2) {
        input.value = valor.slice(0, -1);
        syncTableToFileData();
        return;
    }

    if (negativos === 2) {
        if (!/^-\d*\.?\d*\/-\d*\.?\d*$/.test(valor)) {
            input.value = valor.slice(0, -1);
            syncTableToFileData();
            return;
        }
    }

    if (negativos === 1) {
        const esNegativoAlInicio = valor.indexOf('-') === 0;
        const esNegativoEnDenominador = /\/-/.test(valor);
        if (!esNegativoAlInicio && !esNegativoEnDenominador) {
            input.value = valor.slice(0, -1);
            syncTableToFileData();
            return;
        }
    }

    // Validación final con expresión regular
    const regex = /^-?\d*\.?\d*(\/-?\d*\.?\d*)?$/;
    if (!regex.test(valor)) {
        input.value = valor.slice(0, -1);
        syncTableToFileData();
        return;
    }
    
    input.style.width = (input.value.length + 1) + "ch";
    
    // Sincronizar después de entrada válida
    setTimeout(() => {
        syncTableToFileData();
    }, 100);
}

function manejarKeydown(e) {
    const table = currentTable;
    if (!table) return;

    const target = e.target;

    const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape', 'Backspace'];
    if (navigationKeys.includes(e.key)) {
        if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) {
            e.preventDefault();
        }
    }

    if (target.classList.contains('cell-span')) {
        actualizarCoordenadasDesdeElemento(target);
        manejarKeydownSpan(e, table, target);
        return;
    }

    if (target.tagName === 'INPUT' && target.classList.contains('cell-input')) {
        actualizarCoordenadasDesdeElemento(target);

        if (e.ctrlKey && e.key === 'Enter') {
            const btn = document.getElementById("btnCalcular");
            if (btn) btn.click();
            const allInputs = currentTable.querySelectorAll('.cell-input');
            allInputs.forEach(input => inputToSpan(input));

            const numCols = currentTable.rows[0].cells.length;
            for (let j = 0; j < numCols; j++) {
                ajustarAnchoColumna(currentTable, j);
            }

            // Sincronizar después de calcular
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'Tab') {
            const input = target;
            const cell = input.closest('td');
            const row = cell.parentElement;
            const rowIndex = row.rowIndex;
            const colIndex = cell.cellIndex;

            inputToSpan(input);
            ajustarAnchoColumna(currentTable, currentCol);

            if (colIndex < row.cells.length - 1) {
                enfocarCelda(rowIndex, colIndex + 1);
            } else if (rowIndex < table.rows.length - 1) {
                enfocarCelda(rowIndex + 1, 0);
            } else {
                const btn = document.getElementById("btnCalcular");
                if (btn) btn.focus();
            }

            // Sincronizar después de navegación
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'Escape') {
            inputToSpan(target);
            ajustarAnchoColumna(currentTable, currentCol);
            target.blur();
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'ArrowLeft') {
            moverIzquierda();
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'ArrowRight') {
            moverDerecha();
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'ArrowUp') {
            moverArriba();
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'ArrowDown') {
            moverAbajo();
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === ' ') {
            const cell = target.closest('td');
            const row = cell.parentElement;
            inputToSpan(target);
            ajustarAnchoColumna(currentTable, currentCol);
            crearNuevaColumna(table, row.rowIndex, cell.cellIndex);
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        if (e.key === 'Enter') {
            estructuraEnter(table, target);
            setTimeout(() => syncTableToFileData(), 100);
            return;
        }

        estructuraBackspace(e, table, target);
        return;
    }
}
function manejarKeydownSpan(e, table, span) {
    const cell = span.closest('td');
    if (!cell) return;
    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    // NUEVO: Ctrl+Enter para calcular
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const btnCalcular = document.getElementById("btnCalcularEV");
        if (btnCalcular && !btnCalcular.disabled) {
            btnCalcular.click();
        }
        return;
    }

    switch (e.key) {
        case 'Enter':
            spanToInput(span);
            setTimeout(() => {
                const input = cell.querySelector('.cell-input');
                if (input) {
                    actualizarCoordenadasDesdeElemento(input);
                    estructuraEnter(table, input);
                }
            }, 10);
            break;

        case ' ':
            e.preventDefault();
            crearNuevaColumna(table, rowIndex, colIndex);
            break;

        case 'Backspace':
            e.preventDefault();
            span.setAttribute('data-value', '');
            span.innerHTML = '';
            span.textContent = '';
            if (colIndex > 0) {
                enfocarCelda(rowIndex, colIndex - 1);
            } else if (rowIndex > 0) {
                const prevRow = table.rows[rowIndex - 1];
                enfocarCelda(rowIndex - 1, prevRow.cells.length - 1);
            }
            setTimeout(() => syncTableToFileData(), 100);
            break;

        case 'ArrowLeft':
            e.preventDefault();
            moverIzquierda();
            break;

        case 'ArrowRight':
            e.preventDefault();
            moverDerecha();
            break;

        case 'ArrowUp':
            e.preventDefault();
            moverArriba();
            break;

        case 'ArrowDown':
            e.preventDefault();
            moverAbajo();
            break;

        default:
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== ' ') {
                e.preventDefault();
                if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(e.key)) {
                    return;
                }
                const input = spanToInput(span);
                if (input) {
                    actualizarCoordenadasDesdeElemento(input);
                    input.value = e.key;
                    input.setSelectionRange(1, 1);
                }
            }
            break;
    }
}

// ========== ESTRUCTURA ==========

function estructuraEnter(table, input) {
    const cell = input.closest('td');
    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    inputToSpan(input);
    ajustarAnchoColumna(currentTable, currentCol);
    crearNuevaFila(table, rowIndex, colIndex);
}

function estructuraBackspace(e, table, input) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;
    const currentOp = getCurrentOperation();

    const cell = input.closest('td');
    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    if (e.key === 'Backspace' && input.value === "") {
        e.preventDefault();
        const emptySpan = crearSpanCelda("", rowIndex, colIndex);
        input.replaceWith(emptySpan);
        actualizarCoordenadasDesdeElemento(emptySpan);

        let prevRowIndex = rowIndex;
        let prevColIndex = colIndex - 1;
        if (colIndex > 0) {
            prevColIndex = colIndex - 1;
            prevRowIndex = rowIndex;
        } else if (rowIndex > 0) {
            prevRowIndex = rowIndex - 1;
            prevColIndex = table.rows[rowIndex - 1].cells.length - 1;
        }
        if (prevColIndex >= 0 && prevRowIndex >= 0) {
            enfocarCelda(prevRowIndex, prevColIndex);
        }

        setTimeout(() => {
            if (table.rows.length > minRows && Auxiliares.filaVacia(table, rowIndex)) {
                Auxiliares.eliminarFila(table, rowIndex);
                if (currentOp === "axb") {
                    actualizarSeparadorGlobal(table);
                }
                syncTableToFileData();
                return;
            }
            if (table.rows[0].cells.length > minCols && Auxiliares.columnaVacia(table, colIndex)) {
                Auxiliares.eliminarColumna(table, colIndex);
                if (currentOp === "axb") {
                    actualizarSeparadorGlobal(table);
                }
            }
            syncTableToFileData();
        }, 0);
    }
}

export function ajustarAnchoColumna(table, colIndex) {
    const MIN_WIDTH = 5;
    let maxChars = MIN_WIDTH;

    for (let i = 0; i < table.rows.length; i++) {
        const cell = table.rows[i].cells[colIndex];
        if (!cell) continue;

        const el = obtenerElementoEditableEnCelda(cell);
        if (el) {
            const val = el.tagName === 'INPUT' ? el.value : (el.getAttribute('data-value') || "");
            if (val.length > maxChars) {
                maxChars = val.length;
            }
        }
    }


    const finalWidth = (maxChars + 1) + "ch";

    for (let i = 0; i < table.rows.length; i++) {
        const cell = table.rows[i].cells[colIndex];
        if (cell) {
            const el = obtenerElementoEditableEnCelda(cell);
            if (el) {
                el.style.width = finalWidth;
                el.style.minWidth = finalWidth;
            }
        }
    }
}