window.rideHelper = {
    load: key => {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    save: (key, value) => {
        try { localStorage.setItem(key, value); } catch { }
    },
    watchStorage: (ref, key) => {
        window.addEventListener('storage', e => {
            if (e.key === key) ref.invokeMethodAsync('Reload');
        });
    },
    _gpsWatch: null,
    startGps: ref => {
        if (!navigator.geolocation) return 'unsupported';
        if (window.rideHelper._gpsWatch !== null) navigator.geolocation.clearWatch(window.rideHelper._gpsWatch);
        window.rideHelper._gpsWatch = navigator.geolocation.watchPosition(
            p => ref.invokeMethodAsync('OnGps', p.coords.latitude, p.coords.longitude, p.coords.accuracy || 0),
            e => ref.invokeMethodAsync('OnGpsError', e.code),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
        return 'ok';
    },
    stopGps: () => {
        if (window.rideHelper._gpsWatch !== null) navigator.geolocation.clearWatch(window.rideHelper._gpsWatch);
        window.rideHelper._gpsWatch = null;
    },
    setAccent: name => {
        document.documentElement.setAttribute('data-accent', name);
    },
    setTextLevel: level => {
        document.documentElement.dataset.text = String(level);
    },
    notifyStatus: () => ('Notification' in window ? Notification.permission : 'unsupported'),
    requestNotify: async () => ('Notification' in window ? await Notification.requestPermission() : 'unsupported'),
    notify: async (title, body) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            // Without an active service worker (e.g. the Capacitor shell) `ready` never resolves, so check first.
            if (navigator.serviceWorker?.controller) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, { body, icon: 'icon-192.png' });
                return;
            }
        } catch { }
        new Notification(title, { body, icon: 'icon-192.png' });
    },
    download: (filename, text, mime) => {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
};
