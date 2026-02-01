// Dashboard JavaScript with CRUD Operations and Detail View Links

// Global variables
let currentService = null; // 'robot' or 'kuma'
let deleteMonitorId = null;

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    // Create container if it doesn't exist
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

    // Auto-remove toast after animation completes
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4400); // 4s display + 0.4s fadeOut animation
}

// ==================== CONFIGURATION STATUS ====================

// Check configuration status on load
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

// Format uptime percentage
function formatUptime(uptime) {
    if (!uptime || uptime === 'N/A') return 'N/A';
    return `${uptime}%`;
}

// Get status text for Uptime Robot
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'");
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('lastUpdate').textContent = timeString;
}

// Navigate to monitor detail page
function viewMonitorDetail(service, monitorId) {
    window.location.href = `/monitor-detail?service=${service}&id=${monitorId}`;
}

// ==================== FETCH & DISPLAY MONITORS ====================

// Fetch and display Uptime Robot monitors
async function refreshUptimeRobot() {
    const container = document.getElementById('uptimeRobotMonitors');
    container.innerHTML = '<div class="loading">Loading monitors...</div>';
    
    try {
        const response = await fetch('/api/uptime-robot/monitors');
        const data = await response.json();
        
        if (data.error) {
            container.innerHTML = `<div class="error-message">Error: ${data.error}</div>`;
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
                        <div class="stat-label">Uptime</div>
                        <div class="stat-value">${formatUptime(monitor.uptime_ratio)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Response Time</div>
                        <div class="stat-value">${monitor.response_time !== 'N/A' ? monitor.response_time + 'ms' : 'N/A'}</div>
                    </div>
                </div>
                <div class="monitor-detail-hint">Click for detailed metrics →</div>
            `;
            
            // Add click handler for the entire card
            card.addEventListener('click', function(e) {
                // Don't navigate if clicking on action buttons
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

// Fetch and display Uptime Kuma monitors
async function refreshUptimeKuma() {
    const container = document.getElementById('uptimeKumaMonitors');
    container.innerHTML = '<div class="loading">Loading monitors...</div>';
    
    try {
        const response = await fetch('/api/uptime-kuma/monitors');
        const data = await response.json();
        
        if (data.error) {
            container.innerHTML = `<div class="error-message">Error: ${data.error}</div>`;
            return;
        }
        
        if (data.monitors.length === 0) {
            container.innerHTML = '<div class="loading">No monitors found. Click "Add Monitor" to create one.</div>';
            return;
        }
        
        container.innerHTML = '';
        data.monitors.forEach(monitor => {
            // Determine status based on the actual UP/DOWN state
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
                <div class="monitor-url">${monitor.url || 'N/A'}</div>
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
            
            // Add click handler for the entire card
            card.addEventListener('click', function(e) {
                // Don't navigate if clicking on action buttons
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

// Refresh all monitors
function refreshAll() {
    refreshUptimeRobot();
    refreshUptimeKuma();
}

// ==================== MODAL FUNCTIONS ====================

// Open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ==================== ADD MONITOR ====================

function openAddMonitorModal(service) {
    currentService = service;
    const modalTitle = service === 'robot' ? 'Add Uptime Robot Monitor' : 'Add Uptime Kuma Monitor';
    document.getElementById('modalTitle').textContent = modalTitle;
    openModal('addMonitorModal');
}

// Map monitor type values to Uptime Kuma type strings
function getKumaMonitorType(typeValue) {
    const typeMap = {
        '1': 'http',      // HTTP(s)
        '2': 'keyword',   // Keyword
        '3': 'ping',      // Ping
        '4': 'port'       // Port
    };
    return typeMap[typeValue] || 'http';
}

// Handle add monitor form submission
document.getElementById('addMonitorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('monitorName').value;
    const url = document.getElementById('monitorUrl').value;
    const type = document.getElementById('monitorType').value;
    const interval = document.getElementById('monitorInterval').value;
    
    const endpoint = currentService === 'robot' 
        ? '/api/uptime-robot/monitor/add' 
        : '/api/uptime-kuma/monitor/add';
    
    const payload = currentService === 'robot' 
        ? { friendly_name: name, url, type: parseInt(type), interval: parseInt(interval) }
        : { name, url, type: getKumaMonitorType(type), interval: parseInt(interval) };
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor added successfully!', 'success');
            closeModal('addMonitorModal');
            document.getElementById('addMonitorForm').reset();
            
            // Refresh the appropriate monitor list
            if (currentService === 'robot') {
                refreshUptimeRobot();
            } else {
                refreshUptimeKuma();
            }
        } else {
            showToast(data.error || 'Failed to add monitor', 'error');
        }
    } catch (error) {
        console.error('Error adding monitor:', error);
        showToast('Failed to add monitor', 'error');
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

// Handle edit monitor form submission
document.getElementById('editMonitorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('editMonitorId').value;
    const name = document.getElementById('editMonitorName').value;
    const url = document.getElementById('editMonitorUrl').value;
    const interval = document.getElementById('editMonitorInterval').value;
    
    const endpoint = currentService === 'robot' 
        ? '/api/uptime-robot/monitor/edit' 
        : '/api/uptime-kuma/monitor/edit';
    
    const payload = currentService === 'robot'
        ? { id: parseInt(id), friendly_name: name, url, interval: interval ? parseInt(interval) : undefined }
        : { id: parseInt(id), name, url, interval: interval ? parseInt(interval) : undefined };
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Monitor updated successfully!', 'success');
            closeModal('editMonitorModal');
            
            // Refresh the appropriate monitor list
            if (currentService === 'robot') {
                refreshUptimeRobot();
            } else {
                refreshUptimeKuma();
            }
        } else {
            showToast(data.error || 'Failed to update monitor', 'error');
        }
    } catch (error) {
        console.error('Error updating monitor:', error);
        showToast('Failed to update monitor', 'error');
    }
});

// ==================== DELETE MONITOR ====================

function openDeleteMonitor(service, id, name) {
    currentService = service;
    deleteMonitorId = id;
    document.getElementById('deleteMonitorName').textContent = name;
    openModal('deleteMonitorModal');
}

function confirmDelete() {
    if (!deleteMonitorId) return;
    
    const endpoint = currentService === 'robot' 
        ? '/api/uptime-robot/monitor/delete' 
        : '/api/uptime-kuma/monitor/delete';
    
    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteMonitorId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Monitor deleted successfully!', 'success');
            closeModal('deleteMonitorModal');
            
            // Refresh the appropriate monitor list
            if (currentService === 'robot') {
                refreshUptimeRobot();
            } else {
                refreshUptimeKuma();
            }
        } else {
            showToast(data.error || 'Failed to delete monitor', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting monitor:', error);
        showToast('Failed to delete monitor', 'error');
    });
}

// ==================== INITIALIZATION ====================

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    checkConfigStatus();
    refreshAll();
    
    // Set up auto-refresh every 30 seconds
    setInterval(refreshAll, 30000);
});