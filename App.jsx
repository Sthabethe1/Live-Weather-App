import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";

/* ---------- Constants & helpers ---------- */

const RECENT_KEY = "wx.recent";
const MAX_RECENT = 5;

// WMO weather codes -> labels, icons, theme
const WMO = {
  0: ["Clear sky", "☀️", "clear"],
  1: ["Mostly clear", "🌤️", "clear"],
  2: ["Partly cloudy", "⛅", "cloudy"],
  3: ["Overcast", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "fog"],
  48: ["Freezing fog", "🌫️", "fog"],
  51: ["Light drizzle", "🌦️", "rain"],
  53: ["Drizzle", "🌦️", "rain"],
  55: ["Heavy drizzle", "🌧️", "rain"],
  61: ["Light rain", "🌧️", "rain"],
  63: ["Rain", "🌧️", "rain"],
  65: ["Heavy rain", "🌧️", "rain"],
  66: ["Freezing rain", "🌧️", "snow"],
  67: ["Freezing rain", "🌧️", "snow"],
  71: ["Light snow", "🌨️", "snow"],
  73: ["Snow", "🌨️", "snow"],
  75: ["Heavy snow", "❄️", "snow"],
  77: ["Snow grains", "❄️", "snow"],
  80: ["Light showers", "🌦️", "rain"],
  81: ["Showers", "🌧️", "rain"],
  82: ["Violent showers", "⛈️", "storm"],
  85: ["Snow showers", "🌨️", "snow"],
  86: ["Heavy snow showers", "❄️", "snow"],
  95: ["Thunderstorm", "⛈️", "storm"],
  96: ["Thunderstorm with hail", "⛈️", "storm"],
  99: ["Severe thunderstorm", "⛈️", "storm"],
};

function describe(code, isDay = 1) {
  const [label, icon, theme] = WMO[code] ?? ["Unknown", "❔", "cloudy"];
  const nightIcon = !isDay && (code === 0 || code === 1) ? "🌙" : icon;
  return { label, icon: nightIcon, theme: !isDay && theme === "clear" ? "night" : theme };
}

function aqiBand(aqi) {
  if (aqi == null) return { label: "No data", tone: "none" };
  if (aqi <= 50) return { label: "Good", tone: "good" };
  if (aqi <= 100) return { label: "Moderate", tone: "moderate" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", tone: "sensitive" };
  if (aqi <= 200) return { label: "Unhealthy", tone: "unhealthy" };
  if (aqi <= 300) return { label: "Very unhealthy", tone: "very" };
  return { label: "Hazardous", tone: "hazard" };
}

function loadRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Recent searches simply persististance is limited by storage availablity.
  }
}

function dayLabel(dateStr, i) {
  if (i === 0) return "Today";
  return new Date(`${dateStr}T00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

/* ---------- API calls ---------- */

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function geocode(query, signal) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=5&language=en&format=json`;
  const data = await getJson(url, signal);
  const results = data.results ?? [];
  if (!results.length) {
    throw new Error(`No city found for "${query}". Check the spelling or try a nearby city.`);
  }

  return results.map((hit) => ({
    label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(", "),
    latitude: hit.latitude,
    longitude: hit.longitude,
    countryCode: hit.country_code,
    population: hit.population,
    timezone: hit.timezone,
  }));
}

async function fetchConditions(
  { latitude, longitude },
  signal,
  { temperatureUnit, windSpeedUnit }
) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}` +
    `&timezone=auto&forecast_days=7`;
  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&current=us_aqi,pm2_5,pm10&timezone=auto`;

  const [weather, air] = await Promise.allSettled([
    getJson(weatherUrl, signal),
    getJson(airUrl, signal),
  ]);
  if (weather.status === "rejected") throw weather.reason;
  return { weather: weather.value, air: air.status === "fulfilled" ? air.value : null };
}

/* ---------- Components ---------- */

function SearchBar({ onSearch, onLocate, disabled }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) onSearch(text.trim());
  };

  return (
    <form className="search" onSubmit={submit}>
      <div className="search-row">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search for a city"
          aria-label="City name"
        />
        <button type="submit" disabled={disabled || !text.trim()}>
          Search
        </button>
        <button type="button" className="ghost" onClick={onLocate} disabled={disabled}>
          Use my location
        </button>
      </div>
    </form>
  );
}

function UnitControls({ temperatureUnit, windSpeedUnit, onTemperatureChange, onWindChange }) {
  return (
    <div className="unit-controls" aria-label="Display units">
      <div className="unit-group" aria-label="Temperature units">
        <button
          type="button"
          className={temperatureUnit === "celsius" ? "unit-active" : "ghost"}
          aria-pressed={temperatureUnit === "celsius"}
          onClick={() => onTemperatureChange("celsius")}
        >
          °C
        </button>
        <button
          type="button"
          className={temperatureUnit === "fahrenheit" ? "unit-active" : "ghost"}
          aria-pressed={temperatureUnit === "fahrenheit"}
          onClick={() => onTemperatureChange("fahrenheit")}
        >
          °F
        </button>
      </div>
      <div className="unit-group" aria-label="Wind speed units">
        <button
          type="button"
          className={windSpeedUnit === "kmh" ? "unit-active" : "ghost"}
          aria-pressed={windSpeedUnit === "kmh"}
          onClick={() => onWindChange("kmh")}
        >
          km/h
        </button>
        <button
          type="button"
          className={windSpeedUnit === "mph" ? "unit-active" : "ghost"}
          aria-pressed={windSpeedUnit === "mph"}
          onClick={() => onWindChange("mph")}
        >
          mph
        </button>
      </div>
    </div>
  );
}

function PlaceChoices({ places, onChoose, onCancel }) {
  if (!places.length) return null;
  return (
    <section className="place-choices" aria-labelledby="place-choices-title">
      <h2 id="place-choices-title">Several places match. Which one did you mean?</h2>
      <ul>
        {places.map((candidate) => (
          <li key={`${candidate.latitude},${candidate.longitude}`}>
            <button type="button" className="place-choice" onClick={() => onChoose(candidate)}>
              <span>{candidate.label}</span>
              {candidate.population != null && (
                <small>Population: {candidate.population.toLocaleString()}</small>
              )}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="ghost cancel-choice" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}

function Recents({ items, onPick }) {
  if (!items.length) return null;
  return (
    <ul className="recents" aria-label="Recent searches">
      {items.map((p) => (
        <li key={p.label}>
          <button className="chip" onClick={() => onPick(p)}>
            {p.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Current({ place, current, today, temperatureUnit, windSpeedUnit }) {
  const { label, icon } = describe(current.weather_code, current.is_day);
  const tempSymbol = temperatureUnit === "celsius" ? "°C" : "°F";
  const windSymbol = windSpeedUnit === "kmh" ? "km/h" : "mph";

  return (
    <section className="current" aria-live="polite">
      <div className="current-main">
        <p className="place">{place.label}</p>
        <p className="temp">
          {Math.round(current.temperature_2m)}
          <span>{tempSymbol}</span>
        </p>
        <p className="condition">
          <span aria-hidden="true">{icon}</span> {label}
        </p>
        <p className="range">
          High {Math.round(today.max)}° · Low {Math.round(today.min)}°
        </p>
      </div>
      <dl className="stats">
        <div>
          <dt>Feels like</dt>
          <dd>{Math.round(current.apparent_temperature)}{tempSymbol}</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{Math.round(current.wind_speed_10m)} {windSymbol}</dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{current.relative_humidity_2m}%</dd>
        </div>
      </dl>
    </section>
  );
}

function AirQuality({ air }) {
  if (!air) {
    return (
      <section className="panel air">
        <h2>Air quality</h2>
        <p className="muted">Air quality data isn't available for this location right now.</p>
      </section>
    );
  }
  const { us_aqi, pm2_5, pm10 } = air.current;
  const band = aqiBand(us_aqi);
  return (
    <section className="panel air">
      <h2>Air quality</h2>
      <div className="aqi-row">
        <span className={`aqi-badge ${band.tone}`}>{us_aqi ?? "–"}</span>
        <div>
          <p className="aqi-label">{band.label}</p>
          <p className="muted">
            PM2.5 {pm2_5 ?? "–"} µg/m³ · PM10 {pm10 ?? "–"} µg/m³
          </p>
        </div>
      </div>
    </section>
  );
}

function Forecast({ daily }) {
  return (
    <section className="panel">
      <h2>7-day forecast</h2>
      <ol className="forecast">
        {daily.time.map((date, i) => {
          const { label, icon } = describe(daily.weather_code[i]);
          return (
            <li key={date}>
              <span className="fday">{dayLabel(date, i)}</span>
              <span className="ficon" title={label} role="img" aria-label={label}>
                {icon}
              </span>
              <span className="frain">{daily.precipitation_probability_max[i] ?? 0}%</span>
              <span className="ftemps">
                {Math.round(daily.temperature_2m_max[i])}°
                <span className="muted"> {Math.round(daily.temperature_2m_min[i])}°</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- App Section---------- */

export default function App() {
  const [recent, setRecent] = useState(loadRecent);
  const [place, setPlace] = useState(null);
  const [data, setData] = useState(null);
  const [pendingPlaces, setPendingPlaces] = useState([]);
  const [temperatureUnit, setTemperatureUnit] = useState("celsius");
  const [windSpeedUnit, setWindSpeedUnit] = useState("kmh");
  const [status, setStatus] = useState("idle"); // idle | loading | choosing | error | ready
  const [error, setError] = useState("");
  const controller = useRef(null);

  const remember = useCallback((p) => {
    setRecent((prev) => {
      const next = [p, ...prev.filter((r) => r.label !== p.label)].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  // Accept a typed city, a selected geocoding result, or a previously saved place.
  const load = useCallback(
    async (input, units = { temperatureUnit, windSpeedUnit }) => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      setPendingPlaces([]);
      setStatus("loading");
      setError("");
      try {
        let resolved = input;
        if (typeof input === "string") {
          const matches = await geocode(input, ctrl.signal);
          if (matches.length > 1) {
            setPendingPlaces(matches);
            setStatus("choosing");
            return;
          }
          [resolved] = matches;
        }

        const result = await fetchConditions(resolved, ctrl.signal, units);
        setPlace(resolved);
        setData(result);
        setStatus("ready");
        if (!resolved.isGeolocated) remember(resolved);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Something went wrong. Check your connection and try again.");
        setStatus("error");
      }
    },
    [remember, temperatureUnit, windSpeedUnit]
  );

  const changeTemperatureUnit = (nextUnit) => {
    setTemperatureUnit(nextUnit);
    if (place && nextUnit !== temperatureUnit) {
      load(place, { temperatureUnit: nextUnit, windSpeedUnit });
    }
  };

  const changeWindSpeedUnit = (nextUnit) => {
    setWindSpeedUnit(nextUnit);
    if (place && nextUnit !== windSpeedUnit) {
      load(place, { temperatureUnit, windSpeedUnit: nextUnit });
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location. Search for a city instead.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setPendingPlaces([]);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        load({
          label: "Your location",
          latitude: coords.latitude,
          longitude: coords.longitude,
          isGeolocated: true,
        }),
      () => {
        setError("Location access was denied. Allow it in your browser settings, or search for a city.");
        setStatus("error");
      }
    );
  };

  useEffect(() => {
    if (recent[0]) load(recent[0]);
    return () => controller.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = data?.weather.current;
  const theme = current ? describe(current.weather_code, current.is_day).theme : "idle";
  const daily = data?.weather.daily;

  return (
    <div className="app" data-theme={theme}>
      <main>
        <header className="app-header">
          <h1>Weather &amp; air</h1>
          <UnitControls
            temperatureUnit={temperatureUnit}
            windSpeedUnit={windSpeedUnit}
            onTemperatureChange={changeTemperatureUnit}
            onWindChange={changeWindSpeedUnit}
          />
        </header>

        <SearchBar onSearch={load} onLocate={locate} disabled={status === "loading"} />
        <Recents items={recent} onPick={load} />

        {status === "idle" && (
          <p className="empty">Search for a city or use your location to see current conditions and the week ahead.</p>
        )}
        {status === "loading" && <p className="loading">Loading conditions…</p>}
        {status === "choosing" && (
          <PlaceChoices
            places={pendingPlaces}
            onChoose={load}
            onCancel={() => {
              setPendingPlaces([]);
              setStatus(data ? "ready" : "idle");
            }}
          />
        )}
        {status === "error" && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {status === "ready" && data && (
          <>
            <Current
              place={place}
              current={current}
              today={{ max: daily.temperature_2m_max[0], min: daily.temperature_2m_min[0] }}
              temperatureUnit={temperatureUnit}
              windSpeedUnit={windSpeedUnit}
            />
            <div className="grid">
              <Forecast daily={daily} />
              <AirQuality air={data.air} />
            </div>
          </>
        )}

        <footer>
          Data from <a href="https://open-meteo.com/">Open-Meteo</a>
        </footer>
      </main>
    </div>
  );
}
