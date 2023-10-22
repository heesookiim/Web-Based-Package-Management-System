import express from 'express';
import request from 'supertest';
import { createPackageRegistryServer } from './post'; // Replace with your actual file path

const app = express();

beforeEach(() => {
    jest.clearAllMocks();
});

// Mock logger to prevent actual logging during tests
// jest.mock('./analyze', () => ({
//   logger: {
//     info: jest.fn(),
//     debug: jest.fn(),
//     error: jest.fn(),
//   },
// }));

describe('POST /packages', () => {
  let server: express.Express;

  beforeEach(async () => {
    // Set up the server with your dataUrl and secretToken
    server = await createPackageRegistryServer('your-data-url', 'your-secret-token');
  });

  it('should return 200 and paginated packages', async () => {
    const response = await request(server)
      .post('/packages')
      .send({ offset: 0 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('packages');
    expect(response.body).toHaveProperty('nextOffset');
    expect(response.body).toHaveProperty('query');
  });

  it('should return 400 for invalid offset', async () => {
    const response = await request(server)
      .post('/packages')
      .send({ offset: 'invalid' });

    expect(response.status).toBe(400);
  });

  it('should return 401 for unauthorized access', async () => {
    const response = await request(server)
      .post('/packages')
      .set('X-Authorization', 'invalid-token');

    expect(response.status).toBe(401);
  });

  it('should return 409 for duplicate package', async () => {
    // Mock packages data with a duplicate package
    jest.spyOn(server, 'locals', 'get').mockReturnValueOnce([
      { ID: 'duplicate-package-id' },
    ]);

    const response = await request(server)
      .post('/packages')
      .send({ ID: 'duplicate-package-id' });

    expect(response.status).toBe(409);
  });

  // Add more test cases as needed

  afterAll(() => {
    // Close the server after all tests
    server.close();
  });
});
