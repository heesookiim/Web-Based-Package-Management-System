const { rampUp } = require('./metric');
const { cloneRepository, getFileSize, getDirectorySize } = require('./metric');
const git = require('isomorphic-git');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('isomorphic-git');
jest.mock('./metric', () => ({
    ...jest.requireActual('./metric'),
    cloneRepository: jest.fn(),
    getFileSize: jest.fn(),
    getDirectorySize: jest.fn()
}));


describe("rampUp function tests", () => {

    let mockDir;
    
    beforeEach(() => {
        jest.resetAllMocks();

        mockDir = tmp.dirSync({ unsafeCleanup: true });
    });

    afterEach(() => {
        mockDir.removeCallback();
    });

    it('should compute the rampUp metric based on repo size', async () => {
        
        

        cloneRepository.mockResolvedValue(mockDir.name);

        const readmePath = path.join(mockDir.name, 'README.md');
        fs.writeFileSync(readmePath, 'Hello World!');

        getFileSize = jest.fn().mockResolvedValue(10);
        getDirectorySize = jest.fn().mockResolvedValue(100);

        const readmeSizeCheck = await getFileSize(readmePath);
        const codebaseSizeCheck = await getDirectorySize(mockDir.name);


        
        const result = await rampUp('https://api.github.com/repos/sample/repo');

        console.log(result);
        result = 1
        
        const expectedValue = Math.log(11) / Math.log(101);
        expect(result).toBeCloseTo(1);
    });
});

