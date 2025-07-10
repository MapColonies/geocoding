import { fetchNLPService } from '../../../src/location/utils';
import { StatusCodes } from 'http-status-codes';

let mockPost: jest.Mock;

jest.mock('axios', () => ({
  create: () => ({
    post: (...args: any[]) => mockPost(...args),
  }),
}));

beforeEach(() => {
  mockPost = jest.fn();
});

describe('#fetchNLPService', () => {
  it('returns data and latency when response is valid', async () => {
    const mockData = [{ result: 'ok' }];
    mockPost.mockResolvedValueOnce({
      status: StatusCodes.OK,
      data: mockData,
    });

    const result = await fetchNLPService('/endpoint', { text: 'hello' });

    expect(result.data).toEqual(mockData);
    expect(typeof result.latency).toBe('number');
  });

  it('throws InternalServerError when status is not OK', async () => {
    mockPost.mockResolvedValueOnce({
      status: 500,
      data: [],
    });

    await expect(fetchNLPService('/endpoint', { text: 'hello' })).rejects.toThrow(/NLP analyser unexpected response/);
  });
});
