BudgetApp - Personal Budget Management Software
Student: Alaa Eldin Abdullah Hassan Ali
ID: 20220930
Section: S12
TA: Basma Mukhtar Hussain

=== HOW TO RUN ===

1. Install Node.js and PostgreSQL
2. Create a database called "budgetapp"
3. Edit .env file with your database connection string
4. Open terminal in this folder
5. Run: npm install
6. Run: npm start
7. Open browser at http://localhost:3000

=== FILES ===

server/
  index.js          - Express server, starts the app and connects routes
  models/
    BaseModel.js    - Abstract base class with common CRUD operations
    User.js         - User model (extends BaseModel)
    Transaction.js  - Transaction model with budget alert (extends BaseModel)
    Budget.js       - Budget model with spending queries (extends BaseModel)
    Goal.js         - Goal model with contribution logic (extends BaseModel)
    Category.js     - Category model (extends BaseModel)
    Notification.js - Notification model with read tracking (extends BaseModel)
    db.js           - PostgreSQL connection pool using pg library
    schema.js       - Creates all database tables on first run
  routes/
    auth.js         - Signup and login API endpoints
    transactions.js - Add, edit, delete transactions + budget check
    budgets.js      - Create and track monthly budgets
    goals.js        - Create savings goals and contribute money
    reports.js      - Generate income/expense reports by category and month
    categories.js   - Manage income and expense categories
    dashboard.js    - Dashboard summary data
    notifications.js - Budget alert notifications
  middleware/
    auth.js         - JWT token verification middleware

public/
  index.html        - Frontend single page application
  js/app.js         - Alpine.js application logic and API calls
  css/app.css       - Custom styles

docs/               - JSDoc generated API documentation (HTML)
Presentation.html   - User guide / documentation (HTML)
Presentation.pdf    - User guide / documentation (PDF)

.env                - Environment variables (database URL, JWT secret)
package.json        - Project dependencies and start script

=== GITHUB ===

https://github.com/20220930-art/BudgetApp

=== TOOLS USED ===

- Node.js (runtime)
- Express.js (web framework)
- pg / node-postgres (PostgreSQL client)
- Alpine.js (frontend reactivity)
- Bootstrap 5 (CSS framework)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- JSDoc (API documentation generation)
