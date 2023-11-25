import * as request from 'supertest';
import { server, app } from '../rest_api/app';
import * as db from '../rest_api/db';
import { promises as fs } from 'fs';

jest.useFakeTimers();

// Mocking the filesystem module
jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'), // This will ensure other methods of fs are still the actual implementations
    existsSync: jest.fn().mockReturnValue(true), // or false depending on what you want to test
    promises: {
      ...jest.requireActual('fs').promises,
      rm: jest.fn().mockResolvedValue(null),
    },
  };
});

// Using the actual db module but mocking the connectToDatabase function
jest.mock('../rest_api/db', () => ({
  ...jest.requireActual('../rest_api/db'),
  connectToDatabase: jest.fn().mockImplementation(() => {
    const mockExecute = jest.fn().mockResolvedValue(null); // Mocking the database execute function
    const mockEnd = jest.fn().mockResolvedValue(null); // Mocking the database end function
    return Promise.resolve({
      execute: mockExecute,
      end: mockEnd,
    });
  }),
}));

describe('DELETE /reset route', () => {
  beforeAll((done) => {
    done();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('should return 200 and a success message when reset is successful', async () => {
    const response = await request(app).delete('/reset');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Registry is reset.' });

    expect(fs.rm).toHaveBeenCalledWith('../dump', { recursive: true, force: true });

    const dbMock = require('../rest_api/db');
    expect(dbMock.connectToDatabase).toHaveBeenCalled();

    // Get the mock connection object
    const connection = await dbMock.connectToDatabase();
    expect(connection.execute).toHaveBeenCalledWith(`DELETE FROM ${db.tableName}`);

    // Ensure the connection's end method is called to simulate closing the connection
    expect(connection.end).toHaveBeenCalled();
  }, 20000);

// Mocking the filesystem module
jest.mock('fs', () => ({
    promises: {
        rm: jest.fn().mockRejectedValueOnce(new Error('Failed to delete directory')),
    },
}));

it('should return 500 and an error message when reset fails', async () => {
    const response = await request(app).delete('/reset');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Reset failed: Failed to delete directory' });
}, 20000);
});
