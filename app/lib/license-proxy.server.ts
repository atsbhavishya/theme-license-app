export interface LicensePayload {
  shop?: string;
  domain?: string;
  template?: string;
  pageType?: string;
  licenseKey?: string;
  cdnUrl?: string;
  [key: string]: unknown;
}

function getBackendVerifyUrl(): string {
  const url = process.env.VERIFY_API_URL;

  if (!url) {
    throw new Error(
      "VERIFY_API_URL is not configured. Set it to your backend verify endpoint.",
    );
  }

  return url;
}

export async function forwardLicenseVerifyRequest(
  payload: LicensePayload,
  shopFromProxy?: string | null,
): Promise<{ body: unknown; status: number }> {
  const backendUrl = getBackendVerifyUrl();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (process.env.PROXY_BACKEND_SECRET) {
    headers.set("X-Proxy-Secret", process.env.PROXY_BACKEND_SECRET);
  }

  const response = await fetch(backendUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      shop: shopFromProxy || payload.shop,
    }),
  });

  try {
    const body = await response.json();
    return { body, status: response.status };
  } catch {
    return {
      body: {
        authorized: false,
        error: "Invalid response from license backend.",
      },
      status: response.status || 502,
    };
  }
}
