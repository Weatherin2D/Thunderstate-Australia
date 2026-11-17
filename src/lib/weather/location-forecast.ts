/** BoM location search + forecasts via api.weather.bom.gov.au */

const BOM_API = "https://api.weather.bom.gov.au/v1";
const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type BomLocation = {
  geohash: string;
  id: string;
  name: string;
  state: string;
  postcode: string | null;
  /** 6-char geohash used for hourly + observations. */
  gridGeohash: string;
};

export type BomLocationMeta = BomLocation & {
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type BomRainAmount = {
  min: number | null;
  max: number | null;
  units: string;
};

export type BomDailyForecast = {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  shortText: string;
  extendedText: string;
  icon: string;
  rainUnits: string;
  rainChance: number | null;
  rainChanceOfNoRainCategory: string | null;
  rainMinMm: number | null;
  rainMaxMm: number | null;
  rainAmount25PercentChanceMm: number | null;
  rainAmount50PercentChanceMm: number | null;
  rainAmount75PercentChanceMm: number | null;
  uvCategory: string | null;
  uvMaxIndex: number | null;
  uvStartTime: string | null;
  uvEndTime: string | null;
  sunrise: string | null;
  sunset: string | null;
  fireDanger: string | null;
  fireDangerColour: string | null;
  fireDangerDarkModeColour: string | null;
  surfDanger: string | null;
  surfDangerColour: string | null;
  surfDangerDarkModeColour: string | null;
  nowLabel: string | null;
  laterLabel: string | null;
  tempNow: number | null;
  tempLater: number | null;
  isNight: boolean;
};

export type BomHourlyForecast = {
  time: string;
  temp: number | null;
  tempFeelsLike: number | null;
  dewPoint: number | null;
  icon: string;
  isNight: boolean;
  rainUnits: string;
  rainChance: number | null;
  rainMinMm: number | null;
  rainMaxMm: number | null;
  rainAmount10PercentChanceMm: number | null;
  rainAmount25PercentChanceMm: number | null;
  rainAmount50PercentChanceMm: number | null;
  windKmh: number | null;
  windKnots: number | null;
  windDir: string | null;
  gustKmh: number | null;
  gustKnots: number | null;
  humidity: number | null;
  uv: number | null;
  nextForecastPeriod: string | null;
  nextThreeHourlyForecastPeriod: string | null;
};

export type BomObservation = {
  temp: number | null;
  tempFeelsLike: number | null;
  humidity: number | null;
  windKmh: number | null;
  windKnots: number | null;
  windDir: string | null;
  gustKmh: number | null;
  gustTime: string | null;
  maxGustKmh: number | null;
  maxGustTime: string | null;
  maxTemp: number | null;
  maxTempTime: string | null;
  minTemp: number | null;
  minTempTime: string | null;
  rainSince9am: number | null;
  stationName: string | null;
  stationId: string | null;
  stationDistanceKm: number | null;
  observationTime: string | null;
};

export type LocationForecastPayload = {
  location: BomLocationMeta;
  observation: BomObservation | null;
  daily: BomDailyForecast[];
  hourly: BomHourlyForecast[];
  issueTime: string | null;
  hourlyIssueTime: string | null;
  nextIssueTime: string | null;
  attribution: string;
};

/** State header links → capital city search seed. */
export const STATE_CAPITALS: Record<
  string,
  { name: string; geohash: string; state: string }
> = {
  nsw: { name: "Sydney", geohash: "r3gx2sp", state: "NSW" },
  vic: { name: "Melbourne", geohash: "r1r0fup", state: "VIC" },
  qld: { name: "Brisbane", geohash: "r7hgdmr", state: "QLD" },
  wa: { name: "Perth", geohash: "qd66hrm", state: "WA" },
  sa: { name: "Adelaide", geohash: "r1f93ck", state: "SA" },
  tas: { name: "Hobart", geohash: "r22u080", state: "TAS" },
  nt: { name: "Darwin", geohash: "qvv117s", state: "NT" },
  act: { name: "Canberra", geohash: "r3dp5hh", state: "ACT" },
  australia: { name: "Sydney", geohash: "r3gx2sp", state: "NSW" },
};

/** Ordered capital cities for the national home strip. */
export const CAPITAL_CITIES = [
  STATE_CAPITALS.nsw,
  STATE_CAPITALS.vic,
  STATE_CAPITALS.qld,
  STATE_CAPITALS.wa,
  STATE_CAPITALS.sa,
  STATE_CAPITALS.tas,
  STATE_CAPITALS.act,
  STATE_CAPITALS.nt,
] as const;

export type CapitalSnapshot = {
  city: string;
  state: string;
  geohash: string;
  href: string;
  tempC: number | null;
  wind: string | null;
  condition: string | null;
  icon: string | null;
};

export type LocationSnapshot = {
  location: BomLocationMeta;
  observation: BomObservation | null;
  today: BomDailyForecast | null;
  daily: BomDailyForecast[];
  issueTime: string | null;
};

async function bomGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": FETCH_UA,
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`BoM request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function gridGeohash(geohash: string): string {
  const g = geohash.trim().toLowerCase();
  return g.length >= 6 ? g.slice(0, 6) : g;
}

export function isValidGeohash(geohash: string): boolean {
  return /^[0-9b-hjkmnp-z]{5,12}$/i.test(geohash.trim());
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function dangerDetails(
  value: unknown,
  fallback?: unknown,
): { text: string | null; colour: string | null; darkModeColour: string | null } {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    text:
      str(row.text) ||
      str(row.label) ||
      str(row.category) ||
      str(value) ||
      str(fallback),
    colour: str(row.default_colour),
    darkModeColour: str(row.dark_mode_colour),
  };
}

export async function searchBomLocations(
  query: string,
  limit = 8,
): Promise<BomLocation[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const payload = await bomGet<{
    data?: Array<{
      geohash?: string;
      id?: string;
      name?: string;
      state?: string;
      postcode?: string | null;
    }>;
  }>(`${BOM_API}/locations?search=${encodeURIComponent(q)}`);

  return (payload.data || [])
    .map((row) => {
      const geohash = str(row.geohash);
      if (!geohash) return null;
      return {
        geohash,
        gridGeohash: gridGeohash(geohash),
        id: str(row.id) || geohash,
        name: str(row.name) || geohash,
        state: str(row.state) || "",
        postcode: str(row.postcode),
      } satisfies BomLocation;
    })
    .filter((x): x is BomLocation => x != null)
    .slice(0, limit);
}

export async function fetchBomLocationMeta(
  geohash: string,
): Promise<BomLocationMeta | null> {
  if (!isValidGeohash(geohash)) return null;
  const gh = geohash.trim().toLowerCase();
  try {
    const payload = await bomGet<{
      data?: {
        geohash?: string;
        id?: string;
        name?: string;
        state?: string;
        postcode?: string | null;
        timezone?: string;
        latitude?: number;
        longitude?: number;
      };
    }>(`${BOM_API}/locations/${encodeURIComponent(gh)}`);
    const d = payload.data;
    if (!d?.geohash) return null;
    return {
      geohash: d.geohash,
      gridGeohash: gridGeohash(d.geohash),
      id: str(d.id) || d.geohash,
      name: str(d.name) || d.geohash,
      state: str(d.state) || "",
      postcode: str(d.postcode),
      timezone: str(d.timezone),
      latitude: num(d.latitude),
      longitude: num(d.longitude),
    };
  } catch {
    return null;
  }
}

function mapDaily(row: Record<string, unknown>): BomDailyForecast {
  const rain = (row.rain as Record<string, unknown> | undefined) || {};
  const amount = (rain.amount as Record<string, unknown> | undefined) || {};
  const uv = (row.uv as Record<string, unknown> | undefined) || {};
  const astro =
    (row.astronomical as Record<string, unknown> | undefined) || {};
  const fire =
    (row.fire_danger_category as Record<string, unknown> | undefined) || {};
  const fireDanger = dangerDetails(fire, row.fire_danger);
  const surfDanger = dangerDetails(row.surf_danger);
  const now = (row.now as Record<string, unknown> | undefined) || {};

  return {
    date: String(row.date || ""),
    tempMax: num(row.temp_max),
    tempMin: num(row.temp_min),
    shortText: str(row.short_text) || "",
    extendedText: str(row.extended_text) || "",
    icon: str(row.icon_descriptor) || "mostly_sunny",
    rainUnits: str(amount.units) || str(rain.units) || "mm",
    rainChance: num(rain.chance),
    rainChanceOfNoRainCategory: str(rain.chance_of_no_rain_category),
    rainMinMm: num(amount.min) ?? num(amount.lower_range),
    rainMaxMm: num(amount.max) ?? num(amount.upper_range),
    rainAmount25PercentChanceMm: num(
      rain.precipitation_amount_25_percent_chance,
    ),
    rainAmount50PercentChanceMm: num(
      rain.precipitation_amount_50_percent_chance,
    ),
    rainAmount75PercentChanceMm: num(
      rain.precipitation_amount_75_percent_chance,
    ),
    uvCategory: str(uv.category),
    uvMaxIndex: num(uv.max_index),
    uvStartTime: str(uv.start_time),
    uvEndTime: str(uv.end_time),
    sunrise: str(astro.sunrise_time),
    sunset: str(astro.sunset_time),
    fireDanger: fireDanger.text,
    fireDangerColour: fireDanger.colour,
    fireDangerDarkModeColour: fireDanger.darkModeColour,
    surfDanger: surfDanger.text,
    surfDangerColour: surfDanger.colour,
    surfDangerDarkModeColour: surfDanger.darkModeColour,
    nowLabel: str(now.now_label),
    laterLabel: str(now.later_label),
    tempNow: num(now.temp_now),
    tempLater: num(now.temp_later),
    isNight: Boolean(now.is_night),
  };
}

function mapHourly(row: Record<string, unknown>): BomHourlyForecast {
  const rain = (row.rain as Record<string, unknown> | undefined) || {};
  const amount = (rain.amount as Record<string, unknown> | undefined) || {};
  const wind = (row.wind as Record<string, unknown> | undefined) || {};
  return {
    time: String(row.time || ""),
    temp: num(row.temp),
    tempFeelsLike: num(row.temp_feels_like),
    dewPoint: num(row.dew_point),
    icon: str(row.icon_descriptor) || "mostly_sunny",
    isNight: Boolean(row.is_night),
    rainUnits: str(amount.units) || str(rain.units) || "mm",
    rainChance: num(rain.chance),
    rainMinMm: num(amount.min),
    rainMaxMm: num(amount.max),
    rainAmount10PercentChanceMm: num(
      rain.precipitation_amount_10_percent_chance,
    ),
    rainAmount25PercentChanceMm: num(
      rain.precipitation_amount_25_percent_chance,
    ),
    rainAmount50PercentChanceMm: num(
      rain.precipitation_amount_50_percent_chance,
    ),
    windKmh: num(wind.speed_kilometre),
    windKnots: num(wind.speed_knot),
    windDir: str(wind.direction),
    gustKmh: num(wind.gust_speed_kilometre),
    gustKnots: num(wind.gust_speed_knot),
    humidity: num(row.relative_humidity),
    uv: num(row.uv),
    nextForecastPeriod: str(row.next_forecast_period),
    nextThreeHourlyForecastPeriod: str(row.next_three_hourly_forecast_period),
  };
}

function measure(
  value: unknown,
): { value: number | null; time: string | null } {
  if (typeof value === "number") return { value: num(value), time: null };
  if (!value || typeof value !== "object") {
    return { value: null, time: null };
  }
  const row = value as Record<string, unknown>;
  return {
    value: num(row.value) ?? num(row.speed_kilometre),
    time: str(row.time),
  };
}

function mapObservation(
  data: Record<string, unknown> | null | undefined,
  observationTime: string | null,
): BomObservation | null {
  if (!data) return null;
  const wind = (data.wind as Record<string, unknown> | undefined) || {};
  const station = (data.station as Record<string, unknown> | undefined) || {};
  const gust = measure(data.gust);
  const maxGust = measure(data.max_gust);
  const maxTemp = measure(data.max_temp);
  const minTemp = measure(data.min_temp);
  const stationDistance = num(station.distance);
  return {
    temp: num(data.temp),
    tempFeelsLike: num(data.temp_feels_like),
    humidity: num(data.humidity),
    windKmh: num(wind.speed_kilometre),
    windKnots: num(wind.speed_knot),
    windDir: str(wind.direction),
    gustKmh: gust.value,
    gustTime: gust.time,
    maxGustKmh: maxGust.value,
    maxGustTime: maxGust.time,
    maxTemp: maxTemp.value,
    maxTempTime: maxTemp.time,
    minTemp: minTemp.value,
    minTempTime: minTemp.time,
    rainSince9am: num(data.rain_since_9am),
    stationName: str(station.name),
    stationId: str(station.bom_id),
    stationDistanceKm:
      stationDistance != null ? stationDistance / 1000 : null,
    observationTime,
  };
}

export async function fetchLocationForecast(
  geohash: string,
): Promise<LocationForecastPayload | null> {
  if (!isValidGeohash(geohash)) return null;
  const gh = geohash.trim().toLowerCase();
  const grid = gridGeohash(gh);

  const location =
    (await fetchBomLocationMeta(gh)) ||
    (await fetchBomLocationMeta(grid));
  if (!location) return null;

  const [dailyRes, hourlyRes, obsRes] = await Promise.allSettled([
    bomGet<{
      data?: Record<string, unknown>[];
      metadata?: { issue_time?: string; next_issue_time?: string };
    }>(
      `${BOM_API}/locations/${encodeURIComponent(location.geohash)}/forecasts/daily`,
    ),
    bomGet<{
      data?: Record<string, unknown>[];
      metadata?: { issue_time?: string };
    }>(
      `${BOM_API}/locations/${encodeURIComponent(grid)}/forecasts/hourly`,
    ),
    bomGet<{
      data?: Record<string, unknown>;
      metadata?: { observation_time?: string; issue_time?: string };
    }>(`${BOM_API}/locations/${encodeURIComponent(grid)}/observations`),
  ]);

  const dailyPayload =
    dailyRes.status === "fulfilled" ? dailyRes.value : null;
  const hourlyPayload =
    hourlyRes.status === "fulfilled" ? hourlyRes.value : null;
  const obsPayload = obsRes.status === "fulfilled" ? obsRes.value : null;

  const daily = (dailyPayload?.data || []).map(mapDaily);
  const hourly = (hourlyPayload?.data || []).map(mapHourly).slice(0, 48);
  const observation = mapObservation(
    obsPayload?.data,
    str(obsPayload?.metadata?.observation_time) ||
      str(obsPayload?.metadata?.issue_time),
  );

  if (daily.length === 0 && hourly.length === 0 && !observation) {
    return null;
  }

  return {
    location,
    observation,
    daily,
    hourly,
    issueTime: str(dailyPayload?.metadata?.issue_time),
    hourlyIssueTime: str(hourlyPayload?.metadata?.issue_time),
    nextIssueTime: str(dailyPayload?.metadata?.next_issue_time),
    attribution: "Bureau of Meteorology",
  };
}

/** Lighter fetch for home panels — daily + obs, no hourly. */
export async function fetchLocationSnapshot(
  geohash: string,
): Promise<LocationSnapshot | null> {
  if (!isValidGeohash(geohash)) return null;
  const gh = geohash.trim().toLowerCase();
  const grid = gridGeohash(gh);

  const location =
    (await fetchBomLocationMeta(gh)) ||
    (await fetchBomLocationMeta(grid));
  if (!location) return null;

  const [dailyRes, obsRes] = await Promise.allSettled([
    bomGet<{ data?: Record<string, unknown>[]; metadata?: { issue_time?: string } }>(
      `${BOM_API}/locations/${encodeURIComponent(location.geohash)}/forecasts/daily`,
    ),
    bomGet<{
      data?: Record<string, unknown>;
      metadata?: { observation_time?: string; issue_time?: string };
    }>(`${BOM_API}/locations/${encodeURIComponent(grid)}/observations`),
  ]);

  const dailyPayload =
    dailyRes.status === "fulfilled" ? dailyRes.value : null;
  const obsPayload = obsRes.status === "fulfilled" ? obsRes.value : null;
  const daily = (dailyPayload?.data || []).map(mapDaily);
  const observation = mapObservation(
    obsPayload?.data,
    str(obsPayload?.metadata?.observation_time) ||
      str(obsPayload?.metadata?.issue_time),
  );

  if (daily.length === 0 && !observation) return null;

  return {
    location,
    observation,
    today: daily[0] ?? null,
    daily,
    issueTime: str(dailyPayload?.metadata?.issue_time),
  };
}

export async function fetchCapitalSnapshots(): Promise<CapitalSnapshot[]> {
  const rows = await Promise.all(
    CAPITAL_CITIES.map(async (cap) => {
      try {
        const snap = await fetchLocationSnapshot(cap.geohash);
        const today = snap?.today;
        const obs = snap?.observation;
        const wind =
          obs?.windKmh != null
            ? `${obs.windDir || ""} ${Math.round(obs.windKmh)}`.trim()
            : null;
        return {
          city: cap.name,
          state: cap.state,
          geohash: cap.geohash,
          href: `/forecast/${cap.geohash}`,
          tempC:
            obs?.temp != null
              ? Math.round(obs.temp)
              : today?.tempNow != null
                ? Math.round(today.tempNow)
                : today?.tempMax ?? null,
          wind,
          condition: today?.shortText?.replace(/\.$/, "") || null,
          icon: today?.icon || null,
        } satisfies CapitalSnapshot;
      } catch {
        return {
          city: cap.name,
          state: cap.state,
          geohash: cap.geohash,
          href: `/forecast/${cap.geohash}`,
          tempC: null,
          wind: null,
          condition: null,
          icon: null,
        } satisfies CapitalSnapshot;
      }
    }),
  );
  return rows;
}

export function formatDateHeading(
  timeZone = "Australia/Sydney",
  when: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(when);
}

export function formatClockLabel(
  iso: string | null,
  timeZone = "Australia/Sydney",
): string {
  if (!iso) {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(new Date());
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(d);
}

export function formatForecastDay(
  iso: string,
  timeZone = "Australia/Sydney",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatForecastHour(
  iso: string,
  timeZone = "Australia/Sydney",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    hour12: true,
  }).format(d);
}

export function formatClock(
  iso: string | null,
  timeZone = "Australia/Sydney",
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function rainLabel(
  chance: number | null,
  minMm: number | null,
  maxMm: number | null,
  units = "mm",
): string {
  if (chance == null) return "—";
  if (chance <= 0) return "0%";
  const amount =
    maxMm != null && maxMm > 0
      ? ` · ${minMm ?? 0}–${maxMm} ${units}`
      : minMm != null && minMm > 0
        ? ` · ${minMm} ${units}`
        : "";
  return `${chance}%${amount}`;
}

export function iconLabel(icon: string): string {
  return icon
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
