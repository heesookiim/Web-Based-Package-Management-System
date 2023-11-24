// Arryan
// Unit testing for POST /package
import { downloadRepo } from '../rest_api/routes/post_package';
import { promises as fs, rm } from 'fs';

const testPath = 'tests/dump';

afterAll(() => {
    fs.rm(testPath, { recursive: true, force: true }).catch(err => {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    });
});


describe('downloadRepo function', () => {
    it('Clones 1 repository and returns the path', async () => {
        const testUrl = 'https://github.com/WebReflection/flatted';
        const result = await downloadRepo(testUrl, testPath);
        expect(result).toBe(testPath);
    });

    it('Clone 3 repositories and return the paths', async () => {
        const testUrl1 = 'https://github.com/WebReflection/flatted';
        const result1 = await downloadRepo(testUrl1, testPath);
        expect(result1).toBe(testPath);

        const testUrl2 = 'https://github.com/lune-climate/ts-results-es';
        const result2 = await downloadRepo(testUrl2, testPath);
        expect(result2).toBe(testPath);

        const testUrl3 = 'https://github.com/browserify/randombytes';
        const result3 = await downloadRepo(testUrl3, testPath);
        expect(result3).toBe(testPath);
    });


});