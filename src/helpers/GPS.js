//
// /* ---------------------------------------------- */
// uncomment to enable GPS mock
// import GPS from 'mock-geolocation';
// import BIGU from 'BIGU';
//
// GPS.use();
// window.GPS = GPS;
//
// /**
//  * GPS.update({ gridRef: 'TQ1212', xCorrect: -19, yCorrect: 12 })
//  *
//  * @param options
//  * @returns {*}
//  */
// GPS.update = (options) => {
//   let location = options;
//   if (options.gridRef) {
//     // Grid References
//     const parsedRef = BIGU.GridRefParser.factory(options.gridRef);
//
//     // center
//     parsedRef.osRef.x += parsedRef.length / 2;
//     parsedRef.osRef.y += parsedRef.length / 2;
//
//     // allow manual corrections for grid reference square center
//     if (options.xCorrect) {
//       parsedRef.osRef.x += options.xCorrect;
//     }
//     if (options.yCorrect) {
//       parsedRef.osRef.y += options.yCorrect;
//     }
//
//     const latLng = parsedRef.osRef.to_latLng();
//     location = {
//       latitude: latLng.lat,
//       longitude: latLng.lng,
//       accuracy: options.accuracy || parsedRef.length / 2,
//     };
//   }
//
//   console.log(location);
//   return GPS.change(location);
// };

// /* ---------------------------------------------- */
//

const API = {
  GPS_ACCURACY_LIMIT: 100, // meters
  TIMEOUT: 120000,

  running: false,

  start(options = {}) {
    const callback = options.callback;
    const onUpdate = options.onUpdate;
    const accuracyLimit = options.accuracyLimit || API.GPS_ACCURACY_LIMIT;

    // Early return if geolocation not supported.
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported.');
      alert(error + 'e');
      callback && callback(error);
      return null;
    }

    // geolocation config
    const GPSoptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: API.TIMEOUT,
    };

    const onSuccess = (position) => {
      const location = {
        latitude: position.coords.latitude.toFixed(8),
        longitude: position.coords.longitude.toFixed(8),
        accuracy: parseInt(position.coords.accuracy, 10),
        altitude: parseInt(position.coords.altitude, 10),
        altitudeAccuracy: parseInt(position.coords.altitudeAccuracy, 10),
      };

      if (location.accuracy <= accuracyLimit) {
        callback && callback(null, location);
      } else {
        onUpdate && onUpdate(location);
      }
    };

    // Callback if geolocation fails
    const onError = (err = {}) => {
      callback && callback(new Error(err.message));
    };

    const watchID = navigator.geolocation.watchPosition(onSuccess, onError, GPSoptions);
    return watchID;
  },

  stop(id) {
    // Early return if geolocation not supported.
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.clearWatch(id);
  },
};

export { API as default };
