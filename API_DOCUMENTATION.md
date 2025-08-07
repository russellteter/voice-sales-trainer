# Voice Sales Trainer API Documentation

## Overview

The Voice Sales Trainer API provides comprehensive endpoints for managing voice-based sales training sessions, user authentication, scenario management, and learning analytics. The API is built with FastAPI and supports both REST endpoints and WebSocket connections for real-time voice interactions.

**Base URL**: `https://api.your-domain.com/api/v1`

## Authentication

### Bearer Token Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Lifecycle

- **Expires In**: 8 hours (configurable)
- **Refresh**: Use the `/auth/refresh` endpoint
- **Logout**: Client-side token disposal (server-side blacklisting optional)

## API Endpoints

### Authentication (`/auth`)

#### POST `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "company": "Acme Corp",
  "role": "user"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company": "Acme Corp",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-01-15T10:30:00Z"
  }
}
```

#### POST `/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company": "Acme Corp",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-01-15T10:30:00Z"
  }
}
```

#### GET `/auth/me`

Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company": "Acme Corp",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-15T10:30:00Z"
}
```

#### PUT `/auth/me`

Update current user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "first_name": "Johnny",
  "last_name": "Smith",
  "company": "New Company Inc"
}
```

**Response (200):** Updated user object

#### POST `/auth/change-password`

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "current_password": "oldPassword123",
  "new_password": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

#### POST `/auth/refresh`

Refresh JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** New token object (same structure as login)

#### POST `/auth/logout`

Logout user (client should discard token).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### Scenarios (`/scenarios`)

#### GET `/scenarios`

Get list of available training scenarios.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `skip` (int, optional): Number of records to skip (default: 0)
- `limit` (int, optional): Maximum records to return (default: 50)
- `category` (string, optional): Filter by scenario category
- `difficulty` (string, optional): Filter by difficulty level

**Response (200):**
```json
[
  {
    "id": 1,
    "title": "Cold Call - Technology Prospect",
    "description": "Practice cold calling a technology company decision maker",
    "category": "cold_calling",
    "difficulty": "intermediate",
    "estimated_duration": 900,
    "objectives": [
      "Build rapport with gatekeeper",
      "Identify decision maker",
      "Present value proposition"
    ],
    "coaching_points": [
      "Use active listening techniques",
      "Handle objections confidently",
      "Close for next meeting"
    ],
    "is_active": true,
    "created_at": "2024-01-10T14:20:00Z"
  }
]
```

#### GET `/scenarios/{scenario_id}`

Get specific scenario details.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `scenario_id` (int): Scenario ID

**Response (200):** Single scenario object

#### POST `/scenarios`

Create a new training scenario (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Enterprise Sales Discovery Call",
  "description": "Advanced discovery call with enterprise client",
  "category": "discovery",
  "difficulty": "advanced",
  "estimated_duration": 1200,
  "objectives": [
    "Uncover business challenges",
    "Identify budget parameters",
    "Map decision-making process"
  ],
  "coaching_points": [
    "Ask open-ended questions",
    "Listen for emotional triggers",
    "Qualify thoroughly"
  ],
  "prospect_persona": {
    "name": "Sarah Johnson",
    "title": "VP of Operations",
    "company": "Enterprise Solutions Inc",
    "pain_points": ["Process inefficiency", "Cost reduction pressure"],
    "personality": "analytical",
    "communication_style": "direct"
  },
  "conversation_flow": {
    "opening": "Thank you for taking the time to meet with me today...",
    "discovery_questions": [
      "What are your biggest operational challenges?",
      "How are you currently handling X process?"
    ],
    "objection_scenarios": [
      "We're happy with our current solution",
      "Budget is tight this year"
    ]
  }
}
```

**Response (201):** Created scenario object

### Sessions (`/sessions`)

#### POST `/sessions`

Create a new training session.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "scenario_id": 1,
  "session_type": "practice",
  "configuration": {
    "coaching_enabled": true,
    "difficulty_level": "intermediate",
    "max_duration": 1800,
    "voice_id": "professional_female"
  }
}
```

**Response (201):**
```json
{
  "id": "session_123456",
  "scenario_id": 1,
  "user_id": 1,
  "session_type": "practice",
  "status": "created",
  "configuration": {
    "coaching_enabled": true,
    "difficulty_level": "intermediate",
    "max_duration": 1800,
    "voice_id": "professional_female"
  },
  "created_at": "2024-01-15T11:00:00Z",
  "websocket_url": "wss://api.your-domain.com/ws/voice/session_123456"
}
```

#### GET `/sessions`

Get user's training sessions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `skip` (int, optional): Number of records to skip
- `limit` (int, optional): Maximum records to return
- `status` (string, optional): Filter by session status

**Response (200):** Array of session objects

#### GET `/sessions/{session_id}`

Get specific session details and analytics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "session_123456",
  "scenario_id": 1,
  "user_id": 1,
  "status": "completed",
  "started_at": "2024-01-15T11:00:00Z",
  "completed_at": "2024-01-15T11:18:30Z",
  "duration": 1110,
  "transcript": [
    {
      "speaker": "user",
      "text": "Hello, this is John from Acme Corp...",
      "timestamp": "2024-01-15T11:00:05Z",
      "sentiment": "confident"
    },
    {
      "speaker": "ai",
      "text": "Hi John, I wasn't expecting your call...",
      "timestamp": "2024-01-15T11:00:08Z",
      "sentiment": "neutral"
    }
  ],
  "performance_metrics": {
    "overall_score": 82,
    "talk_time_ratio": 0.65,
    "question_count": 8,
    "objection_handling_score": 78,
    "rapport_building_score": 85,
    "closing_effectiveness": 80
  },
  "coaching_feedback": [
    {
      "category": "rapport_building",
      "feedback": "Great job using the prospect's name throughout the conversation",
      "score": 90,
      "improvement_tip": "Try to find more common ground early in the call"
    }
  ]
}
```

#### PUT `/sessions/{session_id}/feedback`

Submit session feedback and rating.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "rating": 4,
  "feedback": "Great scenario, helped me practice objection handling",
  "difficulty_rating": 3,
  "technical_issues": false
}
```

**Response (200):**
```json
{
  "message": "Feedback submitted successfully"
}
```

### Voice Processing (`/voice`)

#### WebSocket `/ws/voice/{session_id}`

Real-time voice conversation endpoint.

**Connection URL:** `wss://api.your-domain.com/ws/voice/{session_id}`

**Headers:** `Authorization: Bearer <token>`

**Connection Flow:**
1. Establish WebSocket connection
2. Send audio configuration
3. Stream audio data
4. Receive AI responses
5. Get real-time coaching

**Message Types:**

**Audio Configuration:**
```json
{
  "type": "config",
  "data": {
    "sample_rate": 16000,
    "channels": 1,
    "format": "pcm"
  }
}
```

**Audio Data:**
```json
{
  "type": "audio",
  "data": "base64_encoded_audio_chunk"
}
```

**AI Response:**
```json
{
  "type": "ai_response",
  "data": {
    "text": "I understand your concern about the budget...",
    "audio": "base64_encoded_audio_response",
    "sentiment": "empathetic",
    "intent": "objection_handling"
  }
}
```

**Real-time Coaching:**
```json
{
  "type": "coaching",
  "data": {
    "message": "Great question! Try to probe deeper into their concerns",
    "category": "discovery",
    "urgency": "medium"
  }
}
```

**Session Control:**
```json
{
  "type": "control",
  "action": "pause|resume|end"
}
```

#### POST `/voice/synthesize`

Text-to-speech synthesis for preview purposes.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "text": "Hello, this is a test message for voice synthesis",
  "voice_id": "professional_female",
  "speed": 1.0,
  "stability": 0.7
}
```

**Response (200):**
```json
{
  "audio_url": "https://api.your-domain.com/audio/temp_12345.mp3",
  "duration": 3.2,
  "format": "mp3"
}
```

### Learning Analytics (`/learning`)

#### GET `/learning/progress`

Get user's learning progress and statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `time_range` (string): "week", "month", "quarter", "year"

**Response (200):**
```json
{
  "overall_progress": {
    "total_sessions": 45,
    "hours_practiced": 22.5,
    "average_score": 78,
    "improvement_trend": 15,
    "streak_days": 12
  },
  "skill_breakdown": {
    "rapport_building": {
      "current_level": "intermediate",
      "score": 82,
      "sessions_practiced": 15,
      "improvement": 12
    },
    "objection_handling": {
      "current_level": "beginner",
      "score": 65,
      "sessions_practiced": 8,
      "improvement": 20
    },
    "closing": {
      "current_level": "intermediate",
      "score": 75,
      "sessions_practiced": 12,
      "improvement": 8
    }
  },
  "recent_achievements": [
    {
      "name": "Objection Master",
      "description": "Successfully handled 10 objections in a row",
      "earned_at": "2024-01-14T16:30:00Z"
    }
  ],
  "recommended_scenarios": [1, 3, 7]
}
```

#### GET `/learning/analytics/detailed`

Get detailed analytics and insights.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `scenario_id` (int, optional): Filter by specific scenario
- `start_date` (date, optional): Start date for analytics
- `end_date` (date, optional): End date for analytics

**Response (200):**
```json
{
  "performance_trends": {
    "scores_over_time": [
      {"date": "2024-01-01", "score": 65},
      {"date": "2024-01-08", "score": 72},
      {"date": "2024-01-15", "score": 78}
    ],
    "skill_progression": {
      "rapport_building": [70, 75, 82],
      "discovery": [60, 68, 75],
      "closing": [55, 65, 75]
    }
  },
  "conversation_analysis": {
    "average_talk_time": 0.68,
    "question_frequency": 0.12,
    "response_time": 2.3,
    "sentiment_distribution": {
      "positive": 0.45,
      "neutral": 0.35,
      "negative": 0.20
    }
  },
  "personalized_insights": [
    "You're improving at building rapport but could work on asking more discovery questions",
    "Your closing rate has improved 25% over the last month",
    "Consider practicing more challenging objection scenarios"
  ]
}
```

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message describing what went wrong",
  "error_code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `AUTH_INVALID_CREDENTIALS` | Invalid email/password | Check credentials |
| `AUTH_TOKEN_EXPIRED` | JWT token expired | Refresh token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | Access denied | Check user role |
| `SCENARIO_NOT_FOUND` | Scenario doesn't exist | Verify scenario ID |
| `SESSION_LIMIT_EXCEEDED` | Too many active sessions | Wait or upgrade plan |
| `VOICE_SERVICE_UNAVAILABLE` | ElevenLabs API error | Try again later |
| `INVALID_AUDIO_FORMAT` | Unsupported audio format | Use PCM 16kHz mono |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |

## Rate Limiting

### Default Limits

- **General API**: 120 requests per minute
- **Voice API**: 60 requests per minute
- **WebSocket connections**: 5 concurrent per user

### Rate Limit Headers

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1642248000
```

## WebSocket Events

### Connection Events

- `connect`: WebSocket connection established
- `disconnect`: WebSocket connection closed
- `error`: Connection or protocol error

### Voice Session Events

- `session_started`: Voice session began
- `session_paused`: Session temporarily paused
- `session_resumed`: Session resumed from pause
- `session_ended`: Session completed or terminated
- `coaching_triggered`: Real-time coaching advice

### Error Events

```json
{
  "type": "error",
  "error_code": "AUDIO_PROCESSING_ERROR",
  "message": "Failed to process audio stream",
  "retry_allowed": true
}
```

## SDK and Code Examples

### JavaScript/TypeScript

```javascript
// Authentication
const response = await fetch('https://api.your-domain.com/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { access_token } = await response.json();

// Create session
const session = await fetch('https://api.your-domain.com/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    scenario_id: 1,
    session_type: 'practice'
  })
});

// WebSocket connection
const ws = new WebSocket(`wss://api.your-domain.com/ws/voice/${sessionId}`, [], {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'ai_response') {
    playAudio(message.data.audio);
  }
};
```

### Python

```python
import requests
import websocket
import json

# Authentication
auth_response = requests.post(
    'https://api.your-domain.com/api/v1/auth/login',
    json={
        'email': 'user@example.com',
        'password': 'password123'
    }
)
token = auth_response.json()['access_token']

# Create session
session_response = requests.post(
    'https://api.your-domain.com/api/v1/sessions',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'scenario_id': 1,
        'session_type': 'practice'
    }
)
session_id = session_response.json()['id']

# WebSocket connection
def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'ai_response':
        print(f"AI: {data['data']['text']}")

ws = websocket.WebSocketApp(
    f"wss://api.your-domain.com/ws/voice/{session_id}",
    header={"Authorization": f"Bearer {token}"},
    on_message=on_message
)
```

## Monitoring and Health Checks

### Health Check Endpoint

**GET** `/health`

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "elevenlabs": "healthy",
    "claude": "healthy"
  },
  "uptime": 86400
}
```

### Metrics Endpoint

**GET** `/metrics` (Prometheus format)

Returns application metrics in Prometheus format for monitoring.

## Security

### Authentication Security

- JWT tokens with configurable expiration
- Secure password hashing with bcrypt
- Rate limiting on authentication endpoints
- Optional 2FA support (enterprise plans)

### API Security

- CORS configuration for web clients
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- HTTPS enforced in production

### Voice Data Security

- Audio streams are not stored by default
- Optional encrypted storage for compliance
- GDPR-compliant data handling
- Configurable data retention policies

## Support

For API support and integration help:

- **Documentation**: https://docs.voice-sales-trainer.com
- **API Status**: https://status.voice-sales-trainer.com
- **Support Email**: api-support@voice-sales-trainer.com
- **Developer Forum**: https://forum.voice-sales-trainer.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Full authentication system
- Voice conversation WebSocket API
- Learning analytics endpoints
- Scenario management system