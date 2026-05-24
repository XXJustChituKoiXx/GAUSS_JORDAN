//MCD
function mcd(a, b) {
    a = a > 0 ? a : -a;
    b = b > 0 ? b : -b;
    return b === 0 ? a : mcd(b, a % b);
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

    // A partir de aquí, num y den son ENTEROS puros garantizados
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

    // Si no tiene "/", es entero
    if (!str.includes("/")) {
        const num = Number(str);
        if (isNaN(num)) return { num: 0, den: 1 };
        return { num, den: 1 };
    }

    let [numStr, denStr] = str.split("/");

    // Caso "6/" -> denominador 1
    if (denStr === "" || denStr === undefined) {
        const num = Number(numStr);
        if (isNaN(num)) return { num: 0, den: 1 };
        return { num, den: 1 };
    }

    // Caso "/5" -> numerador 1
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

// Restar fracciones (para hacer ceros)
export function restarFracciones(frac1, frac2) {
    const num = frac1.num * frac2.den - frac2.num * frac1.den;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Dividir fracciones (para normalizar pivote)
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


// Normalizar textos numéricos para evitar ceros a la izquierda y signos redundantes
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

// Función auxiliar para actualizar atributos después de modificaciones
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

//Agregar fila
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

    // Enfocar el primer span de la nueva fila
    const firstSpan = newRow.cells[0]?.querySelector('.cell-span');
    if (firstSpan) {
        setTimeout(() => firstSpan.click(), 10);
    }
}

//Agregar columna
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

    // Enfocar el primer span de la nueva columna
    const firstSpan = table.rows[0]?.cells[colIndex]?.querySelector('.cell-span');
    if (firstSpan) {
        setTimeout(() => firstSpan.click(), 10);
    }
}

//Eliminar fila
export function eliminarFila(table, rowIndex) {
    if (table.rows[rowIndex]) {
        table.deleteRow(rowIndex);
        actualizarAtributosTabla(table);
    }
}

//Eliminar columna
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

//Insertar fila en posición
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

//Insertar columna en posición
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
// Convertir vectores horizontales (strings) a matriz de fracciones (vectores como columnas)
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

        // Agregar columna de ceros si se requiere
        if (agregarColumnaCeros) {
            fila.push({ num: 0, den: 1 });
        }

        matriz.push(fila);
    }

    return matriz;
}
//
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
    normalizarValorTexto
};

export default auxiliares;
