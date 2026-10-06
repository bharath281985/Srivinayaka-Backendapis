# Srivinayaka-Backendapis

Backend API service for Sri Vinayaka Collections built with Express and MongoDB.

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Configuration:
   - Copy `.env.example` to `.env` and fill in your MongoDB URI and API secrets.
   - Place your `firebase-service-account.json` in the root directory if Firebase notifications or admin features are required.

3. Run the development server:
   ```bash
   npm run dev
   ```
   Or start production:
   ```bash
   npm start
   ```

## Architecture & Features

- **Express & MongoDB / Mongoose**: RESTful API architecture.
- **Authentication**: JWT & Firebase authentication integration.
- **Product & Category Management**: Dynamic catalog, attributes, and filtering.
- **Order Management & Tracking**: Orders, coupons, shipping, and automated tracking.
- **Media Uploads**: Sharp image optimization & webp formatting in `/uploads`.
- **Push Notifications**: Expo push notifications via background service.
