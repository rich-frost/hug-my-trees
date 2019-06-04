/** ****************************************************************************
 * Indicia Sample geolocation functions.
 *
 * Sample geolocation events:
 * start, update, error, success, stop
 *****************************************************************************/
import GPS from './GPS';
import LocHelp from './location';
import events from './events';
import BIGU from 'bigu';

window.locationEvents = events;
const extension = {
    location: null,

    metadata() {
        return {};
    },

    startGPS(accuracyLimit) {
        const that = this;
        const options = {
            accuracyLimit,
            onUpdate(location) {
                events.publish('location:updated', location);
                //that.trigger('geolocation', location);
                //that.trigger('geolocation:update', location);
            },

            callback(error, loc) {
                let location = loc;
                extension.stopGPS.call(that, { silent: true });

                if (error) {
                    events.publish('location:updated', location);
                    return;
                }

                location.source = 'gps';
                location.updateTime = new Date(); // track when gps was acquired
                location.gridref = LocHelp.locationToGrid(location);

                if (that.setGPSLocation) {
                    if (that.setGPSLocation(location)) {
                        events.publish('location:updated', location);
                    }
                    return;
                }

                events.publish('location:updated', location);
            }
        };

        this.locating = GPS.start(options);
    },

    stopGPS(options = {}) {
        GPS.stop(this.locating);
        delete this.locating;

        if (!options.silent) {
            this.trigger('geolocation');
            this.trigger('geolocation:stop');
        }
    },

    isGPSRunning() {
        return this.locating || this.locating === 0;
    },

    // modify GPS service
    setGPSLocation(location) {
        // child samples
        if (this.parent) {
            this.set('location', location);
            return this.save();
        }

        const gridSquareUnit = this.metadata.gridSquareUnit;
        const gridCoords = BIGU.latlng_to_grid_coords(location.latitude, location.longitude);

        if (!gridCoords) {
            return null;
        }

        location.source = 'gridref'; // eslint-disable-line
        if (gridSquareUnit === 'monad') {
            // monad
            //location.accuracy = 500; // eslint-disable-line

            gridCoords.x += (-gridCoords.x % 1000) + 500;
            gridCoords.y += (-gridCoords.y % 1000) + 500;
            location.gridref = gridCoords.to_gridref(1000); // eslint-disable-line
        } else {
            // tetrad
            //location.accuracy = 1000; // eslint-disable-line

            gridCoords.x += (-gridCoords.x % 2000) + 1000;
            gridCoords.y += (-gridCoords.y % 2000) + 1000;
            location.gridref = gridCoords.to_gridref(2000); // eslint-disable-line
        }

        this.location = location;
        events.publish('location:updated', location);
    }
};

export { extension as default };
