# GlobeMart Admin Dashboard

A modern, responsive admin dashboard built with Next.js, TypeScript, and Tailwind CSS for the Department of Homeland Security.

## Features

- 🎨 Modern, responsive design with Tailwind CSS
- 📱 Mobile-first approach with collapsible sidebar
- 🔒 Security-focused dashboard with alerts and monitoring
- 📊 Real-time statistics and activity tracking
- 🎯 Quick action buttons for common tasks
- 🧩 Modular component architecture
- 📝 TypeScript for type safety
- 🎨 Lucide React icons for consistent iconography

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Linting**: ESLint with Prettier
- **Package Manager**: npm

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd globe-mart-admin
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout component
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/         # Reusable components
│   ├── ui/             # Basic UI components (Card, etc.)
│   ├── layout/         # Layout components (Header, Sidebar)
│   └── common/         # Common components (StatsCard, etc.)
└── lib/                # Utility functions and configurations
```

## Components

### Layout Components

- **Header**: Top navigation with search, notifications, and user menu
- **Sidebar**: Collapsible navigation menu with admin sections

### UI Components

- **Card**: Reusable card component with header and content
- **StatsCard**: Dashboard statistics display component

### Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Automatic theme switching based on system preference
- **Security Monitoring**: Real-time security alerts and activity tracking
- **User Management**: Admin user interface and controls
- **Analytics**: Dashboard with key metrics and KPIs

## Customization

### Adding New Pages

1. Create a new file in `src/app/` directory
2. Add navigation link in `src/components/layout/Sidebar.tsx`
3. Update routing as needed

### Styling

- Uses Tailwind CSS for styling
- Custom colors and themes can be configured in `tailwind.config.js`
- Component-specific styles are co-located with components

### Adding Components

- Place reusable components in `src/components/ui/`
- Place layout-specific components in `src/components/layout/`
- Place common components in `src/components/common/`

## Security Considerations

This is an admin dashboard template. For production use:

1. Implement proper authentication and authorization
2. Add input validation and sanitization
3. Use HTTPS in production
4. Implement proper session management
5. Add audit logging for admin actions
6. Regular security updates and monitoring

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new components
3. Write meaningful commit messages
4. Test your changes thoroughly
5. Update documentation as needed

## License

This project is for internal use by the Department of Homeland Security.
