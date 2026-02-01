"""
Uptime Robot Service Module
============================

This module provides a clean interface for interacting with the Uptime Robot API.
It handles all monitor operations including fetching, creating, updating, and deleting monitors.

Classes:
    UptimeRobotService: Main service class for Uptime Robot operations

Usage:
    service = UptimeRobotService(api_key="your_api_key")
    monitors = service.get_monitors()
    service.add_monitor(name="My Site", url="https://example.com")
"""

import requests
from typing import Dict, List, Optional, Any
import logging

# Configure logging
logger = logging.getLogger(__name__)


class UptimeRobotException(Exception):
    """Custom exception for Uptime Robot API errors"""
    pass


class UptimeRobotService:
    """
    Service class for interacting with Uptime Robot API.
    
    This class provides methods for all CRUD operations on monitors,
    using the Uptime Robot v2 API.
    
    Attributes:
        api_key (str): The Uptime Robot API key
        base_url (str): Base URL for Uptime Robot API
        timeout (int): Request timeout in seconds
    
    Example:
        >>> service = UptimeRobotService(api_key="ur123456...")
        >>> monitors = service.get_monitors()
        >>> print(f"Found {len(monitors)} monitors")
    """
    
    # API Constants
    BASE_URL = "https://api.uptimerobot.com/v2"
    DEFAULT_TIMEOUT = 10
    
    # Monitor types
    MONITOR_TYPE_HTTP = 1
    MONITOR_TYPE_KEYWORD = 2
    MONITOR_TYPE_PING = 3
    MONITOR_TYPE_PORT = 4
    
    # Monitor status
    STATUS_PAUSED = 0
    STATUS_NOT_CHECKED = 1
    STATUS_UP = 2
    STATUS_SEEMS_DOWN = 8
    STATUS_DOWN = 9
    
    def __init__(self, api_key: str, timeout: int = DEFAULT_TIMEOUT):
        """
        Initialize the Uptime Robot service.
        
        Args:
            api_key: Uptime Robot API key (starts with 'ur')
            timeout: Request timeout in seconds (default: 10)
        
        Raises:
            ValueError: If api_key is empty or invalid
        """
        if not api_key:
            raise ValueError("API key cannot be empty")
        
        if not api_key.startswith('ur'):
            logger.warning("API key doesn't start with 'ur'. This might be incorrect.")
        
        self.api_key = api_key
        self.base_url = self.BASE_URL
        self.timeout = timeout
        
        logger.info("UptimeRobotService initialized")
    
    def _make_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make a POST request to the Uptime Robot API.
        
        Args:
            endpoint: API endpoint (e.g., 'getMonitors')
            payload: Request payload (api_key will be added automatically)
        
        Returns:
            dict: API response data
        
        Raises:
            UptimeRobotException: If the API request fails
        """
        url = f"{self.base_url}/{endpoint}"
        
        # Add API key and format to payload
        full_payload = {
            'api_key': self.api_key,
            'format': 'json',
            **payload
        }
        
        try:
            logger.debug(f"Making request to {endpoint}")
            response = requests.post(url, data=full_payload, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            
            # Check API response status
            if data.get('stat') != 'ok':
                error_msg = data.get('error', {}).get('message', 'Unknown error')
                error_type = data.get('error', {}).get('type', 'unknown')
                raise UptimeRobotException(f"API Error ({error_type}): {error_msg}")
            
            return data
            
        except requests.exceptions.Timeout:
            raise UptimeRobotException("Request timeout - Uptime Robot API not responding")
        except requests.exceptions.ConnectionError:
            raise UptimeRobotException("Connection error - Cannot reach Uptime Robot API")
        except requests.exceptions.RequestException as e:
            raise UptimeRobotException(f"Request error: {str(e)}")
        except ValueError as e:
            raise UptimeRobotException(f"Invalid JSON response: {str(e)}")
    
    def get_monitors(self) -> List[Dict[str, Any]]:
        """
        Fetch all monitors from Uptime Robot.
        
        Returns:
            list: List of monitor dictionaries with standardized fields
        
        Example:
            >>> monitors = service.get_monitors()
            >>> for monitor in monitors:
            ...     print(f"{monitor['name']}: {monitor['status']}")
        """
        try:
            payload = {
                'logs': '0',
                'custom_uptime_ratios': '1-7-30',
                'response_times': '1'
            }
            
            data = self._make_request('getMonitors', payload)
            
            monitors = []
            for monitor in data.get('monitors', []):
                monitors.append(self._format_monitor(monitor))
            
            logger.info(f"Retrieved {len(monitors)} monitors")
            return monitors
            
        except UptimeRobotException as e:
            logger.error(f"Failed to get monitors: {e}")
            raise
    
    def _format_monitor(self, monitor: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format a raw monitor response into a standardized structure.
        
        Args:
            monitor: Raw monitor data from API
        
        Returns:
            dict: Formatted monitor data
        """
        return {
            'id': monitor.get('id'),
            'name': monitor.get('friendly_name', 'Unknown'),
            'url': monitor.get('url', 'N/A'),
            'status': monitor.get('status', 0),
            'uptime_ratio': monitor.get('custom_uptime_ratio', 'N/A'),
            'response_time': monitor.get('average_response_time', 'N/A'),
            'type': monitor.get('type'),
            'interval': monitor.get('interval', 300)
        }
    
    def add_monitor(self, name: str, url: str, monitor_type: int = MONITOR_TYPE_HTTP,
                    interval: int = 300, **kwargs) -> Dict[str, Any]:
        """
        Add a new monitor to Uptime Robot.
        
        Args:
            name: Friendly name for the monitor
            url: URL to monitor
            monitor_type: Type of monitor (default: HTTP/HTTPS)
            interval: Check interval in seconds (default: 300)
            **kwargs: Additional monitor parameters
        
        Returns:
            dict: Created monitor data
        
        Raises:
            ValueError: If required parameters are missing
            UptimeRobotException: If API request fails
        
        Example:
            >>> monitor = service.add_monitor(
            ...     name="My Website",
            ...     url="https://example.com",
            ...     interval=300
            ... )
        """
        if not name or not url:
            raise ValueError("Name and URL are required")
        
        payload = {
            'friendly_name': name,
            'url': url,
            'type': monitor_type,
            'interval': interval,
            **kwargs
        }
        
        try:
            data = self._make_request('newMonitor', payload)
            logger.info(f"Monitor '{name}' created successfully")
            return data.get('monitor', {})
            
        except UptimeRobotException as e:
            logger.error(f"Failed to add monitor '{name}': {e}")
            raise
    
    def edit_monitor(self, monitor_id: int, **kwargs) -> bool:
        """
        Edit an existing monitor.
        
        Args:
            monitor_id: ID of the monitor to edit
            **kwargs: Fields to update (friendly_name, url, status, interval, etc.)
        
        Returns:
            bool: True if successful
        
        Raises:
            ValueError: If monitor_id is missing
            UptimeRobotException: If API request fails
        
        Example:
            >>> service.edit_monitor(
            ...     monitor_id=12345,
            ...     friendly_name="New Name",
            ...     interval=600
            ... )
        """
        if not monitor_id:
            raise ValueError("Monitor ID is required")
        
        payload = {'id': monitor_id, **kwargs}
        
        try:
            self._make_request('editMonitor', payload)
            logger.info(f"Monitor {monitor_id} updated successfully")
            return True
            
        except UptimeRobotException as e:
            logger.error(f"Failed to edit monitor {monitor_id}: {e}")
            raise
    
    def delete_monitor(self, monitor_id: int) -> bool:
        """
        Delete a monitor.
        
        Args:
            monitor_id: ID of the monitor to delete
        
        Returns:
            bool: True if successful
        
        Raises:
            ValueError: If monitor_id is missing
            UptimeRobotException: If API request fails
        
        Example:
            >>> service.delete_monitor(monitor_id=12345)
        """
        if not monitor_id:
            raise ValueError("Monitor ID is required")
        
        payload = {'id': monitor_id}
        
        try:
            self._make_request('deleteMonitor', payload)
            logger.info(f"Monitor {monitor_id} deleted successfully")
            return True
            
        except UptimeRobotException as e:
            logger.error(f"Failed to delete monitor {monitor_id}: {e}")
            raise
    
    def pause_monitor(self, monitor_id: int) -> bool:
        """
        Pause a monitor.
        
        Args:
            monitor_id: ID of the monitor to pause
        
        Returns:
            bool: True if successful
        """
        return self.edit_monitor(monitor_id, status=self.STATUS_PAUSED)
    
    def resume_monitor(self, monitor_id: int) -> bool:
        """
        Resume a paused monitor.
        
        Args:
            monitor_id: ID of the monitor to resume
        
        Returns:
            bool: True if successful
        """
        return self.edit_monitor(monitor_id, status=self.STATUS_UP)
    
    def get_status_text(self, status_code: int) -> str:
        """
        Get human-readable status text.
        
        Args:
            status_code: Numeric status code
        
        Returns:
            str: Status text
        """
        status_map = {
            self.STATUS_PAUSED: 'Paused',
            self.STATUS_NOT_CHECKED: 'Not Checked',
            self.STATUS_UP: 'Up',
            self.STATUS_SEEMS_DOWN: 'Seems Down',
            self.STATUS_DOWN: 'Down'
        }
        return status_map.get(status_code, 'Unknown')
    
    # ==================== STATUS PAGE (PSP) METHODS ====================
    
    def get_status_pages(self) -> List[Dict[str, Any]]:
        """
        Get all public status pages (PSP) from Uptime Robot.
        
        Returns:
            list: List of status page dictionaries
        
        Raises:
            UptimeRobotException: If fetching status pages fails
        
        Example:
            >>> pages = service.get_status_pages()
            >>> for page in pages:
            ...     print(f"{page['friendly_name']}: {page['custom_url']}")
        """
        try:
            data = self._make_request('getPSPs', {})
            
            psps = data.get('psps', [])
            logger.info(f"Retrieved {len(psps)} status pages")
            return psps
            
        except UptimeRobotException as e:
            logger.error(f"Failed to get status pages: {e}")
            raise
    
    def get_status_page(self, psp_id: int) -> Dict[str, Any]:
        """
        Get a specific status page by ID.
        
        Args:
            psp_id: Status page ID
        
        Returns:
            dict: Status page data
        
        Raises:
            ValueError: If psp_id is missing
            UptimeRobotException: If fetching status page fails
        
        Example:
            >>> page = service.get_status_page(psp_id=12345)
            >>> print(page['friendly_name'])
        """
        if not psp_id:
            raise ValueError("Status page ID is required")
        
        try:
            data = self._make_request('getPSPs', {'psps': psp_id})
            
            psps = data.get('psps', [])
            if psps:
                logger.info(f"Retrieved status page: {psp_id}")
                return psps[0]
            else:
                raise UptimeRobotException(f"Status page {psp_id} not found")
            
        except UptimeRobotException as e:
            logger.error(f"Failed to get status page {psp_id}: {e}")
            raise
    
    def add_status_page(self, friendly_name: str, monitors: List[int], 
                        custom_url: str = None, **kwargs) -> Dict[str, Any]:
        """
        Add a new public status page (PSP) to Uptime Robot.
        
        Args:
            friendly_name: Display name for the status page
            monitors: List of monitor IDs to include on the page
            custom_url: Custom URL slug (optional)
            **kwargs: Additional page parameters
        
        Returns:
            dict: Created status page data
        
        Raises:
            ValueError: If required parameters are missing
            UptimeRobotException: If API request fails
        
        Example:
            >>> page = service.add_status_page(
            ...     friendly_name="Production Status",
            ...     monitors=[12345, 67890],
            ...     custom_url="production"
            ... )
        """
        if not friendly_name or not monitors:
            raise ValueError("Friendly name and monitors list are required")
        
        payload = {
            'friendly_name': friendly_name,
            'monitors': '-'.join(map(str, monitors)),  # Monitor IDs separated by dash
            **kwargs
        }
        
        if custom_url:
            payload['custom_url'] = custom_url
        
        try:
            data = self._make_request('newPSP', payload)
            logger.info(f"Status page '{friendly_name}' created successfully")
            return data.get('psp', {})
            
        except UptimeRobotException as e:
            logger.error(f"Failed to add status page '{friendly_name}': {e}")
            raise
    
    def edit_status_page(self, psp_id: int, **kwargs) -> bool:
        """
        Edit an existing status page.
        
        Args:
            psp_id: Status page ID to edit
            **kwargs: Fields to update (friendly_name, monitors, custom_url, etc.)
        
        Returns:
            bool: True if successful
        
        Raises:
            ValueError: If psp_id is missing
            UptimeRobotException: If API request fails
        
        Example:
            >>> service.edit_status_page(
            ...     psp_id=12345,
            ...     friendly_name="New Name",
            ...     monitors=[11111, 22222]
            ... )
        """
        if not psp_id:
            raise ValueError("Status page ID is required")
        
        payload = {'id': psp_id, **kwargs}
        
        # Convert monitors list to dash-separated string if provided
        if 'monitors' in kwargs and isinstance(kwargs['monitors'], list):
            payload['monitors'] = '-'.join(map(str, kwargs['monitors']))
        
        try:
            self._make_request('editPSP', payload)
            logger.info(f"Status page {psp_id} updated successfully")
            return True
            
        except UptimeRobotException as e:
            logger.error(f"Failed to edit status page {psp_id}: {e}")
            raise
    
    def delete_status_page(self, psp_id: int) -> bool:
        """
        Delete a status page.
        
        Args:
            psp_id: Status page ID to delete
        
        Returns:
            bool: True if successful
        
        Raises:
            ValueError: If psp_id is missing
            UptimeRobotException: If API request fails
        
        Example:
            >>> service.delete_status_page(psp_id=12345)
        """
        if not psp_id:
            raise ValueError("Status page ID is required")
        
        payload = {'id': psp_id}
        
        try:
            self._make_request('deletePSP', payload)
            logger.info(f"Status page {psp_id} deleted successfully")
            return True
            
        except UptimeRobotException as e:
            logger.error(f"Failed to delete status page {psp_id}: {e}")
            raise