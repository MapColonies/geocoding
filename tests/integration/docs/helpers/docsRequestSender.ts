import type { Application } from 'express';
import supertest, { agent } from 'supertest';

export class DocsRequestSender {
  public constructor(private readonly app: Application) {}

  public async getDocs(): Promise<supertest.Response> {
    return agent(this.app).get('/docs/api/');
  }

  public async getDocsJson(): Promise<supertest.Response> {
    return agent(this.app).get('/docs/api.json');
  }
}
