# 💍 Yukti & Ram Wedding Website

A beautiful, responsive wedding website built with Next.js and Tailwind CSS to celebrate our special day.

![Wedding Website Preview](https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80)

## ✨ Features

- 📱 Responsive design for all devices
- 📝 RSVP system for wedding and engagement ceremony
- 🖼️ Photo gallery
- ⏱️ Live countdown timer
- 👨‍💼 Admin dashboard for managing RSVPs
- 🎨 Beautiful UI with Tailwind CSS
- 📅 Event timeline and details
- 🔐 Guest authentication with Supabase

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.17 or later)
  - [Download from nodejs.org](https://nodejs.org/en/download/)
  - [Using a package manager](https://nodejs.org/en/download/package-manager/)
  - [Using nvm (recommended)](https://github.com/nvm-sh/nvm#installing-and-updating)
  
  Verify installation:
  ```bash
  node --version
  npm --version
  ```

- **Git** (for cloning the repository)
  - [Download for Windows](https://git-scm.com/download/win)
  - [Download for macOS](https://git-scm.com/download/mac)
  - [Download for Linux/Unix](https://git-scm.com/download/linux)
  
  Verify installation:
  ```bash
  git --version
  ```

### Installation

1. **Clone the repository**
   ```bash
   git clone [your-repository-url]
   cd weddingSite
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure dates**
   
   Update the dates in `lib/utils.ts` to match your wedding schedule:
   ```typescript
   export function getWeddingDate(): Date {
     return new Date('2026-01-24T13:00:00'); // Update with your wedding date
   }

   export function isRsvpDeadlinePassed(): boolean {
     const deadline = new Date('2026-01-01T00:00:00'); // Update with your RSVP deadline
     // ...
   }

   export function isEngagementRsvpDeadlinePassed(): boolean {
     const deadline = new Date('2025-09-01T00:00:00'); // Update with your engagement RSVP deadline
     // ...
   }
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to view the website.

## 📁 Project Structure

```
weddingSite/
├── app/                    # Next.js app directory
│   ├── public/             # Static assets
│   ├── api/                # API routes
│   ├── admin/              # Admin dashboard
│   └── rsvp/               # RSVP functionality
├── components/             # React components
│   ├── icons/              # Custom icons
│   └── ui/                 # UI components
├── lib/                    # Utility functions
├── supabase/               # Supabase related files
│   ├── migrations/         # Database migrations
└── public/                 # Static files accessible from the web
```

## 📋 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## 🛠️ Built With

- [Next.js](https://nextjs.org/) - React framework for production
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Lucide Icons](https://lucide.dev/) - Beautiful open source icons
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built with Radix UI and Tailwind
- [Supabase](https://supabase.com/) - Open source Firebase alternative

## 🚀 Deployment

The site can be deployed to various platforms:

- [Vercel](https://vercel.com/docs/frameworks/nextjs) (recommended for Next.js)
- [Netlify](https://docs.netlify.com/frameworks/next-js/)
- [AWS Amplify](https://docs.amplify.aws/gen1/guides/hosting/nextjs/)

For detailed deployment instructions, check the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## 🧩 Customization

### Adding new pages

Create new pages by adding files to the `app` directory. For more information, refer to the [Next.js documentation](https://nextjs.org/docs/app/building-your-application/routing).

### Styling

This project uses Tailwind CSS for styling. You can customize the theme in the `tailwind.config.js` file. For more information, refer to the [Tailwind CSS documentation](https://tailwindcss.com/docs/configuration).

## 🔐 Supabase Authentication for Guest List

This website uses Supabase for guest authentication, providing a simple and secure way for wedding guests to sign in using only their names.

### Setup Instructions

#### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Take note of the URL and API key (found in Project Settings > API)

#### 2. Set Environment Variables

Add the following variables to your `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_API_KEY=your-supabase-api-key
```

#### 3. Create Database Tables

1. Go to the SQL Editor in your Supabase dashboard
2. Run the SQL script from `supabase/migrations/schema.sql` to create the necessary tables

Or use the Supabase interface:

1. Go to "Table Editor"
2. Create two tables:
   - `guests` with columns:
     - `id` (uuid, primary key)
     - `full_name` (text, unique)
     - `is_active` (boolean, default true)
     - `created_at` (timestamp with timezone)
     - `updated_at` (timestamp with timezone)
   - `guest_sessions` with columns:
     - `id` (uuid, primary key)
     - `guest_id` (uuid, foreign key to guests.id)
     - `session_token` (text, unique)
     - `created_at` (timestamp with timezone)
     - `expires_at` (timestamp with timezone)

#### 4. Seed Guest List

Run the seed script to populate your Supabase database with guests:

```bash
# Run the seed script
npx tsx supabase/seed-guests.ts

# Optionally provide a custom CSV path
npx tsx supabase/seed-guests.ts /path/to/your/guests.csv
```

**Important**: The seed script fully synchronizes the guest list in Supabase with your defined list. It will:
- Add new guests that exist in your list but not in Supabase
- Reactivate existing guests that were previously deactivated
- Deactivate guests in Supabase that are no longer in your current list
- This ensures your Supabase guest list always matches exactly what's in your approved list

### How It Works

#### Authentication Flow

1. **Guest Sign In**:
   - User enters their full name on the login modal
   - The system checks if the name exists in the Supabase database
   - If found, a new session is created and returned to the client

2. **Session Management**:
   - The session token is stored in localStorage and as an HTTP-only cookie
   - Future API requests include this token for authentication
   - Sessions expire after 30 days or when the user signs out

3. **RSVP Submission**:
   - The RSVP API endpoint verifies the session token 
   - The system validates that the authenticated user matches the RSVP request
   - RSVP data is then stored in the local file system as before

#### Guest Context

The `GuestProvider` component manages authentication state:
- Retrieves and validates the session token on page load
- Stores guest information in local storage
- Provides methods to set and clear guest data across the application

### Modifying the Guest List

#### Add New Guests

1. Update the `APPROVED_GUESTS` array in `lib/data.ts` 
2. Run the seed script to add them to Supabase
3. Alternatively, add guests directly through the Supabase dashboard

#### Removing Guests

1. Remove them from the `APPROVED_GUESTS` array in `lib/data.ts`
2. Run the seed script - it will automatically deactivate them in Supabase
3. Alternatively, in Supabase dashboard, find the guest and set their `is_active` flag to `false`

Guests with `is_active=false` will not be able to authenticate.

### Troubleshooting

1. **Session Issues**: 
   - Check browser console for errors
   - Verify cookie settings in DevTools
   - Try clearing localStorage and cookies

2. **Database Connection**:
   - Verify environment variables are set correctly
   - Check Supabase dashboard for connection issues

3. **Authentication Failures**:
   - Ensure guest names match exactly (case insensitive)
   - Verify the guest exists and is active in Supabase

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ for our special day 