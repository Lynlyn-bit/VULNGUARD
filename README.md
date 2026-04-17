# Welcome to your Lovable project

## Environment

Copy `.env.example` to `.env` at the repo root and fill in real values. The file `.env` is ignored and must never be committed.

### If MongoDB credentials were pushed to GitHub

1. In MongoDB Atlas: **Database Access** → edit the DB user → **Edit Password** (rotate the leaked password).
2. Update your local `.env` with the new URI.
3. After rewriting Git history (see Git docs for `git filter-branch` / `git filter-repo` removing `.env`), force-push your branches so remote history no longer contains the secret.

TODO: Document your project here
