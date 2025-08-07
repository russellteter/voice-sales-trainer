"""
Application Monitoring and Metrics Collection
Comprehensive monitoring utilities for production deployment
"""

import time
import psutil
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import json
import redis
from sqlalchemy import text
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from fastapi import Request, Response, FastAPI
from fastapi.middleware.base import BaseHTTPMiddleware
import httpx

from config.settings import settings
from config.database import get_db

# Configure monitoring logger
logger = logging.getLogger(__name__)

# Prometheus metrics registry
registry = CollectorRegistry()

# Application metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code'],
    registry=registry
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    registry=registry
)

voice_sessions_active = Gauge(
    'voice_sessions_active',
    'Number of active voice sessions',
    registry=registry
)

voice_processing_time = Histogram(
    'voice_processing_seconds',
    'Voice processing duration',
    ['operation_type'],
    registry=registry
)

database_connections = Gauge(
    'database_connections_active',
    'Active database connections',
    registry=registry
)

system_memory_usage = Gauge(
    'system_memory_usage_bytes',
    'System memory usage',
    registry=registry
)

system_cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage',
    registry=registry
)

@dataclass
class HealthCheckResult:
    """Health check result data structure"""
    service: str
    status: str  # "healthy", "degraded", "unhealthy"
    response_time: float
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

@dataclass
class PerformanceMetrics:
    """Performance metrics data structure"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_usage_percent: float
    active_connections: int
    response_time_avg: float
    error_rate: float
    throughput_rps: float

class MetricsCollector:
    """Collects and aggregates application metrics"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.request_times = deque(maxlen=1000)  # Last 1000 requests
        self.error_counts = defaultdict(int)
        self.active_sessions = set()
        
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect system-level metrics"""
        try:
            # CPU and memory metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Update Prometheus metrics
            system_cpu_usage.set(cpu_percent)
            system_memory_usage.set(memory.used)
            
            return {
                "cpu_percent": cpu_percent,
                "memory": {
                    "total": memory.total,
                    "used": memory.used,
                    "percent": memory.percent,
                    "available": memory.available
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "percent": (disk.used / disk.total) * 100
                },
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            }
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {}
    
    async def collect_database_metrics(self) -> Dict[str, Any]:
        """Collect database performance metrics"""
        try:
            db = next(get_db())
            
            # Connection count
            result = db.execute(text("""
                SELECT count(*) as active_connections,
                       count(*) FILTER (WHERE state = 'active') as active_queries,
                       count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """)).fetchone()
            
            active_connections = result.active_connections if result else 0
            database_connections.set(active_connections)
            
            # Database size and statistics
            db_stats = db.execute(text("""
                SELECT 
                    pg_database_size(current_database()) as db_size,
                    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
            """)).fetchone()
            
            # Query performance stats
            slow_queries = db.execute(text("""
                SELECT query, calls, total_time, mean_time, rows
                FROM pg_stat_statements 
                WHERE mean_time > 1000  -- Queries slower than 1 second
                ORDER BY mean_time DESC 
                LIMIT 10
            """)).fetchall()
            
            return {
                "connections": {
                    "active": active_connections,
                    "active_queries": result.active_queries if result else 0,
                    "idle": result.idle_connections if result else 0
                },
                "database_size_bytes": db_stats.db_size if db_stats else 0,
                "table_count": db_stats.table_count if db_stats else 0,
                "slow_queries": [
                    {
                        "query": query.query[:100],  # Truncate for logging
                        "calls": query.calls,
                        "total_time": query.total_time,
                        "mean_time": query.mean_time,
                        "rows": query.rows
                    } for query in slow_queries
                ]
            }
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
            return {}
    
    async def collect_redis_metrics(self) -> Dict[str, Any]:
        """Collect Redis performance metrics"""
        try:
            if not self.redis_client:
                return {}
            
            info = self.redis_client.info()
            
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0)
            }
        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")
            return {}
    
    def record_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics"""
        # Prometheus metrics
        request_count.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        request_duration.labels(method=method, endpoint=endpoint).observe(duration)
        
        # Internal tracking
        self.request_times.append((time.time(), duration))
        
        if status_code >= 400:
            self.error_counts[f"{method}:{endpoint}:{status_code}"] += 1
    
    def calculate_performance_metrics(self) -> PerformanceMetrics:
        """Calculate aggregate performance metrics"""
        now = time.time()
        recent_requests = [
            (timestamp, duration) for timestamp, duration in self.request_times
            if now - timestamp < 300  # Last 5 minutes
        ]
        
        if not recent_requests:
            avg_response_time = 0.0
            throughput = 0.0
        else:
            avg_response_time = sum(duration for _, duration in recent_requests) / len(recent_requests)
            throughput = len(recent_requests) / 300  # requests per second over 5 minutes
        
        # System metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Error rate calculation
        total_requests = len(recent_requests)
        total_errors = sum(self.error_counts.values())
        error_rate = (total_errors / total_requests) if total_requests > 0 else 0
        
        return PerformanceMetrics(
            timestamp=datetime.utcnow(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / (1024 * 1024),
            disk_usage_percent=(disk.used / disk.total) * 100,
            active_connections=len(self.active_sessions),
            response_time_avg=avg_response_time,
            error_rate=error_rate,
            throughput_rps=throughput
        )

class HealthChecker:
    """Comprehensive health checking system"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.check_results = {}
        
    async def check_database(self) -> HealthCheckResult:
        """Check database connectivity and performance"""
        start_time = time.time()
        try:
            db = next(get_db())
            result = db.execute(text("SELECT 1")).fetchone()
            response_time = time.time() - start_time
            
            # Check for slow queries or high connection count
            stats = db.execute(text("""
                SELECT count(*) as connections,
                       count(*) FILTER (WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds') as slow_queries
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """)).fetchone()
            
            if stats.connections > 80:  # High connection count
                status = "degraded"
                details = {"warning": f"High connection count: {stats.connections}"}
            elif stats.slow_queries > 5:  # Many slow queries
                status = "degraded" 
                details = {"warning": f"Slow queries detected: {stats.slow_queries}"}
            else:
                status = "healthy"
                details = {"connections": stats.connections}
                
            return HealthCheckResult("database", status, response_time, details)
            
        except Exception as e:
            response_time = time.time() - start_time
            return HealthCheckResult("database", "unhealthy", response_time, {"error": str(e)})
    
    async def check_redis(self) -> HealthCheckResult:
        """Check Redis connectivity and performance"""
        start_time = time.time()
        try:
            if not self.redis_client:
                return HealthCheckResult("redis", "unhealthy", 0, {"error": "Redis client not configured"})
            
            # Test basic operations
            test_key = f"health_check_{int(time.time())}"
            self.redis_client.set(test_key, "test", ex=60)
            value = self.redis_client.get(test_key)
            self.redis_client.delete(test_key)
            
            response_time = time.time() - start_time
            
            if value != b"test":
                return HealthCheckResult("redis", "unhealthy", response_time, {"error": "Redis read/write test failed"})
            
            # Check memory usage
            info = self.redis_client.info()
            memory_usage_percent = (info.get("used_memory", 0) / info.get("maxmemory", 1)) * 100
            
            if memory_usage_percent > 90:
                status = "degraded"
                details = {"warning": f"High memory usage: {memory_usage_percent:.1f}%"}
            else:
                status = "healthy"
                details = {"memory_usage_percent": memory_usage_percent}
                
            return HealthCheckResult("redis", status, response_time, details)
            
        except Exception as e:
            response_time = time.time() - start_time
            return HealthCheckResult("redis", "unhealthy", response_time, {"error": str(e)})
    
    async def check_external_apis(self) -> List[HealthCheckResult]:
        """Check external API dependencies"""
        results = []
        
        # Check ElevenLabs API
        if settings.ELEVENLABS_API_KEY:
            start_time = time.time()
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.elevenlabs.io/v1/voices",
                        headers={"XI-API-KEY": settings.ELEVENLABS_API_KEY},
                        timeout=30.0
                    )
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        status = "healthy"
                        details = {"status_code": 200}
                    elif response.status_code == 429:
                        status = "degraded"
                        details = {"warning": "Rate limited"}
                    else:
                        status = "degraded"
                        details = {"status_code": response.status_code}
                        
                    results.append(HealthCheckResult("elevenlabs", status, response_time, details))
                    
            except Exception as e:
                response_time = time.time() - start_time
                results.append(HealthCheckResult("elevenlabs", "unhealthy", response_time, {"error": str(e)}))
        
        # Check Claude API
        if settings.CLAUDE_API_KEY:
            start_time = time.time()
            try:
                async with httpx.AsyncClient() as client:
                    # Simple test request to Claude API
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": settings.CLAUDE_API_KEY,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                        },
                        json={
                            "model": "claude-3-haiku-20240307",
                            "max_tokens": 10,
                            "messages": [{"role": "user", "content": "ping"}]
                        },
                        timeout=30.0
                    )
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        status = "healthy"
                        details = {"status_code": 200}
                    elif response.status_code == 429:
                        status = "degraded"
                        details = {"warning": "Rate limited"}
                    else:
                        status = "degraded"
                        details = {"status_code": response.status_code}
                        
                    results.append(HealthCheckResult("claude", status, response_time, details))
                    
            except Exception as e:
                response_time = time.time() - start_time
                results.append(HealthCheckResult("claude", "unhealthy", response_time, {"error": str(e)}))
        
        return results
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks and return aggregated results"""
        logger.info("Running comprehensive health checks")
        
        # Run checks concurrently
        db_check = await self.check_database()
        redis_check = await self.check_redis()
        api_checks = await self.check_external_apis()
        
        all_checks = [db_check, redis_check] + api_checks
        
        # Determine overall health status
        unhealthy_services = [check for check in all_checks if check.status == "unhealthy"]
        degraded_services = [check for check in all_checks if check.status == "degraded"]
        
        if unhealthy_services:
            overall_status = "unhealthy"
        elif degraded_services:
            overall_status = "degraded"
        else:
            overall_status = "healthy"
        
        # Calculate average response time
        avg_response_time = sum(check.response_time for check in all_checks) / len(all_checks)
        
        result = {
            "overall_status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "uptime_seconds": time.time() - psutil.boot_time(),
            "average_response_time": avg_response_time,
            "services": {check.service: asdict(check) for check in all_checks}
        }
        
        # Store results for trend analysis
        self.check_results[datetime.utcnow().isoformat()] = result
        
        # Keep only last 24 hours of results
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        self.check_results = {
            k: v for k, v in self.check_results.items() 
            if datetime.fromisoformat(k.replace('Z', '+00:00')) > cutoff_time
        }
        
        return result

class MonitoringMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for request monitoring"""
    
    def __init__(self, app: FastAPI, metrics_collector: MetricsCollector):
        super().__init__(app)
        self.metrics_collector = metrics_collector
        
    async def dispatch(self, request: Request, call_next):
        # Start timing
        start_time = time.time()
        
        # Process request
        response: Response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Extract endpoint info
        endpoint = request.url.path
        method = request.method
        status_code = response.status_code
        
        # Record metrics
        self.metrics_collector.record_request(method, endpoint, status_code, duration)
        
        # Add monitoring headers
        response.headers["X-Response-Time"] = f"{duration:.4f}"
        response.headers["X-Process-Time"] = f"{duration * 1000:.2f}ms"
        
        return response

class AlertManager:
    """Manages monitoring alerts and notifications"""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url
        self.alert_history = deque(maxlen=100)
        self.alert_cooldowns = {}  # Alert type -> last sent timestamp
        
    async def check_alerts(self, metrics: PerformanceMetrics, health_results: Dict[str, Any]):
        """Check for alert conditions and send notifications"""
        alerts = []
        
        # High CPU usage
        if metrics.cpu_percent > 90:
            alerts.append({
                "level": "critical",
                "title": "High CPU Usage",
                "message": f"CPU usage at {metrics.cpu_percent:.1f}%",
                "metric": "cpu_percent",
                "value": metrics.cpu_percent
            })
        
        # High memory usage
        if metrics.memory_percent > 85:
            alerts.append({
                "level": "warning" if metrics.memory_percent < 95 else "critical",
                "title": "High Memory Usage",
                "message": f"Memory usage at {metrics.memory_percent:.1f}%",
                "metric": "memory_percent",
                "value": metrics.memory_percent
            })
        
        # High error rate
        if metrics.error_rate > 0.05:  # 5% error rate
            alerts.append({
                "level": "warning" if metrics.error_rate < 0.1 else "critical",
                "title": "High Error Rate",
                "message": f"Error rate at {metrics.error_rate:.2%}",
                "metric": "error_rate",
                "value": metrics.error_rate
            })
        
        # Slow response times
        if metrics.response_time_avg > 2.0:  # 2 seconds
            alerts.append({
                "level": "warning",
                "title": "Slow Response Times",
                "message": f"Average response time: {metrics.response_time_avg:.2f}s",
                "metric": "response_time_avg",
                "value": metrics.response_time_avg
            })
        
        # Unhealthy services
        if health_results["overall_status"] == "unhealthy":
            unhealthy_services = [
                service for service, data in health_results["services"].items()
                if data["status"] == "unhealthy"
            ]
            alerts.append({
                "level": "critical",
                "title": "Unhealthy Services",
                "message": f"Services down: {', '.join(unhealthy_services)}",
                "metric": "service_health",
                "value": unhealthy_services
            })
        
        # Send alerts
        for alert in alerts:
            await self.send_alert(alert)
    
    async def send_alert(self, alert: Dict[str, Any]):
        """Send alert notification"""
        alert_key = f"{alert['metric']}_{alert['level']}"
        now = time.time()
        
        # Check cooldown (don't spam alerts)
        cooldown_period = 300  # 5 minutes
        if alert_key in self.alert_cooldowns:
            if now - self.alert_cooldowns[alert_key] < cooldown_period:
                return  # Skip alert due to cooldown
        
        self.alert_cooldowns[alert_key] = now
        self.alert_history.append({
            **alert,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Log alert
        log_level = logging.ERROR if alert["level"] == "critical" else logging.WARNING
        logger.log(log_level, f"ALERT [{alert['level'].upper()}]: {alert['title']} - {alert['message']}")
        
        # Send webhook notification if configured
        if self.webhook_url:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        self.webhook_url,
                        json={
                            "text": f"🚨 {alert['title']}: {alert['message']}",
                            "level": alert["level"],
                            "timestamp": alert["timestamp"],
                            "service": "voice-sales-trainer"
                        },
                        timeout=10.0
                    )
            except Exception as e:
                logger.error(f"Failed to send webhook alert: {e}")

# Global monitoring instances
metrics_collector = MetricsCollector()
health_checker = HealthChecker()
alert_manager = AlertManager(webhook_url=getattr(settings, "ALERT_WEBHOOK_URL", None))

def get_prometheus_metrics() -> str:
    """Get Prometheus metrics in text format"""
    return generate_latest(registry).decode('utf-8')

async def get_health_check() -> Dict[str, Any]:
    """Get comprehensive health check results"""
    return await health_checker.run_all_checks()

async def get_performance_metrics() -> Dict[str, Any]:
    """Get current performance metrics"""
    metrics = metrics_collector.calculate_performance_metrics()
    system_metrics = await metrics_collector.collect_system_metrics()
    db_metrics = await metrics_collector.collect_database_metrics()
    redis_metrics = await metrics_collector.collect_redis_metrics()
    
    return {
        "performance": asdict(metrics),
        "system": system_metrics,
        "database": db_metrics,
        "redis": redis_metrics
    }

# Background monitoring task
async def monitoring_loop():
    """Background task for continuous monitoring and alerting"""
    logger.info("Starting monitoring loop")
    
    while True:
        try:
            # Collect metrics and run health checks
            metrics = metrics_collector.calculate_performance_metrics()
            health_results = await health_checker.run_all_checks()
            
            # Check for alerts
            await alert_manager.check_alerts(metrics, health_results)
            
            # Update voice sessions gauge
            voice_sessions_active.set(len(metrics_collector.active_sessions))
            
            # Log summary every 5 minutes
            if int(time.time()) % 300 == 0:
                logger.info(f"Monitoring summary - CPU: {metrics.cpu_percent:.1f}%, "
                          f"Memory: {metrics.memory_percent:.1f}%, "
                          f"Response time: {metrics.response_time_avg:.2f}s, "
                          f"Error rate: {metrics.error_rate:.2%}, "
                          f"Health: {health_results['overall_status']}")
            
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
        
        # Wait 30 seconds before next check
        await asyncio.sleep(30)

# Export monitoring components
__all__ = [
    "MetricsCollector",
    "HealthChecker", 
    "MonitoringMiddleware",
    "AlertManager",
    "PerformanceMetrics",
    "HealthCheckResult",
    "metrics_collector",
    "health_checker",
    "alert_manager",
    "get_prometheus_metrics",
    "get_health_check",
    "get_performance_metrics",
    "monitoring_loop"
]