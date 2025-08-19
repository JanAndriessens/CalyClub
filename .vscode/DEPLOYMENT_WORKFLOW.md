# 🚀 CalyClub Deployment Workflow

## Cursor IDE Integration

This workspace is configured with automated deployment workflows for seamless development-to-production deployment.

## Quick Start

### Keyboard Shortcuts
- **`Cmd+Shift+D`** - Quick Deploy (auto-commit and push)
- **`Cmd+Shift+M`** - Deploy with Custom Message
- **`Cmd+Shift+V`** - Verify Deployment Status
- **`Cmd+Shift+O`** - Open Live Site
- **`Cmd+Shift+G`** - Check Git Status
- **`Cmd+Shift+E`** - Emergency Deploy

### Command Palette Tasks
Open Command Palette (`Cmd+Shift+P`) and type "Tasks: Run Task":

1. **🚀 Quick Deploy** - Fast deployment with auto-generated commit message
2. **📝 Deploy with Message** - Interactive deployment with custom commit message
3. **✅ Deploy Verification** - Check deployment status and git state
4. **🔄 Auto Deploy (Watch Mode)** - Automatic deployment on file changes
5. **🌐 Open Live Site** - Launch https://calyclub.vercel.app/
6. **📊 Git Status** - Show current repository status
7. **🔧 Setup Deploy Hooks** - Install git hooks for automatic deployment
8. **🏃‍♂️ Emergency Deploy** - Immediate deployment for hotfixes

### NPM Scripts
Available via terminal or Command Palette:

```bash
npm run deploy:quick      # Quick deployment
npm run deploy:message    # Interactive deployment
npm run deploy:verify     # Check deployment status
npm run deploy:watch      # Start file watcher
npm run setup:hooks       # Install git hooks
```

## Deployment Flow

1. **Edit files** in your Cursor IDE
2. **Save changes** (auto-save enabled)
3. **Deploy via shortcuts** or let auto-deploy handle it
4. **Vercel automatically builds** from GitHub
5. **Live site updates** at https://calyclub.vercel.app/

## Configuration Files

- **`.vscode/settings.json`** - IDE settings and auto-save configuration
- **`.vscode/tasks.json`** - Deployment task definitions
- **`.vscode/keybindings.json`** - Keyboard shortcuts for deployment
- **`.vscode/launch.json`** - Debug configurations
- **`package.json`** - NPM scripts for deployment commands

## Auto-Save & Auto-Deploy

- Files auto-save after 2 seconds of inactivity
- Git hooks can trigger automatic deployment
- Watch mode available for continuous deployment

## Live Site

🌐 **Production**: https://calyclub.vercel.app/

## Troubleshooting

### Deployment Failed
1. Run `npm run deploy:verify` to check git status
2. Ensure all changes are saved
3. Check git credentials and repository access
4. Use `npm run setup:hooks` to reinstall deployment hooks

### Keyboard Shortcuts Not Working
1. Restart Cursor IDE
2. Check `.vscode/keybindings.json` is loaded
3. Use Command Palette as alternative

### Auto-Deploy Issues
1. Check `.vscode/settings.json` for auto-save configuration
2. Verify git hooks with `ls -la .git/hooks/`
3. Test manual deployment with `npm run deploy:quick`

## Tips

- Use **Quick Deploy** for routine updates
- Use **Deploy with Message** for feature releases
- Use **Emergency Deploy** for critical hotfixes
- Check **Deploy Verification** before important changes
- Keep **Live Site** bookmark for quick testing

---

**Happy deploying! 🚀**