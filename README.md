# 🏠 HA Device Manager

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Compatible-brightgreen.svg)](https://www.home-assistant.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.1.0-orange.svg)](manifest.json)
[![HACS](https://img.shields.io/badge/HACS-Compatible-brightgreen.svg)](https://github.com/hacs)

A Home Assistant extension for managing the structural abstraction of home automation devices with an independent internal SQLite database.

## ✨ Features

- 🗄️ **Independent SQLite Database** - Separate database from Home Assistant's
- 📝 **Complete CRUD** - Create, read, update, delete devices
- 🎨 **Modern Interface** - Responsive and elegant Lit/TypeScript frontend
- 🌍 **Multilingual** - FR/EN support with automatic detection
- 🔐 **HA Authentication** - Uses Home Assistant's native authentication system
- ⚡ **REST API** - Complete endpoints for integration

## 🎯 POC - Proof of Concept

This project is a functional POC demonstrating:
- Management of a simple `Device` entity (id, name)
- Complete Home Assistant custom component architecture
- Backend Python / frontend TypeScript separation
- Communication via secure REST API

### ⚠️ Security Notice (v0.1.0)

**This POC version has authentication disabled for development purposes.**  
For production deployment, authentication must be enabled in `api.py`.  
See [SECURITY.md](SECURITY.md) for details and recommendations.

## 🚀 Quick Installation

### Method 1: HACS (Home Assistant Community Store)

[![Add to HACS](https://img.shields.io/badge/HACS-Add%20Repository-brightgreen.svg)](https://hacs.xyz/docs/faq/custom_repositories)

1. Open **HACS** in your Home Assistant instance
2. Go to **Integrations**
3. Click the **⋮** menu (top right)
4. Select **Custom repositories**
5. Add this repository URL and select **Integration** as category
6. Click **Add**
7. Find **HA Device Manager** in the list
8. Click **Download**
9. **Restart Home Assistant**

### Method 2: Installation Script (Manual)

```bash
# Clone the project
git clone <repo-url> device_manager
cd device_manager

# Run installation
./install.sh /path/to/homeassistant/config

# Path examples:
# Home Assistant OS/Container: ./install.sh /config
# Home Assistant Core: ./install.sh /home/homeassistant/.homeassistant
```

The script will automatically:
- ✅ Build the frontend if necessary
- ✅ Copy the component to your HA configuration
- ✅ Install all required files

### Method 3: Manual Installation

#### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

#### 2. Copy Component

```bash
# Create destination folder
mkdir -p /config/custom_components/device_manager

# Copy component
cp -r custom_components/device_manager /config/custom_components/

# Copy compiled frontend
mkdir -p /config/custom_components/device_manager/frontend/dist
cp frontend/dist/device-manager.js /config/custom_components/device_manager/frontend/dist/
```

#### 3. Restart Home Assistant

```bash
# Via Home Assistant CLI
ha core restart

# Or via interface: Configuration > Server Controls > Restart
```

## 📋 Usage

### Accessing the Interface

Once installed and Home Assistant restarted:

1. **Via direct URL**: `http://your-ha-url:8123/device_manager`
2. **From menu** (if configured in your sidebar)

### CRUD Operations

#### Create a Device
1. Click on "Add Device"
2. Enter the device name
3. Click "Save"

#### Edit a Device
1. Click "Edit" next to the device
2. Modify the name
3. Click "Save"

#### Delete a Device
1. Click "Delete" next to the device
2. Confirm deletion

### REST API

The extension exposes a complete REST API:

#### List all devices
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  http://your-ha-url:8123/api/device_manager/devices
```

#### Create a device
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Living Room Light"}' \
  http://your-ha-url:8123/api/device_manager/devices
```

#### Update a device
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bedroom Light"}' \
  http://your-ha-url:8123/api/device_manager/devices/1
```

#### Delete a device
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  http://your-ha-url:8123/api/device_manager/devices/1
```

## 🏗️ Architecture

### Project Structure

```
device_manager/
├── custom_components/device_manager/    # Home Assistant component
│   ├── __init__.py                        # Entry point, initialization
│   ├── manifest.json                      # Component metadata
│   ├── const.py                           # Constants
│   ├── database.py                        # SQLite database manager
│   ├── api.py                             # REST API endpoints
│   ├── translations/                      # Translations
│   │   ├── en.json                       # English
│   │   └── fr.json                       # French
│   └── frontend/dist/                     # Compiled frontend
│       └── device-manager.js             # JS bundle
├── frontend/                              # Frontend source code
│   ├── src/
│   │   ├── device-manager-app.ts         # Main Lit component
│   │   ├── api-client.ts                 # API client
│   │   ├── i18n.ts                       # Translation system
│   │   └── types.ts                      # TypeScript types
│   ├── package.json                       # npm dependencies
│   ├── vite.config.ts                    # Build configuration
│   └── tsconfig.json                     # TypeScript configuration
├── install.sh                             # Installation script
└── README.md                              # Documentation
```

### Technologies Used

**Backend**:
- Python 3.11+
- Home Assistant Core
- aiohttp (web server)
- aiosqlite (database)

**Frontend**:
- TypeScript 5.x
- Lit 3.x (Web Components)
- Vite 5.x (Build tool)

### Database

The SQLite database is created at:
```
/config/custom_components/device_manager/devices.db
```

**`devices` Table**:
```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose (for local testing)

### Local Development with Docker (Recommended)

Test your changes without leaving VSCode using Docker Compose:

```bash
# Start local Home Assistant instance
./dev-start.sh

# Access the interface
# Home Assistant: http://localhost:8123
# Device Manager: http://localhost:8123/device_manager

# View logs
./dev-logs.sh

# Stop environment
./dev-stop.sh
```

**Development workflow**:
1. Edit code in `custom_components/` or `frontend/src/`
2. For frontend: `cd frontend && npm run build && cd ..`
3. Run: `docker compose restart`
4. Refresh browser (Ctrl+Shift+R)

**VSCode integration**: Press `Ctrl+Shift+B` for build tasks!

See [DEV_GUIDE.md](DEV_GUIDE.md) for detailed instructions.

### Development Environment Setup

```bash
# Clone the project
git clone <repo-url>
cd device_manager

# Install frontend dependencies
cd frontend
npm install

# Launch in dev mode (hot reload)
npm run dev
```

### Build Frontend

```bash
cd frontend
npm run build
```

The bundle will be generated in `frontend/dist/device-manager.js`

### Manual Testing

1. **Build**: Compile the frontend
2. **Installation**: Use the `./install.sh` script
3. **Restart**: Restart Home Assistant
4. **Verification**:
   - Access `/device_manager`
   - Test complete CRUD
   - Check SQLite database: `sqlite3 /config/custom_components/device_manager/devices.db "SELECT * FROM devices;"`
   - Check Home Assistant logs (no errors)

## 🐛 Troubleshooting

### Interface won't load

1. **Check that frontend is compiled**:
   ```bash
   ls -lh custom_components/device_manager/frontend/dist/device-manager.js
   ```

2. **Check Home Assistant logs**:
   ```bash
   # In Home Assistant
   tail -f /config/home-assistant.log | grep device_manager
   ```

3. **Check browser console** (F12) for JavaScript errors

### Authentication errors

1. **Check that you're logged into Home Assistant**
2. **Clear browser cache**
3. **Check Authorization headers** in requests (DevTools Network)

### Database not persisting

1. **Check permissions**:
   ```bash
   ls -la /config/custom_components/device_manager/devices.db
   ```

2. **Check logs** for SQLite errors

## 📝 Roadmap

### Version 1.1 (Next)
- [ ] Add additional fields (description, type, etc.)
- [ ] Filtering and search in list
- [ ] Pagination for large lists
- [ ] CSV Export/Import

### Version 2.0 (Future)
- [ ] Relations between devices
- [ ] Room/zone management
- [ ] Change history
- [ ] Statistics dashboard

## 🤝 Contribution

Contributions are welcome! Feel free to:
- Open issues to report bugs or feature requests
- Propose Pull Requests

### Commit convention

Follow the format:
```
type(scope): description

feature/new-feature
bugfix/bug-fix
```

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 👤 Author

**Theosakamg**
- GitHub: [@Theosakamg](https://github.com/Theosakamg)

## 🙏 Acknowledgments

- Home Assistant Community
- Lit Community
- All contributors

---

**Note**: This project is a POC (Proof of Concept) demonstrating the architecture of a Home Assistant custom component with an independent SQLite database. It serves as a foundation for more advanced home automation device management developments.
