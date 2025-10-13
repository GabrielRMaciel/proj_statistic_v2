// js/utils.js

export const BAIRRO_REGIONAL_MAP = {
    'ALTO BARROCA': 'Oeste', 'ALTO DOS PINHEIROS': 'Noroeste', 'ANCHIETA': 'Centro-Sul', 'ANDYARA': 'Venda Nova',
    'BARREIRO': 'Barreiro', 'BARRO PRETO': 'Centro-Sul', 'BARROCA': 'Oeste', 'BELVEDERE': 'Centro-Sul',
    'BETANIA': 'Oeste', 'BOA VIAGEM': 'Centro-Sul', 'BOA VISTA': 'Leste', 'BONFIM': 'Noroeste',
    'BRASIL INDUSTRIAL': 'Barreiro', 'BURITIS': 'Oeste', 'CACHOEIRinha': 'Noroeste', 'CAICARA': 'Noroeste',
    'CALAFATE': 'Oeste', 'CARLOS PRATES': 'Noroeste', 'CASTELO': 'Pampulha', 'CENTRO': 'Centro-Sul',
    'CIDADE JARDIM': 'Centro-Sul', 'CIDADE NOVA': 'Nordeste', 'CINQUENTENARIO': 'Oeste', 'COLEGIO BATISTA': 'Leste',
    'CONCORDIA': 'Nordeste', 'CONJUNTO CALIFÓRNIA': 'Noroeste', 'CORACAO DE JESUS': 'Centro-Sul',
    'CORACAO EUCARISTICO': 'Noroeste', 'CRUZEIRO': 'Centro-Sul', 'DIAMANTE': 'Barreiro', 'DOM BOSCO': 'Noroeste',
    'DOM CABRAL': 'Noroeste', 'DONA CLARA': 'Pampulha', 'ENGENHO NOGUEIRA': 'Pampulha', 'ESTORIL': 'Oeste',
    'FLORESTA': 'Leste', 'FLORAMAR': 'Norte', 'FUNCIONARIOS': 'Centro-Sul', 'GAMELEIRA': 'Oeste',
    'GLORIA': 'Noroeste', 'GRAJAU': 'Oeste', 'GUARANI': 'Norte', 'GUTIERREZ': 'Oeste',
    'HAVAI': 'Oeste', 'HORTA': 'Leste', 'HORTA FLORESTAL': 'Leste', 'INCONFIDENCIA': 'Noroeste',
    'IPIRANGA': 'Nordeste', 'ITAPOA': 'Pampulha', 'JARAGUA': 'Pampulha', 'JARDIM AMERICA': 'Oeste',
    'JARDIM MONTANHES': 'Noroeste', 'LAGOA': 'Venda Nova', 'LAGOA DA PAMPULHA': 'Pampulha',
    'LAGOA SANTA': 'Venda Nova', 'LOURDES': 'Centro-Sul', 'LUXEMBURGO': 'Centro-Sul', 'MADRE GERTRUDES': 'Oeste',
    'MANGABEIRAS': 'Centro-Sul', 'MINAS BRASIL': 'Noroeste', 'MINASLANDIA': 'Norte', 'MONSENHOR MESSIAS': 'Noroeste',
    'NOVA BARROCA': 'Oeste', 'NOVA CINTRA': 'Oeste', 'NOVA FLORESTA': 'Nordeste', 'NOVA GRANADA': 'Oeste',
    'NOVA SUICA': 'Oeste', 'NOVO AARAO REIS': 'Norte', 'NOVO GLORIA': 'Noroeste', 'OURO PRETO': 'Pampulha',
    'PADRE EUSTAQUIO': 'Noroeste', 'PALMARES': 'Nordeste', 'PAMPULHA': 'Pampulha', 'PARAISO': 'Leste',
    'PARQUE DAS MANGABEIRAS': 'Centro-Sul', 'PLANALTO': 'Norte', 'POMPEIA': 'Leste', 'PRADO': 'Oeste',
    'PROVIDENCIA': 'Norte', 'RENASCENCA': 'Nordeste', 'RIACHO DAS PEDRAS': 'Barreiro', 'SAGRADA FAMILIA': 'Leste',
    'SALGADO FILHO': 'Oeste', 'SANTA AMELIA': 'Pampulha', 'SANTA BRANCA': 'Pampulha', 'SANTA CRUZ': 'Nordeste',
    'SANTA EFIGENIA': 'Leste', 'SANTA INES': 'Leste', 'SANTA LUCIA': 'Centro-Sul',
    'SANTA MONICA': 'Venda Nova', 'SANTA TEREZA': 'Leste', 'SANTA TEREZINHA': 'Pampulha', 'SANTO AGOSTINHO': 'Centro-Sul',
    'SANTO ANDRE': 'Noroeste', 'SANTO ANTONIO': 'Centro-Sul', 'SAO BENTO': 'Centro-Sul', 'SAO BERNARDO': 'Norte',
    'SAO CRISTOVAO': 'Nordeste', 'SAO FRANCISCO': 'Pampulha', 'SAO GABRIEL': 'Norte', 'SAO GERALDO': 'Leste',
    'SAO JOAO BATISTA': 'Venda Nova', 'SAO LUCAS': 'Centro-Sul', 'SAO LUIZ': 'Pampulha', 'SAO PEDRO': 'Centro-Sul',
    'SAVASSI': 'Centro-Sul', 'SERRA': 'Centro-Sul', 'SERRANO': 'Pampulha', 'SILVEIRA': 'Nordeste',
    'SION': 'Centro-Sul', 'UNIAO': 'Nordeste', 'UNIVERSITARIO': 'Pampulha', 'VENDA NOVA': 'Venda Nova',
    'VILA CLORIS': 'Norte', 'VILA DA SERRA': 'Centro-Sul', 'VILA PARIS': 'Centro-Sul',
    'VILA TIRADENTES': 'Oeste'
};

export const FUEL_COLORS = {
    'GASOLINA': 'var(--chart-color-1)',
    'GASOLINA ADITIVADA': 'var(--chart-color-2)',
    'ETANOL': 'var(--chart-color-3)',
    'DIESEL S10': 'var(--chart-color-4)',
    'DIESEL S500': 'var(--chart-color-5)',
    'GNV': 'var(--chart-color-6)',
    'default': '#6b7280'
};

export function parseDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('/');
    // new Date(year, monthIndex, day)
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

export function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ===== FUNÇÃO MOVIDA PARA CÁ =====
export function detectOutliers(data, q1, q3, iqr) {
    if (typeof q1 !== 'number' || typeof q3 !== 'number' || typeof iqr !== 'number') return [];
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return data.filter(d => d < lowerBound || d > upperBound);
};

// ===== FUNÇÃO MOVIDA PARA CÁ =====
export function calculateCorrelation(arr1, arr2) {
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
