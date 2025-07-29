# Xugera Personal Finance App - AI Coding Instructions

## Architecture Overview
This is a full-stack personal finance management application with:
- **Backend**: Node.js/Express serverless API deployed to AWS Lambda via Serverless Framework
- **Frontend**: React Native/Expo mobile app with online-first architecture
- **Database**: MongoDB for server-side persistence
- **Testing**: Jest for backend unit tests, Playwright for E2E frontend testing

## Project Structure
- `backend/` - Express API with Mongoose models, Zod validation, i18n support
- `frontend/` - Expo React Native app with optimistic updates and direct API communication
- `tests/` - Playwright E2E tests targeting `localhost:19006` (Expo dev server)

## Development Workflow

### Essential Commands
```bash
# Backend development
cd backend && npm run start              # Start with serverless-offline + nodemon
cd backend && npm run deploy-test        # Deploy to test environment
cd backend && npm test                   # Run Jest unit tests

# Frontend development  
cd frontend && npm run web               # Expo web at localhost:19006
cd frontend && npm start                # Expo development server

# E2E Testing
npm run test                            # Run Playwright tests (requires frontend at :19006)
```

### Testing Protocol
- **Always test changes with Playwright** before deploying
- Backend tests use `mongodb-memory-server` for isolated unit testing
- E2E tests expect Expo running on port 19006
- Use `npm run deploy-test` in backend directory for staging deployments

## Key Patterns & Conventions

### Backend API Structure
- **Models**: Mongoose schemas in `backend/src/models/` with TypeScript interfaces
- **Validation**: Zod schemas in `backend/src/validation/schemas.ts` for create/update operations
- **Controllers**: Express handlers with standardized error responses using `res.status().json()`
- **Middleware**: Language detection via `accept-language` header, attached to `req.lang`
- **Routes**: RESTful endpoints under `/api` prefix (accounts, transactions, categories)

### Frontend Data Management  
- **Context**: `DataContext.tsx` provides app-wide state with online-first approach
- **API Service**: `apiService.ts` handles all server communication with error handling
- **Navigation**: Bottom tab navigator with Material Community Icons
- **Forms**: Formik + Yup validation with bottom sheet modals
- **Updates**: Optimistic updates for immediate UI feedback, with automatic revert on API failure

### Database Design
- **Soft Deletes**: Use `isDeleted: boolean` flags instead of hard deletes
- **Timestamps**: Mongoose handles `createdAt`/`updatedAt` automatically
- **Relationships**: Parent-child categories, account-transaction references
- **Ordering**: Custom `order` fields for user-defined sorting (accounts, etc.)
- **Date Handling**: Always use UTC dates - frontend creates with `Date.UTC()`, backend parses ISO strings directly, display uses UTC methods to avoid timezone shifts

### Internationalization
- **Backend**: Translation system in `backend/src/localization/` with dynamic language loading
- **Languages**: English (default), Chinese, Filipino supported via file-based translations
- **Usage**: Access via `req.lang` in controllers, use `t()` function for key-based lookups

### Serverless Deployment
- **AWS Lambda**: Single function handling all routes via `serverless-http`
- **Environment**: `MONGO_URI` required, API keys per stage (dev/test/prod)
- **Build**: TypeScript compilation to `dist/` before deployment
- **Regions**: Default ap-southeast-1, configurable per stage

## Component Examples
- **Account Management**: Drag-and-drop reordering, balance calculations, type-based features
- **Transaction Flow**: Category selection, account transfers, date/amount validation  
- **Category Hierarchy**: Parent-child relationships with aggregate calculations
- **Online-First**: Direct API calls with optimistic updates and error handling

## Common Gotchas
- Frontend port must be 19006 for E2E tests to pass
- Backend requires TypeScript compilation before serverless deployment
- MongoDB connection string must be set in environment for local development
- Soft delete patterns require filtering `isDeleted: false` in queries
- Zod validation errors return structured messages for form field mapping
- **CRITICAL - API Call Optimization**: 
  - DataContext loads data ONCE on initialization, not on every screen mount
  - Balance calculations happen AFTER data refresh, not on every state change
  - `getTransactions()` filters local data, doesn't make new API calls
  - Navigation between tabs uses cached context data, never triggers fresh API calls
  - Optimistic updates provide immediate feedback while API calls happen in background
  - Failed API calls automatically revert optimistic updates and refresh from server
