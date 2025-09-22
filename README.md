# Shared Todo List

A lightweight full-stack todo list designed for couples, families, or small teams who want to share tasks from any device. The project ships with an Express + Sequelize API, a SQLite (or MySQL) database, and a responsive H5 web client that can be deployed to Netlify or any Node.js host.

## Features

- User registration and login with hashed passwords and JWT authentication
- Personal task lists scoped per account so everyone sees only their own todos
- CRUD operations for tasks with completion toggles
- Responsive Bootstrap based UI that works well on phones and desktops
- Netlify ready configuration (serverless function + redirects) for quick public deployment

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Duplicate `.env.example` and rename it to `.env`:

```bash
cp .env.example .env
```

Update the values as needed. By default the project uses a SQLite database stored in `server/data/todolist.sqlite`. For production you can switch to a managed MySQL instance by setting `DB_DIALECT=mysql` and providing the required connection details.

### 3. Initialize the database (optional)

The server automatically creates the SQLite file when it first runs. If you want to reset the schema manually you can use Sequelize directly from a Node REPL or delete the SQLite file.

### 4. (Optional) Seed shared demo accounts

If you want to quickly provision two ready-to-use accounts, run:

```bash
npm run seed:users
```

This creates the following users (skipping any that already exist):

| Username   | Email                    | Password   |
|------------|--------------------------|------------|
| PartnerOne | partner.one@example.com  | TodoList#1 |
| PartnerTwo | partner.two@example.com  | TodoList#2 |

You can override these values by setting the `SEED_USER*_` environment variables listed in `.env.example` before running the command.

### 5. Start the development server

```bash
npm run dev
```

The API and static site are both served from [http://localhost:8000](http://localhost:8000). Open the URL in your browser, register, and begin adding shared tasks.

### 6. Run automated tests

```bash
npm test
```

## Deployment

The repository includes a `netlify.toml` plus a serverless handler in `functions/server.js`, so you can deploy the UI and API together on Netlify:

1. Push the project to your Git provider.
2. Create a new Netlify site linked to the repository.
3. Set the build command to `npm install` (or a custom build step if desired) and publish directory to `public`.
4. Define the environment variables (`JWT_SECRET`, database credentials, etc.). For persistent data you should provide access to a managed MySQL instance.
5. Trigger a deploy. API requests issued from the UI to `/api/*` are automatically proxied to the Netlify Function.

Alternatively, you can deploy the Express server to any Node.js friendly host or container platform. Use the `startServer` helper exported from `server/app.js` when integrating into custom deployment scripts.

## Project Structure

```
.
├── public/               # Static H5 client
├── server/               # Express API + Sequelize models
│   ├── config/           # Database configuration
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Authentication helpers
│   ├── models/           # Sequelize models / mock adapters
│   ├── routes/           # API routes
│   └── services/         # Mock database (serverless fallback)
├── functions/server.js   # Netlify serverless entrypoint
├── tests/                # API & UI tests
└── .env.example          # Environment template
```

## API Overview

All endpoints are prefixed with `/api`.

### Authentication

- `POST /api/auth/register` – create a new account (`username`, `email`, `password`)
- `POST /api/auth/login` – obtain a JWT token (`email`, `password`)

### User profile

Requires the `Authorization: Bearer <token>` header.

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PUT /api/users/password`

### Tasks

All task operations are scoped to the authenticated user.

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

## License

MIT
