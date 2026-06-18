# Upgrade Skills Hybrid Mobile App (React Native & Expo)

This directory contains the hybrid mobile application wrapper for both iOS and Android. It uses **Expo** and `react-native-webview` to render the responsive web app in a native shell.

## Features
- **Full Android Back-Button Handling**: Pressing the physical back button on Android devices navigates backward in the WebView history instead of closing the application.
- **Dynamic Safe Area View**: Ensures that layout components are not covered or clipped by iOS and Android screen notches or home indicator bars.
- **Loader Overlay**: Shows a themed green loading spinner while the main website files load.
- **Custom Offline / Connection Error Recovery Screen**: Shows a clean error alert with a tactile green "Retry" button when there is no internet connection.
- **Status Bar Integration**: Customized status bar matching the default design.

## Project Structure
- `App.js`: Core application container and WebView implementation.
- `app.json`: Configuration for app name, slug, bundle identifier, assets, and platform details.
- `package.json`: Project dependency configurations.
- `assets/`: Contains generated main icon, adaptive icon, favicon, and splash screen image.

---

## 🚀 How to Run & Test the App Locally

### 1. Install Dependencies
Navigate to this directory in your terminal and run:
```bash
cd mobile
npm install
```

### 2. Start the Development Server
Run the Expo packager:
```bash
npm start
```
This will launch the Expo CLI and generate a **QR Code** in your terminal and a local developer browser panel.

### 3. Test on a Physical Phone
1. Download the **Expo Go** application from the Google Play Store (Android) or App Store (iOS).
2. Scan the terminal's QR code:
   - **Android**: Open the Expo Go app and click "Scan QR Code".
   - **iOS**: Open the native iOS Camera app and scan the QR code, then follow the prompt to open in Expo Go.
3. The app will fetch the Javascript bundle and load the hosted `Upgrade Skills` platform.

### 4. Build for App Stores / Production
To compile standalone native binaries for distribution, use Expo Application Services (EAS):
```bash
# Log in to Expo CLI
npx eas login

# Run build for Android (AAB/APK) or iOS
npx eas build --platform android
npx eas build --platform ios
```
