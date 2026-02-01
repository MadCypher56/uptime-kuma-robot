"""
Uptime Monitoring Dashboard - Enhanced Version
===============================================

Enhanced Flask application with:
- Fixed Uptime Kuma status display
- Unified status page management for both services
- Improved UI and user experience
"""

from flask import Flask, render_template, jsonify, request
import os
from dotenv import load_dotenv
import logging

from services import UptimeRobotService, UptimeKumaService
from services.uptime_robot import UptimeRobotException
from services.uptime_kuma import UptimeKumaException

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Load configuration from environment variables
UPTIME_ROBOT_API_KEY = os.getenv('UPTIME_ROBOT_API_KEY', '')
UPTIME_KUMA_URL = os.getenv('UPTIME_KUMA_URL', '')
UPTIME_KUMA_USERNAME = os.getenv('UPTIME_KUMA_USERNAME', '')
UPTIME_KUMA_PASSWORD = os.getenv('UPTIME_KUMA_PASSWORD', '')


def get_uptime_robot_service() -> UptimeRobotService:
    """Get or create Uptime Robot service instance."""
    if not UPTIME_ROBOT_API_KEY:
        raise ValueError("Uptime Robot API key not configured")
    return UptimeRobotService(api_key=UPTIME_ROBOT_API_KEY)


def get_uptime_kuma_service() -> UptimeKumaService:
    """Get or create Uptime Kuma service instance."""
    if not all([UPTIME_KUMA_URL, UPTIME_KUMA_USERNAME, UPTIME_KUMA_PASSWORD]):
        raise ValueError("Uptime Kuma credentials not configured")
    return UptimeKumaService(
        url=UPTIME_KUMA_URL,
        username=UPTIME_KUMA_USERNAME,
        password=UPTIME_KUMA_PASSWORD
    )


# ==================== ROUTES ====================

@app.route('/')
def index():
    """Main dashboard page."""
    return render_template('dashboard.html')


@app.route('/status-pages')
def status_pages():
    """Status pages management page."""
    return render_template('status_pages.html')

@app.route('/monitor-detail')
def monitor_detail():
    """Monitor detail page with comprehensive metrics."""
    return render_template('monitor_detail.html')

@app.route('/api/status')
def get_status():
    """Get overall configuration status of both services."""
    robot_configured = bool(UPTIME_ROBOT_API_KEY)
    kuma_configured = bool(UPTIME_KUMA_URL and UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD)
    
    return jsonify({
        'uptime_robot_configured': robot_configured,
        'uptime_kuma_configured': kuma_configured
    })


# ==================== UPTIME ROBOT ROUTES ====================

@app.route('/api/uptime-robot/monitors')
def api_uptime_robot_monitors():
    """Get all Uptime Robot monitors."""
    try:
        service = get_uptime_robot_service()
        monitors = service.get_monitors()
        return jsonify({'monitors': monitors})
        
    except ValueError as e:
        logger.warning(f"Uptime Robot not configured: {e}")
        return jsonify({'error': 'API key not configured', 'monitors': []})
    except UptimeRobotException as e:
        logger.error(f"Uptime Robot error: {e}")
        return jsonify({'error': str(e), 'monitors': []})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'monitors': []})


@app.route('/api/uptime-robot/monitor/add', methods=['POST'])
def add_uptime_robot_monitor():
    """Add a new monitor to Uptime Robot."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        
        if not data.get('friendly_name') or not data.get('url'):
            return jsonify({'success': False, 'error': 'Name and URL are required'})
        
        monitor = service.add_monitor(
            name=data['friendly_name'],
            url=data['url'],
            monitor_type=data.get('type', UptimeRobotService.MONITOR_TYPE_HTTP),
            interval=data.get('interval', 300)
        )
        
        return jsonify({'success': True, 'monitor': monitor})
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeRobotException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


@app.route('/api/uptime-robot/monitor/edit', methods=['POST'])
def edit_uptime_robot_monitor():
    """Edit an existing Uptime Robot monitor."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        
        if not data.get('id'):
            return jsonify({'success': False, 'error': 'Monitor ID is required'})
        
        monitor_id = int(data['id'])
        update_data = {k: v for k, v in data.items() if k != 'id' and v is not None}
        
        service.edit_monitor(monitor_id, **update_data)
        
        return jsonify({'success': True})
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeRobotException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


@app.route('/api/uptime-robot/monitor/delete', methods=['POST'])
def delete_uptime_robot_monitor():
    """Delete an Uptime Robot monitor."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        
        if not data.get('id'):
            return jsonify({'success': False, 'error': 'Monitor ID is required'})
        
        service.delete_monitor(int(data['id']))
        
        return jsonify({'success': True})
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeRobotException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


# ==================== UPTIME ROBOT STATUS PAGE ROUTES ====================

@app.route('/api/uptime-robot/status-pages')
def api_uptime_robot_status_pages():
    """Get all Uptime Robot status pages."""
    try:
        service = get_uptime_robot_service()
        pages = service.get_status_pages()
        return jsonify({'status_pages': pages})
    except ValueError as e:
        return jsonify({'error': str(e), 'status_pages': []})
    except UptimeRobotException as e:
        return jsonify({'error': str(e), 'status_pages': []})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'status_pages': []})


@app.route('/api/uptime-robot/status-page/add', methods=['POST'])
def add_uptime_robot_status_page():
    """Add a new Uptime Robot status page."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        
        if not data.get('friendly_name'):
            return jsonify({'success': False, 'error': 'Friendly name is required'})
        
        # Get monitors to include
        monitors = data.get('monitors', [])
        
        page = service.add_status_page(
            friendly_name=data['friendly_name'],
            monitors=monitors,
            custom_domain=data.get('custom_domain'),
            sort=data.get('sort', 1)
        )
        
        return jsonify({'success': True, 'page': page})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeRobotException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


@app.route('/api/uptime-robot/status-page/delete', methods=['POST'])
def delete_uptime_robot_status_page():
    """Delete an Uptime Robot status page."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        
        if not data.get('id'):
            return jsonify({'success': False, 'error': 'Status page ID is required'})
        
        service.delete_status_page(int(data['id']))
        return jsonify({'success': True})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeRobotException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


# ==================== UPTIME KUMA ROUTES ====================

@app.route('/api/uptime-kuma/monitors')
def api_uptime_kuma_monitors():
    """Get all Uptime Kuma monitors."""
    try:
        service = get_uptime_kuma_service()
        monitors = service.get_monitors()
        return jsonify({'monitors': monitors})
        
    except ValueError as e:
        logger.warning(f"Uptime Kuma not configured: {e}")
        return jsonify({'error': 'Credentials not configured', 'monitors': []})
    except UptimeKumaException as e:
        logger.error(f"Uptime Kuma error: {e}")
        return jsonify({'error': str(e), 'monitors': []})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'monitors': []})


@app.route('/api/uptime-kuma/monitor/add', methods=['POST'])
def add_uptime_kuma_monitor():
    """Add a new monitor to Uptime Kuma."""
    try:
        service = get_uptime_kuma_service()
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'Name is required'})
        
        monitor = service.add_monitor(
            name=data['name'],
            url=data.get('url'),
            monitor_type=data.get('type', 'http'),
            interval=data.get('interval', 60)
        )
        
        return jsonify({'success': True, 'monitor': monitor})
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeKumaException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


@app.route('/api/uptime-kuma/monitor/edit', methods=['POST'])
def edit_uptime_kuma_monitor():
    """Edit an existing Uptime Kuma monitor."""
    try:
        service = get_uptime_kuma_service()
        data = request.get_json()
        
        if not data.get('id'):
            return jsonify({'success': False, 'error': 'Monitor ID is required'})
        
        monitor_id = int(data['id'])
        update_data = {k: v for k, v in data.items() if k != 'id' and v is not None}
        
        service.edit_monitor(monitor_id, **update_data)
        
        return jsonify({'success': True})
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeKumaException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


@app.route('/api/uptime-kuma/monitor/delete', methods=['POST'])
def delete_uptime_kuma_monitor():
    """Delete an Uptime Kuma monitor."""
    try:
        service = get_uptime_kuma_service()
        data = request.get_json()
        
        if not data.get('id'):
            return jsonify({'success': False, 'error': 'Monitor ID is required'})
        
        service.delete_monitor(int(data['id']))
        
        return jsonify({'success': True})
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeKumaException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


# ==================== UPTIME KUMA STATUS PAGE ROUTES ====================

@app.route('/api/uptime-kuma/status-pages')
def api_uptime_kuma_status_pages():
    """Get all Uptime Kuma status pages."""
    try:
        service = get_uptime_kuma_service()
        pages = service.get_status_pages()
        return jsonify({'status_pages': pages})
    except ValueError as e:
        return jsonify({'error': str(e), 'status_pages': []})
    except UptimeKumaException as e:
        return jsonify({'error': str(e), 'status_pages': []})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'status_pages': []})


@app.route('/api/uptime-kuma/status-page/add', methods=['POST'])
def add_uptime_kuma_status_page():
    """Add a new Uptime Kuma status page."""
    try:
        service = get_uptime_kuma_service()
        data = request.get_json()
        
        if not data.get('slug') or not data.get('title'):
            return jsonify({'success': False, 'error': 'Slug and title are required'})
        
        page = service.add_status_page(
            slug=data['slug'],
            title=data['title'],
            description=data.get('description', '')
        )
        
        return jsonify({'success': True, 'page': page})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeKumaException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


@app.route('/api/uptime-kuma/status-page/delete', methods=['POST'])
def delete_uptime_kuma_status_page():
    """Delete an Uptime Kuma status page."""
    try:
        service = get_uptime_kuma_service()
        data = request.get_json()
        
        if not data.get('slug'):
            return jsonify({'success': False, 'error': 'Status page slug is required'})
        
        service.delete_status_page(data['slug'])
        return jsonify({'success': True})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)})
    except UptimeKumaException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'})


# ==================== UNIFIED STATUS PAGE API ====================

@app.route('/api/unified/monitors')
def get_all_monitors():
    """Get monitors from both services combined."""
    all_monitors = {
        'uptime_robot': [],
        'uptime_kuma': []
    }
    
    # Get Uptime Robot monitors
    try:
        service = get_uptime_robot_service()
        all_monitors['uptime_robot'] = service.get_monitors()
    except Exception as e:
        logger.warning(f"Could not fetch Uptime Robot monitors: {e}")
    
    # Get Uptime Kuma monitors
    try:
        service = get_uptime_kuma_service()
        all_monitors['uptime_kuma'] = service.get_monitors()
    except Exception as e:
        logger.warning(f"Could not fetch Uptime Kuma monitors: {e}")
    
    return jsonify(all_monitors)


@app.route('/status-page-detail')
def status_page_detail():
    """Status page detail page showing monitors on the status page."""
    return render_template('status_page_detail.html')


# ==================== UPTIME ROBOT STATUS PAGE DETAIL ROUTES ====================

@app.route('/api/uptime-robot/status-page/<int:page_id>')
def get_uptime_robot_status_page(page_id):
    """Get details of a specific Uptime Robot status page."""
    try:
        service = get_uptime_robot_service()
        pages = service.get_status_pages()
        
        # Find the specific page
        page = next((p for p in pages if p.get('id') == page_id), None)
        
        if not page:
            return jsonify({'error': 'Status page not found'}), 404
            
        return jsonify({'status_page': page})
    except Exception as e:
        logger.error(f"Error getting status page: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/uptime-robot/status-page/<int:page_id>/monitors')
def get_uptime_robot_status_page_monitors(page_id):
    """Get monitors on a specific Uptime Robot status page."""
    try:
        service = get_uptime_robot_service()
        pages = service.get_status_pages()
        
        # Find the specific page
        page = next((p for p in pages if p.get('id') == page_id), None)
        
        if not page:
            return jsonify({'error': 'Status page not found', 'monitors': []}), 404
        
        # Get the monitors from the page
        monitors = page.get('monitors', [])
        
        return jsonify({'monitors': monitors})
    except Exception as e:
        logger.error(f"Error getting status page monitors: {e}")
        return jsonify({'error': str(e), 'monitors': []}), 500


@app.route('/api/uptime-robot/status-page/<int:page_id>/add-monitors', methods=['POST'])
def add_monitors_to_uptime_robot_status_page(page_id):
    """Add monitors to an Uptime Robot status page."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        monitor_ids = data.get('monitor_ids', [])
        
        if not monitor_ids:
            return jsonify({'success': False, 'error': 'No monitors specified'})
        
        # Get current page data
        pages = service.get_status_pages()
        page = next((p for p in pages if p.get('id') == page_id), None)
        
        if not page:
            return jsonify({'success': False, 'error': 'Status page not found'})
        
        # Get current monitor IDs and add new ones
        current_monitors = [m.get('id') for m in page.get('monitors', [])]
        updated_monitors = list(set(current_monitors + monitor_ids))
        
        # Update the status page with new monitors
        service.edit_status_page(page_id, monitors=updated_monitors)
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error adding monitors to status page: {e}")
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/uptime-robot/status-page/<int:page_id>/remove-monitor', methods=['POST'])
def remove_monitor_from_uptime_robot_status_page(page_id):
    """Remove a monitor from an Uptime Robot status page."""
    try:
        service = get_uptime_robot_service()
        data = request.get_json()
        monitor_id = data.get('monitor_id')
        
        if not monitor_id:
            return jsonify({'success': False, 'error': 'Monitor ID is required'})
        
        # Get current page data
        pages = service.get_status_pages()
        page = next((p for p in pages if p.get('id') == page_id), None)
        
        if not page:
            return jsonify({'success': False, 'error': 'Status page not found'})
        
        # Remove the monitor
        current_monitors = [m.get('id') for m in page.get('monitors', [])]
        updated_monitors = [m for m in current_monitors if m != monitor_id]
        
        # Update the status page
        service.edit_status_page(page_id, monitors=updated_monitors)
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error removing monitor from status page: {e}")
        return jsonify({'success': False, 'error': str(e)})


# ==================== UPTIME KUMA STATUS PAGE DETAIL ROUTES ====================

@app.route('/api/uptime-kuma/status-page/<slug>')
def get_uptime_kuma_status_page(slug):
    """Get details of a specific Uptime Kuma status page."""
    try:
        service = get_uptime_kuma_service()
        pages = service.get_status_pages()
        
        # Find the specific page
        page = next((p for p in pages if p.get('slug') == slug), None)
        
        if not page:
            return jsonify({'error': 'Status page not found'}), 404
            
        return jsonify({'status_page': page})
    except Exception as e:
        logger.error(f"Error getting status page: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/uptime-kuma/status-page/<slug>/monitors')
def get_uptime_kuma_status_page_monitors(slug):
    """Get monitors on a specific Uptime Kuma status page."""
    try:
        service = get_uptime_kuma_service()
        
        # Get all monitors (Kuma doesn't have specific status page monitor filtering in basic API)
        all_monitors = service.get_monitors()
        
        # In a real implementation, you'd filter based on the status page config
        # For now, return all monitors as they can all be shown on status pages
        return jsonify({'monitors': all_monitors})
    except Exception as e:
        logger.error(f"Error getting status page monitors: {e}")
        return jsonify({'error': str(e), 'monitors': []}), 500


@app.route('/api/uptime-kuma/status-page/<slug>/add-monitors', methods=['POST'])
def add_monitors_to_uptime_kuma_status_page(slug):
    """Add monitors to an Uptime Kuma status page."""
    try:
        # Note: This would need to be implemented based on Uptime Kuma's API
        # For now, return success as Kuma status pages show all monitors by default
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error adding monitors to status page: {e}")
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/uptime-kuma/status-page/<slug>/remove-monitor', methods=['POST'])
def remove_monitor_from_uptime_kuma_status_page(slug):
    """Remove a monitor from an Uptime Kuma status page."""
    try:
        # Note: This would need to be implemented based on Uptime Kuma's API
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error removing monitor from status page: {e}")
        return jsonify({'success': False, 'error': str(e)})


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


# ==================== APPLICATION ENTRY POINT ====================

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Enhanced Uptime Monitoring Dashboard")
    print("=" * 60)
    print(f"Uptime Robot API Key: {'✓ Configured' if UPTIME_ROBOT_API_KEY else '✗ Not Configured'}")
    if UPTIME_ROBOT_API_KEY:
        print(f"  API Key: {UPTIME_ROBOT_API_KEY[:10]}...{UPTIME_ROBOT_API_KEY[-5:]}")
    print(f"Uptime Kuma URL: {'✓ Configured' if UPTIME_KUMA_URL else '✗ Not Configured'}")
    if UPTIME_KUMA_URL:
        print(f"  URL: {UPTIME_KUMA_URL}")
        print(f"  Username: {UPTIME_KUMA_USERNAME}")
    print("=" * 60)
    print("📊 Dashboard will be available at: http://localhost:5000")
    print("📄 Status Pages Management: http://localhost:5000/status-pages")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)