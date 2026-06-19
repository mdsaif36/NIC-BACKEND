import swaggerJsdoc from 'swagger-jsdoc';

// ─── Swagger / OpenAPI Configuration ──────────────────────────────────────────
// Docs served at GET /api-docs
// All route files use @swagger JSDoc comments for auto-generation.
// ──────────────────────────────────────────────────────────────────────────────

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🎓 NextInCampus API',
      version: '1.0.0',
      description: `
**NextInCampus** — The referral platform connecting students to alumni at top companies.

## Authentication
All protected routes require a **Bearer token** in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
Get a token from \`POST /api/auth/login\` or \`POST /api/auth/signup\`.

## Roles
- **seeker** — students looking for referrals
- **alumni** — working professionals who give referrals
- **admin** — platform administrators (future)

## Rate Limits
- Global: 150 req/15 min per IP (production)
- Auth routes: 15 req/5 min per IP (production)
      `,
      contact: {
        name: 'NextInCampus Team',
        url: 'https://nextincampus.in',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development',
      },
      {
        url: 'https://api.nextincampus.in',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            name:       { type: 'string' },
            email:      { type: 'string' },
            role:       { type: 'string', enum: ['seeker', 'alumni'] },
            college:    { type: 'string' },
            company:    { type: 'string' },
            jobTitle:   { type: 'string' },
            bio:        { type: 'string' },
            skills:     { type: 'array', items: { type: 'string' } },
            isEmailVerified:    { type: 'boolean' },
            isLinkedinVerified: { type: 'boolean' },
            isAdminVerified:    { type: 'boolean' },
            trustScore:         { type: 'integer' },
            verificationLevel:  { type: 'string', enum: ['Unverified', 'Bronze', 'Silver', 'Gold', 'Platinum'] },
            referralCreditsRemaining: { type: 'integer' },
          },
        },
        ReferralRequest: {
          type: 'object',
          properties: {
            id:           { type: 'integer' },
            seekerId:     { type: 'integer' },
            alumniId:     { type: 'integer' },
            targetRole:   { type: 'string' },
            timeline:     { type: 'string' },
            pitchMessage: { type: 'string' },
            status:       { type: 'string', enum: ['pending', 'accepted', 'declined', 'hired', 'referred', 'info'] },
            createdAt:    { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id:        { type: 'integer' },
            userId:    { type: 'integer' },
            type:      { type: 'string' },
            title:     { type: 'string' },
            message:   { type: 'string' },
            isRead:    { type: 'boolean' },
            actionUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            senderId:   { type: 'integer' },
            receiverId: { type: 'integer' },
            text:       { type: 'string' },
            isSystem:   { type: 'boolean' },
            createdAt:  { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            userId:     { type: 'integer' },
            action:     { type: 'string' },
            entityType: { type: 'string' },
            entityId:   { type: 'integer' },
            createdAt:  { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error:   { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth',          description: 'Authentication & session management' },
      { name: 'Users',         description: 'User profiles, alumni discovery, resume upload' },
      { name: 'Requests',      description: 'Referral request lifecycle' },
      { name: 'Messages',      description: 'Chat & meeting scheduling' },
      { name: 'Notifications', description: 'In-app notification center' },
      { name: 'Referral Posts',description: 'Alumni referral opportunity posts' },
    ],
  },
  // Glob patterns for route files containing @swagger JSDoc
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
