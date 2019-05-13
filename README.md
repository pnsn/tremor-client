# Tremor Client V2.0

Long awaited rewrite of PNSN.org's tremor page.
Installation:
Add files from public/ to where you want them. Make sure you have the requirements.

Contains:
- TimeChart: D3.js chart for selecting time ranges and displaying tremor counts through time
- TremorMap: Leaflet map library for plotting tremor
- TremorClient: Client UI and logic
- Config: Configuration json for Tremor Client
- TremorOverlays: geojsons containing overlays for the map

Requires:
- Leaflet
  - & Leaflet-draw
  - & Leaflet-heat
- Moment
- DateRangePicker
- RainbowVis
- D3
- Bootstrap tour
