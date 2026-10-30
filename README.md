# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

----------------

Weather & Air Quality Dashboard

A small React app that shows current conditions, a 7-day forecast and air quality for any city, or for your current location. The page colours and background change with the weather.

Built with React and Vite. Data comes from Open-Meteo, which is free and needs no API key.

Features
Search for any city by name, or use browser geolocation

Current temperature, feels-like, wind speed and humidity

7-day forecast with high/low temperatures and chance of rain

Air quality (US AQI, PM2.5, PM10) with a colour-coded rating

Theme that changes with conditions: clear, cloudy, fog, rain, storm, snow, and night

Last 5 searches saved in localStorage, and the most recent one reopens on load

Loading and error states, including "city not found" and "location denied"


TO RUN on VS--
bash
npm run dev


APIs used
Geocoding: https://geocoding-api.open-meteo.com/v1/search
Forecast: https://api.open-meteo.com/v1/forecast
Air quality: https://air-quality-api.open-meteo.com/v1/air-quality