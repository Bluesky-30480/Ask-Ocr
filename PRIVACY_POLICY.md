# Privacy Policy

**Last Updated: October 25, 2025**

## Overview

Ask OCR is designed with your privacy as a top priority. This application operates on an **offline-first** principle, meaning all data processing happens locally on your device by default. You have complete control over what data, if any, leaves your device.

## Data Collection and Processing

### Local Processing (Default)

By default, Ask OCR processes all data locally on your device:

- **OCR Processing**: Text recognition is performed using Tesseract.js, which runs entirely in your browser
- **Screenshots**: Captured images are stored only on your local device
- **Database**: All application data is stored in a local SQLite database on your device
- **No Internet Required**: The application works fully offline without any internet connection

### Optional Online Features

You may choose to enable optional online features. These are **disabled by default** and require your explicit consent:

#### 1. Online OCR Services
- **What**: Alternative OCR providers that may offer better accuracy for certain languages or document types
- **Data Shared**: Screenshot images
- **Purpose**: Improved OCR accuracy
- **Your Control**: Can be enabled/disabled in settings at any time

#### 2. AI API Integration
- **What**: Access to AI services (OpenAI, Perplexity) for advanced text analysis
- **Data Shared**: Extracted text from OCR results
- **Purpose**: Enhanced text analysis, translation, summarization
- **Your Control**: You must provide your own API keys; keys are encrypted and stored locally

#### 3. Cloud Synchronization (Future Feature)
- **What**: Sync your OCR history across devices
- **Data Shared**: OCR results and metadata
- **Purpose**: Multi-device access
- **Your Control**: Completely optional; disabled by default

## Data Storage

### Local Storage
- **Location**: All data is stored in your local application directory
- **Format**: SQLite database encrypted at rest
- **Retention**: Data persists until you manually delete it or uninstall the application
- **Access**: Only you have access to your local data

### API Keys
- **Encryption**: All API keys are encrypted using AES-256-GCM encryption
- **Master Password**: You set a master password to protect your API keys
- **Storage**: Encrypted keys are stored locally only
- **Transmission**: API keys are never transmitted to our servers

## Data You Control

### What We Never Collect
- Personal identifying information (name, email, phone number)
- Device identifiers or tracking data
- Usage analytics or telemetry (unless explicitly enabled)
- Screenshots or OCR results (unless you use online features)
- Location data
- Browsing history or other application data

### What You Can Enable (Opt-In Only)
- **Analytics**: Anonymous usage statistics to help improve the application
- **Crash Reports**: Technical data when the application crashes
- **Telemetry**: Performance metrics to optimize the application

All of these are **disabled by default** and clearly labeled in settings.

## Data Sharing

### Third-Party Services

When you enable online features, your data may be shared with:

1. **Online OCR Providers** (if enabled)
   - Only screenshot images you explicitly process
   - Subject to their respective privacy policies
   - Can be disabled at any time

2. **AI Service Providers** (if enabled with your API keys)
   - OpenAI: Subject to [OpenAI Privacy Policy](https://openai.com/privacy)
   - Perplexity: Subject to [Perplexity Privacy Policy](https://www.perplexity.ai/privacy)
   - Only text data you explicitly send for processing

### We Do Not
- Sell your data to third parties
- Share data with advertisers
- Use your data for profiling or targeting
- Access your local data remotely

## Transparency Features

### Upload Notifications
When online features are enabled, the application will:
- Show a notification before data is uploaded
- Request confirmation for sensitive operations
- Log all upload events locally for your review
- Clearly indicate which service will receive your data

### Permission System
- All online features require explicit permission
- Permissions can be granted or revoked at any time
- Offline mode instantly disables all online features
- Permission history is logged locally

## Your Rights

### Access
- View all your local data through the application interface
- Export your data at any time
- Review upload history and permissions

### Modification
- Edit or delete any stored OCR results
- Change privacy settings at any time
- Update or remove API keys

### Deletion
- Clear all local data through settings
- Uninstall the application to remove all data
- Use secure cleanup to ensure complete data removal

### Portability
- Export your data in standard formats (JSON, text)
- Backup and restore your local database
- Transfer data between devices manually

## Security Measures

### Encryption
- API keys encrypted with AES-256-GCM
- Master password protected with PBKDF2 (100,000 iterations)
- Local database can be encrypted (optional)

### Access Control
- No remote access to your local data
- Master password required for sensitive operations
- Auto-lock after inactivity (configurable)

### Updates
- Security updates delivered through standard update mechanisms
- Automatic checks for updates (can be disabled)
- Clear changelog for all security fixes

## Children's Privacy

Ask OCR does not knowingly collect data from children under 13. The application does not collect personal information by default, and parental supervision is recommended when enabling online features.

## Changes to This Policy

We may update this privacy policy to reflect:
- New features or functionality
- Changes in legal requirements
- Improvements to privacy protections

**Notification**: You will be notified of any material changes through the application. Continued use after changes indicates acceptance.

## Data Retention

### Local Data
- Retained indefinitely until you delete it
- Auto-delete can be configured (e.g., delete after 30 days)
- Complete removal upon uninstallation (with secure cleanup)

### Online Services
- Subject to the retention policies of respective service providers
- We do not control data retention by third-party services
- Refer to their privacy policies for details

## International Users

Ask OCR is a desktop application that operates locally. When online features are enabled:
- Data may be transmitted to services in different countries
- Subject to laws where services are located
- You are responsible for compliance with local regulations

## Contact Information

For privacy-related questions or concerns:

- **GitHub Issues**: [https://github.com/Bluesky-30480/Ask-Ocr/issues](https://github.com/Bluesky-30480/Ask-Ocr/issues)
- **Email**: [Your contact email - to be added]

## Open Source

Ask OCR is open source. You can:
- Review the source code on GitHub
- Verify our privacy claims
- Contribute improvements
- Fork and modify for your needs

**Repository**: [https://github.com/Bluesky-30480/Ask-Ocr](https://github.com/Bluesky-30480/Ask-Ocr)

## Consent

By using Ask OCR, you consent to:
- Local data processing and storage
- This privacy policy

For online features, you must provide **explicit opt-in consent** before any data leaves your device.

## Offline Mode

You can use Ask OCR in complete **offline mode**:
- No internet connection required
- No data transmitted anywhere
- All processing happens locally
- Full application functionality (except online features)

This is the **default and recommended** mode for maximum privacy.

---

**Summary**: Ask OCR is designed to respect your privacy. All data stays on your device by default. Online features are optional, clearly labeled, and require your explicit consent. You have complete control over your data at all times.
