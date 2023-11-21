import axios from "axios";
import * as git from 'isomorphic-git';
import * as tmp from 'tmp';
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

import {
  getDirectorySize,
  getFileSize,
  timeoutPromise,
  busFactor,
  license,
  correctness,
  responsiveMaintainer,
  rampUp,
  cloneRepository,
} from "./metric";

process.env.GITHUB_TOKEN = "mock-token";
process.env.LOG_FILE = "./mock-log.log";
jest.mock('isomorphic-git');
// jest.mock('tmp');
jest.mock('tmp', () => ({
  dirSync: jest.fn(() => ({ name: '/mock/directory/path', removeCallback: jest.fn() })),
}));
jest.useFakeTimers();
jest.mock("axios");
jest.mock("winston", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

function getMockDataPath(repositoryUrl: string, dataType: string): string {
  const parts = repositoryUrl.split("/");
  const user = parts[parts.length - 2];
  const dirName = `repos_${user}`;
  return `${dirName}/${dataType}.json`;
}

function getNumberOfMockPages(starts = "issuesData_page", repositoryUrl: string): number {
  const dirPath = getMockDataPath(repositoryUrl, "").slice(0, -5);
  const files = fs.readdirSync(dirPath);
  const issuesFiles = files.filter((file) => file.startsWith(starts));
  return issuesFiles.length;
}

function loadMockData(repositoryUrl: string, dataType: string): any {
  const filePath = getMockDataPath(repositoryUrl, dataType);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

describe("GitHub Repository Metrics", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));
  });

  afterEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
  });

  const repositoryUrls: string[] = [
    "https://github.com/cloudinary/cloudinary_npm"
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should handle errors during cloning', async () => {
    const mockDir = { name: '/mock/directory/path', removeCallback: jest.fn() };
    (tmp as any).dirSync.mockReturnValue(mockDir);
    (git as any).clone.mockRejectedValue(new Error('Mocked clone error'));

    const result = await cloneRepository('https://api.github.com/repos/sample/repo', mockDir);
    
    expect(result).toBe('');
  });

it("should reject after given milliseconds", async () => {
    const promise = timeoutPromise(1000);
    jest.advanceTimersByTime(1000);

    try {
        await promise;
        expect(false).toBe(true);
    } catch (error) {
        expect((error as Error).message).toBe("Operation timed out after 1000 milliseconds");
    }
});

  it("should correctly get the size of a file", async () => {
    const filePath = path.join(testDir, "testFile.txt");
    const content = "Hello, world!";
    fs.writeFileSync(filePath, content, "utf-8");

    const size = await getFileSize(filePath);
    expect(size).toBe(Buffer.from(content).length);
  });

  it("should return 0 for a non-existent file", async () => {
    const filePath = path.join(testDir, "nonExistent.txt");
    const size = await getFileSize(filePath);
    expect(size).toBe(0);
  });

  it("should correctly get the size of a directory", async () => {
    const dirPath = path.join(testDir, "testDir");
    fs.mkdirSync(dirPath);

    const filePath1 = path.join(dirPath, "testFile1.txt");
    const filePath2 = path.join(dirPath, "testFile2.txt");
    const content1 = "Hello, world!";
    const content2 = "Hello, again!";
    fs.writeFileSync(filePath1, content1, "utf-8");
    fs.writeFileSync(filePath2, content2, "utf-8");

    const size = await getDirectorySize(dirPath);
    expect(size).toBe(
      Buffer.from(content1).length + Buffer.from(content2).length
    );
  });

  it("should exclude specified file when calculating directory size", async () => {
    const dirPath = path.join(testDir, "testDir");
    fs.mkdirSync(dirPath);

    const filePath1 = path.join(dirPath, "testFile1.txt");
    const filePath2 = path.join(dirPath, "testFile2.txt");
    const content1 = "Hello, world!";
    const content2 = "Hello, again!";
    fs.writeFileSync(filePath1, content1, "utf-8");
    fs.writeFileSync(filePath2, content2, "utf-8");

    const size = await getDirectorySize(dirPath, filePath1);
    expect(size).toBe(Buffer.from(content2).length);
  });

  repositoryUrls.forEach((repositoryUrl) => {
    const newUrl = repositoryUrl.replace("github.com", "api.github.com/repos");
    jest.mock('axios');

    it("should compute the bus factor correctly", async () => {
        const repoMockData = loadMockData(repositoryUrl, "repositoryData");
        const contributorsMockData = loadMockData(repositoryUrl, "contributorsData");

        (axios.get as jest.Mock).mockResolvedValueOnce({ data: repoMockData })
            .mockResolvedValueOnce({ data: contributorsMockData });

        const result = await busFactor(newUrl);
        expect(result).toBeLessThanOrEqual(1);
    });
    it("should handle axios.get failure gracefully", async () => {
      // Mock axios.get to reject
      (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await busFactor(newUrl);
      expect(result).toBe(0);
    });
    it("should determine the license status correctly", async () => {
      /*const licenseMockData = loadMockData(repositoryUrl, "licenseData");
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: licenseMockData.data,
        status: licenseMockData.status,
      });*/

      const result = await license(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });
    it("should handle no license gracefully", async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          data: {},
          status: 404,
        },
      });

      const result = await license(newUrl);
      expect(result).toBe(0);
    });

    it("should compute correctness based on issues", async () => {
      const numIssuePages = getNumberOfMockPages(
        "issuesData_page",
        repositoryUrl
      );

      for (let i = 1; i <= numIssuePages; i++) {
        const issuesMockData = loadMockData(
          repositoryUrl,
          `issuesData_page${i}`
        );
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: issuesMockData });
      }
      const result = await correctness(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });

    it("should handle unexpected status codes gracefully", async () => {
        (axios.get as jest.Mock).mockRejectedValue({
        response: {
          data: {},
          status: 500,
        },
      });
      const result = await license(newUrl);
      expect(result).toBe(0);
    });

    it("should handle network errors gracefully", async () => {
        (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await license(newUrl);
      expect(result).toBe(0);
    });

    it("should compute responsiveness of maintainers", async () => {
      const numIssuePages = getNumberOfMockPages(
        "issuesData_page",
        repositoryUrl
      );

    for (let i = 1; i <= numIssuePages; i++) {
        const issuesMockData = loadMockData(
            repositoryUrl,
            `issuesData_page${i}`
        );
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: issuesMockData });

        issuesMockData.slice(0, 10).forEach((issue: { number: number }) => {
            const commentsMockData = loadMockData(
                repositoryUrl,
                `commentsData_issue${issue.number}`
            );
            (axios.get as jest.Mock).mockResolvedValueOnce({ data: commentsMockData });
        });
    }
    
      const result = await responsiveMaintainer(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });
    it("should handle no maintainer comments gracefully", async () => {
      const issuesMockData = loadMockData(repositoryUrl, "issuesData_page1");
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: issuesMockData });

      issuesMockData.slice(0, 10).forEach(() => {
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: [] });
      });

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBe(0);
    });
    it("should handle axios error gracefully for issues", async () => {
        (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBe(0);
    });

    it("should handle axios error gracefully for comments", async () => {
      const issuesMockData = loadMockData(repositoryUrl, "issuesData_page1");
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: issuesMockData })
        .mockRejectedValue(new Error("Network error"));

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBe(0);
    });

    // new rampup tests
    it("should successfully calculate RampUp score", async () => {
      const result = await rampUp(newUrl);
      expect(result).toBeLessThanOrEqual(0.75);
    });
    
    it("should gracefully handle a bad link for RampUp", async () => {
        (axios.get as jest.Mock).mockRejectedValue({
        response: {
          data: {},
          status: 500,
        },
      });
      const result = await rampUp(newUrl);
      expect(result).toBe(0);
    });
  });
});