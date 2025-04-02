# FAMILYSPOT

FAMILYSPOT is a web application that helps families find and share child-friendly places in their community. The platform enables users to discover parks, restaurants, activities, and other venues suitable for children of different age groups.

## Features

- Interactive map showing family-friendly places
- Filtering by category, age group, amenities, and price range
- User authentication system
- Place verification by community members
- Add new places to the map
- User profiles with display name customization

## Tech Stack

- React.js with TypeScript
- Firebase (Authentication, Firestore, Hosting)
- Google Maps API
- Tailwind CSS for styling

## Development Setup

### Available Scripts

| Command | Description |
|---------|-----------|
| `npm start` | Start development server |
| `npm run build` | Create production build |
| `npm test` | Run tests |
| `npm run lint` | Verify files with ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format files with Prettier |
| `npm run deploy:dev` | Build and deploy to dev environment |
| `npm run deploy:prod` | Build and deploy to production |

### Code Quality Standards

This project uses ESLint and Prettier for code quality and consistency, with Husky for git hooks and lint-staged for pre-commit file validation.

To manually fix all project files:
```bash
npm run lint:fix && npm run format
```

### Git Hooks (Husky)

#### pre-commit
- Checks for `console.*` references
- Checks for `debugger` statements
- Runs lint-staged to validate/fix files with ESLint and Prettier

#### commit-msg
Enforces Conventional Commits format:
```
type(scope): message
```
- **type**: must be one of: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, or `chore`
- **scope**: (optional) indicates affected code area
- **message**: must be 10-72 characters

#### pre-push
Validates branch naming:
- Pattern: `type/feature-name`
- Types: `feature`, `bugfix`, or `hotfix`

## Development Workflow

### Setup

1. Clone the repository

   ```bash
   git clone https://github.com/thaixjacob/familyspot.git
   cd familyspot
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with your Google Maps API key
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### Development Process

1. Start local development server

   ```bash
   npm start
   ```

2. Make your changes to the codebase

3. Commit changes to Git

   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

4. Deploy to development environment for testing

   ```bash
   npm run deploy:dev
   ```

5. Test thoroughly in the development environment (https://familyspot-dev.web.app)

6. When ready for production, deploy to the main site
   ```bash
   npm run deploy:prod
   ```

### Environment Management

The project uses two Firebase hosting environments:

- **Development** (`dev`): For testing changes before they go live

  - URL: https://familyspot-dev.web.app
  - Deploy command: `npm run deploy:dev`

- **Production** (`prod`): The live website seen by users
  - URL: https://familyspot.app
  - Deploy command: `npm run deploy:prod`

## Google Maps API Configuration

1. The API key must have these APIs enabled:

   - Maps JavaScript API
   - Places API
   - Geocoding API

2. API key restrictions should include:
   - HTTP referrers:
     - `http://localhost:3000/*`
     - `https://familyspot-dev.web.app/*`
     - `https://familyspot.app/*`

## Firebase Setup

The project uses Firebase for backend services:

- **Authentication**: Email/password and Google sign-in
- **Firestore**: Database for places, users, and verifications
- **Hosting**: For both dev and prod environments

## Important Commands

```bash
# Local development
npm start

# Build the project
npm run build

# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# List Firebase projects
firebase projects:list

# Check Firebase hosting targets
firebase target:apply hosting
```

## Custom Domain Setup

When ready to connect the custom domain (familyspot.app):

1. Add your domain to Firebase Hosting

   ```bash
   firebase hosting:sites:update familyspot-[project-id] --site familyspot.app
   ```

2. Verify domain ownership through Firebase Console

3. Configure DNS records as instructed by Firebase

4. Deploy to production

   ```bash
   npm run deploy:prod
   ```

5. Wait for SSL certificates to provision (may take a few hours)

## License

[Without license for now]

## Contact

tjlannes@gmail.com