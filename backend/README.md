# ParkEasy Backend API

Production-ready, QR-based parking booking and management system backend built with Node.js, Express, MongoDB (Mongoose), Zod validation, JWT authentication, and atomic concurrency guards.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/parkeasy?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_QR_SECRET=your_jwt_qr_signing_secret_key
```

### 3. Seed Default Admin
```bash
npm run seed
```
- **Email:** `admin@parkeasy.com`
- **Password:** `Admin@12345`

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Automated Test Suite (Jest + Supertest)
```bash
npm test
```
*Executes all 5 critical test suites across concurrency, billing, $geoNear, idempotency, and RBAC.*

---

## API Endpoints Reference Table

| Category | Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/v1/health` | Public | System uptime & MongoDB connection status |
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Register new car owner account |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Login (User, Handler, Admin) |
| **Auth** | `POST` | `/api/v1/auth/refresh-token` | Public | Rotate and issue fresh access/refresh tokens |
| **Auth** | `GET` | `/api/v1/auth/me` | User / Handler / Admin | Get profile of logged-in user |
| **Auth** | `POST` | `/api/v1/auth/logout` | User / Handler / Admin | Invalidate active refresh token session |
| **Auth** | `POST` | `/api/v1/auth/change-password` | User / Handler / Admin | Change password |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | Public | Generate token-based password reset link |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | Public | Complete password reset using token |
| **User QR** | `GET` | `/api/v1/me/qr` | User | Get signed profile QR token (`purpose: 'profile'`) |
| **Parking** | `GET` | `/api/v1/parking/sites/nearby` | Public / User | Spatial `$geoNear` search (10km loop / 5km filter) |
| **Parking** | `GET` | `/api/v1/parking/sites` | Public / User | Filter sites by area, postalCode, keyword |
| **Parking** | `GET` | `/api/v1/parking/sites/:id/slots` | Public / User | Real-time slot status breakdown for a site |
| **Parking** | `POST` | `/api/v1/parking/bookings` | User | Atomic slot reservation & ticket QR token |
| **Parking** | `POST` | `/api/v1/parking/bookings/:id/cancel`| User | Free cancellation before vehicle check-in |
| **Parking** | `GET` | `/api/v1/parking/bookings/mine` | User | View current and previous parking sessions |
| **Wallet** | `GET` | `/api/v1/wallet` | User | Check wallet balance & account details |
| **Wallet** | `GET` | `/api/v1/wallet/history` | User | Paginated financial transaction ledger |
| **Payment** | `POST` | `/api/v1/wallet/recharge/order` | User | Create simulated recharge order (idempotent) |
| **Payment** | `POST` | `/api/v1/wallet/recharge/pay` | User | Pay via demo card (`4242...` succeeds, `4000...` fails) |
| **Feedback** | `POST` | `/api/v1/feedback` | User | Submit rating (1–5) and review |
| **Feedback** | `GET` | `/api/v1/feedback` | Admin | Review all user feedback with rating aggregates |
| **Handler** | `POST` | `/api/v1/handler/scan` | Handler / Admin | Scan ticket QR (auto-decides entry or exit) |
| **Handler** | `POST` | `/api/v1/handler/exit/confirm-cash`| Handler / Admin | Confirm cash shortfall payment at exit |
| **Handler** | `POST` | `/api/v1/handler/wallet/recharge` | Handler / Admin | Cash wallet top-up by scanning user profile QR |
| **Handler** | `POST` | `/api/v1/handler/bookings` | Handler / Admin | Instant booth walk-in booking for arriving car |
| **Handler** | `GET` | `/api/v1/handler/history` | Handler / Admin | Date-wise parking history for handler's site |
| **Handler** | `GET` | `/api/v1/handler/recharges` | Handler / Admin | Date-wise cash collection ledger for shift |
| **Admin** | `GET` | `/api/v1/admin/dashboard` | Admin | Real-time network statistics & activity feeds |
| **Admin** | `POST` | `/api/v1/admin/sites` | Admin | Create parking site (auto-generates slots) |
| **Admin** | `GET` | `/api/v1/admin/sites` | Admin | List all sites with live slot utilization |
| **Admin** | `PUT` | `/api/v1/admin/sites/:id` | Admin | Update site & dynamically expand slots |
| **Admin** | `DELETE`| `/api/v1/admin/sites/:id` | Admin | Deactivate site & disable slots |
| **Admin** | `GET` | `/api/v1/admin/sites/:siteId/slots`| Admin | View all slots in site |
| **Admin** | `POST` | `/api/v1/admin/sites/:siteId/slots`| Admin | Create custom slot (e.g. VIP-01) |
| **Admin** | `PUT` | `/api/v1/admin/slots/:id` | Admin | Update slot number or disable slot |
| **Admin** | `DELETE`| `/api/v1/admin/slots/:id` | Admin | Delete slot and decrement site total |
| **Admin** | `POST` | `/api/v1/admin/handlers` | Admin | Create handler & assign to parking site |
| **Admin** | `GET` | `/api/v1/admin/handlers` | Admin | List handlers with site details |
| **Admin** | `PUT` | `/api/v1/admin/handlers/:id` | Admin | Reassign site or reset handler password |
| **Admin** | `DELETE`| `/api/v1/admin/handlers/:id` | Admin | Deactivate handler |
| **Admin** | `GET` | `/api/v1/admin/users` | Admin | Search users with pagination |
| **Admin** | `GET` | `/api/v1/admin/users/:id` | Admin | View user details & recent activity |
| **Admin** | `PUT` | `/api/v1/admin/users/:id/status` | Admin | Toggle user active/deactivated state |
| **Admin** | `GET` | `/api/v1/admin/history/parking` | Admin | Filterable network-wide parking history |
| **Admin** | `GET` | `/api/v1/admin/history/recharges` | Admin | Filterable network-wide recharge history |

---

## Postman Collection Structure (`ParkEasy_API_Collection.json`)

```
ParkEasy API - Full Suite
├── 0. System Health
│   └── Health Check
├── 1. Authentication
│   ├── 1.1 Login as Admin
│   ├── 1.2 Register User
│   ├── 1.3 Get My Profile (/me)
│   └── 1.4 Refresh Token
├── 2. Admin - Dashboard
│   └── Get Dashboard Overview & Stats
├── 3. Admin - Parking Sites
│   ├── 3.1 Create Parking Site (Auto generates slots)
│   ├── 3.2 List All Sites (with slot utilization)
│   ├── 3.3 Get Site Details & Handlers
│   ├── 3.4 Update Site & Expand Slots
│   └── 3.5 Deactivate Site
├── 4. Admin - Parking Slots
│   ├── 4.1 Get All Slots for Site
│   ├── 4.2 Create Custom Slot
│   ├── 4.3 Update Slot Status (disable / enable)
│   └── 4.4 Delete Slot
├── 5. Admin - Handlers Management
│   ├── 5.1 Create Handler (Assigned to Site)
│   ├── 5.2 List Handlers with Site details
│   ├── 5.3 Get Handler by ID
│   ├── 5.4 Update Handler (Reassign or reset pass)
│   └── 5.5 Deactivate Handler
├── 6. Admin - Users Management
│   ├── 6.1 List Users (Search & Pagination)
│   ├── 6.2 Get User by ID (with recent bookings/txns)
│   └── 6.3 Toggle User Active Status
├── 7. Admin - Reports & Read-Only History
│   ├── 7.1 Parking History (with Date filter)
│   ├── 7.2 Recharge History (with Date filter & Summary)
│   └── 7.3 Feedback List (with Rating filter & Avg Rating)
├── 8. User - Parking & Bookings
│   ├── 8.1 Auto-Search Nearby Sites ($geoNear 10km/5km)
│   ├── 8.2 Filter Sites by Area & Postal Code
│   ├── 8.3 Get Site Slots & Live Availability
│   ├── 8.4 Book a Slot (Atomic Reservation & Ticket QR)
│   ├── 8.5 Get My Bookings (Current + Previous)
│   └── 8.6 Cancel Booking (Before Entry)
├── 9. User - Wallet & Profile QR
│   ├── 9.1 Get Wallet Balance
│   ├── 9.2 Get Wallet Transaction History
│   ├── 9.3 Get Signed Profile QR Token (/me/qr)
│   ├── 9.4 Simulated Gateway - Create Recharge Order
│   ├── 9.5 Simulated Gateway - Pay (Success Card: 4242...)
│   ├── 9.6 Simulated Gateway - Pay (Failure Test Card: 4000...0002)
│   ├── 9.7 Simulated Gateway - Pay (Declined Card: 5555...)
│   ├── 9.8 Simulated Gateway - Duplicate Payment Rejection (Idempotency)
│   └── 9.9 Submit Feedback (User)
└── 10. Handler - Scanner, Settlements & Walk-ins
    ├── 10.1 Login as Handler
    ├── 10.2 Scan Ticket QR (Entry or Exit Decision)
    ├── 10.3 Confirm Cash Shortfall for Exit
    ├── 10.4 Recharge User Wallet via Cash (Scan Profile QR)
    ├── 10.5 Create Walk-in Booking (Driver with no prior booking)
    ├── 10.6 View Handler Site History
    └── 10.7 View Handler Cash Recharges
```

---

## Test Cards for Demo Payment Gateway
- **Success:** `4242 4242 4242 4242` | Any future MM/YYYY | 3-digit CVV
- **Deliberate Failure:** `4000 0000 0000 0002` | Any future MM/YYYY | 3-digit CVV
- **Card Declined:** Any other 16-digit card number

