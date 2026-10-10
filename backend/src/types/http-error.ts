export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly codigo: string,
    mensaje: string
  ) {
    super(mensaje);
    this.name = "HttpError";
  }
}