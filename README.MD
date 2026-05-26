# SuccessFactors MDF CRUD Extension App

This full-stack application connects a React frontend and a Node.js backend to perform full CRUD (Create, Read, Update, Delete) operations on a custom SuccessFactors Metadata Framework (MDF) object.

---

## 🌐 Environment Profile

*   **SuccessFactors Instance (UI)**: `https://successfactors.com`
*   **Company ID**: `SFCPART000474`
*   **OData API Endpoint**: `https://successfactors.com`
*   **Custom MDF Name**: `cust_success_mdf`

---

## ⚙️ SuccessFactors Configuration: Creating the MDF

Before running the application, you must create and expose the custom MDF object inside your `SFCPART000474` instance.

### Step 1: Configure Object Definition
1. Log into your SuccessFactors instance.
2. Search for **Configure Object Definitions** in the action search bar.
3. In the top-right corner, click **Create New** and select **Object Definition**.
4. Fill in the primary object properties:
   * **Code**: `cust_success_mdf`
   * **Label**: `Success MDF Profile`
   * **Effective Dating**: `None` (or as per business requirement)
   * **API Visibility**: Set to `Editable` (Crucial for OData CRUD operations)

### Step 2: Define Fields
In the **Fields** grid section, add or verify the following custom fields:


| Field Name | Data Type | Length | Required | Label |
| :--- | :--- | :--- | :--- | :--- |
| `externalCode` | `String` | `128` | Yes | Unique ID |
| `cust_Name` | `String` | `255` | Yes | Name |
| `cust_Age` | `Number` | `3` | Yes | Age |
| `cust_Gender` | `String` | `50` | No | Gender |

*Note: `externalCode` serves as the mandatory primary key for your OData requests.*

### Step 3: Save and Refresh Metadata
1. Click **Save** on the object definition.
2. Search for **OData API Metadata Refresh and Export** in the action search bar.
3. Click **Refresh** next to *Refresh Metadata* to expose `cust_success_mdf` via the OData API layer.

---

## 🚀 Architecture & CRUD Endpoint Matrix

All CRUD actions are routed through the secure Node.js proxy backend to interface with the SuccessFactors OData v2 engine.


| Operation | HTTP Method | Express Endpoint | SuccessFactors Target OData URL |
| :--- | :--- | :--- | :--- |
| **Create** | `POST` | `/api/profiles` | `.../odata/v2/cust_success_mdf` |
| **Read All** | `GET` | `/api/profiles` | `.../odata/v2/cust_success_mdf?$select=externalCode,cust_Name,cust_Age,cust_Gender` |
| **Update** | `PUT` | `/api/profiles/:id` | `.../odata/v2/cust_success_mdf('id')` |
| **Delete** | `DELETE` | `/api/profiles/:id` | `.../odata/v2/cust_success_mdf('id')` |

---

## 🛠️ Project Structure

```text
├── backend/
│   ├── config/          # API & credential store
│   ├── routes/          # CRUD router logic (profiles.js)
│   ├── server.js        # Express middleware setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # ProfileForm.jsx, ProfileTable.jsx
│   │   ├── App.jsx      # Global state & view controller
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## 🔧 Backend Setup (Node.js)

### 1. Installation
```bash
cd backend
npm install
```

### 2. Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
SF_API_BASE_URL="https://successfactors.com"
SF_COMPANY_ID="SFCPART000474"
SF_MDF_ENTITY="cust_success_mdf"
# API credentials (keep hidden)
SF_USERNAME="your_api_user"
SF_PASSWORD="your_api_password"
```

### 3. Start Server
```bash
npm start
```

---

## 💻 Frontend Setup (React)

### 1. Installation
```bash
cd ../frontend
npm install
```

### 2. Configuration (`.env`)
```env
VITE_API_URL="http://localhost:5000/api"
```

### 3. Start Client
```bash
npm run dev
```

---

## 🔒 Security Compliance
Do not hardcode SuccessFactors credentials inside frontend React files. This structure strictly routes traffic through the backend layer to shield authentication payloads from the end-user browser console.
# success-mdf
