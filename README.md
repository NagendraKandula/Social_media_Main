<div align="center">

# 🚀 SocialFlow

### Social Media Management Platform

**Create once. Schedule everywhere. Grow smarter.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](#-license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](#-contributing)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red?style=flat-square)](#-author)

</div>

---

SocialFlow is a full-stack social media management platform built to simplify how creators, teams, and businesses **create, schedule, publish, and analyze content across multiple social platforms** from a single workspace.

Instead of managing every platform separately, SocialFlow brings the entire publishing workflow into one place — from content creation and media editing to scheduling, background processing, and performance tracking.

<br>

## 📖 Table of Contents

- [What is SocialFlow?](#-what-is-socialflow)
- [Key Features](#-key-features)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Database Setup](#️-database-setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#️-running-the-application)
- [Publishing Workflow](#-publishing-workflow)
- [Project Structure](#-project-structure)
- [Engineering Highlights](#-engineering-highlights)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [Author](#-author)

<br>

## ✨ What is SocialFlow?

Managing multiple social media accounts can quickly become repetitive and time-consuming.

SocialFlow solves this by providing a centralized platform where users can:

| | |
|---|---|
| 📝 | Create and manage social media content |
| 🖼️ | Upload and edit images before publishing |
| ✂️ | Crop and customize media for different platforms |
| 📅 | Schedule posts for future publication |
| 🌐 | Publish content across multiple social platforms |
| ⚙️ | Process scheduled posts using background workers |
| 📊 | Track content performance and analytics |
| 🔐 | Securely manage connected social accounts |

The platform is designed with a **scalable backend architecture** so scheduled publishing and heavy processing do not block normal API requests.

<br>

## 🌟 Key Features

### 📅 Smart Post Scheduling
Schedule content for a specific date and time instead of manually publishing every post.

### 🌐 Multi-Platform Publishing
Manage content for multiple platforms from a single workflow. Currently supporting:

<div align="center">

![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=flat-square&logo=facebook&logoColor=white)
![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat-square&logo=instagram&logoColor=white)
![Threads](https://img.shields.io/badge/Threads-000000?style=flat-square&logo=threads&logoColor=white)
![X](https://img.shields.io/badge/X%20%2F%20Twitter-000000?style=flat-square&logo=x&logoColor=white)
![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)
![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat-square&logo=youtube&logoColor=white)

</div>

### 🖼️ Media Editing
Customize uploaded media before publishing:
- Image cropping
- Platform-specific media variants
- Image processing
- Media validation
- Optimized media storage

### ⚙️ Background Job Processing
Scheduled publishing is handled asynchronously using background workers:

```text
User
 │
 ▼
Next.js Frontend
 │
 ▼
NestJS API
 │
 ├── PostgreSQL
 ├── Redis
 │
 ▼
Job Queue
 │
 ├── Render Worker
 │
 ▼
Platform-specific Variant
 │
 ▼
Posting Worker
 │
 ├── Facebook
 ├── Instagram
 ├── Threads
 ├── X / Twitter
 ├── LinkedIn
 └── YouTube
```

This architecture allows long-running tasks such as media processing and social-media publishing to execute independently from the main API.

### 🔐 Authentication & Security
- Secure authentication
- JWT-based authorization
- Protected API routes
- Cookie-based session handling
- Environment-based configuration

### 📊 Analytics
Track social media content and performance through analytics and reporting features.

<br>

## 🏗️ Architecture

```text
                 ┌─────────────────────┐
                 │     Next.js App     │
                 │      Frontend       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      NestJS API     │
                 │       Backend       │
                 └──────┬───────┬──────┘
                        │       │
              ┌─────────┘       └─────────┐
              ▼                           ▼
      ┌──────────────┐             ┌──────────────┐
      │ PostgreSQL   │             │    Redis     │
      │   Database   │             │ Cache/Queue  │
      └──────────────┘             └──────┬───────┘
                                         │
                                         ▼
                               ┌──────────────────┐
                               │ Background       │
                               │ Workers          │
                               └────────┬─────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                  Render Worker                  Posting Worker
                         │                             │
                         ▼                             ▼
                  Media Variants                Social Platforms
```

<br>

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="33%">

**Frontend**
- Next.js
- React
- TypeScript
- Axios

</td>
<td valign="top" width="33%">

**Backend**
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL

</td>
<td valign="top" width="33%">

**Infrastructure**
- Redis
- Bull / Job Queues
- Docker
- AWS S3 / Cloud Storage

</td>
</tr>
</table>

**Deployment**

| Layer | Platform |
|---|---|
| Frontend | Vercel |
| Backend & Workers | Render |
| PostgreSQL | Neon |

<br>

## 📋 Prerequisites

Before running the project, make sure you have:

- Node.js **18+**
- npm or yarn
- PostgreSQL / Neon PostgreSQL
- Redis
- Git

<br>

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SocialFlow
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

<br>

## 🗄️ Database Setup

Configure your PostgreSQL/Neon database and add the connection string to your backend environment variables.

Run Prisma migrations:

```bash
npx prisma migrate dev
```

Generate the Prisma client:

```bash
npx prisma generate
```

<br>

## 🔐 Environment Variables

Create a `.env` file inside the **Backend** directory:

```env
DATABASE_URL=your_neon_database_connection_string

JWT_SECRET=your_secret_key

REDIS_HOST=localhost
REDIS_PORT=6379

# Social Platform Credentials
FACEBOOK_API_KEY=your_key
INSTAGRAM_API_KEY=your_key
TWITTER_API_KEY=your_key
YOUTUBE_API_KEY=your_key
```

Create another `.env` file inside the **frontend** directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> ⚠️ **Never commit `.env` files or API credentials to GitHub.**

<br>

## ▶️ Running the Application

**Start Redis** — make sure Redis is running locally.

**Start Backend**

```bash
cd Backend
npm run start:dev
```

**Start Frontend**

```bash
cd frontend
npm run dev
```

The application will then be available through your local development environment.

<br>

## 🔄 Publishing Workflow

The core scheduling workflow works like this:

```text
Create Post
     │
     ▼
Select Platforms
     │
     ▼
Upload Media
     │
     ▼
Edit / Crop Media
     │
     ▼
Schedule Post
     │
     ▼
Post Stored in Database
     │
     ▼
Scheduler Detects Due Post
     │
     ▼
Render Queue
     │
     ▼
Platform-specific Media Variants
     │
     ▼
Posting Queue
     │
     ▼
Publish to Social Platforms
     │
     ▼
Store Publishing Result
```

This separates **post scheduling, media rendering, and publishing** into independent stages.

<br>

## 📂 Project Structure

```text
SocialFlow/
│
├── Backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── posting/
│   │   ├── facebook/
│   │   ├── instagram/
│   │   ├── twitter/
│   │   ├── threads/
│   │   ├── linkedin/
│   │   ├── youtube/
│   │   ├── ai-assistant/
│   │   └── ...
│   │
│   ├── prisma/
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   └── package.json
│
└── README.md
```

<br>

## 🧠 Engineering Highlights

SocialFlow was designed with production-oriented backend concepts rather than treating social publishing as a simple API request.

**⚡ Asynchronous Processing**
Media rendering and social publishing are handled through background queues.

**🔁 Reliable Job Pipeline**

```text
Scheduler
   ↓
Render Queue
   ↓
Media Processing
   ↓
Variant Storage
   ↓
Posting Queue
   ↓
Social API
```

**🗃️ Database-driven State**
Post, media, platform, edit, variant, and publishing states are persisted so the system can track the lifecycle of scheduled content.

**🖼️ Platform-specific Media**
Instead of blindly sending the original uploaded file to every platform, SocialFlow can generate platform-specific media variants based on editing and publishing requirements.

<br>

## 🔮 Future Improvements

- 📈 Advanced analytics dashboards
- 🤖 AI-powered content generation
- 📊 Cross-platform performance comparison
- 🔁 Automatic retry strategies
- 🧵 Better campaign management
- 👥 Team collaboration
- 🔔 Publishing notifications
- 🧠 AI-based posting recommendations
- 📱 Mobile application

<br>


</div>