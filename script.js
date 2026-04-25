import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Firebase configuration (Same as PU WEB & PU WEB IR)
const firebaseConfig = {
    apiKey: "AIzaSyAyd3-u_uHofFbR49UGUUV5CiPDLRudXNI",
    authDomain: "m2mnm2ir.firebaseapp.com",
    projectId: "m2mnm2ir",
    storageBucket: "m2mnm2ir.firebasestorage.app",
    messagingSenderId: "329607977778",
    appId: "1:329607977778:web:373fd066dcb0e7c157552b",
    measurementId: "G-B9XGT1HZC8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const totalVisitorsEl = document.getElementById('totalVisitors');
const totalIrClicksEl = document.getElementById('totalIrClicks');
const irClicksCard = document.getElementById('irClicksCard');
const dataSourceToggle = document.getElementById('dataSourceToggle');
const labelPu = document.getElementById('label-pu');
const labelIr = document.getElementById('label-ir');
const chartCtx = document.getElementById('resultsChart').getContext('2d');
const dataTableBody = document.getElementById('dataTableBody');

const viewBtns = document.querySelectorAll('.btn[data-view]');
const exportBtn = document.getElementById('exportBtn');
const chartContainer = document.getElementById('chartContainer');
const sheetsContainer = document.getElementById('sheetsContainer');

// State
let currentCollection = 'stats'; // 'stats' for PU WEB, 'stats_ir' for PU WEB IR
let currentData = {};
let currentChart = null;
let currentChartType = 'bar';

// Unsubscribe functions for real-time updates
let unsubVisitors = null;
let unsubResults = null;
let unsubIrClicks = null;

// Initialize Dashboard
function init() {
    setupEventListeners();
    loadData();
}

function setupEventListeners() {
    // Toggle Data Source
    dataSourceToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            currentCollection = 'stats_ir';
            labelIr.classList.add('active');
            labelPu.classList.remove('active');
            irClicksCard.style.display = 'none'; // IR Web doesn't track IR Clicks
        } else {
            currentCollection = 'stats';
            labelPu.classList.add('active');
            labelIr.classList.remove('active');
            irClicksCard.style.display = 'block';
        }
        loadData();
    });

    // View Buttons (Bar, Line, Sheets)
    viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const view = e.target.getAttribute('data-view');
            
            if (view === 'sheets') {
                chartContainer.classList.remove('active');
                sheetsContainer.classList.add('active');
            } else {
                sheetsContainer.classList.remove('active');
                chartContainer.classList.add('active');
                currentChartType = view;
                renderChart();
            }
        });
    });

    // Export to CSV
    exportBtn.addEventListener('click', exportToCSV);
}

function loadData() {
    // Unsubscribe previous listeners if any
    if (unsubVisitors) unsubVisitors();
    if (unsubResults) unsubResults();
    if (unsubIrClicks) unsubIrClicks();

    // Reset UI
    totalVisitorsEl.textContent = 'Loading...';
    totalIrClicksEl.textContent = 'Loading...';
    currentData = {};

    // 1. Listen to Visitors
    const visitorsRef = doc(db, currentCollection, 'visitors');
    unsubVisitors = onSnapshot(visitorsRef, (docSnap) => {
        if (docSnap.exists()) {
            totalVisitorsEl.textContent = docSnap.data().count || 0;
        } else {
            totalVisitorsEl.textContent = 0;
        }
    });

    // 2. Listen to Results
    const resultsRef = doc(db, currentCollection, 'results');
    unsubResults = onSnapshot(resultsRef, (docSnap) => {
        if (docSnap.exists()) {
            currentData = docSnap.data();
        } else {
            currentData = {};
        }
        renderChart();
        renderTable();
    });

    // 3. Listen to IR Clicks (Only for PU WEB)
    if (currentCollection === 'stats') {
        const irClicksRef = doc(db, currentCollection, 'ir_clicks');
        unsubIrClicks = onSnapshot(irClicksRef, (docSnap) => {
            if (docSnap.exists()) {
                totalIrClicksEl.textContent = docSnap.data().count || 0;
            } else {
                totalIrClicksEl.textContent = 0;
            }
        });
    }
}

function renderChart() {
    const labels = Object.keys(currentData).sort();
    const data = labels.map(label => currentData[label]);

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(chartCtx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Result Count',
                data: data,
                backgroundColor: currentChartType === 'bar' ? '#000000' : 'rgba(0, 0, 0, 0.1)',
                borderColor: '#000000',
                borderWidth: 2,
                tension: 0.3,
                fill: currentChartType === 'line',
                pointBackgroundColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0 // Integer only
                    },
                    grid: {
                        color: '#eeeeee'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderTable() {
    dataTableBody.innerHTML = '';
    
    const labels = Object.keys(currentData).sort();
    if (labels.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="2" style="text-align:center">No data available</td></tr>';
        return;
    }

    let total = 0;

    labels.forEach(label => {
        const tr = document.createElement('tr');
        const count = currentData[label];
        total += count;

        tr.innerHTML = `
            <td>${label}</td>
            <td>${count}</td>
        `;
        dataTableBody.appendChild(tr);
    });

    // Add total row
    const totalTr = document.createElement('tr');
    totalTr.innerHTML = `
        <td style="font-weight: 800; text-transform: uppercase;">Total Visitor</td>
        <td style="font-weight: 800;">${total}</td>
    `;
    dataTableBody.appendChild(totalTr);
}

function exportToCSV() {
    const labels = Object.keys(currentData).sort();
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    csvContent += "Category,Count\n";
    
    // Rows
    labels.forEach(label => {
        const count = currentData[label];
        csvContent += `"${label}",${count}\n`;
    });

    // Add other stats
    csvContent += `\n"Total Visitors",${totalVisitorsEl.textContent}\n`;
    if (currentCollection === 'stats') {
        csvContent += `"IR Web Clicks",${totalIrClicksEl.textContent}\n`;
    }

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = currentCollection === 'stats' ? "pu_web_analytics.csv" : "pu_web_ir_analytics.csv";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Run
init();
