# 🛠️ Development Guide - HA Device Manager

This guide explains how to develop and test HA Device Manager locally using Docker Compose without leaving VSCode.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- VSCode with recommended extensions:
  - Python
  - ESLint
  - Prettier
  - Lit Plugin

### Start Development Environment

```bash
# Make scripts executable (first time only)
chmod +x dev-start.sh dev-stop.sh dev-logs.sh

# Start Home Assistant in Docker
./dev-start.sh
```

This will:
1. ✅ Build the frontend if not already built
2. ✅ Start Home Assistant in a Docker container
3. ✅ Mount your custom component for live development
4. ✅ Expose Home Assistant on http://localhost:8123

### First Setup

1. Wait ~30 seconds for Home Assistant to start
2. Open http://localhost:8123 in your browser
3. Complete the onboarding wizard (create a user account)
4. Navigate to http://localhost:8123/ha_device_manager

**Default credentials** (you'll create these during onboarding):
- Username: `admin` (or your choice)
- Password: `admin` (or your choice)

## 📂 Project Structure

```
HA_device_manager/
├── docker-compose.yml          # Docker Compose configuration
├── dev-config/                 # Home Assistant config for development
│   └── configuration.yaml      # HA configuration
├── dev-start.sh               # Start development environment
├── dev-stop.sh                # Stop development environment
├── dev-logs.sh                # View filtered logs
├── .vscode/
│   ├── launch.json            # Debug configurations
│   └── tasks.json             # VSCode tasks
└── custom_components/         # Your component code
```

## 💻 Development Workflow

### Workflow 1: Backend Python Changes

1. **Edit Python files** in `custom_components/ha_device_manager/`
2. **Restart Home Assistant**:
   ```bash
   docker compose restart
   ```
3. **Check logs**:
   ```bash
   ./dev-logs.sh
   # Or: docker compose logs -f homeassistant
   ```
4. **Refresh browser** to test changes

### Workflow 2: Frontend TypeScript Changes

1. **Edit TypeScript files** in `frontend/src/`
2. **Rebuild frontend**:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
3. **Copy to component**:
   ```bash
   cp frontend/dist/device-manager.js custom_components/ha_device_manager/frontend/dist/
   ```
4. **Restart Home Assistant**:
   ```bash
   docker compose restart
   ```
5. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)

### Workflow 3: Using VSCode Tasks (Recommended)

Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac) and select:

- **Start Dev Environment** - Starts Docker Compose
- **Build Frontend** - Compiles TypeScript
- **Build & Restart HA** - Builds frontend, copies to component, restarts HA
- **Stop Dev Environment** - Stops Docker containers
- **View Logs** - Opens filtered log viewer
- **Open in Browser** - Opens the interface in your browser

## 🐛 Debugging

### Backend (Python)

1. Add breakpoints in VSCode in your Python files
2. Press F5 or use Debug panel
3. Select "Python: Attach to HA Container"

### Frontend (TypeScript)

1. Press F5 or use Debug panel
2. Select "Chrome: Debug Frontend"
3. VSCode will open Chrome with debugging enabled
4. Set breakpoints in your TypeScript files

### View Logs

```bash
# Filtered logs (recommended)
./dev-logs.sh

# All logs
docker compose logs -f homeassistant

# Last 100 lines
docker compose logs --tail=100 homeassistant
```

## 🔄 Common Commands

```bash
# Start environment
./dev-start.sh

# Stop environment
./dev-stop.sh

# Restart Home Assistant
docker compose restart

# View logs
./dev-logs.sh

# Rebuild and restart
docker compose up -d --force-recreate

# Stop and remove everything (including data)
docker compose down -v

# Access Home Assistant CLI
docker compose exec homeassistant /bin/bash
```

## 🧪 Testing

### Manual Testing

1. **Access the interface**: http://localhost:8123/ha_device_manager
2. **Test CRUD operations**:
   - Create device: Add "Test Device"
   - Read devices: Refresh page, verify persistence
   - Update device: Edit name to "Modified Device"
   - Delete device: Remove the device

### API Testing

Get a long-lived access token:
1. Open Home Assistant: http://localhost:8123
2. Click on your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Copy the token

Test API endpoints:

```bash
# Set your token
TOKEN="your_token_here"

# List devices
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8123/api/ha_device_manager/devices

# Create device
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "API Test Device"}' \
  http://localhost:8123/api/ha_device_manager/devices

# Update device
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Device"}' \
  http://localhost:8123/api/ha_device_manager/devices/1

# Delete device
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8123/api/ha_device_manager/devices/1
```

### Database Inspection

```bash
# Access SQLite database
docker compose exec homeassistant sqlite3 /config/custom_components/ha_device_manager/devices.db

# Run queries
sqlite> SELECT * FROM devices;
sqlite> .schema devices
sqlite> .exit
```

## 📁 Data Persistence

- **Configuration**: `dev-config/` directory
- **Database**: `dev-config/custom_components/ha_device_manager/devices.db`
- **Logs**: `dev-config/home-assistant.log`

To reset everything:
```bash
docker compose down -v
rm -rf dev-config/*
./dev-start.sh
```

## 🔧 Configuration

### Customize Home Assistant

Edit `dev-config/configuration.yaml`:

```yaml
# Add your custom configuration
homeassistant:
  name: My Custom Setup
  
# Enable additional integrations
person:
automation:
script:
```

### Change Port

Edit `docker-compose.yml`:

```yaml
ports:
  - "8124:8123"  # Use port 8124 instead
```

## ⚠️ Troubleshooting

### Container won't start

```bash
# Check Docker status
docker ps -a

# View container logs
docker compose logs homeassistant

# Remove and recreate
docker compose down
docker compose up -d
```

### Frontend not updating

```bash
# Hard rebuild frontend
cd frontend
rm -rf dist/
npm run build
cd ..

# Force copy
cp frontend/dist/device-manager.js custom_components/ha_device_manager/frontend/dist/

# Restart HA
docker compose restart

# Clear browser cache (Ctrl+Shift+Delete)
```

### Permission errors

```bash
# Fix permissions
sudo chown -R $USER:$USER dev-config/

# Or run with proper permissions
docker compose down
rm -rf dev-config/
./dev-start.sh
```

### Port 8123 already in use

```bash
# Find what's using the port
sudo lsof -i :8123

# Kill the process or change port in docker-compose.yml
```

## 🎯 Best Practices

1. **Always use the dev environment** for testing, never modify production HA
2. **Test in both FR and EN** by changing browser language
3. **Check logs after each change** to catch errors early
4. **Use git branches** for new features
5. **Commit working code frequently**

## 📚 Additional Resources

- [Home Assistant Developer Docs](https://developers.home-assistant.io/)
- [Lit Documentation](https://lit.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🚀 Production Deployment

When ready to deploy to production:

```bash
# Stop dev environment
./dev-stop.sh

# Use the production install script
./install.sh /path/to/production/ha/config

# Restart production Home Assistant
```

---

**Happy coding!** If you have questions, check the logs first (`./dev-logs.sh`), then open an issue.
