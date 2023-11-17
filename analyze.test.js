const axios = require("axios");
const git = require('isomorphic-git');
const tmp = require('tmp');
const path = require("path");
const os = require("os");

const {
  getDirectorySize,
  getFileSize,
  timeoutPromise,
  busFactor,
  license,
  correctness,
  responsiveMaintainer,
  rampUp,
  cloneRepository,
} = require("./metric");
const fs = require("fs");

process.env.GITHUB_TOKEN = "mock-token";
process.env.LOG_FILE = "./mock-log.log";
jest.mock('isomorphic-git');
jest.mock('tmp');
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

function getMockDataPath(repositoryUrl, dataType) {
  const parts = repositoryUrl.split("/");
  const user = parts[parts.length - 2];
  const dirName = `repos_${user}`;
  return `${dirName}/${dataType}.json`;
}

function getNumberOfMockPages(starts = "issuesData_page", repositoryUrl) {
  const dirPath = getMockDataPath(repositoryUrl, "").slice(0, -5);
  const files = fs.readdirSync(dirPath);
  const issuesFiles = files.filter((file) => file.startsWith(starts));
  return issuesFiles.length;
}

function loadMockData(repositoryUrl, dataType) {
  const filePath = getMockDataPath(repositoryUrl, dataType);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}



describe("GitHub Repository Metrics", () => {
  
  let testDir;
  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));
  });

  afterEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
  });
  const repositoryUrls = [
    "https://github.com/cloudinary/cloudinary_npm"
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });


  it('should successfully clone a repository', async () => {
    const mockDir = { name: '/mock/directory/path', removeCallback: jest.fn() };
    tmp.dirSync.mockReturnValue(mockDir);
    git.clone.mockResolvedValue(true);

    const result = await cloneRepository('https://api.github.com/repos/sample/repo');
    
    expect(result).toBe(mockDir.name);
  });
  it('should handle errors during cloning', async () => {
    const mockDir = { name: '/mock/directory/path', removeCallback: jest.fn() };
    tmp.dirSync.mockReturnValue(mockDir);
    git.clone.mockRejectedValue(new Error('Mocked clone error'));

    const result = await cloneRepository('https://api.github.com/repos/sample/repo');
    
    expect(result).toBe('');
    
  });
  it("should reject after given milliseconds", async () => {
    const promise = timeoutPromise(1000);
    jest.advanceTimersByTime(1000);

    try {
      await promise;
      expect(false).toBe(true);
    } catch (error) {
      expect(error.message).toBe("Operation timed out after 1000 milliseconds");
    }
  });
  it("should correctly get the size of a file", async () => {
    const filePath = path.join(testDir, "testFile.txt");
    const content = "Hello, world!";
    fs.writeFileSync(filePath, content, "utf-8");

    const size = await getFileSize(filePath);
    expect(size).toBe(Buffer.from(content).length);
  });

  it("should return 0 for non-existent file", async () => {
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

  it("should correctly read the content of a file", async () => {
    const filePath = path.join(testDir, "readTestFile.txt");
    const content = "This is a test content!";
    fs.writeFileSync(filePath, content, "utf-8");

    const readContent = await fs.readFileSync(filePath);
    expect(readContent).toBe(content);
  });

  it("should throw an error when trying to read a non-existent file", async () => {
    const filePath = path.join(testDir, "nonExistentReadTest.txt");

    await expect(fs.readFileSync(filePath)).rejects.toThrowError("File not found");
  });


  repositoryUrls.forEach((repositoryUrl) => {
    const newUrl = repositoryUrl.replace("github.com", "api.github.com/repos");
    it("should compute the bus factor correctly", async () => {
      const repoMockData = loadMockData(repositoryUrl, "repositoryData");
      const contributorsMockData = loadMockData(
        repositoryUrl,
        "contributorsData"
      );

      axios.get
        .mockResolvedValueOnce({ data: repoMockData })
        .mockResolvedValueOnce({ data: contributorsMockData });

      const result = await busFactor(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });
    it("should handle axios.get failure gracefully", async () => {
      // Mock axios.get to reject
      axios.get.mockRejectedValue(new Error("Network error"));

      const result = await busFactor(newUrl);
      expect(result).toBe(-1);
    });
    it("should determine the license status correctly", async () => {
      const licenseMockData = loadMockData(repositoryUrl, "licenseData");
      axios.get.mockResolvedValueOnce({
        data: licenseMockData.data,
        status: licenseMockData.status,
      });

      const result = await license(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });
    it("should handle no license gracefully", async () => {
      axios.get.mockRejectedValue({
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
        axios.get.mockResolvedValueOnce({ data: issuesMockData });
      }
      const result = await correctness(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });

    it("should handle unexpected status codes gracefully", async () => {
      axios.get.mockRejectedValue({
        response: {
          data: {},
          status: 500,
        },
      });

      const result = await license(newUrl);
      expect(result).toBe(-1);
    });

    it("should handle network errors gracefully", async () => {
      axios.get.mockRejectedValue(new Error("Network error"));

      const result = await license(newUrl);
      expect(result).toBe(-1);
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
        axios.get.mockResolvedValueOnce({ data: issuesMockData });

        issuesMockData.slice(0, 10).forEach((issue) => {
          const commentsMockData = loadMockData(
            repositoryUrl,
            `commentsData_issue${issue.number}`
          );
          axios.get.mockResolvedValueOnce({ data: commentsMockData });
        });
      }

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBeLessThanOrEqual(1);
    });
    it("should handle no maintainer comments gracefully", async () => {
      const issuesMockData = loadMockData(repositoryUrl, "issuesData_page1");
      axios.get.mockResolvedValueOnce({ data: issuesMockData });

      issuesMockData.slice(0, 10).forEach(() => {
        axios.get.mockResolvedValueOnce({ data: [] });
      });

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBe(0);
    });
    it("should handle axios error gracefully for issues", async () => {
      axios.get.mockRejectedValue(new Error("Network error"));

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBe(0);
    });

    it("should handle axios error gracefully for comments", async () => {
      const issuesMockData = loadMockData(repositoryUrl, "issuesData_page1");
      axios.get
        .mockResolvedValueOnce({ data: issuesMockData })
        .mockRejectedValue(new Error("Network error"));

      const result = await responsiveMaintainer(newUrl);
      expect(result).toBe(0);
    });
    
  });
  
});
