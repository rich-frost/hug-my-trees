import LocHelp from '../helpers/location';
import L from 'leaflet';
import './leaflet_singleclick_ext';
import IconPulse from '@ansur/leaflet-pulse-icon';
import '@ansur/leaflet-pulse-icon/dist/L.Icon.Pulse.css';

class ComplexMarker {
    constructor(square, circle) {
        this.square = square;
        this.circle = circle;
    }

    setLocation(location) {
        this.square.setLocation(location);
        this.circle.setLocation(location);
    }
}

const marker = {
    addMapMarker() {
        //this.map.on('singleclick', this._onMapClick, this);
        this.updateMapMarker(this._getCurrentLocation());
        //this.addParentMarker(this.model.get('sample'));
    },

    /**
     * Adds or updates existing map marker.
     * @param currentLocation
     */
    updateMapMarker(location) {
        if (!location.latitude) {
            return;
        }

        // remove previous marker
        this._removeMapMarker();

        if (!location.gridref) {
            // outside GB
            this._setNonGBMarker(location);
            return;
        }

        this._setGBMarker(location);
    },

    addParentMarker(sample) {
        if (sample.parent) {
            const location = sample.parent.get('location') || {};
            if (location.latitude) {
                const parentMarker = this.generateRectangleMarker(location, {
                    color: 'blue',
                    fillOpacity: 0.01
                });
                parentMarker.addTo(this.map);
            }
        }
    },

    _setNonGBMarker(location) {
        this.marker = this.generateUserLocationMarker(location);
        this.marker.addTo(this.map);
    },

    _setGBMarker(location) {
        this.marker = this.generateUserLocationMarker(location);
        this.marker.addTo(this.map);
    },

    /**
     * Generates a polygon.
     * @param location
     * @returns {*}
     */
    generateRectangleMarker(location, options = {}) {
        const dimensions = LocHelp.getSquareBounds(location) || [[0, 0], [0, 0]];

        const newMarker = L.polygon(dimensions, {
            color: options.color || 'red',
            weight: 2,
            opacity: 1,
            fillOpacity: options.fillOpacity || 0.2
        });

        return newMarker;
    },

    /**
     * Generates a marker for the users location
     * @param location
     * @returns {*}
     */
    generateUserLocationMarker(location) {
        const iconColor = '#23b8f1';
        const pulsingIcon = L.icon.pulse({ iconSize: [20, 20], color: iconColor, fillColor: iconColor });
        return L.marker([location.latitude, location.longitude], { icon: pulsingIcon });
    },

    /**
     * Returns a circle radius in meters from the location accuracy.
     * @param location
     * @returns {number}
     * @private
     */
    _getCircleRadius(location) {
        let radius = 10;
        if (location.source === 'gps') {
            radius = location.accuracy;
        }

        return radius;
    },

    _onMapClick(e) {
        const location = {
            latitude: parseFloat(e.latlng.lat.toFixed(5)),
            longitude: parseFloat(e.latlng.lng.toFixed(5)),
            source: 'map'
        };

        const zoom = this.getMapZoom();
        location.accuracy = this._mapZoomToMetres(zoom);
        location.gridref = LocHelp.locationToGrid(location);

        // trigger won't work to bubble up
        this.triggerMethod('location:select:map', location);
    },

    /**
     * Removes the marker from the map.
     * @private
     */
    _removeMapMarker() {
        if (this.marker) {
            if (this.marker instanceof ComplexMarker) {
                this.map.removeLayer(this.marker.circle);
                this.map.removeLayer(this.marker.square);
                return;
            }

            this.map.removeLayer(this.marker);
            this.marker = null;
        }
    }
};

export default marker;
