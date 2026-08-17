// app.js

// -- DATA BOUNDARIES & CONSTANTS --
const DATA_BOUNDS = {
    MIN_DATE: '2026-01-01',
    MAX_DATE: '2026-05-31',
    DEFAULT_DATE: '2026-05-31',
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
let leaderboardSort = { column: 'mtd_sales', direction: 'desc' };

// -- UTILITY FUNCTIONS --
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

const renderCharts = (dailyMetrics = [], monthlyMetrics = []) => {
    // Shared tooltip styling
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

    // Shared chart options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: tooltipStyle
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9aa0a6' }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9aa0a6' }
            }
        }
    };

    // Filter Daily Sales by bounded range selector
    const salesStartEl = document.getElementById('daily-sales-start');
    const salesEndEl = document.getElementById('daily-sales-end');
    const salesStart = salesStartEl ? clampDate(salesStartEl.value) : DATA_BOUNDS.MIN_DATE;
    const salesEnd = salesEndEl ? clampDate(salesEndEl.value) : DATA_BOUNDS.MAX_DATE;
    const filteredDailySales = dailyMetrics.filter(d => d.order_date >= salesStart && d.order_date <= salesEnd);

    // Daily Sales
    const dailySalesCanvas = document.getElementById('daily-sales-chart');
    if (dailySalesCanvas) {
        safeDestroyChart('dailySales');
        const labels = filteredDailySales.map(d => {
            const dt = new Date(d.order_date);
            return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May'][dt.getMonth()] || ''}`;
        });
        const data = filteredDailySales.map(d => d.no_of_sales);
        
        chartInstances['dailySales'] = new Chart(dailySalesCanvas, {
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
                ...commonOptions,
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (ctx) => `Orders: ${formatNumber(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }

    // Filter Daily Revenue by bounded range selector
    const revStartEl = document.getElementById('daily-revenue-start');
    const revEndEl = document.getElementById('daily-revenue-end');
    const revStart = revStartEl ? clampDate(revStartEl.value) : DATA_BOUNDS.MIN_DATE;
    const revEnd = revEndEl ? clampDate(revEndEl.value) : DATA_BOUNDS.MAX_DATE;
    const filteredDailyRevenue = dailyMetrics.filter(d => d.order_date >= revStart && d.order_date <= revEnd);

    // Daily Revenue
    const dailyRevCanvas = document.getElementById('daily-revenue-chart');
    if (dailyRevCanvas) {
        safeDestroyChart('dailyRevenue');
        const labels = filteredDailyRevenue.map(d => {
            const dt = new Date(d.order_date);
            return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May'][dt.getMonth()] || ''}`;
        });
        const data = filteredDailyRevenue.map(d => d.total_revenue);
        
        chartInstances['dailyRevenue'] = new Chart(dailyRevCanvas, {
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
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#3b82f6',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (ctx) => `Revenue: ${formatCurrency(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }

    // Filter Monthly Sales by bounded range selector
    const monthStartEl = document.getElementById('monthly-sales-start');
    const monthEndEl = document.getElementById('monthly-sales-end');
    const monthStart = monthStartEl ? clampMonth(monthStartEl.value) : DATA_BOUNDS.MIN_MONTH;
    const monthEnd = monthEndEl ? clampMonth(monthEndEl.value) : DATA_BOUNDS.MAX_MONTH;
    const filteredMonthly = monthlyMetrics.filter(d => {
        const m = (d.month || '').substring(0, 7);
        return m >= monthStart && m <= monthEnd;
    });

    // Monthly Sales
    const monthlyCanvas = document.getElementById('monthly-sales-chart');
    if (monthlyCanvas) {
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
                ...commonOptions,
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (ctx) => `Orders: ${formatNumber(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }
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

    // Validity Chart
    const validityCanvas = document.getElementById('validity-chart');
    if (validityCanvas && products.validity_summary) {
        safeDestroyChart('validity');
        const labels = products.validity_summary.map(s => s.validity ? s.validity + ' Days' : 'Unknown');
        const data = products.validity_summary.map(s => s.sales);
        
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

const renderDestinations = (destinations) => {
    const destCanvas = document.getElementById('destinations-chart');
    if (destCanvas && destinations.top_destinations) {
        safeDestroyChart('destinations');
        const topDest = destinations.top_destinations.slice(0, 10);
        const labels = topDest.map(d => d.destination_name);
        const data = topDest.map(d => d.orders);

        chartInstances['destinations'] = new Chart(destCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Orders',
                    data: data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
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
                            label: (ctx) => `Orders: ${formatNumber(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#9aa0a6' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#9aa0a6' }, grid: { display: false } }
                }
            }
        });
    }
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


// -- SALESMAN DRILL-DOWN MODAL --

const openRepModal = (repName, rank) => {
    if (!currentData || !currentData.sales || !currentData.sales.leaderboard_metrics) return;
    const leaderboard = currentData.sales.leaderboard_metrics;
    const rep = leaderboard.find(r => r.sales_representative === repName);
    if (!rep) return;

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
    document.querySelector('.rep-modal-name').textContent = repName;
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

    // Show modal
    const overlay = document.getElementById('rep-modal');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

const closeRepModal = () => {
    const overlay = document.getElementById('rep-modal');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
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

        // Render sections
        renderKPIs(data.sales.kpi_cards, data.performance);
        renderCharts(data.sales.daily_metrics || [], data.sales.monthly_metrics || []);
        renderLeaderboard(data.sales.leaderboard_metrics || []);
        renderProducts(data.products || {});
        renderDestinations(data.destinations || {});
        renderComparison(data.performance || {});

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
    const setupDailyRange = (startId, endId) => {
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
            if (currentData && currentData.sales) {
                renderCharts(currentData.sales.daily_metrics || [], currentData.sales.monthly_metrics || []);
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
                renderCharts(currentData.sales.daily_metrics || [], currentData.sales.monthly_metrics || []);
            }
        };

        startEl.addEventListener('change', onRangeChange);
        endEl.addEventListener('change', onRangeChange);
    };

    setupDailyRange('daily-sales-start', 'daily-sales-end');
    setupDailyRange('daily-revenue-start', 'daily-revenue-end');
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

    // Initial fetch with default date (May 25, 2026)
    fetchDashboard(DATA_BOUNDS.DEFAULT_DATE);
});
