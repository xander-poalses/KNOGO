module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests/jest"],
  testMatch: ["<rootDir>/tests/jest/**/*.jest.cjs"],
  transform: { "\\.tsx?$": "<rootDir>/scripts/jest-transform.cjs" },
  moduleNameMapper: {
    "^react$": "<rootDir>/apps/mobile/node_modules/react",
    "^react/jsx-runtime$": "<rootDir>/apps/mobile/node_modules/react/jsx-runtime.js",
    "^react-dom/server$": "<rootDir>/apps/mobile/node_modules/react-dom/server.node.js"
  },
  clearMocks: true
};
