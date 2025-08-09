import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  username: string;
};

export async function signSession(payload: SessionPayload, expiresIn: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secret);
}

export async function verifySession<T extends JWTPayload = SessionPayload>(token: string) {
  const { payload } = await jwtVerify<T>(token, secret);
  return payload;
}
