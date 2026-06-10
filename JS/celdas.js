import Auxiliares from "./auxiliares.js";

// Variable para saber si estamos en modo EV
let isEVMode = false;

export function setEVMode(enabled) {
    isEVMode = enabled;
}

function obtenerValorCeldaEditable(celda) {
    if (!celda) return "";
    return celda.classList.contains('cell-input')
        ? celda.value
        : (celda.getAttribute('data-value') || celda.textContent || "");
}

// Validar todas las celdas EV y marcar cualquier valor inválido aunque venga de un cambio de función
export function validarCamposEV(table) {
    if (!table) return false;

    let hayErrores = false;
    const celdas = table.querySelectorAll('.cell-span, .cell-input');

    celdas.forEach(celda => {
        const valor = obtenerValorCeldaEditable(celda);
        const texto = String(valor || "").trim();
        const esInvalido = texto !== "" && !Auxiliares.esValorNumericoValido(texto, true);

        celda.classList.toggle('cell-error', esInvalido);
        if (esInvalido) hayErrores = true;
    });

    return hayErrores;
}

// Función para verificar si hay errores en la tabla EV
export function tieneErroresEV(table) {
    if (!table) return false;
    return validarCamposEV(table);
}

// Función para habilitar/deshabilitar botón calcular en EV
export function actualizarBotonCalcularEV() {
    const btnCalcular = document.getElementById("btnCalcularEV");
    if (!btnCalcular) return;
    
    const table = document.getElementById("inputTable");
    const hayErrores = table ? tieneErroresEV(table) : false;
    
    if (hayErrores) {
        btnCalcular.disabled = true;
        btnCalcular.style.opacity = "0.5";
        btnCalcular.style.cursor = "not-allowed";
    } else {
        btnCalcular.disabled = false;
        btnCalcular.style.opacity = "1";
        btnCalcular.style.cursor = "pointer";
    }
}

// Función para ajustar el ancho de una columna específica en EV
export function ajustarAnchoColumnaEV(table, colIndex) {
    if (!table || !table.rows.length) return;
    
    const MIN_WIDTH = 6;
    let maxChars = MIN_WIDTH;
    
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        const primeraCelda = row.cells[0];
        if (primeraCelda && (primeraCelda.innerHTML.includes("v") || primeraCelda.innerHTML.includes("B") || primeraCelda.innerHTML.includes("="))) {
            const cell = row.cells[colIndex];
            if (cell) {
                const span = cell.querySelector('.cell-span');
                if (span) {
                    let textContent = span.textContent || span.getAttribute('data-value') || "";
                    if (textContent.length > maxChars) {
                        maxChars = textContent.length;
                    }
                }
            }
        }
    }
    
    const finalWidth = (maxChars + 1) + "ch";
    
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        const cell = row.cells[colIndex];
        if (cell) {
            const span = cell.querySelector('.cell-span');
            if (span) {
                span.style.width = finalWidth;
                span.style.minWidth = finalWidth;
                span.style.display = "inline-flex";
                span.style.alignItems = "center";
                span.style.justifyContent = "center";
                span.style.textAlign = "center";
                span.style.lineHeight = "1.4";
            }
            
            // También ajustar input si existe
            const input = cell.querySelector('.cell-input');
            if (input) {
                input.style.width = finalWidth;
                input.style.minWidth = finalWidth;
            }
        }
    }
}

export function ajustarTodasColumnasEV(table) {
    if (!table || !table.rows.length) return;
    const numCols = (table.rows[0]?.cells.length || 1) - 1;
    for (let j = 1; j <= numCols; j++) {
        ajustarAnchoColumnaEV(table, j);
    }
}

export function crearSpanCelda(value, row, col) {
    const valorNormalizado = Auxiliares.normalizarValorTexto(value);
    const span = document.createElement("span");
    span.className = "cell-span";
    span.setAttribute("data-row", row);
    span.setAttribute("data-col", col);
    span.tabIndex = 0;
    
    // Estilos base para todos los spans
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.textAlign = "center";
    span.style.padding = "0.5rem 0.75rem";
    span.style.cursor = "text";
    span.style.verticalAlign = "middle";
    span.style.lineHeight = "1.4";
    span.style.minWidth = "6ch";

    if (valorNormalizado && Auxiliares.esFraccion(valorNormalizado) && Auxiliares.esValorNumericoValido(valorNormalizado, true)) {
        const fraccion = Auxiliares.parsearFraccion(valorNormalizado);
        const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
        const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;

        if (denSimp === 1) {
            span.setAttribute('data-value', valorSimplificado);
            span.textContent = numSimp;
        } else {
            span.setAttribute('data-value', valorSimplificado);
            span.innerHTML = `<span class="frac" style="display:inline-flex; flex-direction:column; align-items:center;"><span class="top">${numSimp}</span><span class="bottom">${denSimp}</span></span>`;
        }
    } else {
        span.setAttribute('data-value', valorNormalizado || "");
        span.textContent = valorNormalizado || "";
    }
    
    if (valorNormalizado !== "" && !Auxiliares.esValorNumericoValido(valorNormalizado, true)) {
        span.classList.add('cell-error');
    }

    const contentLength = (valorNormalizado || "").length;
    const initialWidth = Math.max(6, contentLength + 1);
    span.style.width = initialWidth + "ch";

    return span;
}

export function spanToInput(span) {
    if (!span || !span.classList.contains('cell-span')) return null;

    const row = parseInt(span.getAttribute('data-row'));
    const col = parseInt(span.getAttribute('data-col'));
    const value = span.getAttribute('data-value') || '';

    const input = document.createElement("input");
    input.type = "text";
    input.className = "cell-input";
    input.value = value;
    input.setAttribute("data-row", row);
    input.setAttribute("data-col", col);
    
    // Ancho mínimo cuadrado para inputs
    const minWidth = 6;
    const calculatedWidth = Math.max(minWidth, value.length + 1);
    input.style.width = calculatedWidth + "ch";
    input.style.minWidth = minWidth + "ch";
    input.style.textAlign = "center";

    span.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    
    return input;
}

export function inputToSpan(input) {
    if (!input || input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return null;

    const row = parseInt(input.getAttribute('data-row'));
    const col = parseInt(input.getAttribute('data-col'));
    const value = input.value.trim();

    let finalValue = Auxiliares.normalizarValorTexto(value);

    if (finalValue === "/") {
        finalValue = "";
    }

    const span = crearSpanCelda(finalValue, row, col);
    
    // Preservar clase de error si existía o si el valor final no es usable
    if (input.classList.contains('cell-error') || (finalValue !== "" && !Auxiliares.esValorNumericoValido(finalValue, true))) {
        span.classList.add('cell-error');
    }
    
    try {
        input.replaceWith(span);
        
        if (isEVMode) {
            const table = span.closest('#inputTable');
            if (table) {
                setTimeout(() => {
                    ajustarTodasColumnasEV(table);
                    actualizarBotonCalcularEV();
                }, 10);
            }
        }
    } catch (error) {
        return null;
    }

    return span;
}

export function focusCell(row, col, table) {
    if (row < 0 || col < 0 || row >= table.rows.length) return false;
    if (col >= table.rows[row].cells.length) return false;

    const cell = table.rows[row].cells[col];
    if (!cell) return false;

    const span = cell.querySelector('.cell-span');
    const input = cell.querySelector('.cell-input');

    if (span) {
        return !!spanToInput(span);
    } else if (input) {
        input.focus();
        input.select();
        return true;
    }

    return false;
}