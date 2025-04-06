import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'GitHub PR Description Generator',
    description: 'Automatically generates PR descriptions based on diff data using AI',
    permissions: [
      "activeTab",
      "storage"
    ],
    // Add any API endpoint permissions if needed for your AI service
    // host_permissions: ["https://api.openai.com/*"]
  }
});
