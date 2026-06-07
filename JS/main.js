// main.js
import { inicializarMatriz, cambiarModo } from "./ux_matrices.js?v=13";
import { inicializarEV, cambiarOperacionEV } from "./ux_ev.js?v=13";
import { initDragAndDrop, initTableSync } from "./dragDrop.js?v=13";
import UI from "./ui.js";
import { desconfigurarEventosEV } from "./eventos_ev.js?v=13";
import { desconfigurarEventosMatri } from "./eventos_matri.js?v=13";

const article = document.getElementById("article");
const aside = document.getElementById("aside");
const modal = document.getElementById("helpModal");
const modalClose = modal?.querySelector(".modal-close");
const btnCloseModal = document.getElementById("btnEntendidoModal");
const tutorialBtn = document.getElementById("tutorialBtn");
const tutorialModal = document.getElementById("tutorialModal");
const tutorialModalClose = document.getElementById("tutorialModalClose");
const btnCerrarTutorialModal = document.getElementById("btnCerrarTutorialModal");

let currentModule = "matrices";

// ========== MODAL ==========
function openModal() { modal?.classList.add("show"); }
function closeModal() { modal?.classList.remove("show"); }
function openTutorialModal() { tutorialModal?.classList.add("show"); }
function closeTutorialModal() { tutorialModal?.classList.remove("show"); }

document.getElementById("helpBtn")?.addEventListener("click", openModal);
modalClose?.addEventListener("click", closeModal);
btnCloseModal?.addEventListener("click", closeModal);
tutorialBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
    openTutorialModal();
});
modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
tutorialModal?.addEventListener("click", (e) => { if (e.target === tutorialModal) closeTutorialModal(); });
tutorialModalClose?.addEventListener("click", closeTutorialModal);
btnCerrarTutorialModal?.addEventListener("click", closeTutorialModal);
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
    if (e.key === "Escape" && tutorialModal?.classList.contains("show")) closeTutorialModal();
});

// ========== FUNCIONES PLACEHOLDER ==========
function mostrarPlaceholder(article, titulo) {
    // Limpiar el article
    while (article.firstChild) article.removeChild(article.firstChild);
    
    // Crear sección principal
    const mainSection = UI.createSection("mainSection", titulo);
    const wrapper = UI.createDiv("wrapperPlaceholder");
    wrapper.style.textAlign = "center";
    wrapper.style.padding = "3rem";
    
    wrapper.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">🚧</div>
        <h2 style="color: var(--primary); margin-bottom: 1rem;">${titulo}</h2>
        <p style="color: var(--text-secondary); font-size: 1.1rem;">Módulo en construcción</p>
        <p style="color: var(--text-secondary); margin-top: 0.5rem;">Próximamente disponible</p>
    `;
    
    mainSection.appendChild(wrapper);
    article.appendChild(mainSection);
}

// ========== CONSTRUIR ASIDE ==========
function buildAside() {
    aside.innerHTML = "";

    // Grupo de navegación
    const navGroup = UI.createDiv("navGroup");
    navGroup.className = "nav-group";

    // Botones en el orden: 1. Op básicas, 2. Matrices, 3. E.V y S.E.V, 4. Transformaciones, 5. Diagonalización
    const btnBasicas = UI.createButton("btnNavBasicas", "Operaciones básicas", "nav-btn");
    const btnMat = UI.createButton("btnNavMatrices", "Matrices", "nav-btn");
    const btnEV = UI.createButton("btnNavEV", "E.V y S.E.V", "nav-btn");
    const btnTrans = UI.createButton("btnNavTrans", "Transformaciones", "nav-btn");
    const btnDiagonalizacion = UI.createButton("btnNavDiagonalizacion", "Diagonalización", "nav-btn");

    // Lógica de selección visual
    if (currentModule === "basicas") btnBasicas.classList.add("seleccionado");
    else if (currentModule === "matrices") btnMat.classList.add("seleccionado");
    else if (currentModule === "ev") btnEV.classList.add("seleccionado");
    else if (currentModule === "transformaciones") btnTrans.classList.add("seleccionado");
    else if (currentModule === "diagonalizacion") btnDiagonalizacion.classList.add("seleccionado");

    // Eventos
    btnBasicas.addEventListener("click", () => switchModule("basicas"));
    btnMat.addEventListener("click", () => switchModule("matrices"));
    btnEV.addEventListener("click", () => switchModule("ev"));
    btnTrans.addEventListener("click", () => switchModule("transformaciones"));
    btnDiagonalizacion.addEventListener("click", () => switchModule("diagonalizacion"));

    navGroup.appendChild(btnBasicas);
    navGroup.appendChild(btnMat);
    navGroup.appendChild(btnEV);
    navGroup.appendChild(btnTrans);
    navGroup.appendChild(btnDiagonalizacion);
    aside.appendChild(navGroup);

    // Lista de operaciones del módulo actual (submenú)
    const ul = document.createElement("ul");

    if (currentModule === "matrices") {
        const ops = [
            { id: "AXB", text: "AX=B" },
            { id: "inversa", text: "INVERSA" },
            { id: "determinante", text: "DETERMINANTE" }
        ];

        ops.forEach(op => {
            const li = document.createElement("li");
            const btn = UI.createButton(op.id, op.text, "btn");
            btn.addEventListener("click", () => {
                cambiarModo(article, op.id === "AXB" ? "axb" : op.id === "inversa" ? "inversa" : "determinante");
                updateSelection(op.id);
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });
    } 
    else if (currentModule === "ev") {
        const ops = [
            { id: "btnLI", text: "ES LI O LD", modo: "li" },
            { id: "btnPertenecer", text: "PERTENECE A ℒ(V)", modo: "pertenecer" },
            { id: "btnBase", text: "HALLAR BASE", modo: "base" },
            { id: "btnCompletar", text: "COMPLETAR BASE", modo: "completar" },
            { id: "btnOrtogonalizar", text: "ORTOGONALIZAR", modo: "ortogonalizar" }
        ];

        ops.forEach(op => {
            const li = document.createElement("li");
            const btn = UI.createButton(op.id, op.text, "btn");
            btn.addEventListener("click", () => {
                cambiarOperacionEV(article, op.modo);
                updateSelection(op.id);
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });
    }
    else if (currentModule === "basicas") {
        // Operaciones básicas SÍ tiene submenú
        const ops = [
            { id: "btnSuma", text: "SUMA DE MATRICES" },
            { id: "btnResta", text: "RESTA DE MATRICES" },
            { id: "btnMultiplicacion", text: "MULTIPLICACIÓN" },
            { id: "btnEscalar", text: "POR ESCALAR" }
        ];

        ops.forEach(op => {
            const li = document.createElement("li");
            const btn = UI.createButton(op.id, op.text, "btn");
            btn.addEventListener("click", () => {
                updateSelection(op.id);
                mostrarPlaceholder(article, `OPERACIONES BÁSICAS - ${op.text}`);
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });
    }
    else if (currentModule === "transformaciones") {
        // Transformaciones NO tiene submenú - el ul queda vacío
        // No se agregan botones
    }
    else if (currentModule === "diagonalizacion") {
        // Diagonalización NO tiene submenú - el ul queda vacío
        // No se agregan botones
    }

    aside.appendChild(ul);

    // Toggle tema (siempre visible)
    const themeBtn = UI.createButton("themeToggle", "MODO CLARO");
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("light");
        themeBtn.textContent = document.body.classList.contains("light") ? "MODO OSCURO" : "MODO CLARO";
    });
    aside.appendChild(themeBtn);
}

function updateSelection(activeId) {
    aside.querySelectorAll("ul button").forEach(b => b.classList.remove("seleccionado"));
    const btn = document.getElementById(activeId);
    if (btn) btn.classList.add("seleccionado");
}

function switchModule(module) {
    if (currentModule === module) return;
    currentModule = module;

    // Limpiar eventos previos
    desconfigurarEventosEV();
    desconfigurarEventosMatri(article);

    if (module === "matrices") {
        buildAside();
        inicializarMatriz(article, "axb");
        updateSelection("AXB");
    } 
    else if (module === "ev") {
        buildAside();
        inicializarEV(article, "li");
        updateSelection("btnLI");
    }
    else if (module === "basicas") {
        buildAside();
        mostrarPlaceholder(article, "OPERACIONES BÁSICAS");
        updateSelection("btnSuma");
    }
    else if (module === "transformaciones") {
        buildAside();
        mostrarPlaceholder(article, "TRANSFORMACIONES LINEALES");
        // No hay selección de submenú
    }
    else if (module === "diagonalizacion") {
        buildAside();
        mostrarPlaceholder(article, "DIAGONALIZACIÓN");
        // No hay selección de submenú
    }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
    buildAside();
    inicializarMatriz(article, "axb");
    updateSelection("AXB");
    initDragAndDrop();
    initTableSync();
});