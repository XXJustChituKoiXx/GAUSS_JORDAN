import { multiplicarFracciones, sumarFraccionesObj, restarFracciones, normalizarSigno } from "./auxiliares.js";

// ==================== OPERACIONES CON VECTORES ====================

export function swapFilas(m, fil_i, fil_j) {
    if (fil_i === fil_j) return false;
    [m[fil_i], m[fil_j]] = [m[fil_j], m[fil_i]];
    return true;
}

export function multiplicarFila(m, fil_i, k) {
    for (let col = 0; col < m[fil_i].length; ++col) {
        m[fil_i][col] = normalizarSigno(multiplicarFracciones(m[fil_i][col], k));
    }
}

export function sumarFilas(m, fil_i, fil_j, k) {
    for (let col = 0; col < m[fil_i].length; ++col) {
        const termino = multiplicarFracciones(m[fil_j][col], k);
        m[fil_i][col] = normalizarSigno(sumarFraccionesObj(m[fil_i][col], termino));
    }
}

export function restarFilas(m, fil_i, fil_j, k) {
    for (let col = 0; col < m[fil_i].length; ++col) {
        const termino = multiplicarFracciones(m[fil_j][col], k);
        m[fil_i][col] = normalizarSigno(restarFracciones(m[fil_i][col], termino));
    }
}

export function productoPunto(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error("Los vectores deben tener la misma dimensión");
    }
    
    let resultado = { num: 0, den: 1 };
    
    for (let i = 0; i < vectorA.length; i++) {
        const producto = multiplicarFracciones(vectorA[i], vectorB[i]);
        resultado = sumarFraccionesObj(resultado, producto);
    }
    
    return resultado;
}

export function normaCuadrada(vector) {
    return productoPunto(vector, vector);
}

export function multiplicarVectorPorEscalar(vector, escalar) {
    return vector.map(v => multiplicarFracciones(v, escalar));
}

export function restarVectores(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error("Los vectores deben tener la misma dimensión");
    }
    
    return vectorA.map((v, i) => restarFracciones(v, vectorB[i]));
}

export function sumarVectores(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error("Los vectores deben tener la misma dimensión");
    }
    
    return vectorA.map((v, i) => sumarFraccionesObj(v, vectorB[i]));
}

// ==================== OPERACIONES CON MATRICES ====================

export function sumarMatrices(A, B) {
    return A.map((fila, i) => 
        fila.map((valor, j) => 
            normalizarSigno(sumarFraccionesObj(valor, B[i][j]))
        )
    );
}

export function restarMatrices(A, B) {
    return A.map((fila, i) => 
        fila.map((valor, j) => 
            normalizarSigno(restarFracciones(valor, B[i][j]))
        )
    );
}

export function multiplicarMatrices(A, B) {
    const filasA = A.length;
    const columnasA = A[0].length;
    const columnasB = B[0].length;
    const resultado = [];

    for (let i = 0; i < filasA; i++) {
        const fila = [];
        for (let j = 0; j < columnasB; j++) {
            let suma = { num: 0, den: 1 };
            for (let k = 0; k < columnasA; k++) {
                suma = sumarFraccionesObj(suma, multiplicarFracciones(A[i][k], B[k][j]));
            }
            fila.push(normalizarSigno(suma));
        }
        resultado.push(fila);
    }

    return resultado;
}

export function multiplicarMatrizPorEscalar(A, escalar) {
    return A.map(fila => 
        fila.map(valor => 
            normalizarSigno(multiplicarFracciones(valor, escalar))
        )
    );
}

export function transponerMatriz(A) {
    if (!A.length || !A[0].length) return [];
    
    const filas = A.length;
    const columnas = A[0].length;
    const resultado = [];
    
    for (let j = 0; j < columnas; j++) {
        resultado[j] = [];
        for (let i = 0; i < filas; i++) {
            resultado[j][i] = A[i][j];
        }
    }
    
    return resultado;
}

export function trazaMatriz(A) {
    if (!A.length || !A[0].length) {
        throw new Error("La matriz no puede estar vacía");
    }
    
    if (A.length !== A[0].length) {
        throw new Error("La traza solo está definida para matrices cuadradas");
    }
    
    let suma = { num: 0, den: 1 };
    
    for (let i = 0; i < A.length; i++) {
        suma = sumarFraccionesObj(suma, A[i][i]);
    }
    
    return normalizarSigno(suma);
}

export function validarDimensionesMatrices(modo, A, B = null) {
    const dimA = {
        filas: A.length,
        columnas: A[0]?.length || 0
    };
    
    if (!B && modo !== "escalar") {
        throw new Error(`Se requiere una segunda matriz para la operación ${modo}`);
    }
    
    if (modo === "escalar") return true;
    
    const dimB = {
        filas: B.length,
        columnas: B[0]?.length || 0
    };
    
    if ((modo === "suma" || modo === "resta")) {
        if (dimA.filas !== dimB.filas || dimA.columnas !== dimB.columnas) {
            const operacion = modo === "suma" ? "sumar" : "restar";
            throw new Error(
                `Para ${operacion} matrices, la matriz A y la matriz B deben tener el mismo número de filas y columnas. ` +
                `Actualmente A es ${dimA.filas}×${dimA.columnas} y B es ${dimB.filas}×${dimB.columnas}.`
            );
        }
    }
    
    if (modo === "multiplicacion") {
        if (dimA.columnas !== dimB.filas) {
            throw new Error(
                `Para multiplicar matrices, el número de columnas de A debe ser igual al número de filas de B. ` +
                `Actualmente A tiene ${dimA.columnas} columna${dimA.columnas === 1 ? "" : "s"} y B tiene ${dimB.filas} fila${dimB.filas === 1 ? "" : "s"}.`
            );
        }
    }
    
    return true;
}