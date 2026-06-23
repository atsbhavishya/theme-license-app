import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  type LicensePayload,
  forwardLicenseVerifyRequest,
} from "../lib/license-proxy.server";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function handleProxyRequest(request: Request) {
  const url = new URL(request.url);


  console.log("APP PROXY REQUEST URL:", request.url);
  console.log("HAS SHOP:", url.searchParams.has("shop"));
  console.log("HAS TIMESTAMP:", url.searchParams.has("timestamp"));
  console.log("HAS SIGNATURE:", url.searchParams.has("signature"));
  console.log("PATH PREFIX:", url.searchParams.get("path_prefix"));

  try {
    await authenticate.public.appProxy(request);
  } catch(error) {
    console.error("APP PROXY AUTH FAILED:", error);
    return Response.json(
      {
        authorized: false,
        error: "Invalid app proxy request.",
        debug: {
          hasShop: url.searchParams.has("shop"),
          hasTimestamp: url.searchParams.has("timestamp"),
          hasSignature: url.searchParams.has("signature"),
          pathPrefix: url.searchParams.get("path_prefix"),
        },
      },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const shopFromProxy = url.searchParams.get("shop");
  let payload: LicensePayload = {};

  if (request.method === "POST") {
    try {
      payload = (await request.json()) as LicensePayload;
    } catch {
      return Response.json(
        {
          authorized: false,
          error: "Invalid JSON body.",
        },
        { status: 400, headers: JSON_HEADERS },
      );
    }
  } else {
    payload = {
      shop: shopFromProxy || undefined,
      domain: url.searchParams.get("domain") || undefined,
      template: url.searchParams.get("template") || undefined,
      pageType: url.searchParams.get("pageType") || undefined,
    };
  }

  try {
    const { body, status } = await forwardLicenseVerifyRequest(
      payload,
      shopFromProxy,
    );

    return Response.json(body, {
      status,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "License backend unavailable.";

    return Response.json(
      {
        authorized: false,
        error: message,
      },
      { status: 502, headers: JSON_HEADERS },
    );
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleProxyRequest(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleProxyRequest(request);
};
