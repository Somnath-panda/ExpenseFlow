# ExpenseFlow – Personal Expense Tracker

ExpenseFlow is a full-stack web application built to help users seamlessly track their personal expenses, manage monthly budgets, and analyze spending patterns with real-time visual charts.

---

## 🏗️ Project Architecture & Tech Stack

### **Frontend**
- **HTML5** & **CSS3** (Pure Vanilla CSS)
- **Vanilla JavaScript** (ES6+)
- **Fetch API** (Asynchronous HTTP Requests)
- **Chart.js** (Data Visualization & Visual Analytics)

### **Backend**
- **Node.js** & **Express.js** (MVC Architecture)
- **RESTful API Principles**

### **Database**
- **MySQL** (Relational Database)

### **Authentication & Security**
- **JWT (JSON Web Tokens)** for stateless authentication
- **bcrypt** for password hashing

---

## 📁 Directory Structure

```text
ExpenseFlow/
├── client/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── expenses.html
│   ├── budget.html
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   └── expenses.css
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── expenses.js
│       └── budget.js
│
├── server/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── expenseController.js
│   │   ├── budgetController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── budgetRoutes.js
│   │   └── dashboardRoutes.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── expenseModel.js
│   │   ├── budgetModel.js
│   │   └── categoryModel.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── database/
│   └── schema.sql
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started (Step 1)

### 1. Prerequisites
- **Node.js** (v14+ installed)
- **npm** (Node Package Manager)

### 2. Backend Setup & Dependencies Installation
Navigate to the `server/` directory and install the dependencies:

```bash
cd server
npm install
```

### 3. Running the Backend Server

- **Development Mode (with Nodemon auto-reload):**
  ```bash
  npm run dev
  ```

- **Production Mode:**
  ```bash
  npm start
  ```

### 4. Health Check Verification
To verify the server is running properly, navigate to:
```text
http://localhost:5000/api/health
```
Expected JSON Response:
```json
{
  "success": true,
  "message": "ExpenseFlow API is running"
}
```
