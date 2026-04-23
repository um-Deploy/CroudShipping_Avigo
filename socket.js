const { Server } = require("socket.io");
const Partner = require("./models/Partner");
const Order = require("./models/Order");

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      console.log("User Connected:", socket.id);

      // driver registers socket
      socket.on("registerPartner", async (partnerId) => {
        socket.join(`partner-${partnerId}`);
        console.log(`Partner registered with socket: ${partnerId}`);

        try {
          const partner = await Partner.findById(partnerId);
          if (!partner) return;

          await Partner.findByIdAndUpdate(partnerId, {
            socketId: socket.id,
            isOnline: true
          });

          const activeOrder = await Order.findOne({
            partnerId: partnerId,
            status: { $in: ["accepted", "picked", "in_transit", "near_drop"] }
          });

          if (!activeOrder && partner.isBusy) {
            await Partner.findByIdAndUpdate(partnerId, {
              isBusy: false
            });
            console.log(`Partner ${partnerId} busy state corrected`);
          }
        } catch (err) {
          console.log("Partner register check error:", err.message);
        }
      });


      // user joins order tracking room
      socket.on("joinOrderRoom", (orderId) => {
        socket.join(orderId);
        console.log(`User joined order room: ${orderId}`);
      });

      // driver sends live location
      socket.on("partnerLocationUpdate", async (data) => {
        const { orderId, lat, lng, partnerId } = data;

        try {
          if (partnerId) {
            await Partner.findByIdAndUpdate(partnerId, {
              location: {
                type: "Point",
                coordinates: [lng, lat],
              },
            });
          }

          io.to(orderId).emit("locationUpdate", {
            lat,
            lng,
          });

          // ⭐ AUTO-DETECT NEAR DROP (within 500m)
          const order = await Order.findById(orderId);
          if (order && order.status === "in_transit" && order.drop) {
            const getDistance = (lat1, lon1, lat2, lon2) => {
              const R = 6371e3; // meters
              const φ1 = lat1 * Math.PI / 180;
              const φ2 = lat2 * Math.PI / 180;
              const Δφ = (lat2 - lat1) * Math.PI / 180;
              const Δλ = (lon2 - lon1) * Math.PI / 180;
              const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ/2) * Math.sin(Δλ/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              return R * c;
            };

            const dist = getDistance(lat, lng, order.drop.lat, order.drop.lng);
            if (dist < 500) {
              console.log(`[NearDrop] Order ${orderId} is near drop (${Math.round(dist)}m). Updating status.`);
              order.status = "near_drop";
              await order.save();
              
              io.to(orderId).emit("orderStatusUpdated", {
                orderId: order._id,
                status: "near_drop",
              });
            }
          }
        } catch (err) {
          console.log("Location update error:", err.message);
        }
      });


      socket.on("disconnect", async () => {
        console.log("User Disconnected:", socket.id);

        try {
          await Partner.findOneAndUpdate(
            { socketId: socket.id },
            {
              isOnline: false,
              socketId: null
            }
          );
        } catch (err) {
          console.log("Disconnect update error:", err.message);
        }
      });

    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  }
};
