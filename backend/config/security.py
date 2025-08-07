"""
Production Security Configuration
Comprehensive security settings and middleware for production deployment
"""

import os
import secrets
from typing import List, Optional
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import logging
from datetime import datetime, timedelta
import hashlib
import hmac
from urllib.parse import urlparse

from config.settings import settings

# Configure security logger
logger = logging.getLogger(__name__)

class SecurityConfig:
    """Security configuration and utilities"""
    
    # Rate limiting configuration
    RATE_LIMITER = Limiter(key_func=get_remote_address)
    
    # Security headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Content-Security-Policy": (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' wss: https:; "
            "media-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        ),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": (
            "geolocation=(), "
            "microphone=(self), "
            "camera=(), "
            "payment=(), "
            "usb=()"
        )
    }
    
    # Trusted domains for CORS
    TRUSTED_ORIGINS = [
        "https://voice-sales-trainer.com",
        "https://app.voice-sales-trainer.com",
        "https://api.voice-sales-trainer.com"
    ]
    
    # API key validation patterns
    API_KEY_PATTERNS = {
        "elevenlabs": r"^sk-[a-zA-Z0-9]{32,}$",
        "claude": r"^sk-ant-[a-zA-Z0-9_-]{95,}$"
    }

class SecurityMiddleware:
    """Custom security middleware for enhanced protection"""
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.failed_attempts = {}  # IP -> {"count": int, "last_attempt": datetime}
        self.blocked_ips = set()
        
    async def __call__(self, request: Request, call_next):
        # Check if IP is blocked
        client_ip = get_remote_address(request)
        
        if client_ip in self.blocked_ips:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="IP address temporarily blocked due to security violations"
            )
        
        # Add security headers to response
        response = await call_next(request)
        
        for header, value in SecurityConfig.SECURITY_HEADERS.items():
            response.headers[header] = value
        
        # Add custom headers
        response.headers["X-API-Version"] = "1.0.0"
        response.headers["X-Request-ID"] = str(request.state.request_id) if hasattr(request.state, 'request_id') else secrets.token_hex(8)
        
        return response
    
    def record_failed_attempt(self, ip: str):
        """Record failed authentication attempt"""
        now = datetime.utcnow()
        
        if ip not in self.failed_attempts:
            self.failed_attempts[ip] = {"count": 1, "last_attempt": now}
        else:
            # Reset counter if last attempt was more than 1 hour ago
            if now - self.failed_attempts[ip]["last_attempt"] > timedelta(hours=1):
                self.failed_attempts[ip] = {"count": 1, "last_attempt": now}
            else:
                self.failed_attempts[ip]["count"] += 1
                self.failed_attempts[ip]["last_attempt"] = now
        
        # Block IP if too many failures
        if self.failed_attempts[ip]["count"] >= 10:
            self.blocked_ips.add(ip)
            logger.warning(f"IP {ip} blocked due to excessive failed attempts")

class InputSanitizer:
    """Input sanitization and validation utilities"""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            raise ValueError("Input must be a string")
        
        # Remove null bytes and control characters
        sanitized = ''.join(char for char in value if ord(char) >= 32 or char in ['\n', '\t'])
        
        # Limit length
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        # Basic XSS prevention
        dangerous_patterns = ['<script', '<iframe', '<object', '<embed', 'javascript:', 'data:']
        sanitized_lower = sanitized.lower()
        
        for pattern in dangerous_patterns:
            if pattern in sanitized_lower:
                logger.warning(f"Potentially dangerous input detected: {pattern}")
                sanitized = sanitized.replace(pattern, "")
        
        return sanitized.strip()
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email)) and len(email) <= 254
    
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, str]:
        """Validate password strength"""
        if len(password) < settings.PASSWORD_MIN_LENGTH:
            return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long"
        
        if len(password) > 128:
            return False, "Password must be less than 128 characters"
        
        # Check for required character types
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*(),.?\":{}|<>" for c in password)
        
        if not (has_upper and has_lower and has_digit and has_special):
            return False, "Password must contain uppercase, lowercase, digit, and special character"
        
        # Check for common weak passwords
        weak_patterns = [
            "password", "123456", "qwerty", "admin", "letmein",
            "welcome", "monkey", "dragon", "master", "shadow"
        ]
        
        for pattern in weak_patterns:
            if pattern.lower() in password.lower():
                return False, "Password contains common weak patterns"
        
        return True, "Password is strong"

class APIKeyValidator:
    """API key validation and management"""
    
    @staticmethod
    def validate_api_key(key: str, service: str) -> bool:
        """Validate API key format"""
        import re
        
        if service not in SecurityConfig.API_KEY_PATTERNS:
            logger.error(f"Unknown service for API key validation: {service}")
            return False
        
        pattern = SecurityConfig.API_KEY_PATTERNS[service]
        return bool(re.match(pattern, key))
    
    @staticmethod
    def mask_api_key(key: str) -> str:
        """Mask API key for logging"""
        if len(key) <= 8:
            return "*" * len(key)
        return key[:4] + "*" * (len(key) - 8) + key[-4:]

class JWTSecurity:
    """Enhanced JWT security utilities"""
    
    @staticmethod
    def generate_secure_secret() -> str:
        """Generate cryptographically secure secret key"""
        return secrets.token_urlsafe(64)
    
    @staticmethod
    def validate_jwt_claims(payload: dict) -> bool:
        """Validate JWT payload claims"""
        required_claims = ["sub", "email", "role", "exp", "iat"]
        
        for claim in required_claims:
            if claim not in payload:
                logger.warning(f"Missing required JWT claim: {claim}")
                return False
        
        # Validate expiration
        exp = payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            logger.warning("JWT token has expired")
            return False
        
        # Validate issued at time
        iat = payload.get("iat")
        if iat and iat > datetime.utcnow().timestamp():
            logger.warning("JWT token issued in the future")
            return False
        
        return True

class WebSocketSecurity:
    """WebSocket-specific security measures"""
    
    @staticmethod
    def validate_origin(origin: str) -> bool:
        """Validate WebSocket origin"""
        if not origin:
            return False
        
        try:
            parsed = urlparse(origin)
            
            # Must use HTTPS in production
            if settings.ENVIRONMENT == "production" and parsed.scheme != "https":
                return False
            
            # Check against allowed origins
            allowed_hosts = [
                urlparse(url).netloc for url in SecurityConfig.TRUSTED_ORIGINS
            ]
            
            return parsed.netloc in allowed_hosts
            
        except Exception as e:
            logger.error(f"Error validating WebSocket origin: {e}")
            return False
    
    @staticmethod
    def generate_session_token() -> str:
        """Generate secure session token for WebSocket connections"""
        return secrets.token_urlsafe(32)

def setup_security_middleware(app: FastAPI) -> None:
    """Configure all security middleware for the application"""
    
    # HTTPS redirect (production only)
    if settings.ENVIRONMENT == "production" and settings.get("FORCE_HTTPS", True):
        app.add_middleware(HTTPSRedirectMiddleware)
    
    # Trusted host middleware
    trusted_hosts = []
    if settings.ENVIRONMENT == "production":
        # Extract hosts from CORS origins
        for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", SecurityConfig.TRUSTED_ORIGINS):
            if isinstance(origin, str):
                try:
                    host = urlparse(origin).netloc
                    if host:
                        trusted_hosts.append(host)
                except Exception:
                    continue
    else:
        trusted_hosts = ["*"]  # Allow all in development
    
    if trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)
    
    # CORS middleware
    cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", SecurityConfig.TRUSTED_ORIGINS)
    if isinstance(cors_origins, str):
        cors_origins = [url.strip() for url in cors_origins.split(",")]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "User-Agent",
            "X-Request-ID"
        ],
        expose_headers=["X-Request-ID", "X-API-Version"],
        max_age=3600
    )
    
    # Rate limiting middleware
    app.state.limiter = SecurityConfig.RATE_LIMITER
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    
    # Custom security middleware
    security_middleware = SecurityMiddleware(app)
    
    logger.info("Security middleware configured successfully")

def create_webhook_signature(payload: str, secret: str) -> str:
    """Create HMAC signature for webhook validation"""
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """Verify webhook HMAC signature"""
    expected_signature = create_webhook_signature(payload, secret)
    return hmac.compare_digest(signature, expected_signature)

# Rate limiting decorators for different endpoint types
def rate_limit_auth(func):
    """Rate limiting for authentication endpoints"""
    return SecurityConfig.RATE_LIMITER.limit("5/minute")(func)

def rate_limit_api(func):
    """Rate limiting for general API endpoints"""
    return SecurityConfig.RATE_LIMITER.limit("60/minute")(func)

def rate_limit_voice(func):
    """Rate limiting for voice processing endpoints"""
    return SecurityConfig.RATE_LIMITER.limit("20/minute")(func)

# Security event logging
class SecurityLogger:
    """Centralized security event logging"""
    
    @staticmethod
    def log_authentication_success(user_id: int, ip: str):
        logger.info(f"Authentication successful - User: {user_id}, IP: {ip}")
    
    @staticmethod
    def log_authentication_failure(email: str, ip: str):
        logger.warning(f"Authentication failed - Email: {email}, IP: {ip}")
    
    @staticmethod
    def log_authorization_failure(user_id: int, resource: str, ip: str):
        logger.warning(f"Authorization failed - User: {user_id}, Resource: {resource}, IP: {ip}")
    
    @staticmethod
    def log_suspicious_activity(description: str, ip: str, user_id: Optional[int] = None):
        logger.error(f"Suspicious activity - {description}, IP: {ip}, User: {user_id or 'N/A'}")
    
    @staticmethod
    def log_rate_limit_exceeded(ip: str, endpoint: str):
        logger.warning(f"Rate limit exceeded - IP: {ip}, Endpoint: {endpoint}")

# Input validation schemas
class SecuritySchemas:
    """Pydantic schemas with security validation"""
    
    @staticmethod
    def validate_file_upload(filename: str, content_type: str, size: int) -> tuple[bool, str]:
        """Validate file upload security"""
        # Check file extension
        allowed_extensions = {'.wav', '.mp3', '.ogg', '.webm', '.pdf', '.txt'}
        file_ext = os.path.splitext(filename.lower())[1]
        
        if file_ext not in allowed_extensions:
            return False, f"File type {file_ext} not allowed"
        
        # Check MIME type
        allowed_mime_types = {
            'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm',
            'application/pdf', 'text/plain'
        }
        
        if content_type not in allowed_mime_types:
            return False, f"MIME type {content_type} not allowed"
        
        # Check file size (from settings)
        max_size = getattr(settings, "MAX_UPLOAD_SIZE", 10 * 1024 * 1024)  # 10MB default
        if size > max_size:
            return False, f"File size exceeds maximum allowed size of {max_size} bytes"
        
        return True, "File validation passed"

# Export security components
__all__ = [
    "SecurityConfig",
    "SecurityMiddleware", 
    "InputSanitizer",
    "APIKeyValidator",
    "JWTSecurity",
    "WebSocketSecurity",
    "SecurityLogger",
    "SecuritySchemas",
    "setup_security_middleware",
    "rate_limit_auth",
    "rate_limit_api", 
    "rate_limit_voice",
    "create_webhook_signature",
    "verify_webhook_signature"
]