declare module "bcryptjs" {
  export function hash(data: string, saltOrRounds: number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  const bcrypt: {
    hash: typeof hash;
    compare: typeof compare;
  };
  export default bcrypt;
}

declare module "cors" {
  import { RequestHandler } from "express";
  function cors(options?: unknown): RequestHandler;
  export default cors;
}

declare module "jsonwebtoken" {
  export function sign(payload: object, secret: string, options?: { expiresIn?: string }): string;
  export function verify(token: string, secret: string): unknown;
  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };
  export default jwt;
}
