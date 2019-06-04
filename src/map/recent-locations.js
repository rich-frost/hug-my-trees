const recentLocations = {
    initRecentLocations() {
        const locationsDiv = document.getElementById('recent-locations');
        const recentLocations = JSON.parse(window.localStorage.getItem('recentLocations')) || [];
        recentLocations.map(location => {
            const button = document.createElement('button');
            const that = this;
            button.innerHTML = location.search;
            button.onclick = function() {
                that.showLocation(location);
                return false;
            };
            locationsDiv.append(button);
        });
    },

    showLocation(location) {
        this.treeGrid = location;
        this.createPolyline();
    }
};

export default recentLocations;
