# ExpenseFlow 💸

A simple, secure expense tracker and budget management web application.

---

## ✨ Features

- **📊 Dashboard**: Real-time summary cards, category spending chart, and monthly trends.
- **🧾 Expense Tracking**: Add, edit, delete, and filter expenses by category, date, or search term.
- **📥 CSV Export**: One-click export of filtered expenses to Excel/CSV.
- **🎯 Monthly Budget**: Set spending targets with live progress and overspending alerts.
- **🌗 Theme Toggle**: Smooth Dark / Light mode support.
- **🔒 Secure**: JWT authentication, bcrypt passwords, and protected routes.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL

---

## 🚀 Quick Start

### 1. Database Setup
Create the database and tables in MySQL using:
```sql
SOURCE server/schema.sql;
```

### 2. Configure Environment
Create a `server/.env` file:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=expenseflow
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
```

### 3. Run the App
```bash
cd server
npm install
npm run dev
```

Open **http://localhost:5000** in your browser.

---

## 🧪 Testing

Run automated API tests:
```bash
node server/test-postman-runner.js
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

*(Postman collection also available at `ExpenseFlow.postman_collection.json`)*
