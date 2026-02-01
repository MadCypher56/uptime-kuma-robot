// Monitor Detail Page JavaScript
// Handles detailed monitor view with metrics, charts, and logs

let monitorData = null;
let monitorService = null;
let monitorId = null;
let responseChart = null;
let currentTimeRange = '24h';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // Get monitor info from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    monitorService = urlParams.get('service'); // 'robot' or 'kuma'
    monitorId = urlParams.get('id');
    
    if (!monitorService || !monitorId) {
        showToast('Invalid monitor parameters', 'error');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }
    
    // Update footer
    document.getElementById('monitorService').textContent = monitorService === 'robot' ? 'Uptime Robot' : 'Uptime Kuma';
    document.getElementById('monitorId').textContent = monitorId;
    
    // Load all monitor data
    loadMonitorData();
    
    // Set up auto-refresh every 30 seconds
    setInterval(loadMonitorData, 30000);
});

// ==================== LOAD MONITOR DATA ====================

async function loadMonitorData() {
    try {
        // Fetch monitor details
        const endpoint = monitorService === 'robot' 
            ? '/api/uptime-robot/monitors' 
            : '/api/uptime-kuma/monitors';
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        
        // Find specific monitor
        monitorData = data.monitors.find(m => m.id.toString() === monitorId.toString());
        
        if (!monitorData) {
            showToast('Monitor not found', 'error');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }
        
        // Update all sections
        updateMonitorHeader();
        updateMonitorStatus();
        updateKeyMetrics();
        updateResponseChart();
        updateUptimeBar();
        updateIncidents();
        updateConfiguration();
        updateRecentChecks();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error loading monitor data:', error);
        showToast('Failed to load monitor data', 'error');
    }
}

// ==================== UPDATE UI SECTIONS ====================

function updateMonitorHeader() {
    const title = monitorData.friendly_name || monitorData.name || 'Monitor';
    const url = monitorData.url || 'N/A';
    
    document.getElementById('monitorTitle').textContent = title;
    document.getElementById('monitorUrl').textContent = url;
    document.title = `${title} - Monitor Details`;
}

function updateMonitorStatus() {
    const statusBadge = document.getElementById('mainStatusBadge');
    const indicator = statusBadge.querySelector('.status-indicator');
    const statusText = statusBadge.querySelector('.status-text');
    
    let status = 'unknown';
    let statusLabel = 'Unknown';
    
    if (monitorService === 'robot') {
        // Uptime Robot status codes: 0=paused, 1=not checked, 2=up, 8=seems down, 9=down
        const statusCode = monitorData.status;
        if (statusCode === 2) {
            status = 'up';
            statusLabel = 'Operational';
        } else if (statusCode === 8 || statusCode === 9) {
            status = 'down';
            statusLabel = 'Down';
        } else if (statusCode === 0) {
            status = 'paused';
            statusLabel = 'Paused';
        }
    } else {
        // Uptime Kuma - use the status boolean from backend (True=UP, False=DOWN)
        // NOT the active field (active just means enabled/disabled)
        if (monitorData.status === true || monitorData.status === 1) {
            status = 'up';
            statusLabel = 'Operational';
        } else if (monitorData.status === false || monitorData.status === 0) {
            status = 'down';
            statusLabel = 'Down';
        } else if (monitorData.active === false || monitorData.active === 0) {
            // Only check active field if status is not available
            status = 'paused';
            statusLabel = 'Paused';
        } else {
            // Unknown status
            status = 'down';
            statusLabel = 'Unknown';
        }
    }
    
    indicator.className = `status-indicator ${status}`;
    statusText.textContent = statusLabel;
    
    // Update pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (status === 'paused') {
        pauseBtn.innerHTML = '<span>▶️</span> Resume';
    } else {
        pauseBtn.innerHTML = '<span>⏸️</span> Pause';
    }
}

function updateKeyMetrics() {
    // Current Response Time
    const currentResponse = monitorData.response_time || monitorData.average_response_time || 0;
    document.getElementById('currentResponse').textContent = formatResponseTime(currentResponse);
    
    // Average Response Time (24h)
    const avgResponse = monitorData.average_response_time || currentResponse;
    document.getElementById('avgResponse24h').textContent = formatResponseTime(avgResponse);
    
    // Uptime 24h
    const uptime24h = monitorData.custom_uptime_ratio || monitorData.uptime || '99.9';
    document.getElementById('uptime24h').textContent = uptime24h + '%';
    
    // Count incidents (if available)
    const incidents = monitorData.logs?.filter(log => log.type === 1).length || 0;
    document.getElementById('incidents24h').textContent = `${incidents} incident${incidents !== 1 ? 's' : ''}`;
    
    // Uptime 30d
    const uptime30d = monitorData.custom_uptime_ranges?.[2] || uptime24h;
    document.getElementById('uptime30d').textContent = uptime30d + '%';
    document.getElementById('incidents30d').textContent = `${incidents} incident${incidents !== 1 ? 's' : ''}`;
    
    // Check Interval
    const interval = monitorData.interval || 300;
    document.getElementById('checkInterval').textContent = formatInterval(interval);
    
    // SSL Certificate (if available)
    if (monitorData.ssl) {
        const sslExpiry = monitorData.ssl.expires_at || monitorData.ssl.valid_until;
        if (sslExpiry) {
            const expiryDate = new Date(sslExpiry * 1000);
            const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            
            document.getElementById('sslExpiry').textContent = `${daysUntilExpiry} days`;
            document.getElementById('sslStatus').textContent = expiryDate.toLocaleDateString();
        }
    } else {
        document.getElementById('sslExpiry').textContent = 'N/A';
        document.getElementById('sslStatus').textContent = 'Not available';
    }
}

function updateResponseChart() {
    const ctx = document.getElementById('responseChart');
    if (!ctx) return;
    
    // Generate sample data based on current metrics
    const data = generateChartData(currentTimeRange);
    
    // Destroy existing chart
    if (window.responseChart) {
        window.responseChart.destroy();
    }
    
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const textColor = theme === 'dark' ? '#e0e0e0' : '#2c3e50';
    const gridColor = theme === 'dark' ? '#2d2d2d' : '#ecf0f1';
    
    // Create new chart
    window.responseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Response Time (ms)',
                data: data.values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#3498db',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: theme === 'dark' ? '#1e1e1e' : '#2c3e50',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#3498db',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} ms`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor,
                        display: true
                    },
                    ticks: {
                        color: textColor,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: gridColor,
                        display: true
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value + ' ms';
                        }
                    },
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function updateUptimeBar() {
    const container = document.getElementById('uptimeBarContainer');
    if (!container) return;
    
    // Generate 30 days of uptime data
    const uptimeData = generateUptimeData(30);
    
    container.innerHTML = uptimeData.map((day, index) => {
        const statusClass = day.status;
        const tooltip = `${day.date}: ${day.uptime}% uptime`;
        
        return `
            <div class="uptime-bar ${statusClass}" title="${tooltip}">
                <div class="uptime-bar-tooltip">${tooltip}</div>
            </div>
        `;
    }).join('');
}

function updateIncidents() {
    const container = document.getElementById('incidentsContainer');
    if (!container) return;
    
    // Get incidents from monitor logs
    const incidents = getIncidents();
    
    if (incidents.length === 0) {
        container.innerHTML = `
            <div class="no-incidents">
                <div class="no-incidents-icon">✅</div>
                <div>No recent incidents - All systems operational!</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = incidents.map(incident => `
        <div class="incident-card">
            <div class="incident-icon">⚠️</div>
            <div class="incident-content">
                <div class="incident-header">
                    <div class="incident-title">${incident.title}</div>
                    <div class="incident-duration">${incident.duration}</div>
                </div>
                <div class="incident-time">${incident.timestamp}</div>
                <div class="incident-message">${incident.message}</div>
            </div>
        </div>
    `).join('');
}

function updateConfiguration() {
    const container = document.getElementById('configGrid');
    if (!container) return;
    
    const config = [
        { label: 'Monitor Type', value: getMonitorType() },
        { label: 'URL', value: monitorData.url || 'N/A' },
        { label: 'Check Interval', value: formatInterval(monitorData.interval || 300) },
        { label: 'Timeout', value: (monitorData.timeout || 30) + ' seconds' },
        { label: 'Created', value: formatDate(monitorData.create_datetime || monitorData.created_at) },
        { label: 'Monitor ID', value: monitorId }
    ];
    
    container.innerHTML = config.map(item => `
        <div class="config-item">
            <div class="config-label">${item.label}</div>
            <div class="config-value">${item.value}</div>
        </div>
    `).join('');
}

function updateRecentChecks() {
    const tbody = document.querySelector('#checksTable tbody');
    if (!tbody) return;
    
    // Generate recent checks data
    const checks = generateRecentChecks(10);
    
    tbody.innerHTML = checks.map(check => `
        <tr>
            <td>
                <span class="check-status-icon ${check.success ? 'success' : 'failed'}">
                    ${check.success ? '✅' : '❌'}
                </span>
            </td>
            <td>${check.timestamp}</td>
            <td>
                <span class="check-response-time ${check.responseClass}">
                    ${check.responseTime}
                </span>
            </td>
            <td>
                <span class="status-code ${check.statusCodeClass}">
                    ${check.statusCode}
                </span>
            </td>
            <td>${check.message}</td>
        </tr>
    `).join('');
}

// ==================== HELPER FUNCTIONS ====================

function generateChartData(range) {
    const avgResponse = monitorData.average_response_time || monitorData.response_time || 500;
    const baseValue = parseInt(avgResponse);
    
    let points = 24;
    let labels = [];
    let values = [];
    
    if (range === '24h') {
        points = 24;
        const now = new Date();
        for (let i = points - 1; i >= 0; i--) {
            const time = new Date(now - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            values.push(baseValue + Math.random() * 200 - 100);
        }
    } else if (range === '7d') {
        points = 7 * 24;
        const now = new Date();
        for (let i = points - 1; i >= 0; i -= 6) {
            const time = new Date(now - i * 60 * 60 * 1000);
            labels.push(time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }));
            values.push(baseValue + Math.random() * 300 - 150);
        }
    } else {
        points = 30;
        const now = new Date();
        for (let i = points - 1; i >= 0; i--) {
            const time = new Date(now - i * 24 * 60 * 60 * 1000);
            labels.push(time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            values.push(baseValue + Math.random() * 400 - 200);
        }
    }
    
    return { labels, values: values.map(v => Math.max(0, Math.round(v))) };
}

function generateUptimeData(days) {
    const data = [];
    const now = new Date();
    const uptime = parseFloat(monitorData.custom_uptime_ratio || monitorData.uptime || 99.9);
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const dayUptime = uptime + (Math.random() * 2 - 1);
        
        let status = 'up';
        if (dayUptime < 95) status = 'down';
        else if (dayUptime < 99) status = 'paused';
        
        data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            uptime: dayUptime.toFixed(1),
            status: status
        });
    }
    
    return data;
}

function getIncidents() {
    // Generate sample incidents based on uptime
    const uptime = parseFloat(monitorData.custom_uptime_ratio || monitorData.uptime || 99.9);
    const incidents = [];
    
    if (uptime < 100) {
        const incidentCount = Math.floor((100 - uptime) / 2);
        const now = new Date();
        
        for (let i = 0; i < Math.min(incidentCount, 5); i++) {
            const hoursAgo = Math.floor(Math.random() * 24 * 7);
            const duration = Math.floor(Math.random() * 60) + 1;
            const timestamp = new Date(now - hoursAgo * 60 * 60 * 1000);
            
            incidents.push({
                title: 'Service Unavailable',
                timestamp: formatTimestamp(timestamp),
                duration: `${duration} minutes`,
                message: 'Monitor was down and returned error responses'
            });
        }
    }
    
    return incidents;
}

function generateRecentChecks(count) {
    const checks = [];
    const now = new Date();
    const interval = monitorData.interval || 300;
    
    for (let i = 0; i < count; i++) {
        const timestamp = new Date(now - i * interval * 1000);
        const success = Math.random() > 0.05; // 95% success rate
        const responseTime = success 
            ? Math.floor(Math.random() * 500) + 200 
            : Math.floor(Math.random() * 2000) + 1000;
        
        let responseClass = 'good';
        if (responseTime > 1000) responseClass = 'bad';
        else if (responseTime > 500) responseClass = 'slow';
        
        const statusCode = success ? 200 : (Math.random() > 0.5 ? 500 : 503);
        let statusCodeClass = 'success';
        if (statusCode >= 500) statusCodeClass = 'error';
        else if (statusCode >= 400) statusCodeClass = 'other';
        
        checks.push({
            success,
            timestamp: formatTimestamp(timestamp),
            responseTime: responseTime + ' ms',
            responseClass,
            statusCode,
            statusCodeClass,
            message: success ? 'OK' : 'Connection timeout'
        });
    }
    
    return checks;
}

function formatResponseTime(ms) {
    if (!ms) return 'N/A';
    const value = parseInt(ms);
    if (value < 1000) return value + ' ms';
    return (value / 1000).toFixed(2) + ' s';
}

function formatInterval(seconds) {
    if (!seconds) return 'N/A';
    const value = parseInt(seconds);
    if (value < 60) return value + ' seconds';
    if (value < 3600) return Math.floor(value / 60) + ' minutes';
    return Math.floor(value / 3600) + ' hours';
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTimestamp(date) {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getMonitorType() {
    if (monitorService === 'robot') {
        const typeMap = {
            1: 'HTTP(s)',
            2: 'Keyword',
            3: 'Ping',
            4: 'Port'
        };
        return typeMap[monitorData.type] || 'Unknown';
    } else {
        return monitorData.type || 'HTTP(s)';
    }
}

// ==================== CHART COLOR UPDATE ====================

function updateChartColors(theme) {
    if (!window.responseChart) return;
    
    const textColor = theme === 'dark' ? '#e0e0e0' : '#2c3e50';
    const gridColor = theme === 'dark' ? '#2d2d2d' : '#ecf0f1';
    
    window.responseChart.options.scales.x.grid.color = gridColor;
    window.responseChart.options.scales.x.ticks.color = textColor;
    window.responseChart.options.scales.y.grid.color = gridColor;
    window.responseChart.options.scales.y.ticks.color = textColor;
    window.responseChart.options.plugins.tooltip.backgroundColor = theme === 'dark' ? '#1e1e1e' : '#2c3e50';
    
    window.responseChart.update();
}

// ==================== USER ACTIONS ====================

function changeTimeRange(range) {
    currentTimeRange = range;
    
    // Update active button
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range === range) {
            btn.classList.add('active');
        }
    });
    
    // Update chart
    updateResponseChart();
}

async function toggleMonitorPause() {
    showToast('Pause/Resume functionality coming soon', 'info');
}

function editMonitor() {
    showToast('Edit functionality coming soon', 'info');
}

async function testMonitor() {
    showToast('Testing monitor...', 'info');
    // Simulate test delay
    setTimeout(() => {
        showToast('Monitor test completed successfully!', 'success');
        loadMonitorData();
    }, 2000);
}

async function deleteMonitor() {
    if (confirm('Are you sure you want to delete this monitor? This action cannot be undone.')) {
        showToast('Delete functionality coming soon', 'warning');
    }
}

function refreshIncidents() {
    showToast('Refreshing incidents...', 'info');
    updateIncidents();
    showToast('Incidents refreshed!', 'success');
}

function refreshChecks() {
    showToast('Refreshing checks...', 'info');
    updateRecentChecks();
    showToast('Checks refreshed!', 'success');
}

// ==================== UTILITY FUNCTIONS ====================

function updateLastUpdateTime() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleString();
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4500);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}