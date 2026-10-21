# FreeBees Sales CRM

A mobile-friendly Sales Customer Relationship Management (CRM) application developed as part of the FreeBees internship.

The application helps sales teams record customer interactions, track activity statuses, view dashboard statistics, manage customer branches, and handle follow-ups through a responsive interface.

## 🌐 Live Demo

**Live Application:** [FreeBees Sales CRM](https://freebees-sales-crm-i1ip.vercel.app/)

Explore the deployed application, built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Dashboard:** View total, pending, completed, and follow-up-required activity counts using database records.
- **Activity management:** Create, view, update, filter, and delete sales activities according to user permissions.
- **Activity types:** Calls, restaurant visits, meetings, and emails.
- **Activity statuses:** Pending, completed, and follow-up required.
- **Customer and branch management:** Organize customers under brands and manage branch details.
- **Customer contacts:** Store and display optional customer phone numbers and email addresses.
- **Search and filtering:** Search activity history and filter records by relevant criteria.
- **Authentication:** Sign in and log out using Supabase Authentication.
- **Role-based access:** Restrict administrative operations to active team administrators.
- **Team management:** Manage team members, roles, and active status.
- **Input validation:** Validate incoming activity data using Zod.
- **Responsive interface:** Support desktop and mobile layouts.
- **Dashboard trends:** View activity trends over selectable time periods.

## Technology Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- `@supabase/ssr`
- `@supabase/supabase-js`
- Zod
- `lucide-react`

## Architecture

The application uses Next.js for both the frontend and backend.

1. The frontend provides the dashboard, activity forms, search, filters, activity history, and team-management interface.
2. Next.js Route Handlers expose backend APIs.
3. Supabase provides authentication and PostgreSQL data storage.
4. Server-side authorization checks validate the authenticated session, active team membership, and administrator permissions where required.
5. PostgreSQL Row Level Security (RLS) policies provide an additional layer of database access control.
6. Dashboard summary and trend data are fetched through separate endpoints, so changing the chart's date range does not require refetching the dashboard summary.

The database is the source of truth for activity records and dashboard statistics.

## Prerequisites

- Node.js and npm
- Git
- A Supabase account
- A Supabase project for the backend

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

Create a `.env.local` file in the project root, using `.env.example` as the reference.

Configure the Supabase project URL and publishable key required by the application. If the server-side service-role client is used, configure its required secret key as specified by the server-side configuration.

Never commit `.env.local`, database passwords, or Supabase secret/service-role keys to GitHub. Privileged keys must remain server-side and must never be exposed through client-side code or `NEXT_PUBLIC_` environment variables.

### 4. Set up the database

For a **new Supabase project**, use `supabase/setup.sql` as the single database installation script.

1. Create a new Supabase project.
2. Open **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/setup.sql` from the repository.
4. Copy the entire SQL script into a new SQL Editor query.
5. Execute the script against the fresh project's application database.
6. Verify that the required tables, functions, indexes, permissions, and RLS policies were created successfully.

The script is intended for a fresh project. Do not run it against an existing database containing application data or schema objects.

The database setup includes these application tables:

- `activities` — activity records, statuses, timestamps, and customer contact references.
- `customer_brands` — customer brand records.
- `customers` — customer and branch details, including contact information and brand relationships.
- `team_members` — team membership, role, and active status.

The script also defines the required database functions, constraints, indexes, grants, and RLS policies.

**Important:** `supabase/setup.sql` is the documented, one-time installation entry point for a new project. Do not run additional migration files as part of this installation procedure.

Before using a newly configured database, verify its effective permissions and test both authentication and authorization behavior. Successful SQL execution alone does not establish that every security requirement has been satisfied.

### 5. Create the first administrator

The initial administrator must be provisioned through a trusted administrative process.

1. Create the initial user through Supabase Authentication.
2. Obtain that user's actual Auth UUID.
3. Insert a corresponding record into `public.team_members` with the correct `user_id`, `role = 'admin'`, and `is_active = true`.
4. Verify that the user can sign in and access administrator features.

Use the actual UUID of the newly created Auth user. Do not allow ordinary users to grant themselves team membership or administrator privileges.

Perform initial provisioning through a trusted administrative process with the necessary database permissions. Do not expose the service-role key in the browser.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Run validation checks

Run the configured lint and production-build checks:

```bash
npm run lint
npm run build
```

Both commands should complete successfully before changes are committed or deployed.

## API Reference

The application uses Next.js Route Handlers.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/activities` | Retrieve and filter activity records |
| `POST` | `/api/activities` | Create an activity |
| `PATCH` | `/api/activities` | Update an activity |
| `DELETE` | `/api/activities` | Delete an activity |
| `GET` | `/api/dashboard/summary` | Retrieve dashboard statistics and latest activities |
| `GET` | `/api/dashboard/trend` | Retrieve activity chart data for a selected date range |
| `GET` | `/api/auth/session` | Retrieve session status and role |
| `POST` | `/api/auth/logout` | Sign out the current user |

Additional endpoints support customer search and team-member management.

Protected endpoints enforce the relevant authentication, active-membership, and administrator requirements. The application validates incoming data and returns appropriate HTTP status codes for successful requests, invalid input, unauthorized access, forbidden access, and server errors.

## Security

Security measures implemented in the application include:

- Cookie-aware Supabase server-side authentication.
- Session verification.
- Active team-membership checks.
- Administrator authorization for protected operations.
- Zod validation for activity creation and update operations.
- PostgreSQL Row Level Security policies.
- Restricted client-side database privileges for protected operations.
- Server-side handling of privileged Supabase operations.
- Environment variables for project configuration.

These measures help reduce unauthorized access risks. Deployment configuration and the complete security posture should be reviewed before the application is used for sensitive business data.

## Project Structure

The following is a high-level overview of the application architecture, not an exhaustive listing of every file.

```text
freebees-sales-crm/
├── app/
│   ├── (workspace)/
│   │   ├── activities/
│   │   ├── team/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── activities/
│   │   │   └── route.ts
│   │   ├── auth/
│   │   │   ├── session/
│   │   │   └── logout/
│   │   ├── customers/
│   │   ├── dashboard/
│   │   │   ├── summary/
│   │   │   └── trend/
│   │   └── team-members/
│   ├── login/
│   ├── globals.css
│   └── layout.tsx
├── components/
├── features/
├── lib/
│   ├── activities/
│   ├── api/
│   ├── supabase/
│   └── utils/
├── public/
├── supabase/
│   ├── config.toml
│   └── setup.sql
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Deployment

The application is deployed on Vercel:

[FreeBees Sales CRM — Live Application](https://freebees-sales-crm-i1ip.vercel.app/)

Production deployment requires the appropriate environment variables to be configured in Vercel and the connected Supabase project to have the expected database schema, functions, permissions, and security policies.

## Project Objective

The objective of this project is to build a maintainable sales CRM that demonstrates frontend development, backend API design, database integration, input validation, authentication, authorization, resource-conscious database access, and responsive UI development.

## License

No license has been specified yet.
