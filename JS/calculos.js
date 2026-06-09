import { esCero, multiplicarFracciones, dividirFracciones, restarFracciones, normalizarSigno, fraccionToString, sumarFraccionesObj, esVectorCero, obtenerColumna, vectorToString } from "./auxiliares.js";
import { productoPunto, normaCuadrada, multiplicarVectorPorEscalar, restarVectores, sumarVectores, multiplicarMatrices } from "./operaciones.js";
import gaussJordan from "./gaussJordan.js";

function aplicarGaussJordan(matriz, modo = "axb", columnasCoeficientes = null) {
    const filas = matriz.length;
    if (filas === 0) return matriz;
    
    if (columnasCoeficientes === null) {
        if (modo === "axb") {
            columnasCoeficientes = matriz[0].length - 1;
        } else {
            columnasCoeficientes = matriz[0].length / 2;
        }
    }
    
    const maxCols = Math.min(columnasCoeficientes, matriz[0]?.length || 0);
    let filaPivote = 0;

    for (let col = 0; col < maxCols && filaPivote < filas; col++) {
        const { encontrado } = gaussJordan.buscarPivote(matriz, filaPivote, col);
        if (!encontrado) continue;

        gaussJordan.hacerPivoteUno(matriz, filaPivote, matriz[filaPivote][col]);
        gaussJordan.hacerCerosArriba(matriz, filaPivote, col);
        gaussJordan.hacerCerosDebajo(matriz, filaPivote, col);

        filaPivote++;
    }
    return matriz;
}

function multiplicarMatricesDimensionesDistintas(A, B) {
    const m = A.length;
    const p = A[0]?.length || 0;
    const n = B[0]?.length || 0;
    
    if (p !== B.length) {
        throw new Error(`Dimensiones incompatibles: A es ${m}x${p}, B es ${B.length}x${n}`);
    }
    
    const resultado = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            let suma = { num: 0, den: 1 };
            for (let k = 0; k < p; k++) {
                suma = sumarFraccionesObj(suma, multiplicarFracciones(A[i][k], B[k][j]));
            }
            fila.push(normalizarSigno(suma));
        }
        resultado.push(fila);
    }
    return resultado;
}

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

export function clasificarLIoLD(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }
    const totalVectores = matrizVectores[0].length - 1;
    const { matrizReducida, columnasPivote, rango } = aplicarGaussJordanConPivotes(matrizVectores, totalVectores);
    const esLI = rango === totalVectores;
    return { esLI, rango, totalVectores, columnasPivote, matrizReducida };
}

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
    const { matrizReducida, columnasPivote, rango } = aplicarGaussJordanConPivotes(aumentada, columnasA);
    const inconsistente = matrizReducida.some(fila =>
        filaCeroHastaColumna(fila, columnasA) && !esCero(fila[columnasA])
    );
    return { pertenece: !inconsistente, rango, columnasPivote, matrizReducida };
}

export function hallarBase(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }
    const totalVectores = matrizVectores[0].length - 1;
    const { matrizReducida, columnasPivote, rango } = aplicarGaussJordanConPivotes(matrizVectores, totalVectores);
    const base = columnasPivote.map(col => columnaDeMatriz(matrizVectores, col));
    return {
        base,
        rango,
        columnasPivote,
        columnasEliminadas: obtenerColumnasNoPivote(totalVectores, columnasPivote),
        matrizReducida
    };
}

export function completarBase(matrizVectores) {
    if (!matrizVectores.length) {
        throw new Error("Debes mandar al menos una fila para conocer la dimensión");
    }
    const dimension = matrizVectores.length;
    const totalOriginales = matrizVectores[0]?.length - 1 || 0;
    const baseActual = totalOriginales > 0 ? hallarBase(matrizVectores).base : [];
    const canonicos = Array.from({ length: dimension }, (_, i) => crearCanonico(dimension, i));
    const matrizPrueba = juntarColumnas([...baseActual, ...canonicos]);
    const { columnasPivote, rango } = aplicarGaussJordanConPivotes(matrizPrueba, matrizPrueba[0].length);
    const canonicosAgregados = columnasPivote
        .filter(col => col >= baseActual.length)
        .map(col => col - baseActual.length);
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

export function resolverAXB(matriz) {
    const copia = matriz.map(fila => [...fila]);
    return aplicarGaussJordan(copia, "axb");
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
    aplicarGaussJordan(aumentada, "inversa");
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

function aplicarGaussJordanDeterminante(matriz) {
    const n = matriz.length;
    let swaps = 0;
    let factoresNormalizacion = [];
    let filaPivote = 0;
    const copia = matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));

    for (let col = 0; col < n && filaPivote < n; col++) {
        const { encontrado, huboSwap } = gaussJordan.buscarPivote(copia, filaPivote, col);
        if (!encontrado) {
            return {
                matrizFinal: copia,
                historialFactores: [...factoresNormalizacion, ...Array(swaps).fill(-1)],
                determinante: { num: 0, den: 1 }
            };
        }
        if (huboSwap) swaps++;
        const pivote = copia[filaPivote][col];
        if (!(pivote.num === 1 && pivote.den === 1)) {
            factoresNormalizacion.push({ num: pivote.num, den: pivote.den });
            gaussJordan.hacerPivoteUno(copia, filaPivote, pivote);
        }
        gaussJordan.hacerCerosDebajo(copia, filaPivote, col);
        gaussJordan.hacerCerosArriba(copia, filaPivote, col);
        filaPivote++;
    }

    const historialFactores = [];
    for (let i = 0; i < swaps; i++) historialFactores.push(-1);
    for (const factor of factoresNormalizacion) historialFactores.push(factor);

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

export function matrizCambioBase(baseOrigen, baseDestino) {
    if (!baseOrigen || !baseOrigen.length || !baseDestino || !baseDestino.length) {
        throw new Error("Ambas bases deben ser matrices no vacías");
    }
    const n = baseOrigen.length;
    if (baseOrigen[0]?.length !== n || baseDestino[0]?.length !== n) {
        throw new Error("Ambas bases deben ser matrices cuadradas de la misma dimensión");
    }
    const aumentada = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push({ num: baseDestino[i][j].num, den: baseDestino[i][j].den });
        }
        for (let j = 0; j < n; j++) {
            fila.push({ num: baseOrigen[i][j].num, den: baseOrigen[i][j].den });
        }
        aumentada.push(fila);
    }
    aplicarGaussJordan(aumentada, "cambioBase");
    for (let i = 0; i < n; i++) {
        const pivote = aumentada[i][i];
        if (pivote.num === 0 || pivote.num !== pivote.den) {
            throw new Error("La base de destino no es invertible");
        }
    }
    const matrizCambio = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push(aumentada[i][n + j]);
        }
        matrizCambio.push(fila);
    }
    return matrizCambio;
}

export function matrizTransformacion(matrizTBaseCanonica, baseSalida, baseLlegada) {
    if (!matrizTBaseCanonica || !matrizTBaseCanonica.length) {
        throw new Error("La matriz de transformación no puede estar vacía");
    }
    const m = matrizTBaseCanonica.length;
    const n = matrizTBaseCanonica[0]?.length || 0;
    if (m === 0 || n === 0) {
        throw new Error("La matriz de transformación debe tener dimensiones válidas");
    }
    if (!baseSalida || baseSalida.length !== n) {
        throw new Error(`La base de salida debe tener ${n} vectores`);
    }
    if (baseSalida[0]?.length !== n) {
        throw new Error(`Cada vector de la base de salida debe tener dimensión ${n}`);
    }
    if (!baseLlegada || baseLlegada.length !== m) {
        throw new Error(`La base de llegada debe tener ${m} vectores`);
    }
    if (baseLlegada[0]?.length !== m) {
        throw new Error(`Cada vector de la base de llegada debe tener dimensión ${m}`);
    }
    const PB = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push({ num: baseSalida[i][j].num, den: baseSalida[i][j].den });
        }
        PB.push(fila);
    }
    const PC = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push({ num: baseLlegada[i][j].num, den: baseLlegada[i][j].den });
        }
        PC.push(fila);
    }
    const identidadC = Array.from({ length: m }, (_, i) =>
        Array.from({ length: m }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
    );
    const aumentadaPC = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push({ num: PC[i][j].num, den: PC[i][j].den });
        }
        for (let j = 0; j < m; j++) {
            fila.push({ num: identidadC[i][j].num, den: identidadC[i][j].den });
        }
        aumentadaPC.push(fila);
    }
    aplicarGaussJordan(aumentadaPC, "transformacion");
    const PCInversa = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push(aumentadaPC[i][m + j]);
        }
        PCInversa.push(fila);
    }
    const A = multiplicarMatricesDimensionesDistintas(matrizTBaseCanonica, PB);
    const matrizTB = multiplicarMatricesDimensionesDistintas(PCInversa, A);
    return matrizTB;
}

