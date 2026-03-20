# ShopTi - Ecommerce Web Application

Full-stack ecommerce app built with **Node.js/Express** (backend), **HTML/CSS/JavaScript** (frontend), **SQLite**, and **JWT** authentication. UI follows `PROJECT_UI_SPEC.md`.

## Project structure

```
/frontend          # Static frontend
  /css             # base, layout, buttons, cards, forms, animations
  /js              # api, auth, cart, products, orders, ui, app (routing)
  /admin           # Admin dashboard (products, orders, users)
  /images          # Placeholder image
/backend
  /routes          # auth, products, cart, orders, admin
  /middleware      # JWT auth, admin role
  /database        # schema.sql, init.js (SQLite)
```

## Setup

### Backend

```bash
cd backend
npm install
```

Optional: create `.env` with:

```
PORT=3000
JWT_SECRET=your-secret-key
```

Start the server:

```bash
npm start
```

Server runs at **http://localhost:3000**. It serves the frontend and the API at `/api/*`.

### Default admin (seeded on first run)

- **Email:** admin@shopti.com  
- **Password:** admin123  

## Features

### User

- Register / Login (JWT)
- Browse products (list, search, detail)
- Add to cart, update quantity, remove
- Checkout (shipping address) → order created, cart cleared
- Order history and order detail

### Admin (after login as admin)

- **Dashboard:** orders count, products count, users count, revenue, recent orders
- **Products:** list, add, edit, delete (modal form)
- **Orders:** list, update status (pending → confirmed → shipped → delivered / cancelled)
- **Users:** list, edit (name, role), delete (except self)

## API (REST)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | - | Register |
| POST | /api/auth/login | - | Login |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/products | - | List products (?search=, ?limit=, ?offset=) |
| GET | /api/products/:id | - | Product detail |
| GET | /api/cart | JWT | Cart items |
| POST | /api/cart | JWT | Add/update item (body: product_id, quantity) |
| PUT | /api/cart/:id | JWT | Set quantity (body: quantity) |
| DELETE | /api/cart/:id | JWT | Remove item |
| GET | /api/orders | JWT | My orders |
| GET | /api/orders/:id | JWT | Order detail |
| POST | /api/orders | JWT | Create order / checkout (body: shipping_address) |
| GET | /api/admin/dashboard | Admin | Dashboard stats |
| GET/POST | /api/admin/products | Admin | List / create |
| GET/PUT/DELETE | /api/admin/products/:id | Admin | Get / update / delete |
| GET | /api/admin/orders | Admin | List orders |
| GET/PUT | /api/admin/orders/:id | Admin | Get / update status |
| GET | /api/admin/users | Admin | List users |
| GET/PUT/DELETE | /api/admin/users/:id | Admin | Get / update / delete |

## Tech stack

- **Frontend:** HTML, CSS (design system from UI_SPEC), Vanilla JS, Fetch API, hash routing
- **Backend:** Node.js, Express, better-sqlite3, bcryptjs, jsonwebtoken, cors, dotenv
- **Database:** SQLite (file: `backend/database/shopti.db`)
- **Auth:** JWT in `Authorization: Bearer <token>`

## Design (UI_SPEC)

- Colors: primary #2563EB, secondary #10B981, neutrals, error/success
- Typography: Inter, 32/24/20/16/14/12px
- Layout: 12-column grid, max-width 1200px, sticky header
- Components: product cards (hover lift + shadow), buttons, forms, skeleton loading
- Admin: 240px dark sidebar, tables with row hover
- Responsive: breakpoints 768px, 1024px; mobile hamburger, 2-col product grid
