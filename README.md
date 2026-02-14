# Hifz Tracker - Quran Memorization App

A modern, efficient tool designed to help you track your Quran memorization (Hifz) progress and retain what you've learned using spaced repetition.

## 🌟 Features

- **Smart Review System**: Uses the SM-2 spaced repetition algorithm to schedule reviews at the optimal time, ensuring you never forget what you've memorized.
- **Progress Tracking**: Visualize your progress across the entire Quran with the "Juz View". See which Juz you are strong in and which need attention.
- **Flexible Queues**:
  - **Daily Log**: Items due for review today.
  - **Learning**: New items you are currently memorizing.
  - **Juz Review**: Focus on specific Juz when you want to strengthen a particular section.
- **Detailed Analytics**: Track your retention rates and memorization velocity (coming soon).
- **Offline-First**: Uses a local SQLite database for fast, private, and reliable data storage.

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: SQLite (via `better-sqlite3`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Runtime**: Bun / Node.js

## 🛠️ Getting Started

### Prerequisites

Make sure you have [Bun](https://bun.sh/) installed (or Node.js + npm/pnpm).

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/pr0h0/hifs-tracker.git
    cd hifs-tracker
    ```

2.  Install dependencies:

    ```bash
    bun install
    # or
    npm install
    ```

3.  Initialize the database:
    The app will automatically create the `hifz-tracker.db` SQLite database on the first run.

### Running the App

Start the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

To create a production build:

```bash
bun run build
bun start
```

### Development Commands

- `bun run check-types`: Run TypeScript compiler to check for type errors.
- `bun run lint`: Run ESLint to check for code style issues.

## 📖 How to Use

1.  **Register/Login**: Create a local account to secure your data.
2.  **Add Items**: Go to "My Items" and add the Surahs/Ayahs you have memorized or are currently learning.
3.  **Daily Review**: Visit the "Daily Review" page every day. The app will present items due for review based on your past performance.
    - Rate your recall: **Again** (Forgot), **Hard**, **Good**, or **Easy**.
    - The algorithm adjusts the next review date based on your rating.
4.  **Juz Focus**: Use the "Juz View" to see a heatmap of your progress. Click "Start Review" on a specific Juz to practice only that section.

## 🤝 Contributing

Contributions are welcome! Please feel free to wait for future updates or open issues if you find bugs.

## 📄 License

This project is open-source. Feel free to use it for your personal Hifz journey.
