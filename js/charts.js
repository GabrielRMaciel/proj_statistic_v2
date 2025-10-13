// js/charts.js
import { FUEL_COLORS, formatCurrency } from './utils.js';

if (window.ChartBoxPlot) {
    Chart.register(ChartBoxPlot.BoxPlotController, ChartBoxPlot.BoxAndWiskers);
}

export const charts = {};

export function destroyAllCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
}

export function createBarChart(canvasId, labels, data, options = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Nº de Registros', data,
                backgroundColor: 'var(--chart-color-1)',
                borderColor: 'var(--chart-color-1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: options.indexAxis === 'y' } },
                y: { grid: { display: options.indexAxis !== 'y' } }
            },
            ...options
        }
    });
}

export function createDoughnutChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data, backgroundColor: labels.map(l => FUEL_COLORS[l] || FUEL_COLORS.default) }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

export function createLineChart(canvasId, labels, dataSets) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: Object.entries(dataSets).map(([fuel, data]) => ({
                label: fuel, data,
                borderColor: FUEL_COLORS[fuel] || FUEL_COLORS.default,
                backgroundColor: (FUEL_COLORS[fuel] || FUEL_COLORS.default) + '33',
                fill: false, tension: 0.1
            }))
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

export function createHistogram(canvasId, data, mean, median) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const binnedData = _.countBy(data, d => Math.floor(d * 10) / 10);
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(binnedData),
            datasets: [{ label: 'Frequência', data: Object.values(binnedData), backgroundColor: 'var(--chart-color-1)' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations: {
                        meanLine: { type: 'line', value: mean, borderColor: 'var(--chart-color-3)', borderWidth: 2, label: { content: `Média: ${formatCurrency(mean)}`, enabled: true, position: 'start' } },
                        medianLine: { type: 'line', value: median, borderColor: 'var(--chart-color-2)', borderWidth: 2, label: { content: `Mediana: ${formatCurrency(median)}`, enabled: true, position: 'end' } }
                    }
                }
            },
            scales: { x: { type: 'linear', title: { display: true, text: 'Preço (R$)' } }, y: { title: { display: true, text: 'Frequência' } } }
        }
    });
}

export function createBoxPlot(canvasId, data, label) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    let labels, datasets;
    if (label === 'regional') {
        labels = Object.keys(data);
        datasets = [{
            label: 'Distribuição', data: labels.map(key => data[key].prices),
            backgroundColor: '#3b82f633', borderColor: '#3b82f6', borderWidth: 1
        }];
    } else {
        labels = [label];
        datasets = [{
            label, data: [data],
            backgroundColor: '#3b82f633', borderColor: '#3b82f6', borderWidth: 1
        }];
    }
    charts[canvasId] = new Chart(ctx, {
        type: 'boxplot',
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}
