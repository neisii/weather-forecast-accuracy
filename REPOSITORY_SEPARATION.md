# Repository Separation

## Overview
This repository was separated from the original `toy-5` monorepo on 2025-11-18.

## Original Location
- Original Repository: `toy-5`
- Original Path: `02-weather-app/`

## Separation Process
1. Created a clone of the original repository
2. Used `git filter-branch --subdirectory-filter 02-weather-app` to extract only the weather app directory
3. All files from `02-weather-app/` were moved to the repository root
4. Git history was preserved - all commits related to the weather app are retained
5. Cleaned up backup references and removed old remotes

## Result
- Full git history preserved (47 commits from the original repo)
- Repository size: ~6.4MB
- All files are now at root level
- Ready to be pushed to a new remote repository

## Next Steps
To use this repository:
1. Add a new remote: `git remote add origin <your-new-repo-url>`
2. Push to the new remote: `git push -u origin claude/separate-weather-app-repo-01PQq7YYvh2eksUhi47bgtBV`
3. Install dependencies: `npm install`
4. Run dev server: `npm run dev`

## Branch
Current branch: `claude/separate-weather-app-repo-01PQq7YYvh2eksUhi47bgtBV`

You may want to rename this to `main` or `master`:
```bash
git branch -m claude/separate-weather-app-repo-01PQq7YYvh2eksUhi47bgtBV main
```
