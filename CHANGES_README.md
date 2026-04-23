# Backend Changes (March 12 - Present)

This document summarizes the changes made to the backend folder and files (excluding the `adminFrontend` directory) since March 12, 2026.

## 1. Controllers
- **`userController.js`**: 
  - Added the `getAllUsers` function to fetch the complete list of users, sorted by their creation date in descending order.
- **`partnerController.js`**: 
  - Added the `getAllPartners` function to fetch the complete list of partners (drivers/deliverers), also sorted by their creation date in descending order.

## 2. Models
- **`Order.js`**:
  - Introduced several new fields for advanced billing and payment tracking:
    - **Payment Details**: `paymentMode` (cash/online/wallet), `paymentStatus` (pending/paid/failed/refunded), `paymentGateway` (defaults to razorpay), and `transactionId`.
    - **Fee Structure**: `baseFare`, `deliveryFee`, `platformFee`, `discount`, `gstAmount`, and `totalAmount`.
- **`User.js`**: 
  - Updated the allowable values for the `role` enum to include `admin` alongside `user`.

## 3. Routes
- **`userRoutes.js`**:
  - Implemented a new secure admin route `GET /all` which retrieves all users. This route is guarded by `protect` and `adminOnly` middlewares.
- **`partnerRoutes.js`**:
  - Implemented a new secure admin route `GET /all` which retrieves all partners. This route is also guarded by `protect` and `adminOnly` middlewares.

## 4. Utility / Simulation Scripts (Root Directory)
Several untracked helper scripts were added to the root of the backend configuration for testing, migrating and simulating data:
- **Simulation Scripts**: `simulate_all_vehicles.js`, `simulate_orders.js`
- **Testing Scripts**: `test_route.js`
- **Migration & UI helpers**: `migrate_ui.js`, `fix.js`, `fix2.js`, `update_css.js`, `update_dashboard_logo.js`, `update_logo.js`, `update_uber_css.js`

> **Note**: No changes in the `adminFrontend` directory are included in this report as per requirements.
