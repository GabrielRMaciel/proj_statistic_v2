// js/data.js
import { BAIRRO_REGIONAL_MAP, parseDate } from './utils.js';

function parseCsv(filePath) {
    return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
            download: true,
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn(`Encontrados erros de formatação em ${filePath}:`, results.errors);
                }
                resolve(results.data);
            },
            error: (error) => {
                console.error(`Falha ao baixar ou parsear o arquivo ${filePath}:`, error);
                reject(error);
            },
        });
    });
}

function processAndConsolidateData(results, files) {
    let consolidatedData = [];
    results.forEach((data, index) => {
        if (!data || !Array.isArray(data)) {
            console.warn(`Nenhum dado válido retornado para o arquivo: ${files[index]}`);
            return;
        }
        const fileName = files[index];
        const semester = fileName.match(/(\d{4}_s\d)/)[1].replace('_s', '/S');
        
        const cleanedData = data
            .filter(row => row && row.Municipio === 'BELO HORIZONTE' && row['Valor de Venda'])
            .map(row => {
                try {
                    const bairro = row.Bairro ? row.Bairro.trim().toUpperCase() : 'N/A';
                    const regional = BAIRRO_REGIONAL_MAP[bairro] || 'Não Identificada';

                    let cleanedRow = {};
                    for (const key in row) {
                       const newKey = _.camelCase(key.replace(/ - /g, ' '));
                       cleanedRow[newKey] = row[key];
                    }
                    
                    const valorVendaStr = cleanedRow.valorDeVenda;
                    if (typeof valorVendaStr !== 'string' || valorVendaStr.trim() === '') {
                        return null; 
                    }
                    
                    const valorVendaNum = parseFloat(valorVendaStr.replace(',', '.'));
                    if (isNaN(valorVendaNum)) {
                        return null;
                    }

                    const finalRow = {
                        ...cleanedRow,
                        valorDeVenda: valorVendaNum,
                        semestre: semester,
                        dataDaColeta: parseDate(cleanedRow.dataDaColeta),
                        regional: regional,
                        bairro: bairro,
                    };
                    return finalRow;

                } catch (e) {
                    console.warn('Erro catastrófico ao processar linha, pulando:', row, e);
                    return null;
                }
            }).filter(Boolean);
        
        consolidatedData = consolidatedData.concat(cleanedData);
    });
    return consolidatedData;
}

export async function loadAllData() {
    const files = [
        'data/combustiveis_2022_s1 - Página1.csv', 'data/combustiveis_2022_s2 - Página1.csv',
        'data/combustiveis_2023_s1 - Página1.csv', 'data/combustiveis_2023_s2 - Página1.csv',
        'data/combustiveis_2024_s1 - Página1.csv', 'data/combustiveis_2024_s2 - Página1.csv',
        'data/combustiveis_2025_s1 - Página1.csv'
    ];
    
    document.getElementById('loader-message').textContent = 'Iniciando carregamento dos dados...';
    
    const dataPromises = files.map(file => {
        document.getElementById('loader-message').textContent = `Carregando ${file}...`;
        return parseCsv(file);
    });
    
    const results = await Promise.all(dataPromises);
    
    document.getElementById('loader-message').textContent = 'Consolidando e limpando dados...';
    return processAndConsolidateData(results, files);
}
