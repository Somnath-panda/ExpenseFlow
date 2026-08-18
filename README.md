# ExpenseFlow 💸

> A modern, full-stack personal finance and expense tracking application built for speed, simplicity, and security.

[![Live Demo](https://img.shields.io/badge/Live_Demo-expenseflow--live.vercel.app-00C7B7?style=for-the-badge&logo=vercel&logoColor=white)](https://expenseflow-live.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-TiDB%20%2F%20MySQL-00758F?style=for-the-badge&logo=mysql&logoColor=white)](https://tidbcloud.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 🌐 Live Application

🚀 **Live URL**: **[https://expenseflow-live.vercel.app/](https://expenseflow-live.vercel.app/)**

---

## ✨ Features

- **📊 Interactive Dashboard**:
  - Real-time KPI summary cards (Total Spent, Monthly Budget, Remaining Balance).
  - Category spending breakdown powered by **Chart.js** (Doughnut & Bar charts).
  - Monthly trend analysis and recent transaction history.

- **🧾 Complete Expense Management**:
  - Full CRUD capabilities (Create, Read, Update, Delete).
  - Multi-parameter filtering: Filter by category, date range, and live keyword search.
  - Pagination and responsive data tables.

- **🎯 Budget Tracking & Alerts**:
  - Set custom monthly spending limits.
  - Dynamic progress bars with real-time overspending and threshold alerts.

- **📥 Data Export**:
  - One-click CSV / Excel export for filtered expense reports.

- **🌗 Modern UI / UX**:
  - Clean, responsive glassmorphism aesthetic.
  - Seamless **Dark / Light mode** toggle with persistent local preferences.

- **🔒 Enterprise-Grade Security**:
  - Token-based stateless authentication using **JWT (JSON Web Tokens)**.
  - Salted password hashing with **bcrypt**.
  - Secure parameterized queries preventing SQL Injection.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 (Custom Design System), Chart.js |
| **Backend** | Node.js, Express.js (MVC Architecture), CORS, Dotenv |
| **Database** | TiDB Cloud Serverless (Distributed MySQL-compatible) / Local MySQL |
| **Authentication** | JWT (jsonwebtoken), bcrypt password hashing |
| **Hosting & Deployment** | Vercel (Serverless Node.js + Static CDN) |

---

## 📂 Project Structure

```text
ExpenseFlow/
├── client/                      # Static Frontend Application
│   ├── css/                     # Custom stylesheet design system
│   │   ├── auth.css
│   │   ├── budget.css
│   │   ├── dashboard.css
│   │   ├── expenses.css
│   │   └── style.css
│   ├── js/                      # Modular client logic & API handlers
│   │   ├── api.js               # Centralized Fetch API client wrapper
│   │   ├── auth.js
│   │   ├── budget.js
│   │   ├── dashboard.js
│   │   └── expenses.js
│   ├── index.html               # Landing / Dashboard page
│   ├── login.html               # Authentication login
│   ├── register.html            # User registration
│   ├── expenses.html            # Expense management table & filters
│   └── budget.html              # Budgeting & targets
├── database/                    # Database definitions
│   └── schema.sql               # Database schema and initial seeds
├── server/                      # Express Backend (MVC Architecture)
│   ├── config/                  # Database connection pool (with TLS/SSL support)
│   │   └── db.js
│   ├── controllers/             # Request handlers
│   │   ├── authController.js
│   │   ├── budgetController.js
│   │   ├── categoryController.js
│   │   ├── dashboardController.js
│   │   └── expenseController.js
│   ├── middleware/              # Authentication & error handling middleware
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/                  # Database access layer
│   ├── routes/                  # API endpoints definition
│   ├── app.js                   # Express application setup
│   └── server.js                # Local server entry point
├── vercel.json                  # Vercel deployment configuration
├── API_TESTING_PLAN.md          # Complete API test suite documentation
└── ExpenseFlow.postman_collection.json # Postman collection
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | Service health & database connectivity check | ❌ |
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | ❌ |
| `GET` | `/api/auth/profile` | Get logged-in user profile | ✅ |
| `GET` | `/api/categories` | List all expense categories | ❌ |
| `GET` | `/api/expenses` | Retrieve filtered & paginated user expenses | ✅ |
| `POST` | `/api/expenses` | Create a new expense entry | ✅ |
| `PUT` | `/api/expenses/:id` | Update an existing expense | ✅ |
| `DELETE`| `/api/expenses/:id` | Delete an expense | ✅ |
| `GET` | `/api/dashboard/summary` | Get aggregated KPI totals & category breakdown | ✅ |
| `GET` | `/api/budget` | Get budget target and spending for a month/year | ✅ |
| `POST` | `/api/budget` | Set or update monthly budget limit | ✅ |

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone https://github.com/Somnath-panda/ExpenseFlow.git
cd ExpenseFlow
```

### 2. Configure Database
Import the SQL schema into your local MySQL or TiDB instance:
```bash
mysql -u root -p < database/schema.sql
```

### 3. Setup Environment Variables
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
NODE_ENV=development

# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=expenseflow

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
```

### 4. Install Dependencies & Run
```bash
cd server
npm install
npm run dev
```

Visit **`http://localhost:5000`** in your browser.

---

## 🧪 Testing

### Automated CLI Test Suite
Run the automated Postman test suite directly from the command line:
```bash
cd server
node test-postman-runner.js
```

### Postman
Import `ExpenseFlow.postman_collection.json` into Postman to test all endpoints.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
