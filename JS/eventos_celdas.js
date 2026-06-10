/**
 * eventos_celdas.js
 * Manejador unificado de eventos para celdas editables.
 * Reemplaza eventos_matri.js (modo MATRIZ) y eventos_ev.js (modo EV).
 *
 * API pública:
 *   configurarEventos(article, table, operation)   ← modo Matrices
 *   configurarEventosEV(article, table, callbacks) ← modo EV
 *   desconfigurarEventos()                         ← limpia ambos modos
 *   ajustarAnchoColumna(table, colIndex)           ← util compartida
 *
 * Exportaciones de compatibilidad:
 *   desconfigurarEventosMatri  → alias de desconfigurarEventos
 *   desconfigurarEventosEV     → alias de desconfigurarEventos
 */

import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, spanToInput, inputToSpan } from "./celdas.js";
import { actualizarSeparadorGlobal, getCurrentOperation } from "./ux_matrices.js";
import { syncTableToFileData } from "./dragDrop.js";
import { actualizarBotonCalcularEV } from "./celdas.js";

// ─────────────────────────────────────────────
// Estado compartido
// ─────────────────────────────────────────────
let _article       = null;
let _table         = null;
let _mode          = null;   // "matrix" | "ev"
let _callbacks     = {};     // solo EV usa esto

// Coordinadas de celda activa
let _row = 0;
let _col = 0;

// Handlers guardados para poder limpiarlos
let _onMousedown   = null;
let _onKeydown     = null;
let _onInput       = null;
let _onPaste       = null;
let _onBeforeInput = null;
let _onFocusout    = null;
let _onWindowKey   = null;

// ─────────────────────────────────────────────
// Helpers de celda (compartidos)
// ─────────────────────────────────────────────

function _getEditable(cell) {
    if (!cell) return null;
    return cell.querySelector('.cell-input') ?? cell.querySelector('.cell-span') ?? null;
}

function _coordsFromElement(el) {
    const td = el.closest('td');
    const tr = td?.closest('tr');
    if (!td || !tr) return;

    if (_mode === "ev") {
        const filas = _evGetVectorRows();
        for (let i = 0; i < filas.length; i++) {
            if (filas[i] === tr) { _row = i; break; }
        }
        const cells = _evGetComponentCells(tr);
        for (let j = 0; j < cells.length; j++) {
            if (cells[j].cell === td) { _col = j; break; }
        }
    } else {
        _row = tr.rowIndex;
        _col = td.cellIndex;
    }
}

function _focusInput(input) {
    input.focus();
    input.select();
}

// ─────────────────────────────────────────────
// Focus management (compartido)
// ─────────────────────────────────────────────

/** Convierte el span de (row, col) a input y le da foco. */
function _focusCell(row, col) {
    if (!_table) return false;

    let cell;
    if (_mode === "ev") {
        cell = _evGetCell(row, col);
    } else {
        if (row < 0 || row >= _table.rows.length) return false;
        const tr = _table.rows[row];
        if (!tr || col < 0 || col >= tr.cells.length) return false;
        cell = tr.cells[col];
    }
    if (!cell) return false;

    _row = row;
    _col = col;

    const el = _getEditable(cell);
    if (!el) return false;

    if (el.classList.contains('cell-span')) {
        const input = spanToInput(el);
        if (input) { _focusInput(input); return true; }
        return false;
    }
    if (el.classList.contains('cell-input')) {
        _focusInput(el);
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────
// Navegación matriz
// ─────────────────────────────────────────────

function _matrixLeft() {
    if (_col > 0) { _commitCurrentCell(); _focusCell(_row, _col - 1); }
}
function _matrixRight() {
    const maxCol = (_table.rows[_row]?.cells.length ?? 1) - 1;
    if (_col < maxCol) { _commitCurrentCell(); _focusCell(_row, _col + 1); }
}
function _matrixUp() {
    if (_row > 0) {
        _commitCurrentCell();
        const tc = Math.min(_col, (_table.rows[_row - 1]?.cells.length ?? 1) - 1);
        _focusCell(_row - 1, tc);
    }
}
function _matrixDown() {
    if (_row < _table.rows.length - 1) {
        _commitCurrentCell();
        const tc = Math.min(_col, (_table.rows[_row + 1]?.cells.length ?? 1) - 1);
        _focusCell(_row + 1, tc);
    }
}

/** Guarda el input activo como span si tiene contenido. */
function _commitCurrentCell() {
    const cell = _table?.rows[_row]?.cells[_col];
    if (!cell) return;
    const input = cell.querySelector('.cell-input');
    if (input && input.value.trim() !== "") {
        inputToSpan(input);
        ajustarAnchoColumna(_table, _col);
    }
}

// ─────────────────────────────────────────────
// Navegación EV
// ─────────────────────────────────────────────

function _evGetVectorRows() {
    if (!_table) return [];
    return Array.from(_table.rows).filter(row => {
        const first = row.cells[0];
        return first && (first.innerHTML.includes("α") || first.innerHTML.includes("β"));
    });
}

function _evGetComponentCells(row) {
    const cells = [];
    for (let i = 2; i < row.cells.length - 1; i++) {
        const cell = row.cells[i];
        const el = cell.querySelector('.cell-span') ?? cell.querySelector('.cell-input');
        if (el) cells.push({ cell, element: el, colIndex: cells.length });
    }
    return cells;
}

function _evGetCell(rowIdx, colIdx) {
    const rows = _evGetVectorRows();
    if (rowIdx < 0 || rowIdx >= rows.length) return null;
    const cells = _evGetComponentCells(rows[rowIdx]);
    if (colIdx < 0 || colIdx >= cells.length) return null;
    return cells[colIdx].cell;
}

function _evLeft() {
    if (_col > 0) {
        _focusCell(_row, _col - 1);
    } else if (_row > 0) {
        const rows = _evGetVectorRows();
        const prev = _evGetComponentCells(rows[_row - 1]);
        _focusCell(_row - 1, prev.length - 1);
    }
}
function _evRight() {
    const rows = _evGetVectorRows();
    const cur = _evGetComponentCells(rows[_row]);
    if (_col < cur.length - 1) {
        _focusCell(_row, _col + 1);
    } else if (_row < rows.length - 1) {
        _focusCell(_row + 1, 0);
    }
}
function _evUp() {
    if (_row > 0) {
        const rows = _evGetVectorRows();
        const prev = _evGetComponentCells(rows[_row - 1]);
        _focusCell(_row - 1, Math.min(_col, prev.length - 1));
    }
}
function _evDown() {
    const rows = _evGetVectorRows();
    if (_row < rows.length - 1) {
        const next = _evGetComponentCells(rows[_row + 1]);
        _focusCell(_row + 1, Math.min(_col, next.length - 1));
    }
}

function _evMove(key) {
    switch (key) {
        case 'ArrowLeft':  _evLeft();  break;
        case 'ArrowRight': _evRight(); break;
        case 'ArrowUp':    _evUp();    break;
        case 'ArrowDown':  _evDown();  break;
    }
}

// ─────────────────────────────────────────────
// Handler: mousedown (abre celda al hacer click)
// ─────────────────────────────────────────────

function _handleMousedown(e) {
    const target = e.target;
    if (!_table) return;

    // Si el usuario clickeó dentro de un input activo, no interferir
    if (target.classList.contains('cell-input')) return;

    // Resolver span objetivo
    let span = null;
    let td   = null;

    if (target.classList.contains('cell-span')) {
        span = target; td = target.closest('td');
    } else if (target.closest('.cell-span')) {
        span = target.closest('.cell-span'); td = span.closest('td');
    } else if (target.tagName === 'TD') {
        td = target; span = td.querySelector('.cell-span');
    } else if (target.closest('td')) {
        td = target.closest('td'); span = td?.querySelector('.cell-span');
    }

    if (!td || !span) return;

    // Tomar control del foco
    e.preventDefault();

    // Cerrar cualquier input abierto en otra celda
    _table.querySelectorAll('.cell-input').forEach(inp => {
        if (inp.closest('td') !== td) {
            inputToSpan(inp);
            const c = inp.closest('td');
            if (c) ajustarAnchoColumna(_table, c.cellIndex);
        }
    });

    _coordsFromElement(span);
    if (_callbacks.onFocusUpdate) _callbacks.onFocusUpdate(_row, _col);

    const input = spanToInput(span);
    if (input) {
        _coordsFromElement(input);
        _focusInput(input);
    }
}

// ─────────────────────────────────────────────
// Handler: keydown
// ─────────────────────────────────────────────

function _handleKeydown(e) {
    const target = e.target;
    const isInput = target.classList.contains('cell-input');
    const isSpan  = target.classList.contains('cell-span');
    if (!isInput && !isSpan) return;

    _coordsFromElement(target);
    if (_callbacks.onFocusUpdate) _callbacks.onFocusUpdate(_row, _col);

    // Ctrl+Enter → calcular
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const btnId = _mode === "ev" ? "btnCalcularEV" : "btnCalcular";
        const btn = document.getElementById(btnId);
        if (btn && !btn.disabled) {
            if (!isInput) { /* span, nada que commitear */ }
            else { _commitAllInputs(); }
            btn.click();
        }
        return;
    }

    if (_mode === "ev") {
        _keydownEV(e, target, isInput, isSpan);
    } else {
        _keydownMatrix(e, target, isInput, isSpan);
    }
}

function _commitAllInputs() {
    _table?.querySelectorAll('.cell-input').forEach(inp => inputToSpan(inp));
}

// ── keydown modo MATRIZ ──

function _keydownMatrix(e, target, isInput, isSpan) {
    const table = _table;

    if (isSpan) {
        _keydownMatrixSpan(e, target);
        return;
    }

    // isInput
    const cell = target.closest('td');
    const row  = cell?.parentElement;
    if (!cell || !row) return;

    if (e.key === 'Tab') {
        e.preventDefault();
        inputToSpan(target); ajustarAnchoColumna(table, _col);
        if (_col < (row.cells.length - 1)) _focusCell(_row, _col + 1);
        else if (_row < table.rows.length - 1) _focusCell(_row + 1, 0);
        else document.getElementById("btnCalcular")?.focus();
        _sync(); return;
    }
    if (e.key === 'Escape') {
        inputToSpan(target); ajustarAnchoColumna(table, _col);
        target.blur(); _sync(); return;
    }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); _matrixLeft();  _sync(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); _matrixRight(); _sync(); return; }
    if (e.key === 'ArrowUp')    { e.preventDefault(); _matrixUp();    _sync(); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); _matrixDown();  _sync(); return; }

    if (e.key === ' ') {
        e.preventDefault();
        inputToSpan(target); ajustarAnchoColumna(table, _col);
        _matrixNewCol(table, row.rowIndex, cell.cellIndex);
        _sync(); return;
    }
    if (e.key === 'Enter') {
        _matrixStructEnter(table, target); _sync(); return;
    }

    _matrixStructBackspace(e, table, target);
}

function _keydownMatrixSpan(e, span) {
    const cell = span.closest('td');
    if (!cell) return;
    const row      = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;
    const table    = _table;

    if (e.ctrlKey && e.key === 'Enter') return; // ya manejado arriba

    switch (e.key) {
        case 'Enter':
            spanToInput(span);
            setTimeout(() => {
                const inp = cell.querySelector('.cell-input');
                if (inp) { _coordsFromElement(inp); _matrixStructEnter(table, inp); }
            }, 10);
            break;
        case ' ':
            e.preventDefault();
            _matrixNewCol(table, rowIndex, colIndex);
            break;
        case 'Backspace':
        case 'Delete':
            e.preventDefault();
            span.setAttribute('data-value', '');
            span.innerHTML = '';
            _matrixRevisarBorrado(table, rowIndex, colIndex);
            _sync();
            break;
        case 'ArrowLeft':  e.preventDefault(); _matrixLeft();  break;
        case 'ArrowRight': e.preventDefault(); _matrixRight(); break;
        case 'ArrowUp':    e.preventDefault(); _matrixUp();    break;
        case 'ArrowDown':  e.preventDefault(); _matrixDown();  break;
        default:
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== ' ') {
                e.preventDefault();
                if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(e.key)) return;
                const inp = spanToInput(span);
                if (inp) { _coordsFromElement(inp); inp.value = e.key; inp.setSelectionRange(1, 1); }
            }
    }
}

function _matrixNewCol(table, rowIndex, colIndex) {
    Auxiliares.insertarColumna(table, colIndex + 1);
    if (getCurrentOperation() === "axb") actualizarSeparadorGlobal(table);
    setTimeout(() => _focusCell(rowIndex, colIndex + 1), 10);
}

function _matrixNewRow(table, rowIndex, colIndex) {
    Auxiliares.insertarFila(table, rowIndex + 1);
    if (getCurrentOperation() === "axb") requestAnimationFrame(() => actualizarSeparadorGlobal(table));
    const numCols = table.rows[0].cells.length;
    for (let j = 0; j < numCols; j++) ajustarAnchoColumna(table, j);
    setTimeout(() => _focusCell(rowIndex + 1, colIndex), 10);
}

function _matrixStructEnter(table, input) {
    const cell = input.closest('td');
    const row  = cell.parentElement;
    inputToSpan(input);
    ajustarAnchoColumna(table, _col);
    _matrixNewRow(table, row.rowIndex, cell.cellIndex);
}

function _matrixStructBackspace(e, table, input) {
    if ((e.key === 'Backspace' || e.key === 'Delete') && input.value === "") {
        e.preventDefault();
        const cell     = input.closest('td');
        const row      = cell.parentElement;
        const rowIndex = row.rowIndex;
        const colIndex = cell.cellIndex;
        const empty    = crearSpanCelda("", rowIndex, colIndex);
        input.replaceWith(empty);
        _coordsFromElement(empty);
        _matrixRevisarBorrado(table, rowIndex, colIndex);
    }
}

function _matrixRevisarBorrado(table, rowIndex, colIndex) {
    const minRows  = parseInt(table.dataset.minRows) || 1;
    const minCols  = parseInt(table.dataset.minCols) || 1;
    const currentOp = getCurrentOperation();

    setTimeout(() => {
        let tr = rowIndex, tc = colIndex;

        if (table.rows.length > minRows && Auxiliares.filaVacia(table, rowIndex)) {
            Auxiliares.eliminarFila(table, rowIndex);
            tr = Math.max(0, Math.min(rowIndex - 1, table.rows.length - 1));
            if (currentOp === "axb") actualizarSeparadorGlobal(table);
        }

        if ((table.rows[0]?.cells.length ?? 0) > minCols && Auxiliares.columnaVacia(table, colIndex)) {
            Auxiliares.eliminarColumna(table, colIndex);
            tc = Math.max(0, Math.min(colIndex - 1, (table.rows[0]?.cells.length ?? 1) - 1));
            if (currentOp === "axb") actualizarSeparadorGlobal(table);
        }

        if (tr === rowIndex && tc === colIndex) {
            if (colIndex > 0) tc = colIndex - 1;
            else if (rowIndex > 0) { tr = rowIndex - 1; tc = (table.rows[tr]?.cells.length ?? 1) - 1; }
        }

        _focusCell(tr, tc);
        _sync();
    }, 0);
}

// ── keydown modo EV ──

function _keydownEV(e, target, isInput, isSpan) {
    if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        _evMove(e.key);
        if (_callbacks.onSync) _callbacks.onSync();
        return;
    }
    if (e.key === ' ') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        if (_callbacks.onSpace) _callbacks.onSpace(_row, _col);
        return;
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        if (_callbacks.onEnter) _callbacks.onEnter();
        return;
    }
    if (e.key === 'Tab') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        _evRight();
        if (_callbacks.onSync) _callbacks.onSync();
        return;
    }
    if (e.key === 'Escape') {
        if (isInput) { inputToSpan(target); target.blur(); }
        if (_callbacks.onSync) _callbacks.onSync();
        return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        if (isInput) {
            if (target.value !== "") {
                target.value = target.value.slice(0, -1);
                target.dispatchEvent(new Event('input', { bubbles: true }));
                _focusInput(target);
                return;
            }
            inputToSpan(target);
            if (!_evBorradoEstructural(_row, _col)) { _evLeft(); if (_callbacks.onSync) _callbacks.onSync(); }
        } else if (isSpan) {
            target.setAttribute('data-value', '');
            target.innerHTML = '';
            target.classList.remove('cell-error');
            actualizarBotonCalcularEV();
            if (!_evBorradoEstructural(_row, _col)) { _evLeft(); if (_callbacks.onSync) _callbacks.onSync(); }
        }
    }
}

function _evVacioElemento(el) {
    if (!el) return true;
    const v = el.classList.contains('cell-input') ? el.value : (el.getAttribute('data-value') || el.textContent || "");
    return String(v).trim() === "";
}

function _evFilaVacia(rowIdx) {
    const row = _evGetVectorRows()[rowIdx];
    if (!row) return false;
    return _evGetComponentCells(row).every(({ element: el }) => _evVacioElemento(el));
}

function _evColVacia(colIdx) {
    return _evGetVectorRows().every(row => {
        const cells = _evGetComponentCells(row);
        return _evVacioElemento(cells[colIdx]?.element);
    });
}

function _evBorradoEstructural(rowIdx, colIdx) {
    if (!_callbacks.onBackspace) return false;
    const rows    = _evGetVectorRows();
    const numRows = rows.length;
    const numCols = rows[0] ? _evGetComponentCells(rows[0]).length : 0;

    const canRow = numRows > 2 && _evFilaVacia(rowIdx);
    const canCol = numCols > 2 && _evColVacia(colIdx);

    let tipo = null;
    if (canRow && canCol) tipo = 'ambos';
    else if (canRow)      tipo = 'fila';
    else if (canCol)      tipo = 'columna';
    if (!tipo) return false;

    _callbacks.onBackspace(rowIdx, colIdx, tipo);
    return true;
}

// ─────────────────────────────────────────────
// Handler: input
// ─────────────────────────────────────────────

function _handleInput(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;

    _coordsFromElement(input);
    let valor = input.value;

    // Espacio → nueva columna / callback EV
    if (/\s/.test(valor)) {
        input.value = valor.replace(/\s+/g, '');
        if (_mode === "ev") {
            inputToSpan(input);
            if (_callbacks.onSpace) _callbacks.onSpace(_row, _col);
            if (_callbacks.onSync)  _callbacks.onSync();
        } else {
            const cell = input.closest('td');
            const row  = cell?.parentElement;
            if (cell && row && _table) {
                inputToSpan(input);
                ajustarAnchoColumna(_table, cell.cellIndex);
                _matrixNewCol(_table, row.rowIndex, cell.cellIndex);
                _sync();
            }
        }
        return;
    }

    // Letras → eliminar
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(valor)) {
        valor = valor.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
        input.value = valor;
    }
    // Caracteres no válidos
    valor = valor.replace(/[^0-9\-\/\.]/g, '');
    if (input.value !== valor) input.value = valor;

    // Más de una barra
    const slashes = (valor.match(/\//g) || []).length;
    if (slashes > 1) {
        const first = valor.indexOf('/');
        valor = valor.slice(0, first + 1) + valor.slice(first + 1).replace(/\//g, '');
        input.value = valor;
    }

    // Convertir .5 → 0.5
    if (/^\.\d/.test(valor))   { input.value = '0' + valor; valor = input.value; }
    if (/^-\.\d/.test(valor))  { input.value = '-0' + valor.slice(1); valor = input.value; }

    // Validaciones adicionales de formato (solo matriz, EV es más permisiva)
    if (_mode === "matrix") {
        if (/\.\./.test(valor)) { input.value = valor.slice(0, -1); _sync(); return; }

        const parts = valor.split('/');
        if (parts.length === 2) {
            if ((parts[0].match(/\./g) || []).length > 1) { input.value = valor.slice(0, -1); _sync(); return; }
            if ((parts[1].match(/\./g) || []).length > 1) { input.value = valor.slice(0, -1); _sync(); return; }
        } else {
            if ((valor.match(/\./g) || []).length > 1) { input.value = valor.slice(0, -1); _sync(); return; }
        }

        const negs = (valor.match(/-/g) || []).length;
        if (negs > 2) { input.value = valor.slice(0, -1); _sync(); return; }
        if (negs === 2 && !/^-\d*\.?\d*\/-\d*\.?\d*$/.test(valor)) { input.value = valor.slice(0, -1); _sync(); return; }
        if (negs === 1) {
            if (valor.indexOf('-') !== 0 && !/\/-/.test(valor)) { input.value = valor.slice(0, -1); _sync(); return; }
        }

        if (!/^-?\d*\.?\d*(\/-?\d*\.?\d*)?$/.test(valor)) { input.value = valor.slice(0, -1); _sync(); return; }
    } else {
        // EV: marcar error si inválido pero no bloquear escritura
        const esValido = valor === '' || valor === '-' || Auxiliares.esValorNumericoValido(valor, true);
        input.classList.toggle('cell-error', !esValido);
        actualizarBotonCalcularEV();
    }

    input.style.width = (input.value.length + 1) + "ch";

    if (_mode === "ev") {
        if (_callbacks.onSync) _callbacks.onSync();
    } else {
        _sync();
    }
}

// ─────────────────────────────────────────────
// Handler: beforeinput (espacio en móvil)
// ─────────────────────────────────────────────

function _handleBeforeInput(e) {
    const input = e.target;
    if (!input?.classList.contains('cell-input')) return;

    const isSpaceOnMobile = e.inputType === 'insertText' && /\s/.test(e.data || "");
    if (!isSpaceOnMobile) return;

    e.preventDefault();
    _coordsFromElement(input);
    input.value = input.value.replace(/\s+/g, '');

    if (_mode === "ev") {
        inputToSpan(input);
        if (_callbacks.onSpace) _callbacks.onSpace(_row, _col);
        if (_callbacks.onSync)  _callbacks.onSync();
    } else {
        const cell = input.closest('td');
        const row  = cell?.parentElement;
        if (!cell || !row || !_table) return;
        inputToSpan(input);
        ajustarAnchoColumna(_table, cell.cellIndex);
        _matrixNewCol(_table, row.rowIndex, cell.cellIndex);
        _sync();
    }
}

// ─────────────────────────────────────────────
// Handler: paste (solo matriz)
// ─────────────────────────────────────────────

function _handlePaste(e) {
    if (_mode !== "matrix") return;
    const target = e.target;
    if (!target.classList.contains('cell-input')) return;

    e.preventDefault();
    let text = (e.clipboardData || window.clipboardData).getData('text/plain') || "";
    text = text.trim().replace(/[^0-9\-\/\.\s,;\n\r\t]/g, '');
    if (!text) return;

    const start = target.selectionStart;
    const end   = target.selectionEnd;
    const nv    = target.value.slice(0, start) + text + target.value.slice(end);

    if (!_matrixEsEntradaValida(nv)) return;

    target.value = nv;
    target.setSelectionRange(start + text.length, start + text.length);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    _sync();
}

// ─────────────────────────────────────────────
// Handler: focusout
// ─────────────────────────────────────────────

function _handleFocusout(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;

    if (_mode === "ev") {
        const valor = input.value.trim();
        const esValido = valor === '' || valor === '-' || Auxiliares.esValorNumericoValido(valor, true);
        if (!esValido) { input.classList.add('cell-error'); actualizarBotonCalcularEV(); }
        inputToSpan(input);
        setTimeout(() => {
            if (_table) { /* ajustar columnas EV si fuera necesario */ actualizarBotonCalcularEV(); }
        }, 10);
        if (_callbacks.onSync) _callbacks.onSync();
    } else {
        // matriz: guardar como span al perder foco
        inputToSpan(input);
        ajustarAnchoColumna(_table, _col);
        _sync();
    }
}


function _sync() {
    setTimeout(() => syncTableToFileData(), 100);
}

function _matrixEsEntradaValida(valor) {
    if (valor === '' || valor === '-') return true;
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(valor)) return false;
    if (/[^0-9\-\/\.]/.test(valor)) return false;
    if ((valor.match(/\//g) || []).length > 1) return false;
    if (/\.\./.test(valor)) return false;
    if (valor.includes('/')) {
        const [l, r] = valor.split('/');
        if ((l.match(/\./g) || []).length > 1) return false;
        if ((r?.match(/\./g) || []).length > 1) return false;
        if (l && l !== '-' && !/^-?\d*\.?\d*$/.test(l)) return false;
        if (r && r !== '-' && !/^-?\d*\.?\d*$/.test(r)) return false;
    } else {
        if (valor !== '-' && !/^-?\d*\.?\d*$/.test(valor)) return false;
    }
    return true;
}


function _attach() {
    _onMousedown   = _handleMousedown;
    _onKeydown     = _handleKeydown;
    _onInput       = _handleInput;
    _onBeforeInput = _handleBeforeInput;
    _onFocusout    = _handleFocusout;

    _article.addEventListener('mousedown',   _onMousedown);
    _article.addEventListener('keydown',     _onKeydown);
    _article.addEventListener('input',       _onInput);
    _article.addEventListener('beforeinput', _onBeforeInput);
    _article.addEventListener('focusout',    _onFocusout);

    if (_mode === "matrix") {
        _onPaste = _handlePaste;
        _article.addEventListener('paste', _onPaste);
    }

    _onWindowKey = (e) => {
        if (e.key === ' ' && (
            document.activeElement?.classList.contains('cell-input') ||
            document.activeElement?.classList.contains('cell-span')
        )) e.preventDefault();
    };
    window.addEventListener('keydown', _onWindowKey);
}

function _detach() {
    if (!_article) return;
    if (_onMousedown)   _article.removeEventListener('mousedown',   _onMousedown);
    if (_onKeydown)     _article.removeEventListener('keydown',     _onKeydown);
    if (_onInput)       _article.removeEventListener('input',       _onInput);
    if (_onBeforeInput) _article.removeEventListener('beforeinput', _onBeforeInput);
    if (_onFocusout)    _article.removeEventListener('focusout',    _onFocusout);
    if (_onPaste)       _article.removeEventListener('paste',       _onPaste);
    if (_onWindowKey)   window.removeEventListener('keydown',       _onWindowKey);

    _onMousedown = _onKeydown = _onInput = _onBeforeInput =
    _onFocusout  = _onPaste   = _onWindowKey = null;
}

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

/** Desconecta cualquier modo activo. */
export function desconfigurarEventos() {
    _detach();
    _article = _table = _mode = null;
    _callbacks = {};
    _row = _col = 0;
}

// Aliases de compatibilidad
export const desconfigurarEventosMatri = desconfigurarEventos;
export const desconfigurarEventosEV    = desconfigurarEventos;

/** Configura eventos para el módulo de Matrices. */
export function configurarEventos(article, table, operation) {
    desconfigurarEventos();
    _article = article;
    _table   = table;
    _mode    = "matrix";
    _attach();
}

/** Configura eventos para el módulo EV. */
export function configurarEventosEV(article, table, callbacks = {}) {
    desconfigurarEventos();
    _article   = article;
    _table     = table;
    _mode      = "ev";
    _callbacks = callbacks;
    _attach();

    // Enfocar primera celda editable
    setTimeout(() => {
        const rows = _evGetVectorRows();
        if (rows.length > 0 && _evGetComponentCells(rows[0]).length > 0) {
            _focusCell(0, 0);
        }
    }, 50);
}

/** Ajusta el ancho de una columna según el contenido más largo. */
export function ajustarAnchoColumna(table, colIndex) {
    if (!table) return;
    const MIN = 5;
    let max = MIN;

    for (const row of table.rows) {
        const cell = row.cells[colIndex];
        if (!cell) continue;
        const el  = _getEditable(cell);
        if (!el) continue;
        const val = el.tagName === 'INPUT' ? el.value : (el.getAttribute('data-value') || "");
        if (val.length > max) max = val.length;
    }

    const w = (max + 1) + "ch";
    for (const row of table.rows) {
        const cell = row.cells[colIndex];
        if (!cell) continue;
        const el = _getEditable(cell);
        if (el) { el.style.width = w; el.style.minWidth = w; }
    }
}