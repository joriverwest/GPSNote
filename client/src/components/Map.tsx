/**
 * GOOGLE MAPS FRONTEND INTEGRATION - CYBERPUNK EDITION
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

// Map Styles
const CYBERPUNK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#050505" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#050505" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#00FFFF" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#00FFFF" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#FF00FF" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0A0A0A" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#CCFF00" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#00FFFF" }, { weight: 0.5 }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#808080" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#333333" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#FF00FF" }, { weight: 1 }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#E0E0E0" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#CCFF00" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#00FFFF" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#050505" }] },
];

const DARK_MAP_STYLE = [
  { elementType: "all", stylers: [{ saturation: -100 }] },
  { elementType: "geometry", stylers: [{ color: "#000000" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

export type MapStyle = "cyberpunk" | "dark" | "satellite" | "standard";

function loadMapScript() {
  return new Promise(resolve => {
    // Check if script is already loaded
    if (window.google && window.google.maps) {
      resolve(null);
      return;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve(null);
      // Do not remove script as it might be needed by other components or re-renders
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  mapStyle?: MapStyle;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 35.6895, lng: 139.6917 }, // Tokyo Default
  initialZoom = 14,
  mapStyle = "cyberpunk",
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    
    if (!map.current) {
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: false, // We will build custom controls
        streetViewControl: false,
        mapId: "CYBERPUNK_MAP_ID", // Required for AdvancedMarkerElement
        disableDefaultUI: true, // Clean look
      });
      
      if (onMapReady) {
        onMapReady(map.current);
      }
    }
  });

  // Update map style when prop changes
  useEffect(() => {
    if (!map.current || !window.google) return;

    const mapInstance = map.current;

    switch (mapStyle) {
      case "cyberpunk":
        mapInstance.setOptions({
          styles: CYBERPUNK_MAP_STYLE,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          backgroundColor: "#050505",
        });
        break;
      case "dark":
        mapInstance.setOptions({
          styles: DARK_MAP_STYLE,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          backgroundColor: "#000000",
        });
        break;
      case "satellite":
        mapInstance.setOptions({
          styles: null,
          mapTypeId: window.google.maps.MapTypeId.SATELLITE,
        });
        break;
      case "standard":
        mapInstance.setOptions({
          styles: null,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        });
        break;
    }
  }, [mapStyle]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-full min-h-[500px] rounded-lg border border-neon-cyan/30 shadow-[0_0_20px_rgba(0,255,255,0.1)]", className)} />
  );
}
