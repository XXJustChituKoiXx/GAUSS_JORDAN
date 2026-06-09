import { inicializarMatriz, cambiarModo } from "./ux_matrices.js?v=15";
import { inicializarEV, cambiarOperacionEV } from "./ux_ev.js?v=15";
import { inicializarOperacionesBasicas, cambiarOperacionBasica } from "./ux_basicas.js?v=15";
import { initDragAndDrop, initTableSync } from "./dragDrop.js?v=15";
import UI from "./ui.js";
import { desconfigurarEventosEV } from "./eventos_ev.js?v=15";
import { desconfigurarEventosMatri } from "./eventos_matri.js?v=15";

const article = document.getElementById("article");
const aside = document.getElementById("aside");
const topNav = document.getElementById("topNav");
const modal = document.getElementById("helpModal");
const modalClose = modal?.querySelector(".modal-close");
const btnCloseModal = document.getElementById("btnEntendidoModal");
const tutorialBtn = document.getElementById("tutorialBtn");
const tutorialModal = document.getElementById("tutorialModal");
const tutorialModalClose = document.getElementById("tutorialModalClose");
const btnCerrarTutorialModal = document.getElementById("btnCerrarTutorialModal");

let currentModule = "matrices";
let currentAsideSelection = "AXB";

const MODULES = [
    { id: "basicas", label: "Operaciones básicas" },
    { id: "matrices", label: "Matrices" },
    { id: "ev", label: "E.V y S.E.V" },
    { id: "transformaciones", label: "Transformaciones" },
    { id: "diagonalizacion", label: "Diagonalización" }
];

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

// ========== TEMA ==========
function syncThemeSwitch() {
    const themeBtn = document.getElementById("themeToggle");
    const isLight = document.body.classList.contains("light");
    if (!themeBtn) return;
    themeBtn.classList.toggle("is-light", isLight);
    themeBtn.setAttribute("aria-pressed", String(isLight));
    themeBtn.setAttribute("aria-label", isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
}

function initThemeToggle() {
    const themeBtn = document.getElementById("themeToggle");
    if (!themeBtn) return;

    const savedTheme = localStorage.getItem("gj-theme");
    if (savedTheme === "light") document.body.classList.add("light");
    if (savedTheme === "dark") document.body.classList.remove("light");
    syncThemeSwitch();

    themeBtn.addEventListener("click", () => {
        document.body.classList.add("theme-animating");
        document.body.classList.toggle("light");
        localStorage.setItem("gj-theme", document.body.classList.contains("light") ? "light" : "dark");
        syncThemeSwitch();

        window.setTimeout(() => {
            document.body.classList.remove("theme-animating");
        }, 420);
    });
}

// ========== PLACEHOLDER ==========
function mostrarPlaceholder(article, titulo, subtitulo = "Módulo en construcción") {
    while (article.firstChild) article.removeChild(article.firstChild);

    const mainSection = UI.createSection("mainSection", titulo);
    const wrapper = UI.createDiv("wrapperPlaceholder");
    wrapper.className = "placeholder-wrapper";
    wrapper.innerHTML = `
        <div class="placeholder-icon">🚧</div>
        <h2>${titulo}</h2>
        <p>${subtitulo}</p>
        <p>El apartado visual ya está reservado para integrarlo después.</p>
    `;

    mainSection.appendChild(wrapper);
    article.appendChild(mainSection);
}

// ========== NAVEGACIÓN SUPERIOR ==========
function buildTopNav() {
    if (!topNav) return;
    topNav.innerHTML = "";

    MODULES.forEach(module => {
        const btn = UI.createButton(`topNav-${module.id}`, module.label, "top-nav-btn");
        btn.type = "button";
        btn.addEventListener("click", () => switchModule(module.id));
        topNav.appendChild(btn);
    });

    updateTopNavSelection();
}

function updateTopNavSelection() {
    if (!topNav) return;
    topNav.querySelectorAll(".top-nav-btn").forEach(btn => btn.classList.remove("seleccionado"));
    document.getElementById(`topNav-${currentModule}`)?.classList.add("seleccionado");
}

// ========== FUNCIONES LATERALES ==========
function createAsideButton(op, onClick) {
    const li = document.createElement("li");
    const btn = UI.createButton(op.id, op.text, "btn");
    btn.type = "button";
    btn.addEventListener("click", onClick);
    li.appendChild(btn);
    return li;
}

function buildAside() {
    aside.innerHTML = "";

    aside.classList.toggle("aside-basicas", currentModule === "basicas");

    const ul = document.createElement("ul");
    ul.className = "aside-function-list";

    if (currentModule === "matrices") {
        const ops = [
            { id: "AXB", text: "AX = B", modo: "axb" },
            { id: "inversa", text: "Inversa", modo: "inversa" },
            { id: "determinante", text: "Determinante", modo: "determinante" }
        ];

        ops.forEach(op => {
            ul.appendChild(createAsideButton(op, () => {
                currentAsideSelection = op.id;
                cambiarModo(article, op.modo);
                updateSelection(op.id);
            }));
        });
    }
    else if (currentModule === "ev") {
        const ops = [
            { id: "btnLI", text: "Es LI o LD", modo: "li" },
            { id: "btnPertenecer", text: "Pertenece a ℒ(V)", modo: "pertenecer" },
            { id: "btnBase", text: "Hallar base", modo: "base" },
            { id: "btnCambioBase", text: "Cambio de base", modo: "cambio-base" },
            { id: "btnCompletar", text: "Completar base", modo: "completar" },
            { id: "btnOrtogonalizar", text: "Ortogonalizar", modo: "ortogonalizar" }
        ];

        ops.forEach(op => {
            ul.appendChild(createAsideButton(op, () => {
                currentAsideSelection = op.id;
                if (op.modo === "cambio-base") {
                    mostrarPlaceholder(article, "CAMBIO DE BASE", "Apartado agregado visualmente dentro de E.V y S.E.V");
                } else {
                    cambiarOperacionEV(article, op.modo);
                }
                updateSelection(op.id);
            }));
        });
    }
    else if (currentModule === "basicas") {
        const ops = [
            { id: "btnSuma", text: "Suma de matrices", modo: "suma" },
            { id: "btnResta", text: "Resta de matrices", modo: "resta" },
            { id: "btnMultiplicacion", text: "Multiplicación", modo: "multiplicacion" },
            { id: "btnEscalar", text: "Por escalar", modo: "escalar" }
        ];

        ops.forEach(op => {
            ul.appendChild(createAsideButton(op, () => {
                currentAsideSelection = op.id;
                cambiarOperacionBasica(article, op.modo);
                updateSelection(op.id);
            }));
        });
    }

    aside.appendChild(ul);

    if (!ul.children.length) {
        const empty = document.createElement("div");
        empty.className = "aside-empty";
        empty.textContent = "Este apartado todavía no tiene funciones laterales activas.";
        aside.appendChild(empty);
    }
}

function updateSelection(activeId) {
    aside.querySelectorAll(".aside-function-list button").forEach(b => b.classList.remove("seleccionado"));
    const btn = document.getElementById(activeId);
    if (btn) btn.classList.add("seleccionado");
}

function switchModule(module) {
    const isSameModule = currentModule === module;
    currentModule = module;

    desconfigurarEventosEV();
    desconfigurarEventosMatri(article);

    updateTopNavSelection();
    buildAside();

    if (module === "matrices") {
        currentAsideSelection = "AXB";
        inicializarMatriz(article, "axb");
        updateSelection("AXB");
    }
    else if (module === "ev") {
        currentAsideSelection = "btnLI";
        inicializarEV(article, "li");
        updateSelection("btnLI");
    }
    else if (module === "basicas") {
        currentAsideSelection = "btnSuma";
        inicializarOperacionesBasicas(article, "suma");
        updateSelection("btnSuma");
    }
    else if (module === "transformaciones") {
        currentAsideSelection = "";
        mostrarPlaceholder(article, "TRANSFORMACIONES LINEALES");
    }
    else if (module === "diagonalizacion") {
        currentAsideSelection = "";
        mostrarPlaceholder(article, "DIAGONALIZACIÓN");
    }

    if (!isSameModule) article.scrollTo?.({ top: 0, behavior: "smooth" });
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
    buildTopNav();
    buildAside();
    initThemeToggle();
    inicializarMatriz(article, "axb");
    updateSelection("AXB");
    initDragAndDrop();
    initTableSync();

    document.querySelector(".brand")?.addEventListener("click", (e) => {
        e.preventDefault();
        switchModule("matrices");
    });
});
