import { esCero, multiplicarFracciones, dividirFracciones, restarFracciones, normalizarSigno, fraccionToString,sumarFraccionesObj,esVectorCero,obtenerColumna,vectorToString } from "./auxiliares.js";
import { productoPunto, normaCuadrada, multiplicarVectorPorEscalar, restarVectores, sumarVectores } from "./operaciones.js";
import gaussJordan from "./gaussJordan.js";


// Gauss Jordan completo para AXB e Inversa
// esAXB indica si la última columna es el vector resultado (en caso de AXB) o parte de la matriz aumentada (en caso de inversa).
function aplicarGaussJordan(matriz, esAXB = false) {
    const filas = matriz.length;
    const columnas = esAXB ? matriz[0].length - 1 : matriz[0].length;
    let filaPivote = 0;

    for (let col = 0; col < columnas && filaPivote < filas; col++) {
        const { encontrado } = gaussJordan.buscarPivote(matriz, filaPivote, col);
        if (!encontrado) continue;

        gaussJordan.hacerPivoteUno(matriz, filaPivote, matriz[filaPivote][col]);
        gaussJordan.hacerCerosArriba(matriz, filaPivote, col);
        gaussJordan.hacerCerosDebajo(matriz, filaPivote, col);

        filaPivote++;
    }
    return matriz;
}

function aplicarGaussJordanDeterminante(matriz) {
    const n = matriz.length;
    let swaps = 0;
    let factoresNormalizacion = [];
    let filaPivote = 0;

    const copia = matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));

    for (let col = 0; col < n && filaPivote < n; col++) {
        // Buscar pivote en la columna actual desde filaPivote hasta abajo
        const { encontrado, huboSwap } = gaussJordan.buscarPivote(copia, filaPivote, col);

        if (!encontrado) {
            return {
                matrizFinal: copia,
                historialFactores: [...factoresNormalizacion, ...Array(swaps).fill(-1)],
                determinante: { num: 0, den: 1 }
            };
        }

        // Contar el swap si ocurrió
        if (huboSwap) {
            swaps++;
        }

        // Guardar el pivote y normalizar la fila
        const pivote = copia[filaPivote][col];

        // Normalizar solo si el pivote no es 1
        if (!(pivote.num === 1 && pivote.den === 1)) {
            // Guardar el factor (el pivote original)
            factoresNormalizacion.push({ num: pivote.num, den: pivote.den });
            gaussJordan.hacerPivoteUno(copia, filaPivote, pivote);
        }
        gaussJordan.hacerCerosDebajo(copia, filaPivote, col);
        gaussJordan.hacerCerosArriba(copia, filaPivote, col);

        filaPivote++;
    }

    // Construir historial de factores
    const historialFactores = [];

    // Factores de intercambio (-1 por cada swap)
    for (let i = 0; i < swaps; i++) {
        historialFactores.push(-1);
    }

    // Factores de normalización (pivotes originales)
    for (const factor of factoresNormalizacion) {
        historialFactores.push(factor);
    }

    // Calcular determinante como producto de todos los factores
    let determinante = { num: 1, den: 1 };
    for (const factor of historialFactores) {
        if (typeof factor === 'number') {
            determinante = multiplicarFracciones(determinante, { num: factor, den: 1 });
        } else {
            determinante = multiplicarFracciones(determinante, factor);
        }
    }
    determinante = normalizarSigno(determinante);

    return {
        matrizFinal: copia,
        historialFactores: historialFactores,
        determinante: determinante
    };
}

// Los vectores van como columna.

function clonarMatriz(matriz) {
    return matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));
}

function columnaDeMatriz(matriz, col) {
    return matriz.map(fila => ({ num: fila[col].num, den: fila[col].den }));
}

function crearCanonico(dimension, indice) {
    return Array.from({ length: dimension }, (_, i) => ({ num: i === indice ? 1 : 0, den: 1 }));
}

function juntarColumnas(columnas) {
    if (columnas.length === 0) return [];

    const filas = columnas[0].length;

    return Array.from({ length: filas }, (_, i) =>
        columnas.map(col => ({ num: col[i].num, den: col[i].den }))
    );
}

function filaCeroHastaColumna(fila, columnasCoeficientes) {
    for (let col = 0; col < columnasCoeficientes; col++) {
        if (!esCero(fila[col])) return false;
    }

    return true;
}

function obtenerColumnasNoPivote(totalColumnas, columnasPivote) {
    const pivotes = new Set(columnasPivote);
    const columnasNoPivote = [];

    for (let col = 0; col < totalColumnas; col++) {
        if (!pivotes.has(col)) columnasNoPivote.push(col);
    }

    return columnasNoPivote;
}

// Gauss-Jordan guardando las columnas donde si huay pivote.
export function aplicarGaussJordanConPivotes(matriz, columnasAProcesar = matriz[0]?.length || 0) {
    const copia = clonarMatriz(matriz);
    const filas = copia.length;
    let filaPivote = 0;
    const columnasPivote = [];

    for (let col = 0; col < columnasAProcesar && filaPivote < filas; col++) {
        const { encontrado } = gaussJordan.buscarPivote(copia, filaPivote, col);

        if (!encontrado) continue;

        columnasPivote.push(col);

        gaussJordan.hacerPivoteUno(copia, filaPivote, copia[filaPivote][col]);
        gaussJordan.hacerCerosArriba(copia, filaPivote, col);
        gaussJordan.hacerCerosDebajo(copia, filaPivote, col);

        filaPivote++;
    }

    return {
        matrizReducida: copia,
        columnasPivote,
        rango: columnasPivote.length
    };
}

// Li o Ld.
export function clasificarLIoLD(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }

    const totalVectores = matrizVectores[0].length - 1;

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(matrizVectores, totalVectores);

    const esLI = rango === totalVectores;

    return {
        esLI,
        rango,
        totalVectores,
        columnasPivote,
        matrizReducida
    };
}

//vector pertenece al espacio generado por S.
export function perteneceAS(matrizGeneradores, vectorB) {
    if (!matrizGeneradores.length || !matrizGeneradores[0].length) {
        throw new Error("Debes mandar los generadores como columnas de una matriz");
    }
    if (matrizGeneradores.length !== vectorB.length) {
        throw new Error("El vector debe tener la misma dimensión que los generadores");
    }

    const columnasA = matrizGeneradores[0].length;
    const aumentada = matrizGeneradores.map((fila, i) => [
        ...fila.map(v => ({ num: v.num, den: v.den })),
        { num: vectorB[i].num, den: vectorB[i].den }
    ]);

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(aumentada, columnasA);

    const inconsistente = matrizReducida.some(fila =>
        filaCeroHastaColumna(fila, columnasA) && !esCero(fila[columnasA])
    );

    return {
        pertenece: !inconsistente,
        rango,
        columnasPivote,
        matrizReducida
    };
}

// Quita las columnas que no tienen pivote y regresa una base.
export function hallarBase(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }

    const totalVectores = matrizVectores[0].length - 1;

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(matrizVectores, totalVectores);

    const base = columnasPivote.map(col => columnaDeMatriz(matrizVectores, col));

    return {
        base,
        rango,
        columnasPivote,
        columnasEliminadas: obtenerColumnasNoPivote(totalVectores, columnasPivote),
        matrizReducida
    };
}

//Completa una base agregando vectores.

export function completarBase(matrizVectores) {
    if (!matrizVectores.length) {
        throw new Error("Debes mandar al menos una fila para conocer la dimensión");
    }

    const dimension = matrizVectores.length;
    const totalOriginales = matrizVectores[0]?.length - 1 || 0;
    const baseActual = totalOriginales > 0 ? hallarBase(matrizVectores).base : [];
    const canonicos = Array.from({ length: dimension }, (_, i) => crearCanonico(dimension, i));
    const matrizPrueba = juntarColumnas([...baseActual, ...canonicos]);

    const { columnasPivote, rango } =
        aplicarGaussJordanConPivotes(matrizPrueba, matrizPrueba[0].length);

    const canonicosAgregados = columnasPivote
        .filter(col => col >= baseActual.length)
        .map(col => col - baseActual.length);

    // Construir la base completa
    const baseCompleta = [...baseActual];
    const canonicosUsados = [];

    for (let i = 0; i < canonicosAgregados.length; i++) {
        const idx = canonicosAgregados[i];
        baseCompleta.push(canonicos[idx]);
        canonicosUsados.push(idx);
    }

    return {
        baseCompleta: baseCompleta,
        baseOriginal: baseActual,
        rango,
        canonicosAgregados: canonicosUsados,
        dimension
    };
}
//aqui terminan las funciones generales para clasificación, pertenencia, base y . Ahora vienen las específicas para cada tipo de cálculo (AXB, inversa, determinante).
export function resolverAXB(matriz) {
    const copia = matriz.map(fila => [...fila]);
    return aplicarGaussJordan(copia, true);
}

export function resolverInv(matriz) {
    const n = matriz.length;

    if (!matriz.every(fila => fila.length === n)) {
        throw new Error("La matriz debe ser cuadrada");
    }

    const aumentada = matriz.map((fila, i) => [
        ...fila.map(v => ({ num: v.num, den: v.den })),
        ...Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
    ]);

    aplicarGaussJordan(aumentada, false);

    for (let i = 0; i < n; i++) {
        const { num, den } = aumentada[i][i];
        if (num === 0 || Math.abs(num) !== Math.abs(den)) {
            throw new Error("La matriz no es invertible");
        }
    }

    return aumentada.map(fila => fila.slice(n));
}

export function calcularDet(matriz) {
    const n = matriz.length;

    if (!matriz.every(fila => fila.length === n)) {
        throw new Error("La matriz debe ser cuadrada");
    }
    if (n === 1) {
        return {
            matrizFinal: matriz,
            historialFactores: [],
            determinante: normalizarSigno(matriz[0][0])
        };
    }

    const resultado = aplicarGaussJordanDeterminante(matriz);

    return resultado;
}

export function ortogonalizar(matriz) {
    if (!matriz.length || !matriz[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }

    const n = matriz.length;
    const m = matriz[0].length;
    
    const vectoresOriginales = [];
    for (let j = 0; j < m; j++) {
        vectoresOriginales.push(obtenerColumna(matriz, j));
    }
    
    //obtener una base LI usando hallarBase
    const matrizVectores = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push(vectoresOriginales[j][i]);
        }
        matrizVectores.push(fila);
    }
    
    const { base } = hallarBase(matrizVectores);
    
    if (base.length === 1) {
        throw new Error("Todos los vectores son linealmente dependientes");
    }
    
    //ortogonalizar la base LI
    const vectoresOrtogonales = [];
    
    for (let i = 0; i < base.length; i++) {
        let vectorActual = base[i].map(v => ({ num: v.num, den: v.den }));
        
        for (let j = 0; j < vectoresOrtogonales.length; j++) {
            const vectorBase = vectoresOrtogonales[j];
            
            const productoPuntoVI_UJ = productoPunto(vectorActual, vectorBase);
            const normaCuadradaUJ = normaCuadrada(vectorBase);
            
            if (!esCero(normaCuadradaUJ)) {
                const factor = dividirFracciones(productoPuntoVI_UJ, normaCuadradaUJ);
                const resta = multiplicarVectorPorEscalar(vectorBase, factor);
                vectorActual = restarVectores(vectorActual, resta);
            }
        }
        
        vectoresOrtogonales.push(vectorActual);
    }
    
    return vectoresOrtogonales;
}