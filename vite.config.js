import { defineConfig } from 'vite'

export default defineConfig({
  // Build configuration
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html'
      }
    }
  },
  // Environment variables
  define: {
    __VITE_APPWRITE_ENDPOINT__: JSON.stringify(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'),
    __VITE_APPWRITE_PROJECT_ID__: JSON.stringify(process.env.VITE_APPWRITE_PROJECT_ID || '68f8c1bc003e3d2c8f5c'),
    __VITE_APPWRITE_PROJECT_NAME__: JSON.stringify(process.env.VITE_APPWRITE_PROJECT_NAME || 'onsi'),
    __VITE_EMAILJS_PUBLIC_KEY__: JSON.stringify(process.env.VITE_EMAILJS_PUBLIC_KEY || 'ryB3eYn0HP-iAfl2E'),
    __VITE_EMAILJS_SERVICE_ID__: JSON.stringify(process.env.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we'),
    __VITE_EMAILJS_CUSTOMER_TEMPLATE_ID__: JSON.stringify(process.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || 'template_3m8gczh'),
    __VITE_EMAILJS_ADMIN_TEMPLATE_ID__: JSON.stringify(process.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID || 'template_lkl5yxm'),
    __VITE_ADMIN_EMAIL__: JSON.stringify(process.env.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com'),
    __VITE_APP_NAME__: JSON.stringify(process.env.VITE_APP_NAME || 'Onsi Koran Shop'),
    __VITE_PRODUCT_PRICE__: JSON.stringify(process.env.VITE_PRODUCT_PRICE || null),
    __VITE_SHIPPING_COST__: JSON.stringify(process.env.VITE_SHIPPING_COST || '0.00'),
    __VITE_TAX_RATE__: JSON.stringify(process.env.VITE_TAX_RATE || '0.00')
  }
})