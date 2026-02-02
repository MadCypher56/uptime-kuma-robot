// Dashboard JavaScript with CRUD Operations, Detail View Links, and Enhanced Monitor Type Support

// Global variables
let currentService = null; // 'robot' or 'kuma'
let deleteMonitorId = null;

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

// ==================== CONFIGURATION STATUS ====================

async function checkConfigStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        const robotStatus = document.getElementById('robotStatus');
        const kumaStatus = document.getElementById('kumaStatus');
        
        if (data.uptime_robot_configured) {
            robotStatus.textContent = 'Configured ✓';
            robotStatus.className = 'status-badge configured';
        } else {
            robotStatus.textContent = 'Not Configured ✗';
            robotStatus.className = 'status-badge not-configured';
        }
        
        if (data.uptime_kuma_configured) {
            kumaStatus.textContent = 'Configured ✓';
            kumaStatus.className = 'status-badge configured';
        } else {
            kumaStatus.textContent = 'Not Configured ✗';
            kumaStatus.className = 'status-badge not-configured';
        }
    } catch (error) {
        console.error('Error checking config status:', error);
        showToast('Failed to check configuration status', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatUptime(uptime) {
    if (!uptime || uptime === 'N/A') return 'N/A';
    return `${uptime}%`;
}

function getUptimeRobotStatus(status) {
    const statusMap = {
        0: { text: 'Paused', class: 'paused' },
        1: { text: 'Not Checked', class: 'paused' },
        2: { text: 'Up', class: 'up' },
        8: { text: 'Seems Down', class: 'down' },
        9: { text: 'Down', class: 'down' }
    };
    return statusMap[status] || { text: 'Unknown', class: 'paused' };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'");
}

function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

function viewMonitorDetail(service, monitorId) {
    window.location.href = `/monitor-detail?service=${service}&id=${monitorId}`;
}

// ==================== LOAD MONITORS ====================

async function loadUptimeRobotMonitors() {
    const container = document.getElementById('uptimeRobotMonitors');
    
    try {
        const response = await fetch('/api/uptime-robot/monitors');
        const data = await response.json();
        
        if (data.error) {
            container.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }
        
        if (data.monitors.length === 0) {
            container.innerHTML = '<div class="loading">No monitors found. Click "Add Monitor" to create one.</div>';
            return;
        }
        
        container.innerHTML = '';
        data.monitors.forEach(monitor => {
            const status = getUptimeRobotStatus(monitor.status);
            
            const card = document.createElement('div');
            card.className = 'monitor-card';
            card.style.cursor = 'pointer';
            
            card.innerHTML = `
                <div class="monitor-actions">
                    <button class="action-btn edit-icon" onclick="event.stopPropagation(); openEditMonitor('robot', ${monitor.id}, '${escapeHtml(monitor.name)}', '${escapeHtml(monitor.url)}')" title="Edit">
                        ✏️
                    </button>
                    <button class="action-btn delete-icon" onclick="event.stopPropagation(); openDeleteMonitor('robot', ${monitor.id}, '${escapeHtml(monitor.name)}')" title="Delete">
                        🗑️
                    </button>
                </div>
                <div class="monitor-header">
                    <div class="monitor-name">${monitor.name}</div>
                    <div class="monitor-status ${status.class}">${status.text}</div>
                </div>
                <div class="monitor-url">${monitor.url || 'N/A'}</div>
                <div class="monitor-stats">
                    <div class="stat-item">
                        <div class="stat-label">Uptime (24h)</div>
                        <div class="stat-value">${formatUptime(monitor.uptime_ratio?.split('-')[0])}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Uptime (30d)</div>
                        <div class="stat-value">${formatUptime(monitor.uptime_ratio?.split('-')[2])}</div>
                    </div>
                </div>
                <div class="monitor-stats">
                    <div class="stat-item">
                        <div class="stat-label">Response Time</div>
                        <div class="stat-value">${monitor.response_time !== 'N/A' ? monitor.response_time + 'ms' : 'N/A'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Type</div>
                        <div class="stat-value">${getMonitorTypeName(monitor.type)}</div>
                    </div>
                </div>
                <div class="monitor-detail-hint">Click for detailed metrics →</div>
            `;
            
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.action-btn')) {
                    viewMonitorDetail('robot', monitor.id);
                }
            });
            
            container.appendChild(card);
        });
        
        updateLastUpdateTime();
    } catch (error) {
        container.innerHTML = `<div class="error-message">Error loading monitors: ${error.message}</div>`;
        showToast('Failed to load Uptime Robot monitors', 'error');
    }
}

async function loadUptimeKumaMonitors() {
    const container = document.getElementById('uptimeKumaMonitors');
    
    try {
        const response = await fetch('/api/uptime-kuma/monitors');
        const data = await response.json();
        
        if (data.error) {
            container.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }
        
        if (data.monitors.length === 0) {
            container.innerHTML = '<div class="loading">No monitors found. Click "Add Monitor" to create one.</div>';
            return;
        }
        
        container.innerHTML = '';
        data.monitors.forEach(monitor => {
            const status = monitor.status 
                ? { text: 'Up', class: 'up' } 
                : { text: 'Down', class: 'down' };
            
            const card = document.createElement('div');
            card.className = 'monitor-card';
            card.style.cursor = 'pointer';
            
            card.innerHTML = `
                <div class="monitor-actions">
                    <button class="action-btn edit-icon" onclick="event.stopPropagation(); openEditMonitor('kuma', ${monitor.id}, '${escapeHtml(monitor.name)}', '${escapeHtml(monitor.url)}')" title="Edit">
                        ✏️
                    </button>
                    <button class="action-btn delete-icon" onclick="event.stopPropagation(); openDeleteMonitor('kuma', ${monitor.id}, '${escapeHtml(monitor.name)}')" title="Delete">
                        🗑️
                    </button>
                </div>
                <div class="monitor-header">
                    <div class="monitor-name">${monitor.name}</div>
                    <div class="monitor-status ${status.class}">${status.text}</div>
                </div>
                <div class="monitor-url">${monitor.url || monitor.hostname || 'N/A'}</div>
                <div class="monitor-stats">
                    <div class="stat-item">
                        <div class="stat-label">Uptime (24h)</div>
                        <div class="stat-value">${formatUptime(monitor.uptime_24h)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Uptime (30d)</div>
                        <div class="stat-value">${formatUptime(monitor.uptime_30d)}</div>
                    </div>
                </div>
                <div class="monitor-stats">
                    <div class="stat-item">
                        <div class="stat-label">Response Time</div>
                        <div class="stat-value">${monitor.response_time !== 'N/A' ? monitor.response_time + 'ms' : 'N/A'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Response</div>
                        <div class="stat-value">${monitor.avg_response_time !== 'N/A' ? monitor.avg_response_time + 'ms' : 'N/A'}</div>
                    </div>
                </div>
                <div class="monitor-detail-hint">Click for detailed metrics →</div>
            `;
            
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.action-btn')) {
                    viewMonitorDetail('kuma', monitor.id);
                }
            });
            
            container.appendChild(card);
        });
        
        updateLastUpdateTime();
    } catch (error) {
        container.innerHTML = `<div class="error-message">Error loading monitors: ${error.message}</div>`;
        showToast('Failed to load Uptime Kuma monitors', 'error');
    }
}

function refreshUptimeRobot() {
    loadUptimeRobotMonitors();
}

function refreshUptimeKuma() {
    loadUptimeKumaMonitors();
}

function refreshAll() {
    refreshUptimeRobot();
    refreshUptimeKuma();
}

function getMonitorTypeName(type) {
    const typeMap = {
        1: 'HTTP(s)',
        2: 'Keyword',
        3: 'Ping',
        4: 'Port'
    };
    return typeMap[type] || 'Unknown';
}

// ==================== MODAL FUNCTIONS ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ==================== ADD MONITOR - ENHANCED WITH DYNAMIC FIELDS ====================

function openAddMonitorModal(service) {
    currentService = service;
    const modalTitle = service === 'robot' ? 'Add Uptime Robot Monitor' : 'Add Uptime Kuma Monitor';
    document.getElementById('modalTitle').textContent = modalTitle;
    
    // Reset form and show default fields
    document.getElementById('addMonitorForm').reset();
    document.getElementById('monitorType').value = '1'; // Default to HTTP
    handleMonitorTypeChange(); // Show correct fields
    
    openModal('addMonitorModal');
}

// Handle monitor type changes to show/hide relevant fields
function handleMonitorTypeChange() {
    const type = document.getElementById('monitorType').value;
    const urlField = document.getElementById('urlField');
    const hostnameField = document.getElementById('hostnameField');
    const portField = document.getElementById('portField');
    const keywordField = document.getElementById('keywordField');
    const urlInput = document.getElementById('monitorUrl');
    const hostnameInput = document.getElementById('monitorHostname');
    const portInput = document.getElementById('monitorPort');
    const keywordInput = document.getElementById('monitorKeyword');
    
    // Reset all fields
    urlField.style.display = 'none';
    hostnameField.style.display = 'none';
    portField.style.display = 'none';
    keywordField.style.display = 'none';
    urlInput.removeAttribute('required');
    hostnameInput.removeAttribute('required');
    portInput.removeAttribute('required');
    keywordInput.removeAttribute('required');
    
    switch(type) {
        case '1': // HTTP(s)
            urlField.style.display = 'block';
            urlInput.setAttribute('required', 'required');
            break;
        case '2': // Keyword
            urlField.style.display = 'block';
            keywordField.style.display = 'block';
            urlInput.setAttribute('required', 'required');
            keywordInput.setAttribute('required', 'required');
            break;
        case '3': // Ping
            hostnameField.style.display = 'block';
            hostnameInput.setAttribute('required', 'required');
            break;
        case '4': // Port
            hostnameField.style.display = 'block';
            portField.style.display = 'block';
            hostnameInput.setAttribute('required', 'required');
            portInput.setAttribute('required', 'required');
            break;
    }
}

// Map monitor type values to Uptime Kuma type strings
function getKumaMonitorType(typeValue) {
    const typeMap = {
        '1': 'http',
        '2': 'keyword',
        '3': 'ping',
        '4': 'port'
    };
    return typeMap[typeValue] || 'http';
}

// Handle add monitor form submission - ENHANCED VERSION
document.getElementById('addMonitorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('monitorName').value;
    const type = document.getElementById('monitorType').value;
    const interval = document.getElementById('monitorInterval').value;
    
    // Build payload based on monitor type
    let payload;
    
    if (currentService === 'robot') {
        // Uptime Robot payload
        payload = {
            friendly_name: name,
            type: parseInt(type),
            interval: parseInt(interval)
        };
        
        // Add type-specific fields
        switch(type) {
            case '1': // HTTP(s)
                payload.url = document.getElementById('monitorUrl').value;
                break;
            case '2': // Keyword
                payload.url = document.getElementById('monitorUrl').value;
                payload.keyword_value = document.getElementById('monitorKeyword').value;
                payload.keyword_type = 1; // Exists
                break;
            case '3': // Ping
                payload.url = document.getElementById('monitorHostname').value;
                break;
            case '4': // Port
                const hostname = document.getElementById('monitorHostname').value;
                const port = document.getElementById('monitorPort').value;
                payload.url = hostname;
                payload.sub_type = 1; // Custom port
                payload.port = parseInt(port);
                break;
        }
    } else {
        // Uptime Kuma payload
        payload = {
            name: name,
            type: getKumaMonitorType(type),
            interval: parseInt(interval)
        };
        
        // Add type-specific fields for Kuma
        switch(type) {
            case '1': // HTTP
                payload.url = document.getElementById('monitorUrl').value;
                break;
            case '2': // Keyword
                payload.url = document.getElementById('monitorUrl').value;
                payload.keyword = document.getElementById('monitorKeyword').value;
                break;
            case '3': // Ping
                payload.hostname = document.getElementById('monitorHostname').value;
                break;
            case '4': // Port
                payload.hostname = document.getElementById('monitorHostname').value;
                payload.port = parseInt(document.getElementById('monitorPort').value);
                break;
        }
    }
    
    const endpoint = currentService === 'robot' 
        ? '/api/uptime-robot/monitor/add' 
        : '/api/uptime-kuma/monitor/add';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor added successfully', 'success');
            closeModal('addMonitorModal');
            document.getElementById('addMonitorForm').reset();
            
            // Refresh appropriate section
            if (currentService === 'robot') {
                refreshUptimeRobot();
            } else {
                refreshUptimeKuma();
            }
        } else {
            showToast(data.error || 'Failed to add monitor', 'error');
        }
    } catch (error) {
        showToast('Error adding monitor: ' + error.message, 'error');
    }
});

// ==================== EDIT MONITOR ====================

function openEditMonitor(service, id, name, url) {
    currentService = service;
    deleteMonitorId = id;
    
    document.getElementById('editMonitorId').value = id;
    document.getElementById('editMonitorName').value = name;
    document.getElementById('editMonitorUrl').value = url;
    
    openModal('editMonitorModal');
}

document.getElementById('editMonitorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('editMonitorId').value;
    const name = document.getElementById('editMonitorName').value;
    const url = document.getElementById('editMonitorUrl').value;
    const interval = document.getElementById('editMonitorInterval').value;
    
    const endpoint = currentService === 'robot' 
        ? '/api/uptime-robot/monitor/edit' 
        : '/api/uptime-kuma/monitor/edit';
    
    const payload = {
        id: parseInt(id),
        friendly_name: name,
        name: name,
        url: url
    };
    
    if (interval) {
        payload.interval = parseInt(interval);
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor updated successfully', 'success');
            closeModal('editMonitorModal');
            
            if (currentService === 'robot') {
                refreshUptimeRobot();
            } else {
                refreshUptimeKuma();
            }
        } else {
            showToast(data.error || 'Failed to update monitor', 'error');
        }
    } catch (error) {
        showToast('Error updating monitor: ' + error.message, 'error');
    }
});

// ==================== DELETE MONITOR ====================

function openDeleteMonitor(service, id, name) {
    currentService = service;
    deleteMonitorId = id;
    
    document.getElementById('deleteMonitorName').textContent = name;
    openModal('deleteMonitorModal');
}

async function confirmDelete() {
    if (!deleteMonitorId) return;
    
    const endpoint = currentService === 'robot'
        ? '/api/uptime-robot/monitor/delete'
        : '/api/uptime-kuma/monitor/delete';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: deleteMonitorId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor deleted successfully', 'success');
            closeModal('deleteMonitorModal');
            
            if (currentService === 'robot') {
                refreshUptimeRobot();
            } else {
                refreshUptimeKuma();
            }
        } else {
            showToast(data.error || 'Failed to delete monitor', 'error');
        }
    } catch (error) {
        showToast('Error deleting monitor: ' + error.message, 'error');
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    checkConfigStatus();
    loadUptimeRobotMonitors();
    loadUptimeKumaMonitors();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadUptimeRobotMonitors();
        loadUptimeKumaMonitors();
    }, 30000);
});