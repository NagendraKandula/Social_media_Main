# 📱 Social Media Management Tool

This project is a full-stack application built with NestJS and Next.js designed for managing, scheduling, and analyzing social media content across platforms like Facebook, Instagram, Twitter, and YouTube.

---

## 🚀 Features

- 📅 Schedule and manage posts  
- 🔐 Secure authentication system  
- 📊 Analytics and performance tracking  
- 🔄 Background job handling  
- 🌐 Multi-platform support  

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- Node.js (v18.x or higher)  
- Neon Serverless PostgreSQL (cloud database)  
- Redis (for caching & background tasks)  
- npm or yarn (package manager)  

---

## ⚙️ Installation and Setup

### 🔧 Backend Setup

```bash
cd Backend
npm install
```

### 🎨 Frontend Setup

```bash
cd frontend
npm install
```

---

## 🗄️ Database & Services Setup

- Make sure Redis is running locally  
- Setup Neon database and copy connection string  

### Run Prisma Migrations

```bash
npx prisma migrate dev
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## 🔐 Environment Variables

Create separate `.env` files in both Backend and frontend directories.

### Backend `.env`

```env
DATABASE_URL=your_neon_database_connection_string
JWT_SECRET=your_secret_key
REDIS_HOST=localhost
REDIS_PORT=6379

# Social Media APIs
FACEBOOK_API_KEY=your_key
INSTAGRAM_API_KEY=your_key
TWITTER_API_KEY=your_key
YOUTUBE_API_KEY=your_key
```

### Frontend `.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

⚠️ Never commit `.env` files to GitHub.

---

## ▶️ Running the Project

### Start Backend

```bash
cd Backend
npm run start:dev
```

### Start Frontend

```bash
cd frontend
npm run dev
```

---

## 🔄 Workflow

1. Setup Neon database  
2. Start Redis locally  
3. Run Prisma migrations  
4. Generate Prisma client  
5. Start backend  
6. Start frontend  

---

## 📦 Tech Stack

- Backend: NestJS, Prisma  
- Frontend: Next.js, React  
- Database: Neon Serverless PostgreSQL  
- Caching: Redis  

---

## 👨‍💻 Author


