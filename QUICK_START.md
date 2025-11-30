# ⚡ Shed Configurator - Quick Start (2 minutes)

## Ready to Run

Everything is built and ready to go. No installation needed.

---

## Step 1: Open Terminal 1 (Backend Server)

```bash
cd /Users/huntermotko/Documents/go/shed_app/backend
./shed-server
```

**Expected output:**
```
[GIN-debug] Listening and serving HTTP on :8080
```

✅ **Backend is running on http://localhost:8080**

---

## Step 2: Open Terminal 2 (Frontend Server)

```bash
cd /Users/huntermotko/Documents/go/shed_app/frontend
npm run dev
```

**Expected output:**
```
➜  Local:   http://localhost:5173/
```

✅ **Frontend is running on http://localhost:5173**

---

## Step 3: Open Browser

Click or navigate to: **http://localhost:5173**

---

## You're Live! 🎊

### What You Can Do:

1. **Adjust Shed Dimensions**
   - Drag the "Width" slider (8-20 ft)
   - Drag the "Length" slider (8-24 ft)
   - Watch the 3D model update in real-time

2. **Choose Roof Style**
   - Select "Gable" for simple triangular roof
   - Select "Barn" for two-slope gambrel roof
   - Price updates automatically (+$500 for Barn)

3. **Customize Colors**
   - Click color pickers to change:
     - Siding color
     - Roof color
     - Trim color
   - Changes appear immediately in 3D

4. **Check Price**
   - Green price display shows: $10/sqft + style surcharge
   - Updates automatically as you adjust dimensions/style

5. **Save Design**
   - Click "Save Design" button
   - Gets unique ID from backend
   - Alert shows the saved ID

6. **Interact with 3D**
   - **Left-click + drag**: Rotate around shed
   - **Right-click + drag**: Pan camera
   - **Scroll wheel**: Zoom in/out

---

## Testing the API

### Save a Design
```bash
curl -X POST http://localhost:8080/api/save-design \
  -H "Content-Type: application/json" \
  -d '{
    "width": 14,
    "length": 18,
    "style": "Barn",
    "color": "#8B4513",
    "roofColor": "#2F4F4F",
    "trimColor": "#654321",
    "placements": [],
    "price": 2920
  }'
```

### Get Saved Design
```bash
curl http://localhost:8080/api/design/{id}
```

### List All Designs
```bash
curl http://localhost:8080/api/designs
```

---

## Stopping the App

**In Terminal 1:** Press `Ctrl+C`
**In Terminal 2:** Press `Ctrl+C`

---

## Troubleshooting

### Port already in use?
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

### Can't connect to backend?
- Verify port 8080 is open: `lsof -i :8080`
- Check backend is running in Terminal 1
- Verify it says "Listening and serving HTTP on :8080"

### Frontend not loading?
- Check Terminal 2 shows "Local: http://localhost:5173/"
- Try http://localhost:5173 in browser
- Clear browser cache: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)

---

## What You're Looking At

### Left Side (Controls)
- **Shed Configurator** title
- Width & length sliders
- Roof style dropdown
- Color pickers
- Real-time price display
- Save & Reset buttons

### Right Side (Canvas)
- Interactive 3D shed model
- Updates as you change settings
- Infinite grid for reference
- Smooth camera controls

---

## Key Features Working

✅ **Gable Roof** - Simple triangular roof
✅ **Barn Roof** - Two-slope gambrel style
✅ **Dynamic Sizing** - Scales with width/length
✅ **Color Customization** - Full color control
✅ **Real-time Preview** - Instant 3D updates
✅ **Price Calculation** - Automatic pricing
✅ **Design Saving** - API persistence
✅ **Smooth Controls** - 60 FPS rendering

---

## That's It! 🚀

You now have a fully functional shed configurator with:
- Real-time 3D visualization
- Interactive controls
- Dynamic pricing
- REST API
- Design persistence

**Enjoy exploring!**

---

## For More Info

- **Full setup guide:** See `RUNBOOK.md`
- **API documentation:** See `RUNBOOK.md` (API Endpoints section)
- **Implementation details:** See `IMPLEMENTATION_COMPLETE.md`

---

**Last Updated:** November 30, 2024
