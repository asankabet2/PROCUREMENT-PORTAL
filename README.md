# Procurement Management Portal

A modern procurement and tender management platform built with React, TypeScript, and Vite. The application supports both admin and supplier workflows for managing tenders, bids, supplier verification, notifications, and reporting.

## Overview

This project provides a web-based portal for:

- Admin teams to manage tenders, supplier approvals, evaluation criteria, and awards
- Suppliers to browse opportunities, submit bids, upload required documents, and track status
- Real-time document and notification workflows for procurement operations

The app is structured as a front-end client that communicates with a backend API and optionally leverages Supabase for storage and related services.

## Features

### Admin capabilities

- Tender creation, editing, and lifecycle management
- Supplier management and document verification
- Bid review and award tracking
- Evaluation criteria configuration
- Reports, analytics, and dashboard summaries
- User and notification management
- Audit-friendly document and compliance workflows

### Supplier capabilities

- Supplier registration and login
- Browse open tenders
- Submit bids and supporting documentation
- View bid status and tender details
- Upload and renew compliance documents
- Receive notifications and manage supplier profile

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui component patterns
- React Router
- TanStack Query
- Axios
- Supabase client
- Recharts and XLSX for reporting/data handling

## Project Structure

```text
.
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── libs/
│   ├── pages/
│   ├── services/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── components.json
├── eslint.config.js
├── index.html
├── netlify.toml
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

## Prerequisites

Before running the app, make sure you have:

- Node.js 18 or newer
- npm or another package manager
- A working backend API service for procurement data
- Supabase environment values if you are using Supabase features locally

## Environment Variables

Create a `.env.local` file in the root of the project and add the following values:

```env
VITE_API_URL=http://localhost:5001/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Note: The frontend expects a backend API to handle authentication, tender data, bids, suppliers, and document processing.

## Installation

```bash
npm install
```

## Running the App

```bash
npm run dev
```

The app will start in development mode and usually be available at:

```text
http://localhost:5173
```

## Available Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Build the production bundle
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint checks
npm run test      # Run Vitest test suite
npm run test:watch # Watch tests during development
```

## Application Routes

### Public routes

- `/` – landing page
- `/admin/login` – admin sign-in
- `/supplier/login` – supplier sign-in
- `/supplier/register` – supplier registration
- `/reset-password` – password reset flow

### Admin routes

- `/admin/dashboard`
- `/admin/tenders`
- `/admin/tenders/:id`
- `/admin/suppliers`
- `/admin/users`
- `/admin/reports`
- `/admin/settings`
- `/admin/notifications`

### Supplier routes

- `/supplier/dashboard`
- `/supplier/tenders`
- `/supplier/tenders/:id`
- `/supplier/bids`
- `/supplier/profile`
- `/supplier/documents`
- `/supplier/notifications`

## Deployment

This project includes a Netlify configuration and is suitable for deployment as a static frontend application.

## Notes

- The repository contains the frontend client, not the backend API service.
- Secure procurement flows and access control should be enforced by the backend and API configuration.
- For production deployments, ensure environment variables are set correctly and API auth tokens are managed securely.

## License

This project currently does not include a custom license file. If you plan to distribute or deploy it publicly, add an appropriate license before release.

