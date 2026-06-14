// MCD
function mcd(a, b) {
    a = Math.round(Math.abs(a));
    b = Math.round(Math.abs(b));
    
    if (a === 0 && b === 0) return 1;
    if (a === 0) return b;
    if (b === 0) return a;
    
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

export function simplificar(num, den) {
    if (num === 0) return [0, 1];
    if (den === 0) throw new Error("División por cero en simplificación");

    const obtenerPrecision = (n) => {
        const s = n.toString();
        if (!s.includes('.')) return 0;
        if (s.includes('e')) {
            const exp = parseInt(s.split('-')[1]);
            return exp || 0;
        }
        return s.split('.')[1].length;
    };

    const precisionNum = obtenerPrecision(num);
    const precisionDen = obtenerPrecision(den);
    const maxPrecision = Math.max(precisionNum, precisionDen);
    
    if (maxPrecision > 0) {
        const factor = Math.pow(10, maxPrecision);
        num = Math.round(num * factor);
        den = Math.round(den * factor);
    }

    const common = mcd(num, den);
    let n = num / common;
    let d = den / common;

    if (d < 0) {
        n = -n;
        d = -d;
    }

    return [n, d];
}

// Validar que un texto represente un número o fracción usable en la matriz
export function esValorNumericoValido(valor, permitirVacio = true) {
    if (valor === null || valor === undefined) return permitirVacio;

    const str = String(valor).trim();
    if (str === "") return permitirVacio;

    // Permitir expresiones con raíz
    if (str.includes('√')) {
        return true;
    }

    const numero = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
    const patron = new RegExp(`^${numero}(?:/${numero})?$`);

    if (!patron.test(str)) return false;

    if (str.includes("/")) {
        const partes = str.split("/");
        if (partes.length !== 2) return false;

        const den = Number(partes[1]);
        if (Number.isNaN(den) || den === 0) return false;
    }

    const valorNumerico = str.includes("/") ? Number(str.split("/")[0]) : Number(str);
    return !Number.isNaN(valorNumerico) && Number.isFinite(valorNumerico);
}

// Convertir string "a/b", "a/", "/b", "a" a {num, den}
export function parsearFraccion(valor) {
    if (valor === "" || valor === null || valor === undefined) {
        return { num: 0, den: 1 };
    }

    const str = String(valor).trim();

    if (!str.includes("/")) {
        const num = Number(str);
        if (isNaN(num)) return { num: 0, den: 1 };
        return { num, den: 1 };
    }

    let [numStr, denStr] = str.split("/");

    if (denStr === "" || denStr === undefined) {
        const num = Number(numStr);
        if (isNaN(num)) return { num: 0, den: 1 };
        return { num, den: 1 };
    }

    if (numStr === "") {
        const den = Number(denStr);
        if (den === 0) throw new Error("Denominador cero");
        if (isNaN(den)) return { num: 0, den: 1 };
        return { num: 1, den };
    }

    const num = Number(numStr);
    const den = Number(denStr);

    if (isNaN(num) || isNaN(den) || den === 0) {
        return { num: 0, den: 1 };
    }

    return { num, den };
}

// Multiplicar dos fracciones
export function multiplicarFracciones(frac1, frac2) {
    const num = frac1.num * frac2.num;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Sumar dos fracciones
export function sumarFraccionesObj(frac1, frac2) {
    const num = frac1.num * frac2.den + frac2.num * frac1.den;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Restar fracciones
export function restarFracciones(frac1, frac2) {
    const num = frac1.num * frac2.den - frac2.num * frac1.den;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Dividir fracciones
export function dividirFracciones(frac1, frac2) {
    if (frac2.num === 0) throw new Error("División por cero");
    const num = frac1.num * frac2.den;
    const den = frac1.den * frac2.num;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Fracción a string para mostrar
export function fraccionToString(frac) {
    if (frac.den === 1) return `${frac.num}`;
    if (frac.num === 0) return "0";
    return `${frac.num}/${frac.den}`;
}

// Comparar con cero
export function esCero(frac) {
    return frac.num === 0;
}

// Parsear matriz desde DOM a array de números 2D
export function parsearMatriz(table) {
    return Array.from(table.rows).map(row =>
        Array.from(row.cells).map(cell => {
            const input = cell.querySelector("input");
            const span = cell.querySelector(".cell-span");

            let valor = "";
            if (input) {
                valor = input.value;
            } else if (span) {
                valor = span.getAttribute("data-value") || span.textContent.trim();
            } else {
                valor = cell.textContent.trim();
            }

            try {
                const frac = parsearFraccion(valor);
                const [num, den] = simplificar(frac.num, frac.den);
                const tieneDecimal = valor.includes('.');

                return {
                    num,
                    den,
                    _tieneDecimal: tieneDecimal
                };
            } catch (e) {
                alert(`Error: ${e.message} en celda con valor "${valor}"`);
                throw e;
            }
        })
    );
}

// Normalizar textos numéricos
export function normalizarValorTexto(valor) {
    if (valor === null || valor === undefined) return "";

    const str = String(valor).trim();
    if (str === "" || str === "-") return str;

    try {
        if (str.includes("/")) {
            const partes = str.split("/");
            if (partes.length !== 2) return str;
            if (!esValorNumericoValido(str, true)) return str;

            const fraccion = parsearFraccion(str);
            const [num, den] = simplificar(fraccion.num, fraccion.den);

            if (num === 0) return "0";
            return den === 1 ? `${num}` : `${num}/${den}`;
        }

        if (!esValorNumericoValido(str, true)) return str;

        const numero = Number(str);
        if (Number.isNaN(numero)) return str;

        return `${Object.is(numero, -0) ? 0 : numero}`;
    } catch (error) {
        return str;
    }
}

export function formatearResultado(frac, tieneDecimal) {
    const valorDecimal = frac.num / frac.den;
    
    if (frac.num === 0) return "0";
    
    if (!tieneDecimal && Number.isInteger(valorDecimal)) return `${valorDecimal}`;

    if (tieneDecimal) {
        return Number(valorDecimal.toPrecision(12)).toString();
    }

    return `${frac.num}/${frac.den}`;
}

// Detectar si un valor es una fracción
export function esFraccion(valor) {
    if (!valor || typeof valor !== 'string') return false;
    const fractionPattern = /^-?\d+\.?\d*\/-?\d+\.?\d*$/;
    return fractionPattern.test(valor.trim());
}

export function tieneDecimales(valor) {
    if (!valor || !esFraccion(valor)) return false;
    return valor.includes('.');
}

// Funciones auxiliares para tabla
function actualizarAtributosTabla(table) {
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        for (let j = 0; j < row.cells.length; j++) {
            const cell = row.cells[j];
            cell.id = `cell${i}${j}`;

            const span = cell.querySelector('.cell-span');
            const input = cell.querySelector('.cell-input');

            if (span) {
                span.setAttribute('data-row', i);
                span.setAttribute('data-col', j);
            }
            if (input) {
                input.setAttribute('data-row', i);
                input.setAttribute('data-col', j);
            }
        }
    }
}

export function agregarFila(table) {
    if (table.rows.length === 0) return;

    const newRow = table.insertRow(-1);
    const numCols = table.rows[0].cells.length;
    const rowIndex = newRow.rowIndex;

    for (let i = 0; i < numCols; i++) {
        const newCell = newRow.insertCell(i);
        const span = document.createElement("span");
        span.className = "cell-span";
        span.setAttribute("data-value", "");
        span.setAttribute("data-row", rowIndex);
        span.setAttribute("data-col", i);
        span.tabIndex = 0;

        newCell.appendChild(span);
    }

    actualizarAtributosTabla(table);

    const firstSpan = newRow.cells[0]?.querySelector('.cell-span');
    if (firstSpan) {
        setTimeout(() => firstSpan.click(), 10);
    }
}

export function agregarColumna(table) {
    const numRows = table.rows.length;
    const colIndex = table.rows[0].cells.length;

    for (let i = 0; i < numRows; i++) {
        const newCell = table.rows[i].insertCell(-1);
        const span = document.createElement("span");
        span.className = "cell-span";
        span.setAttribute("data-value", "");
        span.setAttribute("data-row", i);
        span.setAttribute("data-col", colIndex);
        span.tabIndex = 0;

        newCell.appendChild(span);
    }

    actualizarAtributosTabla(table);

    const firstSpan = table.rows[0]?.cells[colIndex]?.querySelector('.cell-span');
    if (firstSpan) {
        setTimeout(() => firstSpan.click(), 10);
    }
}

export function eliminarFila(table, rowIndex) {
    if (table.rows[rowIndex]) {
        table.deleteRow(rowIndex);
        actualizarAtributosTabla(table);
    }
}

export function eliminarColumna(table, colIndex) {
    for (let i = 0; i < table.rows.length; i++) {
        if (table.rows[i].cells[colIndex]) {
            table.rows[i].deleteCell(colIndex);
        }
    }
    actualizarAtributosTabla(table);
}

export function filaVacia(table, rowIndex) {
    if (!table.rows[rowIndex]) return true;

    return Array.from(table.rows[rowIndex].cells).every(cell => {
        const input = cell.querySelector("input");
        const span = cell.querySelector(".cell-span");

        if (input) return input.value.trim() === "";
        if (span) {
            const value = span.getAttribute("data-value") || "";
            return value === "";
        }
        return true;
    });
}

export function columnaVacia(table, colIndex) {
    return Array.from(table.rows).every(row => {
        const cell = row.cells[colIndex];
        if (!cell) return true;

        const input = cell.querySelector("input");
        const span = cell.querySelector(".cell-span");

        if (input) return input.value.trim() === "";
        if (span) {
            const value = span.getAttribute("data-value") || "";
            return value === "";
        }
        return true;
    });
}

export function insertarFila(table, rowIndex) {
    const numCols = table.rows[0].cells.length;
    const newRow = table.insertRow(rowIndex);

    for (let i = 0; i < numCols; i++) {
        const cell = newRow.insertCell(i);
        const span = document.createElement("span");
        span.className = "cell-span";
        span.setAttribute("data-value", "");
        span.setAttribute("data-row", rowIndex);
        span.setAttribute("data-col", i);
        span.tabIndex = 0;

        cell.appendChild(span);
    }

    actualizarAtributosTabla(table);
}

export function insertarColumna(table, colIndex) {
    for (let i = 0; i < table.rows.length; i++) {
        const cell = table.rows[i].insertCell(colIndex);
        const span = document.createElement("span");
        span.className = "cell-span";
        span.setAttribute("data-value", "");
        span.setAttribute("data-row", i);
        span.setAttribute("data-col", colIndex);
        span.tabIndex = 0;

        cell.appendChild(span);
    }

    actualizarAtributosTabla(table);
}

export function normalizarSigno(frac) {
    if (frac.den < 0) {
        return { num: -frac.num, den: -frac.den };
    }
    return { num: frac.num, den: frac.den };
}

// Convertir vectores horizontales a matriz de fracciones
export function parsearVectoresAMatriz(vectores, agregarColumnaCeros = true) {
    if (!vectores.length || !vectores[0].length) {
        throw new Error("Debe haber al menos un vector con una componente");
    }

    const numComponentes = vectores[0].length;
    const numVectores = vectores.length;
    const matriz = [];

    for (let i = 0; i < numComponentes; i++) {
        const fila = [];

        for (let j = 0; j < numVectores; j++) {
            const valor = vectores[j][i] || "0";

            if (!esValorNumericoValido(valor, true)) {
                throw new Error(`Valor inválido en α${j + 1}, componente ${i + 1}: "${valor}"`);
            }

            fila.push(parsearFraccion(valor));
        }

        if (agregarColumnaCeros) {
            fila.push({ num: 0, den: 1 });
        }

        matriz.push(fila);
    }

    return matriz;
}

export function esVectorCero(vector) {
    return vector.every(v => esCero(v));
}

export function obtenerColumna(matriz, colIndex) {
    return matriz.map(fila => ({ num: fila[colIndex].num, den: fila[colIndex].den }));
}

export function vectorToString(vector) {
    const componentes = vector.map(v => fraccionToString(v));
    return `(${componentes.join(", ")})`;
}

// ==================== SIMPLIFICACIÓN DE EXPRESIONES ====================

export function simplificarExpresion(expresion) {
    if (!expresion || typeof expresion !== 'string') return expresion;
    
    const trimmed = expresion.trim();
    
    if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(trimmed)) {
        try {
            const resultado = Function('"use strict"; return (' + trimmed + ')')();
            if (typeof resultado === 'number' && !isNaN(resultado) && isFinite(resultado)) {
                if (Number.isInteger(resultado)) return resultado.toString();
                return resultado.toString();
            }
        } catch (e) {}
    }
    
    return expresion;
}

// ==================== MANEJO DE RAÍCES CUADRADAS ====================

function simplificarRaizNumero(n) {
    if (n === 0) return { coeficiente: { num: 0, den: 1 }, radicando: 0 };
    if (n < 0) return { coeficiente: { num: 1, den: 1 }, radicando: -n };
    
    let radicando = n;
    let coeficiente = 1;
    
    for (let i = Math.floor(Math.sqrt(radicando)); i >= 2; i--) {
        if (radicando % (i * i) === 0) {
            coeficiente *= i;
            radicando /= (i * i);
            i = Math.floor(Math.sqrt(radicando)) + 1;
        }
    }
    
    return { 
        coeficiente: { num: coeficiente, den: 1 }, 
        radicando: radicando 
    };
}

function parsearExpresionConRaiz(expresion) {
    if (!expresion || typeof expresion !== 'string') return null;
    
    const trimmed = expresion.trim();
    if (trimmed === "") return null;
    
    const raizPattern = /^(-?\d+(?:\/\d+)?)?√\(([^)]+)\)$/;
    const match = trimmed.match(raizPattern);
    
    if (match) {
        const coeficienteStr = match[1] || "1";
        const radicandoStr = match[2];
        
        const coeficiente = parsearFraccion(coeficienteStr);
        const radicando = parsearFraccion(radicandoStr);
        
        const radicandoVal = radicando.num / radicando.den;
        const raizVal = Math.sqrt(radicandoVal);
        const esExacta = Math.abs(raizVal - Math.round(raizVal)) < 1e-10;
        
        if (esExacta) {
            const resultado = raizVal * (coeficiente.num / coeficiente.den);
            const [num, den] = simplificar(Math.round(resultado * 1000), 1000);
            return { tipo: "numero", valor: { num, den } };
        }
        
        const { coeficiente: raizCoef, radicando: nuevoRadicando } = simplificarRaizNumero(radicandoVal);
        const nuevoCoef = multiplicarFracciones(coeficiente, raizCoef);
        
        if (nuevoRadicando === 1) {
            const [num, den] = simplificar(nuevoCoef.num, nuevoCoef.den);
            return { tipo: "numero", valor: { num, den } };
        }
        
        return {
            tipo: "raiz",
            coeficiente: nuevoCoef,
            radicando: { num: nuevoRadicando, den: 1 },
            radicandoOriginal: nuevoRadicando.toString(),
            esExacta: false
        };
    }
    
    if (esValorNumericoValido(trimmed, true)) {
        const fraccion = parsearFraccion(trimmed);
        return { tipo: "numero", valor: fraccion };
    }
    
    return null;
}

function sumarExpresionesRaiz(expr1, expr2) {
    if (expr1.tipo === "numero" && expr2.tipo === "numero") {
        const suma = sumarFraccionesObj(expr1.valor, expr2.valor);
        const [num, den] = simplificar(suma.num, suma.den);
        return { tipo: "numero", valor: { num, den } };
    }
    
    if (expr1.tipo === "raiz" && expr2.tipo === "raiz") {
        const rad1Val = expr1.radicando.num / expr1.radicando.den;
        const rad2Val = expr2.radicando.num / expr2.radicando.den;
        
        if (Math.abs(rad1Val - rad2Val) < 1e-10) {
            const sumaCoef = sumarFraccionesObj(expr1.coeficiente, expr2.coeficiente);
            if (sumaCoef.num === 0) {
                return { tipo: "numero", valor: { num: 0, den: 1 } };
            }
            return {
                tipo: "raiz",
                coeficiente: sumaCoef,
                radicando: expr1.radicando,
                radicandoOriginal: expr1.radicandoOriginal,
                esExacta: false
            };
        }
    }
    
    return null;
}

export function evaluarExpresionCompleta(expresionStr) {
    if (!expresionStr || expresionStr.trim() === "") return null;
    
    const trimmed = expresionStr.trim();
    
    const terminos = [];
    let currentTermino = "";
    let profundidad = 0;
    
    for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];
        
        if (char === '(' && trimmed[i-1] === '√') {
            profundidad++;
        } else if (char === ')') {
            profundidad--;
        }
        
        if ((char === '+' || char === '-') && profundidad === 0 && i !== 0) {
            if (currentTermino) {
                terminos.push(currentTermino);
                currentTermino = "";
            }
            currentTermino += char;
        } else {
            currentTermino += char;
        }
    }
    if (currentTermino) terminos.push(currentTermino);
    
    let resultado = null;
    
    for (const termino of terminos) {
        const expr = parsearExpresionConRaiz(termino);
        if (!expr) return null;
        
        if (resultado === null) {
            resultado = expr;
        } else {
            const suma = sumarExpresionesRaiz(resultado, expr);
            if (!suma) return null;
            resultado = suma;
        }
    }
    
    return resultado;
}

export function expresionRaizToString(expr) {
    if (!expr) return "";
    
    if (expr.tipo === "numero") {
        return fraccionToString(expr.valor);
    }
    
    if (expr.tipo === "raiz") {
        const coef = expr.coeficiente;
        const coefVal = coef.num / coef.den;
        
        if (coefVal === 1) {
            return `√(${fraccionToString(expr.radicando)})`;
        }
        if (coefVal === -1) {
            return `-√(${fraccionToString(expr.radicando)})`;
        }
        return `${fraccionToString(coef)}√(${fraccionToString(expr.radicando)})`;
    }
    
    return "";
}

export function crearRaizHTML(expr) {
    if (!expr) return document.createTextNode("");
    
    if (expr.tipo === "numero") {
        const texto = fraccionToString(expr.valor);
        if (texto.includes("/")) {
            const [num, den] = texto.split("/");
            const span = document.createElement("span");
            span.className = "frac";
            span.innerHTML = `<span class="top">${num}</span><span class="bottom">${den}</span>`;
            return span;
        }
        return document.createTextNode(texto);
    }
    
    if (expr.tipo === "raiz") {
        const container = document.createElement("span");
        container.className = "root-expression";
        container.style.display = "inline-flex";
        container.style.alignItems = "center";
        container.style.gap = "2px";
        
        const coef = expr.coeficiente;
        const coefVal = coef.num / coef.den;
        
        if (coefVal !== 1 && coefVal !== -1) {
            const coefSpan = document.createElement("span");
            if (coef.den === 1) {
                coefSpan.textContent = coef.num.toString();
            } else {
                coefSpan.className = "frac";
                coefSpan.innerHTML = `<span class="top">${coef.num}</span><span class="bottom">${coef.den}</span>`;
            }
            container.appendChild(coefSpan);
        } else if (coefVal === -1) {
            const minusSpan = document.createElement("span");
            minusSpan.textContent = "-";
            container.appendChild(minusSpan);
        }
        
        const rootSymbol = document.createElement("span");
        rootSymbol.className = "root-symbol";
        rootSymbol.textContent = "√";
        rootSymbol.style.fontSize = "1.2em";
        container.appendChild(rootSymbol);
        
        const radicandoSpan = document.createElement("span");
        radicandoSpan.className = "root-radicando";
        radicandoSpan.style.borderTop = "1px solid currentColor";
        radicandoSpan.style.paddingTop = "2px";
        radicandoSpan.style.marginLeft = "2px";
        
        const radVal = expr.radicando;
        if (radVal.den === 1) {
            radicandoSpan.textContent = radVal.num.toString();
        } else {
            const fracSpan = document.createElement("span");
            fracSpan.className = "frac";
            fracSpan.innerHTML = `<span class="top">${radVal.num}</span><span class="bottom">${radVal.den}</span>`;
            radicandoSpan.appendChild(fracSpan);
        }
        
        container.appendChild(radicandoSpan);
        return container;
    }
    
    return document.createTextNode("");
}

export function tablaTieneErrores(table) {
    if (!table) return false;
    const celdas = table.querySelectorAll('.cell-span, .cell-input');
    for (const celda of celdas) {
        if (celda.classList && celda.classList.contains('cell-error')) {
            return true;
        }
        const valor = celda.classList?.contains('cell-input') 
            ? celda.value 
            : (celda.getAttribute?.('data-value') || celda.textContent || "");
        if (valor && valor !== "" && !esValorNumericoValido(valor, true) && !valor.includes('√')) {
            return true;
        }
    }
    return false;
}

const auxiliares = {
    esVectorCero,
    obtenerColumna,
    vectorToString,
    simplificar,
    parsearFraccion,
    esValorNumericoValido,
    multiplicarFracciones,
    sumarFraccionesObj,
    restarFracciones,
    dividirFracciones,
    fraccionToString,
    esCero,
    parsearMatriz,
    agregarFila,
    agregarColumna,
    eliminarFila,
    eliminarColumna,
    filaVacia,
    columnaVacia,
    insertarFila,
    insertarColumna,
    normalizarSigno,
    esFraccion,
    tieneDecimales,
    formatearResultado,
    parsearVectoresAMatriz,
    normalizarValorTexto,
    simplificarExpresion,
    evaluarExpresionCompleta,
    expresionRaizToString,
    crearRaizHTML,
    tablaTieneErrores
};

export default auxiliares;