import { getAllRatings } from './analyze';
import { PackageRating } from '../schema';

// test all ratingsS
describe('testing getting all ratings for the same link', () => {
    it('should return a valid rating for Github Link', async () => {
        const gitHubLink = 'https://github.com/cloudinary/cloudinary_npm';
        const ratings: PackageRating = await getAllRatings(gitHubLink);
        expect(ratings.BusFactor).toBeGreaterThanOrEqual(0);
        expect(ratings.BusFactor).toBeLessThanOrEqual(1);
        expect(ratings.Correctness).toBeGreaterThanOrEqual(0);
        expect(ratings.Correctness).toBeLessThanOrEqual(1);
        expect(ratings.GoodPinningPractice).toBeGreaterThanOrEqual(0);
        expect(ratings.GoodPinningPractice).toBeLessThanOrEqual(1);
        expect(ratings.LicenseScore).toBeGreaterThanOrEqual(0);
        expect(ratings.LicenseScore).toBeLessThanOrEqual(1);
        expect(ratings.NetScore).toBeGreaterThanOrEqual(0);
        expect(ratings.NetScore).toBeLessThanOrEqual(1);
        expect(ratings.PullRequest).toBeGreaterThanOrEqual(0);
        expect(ratings.PullRequest).toBeLessThanOrEqual(1);
        expect(ratings.RampUp).toBeGreaterThanOrEqual(0);
        expect(ratings.RampUp).toBeLessThanOrEqual(1);
        expect(ratings.ResponsiveMaintainer).toBeGreaterThanOrEqual(0);
        expect(ratings.ResponsiveMaintainer).toBeLessThanOrEqual(1);
    }, 600000);
    it('should correctly handle a nonexistent repository', async () => {
        const gitHubLink = 'https://github.com/hall657/nonexistent-repo';
        const ratings = await getAllRatings(gitHubLink);
        expect(ratings.BusFactor).toBe(0);
        expect(ratings.Correctness).toBe(0);
        expect(ratings.GoodPinningPractice).toBe(0);
        expect(ratings.LicenseScore).toBe(0);
        expect(ratings.NetScore).toBe(0);
        expect(ratings.PullRequest).toBe(0);
        expect(ratings.RampUp).toBe(0);
        expect(ratings.ResponsiveMaintainer).toBe(0);
    });
    it('should correctly return valid ratings for npm link', async () => {
        const npmLink = 'https://www.npmjs.com/package/cloudinary';
        const ratings = await getAllRatings(npmLink);
        expect(ratings.BusFactor).toBeGreaterThanOrEqual(0);
        expect(ratings.BusFactor).toBeLessThanOrEqual(1);
        expect(ratings.Correctness).toBeGreaterThanOrEqual(0);
        expect(ratings.Correctness).toBeLessThanOrEqual(1);
        expect(ratings.GoodPinningPractice).toBeGreaterThanOrEqual(0);
        expect(ratings.GoodPinningPractice).toBeLessThanOrEqual(1);
        expect(ratings.LicenseScore).toBeGreaterThanOrEqual(0);
        expect(ratings.LicenseScore).toBeLessThanOrEqual(1);
        expect(ratings.NetScore).toBeGreaterThanOrEqual(0);
        expect(ratings.NetScore).toBeLessThanOrEqual(1);
        expect(ratings.PullRequest).toBeGreaterThanOrEqual(0);
        expect(ratings.PullRequest).toBeLessThanOrEqual(1);
        expect(ratings.RampUp).toBeGreaterThanOrEqual(0);
        expect(ratings.RampUp).toBeLessThanOrEqual(1);
        expect(ratings.ResponsiveMaintainer).toBeGreaterThanOrEqual(0);
        expect(ratings.ResponsiveMaintainer).toBeLessThanOrEqual(1);
    }, 600000);
    it('should correctly handle a nonexistent npm package', async () => {
        const npmLink = 'https://www.npmjs.com/package/@hall657/nonexistent-package';
        const ratings = await getAllRatings(npmLink);
        expect(ratings.BusFactor).toBe(0);
        expect(ratings.Correctness).toBe(0);
        expect(ratings.GoodPinningPractice).toBe(0);
        expect(ratings.LicenseScore).toBe(0);
        expect(ratings.NetScore).toBe(0);
        expect(ratings.PullRequest).toBe(0);
        expect(ratings.RampUp).toBe(0);
        expect(ratings.ResponsiveMaintainer).toBe(0);
    });
});