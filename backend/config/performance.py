"""
Performance Optimization Configuration
Production-ready performance enhancements and optimizations
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
from functools import wraps, lru_cache
import time
import hashlib
import json
import redis
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
import aioredis
from datetime import timedelta
import weakref

from config.settings import settings

# Configure performance logger
logger = logging.getLogger(__name__)

class DatabaseOptimization:
    """Database connection and query optimization"""
    
    @staticmethod
    def create_optimized_engine(database_url: str) -> Engine:
        """Create optimized database engine with connection pooling"""
        
        # Connection pool configuration
        pool_config = {
            "poolclass": QueuePool,
            "pool_size": getattr(settings, "DATABASE_POOL_SIZE", 20),
            "max_overflow": getattr(settings, "DATABASE_MAX_OVERFLOW", 30),
            "pool_pre_ping": True,  # Verify connections before use
            "pool_recycle": 3600,   # Recycle connections every hour
            "pool_timeout": 30,     # Timeout for getting connection
        }
        
        # Engine configuration
        engine_config = {
            "echo": False,  # Disable SQL logging in production
            "future": True,
            "connect_args": {
                "connect_timeout": 10,
                "command_timeout": 60,
                "server_settings": {
                    "application_name": "voice_sales_trainer",
                    "jit": "off",  # Disable JIT for consistent performance
                }
            }
        }
        
        # Combine configurations
        engine = create_engine(
            database_url,
            **pool_config,
            **engine_config
        )
        
        # Set up connection event listeners for optimization
        @event.listens_for(engine, "connect")
        def set_postgres_pragmas(dbapi_connection, connection_record):
            """Set PostgreSQL connection-level optimizations"""
            with dbapi_connection.cursor() as cursor:
                # Set work_mem for sorting/hashing operations
                cursor.execute("SET work_mem = '256MB'")
                # Set shared_preload_libraries optimizations
                cursor.execute("SET random_page_cost = 1.1")  # SSD optimization
                cursor.execute("SET effective_cache_size = '4GB'")
        
        logger.info("Optimized database engine created")
        return engine

class RedisOptimization:
    """Redis connection and caching optimization"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.async_redis_client: Optional[aioredis.Redis] = None
        
    async def initialize_redis(self):
        """Initialize optimized Redis connections"""
        redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        
        # Sync Redis client configuration
        redis_config = {
            "url": redis_url,
            "decode_responses": True,
            "max_connections": getattr(settings, "REDIS_MAX_CONNECTIONS", 100),
            "retry_on_timeout": True,
            "socket_keepalive": True,
            "socket_keepalive_options": {
                1: 1,  # TCP_KEEPIDLE
                2: 3,  # TCP_KEEPINTVL  
                3: 5,  # TCP_KEEPCNT
            },
            "health_check_interval": 30,
        }
        
        self.redis_client = redis.from_url(**redis_config)
        
        # Async Redis client configuration
        self.async_redis_client = aioredis.from_url(
            redis_url,
            max_connections=redis_config["max_connections"],
            retry_on_timeout=True,
            socket_keepalive=True,
        )
        
        # Test connections
        try:
            self.redis_client.ping()
            await self.async_redis_client.ping()
            logger.info("Optimized Redis connections established")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            
    def get_client(self) -> Optional[redis.Redis]:
        """Get synchronous Redis client"""
        return self.redis_client
        
    def get_async_client(self) -> Optional[aioredis.Redis]:
        """Get asynchronous Redis client"""
        return self.async_redis_client

class CacheManager:
    """Advanced caching with TTL and invalidation strategies"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0
        }
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from prefix and parameters"""
        key_data = f"{prefix}:" + ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str, default=None) -> Any:
        """Get value from cache with fallback"""
        # Try local cache first (fastest)
        if key in self.local_cache:
            cache_entry = self.local_cache[key]
            if cache_entry["expires"] > time.time():
                self.cache_stats["hits"] += 1
                return cache_entry["value"]
            else:
                del self.local_cache[key]
        
        # Try Redis cache
        if self.redis_client:
            try:
                cached_value = self.redis_client.get(key)
                if cached_value:
                    value = json.loads(cached_value)
                    self.cache_stats["hits"] += 1
                    # Store in local cache for faster access
                    self.local_cache[key] = {
                        "value": value,
                        "expires": time.time() + 300  # 5 minutes local cache
                    }
                    return value
            except Exception as e:
                logger.warning(f"Redis cache get error: {e}")
        
        self.cache_stats["misses"] += 1
        return default
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        try:
            # Store in local cache
            self.local_cache[key] = {
                "value": value,
                "expires": time.time() + min(ttl, 300)  # Max 5 minutes local
            }
            
            # Store in Redis cache
            if self.redis_client:
                self.redis_client.setex(key, ttl, json.dumps(value))
            
            self.cache_stats["sets"] += 1
            return True
            
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            # Remove from local cache
            if key in self.local_cache:
                del self.local_cache[key]
            
            # Remove from Redis cache
            if self.redis_client:
                self.redis_client.delete(key)
            
            self.cache_stats["deletes"] += 1
            return True
            
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear cache entries matching pattern"""
        cleared = 0
        
        # Clear local cache
        keys_to_delete = [k for k in self.local_cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self.local_cache[key]
            cleared += 1
        
        # Clear Redis cache
        if self.redis_client:
            try:
                keys = self.redis_client.keys(f"*{pattern}*")
                if keys:
                    self.redis_client.delete(*keys)
                    cleared += len(keys)
            except Exception as e:
                logger.warning(f"Redis pattern clear error: {e}")
        
        return cleared
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        hit_rate = 0
        if self.cache_stats["hits"] + self.cache_stats["misses"] > 0:
            hit_rate = self.cache_stats["hits"] / (self.cache_stats["hits"] + self.cache_stats["misses"])
        
        return {
            **self.cache_stats,
            "hit_rate": hit_rate,
            "local_cache_size": len(self.local_cache)
        }

class AsyncConnectionPool:
    """Async connection pool for external APIs"""
    
    def __init__(self, max_connections: int = 100):
        self.max_connections = max_connections
        self.connection_pools: Dict[str, Any] = {}
        self.semaphore = asyncio.Semaphore(max_connections)
    
    @asynccontextmanager
    async def get_connection(self, service: str):
        """Get connection from pool with automatic management"""
        async with self.semaphore:
            # Implementation would depend on specific service
            yield None

class ResponseCompressionMiddleware(BaseHTTPMiddleware):
    """Middleware for response compression optimization"""
    
    def __init__(self, app, minimum_size: int = 1024):
        super().__init__(app)
        self.minimum_size = minimum_size
        
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Only compress if response is large enough
        if (
            "gzip" in request.headers.get("accept-encoding", "") and
            response.headers.get("content-length") and
            int(response.headers["content-length"]) > self.minimum_size
        ):
            # FastAPI/Starlette handles gzip compression automatically
            # This is a placeholder for custom compression logic
            pass
            
        return response

class QueryOptimizer:
    """Database query optimization utilities"""
    
    @staticmethod
    def optimize_query_hints() -> Dict[str, str]:
        """Get PostgreSQL query optimization hints"""
        return {
            "enable_seqscan": "off",  # Prefer index scans
            "enable_hashjoin": "on",  # Enable hash joins
            "enable_mergejoin": "on", # Enable merge joins
            "work_mem": "256MB",      # Increase sort/hash memory
            "effective_cache_size": "4GB",  # Assume 4GB cache
            "random_page_cost": "1.1",      # SSD optimization
        }
    
    @staticmethod
    def create_session_indexes() -> List[str]:
        """SQL statements to create performance-critical indexes"""
        return [
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id_created ON sessions(user_id, created_at DESC);",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status_created ON sessions(status, created_at DESC);",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true;",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scenarios_category_active ON scenarios(category) WHERE is_active = true;",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_analytics_session_id ON session_analytics(session_id);",
        ]

# Caching decorators
def cache_result(ttl: int = 3600, key_prefix: str = ""):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{key_prefix}:{func.__name__}:" + hashlib.md5(
                json.dumps({"args": str(args), "kwargs": kwargs}, sort_keys=True).encode()
            ).hexdigest()
            
            # Try to get from cache
            cached = cache_manager.get(key)
            if cached is not None:
                return cached
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache_manager.set(key, result, ttl)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{key_prefix}:{func.__name__}:" + hashlib.md5(
                json.dumps({"args": str(args), "kwargs": kwargs}, sort_keys=True).encode()
            ).hexdigest()
            
            # Try to get from cache
            cached = cache_manager.get(key)
            if cached is not None:
                return cached
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(key, result, ttl)
            return result
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

def invalidate_cache(pattern: str):
    """Decorator to invalidate cache patterns after function execution"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            cache_manager.clear_pattern(pattern)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            cache_manager.clear_pattern(pattern)
            return result
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

# Memory optimization utilities
class MemoryOptimizer:
    """Memory usage optimization utilities"""
    
    def __init__(self):
        self.object_pool = weakref.WeakValueDictionary()
    
    @lru_cache(maxsize=1000)
    def get_cached_object(self, key: str, factory_func):
        """Get object from cache or create using factory function"""
        return factory_func()
    
    def clear_memory_caches(self):
        """Clear all memory caches to free up space"""
        # Clear function caches
        for obj in [cache_manager]:
            if hasattr(obj, 'local_cache'):
                obj.local_cache.clear()
        
        # Clear LRU caches
        self.get_cached_object.cache_clear()
        
        logger.info("Memory caches cleared")

# Performance monitoring
class PerformanceTracker:
    """Track and analyze performance metrics"""
    
    def __init__(self):
        self.metrics = {
            "query_times": [],
            "cache_hits": 0,
            "cache_misses": 0,
            "api_response_times": [],
        }
    
    def track_query_time(self, query: str, duration: float):
        """Track database query execution time"""
        self.metrics["query_times"].append({
            "query": query[:100],  # Truncate long queries
            "duration": duration,
            "timestamp": time.time()
        })
        
        # Keep only recent metrics
        cutoff_time = time.time() - 3600  # Last hour
        self.metrics["query_times"] = [
            m for m in self.metrics["query_times"] 
            if m["timestamp"] > cutoff_time
        ]
    
    def track_api_response(self, endpoint: str, duration: float):
        """Track API endpoint response time"""
        self.metrics["api_response_times"].append({
            "endpoint": endpoint,
            "duration": duration,
            "timestamp": time.time()
        })
        
        # Keep only recent metrics
        cutoff_time = time.time() - 3600
        self.metrics["api_response_times"] = [
            m for m in self.metrics["api_response_times"]
            if m["timestamp"] > cutoff_time
        ]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate performance analysis report"""
        now = time.time()
        hour_ago = now - 3600
        
        # Analyze query performance
        recent_queries = [
            q for q in self.metrics["query_times"]
            if q["timestamp"] > hour_ago
        ]
        
        avg_query_time = 0
        slow_queries = []
        if recent_queries:
            avg_query_time = sum(q["duration"] for q in recent_queries) / len(recent_queries)
            slow_queries = [q for q in recent_queries if q["duration"] > 1.0]  # > 1 second
        
        # Analyze API performance
        recent_api_calls = [
            a for a in self.metrics["api_response_times"]
            if a["timestamp"] > hour_ago
        ]
        
        avg_api_time = 0
        slow_endpoints = []
        if recent_api_calls:
            avg_api_time = sum(a["duration"] for a in recent_api_calls) / len(recent_api_calls)
            slow_endpoints = [a for a in recent_api_calls if a["duration"] > 2.0]  # > 2 seconds
        
        return {
            "timestamp": now,
            "query_performance": {
                "total_queries": len(recent_queries),
                "average_time": avg_query_time,
                "slow_queries_count": len(slow_queries),
                "slow_queries": slow_queries[-10:]  # Last 10 slow queries
            },
            "api_performance": {
                "total_requests": len(recent_api_calls),
                "average_time": avg_api_time,
                "slow_endpoints_count": len(slow_endpoints),
                "slow_endpoints": slow_endpoints[-10:]  # Last 10 slow endpoints
            },
            "cache_stats": cache_manager.get_stats()
        }

# Global instances
redis_optimization = RedisOptimization()
cache_manager = CacheManager()
performance_tracker = PerformanceTracker()
memory_optimizer = MemoryOptimizer()

# Async initialization function
async def initialize_performance_systems():
    """Initialize all performance optimization systems"""
    logger.info("Initializing performance optimization systems...")
    
    # Initialize Redis connections
    await redis_optimization.initialize_redis()
    
    # Set up cache manager with Redis client
    cache_manager.redis_client = redis_optimization.get_client()
    
    logger.info("Performance optimization systems initialized")

# Background optimization tasks
async def performance_monitoring_task():
    """Background task for performance monitoring and optimization"""
    while True:
        try:
            # Generate performance report
            report = performance_tracker.get_performance_report()
            
            # Log performance warnings
            if report["query_performance"]["slow_queries_count"] > 10:
                logger.warning(f"High number of slow queries: {report['query_performance']['slow_queries_count']}")
            
            if report["api_performance"]["slow_endpoints_count"] > 5:
                logger.warning(f"High number of slow API responses: {report['api_performance']['slow_endpoints_count']}")
            
            # Clear old performance data
            if len(performance_tracker.metrics["query_times"]) > 10000:
                performance_tracker.metrics["query_times"] = performance_tracker.metrics["query_times"][-5000:]
            
            if len(performance_tracker.metrics["api_response_times"]) > 10000:
                performance_tracker.metrics["api_response_times"] = performance_tracker.metrics["api_response_times"][-5000:]
            
            # Periodic cache cleanup
            cache_stats = cache_manager.get_stats()
            if cache_stats["local_cache_size"] > 1000:
                # Clear 25% of local cache
                items_to_clear = list(cache_manager.local_cache.keys())[:250]
                for key in items_to_clear:
                    if key in cache_manager.local_cache:
                        del cache_manager.local_cache[key]
            
        except Exception as e:
            logger.error(f"Performance monitoring task error: {e}")
        
        # Run every 5 minutes
        await asyncio.sleep(300)

# Export performance components
__all__ = [
    "DatabaseOptimization",
    "RedisOptimization", 
    "CacheManager",
    "AsyncConnectionPool",
    "ResponseCompressionMiddleware",
    "QueryOptimizer",
    "MemoryOptimizer",
    "PerformanceTracker",
    "cache_result",
    "invalidate_cache",
    "redis_optimization",
    "cache_manager",
    "performance_tracker",
    "memory_optimizer",
    "initialize_performance_systems",
    "performance_monitoring_task"
]