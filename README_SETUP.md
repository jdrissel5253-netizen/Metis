# Metis — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL running locally (or any hosted Postgres)

## 1. Database Setup
Create the database and run the schema:
```sql
CREATE DATABASE metis;
```
Then connect and run:
```
psql -U postgres -d metis -f server/db/schema.sql
```

## 2. Server Setup
```
cd server
cp .env.example .env
# Edit .env: update DATABASE_URL with your postgres credentials
npm install
npm run dev
```
Server runs on http://localhost:5000

## 3. Client Setup
```
cd client
npm install
npm run dev
```
Client runs on http://localhost:5173

## 4. First Use
Open http://localhost:5173, click "Create one" to register your account, then start adding goals, transactions, and habits.

## Deployment (to access from phone)
- Deploy server to Render.com (free tier works)
- Deploy client to Vercel (free)
- Set CLIENT_URL in server .env to your Vercel URL
- Set VITE_API_URL or update vite.config.ts proxy for production
