# Security Checklist

## ✅ Before Pushing to Public Repository

This checklist ensures your repository is secure before making it public.

### 1. Environment Variables ✅
- [ ] All API keys removed from code
- [ ] All database credentials removed from code
- [ ] All private keys removed from code
- [ ] All `.env.example` files created
- [ ] All `.env` files added to `.gitignore`

### 2. Configuration Files ✅
- [ ] `agent-server/models_config.json` - API keys replaced with placeholders
- [ ] `job-runner/src/config/index.ts` - Database credentials replaced with placeholders
- [ ] `agent-server/server.py` - Hardcoded API keys replaced with environment variables

### 3. Sensitive Data Removal ✅
- [ ] No hardcoded passwords in source code
- [ ] No hardcoded API keys in source code
- [ ] No hardcoded private keys in source code
- [ ] No hardcoded database connection strings
- [ ] No hardcoded Redis connection strings

### 4. Environment Setup Files ✅
- [ ] `agent-server/env.example` - Contains all required environment variables
- [ ] `job-runner/env.example` - Contains all required environment variables
- [ ] `frontend/env.example` - Contains all required environment variables
- [ ] `sei-js/env.example` - Contains all required environment variables
- [ ] Root `env.example` - Contains overview of all components

### 5. Documentation ✅
- [ ] README.md updated with environment setup instructions
- [ ] Clear instructions for copying env.example files
- [ ] Security warnings about private keys

## 🔒 Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use `.env.example` files as templates
- Rotate API keys regularly
- Use different API keys for development and production

### Private Keys
- Never store private keys in code
- Use hardware wallets when possible
- Store private keys in secure key management systems
- Use testnet for development

### Database Security
- Use strong passwords
- Restrict database access to necessary IPs
- Use connection pooling
- Enable SSL/TLS for database connections

### API Security
- Use HTTPS for all API endpoints
- Implement rate limiting
- Validate all inputs
- Use API key rotation

## 🚨 What to Do If You Accidentally Commit Sensitive Data

1. **Immediately revoke/rotate the exposed credentials**
2. **Remove the sensitive data from git history:**
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch path/to/sensitive/file' \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push to remote:**
   ```bash
   git push origin --force --all
   ```
4. **Notify team members to reset their local repositories**

## 📝 Environment Variables Reference

### Required for Agent Server
- `EXAMPLE_API_KEY` - Your Gemini API key
- `EXA_API_KEY` - Your EXA API key

### Required for Job Runner
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string

### Required for Frontend
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_SEI_NETWORK` - Sei network to use

### Required for Sei.js
- `WALLET_MODE` - Wallet mode (disabled/private-key)
- `PRIVATE_KEY` - Your private key (if using private-key mode)

## 🔍 Regular Security Audits

- [ ] Monthly: Review all environment variables
- [ ] Monthly: Check for new hardcoded credentials
- [ ] Quarterly: Rotate API keys
- [ ] Quarterly: Review access permissions
- [ ] Annually: Security training for team members 