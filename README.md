# FreeBees Sales CRM

A mobile-friendly Sales Customer Relationship Management (CRM) application developed as part of the FreeBees internship .

The application helps a sales team record customer interactions, track activity status, view dashboard statistics, and manage follow-ups through a responsive interface.


## 🌐 Live Demo

**Live Application:** https://freebees-sales-crm-i1ip.vercel.app/

Explore the deployed FreeBees Sales CRM, built with Next.js, Supabase, and Tailwind CSS.


## Features

- **Dashboard:** View total, pending, completed, and follow-up-required activity counts using database records.
- **Activity management:** Create, view, update the status of, and delete sales activities according to user permissions.
- **Activity types:** Calls, restaurant visits, meetings, and emails.
- **Activity statuses:** Pending, completed, and follow-up required.
- **Customer contacts:** Store and display optional customer phone numbers and email addresses.
- **Search and filtering:** Find activities and filter by status.
- **Authentication:** Sign in and log out using Supabase authentication.
- **Role-based access:** Restrict administrative actions to active team administrators.
- **Input validation:** Validate activity data using Zod.
- **Responsive interface:** Support desktop and mobile layouts.

## Technology Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth and `@supabase/ssr`
- Zod
- lucide-react

## Architecture

The application uses Next.js for both the frontend and backend.

1. The frontend provides the dashboard, activity form, search, filters, and activity history.
2. Next.js Route Handlers expose the backend APIs.
3. Supabase provides authentication and PostgreSQL data storage.
4. Server-side authorization checks validate the session, active team membership, and administrator permissions where required.
5. PostgreSQL Row Level Security (RLS) policies provide an additional layer of database access control.

The database is the source of truth for activity records and dashboard statistics.

## Prerequisites

- Node.js and npm
- A Supabase project
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/KHAIS0212/freebees-sales-crm.git
cd freebees-sales-crm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root using `.env.example` as a reference.

Add your own Supabase project URL and publishable key:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Replace these placeholders with the appropriate values from your Supabase project.

Never commit `.env.local`, database passwords, or Supabase secret/service-role keys to GitHub.

### 4. Configure the database

Configure the Supabase database with the schema and security policies required by this application.

The application expects the following tables:

- `activities` — sales activity records, status, timestamps, and customer contact references.
- `customers` — customer names and contact details.
- `team_members` — team membership, role, and active status.

The database configuration must also include the required Row Level Security policies and helper functions for active team membership and administrator authorization.

Provision authorized team members through a trusted administrative process. Do not allow ordinary users to grant themselves membership or administrator privileges.

Use the project's verified database schema and security configuration when setting up a new Supabase project.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create a production build

```bash
npm run build
```

## API Reference

The application uses Next.js Route Handlers.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/activities` | Retrieve activity records |
| POST | `/api/activities` | Create an activity |
| PATCH | `/api/activities` | Update an activity, including its status |
| DELETE | `/api/activities` | Delete an activity by ID |
| GET | `/api/dashboard/stats` | Retrieve dashboard statistics |
| GET | `/api/auth/session` | Retrieve the current session status and role |
| POST | `/api/auth/logout` | Sign out the current user |

Protected endpoints enforce authentication and active-team membership. Activity updates and deletions require administrator authorization.

The API validates incoming activity data and returns appropriate HTTP status codes for successful requests, invalid input, unauthorized access, forbidden access, and server errors.

## Security

Security measures implemented in the application include:

- Cookie-aware Supabase server-side authentication.
- Session verification.
- Active team membership checks.
- Administrator-only activity updates and deletions.
- Zod validation for activity creation and update operations.
- PostgreSQL Row Level Security policies.
- Restricted database privileges for protected operations.
- Environment variables for project configuration.

These measures reduce unauthorized access risks. Deployment configuration and the complete security posture must be reviewed before the application is used for sensitive business data.

## Project Structure

```text
freebees-sales-crm/
├── app/
│   ├── api/
│   │   ├── activities/
│   │   │   └── route.ts
│   │   ├── auth/
│   │   └── dashboard/
│   │       └── stats/
│   │           └── route.ts
│   ├── login/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase/
├── public/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

This is a high-level overview. Additional files may exist in the actual repository.

## Deployment

Deployment instructions and the live application URL will be added after deployment and verification.

## Project Objective

The objective of this project is to build a small, maintainable sales CRM that demonstrates frontend development, backend API design, database integration, input validation, authentication, authorization, and responsive UI development.

## License

No license has been specified yet.
