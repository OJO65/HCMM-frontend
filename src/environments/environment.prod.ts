export const environmentProd = {
  production: true,
  apiUrl: 'https://api.example.com',
  apiVersion: 'v1',
  socketUrl: 'wss://socket.example.com',

  features: {
    enableWebSockets: true,
    enableGoogleMaps: true,
    enablePayments: true,
    enableNotifications: true,
  },

  app: {
    name: 'Home Cooked Meals Marketplace',
    version: '1.0.0',
    defaultLanguage: 'en-US',
    currency: 'KES',
    currencySymbol: 'KSh',
  },

  googleMapsApiKey: 'PRODUCTION_GOOGLE_MAPS_API_KEY',

  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },

  fileUpload: {
    maxSize: 5242880,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
    allowedDocTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};
