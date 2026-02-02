# Uptime Kuma & Uptime Robot Dashboard

A unified, centralized monitoring dashboard that aggregates and displays uptime monitoring data from both **Uptime Kuma** (self-hosted) and **Uptime Robot** (cloud-based) services in a single, intuitive interface.

---

## 🎯 Problem Statement / Motivation

Organizations and developers often use multiple uptime monitoring solutions simultaneously:
- **Uptime Kuma** for self-hosted, privacy-focused monitoring
- **Uptime Robot** for cloud-based, managed monitoring services

This creates several challenges:
- **Fragmented Monitoring**: Need to switch between multiple dashboards to get a complete picture
- **Time Inefficiency**: Checking multiple interfaces increases response time during incidents
- **Complexity**: Managing monitors across different platforms is cumbersome
- **No Unified View**: Difficult to compare and correlate data from different sources

**Uptime Kuma Robot Dashboard** solves this by providing a single pane of glass for all your uptime monitoring needs, regardless of the underlying service provider.

---

## ✨ Features

- **Unified Dashboard**: View all monitors from both Uptime Kuma and Uptime Robot in one place
- **Real-time Status Updates**: Live monitoring status with automatic refresh
- **Multi-Source Integration**: Seamlessly connects to both Uptime Kuma and Uptime Robot APIs
- **Responsive Design**: Modern, mobile-friendly UI that works on all devices
- **Status Aggregation**: Combined view of uptime statistics across platforms
- **Easy Configuration**: Simple environment-based setup
- **Lightweight**: Built with Flask for minimal resource footprint
- **Clean UI/UX**: Intuitive interface for quick status checks

---

## 🏗️ Architecture / Design

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser (User)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Flask Application (app.py)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Dashboard Routes & Logic                │    │
│  └─────────────────────────────────────────────────┘    │
└──────────┬────────────────────────────┬─────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Uptime Kuma Service │    │  Uptime Robot API    │
│  (services/kuma.py)  │    │  (services/robot.py) │
└──────────┬───────────┘    └──────────┬───────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Uptime Kuma Server  │    │  Uptime Robot Cloud  │
│  (Self-hosted)       │    │  (Cloud Service)     │
└──────────────────────┘    └──────────────────────┘
```

**Key Components:**
- **Frontend**: HTML templates with CSS/JavaScript for dynamic updates
- **Backend**: Flask application handling API requests and data aggregation
- **Service Layer**: Separate modules for Uptime Kuma and Uptime Robot integrations
- **API Integration**: RESTful communication with external monitoring services

---

## 🛠️ Tech Stack

### Backend
- **Python 3.x** - Core programming language
- **Flask** - Lightweight web framework
- **Requests** - HTTP library for API calls

### Frontend
- **HTML5** - Page structure
- **CSS3** - Styling and responsive design
- **JavaScript** - Dynamic UI updates and interactivity

### Monitoring Services
- **Uptime Kuma API** - Self-hosted monitoring platform
- **Uptime Robot API** - Cloud-based monitoring service

### Development Tools
- **Git** - Version control
- **pip** - Python package management

---

## 📸 Screenshots / Demo


### Main Dashboard View

<img width="1909" height="908" alt="image" src="https://github.com/user-attachments/assets/523ca444-0a64-4fde-88ee-9c6dac425042" />

### Monitor Status Cards

<img width="1449" height="776" alt="image" src="https://github.com/user-attachments/assets/126dae73-826f-4867-8f5c-95ab340a7e3a" />

---

## 🚀 Setup / Installation Instructions

### Prerequisites
- Python 3.7 or higher
- pip (Python package manager)
- Access to Uptime Kuma instance
- Uptime Robot API key

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/MadCypher56/uptime-kuma-robot.git
   cd uptime-kuma-robot
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your credentials (see Configuration section below)

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the dashboard**
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:
```env
UPTIME_ROBOT_API_KEY=''
UPTIME_KUMA_URL=''
UPTIME_KUMA_USERNAME=''
UPTIME_KUMA_PASSWORD=''
```

### Getting API Credentials

#### Uptime Kuma
1. Log in to your Uptime Kuma instance
2. Navigate to Settings → API Keys
3. Generate a new API key or use username/password authentication
4. Copy the credentials to your `.env` file

#### Uptime Robot
1. Log in to your [Uptime Robot account](https://uptimerobot.com/)
2. Go to My Settings → API Settings
3. Generate or copy your Main API Key
4. Add it to your `.env` file as `UPTIME_ROBOT_API_KEY`

### Configuration File Structure

```
uptime-kuma-robot/
├── .env                 # Environment variables (DO NOT COMMIT)
├── .env.example         # Template for environment variables
├── app.py              # Main application file
├── requirements.txt    # Python dependencies
├── services/           # Service integration modules
│   ├── __init__.py
│   ├── kuma.py        # Uptime Kuma API integration
│   └── robot.py       # Uptime Robot API integration
├── static/            # CSS, JS, images
│   ├── css/
│   └── js/
└── templates/         # HTML templates
    └── index.html
```

---

## 📖 Usage Instructions

### Basic Usage

 *(Note: Setup Uptime-Kuma first)

1. **Start the application**
   ```bash
   python app.py
   ```

2. **View your monitors**
   - The dashboard will automatically load all monitors from both services
   - Status updates occur based on the configured refresh interval

3. **Understanding the Status Indicators**
   - 🟢 **Green**: Service is up and running
   - 🔴 **Red**: Service is down
   - 🟡 **Yellow**: Service is in warning state
   - ⚪ **Gray**: Status unknown or paused

### Advanced Features

#### Manual Refresh
Click the refresh button to manually update monitor statuses without waiting for the auto-refresh interval.

#### Filtering Monitors
Use the filter options to view monitors by:
- Service type (Uptime Kuma / Uptime Robot)
- Status (Up / Down / Paused)
- Monitor type (HTTP / TCP / Ping / etc.)

#### Monitor Details
Click on any monitor card to view detailed information including:
- Response time history
- Uptime percentage
- Recent incidents
- Configuration details

---

## 🔒 Security Notes

### Important Security Considerations

1. **Environment Variables**
   - Never commit `.env` file to version control
   - The `.env.example` file is provided as a template only
   - `.gitignore` is configured to exclude `.env` files

2. **API Keys and Credentials**
   - Store all sensitive credentials in environment variables
   - Use strong, unique passwords for Uptime Kuma
   - Rotate API keys periodically
   - Limit API key permissions to read-only when possible

3. **Network Security**
   - Run the application behind a reverse proxy (nginx/Apache) in production
   - Use HTTPS for all connections
   - Implement rate limiting to prevent abuse
   - Consider using a firewall to restrict access

4. **Application Security**
   - Keep all dependencies up to date: `pip install --upgrade -r requirements.txt`
   - Use a production WSGI server (gunicorn/uWSGI) instead of Flask's development server
   - Set `FLASK_ENV=production` in production environments
   - Implement authentication if exposing to the internet

5. **Deployment Best Practices**
   ```bash
   # Example production setup with gunicorn
   gunicorn -w 4 -b 0.0.0.0:8000 app:app
   ```

6. **Monitoring Access**
   - Ensure Uptime Kuma instance is accessible from where this app runs
   - Use VPN or SSH tunnels for accessing self-hosted instances
   - Whitelist IP addresses if possible

### Recommended Security Checklist

- [ ] Environment variables configured correctly
- [ ] `.env` file is in `.gitignore`
- [ ] Strong SECRET_KEY generated
- [ ] API keys have minimal required permissions
- [ ] Application running behind reverse proxy
- [ ] HTTPS enabled
- [ ] Regular dependency updates scheduled
- [ ] Access logs monitored
- [ ] Backup strategy in place

---

## 🚧 Future Improvements / Roadmap

### Planned Features
- [ ] **Authentication System**: Add user login and role-based access control
- [ ] **Dark Mode**: Implement theme switching for better usability
- [ ] **Export Functionality**: Export monitor data to CSV/JSON
- [ ] **Custom Notifications**: Email/Slack alerts for status changes
- [ ] **Search & Filter**: Advanced search and filtering options
- [ ] **Docker Support**: Create Dockerfile for easy deployment

### Community Requests
Have a feature request? [Open an issue](https://github.com/MadCypher56/uptime-kuma-robot/issues) on GitHub!

---

## 🙏 Acknowledgments

- [Uptime Kuma](https://github.com/louislam/uptime-kuma) - Fantastic self-hosted monitoring tool
- [Uptime Robot](https://uptimerobot.com/) - Reliable cloud monitoring service
- Flask community for the excellent web framework
- All contributors who help improve this project

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/MadCypher56/uptime-kuma-robot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MadCypher56/uptime-kuma-robot/discussions)

---

## 📊 Project Status

![GitHub last commit](https://img.shields.io/github/last-commit/MadCypher56/uptime-kuma-robot)
![GitHub issues](https://img.shields.io/github/issues/MadCypher56/uptime-kuma-robot)
![GitHub stars](https://img.shields.io/github/stars/MadCypher56/uptime-kuma-robot)
![GitHub license](https://img.shields.io/github/license/MadCypher56/uptime-kuma-robot)

---

**Made with ❤️ by [MadCypher56](https://github.com/MadCypher56)**
