export class DataFetchError extends Error {
  public readonly name: string;

  public constructor(message: string) {
    super(message);
    this.name = 'DataFetchError';
  }
}

export class MissingConfigError extends Error {
  public readonly name: string;

  public constructor(message: string) {
    super(message);
    this.name = 'MissingConfigError';
  }
}

export class InvalidGeoJSONError extends Error {
  public readonly name: string;

  public constructor(message: string) {
    super(message);
    this.name = 'InvalidGeoJSONError';
  }
}
