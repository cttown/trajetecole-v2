import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`)
  }
  return value
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildAddressQuery(place) {
  return [place.name, place.exact_address, place.postal_code, place.city]
    .filter(Boolean)
    .join(', ')
}

function isValidCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function safeUrlHost(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    const cause = error?.cause
    const causeText = cause
      ? ` | cause: ${cause.code ?? ''} ${cause.message ?? String(cause)}`.trim()
      : ''
    throw new Error(`${error?.message ?? String(error)}${causeText}`)
  } finally {
    clearTimeout(timeout)
  }
}

async function testSupabaseAccess(supabaseUrl, serviceRoleKey) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/places?select=id&limit=1`

  console.log(`Test accès Supabase: ${safeUrlHost(supabaseUrl)}`)

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
    15000
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Supabase répond, mais avec une erreur HTTP ${response.status}: ${text.slice(0, 300)}`
    )
  }

  console.log('OK accès Supabase')
}

async function geocode(query) {
  const url = new URL('https://data.geopf.fr/geocodage/search')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        'User-Agent': 'trajetecole-geocode-places/1.0',
        Accept: 'application/json',
      },
    },
    15000
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Géocodage impossible (${response.status}) pour: ${query} | ${text.slice(0, 300)}`
    )
  }

  const payload = await response.json()
  const feature = payload?.features?.[0]
  const coordinates = feature?.geometry?.coordinates

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null
  }

  const [lng, lat] = coordinates

  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
    return null
  }

  return {
    lat,
    lng,
    label: feature?.properties?.label ?? query,
    score: feature?.properties?.score ?? null,
  }
}

async function main() {
  const projectRoot = process.cwd()
  loadEnvFile(path.join(projectRoot, '.env.local'))
  loadEnvFile(path.join(projectRoot, '.env'))

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  await testSupabaseAccess(supabaseUrl, serviceRoleKey)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabaseAdmin
    .from('places')
    .select('id, name, kind, city, exact_address, postal_code, lat, lng, is_active')
    .eq('is_active', true)
    .order('city', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Erreur lecture Supabase places: ${error.message}`)
  }

  const places = (data ?? []).filter((place) => place.lat == null || place.lng == null)

  console.log(`Lieux actifs sans coordonnées: ${places.length}`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const place of places) {
    const query = buildAddressQuery(place)

    if (!query) {
      console.log(`SKIP ${place.id}: pas assez d'informations`)
      skipped += 1
      continue
    }

    try {
      const result = await geocode(query)

      if (!result) {
        console.log(`AUCUN RÉSULTAT: ${place.name} (${place.city})`)
        skipped += 1
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('places')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', place.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      updated += 1
      console.log(
        `OK ${place.name} (${place.city}) -> ${result.lat}, ${result.lng} | ${result.label}`
      )

      await sleep(200)
    } catch (err) {
      failed += 1
      console.error(
        `ERREUR ${place.name} (${place.city}):`,
        err instanceof Error ? err.message : err
      )
    }
  }

  console.log('\nTerminé')
  console.log(`Mis à jour: ${updated}`)
  console.log(`Ignorés: ${skipped}`)
  console.log(`Erreurs: ${failed}`)
}

main().catch((error) => {
  console.error('\nERREUR FATALE')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})