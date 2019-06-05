/** ****************************************************************************
 * Main app configuration file.
 *****************************************************************************/
const CONFIG = {
    // variables replaced on build
    /* global APP_VERSION, APP_BUILD, APP_NAME */
    version: process.env.APP_VERSION,
    build: process.env.APP_BUILD,
    name: process.env.APP_NAME,

    gps_accuracy_limit: 100,

    // mapping
    map: {
        os_api_key: '',
        mapbox_api_key: '',
        mapbox_osm_id: '',
        mapbox_satellite_id: ''
    }
};

export default CONFIG;
