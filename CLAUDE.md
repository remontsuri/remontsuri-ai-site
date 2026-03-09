# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PsychoAnalyze AI** — веб-приложение для клинического анализа психологических стенограмм. Анализирует текст интервью для выявления защитных механизмов, типов привязанности и эмоциональных траекторий с помощью ИИ.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Backend**: Express.js (server.js)
- **AI**: Ollama (локальная модель, по умолчанию qwen2.5-coder)
- **Deployment**: Vercel, Render

## Commands

```bash
npm install          # Установить зависимости
npm run dev          # Dev сервер (Vite)
npm run build        # Production сборка
npm run preview      # Preview сборки
npm start            # Запуск production сервера
npm run serve        # Сборка + запуск сервера
```

## Architecture

- **App.tsx** — главный компонент, управляет состоянием анализа, историей, сравнением
- **server.js** — Express сервер с API `/api/chat` для Ollama
- **components/InputSection.tsx** — ввод текста и история
- **components/Dashboard.tsx** — отображение результатов анализа
- **components/ComparisonView.tsx** — сравнение двух анализов
- **services/** — сервисы для работы с API (ollamaService)
- **dist/** — production сборка

## Environment Variables

- `OLLAMA_URL` — URL Ollama (по умолчанию http://localhost:11434)
- `OLLAMA_MODEL` — модель (по умолчанию qwen2.5-coder)
- `PORT` — порт сервера (по умолчанию 3000)
- `GEMINI_API_KEY` — для Google Gemini (если используется)
- `VITE_AI_PROVIDER` — провайдер AI (отображается в футере)

## API Endpoints

- `GET /api/health` — проверка доступности Ollama
- `GET /api/models` — список доступных моделей
- `POST /api/chat` — отправка текста на анализ

## Key Features

- Тёмная/светлая тема с сохранением в localStorage
- История анализов в localStorage
- Сравнение двух анализов
- Прогресс-бар при загрузке
- Оценка результатов пользователем
- Экспорт в PDF/Excel (через jspdf, xlsx, html2canvas)
