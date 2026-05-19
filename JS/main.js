import { inicializarMatriz, cambiarModo } from "./ux_matrices.js";
import { inicializarEV, cambiarOperacionEV } from "./ux_ev.js";
import { initDragAndDrop, initTableSync } from "./dragDrop.js";
import UI from "./ui.js";
import { desconfigurarEventosEV } from "./eventos_ev.js";
import { desconfigurarEventosMatri } from "./eventos_matri.js";

const article = document.getElementById("article");
const aside = document.getElementById("aside");
const modal = document.getElementById("helpModal");
const modalClose = document.querySelector(".modal-close");
const btnCloseModal = document.querySelector(".btn-close-modal");
const tutorialBtn = document.getElementById("tutorialBtn");
const tutorialContent = document.getElementById("tutorialContent");

let currentModule = "matrices";

// ========== MODAL ==========
function openModal() { modal.classList.add("show"); }
function closeModal() { modal.classList.remove("show"); }

document.getElementById("helpBtn")?.addEventListener("click", openModal);
modalClose?.addEventListener("click", closeModal);
btnCloseModal?.addEventListener("click", closeModal);
tutorialBtn?.addEventListener("click", () => {
    tutorialContent?.classList.toggle("show");
});
modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
});

// ========== CONSTRUIR ASIDE ==========
function buildAside() {
    aside.innerHTML = "";

    // Grupo de navegación
    const navGroup = UI.createDiv("navGroup");
    navGroup.className = "nav-group";

    const btnMat = UI.createButton("btnNavMatrices", "Matrices", "nav-btn");
    const btnEV = UI.createButton("btnNavEV", "E.V y S.E.V", "nav-btn");

    if (currentModule === "matrices") btnMat.classList.add("seleccionado");
    else btnEV.classList.add("seleccionado");

    btnMat.addEventListener("click", () => switchModule("matrices"));
    btnEV.addEventListener("click", () => switchModule("ev"));

    navGroup.appendChild(btnMat);
    navGroup.appendChild(btnEV);
    aside.appendChild(navGroup);

    // Lista de operaciones
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
    } else {
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

    aside.appendChild(ul);

    // Toggle tema
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

    desconfigurarEventosEV();
    desconfigurarEventosMatri(article);

    if (module === "matrices") {
        buildAside();
        inicializarMatriz(article, "axb");
        updateSelection("AXB");
    } else {
        buildAside();
        inicializarEV(article, "li");
        updateSelection("btnLI");
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

