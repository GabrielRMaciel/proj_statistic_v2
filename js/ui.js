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
                    <h3 class="text-xl font-semibold mb-4">Estatísticas Descritivas do Preço (R$)</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${createMetricCard('Média', formatCurrency(stats.mean), 'O valor médio dos preços. Sensível a valores extremos.', 'baseline')}
                        ${createMetricCard('Mediana', formatCurrency(stats.median), 'O valor central que divide os dados. Mais robusto a extremos.', 'git-commit-vertical')}
                        ${createMetricCard('Moda', formatCurrency(stats.mode), 'O preço que aparece com mais frequência.', 'trending-up')}
                        ${createMetricCard('Desvio Padrão', formatCurrency(stats.std), 'Mede o grau de dispersão dos preços em torno da média.', 'move-horizontal')}
                        ${createMetricCard('Coef. Variação', `${stats.cv.toFixed(1)}%`, 'Dispersão relativa à média. Útil para comparações.', 'percent')}
                        ${createMetricCard('Mínimo', formatCurrency(stats.min), 'O menor preço observado na amostra.', 'arrow-down-circle')}
                        ${createMetricCard('Máximo', formatCurrency(stats.max), 'O maior preço observado na amostra.', 'arrow-up-circle')}
                        ${createMetricCard('Outliers', `${stats.outliers.length} (${(stats.outliers.length / prices.length * 100).toFixed(1)}%)`, 'Valores atípicos, muito distantes da maioria.', 'alert-triangle')}
                    </div>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    ${createChartCard('histogram', 'Histograma de Preços', 'Mostra a frequência de preços em diferentes faixas.')}
                    ${createChartCard('boxplot', 'Box Plot de Preços', 'Visualiza a distribuição, quartis e outliers de forma concisa.')}
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Entendendo as Distribuições',
                    `<h4 class="font-semibold text-gray-700 mb-2">Média vs. Mediana</h4>
                     <p class="text-sm text-gray-600 mb-4">Se a <strong>média</strong> é muito diferente da <strong>mediana</strong>, a distribuição é assimétrica, puxada por valores extremos. A mediana se torna uma medida mais confiável do centro.</p>
                     <h4 class="font-semibold text-gray-700 mb-2">Interpretando o Box Plot</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li>A <strong>linha central</strong> é a mediana.</li>
                        <li>A <strong>caixa</strong> contém os 50% centrais dos dados (de Q1 a Q3).</li>
                        <li>As <strong>"hastes"</strong> mostram a maior parte dos dados.</li>
                        <li>Os <strong>pontos fora</strong> são os outliers.</li>
                     </ul></p>`
                )}
            </div>
         </div>`;

    createHistogram('histogram', prices, stats.mean, stats.median);
    createBoxPlot('boxplot', prices, 'Preços (R$)');
}

export function renderChapterTemporal(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }
    const stats = getCachedStats('temporal', () => {
        const groupedBySemester = _.groupBy(filteredData, 'semestre');
        const semesters = Object.keys(groupedBySemester).sort();
        const pricesByFuelOverTime = _.chain(filteredData).groupBy('produto').mapValues(fuelData => {
            const pricesBySemester = _.groupBy(fuelData, 'semestre');
            return semesters.map(sem => {
                const semesterPrices = pricesBySemester[sem];
                return semesterPrices ? math.mean(semesterPrices.map(p => p.valorDeVenda)) : null;
            });
        }).value();
        return { semesters, pricesByFuelOverTime };
    });
    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                ${createChartCard('temporal-evolution', 'Evolução do Preço Médio por Semestre', 'Acompanhe a variação dos preços dos combustíveis ao longo do tempo.')}
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Análise de Séries Temporais',
                    `<h4 class="font-semibold text-gray-700 mb-2">Componentes da Série</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li><strong>Tendência:</strong> Movimento de longo prazo (aumento/queda).</li>
                        <li><strong>Sazonalidade:</strong> Padrões que se repetem (ex: férias).</li>
                        <li><strong>Ruído:</strong> Variações aleatórias.</li>
                     </ul></p>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Limitações</h4>
                     <p class="text-sm text-gray-600">Projeções são baseadas no passado e não preveem eventos inesperados (crises, mudanças de impostos).</p>`
                )}
            </div>
        </div>`;
    createLineChart('temporal-evolution', stats.semesters, stats.pricesByFuelOverTime);
}

export function renderChapterRegional(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }
    const stats = getCachedStats('regional', () => {
        const regionalStats = _.mapValues(_.groupBy(filteredData, 'regional'), (data, regional) => {
            if (regional === 'Não Identificada' || data.length < 2) return null;
            const prices = data.map(d => d.valorDeVenda);
            return {
                count: data.length, mean: math.mean(prices), median: math.median(prices),
                std: math.std(prices), min: math.min(prices), max: math.max(prices), prices
            };
        });
        return _.omitBy(regionalStats, _.isNull);
    });
    const sortedRegionals = _.orderBy(Object.entries(stats), ([, s]) => s.mean, 'asc');
    const meanPricesByRegional = _.mapValues(stats, 'mean');
    contentEl.innerHTML = `
         <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Preço Médio por Regional</h3>
                    <p class="text-sm text-gray-600 mb-4">O mapa mostra o preço médio do combustível por regional. Áreas mais escuras indicam preços mais altos.</p>
                    ${createBHMap(meanPricesByRegional, true)}
                </div>
                ${createChartCard('regional-boxplot', 'Distribuição de Preços por Regional', 'Compare a variação de preços entre as diferentes regionais de BH.')}
                <div class="bg-white p-6 rounded-lg shadow overflow-x-auto">
                    <h3 class="text-lg font-semibold mb-4">Estatísticas por Regional</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2">Regional</th>
                                <th class="p-2 text-right">Média (R$)</th>
                                <th class="p-2 text-right">Mediana (R$)</th>
                                <th class="p-2 text-right">Desvio Padrão</th>
                                <th class="p-2 text-right">Registros</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedRegionals.map(([regional, s]) => `
                                <tr class="border-b">
                                    <td class="p-2 font-medium">${regional}</td>
                                    <td class="p-2 text-right">${formatCurrency(s.mean)}</td>
                                    <td class="p-2 text-right">${formatCurrency(s.median)}</td>
                                    <td class="p-2 text-right">${formatCurrency(s.std)}</td>
                                    <td class="p-2 text-right">${s.count.toLocaleString('pt-BR')}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                 ${createSidebar(
                    'Análise Regional',
                    `<h4 class="font-semibold text-gray-700 mb-2">Variância</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li><strong>ENTRE grupos:</strong> Diferenças nas médias entre as regionais.</li>
                        <li><strong>DENTRO de grupos:</strong> Variação de preços na mesma regional.</li>
                     </ul></p>
                     <p class="text-sm text-gray-600 mt-2">Se a variância ENTRE for alta, a localização é um fator importante para o preço.</p>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Fatores de Variação</h4>
                     <p class="text-sm text-gray-600">Perfil socioeconômico, concorrência, logística e acesso a grandes avenidas podem influenciar os preços.</p>`
                )}
            </div>
         </div>`;
    createBoxPlot('regional-boxplot', stats, 'regional');
}

export function renderChapterWIP(contentEl, title, message) {
    contentEl.innerHTML = createWIPState(title, message);
}

// --- Funções Auxiliares de UI (Componentes) ---
export function renderNavigation(chapters, activeChapter) {
    const navEl = document.getElementById('chapter-nav');
    navEl.innerHTML = chapters.map(c => `
        <a href="#" data-chapter="${c.id}" class="flex items-center space-x-2 px-4 py-3 border-b-2 border-transparent ${c.id === activeChapter ? 'tab-active' : 'text-gray-500 hover:text-gray-700'}">
            <i data-lucide="${c.icon}" class="h-4 w-4"></i>
            <span>${c.name}</span>
        </a>`).join('');
}

export function renderFilters(allData) {
    const filtersEl = document.getElementById('filters');
    const semesters = ['all', ..._.uniq(allData.map(d => d.semestre)).sort()];
    const fuels = _.uniq(allData.map(d => d.produto)).sort();
    const regionals = ['all', ..._.uniq(allData.map(d => d.regional)).sort()];

    filtersEl.innerHTML = `
        <div>
            <label for="semester-filter" class="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
            <select id="semester-filter" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                ${semesters.map(s => `<option value="${s}">${s === 'all' ? 'Todos os Semestres' : s}</option>`).join('')}
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Combustível</label>
            <div id="fuel-filter" class="bg-white p-2 rounded-md border border-gray-300 grid grid-cols-2 gap-2 max-h-28 overflow-y-auto">
                ${fuels.map(f => `
                    <label class="flex items-center space-x-2 text-sm">
                        <input type="checkbox" value="${f}" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span>${f}</span>
                    </label>`).join('')}
            </div>
        </div>
        <div>
            <label for="regional-filter" class="block text-sm font-medium text-gray-700 mb-1">Regional</label>
            <select id="regional-filter" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
               ${regionals.map(r => `<option value="${r}">${r === 'all' ? 'Todas as Regionais' : r}</option>`).join('')}
            </select>
        </div>`;
}

export function renderGlossary() {
    const glossaryEl = document.getElementById('glossary');
    const terms = [
        { term: 'Média', def: 'A soma de todos os valores dividida pelo número de valores. Representa o "valor típico", mas é sensível a outliers.' },
        { term: 'Mediana', def: 'O valor do meio em um conjunto de dados ordenado. 50% dos dados estão abaixo e 50% estão acima dela. É robusta a outliers.' },
        { term: 'Moda', def: 'O valor que aparece com mais frequência em um conjunto de dados.' },
        { term: 'Desvio Padrão', def: 'Uma medida da dispersão ou variabilidade dos dados em torno da média. Um desvio padrão baixo indica que os dados estão próximos da média.' },
        { term: 'Quartis', def: 'Valores que dividem os dados ordenados em quatro partes iguais. Q1 (25%), Q2 (mediana, 50%), Q3 (75%).' },
        { term: 'Outlier (Valor Atípico)', def: 'Uma observação que está anormalmente distante de outros valores em uma amostra.' },
        { term: 'Correlação', def: 'Medida que expressa a relação linear entre duas variáveis. Não implica causalidade.' },
    ];
    glossaryEl.innerHTML = terms.map(t => `
        <div>
            <h4 class="font-semibold text-gray-700">${t.term}</h4>
            <p class="text-gray-600">${t.def}</p>
        </div>`).join('');
}

function createMetricCard(title, value, tooltipText, iconName) {
    return `<div class="bg-white p-4 rounded-lg shadow has-tooltip relative">
        <div class="flex items-start justify-between">
            <div><p class="text-sm text-gray-500">${title}</p><p class="text-2xl font-bold text-gray-800">${value}</p></div>
            <i data-lucide="${iconName}" class="h-6 w-6 text-gray-400"></i>
        </div>
        <div class="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded py-2 px-3 z-50">${tooltipText}</div>
    </div>`;
}

function createChartCard(canvasId, title, subtitle) {
    return `<div class="bg-white p-6 rounded-lg shadow flex flex-col">
        <div>
            <h3 class="text-lg font-semibold">${title}</h3>
            <p class="text-sm text-gray-500 mb-4">${subtitle}</p>
        </div>
        <div class="relative h-64 md:h-72">
            <canvas id="${canvasId}"></canvas>
        </div>
    </div>`;
}

function createSidebar(title, content) {
    return `<div class="sticky top-28">
        <h3 class="text-lg font-semibold flex items-center space-x-2 mb-4">
            <i data-lucide="book-open" class="h-5 w-5 text-blue-600"></i><span>${title}</span>
        </h3>${content}</div>`;
}

function createEmptyState() {
     return `<div class="text-center py-16 bg-white rounded-lg shadow">
        <i data-lucide="filter-x" class="h-12 w-12 mx-auto text-gray-400"></i>
        <h3 class="mt-2 text-lg font-medium text-gray-900">Nenhum dado encontrado</h3>
        <p class="mt-1 text-sm text-gray-500">Tente ajustar os filtros para visualizar os dados.</p>
    </div>`;
}

function createWIPState(title, message) {
    return `<div class="text-center py-16 bg-white rounded-lg shadow">
        <i data-lucide="construction" class="h-12 w-12 mx-auto text-yellow-500"></i>
        <h3 class="mt-2 text-lg font-medium text-gray-900">${title} - Em Breve</h3>
        <p class="mt-1 text-sm text-gray-500">${message}</p>
    </div>`;
}

function createBHMap(data, isPrice = false) {
    const regionals = [
        { id: 'Barreiro', d: 'M153 303 L134 321 L126 314 L117 320 L108 310 L108 290 L125 282 L140 285 Z' },
        { id: 'Centro-Sul', d: 'M188 234 L175 248 L170 270 L178 285 L192 280 L205 260 Z' },
        { id: 'Leste', d: 'M205 260 L192 280 L210 295 L225 280 L228 255 Z' },
        { id: 'Nordeste', d: 'M228 255 L225 280 L245 270 L250 240 Z' },
        { id: 'Noroeste', d: 'M188 234 L160 210 L148 220 L155 245 L175 248 Z' },
        { id: 'Norte', d: 'M250 240 L245 270 L270 260 L280 220 L260 210 Z' },
        { id: 'Oeste', d: 'M155 245 L148 220 L120 235 L125 282 L140 285 L178 285 L170 270 L175 248 Z' },
        { id: 'Pampulha', d: 'M160 210 L188 234 L250 240 L260 210 L230 180 L180 190 Z' },
        { id: 'Venda Nova', d: 'M280 220 L270 260 L300 250 L310 200 L290 190 Z' }
    ];
    let values = Object.values(data).filter(v => typeof v === 'number');
    const min = Math.min(...values);
    const max = Math.max(...values);
    const getColor = (value) => {
        if (max === min || !value) return '#dbeafe'; // Cor base para valor único ou nulo
        const ratio = (value - min) / (max - min);
        // Interpolação de cor de Azul claro (baixo) para Vermelho (alto)
        const r = Math.round(96 + ratio * (239 - 96));
        const g = Math.round(165 - ratio * (165 - 68));
        const b = Math.round(250 - ratio * (250 - 68));
        return `rgb(${r}, ${g}, ${b})`;
    };
    return `<svg viewBox="100 180 220 150" class="w-full h-auto">
        ${regionals.map(r => {
            const value = data[r.id] || 0;
            const color = isPrice ? getColor(value) : '#cae2fc';
            const tooltipText = `${r.id}: ${isPrice ? formatCurrency(value) : value.toLocaleString('pt-BR') + ' registros'}`;
            return `<path d="${r.d}" fill="${color}" stroke="#fff" stroke-width="1" class="map-regional has-tooltip"><title>${tooltipText}</title></path>`;
        }).join('')}
    </svg>`;
}