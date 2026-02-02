# Centralized Uptime Monitoring Dashboard

**Uptime Kuma + Uptime Robot**

A centralized monitoring dashboard built with **Flask** that aggregates monitoring data from **Uptime Kuma (self‑hosted)** and **Uptime Robot (cloud)** into a single, unified interface.

This project helps reduce **tool sprawl** by providing one dashboard for viewing monitors, response times, uptime metrics, and status pages across both platforms.

---

## ✨ Features

### Unified Dashboard

* View Uptime Kuma and Uptime Robot monitors in one place
* Consistent status indicators (Up / Down / Paused)
* Auto‑refresh every 30 seconds

### Monitor Management

* Add, edit, delete monitors
* Supported monitor types:

  * HTTP(s)
  * Ping
  * Port
  * Keyword (Uptime Robot)
* Pause and resume monitors

### Detailed Monitor View

* Response time charts
* 24h / 30d uptime metrics
* Recent check history
* Incident summary

### Status Page Management

* Manage public status pages for:

  * Uptime Robot (PSP)
  * Uptime Kuma
* Add or remove monitors from status pages
* Direct links to public status pages

### Modern UI

* Clean flat UI design
* Dark / Light mode
* Toast notifications for actions

---

## 🏗️ Architecture Overview

<img width="742" height="575" alt="cent-dashboard-arch" src="https://github.com/user-attachments/assets/b190b928-a0ea-475a-90b2-c3cc74d0242d" />


---

## 📦 Project Structure

```
.
├── app.py
├── services/
│   ├── uptime_robot.py
│   ├── uptime_kuma.py
│   └── __init__.py
├── templates/
│   ├── dashboard.html
│   ├── monitor_detail.html
│   ├── status_pages.html
│   └── status_page_detail.html
├── static/
│   ├── css/
│   │   ├── style.css
│   │   ├── monitor_detail.css
│   │   └── status_page_detail.css
│   └── js/
│       ├── dashboard.js
│       ├── monitor_detail.js
│       ├── status_pages.js
│       └── status_page_detail.js
└── README.md
```

---

## 🔧 Requirements

### System Requirements

* Python **3.9+**
* Docker (for Uptime Kuma)
* Internet access (for Uptime Robot API)

### Python Dependencies

```bash
pip install flask requests uptime-kuma-api
```

---

## ⚙️ Prerequisites

### 1. Uptime Kuma

* Running locally or remotely
* Example URL:

  ```
  http://localhost:3001
  ```
* Ensure login credentials are valid

### 2. Uptime Robot

* Uptime Robot account
* Generate a **Read/Write API Key**
* API key format: `urxxxxxxxxxxxxxxxx`

---

## 🚀 Setup & Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/MadCypher56/uptime-kuma-robot.git
cd uptime-kuma-robot
```

### Step 2: Configure Credentials

Edit `app.py` and update the following:

```python
# Uptime Robot
UPTIME_ROBOT_API_KEY = "ur_xxxxxxxxxxxxxxxxx"

# Uptime Kuma
KUMA_URL = "http://localhost:3001"
KUMA_USERNAME = "<UPTIME-KUMA-USERNAME>"
KUMA_PASSWORD = "<UPTIME-KUMA-PASSWORD>"
```

> ⚠️ Do not commit real credentials. Use environment variables for production.

---

### Step 3: Run the Application

```bash
python app.py
```

Access the dashboard at:

```
http://localhost:5000
```

---

## 🖥️ Application Routes

| Route                 | Description                |
| --------------------- | -------------------------- |
| `/`                   | Main dashboard             |
| `/monitor-detail`     | Detailed monitor view      |
| `/status-pages`       | List all status pages      |
| `/status-page-detail` | Status page details        |
| `/api/status`         | Configuration health check |

---

## 🔍 How It Works

* Flask acts as a middleware layer
* Data is fetched from:

  * Uptime Robot REST API
  * Uptime Kuma via `uptime-kuma-api`
* Data is normalized into a common format
* Frontend dynamically renders metrics and charts

---

## 📊 Use Cases

* Teams using Uptime Kuma internally and Uptime Robot externally
* DevOps / SRE centralized monitoring
* Single-pane-of-glass monitoring demo

---

## 🔮 Future Enhancements

* Authentication & RBAC
* Alert aggregation
* Historical reporting
* Export metrics (CSV / JSON)
* Docker support for Flask app

---

## 🙌 Author

**Aditya Patel**, **Annie Dsouza**

---

⭐ If you find this project useful, consider starring the repository!
