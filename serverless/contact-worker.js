/**
 * SmartDev contact relay — Cloudflare Worker forwarding the portfolio contact form to Mailjet.
 *
 * Required secrets (wrangler secret put): MAILJET_API_KEY, MAILJET_API_SECRET.
 * Required variables (wrangler.toml [vars]): ALLOWED_ORIGIN, CONTACT_RECIPIENT, SENDER_EMAIL.
 * Optional binding: CONTACT_RATE_LIMITER (Workers rate limiting API).
 */

const MAILJET_SEND_ENDPOINT = "https://api.mailjet.com/v3.1/send";
const MAXIMUM_BODY_BYTES = 10000;
const MINIMUM_FILL_DURATION_MILLISECONDS = 3000;
const ALLOWED_PROJECT_TYPES = new Set(["Site vitrine", "E-commerce", "Application web", "Forum / communauté", "Audit & refonte", "Autre"]);
const FIELD_LENGTH_LIMITS = { name: [2, 80], email: [6, 120], message: [20, 3000] };
const EMAIL_PATTERN = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

/**
 * Builds the CORS headers granted to the configured portfolio origin only.
 */
function buildCorsHeaders(environment) {
  return {
    "Access-Control-Allow-Origin": environment.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

/**
 * Returns a JSON response carrying the CORS and hardening headers.
 */
function createJsonResponse(environment, statusCode, payload) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      ...buildCorsHeaders(environment),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

/**
 * Removes control characters and surrounding whitespace from a submitted value.
 */
function sanitizeSingleLine(rawValue) {
  return String(rawValue ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeMultiline(rawValue) {
  return String(rawValue ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim();
}

/**
 * Validates and normalizes the submitted contact request; returns null when it is not acceptable.
 */
function validateContactRequest(requestPayload) {
  if (typeof requestPayload !== "object" || requestPayload === null) return null;
  const contactRequest = {
    name: sanitizeSingleLine(requestPayload.name),
    email: sanitizeSingleLine(requestPayload.email).toLowerCase(),
    projectType: sanitizeSingleLine(requestPayload.projectType),
    message: sanitizeMultiline(requestPayload.message)
  };
  const hasValidLengths = Object.entries(FIELD_LENGTH_LIMITS).every(([fieldName, [minimumLength, maximumLength]]) => {
    return contactRequest[fieldName].length >= minimumLength && contactRequest[fieldName].length <= maximumLength;
  });
  if (!hasValidLengths) return null;
  if (!EMAIL_PATTERN.test(contactRequest.email)) return null;
  if (!ALLOWED_PROJECT_TYPES.has(contactRequest.projectType)) return null;
  return contactRequest;
}

/**
 * Returns true when the request looks automated (honeypot filled or form submitted too fast).
 */
function isLikelyAutomated(requestPayload) {
  const isHoneypotFilled = sanitizeSingleLine(requestPayload.website) !== "";
  const fillDuration = Number(requestPayload.elapsedMilliseconds);
  return isHoneypotFilled || !Number.isFinite(fillDuration) || fillDuration < MINIMUM_FILL_DURATION_MILLISECONDS;
}

/**
 * Sends the validated request through the Mailjet Send API v3.1 as a plain-text email;
 * resolves to false when Mailjet is unreachable, rejects the message or answers with an unexpected body.
 */
async function sendWithMailjet(environment, contactRequest) {
  try {
    return await requestMailjetDelivery(environment, contactRequest);
  } catch {
    return false;
  }
}

async function requestMailjetDelivery(environment, contactRequest) {
  const basicCredentials = btoa(`${environment.MAILJET_API_KEY}:${environment.MAILJET_API_SECRET}`);
  const mailjetResponse = await fetch(MAILJET_SEND_ENDPOINT, {
    method: "POST",
    headers: { "Authorization": `Basic ${basicCredentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      Messages: [{
        From: { Email: environment.SENDER_EMAIL, Name: "Formulaire SmartDev" },
        To: [{ Email: environment.CONTACT_RECIPIENT, Name: "Samuel Martin" }],
        ReplyTo: { Email: contactRequest.email, Name: contactRequest.name },
        Subject: `[${contactRequest.projectType}] Demande de ${contactRequest.name}`,
        TextPart: `Nom : ${contactRequest.name}\nE-mail : ${contactRequest.email}\nType de projet : ${contactRequest.projectType}\n\n${contactRequest.message}`
      }]
    })
  });
  if (!mailjetResponse.ok) return false;
  const mailjetResult = await mailjetResponse.json();
  return mailjetResult?.Messages?.[0]?.Status === "success";
}

/**
 * Checks the optional rate limiter binding for the client address; when the binding is missing
 * or unavailable the request is allowed, the honeypot and fill-time checks still filtering bots.
 */
async function isWithinRateLimit(request, environment) {
  if (!environment.CONTACT_RATE_LIMITER) return true;
  const clientAddress = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    const { success: isAllowed } = await environment.CONTACT_RATE_LIMITER.limit({ key: clientAddress });
    return isAllowed;
  } catch {
    return true;
  }
}

export default {
  async fetch(request, environment) {
    const requestOrigin = request.headers.get("Origin");
    if (requestOrigin !== environment.ALLOWED_ORIGIN) return createJsonResponse(environment, 403, { ok: false });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: buildCorsHeaders(environment) });
    if (request.method !== "POST") return createJsonResponse(environment, 405, { ok: false });
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return createJsonResponse(environment, 415, { ok: false });
    if (!(await isWithinRateLimit(request, environment))) return createJsonResponse(environment, 429, { ok: false });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAXIMUM_BODY_BYTES) return createJsonResponse(environment, 413, { ok: false });
    let requestPayload;
    try {
      requestPayload = JSON.parse(rawBody);
    } catch {
      return createJsonResponse(environment, 400, { ok: false });
    }
    if (typeof requestPayload !== "object" || requestPayload === null) return createJsonResponse(environment, 400, { ok: false });
    if (isLikelyAutomated(requestPayload)) return createJsonResponse(environment, 200, { ok: true });
    const contactRequest = validateContactRequest(requestPayload);
    if (!contactRequest) return createJsonResponse(environment, 422, { ok: false });
    const isSent = await sendWithMailjet(environment, contactRequest);
    return createJsonResponse(environment, isSent ? 200 : 502, { ok: isSent });
  }
};
