
const axios = require('axios');
require('dotenv').config();

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

async function testRoute() {
    const start = [77.2090, 28.5139];
    const end = [77.1930, 28.7025];
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    const res = await axios.get(url);
    console.log(`Points: ${res.data.routes[0].geometry.coordinates.length}`);
    console.log(JSON.stringify(res.data.routes[0].geometry.coordinates.slice(0, 5), null, 2));
}

testRoute();
