# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This repo currently contains only `README.MD` — the described `backend/` and `frontend/` directories have not been created yet. The README is a spec for what to build, not documentation of existing code. When asked to "set up", "scaffold", or "implement" pieces, treat the README as the source of truth for structure, endpoints, and field definitions.

## Architecture

A two-tier app that proxies CRUD against a SuccessFactors Metadata Framework (MDF) custom object:

- **React frontend (Vite)** → calls the local Express backend at `VITE_API_URL` (default `http://localhost:5000/api`). Never calls SuccessFactors directly.
- **Node.js/Express backend** → authenticates to SuccessFactors and proxies CRUD against the OData v2 endpoint `…/odata/v2/cust_success_mdf`. This indirection exists specifically to keep SF credentials out of the browser — do not introduce direct SF calls from the frontend.

The custom MDF object `cust_success_mdf` must be created in the SuccessFactors instance first (see README §"SuccessFactors Configuration") and metadata refreshed via *OData API Metadata Refresh and Export* before the backend can talk to it. `externalCode` is the mandatory primary key used in `('id')` URL segments for update/delete.

### Endpoint mapping (backend → SuccessFactors)

| Express endpoint | Method | SuccessFactors OData target |
| --- | --- | --- |
| `/api/profiles` | `POST` | `…/odata/v2/cust_success_mdf` |
| `/api/profiles` | `GET` | `…/odata/v2/cust_success_mdf?$select=externalCode,cust_Name,cust_Age,cust_Gender` |
| `/api/profiles/:id` | `PUT` | `…/odata/v2/cust_success_mdf('id')` |
| `/api/profiles/:id` | `DELETE` | `…/odata/v2/cust_success_mdf('id')` |

### MDF fields (must match SF object definition exactly)

- `externalCode` — String(128), required — primary key
- `cust_Name` — String(255), required
- `cust_Age` — Number(3), required
- `cust_Gender` — String(50), optional

## Commands

Backend (from `backend/`):
```bash
npm install
npm start          # starts Express on PORT (default 5000)
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev        # starts Vite dev server
```

## Required environment

`backend/.env`:
```
PORT=5000
SF_API_BASE_URL="https://successfactors.com"
SF_COMPANY_ID="SFCPART000474"
SF_MDF_ENTITY="cust_success_mdf"
SF_USERNAME=...
SF_PASSWORD=...
```

`frontend/.env`:
```
VITE_API_URL="http://localhost:5000/api"
```
