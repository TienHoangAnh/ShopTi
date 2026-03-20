# ShopTi – Vercel + MongoDB Backend

This document describes the **serverless backend** (MongoDB + Vercel) that lives alongside the original Express + SQLite backend.

## Structure

```
/api                    # Vercel serverless functions
  /auth                 # register, login, me, profile
  /categories           # GET list
  /products             # GET list, GET filters, GET [id]
  /cart                 # GET/POST index, PUT/DELETE [id]
  /orders               # GET/POST index, GET [id], PUT [id]/cancel
  /admin                # dashboard, categories, products, orders, users
/lib
  mongodb.js            # connectDB() singleton for serverless
  auth.js               # JWT authenticate(), requireAdmin(), JWT_SECRET
  getPathParam.js       # get path param from req.url for [id] routes
/models
  User.js, Category.js, Product.js, Order.js, CartItem.js
scripts
  seed-mongo.js         # Seed admin + categories + products
package.json            # mongoose, bcryptjs, jsonwebtoken
vercel.json             # outputDirectory: frontend, functions config
.env.example            # MONGODB_URI, JWT_SECRET
```

## Environment variables

| Variable      | Description                    |
|--------------|--------------------------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET`  | Secret for JWT signing          |
| `DB_TYPE`     | `sqlite` or `mongodb` (Express local only) |

Set these in the Vercel project **Settings → Environment Variables**, or in a `.env` file for local runs.

- **Local**: copy `.env.example` → `.env` (file `.env` không commit, đã nằm trong `.gitignore`).

## Models (Mongoose)

- **User** – email, password_hash, full_name, phone, address, role (user/admin)
- **Category** – name
- **Product** – name, description, price, image_url, stock, category (ref), size, color
- **Order** – user, status, total_amount, receiver_*, shipping_address, payment_method, **items[]** (embedded: product, quantity, price_at_order, product_name)
- **CartItem** – user, product, quantity

Order items are **embedded** in the Order document (no separate collection).

## Deploy to Vercel

1. Push the repo and import the project in Vercel.
2. Set **Root Directory** to the repo root (default).
3. Set **Output Directory** to `frontend` (so the site root serves the frontend).
4. Add env vars: `MONGODB_URI`, `JWT_SECRET`.
5. Deploy. The `/api/*` routes become serverless functions automatically.

## Seed MongoDB (first time)

From the project root:

```bash
npm install
# Set MONGODB_URI (and optionally JWT_SECRET) in .env
npm run seed
```

This creates:

- Admin user: **admin@shopti.com** / **admin123**
- Categories: Điện tử, Thời trang, Phụ kiện, Đồ dùng
- Sample products (if none exist)

## Local development with serverless

You can run the Vercel dev server so that `/api` uses the serverless handlers and the site uses the frontend:

```bash
npm i -g vercel
vercel dev
```

Or keep using the **Express + SQLite** backend for local dev:

```bash
cd backend && npm install && npm start
```

Then open `http://localhost:3000` (Express serves both frontend and API).

## Local development with Express + MongoDB (switch DB_TYPE)

You can run the same Express server but point it to MongoDB by setting:

- `DB_TYPE=mongodb`
- `MONGODB_URI=...`

Example:

```bash
set DB_TYPE=mongodb
set MONGODB_URI=your-uri-here
cd backend && npm start
```

## API compatibility

All existing endpoints and response shapes are preserved so the current frontend works without changes:

- IDs are returned as strings (MongoDB `_id`).
- Auth: JWT in `Authorization: Bearer <token>`; same register/login/me/profile.
- Products: list with filters (search, category_id, size, color, min_price, max_price), filters endpoint, single product.
- Cart: GET/POST/PUT/DELETE with same body/query.
- Orders: list, create (checkout), get one, cancel (PUT .../cancel).
- Admin: dashboard (completed/cancelled orders, revenue estimated/actual), categories, products CRUD, orders list/update status, users CRUD.
