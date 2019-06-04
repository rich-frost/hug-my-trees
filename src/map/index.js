/** ****************************************************************************
 * Location main view map functions.
 *
 `
 |                Map zoom level to accuracy map
 |                +----------------------------+
 |
 |            WGS84   OSGB1936   GRIDREF    GPS ACC.
 |                                ACC.
 |
 |             + 18                4           10m
 |             |                   4           10m
 |             |                   3          100m
 |             | 15   9 +          3          100m
 |             | 14   8 |          3          100m
 |             |        |          2         1000m
 |             | 12   6 |          2         1000m
 |             |        |          2         1000m
 |             | 10   4 |          1        10000m
 |             |        |          1        10000m
 |             |        |          1        10000m
 |             |        |          1        10000m
 |             | 6    0 +          1        10000m
 |             + 5                 1        10000m
 +
 *
 *****************************************************************************/

import $ from 'jquery';
import icons from '@mdi/font/css/materialdesignicons.css';
//import 'leaflet/dist/leaflet.css';
//import 'leaflet-compass/src/leaflet-compass.css';
import 'leaflet/dist/images/layers-2x.png';
import 'leaflet/dist/images/layers.png';
import L from 'leaflet';
import CONFIG from '../config/config';
import LocHelp from '../helpers/location';
import 'os-leaflet';
import BIGU from 'bigu';
import 'leaflet.gridref';
//import 'leaflet-compass';

import LeafletButton from './leaflet_button_ext';

import mapMarker from './marker';
import gpsFunctions from './gps';
import search from './search';

import events from '../helpers/events';

const MAX_OS_ZOOM = 9; //L.OSOpenSpace.RESOLUTIONS.length - 1;
const MIN_WGS84_ZOOM = 5;
const OS_ZOOM_DIFF = 6;
const OS_CRS = L.OSOpenSpace.CRS; // OS maps use different projection

const DEFAULT_LAYER = 'OS';
const DEFAULT_LAYER_ZOOM = 1 + OS_ZOOM_DIFF; // 7 and not 1 because of WGS84 scale
const DEFAULT_CENTER = [53.7326306, -2.6546124];

const GRID_STEP = 100000; // meters

const API = {
    initMap() {
        this.map = null;
        this.layers = this.getLayers();

        this.currentLayerControlSelected = false;
        this.currentLayer = null;

        this._refreshMapHeight();

        this.map = L.map(this.$container);

        // default layer
        this.currentLayer = this._getCurrentLayer();
        if (this.currentLayer === 'OS') this.map.options.crs = OS_CRS;

        // position view
        this._repositionMap();

        // show default layer
        this.layers[this.currentLayer].addTo(this.map);
        this.$container.dataset.layer = this.currentLayer; // fix the lines between the tiles

        this.map.on('baselayerchange', this._updateCoordSystem, this);
        this.map.on('zoomend', this.onMapZoom, this);

        // Controls
        this.addControls();

        this.initSearch();

        // GPS
        this.addGPS();

        // Past locations
        //this.addPastLocations();

        // Marker
        this.addMapMarker();

        // Graticule
        this.addGraticule();

        const that = this;
        events.subscribe('location:updated', function(location) {
            that.onLocationChange(location);
        });
    },

    getLayers() {
        const layers = {};
        layers.Satellite = L.tileLayer(
            'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
            {
                attribution:
                    'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                id: CONFIG.map.mapbox_satellite_id,
                accessToken: CONFIG.map.mapbox_api_key,
                tileSize: 256, // specify as, OS layer overwites this with 200 otherwise,
                minZoom: MIN_WGS84_ZOOM
            }
        );

        layers.OSM = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
            attribution:
                'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: CONFIG.map.mapbox_osm_id,
            accessToken: CONFIG.map.mapbox_api_key,
            tileSize: 256, // specify as, OS layer overwites this with 200 otherwise
            minZoom: MIN_WGS84_ZOOM
        });

        const start = new BIGU.OSRef(0, 0).to_latLng();
        const end = new BIGU.OSRef(7 * GRID_STEP, 13 * GRID_STEP).to_latLng();
        const bounds = L.latLngBounds([start.lat, start.lng], [end.lat, end.lng]);

        layers.OS = L.OSOpenSpace.tilelayer(CONFIG.map.os_api_key); // eslint-disable-line

        layers.OS.options.bounds = bounds;

        layers.OS.on('tileerror', tile => {
            let index = 0;
            const result = tile.tile.src.match(/missingTileString=(\d+)/i);
            if (result) {
                index = parseInt(result[1], 10);
                index++;

                // don't do it more than few times
                if (index < 4) {
                    // eslint-disable-next-line
                    tile.tile.src = tile.tile.src.replace(/missingTileString=(\d+)/i, '&missingTileString=' + index);
                }
            } else if (index === 0) {
                // eslint-disable-next-line
                tile.tile.src = tile.tile.src + '&missingTileString=' + index;
            }
        });

        return layers;
    },

    addControls() {
        this.controls = L.control.layers(
            {
                'Ordnance Survey': this.layers.OS,
                'Open Street Map': this.layers.OSM,
                Satellite: this.layers.Satellite
            },
            {}
        );
        this.map.addControl(this.controls);

        //this.map.addControl(new L.Control.Compass());
    },

    addPastLocations() {
        if (this.options.hidePast) {
            return;
        }

        const that = this;
        const button = new LeafletButton({
            position: 'topright',
            className: 'past-btn',
            title: 'navigate to past locations',
            body: '<span class="icon icon-history"></span>',
            onClick() {
                that.trigger('past:click');
            },
            maxWidth: 30 // number
        });

        this.map.addControl(button);
        const sample = this.model.get('sample');
        if (sample.isGPSRunning()) {
            this._set_gps_progress_feedback('pending');
        } else {
            this._set_gps_progress_feedback('');
        }
    },

    onLocationChange(newLocation) {
        this.location = newLocation;

        const location = this._getCurrentLocation();

        this.updateMapMarker(location);

        this._repositionMap(location.source === 'map');
    },

    addGraticule() {
        const appModel = {
            useGridRef: true,
            useGridMap: true,
            useGridNotifications: false,
            gridSquareUnit: 'monad'
        };
        const useGridRef = appModel['useGridRef'];
        const useGridMap = appModel['useGridMap'];
        if (!useGridRef || !useGridMap) return;

        const that = this;

        function getColor() {
            let color;
            switch (that.currentLayer) {
                case 'OS':
                    color = '#08b7e8';
                    break;
                case 'OSM':
                    color = 'gray';
                    break;
                default:
                    color = 'white';
            }
            return color;
        }

        const gridRef = new L.GridRef({ color: getColor() });

        gridRef.update = () => {
            const zoom = that.getMapZoom();
            // calculate granularity
            const color = getColor();
            const bounds = that.map.getBounds();
            const granularity = gridRef._getGranularity(zoom);
            const step = GRID_STEP / granularity;

            const polylinePoints = gridRef._calcGraticule(step, bounds);
            gridRef.setStyle({ color });
            gridRef.setLatLngs(polylinePoints);
        };
        gridRef.addTo(this.map);
    },

    /**
     * Normalises the map zoom level between different projections.
     * @param layer
     * @returns {*}
     */
    getMapZoom(zoom) {
        let normalZoom = zoom || this.map.getZoom();

        if (this.currentLayer === 'OS') {
            normalZoom += OS_ZOOM_DIFF;
        }

        return normalZoom;
    },

    onMapZoom() {
        const zoom = this.getMapZoom();

        const validOSZoom = API._isValidOSZoom(zoom);

        if (this.currentLayer === 'OS' && !validOSZoom) {
            // change to WGS84
            this.map.removeLayer(this.layers.OS);
            this.map.addLayer(this.layers.Satellite);
        } else {
            const isSatellite = this.currentLayer === 'Satellite';
            if (isSatellite && validOSZoom) {
                // only change base layer if user is on OS and did not specificly
                // select OSM/Satellite
                const inGB = LocHelp.isInGB(this._getCurrentLocation());
                if (!this.currentLayerControlSelected && inGB) {
                    this.map.removeLayer(this.layers.Satellite);
                    this.map.addLayer(this.layers.OS);
                }
            }
        }
    },

    _repositionMap(dontZoom) {
        const location = this._getCurrentLocation();
        let zoom;
        if (!dontZoom) {
            zoom = this._metresToMapZoom(location.accuracy);
            if (this.currentLayer === 'OS') {
                zoom = this._deNormalizeOSzoom(zoom);
            }
        } else {
            zoom = this.map.getZoom();
        }
        this.map.setView(this._getCenter(location), zoom);
    },

    _getCurrentLayer() {
        let layer = DEFAULT_LAYER;
        const location = this._getCurrentLocation();
        const zoom = this._metresToMapZoom(location.accuracy);
        let inGB = LocHelp.isInGB(location);

        if (!location.latitude) {
            // if no location default to true
            inGB = true;
        }

        const validOSzoom = this._isValidOSZoom(zoom);

        if (!validOSzoom) {
            layer = 'Satellite';
        } else if (!inGB) {
            this.currentLayerControlSelected = true;
            layer = 'Satellite';
        }

        return layer;
    },

    _getCurrentLocation() {
        /*        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                currentLat = position.coords['latitude'];
                currentLng = position.coords['longitude'];

                createMap(currentLat, currentLng);
            });
        } else {
            alert('No Geolocation found, defaulting to Plymouth as your current location');
            createMap(50.3755, 4.1427);
        }*/
        if (!this.location) {
            this.location = {
                accuracy: 100,
                latitude: 50.3755,
                longitude: -4.1427
            };
        }
        return this.location || {};
    },

    /**
     * Set full remaining height.
     */
    _refreshMapHeight() {
        // const mapHeight = $(document).height() - 47 - 47 - 44;// - 47 - 38.5;
        this.$container = document.getElementById('map');
        // $(this.$container).height(mapHeight);
        $(this.$container).style = 'height: 100vh;';
    },

    _updateCoordSystem(e) {
        let nextLayer = e.name;

        this.currentLayerControlSelected = this.controls._handlingClick;

        const center = this.map.getCenter();
        let zoom = this.getMapZoom();
        this.map.options.crs = L.CRS.EPSG3857;

        // a change from WGS84 -> OS
        if (nextLayer === 'Ordnance Survey') {
            zoom = API._deNormalizeOSzoom(zoom);
            this.map.options.crs = OS_CRS;
            nextLayer = 'OS';
        }

        this.currentLayer = nextLayer;

        this.map.setView(center, zoom, { reset: true });
        this.$container.dataset.layer = this.currentLayer; // fix the lines between the tiles
    },

    _getCenter(location = {}) {
        let center = DEFAULT_CENTER;
        if (location.latitude) {
            center = [location.latitude, location.longitude];
        }
        return center;
    },

    /**
     * Checks if the WGS84 map zoom level fits within OSGB map zoom max/min.
     * @param zoom
     * @returns {boolean}
     */
    _isValidOSZoom(zoom) {
        const deNormalizedZoom = zoom - OS_ZOOM_DIFF;
        return deNormalizedZoom >= 0 && deNormalizedZoom <= MAX_OS_ZOOM - 1;
    },

    /**
     * Turns WGS84 map zoom into OSGB zoom.
     * @param zoom
     * @returns {number}
     */
    _deNormalizeOSzoom(zoom) {
        const deNormalizedZoom = zoom - OS_ZOOM_DIFF;
        if (deNormalizedZoom > MAX_OS_ZOOM - 1) {
            return MAX_OS_ZOOM - 1;
        } else if (deNormalizedZoom < 0) {
            return 0;
        }

        return deNormalizedZoom;
    },

    /**
     * Transform location accuracy to WGS84 map zoom level.
     * @param metres
     * @private
     */
    _metresToMapZoom(metres) {
        if (!metres) {
            return DEFAULT_LAYER_ZOOM;
        }

        if (metres >= 5000) {
            return 9;
        } else if (metres >= 1000) {
            return 12; // tetrad
        } else if (metres >= 500) {
            return 13;
        } else if (metres >= 50) {
            return 16;
        }

        return 18;
    },

    /**
     * Transform WGS84 map zoom to radius in meters.
     * @param zoom
     * @returns {*}
     * @private
     */
    _mapZoomToMetres(zoom) {
        let scale;
        if (zoom <= 10) {
            scale = 0;
        } else if (zoom <= 12) {
            return 1000; // tetrad (radius is 1000m)
        } else if (zoom <= 13) {
            scale = 1;
        } else if (zoom <= 16) {
            scale = 2;
        } else {
            scale = 3;
        }

        scale = 5000 / Math.pow(10, scale); // meters
        return scale < 1 ? 1 : scale;
    }
};

$.extend(API, search);
$.extend(API, mapMarker);
$.extend(API, gpsFunctions);

export default API;
