'use client';

import { useEffect, useRef } from 'react';
import type { MapPin } from '@/lib/types';
import L from 'leaflet';
import 'leaflet.markercluster';

// Fix Leaflet default icon path issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icon factory — navy (default) and gold (highlighted)
function createIcon(color: string) {
  return new L.DivIcon({
    className: '',
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="13" r="6" fill="white"/>
      <text x="14" y="16.5" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}" font-family="sans-serif">✙</text>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

const navyIcon = createIcon('#1e1e5f');
const goldIcon = createIcon('#c9950c');

interface MapViewProps {
  pins: MapPin[];
  /** Changes the pin color — does NOT zoom the map */
  highlightedSiteId?: string | null;
  /** If true, fits map bounds to show all pins on first load */
  initialFitBounds?: boolean;
  onPinClick?: (siteId: string) => void;
  className?: string;
  /** Override the initial zoom level (default 3) */
  initialZoom?: number;
  /** Override the minimum zoom level (default 2) */
  minZoom?: number;
  /**
   * When true, skip popup binding and flyTo the pin on click.
   * Used in the mobile split-view (card lives below the map).
   */
  suppressPopups?: boolean;
  /**
   * When provided, bind a React-portal popup instead of the default HTML popup.
   * Called with the popup's DOM container element, pin data, and a close callback.
   */
  onPopupOpen?: (el: HTMLElement, pin: MapPin, close: () => void) => void;
  onPopupClose?: () => void;
}

export default function MapView({
  pins,
  highlightedSiteId,
  initialFitBounds,
  onPinClick,
  className,
  initialZoom = 3,
  minZoom = 2,
  suppressPopups = false,
  onPopupOpen,
  onPopupClose,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: initialZoom,
      minZoom: minZoom,
      maxZoom: 18,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Manage markers + clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }
    markersRef.current.clear();

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 52;
        return L.divIcon({
          html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px;">${count}</div>`,
          className: '',
          iconSize: L.point(size, size),
        });
      },
    });

    const validPins = pins.filter(
      (p) => isFinite(p.latitude) && isFinite(p.longitude)
    );

    validPins.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], { icon: navyIcon });

      if (!suppressPopups) {
        if (onPopupOpen) {
          // React portal popup — caller portals SitePreviewCard into this element
          const container = document.createElement('div');
          marker.bindPopup(container, {
            maxWidth: 440,
            minWidth: 380,
            closeButton: false,
            className: 'leaflet-custom-card-popup',
          });
          marker.on('popupopen', () => {
            onPopupOpen(container, pin, () => marker.closePopup());
          });
          marker.on('popupclose', () => {
            onPopupClose?.();
          });
        } else {
          // Fallback HTML-string popup (site detail pages, tag pages)
          const imgHtml = pin.thumbnail_url
            ? `<img src="${pin.thumbnail_url}" alt="${pin.name}" loading="lazy" />`
            : '';
          marker.bindPopup(
            `<div class="site-popup">
              ${imgHtml}
              <div class="site-popup-content">
                <h3>${pin.name}</h3>
                <p>${pin.short_description}</p>
                <a href="/site/${pin.id}">View full details →</a>
              </div>
            </div>`,
            { maxWidth: 280, closeButton: true }
          );
        }
      }

      marker.on('click', () => {
        if (suppressPopups) {
          mapRef.current?.flyTo([pin.latitude, pin.longitude], mapRef.current.getZoom(), {
            animate: true,
            duration: 0.5,
          });
        }
        onPinClick?.(pin.id);
      });

      cluster.addLayer(marker);
      markersRef.current.set(pin.id, marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    if (initialFitBounds && validPins.length > 0) {
      if (validPins.length === 1) {
        map.setView([validPins[0].latitude, validPins[0].longitude], 12);
      } else {
        map.fitBounds(
          L.latLngBounds(validPins.map((p) => [p.latitude, p.longitude])),
          { padding: [40, 40] }
        );
      }
    }
  }, [pins, onPinClick, initialFitBounds, suppressPopups, onPopupOpen, onPopupClose]);

  // Highlight pin — swap icon color, no map movement
  useEffect(() => {
    const markers = markersRef.current;
    markers.forEach((marker) => marker.setIcon(navyIcon));
    if (highlightedSiteId) {
      const marker = markers.get(highlightedSiteId);
      if (marker) marker.setIcon(goldIcon);
    }
  }, [highlightedSiteId]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'w-full h-full'}
    />
  );
}
