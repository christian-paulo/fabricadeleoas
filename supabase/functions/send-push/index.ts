import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Web Push implementation using Web Crypto API
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string, vapidPrivateKey: string, vapidPublicKey: string) {
  const encoder = new TextEncoder()

  // Import VAPID private key
  const rawPrivateKey = base64urlToUint8Array(vapidPrivateKey)
  const rawPublicKey = base64urlToUint8Array(vapidPublicKey)

  // Create JWT for VAPID
  const vapidToken = await createVapidJwt(subscription.endpoint, rawPrivateKey, rawPublicKey)

  // Encrypt the payload
  const encrypted = await encryptPayload(subscription, payload)

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `vapid t=${vapidToken.token},k=${vapidToken.publicKey}`,
      'Content-Length': String(encrypted.byteLength),
    },
    body: encrypted,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Push failed [${response.status}]: ${body}`)
  }

  return response
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = ''
  for (const byte of arr) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function createVapidJwt(endpoint: string, privateKeyRaw: Uint8Array, publicKeyRaw: Uint8Array) {
  const audience = new URL(endpoint).origin
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60

  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: expiration,
    sub: 'mailto:contato@fabricadeleoas.com',
  }

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: uint8ArrayToBase64url(publicKeyRaw.slice(1, 33)),
      y: uint8ArrayToBase64url(publicKeyRaw.slice(33, 65)),
      d: uint8ArrayToBase64url(privateKeyRaw),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  )

  // Convert DER signature to raw r||s
  const sigArray = new Uint8Array(signature)
  const rawSig = derToRaw(sigArray)

  const token = `${unsignedToken}.${uint8ArrayToBase64url(new Uint8Array(rawSig))}`

  return {
    token,
    publicKey: uint8ArrayToBase64url(publicKeyRaw),
  }
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (der.length === 64) return der

  // DER format: 0x30 len 0x02 rLen r 0x02 sLen s
  const raw = new Uint8Array(64)
  let offset = 2 // skip 0x30 and total length
  
  // r
  if (der[offset] !== 0x02) return der // not DER
  offset++
  const rLen = der[offset++]
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset
  const rDest = rLen < 32 ? 32 - rLen : 0
  raw.set(der.slice(rStart, offset + rLen), rDest)
  offset += rLen

  // s
  if (der[offset] !== 0x02) return der
  offset++
  const sLen = der[offset++]
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset
  const sDest = sLen < 32 ? 64 - sLen : 32
  raw.set(der.slice(sStart, offset + sLen), sDest)

  return raw
}

async function encryptPayload(sub: { p256dh: string; auth: string }, payload: string) {
  const clientPublicKey = base64urlToUint8Array(sub.p256dh)
  const clientAuth = base64urlToUint8Array(sub.auth)

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  )

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      localKeyPair.privateKey,
      256
    )
  )

  const encoder = new TextEncoder()

  // HKDF for auth
  const authInfo = encoder.encode('WebPush: info\0')
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKey.length + localPublicKeyRaw.length)
  authInfoFull.set(authInfo)
  authInfoFull.set(clientPublicKey, authInfo.length)
  authInfoFull.set(localPublicKeyRaw, authInfo.length + clientPublicKey.length)

  const ikm = await hkdf(clientAuth, sharedSecret, authInfoFull, 32)

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Content encryption key
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0')
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16)

  // Nonce
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0')
  const nonce = await hkdf(salt, ikm, nonceInfo, 12)

  // Encrypt
  const paddedPayload = new Uint8Array(encoder.encode(payload).length + 1)
  paddedPayload.set(encoder.encode(payload))
  paddedPayload[paddedPayload.length - 1] = 2 // delimiter

  const key = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', false, ['encrypt'])
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, paddedPayload)
  )

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = 4096
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length + encrypted.length)
  header.set(salt)
  header[16] = (rs >> 24) & 0xff
  header[17] = (rs >> 16) & 0xff
  header[18] = (rs >> 8) & 0xff
  header[19] = rs & 0xff
  header[20] = localPublicKeyRaw.length
  header.set(localPublicKeyRaw, 21)
  header.set(encrypted, 21 + localPublicKeyRaw.length)

  return header
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  // Extract
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm))

  // Expand
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const infoWithCounter = new Uint8Array(info.length + 1)
  infoWithCounter.set(info)
  infoWithCounter[info.length] = 1
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter))

  return result.slice(0, length)
}

// This function is called internally by the trial-notifications cron
// or by the post-workout trigger
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller: service role OR authenticated user
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const isServiceRole = authHeader?.includes(serviceRoleKey)

    let callerUserId: string | null = null
    if (!isServiceRole) {
      // Verify JWT for authenticated user calls
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader || '' } } }
      )
      const { data: { user } } = await anonClient.auth.getUser()
      if (!user) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      callerUserId = user.id
    }

    const { profile_id, title, body, message_key, trial_day } = await req.json()
    if (!profile_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check max 2 pushes per day
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase.from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile_id)
      .eq('date', today)
    
    if ((count || 0) >= 2) {
      return new Response(JSON.stringify({ skipped: true, reason: 'max_daily_limit' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if this exact message was already sent today
    if (message_key) {
      const { count: existing } = await supabase.from('notification_log')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile_id)
        .eq('message_key', message_key)
        .eq('date', today)
      
      if ((existing || 0) > 0) {
        return new Response(JSON.stringify({ skipped: true, reason: 'already_sent' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Get push subscriptions
    const { data: subs } = await supabase.from('push_subscriptions')
      .select('*')
      .eq('profile_id', profile_id)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_subscription' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const vapidPublicKey = 'BFhFpj1YIfrATG_wnPe-k3LyFqUmgQmI2xFiCPn1qc_EIWUtw84_irWSu8druPWaEOP2i7gnBoOMwXDPA0rG8nU'

    const payload = JSON.stringify({ title, body })
    let sent = 0

    for (const sub of subs) {
      try {
        await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPrivateKey,
          vapidPublicKey
        )
        sent++
      } catch (err) {
        console.error(`Push failed for ${sub.endpoint}: ${err.message}`)
        // Remove invalid subscriptions (410 Gone)
        if (err.message.includes('410')) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    // Log notification
    await supabase.from('notification_log').insert({
      profile_id,
      trial_day: trial_day || 0,
      message_key: message_key || 'manual',
      date: today,
    })

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
