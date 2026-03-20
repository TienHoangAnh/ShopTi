# Ecommerce Web UI/UX Specification - ShopTi

Version: 1.0  
Purpose: Provide a clear UI/UX specification so AI coding tools (Cursor) can generate a consistent frontend for the ecommerce project.

---

# 1. Design Philosophy

The UI should follow these principles:

- Clean
- Modern
- Minimal
- Fast loading
- Mobile friendly
- Simple navigation
- Clear call-to-action buttons

Style inspiration:

- Apple
- Shopify
- Stripe dashboard

---

# 2. Color System

## Primary Color

Used for main actions (buttons, links, highlights)


Primary: #2563EB
Primary Hover: #1D4ED8
Primary Light: #DBEAFE


---

## Secondary Color

Used for secondary actions


Secondary: #10B981
Secondary Hover: #059669


---

## Neutral Colors


Background: #F9FAFB
Card Background: #FFFFFF
Border Color: #E5E7EB
Text Primary: #111827
Text Secondary: #6B7280


---

## Error Colors


Error: #EF4444
Warning: #F59E0B
Success: #22C55E


---

# 3. Typography

Font family:


Primary Font: Inter
Fallback: Arial, sans-serif


---

## Font Sizes


Heading 1: 32px
Heading 2: 24px
Heading 3: 20px
Body Text: 16px
Small Text: 14px
Label: 12px


---

## Font Weight


Regular: 400
Medium: 500
SemiBold: 600
Bold: 700


---

# 4. Layout System

Use a **12-column grid layout**.

Max width:


Desktop container: 1200px
Tablet container: 900px
Mobile container: 100%


Spacing system:


4px
8px
12px
16px
24px
32px
48px
64px


Padding rule:


Card padding: 16px
Page padding: 24px
Section spacing: 48px


---

# 5. Header Layout

Header contains:

- Logo (left)
- Navigation menu (center)
- User actions (right)

Example navigation:


Home
Products
Cart
Orders


User actions:


Login
Register
Avatar dropdown


Header behavior:

- Sticky header
- Shadow when scrolling


box-shadow: 0 2px 8px rgba(0,0,0,0.05)


---

# 6. Product Card Component

Each product card includes:


Product Image
Product Name
Price
Add to Cart Button


Card design:


border-radius: 12px
padding: 16px
background: white
border: 1px solid #E5E7EB


Hover effect:


transform: translateY(-4px)
box-shadow: 0 8px 20px rgba(0,0,0,0.08)
transition: 0.2s ease


Image style:


aspect-ratio: 1:1
object-fit: cover
border-radius: 8px


---

# 7. Buttons

Primary Button:


background: #2563EB
color: white
padding: 10px 18px
border-radius: 8px
font-weight: 500


Hover:


background: #1D4ED8


---

Secondary Button:


background: #F3F4F6
color: #111827


---

Danger Button:


background: #EF4444
color: white


---

# 8. Forms

Input style:


height: 40px
border: 1px solid #E5E7EB
border-radius: 8px
padding: 0 12px


Focus state:


border-color: #2563EB
outline: none
box-shadow: 0 0 0 2px #DBEAFE


Label style:


font-size: 14px
font-weight: 500
margin-bottom: 4px


---

# 9. Loading Effects

Use skeleton loading.

Skeleton style:


background: linear-gradient(
90deg,
#F3F4F6 25%,
#E5E7EB 37%,
#F3F4F6 63%
)
animation: skeleton-loading 1.4s infinite


Animation:


@keyframes skeleton-loading {
0% { background-position: -200px 0 }
100% { background-position: calc(200px + 100%) 0 }
}


---

# 10. Page Transition Animation

Use simple fade transition.


opacity: 0 → 1
duration: 0.2s
ease-in-out


---

# 11. Cart UI

Cart item layout:


Product Image
Product Name
Quantity Control
Price
Remove Button


Quantity control:


[-] 1 [+]


Total section:


Subtotal
Shipping
Total
Checkout Button


Checkout button must be large and highlighted.

---

# 12. Admin Dashboard Layout

Admin UI includes:

Sidebar + Content layout.

Sidebar width:


240px


Sidebar menu:


Dashboard
Products
Orders
Users
Settings


Sidebar style:


background: #111827
color: white


Active menu:


background: #1F2937


---

# 13. Table Design (Admin)

Used for:

- product list
- orders
- users

Table style:


border-collapse: collapse
width: 100%


Row hover:


background: #F9FAFB


Cell padding:


12px


---

# 14. Modal Component

Modal used for:

- create product
- edit product
- delete confirmation

Modal style:


background: white
border-radius: 12px
padding: 24px
max-width: 500px
margin: auto


Overlay:


background: rgba(0,0,0,0.4)


---

# 15. Responsive Rules

Mobile breakpoint:


768px


Tablet breakpoint:


1024px


Changes on mobile:


Product grid: 4 columns → 2 columns
Sidebar → collapsible
Header menu → hamburger


---

# 16. Icons

Use icon library:


Heroicons
or
Lucide icons


Icon size:


16px
20px
24px


---

# 17. Image Handling

Images must:


lazy load
compressed
max width 100%


Fallback image if missing:


/images/placeholder.png


---

# 18. Accessibility

Rules:


button must have hover state
images must have alt text
contrast ratio > 4.5
keyboard navigation supported


---

# 19. Performance Rules

Limit:


JS bundle < 200kb
Image < 300kb
First load < 2s


Use:


lazy loading
code splitting
caching


---

# 20. File Naming Convention

Use:


kebab-case


Example:


product-card.js
cart-page.js
admin-dashboard.js


---

# 21. CSS Structure

Use this order:


base
layout
components
utilities
animations


Example folder:


css/
base.css
layout.css
buttons.css
cards.css
forms.css
animations.css


---

# 22. JavaScript Structure

JS modules:


api.js
auth.js
products.js
cart.js
orders.js
admin.js
ui.js


---

# End of Specification