const EARTH_RADIUS_METERS = 6371000;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lng points, in meters.
 * Ported from the hrms Laravel app's getDistance() (Helper.php), which used
 * the spherical law of cosines — swapped for the numerically stable
 * Haversine formula here (same accuracy at this range, avoids acos()
 * precision issues for near-zero distances).
 */
export function distanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export interface Coords {
  lat: number;
  lng: number;
}

/** Wraps the callback-based Geolocation API in a promise with a clear error message. */
export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied. Enable it in your browser settings."));
        } else {
          reject(new Error("Couldn't get your location. Try again."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
