# 🚀 AVIGO Backend API

### Parcel Delivery Platform Backend

The **Avigo Backend** powers the parcel delivery ecosystem connecting **customers, delivery partners, and administrators**.

It provides:

* Authentication
* OTP verification
* Parcel order management
* Delivery partner operations
* Dashboard analytics
* Route calculation
* Profile image uploads
* Secure APIs

---

# 🧠 Backend Architecture

```
Flutter Mobile App
        │
        ▼
   Express API
        │
        ▼
    MongoDB
        │
        ├── Cloudinary (Images)
        └── Google Maps API (Routing)
```

---

# 🛠 Tech Stack

| Technology      | Purpose                |
| --------------- | ---------------------- |
| Node.js         | Backend runtime        |
| Express.js      | REST API framework     |
| MongoDB         | NoSQL database         |
| Mongoose        | MongoDB ODM            |
| JWT             | Authentication         |
| bcryptjs        | Password encryption    |
| Multer          | File upload middleware |
| Cloudinary      | Cloud image storage    |
| Google Maps API | Route calculation      |
| Socket testing  | Real-time testing      |
| dotenv          | Environment variables  |

---

# 📂 Project Structure

```
backend
│
├── config
│   ├── cloudinary.js
│   ├── db.js
│   └── multer.js
│
├── controllers
│   ├── authController.js
│   ├── dashboardController.js
│   ├── orderController.js
│   ├── otpController.js
│   └── userController.js
│
├── middleware
│   ├── authMiddleware.js
│   └── adminMiddleware.js
│
├── models
│   ├── User.js
│   ├── Order.js
│   └── Otp.js
│
├── routes
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── orderRoutes.js
│   ├── otpRoutes.js
│   ├── routeRoutes.js
│   └── userRoutes.js
│
├── server.js
├── testSocket.js
└── package.json
```

---

# 🗄 Database Models

## 👤 User Model

Represents customers, delivery partners, and admins.

Fields:

```
name
phone
password
role (user / partner / admin)
profilePic
createdAt
```

Used for:

* login
* authentication
* partner assignment

---

## 📦 Order Model

Represents a parcel delivery order.

Fields:

```
userId
partnerId
pickupLocation
dropLocation
status
createdAt
```

Order lifecycle:

```
Created
   ↓
Pending
   ↓
Accepted by Partner
   ↓
Picked Up
   ↓
Delivered
```

---

## 🔢 OTP Model

Stores OTP verification codes.

Fields:

```
phone
otp
expiresAt
```

Used for:

* signup verification
* login verification

---

# 🔐 Authentication System

Authentication uses **JWT tokens**.

Flow:

```
User login
   ↓
Server generates JWT
   ↓
Token returned to Flutter
   ↓
Token stored locally
   ↓
Token sent in every request
```

Header example:

```
Authorization: Bearer <JWT_TOKEN>
```

Middleware:

```
middleware/authMiddleware.js
```

Verifies the token before allowing access.

---

# 🛡 Admin Protection

Admin-only routes use:

```
middleware/adminMiddleware.js
```

Example protected route:

```
GET /api/orders/all
```

Only **admin users** can access this endpoint.

---

# 📡 API Routes

Base URL:

```
http://localhost:5000/api
```

---

# 🔐 Authentication API

File:

```
routes/authRoutes.js
```

---

## Register User

```
POST /api/auth/register
```

Example request:

```json
{
"name": "Arjun",
"phone": "9999999999",
"password": "123456"
}
```

Response:

```
User created successfully
```

---

## Login

```
POST /api/auth/login
```

Example request:

```json
{
"phone": "9999999999",
"password": "123456"
}
```

Response:

```json
{
"token": "JWT_TOKEN",
"user": {
"id": "...",
"name": "Arjun"
}
}
```

---

## Get Current User

```
GET /api/auth/me
```

Header required:

```
Authorization: Bearer TOKEN
```

Returns logged-in user data.

---

# 🔢 OTP API

File:

```
routes/otpRoutes.js
```

---

## Send Signup OTP

```
POST /api/otp/send-signup-otp
```

Example:

```json
{
"phone": "9999999999"
}
```

---

## Verify Signup OTP

```
POST /api/otp/verify-signup-otp
```

Example:

```json
{
"phone": "9999999999",
"otp": "123456"
}
```

---

## Send Login OTP

```
POST /api/otp/send-login-otp
```

---

## Verify Login OTP

```
POST /api/otp/verify-login-otp
```

---

# 📦 Order Management API

File:

```
routes/orderRoutes.js
```

---

## Create Order

```
POST /api/orders/create
```

Requires authentication.

Example:

```json
{
"pickupLocation": "IIT Kanpur",
"dropLocation": "Kanpur Central"
}
```

---

## Get Pending Orders

```
GET /api/orders/pending
```

Used by **delivery partners** to view available deliveries.

---

## Accept Order

```
PUT /api/orders/accept/:id
```

Example:

```
PUT /api/orders/accept/64ab82d...
```

Assigns a delivery partner.

---

## Update Order Status

```
PUT /api/orders/status/:id
```

Status values:

```
Picked
Delivered
Cancelled
```

Example:

```json
{
"status": "Delivered"
}
```

---

## Get My Orders

```
GET /api/orders/my
```

Returns orders for logged-in user.

---

## Get All Orders (Admin)

```
GET /api/orders/all
```

Returns:

```
All users
All partners
Order data
```

MongoDB populate used:

```
.populate("userId","name phone")
.populate("partnerId","name phone")
```

---

# 👤 User API

File:

```
routes/userRoutes.js
```

---

## Create User

```
POST /api/users/create
```

Used for creating user accounts.

---

## Upload Profile Picture

```
POST /api/users/upload-profile
```

Upload type:

```
multipart/form-data
```

Field name:

```
profile
```

Example using Postman:

```
form-data
profile → image file
```

Image uploaded to **Cloudinary**.

Response includes:

```
profile image URL
```

---

# 🗺 Route Calculation API

File:

```
routes/routeRoutes.js
```

Uses **Google Directions API**.

---

## Get Route

```
GET /api/routes
```

Example:

```
/api/routes?origin=Delhi&destination=Noida
```

Response:

```json
{
"distanceKm": 21.3,
"durationMin": 35,
"polyline": "encoded_polyline_string"
}
```

Used by the Flutter app to:

* calculate distance
* estimate delivery time
* draw map routes

---

# 📊 Dashboard API

File:

```
routes/dashboardRoutes.js
```

---

## Dashboard Statistics

```
GET /api/dashboard/stats
```

Returns:

```
totalUsers
totalOrders
activeDeliveries
completedOrders
```

Used for **admin dashboard analytics**.

---

# 📸 Image Upload System

Upload flow:

```
Flutter App
    ↓
Multer middleware
    ↓
Cloudinary
    ↓
URL stored in MongoDB
```

Configuration files:

```
config/multer.js
config/cloudinary.js
```

Advantages:

* global CDN
* optimized images
* no server storage

---

# 🌐 Environment Variables

Located in:

```
.env
```

Example:

```
PORT=5000

MONGO_URI=mongodb+srv://...

JWT_SECRET=secret_key

CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

GOOGLE_KEY=google_maps_key
```

---

# 🚀 Running Backend

Install dependencies:

```
npm install
```

Start server:

```
node server.js
```

Or with nodemon:

```
npm run dev
```

Server runs on:

```
http://localhost:5000
```

---

# 🔒 Security Features

Implemented protections:

* JWT authentication
* Password hashing with bcrypt
* Protected API routes
* Admin authorization
* Environment variable protection

---

# 📡 Future Improvements

Possible upgrades:

* Live driver tracking
* Real-time socket delivery updates
* Payment integration
* AI route optimization
* Driver fleet management

---

# 👨‍💻 Author

**Arjun**

Founder — **Aerial Intelligence Lab**

Interests:

* UAV systems
* AI robotics
* Computer vision
* Mobile platforms

---
