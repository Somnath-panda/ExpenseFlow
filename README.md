# ExpenseFlow 💸

> A modern, full-stack personal finance and expense tracking application built for speed, simplicity, and security.

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
