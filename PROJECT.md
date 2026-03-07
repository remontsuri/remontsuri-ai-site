# PsychoAnalyze AI - Проект

## Что это
Веб-приложение для психологического анализа транскриптов интервью с использованием AI (Ollama).

## URLs
- **Сайт:** https://ai-sepia-seven.vercel.app
- **GitHub:** https://github.com/remontsuri/remontsuri-ai-site
- **Туннель:** https://roisterously-woodier-karren.ngrok-free.dev (ngrok)

## Архитектура
- Frontend: React + TypeScript + Vite + Tailwind CSS
- API: Vercel Serverless Functions (api/analyze.ts)
- AI: Ollama через ngrok туннель (deepseek-v3.1:671b-cloud)

## Проблемы
1. **CORS** - запросы идут через /api/analyze прокси
2. **Туннель** - может переподключаться, нужно проверять
3. **Модель** - deepseek-v3.1:671b-cloud иногда глючит с JSON

## Команды
- `vercel --prod --yes` - деплой
- `npm run dev` - локально

## Файлы
- api/analyze.ts - Vercel API прокси
- services/geminiService.ts - вызов AI
- components/ - React компоненты
