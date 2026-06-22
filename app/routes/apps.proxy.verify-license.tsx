import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  type LicensePayload,
  forwardLicenseVerifyRequest,
} from "../lib/license-proxy.server";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function handleProxyRequest(request: Request) {
  const url = new URL(request.url);

  try {
    await authenticate.public.appProxy(request);
  } catch {
    return Response.json(
      {
        authorized: false,
        error: "Invalid app proxy request.",
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
