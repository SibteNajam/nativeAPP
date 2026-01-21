# 🐳 Docker Deployment Guide

## 📁 Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Instructions to build the Docker image |
| `docker-compose.yml` | Configuration to run the container |
| `.dockerignore` | Files to exclude from Docker build |

---

## 🚀 Quick Start Commands

### First Time Setup

```bash
# Navigate to backend directory
cd backend_layer

# Build and start the container
docker-compose up -d --build
```

### View Logs

```bash
# Follow logs in real-time
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

### Stop the Container

```bash
# Stop and remove container
docker-compose down

# Stop but keep container (faster restart)
docker-compose stop
```

---

## 📋 Complete Command Reference

### 🔨 BUILD Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `docker-compose build` | Build image only | When you want to pre-build |
| `docker-compose build --no-cache` | Build from scratch | When dependencies change |
| `docker-compose up --build` | Build + Start | First time or code changes |

### ▶️ START Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `docker-compose up` | Start (with logs) | For debugging |
| `docker-compose up -d` | Start (background) | Normal operation |
| `docker-compose up -d --build` | Rebuild + Start | After code changes |

### ⏹️ STOP Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `docker-compose stop` | Stop container (keep data) | Temporary pause |
| `docker-compose down` | Stop + Remove container | Clean stop |
| `docker-compose down -v` | Stop + Remove + Volumes | Full cleanup |

### 📊 STATUS Commands

| Command | Purpose |
|---------|---------|
| `docker-compose ps` | Show running containers |
| `docker-compose logs` | View all logs |
| `docker-compose logs -f` | Follow logs (real-time) |
| `docker-compose logs --tail=50` | Last 50 log lines |

### 🔧 MAINTENANCE Commands

| Command | Purpose |
|---------|---------|
| `docker-compose restart` | Restart container |
| `docker-compose exec backend sh` | Enter container shell |
| `docker system prune` | Clean unused Docker data |

---

## 🔄 Deployment Workflow

### Initial Deployment (First Time)

```bash
# 1. Make sure .env file exists with all required variables
cat .env

# 2. Build and start
docker-compose up -d --build

# 3. Check it's running
docker-compose ps

# 4. View logs to verify
docker-compose logs -f
```

### After Code Changes

```bash
# 1. Rebuild and restart (one command)
docker-compose up -d --build

# 2. Check logs for any errors
docker-compose logs -f --tail=50
```

### After .env Changes Only

```bash
# No rebuild needed, just restart
docker-compose down
docker-compose up -d
```

### After package.json Changes

```bash
# Full rebuild required (dependencies changed)
docker-compose build --no-cache
docker-compose up -d
```

---

## 🌐 Access Points

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | `http://localhost:3001` | Main API |
| Swagger Docs | `http://localhost:3001/api` | API Documentation |
| Health Check | `http://localhost:3001/health` | Health endpoint |

**On Remote Server:**
Replace `localhost` with your server IP (e.g., `http://57.128.242.183:3001`)

---

## ⚙️ Environment Variables

Your `.env` file should contain:

```env
# Server
PORT=3000

# Database
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=your-db
DATABASE_USER=your-user
DATABASE_PASSWORD=your-password

# Binance (if using env credentials)
BINANCE_API_KEY=your-key
BINANCE_SECRET_KEY=your-secret

# Bitget (if using env credentials)
BITGET_API_KEY=your-key
BITGET_SECRET_KEY=your-secret
BITGET_PASSPHRASE=your-passphrase

# JWT
JWT_SECRET=your-jwt-secret

# Encryption
ENCRYPTION_KEY=your-32-char-key
```

---

## 🔍 Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker-compose logs

# Check container status
docker-compose ps -a
```

### Port already in use

```bash
# Change port in docker-compose.yml
ports:
  - "3002:3000"  # Use 3002 instead of 3001
```

### Database connection issues

```bash
# Enter container to debug
docker-compose exec backend sh

# Test database connection from inside
nc -zv your-db-host 5432
```

### Clear everything and start fresh

```bash
# Nuclear option - removes everything
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

---

## 📊 Production Tips

### 1. Use specific image tags

In `docker-compose.yml`, add version tag:
```yaml
image: crypto-trader-backend:v1.0.0
```

### 2. Set resource limits

Uncomment the `deploy` section in `docker-compose.yml` to limit CPU/memory.

### 3. Enable log rotation

Already configured in `docker-compose.yml` with max 3 files of 10MB each.

### 4. Use health checks

Already configured - Docker will restart unhealthy containers.

---

## 🆚 Docker Commands Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE LIFECYCLE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [Code Changes]                                             │
│        ↓                                                     │
│   docker-compose up -d --build      ← Rebuild & Start        │
│        ↓                                                     │
│   docker-compose logs -f            ← Monitor Logs           │
│        ↓                                                     │
│   docker-compose ps                 ← Check Status           │
│        ↓                                                     │
│   [Running in Production]                                    │
│        ↓                                                     │
│   docker-compose down               ← Stop when needed       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Before Deployment

- [ ] `.env` file exists with all required variables
- [ ] Database is accessible from Docker container
- [ ] Required ports are open (3001)
- [ ] Docker and Docker Compose are installed
- [ ] Sufficient disk space for image (~500MB)
