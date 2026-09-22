export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    const allowedProtocols = ["http:", "https:"];

    return allowedProtocols.includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}









