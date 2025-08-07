# Voice Sales Trainer

An AI-powered voice sales training platform that helps sales professionals practice their conversations, get real-time feedback, and track their progress.

## Features

- 🎯 **Interactive Training Scenarios**: Practice cold calling, objection handling, discovery questions, and closing techniques
- 🎙️ **Voice Recognition**: Real-time voice processing with AI-powered feedback
- 📊 **Analytics Dashboard**: Track progress, scores, and improvement trends
- 🤖 **AI Coaching**: Intelligent feedback powered by Claude AI and ElevenLabs voice synthesis
- 👥 **Role-Based Access**: Support for trainees, trainers, and managers
- 🔒 **Secure Authentication**: JWT-based authentication with user management

## Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: FastAPI with Python 3.11+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Cache**: Redis for session storage
- **AI Integration**: Claude API for coaching intelligence
- **Voice Processing**: ElevenLabs for text-to-speech and voice analysis

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+ (or use Docker)
- Redis (or use Docker)

### Option 1: Docker Development (Recommended)

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd voice-sales-trainer
   cp .env.example .env
   ```

2. **Start all services**:
   ```bash
   npm run docker:up
   ```

3. **Initialize database**:
   ```bash
   npm run setup:docker
   ```

4. **View logs**:
   ```bash
   npm run docker:logs
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Option 2: Manual Development Setup

1. **Clone and setup environment**:
   ```bash
   git clone <repository-url>
   cd voice-sales-trainer
   cp .env.example .env
   npm run setup
   ```

2. **Start PostgreSQL and Redis** (using Docker):
   ```bash
   docker run -d --name voice-trainer-db -p 5432:5432 -e POSTGRES_DB=voice_sales_trainer -e POSTGRES_USER=voice_trainer -e POSTGRES_PASSWORD=voice_trainer_pass postgres:15-alpine
   docker run -d --name voice-trainer-redis -p 6379:6379 redis:7-alpine
   ```

3. **Initialize database**:
   ```bash
   npm run backend:migrate
   ```

4. **Start development servers**:
   ```bash
   npm run full-stack:dev
   ```

## Development Scripts

### Full Stack Development
```bash
npm run dev                 # Start frontend only
npm run backend:dev         # Start backend only
npm run full-stack:dev      # Start both frontend and backend
```

### Docker Commands
```bash
npm run docker:up           # Start all services
npm run docker:down         # Stop all services
npm run docker:build        # Rebuild images
npm run docker:logs         # View all logs
npm run docker:clean        # Clean up everything
```

### Database Management
```bash
npm run backend:migrate     # Run database migrations
npm run db:reset           # Reset database (Docker only)
```

### Testing
```bash
npm run backend:test       # Run backend tests
npm run integration:test   # Run integration tests
npm run health:check       # Check service health
```

### Code Quality
```bash
npm run lint              # Lint frontend code
npm run type-check        # TypeScript type checking
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required Settings
```env
# Database
DATABASE_URL=postgresql://voice_trainer:voice_trainer_pass@localhost:5432/voice_sales_trainer

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Optional AI Features
```env
# ElevenLabs Voice API (for voice synthesis)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_ENABLED=true

# Claude AI (for coaching intelligence)
CLAUDE_API_KEY=your-claude-api-key
NEXT_PUBLIC_CLAUDE_ENABLED=true
```

### Feature Flags

Control which features are enabled:
- `NEXT_PUBLIC_ELEVENLABS_ENABLED`: Enable voice synthesis
- `NEXT_PUBLIC_CLAUDE_ENABLED`: Enable AI coaching
- Voice recording and playback work without external APIs

## API Documentation

When the backend is running, visit:
- Interactive API docs: http://localhost:8000/docs
- ReDoc documentation: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

### Key Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/token` - User login
- `GET /auth/me` - Get current user
- `GET /scenarios` - List training scenarios
- `POST /sessions` - Create training session
- `GET /sessions/analytics` - Get user analytics

## Database Schema

### Core Models

- **Users**: Authentication and profile data
- **Training Scenarios**: Conversation templates and objectives
- **Training Sessions**: Voice session records and scoring
- **Messages**: Conversation history

### Sample Data

The system includes default training scenarios:
- Cold Outreach Introduction (Beginner)
- Price Objection Handling (Intermediate)
- Discovery Questions Mastery (Beginner)
- Closing with Urgency (Advanced)

## Testing

### Integration Tests

Run comprehensive integration tests:
```bash
npm run integration:test
```

Tests cover:
- Service health checks
- User registration and authentication
- Scenario loading
- Session creation
- Analytics retrieval
- Database connectivity

### Manual Testing

1. **Register a new user**: http://localhost:3000
2. **Browse scenarios**: Select from available training scenarios
3. **Start voice training**: Record your sales conversation
4. **View analytics**: Check your progress and scores

## Production Deployment

### Environment Setup

1. **Generate secure secrets**:
   ```bash
   openssl rand -hex 32  # Use for JWT_SECRET_KEY
   ```

2. **Update environment**:
   ```env
   DEBUG=false
   ENVIRONMENT=production
   FRONTEND_URL=https://your-domain.com
   DATABASE_URL=postgresql://user:pass@prod-db:5432/voice_sales_trainer
   ```

3. **Enable HTTPS and CORS**:
   Update `backend/main.py` with production origins

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production config
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check PostgreSQL is running: `docker ps`
   - Verify DATABASE_URL in .env
   - Run: `npm run db:reset`

2. **Frontend won't connect to backend**:
   - Verify NEXT_PUBLIC_API_URL in .env
   - Check backend is running: `curl http://localhost:8000/health`

3. **Voice features not working**:
   - Check browser microphone permissions
   - Verify ELEVENLABS_API_KEY if using voice synthesis
   - Voice recording works without external APIs

4. **Integration tests failing**:
   - Ensure all services are running
   - Check service health: `npm run health:check`
   - View logs: `npm run docker:logs`

### Debug Mode

Enable debug logging:
```env
DEBUG=true
DATABASE_ECHO=true
```

### Reset Everything

```bash
npm run docker:clean    # Remove all containers and volumes
npm run setup:docker    # Restart and reinitialize
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm run integration:test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please:
1. Check this README
2. Review the API documentation at `/docs`
3. Run integration tests to identify issues
4. Check Docker logs for error details

---

**Built with ❤️ for sales professionals who want to improve their conversation skills**