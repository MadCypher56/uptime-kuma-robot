// Status Pages Management JavaScript
// Handles status page creation, deletion, and display for both Uptime Robot and Uptime Kuma

let deleteStatusPageData = null;
let availableMonitors = { robot: [], kuma: [] };

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    checkServicesStatus();
    loadAllStatusPages();
    setupEventListeners();
});

function setupEventListeners() {
    // Uptime Robot Status Page Form
    const robotForm = document.getElementById('addRobotStatusPageForm');
    if (robotForm) {
        robotForm.addEventListener('submit', handleAddRobotStatusPage);
    }

    // Uptime Kuma Status Page Form
    const kumaForm = document.getElementById('addKumaStatusPageForm');
    if (kumaForm) {
        kumaForm.addEventListener('submit', handleAddKumaStatusPage);
    }
}

// ==================== SERVICE STATUS ====================

async function checkServicesStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        const robotStatus = document.getElementById('robotStatus');
        const kumaStatus = document.getElementById('kumaStatus');

        if (robotStatus) {
            robotStatus.textContent = data.uptime_robot_configured ? 'Configured' : 'Not Configured';
            robotStatus.className = data.uptime_robot_configured ? 'status-badge configured' : 'status-badge not-configured';
        }

        if (kumaStatus) {
            kumaStatus.textContent = data.uptime_kuma_configured ? 'Configured' : 'Not Configured';
            kumaStatus.className = data.uptime_kuma_configured ? 'status-badge configured' : 'status-badge not-configured';
        }
    } catch (error) {
        console.error('Error checking services status:', error);
        showToast('Failed to check service status', 'error');
    }
}

// ==================== LOAD STATUS PAGES ====================

async function loadAllStatusPages() {
    await Promise.all([
        loadRobotStatusPages(),
        loadKumaStatusPages()
    ]);
    updateLastUpdateTime();
}

async function loadRobotStatusPages() {
    const container = document.getElementById('robotStatusPages');
    if (!container) return;

    try {
        const response = await fetch('/api/uptime-robot/status-pages');
        const data = await response.json();

        if (data.error) {
            container.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }

        if (!data.status_pages || data.status_pages.length === 0) {
            container.innerHTML = '<div class="loading">No status pages found</div>';
            return;
        }

        container.innerHTML = data.status_pages.map(page => createRobotStatusPageCard(page)).join('');
    } catch (error) {
        console.error('Error loading Uptime Robot status pages:', error);
        container.innerHTML = '<div class="error-message">Failed to load status pages</div>';
        showToast('Failed to load Uptime Robot status pages', 'error');
    }
}

async function loadKumaStatusPages() {
    const container = document.getElementById('kumaStatusPages');
    if (!container) return;

    try {
        const response = await fetch('/api/uptime-kuma/status-pages');
        const data = await response.json();

        if (data.error) {
            container.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }

        if (!data.status_pages || data.status_pages.length === 0) {
            container.innerHTML = '<div class="loading">No status pages found</div>';
            return;
        }

        container.innerHTML = data.status_pages.map(page => createKumaStatusPageCard(page)).join('');
    } catch (error) {
        console.error('Error loading Uptime Kuma status pages:', error);
        container.innerHTML = '<div class="error-message">Failed to load status pages</div>';
        showToast('Failed to load Uptime Kuma status pages', 'error');
    }
}

// ==================== CREATE STATUS PAGE CARDS ====================

function createRobotStatusPageCard(page) {
    const pageUrl = page.custom_domain || `https://stats.uptimerobot.com/${page.standard_url || page.id}`;
    const monitorCount = page.monitors ? page.monitors.length : 0;

    return `
        <div class="status-page-card" onclick="viewStatusPageDetail('robot', ${page.id})" style="cursor: pointer;">
            <div class="monitor-actions" onclick="event.stopPropagation()">
                <button class="action-btn delete-icon" onclick="openDeleteStatusPageModal('robot', ${page.id}, '${escapeHtml(page.friendly_name)}')">
                    🗑️
                </button>
            </div>
            <div class="status-page-header">
                <div class="status-page-name">${escapeHtml(page.friendly_name)}</div>
            </div>
            <div class="status-page-url" onclick="event.stopPropagation()">
                <a href="${pageUrl}" target="_blank">${pageUrl}</a>
            </div>
            <div class="status-page-info">
                <div class="info-item">
                    <span>📊 Monitors: ${monitorCount}</span>
                </div>
                ${page.custom_domain ? `<div class="info-item"><span>🌐 Custom Domain</span></div>` : ''}
            </div>
            ${monitorCount > 0 ? `
                <div class="monitor-list">
                    <h4>Included Monitors:</h4>
                    <div class="monitor-tags">
                        ${page.monitors.map(m => `<span class="monitor-tag">${escapeHtml(m.friendly_name || m.name || 'Monitor')}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            <div class="status-page-actions" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);" onclick="event.stopPropagation()">
                <button class="action-btn" style="width: 100%; justify-content: center;" onclick="viewStatusPageDetail('robot', ${page.id})">
                    👁️ View Details
                </button>
            </div>
        </div>
    `;
}

function createKumaStatusPageCard(page) {
    const pageUrl = page.url || `${window.location.origin}/status/${page.slug}`;

    return `
        <div class="status-page-card" onclick="viewStatusPageDetail('kuma', '${escapeHtml(page.slug)}')" style="cursor: pointer;">
            <div class="monitor-actions" onclick="event.stopPropagation()">
                <button class="action-btn delete-icon" onclick="openDeleteStatusPageModal('kuma', '${escapeHtml(page.slug)}', '${escapeHtml(page.title)}')">
                    🗑️
                </button>
            </div>
            <div class="status-page-header">
                <div class="status-page-name">${escapeHtml(page.title)}</div>
            </div>
            <div class="status-page-url" onclick="event.stopPropagation()">
                <a href="${pageUrl}" target="_blank">${pageUrl}</a>
            </div>
            ${page.description ? `
                <div class="status-page-info">
                    <div class="info-item">
                        <span>${escapeHtml(page.description)}</span>
                    </div>
                </div>
            ` : ''}
            <div class="status-page-actions" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);" onclick="event.stopPropagation()">
                <button class="action-btn" style="width: 100%; justify-content: center;" onclick="viewStatusPageDetail('kuma', '${escapeHtml(page.slug)}')">
                    👁️ View Details
                </button>
            </div>
        </div>
    `;
}

// ==================== ADD STATUS PAGE MODALS ====================

async function openAddStatusPageModal(service) {
    if (service === 'robot') {
        // Load available monitors for Uptime Robot
        await loadAvailableRobotMonitors();
        openModal('addRobotStatusPageModal');
    } else if (service === 'kuma') {
        openModal('addKumaStatusPageModal');
    }
}

async function loadAvailableRobotMonitors() {
    const container = document.getElementById('robotPageMonitors');
    if (!container) return;

    try {
        const response = await fetch('/api/uptime-robot/monitors');
        const data = await response.json();

        if (data.error || !data.monitors || data.monitors.length === 0) {
            container.innerHTML = '<div class="loading">No monitors available</div>';
            availableMonitors.robot = [];
            return;
        }

        availableMonitors.robot = data.monitors;

        container.innerHTML = data.monitors.map(monitor => `
            <div style="margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" name="monitor" value="${monitor.id}" style="cursor: pointer;">
                    <span>${escapeHtml(monitor.friendly_name)} (${escapeHtml(monitor.url)})</span>
                </label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading monitors:', error);
        container.innerHTML = '<div class="error-message">Failed to load monitors</div>';
    }
}

// ==================== HANDLE ADD STATUS PAGE ====================

async function handleAddRobotStatusPage(e) {
    e.preventDefault();

    const name = document.getElementById('robotPageName').value;
    const customDomain = document.getElementById('robotPageDomain').value;
    const selectedMonitors = Array.from(document.querySelectorAll('#robotPageMonitors input[name="monitor"]:checked'))
        .map(cb => parseInt(cb.value));

    if (!name) {
        showToast('Please enter a page name', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/uptime-robot/status-page/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                friendly_name: name,
                custom_domain: customDomain || undefined,
                monitors: selectedMonitors
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Status page created successfully!', 'success');
            closeModal('addRobotStatusPageModal');
            document.getElementById('addRobotStatusPageForm').reset();
            await loadRobotStatusPages();
        } else {
            showToast(data.error || 'Failed to create status page', 'error');
        }
    } catch (error) {
        console.error('Error creating status page:', error);
        showToast('Failed to create status page', 'error');
    }
}

async function handleAddKumaStatusPage(e) {
    e.preventDefault();

    const slug = document.getElementById('kumaPageSlug').value;
    const title = document.getElementById('kumaPageTitle').value;
    const description = document.getElementById('kumaPageDescription').value;

    if (!slug || !title) {
        showToast('Please enter slug and title', 'warning');
        return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
        showToast('Slug can only contain lowercase letters, numbers, and hyphens', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/uptime-kuma/status-page/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: slug,
                title: title,
                description: description
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Status page created successfully!', 'success');
            closeModal('addKumaStatusPageModal');
            document.getElementById('addKumaStatusPageForm').reset();
            await loadKumaStatusPages();
        } else {
            showToast(data.error || 'Failed to create status page', 'error');
        }
    } catch (error) {
        console.error('Error creating status page:', error);
        showToast('Failed to create status page', 'error');
    }
}

// ==================== DELETE STATUS PAGE ====================

function openDeleteStatusPageModal(service, id, name) {
    deleteStatusPageData = { service, id, name };
    document.getElementById('deleteStatusPageName').textContent = name;
    openModal('deleteStatusPageModal');
}

async function confirmDeleteStatusPage() {
    if (!deleteStatusPageData) return;

    const { service, id } = deleteStatusPageData;

    try {
        let response;
        if (service === 'robot') {
            response = await fetch('/api/uptime-robot/status-page/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
        } else if (service === 'kuma') {
            response = await fetch('/api/uptime-kuma/status-page/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: id })
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast('Status page deleted successfully!', 'success');
            closeModal('deleteStatusPageModal');
            deleteStatusPageData = null;

            if (service === 'robot') {
                await loadRobotStatusPages();
            } else if (service === 'kuma') {
                await loadKumaStatusPages();
            }
        } else {
            showToast(data.error || 'Failed to delete status page', 'error');
        }
    } catch (error) {
        console.error('Error deleting status page:', error);
        showToast('Failed to delete status page', 'error');
    }
}

// ==================== REFRESH FUNCTIONS ====================

async function refreshRobotStatusPages() {
    showToast('Refreshing Uptime Robot status pages...', 'info');
    await loadRobotStatusPages();
    showToast('Status pages refreshed!', 'success');
}

async function refreshKumaStatusPages() {
    showToast('Refreshing Uptime Kuma status pages...', 'info');
    await loadKumaStatusPages();
    showToast('Status pages refreshed!', 'success');
}

async function refreshAllStatusPages() {
    showToast('Refreshing all status pages...', 'info');
    await loadAllStatusPages();
    showToast('All status pages refreshed!', 'success');
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
// Navigate to status page detail view
function viewStatusPageDetail(service, id) {
    window.location.href = `/status-page-detail?service=${service}&id=${id}`;
}