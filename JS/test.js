import * as Operaciones from './operaciones.js';
import * as GaussJordan from './gaussJordan.js';
import { resolverAXB } from './calculos.js';
import Auxiliares from './auxiliares.js';

describe('Test de Garantia de Algoritmo Gauss-Jordan', () => {

 // --- BLOQUE 1: INTEGRIDAD ARITMÉTICA Y NORMALIZACIÓN ---
    describe('Aritmética', () => {
        
        test('Validación de Normalización de Signos', () => {
            const [n, d] = Auxiliares.simplificar(5, -10);
            expect(n).toBe(-1);
            expect(d).toBe(2);
            expect(d).toBeGreaterThan(0);
        });

        test('Simplificacion de fracciones', () => {
            const [n, d] = Auxiliares.simplificar(-7, -7);
            expect(n).toBe(1);
            expect(d).toBe(1);
        });

        test('Simplificacion de signos en cualquier posicion.', () => {
            // Caso 1: Negativo abajo -> Sube al numerador
            const c1 = Auxiliares.simplificar(3, -4);
            expect(c1[0]).toBe(-3); expect(c1[1]).toBe(4);

            // Caso 2: Ambos negativos -> Se cancelan (Positivo)
            const c2 = Auxiliares.simplificar(-5, -2);
            expect(c2[0]).toBe(5); expect(c2[1]).toBe(2);

            // Caso 3: Cero con signo negativo -> Normaliza a 0 positivo
            const c3 = Auxiliares.simplificar(-0, 5);
            expect(c3[0]).toBe(0); expect(c3[1]).toBe(1);
        });

        test('Precisión de Fracciones con Decimales Infinitesimales.', () => {
            // Probamos con 0.000001 (1x10^-6) para asegurar que no se pierda por redondeo
            const f1 = { num: 0.000001, den: 1 }; 
            const f2 = { num: 0.000002, den: 1 };
            
            const numSumado = (f1.num * f2.den) + (f2.num * f1.den); 
            const denComun = f1.den * f2.den;
            
            const [n, d] = Auxiliares.simplificar(numSumado, denComun);
            // El resultado debe ser exactamente 3/1,000,000
            expect(n).toBe(3);
            expect(d).toBe(1000000);
        });

        test('Precisión de Fracciones.', () => {
            const f1 = { num: 1, den: 3 };
            const f2 = { num: 1, den: 6 };
            
            const numSumado = (f1.num * f2.den) + (f2.num * f1.den); // 9
            const denComun = f1.den * f2.den;                      // 18
            
            const [n, d] = Auxiliares.simplificar(numSumado, denComun);
            expect(n).toBe(1);
            expect(d).toBe(2);
        });
    });

    //  ESTABILIDAD ALGORÍTMICA 
    describe('Operaciones entre filas de la Matriz.', () => {

        test('Procedimiento de Intercambio (Swap)', () => {
            const matriz = [[{ num: 1, den: 1 }], [{ num: 2, den: 1 }]];
            Operaciones.swapFilas(matriz, 0, 1);
            expect(matriz[0][0].num).toBe(2);
            expect(matriz[1][0].num).toBe(1);
        });

        test('Búsqueda de Pivote(busqueda y swap).', () => {
            const matriz = [
                [{ num: 0, den: 1 }, { num: 1, den: 1 }],
                [{ num: 9, den: 1 }, { num: 4, den: 1 }]
            ];
        
            const resultadoPivote = GaussJordan.buscarPivote(matriz, 0, 0);
            expect(resultadoPivote.encontrado).toBe(true);
            expect(resultadoPivote.huboSwap).toBe(true);
        });

        test('Identificación de sistemas sin solución única.', () => {
            const matriz = [
                [{ num: 1, den: 1 }, { num: 1, den: 1 }, { num: 10, den: 1 }],
                [{ num: 1, den: 1 }, { num: 1, den: 1 }, { num: 20, den: 1 }]
            ];
            const res = resolverAXB(matriz);
            // la última fila queda como [0, 0 | k]
            const ultimaFila = res[res.length - 1];
            expect(ultimaFila[0].num).toBe(0);
            expect(ultimaFila[ultimaFila.length - 1].num).not.toBe(0);
        });
    });

    // MANEJO DE EXCEPCIONES 
    describe('Manejo de datos basura.', () => {

        test('Neutralización de Entradas Inválidas.', () => {
            const casosBasura = ["null", "1/0", "error_string"];
            casosBasura.forEach(input => {
                const frac = Auxiliares.parsearFraccion(input);
                expect(frac.num).toBe(0);
                expect(frac.den).toBe(1);
                expect(isNaN(frac.num)).toBe(false);
            });
        });

        test('Manejo de Estabilidad de Escala.', () => {
            const escala = 1000000;
            const matriz = [
                [{ num: escala, den: 1 }, { num: 1, den: 1 }, { num: escala + 2, den: 1 }],
                [{ num: 1, den: 1 }, { num: 1, den: 1 }, { num: 3, den: 1 }]
            ];
            const res = resolverAXB(matriz);
            // Verifica precisión en la resolución final (x=1, y=2)
            expect(res[0][res[0].length - 1].num / res[0][res[0].length - 1].den).toBeCloseTo(1);
            expect(res[1][res[1].length - 1].num / res[1][res[1].length - 1].den).toBeCloseTo(2);
        });
    });

    // CASOS ESPECÍFICOS PARA EVITAR ERRORES COMO "0-6" EN E.V.
    describe('Validación de entradas en espacios vectoriales', () => {

        test('Rechaza signos negativos mal colocados.', () => {
            const casosInvalidos = ["0-6", "4-2", "--6", "6-", "0--6"];
            casosInvalidos.forEach(input => {
                expect(Auxiliares.esValorNumericoValido(input, true)).toBe(false);
            });
        });

        test('Rechaza fracciones incompletas o con denominador cero.', () => {
            const casosInvalidos = ["1/0", "0/0", "6/", "/6", "1//2", "1/2/3", "3/-"];
            casosInvalidos.forEach(input => {
                expect(Auxiliares.esValorNumericoValido(input, true)).toBe(false);
            });
        });

        test('Rechaza puntos decimales mal escritos.', () => {
            const casosInvalidos = [".", "-.", "3..5", "2.1.4", "1/." ];
            casosInvalidos.forEach(input => {
                expect(Auxiliares.esValorNumericoValido(input, true)).toBe(false);
            });
        });

        test('Acepta enteros, decimales y fracciones válidas.', () => {
            const casosValidos = ["0", "-6", "7", "3/4", "-3/4", "3/-4", "0.5", "-.5", ".5"];
            casosValidos.forEach(input => {
                expect(Auxiliares.esValorNumericoValido(input, true)).toBe(true);
            });
        });

        test('No deja pasar valores inválidos al armado de la matriz.', () => {
            const vectores = [["7", "0-6"], ["1", "3"]];
            expect(() => Auxiliares.parsearVectoresAMatriz(vectores, true)).toThrow("Valor inválido");
        });

        test('Mantiene inválidos al cambiar de operación en E.V.', () => {
            const vectoresLI = [["7", "0-6"], ["1", "3"]];
            const vectoresPertenecer = [["7", "0-6"], ["1", "3"], ["4", "-2"]];
            const vectoresBase = [["7", "0-6"], ["1", "3"]];

            [vectoresLI, vectoresPertenecer, vectoresBase].forEach(vectores => {
                expect(() => Auxiliares.parsearVectoresAMatriz(vectores, true)).toThrow("Valor inválido");
            });
        });

        test('Normalizar no convierte una entrada inválida en cero válido.', () => {
            const valor = Auxiliares.normalizarValorTexto("0-6");
            expect(valor).toBe("0-6");
            expect(Auxiliares.esValorNumericoValido(valor, true)).toBe(false);
        });
    });

});
