import LocHelper from '../helpers/location';
import Marker from '../map/marker';
import BIGU from 'bigu';

const LATLONG_REGEX = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/g;

const search = {
    polyline: null,
    grid: null,

    initSearch() {
        const that = this;

        document.getElementById('search-button').onclick = function() {
            that.search();
        };

        document.getElementById('save-location-button').onclick = function() {
            that.saveLocation();
        };

        document.getElementById('search').addEventListener('keyup', function(e) {
            switch (e.keyCode) {
                case 13:
                    // press Enter
                    that.search();
                case 38:
                // Up
                case 40:
                    // Down
                    break;
                default:
                    // Other
                    var value = e.target.value.replace(/\s+/g, '').toUpperCase();

                    var empty = value === '';
                    var validGridRef = LocHelper.isValidGridRef(value);
                    var validLatLong = value.match(LATLONG_REGEX);
                    var searchInput = document.getElementById('search');
                    if (empty || validGridRef || validLatLong) {
                        //Remove red class to input
                        searchInput.classList.remove('error');
                    } else {
                        //Add red class to input
                        searchInput.classList.add('error');
                    }
            }
        });
    },

    search() {
        try {
            var search = document.getElementById('search').value;

            var normalizedGridref = search.replace(/\s/g, '').toUpperCase();
            var lat;
            var lng;
            var accuracy = 1;
            // check if it is in GB land and not in the sea
            if (LocHelper.isValidGridRef(normalizedGridref)) {
                var parsedGridRef = BIGU.GridRefParser.factory(normalizedGridref);

                var latLng = parsedGridRef.osRef.to_latLng();
                accuracy = parsedGridRef.length / 2;
                lat = latLng.lat;
                lng = latLng.lng;
            } else if (search.match(LATLONG_REGEX)) {
                // Lat Long
                lat = parseFloat(search.split(',')[0]);
                lng = parseFloat(search.split(',')[1]);
            } else {
                // Search by location name
                alert('Map only supports searching by grid-ref or lat/lng at the moment, sorry!');
                this.currentSearch = null;
                document.getElementById('save-location-button').disabled = true;

                return;
            }

            document.getElementById('save-location-button').disabled = false;
            this.currentSearch = normalizedGridref;
            this.treeGrid = {
                latitude: lat,
                longitude: lng,
                accuracy
            };
            this.createPolyline();
        } catch (e) {
            alert('Something went wrong' + e);
        }
    },

    saveLocation() {
        this.saveLocationToRecents(this.currentSearch);
        document.getElementById('save-location-button').disabled = true;
    },

    saveLocationToRecents(search) {
        let recentLocations = JSON.parse(window.localStorage.getItem('recentLocations')) || [];
        recentLocations.unshift({ search, ...this.treeGrid });
        recentLocations = recentLocations.slice(0, 5);
        window.localStorage.setItem('recentLocations', JSON.stringify(recentLocations));
    },

    createPolyline() {
        if (!this.treeGrid) {
            return;
        }
        const { latitude: lat, longitude: lng, accuracy } = this.treeGrid;

        if (this.polyline) {
            this.map.removeLayer(this.polyline);
            this.map.removeLayer(this.grid);
        }
        this.grid = Marker.generateRectangleMarker({
            latitude: lat,
            longitude: lng,
            accuracy: accuracy,
            color: 'red'
        });
        this.grid.addTo(this.map);

        var latlngs = [[this.location.latitude, this.location.longitude], [lat, lng]];

        this.polyline = L.polyline(latlngs, { color: 'red' }).addTo(this.map);
        this.map.fitBounds(this.polyline.getBounds());
    }
};

export default search;
