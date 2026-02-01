"""
Uptime Kuma Service Module - Enhanced Version
==============================================

This module provides a clean interface for interacting with Uptime Kuma via its API.
Enhanced to properly fetch detailed metrics including heartbeats and uptime data.

Classes:
    UptimeKumaService: Main service class for Uptime Kuma operations

Usage:
    service = UptimeKumaService(url="http://localhost:3001", username="admin", password="password")
    monitors = service.get_monitors()
    service.add_monitor(name="My Site", url="https://example.com")
"""

from typing import Dict, List, Optional, Any
import logging

# Configure logging
logger = logging.getLogger(__name__)


class UptimeKumaException(Exception):
    """Custom exception for Uptime Kuma API errors"""
    pass


class UptimeKumaService:
    """
    Service class for interacting with Uptime Kuma API.
    
    This class provides methods for all CRUD operations on monitors,
    using the uptime-kuma-api library with enhanced data fetching.
    
    Attributes:
        url (str): Uptime Kuma instance URL
        username (str): Login username
        password (str): Login password
        api: UptimeKumaApi instance (lazy loaded)
    
    Example:
        >>> service = UptimeKumaService(
        ...     url="http://localhost:3001",
        ...     username="admin",
        ...     password="password"
        ... )
        >>> monitors = service.get_monitors()
        >>> print(f"Found {len(monitors)} monitors")
    """
    
    # Monitor status codes
    STATUS_DOWN = 0
    STATUS_UP = 1
    STATUS_PENDING = 2
    STATUS_MAINTENANCE = 3
    
    def __init__(self, url: str, username: str, password: str):
        """
        Initialize the Uptime Kuma service.
        
        Args:
            url: Uptime Kuma instance URL (e.g., "http://localhost:3001")
            username: Login username
            password: Login password
        
        Raises:
            ValueError: If any required parameter is missing
        """
        if not all([url, username, password]):
            raise ValueError("URL, username, and password are required")
        
        self.url = url.rstrip('/')
        self.username = username
        self.password = password
        self._api = None
        
        logger.info(f"UptimeKumaService initialized for {self.url}")
    
    def _get_api(self):
        """
        Get or create API instance.
        
        Returns:
            UptimeKumaApi: Connected API instance
        
        Raises:
            UptimeKumaException: If connection or login fails
        """
        if self._api is not None:
            return self._api
        
        try:
            from uptime_kuma_api import UptimeKumaApi
            
            logger.debug(f"Connecting to Uptime Kuma at {self.url}")
            api = UptimeKumaApi(self.url)
            api.login(self.username, self.password)
            
            self._api = api
            logger.info("Successfully connected to Uptime Kuma")
            return self._api
            
        except ImportError:
            raise UptimeKumaException(
                "uptime-kuma-api library not installed. "
                "Run: pip install uptime-kuma-api"
            )
        except Exception as e:
            error_msg = str(e).lower()
            
            if 'login' in error_msg or 'auth' in error_msg:
                raise UptimeKumaException(
                    f"Authentication failed - Check username and password: {e}"
                )
            elif 'connect' in error_msg or 'connection' in error_msg:
                raise UptimeKumaException(
                    f"Cannot connect to {self.url} - Check URL and ensure Uptime Kuma is running: {e}"
                )
            else:
                raise UptimeKumaException(f"Failed to initialize API: {e}")
    
    def _disconnect(self):
        """Disconnect from API if connected."""
        if self._api is not None:
            try:
                self._api.disconnect()
                logger.debug("Disconnected from Uptime Kuma")
            except Exception as e:
                logger.warning(f"Error during disconnect: {e}")
            finally:
                self._api = None
    
    def get_monitors(self) -> List[Dict[str, Any]]:
        """
        Fetch all monitors from Uptime Kuma with detailed metrics.
        
        Returns:
            list: List of monitor dictionaries with standardized fields
        
        Raises:
            UptimeKumaException: If fetching monitors fails
        
        Example:
            >>> monitors = service.get_monitors()
            >>> for monitor in monitors:
            ...     print(f"{monitor['name']}: {monitor['status']}")
        """
        api = None
        try:
            api = self._get_api()
            monitors_data = api.get_monitors()
            
            monitors = []
            for monitor in monitors_data:
                # Get detailed data for each monitor
                try:
                    monitor_id = monitor.get('id')
                    if monitor_id:
                        # Fetch heartbeats for more accurate status and metrics
                        heartbeats = api.get_monitor_beats(monitor_id, hours=24)
                        monitor['_heartbeats'] = heartbeats
                except Exception as e:
                    logger.warning(f"Could not fetch heartbeats for monitor {monitor.get('id')}: {e}")
                    monitor['_heartbeats'] = []
                
                monitors.append(self._format_monitor(monitor))
            
            logger.info(f"Retrieved {len(monitors)} monitors with detailed metrics")
            return monitors
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to get monitors: {e}")
            raise UptimeKumaException(f"Failed to get monitors: {e}")
        finally:
            if api:
                self._disconnect()
    
    def _format_monitor(self, monitor: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format a raw monitor response into a standardized structure with detailed metrics.
        
        Args:
            monitor: Raw monitor data from API
        
        Returns:
            dict: Formatted monitor data with consistent structure and detailed stats
        """
        monitor_name = monitor.get('name', 'Unknown')
        
        # Extract heartbeats
        heartbeats = monitor.get('_heartbeats', [])
        
        # Log heartbeat data for debugging
        if heartbeats:
            logger.debug(f"Monitor '{monitor_name}': {len(heartbeats)} heartbeats fetched")
            recent_statuses = [beat.get('status') for beat in heartbeats[:5]]
            logger.debug(f"Monitor '{monitor_name}': Recent heartbeat statuses: {recent_statuses}")
        else:
            logger.warning(f"Monitor '{monitor_name}': No heartbeats available")
        
        # Calculate uptime from heartbeats if available
        uptime_24h = self._calculate_uptime_from_heartbeats(heartbeats)
        uptime_30d = uptime_24h  # Use same for now, could fetch 30d separately
        
        # Get response time data
        avg_response_time = 'N/A'
        current_response_time = 'N/A'
        
        # Get average ping from heartbeats
        if heartbeats:
            ping_values = [beat.get('ping', 0) for beat in heartbeats if beat.get('ping') is not None and beat.get('ping') > 0]
            if ping_values:
                avg_response_time = f"{sum(ping_values) / len(ping_values):.0f}"
                current_response_time = f"{ping_values[-1]:.0f}"  # Most recent
        
        # Determine actual status from heartbeats
        is_up = self._determine_status_from_heartbeats(monitor, heartbeats)
        
        logger.info(f"Monitor '{monitor_name}': Determined status = {'UP' if is_up else 'DOWN'}, "
                   f"Uptime = {uptime_24h}%, Avg Response = {avg_response_time}ms")
        
        # Get monitor type
        monitor_type = self._get_monitor_type(monitor.get('type'))
        
        return {
            'id': monitor.get('id'),
            'name': monitor_name,
            'url': monitor.get('url', 'N/A'),
            'status': is_up,  # True = UP, False = DOWN
            'uptime': uptime_24h,  # Overall uptime
            'uptime_24h': uptime_24h,  # 24-hour uptime
            'uptime_7d': uptime_24h,    # 7-day uptime (using 24h as approximation)
            'uptime_30d': uptime_30d,  # 30-day uptime
            'response_time': current_response_time,  # Current response time
            'avg_response_time': avg_response_time,  # Average response time
            'type': monitor_type,
            'active': monitor.get('active', True),  # Monitor enabled/disabled
            'interval': monitor.get('interval', 60),
            'custom_uptime_ratio': uptime_24h,  # For compatibility
            'custom_uptime_ranges': [uptime_24h, uptime_24h, uptime_30d],
            'logs': heartbeats[:20] if heartbeats else []  # Last 20 checks
        }
    
    def _calculate_uptime_from_heartbeats(self, heartbeats: List[Dict[str, Any]]) -> str:
        """
        Calculate uptime percentage from heartbeat data.
        
        Args:
            heartbeats: List of heartbeat records
        
        Returns:
            str: Uptime percentage as string (e.g., "99.5")
        """
        if not heartbeats:
            return 'N/A'
        
        try:
            # Count successful checks (status == 1)
            total_checks = len(heartbeats)
            successful_checks = sum(1 for beat in heartbeats if beat.get('status') == 1)
            
            if total_checks == 0:
                return 'N/A'
            
            uptime_percentage = (successful_checks / total_checks) * 100
            return f"{uptime_percentage:.2f}"
            
        except Exception as e:
            logger.warning(f"Error calculating uptime: {e}")
            return 'N/A'
    
    def _determine_status_from_heartbeats(self, monitor: Dict[str, Any], heartbeats: List[Dict[str, Any]]) -> bool:
        """
        Determine the actual UP/DOWN status from monitor data and heartbeats.
        
        Args:
            monitor: Monitor data dictionary
            heartbeats: List of recent heartbeat records
        
        Returns:
            bool: True if UP, False if DOWN
        """
        # First check if monitor is active
        if not monitor.get('active', True):
            logger.debug(f"Monitor {monitor.get('name')}: inactive")
            return False
        
        # Check most recent heartbeat
        if heartbeats:
            # Get the most recent heartbeat
            recent_beats = sorted(heartbeats, key=lambda x: x.get('time', 0), reverse=True)
            if recent_beats:
                most_recent = recent_beats[0]
                status = most_recent.get('status')
                
                # Status: 0 = DOWN, 1 = UP, 2 = PENDING
                if status == 1:
                    logger.debug(f"Monitor {monitor.get('name')}: UP (from recent heartbeat)")
                    return True
                elif status == 0:
                    logger.debug(f"Monitor {monitor.get('name')}: DOWN (from recent heartbeat)")
                    return False
                elif status == 2:
                    logger.debug(f"Monitor {monitor.get('name')}: PENDING (from recent heartbeat)")
                    return False  # Treat PENDING as DOWN for safety
        
        # Fallback to monitor's status field
        if 'status' in monitor and monitor['status'] is not None:
            status_code = monitor['status']
            logger.debug(f"Monitor {monitor.get('name')}: status field = {status_code}")
            return status_code == self.STATUS_UP
        
        # CRITICAL FIX: If we can't determine status and have no heartbeats, assume DOWN
        # This prevents showing monitors as UP when they're actually unreachable
        logger.warning(f"Monitor {monitor.get('name')}: Unable to determine status from heartbeats or status field, defaulting to DOWN")
        return False
    
    def _get_monitor_type(self, type_value: Any) -> str:
        """
        Convert monitor type code to readable string.
        
        Args:
            type_value: Monitor type code
        
        Returns:
            str: Human-readable type name
        """
        type_map = {
            'http': 'HTTP(s)',
            'https': 'HTTP(s)',
            'port': 'Port',
            'ping': 'Ping',
            'keyword': 'Keyword',
            'dns': 'DNS',
            'docker': 'Docker',
            'push': 'Push',
            'steam': 'Steam',
            'gamedig': 'GameDig',
            'mqtt': 'MQTT',
            'sqlserver': 'SQL Server',
            'postgres': 'PostgreSQL',
            'mysql': 'MySQL',
            'mongodb': 'MongoDB',
            'radius': 'RADIUS'
        }
        
        if isinstance(type_value, str):
            return type_map.get(type_value.lower(), type_value.upper())
        
        return 'HTTP(s)'  # Default
    
    def get_monitor(self, monitor_id: int) -> Dict[str, Any]:
        """
        Get detailed information for a specific monitor.
        
        Args:
            monitor_id: ID of the monitor to fetch
        
        Returns:
            dict: Detailed monitor data
        
        Raises:
            ValueError: If monitor_id is not provided
            UptimeKumaException: If API request fails
        
        Example:
            >>> monitor = service.get_monitor(1)
            >>> print(monitor['name'])
        """
        if not monitor_id:
            raise ValueError("Monitor ID is required")
        
        api = None
        try:
            api = self._get_api()
            monitor = api.get_monitor(monitor_id)
            
            # Fetch heartbeats
            try:
                heartbeats = api.get_monitor_beats(monitor_id, hours=24)
                monitor['_heartbeats'] = heartbeats
            except Exception as e:
                logger.warning(f"Could not fetch heartbeats: {e}")
                monitor['_heartbeats'] = []
            
            logger.info(f"Retrieved monitor {monitor_id}")
            return self._format_monitor(monitor)
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to get monitor {monitor_id}: {e}")
            raise UptimeKumaException(f"Failed to get monitor: {e}")
        finally:
            if api:
                self._disconnect()
    
    def add_monitor(self, name: str, url: Optional[str] = None, 
                   monitor_type: str = 'http', **kwargs) -> Dict[str, Any]:
        """
        Add a new monitor to Uptime Kuma.
        
        Args:
            name: Monitor name
            url: URL to monitor (required for http/https monitors)
            monitor_type: Type of monitor ('http', 'port', 'ping', etc.)
            **kwargs: Additional monitor parameters (interval, timeout, etc.)
        
        Returns:
            dict: Created monitor data
        
        Raises:
            ValueError: If required parameters are missing
            UptimeKumaException: If API request fails
        
        Example:
            >>> monitor = service.add_monitor(
            ...     name="My Website",
            ...     url="https://example.com",
            ...     monitor_type="http",
            ...     interval=60
            ... )
        """
        if not name:
            raise ValueError("Monitor name is required")
        
        if monitor_type.lower() in ['http', 'https'] and not url:
            raise ValueError("URL is required for HTTP monitors")
        
        api = None
        try:
            api = self._get_api()
            
            monitor = api.add_monitor(
                type=monitor_type,
                name=name,
                url=url,
                **kwargs
            )
            
            logger.info(f"Monitor '{name}' created successfully")
            return self._format_monitor(monitor)
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to add monitor '{name}': {e}")
            raise UptimeKumaException(f"Failed to add monitor: {e}")
        finally:
            if api:
                self._disconnect()
    
    def edit_monitor(self, monitor_id: int, **kwargs) -> bool:
        """
        Edit an existing monitor.
        
        Args:
            monitor_id: ID of the monitor to edit
            **kwargs: Fields to update (name, url, interval, etc.)
        
        Returns:
            bool: True if successful
        
        Raises:
            ValueError: If monitor_id is not provided
            UptimeKumaException: If API request fails
        
        Example:
            >>> service.edit_monitor(1, name="Updated Name", interval=120)
        """
        if not monitor_id:
            raise ValueError("Monitor ID is required")
        
        api = None
        try:
            api = self._get_api()
            
            # Get current monitor data
            monitor = api.get_monitor(monitor_id)
            
            # Update with new values
            for key, value in kwargs.items():
                if value is not None:
                    monitor[key] = value
            
            # Save the monitor
            api.edit_monitor(monitor_id, **monitor)
            
            logger.info(f"Monitor {monitor_id} updated successfully")
            return True
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to edit monitor {monitor_id}: {e}")
            raise UptimeKumaException(f"Failed to edit monitor: {e}")
        finally:
            if api:
                self._disconnect()
    
    def delete_monitor(self, monitor_id: int) -> bool:
        """
        Delete a monitor.
        
        Args:
            monitor_id: ID of the monitor to delete
        
        Returns:
            bool: True if successful
        
        Raises:
            ValueError: If monitor_id is not provided
            UptimeKumaException: If API request fails
        
        Example:
            >>> service.delete_monitor(1)
        """
        if not monitor_id:
            raise ValueError("Monitor ID is required")
        
        api = None
        try:
            api = self._get_api()
            
            api.delete_monitor(monitor_id)
            
            logger.info(f"Monitor {monitor_id} deleted successfully")
            return True
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete monitor {monitor_id}: {e}")
            raise UptimeKumaException(f"Failed to delete monitor: {e}")
        finally:
            if api:
                self._disconnect()
    
    def pause_monitor(self, monitor_id: int) -> bool:
        """
        Pause a monitor (set active to False).
        
        Args:
            monitor_id: ID of the monitor to pause
        
        Returns:
            bool: True if successful
        """
        return self.edit_monitor(monitor_id, active=False)
    
    def resume_monitor(self, monitor_id: int) -> bool:
        """
        Resume a paused monitor (set active to True).
        
        Args:
            monitor_id: ID of the monitor to resume
        
        Returns:
            bool: True if successful
        """
        return self.edit_monitor(monitor_id, active=True)
    
    def get_status_text(self, status_code: int) -> str:
        """
        Get human-readable status text.
        
        Args:
            status_code: Numeric status code
        
        Returns:
            str: Status text
        """
        status_map = {
            self.STATUS_DOWN: 'Down',
            self.STATUS_UP: 'Up',
            self.STATUS_PENDING: 'Pending',
            self.STATUS_MAINTENANCE: 'Maintenance'
        }
        return status_map.get(status_code, 'Unknown')
    
    # ==================== STATUS PAGE METHODS ====================
    
    def get_status_pages(self) -> List[Dict[str, Any]]:
        """
        Get all status pages from Uptime Kuma.
        
        Returns:
            list: List of status page dictionaries
        
        Raises:
            UptimeKumaException: If fetching status pages fails
        """
        api = None
        try:
            api = self._get_api()
            status_pages = api.get_status_pages()
            
            logger.info(f"Retrieved {len(status_pages)} status pages")
            return status_pages
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to get status pages: {e}")
            raise UptimeKumaException(f"Failed to get status pages: {e}")
        finally:
            if api:
                self._disconnect()
    
    def get_status_page(self, slug: str) -> Dict[str, Any]:
        """
        Get a specific status page by slug.
        
        Args:
            slug: Status page slug/identifier
        
        Returns:
            dict: Status page data
        """
        if not slug:
            raise ValueError("Slug is required")
        
        api = None
        try:
            api = self._get_api()
            status_page = api.get_status_page(slug)
            
            logger.info(f"Retrieved status page: {slug}")
            return status_page
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to get status page '{slug}': {e}")
            raise UptimeKumaException(f"Failed to get status page: {e}")
        finally:
            if api:
                self._disconnect()
    
    def add_status_page(self, slug: str, title: str, **kwargs) -> Dict[str, Any]:
        """
        Add a new status page to Uptime Kuma.
        
        Args:
            slug: Unique identifier for the page (URL-friendly)
            title: Display title for the page
            **kwargs: Additional page parameters
        
        Returns:
            dict: Created status page data
        """
        if not slug or not title:
            raise ValueError("Slug and title are required")
        
        api = None
        try:
            api = self._get_api()
            
            status_page = api.add_status_page(
                slug=slug,
                title=title,
                **kwargs
            )
            
            logger.info(f"Status page '{title}' created successfully")
            return status_page
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to add status page '{title}': {e}")
            raise UptimeKumaException(f"Failed to add status page: {e}")
        finally:
            if api:
                self._disconnect()
    
    def save_status_page(self, slug: str, **kwargs) -> bool:
        """
        Save/update an existing status page.
        
        Args:
            slug: Status page slug to update
            **kwargs: Fields to update
        
        Returns:
            bool: True if successful
        """
        if not slug:
            raise ValueError("Slug is required")
        
        api = None
        try:
            api = self._get_api()
            
            api.save_status_page(slug, **kwargs)
            
            logger.info(f"Status page '{slug}' saved successfully")
            return True
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to save status page '{slug}': {e}")
            raise UptimeKumaException(f"Failed to save status page: {e}")
        finally:
            if api:
                self._disconnect()
    
    def delete_status_page(self, slug: str) -> bool:
        """
        Delete a status page.
        
        Args:
            slug: Status page slug to delete
        
        Returns:
            bool: True if successful
        """
        if not slug:
            raise ValueError("Slug is required")
        
        api = None
        try:
            api = self._get_api()
            
            api.delete_status_page(slug)
            
            logger.info(f"Status page '{slug}' deleted successfully")
            return True
            
        except UptimeKumaException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete status page '{slug}': {e}")
            raise UptimeKumaException(f"Failed to delete status page: {e}")
        finally:
            if api:
                self._disconnect()