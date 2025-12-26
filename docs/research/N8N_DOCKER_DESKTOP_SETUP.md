# n8n Local Installation with Docker Desktop

**Format:** Video Tutorial Transcript
**Presenter:** Jamie, Senior DevRel and Education at n8n
**Topic:** Setting up n8n locally using Docker Desktop

---

## Overview

This tutorial provides a walkthrough for setting up n8n locally using Docker Desktop on various operating systems. The process centers on persistent data storage, achieved by creating a dedicated volume to ensure workflows remain intact after system reboots or software updates.

---

## Prerequisites

### Download Docker Desktop

Go to [docker.com](https://docker.com) and click "Download Docker Desktop"

### Platform Selection

| Platform | Selection |
|----------|-----------|
| **Newer Mac (M series)** | Apple Silicon |
| **Older Mac** | Intel chip |
| **Most Windows machines** | AMD64 |
| **Newer Copilot PCs** | ARM64 |

### Installation Notes

- **Mac:** Mount the disc image and drag to Applications
- **Windows:** Requires admin access; will install WSL 2 if not present
- **All platforms:** Docker needs root/admin access for installation

---

## Setup Steps (Using Docker Desktop GUI)

### Step 1: Create the Data Volume

1. Open Docker Desktop
2. Click on **Volumes**
3. Click **Create Volume**
4. Name it `n8n_data`

**Why create a volume?**
> "The reason why we're creating this volume is that's where we store all of the data for n8n. So if you upgrade the n8n image, restart your computer, or anything like that, then your data will be persistent. All your workflows will be there after a reboot."

---

### Step 2: Pull the n8n Image

1. Click on **Images**
2. Search for "n8n"
3. Click **Pull** to download the image

---

### Step 3: Configure and Run the Container

Click **Run** on the downloaded image, then configure under **Optional Settings**:

#### Basic Settings

| Setting | Value |
|---------|-------|
| **Container Name** | n8n |
| **Host Port** | 5678 |
| **Host Path** | (the volume you created) |
| **Container Path** | `/home/node/.n8n` |

#### Environment Variables

| Variable | Value |
|----------|-------|
| `GENERIC_TIMEZONE` | Europe/Berlin (or your timezone) |
| `TZ` | Europe/Berlin (or your timezone) |
| `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` | true |
| `N8N_RUNNERS_ENABLED` | true |

**Finding your timezone:** Use the [IANA timezone database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

### Step 4: Run the Container

1. Click **Run**
2. Wait a few seconds for configuration
3. Access n8n at `http://localhost:5678`
4. Register and start using n8n locally

---

## Configuration Summary

```
Container Name: n8n
Port: 5678
Volume: n8n_data → /home/node/.n8n

Environment Variables:
  GENERIC_TIMEZONE=Europe/Berlin
  TZ=Europe/Berlin
  N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
  N8N_RUNNERS_ENABLED=true
```

---

## Equivalent Command Line

The Docker Desktop configuration mirrors this command:

```bash
docker volume create n8n_data

docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e GENERIC_TIMEZONE=Europe/Berlin \
  -e TZ=Europe/Berlin \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_RUNNERS_ENABLED=true \
  n8nio/n8n
```

---

## Limitations

| Feature | Local Status |
|---------|--------------|
| **Workflows** | Fully functional |
| **Data persistence** | Works with volume |
| **Webhooks** | Requires tunneling (additional setup) |

> "You will have some limitations such as webhooks not being usable until you create a tunnel."

---

## Key Takeaways

1. **Docker Desktop GUI** can replace command-line installation entirely
2. **Volume creation** is critical for data persistence
3. **Environment variables** configure timezone and permissions
4. **Port 5678** is the default n8n access port
5. **Webhooks** require additional tunneling for local development
