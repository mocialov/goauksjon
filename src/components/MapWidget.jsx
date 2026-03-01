import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, GeoJSON } from 'react-leaflet'
// Temporarily remove clustering to restore base marker functionality reliably.
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { matchFallbackLocation } from '@/lib/fallbackCoordinates'
// Persistence moved to parent; MapWidget no longer reads or writes selection directly.

// Provide explicit default marker icon (avoid deleting internal _getIconUrl to keep single markers visible)
const defaultMarkerIcon = new L.Icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Component to set mapReady flag when map is initialized
const MapReadyHandler = ({ onReady }) => {
  const map = useMap()
  const readyRef = useRef(false)
  
  useEffect(() => {
    if (map && !readyRef.current) {
      readyRef.current = true
      onReady()
    }
  }, [map, onReady])
  
  return null
}

// Component to display Norway's borders
const NorwayBorders = () => {
  const [norwayGeoJSON, setNorwayGeoJSON] = useState(null)

  useEffect(() => {
    // Fetch Norway's GeoJSON data from a public API
    const fetchNorwayBorders = async () => {
      try {
        // Using REST Countries API which provides country borders
        const response = await fetch('https://restcountries.com/v3.1/alpha/NO?fields=borders')
        
        // Alternative: Use a more detailed GeoJSON from Natural Earth or other sources
        // For now, we'll use a simplified approach with a local/inline GeoJSON
        
        // Simplified Norway border GeoJSON (you can replace with more detailed data)
        const simplifiedNorway = {
          "type": "FeatureCollection",
          "features": [{
            "type": "Feature",
            "properties": {
              "name": "Norway"
            },
            "geometry": {
              "type": "Polygon",
              "coordinates": [[
                [4.6, 58.0], [5.0, 59.0], [5.2, 60.0], [5.0, 61.0], [4.8, 62.0],
                [5.2, 63.0], [6.0, 64.0], [8.0, 64.5], [10.0, 64.0], [12.0, 64.2],
                [14.0, 65.0], [16.0, 66.0], [18.0, 67.0], [20.0, 68.0], [22.0, 69.0],
                [25.0, 69.5], [28.0, 70.0], [30.0, 70.5], [31.0, 71.0], [30.5, 71.2],
                [29.0, 71.0], [27.0, 70.5], [25.0, 70.0], [23.0, 69.5], [21.0, 69.0],
                [19.0, 68.0], [17.0, 67.0], [15.0, 66.0], [13.0, 65.0], [11.0, 64.0],
                [9.0, 63.5], [7.0, 63.0], [6.0, 62.0], [5.5, 61.0], [5.8, 60.0],
                [6.0, 59.0], [5.5, 58.5], [4.6, 58.0]
              ]]
            }
          }]
        }
        
        setNorwayGeoJSON(simplifiedNorway)
      } catch (error) {
        console.warn('Failed to load Norway borders:', error)
      }
    }

    fetchNorwayBorders()
  }, [])

  if (!norwayGeoJSON) return null

  const borderStyle = {
    color: '#2563eb', // Blue border
    weight: 2,
    opacity: 0.8,
    fillColor: 'transparent',
    fillOpacity: 0
  }

  return <GeoJSON data={norwayGeoJSON} style={borderStyle} />
}

// Component to handle automatic zooming to bounds.
// NOTE: Calls onZoomApplied after performing a zoom so parent can clear shouldZoom.
// This prevents repeated auto-fit on every re-render (e.g. when entering drawing mode).
const ZoomToBounds = ({ targetBounds, shouldZoom, defaultBounds, onZoomApplied }) => {
  const map = useMap()

  useEffect(() => {
    if (!map || !shouldZoom) return

    // Add a small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      // Close any open popup before altering bounds to avoid cluster layer removal race conditions
      try { map.closePopup() } catch (_) {}
      if (targetBounds) {
        try {
          // Create Leaflet bounds from our saved bounds
          const bounds = L.latLngBounds(
            [targetBounds._southWest.lat, targetBounds._southWest.lng],
            [targetBounds._northEast.lat, targetBounds._northEast.lng]
          )
          
          console.log('🗺️ Zooming to saved bounds:', bounds)
          map.fitBounds(bounds, { padding: [20, 20] })
          onZoomApplied?.()
        } catch (error) {
          console.warn('Failed to zoom to saved bounds:', error)
          // Fall back to default bounds
          if (defaultBounds) {
            map.fitBounds(defaultBounds, { padding: [20, 20] })
            onZoomApplied?.()
          }
        }
      } else if (defaultBounds) {
        console.log('🗺️ Zooming to default bounds')
        map.fitBounds(defaultBounds, { padding: [20, 20] })
        onZoomApplied?.()
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [map, targetBounds, shouldZoom, defaultBounds, onZoomApplied])

  return null
}

// Component to render a selection rectangle layer based on selected bounds
const SelectionRectangle = ({ bounds }) => {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!map) return
    // Clear previous rectangle
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    if (!bounds) return
    try {
      const leafletBounds = bounds.getSouthWest ? bounds : L.latLngBounds([
        bounds._southWest.lat, bounds._southWest.lng
      ], [bounds._northEast.lat, bounds._northEast.lng])
      const rect = L.rectangle(leafletBounds, {
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillColor: '#3388ff',
        fillOpacity: 0.1
      })
      rect.addTo(map)
      layerRef.current = rect
    } catch (e) {
      console.warn('Failed to render selection rectangle:', e)
    }
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, bounds])

  return null
}

// Custom map control for drawing rectangle
const DrawControl = ({ onDrawStart, isDrawing, onCancel }) => {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Create a custom Leaflet control
    const DrawControlButton = L.Control.extend({
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        const button = L.DomUtil.create('a', 'leaflet-control-draw', container)
        
        button.innerHTML = isDrawing 
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 3v18M15 3v18M3 9h18M3 15h18"></path></svg>'
        
        button.href = '#'
        button.title = isDrawing ? 'Cancel drawing (ESC)' : 'Draw rectangle to select area'
        button.style.width = '30px'
        button.style.height = '30px'
        button.style.lineHeight = '30px'
        button.style.display = 'flex'
        button.style.alignItems = 'center'
        button.style.justifyContent = 'center'
        button.style.backgroundColor = isDrawing ? '#ef4444' : '#fff'
        button.style.color = isDrawing ? '#fff' : '#333'
        button.style.cursor = 'pointer'
        button.style.transition = 'all 0.2s ease'

        L.DomEvent.disableClickPropagation(button)
        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          if (isDrawing) {
            onCancel?.()
          } else {
            onDrawStart?.()
          }
        })

        // Hover effect
        L.DomEvent.on(button, 'mouseenter', () => {
          button.style.backgroundColor = isDrawing ? '#dc2626' : '#f9fafb'
        })
        L.DomEvent.on(button, 'mouseleave', () => {
          button.style.backgroundColor = isDrawing ? '#ef4444' : '#fff'
        })

        return container
      }
    })

    const drawControl = new DrawControlButton({ position: 'topleft' })
    drawControl.addTo(map)

    return () => {
      drawControl.remove()
    }
  }, [map, onDrawStart, isDrawing, onCancel])

  return null
}

// Component to handle manual rectangle drawing inside the map
// Provides native click & drag drawing without external plugins.
const ManualDraw = ({ active, onFinish, onCancel, drawingStartRef, drawingRectRef }) => {
  const map = useMap()
  const cancelRef = useRef(onCancel)
  const finishRef = useRef(onFinish)
  cancelRef.current = onCancel
  finishRef.current = onFinish

  useEffect(() => {
    if (!map) return

    const enableMapInteractions = () => {
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
    }
    const disableMapInteractions = () => {
      map.dragging.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
    }

    const handleMouseDown = (e) => {
      if (!active) return
      const { latlng } = e
      drawingStartRef.current = latlng
      // Remove any previous in-progress rectangle
      if (drawingRectRef.current) {
        drawingRectRef.current.remove()
        drawingRectRef.current = null
      }
    }

    const handleMouseMove = (e) => {
      if (!active) return
      if (!drawingStartRef.current) return
      const start = drawingStartRef.current
      const current = e.latlng
      const bounds = L.latLngBounds([start.lat, start.lng], [current.lat, current.lng])
      if (!drawingRectRef.current) {
        drawingRectRef.current = L.rectangle(bounds, {
          color: '#ff7800',
          weight: 2,
          opacity: 0.9,
          fillColor: '#ff7800',
          fillOpacity: 0.15
        }).addTo(map)
      } else {
        drawingRectRef.current.setBounds(bounds)
      }
    }

    const finalize = () => {
      if (!drawingStartRef.current || !drawingRectRef.current) {
        cancelRef.current?.()
        return
      }
      const rectLayer = drawingRectRef.current
      const rectBounds = rectLayer.getBounds()
      const sw = rectBounds.getSouthWest()
      const ne = rectBounds.getNorthEast()
      const latDiff = Math.abs(ne.lat - sw.lat)
      const lngDiff = Math.abs(ne.lng - sw.lng)
      // Avoid tiny accidental rectangles (single click)
      if (latDiff < 0.001 && lngDiff < 0.001) {
        rectLayer.remove()
        drawingRectRef.current = null
        drawingStartRef.current = null
        cancelRef.current?.()
        return
      }
      // Remove the temporary drawing rectangle before rendering selection rectangle
      rectLayer.remove()
      drawingRectRef.current = null
      const serializable = {
        _southWest: { lat: sw.lat, lng: sw.lng },
        _northEast: { lat: ne.lat, lng: ne.lng }
      }
      finishRef.current?.(serializable)
    }

    const handleMouseUp = () => {
      if (!active) return
      finalize()
    }

    const handleKeyDown = (e) => {
      if (!active) return
      if (e.key === 'Escape') {
        if (drawingRectRef.current) {
          drawingRectRef.current.remove()
          drawingRectRef.current = null
        }
        drawingStartRef.current = null
        cancelRef.current?.()
      }
    }

    if (active) {
      disableMapInteractions()
      map.on('mousedown', handleMouseDown)
      map.on('mousemove', handleMouseMove)
      map.on('mouseup', handleMouseUp)
      document.addEventListener('keydown', handleKeyDown)
    } else {
      enableMapInteractions()
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      if (drawingRectRef.current) {
        drawingRectRef.current.remove()
        drawingRectRef.current = null
      }
      drawingStartRef.current = null
    }

    return () => {
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      enableMapInteractions()
      if (drawingRectRef.current) {
        drawingRectRef.current.remove()
        drawingRectRef.current = null
      }
      drawingStartRef.current = null
    }
  }, [map, active, drawingStartRef, drawingRectRef])

  return null
}

const MapWidget = ({ auctions = [], coordinates = {}, onAreaSelect, selectedBounds, disablePersistence = false }) => {
  // Norway bounds to restrict map view
  const maxBounds = [[57.9, 4.6], [71.2, 31.3]]
  // Gate rendering of cluster layer until map has fired ready to avoid removing markers whose icons haven't been created yet.
  const [mapReady, setMapReady] = useState(false)
  
  const clearSelection = useCallback(() => {
    // Clear selection first (parent state update)
    onAreaSelect(null)
    // Defer zoom reset to next tick so MarkerClusterGroup can reconcile child markers without racing fitBounds.
    setTimeout(() => {
      handleClearWithZoom()
    }, 0)
  }, [onAreaSelect])
  
  // State to control automatic zooming
  const [shouldZoom, setShouldZoom] = useState(false)
  const [zoomTarget, setZoomTarget] = useState(null)
  // Native drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const drawingStartRef = useRef(null)
  const drawingRectRef = useRef(null)
  
  // Normalization helper to increase coordinate match robustness.
  const resolveCoordinate = useCallback((loc) => {
    if (!loc) return null
    if (Array.isArray(coordinates[loc])) return coordinates[loc]
    const trimmed = loc.trim()
    if (Array.isArray(coordinates[trimmed])) return coordinates[trimmed]
    const lower = trimmed.toLowerCase()
    if (Array.isArray(coordinates[lower])) return coordinates[lower]
    // Try removing spaces and hyphens
    const collapsed = lower.replace(/[\s-]+/g, '')
    if (Array.isArray(coordinates[collapsed])) return coordinates[collapsed]
    const fallback = matchFallbackLocation(trimmed)
    if (fallback) return fallback
    return null
  }, [coordinates])

  // Group auctions by normalized coordinate.
  const groupedAuctions = useMemo(() => {
    const groups = {}
    let withCoords = 0
    const unmatched = []
    auctions.forEach(a => {
      const coord = resolveCoordinate(a.location)
      if (!Array.isArray(coord) || coord.length < 2) { unmatched.push(a.location); return }
      // Ensure coordinates are valid numbers
      const lat = parseFloat(coord[0])
      const lng = parseFloat(coord[1])
      if (isNaN(lat) || isNaN(lng)) { unmatched.push(a.location); return }
      withCoords++
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
      if (!groups[key]) groups[key] = { coordinate: [lat, lng], auctions: [] }
      groups[key].auctions.push(a)
    })
    const result = Object.values(groups)
    console.log('[MapWidget] grouped:', result.length, 'auctions total:', auctions.length, 'matched coords:', withCoords, 'unmatched sample:', unmatched.slice(0,5))
    // Log first few coordinates for debugging
    if (result.length > 0) {
      console.log('[MapWidget] Sample coordinates:', result.slice(0, 3).map(g => ({ pos: g.coordinate, count: g.auctions.length })))
    }
    return result
  }, [auctions, resolveCoordinate])

  // Map of rounded coordinate key -> auctions array for cluster popup reconstruction
  const coordinateAuctionMap = useMemo(() => {
    const m = {}
    groupedAuctions.forEach(group => {
      const [lat, lng] = group.coordinate
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
      m[key] = group.auctions
    })
    return m
  }, [groupedAuctions])
  
  // Whenever selectedBounds prop changes, adjust zoom target.
  useEffect(() => {
    setZoomTarget(selectedBounds || null)
    setShouldZoom(true)
  }, [selectedBounds])

  // Handle clearing selection with zoom to default bounds
  const handleClearWithZoom = () => {
    setZoomTarget(null)
    setShouldZoom(true)
  }

  return (
  <div className="relative w-full h-[48rem] rounded-lg overflow-hidden border">
      {/* Clear Selection Button - appears when area is selected */}
      {selectedBounds && (
        <button
          onClick={clearSelection}
          className="absolute top-2 right-2 z-[1000] bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded-md shadow-sm text-sm font-medium transition-colors duration-200 flex items-center gap-1"
          title="Clear selection"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Clear Selection
        </button>
      )}
      {/* Drawing instructions overlay */}
      {isDrawing && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg text-sm font-medium">
          Click and drag on the map to draw a rectangle
        </div>
      )}
      <MapContainer 
        bounds={maxBounds}
        style={{ height: '100%', width: '100%' }}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        minZoom={5}
        maxZoom={12}
      >
        <MapReadyHandler onReady={() => {
          setMapReady(true)
          console.log('[MapWidget] Map ready; auctions length:', auctions.length, 'groupedAuctions:', groupedAuctions.length)
        }} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {!selectedBounds && (
          <DrawControl 
            onDrawStart={() => setIsDrawing(true)}
            isDrawing={isDrawing}
            onCancel={() => {
              setIsDrawing(false)
              drawingStartRef.current = null
              if (drawingRectRef.current) {
                drawingRectRef.current.remove()
                drawingRectRef.current = null
              }
            }}
          />
        )}
        <ZoomToBounds 
          targetBounds={zoomTarget} 
          shouldZoom={shouldZoom} 
          defaultBounds={maxBounds}
          onZoomApplied={() => setShouldZoom(false)}
        />
  <SelectionRectangle bounds={selectedBounds} />
        <ManualDraw 
          active={isDrawing}
          onFinish={(bounds) => {
            setIsDrawing(false)
            drawingStartRef.current = null
            drawingRectRef.current = null
            onAreaSelect(bounds)
          }}
          onCancel={() => {
            setIsDrawing(false)
            drawingStartRef.current = null
            if (drawingRectRef.current) {
              drawingRectRef.current.remove()
              drawingRectRef.current = null
            }
          }}
          drawingStartRef={drawingStartRef}
          drawingRectRef={drawingRectRef}
        />
        
  {/* Direct markers without clustering for reliability */}
  {mapReady && groupedAuctions.length > 0 && groupedAuctions.map(group => {
    const { coordinate, auctions: groupAuctions } = group
    const count = groupAuctions.length
    const markerKey = `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`
    // Log each marker creation for debugging visibility issues
    console.log('[MapWidget] Render marker', markerKey, 'position:', coordinate, 'count:', count, 'valid:', Array.isArray(coordinate) && coordinate.length === 2 && !isNaN(coordinate[0]) && !isNaN(coordinate[1]))
    const markerIcon = count > 1 ? L.divIcon({
      html: `<div style="background:#10b981;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.25);border:2px solid rgba(255,255,255,0.7);">${count}</div>`,
      className: 'multi-auction-marker',
      iconSize: L.point(34, 34)
    }) : defaultMarkerIcon
    return (
      <Marker key={markerKey} position={coordinate} icon={markerIcon}>
        <Popup maxHeight={380} minWidth={280}>
          <div className="text-sm">
            {count > 1 && (
              <div className="mb-2 pb-2 border-b border-gray-200">
                <strong className="text-blue-600">{count} listings here</strong>
              </div>
            )}
            <div className={count > 1 ? 'max-h-72 overflow-y-auto space-y-3' : ''}>
              {groupAuctions.map((a, idx) => (
                <div key={a.id} className={idx > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                  <div className="font-semibold text-gray-900">{a.item}</div>
                  <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                    <div><span className="font-medium">Seller:</span> {a.seller}</div>
                    <div><span className="font-medium">Category:</span> {a.category}</div>
                    <div><span className="font-medium">Location:</span> {a.location}</div>
                  </div>
                  {a.url && (
                    <button onClick={() => window.open(a.url,'_blank','noopener,noreferrer')} className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors w-full">View Auction</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Popup>
      </Marker>
    )
  })}
        {/* If map ready but no markers, show a lightweight debug overlay */}
        {mapReady && groupedAuctions.length === 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded shadow text-xs text-gray-700 max-w-md">
            {auctions.length === 0 ? 'No auctions loaded.' : 'Resolving coordinates…'}
            <span className="ml-2 opacity-70 block">(auctions: {auctions.length} / coords keys: {Object.keys(coordinates).length})</span>
            {auctions.length > 0 && Object.keys(coordinates).length === 0 && (
              <div className="mt-1 text-[10px] text-gray-500">Geocoding in progress; markers will appear as locations are resolved.</div>
            )}
          </div>
        )}
        {/* Debug: plain markers for unmatched coordinates removed after simplification */}
      </MapContainer>
      {/* Manual drawing handled inside MapContainer */}
    </div>
  )
}

export default MapWidget