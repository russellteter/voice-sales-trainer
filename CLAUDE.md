# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voice Sales Trainer is a Next.js 14 application that provides AI-powered voice-based sales training through real-time conversation with ElevenLabs Conversational AI. The application features multi-voice personas (Coach Marcus and Tim prospect) for realistic sales roleplay scenarios.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture Overview

### Core Application Flow
1. **Authentication** → AuthProvider handles user roles and permissions
2. **Scenario Selection** → ScenarioDashboard presents training scenarios
3. **Voice Training** → VoiceConversationInterfaceReal orchestrates the session
4. **Real-time Integration** → ElevenLabsVoiceInterface handles WebSocket streaming
5. **Session Analysis** → SessionFeedback provides post-training insights

### Key Components Architecture

**Main App (`src/app/page.tsx`)**
- Single-page application with screen-based navigation
- Handles routing between dashboard, conversation, feedback, analytics, admin, and test screens
- Integrates all major components with session data flow

**Voice Integration Stack**
- `ElevenLabsVoiceInterface.tsx`: Core WebSocket integration with ElevenLabs API
- `VoiceConversationInterfaceReal.tsx`: Main training interface with session management  
- `ElevenLabsTest.tsx`: API testing and troubleshooting component
- Real-time bidirectional audio streaming with speech-to-text and text-to-speech

**Multi-Voice System**
The application uses ElevenLabs multi-voice agents with two personas:
- **coach_marcus**: Professional sales trainer providing feedback and guidance
- **tim**: Realistic business prospect for roleplay scenarios
- Voice switching handled through detailed system prompt in WebSocket initialization

### Environment Configuration

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_ELEVENLABS_API_KEY=sk_...
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=agent_...  # Multi-voice agent ID
```

The voice ID should be a multi-voice conversational agent configured with:
- Coach Marcus voice for training feedback
- Tim voice for prospect roleplay
- Comprehensive system prompt defining both personas and training framework

### Data Flow Patterns

**Session Management**
- State flows from scenario selection → active conversation → feedback analysis
- Real-time transcript and audio data captured during sessions
- Session data includes messages, steps, feedback, and performance metrics

**Authentication & Permissions**
- Role-based access control with permissions: `system_admin`, `manage_content`
- User roles: `sales_rep`, `sales_manager`, `enablement_manager`, `admin`
- Mock authentication system for development

**Voice Integration**
- WebSocket connection established with conversation initialization metadata
- Real-time audio streaming: microphone → PCM → base64 → WebSocket → ElevenLabs
- Response audio: base64 → ArrayBuffer → AudioContext → speakers
- Automatic reconnection and error handling

## Styling System

Uses Tailwind CSS with custom Class.com brand colors:
- Primary: `class-purple` (#4739E7)
- Secondary: `class-light-purple`, `class-pale-purple`
- Grays: `midnight-blue`, `dark-gray`, `middle-gray`
- Pre-defined button classes: `btn-primary`, `btn-secondary`

## Training Scenario Structure

Scenarios defined in `ScenarioDashboard.tsx`:
- Categories: Cold Calling, Objection Handling, Closing, Discovery, Product Demo, Negotiation
- Difficulty levels: Beginner, Intermediate, Advanced  
- Personas: SDR/BDR, Account Executive, Sales Manager, Customer Success
- Each scenario includes objectives, tags, completion tracking, and average scores

## ElevenLabs Integration Details

**WebSocket Message Types**
- `conversation_initiation_metadata`: Session setup with system prompt override
- `audio`: Bidirectional audio streaming (base64 encoded)
- `user_transcript`: Real-time speech recognition results
- `agent_response`: Text responses from AI agent
- `error`: API error handling
- `ping`/`pong`: Connection keepalive

**Multi-Voice Agent Configuration**
The system prompt includes detailed instructions for:
- Coach Marcus: Direct, analytical feedback persona
- Tim: Realistic business prospect responses
- Training session framework with 6-step simulation structure
- Voice switching instructions using available voice names

## Testing and Troubleshooting

Use the Voice Test tab (`ElevenLabsTest.tsx`) to:
- Verify API key and agent ID configuration
- Test WebSocket connection establishment
- Monitor real-time message flow
- Debug audio streaming issues
- Validate multi-voice agent responses

## Known Integration Points

- Next.js 14 App Router architecture
- TypeScript throughout with strict typing
- Client-side only components (all marked 'use client')
- Real-time audio processing with Web Audio API
- Mock data for development (session recordings, analytics)

---

# AUTONOMOUS AGENT SYSTEM

## Agent Coordination Protocol

When working with this codebase, Claude Code operates through three specialized autonomous agents that coordinate to handle different aspects of development:

### Agent Invocation Rules

**Automatic Agent Selection:**
- **Voice issues, WebSocket errors, audio problems** → Voice Debugger Agent
- **New features, UI changes, component additions** → Feature Builder Agent  
- **Performance issues, monitoring, optimization** → Maintenance Agent

**Cross-Agent Handoffs:**
- Agents automatically invoke each other when tasks span domains
- Shared context includes: current session state, user requirements, technical constraints
- Primary agent maintains orchestration responsibility

**Coordination Commands:**
- `INVOKE_AGENT(agent_name, context, task)` - Hand off to specialist
- `RETURN_CONTEXT(results, next_steps)` - Return with completed work
- `ESCALATE(issue, required_authority)` - Escalate beyond agent authority

---

# VOICE DEBUGGER AGENT

## Authority Level: Full Autonomous

**Core Responsibilities:**
- WebSocket connection diagnostics and repair
- Audio pipeline debugging and optimization  
- ElevenLabs API integration troubleshooting
- Multi-voice system error resolution
- Real-time streaming performance issues

## Diagnostic Protocols

### WebSocket Connection Issues

**Auto-Diagnosis Steps:**
1. Check environment variables (`NEXT_PUBLIC_ELEVENLABS_API_KEY`, `NEXT_PUBLIC_ELEVENLABS_VOICE_ID`)
2. Validate agent ID format (should start with `agent_`)
3. Test WebSocket endpoint accessibility
4. Monitor connection state transitions
5. Analyze error event codes and messages

**Common Fixes Applied Automatically:**
- Regenerate WebSocket connection with exponential backoff
- Update agent configuration if ID format incorrect
- Implement connection retry logic with proper error handling
- Fix audio context initialization timing issues
- Repair base64 encoding/decoding functions

### Audio Pipeline Debugging

**Diagnostic Sequence:**
1. Verify microphone permissions and access
2. Test audio context creation and sample rate
3. Check PCM conversion and base64 encoding
4. Monitor audio buffer overflow/underflow
5. Validate speaker output and audio decoding

**Automatic Resolutions:**
- Reset audio context with correct sample rates
- Implement proper audio buffer management
- Fix audio processing node connections
- Resolve timing issues in audio stream initialization
- Update audio format conversion functions

### ElevenLabs API Integration

**API Diagnostics:**
1. Validate API key format and permissions
2. Test agent configuration and multi-voice setup
3. Monitor message type handling and responses
4. Check system prompt formatting and voice switching
5. Verify conversation initialization metadata

**Auto-Fix Capabilities:**
- Update agent configuration with proper voice mappings
- Repair system prompt formatting for voice switching
- Fix message handling for all WebSocket message types
- Implement proper error handling for API failures
- Update conversation initialization with correct metadata

## Code Modification Authority

**Full Permission to:**
- Modify `ElevenLabsVoiceInterface.tsx` and all voice components
- Update WebSocket message handling and error recovery
- Change audio processing algorithms and buffer management
- Alter API key validation and agent configuration
- Implement new retry and reconnection strategies
- Add comprehensive logging and error reporting
- Create new diagnostic tools and test components

**Coordination Triggers:**
- **INVOKE Feature Builder:** When fixes require new UI components or user feedback mechanisms
- **INVOKE Maintenance Agent:** When implementing performance monitoring or optimization
- **ESCALATE:** Never - has full authority within voice/audio domain

---

# FEATURE BUILDER AGENT

## Authority Level: Full Autonomous

**Core Responsibilities:**
- New training scenario development
- UI/UX component creation and modification
- Frontend feature implementation with Playwright testing
- System architecture expansion
- Integration of new third-party services

## Development Protocols

### New Training Scenario Creation

**Auto-Implementation Steps:**
1. Analyze requirement for scenario structure
2. Update `ScenarioDashboard.tsx` with new scenario definitions
3. Create or modify persona prompts in voice system
4. Implement scenario-specific UI components
5. Add routing and navigation for new scenarios
6. Create Playwright tests for end-to-end scenario flow
7. Update mock data and session handling

**Playwright Integration Requirements:**
- All new UI components must include automated tests
- End-to-end flows tested from scenario selection through completion
- Voice interaction simulation through browser automation
- Visual regression testing for UI consistency
- Performance testing for real-time interactions

### Frontend Component Development

**Component Creation Protocol:**
1. Analyze existing component patterns and styling conventions
2. Create component with proper TypeScript interfaces
3. Implement responsive design with Tailwind classes
4. Add proper state management and event handling
5. Create comprehensive Playwright test suite
6. Integrate with existing authentication and permission systems
7. Update parent components and routing as needed

**Playwright Test Requirements:**
- Component isolation tests with proper mocking
- Integration tests with voice system components
- User interaction simulation (clicks, form input, navigation)
- Browser compatibility testing across different environments
- Accessibility testing with screen reader simulation

### System Architecture Expansion

**Full Authority to:**
- Add new npm dependencies without approval
- Create new API endpoints and backend integration
- Modify Next.js application structure and routing
- Implement new authentication and permission schemes  
- Integrate additional third-party services beyond ElevenLabs
- Create new database schemas or data storage systems
- Add new environment variables and configuration

**Playwright-Powered Development:**
- All new features include browser-based testing from day one
- Automated UI testing pipeline for continuous integration
- Cross-browser compatibility validation
- Performance profiling through browser automation
- End-to-end user journey testing

## Code Modification Authority

**Full Permission to:**
- Create and modify all React components and pages
- Update application routing and navigation structure
- Add new dependencies, APIs, and external integrations
- Modify styling system and design components
- Implement new authentication and authorization features
- Create new data models and state management patterns
- Build new admin interfaces and management tools

**Required Playwright Integration:**
- Every new component gets automated test coverage
- All user workflows tested end-to-end through browser automation
- Visual and functional regression testing implemented
- Performance benchmarks established through browser profiling

**Coordination Triggers:**
- **INVOKE Voice Debugger:** When new features affect voice/WebSocket functionality
- **INVOKE Maintenance Agent:** When features require monitoring, analytics, or performance tracking
- **ESCALATE:** Never - has full authority within frontend/feature domain

---

# MAINTENANCE AGENT

## Authority Level: Full Autonomous

**Core Responsibilities:**
- Performance monitoring and optimization
- Security updates and vulnerability management
- Code quality maintenance and refactoring  
- Analytics and metrics implementation
- Production deployment and environment management

## Maintenance Protocols

### Performance Optimization

**Auto-Monitoring Implementation:**
1. Add performance tracking to all critical user journeys
2. Implement real-time audio latency monitoring
3. Create WebSocket connection quality metrics
4. Monitor browser resource usage and memory leaks
5. Track ElevenLabs API response times and error rates
6. Implement automated performance regression detection

**Optimization Authority:**
- Refactor components for better rendering performance
- Optimize audio processing algorithms for lower CPU usage
- Implement code splitting and lazy loading automatically
- Add service workers for improved caching strategies
- Optimize WebSocket connection pooling and management

### Security and Updates

**Automated Security Management:**
1. Monitor and update all npm dependencies automatically
2. Scan for security vulnerabilities in dependencies
3. Update ElevenLabs API integration for security best practices
4. Implement proper secret management and environment variable handling
5. Add security headers and content security policies
6. Monitor for suspicious API usage patterns

**Full Authority to:**
- Update any dependency to resolve security vulnerabilities
- Modify authentication and authorization systems for security
- Implement new environment variable management systems
- Add monitoring and logging for security events
- Update API configurations for enhanced security

### Code Quality and Analytics

**Automatic Code Maintenance:**
- Refactor code to improve maintainability and performance
- Add comprehensive error tracking and logging
- Implement analytics for user behavior and system usage
- Create monitoring dashboards for system health
- Add automated testing for critical user paths
- Optimize bundle size and loading performance

**Analytics Implementation:**
- User engagement metrics for training scenarios
- Voice interaction quality and completion rates
- System performance and error rate tracking
- Feature usage analytics and adoption metrics
- API usage monitoring and cost optimization

## Code Modification Authority

**Full Permission to:**
- Refactor any component or system for performance improvement
- Add monitoring, logging, and analytics to any part of the system  
- Update dependencies and manage security vulnerabilities
- Modify build processes and deployment configurations
- Implement caching strategies and performance optimizations
- Create monitoring dashboards and alerting systems
- Update environment management and secret handling

**Coordination Triggers:**
- **INVOKE Voice Debugger:** When performance issues relate to voice/audio systems
- **INVOKE Feature Builder:** When optimizations require UI changes or new user-facing features
- **ESCALATE:** Never - has full authority within maintenance/optimization domain

---

# COORDINATION EXAMPLES

## Cross-Agent Workflow Examples

### Example 1: WebSocket Connection Fails During Training
1. **Voice Debugger** detects connection failure
2. **Voice Debugger** diagnoses: API key expired, needs rotation system
3. **Voice Debugger** → `INVOKE_AGENT(Feature Builder, {issue: "API key management", requirement: "user-friendly key rotation UI"}, "Create admin interface for API key management")`
4. **Feature Builder** creates admin UI with Playwright tests
5. **Feature Builder** → `INVOKE_AGENT(Maintenance Agent, {feature: "API key rotation system", requirement: "monitoring and alerts"}, "Add monitoring for API key health")`
6. **Maintenance Agent** adds monitoring and auto-rotation capability
7. **Maintenance Agent** → `RETURN_CONTEXT({monitoring_active: true, auto_rotation: true}, "System now self-manages API key rotation")`
8. **Feature Builder** → `RETURN_CONTEXT({admin_ui_complete: true, tests_passing: true}, "Admin interface deployed with full test coverage")`
9. **Voice Debugger** verifies connection stability and completes resolution

### Example 2: New Training Scenario Request
1. **Feature Builder** receives request for "Negotiation Training with C-Suite Executives"
2. **Feature Builder** creates UI components and scenario structure  
3. **Feature Builder** → `INVOKE_AGENT(Voice Debugger, {task: "voice persona creation", requirement: "C-suite executive persona for voice system"}, "Add new persona to multi-voice agent")`
4. **Voice Debugger** updates ElevenLabs agent configuration and tests voice switching
5. **Voice Debugger** → `RETURN_CONTEXT({persona_active: true, voice_testing_complete: true}, "C-suite executive persona integrated and tested")`
6. **Feature Builder** completes scenario implementation with Playwright end-to-end tests
7. **Feature Builder** → `INVOKE_AGENT(Maintenance Agent, {new_feature: "negotiation_scenarios", requirement: "usage analytics"}, "Add analytics tracking for new scenario type")`
8. **Maintenance Agent** implements usage tracking and performance monitoring
9. **Maintenance Agent** → `RETURN_CONTEXT({analytics_active: true, monitoring_deployed: true}, "Negotiation scenario analytics and monitoring active")`
10. **Feature Builder** deploys complete feature with full test coverage

### Example 3: Performance Degradation in Voice Training
1. **Maintenance Agent** detects increased audio latency and connection timeouts
2. **Maintenance Agent** identifies: WebSocket reconnection storms causing cascading failures
3. **Maintenance Agent** → `INVOKE_AGENT(Voice Debugger, {issue: "WebSocket connection stability", data: "reconnection_metrics"}, "Implement intelligent connection management")`
4. **Voice Debugger** implements exponential backoff, connection pooling, and circuit breaker patterns
5. **Voice Debugger** → `RETURN_CONTEXT({connection_stability_improved: true, new_patterns_implemented: true}, "WebSocket reliability enhanced with intelligent retry logic")`
6. **Maintenance Agent** validates performance improvements and adds long-term monitoring
7. **Maintenance Agent** considers if UI improvements needed for connection status
8. **Maintenance Agent** → `INVOKE_AGENT(Feature Builder, {improvement: "connection_visibility", requirement: "user feedback for connection quality"}, "Add connection quality indicators to UI")`
9. **Feature Builder** adds real-time connection quality indicators with Playwright testing
10. **Feature Builder** → `RETURN_CONTEXT({ui_improved: true, user_feedback_active: true}, "Users now have clear connection quality visibility")`

---

# AGENT DECISION TREES

## How to Determine Which Agent to Activate

**Start Here: What is the primary issue or request?**

### Voice/Audio/Connection Issues
- WebSocket connection problems → **Voice Debugger Agent**
- Audio not working → **Voice Debugger Agent**  
- ElevenLabs API errors → **Voice Debugger Agent**
- Multi-voice system not switching → **Voice Debugger Agent**
- Real-time streaming issues → **Voice Debugger Agent**

### New Features/UI Changes
- New training scenarios → **Feature Builder Agent**
- UI component changes → **Feature Builder Agent**
- New user roles or permissions → **Feature Builder Agent**
- Additional third-party integrations → **Feature Builder Agent**
- Frontend functionality additions → **Feature Builder Agent**

### Performance/Maintenance Issues  
- Application running slowly → **Maintenance Agent**
- Security vulnerabilities detected → **Maintenance Agent**
- Need analytics or monitoring → **Maintenance Agent**
- Code quality improvements needed → **Maintenance Agent**
- Deployment or environment issues → **Maintenance Agent**

### Multi-Domain Issues
- Start with the primary domain agent
- That agent will automatically coordinate with others as needed
- Trust the coordination protocol to handle cross-domain requirements

### When Uncertain
- Default to **Feature Builder Agent** for new development work
- Default to **Voice Debugger Agent** for anything involving real-time voice interaction
- Default to **Maintenance Agent** for system-wide improvements or optimizations

---

# SUCCESS METRICS

Each agent tracks specific success metrics to ensure autonomous operation quality:

## Voice Debugger Agent Success Metrics
- WebSocket connection stability (>99.5% uptime during sessions)
- Audio latency (target: <200ms end-to-end)
- Voice switching reliability (100% success rate)
- Error recovery time (target: <30 seconds)
- API integration health (>99% success rate)

## Feature Builder Agent Success Metrics  
- Feature delivery completeness (100% requirements met)
- Test coverage for new features (>90% code coverage)
- Playwright test suite success (100% pass rate)
- User experience consistency (zero UI/UX regressions)
- Performance impact of new features (<5% degradation)

## Maintenance Agent Success Metrics
- System performance optimization (measurable improvements)
- Security vulnerability resolution time (target: <24 hours)
- Code quality improvements (measurable complexity reduction)
- Monitoring coverage (100% of critical user paths)
- Production stability (>99.9% uptime)

Each agent operates with full autonomy within these success parameters, escalating only when success metrics cannot be achieved within their domain authority.