# Bead Fanatic 💎

A comprehensive hub for bead enthusiasts, jewellery makers, and craft lovers. Features bead identification, tutorials, and supplier directory.

## 🚀 Quick Setup

### 1. Set Up Cloudflare Pages

**Option A: Using Cloudflare Dashboard (Recommended)**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Connect GitHub and select this repository
4. Build settings:
   - Framework: `Astro`
   - Build command: `npm run build` 
   - Output directory: `dist`
5. Click **Save and Deploy**

**Option B: Using Local CLI**
```bash
chmod +x setup-cloudflare.sh
./setup-cloudflare.sh
```

### 2. Set Up GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

- `CLOUDFLARE_API_TOKEN`: 
  - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
  - Create token → **Custom token**
  - Permissions: `Account:Cloudflare Pages:Edit`
  - Copy the token

- `CLOUDFLARE_ACCOUNT_ID`:
  - Found in Cloudflare Dashboard → right sidebar under **Account ID**

### 3. Connect Custom Domain (Optional)

1. In Cloudflare Dashboard → **Workers & Pages** → **bead-fanatic**
2. Go to **Custom domains** → **Set up a custom domain**
3. Add `beadfanatic.co.uk`
4. Follow DNS instructions

## Features

- 🔍 **AI-Powered Bead Identification**: Upload photos to identify bead types
- 📚 **Comprehensive Bead Database**: Detailed information on hundreds of bead types
- 🎓 **Step-by-Step Tutorials**: From beginner to advanced techniques
- 🏢 **Trusted Supplier Directory**: Verified suppliers from around the world
- 📰 **Community Blog**: Tips, inspiration, and industry news
- 🔍 **Smart Search**: Find exactly what you're looking for

## Technology Stack

- **Framework**: Astro.js with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Content**: Markdown with Zod schema validation
- **AI**: Hugging Face models for bead identification
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1
- **Storage**: Cloudflare R2 for images
- **Workers**: Cloudflare Workers for API endpoints

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/Waterwitching/bead-fanatic.git
cd bead-fanatic
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open [http://localhost:4321](http://localhost:4321) in your browser

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking

### Project Structure

```
src/
├── components/          # Reusable UI components
├── content/            # Content collections (markdown files)
│   ├── bead-types/     # Bead type entries
│   ├── tutorials/      # Tutorial content
│   ├── suppliers/      # Supplier profiles
│   └── posts/          # Blog posts
├── layouts/            # Page layouts
├── pages/              # Route pages
├── styles/             # Global styles
└── utils/              # Utility functions

workers/
└── bead-identifier/    # Cloudflare Worker for AI identification

public/
├── images/             # Static images
└── favicon.svg         # Site icon
```

## Content Management

Content is managed through markdown files with frontmatter:

### Adding Bead Types

Create a new file in `src/content/bead-types/` with the required schema:

```markdown
---
title: "Your Bead Type"
description: "Description of the bead"
category: "glass"
materials: ["glass", "metal"]
colours: ["red", "blue"]
# ... other properties
---

Your detailed content here...
```

### Adding Tutorials

Create a new file in `src/content/tutorials/` following the tutorial schema.

### Adding Suppliers

Create a new file in `src/content/suppliers/` with supplier information.

## AI Bead Identification

To enable AI bead identification:

1. Get a free [HuggingFace API token](https://huggingface.co/settings/tokens)
2. Add `HF_API_TOKEN` to your GitHub secrets
3. The worker will automatically use it for image analysis

## Deployment

The site automatically deploys to Cloudflare Pages when you push to the main branch.

### Manual Deployment

1. Build the project
```bash
npm run build
```

2. Deploy to Cloudflare Pages
```bash
wrangler pages deploy ./dist --project-name=bead-fanatic
```

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

### Content Contributions

- Add new bead types with detailed information
- Create step-by-step tutorials
- Recommend trusted suppliers
- Write blog posts about techniques or inspiration

### Code Contributions

- Improve the AI identification accuracy
- Enhance the search functionality
- Add new features
- Fix bugs or improve performance

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you need help or have questions:

- Visit our [contact page](https://beadfanatic.co.uk/contact)
- Check the [tutorials](https://beadfanatic.co.uk/tutorials) for guides
- Use the [bead identifier](https://beadfanatic.co.uk/identify) for mystery beads

---

Made with ❤️ by passionate bead enthusiasts in the UK