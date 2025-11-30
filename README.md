# Guest Manager

A web application for managing guest stays and integrating with smart home automation systems. Designed for use with 1home to automatically disable automations (like blind control) when guests are present.

![Build Status](https://github.com/Le0nWolf/guest-manager/actions/workflows/docker-build.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)

## Features

- **Guest Status Tracking**: Track when guests arrive and depart
- **Smart Home Integration**: REST API for 1home Lua scripts to query guest presence
- **Mobile-First Design**: Responsive UI optimized for smartphones
- **Dark Mode**: Automatic and manual dark mode support
- **Docker Ready**: Multi-architecture images for Raspberry Pi (ARM64) and x86
- **Zero Dependencies**: Frontend uses only Tailwind CSS via CDN
- **JSON File Storage**: Simple, no-database-required persistence

## Quick Start

### Using Docker Compose (Recommended)

1. Create a `docker-compose.yml`:

```yaml
services:
  guest-manager:
    image: ghcr.io/le0nwolf/guest-manager:latest
    container_name: guest-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/src/data
    environment:
      - NODE_ENV=production
      - TZ=Europe/Berlin
```

2. Start the container:

```bash
docker compose up -d
```

3. Open http://localhost:3000 in your browser

### Using Docker CLI

```bash
docker run -d \
  --name guest-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/src/data \
  -e TZ=Europe/Berlin \
  ghcr.io/le0nwolf/guest-manager:latest
```

## Installation

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher

### Local Development

```bash
# Clone the repository
git clone https://github.com/Le0nWolf/guest-manager.git
cd guest-manager

# Install dependencies
npm install

# Start development server (with hot-reload)
npm run dev

# Or start production server
npm start
```

### Using Docker for Development

```bash
# Build and start with hot-reload
docker compose -f docker-compose.dev.yml up --build
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |
| `TZ` | `Europe/Berlin` | Timezone for date calculations |
| `DATA_PATH` | `./src/data/guests.json` | Path to data file |

## API Documentation

### Base URL

All API endpoints are prefixed with `/api/v1`

### Endpoints

#### GET /api/v1/status

Returns the current guest status. Primary endpoint for smart home integration.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveGuest": true,
    "currentGuest": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Max Mustermann",
      "arrivalDate": "2025-11-27",
      "departureDate": "2025-12-01",
      "isActive": true,
      "status": "active"
    }
  },
  "timestamp": "2025-11-27T21:00:00.000Z"
}
```

#### GET /api/v1/guests

Returns all guests with statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "guests": [...],
    "total": 5,
    "active": 1
  }
}
```

#### GET /api/v1/guests/:id

Returns a single guest by ID.

#### POST /api/v1/guests

Creates a new guest.

**Request:**
```json
{
  "name": "Max Mustermann",
  "arrivalDate": "2025-11-27",
  "departureDate": "2025-12-01"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "guest": {...}
  },
  "message": "Guest created successfully"
}
```

#### PATCH /api/v1/guests/:id

Updates an existing guest.

**Request:**
```json
{
  "departureDate": "2025-11-29"
}
```

#### DELETE /api/v1/guests/:id

Deletes a guest.

#### POST /api/v1/guests/:id/checkout

Quick action: Sets the guest's departure date to today.

**Response:**
```json
{
  "success": true,
  "data": {
    "guest": {...}
  },
  "message": "Guest checked out successfully"
}
```

## 1home Integration

Use this Lua script in your 1home automation to check for guest presence:

```lua
-- 1home Lua Script: Check if guest is present
local url = "http://RASPBERRY-PI-IP:3000/api/v1/status"

local response, statusCode, err = http.get(url, {
    responseBodyType = http.bodyType.JSON,
})

if err or statusCode ~= 200 then
    log.error("Guest API error: %v", err)
    -- Fallback: Continue with automation
else
    if response.data.hasActiveGuest then
        log.info("Guest present until %v - skipping blind automation",
            response.data.currentGuest.departureDate)
        return  -- Stop automation
    end
end

log.info("No guest - continuing with blind automation")
-- Next block: Blind action
```

### Automation Example: Morning Blinds

```lua
-- Morning blind automation with guest check
local guestApiUrl = "http://192.168.1.100:3000/api/v1/status"

-- Check guest status
local response, statusCode, err = http.get(guestApiUrl, {
    responseBodyType = http.bodyType.JSON,
    timeout = 5000  -- 5 second timeout
})

-- Handle API errors gracefully
if err or statusCode ~= 200 then
    log.warning("Could not reach Guest Manager - proceeding with automation")
else
    if response.data.hasActiveGuest then
        local guest = response.data.currentGuest
        log.info("Guest '%s' present until %s - blinds stay closed",
            guest.name or "Unknown",
            guest.departureDate)
        return  -- Exit script, don't open blinds
    end
end

-- No guest - open blinds
log.info("No guest present - opening guest room blinds")
-- Add your blind control action here
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Project Structure

```
guest-manager/
├── src/
│   ├── server.js           # Entry point
│   ├── app.js              # Express app setup
│   ├── config/             # Configuration
│   ├── routes/             # API routes
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── repositories/       # Data access
│   ├── models/             # Data models
│   ├── middleware/         # Express middleware
│   └── utils/              # Utility functions
├── public/                 # Frontend files
│   ├── index.html
│   ├── js/
│   └── css/
├── tests/                  # Test files
│   ├── unit/
│   └── integration/
└── docker-compose.yml
```

### Architecture

The application follows a layered architecture:

1. **Routes** - Define API endpoints
2. **Controllers** - Handle HTTP requests/responses
3. **Services** - Contain business logic
4. **Repositories** - Handle data persistence

This separation allows for easy testing and maintenance.

## Raspberry Pi Deployment

1. Install Docker on your Raspberry Pi:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

2. Create a directory for the application:
```bash
mkdir -p ~/guest-manager
cd ~/guest-manager
```

3. Create `docker-compose.yml` (see Quick Start section)

4. Start the application:
```bash
docker compose up -d
```

5. (Optional) Set up auto-start on boot:
```bash
sudo systemctl enable docker
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs -f guest-manager
```

### Data not persisting

Ensure the data volume is correctly mounted and has proper permissions:
```bash
# Create data directory if it doesn't exist
mkdir -p ./data
chmod 755 ./data
```

### API not reachable from 1home

1. Check if the container is running: `docker compose ps`
2. Verify the port is exposed: `docker compose port guest-manager 3000`
3. Test from the Raspberry Pi: `curl http://localhost:3000/api/v1/status`
4. Check firewall rules allow port 3000

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please ensure:
- Tests pass: `npm test`
- Code follows existing style
- New features include tests

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express](https://expressjs.com/) - Web framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [1home](https://1home.io/) - Smart home integration platform
