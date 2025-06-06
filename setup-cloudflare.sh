#!/bin/bash

# Bead Fanatic - Cloudflare Setup Script
# Run this locally to set up your Cloudflare Pages project

echo "🌟 Setting up Bead Fanatic on Cloudflare Pages..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler..."
    npm install -g wrangler
fi

# Login to Cloudflare (will open browser)
echo "🔐 Please log in to Cloudflare..."
wrangler login

# Create the Pages project
echo "📄 Creating Pages project..."
wrangler pages project create bead-fanatic

# Build the project locally
echo "🔨 Building the project..."
npm install
npm run build

# Deploy the first version
echo "🚀 Deploying to Cloudflare Pages..."
wrangler pages deploy dist --project-name=bead-fanatic

echo "✅ Setup complete!"
echo "🌐 Your site will be available at: https://bead-fanatic.pages.dev"
echo ""
echo "Next steps:"
echo "1. Set up your custom domain beadfanatic.co.uk in the Cloudflare dashboard"
echo "2. Add GitHub secrets for CI/CD (see README)"
echo "3. Get a HuggingFace API token for the bead identifier"
