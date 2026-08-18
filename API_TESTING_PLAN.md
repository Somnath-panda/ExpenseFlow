# ExpenseFlow – Complete API Testing Plan & Postman Guide

This document defines the complete API testing specification and test automation plan for **ExpenseFlow**, covering positive workflows, negative error cases, authorization boundaries, and Postman collection execution.

---

## 1. Test Suite Overview

| Category | Total Tests | Endpoints Covered | Status Codes Verified |
| :--- | :--- | :--- | :--- |
| **Authentication** | 9 | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` | `200`, `201`, `400`, `401`, `409` |
| **Expenses** | 10 | `GET/POST /api/expenses`, `GET/PUT/DELETE /api/expenses/:id` | `200`, `201`, `400`, `401`, `404` |
| **Budget Planner** | 4 | `GET/POST/PUT /api/budget` | `200`, `201`, `400`, `401` |
| **Dashboard** | 3 | `/api/dashboard/summary`, `/category-summary`, `/monthly-summary` | `200`, `401` |
| **Security & IDOR** | 7 | Cross-user expenses, SQL injection, token tampering | `400`, `401`, `404` |

---

## 2. API Endpoints Specification

### Authentication (`/api/auth`)

#### 1. POST `/api/auth/register`
- **Description**: Registers a new user and generates a 7-day JWT token.
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Expected Responses**:
  - `201 Created`: `{ "success": true, "data": { "token": "...", "user": { "id": 1, "name": "John Doe", "email": "john@example.com" } } }`
  - `400 Bad Request`: Missing fields, short password (<6 chars), invalid email format.
  - `409 Conflict`: Email already registered.

#### 2. POST `/api/auth/login`
- **Description**: Authenticates existing user.
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Expected Responses**:
  - `200 OK`: Returns JWT token & safe user profile.
  - `401 Unauthorized`: Invalid email or incorrect password.

#### 3. GET `/api/auth/me`
- **Description**: Fetches current user profile using JWT.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Expected Responses**:
  - `200 OK`: `{ "success": true, "data": { "user": { "id": 1, "name": "John Doe", "email": "john@example.com" } } }`
  - `401 Unauthorized`: Missing, expired, or malformed token.

---

### Expense Management (`/api/expenses`)

#### 4. POST `/api/expenses`
- **Description**: Creates a new expense record bound to the authenticated user.
- **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "title": "Grocery Shopping",
    "amount": 2450.50,
    "category_id": 1,
    "expense_date": "2026-08-15",
    "description": "Weekly essentials"
  }
  ```
- **Expected Responses**:
  - `201 Created`: Expense created and returned with category join.
  - `400 Bad Request`: Missing title, amount ≤ 0, invalid category ID, invalid calendar date.

#### 5. GET `/api/expenses`
- **Description**: Retrieves user expenses with optional filters.
- **Query Parameters**:
  - `search`: Case-insensitive title/description search.
  - `category`: Category ID (e.g. `1`) or Category name (e.g. `Food`).
  - `month` / `year`: Filter by date (e.g. `month=8&year=2026`).
  - `minAmount` / `maxAmount`: Numeric range filter.
- **Expected Response**:
  - `200 OK`: `{ "success": true, "data": { "count": 10, "expenses": [...] } }`

#### 6. GET `/api/expenses/:id`
- **Expected Responses**:
  - `200 OK`: Returns single expense details.
  - `404 Not Found`: Expense does not exist OR belongs to another user (IDOR protection).

#### 7. PUT `/api/expenses/:id`
- **Description**: Updates an existing expense owned by the authenticated user.
- **Expected Responses**:
  - `200 OK`: Updated expense record.
  - `404 Not Found`: Expense not owned by caller.

#### 8. DELETE `/api/expenses/:id`
- **Expected Responses**:
  - `200 OK`: `{ "success": true, "message": "Expense deleted successfully" }`
  - `404 Not Found`: Expense not owned or already deleted.

---

### Monthly Budget (`/api/budget`)

#### 9. POST / PUT `/api/budget`
- **Description**: Sets or updates the monthly budget limit using upsert logic.
- **Body**:
  ```json
  {
    "month": 8,
    "year": 2026,
    "amount": 25000
  }
  ```
- **Expected Responses**:
  - `201 Created` / `200 OK`: Calculated budget status (`normal`, `warning`, `exceeded`), `percentageUsed`, `spent`, and `remaining`.
  - `400 Bad Request`: Month outside 1–12, invalid year, amount ≤ 0.

#### 10. GET `/api/budget?month=8&year=2026`
- **Expected Response**:
  - `200 OK`: Returns budget calculations. If unbudgeted, returns `{ "budget": 0, "status": "unbudgeted", "isSet": false }`.

---

### Financial Dashboard (`/api/dashboard`)

#### 11. GET `/api/dashboard/summary`
- **Description**: Returns all 7 financial KPIs.
- **Expected Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalExpenses": 18500,
      "monthlyExpenses": 6500,
      "monthlyBudget": 20000,
      "remainingBudget": 13500,
      "transactionCount": 24,
      "highestExpense": 2500,
      "averageExpense": 770.83
    }
  }
  ```

#### 12. GET `/api/dashboard/category-summary`
- **Expected Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalSpending": 18500,
      "categories": [
        { "id": 1, "name": "Food", "amount": 6500, "count": 8, "percentage": 35.14 },
        { "id": 2, "name": "Travel", "amount": 3500, "count": 4, "percentage": 18.92 }
      ]
    }
  }
  ```

#### 13. GET `/api/dashboard/monthly-summary?year=2026`
- **Expected Response (200 OK)**:
  - Array of all 12 calendar months with spending totals and transaction counts.

---

## 3. How to Import and Run in Postman

### Step 1: Open Postman
1. Launch the **Postman** desktop application or open [web.postman.co](https://web.postman.co).

### Step 2: Import the Collection
1. Click the **Import** button in the top-left corner of Postman.
2. Select **Files** and choose the `ExpenseFlow.postman_collection.json` file located in the project root directory:
   ```
   c:\Users\somna\OneDrive\Desktop\ExpenseFlow\ExpenseFlow.postman_collection.json
   ```
3. Click **Import**.

### Step 3: Configure Environment Variables
The collection uses standard variables:
- `baseUrl`: `http://localhost:5000/api`
- `token`: Automatically populated upon running **Register Success** or **Login Success**.

### Step 4: Run the Collection Runner
1. Click on **ExpenseFlow REST API Test Collection** in the left sidebar.
2. Click **Run Collection**.
3. Ensure all requests are checked and click **Run ExpenseFlow REST API Test Collection**.
4. All test assertions will execute automatically and display green passing checkmarks (`PASS`).

---

## 4. CLI Execution via Newman (Optional)

You can also run the collection directly from your terminal using Newman:
```bash
npx newman run ExpenseFlow.postman_collection.json --env-var "baseUrl=http://localhost:5000/api"
```
