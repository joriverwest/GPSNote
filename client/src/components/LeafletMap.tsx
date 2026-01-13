import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom pulsing marker for current location
const createPulsingIcon = () => {
  return L.divIcon({
    className: "custom-pulsing-marker",
    html: `<div class="pulsing-dot"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Custom neon marker for targets
const createNeonIcon = (rank: number = 1) => {
  let colorClass = "neon-pin-red"; // Rank 1 (Default)
  if (rank === 2) colorClass = "neon-pin-orange";
  if (rank === 3) colorClass = "neon-pin-green";
  if (rank === 4) colorClass = "neon-pin-blue";

  return L.divIcon({
    className: "custom-neon-marker",
    html: `<div class="${colorClass}"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers?: Array<{ id?: string; lat: number; lng: number; title?: string; rank?: number; showLabel?: boolean }>;
  path?: Array<{ lat: number; lng: number }>;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  mapStyle?: "dark" | "satellite" | "standard";
}

// Component to handle map updates
function MapUpdater({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    
    const handleClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onClick]);
  return null;
}

export default function LeafletMap({
  center,
  zoom,
  markers = [],
  path = [],
  onMapClick,
  onMarkerClick,
  mapStyle = "dark",
}: LeafletMapProps) {
  
  // Define tile layers
  const tileLayers = {
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },

    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
    standard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  };

  const currentLayer = tileLayers[mapStyle] || tileLayers.dark;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ width: "100%", height: "100%", background: "#000" }}
      zoomControl={false}
    >
      <TileLayer
        url={currentLayer.url}
        attribution={currentLayer.attribution}
        maxZoom={20}
      />
      
      <MapUpdater center={center} zoom={zoom} />
      
      {onMapClick && <MapClickHandler onClick={onMapClick} />}

      {/* Current Location Marker */}
      <Marker position={[center.lat, center.lng]} icon={createPulsingIcon()}>
        <Popup className="cyber-popup">Current Location</Popup>
      </Marker>

      {/* Target Markers */}
      {markers.map((marker, index) => (
        <Marker 
          key={index} 
          position={[marker.lat, marker.lng]} 
          icon={createNeonIcon(marker.rank)}
          eventHandlers={{
            click: () => {
              if (onMarkerClick && marker.id) {
                onMarkerClick(marker.id);
              }
            }
          }}
        >
          {marker.title && (
            <Popup 
              className="cyber-popup" 
              autoClose={!marker.showLabel} 
              closeOnClick={!marker.showLabel}
            >
              {marker.title}
            </Popup>
          )}
          {marker.showLabel && marker.title && (
            <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent className="cyber-tooltip">
              {marker.title}
            </Tooltip>
          )}
        </Marker>
      ))}

      {/* Movement Path */}
      {path.length > 1 && (
        <Polyline
          positions={path.map(p => [p.lat, p.lng])}
          pathOptions={{ color: "#00ffff", weight: 3, opacity: 0.8, dashArray: "5, 10" }}
        />
      )}
    </MapContainer>
  );
}
