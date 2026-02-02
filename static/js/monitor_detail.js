// Monitor Detail Page JavaScript - Simplified Version
// Handles detailed monitor view with working metrics only

let monitorData = null;
let monitorService = null;
let monitorId = null;

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
        updateConfiguration();
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
        // Uptime Kuma - use the status boolean from backend
        if (monitorData.status === true || monitorData.status === 1) {
            status = 'up';
            statusLabel = 'Operational';
        } else if (monitorData.status === false || monitorData.status === 0) {
            status = 'down';
            statusLabel = 'Down';
        } else if (monitorData.active === false || monitorData.active === 0) {
            status = 'paused';
            statusLabel = 'Paused';
        } else {
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
    const uptime24h = monitorData.uptime_24h || monitorData.uptime || 'N/A';
    document.getElementById('uptime24h').textContent = formatUptime(uptime24h);
    
    // Uptime 30d
    const uptime30d = monitorData.uptime_30d || monitorData.uptime || 'N/A';
    document.getElementById('uptime30d').textContent = formatUptime(uptime30d);
    
    // Check Interval
    const interval = monitorData.interval || 300;
    document.getElementById('checkInterval').textContent = formatInterval(interval);
    
    // SSL - Not available in basic API
    document.getElementById('sslExpiry').textContent = 'N/A';
    document.getElementById('sslStatus').textContent = 'Not available';
}

function updateConfiguration() {
    const container = document.getElementById('configGrid');
    if (!container) return;
    
    const config = [
        { label: 'Monitor Type', value: getMonitorType() },
        { label: 'URL/Hostname', value: monitorData.url || 'N/A' },
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

// ==================== UTILITY FUNCTIONS ====================

function formatResponseTime(time) {
    if (!time || time === 'N/A' || time === 0) return 'N/A';
    return `${Math.round(time)} ms`;
}

function formatUptime(uptime) {
    if (!uptime || uptime === 'N/A') return 'N/A';
    if (typeof uptime === 'string' && uptime.includes('%')) return uptime;
    return `${parseFloat(uptime).toFixed(2)}%`;
}

function formatInterval(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
        return dateString;
    }
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
        return (monitorData.type || 'http').toUpperCase();
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

// ==================== MONITOR ACTIONS ====================

async function toggleMonitorPause() {
    if (!confirm('Are you sure you want to ' + (monitorData.status === 0 ? 'resume' : 'pause') + ' this monitor?')) {
        return;
    }
    
    try {
        const endpoint = monitorService === 'robot'
            ? '/api/uptime-robot/monitor/pause'
            : '/api/uptime-kuma/monitor/pause';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: monitorId,
                paused: monitorData.status !== 0
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor status updated', 'success');
            loadMonitorData();
        } else {
            showToast(data.error || 'Failed to update monitor', 'error');
        }
    } catch (error) {
        showToast('Error updating monitor: ' + error.message, 'error');
    }
}

function editMonitor() {
    // Redirect to dashboard with edit mode
    window.location.href = `/?edit=${monitorService}-${monitorId}`;
}

async function testMonitor() {
    showToast('Test check initiated...', 'info');
    // This would require a specific API endpoint which may not be available
    // For now, just refresh the data
    setTimeout(() => loadMonitorData(), 2000);
}

async function deleteMonitor() {
    if (!confirm('Are you sure you want to delete this monitor? This action cannot be undone.')) {
        return;
    }
    
    try {
        const endpoint = monitorService === 'robot'
            ? '/api/uptime-robot/monitor/delete'
            : '/api/uptime-kuma/monitor/delete';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: monitorId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor deleted successfully', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            showToast(data.error || 'Failed to delete monitor', 'error');
        }
    } catch (error) {
        showToast('Error deleting monitor: ' + error.message, 'error');
    }
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4400);
}