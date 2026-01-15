/**
 * Dell TechDirect API Integration
 * Fetches warranty information for Dell equipment using the Asset Entitlements API
 */

const DELL_TOKEN_URL = 'https://apigtwb2c.us.dell.com/auth/oauth/v2/token';
const DELL_ENTITLEMENTS_URL = 'https://apigtwb2c.us.dell.com/PROD/sbil/eapi/v5/asset-entitlements';

interface DellTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface DellEntitlement {
  serviceLevelDescription?: string;
  startDate?: string;
  endDate?: string;
  entitlementType?: string;
}

interface DellAsset {
  serviceTag?: string;
  productLineDescription?: string;
  productLobDescription?: string;
  shipDate?: string;
  entitlements?: DellEntitlement[];
}

export interface DellWarrantyInfo {
  success: boolean;
  message?: string;
  data?: {
    serviceTag: string;
    model: string | null;
    productLine: string | null;
    shipDate: string | null;
    warrantyStart: string | null;
    warrantyEnd: string | null;
    entitlements: Array<{
      serviceLevel: string | null;
      startDate: string | null;
      endDate: string | null;
      type: string | null;
    }>;
  };
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Clear the cached token (for testing purposes)
 */
export function clearTokenCache(): void {
  cachedToken = null;
}

/**
 * Get Dell API credentials from environment
 */
function getDellCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.DELL_CLIENT_ID;
  const clientSecret = process.env.DELL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  return { clientId, clientSecret };
}

/**
 * Check if Dell API is configured
 */
export function isDellApiConfigured(): boolean {
  return getDellCredentials() !== null;
}

/**
 * Get Bearer token from Dell API
 */
async function getBearerToken(): Promise<string> {
  // Check cache first (with 5 minute buffer before expiry)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
    return cachedToken.token;
  }
  
  const credentials = getDellCredentials();
  if (!credentials) {
    throw new Error('Dell API credentials not configured');
  }
  
  const response = await fetch(DELL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${text}`);
  }
  
  const data = await response.json() as DellTokenResponse;
  
  if (!data.access_token) {
    throw new Error('No access token in response');
  }
  
  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
  
  return data.access_token;
}

/**
 * Format date from Dell API format (YYYY-MM-DDTHH:MM:SSZ) to display format (DD.MM.YYYY)
 */
function formatDellDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch {
    return null;
  }
}

/**
 * Format date to ISO format for form inputs (YYYY-MM-DD)
 */
function formatToISODate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Get asset entitlements (warranty info) from Dell API
 */
async function getAssetEntitlements(accessToken: string, serviceTag: string): Promise<DellAsset[] | null> {
  const url = `${DELL_ENTITLEMENTS_URL}?servicetags=${encodeURIComponent(serviceTag)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  
  if (response.status === 401) {
    // Token might be expired, clear cache
    cachedToken = null;
    throw new Error('Invalid authentication - token may have expired');
  }
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} - ${text}`);
  }
  
  return await response.json() as DellAsset[];
}

/**
 * Fetch warranty information for a Dell device
 */
export async function getDellWarrantyInfo(serviceTag: string): Promise<DellWarrantyInfo> {
  try {
    if (!isDellApiConfigured()) {
      return {
        success: false,
        message: 'Dell API credentials not configured'
      };
    }
    
    const accessToken = await getBearerToken();
    const entitlements = await getAssetEntitlements(accessToken, serviceTag);
    
    if (!entitlements || entitlements.length === 0) {
      return {
        success: false,
        message: 'No warranty information found for this service tag'
      };
    }
    
    const device = entitlements[0];
    
    // Find earliest start date and latest end date
    let earliestStartDate: string | null = null;
    let latestEndDate: string | null = null;
    
    const processedEntitlements: DellWarrantyInfo['data']['entitlements'] = [];
    
    if (device.entitlements && device.entitlements.length > 0) {
      for (const ent of device.entitlements) {
        const startDate = ent.startDate;
        const endDate = ent.endDate;
        
        // Track earliest start date
        if (startDate) {
          if (!earliestStartDate || new Date(startDate) < new Date(earliestStartDate)) {
            earliestStartDate = startDate;
          }
        }
        
        // Track latest end date
        if (endDate) {
          if (!latestEndDate || new Date(endDate) > new Date(latestEndDate)) {
            latestEndDate = endDate;
          }
        }
        
        processedEntitlements.push({
          serviceLevel: ent.serviceLevelDescription || null,
          startDate: formatDellDate(ent.startDate),
          endDate: formatDellDate(ent.endDate),
          type: ent.entitlementType || null
        });
      }
    }
    
    return {
      success: true,
      data: {
        serviceTag: device.serviceTag || serviceTag,
        model: device.productLineDescription || null,
        productLine: device.productLobDescription || null,
        shipDate: formatToISODate(device.shipDate),
        warrantyStart: formatToISODate(earliestStartDate),
        warrantyEnd: formatToISODate(latestEndDate),
        entitlements: processedEntitlements
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message
    };
  }
}
