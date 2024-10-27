import * as supertest from 'supertest';

export class ConfigRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getControlTable(): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/config/control/table')
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123');
  }
}
