'use client';

import { useEffect, useRef } from 'react';
import type { MapPin } from '@/lib/types';
import { cfImage } from '@/lib/imageUrl';
import L from 'leaflet';
import 'leaflet.markercluster';
// Leaflet CSS ships with the (dynamically imported) map chunk, so map-free
// pages don't pay for it. Overrides live in globals.css and win via
// !important / higher specificity, so load order doesn't matter.
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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
  /** Override the initial center [lat, lng] (default [30, 10]) */
  initialCenter?: [number, number];
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
  initialCenter,
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
  const highlightedIdRef = useRef<string | null | undefined>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: initialCenter ?? [30, 10],
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
        const childMarkers = clusterObj.getAllChildMarkers();
        const containsHighlighted = highlightedIdRef.current
          && childMarkers.some((m: any) => m._siteId === highlightedIdRef.current);
        const color = containsHighlighted ? '#c9950c' : '#1e1e5f';
        return L.divIcon({
          html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px;background:${color}b3;border:3px solid ${color}e6;">${count}</div>`,
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
      (marker as any)._siteId = pin.id;

      if (!suppressPopups) {
        if (onPopupOpen) {
          // React portal popup — caller portals SitePreviewCard into this element
          const container = document.createElement('div');
          marker.bindPopup(container, {
            maxWidth: 440,
            minWidth: 380,
            closeButton: false,
            className: 'leaflet-custom-card-popup',
            autoPanPadding: [20, 20],
          });
          marker.on('popupopen', () => {
            onPopupOpen(container, pin, () => marker.closePopup());
            // React renders the portal card asynchronously — and with lazy
            // card loading the content may arrive a few hundred ms later.
            // Re-trigger sizing/autoPan a few times so the card fits either way.
            [50, 300, 700].forEach((ms) =>
              setTimeout(() => marker.getPopup()?.update(), ms)
            );
          });
          marker.on('popupclose', () => {
            onPopupClose?.();
          });
        } else {
          // Fallback HTML-string popup (site detail pages, tag pages)
          const imgHtml = pin.thumbnail_url
            ? `<img src="${cfImage(pin.thumbnail_url, 640)}" alt="${pin.name}" loading="lazy" />`
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
          const map = mapRef.current;
          if (map) {
            const zoom = map.getZoom();
            const mapSize = map.getSize();
            // Position pin at ~30% from the top of the map (instead of center)
            // so the card that slides in below has visual breathing room.
            const pinPoint = map.project([pin.latitude, pin.longitude], zoom);
            const targetPoint = pinPoint.add([0, mapSize.y * 0.2]);
            const targetLatLng = map.unproject(targetPoint, zoom);
            map.flyTo(targetLatLng, zoom, { animate: true, duration: 0.5 });
          }
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
    highlightedIdRef.current = highlightedSiteId;
    const markers = markersRef.current;
    markers.forEach((marker) => marker.setIcon(navyIcon));
    if (highlightedSiteId) {
      const marker = markers.get(highlightedSiteId);
      if (marker) marker.setIcon(goldIcon);
    }
    clusterRef.current?.refreshClusters();
  }, [highlightedSiteId]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'w-full h-full'}
    />
  );
}
