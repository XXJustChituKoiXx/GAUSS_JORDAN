import Auxiliares from "./auxiliares.js";

// Variable para saber si estamos en modo EV
let isEVMode = false;
let celdaEnfocada = null;
let lastFocusedCell = null;
let ultimaCeldaEditada = null;

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

        if (esInvalido) {
            celda.classList.add('cell-error');
            agregarPulsoError(celda);
            hayErrores = true;
        } else {
            celda.classList.remove('cell-error');
            celda.classList.remove('cell-error-pulse');
        }
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
        btnCalcular.title = "Corrige los valores marcados en rojo antes de calcular";
    } else {
        btnCalcular.disabled = false;
        btnCalcular.style.opacity = "1";
        btnCalcular.style.cursor = "pointer";
        btnCalcular.title = "";
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

// Función para actualizar botón calcular por tabla
function actualizarEstadoBotonCalcularPorTabla(table, hayErrores) {
    const btnCalcular = document.getElementById("btnCalcular");
    if (btnCalcular) {
        btnCalcular.disabled = hayErrores;
        btnCalcular.style.opacity = hayErrores ? "0.5" : "1";
        btnCalcular.style.cursor = hayErrores ? "not-allowed" : "pointer";
        btnCalcular.title = hayErrores ? "Corrige los valores marcados en rojo antes de calcular" : "";
    }
    
    const btnCalcularEV = document.getElementById("btnCalcularEV");
    if (btnCalcularEV) {
        btnCalcularEV.disabled = hayErrores;
        btnCalcularEV.style.opacity = hayErrores ? "0.5" : "1";
        btnCalcularEV.style.cursor = hayErrores ? "not-allowed" : "pointer";
        btnCalcularEV.title = hayErrores ? "Corrige los valores marcados en rojo antes de calcular" : "";
    }
    
    const btnDiagonalizar = document.getElementById("btnDiagonalizar");
    if (btnDiagonalizar) {
        btnDiagonalizar.disabled = hayErrores;
        btnDiagonalizar.style.opacity = hayErrores ? "0.5" : "1";
        btnDiagonalizar.style.cursor = hayErrores ? "not-allowed" : "pointer";
        btnDiagonalizar.title = hayErrores ? "Corrige los valores marcados en rojo antes de calcular" : "";
    }
}

// Función para obtener la celda enfocada
export function getCeldaEnfocada() {
    const active = document.activeElement;
    if (active && (active.classList.contains('cell-input') || active.classList.contains('cell-span'))) {
        return active;
    }
    return lastFocusedCell || celdaEnfocada;
}

// Función para guardar la celda enfocada antes de perder foco
export function setLastFocusedCell(cell) {
    lastFocusedCell = cell;
}

// Guardar la celda actual
export function guardarCeldaActual() {
    const activo = document.activeElement;
    if (activo && (activo.classList.contains('cell-input') || activo.classList.contains('cell-span'))) {
        ultimaCeldaEditada = activo;
        return true;
    }
    return false;
}

// Restaurar el foco a la última celda
export function restaurarFoco() {
    if (ultimaCeldaEditada && ultimaCeldaEditada.isConnected) {
        if (ultimaCeldaEditada.classList.contains('cell-span')) {
            spanToInput(ultimaCeldaEditada);
        } else if (ultimaCeldaEditada.classList.contains('cell-input')) {
            ultimaCeldaEditada.focus();
            ultimaCeldaEditada.select();
        }
        return true;
    }
    return false;
}

// Función para restaurar el foco a la última celda
export function restoreFocus() {
    if (lastFocusedCell && lastFocusedCell.isConnected) {
        if (lastFocusedCell.classList.contains('cell-span')) {
            spanToInput(lastFocusedCell);
        } else if (lastFocusedCell.classList.contains('cell-input')) {
            lastFocusedCell.focus();
            lastFocusedCell.select();
        }
        return true;
    }
    return false;
}

// Función para añadir pulso de error a una celda
export function agregarPulsoError(elemento) {
    if (!elemento) return;
    
    // Agregar clase de error (que tiene la animación infinita)
    elemento.classList.add('cell-error');
}

// Función para crear span con soporte para raíces
export function crearSpanCeldaConRaiz(value, exprSimplificada, row, col) {
    const span = document.createElement("span");
    span.className = "cell-span";
    span.setAttribute("data-row", row);
    span.setAttribute("data-col", col);
    span.setAttribute("data-value", value);
    span.tabIndex = 0;
    
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.textAlign = "center";
    span.style.padding = "0.5rem 0.75rem";
    span.style.cursor = "text";
    span.style.verticalAlign = "middle";
    span.style.lineHeight = "1.4";
    span.style.minWidth = "6ch";
    
    if (exprSimplificada) {
        const contenido = Auxiliares.crearRaizHTML(exprSimplificada);
        span.appendChild(contenido);
    } else if (value && Auxiliares.esFraccion(value) && Auxiliares.esValorNumericoValido(value, true)) {
        const fraccion = Auxiliares.parsearFraccion(value);
        const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
        const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
        
        span.setAttribute('data-value', valorSimplificado);
        if (denSimp === 1) {
            span.textContent = numSimp;
        } else {
            span.innerHTML = `<span class="frac" style="display:inline-flex; flex-direction:column; align-items:center;"><span class="top">${numSimp}</span><span class="bottom">${denSimp}</span></span>`;
        }
    } else {
        span.setAttribute('data-value', value || "");
        span.textContent = value || "";
    }
    
    if (value && value !== "" && !Auxiliares.esValorNumericoValido(value, true) && !value.includes('√')) {
        span.classList.add('cell-error');
        agregarPulsoError(span);
    }
    
    const contentLength = (value || "").length;
    const initialWidth = Math.max(6, contentLength + 1);
    span.style.width = initialWidth + "ch";
    
    span.addEventListener('focus', () => { 
        celdaEnfocada = span;
        lastFocusedCell = span;
        ultimaCeldaEditada = span;
    });
    span.addEventListener('click', () => { 
        celdaEnfocada = span;
        lastFocusedCell = span;
        ultimaCeldaEditada = span;
    });
    
    return span;
}

// Función base crearSpanCelda
export function crearSpanCelda(value, row, col) {
    return crearSpanCeldaConRaiz(value, null, row, col);
}


export function spanToInput(span) {
    if (!span || !span.classList.contains('cell-span')) return null;

    const row = parseInt(span.getAttribute('data-row'));
    const col = parseInt(span.getAttribute('data-col'));
    const value = span.getAttribute('data-value') || '';
    
    let valorParaInput = value;
    if (contieneRaiz(value)) {
        valorParaInput = value;
    } else if (value && !contieneRaiz(value)) {
        const evaluado = Auxiliares.evaluarExpresionCompleta(value);
        if (evaluado) {
            valorParaInput = Auxiliares.expresionRaizToString(evaluado);
        }
    }

    const input = document.createElement("input");
    input.type = "text";
    input.className = "cell-input";
    input.value = valorParaInput;
    input.setAttribute("data-row", row);
    input.setAttribute("data-col", col);
    
    const minWidth = 6;
    const calculatedWidth = Math.max(minWidth, valorParaInput.length + 1);
    input.style.width = calculatedWidth + "ch";
    input.style.minWidth = minWidth + "ch";
    input.style.textAlign = "center";

    const table = span.closest('table');
    if (value && !Auxiliares.esValorNumericoValido(value, true) && !contieneRaiz(value)) {
        input.classList.add('cell-error');
    }

    span.replaceWith(input);
    
    lastFocusedCell = input;
    ultimaCeldaEditada = input;
    
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    
    celdaEnfocada = input;
    
    input.addEventListener('focus', () => { 
        celdaEnfocada = input;
        lastFocusedCell = input;
        ultimaCeldaEditada = input;
    });
    input.addEventListener('blur', () => { 
        if (celdaEnfocada === input) celdaEnfocada = null;
        inputToSpan(input);
    });
    
    input.addEventListener('input', function(e) {
        let v = this.value;
        
        // Preservar estructura de raíz al editar
        if (contieneRaiz(this._previousValue) || contieneRaiz(v)) {
            // Si la raíz está presente, permitir edición dentro de paréntesis
            const raizMatch = v.match(/√\([^)]*\)/);
            if (raizMatch) {
                // Mantener la estructura √(contenido)
                // No hacer validación numérica estricta mientras se edita la raíz
                this.classList.remove('cell-error');
            }
        }
        
        const esValido = v === "" || Auxiliares.esValorNumericoValido(v, true) || contieneRaiz(v);
        
        if (!esValido && !contieneRaiz(v)) {
            this.classList.add('cell-error');
            agregarPulsoError(this);
        } else {
            this.classList.remove('cell-error');
            this.classList.remove('cell-error-pulse');
        }
        
        const parentTable = this.closest('table');
        const hayErrores = parentTable ? Auxiliares.tablaTieneErrores(parentTable) : false;
        actualizarEstadoBotonCalcularPorTabla(parentTable, hayErrores);
        this.style.width = Math.max(minWidth, this.value.length + 1) + "ch";
        
        this._previousValue = v;
    });
    
    input._previousValue = input.value;
    
    return input;
}

export function inputToSpan(input) {
    if (!input || input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return null;

    const row = parseInt(input.getAttribute('data-row'));
    const col = parseInt(input.getAttribute('data-col'));
    let value = input.value.trim();

    let finalValue = value;
    let exprSimplificada = null;
    
    if (contieneRaiz(value)) {
        // Casos validos: √(n), k√(n), -√(n), √(n)/√(m)
        // Si hay / FUERA de los parentesis, es raiz/raiz → simplificar radicando
        const slashExterno = (() => {
            let prof = 0;
            for (let i = 0; i < value.length; i++) {
                if (value[i] === '(' && i > 0 && value[i-1] === '√') prof++;
                else if (value[i] === ')' && prof > 0) prof--;
                else if (value[i] === '/' && prof === 0) return i;
            }
            return -1;
        })();

        let exprParaEvaluar = value;
        if (slashExterno !== -1) {
            // √(a)/√(b) → evaluarExpresionCompleta con √(a/b)
            const parteNum = value.slice(0, slashExterno).trim();
            const parteDen = value.slice(slashExterno + 1).trim();
            const matchNum = parteNum.match(/^(-?\d*\/\d+|-?\d*)√\(([^)]+)\)$/);
            const matchDen = parteDen.match(/^(-?\d*\/\d+|-?\d*)√\(([^)]+)\)$/);
            if (matchNum && matchDen) {
                const coefNum = matchNum[1] || '1';
                const coefDen = matchDen[1] || '1';
                const radNum  = matchNum[2];
                const radDen  = matchDen[2];
                // (coefNum/coefDen)√(radNum/radDen)
                const coefStr = (coefNum === '1' && coefDen === '1') ? '' :
                                (coefDen === '1') ? coefNum + '/' + coefDen :
                                coefNum + '/' + coefDen;
                exprParaEvaluar = `${coefStr}√(${radNum}/${radDen})`;
            }
        }

        if (!exprParaEvaluar.includes('√()') && !exprParaEvaluar.endsWith('√(')) {
            exprSimplificada = Auxiliares.evaluarExpresionCompleta(exprParaEvaluar);
        }
        finalValue = value;
    } else {
        value = Auxiliares.simplificarExpresion(value);
        finalValue = Auxiliares.normalizarValorTexto(value);
    }

    if (finalValue === "/") {
        finalValue = "";
    }

    const span = crearSpanCeldaConRaiz(finalValue, exprSimplificada, row, col);
    
    if (input.classList.contains('cell-error') || (finalValue !== "" && !Auxiliares.esValorNumericoValido(finalValue, true) && !contieneRaiz(finalValue))) {
        span.classList.add('cell-error');
        agregarPulsoError(span);
    }
    
    try {
        input.replaceWith(span);
        
        const table = span.closest('table');
        const hayErrores = table ? Auxiliares.tablaTieneErrores(table) : false;
        actualizarEstadoBotonCalcularPorTabla(table, hayErrores);
        
        if (isEVMode) {
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
// Función para enfocar una celda específica
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
export function contieneRaiz(valor) {
    return valor && typeof valor === 'string' && valor.includes('√');
}

// Función para extraer y preservar la estructura de raíz
export function preservarEstructuraRaiz(valorActual, nuevoValor, cursorPos) {
    // Si el valor actual tiene √() y estamos editando dentro
    const raizPattern = /√\(([^)]*)\)/g;
    let match;
    let lastIndex = 0;
    let resultado = '';
    let encontrado = false;
    
    while ((match = raizPattern.exec(valorActual)) !== null) {
        encontrado = true;
        // Texto antes de la raíz
        resultado += valorActual.slice(lastIndex, match.index);
        
        // Verificar si el cursor está dentro de los paréntesis de esta raíz
        const raizInicio = match.index;
        const raizFin = match.index + match[0].length;
        const dentroDeParentesis = cursorPos > match.index + 2 && cursorPos <= raizFin - 1;
        
        if (dentroDeParentesis) {
            // Estamos editando dentro de los paréntesis
            const contenidoActual = match[1];
            const offsetEnParentesis = cursorPos - (match.index + 2);
            
            // Determinar qué se está insertando
            let nuevoContenido;
            if (nuevoValor.length === 1 && !isNaN(parseInt(nuevoValor)) && nuevoValor !== '') {
                // Insertar dígito dentro del paréntesis
                nuevoContenido = contenidoActual.slice(0, offsetEnParentesis) + nuevoValor + contenidoActual.slice(offsetEnParentesis);
            } else if (nuevoValor === '' && offsetEnParentesis > 0) {
                // Borrar un carácter dentro del paréntesis
                nuevoContenido = contenidoActual.slice(0, offsetEnParentesis - 1) + contenidoActual.slice(offsetEnParentesis);
            } else {
                nuevoContenido = contenidoActual;
            }
            
            resultado += `√(${nuevoContenido})`;
        } else {
            resultado += match[0];
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    if (encontrado) {
        resultado += valorActual.slice(lastIndex);
        return resultado;
    }
    
    return nuevoValor;
}

export function insertarRaiz() {
    let elementoActivo = document.activeElement;
    
    if (elementoActivo && elementoActivo.classList.contains('cell-span')) {
        elementoActivo = spanToInput(elementoActivo);
    }
    if (!elementoActivo || !elementoActivo.classList.contains('cell-input')) {
        return false;
    }
    
    const cursorPos = elementoActivo.selectionStart || 0;
    const currentValue = elementoActivo.value;

    // Determinar en qué segmento (num o den) está el cursor,
    // usando la / externa (fuera de paréntesis de raíz)
    let profRaiz = 0;
    let slashExterno = -1;
    for (let i = 0; i < currentValue.length; i++) {
        if (currentValue[i] === '(' && i > 0 && currentValue[i-1] === '√') profRaiz++;
        else if (currentValue[i] === ')' && profRaiz > 0) profRaiz--;
        else if (currentValue[i] === '/' && profRaiz === 0) { slashExterno = i; break; }
    }
    const segmento = (slashExterno === -1 || cursorPos <= slashExterno)
        ? (slashExterno === -1 ? currentValue : currentValue.slice(0, slashExterno))
        : currentValue.slice(slashExterno + 1);

    // Bloquear si ya hay una √ en este segmento
    if (segmento.includes('√')) return false;

    // Bloquear si el cursor está dentro de una raíz existente
    const raizPattern = /√\([^)]*\)/g;
    let match;
    while ((match = raizPattern.exec(currentValue)) !== null) {
        if (cursorPos > match.index && cursorPos < match.index + match[0].length) {
            return false;
        }
    }

    const nuevoValor = currentValue.slice(0, cursorPos) + "√()" + currentValue.slice(cursorPos);
    elementoActivo.value = nuevoValor;
    elementoActivo.setSelectionRange(cursorPos + 2, cursorPos + 2);
    elementoActivo.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}