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