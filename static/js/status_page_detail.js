// Status Page Detail JavaScript
// Handles display and management of individual status pages and their monitors

let currentService = null;
let currentPageId = null;
let statusPageData = null;
let statusPageMonitors = [];
let availableMonitors = [];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // Get service and page ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentService = urlParams.get('service');
    currentPageId = urlParams.get('id');

    if (!currentService || !currentPageId) {
        showToast('Invalid status page parameters', 'error');
        setTimeout(() => {
            window.location.href = '/status-pages';
        }, 2000);
        return;
    }

    // Load status page details
    loadStatusPageDetails();
});

// ==================== LOAD STATUS PAGE DETAILS ====================

async function loadStatusPageDetails() {
    try {
        // Load status page info
        await loadStatusPageInfo();
        
        // Load monitors on this status page
        await loadStatusPageMonitors();
        
        // Update statistics
        updateStatistics();
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading status page details:', error);
        showToast('Failed to load status page details', 'error');
    }
}

async function loadStatusPageInfo() {
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    const infoGrid = document.getElementById('pageInfoGrid');
    const pageIdEl = document.getElementById('pageId');
    const pageServiceEl = document.getElementById('pageService');

    try {
        let response;
        if (currentService === 'robot') {
            response = await fetch(`/api/uptime-robot/status-page/${currentPageId}`);
        } else if (currentService === 'kuma') {
            response = await fetch(`/api/uptime-kuma/status-page/${currentPageId}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        statusPageData = data.status_page;

        // Update header
        if (currentService === 'robot') {
            titleEl.textContent = `📄 ${statusPageData.friendly_name}`;
            subtitleEl.textContent = statusPageData.custom_domain || `Standard Uptime Robot Status Page`;
        } else {
            titleEl.textContent = `📄 ${statusPageData.title}`;
            subtitleEl.textContent = statusPageData.description || 'Uptime Kuma Status Page';
        }

        // Update page info
        pageIdEl.textContent = currentPageId;
        pageServiceEl.textContent = currentService === 'robot' ? 'Uptime Robot' : 'Uptime Kuma';

        // Display info grid
        infoGrid.innerHTML = renderStatusPageInfo();

        // Update public page button
        updatePublicPageButton();

    } catch (error) {
        console.error('Error loading status page info:', error);
        infoGrid.innerHTML = '<div class="error-message">Failed to load status page information</div>';
        showToast('Failed to load status page information', 'error');
    }
}

function renderStatusPageInfo() {
    if (currentService === 'robot') {
        const pageUrl = statusPageData.custom_domain || 
                       `https://stats.uptimerobot.com/${statusPageData.standard_url || statusPageData.id}`;
        
        return `
            <div class="info-item">
                <div class="info-label">Page Name</div>
                <div class="info-value">${escapeHtml(statusPageData.friendly_name)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Public URL</div>
                <div class="info-value">
                    <a href="${pageUrl}" target="_blank">${pageUrl}</a>
                </div>
            </div>
            ${statusPageData.custom_domain ? `
                <div class="info-item">
                    <div class="info-label">Custom Domain</div>
                    <div class="info-value">✓ Enabled</div>
                </div>
            ` : ''}
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">${statusPageData.status === 1 ? '✓ Active' : '✗ Paused'}</div>
            </div>
        `;
    } else {
        const pageUrl = statusPageData.url || `${window.location.origin}/status/${statusPageData.slug}`;
        
        return `
            <div class="info-item">
                <div class="info-label">Page Title</div>
                <div class="info-value">${escapeHtml(statusPageData.title)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Slug</div>
                <div class="info-value">${escapeHtml(statusPageData.slug)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Public URL</div>
                <div class="info-value">
                    <a href="${pageUrl}" target="_blank">${pageUrl}</a>
                </div>
            </div>
            ${statusPageData.description ? `
                <div class="info-item">
                    <div class="info-label">Description</div>
                    <div class="info-value">${escapeHtml(statusPageData.description)}</div>
                </div>
            ` : ''}
        `;
    }
}

async function loadStatusPageMonitors() {
    const container = document.getElementById('monitorsContainer');

    try {
        let response;
        if (currentService === 'robot') {
            response = await fetch(`/api/uptime-robot/status-page/${currentPageId}/monitors`);
        } else if (currentService === 'kuma') {
            response = await fetch(`/api/uptime-kuma/status-page/${currentPageId}/monitors`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        statusPageMonitors = data.monitors || [];

        if (statusPageMonitors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-title">No Monitors Yet</div>
                    <div class="empty-state-description">
                        This status page doesn't have any monitors yet. Click the "Add Monitor" button to get started.
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = statusPageMonitors.map(monitor => createMonitorCard(monitor)).join('');
        }

    } catch (error) {
        console.error('Error loading status page monitors:', error);
        container.innerHTML = '<div class="error-message">Failed to load monitors</div>';
        showToast('Failed to load monitors', 'error');
    }
}

function createMonitorCard(monitor) {
    const status = getMonitorStatus(monitor);
    const uptime = getMonitorUptime(monitor);
    const responseTime = getMonitorResponseTime(monitor);

    return `
        <div class="monitor-card-detail" onclick="viewMonitorDetail('${currentService}', ${monitor.id})">
            <div class="monitor-card-header">
                <div class="monitor-card-title">${escapeHtml(monitor.friendly_name || monitor.name)}</div>
                <div class="monitor-status-indicator ${status.class}">
                    ${status.icon} ${status.text}
                </div>
            </div>
            <div class="monitor-card-url">${escapeHtml(monitor.url || 'N/A')}</div>
            <div class="monitor-card-metrics">
                <div class="monitor-metric">
                    <div class="monitor-metric-label">Uptime</div>
                    <div class="monitor-metric-value ${uptime >= 99 ? 'good' : uptime >= 95 ? 'warning' : 'bad'}">
                        ${uptime}%
                    </div>
                </div>
                <div class="monitor-metric">
                    <div class="monitor-metric-label">Response</div>
                    <div class="monitor-metric-value ${responseTime < 500 ? 'good' : responseTime < 1000 ? 'warning' : 'bad'}">
                        ${responseTime}ms
                    </div>
                </div>
            </div>
            <div class="monitor-card-actions" onclick="event.stopPropagation()">
                <button class="monitor-action-btn" onclick="removeMonitorFromPage(${monitor.id})">
                    Remove
                </button>
                <button class="monitor-action-btn" onclick="viewMonitorDetail('${currentService}', ${monitor.id})">
                    View Details
                </button>
            </div>
        </div>
    `;
}

function getMonitorStatus(monitor) {
    if (currentService === 'robot') {
        switch(monitor.status) {
            case 2: return { class: 'up', icon: '✓', text: 'Up' };
            case 9: return { class: 'down', icon: '✗', text: 'Down' };
            case 0: return { class: 'paused', icon: '⏸️', text: 'Paused' };
            default: return { class: 'pending', icon: '⏳', text: 'Pending' };
        }
    } else {
        if (monitor.active === 0) return { class: 'paused', icon: '⏸️', text: 'Paused' };
        return { class: 'up', icon: '✓', text: 'Up' };
    }
}

function getMonitorUptime(monitor) {
    if (currentService === 'robot') {
        return monitor.custom_uptime_ratio || monitor.average_response_time || '99.9';
    } else {
        return monitor.uptime || '99.9';
    }
}

function getMonitorResponseTime(monitor) {
    if (currentService === 'robot') {
        return monitor.average_response_time || 0;
    } else {
        return monitor.avg_ping || 0;
    }
}

// ==================== STATISTICS ====================

function updateStatistics() {
    let total = statusPageMonitors.length;
    let operational = 0;
    let down = 0;
    let paused = 0;
    let totalUptime = 0;
    let totalResponse = 0;

    statusPageMonitors.forEach(monitor => {
        const status = getMonitorStatus(monitor);
        if (status.class === 'up') operational++;
        else if (status.class === 'down') down++;
        else if (status.class === 'paused') paused++;

        totalUptime += parseFloat(getMonitorUptime(monitor)) || 0;
        totalResponse += parseFloat(getMonitorResponseTime(monitor)) || 0;
    });

    document.getElementById('totalMonitors').textContent = total;
    document.getElementById('operationalMonitors').textContent = operational;
    document.getElementById('downMonitors').textContent = down;
    document.getElementById('pausedMonitors').textContent = paused;
    
    const avgUptime = total > 0 ? (totalUptime / total).toFixed(2) : '--';
    const avgResponse = total > 0 ? Math.round(totalResponse / total) : '--';
    
    document.getElementById('avgUptime').textContent = avgUptime === '--' ? '--' : avgUptime + '%';
    document.getElementById('avgResponse').textContent = avgResponse === '--' ? '--' : avgResponse + 'ms';
}

// ==================== ACTIONS ====================

function updatePublicPageButton() {
    const btn = document.getElementById('viewPublicBtn');
    if (!btn) return;

    let pageUrl;
    if (currentService === 'robot') {
        pageUrl = statusPageData.custom_domain || 
                 `https://stats.uptimerobot.com/${statusPageData.standard_url || statusPageData.id}`;
    } else {
        pageUrl = statusPageData.url || `${window.location.origin}/status/${statusPageData.slug}`;
    }

    btn.setAttribute('data-url', pageUrl);
}

function viewPublicPage() {
    const btn = document.getElementById('viewPublicBtn');
    const url = btn.getAttribute('data-url');
    if (url) {
        window.open(url, '_blank');
    }
}

function viewMonitorDetail(service, monitorId) {
    window.location.href = `/monitor-detail?service=${service}&id=${monitorId}`;
}

// ==================== ADD MONITOR TO STATUS PAGE ====================

async function openAddMonitorModal() {
    const modal = document.getElementById('addMonitorModal');
    const container = document.getElementById('availableMonitorsContainer');
    
    container.innerHTML = '<div class="loading">Loading available monitors...</div>';
    openModal('addMonitorModal');

    try {
        let response;
        if (currentService === 'robot') {
            response = await fetch('/api/uptime-robot/monitors');
        } else {
            response = await fetch('/api/uptime-kuma/monitors');
        }

        const data = await response.json();

        if (data.error || !data.monitors) {
            throw new Error(data.error || 'No monitors available');
        }

        // Filter out monitors already on this status page
        const currentMonitorIds = statusPageMonitors.map(m => m.id);
        availableMonitors = data.monitors.filter(m => !currentMonitorIds.includes(m.id));

        if (availableMonitors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✓</div>
                    <div class="empty-state-title">All monitors added</div>
                    <div class="empty-state-description">
                        All available monitors are already on this status page.
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = availableMonitors.map(monitor => `
                <div class="available-monitor-item" onclick="toggleMonitorSelection(${monitor.id})">
                    <div class="available-monitor-checkbox">
                        <input type="checkbox" id="monitor-${monitor.id}" value="${monitor.id}" 
                               onclick="event.stopPropagation(); toggleMonitorSelection(${monitor.id})">
                        <div class="available-monitor-info">
                            <div class="available-monitor-name">
                                ${escapeHtml(monitor.friendly_name || monitor.name)}
                            </div>
                            <div class="available-monitor-url">
                                ${escapeHtml(monitor.url || 'N/A')}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading available monitors:', error);
        container.innerHTML = '<div class="error-message">Failed to load available monitors</div>';
        showToast('Failed to load available monitors', 'error');
    }
}

function toggleMonitorSelection(monitorId) {
    const checkbox = document.getElementById(`monitor-${monitorId}`);
    const item = checkbox.closest('.available-monitor-item');
    
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        item.classList.add('selected');
    } else {
        item.classList.remove('selected');
    }
}

async function confirmAddMonitors() {
    const selectedCheckboxes = document.querySelectorAll('#availableMonitorsContainer input[type="checkbox"]:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
        showToast('Please select at least one monitor', 'warning');
        return;
    }

    try {
        let response;
        if (currentService === 'robot') {
            response = await fetch(`/api/uptime-robot/status-page/${currentPageId}/add-monitors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitor_ids: selectedIds })
            });
        } else {
            response = await fetch(`/api/uptime-kuma/status-page/${currentPageId}/add-monitors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitor_ids: selectedIds })
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast(`Successfully added ${selectedIds.length} monitor(s)`, 'success');
            closeModal('addMonitorModal');
            await loadStatusPageMonitors();
            updateStatistics();
        } else {
            throw new Error(data.error || 'Failed to add monitors');
        }

    } catch (error) {
        console.error('Error adding monitors:', error);
        showToast('Failed to add monitors to status page', 'error');
    }
}

async function removeMonitorFromPage(monitorId) {
    if (!confirm('Are you sure you want to remove this monitor from the status page?')) {
        return;
    }

    try {
        let response;
        if (currentService === 'robot') {
            response = await fetch(`/api/uptime-robot/status-page/${currentPageId}/remove-monitor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitor_id: monitorId })
            });
        } else {
            response = await fetch(`/api/uptime-kuma/status-page/${currentPageId}/remove-monitor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitor_id: monitorId })
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast('Monitor removed successfully', 'success');
            await loadStatusPageMonitors();
            updateStatistics();
        } else {
            throw new Error(data.error || 'Failed to remove monitor');
        }

    } catch (error) {
        console.error('Error removing monitor:', error);
        showToast('Failed to remove monitor from status page', 'error');
    }
}

// ==================== DELETE STATUS PAGE ====================

function deleteStatusPage() {
    const pageName = currentService === 'robot' ? 
                    statusPageData.friendly_name : 
                    statusPageData.title;
    
    document.getElementById('deletePageName').textContent = pageName;
    openModal('deleteStatusPageModal');
}

async function confirmDeleteStatusPage() {
    try {
        let response;
        if (currentService === 'robot') {
            response = await fetch('/api/uptime-robot/status-page/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(currentPageId) })
            });
        } else {
            response = await fetch('/api/uptime-kuma/status-page/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: currentPageId })
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast('Status page deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = '/status-pages';
            }, 1500);
        } else {
            throw new Error(data.error || 'Failed to delete status page');
        }

    } catch (error) {
        console.error('Error deleting status page:', error);
        showToast('Failed to delete status page', 'error');
    }
}

// ==================== REFRESH ====================

async function refreshMonitors() {
    showToast('Refreshing monitors...', 'info');
    await loadStatusPageMonitors();
    updateStatistics();
    showToast('Monitors refreshed!', 'success');
}

// ==================== UTILITY FUNCTIONS ====================

function updateLastUpdateTime() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleString();
    }
}

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};