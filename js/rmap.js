// Map helper for the driver, HQ and rider-tracking demo screens. An ES module, imported on demand by LiveMap.razor.
// Leaflet is loaded the first time a map is created, so pages without a map never download it.
// Tiles come from OpenStreetMap, which is fine for a demo; a real pilot needs a tile provider under agreement.

let leafletReady = null;

function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletReady) return leafletReady;
    leafletReady = new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = new URL('lib/leaflet/leaflet.css', document.baseURI).href;
        document.head.appendChild(css);
        const js = document.createElement('script');
        js.src = new URL('lib/leaflet/leaflet.js', document.baseURI).href;
        js.onload = () => resolve();
        js.onerror = () => reject(new Error('Leaflet failed to load'));
        document.head.appendChild(js);
    });
    return leafletReady;
}

const maps = new Map();

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function create(id, center) {
    await loadLeaflet();
    const el = document.getElementById(id);
    if (!el) return false;
    if (maps.has(id)) maps.get(id).map.remove();
    const map = L.map(el, { zoomControl: true, attributionControl: true }).setView(center, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    maps.set(id, { map, buses: new Map(), stops: new Map(), fitted: false });
    setTimeout(() => map.invalidateSize(), 50);
    return true;
}

// data: { buses: [{key,label,lat,lng,color,stale,title}], stops: [{key,lat,lng,label,kind,color}], fit: bool }
export function update(id, data) {
    const m = maps.get(id);
    if (!m) return;
    const { map } = m;

    const seenBuses = new Set();
    for (const b of data.buses ?? []) {
        seenBuses.add(b.key);
        const html = `<div class="bus-pin${b.stale ? ' stale' : ''}" style="--c:${esc(b.color)}"><span>${esc(b.label)}</span></div>`;
        let marker = m.buses.get(b.key);
        if (!marker) {
            marker = L.marker([b.lat, b.lng], {
                icon: L.divIcon({ className: 'bus-pin-wrap', html, iconSize: [34, 34], iconAnchor: [17, 17] }),
                zIndexOffset: 1000,
                title: b.title ?? '',
            }).addTo(map);
            m.buses.set(b.key, marker);
        } else {
            marker.setLatLng([b.lat, b.lng]);
            marker.setIcon(L.divIcon({ className: 'bus-pin-wrap', html, iconSize: [34, 34], iconAnchor: [17, 17] }));
        }
    }
    for (const [key, marker] of m.buses) if (!seenBuses.has(key)) { marker.remove(); m.buses.delete(key); }

    const seenStops = new Set();
    for (const s of data.stops ?? []) {
        seenStops.add(s.key);
        const cls = `stop-pin ${esc(s.kind)}`;
        const html = `<div class="${cls}" style="--c:${esc(s.color)}"></div>`;
        const size = s.kind === 'target' ? 20 : 12;
        let marker = m.stops.get(s.key);
        const icon = L.divIcon({ className: 'stop-pin-wrap', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
        if (!marker) {
            marker = L.marker([s.lat, s.lng], { icon, title: s.label ?? '' }).addTo(map);
            if (s.label) marker.bindTooltip(esc(s.label), { direction: 'top', offset: [0, -6] });
            m.stops.set(s.key, marker);
        } else {
            marker.setLatLng([s.lat, s.lng]);
            marker.setIcon(icon);
        }
    }
    for (const [key, marker] of m.stops) if (!seenStops.has(key)) { marker.remove(); m.stops.delete(key); }

    if (data.fit || !m.fitted) {
        const pts = [...(data.buses ?? []), ...(data.stops ?? [])].map(p => [p.lat, p.lng]);
        if (pts.length > 0) {
            map.fitBounds(pts, { padding: [32, 32], maxZoom: 16 });
            m.fitted = true;
        }
    }
}

export function dispose(id) {
    const m = maps.get(id);
    if (!m) return;
    m.map.remove();
    maps.delete(id);
}
