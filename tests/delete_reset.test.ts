import * as request from 'supertest';
import { server, app } from '../rest_api/app';
import * as db from '../rest_api/db';

jest.useFakeTimers();

// Mock the database connection
jest.mock('../rest_api/db', () => ({
    initializeDatabase: jest.fn().mockResolvedValue(null),
    connectToDatabase: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue([
        [{ Name: 'express', Version: '1.0.0', ID: '1' }], // Mock result of the query
        ]),
        end: jest.fn().mockResolvedValue(null),
    }),
}));


describe('DELETE /reset route', () => {
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

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ message: 'Registry is reset.' });

    const dbMock = require('../rest_api/db');
    expect(dbMock.connectToDatabase).toHaveBeenCalled();

    // Get the mock connection object
    const connection = await dbMock.connectToDatabase();
    expect(connection.execute).toHaveBeenCalledWith(`TRUNCATE TABLE ${db.dbName}.${db.tableName}`);

    // Ensure the connection's end method is called to simulate closing the connection
    expect(connection.end).toHaveBeenCalled();
  }, 20000);

  // Mocking the filesystem module
  jest.mock('fs', () => ({
      promises: {
          rm: jest.fn().mockRejectedValueOnce(new Error('Failed to delete directory')),
      },
  }));

  // it('should return 500 and an error message when reset fails', async () => {
  //     const response = await request(app).delete('/reset');

  //     expect(response.status).toEqual(500);
  //     expect(response.body).toEqual({ error: 'Reset failed: Failed to delete directory' });
  // }, 20000);
});
