# Sei Hackathon Project

This repository contains a comprehensive Sei blockchain development project with multiple components:

## Project Structure

### 🚀 Frontend (`/frontend`)
- **Next.js** application with TypeScript
- Modern UI components using shadcn/ui
- Chat interface for blockchain interactions
- Responsive design with Tailwind CSS

### 🤖 Agent Server (`/agent-server`)
- **Python** backend server
- AI agent integration with multiple models
- Virtual environment setup
- FastAPI-based API endpoints

### 📊 Job Runner (`/job-runner`)
- **Node.js** TypeScript application
- Blockchain data processing and analysis
- Job queue management
- Docker containerization support
- Database integration for snapshots

### 🔗 MCP SERVER (`/sei-js/packages/mcp-server`)
- **TypeScript** = Modified and advanced implementation of base sei js mcp server

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- Docker (for job-runner)
- Git

### Environment Setup
Before running any component, you need to set up environment variables:

1. **Copy environment example files:**
   ```bash
   cp agent-server/env.example agent-server/.env
   cp job-runner/env.example job-runner/.env
   cp frontend/env.example frontend/.env.local
   cp sei-js/env.example sei-js/.env
   ```

2. **Edit each .env file** with your actual API keys and credentials:
   - `agent-server/.env` - Add your Gemini and EXA API keys
   - `job-runner/.env` - Add your MongoDB and Redis connection strings
   - `frontend/.env.local` - Configure API endpoints and blockchain settings
   - `sei-js/.env` - Set wallet mode and RPC endpoints

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd sei-hackathon
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Agent Server Setup**
   ```bash
   cd agent-server
   source venv/bin/activate  # or create new venv
   pip install -r requirements.txt
   python server.py
   ```

4. **Job Runner Setup**
   ```bash
   cd job-runner
   npm install
   docker-compose up -d  # for database
   npm run dev
   ```

5. **Sei.js Development**
   ```bash
   cd sei-js
   npm install
   npm run build
   ```

## Development

### Adding New Features
- Each component maintains its own package.json and dependencies
- Follow the existing code structure and patterns
- Update this README when adding new components

### Testing
- Frontend: `npm run test` in `/frontend`
- Agent Server: Python testing framework in `/agent-server`
- Job Runner: Jest tests in `/job-runner`
- Sei.js: Comprehensive test suite in `/sei-js`

## Deployment

### Frontend
- Vercel, Netlify, or any Next.js hosting platform
- Environment variables for API endpoints

### Agent Server
- Python hosting platforms (Railway, Heroku, etc.)
- Environment variables for API keys

### Job Runner
- Docker deployment with docker-compose
- Environment variables for database and blockchain connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## Support

For questions and support, please open an issue in this repository. 
