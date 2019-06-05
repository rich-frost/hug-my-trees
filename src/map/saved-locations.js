const savedLocations = {
    initSavedLocations() {
        const savedLocations = JSON.parse(window.localStorage.getItem('savedLocations')) || [];
        savedLocations.map(location => this.addLocationToMenu(location));
    },

    saveLocationToLS(search) {
        let savedLocations = JSON.parse(window.localStorage.getItem('savedLocations')) || [];
        const newLocation = { search, ...this.treeGrid };
        savedLocations.unshift(newLocation);
        savedLocations = savedLocations.slice(0, 5);
        window.localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
        this.addLocationToMenu(newLocation);
    },

    addLocationToMenu(location) {
        const button = document.createElement('li');
        const that = this;
        button.classList.add(['dropdown-item']);
        button.setAttribute('data-toggle', 'collapse');
        button.innerHTML = location.search;
        button.onclick = function() {
            that.showLocation(location);
            return false;
        };
        const savedLocationsMenu = document.getElementById('saved-locations-menu');
        savedLocationsMenu.append(button);
    },

    showLocation(location) {
        this.treeGrid = location;
        const search = document.getElementById('search');
        search.value = location.search;
        this.createPolyline();
    }
};

export default savedLocations;
