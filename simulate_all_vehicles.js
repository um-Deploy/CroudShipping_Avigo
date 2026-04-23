
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
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&steps=false&access_token=${MAPBOX_TOKEN}`;
        const res = await axios.get(url);
        if (!res.data.routes || res.data.routes.length === 0) throw new Error('No routes found');
        const coords = res.data.routes[0].geometry.coordinates;
        console.log(`  ✅ Route OK: ${coords.length} road points`);
        return coords;
    } catch (e) {
        console.error('  ⚠️ Route fetch failed:', e.message, '— using interpolated fallback');
        // Generate 40 interpolated points as fallback
        const steps = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            steps.push([
                start[0] + (end[0] - start[0]) * t,
                start[1] + (end[1] - start[1]) * t
            ]);
        }
        return steps;
    }
}

async function simulateAll() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ DB Connected.\n');

    // Clear old in_transit orders
    await Order.deleteMany({ status: 'in_transit' });
    console.log('🗑️  Old in_transit orders cleared.\n');

    const user = await User.findOne() || await User.create({ name: 'Demo User', phone: '0000000001' });
    const partners = await Partner.find().limit(5);

    if (!partners.length) {
        console.error('No partners in DB! Please seed some partners first.');
        process.exit(1);
    }

    // ✅ DIAGONAL routes across Delhi — different lng AND lat so no straight lines
    const routes = [
        { pickup: [77.1093, 28.5495], drop: [77.2313, 28.6912], pickupAddr: 'Dwarka Sector 10', dropAddr: 'Shalimar Bagh' },
        { pickup: [77.2791, 28.5355], drop: [77.1018, 28.7055], pickupAddr: 'Okhla Phase 2',    dropAddr: 'Rohini Sector 3' },
        { pickup: [77.3388, 28.6104], drop: [77.0878, 28.6577], pickupAddr: 'Shahdara',          dropAddr: 'Janakpuri West' },
        { pickup: [77.2202, 28.4800], drop: [77.2071, 28.7200], pickupAddr: 'Tughlaqabad',        dropAddr: 'Model Town' },
        { pickup: [77.1553, 28.5950], drop: [77.2940, 28.6450], pickupAddr: 'Vasant Kunj',        dropAddr: 'Laxmi Nagar' },
    ];

    const fleet = [];

    for (let i = 0; i < Math.min(partners.length, routes.length); i++) {
        const partner = partners[i];
        const r = routes[i];

        // Force-set partner's starting location
        await Partner.findByIdAndUpdate(partner._id, {
            isOnline: true, isBusy: true,
            location: { type: 'Point', coordinates: r.pickup }
        });

        const gateWays = ['Razorpay', 'Stripe', 'Paytm', 'PhonePe'];
        const modes = ['cash', 'online', 'wallet'];
        const pMode = modes[Math.floor(Math.random() * modes.length)];
        
        // Professional TXN ID generation
        const txnId = (pMode === 'cash' ? 'CSH-' : 'TXN-') + Math.random().toString(36).substring(7).toUpperCase();

        const baseFare = Math.floor(Math.random() * 200 + 50);
        const deliveryFee = 40;
        const platformFee = 5;
        const discount = Math.random() > 0.7 ? 20 : 0;
        
        const subTotal = baseFare + deliveryFee + platformFee - discount;
        const gst = Math.round(subTotal * 0.18);
        const total = subTotal + gst;

        const order = await Order.create({
            userId: user._id,
            partnerId: partner._id,
            status: 'in_transit',
            pickup: { address: r.pickupAddr, lat: r.pickup[1], lng: r.pickup[0] },
            drop:   { address: r.dropAddr,   lat: r.drop[1],   lng: r.drop[0]   },
            parcelType: 'box', weight: 2, 
            baseFare,
            deliveryFee,
            platformFee,
            discount,
            price: subTotal,
            gstAmount: gst,
            totalAmount: total,
            paymentMode: pMode,
            paymentStatus: Math.random() > 0.1 ? 'paid' : 'pending',
            paymentGateway: pMode === 'cash' ? 'Hand Delivery' : gateWays[Math.floor(Math.random() * gateWays.length)],
            transactionId: txnId
        });

        console.log(`📦 ${partner.name}: ${r.pickupAddr} → ${r.dropAddr}`);
        const path = await getRoute(r.pickup, r.drop);
        fleet.push({ orderId: order._id, partnerId: partner._id, path, index: 0 });
    }

    console.log(`\n🚀 Fleet of ${fleet.length} vehicles starting NOW...\n`);
    console.log('Open the dashboard, click any "in transit" order to see live tracking.\n');

    const socket = io(SERVER_URL);

    socket.on('connect', () => {
        console.log('✅ Socket live!\n');

        const tick = setInterval(() => {
            let anyMoving = false;

            fleet.forEach(v => {
                if (v.index >= v.path.length) return;
                anyMoving = true;
                const [lng, lat] = v.path[v.index];
                socket.emit('partnerLocationUpdate', {
                    orderId: v.orderId,
                    partnerId: v.partnerId,
                    lat, lng
                });
                process.stdout.write(`🛵 [${v.partnerId.toString().slice(-4)}] step ${v.index+1}/${v.path.length}  `);
                v.index++;
            });
            console.log('');

            if (!anyMoving) {
                console.log('\n🏁 All vehicles delivered!');
                clearInterval(tick);
                mongoose.disconnect();
                socket.disconnect();
            }
        }, 3000);
    });

    socket.on('connect_error', err => {
        console.error('Socket error:', err.message);
        console.log('Make sure backend server is running: node server.js');
        process.exit(1);
    });
}

simulateAll().catch(err => { console.error(err); process.exit(1); });
