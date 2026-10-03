import dns from "dns";
import net from "net";

export function isPrivateIP(ip: string): boolean {
  const family = net.isIP(ip);

  if (family === 4) {
    const parts = ip.split(".").map(Number);
    const [first, second] = parts;

    if (first === 127 || first === 0) return true;
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 169 && second === 254) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;

    return false;
  }

  if (family === 6) {
    const normalized = ip.toLowerCase();

    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
    if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true;
    }

    if (normalized.includes("::ffff:")) {
      const ipv4Part = normalized.split("::ffff:")[1];
      if (ipv4Part && net.isIP(ipv4Part) === 4) {
        return isPrivateIP(ipv4Part);
      }
    }

    return false;
  }

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

    for (const record of addresses) {
      if (isLoopback(record.address)) continue;
      if (isPrivateIP(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
