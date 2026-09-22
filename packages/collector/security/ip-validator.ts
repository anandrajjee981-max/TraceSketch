import dns from 'dns';
import net from 'net';

export function isPrivateIP(ip: string): boolean {
  const family = net.isIP(ip);

  // --- 1. IPv4 Checks ---
  if (family === 4) {
    const parts = ip.split('.').map(Number);
    const [first, second] = parts;

    // Loopback (127.0.0.0/8) & Current Network (0.0.0.0/8)
    if (first === 127 || first === 0) return true;

    // Class A (10.0.0.0/8)
    if (first === 10) return true;

    // Class B (172.16.0.0/12)
    if (first === 172 && second >= 16 && second <= 31) return true;

    // Class C (192.168.0.0/16)
    if (first === 192 && second === 168) return true;

    // Link-Local / AWS IMDS (169.254.0.0/16)
    if (first === 169 && second === 254) return true;

    // CGNAT (100.64.0.0/10)
    if (first === 100 && second >= 64 && second <= 127) return true;

    return false;
  }

  // --- 2. IPv6 Checks ---
  if (family === 6) {
    const normalized = ip.toLowerCase();

    // Loopback (::1)
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

    // Unspecified Address (::)
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    // Unique Local Address / ULA (fc00::/7 -> fc00:: & fd00::)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // Link-Local (fe80::/10 -> fe80::, fe90::, fea0::, feb0::)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }

    // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 ya ::ffff:10.0.0.1)
    if (normalized.includes('::ffff:')) {
      const ipv4Part = normalized.split('::ffff:')[1];
      if (ipv4Part && net.isIP(ipv4Part) === 4) {
        return isPrivateIP(ipv4Part); // Recursive call for mapped IPv4
      }
    }

    return false;
  }

  // Neither IPv4 nor IPv6
  return false;
}
function isLoopback(ip: string): boolean {
  if (ip === "::1") return true;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  return parts[0] === 127;
}

export async function resolveAndValidate(hostname: string): Promise<boolean> {
  try {

    const addresses = await dns.promises.lookup(hostname, { all: true });

    // if resolved IP address private/internal then unsafe/invalid
  for (const record of addresses) {
  if (isLoopback(record.address)) continue;   
  if (isPrivateIP(record.address)) {
    return false;
  }
}
return true;

    return true;
  } catch (e) {
    return false;
  }
}