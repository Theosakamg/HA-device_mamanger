# Test Guide - HA Device Manager

## Prerequisites

Before testing, ensure you have:
- ✅ Home Assistant instance running (version 2023.x or newer)
- ✅ Access to Home Assistant configuration directory
- ✅ Node.js 18+ installed (for frontend development)
- ✅ Ability to restart Home Assistant

## Test Checklist

### 1. Installation Test

#### Automated Installation

```bash
# From the project root directory
./install.sh /path/to/your/ha/config
```

**Expected Result**:
- ✅ No errors during installation
- ✅ Component copied to `/config/custom_components/ha_device_manager/`
- ✅ Frontend bundle present at `custom_components/ha_device_manager/frontend/dist/device-manager.js`

**Verification**:
```bash
ls -la /config/custom_components/ha_device_manager/
# Should show: __init__.py, api.py, database.py, const.py, manifest.json, translations/, frontend/
```

#### Manual Installation

If automated installation fails:

```bash
# Build frontend
cd frontend
npm install
npm run build

# Copy component
cp -r custom_components/ha_device_manager /config/custom_components/

# Copy frontend bundle
mkdir -p /config/custom_components/ha_device_manager/frontend/dist
cp frontend/dist/device-manager.js /config/custom_components/ha_device_manager/frontend/dist/
```

### 2. Home Assistant Startup Test

**Steps**:
1. Restart Home Assistant
2. Check logs for errors

**Expected Result**:
```log
INFO - Setting up HA Device Manager
INFO - Database path: /config/custom_components/ha_device_manager/devices.db
INFO - Database initialized successfully
INFO - HA Device Manager setup complete
```

**Check Logs**:
```bash
tail -f /config/home-assistant.log | grep ha_device_manager
```

### 3. Interface Access Test

**Steps**:
1. Open browser
2. Navigate to `http://your-ha-url:8123/ha_device_manager`

**Expected Result**:
- ✅ Page loads without errors (check F12 console)
- ✅ "Device Manager" / "Gestionnaire d'Équipements" header visible
- ✅ "Add Device" / "Ajouter un Équipement" button visible
- ✅ Empty state message: "No devices yet. Add your first device!"

**Browser Console Checks** (F12):
- ❌ No JavaScript errors
- ❌ No 404 errors for static files
- ❌ No authentication errors

### 4. CRUD Operations Test

#### **CREATE Test**

**Steps**:
1. Click "Add Device" / "Ajouter un Équipement"
2. Enter name: "Living Room Light"
3. Click "Save" / "Enregistrer"

**Expected Result**:
- ✅ Success message appears
- ✅ Device appears in list
- ✅ Device has ID: 1
- ✅ Device name: "Living Room Light"

**API Verification** (optional):
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8123/api/ha_device_manager/devices
```

Expected response:
```json
[
  {
    "id": 1,
    "name": "Living Room Light",
    "created_at": "2026-02-22 13:00:00",
    "updated_at": "2026-02-22 13:00:00"
  }
]
```

#### **READ Test**

**Steps**:
1. Refresh the page (F5)
2. Check if device persists

**Expected Result**:
- ✅ Device still visible after refresh
- ✅ Same ID and name

**Database Verification**:
```bash
sqlite3 /config/custom_components/ha_device_manager/devices.db "SELECT * FROM devices;"
```

Expected output:
```
1|Living Room Light|2026-02-22 13:00:00|2026-02-22 13:00:00
```

#### **UPDATE Test**

**Steps**:
1. Click "Edit" / "Modifier" on "Living Room Light"
2. Change name to "Bedroom Light"
3. Click "Save" / "Enregistrer"

**Expected Result**:
- ✅ Success message: "Device updated successfully"
- ✅ Device name changes to "Bedroom Light"
- ✅ ID remains 1
- ✅ `updated_at` timestamp is updated

**Database Verification**:
```bash
sqlite3 /config/custom_components/ha_device_manager/devices.db "SELECT * FROM devices WHERE id=1;"
```

#### **DELETE Test**

**Steps**:
1. Click "Delete" / "Supprimer" on "Bedroom Light"
2. Confirm deletion in popup

**Expected Result**:
- ✅ Confirmation dialog appears
- ✅ Success message: "Device deleted successfully"
- ✅ Device removed from list
- ✅ Empty state message appears again

**Database Verification**:
```bash
sqlite3 /config/custom_components/ha_device_manager/devices.db "SELECT * FROM devices;"
```

Expected: Empty result (no rows)

### 5. Multiple Devices Test

**Steps**:
1. Add 5 devices with different names:
   - "Living Room Light"
   - "Kitchen Switch"
   - "Bedroom Sensor"
   - "Garage Door"
   - "Front Camera"

**Expected Result**:
- ✅ All 5 devices visible
- ✅ IDs are sequential: 1, 2, 3, 4, 5
- ✅ List sorted by ID descending (newest first)

### 6. Validation Test

**Steps**:
1. Click "Add Device"
2. Leave name empty
3. Click "Save"

**Expected Result**:
- ✅ HTML5 validation prevents submission
- ✅ "This field is required" message appears

**Steps**:
1. Click "Add Device"
2. Enter only spaces: "   "
3. Click "Save"

**Expected Result**:
- ✅ Error message from backend
- ✅ Device not created

### 7. Internationalization Test

**Test EN (English)**:

**Steps**:
1. Set browser language to English
2. Reload page

**Expected Result**:
- ✅ Header: "Device Manager"
- ✅ Button: "Add Device"
- ✅ Empty state: "No devices yet. Add your first device!"

**Test FR (Français)**:

**Steps**:
1. Set browser language to French
2. Reload page

**Expected Result**:
- ✅ Header: "Gestionnaire d'Équipements"
- ✅ Button: "Ajouter un Équipement"
- ✅ Empty state: "Aucun équipement. Ajoutez votre premier équipement !"

### 8. API Direct Test

Get a long-lived access token from Home Assistant:
1. Profile > Long-Lived Access Tokens > Create Token

**Test GET /devices**:
```bash
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8123/api/ha_device_manager/devices
```

**Test POST /devices**:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "API Test Device"}' \
  http://localhost:8123/api/ha_device_manager/devices
```

**Test PUT /devices/{id}**:
```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated API Device"}' \
  http://localhost:8123/api/ha_device_manager/devices/1
```

**Test DELETE /devices/{id}**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8123/api/ha_device_manager/devices/1
```

### 9. Error Handling Test

**Test 404 - Device not found**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8123/api/ha_device_manager/devices/99999
```

Expected:
```json
{"error": "Device not found"}
```

**Test 401 - Unauthorized**:
```bash
curl http://localhost:8123/api/ha_device_manager/devices
```

Expected: 401 Unauthorized

### 10. Responsive Design Test

**Desktop** (1920x1080):
- ✅ Full layout with proper spacing
- ✅ Actions buttons on the right

**Tablet** (768x1024):
- ✅ Responsive layout
- ✅ Buttons stack properly

**Mobile** (375x667):
- ✅ Device items stack vertically
- ✅ Actions buttons below device info
- ✅ Form overlay takes full width

## Performance Tests

### Database Performance

**Test**: Create 100 devices rapidly

```python
import asyncio
import aiosqlite

async def test():
    async with aiosqlite.connect('/config/custom_components/ha_device_manager/devices.db') as db:
        for i in range(100):
            await db.execute("INSERT INTO devices (name) VALUES (?)", (f"Device {i}",))
        await db.commit()

asyncio.run(test())
```

**Expected**:
- ✅ All 100 devices created
- ✅ UI loads quickly (< 2 seconds)

### Frontend Performance

**Check**:
- ✅ Bundle size < 50KB (currently ~42KB)
- ✅ Page load time < 1 second
- ✅ No memory leaks after multiple CRUD operations

**Tools**: Chrome DevTools > Performance, Lighthouse

## Troubleshooting

### Issue: Page shows blank

**Check**:
1. Browser console (F12) for errors
2. Network tab for 404s
3. Home Assistant logs

**Solution**:
```bash
# Rebuild frontend
cd frontend && npm run build

# Recopy bundle
cp frontend/dist/device-manager.js custom_components/ha_device_manager/frontend/dist/

# Restart HA
```

### Issue: Authentication errors

**Check**:
1. Are you logged into Home Assistant?
2. Is token being sent in API calls?

**Solution**:
- Clear browser cache
- Re-login to Home Assistant

### Issue: Database locked

**Check**:
```bash
sqlite3 /config/custom_components/ha_device_manager/devices.db ".schema"
```

**Solution**:
```bash
# Stop Home Assistant
# Delete database
rm /config/custom_components/ha_device_manager/devices.db
# Restart Home Assistant (will recreate DB)
```

## Success Criteria

All tests should pass:
- ✅ Installation succeeds
- ✅ HA starts without errors
- ✅ Interface loads properly
- ✅ CRUD operations work
- ✅ Data persists in SQLite
- ✅ Translations work (EN/FR)
- ✅ API endpoints respond correctly
- ✅ Responsive on all devices

## Reporting Issues

If any test fails, provide:
1. Test name and step
2. Expected vs actual result
3. Home Assistant logs
4. Browser console errors
5. Home Assistant version
6. Browser and OS

---

**Test completed by**: _____________  
**Date**: _____________  
**HA Version**: _____________  
**Result**: ✅ PASS / ❌ FAIL
