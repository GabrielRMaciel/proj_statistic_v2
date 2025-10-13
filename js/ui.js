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

        const firstSemAvgs = [];
        const secondSemAvgs = [];
        semesters.forEach(sem => {
            const semData = groupedBySemester[sem];
            const avg = math.mean(semData.map(d => d.valorDeVenda));
            if (sem.includes('S1')) {
                firstSemAvgs.push(avg);
            } else {
                secondSemAvgs.push(avg);
            }
        });

        const seasonality = {
            firstSemAvg: firstSemAvgs.length > 0 ? math.mean(firstSemAvgs) : 0,
            secondSemAvg: secondSemAvgs.length > 0 ? math.mean(secondSemAvgs) : 0,
            hasSeason: false
        };

        if (firstSemAvgs.length > 0 && secondSemAvgs.length > 0) {
            const diff = Math.abs(seasonality.secondSemAvg - seasonality.firstSemAvg);
            const avgPrice = (seasonality.firstSemAvg + seasonality.secondSemAvg) / 2;
            seasonality.hasSeason = (diff / avgPrice) > 0.03;
        }

        const allPrices = semesters.map(sem => {
            const semData = groupedBySemester[sem];
            return math.mean(semData.map(d => d.valorDeVenda));
        });

        const n = allPrices.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        const sumX = _.sum(xValues);
        const sumY = _.sum(allPrices);
        const sumXY = _.sum(xValues.map((x, i) => x * allPrices[i]));
        const sumXX = _.sum(xValues.map(x => x * x));

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const projections = [];
        for (let i = 0; i < 3; i++) {
            projections.push(slope * (n + i) + intercept);
        }

        const firstPrice = allPrices[0];
        const lastPrice = allPrices[n - 1];
        const totalVariation = ((lastPrice - firstPrice) / firstPrice) * 100;

        const variations = [];
        for (let i = 1; i < allPrices.length; i++) {
            const variation = ((allPrices[i] - allPrices[i - 1]) / allPrices[i - 1]) * 100;
            variations.push(variation);
        }

        return {
            semesters,
            pricesByFuelOverTime,
            seasonality,
            trend: {
                slope,
                intercept,
                totalVariation,
                firstPrice,
                lastPrice
            },
            projections,
            variations,
            avgVariation: math.mean(variations.map(Math.abs))
        };
    });

    const trendInterpretation = stats.trend.totalVariation > 5
        ? `<span class="text-red-600">crescente</span> com aumento de <strong>${stats.trend.totalVariation.toFixed(1)}%</strong>`
        : stats.trend.totalVariation < -5
            ? `<span class="text-green-600">decrescente</span> com queda de <strong>${Math.abs(stats.trend.totalVariation).toFixed(1)}%</strong>`
            : `<span class="text-gray-600">estável</span> com variação de apenas <strong>${stats.trend.totalVariation.toFixed(1)}%</strong>`;

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                ${createChartCard('temporal-evolution', 'Evolução do Preço Médio por Semestre', 'Acompanhe a variação dos preços dos combustíveis ao longo do tempo.')}

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${createMetricCard('Primeiro Semestre', formatCurrency(stats.trend.firstPrice), 'Preço médio no início do período analisado.', 'calendar-days')}
                    ${createMetricCard('Último Semestre', formatCurrency(stats.trend.lastPrice), 'Preço médio no período mais recente.', 'calendar-check')}
                    ${createMetricCard('Variação Total', `${stats.trend.totalVariation.toFixed(1)}%`, 'Mudança percentual entre primeiro e último semestre.', 'trending-up')}
                </div>

                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Análise de Tendência</h3>
                    <p class="text-sm text-gray-700 mb-4">
                        Os dados mostram tendência ${trendInterpretation} ao longo dos ${stats.semesters.length} semestres analisados.
                        A variação média entre semestres consecutivos foi de <strong>${stats.avgVariation.toFixed(1)}%</strong>.
                    </p>
                    ${stats.projections.length > 0 ? `
                        <div class="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                            <h4 class="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                                <i data-lucide="crystal-ball" class="h-5 w-5"></i>
                                <span>Projeções para Próximos Semestres</span>
                            </h4>
                            <div class="grid grid-cols-3 gap-3 text-sm">
                                <div class="bg-white p-3 rounded">
                                    <p class="text-gray-600">+1 Semestre</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.projections[0])}</p>
                                </div>
                                <div class="bg-white p-3 rounded">
                                    <p class="text-gray-600">+2 Semestres</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.projections[1])}</p>
                                </div>
                                <div class="bg-white p-3 rounded">
                                    <p class="text-gray-600">+3 Semestres</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.projections[2])}</p>
                                </div>
                            </div>
                            <p class="text-xs text-blue-700 mt-3">
                                <i data-lucide="alert-triangle" class="h-3 w-3 inline"></i>
                                Projeções baseadas em tendência linear. Eventos imprevistos podem alterar significativamente os valores reais.
                            </p>
                        </div>
                    ` : ''}
                </div>

                ${stats.seasonality.hasSeason ? `
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-3">Análise de Sazonalidade</h3>
                        <p class="text-sm text-gray-700 mb-4">
                            Foi detectado padrão sazonal nos dados. Primeiros semestres (S1) tendem a ter preços diferentes dos segundos semestres (S2).
                        </p>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-blue-50 p-4 rounded">
                                <p class="text-sm text-gray-600">Média S1 (Jan-Jun)</p>
                                <p class="text-2xl font-bold text-gray-800">${formatCurrency(stats.seasonality.firstSemAvg)}</p>
                            </div>
                            <div class="bg-orange-50 p-4 rounded">
                                <p class="text-sm text-gray-600">Média S2 (Jul-Dez)</p>
                                <p class="text-2xl font-bold text-gray-800">${formatCurrency(stats.seasonality.secondSemAvg)}</p>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 mt-3">
                            Diferença: <strong>${formatCurrency(Math.abs(stats.seasonality.secondSemAvg - stats.seasonality.firstSemAvg))}</strong>
                            (${((Math.abs(stats.seasonality.secondSemAvg - stats.seasonality.firstSemAvg) / stats.seasonality.firstSemAvg) * 100).toFixed(1)}%)
                        </p>
                    </div>
                ` : ''}

                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Comparação Primeiro vs. Último Semestre</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span class="text-gray-700">Período Inicial (${stats.semesters[0]})</span>
                            <span class="font-bold text-gray-800">${formatCurrency(stats.trend.firstPrice)}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span class="text-gray-700">Período Final (${stats.semesters[stats.semesters.length - 1]})</span>
                            <span class="font-bold text-gray-800">${formatCurrency(stats.trend.lastPrice)}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 ${stats.trend.totalVariation > 0 ? 'bg-red-50' : 'bg-green-50'} rounded border ${stats.trend.totalVariation > 0 ? 'border-red-200' : 'border-green-200'}">
                            <span class="font-semibold ${stats.trend.totalVariation > 0 ? 'text-red-700' : 'text-green-700'}">
                                Variação Total
                            </span>
                            <span class="font-bold ${stats.trend.totalVariation > 0 ? 'text-red-800' : 'text-green-800'}">
                                ${stats.trend.totalVariation > 0 ? '+' : ''}${stats.trend.totalVariation.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p class="text-sm text-blue-900">
                            <strong>Impacto para o Consumidor:</strong> Um motorista que abastece 40 litros semanalmente
                            gasta aproximadamente <strong>R$ ${((stats.trend.lastPrice - stats.trend.firstPrice) * 40 * 4).toFixed(2)}</strong>
                            a mais por mês comparado ao início do período.
                        </p>
                    </div>
                </div>
            </div>

            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Análise de Séries Temporais',
                    `<h4 class="font-semibold text-gray-700 mb-2">Componentes da Série</h4>
                     <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li><strong>Tendência:</strong> Movimento de longo prazo (aumento/queda).</li>
                        <li><strong>Sazonalidade:</strong> Padrões que se repetem regularmente.</li>
                        <li><strong>Ruído:</strong> Variações aleatórias.</li>
                     </ul>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Regressão Linear</h4>
                     <p class="text-sm text-gray-600 mb-2">Técnica estatística que ajusta uma linha reta aos dados para identificar tendência. A equação da reta é:</p>
                     <p class="text-sm bg-gray-100 p-2 rounded font-mono">y = ${stats.trend.slope.toFixed(4)}x + ${stats.trend.intercept.toFixed(2)}</p>
                     <p class="text-sm text-gray-600 mt-2">Onde x é o número do semestre e y é o preço projetado.</p>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Limitações</h4>
                     <p class="text-sm text-gray-600">Projeções são baseadas no passado e não preveem eventos inesperados (crises, mudanças de impostos, pandemia).</p>`
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

export function renderChapterCorrelation(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    const stats = getCachedStats('correlation', () => {
        const prices = filteredData.map(d => d.valorDeVenda);
        const dates = filteredData.map(d => d.dataDaColeta ? d.dataDaColeta.getTime() / (1000 * 60 * 60 * 24 * 30) : 0);

        const priceTimeCor = calculateCorrelation(prices, dates);

        const fuelPrices = _.groupBy(filteredData, 'produto');
        const gasolinaComum = fuelPrices['GASOLINA'] || [];
        const etanol = fuelPrices['ETANOL'] || [];

        let etanolGasolinaParity = null;
        if (gasolinaComum.length > 0 && etanol.length > 0) {
            const avgGasolina = math.mean(gasolinaComum.map(d => d.valorDeVenda));
            const avgEtanol = math.mean(etanol.map(d => d.valorDeVenda));
            etanolGasolinaParity = (avgEtanol / avgGasolina) * 100;
        }

        return {
            priceTimeCor,
            etanolGasolinaParity,
            gasolinaAvg: gasolinaComum.length > 0 ? math.mean(gasolinaComum.map(d => d.valorDeVenda)) : null,
            etanolAvg: etanol.length > 0 ? math.mean(etanol.map(d => d.valorDeVenda)) : null
        };
    });

    const interpretCorrelation = (cor) => {
        const abs = Math.abs(cor);
        if (abs >= 0.8) return 'muito forte';
        if (abs >= 0.6) return 'forte';
        if (abs >= 0.4) return 'moderada';
        if (abs >= 0.2) return 'fraca';
        return 'muito fraca ou inexistente';
    };

    const parityInterpretation = stats.etanolGasolinaParity
        ? stats.etanolGasolinaParity <= 70
            ? 'O etanol está <strong>vantajoso</strong> economicamente. Motoristas com carros flex devem optar pelo etanol.'
            : 'A gasolina está <strong>mais vantajosa</strong> economicamente neste momento.'
        : 'Dados insuficientes para calcular paridade.';

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-xl font-semibold mb-4">Principais Correlações Identificadas</h3>
                    <div class="space-y-4">
                        <div class="border-l-4 border-blue-500 pl-4">
                            <h4 class="font-semibold text-gray-800">Preço vs. Tempo</h4>
                            <p class="text-sm text-gray-600 mt-1">
                                Coeficiente de correlação: <strong>${stats.priceTimeCor.toFixed(3)}</strong>
                                <span class="ml-2 text-gray-500">(Correlação ${interpretCorrelation(stats.priceTimeCor)})</span>
                            </p>
                            <p class="text-sm text-gray-700 mt-2">
                                ${stats.priceTimeCor > 0.3
                                    ? 'Há uma <strong>tendência de aumento</strong> nos preços ao longo do tempo em Belo Horizonte. Cada semestre que passa está associado a preços médios mais elevados.'
                                    : stats.priceTimeCor < -0.3
                                        ? 'Os preços apresentam <strong>tendência de queda</strong> ao longo do tempo.'
                                        : 'Não há tendência temporal clara nos preços. Os valores flutuam sem padrão consistente de alta ou baixa.'}
                            </p>
                        </div>

                        ${stats.etanolGasolinaParity ? `
                        <div class="border-l-4 border-green-500 pl-4">
                            <h4 class="font-semibold text-gray-800">Paridade Etanol-Gasolina</h4>
                            <p class="text-sm text-gray-600 mt-1">
                                Relação atual: <strong>${stats.etanolGasolinaParity.toFixed(1)}%</strong>
                                <span class="ml-2 px-2 py-1 rounded text-xs font-medium ${stats.etanolGasolinaParity <= 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                    ${stats.etanolGasolinaParity <= 70 ? 'Etanol Vantajoso' : 'Gasolina Vantajosa'}
                                </span>
                            </p>
                            <p class="text-sm text-gray-700 mt-2">
                                ${parityInterpretation}
                            </p>
                            <div class="mt-3 grid grid-cols-2 gap-4 text-sm">
                                <div class="bg-gray-50 p-3 rounded">
                                    <p class="text-gray-600">Gasolina Comum</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.gasolinaAvg)}</p>
                                </div>
                                <div class="bg-gray-50 p-3 rounded">
                                    <p class="text-gray-600">Etanol</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.etanolAvg)}</p>
                                </div>
                            </div>
                        </div>` : ''}
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <div class="flex items-start space-x-3">
                        <i data-lucide="info" class="h-5 w-5 text-blue-600 mt-0.5"></i>
                        <div>
                            <h4 class="font-semibold text-blue-900">Importante: Correlação ≠ Causalidade</h4>
                            <p class="text-sm text-blue-800 mt-2">
                                Correlação mede apenas se duas variáveis se movem juntas. <strong>Não prova</strong> que uma causa a outra.
                                Fatores externos podem influenciar ambas as variáveis simultaneamente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Entendendo Correlações',
                    `<h4 class="font-semibold text-gray-700 mb-2">O que é Correlação?</h4>
                     <p class="text-sm text-gray-600 mb-4">A correlação de Pearson mede a <strong>força e direção</strong> da relação linear entre duas variáveis. Varia de -1 a +1:</p>
                     <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li><strong>+1:</strong> Correlação positiva perfeita</li>
                        <li><strong>0:</strong> Sem correlação linear</li>
                        <li><strong>-1:</strong> Correlação negativa perfeita</li>
                     </ul>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Regra dos 70%</h4>
                     <p class="text-sm text-gray-600">Para carros flex, o etanol é vantajoso quando seu preço é até <strong>70% do preço da gasolina</strong>, devido à diferença de rendimento energético entre os combustíveis.</p>`
                )}
            </div>
        </div>`;
}

export function renderChapterInsights(contentEl, allData, filteredData, getCachedStats, detectOutliers) {
    if (allData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    const { insights, summary } = getCachedStats('insights', () => generateInsights(allData, filteredData, detectOutliers));

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-lg shadow-lg">
                    <div class="flex items-center space-x-3 mb-4">
                        <i data-lucide="lightbulb" class="h-8 w-8 text-blue-600"></i>
                        <h2 class="text-2xl font-bold text-gray-800">Principais Descobertas</h2>
                    </div>
                    <p class="text-gray-700">
                        Esta seção sintetiza os insights mais importantes da análise completa dos dados
                        de combustíveis em Belo Horizonte entre 2022 e 2025.
                    </p>
                </div>

                <div class="space-y-6">
                    ${insights.map((insight, index) => `
                        <div class="bg-white p-6 rounded-lg shadow-md border-l-4 ${getBorderColor(insight.type)}">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                                            ${index + 1}
                                        </span>
                                        <h3 class="text-lg font-semibold text-gray-800">${insight.title}</h3>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-3 font-medium">${insight.summary}</p>
                                    <div class="text-sm text-gray-700 space-y-2">
                                        ${insight.details}
                                    </div>
                                    ${insight.impact ? `
                                        <div class="mt-4 p-3 bg-gray-50 rounded">
                                            <p class="text-xs font-semibold text-gray-600 mb-1">IMPACTO ESTIMADO:</p>
                                            <p class="text-sm text-gray-700">${insight.impact}</p>
                                        </div>
                                    ` : ''}
                                </div>
                                <i data-lucide="${getInsightIcon(insight.type)}" class="h-6 w-6 text-gray-400 ml-4"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-xl font-semibold mb-4">Resumo Estatístico Consolidado</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        ${createSummaryCard('Total de Registros', summary.totalRecords.toLocaleString('pt-BR'))}
                        ${createSummaryCard('Período', summary.period)}
                        ${createSummaryCard('Preço Médio Geral', formatCurrency(summary.avgPrice))}
                        ${createSummaryCard('Variação Total', `${summary.totalVariation.toFixed(1)}%`)}
                        ${createSummaryCard('Regionais Analisadas', summary.regionalsCount)}
                        ${createSummaryCard('Tipos de Combustível', summary.fuelTypes)}
                    </div>
                </div>

                <div class="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                    <h4 class="font-semibold text-yellow-900 mb-3 flex items-center space-x-2">
                        <i data-lucide="alert-circle" class="h-5 w-5"></i>
                        <span>Limitações e Considerações</span>
                    </h4>
                    <ul class="text-sm text-yellow-800 space-y-2 list-disc list-inside">
                        <li>Os dados representam uma <strong>amostra</strong>, não a população completa de postos de BH.</li>
                        <li>Análises são <strong>descritivas e correlacionais</strong>, não estabelecem causalidade definitiva.</li>
                        <li>Projeções futuras assumem continuidade de padrões históricos.</li>
                        <li>Variáveis importantes como qualidade ou serviços adicionais não estão disponíveis.</li>
                    </ul>
                </div>
            </div>

            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'De Dados a Decisões',
                    `<h4 class="font-semibold text-gray-700 mb-2">Para Consumidores</h4>
                     <p class="text-sm text-gray-600 mb-4">Use os insights para escolher <strong>onde e quando abastecer</strong>, considerando regionais com preços mais baixos e a paridade etanol-gasolina.</p>

                     <h4 class="font-semibold text-gray-700 mb-2">Para Gestores Públicos</h4>
                     <p class="text-sm text-gray-600 mb-4">Identifique <strong>disparidades regionais</strong> que merecem atenção e monitore tendências para planejamento.</p>

                     <h4 class="font-semibold text-gray-700 mb-2">Próximos Passos</h4>
                     <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Modelagem preditiva avançada</li>
                        <li>Análise de clustering de postos</li>
                        <li>Integração com dados socioeconômicos</li>
                        <li>Estudos qualitativos complementares</li>
                     </ul>`
                )}
            </div>
        </div>`;
}

export function renderChapterWIP(contentEl, title, message) {
    contentEl.innerHTML = createWIPState(title, message);
}

function calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length === 0) return 0;

    const mean1 = _.mean(arr1);
    const mean2 = _.mean(arr2);

    let numerator = 0;
    let sum1 = 0;
    let sum2 = 0;

    for (let i = 0; i < arr1.length; i++) {
        const diff1 = arr1[i] - mean1;
        const diff2 = arr2[i] - mean2;
        numerator += diff1 * diff2;
        sum1 += diff1 * diff1;
        sum2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1 * sum2);
    return denominator === 0 ? 0 : numerator / denominator;
}

function generateInsights(allData, filteredData, detectOutliers) {
    const insights = [];
    const prices = allData.map(d => d.valorDeVenda);
    const semesters = _.uniq(allData.map(d => d.semestre)).sort();

    const firstSemester = semesters[0];
    const lastSemester = semesters[semesters.length - 1];

    const firstSemesterData = allData.filter(d => d.semestre === firstSemester);
    const lastSemesterData = allData.filter(d => d.semestre === lastSemester);

    const firstAvg = math.mean(firstSemesterData.map(d => d.valorDeVenda));
    const lastAvg = math.mean(lastSemesterData.map(d => d.valorDeVenda));
    const totalVariation = ((lastAvg - firstAvg) / firstAvg) * 100;

    insights.push({
        type: 'trend',
        title: 'Evolução Temporal dos Preços',
        summary: `Os preços aumentaram ${totalVariation.toFixed(1)}% entre ${firstSemester} e ${lastSemester}.`,
        details: `<p>No primeiro semestre analisado (${firstSemester}), o preço médio era de <strong>${formatCurrency(firstAvg)}</strong>.
                  Já no último período (${lastSemester}), o preço médio alcançou <strong>${formatCurrency(lastAvg)}</strong>,
                  representando um aumento de <strong>${formatCurrency(lastAvg - firstAvg)}</strong>.</p>`,
        impact: `Um motorista que abastece 40 litros por semana gasta aproximadamente R$ ${((lastAvg - firstAvg) * 40 * 4).toFixed(2)} a mais por mês comparado ao início do período.`
    });

    const regionalStats = _.mapValues(_.groupBy(allData.filter(d => d.regional !== 'Não Identificada'), 'regional'), data => {
        const regionalPrices = data.map(d => d.valorDeVenda);
        return { mean: math.mean(regionalPrices), count: data.length };
    });

    const sortedRegionals = _.orderBy(Object.entries(regionalStats), ([,s]) => s.mean, 'asc');
    if (sortedRegionals.length >= 2) {
        const cheapest = sortedRegionals[0];
        const expensive = sortedRegionals[sortedRegionals.length - 1];
        const spread = ((expensive[1].mean - cheapest[1].mean) / cheapest[1].mean) * 100;

        insights.push({
            type: 'regional',
            title: 'Disparidades Regionais Significativas',
            summary: `Diferença de ${spread.toFixed(1)}% entre a regional mais cara e a mais barata.`,
            details: `<p>A regional <strong>${cheapest[0]}</strong> apresenta o menor preço médio (${formatCurrency(cheapest[1].mean)}),
                      enquanto <strong>${expensive[0]}</strong> tem o maior (${formatCurrency(expensive[1].mean)}).</p>
                      <p class="mt-2">Essa diferença de <strong>${formatCurrency(expensive[1].mean - cheapest[1].mean)}</strong> por litro
                      pode representar economia significativa para quem consegue abastecer em áreas mais baratas.</p>`,
            impact: `Abastecer sempre na regional mais barata pode gerar economia de até R$ ${((expensive[1].mean - cheapest[1].mean) * 40 * 4).toFixed(2)}/mês.`
        });
    }

    const std = math.std(prices, 'unbiased');
    const mean = math.mean(prices);
    const cv = (std / mean) * 100;

    insights.push({
        type: 'variability',
        title: 'Variabilidade de Preços no Mercado',
        summary: `Coeficiente de variação de ${cv.toFixed(1)}% indica ${cv > 15 ? 'alta' : cv > 8 ? 'moderada' : 'baixa'} dispersão.`,
        details: `<p>O desvio padrão de <strong>${formatCurrency(std)}</strong> mostra que os preços ${cv > 15 ? 'variam consideravelmente' : 'são relativamente consistentes'}
                  em Belo Horizonte.</p>
                  <p class="mt-2">${cv > 15 ? '<strong>Vale a pena</strong> pesquisar preços entre diferentes postos, pois a variação é significativa.' :
                  'O mercado é relativamente homogêneo, com pequena variação entre postos.'}</p>`,
        impact: null
    });

    const gasolina = allData.filter(d => d.produto === 'GASOLINA');
    const etanol = allData.filter(d => d.produto === 'ETANOL');

    if (gasolina.length > 0 && etanol.length > 0) {
        const avgGasolina = math.mean(gasolina.map(d => d.valorDeVenda));
        const avgEtanol = math.mean(etanol.map(d => d.valorDeVenda));
        const parity = (avgEtanol / avgGasolina) * 100;

        insights.push({
            type: 'parity',
            title: 'Paridade Etanol-Gasolina',
            summary: `Relação média de ${parity.toFixed(1)}% torna o ${parity <= 70 ? 'etanol mais vantajoso' : 'uso de gasolina mais econômico'}.`,
            details: `<p>Considerando a regra dos 70%, motoristas com veículos flex devem optar pelo <strong>${parity <= 70 ? 'etanol' : 'gasolina'}</strong>.</p>
                      <p class="mt-2">Preço médio da gasolina: <strong>${formatCurrency(avgGasolina)}</strong><br>
                      Preço médio do etanol: <strong>${formatCurrency(avgEtanol)}</strong></p>`,
            impact: parity <= 70 ? `Usar etanol ao invés de gasolina pode gerar economia mensal estimada de R$ ${((avgGasolina - avgEtanol) * 160 * 0.7).toFixed(2)}.` : null
        });
    }

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const q1 = math.quantileSeq(sortedPrices, 0.25, false);
    const q3 = math.quantileSeq(sortedPrices, 0.75, false);
    const iqr = q3 - q1;
    const outliers = detectOutliers(prices, q1, q3, iqr);
    const outlierPercent = (outliers.length / prices.length) * 100;

    if (outlierPercent > 2) {
        insights.push({
            type: 'outliers',
            title: 'Presença de Valores Atípicos',
            summary: `${outliers.length} outliers detectados (${outlierPercent.toFixed(1)}% dos dados).`,
            details: `<p>Valores atípicos podem indicar postos premium com serviços diferenciados, promoções temporárias,
                      ou possíveis erros de coleta.</p>
                      <p class="mt-2">Esses outliers afetam a média geral, tornando a <strong>mediana</strong> uma medida mais confiável do preço típico.</p>`,
            impact: null
        });
    }

    return {
        insights,
        summary: {
            totalRecords: allData.length,
            period: `${firstSemester} a ${lastSemester}`,
            avgPrice: mean,
            totalVariation,
            regionalsCount: Object.keys(regionalStats).length,
            fuelTypes: _.uniq(allData.map(d => d.produto)).length
        }
    };
}

function getBorderColor(type) {
    const colors = {
        trend: 'border-blue-500',
        regional: 'border-green-500',
        variability: 'border-yellow-500',
        parity: 'border-purple-500',
        outliers: 'border-red-500'
    };
    return colors[type] || 'border-gray-500';
}

function getInsightIcon(type) {
    const icons = {
        trend: 'trending-up',
        regional: 'map-pin',
        variability: 'bar-chart',
        parity: 'git-compare',
        outliers: 'alert-triangle'
    };
    return icons[type] || 'info';
}

function createSummaryCard(label, value) {
    return `<div class="bg-gray-50 p-3 rounded">
        <p class="text-gray-600 text-xs">${label}</p>
        <p class="text-lg font-bold text-gray-800">${value}</p>
    </div>`;
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
    glossaryEl.innerHTML = terms.map(t => `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 class="font-bold text-gray-800 mb-1">${t.term}</h4>
            ${t.formula ? `<p class="text-xs font-mono bg-gray-100 px-2 py-1 rounded mb-2 text-gray-700">${t.formula}</p>` : ''}
            <p class="text-sm text-gray-600 mb-2">${t.def}</p>
            ${t.example ? `<p class="text-xs text-gray-500 italic">💡 ${t.example}</p>` : ''}
        </div>`).join('');
}

function createMetricCard(title, value, tooltipText, iconName) {
    return `<div class="bg-white p-4 rounded-lg shadow has-tooltip relative metric-card">
        <div class="flex items-start justify-between">
            <div><p class="text-sm text-gray-500">${title}</p><p class="text-2xl font-bold text-gray-800">${value}</p></div>
            <div class="bg-blue-100 p-2 rounded-full">
                <i data-lucide="${iconName}" class="h-6 w-6 text-blue-600"></i>
            </div>
        </div>
        <div class="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded py-2 px-3 z-50">${tooltipText}</div>
    </div>`;
}

function createChartCard(canvasId, title, subtitle) {
    return `<div class="bg-white p-6 rounded-lg shadow flex flex-col chart-card">
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

