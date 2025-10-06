// js/ui.js
import { createBarChart, createDoughnutChart, createLineChart, createHistogram, createBoxPlot } from './charts.js';
import { formatCurrency } from './utils.js';

// --- Funções de Renderização dos Capítulos ---

export function renderChapterOverview(contentEl, dataToUse, getCachedStats) {
    const totalRecords = dataToUse.length;
    const uniqueStations = _.uniqBy(dataToUse, 'cnpjDaRevenda').length;
    const fuelTypes = _.uniq(dataToUse.map(d => d.produto));
    const regionals = _.uniq(dataToUse.map(d => d.regional)).filter(r => r !== 'Não Identificada');
    
    const stats = getCachedStats('overview', () => ({
        recordsBySemester: _.countBy(dataToUse, 'semestre'),
        recordsByFuel: _.countBy(dataToUse, 'produto'),
        recordsByRegional: _.countBy(dataToUse, 'regional'),
        recordsByBrand: _.countBy(dataToUse, 'bandeira'),
    }));

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    ${createMetricCard('Total de Registros', totalRecords.toLocaleString('pt-BR'), 'Número total de observações de preços coletadas.', 'database')}
                    ${createMetricCard('Postos Únicos', uniqueStations.toLocaleString('pt-BR'), 'Quantidade de postos distintos identificados em BH.', 'gas-pump')}
                    ${createMetricCard('Tipos de Combustíveis', fuelTypes.length, 'Variedade de combustíveis analisados.', 'flame')}
                    ${createMetricCard('Regionais Mapeadas', regionals.length, 'Número de regionais de BH com dados.', 'map-pinned')}
                    ${createMetricCard('Período Analisado', '3.5 Anos', 'A análise cobre de Jan/2022 a Jun/2025.', 'calendar-days')}
                    ${createMetricCard('Abrangência', 'Belo Horizonte', 'O escopo geográfico é restrito à capital mineira.', 'map')}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    ${createChartCard('dist-semester', 'Registros por Semestre', 'Distribuição das coletas ao longo do tempo.')}
                    ${createChartCard('dist-fuel', 'Registros por Combustível', 'Proporção de cada tipo de combustível.')}
                    ${createChartCard('dist-regional', 'Registros por Regional', 'Cobertura de dados em cada regional.')}
                    ${createChartCard('dist-brand', 'Top 10 Bandeiras', 'As 10 bandeiras com mais registros.')}
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Cobertura Geográfica</h3>
                    <p class="text-sm text-gray-600 mb-4">Mapa com a concentração de registros por regional.</p>
                    ${createBHMap(stats.recordsByRegional)}
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Visão Geral dos Dados',
                    `<h4 class="font-semibold text-gray-700 mb-2">Amostra vs. População</h4>
                     <p class="text-sm text-gray-600 mb-4">Os dados representam uma <strong>amostra</strong> dos postos de BH, um subconjunto representativo, não a <strong>população</strong> completa. A confiabilidade das conclusões depende do tamanho da amostra.</p>
                     <h4 class="font-semibold text-gray-700 mb-2">Tipos de Variáveis</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li><strong>Categóricas:</strong> Classificam dados em grupos (ex: Tipo de Combustível, Regional).</li>
                        <li><strong>Numéricas:</strong> Medem uma quantidade (ex: Valor de Venda).</li>
                     </ul></p>`
                )}
            </div>
        </div>`;
    
    const recordsBySemester = stats.recordsBySemester;
    const sortedSemesters = Object.keys(recordsBySemester).sort();
    const sortedSemesterValues = sortedSemesters.map(semester => recordsBySemester[semester]);
    createBarChart('dist-semester', sortedSemesters, sortedSemesterValues, { indexAxis: 'y' });
    
    const recordsByFuel = stats.recordsByFuel;
    const fuelKeys = Object.keys(recordsByFuel);
    const fuelValues = fuelKeys.map(k => recordsByFuel[k]);
    createDoughnutChart('dist-fuel', fuelKeys, fuelValues);

    const recordsByRegional = stats.recordsByRegional;
    const regionalKeys = Object.keys(recordsByRegional);
    const regionalValues = regionalKeys.map(k => recordsByRegional[k]);
    createBarChart('dist-regional', regionalKeys, regionalValues);
    
    const top10Brands = _.chain(stats.recordsByBrand).toPairs().sortBy(1).reverse().take(10).fromPairs().value();
    createBarChart('dist-brand', Object.keys(top10Brands), Object.values(top10Brands), { indexAxis: 'y' });
}

export function renderChapterDistribution(contentEl, filteredData, getCachedStats, detectOutliers) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    const prices = filteredData.map(d => d.valorDeVenda);
    const stats = getCachedStats('distribution', () => {
        const sortedPrices = [...prices].sort((a, b) => a - b);
        return {
            mean: math.mean(prices), median: math.median(sortedPrices), mode: math.mode(prices)[0] || 'N/A',
            std: math.std(prices, 'unbiased'), min: sortedPrices[0], max: sortedPrices[sortedPrices.length - 1],
            q1: math.quantileSeq(sortedPrices, 0.25, false), q3: math.quantileSeq(sortedPrices, 0.75, false),
        };
    });
    stats.cv = stats.mean ? (stats.std / stats.mean) * 100 : 0;
    stats.iqr = stats.q3 - stats.q1;
    stats.outliers = detectOutliers(prices, stats.q1, stats.q3, stats.iqr);

    contentEl.innerHTML = `
         <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-xl font-semibold mb-4">Estatísticas Descritivas do Preço (R
