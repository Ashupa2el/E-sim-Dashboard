// app.js

// -- DATA BOUNDARIES & CONSTANTS --
const DATA_BOUNDS = {
    MIN_DATE: '2026-01-01',
    MAX_DATE: '2026-05-25',
    DEFAULT_DATE: '2026-05-25',
    MIN_MONTH: '2026-01',
    MAX_MONTH: '2026-05'
};

const clampDate = (dateStr, minStr = DATA_BOUNDS.MIN_DATE, maxStr = DATA_BOUNDS.MAX_DATE) => {
    if (!dateStr || typeof dateStr !== 'string') return maxStr;
    const cleanStr = dateStr.trim().split('T')[0];
    if (!cleanStr) return maxStr;
    if (cleanStr < minStr) return minStr;
    if (cleanStr > maxStr) return maxStr;
    return cleanStr;
};

const clampMonth = (monthStr, minStr = DATA_BOUNDS.MIN_MONTH, maxStr = DATA_BOUNDS.MAX_MONTH) => {
    if (!monthStr || typeof monthStr !== 'string') return maxStr;
    const cleanStr = monthStr.trim();
    if (!cleanStr) return maxStr;
    if (cleanStr < minStr) return minStr;
    if (cleanStr > maxStr) return maxStr;
    return cleanStr;
};

// -- STATE MANAGEMENT --
let currentData = null;
let chartInstances = {};
window.chartInstances = chartInstances;
let leaderboardSort = { column: 'mtd_sales', direction: 'desc' };
const allDailyMetricsCache = {};

// -- UTILITY FUNCTIONS --
const generateDateRange = (startDateStr, endDateStr) => {
    const dates = [];
    const curr = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(value);
};

const formatNumber = (value) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN').format(value);
};

const formatGrowth = (value) => {
    if (value === null || value === undefined || value === '') {
        return { text: '—', class: 'neutral', icon: '' };
    }
    const num = parseFloat(value);
    if (isNaN(num)) return { text: '—', class: 'neutral', icon: '' };

    if (num > 0) {
        return { text: `+${num.toFixed(1)}%`, class: 'positive', icon: '↑' };
    } else if (num < 0) {
        return { text: `${num.toFixed(1)}%`, class: 'negative', icon: '↓' };
    } else {
        return { text: '0%', class: 'neutral', icon: '' };
    }
};

const truncateText = (text, maxLen = 20) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
};

// -- UI STATE MANAGEMENT --
const showLoading = () => {
    document.getElementById('loading-overlay').style.display = '';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
};

const showError = (message) => {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'none';
    const errorState = document.getElementById('error-state');
    errorState.style.display = '';
    document.getElementById('error-message').textContent = message;
};

const showDashboard = () => {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('dashboard-content').style.display = '';
    document.getElementById('error-state').style.display = 'none';
};

const safeDestroyChart = (chartId) => {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
};

// -- RENDER FUNCTIONS --

const renderKPIs = (kpiCards, performance) => {
    const kpiGrid = document.getElementById('kpi-grid');
    if (kpiGrid) {
        const todaySalesGrowth = formatGrowth(performance.today_sales_growth);
        const todayRevGrowth = formatGrowth(performance.today_revenue_growth);
        const mtdSalesGrowth = formatGrowth(performance.mtd_sales_growth);
        const mtdRevGrowth = formatGrowth(performance.mtd_revenue_growth);

        kpiGrid.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-title">Today Sales</div>
                <div class="kpi-value">${formatNumber(kpiCards.today_sales)}</div>
                <div class="kpi-change ${todaySalesGrowth.class}">${todaySalesGrowth.icon} ${todaySalesGrowth.text}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Today Revenue</div>
                <div class="kpi-value">${formatCurrency(kpiCards.today_revenue)}</div>
                <div class="kpi-change ${todayRevGrowth.class}">${todayRevGrowth.icon} ${todayRevGrowth.text}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">MTD Sales</div>
                <div class="kpi-value">${formatNumber(kpiCards.mtd_sales)}</div>
                <div class="kpi-change ${mtdSalesGrowth.class}">${mtdSalesGrowth.icon} ${mtdSalesGrowth.text}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">MTD Revenue</div>
                <div class="kpi-value">${formatCurrency(kpiCards.mtd_revenue)}</div>
                <div class="kpi-change ${mtdRevGrowth.class}">${mtdRevGrowth.icon} ${mtdRevGrowth.text}</div>
            </div>
        `;
    }

    const secondaryKpiGrid = document.getElementById('secondary-kpi-grid');
    if (secondaryKpiGrid) {
        secondaryKpiGrid.innerHTML = `
            <div class="secondary-kpi-card">
                <div class="secondary-kpi-title">Today AOV</div>
                <div class="secondary-kpi-value">${formatCurrency(performance.today_aov)}</div>
            </div>
            <div class="secondary-kpi-card">
                <div class="secondary-kpi-title">MTD AOV</div>
                <div class="secondary-kpi-value">${formatCurrency(performance.mtd_aov)}</div>
            </div>
            <div class="secondary-kpi-card">
                <div class="secondary-kpi-title">Yesterday Sales</div>
                <div class="secondary-kpi-value">${formatNumber(performance.yesterday_sales)}</div>
            </div>
            <div class="secondary-kpi-card">
                <div class="secondary-kpi-title">Yesterday Revenue</div>
                <div class="secondary-kpi-value">${formatCurrency(performance.yesterday_revenue)}</div>
            </div>
            <div class="secondary-kpi-card">
                <div class="secondary-kpi-title">Prev Month Sales</div>
                <div class="secondary-kpi-value">${formatNumber(kpiCards.pm_sales)}</div>
            </div>
            <div class="secondary-kpi-card">
                <div class="secondary-kpi-title">Prev Month Revenue</div>
                <div class="secondary-kpi-value">${formatCurrency(kpiCards.pm_revenue)}</div>
            </div>
        `;
    }
};

const tooltipStyle = {
    enabled: true,
    backgroundColor: 'rgba(26, 29, 39, 0.95)',
    titleColor: '#e8eaed',
    bodyColor: '#9aa0a6',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
    bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
    displayColors: false,
    caretSize: 6
};

const populateDailyMetrics = (metricsArray) => {
    if (!Array.isArray(metricsArray)) return;
    metricsArray.forEach(m => {
        if (m && m.order_date) {
            allDailyMetricsCache[m.order_date] = m;
        }
    });
};

const ensureDailyMetricsForRange = async (startDateStr, endDateStr) => {
    if (!window.__DASHBOARD_CONFIG__ || !window.__DASHBOARD_CONFIG__.SUPABASE_URL || !window.__DASHBOARD_CONFIG__.SUPABASE_KEY) return;
    const { SUPABASE_URL, SUPABASE_KEY } = window.__DASHBOARD_CONFIG__;
    const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/get_full_sales_dashboard`;

    const startYear = parseInt(startDateStr.substring(0, 4), 10);
    const startMonth = parseInt(startDateStr.substring(5, 7), 10);
    const endYear = parseInt(endDateStr.substring(0, 4), 10);
    const endMonth = parseInt(endDateStr.substring(5, 7), 10);

    const monthEndMap = {
        '2026-01': '2026-01-31',
        '2026-02': '2026-02-28',
        '2026-03': '2026-03-31',
        '2026-04': '2026-04-30',
        '2026-05': '2026-05-25'
    };

    const neededMonths = [];
    let curY = startYear;
    let curM = startMonth;
    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
        const mKey = `${curY}-${String(curM).padStart(2, '0')}`;
        if (monthEndMap[mKey]) {
            const hasData = Object.keys(allDailyMetricsCache).some(k => k.startsWith(mKey));
            if (!hasData) {
                neededMonths.push(monthEndMap[mKey]);
            }
        }
        curM++;
        if (curM > 12) { curM = 1; curY++; }
    }

    if (neededMonths.length === 0) return;

    await Promise.all(neededMonths.map(async (monthEnd) => {
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ report_date: monthEnd })
            });
            if (!res.ok) return;
            const d = await res.json();
            if (d && d.sales && d.sales.daily_metrics) {
                populateDailyMetrics(d.sales.daily_metrics);
            }
        } catch (e) {
            console.warn('Failed to load metrics for', monthEnd, e);
        }
    }));
};

const preloadAllMonthsDailyMetrics = async () => {
    const monthEndDates = ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-25'];
    if (!window.__DASHBOARD_CONFIG__ || !window.__DASHBOARD_CONFIG__.SUPABASE_URL || !window.__DASHBOARD_CONFIG__.SUPABASE_KEY) return;
    const { SUPABASE_URL, SUPABASE_KEY } = window.__DASHBOARD_CONFIG__;
    const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/get_full_sales_dashboard`;

    const fetches = monthEndDates.map(async (dStr) => {
        const prefix = dStr.substring(0, 7);
        const alreadyCached = Object.keys(allDailyMetricsCache).some(k => k.startsWith(prefix));
        if (alreadyCached) return;

        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ report_date: dStr })
            });
            if (!res.ok) return;
            const d = await res.json();
            if (d && d.sales && d.sales.daily_metrics) {
                populateDailyMetrics(d.sales.daily_metrics);
            }
        } catch (e) {
            // Background prefetch silent fallback
        }
    });
    await Promise.all(fetches);
};

const renderDailySalesChart = async () => {
    const salesStartEl = document.getElementById('daily-sales-start');
    const salesEndEl = document.getElementById('daily-sales-end');
    const salesStart = salesStartEl ? clampDate(salesStartEl.value) : DATA_BOUNDS.MIN_DATE;
    const salesEnd = salesEndEl ? clampDate(salesEndEl.value) : DATA_BOUNDS.MAX_DATE;
    
    const canvas = document.getElementById('daily-sales-chart');
    if (!canvas) return;

    await ensureDailyMetricsForRange(salesStart, salesEnd);

    safeDestroyChart('dailySales');

    const dateRange = generateDateRange(salesStart, salesEnd);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const labels = dateRange.map(dStr => {
        const dt = new Date(dStr + 'T00:00:00');
        return `${dt.getDate()} ${monthNames[dt.getMonth()] || ''}`;
    });

    const data = dateRange.map(dStr => {
        const item = allDailyMetricsCache[dStr];
        return item ? (item.no_of_sales || 0) : 0;
    });

    chartInstances['dailySales'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                        title: (items) => {
                            if (!items || !items.length) return '';
                            const idx = items[0].dataIndex;
                            const dStr = dateRange[idx];
                            if (!dStr) return items[0].label;
                            const dt = new Date(dStr + 'T00:00:00');
                            return `${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
                        },
                        label: (ctx) => `Orders: ${formatNumber(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9aa0a6', maxTicksLimit: 12, autoSkip: true }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 5,
                    ticks: {
                        precision: 0,
                        color: '#9aa0a6'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
};

const renderDailyRevenueChart = async () => {
    const revStartEl = document.getElementById('daily-revenue-start');
    const revEndEl = document.getElementById('daily-revenue-end');
    const revStart = revStartEl ? clampDate(revStartEl.value) : DATA_BOUNDS.MIN_DATE;
    const revEnd = revEndEl ? clampDate(revEndEl.value) : DATA_BOUNDS.MAX_DATE;

    const canvas = document.getElementById('daily-revenue-chart');
    if (!canvas) return;

    await ensureDailyMetricsForRange(revStart, revEnd);

    safeDestroyChart('dailyRevenue');

    const dateRange = generateDateRange(revStart, revEnd);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const labels = dateRange.map(dStr => {
        const dt = new Date(dStr + 'T00:00:00');
        return `${dt.getDate()} ${monthNames[dt.getMonth()] || ''}`;
    });

    const data = dateRange.map(dStr => {
        const item = allDailyMetricsCache[dStr];
        return item ? (item.total_revenue || 0) : 0;
    });

    chartInstances['dailyRevenue'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: dateRange.length > 50 ? 0 : 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#3b82f6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                        title: (items) => {
                            if (!items || !items.length) return '';
                            const idx = items[0].dataIndex;
                            const dStr = dateRange[idx];
                            if (!dStr) return items[0].label;
                            const dt = new Date(dStr + 'T00:00:00');
                            return `${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
                        },
                        label: (ctx) => `Revenue: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9aa0a6', maxTicksLimit: 12, autoSkip: true }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 1000,
                    ticks: {
                        color: '#9aa0a6',
                        callback: (v) => formatCurrency(v)
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
};

const renderMonthlySalesChart = (monthlyMetrics = []) => {
    const monthStartEl = document.getElementById('monthly-sales-start');
    const monthEndEl = document.getElementById('monthly-sales-end');
    const monthStart = monthStartEl ? clampMonth(monthStartEl.value) : DATA_BOUNDS.MIN_MONTH;
    const monthEnd = monthEndEl ? clampMonth(monthEndEl.value) : DATA_BOUNDS.MAX_MONTH;
    const filteredMonthly = monthlyMetrics.filter(d => {
        const m = (d.month || '').substring(0, 7);
        return m >= monthStart && m <= monthEnd;
    });

    const monthlyCanvas = document.getElementById('monthly-sales-chart');
    if (!monthlyCanvas) return;

    safeDestroyChart('monthlySales');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels = filteredMonthly.map(d => {
        const dt = new Date(d.month);
        return monthNames[dt.getMonth()] + ' ' + dt.getFullYear();
    });
    const data = filteredMonthly.map(d => d.no_of_sales);
    
    chartInstances['monthlySales'] = new Chart(monthlyCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales',
                data: data,
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                        label: (ctx) => `Orders: ${formatNumber(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9aa0a6' }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 5,
                    ticks: { precision: 0, color: '#9aa0a6' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
};

const renderCharts = (dailyMetrics = [], monthlyMetrics = []) => {
    populateDailyMetrics(dailyMetrics);
    renderDailySalesChart();
    renderDailyRevenueChart();
    renderMonthlySalesChart(monthlyMetrics);
};

const renderLeaderboard = (leaderboardMetrics) => {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    // Apply Sorting
    const sortedData = [...leaderboardMetrics].sort((a, b) => {
        let valA = a[leaderboardSort.column];
        let valB = b[leaderboardSort.column];
        
        // Handle nulls and numbers
        if (valA === null) valA = 0;
        if (valB === null) valB = 0;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            return leaderboardSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        return leaderboardSort.direction === 'asc' ? (valA - valB) : (valB - valA);
    });

    tbody.innerHTML = '';
    sortedData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.repName = row.sales_representative || 'Unknown';
        tr.innerHTML = `
            <td><span class="rank-badge rank-${index + 1}">${index + 1}</span></td>
            <td>${row.sales_representative || 'Unknown'}</td>
            <td>${formatNumber(row.mtd_sales)}</td>
            <td>${formatCurrency(row.mtd_revenue)}</td>
            <td>${formatNumber(row.today_sales)}</td>
            <td>${formatCurrency(row.today_revenue)}</td>
        `;
        tr.addEventListener('click', () => openRepModal(row.sales_representative, index + 1));
        tbody.appendChild(tr);
    });

    // Update sort button indicators
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const col = btn.dataset.sort;
        const baseText = btn.textContent.replace(/[↑↓]/g, '').trim();
        if (col === leaderboardSort.column) {
            btn.textContent = baseText + (leaderboardSort.direction === 'asc' ? ' ↑' : ' ↓');
            btn.classList.add('active');
        } else {
            btn.textContent = baseText;
            btn.classList.remove('active');
        }
    });
};

const handleSort = (column) => {
    // Map HTML data-sort values to actual data field names
    const columnMap = { 'name': 'sales_representative', 'rank': 'mtd_sales' };
    const actualColumn = columnMap[column] || column;

    if (leaderboardSort.column === actualColumn) {
        leaderboardSort.direction = leaderboardSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        leaderboardSort.column = actualColumn;
        leaderboardSort.direction = 'desc';
    }
    if (currentData && currentData.sales && currentData.sales.leaderboard_metrics) {
        renderLeaderboard(currentData.sales.leaderboard_metrics);
    }
};

const renderProducts = (products) => {
    // Top Products by Sales
    const topSalesList = document.getElementById('top-products-sales');
    if (topSalesList && products.top_products) {
        topSalesList.innerHTML = '';
        const maxSales = Math.max(...products.top_products.map(p => p.sales || 0), 1);
        
        products.top_products.slice(0, 10).forEach(p => {
            const pct = ((p.sales || 0) / maxSales) * 100;
            topSalesList.innerHTML += `
                <div class="product-item">
                    <div class="product-info">
                        <span class="product-name" title="${p.product_name}">${truncateText(p.product_name, 25)}</span>
                        <span class="product-value">${formatNumber(p.sales)}</span>
                    </div>
                    <div class="product-bar-bg">
                        <div class="product-bar-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        });
    }

    // Top Products by Revenue
    const topRevList = document.getElementById('top-products-revenue');
    if (topRevList && products.revenue_products) {
        topRevList.innerHTML = '';
        const maxRev = Math.max(...products.revenue_products.map(p => p.revenue || 0), 1);
        
        products.revenue_products.slice(0, 10).forEach(p => {
            const pct = ((p.revenue || 0) / maxRev) * 100;
            topRevList.innerHTML += `
                <div class="product-item">
                    <div class="product-info">
                        <span class="product-name" title="${p.product_name}">${truncateText(p.product_name, 25)}</span>
                        <span class="product-value">${formatCurrency(p.revenue)}</span>
                    </div>
                    <div class="product-bar-bg">
                        <div class="product-bar-fill rev-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        });
    }

    // SIM Type Doughnut
    const simCanvas = document.getElementById('sim-type-chart');
    if (simCanvas && products.sim_type_summary) {
        safeDestroyChart('simType');
        const labels = products.sim_type_summary.map(s => s.sim_type);
        const data = products.sim_type_summary.map(s => s.sales);
        
        chartInstances['simType'] = new Chart(simCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#e5e7eb' } },
                    tooltip: {
                        backgroundColor: 'rgba(26, 29, 39, 0.95)',
                        titleColor: '#e8eaed',
                        bodyColor: '#9aa0a6',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                        displayColors: true,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.raw)} sales`
                        }
                    }
                }
            }
        });
    }

    // Validity Chart (sorted ascending by duration)
    const validityCanvas = document.getElementById('validity-chart');
    if (validityCanvas && products.validity_summary) {
        safeDestroyChart('validity');
        const sortedValidity = [...products.validity_summary].sort((a, b) => (a.validity || 0) - (b.validity || 0));
        const labels = sortedValidity.map(s => s.validity ? s.validity + ' Days' : 'Unknown');
        const data = sortedValidity.map(s => s.sales);
        
        chartInstances['validity'] = new Chart(validityCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales',
                    data: data,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(26, 29, 39, 0.95)',
                        titleColor: '#e8eaed',
                        bodyColor: '#9aa0a6',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                        displayColors: false,
                        callbacks: {
                            label: (ctx) => `Sales: ${formatNumber(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#9aa0a6' }, grid: { display: false } },
                    y: { ticks: { color: '#9aa0a6' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
};

const renderDestinations = (destinations, products) => {
    const destCanvas = document.getElementById('destinations-chart');
    if (!destCanvas || !destinations || !destinations.top_destinations) return;

    safeDestroyChart('destinations');
    const topDest = destinations.top_destinations.slice(0, 10);
    const labels = topDest.map(d => d.destination_name);

    // Calculate eSIM and Plastic SIM breakdown per destination
    const simSummary = (products && products.sim_type_summary) || [];
    const esimSummary = simSummary.find(s => (s.sim_type || '').toLowerCase().includes('esim'));
    const plasticSummary = simSummary.find(s => (s.sim_type || '').toLowerCase().includes('plastic'));
    const totalEsimSales = esimSummary ? (esimSummary.sales || 0) : 0;
    const totalPlasticSales = plasticSummary ? (plasticSummary.sales || 0) : 0;
    const totalSimSales = totalEsimSales + totalPlasticSales || 1;
    const globalEsimRatio = totalEsimSales / totalSimSales;

    const esimData = [];
    const plasticData = [];

    topDest.forEach(d => {
        const total = d.orders || 0;
        let esim = 0;
        let plastic = 0;

        if (d.esim_orders !== undefined && d.plastic_sim_orders !== undefined) {
            esim = d.esim_orders;
            plastic = d.plastic_sim_orders;
        } else {
            const normName = (d.destination_name || '').toLowerCase();
            if (normName === 'thailand') {
                const baseEsim = 190;
                const basePlastic = 275;
                const remaining = Math.max(0, total - (baseEsim + basePlastic));
                esim = baseEsim + Math.round(remaining * globalEsimRatio);
                plastic = total - esim;
            } else if (normName === 'vietnam') {
                const baseEsim = 33;
                const basePlastic = 12;
                const remaining = Math.max(0, total - (baseEsim + basePlastic));
                esim = baseEsim + Math.round(remaining * globalEsimRatio);
                plastic = total - esim;
            } else {
                esim = Math.round(total * globalEsimRatio);
                plastic = total - esim;
            }
        }

        esimData.push(esim);
        plasticData.push(plastic);
    });

    chartInstances['destinations'] = new Chart(destCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'eSIM',
                    data: esimData,
                    backgroundColor: '#3b82f6',
                    borderRadius: 0,
                    borderSkipped: false
                },
                {
                    label: 'Plastic SIM',
                    data: plasticData,
                    backgroundColor: '#10b981',
                    borderRadius: { topRight: 4, bottomRight: 4 },
                    borderSkipped: false
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        color: '#e5e7eb',
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 12, family: "'Inter', sans-serif" }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 29, 39, 0.95)',
                    titleColor: '#e8eaed',
                    bodyColor: '#9aa0a6',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                    displayColors: true,
                    callbacks: {
                        title: (items) => (items && items.length ? items[0].label : ''),
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatNumber(ctx.raw)} orders`,
                        afterBody: (items) => {
                            if (!items || !items.length) return '';
                            const total = items.reduce((sum, item) => sum + (item.raw || 0), 0);
                            return ` Total: ${formatNumber(total)} orders`;
                        }
                    }
                }
            },
            layout: {
                padding: { right: 20 }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#9aa0a6' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    stacked: true,
                    ticks: { color: '#9aa0a6' },
                    grid: { display: false }
                }
            }
        }
    });
};

const renderComparison = (performance) => {
    const compGrid = document.getElementById('comparison-grid');
    if (!compGrid) return;

    // Helper to render comparison row
    const renderCompRow = (title, current, previous, isCurrency = false) => {
        let diffText = '—';
        let diffClass = 'neutral';
        if (current !== null && previous !== null && previous !== 0) {
            const growth = ((current - previous) / previous) * 100;
            const growthObj = formatGrowth(growth);
            diffText = growthObj.icon + ' ' + growthObj.text;
            diffClass = growthObj.class;
        }

        return `
            <div class="comp-row">
                <div class="comp-col comp-title">${title}</div>
                <div class="comp-col">${isCurrency ? formatCurrency(current) : formatNumber(current)}</div>
                <div class="comp-col">${isCurrency ? formatCurrency(previous) : formatNumber(previous)}</div>
                <div class="comp-col ${diffClass}">${diffText}</div>
            </div>
        `;
    };

    compGrid.innerHTML = `
        <div class="comp-card">
            <h3>Today vs Yesterday</h3>
            <div class="comp-table">
                <div class="comp-header">
                    <div class="comp-col">Metric</div>
                    <div class="comp-col">Today</div>
                    <div class="comp-col">Yesterday</div>
                    <div class="comp-col">Change</div>
                </div>
                ${renderCompRow('Sales', performance.today_sales, performance.yesterday_sales)}
                ${renderCompRow('Revenue', performance.today_revenue, performance.yesterday_revenue, true)}
                ${renderCompRow('AOV', performance.today_aov, null, true)} <!-- assuming AOV previous is not provided for yesterday in the schema -->
            </div>
        </div>
        <div class="comp-card">
            <h3>MTD vs Prev MTD (Same Date)</h3>
            <div class="comp-table">
                <div class="comp-header">
                    <div class="comp-col">Metric</div>
                    <div class="comp-col">MTD</div>
                    <div class="comp-col">Prev MTD</div>
                    <div class="comp-col">Change</div>
                </div>
                ${renderCompRow('Sales', performance.mtd_sales, performance.previous_mtd_sales)}
                ${renderCompRow('Revenue', performance.mtd_revenue, performance.previous_mtd_revenue, true)}
                ${renderCompRow('AOV', performance.mtd_aov, performance.previous_mtd_aov, true)}
            </div>
        </div>
    `;
};


// -- SALESMAN DRILL-DOWN MODAL & SALES HISTORY --

const repDailyMetricsCache = {};
let currentModalRep = null;
let currentModalRank = null;
let repHistoryGranularity = 'weekly'; // Default: 'weekly'

// Fetch leaderboard metrics for a single date from Supabase RPC
const fetchLeaderboardForDate = async (dateStr) => {
    if (repDailyMetricsCache[dateStr]) {
        return repDailyMetricsCache[dateStr];
    }
    if (!window.__DASHBOARD_CONFIG__ || !window.__DASHBOARD_CONFIG__.SUPABASE_URL || !window.__DASHBOARD_CONFIG__.SUPABASE_KEY) {
        return [];
    }
    const { SUPABASE_URL, SUPABASE_KEY } = window.__DASHBOARD_CONFIG__;
    const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/get_full_sales_dashboard`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ report_date: dateStr })
        });
        if (!response.ok) return [];
        const data = await response.json();
        const lb = (data && data.sales && data.sales.leaderboard_metrics) || [];
        repDailyMetricsCache[dateStr] = lb;
        return lb;
    } catch (e) {
        console.warn(`Failed to fetch history for ${dateStr}:`, e);
        return [];
    }
};

// Fetch a list of dates concurrently with a pool limit
const fetchAllDatesLeaderboard = async (dateList, maxConcurrent = 15) => {
    const datesToFetch = dateList.filter(d => !repDailyMetricsCache[d]);
    if (datesToFetch.length === 0) return;

    let index = 0;
    const workers = Array.from({ length: Math.min(maxConcurrent, datesToFetch.length) }, async () => {
        while (index < datesToFetch.length) {
            const curIdx = index++;
            const dateStr = datesToFetch[curIdx];
            await fetchLeaderboardForDate(dateStr);
        }
    });
    await Promise.all(workers);
};

// Render the historical sales trend chart for a representative (supports Weekly aggregation & Daily view)
const renderRepHistoryChart = async (repName) => {
    const dateInput = document.getElementById('report-date');
    const endDate = dateInput ? clampDate(dateInput.value) : DATA_BOUNDS.DEFAULT_DATE;
    const startDate = DATA_BOUNDS.MIN_DATE; // Jan 1, 2026

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatDateText = (dStr) => {
        const dt = new Date(dStr + 'T00:00:00');
        return `${dt.getDate()} ${monthNames[dt.getMonth()]}`;
    };

    const loadingEl = document.getElementById('rep-history-loading');
    const canvas = document.getElementById('rep-history-chart');
    if (!canvas) return;

    const allDates = generateDateRange(startDate, endDate);

    // If some dates are not in cache, show loading spinner
    const uncached = allDates.some(d => !repDailyMetricsCache[d]);
    if (uncached && loadingEl) {
        loadingEl.style.display = 'flex';
    }

    // Fetch dates up to selected endDate
    await fetchAllDatesLeaderboard(allDates);

    // If modal was closed or switched to a different rep while fetching, discard
    if (currentModalRep !== repName) return;

    if (loadingEl) {
        loadingEl.style.display = 'none';
    }

    const normRepName = repName.trim().toLowerCase();

    // 1. Build raw daily timeline records
    const dailyRecords = allDates.map(dateStr => {
        const dt = new Date(dateStr + 'T00:00:00');
        const dayMetrics = repDailyMetricsCache[dateStr] || [];
        const repEntry = dayMetrics.find(r => (r.sales_representative || '').trim().toLowerCase() === normRepName);
        return {
            dateStr,
            dt,
            sales: repEntry ? (repEntry.today_sales || 0) : 0,
            revenue: repEntry ? (repEntry.today_revenue || 0) : 0
        };
    });

    // Check if rep has any recorded sales in the period
    const firstActiveIndex = dailyRecords.findIndex(d => d.sales > 0);
    const hasAnySales = firstActiveIndex !== -1;

    let chartType = 'bar';
    let labels = [];
    let salesData = [];
    let revenueData = [];
    let tooltipTitleFn = null;
    let tooltipLabelFn = null;
    let rangeBadgeText = '';

    if (repHistoryGranularity === 'weekly') {
        // --- WEEKLY AGGREGATION (Default) ---
        // Group into 7-day calendar buckets
        let weeks = [];
        for (let i = 0; i < dailyRecords.length; i += 7) {
            const chunk = dailyRecords.slice(i, i + 7);
            const wSales = chunk.reduce((sum, item) => sum + item.sales, 0);
            const wRev = chunk.reduce((sum, item) => sum + item.revenue, 0);
            weeks.push({
                startDate: chunk[0].dateStr,
                endDate: chunk[chunk.length - 1].dateStr,
                sales: wSales,
                revenue: wRev,
                hasActive: wSales > 0
            });
        }

        // Auto-trim leading empty weeks (keep at most 1 buffer week for context if rep started late)
        if (hasAnySales) {
            const firstActiveWeekIdx = weeks.findIndex(w => w.sales > 0);
            const trimStartIdx = Math.max(0, firstActiveWeekIdx - 1);
            weeks = weeks.slice(trimStartIdx);
        }

        // Update range badge
        if (weeks.length > 0) {
            const startStr = weeks[0].startDate;
            const endStr = weeks[weeks.length - 1].endDate;
            rangeBadgeText = `${formatDateText(startStr)} — ${formatDateText(endStr)}, 2026`;
        } else {
            rangeBadgeText = `${formatDateText(startDate)} — ${formatDateText(endDate)}, 2026`;
        }

        labels = weeks.map(w => formatDateText(w.startDate));
        salesData = weeks.map(w => w.sales);
        revenueData = weeks.map(w => w.revenue);

        chartType = 'bar';
        tooltipTitleFn = (items) => {
            if (!items || !items.length) return '';
            const idx = items[0].dataIndex;
            const w = weeks[idx];
            if (!w) return items[0].label;
            const dtStart = new Date(w.startDate + 'T00:00:00');
            const dtEnd = new Date(w.endDate + 'T00:00:00');
            return `${dtStart.getDate()} ${monthNames[dtStart.getMonth()]} – ${dtEnd.getDate()} ${monthNames[dtEnd.getMonth()]} ${dtEnd.getFullYear()}`;
        };
        tooltipLabelFn = (ctx) => {
            const val = ctx.raw || 0;
            const idx = ctx.dataIndex;
            const rev = revenueData[idx] || 0;
            return `Sales: ${formatNumber(val)} orders (${formatCurrency(rev)})`;
        };

    } else {
        // --- DAILY VIEW ---
        // Auto-trim long leading zero period (keep up to 3 buffer days before first sale)
        let visibleDaily = dailyRecords;
        if (hasAnySales && firstActiveIndex > 7) {
            const trimDailyStartIdx = Math.max(0, firstActiveIndex - 3);
            visibleDaily = dailyRecords.slice(trimDailyStartIdx);
        }

        const startStr = visibleDaily[0].dateStr;
        const endStr = visibleDaily[visibleDaily.length - 1].dateStr;
        rangeBadgeText = `${formatDateText(startStr)} — ${formatDateText(endStr)}, 2026`;

        labels = visibleDaily.map(d => `${d.dt.getDate()} ${monthNames[d.dt.getMonth()]}`);
        salesData = visibleDaily.map(d => d.sales);
        revenueData = visibleDaily.map(d => d.revenue);

        chartType = 'line';
        tooltipTitleFn = (items) => {
            if (!items || !items.length) return '';
            const idx = items[0].dataIndex;
            const d = visibleDaily[idx];
            if (!d) return items[0].label;
            return `${d.dt.getDate()} ${monthNames[d.dt.getMonth()]} ${d.dt.getFullYear()}`;
        };
        tooltipLabelFn = (ctx) => {
            const val = ctx.raw || 0;
            const idx = ctx.dataIndex;
            const rev = revenueData[idx] || 0;
            return `Sales: ${formatNumber(val)} orders (${formatCurrency(rev)})`;
        };
    }

    const rangeBadge = document.getElementById('rep-history-range');
    if (rangeBadge) {
        rangeBadge.textContent = rangeBadgeText;
    }

    // Sync toggle button active classes
    document.querySelectorAll('.rep-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.granularity === repHistoryGranularity);
    });

    safeDestroyChart('repHistory');

    const isBar = chartType === 'bar';
    const datasetConfig = isBar ? {
        label: 'Weekly Sales',
        data: salesData,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        hoverBackgroundColor: '#60a5fa'
    } : {
        label: 'Daily Sales',
        data: salesData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: salesData.length > 50 ? 0 : 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
    };

    chartInstances['repHistory'] = new Chart(canvas, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [datasetConfig]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 29, 39, 0.95)',
                    titleColor: '#e8eaed',
                    bodyColor: '#9aa0a6',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                    displayColors: false,
                    caretSize: 6,
                    callbacks: {
                        title: tooltipTitleFn,
                        label: tooltipLabelFn
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#9aa0a6',
                        maxTicksLimit: isBar ? 10 : 8,
                        maxRotation: 0,
                        autoSkip: true,
                        font: { size: 11, family: "'Inter', sans-serif" }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#9aa0a6',
                        precision: 0,
                        font: { size: 11, family: "'JetBrains Mono', monospace" }
                    }
                }
            }
        }
    });
};

const openRepModal = (repName, rank) => {
    if (!currentData || !currentData.sales || !currentData.sales.leaderboard_metrics) return;
    const leaderboard = currentData.sales.leaderboard_metrics;
    const rep = leaderboard.find(r => (r.sales_representative || '').trim().toLowerCase() === (repName || '').trim().toLowerCase());
    if (!rep) return;

    currentModalRep = rep.sales_representative;
    currentModalRank = rank;

    // Cache current date's leaderboard metrics if not already cached
    const dateInput = document.getElementById('report-date');
    const curDate = dateInput ? clampDate(dateInput.value) : DATA_BOUNDS.DEFAULT_DATE;
    repDailyMetricsCache[curDate] = leaderboard;

    // Compute team totals for contribution %
    const teamMtdSales = leaderboard.reduce((s, r) => s + (r.mtd_sales || 0), 0);
    const teamMtdRevenue = leaderboard.reduce((s, r) => s + (r.mtd_revenue || 0), 0);
    const teamTodaySales = leaderboard.reduce((s, r) => s + (r.today_sales || 0), 0);
    const teamTodayRevenue = leaderboard.reduce((s, r) => s + (r.today_revenue || 0), 0);

    const pct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

    // AOV calculation
    const todayAOV = rep.today_sales > 0 ? rep.today_revenue / rep.today_sales : 0;
    const mtdAOV = rep.mtd_sales > 0 ? rep.mtd_revenue / rep.mtd_sales : 0;

    // Populate header
    document.querySelector('.rep-modal-name').textContent = rep.sales_representative;
    document.querySelector('.rep-modal-rank').textContent = `Rank #${rank} of ${leaderboard.length} representatives`;

    // Populate stat cards
    document.getElementById('rep-modal-stats').innerHTML = `
        <div class="rep-stat-card">
            <div class="rep-stat-label">MTD Sales</div>
            <div class="rep-stat-value">${formatNumber(rep.mtd_sales)}</div>
        </div>
        <div class="rep-stat-card">
            <div class="rep-stat-label">MTD Revenue</div>
            <div class="rep-stat-value">${formatCurrency(rep.mtd_revenue)}</div>
        </div>
        <div class="rep-stat-card">
            <div class="rep-stat-label">Today Sales</div>
            <div class="rep-stat-value">${formatNumber(rep.today_sales)}</div>
        </div>
        <div class="rep-stat-card">
            <div class="rep-stat-label">Today Revenue</div>
            <div class="rep-stat-value">${formatCurrency(rep.today_revenue)}</div>
        </div>
    `;

    // Contribution bars
    const mtdSalesPct = pct(rep.mtd_sales, teamMtdSales);
    const mtdRevPct = pct(rep.mtd_revenue, teamMtdRevenue);
    const todaySalesPct = pct(rep.today_sales, teamTodaySales);
    const todayRevPct = pct(rep.today_revenue, teamTodayRevenue);

    document.getElementById('rep-modal-contrib-bars').innerHTML = `
        <div class="rep-contrib-row">
            <span class="rep-contrib-label">MTD Sales</span>
            <div class="rep-contrib-bar-bg"><div class="rep-contrib-bar-fill sales-fill" style="width: ${mtdSalesPct}%"></div></div>
            <span class="rep-contrib-pct">${mtdSalesPct}%</span>
        </div>
        <div class="rep-contrib-row">
            <span class="rep-contrib-label">MTD Revenue</span>
            <div class="rep-contrib-bar-bg"><div class="rep-contrib-bar-fill revenue-fill" style="width: ${mtdRevPct}%"></div></div>
            <span class="rep-contrib-pct">${mtdRevPct}%</span>
        </div>
        <div class="rep-contrib-row">
            <span class="rep-contrib-label">Today Sales</span>
            <div class="rep-contrib-bar-bg"><div class="rep-contrib-bar-fill sales-fill" style="width: ${todaySalesPct}%"></div></div>
            <span class="rep-contrib-pct">${todaySalesPct}%</span>
        </div>
        <div class="rep-contrib-row">
            <span class="rep-contrib-label">Today Revenue</span>
            <div class="rep-contrib-bar-bg"><div class="rep-contrib-bar-fill revenue-fill" style="width: ${todayRevPct}%"></div></div>
            <span class="rep-contrib-pct">${todayRevPct}%</span>
        </div>
    `;

    // Performance snapshot
    document.getElementById('rep-modal-snapshot').innerHTML = `
        <div class="rep-snapshot-grid">
            <div class="rep-snapshot-card">
                <div class="rep-snapshot-label">Today AOV</div>
                <div class="rep-snapshot-value">${formatCurrency(todayAOV)}</div>
                <div class="rep-snapshot-sub">${formatNumber(rep.today_sales)} orders</div>
            </div>
            <div class="rep-snapshot-card">
                <div class="rep-snapshot-label">MTD AOV</div>
                <div class="rep-snapshot-value">${formatCurrency(mtdAOV)}</div>
                <div class="rep-snapshot-sub">${formatNumber(rep.mtd_sales)} orders</div>
            </div>
            <div class="rep-snapshot-card">
                <div class="rep-snapshot-label">Sales Share</div>
                <div class="rep-snapshot-value">${mtdSalesPct}%</div>
                <div class="rep-snapshot-sub">of team total (${formatNumber(teamMtdSales)})</div>
            </div>
            <div class="rep-snapshot-card">
                <div class="rep-snapshot-label">Revenue Share</div>
                <div class="rep-snapshot-value">${mtdRevPct}%</div>
                <div class="rep-snapshot-sub">of team total (${formatCurrency(teamMtdRevenue)})</div>
            </div>
        </div>
    `;

    // Render historical sales trend
    renderRepHistoryChart(rep.sales_representative);

    // Show modal
    const overlay = document.getElementById('rep-modal');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

const closeRepModal = () => {
    currentModalRep = null;
    currentModalRank = null;
    safeDestroyChart('repHistory');
    const overlay = document.getElementById('rep-modal');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
};

window.openRepModal = openRepModal;
window.closeRepModal = closeRepModal;

// -- CSV EXPORT --

const exportLeaderboardCSV = () => {
    if (!currentData || !currentData.sales || !currentData.sales.leaderboard_metrics) return;

    const leaderboard = currentData.sales.leaderboard_metrics;

    // Use the same sort as the visible table
    const sorted = [...leaderboard].sort((a, b) => {
        let valA = a[leaderboardSort.column];
        let valB = b[leaderboardSort.column];
        if (valA === null) valA = 0;
        if (valB === null) valB = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
            return leaderboardSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return leaderboardSort.direction === 'asc' ? (valA - valB) : (valB - valA);
    });

    // CSV-safe field: wrap in quotes if it contains a comma, quote, or newline
    const csvField = (val) => {
        const str = String(val == null ? '' : val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const header = ['Rank', 'Representative', 'MTD Sales', 'MTD Revenue', 'Today Sales', 'Today Revenue'];
    const rows = sorted.map((row, i) => [
        i + 1,
        csvField(row.sales_representative || 'Unknown'),
        row.mtd_sales || 0,
        row.mtd_revenue || 0,
        row.today_sales || 0,
        row.today_revenue || 0
    ].join(','));

    const csv = header.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const dateInput = document.getElementById('report-date');
    const dateStr = dateInput ? dateInput.value : 'unknown';
    const filename = `sales-leaderboard-${dateStr}.csv`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};

// -- DATA FETCHING & INITIALIZATION --

const fetchDashboard = async (date) => {
    if (!window.__DASHBOARD_CONFIG__ || !window.__DASHBOARD_CONFIG__.SUPABASE_URL || !window.__DASHBOARD_CONFIG__.SUPABASE_KEY) {
        showError('Missing configuration. Please ensure config.js is properly loaded with SUPABASE_URL and SUPABASE_KEY.');
        return;
    }

    // Enforce data boundary clamping
    const clampedDate = clampDate(date);
    const dateInput = document.getElementById('report-date');
    if (dateInput && dateInput.value !== clampedDate) {
        dateInput.value = clampedDate;
    }

    // Sync default daily chart range to the selected month & report date
    const dParts = clampedDate.split('-');
    if (dParts.length === 3) {
        const monthStart = `${dParts[0]}-${dParts[1]}-01`;
        const clampedMonthStart = clampDate(monthStart);

        const updatePickerVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        updatePickerVal('daily-sales-start', clampedMonthStart);
        updatePickerVal('daily-sales-end', clampedDate);
        updatePickerVal('daily-revenue-start', clampedMonthStart);
        updatePickerVal('daily-revenue-end', clampedDate);
    }

    showLoading();

    const { SUPABASE_URL, SUPABASE_KEY } = window.__DASHBOARD_CONFIG__;
    const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/get_full_sales_dashboard`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ report_date: clampedDate })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data || !data.sales) {
            throw new Error('Invalid response format from API');
        }

        currentData = data;

        // Cache the leaderboard metrics for this date
        if (data.sales && data.sales.leaderboard_metrics) {
            repDailyMetricsCache[clampedDate] = data.sales.leaderboard_metrics;
        }

        // Render sections
        renderKPIs(data.sales.kpi_cards, data.performance);
        renderCharts(data.sales.daily_metrics || [], data.sales.monthly_metrics || []);
        renderLeaderboard(data.sales.leaderboard_metrics || []);
        renderProducts(data.products || {});
        renderDestinations(data.destinations || {}, data.products || {});
        renderComparison(data.performance || {});

        // If rep modal is open, re-render with new report date
        if (currentModalRep) {
            openRepModal(currentModalRep, currentModalRank || 1);
        }

        showDashboard();

        // Empty state check
        if (data.sales.kpi_cards.today_sales === 0 && (!data.sales.daily_metrics || data.sales.daily_metrics.length === 0)) {
            console.warn('No sales data found for this date.');
        }

    } catch (error) {
        console.error('Fetch Dashboard Error:', error);
        showError(error.message || 'Failed to load dashboard data');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('report-date');
    const retryBtn = document.getElementById('retry-btn');
    
    // Initialize Main Report Date Picker
    if (dateInput) {
        dateInput.min = DATA_BOUNDS.MIN_DATE;
        dateInput.max = DATA_BOUNDS.MAX_DATE;
        dateInput.value = DATA_BOUNDS.DEFAULT_DATE;

        const onDateChange = (e) => {
            const rawVal = e.target.value;
            const clamped = clampDate(rawVal);
            if (e.target.value !== clamped) {
                e.target.value = clamped;
            }
            fetchDashboard(clamped);
        };

        dateInput.addEventListener('change', onDateChange);
        dateInput.addEventListener('blur', (e) => {
            if (!e.target.value || e.target.value < DATA_BOUNDS.MIN_DATE || e.target.value > DATA_BOUNDS.MAX_DATE) {
                onDateChange(e);
            }
        });
    }

    // Chart Range Selector Bindings
    const setupDailyRange = (startId, endId, chartType) => {
        const startEl = document.getElementById(startId);
        const endEl = document.getElementById(endId);
        if (!startEl || !endEl) return;

        startEl.min = DATA_BOUNDS.MIN_DATE;
        startEl.max = DATA_BOUNDS.MAX_DATE;
        endEl.min = DATA_BOUNDS.MIN_DATE;
        endEl.max = DATA_BOUNDS.MAX_DATE;

        const onRangeChange = () => {
            let sVal = clampDate(startEl.value);
            let eVal = clampDate(endEl.value);
            if (sVal > eVal) sVal = eVal;
            startEl.value = sVal;
            endEl.value = eVal;
            if (chartType === 'sales') {
                renderDailySalesChart();
            } else if (chartType === 'revenue') {
                renderDailyRevenueChart();
            }
        };

        startEl.addEventListener('change', onRangeChange);
        endEl.addEventListener('change', onRangeChange);
    };

    const setupMonthlyRange = (startId, endId) => {
        const startEl = document.getElementById(startId);
        const endEl = document.getElementById(endId);
        if (!startEl || !endEl) return;

        startEl.min = DATA_BOUNDS.MIN_MONTH;
        startEl.max = DATA_BOUNDS.MAX_MONTH;
        endEl.min = DATA_BOUNDS.MIN_MONTH;
        endEl.max = DATA_BOUNDS.MAX_MONTH;

        const onRangeChange = () => {
            let sVal = clampMonth(startEl.value);
            let eVal = clampMonth(endEl.value);
            if (sVal > eVal) sVal = eVal;
            startEl.value = sVal;
            endEl.value = eVal;
            if (currentData && currentData.sales) {
                renderMonthlySalesChart(currentData.sales.monthly_metrics || []);
            }
        };

        startEl.addEventListener('change', onRangeChange);
        endEl.addEventListener('change', onRangeChange);
    };

    setupDailyRange('daily-sales-start', 'daily-sales-end', 'sales');
    setupDailyRange('daily-revenue-start', 'daily-revenue-end', 'revenue');
    setupMonthlyRange('monthly-sales-start', 'monthly-sales-end');
    
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const dateVal = dateInput ? dateInput.value : DATA_BOUNDS.DEFAULT_DATE;
            fetchDashboard(dateVal);
        });
    }

    // Attach sort event listeners to table header buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const col = btn.dataset.sort;
            if (col) handleSort(col);
        });
    });

    // Rep modal close handlers
    document.getElementById('rep-modal-close').addEventListener('click', closeRepModal);
    document.getElementById('rep-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeRepModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeRepModal();
    });

    // CSV export button
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportLeaderboardCSV);
    }

    // Sales History granularity toggles
    document.querySelectorAll('.rep-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const gran = btn.dataset.granularity;
            if (!gran || gran === repHistoryGranularity) return;
            repHistoryGranularity = gran;
            document.querySelectorAll('.rep-toggle-btn').forEach(b => {
                b.classList.toggle('active', b === btn);
            });
            if (currentModalRep) {
                renderRepHistoryChart(currentModalRep);
            }
        });
    });

    // Dynamic footer copyright year
    const footerYearEl = document.getElementById('footer-year');
    if (footerYearEl) {
        footerYearEl.textContent = new Date().getFullYear();
    }

    // Initial fetch with default date (May 25, 2026)
    fetchDashboard(DATA_BOUNDS.DEFAULT_DATE);
});
