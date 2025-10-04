// js/main.js
import { loadAllData } from './data.js';
import { 
    renderNavigation, renderFilters, renderGlossary,
    renderChapterOverview, renderChapterDistribution,
    renderChapterTemporal, renderChapterRegional, renderChapterWIP
} from './ui.js';
import { destroyAllCharts } from './charts.js';

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
    const detectOutliers = (data, q1, q3, iqr) => {
        if (typeof q1 !== 'number' || typeof q3 !== 'number' || typeof iqr !== 'number') return [];
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        return data.filter(d => d < lowerBound || d > upperBound);
    };

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
            renderChapterWIP(contentEl, 'Correlações', 'Esta seção analisará a relação entre variáveis, como preço e data.');
            break;
        case 'insights':
            renderChapterWIP(contentEl, 'Insights', 'Esta seção irá sintetizar as principais descobertas e fornecer recomendações.');
            break;
    }
    lucide.createIcons();
}

// --- Iniciar a aplicação ---
document.addEventListener('DOMContentLoaded', main);