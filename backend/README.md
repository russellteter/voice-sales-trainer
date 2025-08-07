# Voice Sales Trainer - Backend API

FastAPI backend for the AI-powered voice sales training platform.

## Features

- JWT-based authentication and authorization
- Training scenario management
- Voice training session tracking
- User profile and progress management
- RESTful API with automatic documentation
- SQLAlchemy ORM with PostgreSQL/SQLite support
- Comprehensive data validation with Pydantic

## Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run Database Migrations**
   ```bash
   # The app will create tables automatically on startup
   # For production, use Alembic migrations
   ```

4. **Start the Server**
   ```bash
   python run.py
   ```

   Or with uvicorn directly:
   ```bash
   uvicorn main:app --reload
   ```

5. **Access the API**
   - API Documentation: http://localhost:8000/docs
   - ReDoc Documentation: http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `PUT /auth/me` - Update user profile
- `POST /auth/change-password` - Change password

### Scenarios
- `GET /scenarios` - List training scenarios (with filtering)
- `GET /scenarios/{id}` - Get specific scenario
- `GET /scenarios/featured` - Get featured scenarios
- `GET /scenarios/recommendations` - Get personalized recommendations
- `POST /scenarios` - Create scenario (admin/trainer)
- `PUT /scenarios/{id}` - Update scenario (admin/trainer)

### Sessions
- `POST /sessions` - Create training session
- `GET /sessions` - List user sessions
- `GET /sessions/{id}` - Get session details
- `PUT /sessions/{id}` - Update session
- `POST /sessions/{id}/complete` - Complete session
- `GET /sessions/stats/overview` - Get user session statistics

## Development

### Project Structure
```
backend/
├── api/           # API route handlers
├── config/        # Configuration and database setup
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic services
├── main.py        # FastAPI application
├── run.py         # Development startup script
└── requirements.txt
```

### Environment Variables
Key environment variables (see `.env.example`):
- `DATABASE_URL` - Database connection string
- `JWT_SECRET_KEY` - JWT signing key
- `DEBUG` - Enable debug mode
- `FRONTEND_URL` - Frontend URL for CORS

### Database Models
- **User** - User accounts and profiles
- **TrainingScenario** - Training scenarios with metadata
- **TrainingSession** - Voice training sessions and conversations

### Authentication
- JWT tokens for authentication
- Role-based access control (Admin, Trainer, Trainee, Manager)
- Password hashing with bcrypt

## Production Deployment

1. Set environment variables for production
2. Use PostgreSQL database
3. Configure proper CORS origins
4. Use gunicorn or similar WSGI server
5. Set up database migrations with Alembic
6. Configure logging and monitoring

```bash
# Production start example
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## API Documentation

The API includes comprehensive OpenAPI documentation available at `/docs` when running the server.

All endpoints include:
- Request/response schemas
- Authentication requirements
- Error responses
- Example requests

## Testing

Run tests with pytest:
```bash
pytest
```

## Contributing

1. Follow FastAPI best practices
2. Use type hints throughout
3. Validate input with Pydantic schemas  
4. Handle errors appropriately
5. Document new endpoints