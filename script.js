// Default exchange rates (base: USD)
let exchangeRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    AUD: 1.52,
    CAD: 1.36,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.12
};

let currentMode = 'manual';

// DOM Elements
const manualModeBtn = document.getElementById('manualMode');
const sheetsModeBtn = document.getElementById('sheetsMode');
const sheetsConfig = document.getElementById('sheetsConfig');
const sheetsUrlInput = document.getElementById('sheetsUrl');
const loadSheetsBtn = document.getElementById('loadSheets');
const amountInput = document.getElementById('amount');
const resultInput = document.getElementById('result');
const fromCurrencySelect = document.getElementById('fromCurrency');
const toCurrencySelect = document.getElementById('toCurrency');
const swapBtn = document.getElementById('swap');
const ratesList = document.getElementById('ratesList');
const rateModeSpan = document.getElementById('rateMode');

// Initialize
function init() {
    populateCurrencySelects();
    renderRates();
    loadFromLocalStorage();
    
    amountInput.addEventListener('input', convert);
    fromCurrencySelect.addEventListener('change', convert);
    toCurrencySelect.addEventListener('change', convert);
    swapBtn.addEventListener('click', swapCurrencies);
    manualModeBtn.addEventListener('click', () => switchMode('manual'));
    sheetsModeBtn.addEventListener('click', () => switchMode('sheets'));
    loadSheetsBtn.addEventListener('click', loadFromGoogleSheets);
    
    convert();
}

function populateCurrencySelects() {
    const currencies = Object.keys(exchangeRates).sort();
    
    fromCurrencySelect.innerHTML = '';
    toCurrencySelect.innerHTML = '';
    
    currencies.forEach(currency => {
        fromCurrencySelect.add(new Option(currency, currency));
        toCurrencySelect.add(new Option(currency, currency));
    });
    
    fromCurrencySelect.value = 'USD';
    toCurrencySelect.value = 'EUR';
}

function convert() {
    const amount = parseFloat(amountInput.value) || 0;
    const from = fromCurrencySelect.value;
    const to = toCurrencySelect.value;
    
    // Convert to USD first, then to target currency
    const amountInUSD = amount / exchangeRates[from];
    const result = amountInUSD * exchangeRates[to];
    
    resultInput.value = result.toFixed(2);
}

function swapCurrencies() {
    const temp = fromCurrencySelect.value;
    fromCurrencySelect.value = toCurrencySelect.value;
    toCurrencySelect.value = temp;
    convert();
}

function switchMode(mode) {
    currentMode = mode;
    
    if (mode === 'manual') {
        manualModeBtn.classList.add('active');
        sheetsModeBtn.classList.remove('active');
        sheetsConfig.classList.add('hidden');
        rateModeSpan.textContent = '(Manual)';
    } else {
        manualModeBtn.classList.remove('active');
        sheetsModeBtn.classList.add('active');
        sheetsConfig.classList.remove('hidden');
        rateModeSpan.textContent = '(Google Sheets)';
    }
}

function renderRates() {
    ratesList.innerHTML = '';
    
    Object.keys(exchangeRates).sort().forEach(currency => {
        const rateItem = document.createElement('div');
        rateItem.className = 'rate-item';
        
        rateItem.innerHTML = `
            <label>${currency}</label>
            <input type="number" 
                   value="${exchangeRates[currency]}" 
                   step="0.0001" 
                   data-currency="${currency}"
                   ${currentMode === 'sheets' ? 'readonly' : ''}>
            <button onclick="updateRate('${currency}')">Update</button>
        `;
        
        ratesList.appendChild(rateItem);
    });
}

function updateRate(currency) {
    const input = document.querySelector(`input[data-currency="${currency}"]`);
    const newRate = parseFloat(input.value);
    
    if (newRate > 0) {
        exchangeRates[currency] = newRate;
        saveToLocalStorage();
        convert();
    }
}

async function loadFromGoogleSheets() {
    const url = sheetsUrlInput.value.trim();
    
    if (!url) {
        alert('Please enter a Google Sheets URL');
        return;
    }
    
    // Convert Google Sheets URL to CSV export URL
    let csvUrl = url;
    if (url.includes('/edit')) {
        csvUrl = url.replace('/edit#gid=', '/export?format=csv&gid=');
        csvUrl = csvUrl.replace('/edit?usp=sharing', '/export?format=csv');
        csvUrl = csvUrl.replace('/edit', '/export?format=csv');
    }
    
    try {
        const response = await fetch(csvUrl);
        const text = await response.text();
        
        const lines = text.split('\n');
        const newRates = {};
        
        lines.forEach((line, index) => {
            if (index === 0 || !line.trim()) return; // Skip header
            
            const [currency, rate] = line.split(',').map(s => s.trim());
            if (currency && rate && !isNaN(rate)) {
                newRates[currency] = parseFloat(rate);
            }
        });
        
        if (Object.keys(newRates).length > 0) {
            exchangeRates = newRates;
            populateCurrencySelects();
            renderRates();
            convert();
            saveToLocalStorage();
            alert('Rates loaded successfully!');
        } else {
            alert('No valid rates found in the sheet');
        }
    } catch (error) {
        alert('Error loading from Google Sheets. Make sure the sheet is published as CSV.');
        console.error(error);
    }
}

function saveToLocalStorage() {
    localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
    localStorage.setItem('sheetsUrl', sheetsUrlInput.value);
}

function loadFromLocalStorage() {
    const savedRates = localStorage.getItem('exchangeRates');
    const savedUrl = localStorage.getItem('sheetsUrl');
    
    if (savedRates) {
        exchangeRates = JSON.parse(savedRates);
        populateCurrencySelects();
        renderRates();
    }
    
    if (savedUrl) {
        sheetsUrlInput.value = savedUrl;
    }
}

init();
