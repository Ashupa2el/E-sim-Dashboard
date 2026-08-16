// app.js

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

const renderCharts = (dailyMetrics, monthlyMetrics) => {
    // Shared chart options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
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

    // Daily Sales
    const dailySalesCanvas = document.getElementById('daily-sales-chart');
    if (dailySalesCanvas) {
        safeDestroyChart('dailySales');
        const labels = dailyMetrics.map(d => new Date(d.order_date).getDate());
        const data = dailyMetrics.map(d => d.no_of_sales);
        
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
            options: commonOptions
        });
    }

    // Daily Revenue
    const dailyRevCanvas = document.getElementById('daily-revenue-chart');
    if (dailyRevCanvas) {
        safeDestroyChart('dailyRevenue');
        const labels = dailyMetrics.map(d => new Date(d.order_date).getDate());
        const data = dailyMetrics.map(d => d.total_revenue);
        
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
                    tension: 0.4
                }]
            },
            options: commonOptions
        });
    }

    // Monthly Sales
    const monthlyCanvas = document.getElementById('monthly-sales-chart');
    if (monthlyCanvas) {
        safeDestroyChart('monthlySales');
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const labels = monthlyMetrics.map(d => {
            const dt = new Date(d.month);
            return monthNames[dt.getMonth()] + ' ' + dt.getFullYear();
        });
        const data = monthlyMetrics.map(d => d.no_of_sales);
        
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
            options: commonOptions
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
        tr.innerHTML = `
            <td><span class="rank-badge rank-${index + 1}">${index + 1}</span></td>
            <td>${row.sales_representative || 'Unknown'}</td>
            <td>${formatNumber(row.mtd_sales)}</td>
            <td>${formatCurrency(row.mtd_revenue)}</td>
            <td>${formatNumber(row.today_sales)}</td>
            <td>${formatCurrency(row.today_revenue)}</td>
        `;
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
                    legend: { position: 'right', labels: { color: '#e5e7eb' } }
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
                plugins: { legend: { display: false } },
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
                plugins: { legend: { display: false } },
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


// -- DATA FETCHING & INITIALIZATION --

const fetchDashboard = async (date) => {
    if (!window.__DASHBOARD_CONFIG__ || !window.__DASHBOARD_CONFIG__.SUPABASE_URL || !window.__DASHBOARD_CONFIG__.SUPABASE_KEY) {
        showError('Missing configuration. Please ensure config.js is properly loaded with SUPABASE_URL and SUPABASE_KEY.');
        return;
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
            body: JSON.stringify({ report_date: date })
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
            // Optional: Show subtle empty state indicator within dashboard
            console.warn('No recent data found for this date.');
        }

    } catch (error) {
        console.error('Fetch Dashboard Error:', error);
        showError(error.message || 'Failed to load dashboard data');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('report-date');
    const retryBtn = document.getElementById('retry-btn');
    
    // Default to yesterday
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateInput) {
        dateInput.value = yesterdayStr;
        dateInput.addEventListener('change', (e) => {
            if (e.target.value) {
                fetchDashboard(e.target.value);
            }
        });
    }
    
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const dateVal = dateInput ? dateInput.value : yesterdayStr;
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

    // Initial fetch
    fetchDashboard(yesterdayStr);
});
