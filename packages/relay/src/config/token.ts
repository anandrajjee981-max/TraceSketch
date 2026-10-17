import { Config } from "./config.js";
import jwt from "jsonwebtoken";

export async function createToken(
  payload: object,
  expiresIn: string = "1d",
  res?: any
): Promise<string> {
  const token = jwt.sign(payload, Config.JWT_SECRET, { expiresIn: expiresIn as any });
  if (res && typeof res.cookie === "function") {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });
  }
  return token;
}
