# Easy Read Toolkit

A React Native Expo app for smart document reading with OCR, URL extraction, and PDF processing capabilities.

## 📁 Project Structure

```
sample-easy-read/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen (default route)
│   ├── _layout.tsx        # Root layout with theme provider
│   ├── camera.tsx         # Document scanning with OCR
│   ├── pdf-upload.tsx     # PDF text extraction
│   └── url-import.tsx     # Web content extraction
├── components/            # Reusable UI components
│   ├── PageHeader.tsx     # Standardized page headers
│   ├── ActionButton.tsx   # Action buttons
│   ├── FeatureCard.tsx    # Feature display cards
│   └── ui/               # UI components
├── pages/                # Organized page components (clean structure)
│   ├── settings.tsx      # Settings screen
│   ├── documents.tsx     # Documents library
│   ├── profile.tsx       # User profile
│   ├── camera.tsx        # Document scanning
│   ├── pdf-upload.tsx    # PDF upload
│   └── url-import.tsx    # URL import
├── hooks/                # Custom React hooks
│   └── useTheme.ts       # Theme management
├── constants/            # App constants
│   └── Colors.ts         # Color definitions
└── assets/              # Static assets
    ├── images/          # Image files
    └── fonts/           # Font files
```

## 🚀 Features

### ✅ Implemented
- **Document Scanning**: OCR text extraction from camera images
- **URL Import**: Extract text content from web articles
- **PDF Upload**: Text extraction from PDF files
- **Dark Mode**: Complete theme switching
- **Settings**: Reading preferences and app configuration

### 🔜 Coming Soon
- **Document Library**: Save and manage extracted documents
- **User Profile**: Account management and preferences

## 🛠️ Technology Stack

- **React Native** with Expo SDK 53
- **TypeScript** for type safety
- **Expo Router** for navigation
- **AsyncStorage** for data persistence
- **WebView** for OCR and content extraction
- **Tesseract.js** for optical character recognition
- **PDF.js** for PDF text extraction

## 📱 Quick Actions

1. **Scan Document** - Take photo and extract text with OCR
2. **Paste URL** - Import article content from web URLs
3. **Upload PDF** - Extract text from PDF files

## 🎨 Design System

- **PageHeader**: Consistent page headers with titles and subtitles
- **ActionButton**: Standardized action buttons
- **FeatureCard**: Feature description cards
- **Themed Components**: Dark/light mode support

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android
npx expo start --android
```

## 📋 TODO

- [ ] Implement document library functionality
- [ ] Add user profile management
- [ ] Enhance OCR accuracy
- [ ] Add document search and filtering
- [ ] Implement document sharing features

---

*Organized with clean structure and reusable components for maintainable code.*