import LeafletButton from './leaflet_button_ext';
import GPS from '../helpers/GPS';
import LocHelp from '../helpers/location';
import GeoLoc from '../helpers/geoloc_ext';

const API = {
  addGPS() {

    GeoLoc.startGPS();

    const that = this;
    const location = this._getCurrentLocation();

    const button = new LeafletButton({
      id: 'gps-btn',
      position: 'topright',
      className: 'gps-btn',
      title: 'seek gps fix',
      body: `<span class="mdi mdi-36px mdi-map-marker-outline"
                style="color: grey; margin-left: 3px"
                data-source="${location.source}"></span>`,
      onClick() {
        GeoLoc.startGPS();
      },
      maxWidth: 30,  // number
    });

    this.map.addControl(button);
  },

  getGeoLocation() {
    const options = {
      accuracyLimit,
      onUpdate(location) {
        //that.trigger('geolocation', location);
        //that.trigger('geolocation:update', location);
      },

      callback(error, loc) {
        let location = loc;
        extension.stopGPS.call(that, { silent: true });

        if (error) {
          //that.trigger('geolocation', location);
          //that.trigger('geolocation:error', location);
          return;
        }

        location.source = 'gps';
        location.updateTime = new Date(); // track when gps was acquired
        location.gridref = LocHelp.locationToGrid(location);

        // extend old location to preserve its previous attributes like name or id
        const oldLocation = that.get('location');
        location = $.extend(oldLocation, location);

        if (that.setGPSLocation) {
          if (that.setGPSLocation(location)) {
            //that.trigger('change:location');
            //that.trigger('geolocation', location);
            //that.trigger('geolocation:success', location);
          }
          return;
        }

        //that.trigger('change:location');
        //that.trigger('geolocation', location);
        //that.trigger('geolocation:success', location);
      },
    };
    this.locating = GPS.start(options);

  },

  geolocationStart() {
    this._set_gps_progress_feedback('pending');
  },

  /**
   * Update the temporary location fix
   * @param location
   */
  geolocationUpdate(location) {
    this.locationUpdate = location;
    this._set_gps_progress_feedback('pending');
  },

  geolocationSuccess(location) {
    this.locationUpdate = location;
    this._set_gps_progress_feedback('fixed');
  },

  geolocationStop() {
    this._set_gps_progress_feedback('');
  },

  geolocationError() {
    this._set_gps_progress_feedback('failed');
  },

  _set_gps_progress_feedback(state) {
    const $gpsButton = $('.gps-btn');
    // change state
    $gpsButton.attr('data-gps-progress', state);

    // change icon
    const $gpsButtonSpan = $gpsButton.find('span');
    if (state === 'pending') {
      $gpsButtonSpan.addClass('mdi-spin');
    } else {
      $gpsButtonSpan.removeClass('mdi-spin');
    }
  },
};

export default API;
