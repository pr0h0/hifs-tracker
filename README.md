# Hifz Tracker - Quran Memorization App

A modern, efficient tool designed to help you track your Quran memorization (Hifz) progress and retain what you've learned using spaced repetition.

## 🌟 Features

- **Smart Review System**: Uses the SM-2 spaced repetition algorithm to schedule reviews at the optimal time, ensuring you never forget what you've memorized.
- **Progress Tracking**: Visualize your progress across the entire Quran with the "Juz View". See which Juz you are strong in and which need attention.
- **Flexible Queues**:
  - **Daily Log**: Items due for review today.
  - **Learning**: New items you are currently memorizing.
  - **Juz Review**: Focus on specific Juz when you want to strengthen a particular section.
- **Quran Coverage**: See exactly how many of the 6,236 ayahs you've memorized, overall and per Juz.
- **Backup & Restore**: Export to JSON and import again, including your spaced-repetition schedule.
- **Accounts & Sync**: Sign in from any device; progress is stored in Cloudflare D1.

Live: https://hifz-tracker.pages.dev

## 🚀 Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) static export, [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **API**: one Cloudflare Pages Function (`functions/api/[[path]].ts`, handlers in `server/`)
- **Database**: Cloudflare D1 (SQLite), schema in `schema.sql`
- **Auth**: PBKDF2-SHA256 passwords, hashed session tokens in an HttpOnly cookie, D1-backed login throttle

## 🛠️ Getting Started

Needs [Bun](https://bun.sh/) (or npm) and Node.js 20.9+.

```bash
bun install
bun run db:local   # create the local D1 schema (once)
bun run dev        # http://localhost:3000; next dev proxies /api to wrangler pages dev on :8788
```

To test the production build locally: `bun run build && npx wrangler pages dev out`.

### Deploy

Needs `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`) in the environment.

```bash
bun run db:remote  # apply schema.sql to the remote D1 (safe to re-run)
bun run deploy     # build + wrangler pages deploy
```

### Development Commands

- `bun run check-types`: Run TypeScript compiler to check for type errors.
- `bun run lint`: Run ESLint to check for code style issues.
- `bun run test`: Run the Juz/ayah coverage and SM-2 self-checks.

## 📖 How to Use

1.  **Register/Login**: Create an account; your data syncs across devices.
2.  **Add Items**: Go to "My Items" and add the Surahs/Ayahs you have memorized or are currently learning.
3.  **Daily Review**: Visit the "Daily Review" page every day. The app will present items due for review based on your past performance.
    - Rate your recall: **Again** (Forgot), **Hard**, **Good**, or **Easy**.
    - The algorithm adjusts the next review date based on your rating.
4.  **Juz Focus**: Use the "Juz View" to see a heatmap of your progress. Click "Start Review" on a specific Juz to practice only that section.

## 🤝 Contributing

Contributions are welcome! Please feel free to wait for future updates or open issues if you find bugs.

## 📄 License

This project is open-source. Feel free to use it for your personal Hifz journey.
