# QuestGPT

QuestGPT is an AI-powered text adventure game where your choices shape the story.

## ✨ Features

- Modern, mobile-friendly UI
- Genre selection (Fantasy, Mystery, Sci-Fi)
- Interactive gameplay through text commands
- AI-generated story narratives

## 🛠️ Built With

- [Next.js](https://nextjs.org/) 14 (App Router)
- [React](https://reactjs.org/) 18
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Lucide Icons](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or later recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vaiybhav/questgpt.git
   cd questgpt
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   # yarn install
   ```

### Running the Development Server

```bash
npm run dev
# or
# yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 Project Structure

- `app/`: Contains the core application pages and layouts.
  - `page.tsx`: Homepage (Genre Selector).
  - `game/page.tsx`: Gameplay page.
  - `layout.tsx`: Main application layout.
  - `globals.css`: Global styles and Tailwind directives.
- `components/`: Reusable React components.
  - `GenreSelector.tsx`: Component for selecting the game genre.
  - `StoryDisplay.tsx`: Component for displaying the AI-generated story.
  - `CommandInput.tsx`: Component for user command input.
- `public/`: Static assets.
- `tailwind.config.ts`: Tailwind CSS configuration.
- `postcss.config.js`: PostCSS configuration.
- `next.config.mjs`: Next.js configuration.
- `tsconfig.json`: TypeScript configuration.

## 📄 License

This project is open source and available under the MIT License.

## 🚀 Deployment

This project is ready to be deployed on [Vercel](https://vercel.com/), the creators of Next.js.

Simply connect your GitHub repository to Vercel and it will automatically build and deploy your application. 