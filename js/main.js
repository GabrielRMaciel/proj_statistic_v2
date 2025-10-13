// js/main.js
import { loadAllData } from './data.js';
import {
    renderNavigation, renderFilters, renderGlossary,
    renderChapterOverview, renderChapterDistribution,
    renderChapterTemporal, renderChapterRegional, renderChapterCorrelation, renderChapterInsights
} from './ui.js';
import { destroyAllCharts } from './charts.js';
// ===== NOVA IMPORTAÇÃO =====
import { detectOutliers } from './utils.js';

// --- Estado Global da Aplicação ---
let allData = [];
let filteredData = [];
let activeChapter = 'overview';
let statsCache = {};

const chapters = [
    { id: 'overview', name: 'Visão Geral', icon: 'layout-dashboard' },
    { id: 'distribution', name: 'Distribuições', icon: 'bar-chart-3' },
    { id: 'temporal', name: 'Evolução Temporal', icon: 'trending-up' },
    { id: 'regional', name: 'Análise Regional', icon: 'map' },
    { id: 'correlation', name: 'Correlações', icon: 'git-merge' },
    { id: 'insights', name: 'Insights', icon: 'lightbulb' }
];

// --- Funções Principais ---

async function main() {
    try {
        // O código de registro do boxplot foi movido para o arquivo js/charts.js
        
        allData = await loadAllData();
        if (allData.length === 0) {
            throw new Error("Nenhum dado foi carregado. Verifique se os arquivos CSV estão na pasta 'data/' e se os nomes correspondem. Veja o console para erros de rede (404 Not Found).");
        }
        document.getElementById('loader').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
        initUI();
        applyFilters();
    } catch (error) {
        console.error("Erro fatal na inicialização:", error);
        document.getElementById('loader').innerHTML = `<div class="text-center p-4">
            <h2 class="text-xl font-bold text-red-600">Falha ao Carregar os Dados</h2>
            <p class="text-gray-700 mt-2">${error.message}</p>
            <p class="text-gray-500 text-sm mt-4">Abra o console do navegador (F12) e verifique a aba "Network" para confirmar se os arquivos foram encontrados (código 200) ou se houve erro (código 404).</p>
        </div>`;
    }
}

function initUI() {
    renderNavigation(chapters, activeChapter);
    renderFilters(allData);
    renderGlossary();
    setupEventListeners();
    lucide.createIcons();
}

function setupEventListeners() {
    document.getElementById('chapter-nav').addEventListener('click', (e) => {
        const chapterLink = e.target.closest('[data-chapter]');
        if (chapterLink) {
            e.preventDefault();
            setActiveChapter(chapterLink.dataset.chapter);
        }
    });
    document.getElementById('filters').addEventListener('change', applyFilters);
}

function applyFilters() {
    const semesterFilter = document.getElementById('semester-filter').value;
    const fuelFilter = Array.from(document.querySelectorAll('#fuel-filter input:checked')).map(el => el.value);
    const regionalFilter = document.getElementById('regional-filter').value;

    filteredData = allData.filter(d => 
        (semesterFilter === 'all' || d.semestre === semesterFilter) &&
        (fuelFilter.length === 0 || fuelFilter.includes(d.produto)) &&
        (regionalFilter === 'all' || d.regional === regionalFilter)
    );

    statsCache = {};
    renderActiveChapter();
}

function setActiveChapter(chapterId) {
    activeChapter = chapterId;
    renderNavigation(chapters, activeChapter);
    lucide.createIcons();
    renderActiveChapter();
}

function renderActiveChapter() {
    const contentEl = document.getElementById('main-content');
    destroyAllCharts();
    contentEl.innerHTML = '';

    const getCachedStats = (key, calculatorFn) => {
        if (statsCache[key]) return statsCache[key];
        statsCache[key] = calculatorFn();
        return statsCache[key];
    };
    
    // ===== FUNÇÃO 'detectOutliers' REMOVIDA DAQUI =====

    switch (activeChapter) {
        case 'overview': 
            renderChapterOverview(contentEl, allData, getCachedStats); 
            break;
        case 'distribution': 
            renderChapterDistribution(contentEl, filteredData, getCachedStats, detectOutliers); 
            break;
        case 'temporal': 
            renderChapterTemporal(contentEl, filteredData, getCachedStats); 
            break;
        case 'regional': 
            renderChapterRegional(contentEl, filteredData, getCachedStats); 
            break;
        case 'correlation':
            renderChapterCorrelation(contentEl, filteredData, getCachedStats);
            break;
        case 'insights':
            renderChapterInsights(contentEl, allData, filteredData, getCachedStats, detectOutliers);
            break;
    }
    lucide.createIcons();
}

// --- Iniciar a aplicação ---
document.addEventListener('DOMContentLoaded', main);
