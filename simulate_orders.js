
const mongoose = require('mongoose');
const io = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();

const User = require('./models/User');
const Partner = require('./models/Partner');
const Order = require('./models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/avigo';
const SERVER_URL = 'http://localhost:5000';
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

async function getRoute(start, end) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    const res = await axios.get(url);
    return res.data.routes[0].geometry.coordinates;
}

async function simulate() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    let user = await User.findOne({ phone: '1111111111' });
    if (!user) user = await User.create({ name: 'Simulation User', phone: '1111111111' });

    let partner = await Partner.findOne({ phone: '2222222222' });
    const startCoord = [77.2090, 28.5139]; // Reset to South Delhi
    
    if (!partner) {
        partner = await Partner.create({ 
            name: 'Speedy Express', phone: '2222222222', vehicleType: 'bike', isOnline: true,
            location: { type: 'Point', coordinates: startCoord } 
        });
    } else {
        partner.location.coordinates = startCoord;
        await partner.save();
    }

    const pickup = { address: 'Connaught Place, Delhi', lat: 28.6315, lng: 77.2167 };
    const drop = { address: 'Model Town, Delhi', lat: 28.7025, lng: 77.1930 };

    const order = await Order.create({
        userId: user._id, partnerId: partner._id, status: 'in_transit',
        pickup, drop, parcelType: 'box', weight: 2, price: 250
    });

    console.log(`Starting Simulation for Order: ${order._id}`);

    const path = await getRoute(startCoord, [drop.lng, drop.lat]);
    console.log(`Path found with ${path.length} points`);

    const socket = io(SERVER_URL);
    
    socket.on('connect', () => {
        console.log('Simulation socket connected');
        
        let index = 0;
        const interval = setInterval(() => {
            if (index >= path.length) {
                console.log('Simulation reached destination');
                clearInterval(interval);
                process.exit(0);
            }

            const [lng, lat] = path[index];
            socket.emit('partnerLocationUpdate', {
                orderId: order._id,
                partnerId: partner._id,
                lat,
                lng
            });

            console.log(`Moving: Point ${index+1}/${path.length} -> [${lat}, ${lng}]`);
            index++;
        }, 3000); // 3 seconds per point for slow, professional movement
    });
}

simulate().catch(err => console.error(err));
